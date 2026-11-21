import { Link } from 'react-router-dom'
import './LandingPage.css'

export function LandingPage() {
  return <section className="landing-page" aria-label="Leadership and governance research">
    <img className="landing-page__image" src="/turnover/chess-hero-john-adeoye.jpg" alt="A white king in focus among chess pieces on a reflective board" fetchPriority="high" onError={(event) => {
      if (!event.currentTarget.src.endsWith('/turnover/chess-banner.jpg')) event.currentTarget.src = '/turnover/chess-banner.jpg'
    }} />
    <div className="landing-page__shade" aria-hidden="true" />
    <h1 className="sr-only">Leadership and governance research</h1>
    <nav className="landing-page__entries" aria-label="Explore the research">
      <Link to="/heatmap"><span>Heatmap</span><span aria-hidden="true">↗</span></Link>
      <Link to="/turnover"><span>Turnover Trends</span><span aria-hidden="true">↗</span></Link>
      <Link to="/proxy-voting"><span>Proxy Voting</span><span aria-hidden="true">↗</span></Link>
    </nav>
  </section>
}
