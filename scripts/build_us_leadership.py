#!/usr/bin/env python3
"""Publish reviewed US leadership with explicit evidence age and review triggers."""

from __future__ import annotations

import calendar
import json
import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
ROLES = ("ceo", "chair")


def start_bounds(value: str) -> tuple[date, date, str]:
    """Keep source precision. Charts start after any uncertain appointment period."""
    if re.fullmatch(r"\d{4}", value):
        year = int(value)
        return date(year, 1, 1), date(year, 12, 31), "year"
    if re.fullmatch(r"\d{4}-\d{2}", value):
        year, month = map(int, value.split("-"))
        return date(year, month, 1), date(year, month, calendar.monthrange(year, month)[1]), "month"
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError(f"Invalid appointment date {value!r}")
    day = date.fromisoformat(value)
    return day, day, "day"


def require_url(value: str) -> None:
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Evidence must have an HTTPS source URL")


def build(coverage: dict, sources: dict, today: date) -> dict:
    roster = coverage["issuers"]
    by_cik = {issuer["cik"]: issuer for issuer in roster}
    if len(by_cik) != len(roster) or len({i["ticker"] for i in roster}) != len(roster):
        raise ValueError("Duplicate issuer in US research roster")
    policy = sources["reviewPolicyDays"]
    if not isinstance(policy, int) or not 1 <= policy <= 90:
        raise ValueError("Review policy must be between 1 and 90 days")
    catalog_date = datetime.fromisoformat(coverage["generatedAt"]).date()
    if catalog_date > today:
        raise ValueError("Filing discovery date is in the future")
    reviewed = {}
    for company in sources["companies"]:
        cik = company["cik"]
        if cik in reviewed:
            raise ValueError(f"Duplicate leadership record for {cik}")
        issuer = by_cik.get(cik)
        if not issuer or issuer["ticker"] != company["ticker"] or not issuer["companyName"].strip():
            raise ValueError(f"Leadership identity does not match roster for {cik}")
        checked = date.fromisoformat(company["reviewedAt"])
        if checked > today:
            raise ValueError("Evidence review date is in the future")
        current_urls = company["currentSourceUrls"]
        if not current_urls:
            raise ValueError("Current-role confirmation is required")
        for url in current_urls:
            require_url(url)
        # Same-day filings trigger conservatively because catalog metadata lacks acceptance times.
        new_filings = [f for f in issuer["filings"] if f["filedDate"] >= checked.isoformat()
                       and ("5.02" in f["items"] or f["form"] in ("DEF 14A", "DEF 14A/A", "DEFA14A", "6-K"))]
        reasons = []
        if new_filings:
            reasons.append("New officer/director or proxy filing requires review")
        if (today - checked).days >= policy:
            reasons.append("Scheduled leadership recheck is due")
        if (today - catalog_date).days > 4:
            reasons.append("Filing discovery is overdue")
        roles = {}
        if set(company["roles"]) - set(ROLES) or not company["roles"]:
            raise ValueError("Invalid leadership role keys")
        for role, evidence in company["roles"].items():
            if not evidence.get("name", "").strip() or not evidence.get("title", "").strip():
                raise ValueError(f"Missing role holder or title for {issuer['ticker']}")
            first, last, precision = start_bounds(evidence["startDate"])
            if first > checked or last > checked:
                raise ValueError("Current appointment must be effective before evidence review")
            require_url(evidence["sourceUrl"])
            chart_start = first if precision == "day" else last + timedelta(days=1)
            roles[role] = {
                **evidence,
                "datePrecision": precision,
                "chartStartDate": chart_start.isoformat(),
                "tenureYears": round((today - last).days / 365.2425, 1),
                "reviewedAt": checked.isoformat(),
                "reviewDue": (checked + timedelta(days=policy)).isoformat(),
                "status": "review-required" if reasons else "verified",
                "reviewReasons": reasons,
                "newFilings": new_filings,
            }
        reviewed[cik] = {"currentSourceUrls": current_urls, "roles": roles}
    companies = [{**issuer, **reviewed.get(issuer["cik"], {"currentSourceUrls": [], "roles": {}})} for issuer in roster]
    counts = {role: sum(c["roles"].get(role, {}).get("status") == "verified" for c in companies) for role in ROLES}
    return {
        "metadata": {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "asOfDate": today.isoformat(),
            "filingsGeneratedAt": coverage["generatedAt"],
            "reviewPolicyDays": policy,
            "universeCount": len(roster),
            "universeName": coverage.get("universeName", "US research"),
            "rosterSourceUrl": coverage.get("rosterSourceUrl"),
            "reviewedCompanyCount": len(reviewed),
            "verifiedCounts": counts,
            "verifiedPairCount": sum(all(c["roles"].get(r, {}).get("status") == "verified" for r in ROLES) for c in companies),
            "scoreStatus": "US pressure scores require separate calibration and are not published",
            "validation": {"status": "pass", "errors": []},
        },
        "companies": companies,
    }


def main() -> None:
    coverage = json.loads((ROOT / "public/data/us-filing-coverage.json").read_text())
    sources = json.loads((ROOT / "data/us_leadership_sources.json").read_text())
    payload = build(coverage, sources, datetime.now(timezone.utc).date())
    output = ROOT / "public/data/us-leadership.json"
    temporary = output.with_suffix(".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n")
    temporary.replace(output)
    meta = payload["metadata"]
    print(f"Published {meta['verifiedPairCount']} verified CEO/Chair pairs across {meta['universeCount']} research issuers")


if __name__ == "__main__":
    main()
