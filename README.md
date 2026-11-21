# Proxy Wars

Proxy Wars is a governance research portfolio project with a UK dashboard and a growing source-verified US leadership workspace.

- **Governance Radar**: the main source-backed FTSE 100 research surface, with integrated leadership-pressure and significant-voting lenses alongside profit-warning evidence, active succession processes, and tenure-period market performance.
- **Vote Explorer**: the supporting resolution-level workspace for verified significant shareholder dissent against management.
- **Turnover Trends**: global CEO turnover, tenure, gender and appointment-pathway analysis imported from the existing CEO Turnover Index, within the same navigation and visual system.

The site opens on a full-screen chess landing page, with three entrances: Heatmap, Turnover Trends and Proxy Voting. Inside, the same three tabs provide navigation. About is available from the landing page or the small information button in each workspace; it reuses the previous Overview content in a 75%-viewport dialog. Heatmap retains the UK/US market switch. UK leadership evidence covers the 100-company roster, with externally managed issuers marked not applicable where appropriate. US coverage is published incrementally with explicit verification counts. Voting evidence covers significant dissent rather than general AGM voting books.

Original site design, analytical frameworks, scoring methodology, governance taxonomy, visualisations, and written analysis are © 2026 Asaf Rubin. Public-source data and third-party materials remain the property of their respective owners. See the in-product Terms of Use for details.

## Preview

![Chess landing page](docs/screenshots/landing.png)

![Shared About window](docs/screenshots/about.png)

![Integrated Governance Radar](docs/screenshots/leadership-radar.png)

![Governance Radar voting lens](docs/screenshots/governance-voting-lens.png)

![Verified US leadership cohort](docs/screenshots/us-leadership.png)

![US Chair tenure performance](docs/screenshots/us-tenure.png)

![Integrated CEO Turnover Trends](docs/screenshots/turnover-trends.png)

![Global turnover market reference](docs/screenshots/turnover-markets.png)

## Current coverage

### Governance Radar

- Universe: a 100-company FTSE 100 public constituent snapshot.
- Leadership coverage: all 100 companies have official issuer sources for current CEO and Chair appointments or a sourced structural `not applicable` designation.
- Signals in methodology `v0.6`: role tenure, qualifying registered dissent, source-verified profit-warning evidence, and officially announced live CEO or Chair succession processes.
- Profit-warning audit: all 100 companies reviewed over 36 months, with 16 qualifying official events across 12 issuers as of 15 August 2026.
- Succession review: all 100 companies reviewed, with seven live processes captured in the current evidence window.
- Market-performance coverage: all 100 companies with monthly share-price and dividend-adjusted returns against the FTSE 100 price index.
- Calibration audit: 50 completed transitions and six active processes compared with 188 current role observations; all 50 completed cases now have complete aligned warning windows, while live weights remain unchanged.
- Leadership profiles: all 100 companies have source-backed CEO/Chair profile access. Thirty priority issuers have concise career biographies; the remaining 70 intentionally use appointment-only summaries from official evidence.
- Excluded for now: activism, controversies, broader news, and any unlicensed claim to institutional-grade TSR.
- Output: `public/data/leadership-radar.json`.

The score is a research-prioritisation device, not a prediction that an individual will leave office. Full details are in [the radar methodology](docs/leadership-radar-methodology.md).

### Proxy Voting

