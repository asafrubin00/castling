import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  ComposedChart,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { FilterBar } from '../components/FilterBar'
import { LegalLine } from '../components/LegalLine'
import { RadarDialog } from '../components/RadarDialog'
import { StatCard } from '../components/StatCard'
import {
  filterResolutions,
  getCategoryBreakdown,
  getCompanyPatterns,
  getFilterOptions,
  getSummaryMetrics,
  getTimeline,
  getTopDissent,
} from '../lib/analytics'
import { formatDate, formatShortPercent } from '../lib/format'
import type { Filters, TrackerData } from '../types'

const palette = ['#f0be2a', '#89a4ba', '#5f7a91', '#3f5d74', '#b99b68']

type DashboardPageProps = {
  data: TrackerData
}

const defaultFilters: Filters = {
  company: 'All companies',
  year: 'All years',
  sector: 'All sectors',
  category: 'All categories',
}

type ActivePanel = 'top' | 'category' | 'trend' | 'patterns'

export function DashboardPage({ data }: DashboardPageProps) {
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [activePanel, setActivePanel] = useState<ActivePanel>('top')
  const [showTable, setShowTable] = useState(false)
  const [showMethod, setShowMethod] = useState(false)
  const options = useMemo(() => getFilterOptions(data.resolutions), [data.resolutions])
  const filtered = useMemo(
    () => filterResolutions(data.resolutions, filters),
    [data.resolutions, filters],
  )
  const metrics = useMemo(() => getSummaryMetrics(filtered), [filtered])
  const topDissent = useMemo(() => getTopDissent(filtered, 8), [filtered])
  const timeline = useMemo(() => getTimeline(filtered), [filtered])
  const categories = useMemo(() => getCategoryBreakdown(filtered), [filtered])
  const companyPatterns = useMemo(
    () => getCompanyPatterns(filtered).slice(0, 8),
    [filtered],
  )

  function updateFilter(name: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [name]: value }))
  }

  function formatTooltipPercent(value: unknown) {
    return typeof value === 'number' ? `${value.toFixed(1)}%` : String(value ?? '')
  }

  function formatTooltipLabel(label: unknown, prefix: string) {
    return `${prefix}: ${String(label ?? '')}`
  }

  return (
    <div className="page-flow">
      <section className="workspace-screen workspace-screen--dashboard proxy-screen">
        <div className="workspace-dashboard proxy-workspace">
          <header className="radar-title">
            <div><p>Shareholder voting · UK evidence</p><h1>Proxy Voting</h1>
              <p className="workspace-guidance">Explore significant opposition to management. Filter the charts or open a resolution for its voting results and sources.</p>
            </div>
            <div className="proxy-actions">
              <button className="radar-action" type="button" onClick={() => setShowMethod(true)}>Coverage & method</button>
              <button className="radar-action" type="button" onClick={() => setShowTable(true)}>View records</button>
              <button className="radar-action" type="button" onClick={() => setFilters(defaultFilters)}>Reset filters</button>
            </div>
          </header>
          <div className="workspace-dashboard__controls">
            <FilterBar
              filters={filters}
              options={options}
              onChange={updateFilter}
              onReset={() => setFilters(defaultFilters)}
              showReset={false}
            />
          </div>

          <div className="workspace-dashboard__tabs">
            <button
              className={activePanel === 'top' ? 'is-active' : ''}
              onClick={() => setActivePanel('top')}
              type="button"
            >
              Top dissenting votes
            </button>
            <button
              className={activePanel === 'category' ? 'is-active' : ''}
              onClick={() => setActivePanel('category')}
              type="button"
            >
              Dissent by category
            </button>
            <button
              className={activePanel === 'trend' ? 'is-active' : ''}
              onClick={() => setActivePanel('trend')}
              type="button"
            >
              Trend over time
            </button>
            <button
              className={activePanel === 'patterns' ? 'is-active' : ''}
              onClick={() => setActivePanel('patterns')}
              type="button"
            >
              Company patterns
            </button>
          </div>

          <div className="workspace-dashboard__kpis">
            <StatCard
              compact
              label="Resolutions"
              value={String(metrics.resolutions)}
            />
            <StatCard
              compact
              label="Companies"
              value={String(metrics.companies)}
            />
            <StatCard
              compact
              label="Average dissent"
              value={formatShortPercent(metrics.averageAgainst)}
            />
            <StatCard
              compact
              label="Dissent above 50%"
              value={String(metrics.severeVotes)}
            />
          </div>

          <div className="workspace-dashboard__main-row">
            <article className="workspace-chart">
              <div className="workspace-chart__header">
                <div>
                  <p className="workspace-chart__eyebrow">
                    {activePanel === 'top'
                      ? 'Highest votes against management'
                      : activePanel === 'category'
                        ? 'Most frequent governance themes'
                        : activePanel === 'trend'
                          ? 'AGM season timeline'
                          : 'Where dissent recurs'}
                  </p>
                  <h2>
                    {activePanel === 'top'
                      ? 'Top dissent'
                      : activePanel === 'category'
                        ? 'Dissent by category'
                        : activePanel === 'trend'
                          ? 'Trend over time'
                          : 'Company patterns'}
                  </h2>
                </div>
              </div>

              <div className="workspace-chart__body">
                {activePanel === 'top' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topDissent}
                      layout="vertical"
                      margin={{ left: 10, right: 10, top: 6, bottom: 6 }}
                    >
                      <CartesianGrid
                        strokeDasharray="2 5"
                        stroke="rgba(255,255,255,0.08)"
                        horizontal
                        vertical={false}
                      />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                        tick={{ fill: '#93a7b8', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="companyName"
                        width={132}
                        tick={{ fill: '#f1f5f8', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value) => [formatTooltipPercent(value), 'Opposition to management']}
                        labelFormatter={(label) => formatTooltipLabel(label, 'Company')}
                        contentStyle={{
                          background: '#07131d',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: 10,
                          color: '#f3f7fb',
                        }}
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      />
                      <Bar
                        dataKey="managementDissentPct"
                        fill="#c6ad71"
                        radius={[0, 2, 2, 0]}
                        isAnimationActive={false}
                      >
                        <LabelList dataKey="managementDissentPct" position="right" formatter={(value) => formatTooltipPercent(value)} fill="#cbd6df" fontSize={11} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : null}

                {activePanel === 'category' ? (
                  <div className="workspace-chart__split">
                    <ResponsiveContainer width="58%" height="100%">
                      <PieChart>
                        <Pie
                          data={categories}
                          dataKey="count"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={96}
                          innerRadius={54}
                          paddingAngle={3}
                        >
                          {categories.map((entry, index) => (
                            <Cell
                              key={entry.category}
                              fill={palette[index % palette.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [String(value ?? ''), 'Resolutions']}
                          labelFormatter={(label) => formatTooltipLabel(label, 'Category')}
                          contentStyle={{
                            background: '#07131d',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 10,
                            color: '#f3f7fb',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="workspace-chart__legend">
                      {categories.map((entry, index) => (
                        <div
                          className="legend-list__item legend-list__item--workspace"
                          key={entry.category}
                        >
                          <span
                            className="legend-list__swatch"
                            style={{ backgroundColor: palette[index % palette.length] }}
                          />
                          <span>{entry.category}</span>
                          <strong>{entry.count}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {activePanel === 'trend' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={timeline}
                      margin={{ left: 10, right: 14, top: 12, bottom: 6 }}
                    >
                      <CartesianGrid
                        strokeDasharray="2 5"
                        stroke="rgba(255,255,255,0.08)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#93a7b8', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fill: '#93a7b8', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickFormatter={(value) => `${value}%`}
                        tick={{ fill: '#93a7b8', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value, name) => {
                          if (name === 'resolutions') {
                            return [String(value ?? ''), 'Resolutions']
                          }

                          return [formatTooltipPercent(value), 'Average management dissent']
                        }}
                        labelFormatter={(label) => formatTooltipLabel(label, 'Period')}
                        contentStyle={{
                          background: '#07131d',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: 10,
                          color: '#f3f7fb',
                        }}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="resolutions"
                        fill="#10364c"
                        radius={[8, 8, 0, 0]}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="avgAgainst"
                        stroke="#f0be2a"
                        strokeWidth={2.6}
                        dot={{ r: 3, fill: '#f0be2a' }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : null}

                {activePanel === 'patterns' ? (
                  <div className="workspace-pattern-table">
                    <table className="data-table data-table--workspace">
                      <thead>
                        <tr>
                          <th>Company</th>
                          <th>Sector</th>
                          <th>Resolutions</th>
                          <th>Avg against</th>
                          <th>Peak against</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companyPatterns.map((item) => (
                          <tr key={item.company}>
                            <td>{item.company}</td>
                            <td>{item.sector}</td>
                            <td>{item.resolutions}</td>
                            <td>{formatShortPercent(item.avgAgainst)}</td>
                            <td>{formatShortPercent(item.maxAgainst)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            </article>

          </div>

          <div className="workspace-micro-note">
            <span>Results through {data.metadata.coveragePeriod.endDate ? formatDate(data.metadata.coveragePeriod.endDate) : '—'} · Refreshed {formatDate(data.metadata.generatedAt)}</span>
            <LegalLine />
            <span>{data.metadata.sourceName}</span>
          </div>
        </div>

        {showMethod && <RadarDialog title="Proxy voting coverage" onClose={() => setShowMethod(false)}>
          <header className="radar-drawer-heading"><h2>Coverage & method</h2></header>
          <div className="radar-method">
            <p>{data.metadata.coverageStatement}</p>
            <p>Results covered from {data.metadata.coveragePeriod.startDate ? formatDate(data.metadata.coveragePeriod.startDate) : '—'} to {data.metadata.coveragePeriod.endDate ? formatDate(data.metadata.coveragePeriod.endDate) : '—'}.</p>
            <p>Source refresh completed {formatDate(data.metadata.generatedAt)}. Configured voting sources are checked each weekday. Additional meetings and new source formats require onboarding.</p>
            {data.metadata.methodology.included.map((item) => <p key={item}>{item}</p>)}
            {data.metadata.limitations.map((item) => <p key={item}>{item}</p>)}
            <a href={data.metadata.sourceUrl} target="_blank" rel="noreferrer">{data.metadata.sourceName}</a>
          </div>
        </RadarDialog>}
        {showTable ? (
          <RadarDialog title="Detailed dissent records" className="radar-dialog--records" onClose={() => setShowTable(false)}>
            <div className="modal-panel">
              <div className="modal-panel__header">
                <div>
                  <p className="eyebrow">Resolution table</p>
                  <h2>Detailed dissent records</h2>
                  <p className="panel__intro">
                    Showing {filtered.length} of {data.resolutions.length} captured resolutions.
                  </p>
                </div>
                <button
                  className="modal-panel__close"
                  onClick={() => setShowTable(false)}
                  type="button"
                >
                  Close
                </button>
              </div>
              <div className="table-card modal-table-card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Management dissent</th>
                      <th>Resolution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => (
                      <tr key={item.id}>
                        <td>{item.companyName}</td>
                        <td>{formatDate(item.meetingDate)}</td>
                        <td>{item.resolutionCategoryLabel}</td>
                        <td>{formatShortPercent(item.managementDissentPct)}</td>
                        <td>
                          <Link className="table-link" to={`/resolution/${item.id}`}>
                            {item.resolutionTitle}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </RadarDialog>
        ) : null}
      </section>
    </div>
  )
}
