import copy
import json
import unittest
from datetime import date, timedelta
from pathlib import Path

from leadership_dates import calculation_date, role_at_date, succession_active_at
from build_market_performance import align_roles
from build_leadership_radar import succession_by_company, validate


ROOT = Path(__file__).resolve().parents[1]


class LeadershipDatesTests(unittest.TestCase):
    def setUp(self):
        self.old = {"role": "ceo", "name": "Outgoing", "roleStartDate": "2020-01-01", "roleEndDate": "2026-08-31"}
        self.new = {"name": "Incoming", "roleStartDate": "2026-09-14", "verifiedAt": "2026-11-22"}
        self.company = {"roles": {"ceo": self.new}, "previousRoles": [self.old]}

    def test_unreviewed_role_keeps_cohort_cutoff(self):
        self.assertEqual(calculation_date(self.old, "2026-08-15"), "2026-08-15")

    def test_individual_review_does_not_relabel_the_cohort(self):
        self.assertEqual(calculation_date(self.new, "2026-08-15"), "2026-11-22")

    def test_future_verification_is_rejected(self):
        with self.assertRaises(ValueError):
            calculation_date({**self.new, "verifiedAt": (date.today() + timedelta(days=1)).isoformat()}, "2026-08-15")

    def test_verification_before_role_start_is_rejected(self):
        with self.assertRaises(ValueError):
            calculation_date({**self.new, "verifiedAt": "2026-09-01"}, "2026-08-15")

    def test_historical_cutoff_resolves_outgoing_incumbent(self):
        self.assertEqual(role_at_date(self.company, "ceo", "2026-08-15")["name"], "Outgoing")
        self.assertEqual(role_at_date(self.company, "ceo", "2026-11-22")["name"], "Incoming")

    def test_unrecorded_interim_is_not_invented(self):
        self.assertIsNone(role_at_date(self.company, "ceo", "2026-09-05"))

    def test_completed_case_remains_active_at_old_audit_date_only(self):
        case = {"announcedDate": "2026-07-02", "completedAt": "2026-09-14"}
        self.assertTrue(succession_active_at(case, "2026-08-15"))
        self.assertFalse(succession_active_at(case, "2026-11-22"))


class PublicationTests(unittest.TestCase):
    def test_source_confirmed_completions_are_not_live(self):
        source = json.loads((ROOT / "data/leadership_sources.json").read_text())
        expansion = json.loads((ROOT / "data/leadership_sources_expansion.json").read_text())
        indexed = {row["ticker"]: row for row in source["companies"] + expansion["companies"]}
        successions = json.loads((ROOT / "data/succession_sources.json").read_text())
        grouped, errors = succession_by_company(successions, indexed)
        self.assertEqual(errors, [])
        live_ids = {case["id"] for company in grouped.values() for case in company["cases"]}
        for case in successions["cases"]:
            if case.get("completedAt"):
                self.assertNotIn(case["id"], live_ids)

    def test_month_precision_is_retained(self):
        source = json.loads((ROOT / "data/leadership_sources.json").read_text())
        barratt = next(row for row in source["companies"] if row["ticker"] == "BTRW")
        roles = [barratt["roles"]["ceo"], *barratt.get("previousRoles", [])]
        dean = next(role for role in roles if role["name"] == "Dean Banks")
        self.assertEqual(dean["datePrecision"], "month")

    def test_invalid_future_role_start_still_fails_validation(self):
        company = {"ticker": "TEST", "roles": {"ceo": {"rated": True, "score": 0, "sourceUrl": "https://example.com", "roleStartDate": "2026-09-01"}}}
        result = validate([], [], [company], "2026-08-15", [], [], [])
        self.assertTrue(any("Future role start" in error for error in result["errors"]))


class CachedMarketTests(unittest.TestCase):
    def setUp(self):
        self.market = {"metadata": {"generatedAt": "2026-11-20", "validation": {"status": "pass"}},
                       "companies": [{"ticker": "TEST", "roles": {}, "points": [{"date": "2026-10-01", "close": 100, "adjustedClose": 99}]}]}
        self.leadership = {"companies": [{"ticker": "TEST", "roles": {"ceo": {"name": "Incoming", "roleStartDate": "2026-09-14"}, "chair": {"name": "Chair", "roleStartDate": "2020-01-01"}}}]}

    def test_alignment_preserves_prices_and_download_date(self):
        before = copy.deepcopy(self.market)
        aligned, count = align_roles(self.market, self.leadership)
        self.assertEqual(count, 1)
        self.assertEqual(aligned["metadata"]["generatedAt"], before["metadata"]["generatedAt"])
        self.assertEqual(aligned["companies"][0]["points"], before["companies"][0]["points"])
        self.assertEqual(self.market, before)
        self.assertEqual(aligned["companies"][0]["roles"]["ceo"]["name"], "Incoming")

    def test_alignment_is_idempotent(self):
        aligned, _ = align_roles(self.market, self.leadership)
        again, count = align_roles(aligned, self.leadership)
        self.assertEqual(count, 0)
        self.assertEqual(again, aligned)

    def test_missing_or_duplicate_market_history_is_not_silently_accepted(self):
        with self.assertRaises(ValueError):
            align_roles({**self.market, "companies": []}, self.leadership)
        with self.assertRaises(ValueError):
            align_roles({**self.market, "companies": self.market["companies"] * 2}, self.leadership)

    def test_invalid_cached_snapshot_cannot_be_rebound(self):
        with self.assertRaises(ValueError):
            align_roles({**self.market, "metadata": {}}, self.leadership)


if __name__ == "__main__":
    unittest.main()
