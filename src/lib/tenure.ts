import type { MarketPerformanceData } from '../types'

export function tenurePoints(company: MarketPerformanceData['companies'][number] | undefined, role: 'ceo' | 'chair') {
  const start = company?.roles[role].roleStartDate
  return company && start ? company.points.filter((point) => point.date >= start) : []
}
