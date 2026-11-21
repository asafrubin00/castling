import { useEffect, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { LegalLine } from '../components/LegalLine'
import { RadarDialog } from '../components/RadarDialog'
import { TurnoverMarketMap } from '../components/TurnoverMarketMap'
import { chartColours, chartTooltipStyle as tooltipStyle, chartAxisStyle as axis, chartLegendStyle } from '../lib/chartTheme'
import { comparisonRows, displaySegment, latestComposition, periodKey, periodLabel, previousQuarter, selectedSeries, trendRows, type Filters, type Scope, type TurnoverData } from '../lib/turnover'
import './TurnoverTrendsPage.css'

const views = [
  ['turnover', 'Turnover'], ['markets', 'Markets'], ['segments', 'Segments'],
  ['tenure', 'Tenure'], ['gender', 'Gender'], ['appointments', 'Internal / external'],
] as const
type View = typeof views[number][0]
const pct = (n: number | null | undefined) => n == null ? '—' : `${n.toFixed(1)}%`
const count = (n: number | null | undefined) => n == null ? '—' : n.toLocaleString('en-GB')
const quarterTick = (n: number) => `${Math.floor(n / 4)} Q${n % 4 + 1}`
const initialFilters: Filters = { scope: 'index', segment: 'Global', year: 'all', quarter: 'all' }

export function TurnoverTrendsPage() {
  const [data, setData] = useState<TurnoverData | null>(null)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [view, setView] = useState<View>('turnover')
  const [peer, setPeer] = useState('')
  const [methodOpen, setMethodOpen] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/data/turnover-trends.json', { signal: controller.signal, cache: 'no-cache' }).then((response) => {
      if (!response.ok) throw new Error('The turnover snapshot could not be loaded. Please try again shortly.')
      return response.json()
    }).then(setData).catch((failure) => { if (!controller.signal.aborted) setError(String(failure.message)) })
    return () => controller.abort()
  }, [])

  const segments = [...new Set(data?.metrics.filter((r) => r.scope === filters.scope).map((r) => r.segment) ?? [])]
    .sort((a, b) => a === 'Global' ? -1 : b === 'Global' ? 1 : displaySegment(a).localeCompare(displaySegment(b)))
  const years = [...new Set(data?.metrics.map((r) => r.year) ?? [])].sort((a, b) => b - a)
  const series = data ? selectedSeries(data, filters) : []
  const latest = series.at(-1)
  const previous = data ? previousQuarter(data, latest) : undefined
  const delta = latest?.outgoing_pct != null && previous?.outgoing_pct != null ? latest.outgoing_pct - previous.outgoing_pct : null
  const comparisons = data ? comparisonRows(data, filters) : []
  const markets = data ? comparisonRows(data, filters, 'index') : []
  const trend = data ? trendRows(data, filters, peer) : []
  const rateCeiling = Math.ceil(Math.max(1, ...trend.flatMap((r) => [r.departures ?? 0, peer ? r.peer ?? 0 : r.appointments ?? 0])) * 1.1)
  const tenure = series.map((r) => ({ period: periodKey(r), tenure: r.outgoing_count === 0 ? null : r.avg_outgoing_tenure_years }))
  const splitRows = data ? latestComposition(data, filters, view === 'gender' ? 'gender' : 'appointment') : []
  const categories = view === 'gender' ? ['Women', 'Men'] : ['Internal', 'External']
  const composition = (['incoming', 'outgoing'] as const).map((flow) => {
    const parts = splitRows.filter((r) => r.flow === flow)
    const total = parts.length && parts.every((r) => r.count_value != null) ? parts.reduce((sum, r) => sum + (r.count_value ?? 0), 0) : null
    return {
      name: flow === 'incoming' ? 'Incoming CEOs' : 'Outgoing CEOs',
      counts: Object.fromEntries(parts.map((r) => [r.split_value, r.count_value])),
      ...Object.fromEntries(categories.map((key) => [key, total !== 0 ? parts.find((r) => r.split_value === key)?.pct_value ?? null : null])),
      total,
    }
  })
  const chooseScope = (scope: Scope) => {
    setFilters((current) => ({ ...current, scope, segment: 'Global' }))
    setPeer('')
    if (scope === 'industry' && view === 'markets') setView('segments')
  }
  const chooseView = (next: View) => {
    setView(next)
    if (next === 'markets' && filters.scope !== 'index') {
      setFilters((current) => ({ ...current, scope: 'index', segment: 'Global' }))
      setPeer('')
    }
  }
  const selectMarket = (segment: string) => { setFilters((f) => ({ ...f, scope: 'index', segment })); setPeer(''); setView('turnover') }
  const selectedLabel = displaySegment(filters.segment)
  const titles: Record<View, string> = {
    turnover: peer ? 'CEO departure rates compared' : 'CEO appointments & departures',
    markets: 'Departures across global markets', segments: `Departure rates by ${filters.scope === 'index' ? 'index' : 'industry'}`,
    tenure: 'Average tenure of departing CEOs', gender: 'Gender composition', appointments: 'Internal & external appointments',
  }
  const periodText = latest ? periodLabel(latest) : 'No reported quarter'

  return <section className="ws turnover-screen">
    <div className="ws__inner ws__inner--turnover">
      <h1 className="sr-only">Turnover Trends</h1>
      {error ? <p role="alert">{error}</p> : !data ? <p role="status">Loading the quarterly turnover snapshot…</p> : <>
        <div className="ws-toolbar">
          <div className="ws-toolbar__group">
            <fieldset className="segmented-control"><legend className="sr-only">Explore by</legend><button type="button" aria-pressed={filters.scope === 'index'} className={filters.scope === 'index' ? 'is-active' : ''} onClick={() => chooseScope('index')}>Index</button><button type="button" aria-pressed={filters.scope === 'industry'} className={filters.scope === 'industry' ? 'is-active' : ''} onClick={() => chooseScope('industry')}>Industry</button></fieldset>
            <label className="radar-select radar-select--wide"><span className="sr-only">{filters.scope === 'index' ? 'Market / index' : 'Industry'}</span><select aria-label={filters.scope === 'index' ? 'Market / index' : 'Industry'} value={filters.segment} onChange={(e) => { setFilters({ ...filters, segment: e.target.value }); if (peer === e.target.value) setPeer('') }}>{segments.map((s) => <option key={s} value={s}>{displaySegment(s)}</option>)}</select></label>
            <label className="radar-select"><span className="sr-only">Year</span><select aria-label="Year" value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })}><option value="all">All years</option>{years.map((y) => <option key={y}>{y}</option>)}</select></label>
            <label className="radar-select"><span className="sr-only">Quarter</span><select aria-label="Quarter" value={filters.quarter} onChange={(e) => setFilters({ ...filters, quarter: e.target.value })}><option value="all">All quarters</option>{[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q}</option>)}</select></label>
            <button className="radar-action radar-action--quiet" type="button" onClick={() => { setFilters(initialFilters); setPeer(''); setView('turnover') }}>Reset</button>
          </div>
          <div className="ws-toolbar__group ws-toolbar__actions">
            <a className="radar-action" href="https://ceo-turnover-index.vercel.app/" target="_blank" rel="noreferrer">Original CEO Turnover Index <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
            <button className="radar-action" type="button" onClick={() => setMethodOpen(true)}>Coverage & method</button>
          </div>
        </div>
        <div className="ws-tabs" role="tablist" aria-label="Turnover analysis">
          {views.map(([key, label]) => <button type="button" role="tab" id={`turnover-tab-${key}`} aria-controls="turnover-panel" aria-selected={view === key} tabIndex={view === key ? 0 : -1} key={key} onClick={() => chooseView(key)} onKeyDown={(event) => {
            if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
              event.preventDefault()
              const index = views.findIndex(([v]) => v === key)
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? views.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + views.length) % views.length
              chooseView(views[next][0]); document.getElementById(`turnover-tab-${views[next][0]}`)?.focus()
            }
          }}>{label}</button>)}
        </div>
        <div className="turnover-summary" aria-live="polite"><strong>{selectedLabel} <span>· {periodText}</span></strong><span>{latest ? `${count(latest.outgoing_count)} departures among ${count(latest.company_count)} companies in the latest visible quarter.` : 'No observations match these filters. Try another year or quarter.'}</span></div>
        <div className="ws-kpis ws-kpis--notes">
          <div><span>Departure rate</span><strong>{pct(latest?.outgoing_pct)}</strong><small>{delta == null ? 'No previous-quarter comparison' : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pp vs previous calendar quarter`}</small></div>
          <div><span>Incoming CEOs</span><strong>{count(latest?.incoming_count)}</strong><small>{pct(latest?.incoming_pct)} appointment rate</small></div>
          <div><span>Outgoing tenure</span><strong>{latest && latest.outgoing_count !== 0 && latest.avg_outgoing_tenure_years != null ? `${latest.avg_outgoing_tenure_years.toFixed(1)} yrs` : '—'}</strong><small>{latest?.outgoing_count === 0 ? 'No departures in this quarter' : 'Published quarterly average'}</small></div>
          <div><span>Company coverage</span><strong>{count(latest?.company_count)}</strong><small>{series.length} reported quarters in this selection</small></div>
        </div>
        <div className="turnover-analysis" id="turnover-panel" role="tabpanel" aria-labelledby={`turnover-tab-${view}`}>
          <section className="turnover-chart-panel" aria-label={titles[view]}>
            <header className="turnover-chart-heading"><div><p>{view === 'markets' || view === 'segments' ? 'Latest reported quarter within the filters' : `${selectedLabel} · ${view === 'gender' || view === 'appointments' ? splitRows[0] ? periodLabel(splitRows[0]) : 'No composition reported' : series.length ? `${periodLabel(series[0])} – ${periodText}` : 'No observations'}`}</p><h2>{titles[view]}</h2></div>
              {view === 'turnover' && <label className="radar-select"><span>Compare departure rates</span><select value={peer} onChange={(e) => setPeer(e.target.value)}><option value="">Appointments vs departures</option>{segments.filter((s) => s !== filters.segment).map((s) => <option key={s} value={s}>{displaySegment(s)}</option>)}</select></label>}
            </header>
            {view === 'markets' ? markets.length ? <TurnoverMarketMap rows={markets} selected={filters.segment} onSelect={selectMarket} /> : <p className="turnover-empty">No reported market data for this period.</p>
              : (view === 'segments' ? !comparisons.length : view === 'gender' || view === 'appointments' ? !splitRows.length : !series.length) ? <p className="turnover-empty">No reported data for this selection. Missing observations are not treated as zero.</p>
                : <div className="turnover-chart">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    {view === 'turnover' ? <LineChart data={trend} margin={{ top: 12, right: 18, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke="var(--chart-grid)" vertical={false} /><XAxis dataKey="period" type="number" domain={['dataMin', 'dataMax']} allowDecimals={false} tickCount={5} tickFormatter={quarterTick} tick={axis} axisLine={false} tickLine={false} /><YAxis domain={[0, rateCeiling]} tickCount={6} tickFormatter={(v) => `${v}%`} tick={axis} axisLine={false} tickLine={false} width={46} />
                      <Tooltip labelFormatter={(v) => quarterTick(Number(v))} formatter={(v) => `${Number(v).toFixed(1)}%`} contentStyle={tooltipStyle} /><Legend iconType="plainline" iconSize={14} wrapperStyle={chartLegendStyle} />
                      <Line type="linear" name={peer ? selectedLabel : 'Departures'} dataKey="departures" stroke={chartColours[0]} strokeWidth={1.75} dot={trend.length === 1} isAnimationActive={false} />
                      <Line type="linear" name={peer ? displaySegment(peer) : 'Appointments'} dataKey={peer ? 'peer' : 'appointments'} stroke={chartColours[1]} strokeWidth={1.5} dot={trend.length === 1} isAnimationActive={false} />
                    </LineChart> : view === 'tenure' ? <AreaChart data={tenure} margin={{ top: 12, right: 18, bottom: 0, left: 0 }}>
                      <defs><linearGradient id="turnover-tenure-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chartColours[0]} stopOpacity={.18} /><stop offset="100%" stopColor={chartColours[0]} stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid stroke="var(--chart-grid)" vertical={false} /><XAxis dataKey="period" type="number" domain={['dataMin', 'dataMax']} allowDecimals={false} tickCount={5} tickFormatter={quarterTick} tick={axis} axisLine={false} tickLine={false} /><YAxis tickFormatter={(v) => `${v}y`} tick={axis} axisLine={false} tickLine={false} width={46} />
                      <Tooltip labelFormatter={(v) => quarterTick(Number(v))} formatter={(v) => `${Number(v).toFixed(1)} years`} contentStyle={tooltipStyle} /><Area type="linear" dataKey="tenure" name="Average outgoing tenure" stroke={chartColours[0]} strokeWidth={2} fill="url(#turnover-tenure-fill)" dot={tenure.length === 1} isAnimationActive={false} />
                    </AreaChart> : view === 'segments' ? <BarChart data={comparisons.map((r) => ({ ...r, label: displaySegment(r.segment) }))} layout="vertical" margin={{ top: 6, right: 20, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke="var(--chart-grid)" horizontal={false} /><XAxis type="number" tickFormatter={(v) => `${v}%`} tick={axis} axisLine={false} tickLine={false} /><YAxis dataKey="label" type="category" interval={0} width={142} tick={axis} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} labelFormatter={(_, payload) => { const row = payload[0]?.payload; return row ? `${row.label} · ${periodLabel(row)}` : '' }} formatter={(v) => `${Number(v).toFixed(1)}%`} /><Bar dataKey="outgoing_pct" name="Departure rate" fill={chartColours[0]} maxBarSize={14} radius={[0, 2, 2, 0]} isAnimationActive={false} />
                    </BarChart> : <BarChart data={composition} layout="vertical" margin={{ top: 20, right: 20, bottom: 12, left: 0 }}>
                      <CartesianGrid stroke="var(--chart-grid)" horizontal={false} /><XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={axis} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" width={116} tick={axis} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v, name, item) => [`${Number(v).toFixed(1)}% · ${count(item.payload.counts[String(name)])} CEOs`, String(name)]} /><Legend iconType="square" iconSize={9} wrapperStyle={chartLegendStyle} />
                      {categories.map((category, i) => <Bar key={category} dataKey={category} name={category} stackId="composition" fill={chartColours[i]} maxBarSize={36} isAnimationActive={false} />)}
                    </BarChart>}
                  </ResponsiveContainer>
                </div>}
            <p className="turnover-chart-footnote">{view === 'turnover' ? 'Quarterly rates are reported values, not annualised. Comparisons show departures only.' : view === 'tenure' ? 'Each point is the published average for CEOs departing that quarter. No-departure quarters are not applicable.' : view === 'segments' ? 'Each bar uses its own index or industry denominator. Groups may overlap and should not be added together.' : view === 'markets' ? 'The global market reference uses index data. Select a market to open its turnover history.' : 'Shares use each flow’s CEO count, not the company population. A flow with no events has no composition.'}</p>
          </section>
          <aside className="turnover-rail" aria-label="Context and coverage">
            <section><p className="turnover-eyebrow">{view === 'markets' ? 'Market reference' : 'Reading this view'}</p><h2>{view === 'markets' ? 'Explore a market' : `${selectedLabel} in context`}</h2>
              {view === 'markets' ? <div className="turnover-market-list">{markets.map((r) => <button type="button" key={r.segment} onClick={() => selectMarket(r.segment)}><span>{displaySegment(r.segment)}<small>{periodLabel(r)}</small></span><strong>{pct(r.outgoing_pct)}</strong></button>)}</div>
                : <><p>{latest ? `${periodText} records ${count(latest.outgoing_count)} departures and ${count(latest.incoming_count)} appointments. These are separate flows and need not balance within a quarter.` : 'No reported observations match this selection.'}</p>
                  <dl><div><dt>Latest departure rate</dt><dd>{pct(latest?.outgoing_pct)}</dd></div><div><dt>Previous calendar quarter</dt><dd>{pct(previous?.outgoing_pct)}</dd></div></dl>
                  {(view === 'gender' || view === 'appointments') && composition.filter((r) => r.total === 0).map((r) => <p key={r.name}>{r.name} · No events reported for the composition quarter.</p>)}</>}
            </section>
            <section className="turnover-source-note"><p className="turnover-eyebrow">Source & coverage</p><p>Russell Reynolds Associates<br />Global CEO Turnover Index</p><span>Imported snapshot · through {data.metadata.lastPeriod}</span><button type="button" onClick={() => setMethodOpen(true)}>Methodology & limitations <span aria-hidden="true">↗</span></button></section>
          </aside>
        </div>
        <footer className="ws-footer"><span>{data.metadata.firstPeriod} – {data.metadata.lastPeriod} · {data.metadata.indexCount} indices · {data.metadata.industryCount} industries · Quarterly snapshot</span><LegalLine /></footer>
      </>}
    </div>
    {methodOpen && <RadarDialog title="Turnover coverage and methodology" onClose={() => setMethodOpen(false)}><header className="radar-drawer-heading"><p>Turnover Trends</p><h2>Coverage & methodology</h2></header><div className="radar-method">
      <p>This view imports the quarterly dataset from your existing CEO Turnover Index. It covers {data?.metadata.firstPeriod ?? '2019 Q1'} through {data?.metadata.lastPeriod ?? '2026 Q3'}. The broader index/industry universe is distinct from the company dashboard's FTSE 100 and S&P 100 research cohorts.</p>
      <p>KPIs describe the latest reported quarter within your filters. The change is measured against the immediately preceding calendar quarter, even if that quarter is outside the selected filter. Rates and averages are preserved from the imported source; quarterly percentages are never summed into annual rates.</p>
      <p>Gender and internal/external views use the latest available composition quarter within the selected filters. Incoming and outgoing flows each have their own denominators. Zero events means composition and outgoing tenure are not applicable. Missing observations remain missing.</p>
      <p>Global is the publisher-derived global series. Index groups can overlap. Market markers are approximate index references; the map switches to index scope. No company-level departure probabilities are inferred from these aggregate statistics.</p>
      <p>{data?.metadata.review}</p><p>{data?.metadata.refresh} Imported {data?.metadata.importedOn}.</p>
      <p>AI analysis is not enabled. This page makes no model/API calls and incurs no AI usage when filtering or charting.</p>
      <p><a href={data?.metadata.sourceUrl ?? 'https://www.russellreynolds.com/en/insights/reports-surveys/global-ceo-turnover-index'} target="_blank" rel="noreferrer">Russell Reynolds Associates · original research</a></p>
      {data && <p><a href={data.metadata.sourceRepository} target="_blank" rel="noreferrer">Imported project</a> · source revision {data.metadata.sourceCommit.slice(0, 7)} · {data.metadata.metricRowCount} metric rows, {data.metadata.splitRowCount} composition rows</p>}
    </div></RadarDialog>}
  </section>
}
