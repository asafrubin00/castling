export type Scope = 'index' | 'industry'
export type Metric = {
  scope: Scope; year: number; quarter: number; segment: string
  incoming_count: number | null; incoming_pct: number | null
  outgoing_count: number | null; outgoing_pct: number | null
  avg_outgoing_tenure_years: number | null; company_count: number | null
}
export type Split = {
  scope: Scope; year: number; quarter: number; segment: string
  flow: 'incoming' | 'outgoing'; split_type: string; split_value: string
  count_value: number | null; pct_value: number | null
}
export type TurnoverData = {
  metadata: {
    firstPeriod: string; lastPeriod: string; importedOn: string; sourceName: string
    sourceUrl: string; sourceRepository: string; sourceCommit: string; refresh: string; review: string
    indexCount: number; industryCount: number; metricRowCount: number; splitRowCount: number
  }
  metrics: Metric[]; splits: Split[]
}
export type Filters = { scope: Scope; segment: string; year: string; quarter: string }
const labels: Record<string, string> = {
  ASX200: 'ASX 200', CAC40: 'CAC 40', DAX40: 'DAX 40', EuroNext100: 'Euronext 100',
  FTSE100: 'FTSE 100', FTSE250: 'FTSE 250', HANGSENG: 'Hang Seng', NSENifty50: 'NSE Nifty 50',
  Nikkei225: 'Nikkei 225', SP500: 'S&P 500', 'SPTSX Composite': 'S&P/TSX Composite',
}
export const displaySegment = (segment: string) => labels[segment] ?? segment
export const periodKey = (row: { year: number; quarter: number }) => row.year * 4 + row.quarter - 1
export const periodLabel = (row: { year: number; quarter: number }) => `${row.year} Q${row.quarter}`
export const matchesPeriod = (row: { year: number; quarter: number }, filters: Filters) =>
  (filters.year === 'all' || row.year === Number(filters.year)) && (filters.quarter === 'all' || row.quarter === Number(filters.quarter))
export const hasMetric = (row: Metric) => row.incoming_pct != null || row.outgoing_pct != null || row.incoming_count != null || row.outgoing_count != null

export function selectedSeries(data: TurnoverData, filters: Filters) {
  return data.metrics.filter((r) => r.scope === filters.scope && r.segment === filters.segment && matchesPeriod(r, filters) && hasMetric(r)).sort((a, b) => periodKey(a) - periodKey(b))
}

export function previousQuarter(data: TurnoverData, current: Metric | undefined) {
  return current ? data.metrics.find((r) => r.scope === current.scope && r.segment === current.segment && periodKey(r) === periodKey(current) - 1) : undefined
}

export function comparisonRows(data: TurnoverData, filters: Filters, scope = filters.scope) {
  const rows = new Map<string, Metric>()
  data.metrics.filter((r) => r.scope === scope && r.segment !== 'Global' && matchesPeriod(r, filters) && r.outgoing_pct != null).forEach((r) => {
    const previous = rows.get(r.segment)
    if (!previous || periodKey(r) > periodKey(previous)) rows.set(r.segment, r)
  })
  return [...rows.values()].sort((a, b) => (b.outgoing_pct ?? 0) - (a.outgoing_pct ?? 0))
}

export function latestComposition(data: TurnoverData, filters: Filters, kind: string) {
  const rows = data.splits.filter((r) => r.scope === filters.scope && r.segment === filters.segment && r.split_type === kind && matchesPeriod(r, filters) && (r.pct_value != null || r.count_value != null))
  if (!rows.length) return []
  const latest = Math.max(...rows.map(periodKey))
  return rows.filter((r) => periodKey(r) === latest)
}

export function trendRows(data: TurnoverData, filters: Filters, peer: string) {
  const main = selectedSeries(data, filters)
  const peers = peer ? selectedSeries(data, { ...filters, segment: peer }) : []
  const periods = new Map<number, { period: number; label: string; departures: number | null; appointments: number | null; peer: number | null }>()
  for (const r of [...main, ...peers]) periods.set(periodKey(r), { period: periodKey(r), label: periodLabel(r), departures: null, appointments: null, peer: null })
  for (const r of main) Object.assign(periods.get(periodKey(r))!, { departures: r.outgoing_pct, appointments: r.incoming_pct })
  for (const r of peers) periods.get(periodKey(r))!.peer = r.outgoing_pct
  if (periods.size) {
    const keys = [...periods.keys()]
    for (let key = Math.min(...keys); key <= Math.max(...keys); key++) {
      if (filters.quarter !== 'all' && key % 4 + 1 !== Number(filters.quarter)) continue
      if (!periods.has(key)) periods.set(key, { period: key, label: `${Math.floor(key / 4)} Q${key % 4 + 1}`, departures: null, appointments: null, peer: null })
    }
  }
  return [...periods.values()].sort((a, b) => a.period - b.period)
}
