#!/usr/bin/env python3
"""Collect EDGAR filing candidates for editorial review."""

import argparse
import csv
from datetime import date, timedelta
from io import StringIO
import json
import os
from pathlib import Path
import re
import sys
from time import sleep
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

SEC_TICKERS = "https://www.sec.gov/files/company_tickers.json"
HOLDINGS = "https://www.ishares.com/us/products/239726/ishares-core-sp-500-etf/latest-holdings.csv"
# S&P DJI removed Hologic on 9 April 2026. The fund still lists a residual line.
RESEARCH_EXCLUSIONS = {"HOLX"}
PILOT_TICKERS = (
    "AAPL NVDA MSFT AMZN GOOGL AVGO META LLY BRK.B TSLA JPM MU AMD V XOM "
    "JNJ WMT MA ABBV COST CVX PG PLTR KO CSCO"
).split()
OUTPUT = Path(__file__).resolve().parents[1] / "data/raw/us/filing-review.json"


def fetch_json(url, contact):
    sleep(0.25)
    request = Request(url, headers={"User-Agent": f"Proxy Wars governance research {contact}"})
    with urlopen(request, timeout=25) as response:
        return json.load(response)


def normalize_ticker(ticker):
    return re.sub(r"[ .-]+", ".", ticker.strip().upper())


def research_holdings(by_ticker):
    with urlopen(HOLDINGS, timeout=25) as response:
        lines = response.read().decode("utf-8-sig").splitlines()
    header = next((index for index, line in enumerate(lines) if line.startswith("Ticker,")), None)
    if header is None:
        raise ValueError("Holdings CSV is missing the equity table header.")
    reader = csv.DictReader(StringIO("\n".join(lines[header:])))
    issuers = {}
    unmatched = set()
    for row in reader:
        if row.get("Type") != "EQUITY":
            continue
        ticker = normalize_ticker(row["Ticker"])
        if ticker in RESEARCH_EXCLUSIONS:
            continue
        match = by_ticker.get(ticker)
        if match is None:
            unmatched.add(ticker)
        else:
            issuers.setdefault(match["cik_str"], {"ticker": ticker, "cik": match["cik_str"]})
    if unmatched:
        raise ValueError("Unmatched equity holdings need review: " + ", ".join(sorted(unmatched)))
    return list(issuers.values())


def load_roster(path, contact, *, use_holdings=False):
    if path:
        with path.open(newline="", encoding="utf-8-sig") as source:
            rows = list(csv.DictReader(source))
        expected = 500
    else:
        mapping = fetch_json(SEC_TICKERS, contact)
        by_ticker = {normalize_ticker(item["ticker"]): item for item in mapping.values()}
        if use_holdings:
            rows = research_holdings(by_ticker)
            expected = 500
        else:
            rows = [{"ticker": ticker, "cik": by_ticker[ticker]["cik_str"]} for ticker in PILOT_TICKERS]
            expected = 25

    roster = []
    for row in rows:
        ticker = normalize_ticker(row["ticker"])
        cik = str(row["cik"]).strip()
        if not re.fullmatch(r"[A-Z0-9]+(?:\.[A-Z0-9]+)*", ticker) or not re.fullmatch(r"[0-9]{1,10}", cik) or int(cik) == 0:
            raise ValueError("Roster contains an invalid ticker or CIK.")
        roster.append((ticker, cik.zfill(10)))
    if len(roster) != expected or any(len(set(column)) != expected for column in zip(*roster)):
        raise ValueError(f"Expected {expected} distinct issuer CIKs and primary tickers.")
    return roster


def filing_candidates(submission, cutoff):
    cik = int(submission["cik"])
    recent = submission["filings"]["recent"]
    fields = ("form", "filingDate", "reportDate", "items", "accessionNumber", "primaryDocument")
    candidates = []
    for form, filed, reported, raw_items, accession, document in zip(
        *(recent[field] for field in fields), strict=True
    ):
        if date.fromisoformat(filed) < cutoff:
            continue
        relevant_items = sorted({"5.02", "5.07"} & {part.strip() for part in raw_items.split(",")})
        if form not in {"DEF 14A", "DEFA14A", "6-K", "6-K/A"} and not (
            form in {"8-K", "8-K/A"} and relevant_items
        ):
            continue
        if not re.fullmatch(r"\d{10}-\d{2}-\d{6}", accession) or not re.fullmatch(r"[A-Za-z0-9_.-]+", document):
            raise ValueError("EDGAR returned an unexpected accession or document name.")
        candidates.append({
            "status": "pending-review",
            "form": form,
            "filedDate": filed,
            "reportDate": reported or None,
            "items": relevant_items,
            "accession": accession,
            "sourceUrl": f"https://www.sec.gov/Archives/edgar/data/{cik}/{accession.replace('-', '')}/{document}",
        })
    return candidates


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    roster_options = parser.add_mutually_exclusive_group()
    roster_options.add_argument("--roster", type=Path, help="Approved 500-issuer CSV with ticker,cik columns")
    roster_options.add_argument("--holdings-research", action="store_true", help="Use ETF holdings for an internal 500-issuer research run")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    contact = os.environ.get("SEC_CONTACT_EMAIL", "").strip()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", contact):
        parser.error("Set SEC_CONTACT_EMAIL to the operator's email for EDGAR access.")
    cutoff = date.today() - timedelta(days=400)
    try:
        probe = fetch_json("https://data.sec.gov/submissions/CIK0000320193.json", contact)
        roster = load_roster(args.roster, contact, use_holdings=args.holdings_research)
        issuers = []
        for ticker, cik in roster:
            submission = probe if cik == "0000320193" else fetch_json(
                f"https://data.sec.gov/submissions/CIK{cik}.json", contact
            )
            if str(submission["cik"]).zfill(10) != cik:
                raise ValueError(f"EDGAR issuer mismatch for {ticker}.")
            issuers.append({
                "ticker": ticker, "cik": cik, "companyName": submission["name"],
                "filings": filing_candidates(submission, cutoff),
            })
    except (HTTPError, URLError, TimeoutError, OSError, ValueError, KeyError) as error:
        print(f"US filing collection stopped. Prior review data preserved. {error}", file=sys.stderr)
        return 1
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(args.output.suffix + ".tmp")
    roster_source = HOLDINGS if args.holdings_research else "operator-supplied roster" if args.roster else "fixed 25-issuer pilot"
    temporary.write_text(json.dumps({
        "rosterSource": roster_source,
        "filedSince": cutoff.isoformat(),
        "issuers": issuers,
    }, indent=2) + "\n", encoding="utf-8")
    temporary.replace(args.output)
    print(f"Collected {sum(len(issuer['filings']) for issuer in issuers)} review candidates across {len(issuers)} issuers.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
