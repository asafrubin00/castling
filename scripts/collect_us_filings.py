#!/usr/bin/env python3
"""Collect EDGAR filing candidates for editorial review."""

import argparse
import csv
from datetime import date, datetime, timedelta, timezone
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
SP100_HOLDINGS = "https://www.ishares.com/us/products/239723/ishares-sp-100-etf/latest-holdings.csv"
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


def parse_holdings(text, by_ticker, exclusions=()):
    lines = text.splitlines()
    header = next((index for index, line in enumerate(lines) if line.startswith("Ticker,")), None)
    if header is None:
        raise ValueError("Holdings CSV is missing the equity table header.")
    reader = csv.DictReader(StringIO("\n".join(lines[header:])))
    issuers = {}
    unmatched = set()
    for row in reader:
        if row.get("Type") != "EQUITY" and row.get("Asset Class") != "Equity":
            continue
        ticker = normalize_ticker(row["Ticker"])
        if ticker in exclusions:
            continue
        match = by_ticker.get(ticker)
        if match is None:
            unmatched.add(ticker)
        else:
            issuers.setdefault(match["cik_str"], {"ticker": ticker, "cik": match["cik_str"]})
    if unmatched:
        raise ValueError("Unmatched equity holdings need review: " + ", ".join(sorted(unmatched)))
    # Use a consistent Alphabet share class across both research universes.
    for issuer in issuers.values():
        if str(issuer["cik"]).zfill(10) == "0001652044":
            issuer["ticker"] = "GOOGL"
    return list(issuers.values())


def research_holdings(by_ticker, url=HOLDINGS):
    with urlopen(url, timeout=25) as response:
        text = response.read().decode("utf-8-sig")
    rows = parse_holdings(text, by_ticker, RESEARCH_EXCLUSIONS if url == HOLDINGS else ())
    return rows


def load_roster(path, contact, *, use_holdings=False, sp100=False):
    if path:
        with path.open(newline="", encoding="utf-8-sig") as source:
            rows = list(csv.DictReader(source))
        expected = 500
    else:
        mapping = fetch_json(SEC_TICKERS, contact)
        by_ticker = {normalize_ticker(item["ticker"]): item for item in mapping.values()}
        if use_holdings or sp100:
            rows = research_holdings(by_ticker, SP100_HOLDINGS if sp100 else HOLDINGS)
            expected = 100 if sp100 else 500
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
    roster_options.add_argument("--sp100-research", action="store_true", help="Use S&P 100 fund holdings for the active 100-issuer research cohort")
    parser.add_argument("--coverage-output", type=Path, help="Write public SEC filing coverage with review status")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    contact = os.environ.get("SEC_CONTACT_EMAIL", "").strip()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", contact):
        parser.error("Set SEC_CONTACT_EMAIL to the operator's email for EDGAR access.")
    cutoff = date.today() - timedelta(days=400)
    try:
        probe = fetch_json("https://data.sec.gov/submissions/CIK0000320193.json", contact)
        roster = load_roster(args.roster, contact, use_holdings=args.holdings_research, sp100=args.sp100_research)
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
            if len(issuers) % 50 == 0:
                print(f"Fetched filing metadata for {len(issuers)}/{len(roster)} issuers.", flush=True)
    except (HTTPError, URLError, TimeoutError, OSError, ValueError, KeyError) as error:
        print(f"US filing collection stopped. Prior review data preserved. {error}", file=sys.stderr)
        return 1
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(args.output.suffix + ".tmp")
    roster_source = SP100_HOLDINGS if args.sp100_research else HOLDINGS if args.holdings_research else "operator-supplied roster" if args.roster else "fixed 25-issuer pilot"
    temporary.write_text(json.dumps({
        "rosterSource": roster_source,
        "filedSince": cutoff.isoformat(),
        "issuers": issuers,
    }, indent=2) + "\n", encoding="utf-8")
    temporary.replace(args.output)
    if args.coverage_output:
        args.coverage_output.parent.mkdir(parents=True, exist_ok=True)
        coverage = {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "filedSince": cutoff.isoformat(),
            "universe": f"{len(roster)}-issuer research cohort derived from fund holdings and SEC issuer IDs",
            "universeName": "S&P 100" if args.sp100_research else "S&P 500" if args.holdings_research or args.roster else "US pilot",
            "rosterSourceUrl": roster_source,
            "issuers": issuers,
        }
        coverage_path = args.coverage_output.with_suffix(".tmp")
        coverage_path.write_text(json.dumps(coverage, indent=2) + "\n", encoding="utf-8")
        coverage_path.replace(args.coverage_output)
    print(f"Collected {sum(len(issuer['filings']) for issuer in issuers)} review candidates across {len(issuers)} issuers.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
