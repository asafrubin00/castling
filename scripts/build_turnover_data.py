#!/usr/bin/env python3
"""Validate and publish the existing CEO Turnover Index CSV snapshot."""

import csv
import hashlib
import json
import math
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "data/turnover"


def number(value, field):
    if value == "":
        return None
    result = float(value)
    if not math.isfinite(result) or result < 0:
        raise ValueError(f"Invalid {field}: {value}")
    if field.endswith("pct") or field == "pct_value":
        if result > 100:
            raise ValueError(f"Percentage above 100: {value}")
    if field.endswith("count") or field in ("count_value", "company_count"):
        if not result.is_integer():
            raise ValueError(f"Non-integer count: {value}")
        return int(result)
    return result


def load_rows(path, scope=None, *, splits=False, denominators=False):
    result, seen = [], set()
    with path.open(newline="", encoding="utf-8-sig") as file:
        for raw in csv.DictReader(file):
            year, quarter = int(raw["year"]), int(raw["quarter"])
            if not 1900 <= year <= 2100 or quarter not in (1, 2, 3, 4) or not raw["segment"].strip():
                raise ValueError(f"Invalid period or segment in {path.name}")
            row_scope = scope or raw["scope"]
            if row_scope not in ("index", "industry"):
                raise ValueError("Invalid turnover scope")
            row = {"scope": row_scope, "year": year, "quarter": quarter, "segment": raw["segment"]}
            key = (row_scope, year, quarter, raw["segment"])
            if splits:
                if raw["flow"] not in ("incoming", "outgoing") or raw["split_type"] not in ("gender", "appointment", "first_timer"):
                    raise ValueError("Invalid turnover split")
                row.update({"flow": raw["flow"], "split_type": raw["split_type"], "split_value": raw["split_value"]})
                key += (raw["flow"], raw["split_type"], raw["split_value"])
                fields = ("count_value", "pct_value")
            elif denominators:
                fields = ("company_count",)
            else:
                fields = ("incoming_count", "incoming_pct", "outgoing_count", "outgoing_pct", "avg_outgoing_tenure_years", "company_count")
            if key in seen:
                raise ValueError(f"Duplicate turnover observation in {path.name}: {key}")
            seen.add(key)
            row.update({field: number(raw[field], field) for field in fields})
            result.append(row)
    return sorted(result, key=lambda r: (r["year"], r["quarter"], r["scope"], r["segment"]))


def build(folder):
    provenance = json.loads((folder / "provenance.json").read_text())
    metrics, splits = [], []
    for scope in ("index", "industry"):
        metrics += load_rows(folder / f"{scope}_quarterly_metrics.csv", scope)
        splits += load_rows(folder / f"{scope}_quarterly_splits.csv", scope, splits=True)
    denominators = load_rows(folder / "denominators_companies.csv", denominators=True)
    lookup = {(r["scope"], r["year"], r["quarter"], r["segment"]): r for r in denominators}
    for row in metrics:
        key = (row["scope"], row["year"], row["quarter"], row["segment"])
        if key not in lookup or row["company_count"] != lookup[key]["company_count"]:
            raise ValueError(f"Turnover denominator mismatch: {key}")
        for field in ("incoming_count", "outgoing_count"):
            if row[field] is not None and row["company_count"] is not None and row[field] > row["company_count"]:
                raise ValueError("CEO flow exceeds its company denominator")
    metric_lookup = {(r["scope"], r["year"], r["quarter"], r["segment"]): r for r in metrics}
    groups = defaultdict(list)
    for row in splits:
        key = (row["scope"], row["year"], row["quarter"], row["segment"])
        if key not in metric_lookup:
            raise ValueError("Composition has no matching metric observation")
        groups[key + (row["flow"], row["split_type"])].append(row)
    for key, rows in groups.items():
        flow_count = metric_lookup[key[:4]][key[4] + "_count"]
        if flow_count is not None and all(r["count_value"] is not None for r in rows):
            if sum(r["count_value"] for r in rows) != flow_count:
                raise ValueError(f"Composition count does not reconcile: {key}")
        if all(r["pct_value"] is not None for r in rows):
            expected = 0 if flow_count == 0 else 100
            if abs(sum(r["pct_value"] for r in rows) - expected) > .21:
                raise ValueError(f"Composition percentages do not reconcile: {key}")
    periods = sorted({(r["year"], r["quarter"]) for r in metrics})
    label = lambda p: f"{p[0]} Q{p[1]}"
    return {
        "metadata": {
            **provenance,
            "firstPeriod": label(periods[0]), "lastPeriod": label(periods[-1]),
            "metricRowCount": len(metrics), "splitRowCount": len(splits),
            "indexCount": len({r["segment"] for r in metrics if r["scope"] == "index" and r["segment"] != "Global"}),
            "industryCount": len({r["segment"] for r in metrics if r["scope"] == "industry" and r["segment"] != "Global"}),
            "files": {f.name: hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(folder.glob("*.csv"))},
            "refresh": "Imported quarterly snapshot. New source releases require an explicit reviewed import; weekday company-evidence refreshes do not update these series.",
            "validation": {"status": "pass", "errors": []},
        },
        "metrics": metrics, "splits": splits, "denominators": denominators,
    }


def main():
    payload = build(INPUT)
    output = ROOT / "public/data/turnover-trends.json"
    temporary = output.with_suffix(".tmp")
    temporary.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    temporary.replace(output)
    print(f"Published {len(payload['metrics'])} metric rows and {len(payload['splits'])} split rows, through {payload['metadata']['lastPeriod']}")


if __name__ == "__main__":
    main()
