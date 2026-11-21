import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RadarDialog } from '../components/RadarDialog'
import { LegalLine } from '../components/LegalLine'
import { TenureChart } from '../components/TenureChart'
import { tenurePoints } from '../lib/tenure'
import type { MarketPerformanceData } from '../types'

type Role = 'ceo' | 'chair'
type Filing = { form: string; filedDate: string; items: string[]; sourceUrl: string; accession: string }
type Evidence = {
  name: string; title: string; startDate: string; datePrecision: 'day' | 'month' | 'year'
  chartStartDate: string; tenureYears: number; interim?: boolean; note?: string; sourceUrl: string
  reviewedAt: string; reviewDue: string; status: 'verified' | 'review-required'
  reviewReasons: string[]; newFilings: Filing[]
}
type Issuer = {
  ticker: string; cik: string; companyName: string; filings: Filing[]
  currentSourceUrls: string[]; roles: Partial<Record<Role, Evidence>>
}
type Coverage = {
  metadata: { generatedAt: string; asOfDate: string; filingsGeneratedAt: string; reviewPolicyDays: number; universeCount: number; universeName: string; rosterSourceUrl: string | null }
  companies: Issuer[]
}
const dates = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
function appointment(evidence: Evidence) {
  if (evidence.datePrecision === 'year') return evidence.startDate
  if (evidence.datePrecision === 'month') return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(evidence.startDate + '-01'))
  return dates.format(new Date(evidence.startDate))
}

