import { Link } from 'react-router-dom'
import './LandingPage.css'

export function LandingPage() {
  return <section className="landing-page" aria-label="Proxy Wars research">
    <img className="landing-page__image" src="/turnover/chess-banner.jpg" alt="Chess pieces arranged around a white king on a dark board" fetchPriority="high" />
    <div className="landing-page__shade" aria-hidden="true" />
    <h1 className="sr-only">Proxy Wars</h1>
    <nav className="landing-page__entries" aria-label="Explore the research">
      <Link to="/heatmap"><span>Heatmap</span><span aria-hidden="true">↗</span></Link>
      <Link to="/turnover"><span>Turnover Trends</span><span aria-hidden="true">↗</span></Link>
      <Link to="/proxy-voting"><span>Proxy Voting</span><span aria-hidden="true">↗</span></Link>
    </nav>
  </section>
}
