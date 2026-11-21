import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MarketPerformanceData } from '../types'
import { tenurePoints } from '../lib/tenure'
import { chartColours, chartTooltipStyle, chartAxisStyle } from '../lib/chartTheme'

type Role = 'ceo' | 'chair'
type Metric = 'price' | 'adjusted'
type Window = 'tenure' | 'calendar'
const colours = [chartColours[0], chartColours[1], chartColours[4]]

function monthIndex(date: string) {
  return Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1
}

function monthLabel(index: number) {
  return new Intl.DateTimeFormat('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' })
    .format(new Date(Date.UTC(Math.floor(index / 12), index % 12, 1)))
}

export function TenureChart({ market, tickers, role, metric, window, compare }: {
  market: MarketPerformanceData
  tickers: string[]
  role: Role
  metric: Metric
  window: Window
  compare: boolean
}) {
  const companies = tickers.map((ticker) => market.companies.find((company) => company.ticker === ticker))
  const histories = companies.map((company) => tenurePoints(company, role))
  const commonCalendar = compare && window === 'calendar'
  const calendarAxis = !compare || commonCalendar
  const valueKey = metric === 'price' ? 'close' : 'adjustedClose'

  if (histories.some((points) => points.length < 2)) {
    return <p className="radar-empty">There are fewer than two monthly observations for this role.</p>
  }

  const sharedMonths = commonCalendar
    ? histories[0].map((point) => monthIndex(point.date)).filter((month) =>
      histories.every((points) => points.some((point) => monthIndex(point.date) === month)))
    : []

  if (commonCalendar && sharedMonths.length < 2) {
    return <p className="radar-empty">These tenures share fewer than two monthly observations.</p>
  }

  const rows = new Map<number, Record<string, number>>()
  histories.forEach((history, index) => {
    const points = commonCalendar ? history.filter((point) => sharedMonths.includes(monthIndex(point.date))) : history
    const base = points[0][valueKey]
    const firstMonth = monthIndex(points[0].date)
    for (const point of points) {
      const month = monthIndex(point.date)
      const x = calendarAxis ? month : month - firstMonth
      const row = rows.get(x) ?? { x }
      row[tickers[index]] = (point[valueKey] / base - 1) * 100
      rows.set(x, row)
    }
  })
  const chartData = [...rows.values()].sort((a, b) => a.x - b.x)
  const showBenchmark = !compare && metric === 'price'
  if (showBenchmark) {
    const benchmark = new Map(market.benchmark.points.map((point) => [monthIndex(point.date), point.close]))
    const base = benchmark.get(chartData[0].x)
    if (base) {
      for (const row of chartData) {
        const value = benchmark.get(row.x)
        if (value != null) row.benchmark = (value / base - 1) * 100
      }
    }
  }

  return (
    <>
      <div className="radar-tenure-chart">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={chartData} margin={{ top: 12, right: 16, bottom: 2, left: 0 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <ReferenceLine y={0} stroke="#59646e" />
            <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} allowDecimals={false} tickCount={5} tickFormatter={calendarAxis ? monthLabel : (value) => `${value}m`} tick={chartAxisStyle} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(value) => `${value}%`} tick={chartAxisStyle} axisLine={false} tickLine={false} width={56} />
            <Tooltip
              labelFormatter={(value) => calendarAxis ? monthLabel(Number(value)) : `Month ${value}`}
              formatter={(value) => `${Number(value).toFixed(1)}%`}
              contentStyle={chartTooltipStyle}
              labelStyle={{ color: 'var(--ink)' }}
            />
            {(compare || showBenchmark) && <Legend />}
            {tickers.map((ticker, index) => (
              <Line key={ticker} type="linear" name={ticker} dataKey={ticker} stroke={colours[index]} strokeWidth={2} dot={false} isAnimationActive={false} />
            ))}
            {showBenchmark && <Line type="linear" name={market.benchmark.name} dataKey="benchmark" stroke="#a4b0bb" strokeDasharray="5 5" dot={false} isAnimationActive={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="radar-muted">
        {commonCalendar ? 'Each line starts at 0% in the first common month within all selected tenures.'
          : compare ? 'Month 0 is each company’s first monthly observation on or after appointment.'
            : 'Returns start at 0% on the first monthly observation on or after appointment.'}
      </p>
    </>
  )
}
