import { Link } from 'react-router-dom'
import { LegalLine } from '../components/LegalLine'
import type { LeadershipRadarData, TrackerData } from '../types'

export function HomePage({ data, radarData }: { data: TrackerData; radarData: LeadershipRadarData }) {
  return (
    <section className="workspace-screen overview-screen">
      <div className="overview-content">
        <header><p className="overview-kicker">A guide to the workspace</p><h1>Understand who leads.<br />See where shareholders push back.</h1>
          <p>Explore company leadership, tenure performance and significant shareholder dissent. Every analytical record links to its evidence.</p></header>
        <div className="overview-links">
          <Link to="/radar"><h2>DashBoard <span>↗</span></h2><p>Choose the UK or US market, select a company, and inspect its governance evidence.</p><small>UK leadership scores · US verified tenure coverage expanding</small></Link>
          <Link to="/proxy-voting"><h2>Proxy Voting <span>↗</span></h2><p>Filter significant UK votes, compare governance themes and open the underlying resolution.</p><small>{data.metadata.summary.resolutionCount} captured resolutions · {data.metadata.summary.companyCount} issuers</small></Link>
          <Link to="/us-research"><h2>US Research <span>↗</span></h2><p>Explore reviewed CEO and Chair appointments with tenure returns. Pending companies retain their filing evidence.</p><small>500 research issuers · Verified-only filter · Weekday refresh</small></Link>
        </div>
        <p className="overview-coverage">UK leadership review cutoff {new Date(radarData.metadata.asOfDate).toLocaleDateString('en-GB')}. Market prices and source monitoring have separate refresh dates. Open Coverage or Method within each view for details.</p>
        <LegalLine />
      </div>
    </section>
  )
}
