import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { comparisonRows, latestComposition, periodKey, previousQuarter, selectedSeries, trendRows, type Filters, type TurnoverData } from '../src/lib/turnover.ts'

const data = JSON.parse(readFileSync(new URL('../public/data/turnover-trends.json', import.meta.url), 'utf8')) as TurnoverData
const base: Filters = { scope: 'index', segment: 'Global', year: 'all', quarter: 'all' }

test('Imported global latest quarter and counts match the original snapshot', () => {
  const rows = selectedSeries(data, base)
  assert.equal(rows.length, 31)
  const last = rows.at(-1)!
  assert.deepEqual([last.year, last.quarter, last.outgoing_count, last.incoming_count, last.company_count], [2026, 3, 32, 38, 1867])
  assert.equal(last.outgoing_pct, 1.7)
})

test('Scope, segment and period filters intersect without summing rates', () => {
  const rows = selectedSeries(data, { scope: 'industry', segment: 'Technology', year: '2025', quarter: '2' })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].scope, 'industry')
  assert.equal(rows[0].segment, 'Technology')
  assert.deepEqual([rows[0].year, rows[0].quarter], [2025, 2])
})

test('Unreported 2026 Q4 stays empty', () => {
  const filters = { ...base, year: '2026', quarter: '4' }
  assert.deepEqual(selectedSeries(data, filters), [])
  assert.deepEqual(comparisonRows(data, filters), [])
  assert.deepEqual(latestComposition(data, filters, 'gender'), [])
})

test('Quarter comparisons use the actual previous calendar quarter across year boundaries', () => {
  const current = selectedSeries(data, { ...base, year: '2026', quarter: '1' })[0]
  const previous = previousQuarter(data, current)!
  assert.deepEqual([previous.year, previous.quarter], [2025, 4])
  assert.equal(periodKey(current) - periodKey(previous), 1)
})

test('Composition uses a single latest reported quarter and reconciles counts', () => {
  const rows = latestComposition(data, base, 'gender')
  assert.equal(rows.length, 4)
  assert.ok(rows.every((r) => r.year === 2026 && r.quarter === 3))
  assert.equal(rows.filter((r) => r.flow === 'incoming').reduce((s, r) => s + r.count_value!, 0), 38)
  assert.equal(rows.filter((r) => r.flow === 'outgoing').reduce((s, r) => s + r.count_value!, 0), 32)
})

test('Market comparisons use separate populations and exclude Global', () => {
  const rows = comparisonRows(data, base)
  assert.equal(rows.length, 13)
  assert.ok(rows.every((r) => r.segment !== 'Global' && r.year === 2026 && r.quarter === 3))
})

test('Benchmarks keep their own series without substituting appointments', () => {
  const rows = trendRows(data, { ...base, segment: 'FTSE100', year: '2026' }, 'SP500')
  const uk = selectedSeries(data, { ...base, segment: 'FTSE100', year: '2026' })
  const us = selectedSeries(data, { ...base, segment: 'SP500', year: '2026' })
  assert.equal(rows.at(-1)!.departures, uk.at(-1)!.outgoing_pct)
  assert.equal(rows.at(-1)!.peer, us.at(-1)!.outgoing_pct)
})

test('Missing published quarters create null chart gaps', () => {
  const modified = { ...data, metrics: data.metrics.filter((r) => !(r.scope === 'index' && r.segment === 'Global' && r.year === 2025 && r.quarter === 2)) }
  const rows = trendRows(modified, { ...base, year: '2025' }, '')
  assert.equal(rows.length, 4)
  assert.equal(rows[1].departures, null)
})

test('Zero-event rows remain observations rather than missing data', () => {
  const rows = selectedSeries(data, { ...base, segment: 'DAX40', year: '2019', quarter: '1' })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].outgoing_count, 0)
})
