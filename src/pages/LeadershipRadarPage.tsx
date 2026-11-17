import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LegalLine } from '../components/LegalLine'
import { RadarDialog } from '../components/RadarDialog'
import { TenureChart } from '../components/TenureChart'
import { tenurePoints } from '../lib/tenure'
import type { LeadershipProfilesData, LeadershipRadarData, MarketPerformanceData } from '../types'

type Role = 'ceo' | 'chair'
type Lens = 'integrated' | 'voting'
type Company = LeadershipRadarData['companies'][number]
const pressureBands = ['Acute', 'Elevated', 'Watch', 'Lower', 'Not applicable', 'Unrated']
const votingBands = ['Severe', 'Strong', 'Significant', 'No captured signal']
const dateLabel = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const monthLabel = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })

function appointmentLabel(role: Company['roles'][Role]) {
  const date = role.roleStartDate
  if (!date) return ''
  if (role.datePrecision === 'year') return date.slice(0, 4)
  return (role.datePrecision === 'month' ? monthLabel : dateLabel).format(new Date(date))
}

function bandClass(band: string, lens: Lens = 'integrated') {
  return 'heat-tile--' + (lens === 'voting' ? 'vote-' : '') + band.toLowerCase().replaceAll(' ', '-')
}

function votingBand(value: number | null | undefined) {
  if (value == null) return votingBands[3]
  if (value >= 50) return votingBands[0]
  return value >= 30 ? votingBands[1] : votingBands[2]
}

function voteValue(company: Company, role: Role) {
  return company.roles[role].dissentEvidence?.maxManagementDissentPct
}

