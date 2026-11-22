# Turnover Trends integration

## Scope and provenance

Turnover Trends is a native React view within Castling at `/turnover`. It imports the existing CEO Turnover Index project's five CSV files unchanged. `data/turnover/provenance.json` records the original repository, source revision, attribution and import date. The generated dataset contains SHA-256 fingerprints of each imported CSV.

The imported snapshot covers 2019 Q1 through 2026 Q3, with 620 index/industry metric observations and 7,440 composition observations. There are 13 named index series plus Global, and five industry series plus Global. The global series is preserved as supplied; overlapping indices are never added into a synthetic global total.

The original project's data attribution is Russell Reynolds Associates' Global CEO Turnover Index. This integration performs structural and numerical validation. It does not represent an independent re-verification of every imported observation against the publisher. CSV rows remain unchanged and no missing values are filled. The original project and its deployment are untouched.

## Views and calculations

- Turnover shows reported quarterly appointment and departure rates, with one optional index/industry departure-rate comparison.
- Markets uses the existing project's local GeoJSON, with approximate market markers and click-through to index histories. The map explicitly uses index scope.
- Segments compares each segment's latest available departure rate within the selected time filters, labelled with its own quarter. Each index/industry retains its own denominator.
- Tenure shows published quarterly average outgoing tenure. A quarter with no departures has no applicable tenure value.
- Gender and internal/external views show the latest available composition quarter within the selected scope, segment and period. Incoming and outgoing flows each have their own event denominators. A zero-event flow has no composition.
- KPIs use the latest visible quarter. The displayed change is the difference in percentage points from the previous calendar quarter, including across year boundaries. Quarterly rates and tenure averages are not summed across the selected period.

Null observations produce gaps rather than zero returns. Missing calendar quarters are explicit gaps on the trend chart. Year and quarter filters intersect, so selecting unreported 2026 Q4 displays a proper empty state.

## Refresh and cost

This is an imported quarterly snapshot. The weekday UK/US filing and price jobs do not update it. New publisher releases require a reviewed CSV import and a new import date in provenance. The app shows its coverage endpoint instead of implying live refresh.

No OpenAI route or AI-generated analysis panel was imported. Filtering, comparisons, map selection and chart rendering execute locally in the browser without model/API calls. The map, chess image and chart library are local assets rather than remote runtime dependencies.

## Rebuilding and validation

```bash
npm run data:turnover
npm run test:turnover
npm run lint
npm run build
```

`scripts/build_turnover_data.py` validates periods, duplicate observations, finite/nonnegative numbers, percentage bounds, integer counts, denominator joins and composition reconciliation. Zero-event compositions correctly sum to zero, rather than being forced to 100%. Publication is atomic after validation.

The source CSVs live under `data/turnover`, generated JSON under `public/data`, and the existing project's chess image and world GeoJSON under `public/turnover`. The React view uses the app's existing Recharts dependency. No new package or backend is required.

Navigation update, 21 November 2026. The original chess photograph now fills the landing page, with direct Heatmap, Turnover Trends and Proxy Voting entrances. There is no scroll-to-enter step. The turnover workspace no longer repeats the image and links to the original CEO Turnover Index in a new tab. The old Overview wording is reused in a shared About dialog. Brand name, favicon, analytical data and proxy-voting calculations remain unchanged.
