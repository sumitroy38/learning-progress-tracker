import { Logo } from './ui'

// The frame around every signed in page: skip link, header with sign out, and the main area
export default function Shell({ role, onLogout, children }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand">
            <Logo />
            <span className="brand-name">Learning Progress Tracker</span>
          </div>
          <div className="header-actions">
            {role && <span className="role-pill">{role}</span>}
            {onLogout && (
              <button type="button" className="btn btn-secondary btn-small" onClick={onLogout}>
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>
      <main id="main" className="page">
        {children}
      </main>
    </>
  )
}
