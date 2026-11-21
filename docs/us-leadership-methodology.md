# US leadership evidence

## Published coverage

The first evidence batch covers 10 companies and 20 role appointments reviewed on 19 November 2026. From 21 November, the active map contains 100 S&P 100 research issuers. Publication counts distinguish verified CEO records, verified Chair records, reviewed companies and verified pairs. New filings can move a previously verified record back into review. The other 90 issuers have no inferred role holders or scores.

The cohort comes from [iShares S&P 100 ETF holdings](https://www.ishares.com/us/products/239723/ishares-sp-100-etf/latest-holdings.csv), matched by SEC issuer identifier (CIK). The 19 November snapshot has 101 equity share-class rows mapping to 100 distinct issuers. Alphabet's share classes are consolidated under GOOGL for consistent evidence and price joins. Cash and derivatives are excluded. Unmatched equities or an issuer count other than 100 stop publication. Index membership is a research approximation subject to review. Earlier S&P 500 pilot notes remain in `us-pilot.md` for provenance, and that broader expansion is deferred.

## Evidence standard

`data/us_leadership_sources.json` contains reviewed appointment evidence, current-role confirmation URLs and review dates. Sources are SEC filings, issuer-hosted filings, official appointment announcements and current company leadership pages. Historic appointments are checked against current-role evidence before publication. Current company biographies alone may omit precise effective dates.

CEO means the issuer's chief executive, excluding subsidiary CEOs. Chair means the board Chair, including executive chairs. Lead independent directors and committee chairs are separate positions. Each role retains its own effective date, even when one person holds both roles.

The NVIDIA 8-K filed 12 November 2026 specifies appointments effective 11 November. The effective date governs tenure. Its interim CEO designation and permanent search are preserved. Walmart's November 2026 filing appoints a director and does not change the CEO or Chair. Amazon's Chair tenure remains continuous from 1994 even though the executive-chair title began in 2021.

## Dates and analytics

Full dates are stored only when supported. Month/year-only sources retain that precision, without inventing a day. Approximate tenures use the latest possible appointment date as a conservative lower bound. Chart baselines begin after the uncertain month or year. Original source dates remain visible in the drawer.

Tiles display tenure years and interim markers. No US succession probability, governance rating or UK nine-year Chair reference is applied. US pressure scoring still requires separate methodology and validation. Shareholder voting data is not inferred from officer filings.

Market histories use Yahoo Finance's free chart endpoint. Split-adjusted closes and dividend-adjusted closes are rebased within each appointment period. The S&P 500 price index remains an explicitly labelled broad US price-return benchmark, separate from the S&P 100 company universe. Dividend-adjusted mode has no unmatched price-only benchmark. This is a research return proxy, not a licensed TSR series or a measure of causal CEO/Chair performance.

There is one observation per calendar month. A daily quote appended by the provider replaces the provisional current-month bucket instead of duplicating it. Fewer than two observations yield an explicit insufficient-history message. IPO gaps are disclosed, and the truncated series is not presented as full-tenure performance. Peer comparisons align months since appointment and may cover different economic periods.

## Refresh and safeguards

The existing US workflow runs weekdays at 12:30 UTC. It re-fetches the 100-issuer filing catalog, publishes reviewed leadership with freshness flags, and downloads market series for the reviewed cohort. These Python jobs do not use an AI model. Downloading sources never advances an evidence review date.

A separate local Codex automation reviews at most two companies each Monday at 09:00 Europe/London. It is capped at four targeted searches, six official source documents and ten minutes, with unresolved cases left pending. Changed filings take priority; otherwise the batch covers one due recheck and one new company. No catch-up burst or second batch is permitted in the same run. It uses Codex usage and requires local Codex availability. This is a gradual evidence programme, not a promise of continuously verified leadership across all 100 companies. Existing freshness safeguards still apply.

Any new Item 5.02, proxy statement, additional proxy material or 6-K dated on/after a role's review date triggers a conservative recheck. Date-only filing metadata means a same-day filing is also flagged. The rule does not infer that an officer change happened. A reviewer must resolve the filing. Ordinary Item 5.07 voting results alone do not revoke a checked appointment.

Evidence becomes review-required after 30 days or when filing discovery is more than four calendar days old. The browser independently enforces those deadlines. Last checked names and evidence remain visible, with current-role analytics paused. The app reports discovery dates, evidence review dates and latest price observations separately.

Builders validate issuer identity, duplicate issuers, role names/titles, dates, source URLs, role keys and finite positive market prices. Each JSON file is replaced atomically after successful construction. A failed market download keeps the previous market dataset and its timestamp. Workflow publication can still publish successful filing and leadership updates, then reports the market failure.

## Local commands

```bash
# Existing public catalog is sufficient for reproducible local builds.
npm run test:us
npm run data:us

# Refresh filing discovery first when needed. Supply a real SEC contact address.
SEC_CONTACT_EMAIL=your-email@example.com python3 scripts/collect_us_filings.py --sp100-research --coverage-output public/data/us-filing-coverage.json
```

## Remaining work

Verify the other 90 companies against current evidence in bounded batches, including effective appointment dates and any live succession arrangements, while resolving due rechecks. Expand the reviewed input incrementally and rerun both builders. Pending names must not be filled from memory or inferred from a filing's presence. US voting results and calibrated pressure scores are separate unfinished workstreams.
