import { Link } from 'react-router-dom'
import { LegalLine } from '../components/LegalLine'
import type { LeadershipRadarData, TrackerData } from '../types'

export function OverviewContent({ data, radarData }: { data: TrackerData; radarData: LeadershipRadarData }) {
  return (
      <div className="overview-content">
        <header><p className="overview-kicker">About Castling</p><h1>Understand who leads.<br />See where shareholders push back.</h1>
          <p>Explore company leadership, global CEO turnover trends and significant shareholder dissent, with clear source and coverage notes.</p></header>
        <div className="overview-links">
          <Link to="/heatmap"><h2>Heatmap <span>↗</span></h2><p>Choose the UK or US market, select a company, and inspect its governance evidence.</p><small>UK leadership scores · US verified tenure coverage expanding</small></Link>
          <Link to="/proxy-voting"><h2>Proxy Voting <span>↗</span></h2><p>Filter significant UK votes, compare governance themes and open the underlying resolution.</p><small>{data.metadata.summary.resolutionCount} captured resolutions · {data.metadata.summary.companyCount} issuers</small></Link>
          <Link to="/turnover"><h2>Turnover Trends <span>↗</span></h2><p>Explore global CEO departures, tenure and appointment patterns across indices and industries.</p><small>Global research · Quarterly snapshot · Source-backed trends</small></Link>
        </div>
        <p className="overview-coverage">UK leadership review cutoff {new Date(radarData.metadata.asOfDate).toLocaleDateString('en-GB')}. Market prices and source monitoring have separate refresh dates. Open Coverage or Method within each view for details.</p>
        <LegalLine />
      </div>
  )
}