export function USCoveragePage({ onUK }: { onUK?: () => void }) {
  const [data, setData] = useState<Coverage | null>(null)
  const [market, setMarket] = useState<MarketPerformanceData | null>(null)
  const [error, setError] = useState('')
  const [marketError, setMarketError] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Issuer | null>(null)
  const [role, setRole] = useState<Role>('ceo')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [metric, setMetric] = useState<'price' | 'adjusted'>('price')
  const [peer, setPeer] = useState('')
  const [methodOpen, setMethodOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const controller = new AbortController()
    const clock = window.setInterval(() => setNow(Date.now()), 60000)
    fetch('/data/us-leadership.json', { signal: controller.signal, cache: 'no-cache' })
      .then((response) => {
        if (!response.ok) throw new Error('US leadership data could not be loaded. Please try again shortly.')
        return response.json()
      })
      .then(setData)
      .catch((failure) => { if (!controller.signal.aborted) setError(String(failure.message)) })
    fetch('/data/us-market-performance.json', { signal: controller.signal, cache: 'no-cache' })
      .then((response) => {
        if (!response.ok) throw new Error('Market history could not be loaded. Leadership evidence remains available.')
        return response.json()
      })
      .then(setMarket)
      .catch((failure) => { if (!controller.signal.aborted) setMarketError(String(failure.message)) })
    return () => { controller.abort(); window.clearInterval(clock) }
  }, [])
  const today = new Date(now).toISOString().slice(0, 10)
  const discoveryOverdue = data ? now - Date.parse(data.metadata.filingsGeneratedAt) > 4 * 86400000 : true
  const isVerified = (evidence?: Evidence) => evidence?.status === 'verified' && today < evidence.reviewDue && !discoveryOverdue
  const verified = data?.companies.filter((issuer) => isVerified(issuer.roles[role])) ?? []
  const issuers = data?.companies.filter((issuer) =>
    (!verifiedOnly || isVerified(issuer.roles[role])) &&
    (issuer.companyName + ' ' + issuer.ticker).toLowerCase().includes(query.toLowerCase())) ?? []
  const evidence = selected?.roles[role]
  const history = market?.companies.find((company) => company.ticker === selected?.ticker)
  const points = tenurePoints(history, role)
  const chartMatchesEvidence = history?.roles[role].roleStartDate === evidence?.chartStartDate && history?.roles[role].name === evidence?.name
  const peers = verified.filter((issuer) => {
    const series = market?.companies.find((company) => company.ticker === issuer.ticker)
    return issuer.cik !== selected?.cik && tenurePoints(series, role).length >= 2 &&
      series?.roles[role].roleStartDate === issuer.roles[role]?.chartStartDate && series?.roles[role].name === issuer.roles[role]?.name
  })
  const activePeer = peers.some((issuer) => issuer.ticker === peer) ? peer : ''
  const chooseRole = (next: Role) => { setRole(next); setPeer('') }
  return (
    <section className="workspace-screen radar-screen" id="workspace">
      <div className="radar-workspace radar-workspace--map us-map-workspace">
        <header className="radar-title">
          <div><p>Company leadership & shareholder voting</p><h1>Heatmap</h1>
            <p className="workspace-guidance">US leadership research in progress · S&P 100 first. Select a company for evidence and tenure performance.</p></div>
          <div className="market-switch" aria-label="Market">
            {onUK ? <button type="button" onClick={onUK}>UK · FTSE 100</button> : <Link to="/heatmap">UK · FTSE 100</Link>}
            <button type="button" aria-pressed="true">US · S&P 100</button>
            <button type="button" onClick={() => setMethodOpen(true)}>Coverage & method</button>
          </div>
        </header>
        {error && <p role="alert">{error}</p>}
        <div className="radar-controls us-map-controls">
          <fieldset className="segmented-control"><legend>Role</legend>
            <button type="button" className={role === 'ceo' ? 'is-active' : ''} onClick={() => chooseRole('ceo')}>CEO</button>
            <button type="button" className={role === 'chair' ? 'is-active' : ''} onClick={() => chooseRole('chair')}>Chair</button>
          </fieldset>
          <label className="radar-select"><span>Find company</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or ticker" /></label>
          <div className="us-coverage-control"><span>{verified.length} / {data?.metadata.universeCount ?? '—'} {role === 'ceo' ? 'CEOs' : 'Chairs'} verified</span>
            <button className="radar-action" type="button" aria-pressed={verifiedOnly} onClick={() => setVerifiedOnly(!verifiedOnly)}>{verifiedOnly ? 'Show all companies' : 'Verified only'}</button></div>
        </div>
        <section className="radar-map-panel radar-map-panel--wide">
          <div className="radar-map-meta"><span>{issuers.length} companies shown</span><span>Tenure in years · ~ approximate · * interim · — awaiting verification</span></div>
          <div className={`radar-grid radar-grid--us ${issuers.length <= 50 ? 'radar-grid--us-subset' : ''}`} aria-label="US company map">
            {issuers.map((issuer) => {
              const checked = issuer.roles[role]
              const current = isVerified(checked)
              const value = current && checked ? `${checked.datePrecision === 'day' ? '' : '~'}${checked.tenureYears.toFixed(1)}${checked.interim ? '*' : ''}` : '—'
              const description = current && checked ? `${checked.name}, ${value} years in role` : checked ? 'leadership recheck due' : 'verification pending'
              return <button type="button" className={`heat-tile radar-tile ${current ? 'us-tile--verified' : 'heat-tile--unrated'}`} key={issuer.cik} title={`${issuer.companyName} · ${description}`} aria-label={`${issuer.companyName}, ${description}`} onClick={() => { setSelected(issuer); setPeer('') }}>
                <span>{issuer.ticker}</span><span aria-hidden="true">{value}</span>
              </button>
            })}
            {!issuers.length && <p className="radar-empty">{data ? 'No companies match this view.' : 'Loading US companies…'}</p>}
          </div>
        </section>
        <footer className="radar-footer radar-footer--map"><span>{data ? 'Filings refreshed ' + dates.format(new Date(data.metadata.filingsGeneratedAt)) : 'Fetching source coverage'}{discoveryOverdue && data ? ' · Refresh overdue' : ''}</span><LegalLine /></footer>
      </div>
      {methodOpen && <RadarDialog title="US coverage" onClose={() => setMethodOpen(false)}>
        <header className="radar-drawer-heading"><h2>US coverage</h2></header>
        <div className="radar-method">
          <p>The research cohort contains {data?.metadata.universeCount ?? 100} distinct SEC issuers mapped from S&P 100 fund holdings. Duplicate share classes are consolidated. This is a research roster, with index membership subject to review.</p>
          {data?.metadata.rosterSourceUrl && <p><a href={data.metadata.rosterSourceUrl} target="_blank" rel="noreferrer">iShares S&P 100 ETF holdings · roster source</a></p>}
          <p>Evidence verification expands in small weekly batches of two companies. The wider S&P 500 remains a possible later expansion.</p>
          <p>{verified.length} {role === 'ceo' ? 'CEO' : 'Chair'} records currently meet the evidence policy. Each needs an appointment source, a current-role source and an explicit review date. Pending companies remain unscored.</p>
          <p>Tiles show tenure in years. US governance pressure scores remain under development. Longer tenure alone does not establish governance risk, and the UK Chair nine-year reference is not applied here.</p>
          <p>Filing discovery and market downloads run each weekday. New officer/director or proxy filings flag reviewed records for a recheck. Human evidence review is due after {data?.metadata.reviewPolicyDays ?? 30} days. Downloading filings does not renew the review date.</p>
          <p>Month/year-only start dates keep their original precision. Charts begin after that uncertain period and are truncated where a company listed later. Current-month prices are provisional. Performance does not establish an individual leader's contribution.</p>
        </div>
      </RadarDialog>}
      {selected && <RadarDialog title={selected.companyName} className="radar-dialog--drawer" onClose={() => setSelected(null)}>
        <header className="radar-drawer-heading"><p>{selected.ticker} · US leadership</p><h2>{selected.companyName}</h2></header>
        <fieldset className="segmented-control"><legend>Role</legend>
          <button type="button" className={role === 'ceo' ? 'is-active' : ''} onClick={() => chooseRole('ceo')}>CEO</button>
          <button type="button" className={role === 'chair' ? 'is-active' : ''} onClick={() => chooseRole('chair')}>Chair</button>
        </fieldset>
        {evidence ? <>
          <section className="us-leadership-record">
            <div><p>{evidence.title}</p><h3>{evidence.name}</h3><p>In role since {appointment(evidence)}{evidence.datePrecision !== 'day' ? ' · approximate date' : ''}</p></div>
            <div><span>{isVerified(evidence) ? 'Source verified' : 'Recheck required'}</span><p>Reviewed {dates.format(new Date(evidence.reviewedAt))}</p></div>
          </section>
          {!isVerified(evidence) && <p className="us-review-alert" role="status">{evidence.reviewReasons.join('. ') || (discoveryOverdue ? 'Filing discovery is overdue.' : 'The scheduled leadership recheck is due.')} Last checked appointment retained below. Current-role analytics are paused.</p>}
          {evidence.note && <p className="radar-muted">{evidence.note}</p>}
          <section className="radar-performance">
            <div className="radar-chart-header"><h3>Tenure performance</h3>
              <label className="radar-select"><span>Return measure</span><select value={metric} onChange={(event) => setMetric(event.target.value === 'price' ? 'price' : 'adjusted')}><option value="price">Share price</option><option value="adjusted">Dividend-adjusted</option></select></label>
              <label className="radar-select"><span>Compare with</span><select value={activePeer} onChange={(event) => setPeer(event.target.value)}><option value="">{metric === 'price' ? 'S&P 500 benchmark' : 'Company only'}</option>{peers.map((issuer) => <option value={issuer.ticker} key={issuer.cik}>{issuer.companyName}</option>)}</select></label>
            </div>
            {activePeer && <p className="radar-muted">Aligned by months since each appointment. Different calendar periods may apply.</p>}
            {marketError ? <p role="status">{marketError}</p>
              : !isVerified(evidence) ? <p className="radar-empty">Awaiting an evidence recheck before displaying current-tenure analytics.</p>
                : !market ? <p className="radar-empty">Loading market history…</p>
                  : !chartMatchesEvidence ? <p className="radar-empty">Market history is awaiting alignment with this verified appointment.</p>
                    : <TenureChart market={market} tickers={[selected.ticker, ...(activePeer ? [activePeer] : [])]} role={role} metric={metric} window="tenure" compare={!!activePeer} />}
            {market && now - Date.parse(market.metadata.generatedAt) > 4 * 86400000 && <p className="us-review-alert" role="status">Market refresh overdue. The chart retains its last published observations.</p>}
            {points.length > 0 && <p className="radar-muted">Available role series · {dates.format(new Date(points[0].date))} – {dates.format(new Date(points.at(-1)!.date))}{points.length < 2 ? ' · Too early for a monthly return chart.' : ''}</p>}
            {history && evidence.chartStartDate < history.points[0]?.date && <p className="radar-muted">Price history begins after appointment. Full-tenure performance is unavailable.</p>}
            {evidence.datePrecision !== 'day' && <p className="radar-muted">Chart baseline starts after the source's {evidence.datePrecision}-only appointment period.</p>}
            {market && <details className="radar-chart-notes"><summary>Return methodology & freshness</summary><p>{market.metadata.methodology}</p><p>{market.metadata.limitations}</p><p>Market data downloaded {dates.format(new Date(market.metadata.generatedAt))}. Latest price date is shown above.</p><a href={market.metadata.sourceUrl} target="_blank" rel="noreferrer">{market.metadata.sourceName}</a></details>}
          </section>
          <details className="radar-chart-notes"><summary>Appointment & current-role evidence</summary>
            <p><a href={evidence.sourceUrl} target="_blank" rel="noreferrer">Appointment source</a></p>
            {selected.currentSourceUrls.map((url, index) => <p key={url}><a href={url} target="_blank" rel="noreferrer">Current-role evidence {index + 1}</a></p>)}
            {evidence.newFilings.map((filing) => <p key={filing.accession}><a href={filing.sourceUrl} target="_blank" rel="noreferrer">Recheck · {filing.form} · {filing.filedDate}</a></p>)}
          </details>
        </> : <p className="radar-empty">This company's {role === 'ceo' ? 'CEO' : 'Chair'} appointment has not yet been reviewed. Its filing evidence is available below.</p>}
        <details className="radar-chart-notes" open={!evidence}>
          <summary>Official filing candidates ({selected.filings.length})</summary>
          <div className="radar-evidence">{selected.filings.map((filing) => <section key={filing.accession}><a href={filing.sourceUrl} target="_blank" rel="noreferrer">{filing.form} · {filing.filedDate} · {filing.items.length ? 'Items ' + filing.items.join(', ') : 'Proxy materials'}</a></section>)}</div>
        </details>
      </RadarDialog>}
    </section>
  )
}
