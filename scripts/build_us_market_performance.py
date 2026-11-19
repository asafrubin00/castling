#!/usr/bin/env python3
"""Build US tenure series only for source-reviewed role holders."""

from __future__ import annotations

import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path

from build_market_performance import fetch_chart, normalise

ROOT = Path(__file__).resolve().parents[1]


def monthly_points(points: list[dict]) -> list[dict]:
    """Yahoo can append a daily quote to the current monthly bucket. Keep one per month."""
    months = {}
    for point in sorted(points, key=lambda p: p["date"]):
        date = point["date"]
        observed = datetime.fromisoformat(date).date()
        if observed > datetime.now(timezone.utc).date():
            raise ValueError("Market observation is in the future")
        if not all(math.isfinite(point[k]) and point[k] > 0 for k in ("close", "adjustedClose")):
            raise ValueError("Non-positive or non-finite market observation")
        months[date[:7]] = point
    return list(months.values())


def main() -> None:
    leadership = json.loads((ROOT / "public/data/us-leadership.json").read_text())
    companies = [c for c in leadership["companies"] if c["roles"]]
    earliest = min(r["chartStartDate"] for c in companies for r in c["roles"].values())
    period1 = int(datetime.fromisoformat(earliest).replace(tzinfo=timezone.utc).timestamp())
    benchmark = monthly_points(fetch_chart("^GSPC", period1))
    if len(benchmark) < 2:
        raise ValueError("Insufficient S&P 500 benchmark history")
    series = []
    for company in companies:
        start = min(r["chartStartDate"] for r in company["roles"].values())
        # Include a prior observation for detecting a post-appointment listing gap.
        beginning = datetime.fromisoformat(start).replace(tzinfo=timezone.utc) - timedelta(days=45)
        symbol = company["ticker"].replace(".", "-")
        points = monthly_points(fetch_chart(symbol, int(beginning.timestamp())))
        if not points:
            raise ValueError(f"No price history for {symbol}")
        series.append({
            "ticker": company["ticker"],
            "companyName": company["companyName"],
            "marketSymbol": symbol,
            "scaleAdjustmentCount": 0,
            "roles": {role: {
                "name": company["roles"].get(role, {}).get("name", "Awaiting review"),
                "roleStartDate": company["roles"].get(role, {}).get("chartStartDate"),
            } for role in ("ceo", "chair")},
            "points": normalise(points),
        })
    payload = {
        "metadata": {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "companyCount": len(series),
            "sourceName": "Yahoo Finance public chart endpoint",
            "sourceUrl": "https://finance.yahoo.com/",
            "frequency": "Monthly; current month is provisional",
            "methodology": "Split-adjusted close and dividend-adjusted close rebased within the selected tenure. One observation per calendar month. Month/year-only appointments start after the uncertain appointment period.",
            "scaleTreatment": "Provider split adjustments retained. No UK currency-scale correction applied to USD series.",
            "scaleAdjustmentCount": 0,
            "limitations": "Public-data research series. Adjusted close is a dividend-adjusted return proxy, not a licensed TSR index. No causal attribution to leadership. Listings may start after appointment. Current-month observation is provisional.",
            "validation": {"status": "pass", "errors": []},
        },
        "benchmark": {"symbol": "^GSPC", "name": "S&P 500 price index", "points": normalise(benchmark)},
        "companies": series,
    }
    output = ROOT / "public/data/us-market-performance.json"
    temporary = output.with_suffix(".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n")
    temporary.replace(output)
    print(f"Published {len(series)} US market series")


if __name__ == "__main__":
    main()
