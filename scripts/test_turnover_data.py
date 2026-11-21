import json
import tempfile
import unittest
from pathlib import Path

from build_turnover_data import INPUT, ROOT, build, load_rows, number


class TurnoverDataTests(unittest.TestCase):
    def test_import_preserves_row_counts(self):
        data = build(INPUT)
        self.assertEqual(len(data["metrics"]), 620)
        self.assertEqual(len(data["splits"]), 7440)
        self.assertEqual(len(data["denominators"]), 620)
        self.assertEqual(data["metadata"]["lastPeriod"], "2026 Q3")

    def test_imported_csv_fingerprints_match_public_snapshot(self):
        public = json.loads((ROOT / "public/data/turnover-trends.json").read_text())
        self.assertEqual(public["metadata"]["files"], build(INPUT)["metadata"]["files"])

    def test_impossible_values_rejected(self):
        for value, field in (("NaN", "incoming_pct"), ("Infinity", "count_value"), ("-1", "outgoing_count"), ("101", "pct_value"), ("1.5", "incoming_count")):
            with self.subTest(value=value, field=field), self.assertRaises(ValueError):
                number(value, field)

    def test_missing_is_distinct_from_zero(self):
        self.assertIsNone(number("", "incoming_pct"))
        self.assertEqual(number("0", "incoming_pct"), 0)

    def test_duplicate_rows_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "metrics.csv"
            text = (INPUT / "index_quarterly_metrics.csv").read_text().splitlines()
            path.write_text("\n".join([text[0], text[1], text[1]]))
            with self.assertRaisesRegex(ValueError, "Duplicate"):
                load_rows(path, "index")


if __name__ == "__main__":
    unittest.main()
