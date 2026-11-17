# S&P 500 research pilot

The pilot cohort is the first 25 distinct issuers in the 13 November 2026 iShares Core S&P 500 ETF holdings snapshot, ordered by market value. Alphabet's two share classes count as one issuer. ETF holdings define the sample, and S&P DJI announcements should confirm membership changes for any ongoing index coverage. [Holdings snapshot source](https://www.ishares.com/us/products/239726/ishares-core-sp-500-etf/latest-holdings.csv) · [S&P 500 benchmark statement](https://www.spglobal.com/spdji/en/documents/additional-material/sp500-indices-benchmark-statement.pdf)

Pilot tickers in holdings order:

```text
AAPL NVDA MSFT AMZN GOOGL AVGO META LLY BRK.B TSLA
JPM MU AMD V XOM JNJ WMT MA ABBV COST
CVX PG PLTR KO CSCO
```

## Verified source examples

- Apple's Item 5.02 filing gives distinct decision, announcement and effective dates for John Ternus's CEO appointment and Tim Cook's move to executive chair. The tenure series should use the effective date, 1 September 2026. [Apple leadership filing](https://www.sec.gov/Archives/edgar/data/320193/000114036126015711/ef20071035_8k.htm)
- Apple's 2026 annual meeting results report separate counts for votes for, against, abstentions and broker non-votes. Join reported counts to the proxy statement for the board's recommendation and applicable voting standard. [Apple vote filing](https://www.sec.gov/Archives/edgar/data/320193/000114036126006577/ef20060722_8k.htm) · [Apple proxy statement](https://www.sec.gov/Archives/edgar/data/320193/000130817926000008/aapl_courtesy-pdf.pdf)

## Publication requirements

Collect filings by SEC issuer ID (CIK), start with the latest annual meeting and record amendments, vote counts, ballot treatment, board recommendation, verified appointment dates and filing links. Review withheld votes and abstentions explicitly before calculating dissent. Treat executive chairs, independent chairs and lead independent directors as distinct roles. A US pressure score requires its own methodology and calibration.

## Running the collector

Set `SEC_CONTACT_EMAIL` to the operator's contact address and run `python3 scripts/collect_us_filings.py` for the 25-company pilot. The script maps tickers to SEC issuer IDs, checks the previous 400 days of recent filing metadata, and writes a review queue to `data/raw/us/filing-review.json`. It retains amendments and includes Forms 6-K and 6-K/A as review candidates for foreign private issuers. An interrupted run preserves the prior file. This window is for discovery. Current role holders with older appointment dates need a historical backfill.

For collection across the full index, pass `--roster /path/to/roster.csv` with `ticker,cik` columns and one primary ticker per issuer. Use a dated roster from a source with the appropriate usage rights. The collector validates the 500 unique issuer identifiers and primary tickers. Membership changes require a fresh roster from that source. The ETF holdings file was used to define the internal pilot cohort.

For internal research, use `python3 scripts/collect_us_filings.py --holdings-research --output data/raw/us/full-filing-review.json`. The 16 November 2026 holdings snapshot contained 504 equity lines. Alphabet, Fox and News Corp each had two share classes linked to the same SEC issuer ID. Excluding the residual Hologic line left 500 distinct issuer IDs. The collector stops if any other equity line cannot be matched. [Holdings CSV](https://www.ishares.com/us/products/239726/ishares-core-sp-500-etf/latest-holdings.csv) · [S&P DJI Hologic deletion](https://www.spglobal.com/spdji/en/documents/indexnews/announcements/20260406-1482697/1482697_5holx.pdf)

The GitHub workflow supports a manual access test once the repository secret `SEC_CONTACT_EMAIL` is set. After a successful hosted run, set the repository variable `US_FILING_SCHEDULE_ENABLED=true` to enable weekday collection at 12:30 UTC. The workflow stores the pilot queue as a short-lived artifact. It does not publish company records or automatically apply filing candidates.

Initial requests returned HTTP 403. A local run using a declared operator contact successfully collected 190 filing candidates across all 25 pilot issuers. The candidates need review. The SEC filing pages above were independently verified, and `data/us_verified_samples.json` records the Apple leadership transition and two reviewed votes. A publishable roster, coverage review and a US market-data feed are still required for public launch. [SEC API documentation](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) · [SEC access guidelines](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data) · [S&P DJI constituent data](https://www.spglobal.com/spdji/en/about-us/data-index-licensing/)
