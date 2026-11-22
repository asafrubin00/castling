import { Link } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import './LandingPage.css'

export function LandingPage() {
  return <section className="landing-page" aria-label="Castling">
    <img className="landing-page__image" src="/turnover/chess-hero.jpg" alt="A white king in focus among chess pieces on a dark board" fetchPriority="high" onError={(event) => {
      if (!event.currentTarget.src.endsWith('/turnover/chess-banner.jpg')) event.currentTarget.src = '/turnover/chess-banner.jpg'
    }} />
    <div className="landing-page__shade" aria-hidden="true" />
    <header className="landing-page__title">
      <h1><BrandMark size={40} />Castling</h1>
      <p>CEO succession, turnover and shareholder dissent</p>
    </header>
    <nav className="landing-page__entries" aria-label="Explore the research">
      <Link to="/heatmap"><span>Heatmap<small>Company leadership signals and tenure returns</small></span><span aria-hidden="true">↗</span></Link>
      <Link to="/turnover"><span>Turnover Trends<small>CEO succession across markets and industries</small></span><span aria-hidden="true">↗</span></Link>
      <Link to="/proxy-voting"><span>Proxy Voting<small>Significant shareholder dissent in the UK</small></span><span aria-hidden="true">↗</span></Link>
    </nav>
  </section>
}
