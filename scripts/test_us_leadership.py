"""Offline regression tests for evidence gates and market-series integrity."""

import copy
import json
import unittest
from datetime import date
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from build_us_leadership import ROOT, build, start_bounds
from build_us_market_performance import monthly_points
from collect_us_filings import parse_holdings
import build_us_market_performance as market_builder


class LeadershipTests(unittest.TestCase):
    def setUp(self):
        self.today = date(2026, 11, 19)
        self.coverage = {
            "generatedAt": "2026-11-19T06:00:00+00:00",
            "issuers": [{"ticker": "EX", "cik": "0000000001", "companyName": "Example", "filings": []}],
        }
        self.sources = {
            "reviewPolicyDays": 30,
            "companies": [{
                "ticker": "EX", "cik": "0000000001", "reviewedAt": "2026-11-19",
                "currentSourceUrls": ["https://example.com/board"],
                "roles": {role: {"name": "A Person", "title": role, "startDate": "2020-02-29", "sourceUrl": "https://example.com/appointment"} for role in ("ceo", "chair")},
            }],
        }

    def result(self):
        return build(self.coverage, self.sources, self.today)

    def test_verified_counts(self):
        self.assertEqual(self.result()["metadata"]["verifiedCounts"], {"ceo": 1, "chair": 1})
        self.assertEqual(self.result()["metadata"]["verifiedPairCount"], 1)

    def test_pending_issuer_has_no_invented_role(self):
        self.coverage["issuers"].append({"ticker": "NEW", "cik": "0000000002", "companyName": "New", "filings": []})
        self.assertEqual(self.result()["companies"][1]["roles"], {})

    def test_identity_and_duplicate_checks(self):
        self.sources["companies"].append(copy.deepcopy(self.sources["companies"][0]))
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            self.result()
        self.sources["companies"].pop()
        self.sources["companies"][0]["cik"] = "0000000999"
        with self.assertRaisesRegex(ValueError, "identity"):
            self.result()

    def test_missing_name_date_and_source_fail_closed(self):
        role = self.sources["companies"][0]["roles"]["ceo"]
        for key, invalid in (("name", " "), ("startDate", "2026-02-30"), ("sourceUrl", "http://example.com"), ("startDate", "2027-01-01")):
            with self.subTest(key=key, invalid=invalid):
                previous = role[key]
                role[key] = invalid
                with self.assertRaises(ValueError):
                    self.result()
                role[key] = previous

    def test_source_precision_preserved(self):
        role = self.sources["companies"][0]["roles"]["chair"]
        role["startDate"] = "2018-01"
        result = self.result()["companies"][0]["roles"]["chair"]
        self.assertEqual(result["datePrecision"], "month")
        self.assertEqual(result["chartStartDate"], "2018-02-01")
        self.assertEqual(start_bounds("1994")[2], "year")
        self.assertEqual(start_bounds("2020-02")[1], date(2020, 2, 29))

    def test_new_filing_requires_recheck_but_keeps_name(self):
        self.coverage["issuers"][0]["filings"].append({"form": "8-K", "filedDate": "2026-11-19", "items": ["5.02"], "accession": "new", "sourceUrl": "https://example.com/new"})
        result = self.result()
        role = result["companies"][0]["roles"]["ceo"]
        self.assertEqual(role["status"], "review-required")
        self.assertEqual(role["name"], "A Person")
        self.assertEqual(result["metadata"]["verifiedPairCount"], 0)

    def test_voting_results_alone_do_not_revoke_role(self):
        self.coverage["issuers"][0]["filings"].append({"form": "8-K", "filedDate": "2026-11-19", "items": ["5.07"]})
        self.assertEqual(self.result()["metadata"]["verifiedPairCount"], 1)

    def test_age_expiry_does_not_renew_evidence(self):
        self.today = date(2026, 12, 19)
        self.coverage["generatedAt"] = "2026-12-19T06:00:00+00:00"
        role = self.result()["companies"][0]["roles"]["ceo"]
        self.assertEqual(role["status"], "review-required")
        self.assertEqual(role["reviewedAt"], "2026-11-19")

    def test_stale_discovery_requires_recheck(self):
        self.coverage["generatedAt"] = "2026-11-14T06:00:00+00:00"
        self.assertEqual(self.result()["metadata"]["verifiedPairCount"], 0)

    def test_repository_evidence_matches_current_roster(self):
        coverage = json.loads((ROOT / "public/data/us-filing-coverage.json").read_text())
        sources = json.loads((ROOT / "data/us_leadership_sources.json").read_text())
        payload = build(coverage, sources, date.fromisoformat(coverage["generatedAt"][:10]))
        self.assertEqual(payload["metadata"]["reviewedCompanyCount"], len(sources["companies"]))
        self.assertEqual(len(payload["companies"]), len(coverage["issuers"]))


class MarketTests(unittest.TestCase):
    def test_current_month_duplicate_is_consolidated(self):
        points = [{"date": day, "close": value, "adjustedClose": value} for day, value in (("2026-10-01", 10), ("2026-11-01", 11), ("2026-11-18", 12))]
        result = monthly_points(points)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[-1]["close"], 12)

    def test_impossible_market_prices_rejected(self):
        for value in (0, -1, float("nan"), float("inf")):
            with self.subTest(value=value), self.assertRaises(ValueError):
                monthly_points([{"date": "2026-11-18", "close": value, "adjustedClose": 10}])

    def test_future_market_dates_rejected(self):
        with self.assertRaises(ValueError):
            monthly_points([{"date": "2999-01-01", "close": 10, "adjustedClose": 10}])

    def test_failed_download_preserves_last_good_output(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            folder = root / "public/data"
            folder.mkdir(parents=True)
            (folder / "us-leadership.json").write_text(json.dumps({"companies": [{"ticker": "EX", "roles": {"ceo": {"chartStartDate": "2020-01-01"}}}]}))
            output = folder / "us-market-performance.json"
            output.write_text("last good dataset")
            with patch.object(market_builder, "ROOT", root), patch.object(market_builder, "fetch_chart", side_effect=RuntimeError("Source unavailable")):
                with self.assertRaises(RuntimeError):
                    market_builder.main()
            self.assertEqual(output.read_text(), "last good dataset")


class HoldingsTests(unittest.TestCase):
    def setUp(self):
        self.mapping = {
            "GOOG": {"ticker": "GOOG", "cik_str": 1652044},
            "GOOGL": {"ticker": "GOOGL", "cik_str": 1652044},
            "BRK.B": {"ticker": "BRK-B", "cik_str": 1067983},
        }

    def test_share_classes_consolidated_by_issuer(self):
        csv = 'Fund Holdings as of,"Nov 19, 2026"\nTicker,Asset Class\nGOOG,Equity\nGOOGL,Equity\nBRK B,Equity\nUSD,Cash\n'
        result = parse_holdings(csv, self.mapping)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]["ticker"], "GOOGL")
        self.assertEqual(result[1]["ticker"], "BRK.B")

    def test_legacy_equity_column_supported(self):
        result = parse_holdings('Ticker,Type\nGOOGL,EQUITY\n', self.mapping)
        self.assertEqual(len(result), 1)

    def test_unmatched_equity_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "Unmatched"):
            parse_holdings('Ticker,Asset Class\nUNKNOWN,Equity\n', self.mapping)

    def test_missing_table_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "header"):
            parse_holdings("Not a holdings table", self.mapping)


if __name__ == "__main__":
    unittest.main()
