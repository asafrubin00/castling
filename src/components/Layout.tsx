import { NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { RadarDialog } from './RadarDialog'
import { OverviewContent } from '../pages/HomePage'
import type { LeadershipRadarData, TrackerData } from '../types'

type LayoutProps = {
  generatedAt: string
  data: TrackerData | null
  radarData: LeadershipRadarData | null
  error: string | null
}

export function Layout({ generatedAt, data, radarData, error }: LayoutProps) {
  const { pathname } = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const isLanding = pathname === '/'
  const aboutOpen = searchParams.get('about') === '1'
  const setAbout = (open: boolean) => setSearchParams((current) => {
    const next = new URLSearchParams(current)
    if (open) next.set('about', '1')
    else next.delete('about')
    return next
  }, { replace: true })
  return (
    <div className={`site-shell ${isLanding ? 'site-shell--landing' : ''}`}>
      <header className="site-header">
        <div className="site-header__inner">
          {/* Branding slot: intentionally blank until the product name is settled. */}
          <div className="site-header__brand" aria-hidden="true" />
          {!isLanding && <nav className="site-nav" aria-label="Primary">
            <NavLink to="/heatmap" className={({ isActive }) => isActive || pathname === '/us-research' ? 'active' : ''}>Heatmap</NavLink>
            <NavLink to="/turnover">Turnover Trends</NavLink>
            <NavLink to="/proxy-voting">Proxy Voting</NavLink>
          </nav>}
          <button type="button" className="site-about-button" aria-label="About this project" aria-haspopup="dialog" onClick={() => setAbout(true)}>
            About
          </button>
        </div>
      </header>

      <main className="main-content">
        <Outlet context={{ generatedAt }} />
      </main>
      {aboutOpen && <RadarDialog title="About this project" className="site-about-dialog" onClose={() => setAbout(false)}>
        {data && radarData ? <OverviewContent data={data} radarData={radarData} /> : <div className="overview-content"><h1>About this project</h1><p role={error ? 'alert' : 'status'}>{error ? `Coverage details could not be loaded. ${error}` : 'Loading the workspace guide…'}</p></div>}
      </RadarDialog>}
    </div>
  )
}
