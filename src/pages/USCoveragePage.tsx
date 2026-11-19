import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RadarDialog } from '../components/RadarDialog'
import { LegalLine } from '../components/LegalLine'

type Filing = { form: string; filedDate: string; items: string[]; sourceUrl: string; accession: string }
type Issuer = { ticker: string; cik: string; companyName: string; filings: Filing[] }
type Coverage = { generatedAt: string; filedSince: string; universe: string; issuers: Issuer[] }

export function USCoveragePage({ onUK }: { onUK?: () => void }) {
  const [data, setData] = useState<Coverage | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Issuer | null>(null)
  const [role, setRole] = useState<'ceo' | 'chair'>('ceo')
  const [methodOpen, setMethodOpen] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/data/us-filing-coverage.json', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('US filing coverage is awaiting its first successful refresh.')
        return response.json()
      })
      .then(setData)
      .catch((failure) => { if (!controller.signal.aborted) setError(String(failure.message)) })
    return () => controller.abort()
  }, [])
  const issuers = data?.issuers.filter((issuer) =>
    (issuer.companyName + ' ' + issuer.ticker).toLowerCase().includes(query.toLowerCase())) ?? []
  return (
    <section className="workspace-screen radar-screen" id="workspace">
      <div className="radar-workspace radar-workspace--map us-map-workspace">
      <header className="radar-title">
        <div><p>Company leadership & shareholder voting</p><h1>DashBoard</h1>
          <p className="workspace-guidance">Select a US company to inspect its filing evidence. Leadership verification is in progress.</p></div>
        <div className="market-switch" aria-label="Market">
          {onUK ? <button type="button" onClick={onUK}>UK · FTSE 100</button> : <Link to="/radar">UK · FTSE 100</Link>}
          <button type="button" aria-pressed="true">US · S&P 500</button>
          <button type="button" onClick={() => setMethodOpen(true)}>Coverage</button>
        </div>
      </header>
      {error && <p role="alert">{error}</p>}
      <div className="radar-controls us-map-controls">
        <fieldset className="segmented-control"><legend>Role</legend>
          <button type="button" className={role === 'ceo' ? 'is-active' : ''} onClick={() => setRole('ceo')}>CEO</button>
          <button type="button" className={role === 'chair' ? 'is-active' : ''} onClick={() => setRole('chair')}>Chair</button>
        </fieldset>
        <label className="radar-select"><span>Find company</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or ticker" /></label>
        <p className="workspace-guidance">500 research issuers · Roles and scores pending verification</p>
      </div>
      <section className="radar-map-panel radar-map-panel--wide">
        <div className="radar-map-meta"><span>{issuers.length} companies shown</span><span><i className="pending-dot" /> Verification pending</span></div>
        <div className="radar-grid radar-grid--us" aria-label="US company map">
          {issuers.map((issuer) => <button type="button" className="heat-tile radar-tile heat-tile--unrated" key={issuer.cik} title={issuer.companyName} aria-label={issuer.companyName + ', verification pending'} onClick={() => setSelected(issuer)}>
            <span>{issuer.ticker}</span><span aria-hidden="true">–</span>
          </button>)}
          {!issuers.length && <p className="radar-empty">{data ? 'No companies match your search.' : 'Loading US companies…'}</p>}
        </div>
      </section>
      <footer className="radar-footer radar-footer--map"><span>{data ? 'Filings refreshed ' + new Date(data.generatedAt).toLocaleDateString('en-GB') : 'Fetching source coverage'}</span><LegalLine /></footer>
      </div>
      {methodOpen && <RadarDialog title="US coverage" onClose={() => setMethodOpen(false)}>
        <header className="radar-drawer-heading"><h2>US coverage</h2></header>
        <div className="radar-method">
          <p>The research cohort contains 500 distinct SEC issuers mapped from S&P 500 fund holdings. Duplicate share classes are consolidated.</p>
          <p>Filing discovery refreshes every weekday. Names, effective appointment dates, voting outcomes and tenure charts require verification against those filings before publication.</p>
          <p>Neutral tiles indicate pending leadership verification. Item 5.02 covers several officer and director events. The filing must be read to establish whether it changes the CEO or Chair.</p>
          <p>{data?.universe}</p>
        </div>
      </RadarDialog>}
      {selected && <RadarDialog title={selected.companyName} className="radar-dialog--drawer" onClose={() => setSelected(null)}>
        <header className="radar-drawer-heading"><p>{selected.ticker} · US · {role === 'ceo' ? 'CEO' : 'Chair'}</p><h2>{selected.companyName}</h2><p className="workspace-guidance">Leadership and tenure performance awaiting verification.</p></header>
        <section className="radar-evidence">
          <h3>Official filing evidence</h3>
          <p className="radar-muted">Review appointments in Item 5.02 and proxy materials. Item 5.07 contains shareholder voting outcomes.</p>
          {selected.filings.map((filing) => <section key={filing.accession}><a href={filing.sourceUrl} target="_blank" rel="noreferrer">
            {filing.form} · {filing.filedDate} · {filing.items.length ? 'Items ' + filing.items.join(', ') : 'Proxy materials'}
          </a></section>)}
        </section>
      </RadarDialog>}
    </section>
  )
}
