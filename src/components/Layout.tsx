import { Link, NavLink, Outlet } from 'react-router-dom'

type LayoutProps = {
  generatedAt: string
}

export function Layout({ generatedAt }: LayoutProps) {
  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <Link className="brand" to="/radar" aria-label="DashBoard">
            <span className="brand__title">Proxy Wars</span>
          </Link>
          <nav className="site-nav" aria-label="Primary">
            <NavLink to="/radar">DashBoard</NavLink>
            <NavLink to="/proxy-voting">Proxy Voting</NavLink>
            <NavLink to="/us-research">US research</NavLink>
            <NavLink to="/overview">Overview</NavLink>
          </nav>
        </div>
      </header>

      <main className="main-content">
        <Outlet context={{ generatedAt }} />
      </main>
    </div>
  )
}