- 33 real significant management-dissent resolutions across 22 matched FTSE 100 issuers in the current dataset.
- Primary layer: [Investment Association Public Register](https://www.theia.org/public-register).
- Verification layer: official issuer announcements and selected issuer-published AGM result PDFs.
- Direct issuer layer: 61 complete meeting tables are re-fetched weekly; 645 resolution rows have been parsed from 31 issuer PDFs. Five post-register meetings are now reviewed, with three qualifying BP resolutions published from the 2026 AGM.
- Focus: 20%+ opposition on remuneration, director elections, capital authorities, and other board-accountability resolutions.
- Vote direction: management-sponsored motions use votes against; board-opposed shareholder proposals use votes for. Raw vote outcomes remain visible on each detail page.
- Output: `public/data/tracker-data.json`.

The IA Public Register stopped adding new cases after its October 2025 policy change. It remains useful as a historical base; configured direct issuer sources now extend the ingestion path beyond that date without publishing routine sub-threshold resolutions.

### US Leadership

- Active research roster contains 100 distinct SEC issuers from iShares S&P 100 ETF holdings, consolidating duplicate share classes. This is not an official licensed constituent feed. S&P 500 expansion is deferred.
- First evidence batch covers 10 companies and 20 CEO/Chair records, reviewed on 19 November 2026. Live verification counts can fall when new filings trigger a recheck. Checked companies are highlighted, while unreviewed or recheck-due companies remain muted.
- Tenure, share-price and dividend-adjusted charts are available for reviewed roles with sufficient history. NVIDIA's new interim CEO/Chair tenures do not yet have two monthly observations. Amazon and Tesla disclose pre-listing gaps.
- US tiles display **years in role**. US pressure scores remain unpublished pending jurisdiction-specific methodology and calibration.
- The other 90 companies remain awaiting their first review. Filing collection alone does not verify role holders.
- A Codex app automation reviews at most two companies each Monday at 09:00 Europe/London, prioritising changed evidence. Each run is limited to four targeted searches, six official documents and ten minutes. This uses Codex usage and depends on local Codex availability; it is separate from the ordinary GitHub data refresh.
- Weekday discovery flags newer officer/director and proxy filings. Reviews expire after 30 days, without silently renewing the review date. The UI also detects overdue discovery independently of a new build.
- Sources, date-precision treatment, publication rules and commands are documented in [US evidence methodology](docs/us-leadership-methodology.md).

### Turnover Trends

The `/turnover` view imports the existing CEO Turnover Index CSV snapshot, covering 2019 Q1 through 2026 Q3. It includes 13 index series and five industry series, alongside the supplied Global series. Six views cover turnover, markets, segment comparisons, outgoing tenure, gender and internal/external appointments.

The turnover workspace links to the original standalone site in a new browser tab. The chess image now belongs to the landing screen rather than its chart header. Existing `/radar` and `/dashboard` links redirect to `/heatmap`; `/overview` opens the shared About window from the landing page.

This is a quarterly snapshot with its own coverage label. It is separate from the company dashboard's FTSE 100/S&P 100 universe and its weekday source-monitoring schedule. AI analysis is disabled, so filtering and charting incur no model/API usage. Original Russell Reynolds Associates attribution, source-project revision and CSV fingerprints are preserved. See [integration methodology](docs/turnover-integration.md).

Use `npm run data:turnover` to validate/rebuild the imported CSVs, and `npm run test:turnover` for calculation and data-integrity tests. The original standalone project is unchanged.

## Stack

- React 19, TypeScript, and Vite
- React Router
- Recharts for Proxy Voting charts
- Python, Requests, Beautiful Soup, and pypdf for data ingestion
- Static JSON storage in the repository
- Vercel-ready static deployment

## Run locally

```bash
npm install
python3 -m pip install -r requirements.txt
npm run data
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

Create a production build with:

```bash
npm run build
```

## Data refresh

`npm run data` performs the connected builds:

1. Refreshes and verifies the significant-dissent dataset.
2. Fetches the public FTSE 100 roster snapshot, falling back to the cached snapshot if unavailable.
3. Joins both manually verified leadership source files. A newly detected constituent is published as unrated until official evidence is curated; no score is inferred automatically.
4. Validates the 100-company profit-warning review and joins approved official warning evidence.
5. Validates exact 100-company coverage for official active-succession review.
6. Recalculates role-specific pressure scores without allowing either overlay to change the score.
7. Refreshes and validates monthly market-performance series for all 100 companies.
8. Repairs and records isolated GBP/GBp scale switches, failing if an extreme discontinuity remains.
9. Rebuilds the source-backed leadership calibration audit without changing production weights.
10. Rebuilds complete profile coverage, then validates uniqueness, role-name alignment, source URLs, summaries, and local portrait references.
11. Runs validation before writing the public JSON files.

The GitHub Actions workflow in `.github/workflows/refresh-data.yml` runs weekly and can also be triggered manually. It re-fetches every configured AGM source, refreshes calculations, the constituent roster, and all market series, then checks official issuer pages for new earnings- and succession-related links. A separate weekday workflow in `.github/workflows/roster-watch.yml` checks the constituent roster before the full refresh. When evidence onboarding is required, it records the gap in `data/roster_readiness.json` and opens one GitHub issue; the main site remains available with the entrant clearly marked unrated. New AGM URLs and parser formats still require editorial onboarding, and announcement-monitor matches enter a typed review queue that never alters the radar automatically.

Run the monitor independently with `npm run data:monitor`. Its source health and editorial safeguards are explained in [the monitor methodology](docs/announcement-monitor-methodology.md).

The US workflow in `.github/workflows/us-filing-review.yml` runs weekdays at 12:30 UTC when `US_FILING_SCHEDULE_ENABLED=true`. It collects SEC candidates for the active S&P 100 cohort, validates reviewed appointments, flags rechecks and refreshes US market series. These ordinary Python jobs do not call an AI model. Changes are committed for the Git-connected deployment. Evidence review is handled separately in bounded weekly batches. A market-download failure preserves the last good price dataset and its actual timestamp while allowing successful evidence updates to publish.

`npm run data:us` rebuilds US leadership and prices using the saved filing catalog. `npm run test:us` runs offline publication-rule regressions. `npm run data` remains the UK pipeline.

## Project structure

```text
data/
  leadership_sources.json          # manually verified leadership evidence
  leadership_sources_expansion.json # second 50-company evidence cohort
  profit_warning_sources.json      # curated official warning events
  profit_warning_reviews.json      # warning-audit outcomes and official sources
  succession_sources.json          # official active-succession evidence
  leadership_transition_outcomes.json # official completed transition outcomes
  calibration_historical_evidence.json # aligned warning/dissent reviews for completed outcomes
  announcement_monitor_sources.json # official issuer monitoring configuration
  announcement_monitor_snapshot.json # previously seen announcement links
  announcement_review_queue.json  # candidates awaiting editorial review
  ftse100_constituents.json        # generated public roster snapshot
  roster_readiness.json            # generated entrant/departure onboarding state
  company_metadata.json            # Proxy Voting issuer aliases
  issuer_source_config.json        # direct voting-source seeds
docs/
  leadership-radar-methodology.md
  announcement-monitor-methodology.md
  project-log.md
public/data/
  leadership-radar.json
  market-performance.json
  leadership-calibration.json
  leadership-profiles.json
  tracker-data.json
scripts/
  build_leadership_radar.py
  build_market_performance.py
  build_dataset.py
src/
  pages/LeadershipRadarPage.tsx
  pages/DashboardPage.tsx
```

## Analytical limitations

- All 100 companies are source verified; six externally managed issuers have no issuer CEO and are not scored for that role.
- CEO tenure has no formal UK governance limit; the ten-year horizon is an analytical reference only.
- Chair tenure is interpreted in the context of the Code's nine-year independence and succession guidance.
- Historical dissent events are source backed. Eleven completed-transition windows now have complete meeting coverage, while the remainder stay partial; missing AGM history is never treated as zero and dissent remains excluded from aligned calibration.
- The profit-warning audit covers all 100 source-verified companies. A no-event outcome means no qualifying issuer announcement was identified under the stated definition and 36-month window, not that the company experienced no adverse trading developments.
- Warning and succession evidence are excluded from the score pending calibration and outcome testing.
- A public constituent table is used for reproducibility and is not an official FTSE Russell feed.
- Classification and parsing rules remain suitable for a portfolio MVP, not a commercial proxy-research service.
- Yahoo adjusted close is used only as a transparent dividend-adjusted research proxy; it is not a licensed total-return index and excludes tax, costs, and currency effects.
- The transition census comprises 50 completed transitions and six live processes. All 50 completed cases have complete aligned 36-month warning windows; the locked six-case evaluation sample still shows no capture improvement from warning or performance uplifts, so the audit supports sensitivity analysis rather than transition probabilities.

## Product roadmap

- Extend complete resolution-level AGM histories beyond the first eleven completed cases while preserving the 20% publication threshold.
- Reserve future completed transitions as a genuinely untouched evaluation cohort before changing production weights.
- Editorially enrich the 70 appointment-only leadership profiles only where stable official biographies add decision-useful context.
- Expand the live direct-issuer AGM registry beyond the current five post-October-2025 meetings while retaining editorial parser review before publication.
- Replace the public adjusted-close proxy with licensed total-return data if the project moves beyond portfolio research use.

## Verification

The current build is checked with:

```bash
npm run data:radar
npm run lint
npm run build
npm run test:us
```