export function LeadershipRadarPage({ data, marketData, profilesData }: {
  data: LeadershipRadarData
  marketData: MarketPerformanceData
  profilesData: LeadershipProfilesData
}) {
  const [role, setRole] = useState<Role>('ceo')
  const [lens, setLens] = useState<Lens>('integrated')
  const [sector, setSector] = useState('')
  const [band, setBand] = useState('')
  const [query, setQuery] = useState('')
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)
  const [methodOpen, setMethodOpen] = useState(false)
  const [view, setView] = useState<'performance' | 'evidence' | 'compare'>('performance')
  const [metric, setMetric] = useState<'adjusted' | 'price'>('adjusted')
  const [window, setWindow] = useState<'tenure' | 'calendar'>('tenure')
  const [peers, setPeers] = useState<string[]>([])

  const bands = lens === 'voting' ? votingBands : pressureBands
  const sectors = [...new Set(data.companies.map((company) => company.sector))].sort()
  const roleLabel = role === 'ceo' ? 'CEO' : 'Chair'
  const getBand = (company: Company) => lens === 'voting' ? votingBand(voteValue(company, role)) : company.roles[role].band
  const getValue = (company: Company) => lens === 'voting' ? voteValue(company, role) : company.roles[role].score
  const visible = data.companies.filter((company) =>
    (!sector || company.sector === sector) && (!band || getBand(company) === band) &&
    (company.ticker + ' ' + company.companyName).toLowerCase().includes(query.trim().toLowerCase()),
  ).sort((a, b) => (getValue(b) ?? -1) - (getValue(a) ?? -1) || a.ticker.localeCompare(b.ticker))
  const selected = data.companies.find((company) => company.ticker === selectedTicker)
  const selectedRole = selected?.roles[role]
  const profile = profilesData.companies.find((company) => company.ticker === selectedTicker)?.roles[role]
  const comparable = marketData.companies.filter((company) =>
    data.companies.some((member) => member.ticker === company.ticker &&
      member.roles[role].roleStartDate === company.roles[role].roleStartDate) &&
    tenurePoints(company, role).length >= 2,
  ).sort((a, b) => a.companyName.localeCompare(b.companyName))
  const canCompare = comparable.some((company) => company.ticker === selectedTicker)
  const methodology = data.metadata.scoreDefinition
  const pendingCount = data.metadata.rosterReadiness?.pendingEntrants.length ?? 0

  return (
    <section className="workspace-screen workspace-screen--radar radar-screen" id="workspace">
      <div className="radar-workspace radar-workspace--map">
        <header className="radar-title">
          <div><p>FTSE 100</p><h1>Governance Radar</h1></div>
          <button className="radar-action" type="button" onClick={() => setMethodOpen(true)}>ⓘ Method</button>
        </header>
        <div className="radar-controls">
          <fieldset className="segmented-control"><legend>Signal</legend>
            <button type="button" aria-pressed={lens === 'integrated'} className={lens === 'integrated' ? 'is-active' : ''} onClick={() => { setLens('integrated'); setBand('') }}>Leadership</button>
            <button type="button" aria-pressed={lens === 'voting'} className={lens === 'voting' ? 'is-active' : ''} onClick={() => { setLens('voting'); setBand('') }}>Voting</button>
          </fieldset>
          <fieldset className="segmented-control"><legend>Role</legend>
            <button type="button" aria-pressed={role === 'ceo'} className={role === 'ceo' ? 'is-active' : ''} onClick={() => setRole('ceo')}>CEO</button>
            <button type="button" aria-pressed={role === 'chair'} className={role === 'chair' ? 'is-active' : ''} onClick={() => setRole('chair')}>Chair</button>
          </fieldset>
          <label className="radar-select"><span>Company</span><input type="search" placeholder="Search name or ticker" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <label className="radar-select"><span>Sector</span><select value={sector} onChange={(event) => setSector(event.target.value)}><option value="">All sectors</option>{sectors.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="radar-select"><span>{lens === 'voting' ? 'Voting signal' : 'Pressure band'}</span><select value={band} onChange={(event) => setBand(event.target.value)}><option value="">All bands</option>{bands.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <section className="radar-map-panel radar-map-panel--wide" aria-label={lens === 'voting' ? 'Voting heatmap' : 'Leadership heatmap'}>
          <div className="radar-map-meta">
            <span aria-live="polite">{visible.length} of {data.metadata.constituentCount} companies</span>
            <div className="radar-legend" aria-label="Heatmap legend">{bands.map((item) => <span key={item}><i className={bandClass(item, lens)} />{item}</span>)}</div>
            {(query || sector || band) && <button className="radar-action" type="button" onClick={() => { setQuery(''); setSector(''); setBand('') }}>Clear filters</button>}
          </div>
          <div className="radar-grid">
            {visible.map((company) => {
              const value = getValue(company)
              const status = getBand(company)
              const attention = lens === 'integrated' && (
                company.successionEvidence.cases.some((item) => item.role === role) ||
                company.profitWarningEvidence.count > 0 || (voteValue(company, role) ?? 0) >= 20
              )
              const label = value == null ? status : Math.round(value) + (lens === 'voting' ? '%' : '')
              return (
                <button key={company.ticker} type="button" className={'heat-tile radar-tile ' + bandClass(status, lens)}
                  aria-label={company.companyName + ', ' + label + (value == null ? '' : ', ' + status)}
                  title={company.companyName + ' · ' + status}
                  onClick={() => { setSelectedTicker(company.ticker); setPeers([]); setView(lens === 'voting' ? 'evidence' : 'performance') }}>
                  <span className="radar-tile__identity">
                    <b>{company.companyName.replace(/\s+(?:plc|p\.l\.c\.)$/i, '')}</b>
                    <small>{company.ticker}</small>
                  </span>
                  <strong>{value == null ? company.roles[role].notApplicable && lens === 'integrated' ? 'N/A' : '–' : label}</strong>
                  {attention && <i className="radar-tile__signal" aria-label="Additional evidence" />}
                </button>
              )
            })}
            {!visible.length && <p className="radar-empty">No companies match these filters.</p>}
          </div>
        </section>
        <footer className="radar-footer radar-footer--map">
          <span>Leadership evidence · {dateLabel.format(new Date(data.metadata.asOfDate))}{pendingCount > 0 ? ' · ' + pendingCount + ' pending verification' : ''}</span>
          <LegalLine />
        </footer>
      </div>
      {methodOpen && (
        <RadarDialog title="Radar methodology" onClose={() => setMethodOpen(false)}>
          <header className="radar-drawer-heading"><p>Method · v{data.metadata.methodologyVersion}</p><h2>Reading the Radar</h2></header>
          <div className="radar-method">
            <p>The pressure score prioritises governance research. It does not estimate the probability of departure.</p>
            <p>{methodology.ceo}</p><p>{methodology.chair}</p><p>{methodology.dissent}</p>
            <p>{methodology.profitWarnings}</p><p>{methodology.succession}</p>
            <p>A dot marks captured voting, earnings or succession evidence. Voting coverage is selective.</p>
            <p>Calibration reviewed {data.metadata.calibration.completedOutcomeCount} completed transitions and {data.metadata.calibration.activeOutcomeCount} active processes.</p>
            <a href={data.metadata.rosterSource.url} target="_blank" rel="noreferrer">Constituent source</a>
          </div>
        </RadarDialog>
      )}
      {selected && selectedRole && (
        <RadarDialog title={selected.companyName} className="radar-dialog--drawer" onClose={() => setSelectedTicker(null)}>
          <header className="radar-drawer-heading">
            <p>{selected.ticker} · {selected.sector} · {roleLabel}</p>
            <h2>{selected.companyName}</h2>
            <span>{selectedRole.name ?? selectedRole.band}{selectedRole.roleStartDate ? ' · Appointed ' + appointmentLabel(selectedRole) : ''}</span>
            <p className="radar-drawer-summary">{selectedRole.score != null ? selectedRole.score.toFixed(0) + '/100 · ' + selectedRole.band + ' · ' : ''}{selectedRole.reason}</p>
          </header>
          <nav className="radar-drawer-tabs" aria-label="Company details">
            <button type="button" aria-pressed={view === 'performance'} onClick={() => setView('performance')}>Performance</button>
            <button type="button" aria-pressed={view === 'evidence'} onClick={() => setView('evidence')}>Evidence</button>
            <button type="button" aria-pressed={view === 'compare'} disabled={!canCompare} onClick={() => setView('compare')}>Compare</button>
          </nav>
          {view === 'evidence' ? (
            <div className="radar-evidence">
              <section><h3>Leadership</h3>
                {selectedRole.sourceUrl && <a href={selectedRole.sourceUrl} target="_blank" rel="noreferrer">Official leadership source</a>}
                {profile && <details><summary>{profile.name} · profile</summary>
                  {profile.portraitPath && <img src={profile.portraitPath} alt={profile.name} />}
                  <p>{profile.summary}</p><a href={profile.sourceUrl} target="_blank" rel="noreferrer">Biography source</a>
                </details>}
              </section>
              <section><h3>Shareholder dissent</h3>
                {selectedRole.dissentEvidence?.records.map((record) => (
                  <Link key={record.id} to={'/resolution/' + record.id}>
                    <strong>{record.managementDissentPct.toFixed(1)}%</strong> · {record.title}
                    <small>{dateLabel.format(new Date(record.meetingDate))} · {record.scoreTreatment === 'included' ? 'Score eligible' : 'Context only'}</small>
                  </Link>
                ))}
                {!selectedRole.dissentEvidence?.records.length && <p>No significant vote captured in the tracker.</p>}
                <Link to="/proxy-voting">Open Vote Explorer</Link>
              </section>
              {selected.successionEvidence.cases.filter((item) => item.role === role).map((item) => (
                <section key={item.id}><h3>Succession · {dateLabel.format(new Date(item.announcedDate))}</h3>
                  <p>{item.summary}</p>
                  {item.successorName && <p>Successor · {item.successorName}{item.successorStartDate ? ' · Starts ' + dateLabel.format(new Date(item.successorStartDate)) : ''}</p>}
                  {item.incumbentDepartureDate && <p>Departure · {dateLabel.format(new Date(item.incumbentDepartureDate))}</p>}
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceLabel}</a>
                </section>
              ))}
              {!!selected.profitWarningEvidence.events.length && <section><h3>Profit warnings</h3>
                {selected.profitWarningEvidence.events.map((item) => <article key={item.id}>
                  <p>{dateLabel.format(new Date(item.announcementDate))} · {item.summary}</p>
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceLabel}</a>
                </article>)}
              </section>}
            </div>
          ) : (
            <section className="radar-performance">
              <div className="radar-chart-header">
                <h3>{view === 'compare' ? 'Compare tenure performance' : 'Tenure performance'}</h3>
                <label className="radar-select"><span>Return measure</span>
                  <select value={metric} onChange={(event) => setMetric(event.target.value === 'price' ? 'price' : 'adjusted')}><option value="adjusted">Dividend-adjusted</option><option value="price">Share price</option></select>
                </label>
              </div>
              {view === 'compare' && <>
                <div className="radar-compare-controls">
                  {[0, 1].map((index) => (
                    <label key={index} className="radar-select"><span>Peer {index + 1}</span>
                      <select value={peers[index] ?? ''} onChange={(event) => setPeers((previous) => {
                        const next = [...previous]
                        next[index] = event.target.value
                        return next
                      })}>
                        <option value="">Select company</option>
                        {comparable.filter((company) => company.ticker !== selected.ticker && company.ticker !== peers[1 - index]).map((company) => <option key={company.ticker} value={company.ticker}>{company.companyName}</option>)}
                      </select>
                    </label>
                  ))}
                  <label className="radar-select"><span>Align by</span>
                    <select value={window} onChange={(event) => setWindow(event.target.value === 'calendar' ? 'calendar' : 'tenure')}><option value="tenure">Time since appointment</option><option value="calendar">Common calendar window</option></select>
                  </label>
                </div>
                <ul className="radar-comparison-dates">
                  {[selected.ticker, ...peers.filter(Boolean)].map((ticker) => {
                    const company = data.companies.find((item) => item.ticker === ticker)
                    return company && <li key={ticker}><strong>{ticker}</strong> · {appointmentLabel(company.roles[role])}</li>
                  })}
                </ul>
              </>}
              {view === 'compare' && !peers.some(Boolean) ? <p className="radar-empty">Choose a peer to compare {roleLabel} tenures.</p>
                : canCompare ? <TenureChart market={marketData} role={role} metric={metric} window={window} compare={view === 'compare'} tickers={[selected.ticker, ...(view === 'compare' ? peers.filter(Boolean) : [])]} />
                  : <p className="radar-empty">Verified tenure performance is unavailable for this role.</p>}
              {canCompare && <details className="radar-chart-notes"><summary>About these returns</summary>
                <p>{marketData.metadata.methodology}</p><p>{marketData.metadata.limitations}</p>
                <a href={marketData.metadata.sourceUrl} target="_blank" rel="noreferrer">{marketData.metadata.sourceName}</a>
              </details>}
            </section>
          )}
        </RadarDialog>
      )}
    </section>
  )
}
