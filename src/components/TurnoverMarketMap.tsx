import { useEffect, useState } from 'react'
import { displaySegment, periodLabel, type Metric } from '../lib/turnover'

type Geometry = { type: string; coordinates: number[][][] | number[][][][] }
type World = { features: { geometry: Geometry }[] }
const positions: Record<string, [number, number]> = {
  SP500: [-98, 38], 'SPTSX Composite': [-106, 57], FTSE100: [-4, 53], FTSE250: [0, 49],
  CAC40: [2, 45], DAX40: [11, 52], EuroNext100: [4, 58], SMI: [9, 44],
  Nikkei225: [139, 37], HANGSENG: [114, 23], ASX200: [135, -26], NSENifty50: [79, 22], STI: [103, 2],
}
const xy = ([lon, lat]: number[]) => [(lon + 180) * 2.5, (90 - lat) * 2.5]
function countryPath(geometry: Geometry) {
  const polygons = (geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates) as number[][][][]
  return polygons.flatMap((polygon) => polygon.map((ring) => ring.map((point, i) => `${i ? 'L' : 'M'}${xy(point).map((n) => n.toFixed(1)).join(',')}`).join(' ') + 'Z')).join(' ')
}

export function TurnoverMarketMap({ rows, selected, onSelect }: { rows: Metric[]; selected: string; onSelect: (segment: string) => void }) {
  const [world, setWorld] = useState<World | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/turnover/world-countries.json', { signal: controller.signal }).then((r) => {
      if (!r.ok) throw new Error('Map unavailable')
      return r.json()
    }).then(setWorld).catch(() => {})
    return () => controller.abort()
  }, [])
  return <div className="turnover-map">
    <svg viewBox="0 0 900 430" role="group" aria-label="Market departure rates. Select a market to inspect its series.">
      {world?.features.map(({ geometry }, i) => <path key={i} d={countryPath(geometry)} className="turnover-map__land" />)}
      {!world && <text x="450" y="200" textAnchor="middle" fill="#9eb0ba">Market markers · geographic background unavailable</text>}
      {rows.map((row) => {
        const position = positions[row.segment]
        if (!position) return null
        const [x, y] = xy(position)
        return <g key={row.segment} role="button" tabIndex={0} aria-label={`${displaySegment(row.segment)}, departures ${row.outgoing_pct}%, ${periodLabel(row)}`} onClick={() => onSelect(row.segment)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(row.segment) } }}>
          <title>{displaySegment(row.segment)} · {row.outgoing_pct?.toFixed(1)}% departures · {periodLabel(row)}</title>
          <circle cx={x} cy={y} r={Math.max(5, Math.min(17, 4 + (row.outgoing_pct ?? 0) * 1.3))} className={row.segment === selected ? 'turnover-map__selected' : 'turnover-map__marker'} />
        </g>
      })}
    </svg>
    <p className="turnover-chart-footnote">Marker size shows departure rate. Locations are index references, not company headquarters. Select a marker or market in the rail.</p>
  </div>
}
