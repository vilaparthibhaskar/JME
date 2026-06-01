import { useSelector, useDispatch } from 'react-redux'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { logout } from '../store/authSlice'
import { useEffect, useRef, useState } from 'react'
import '../styles/Navbar.css'

function Avatar({ name }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return <span className="nav-avatar">{initials}</span>
}

export default function Navbar() {
  const { isAuthenticated, user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [dropOpen, setDropOpen] = useState(false)
  const dropRef = useRef(null)

  // Close when navigating to a new page
  useEffect(() => { setDropOpen(false) }, [location.pathname])

  // Close when clicking outside the dropdown
  useEffect(() => {
    if (!dropOpen) return
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropOpen])

  const handleLogout = () => {
    setDropOpen(false)
    dispatch(logout())
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link'

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Brand */}
        <Link to="/" className="navbar-brand">
          <span className="brand-mark">J</span>
          <span className="brand-text">JME</span>
        </Link>

        <div className="navbar-menu">
          {isAuthenticated ? (
            <>
              {/* Nav links */}
              <div className="navbar-links">
                <Link to="/dashboard"  className={isActive('/dashboard')}>Dashboard</Link>
                <Link to="/resume"     className={isActive('/resume')}>Resume</Link>
                <Link to="/versions"   className={isActive('/versions')}>Versions</Link>
                <Link to="/prompts"    className={isActive('/prompts')}>Prompts</Link>
                <Link to="/applied"     className={isActive('/applied')}>Applied</Link>
                <Link to="/recruiters"  className={isActive('/recruiters')}>Recruiters</Link>
                {user?.is_admin && <Link to="/jobs"      className={isActive('/jobs')}>Jobs</Link>}
                {user?.is_admin && <Link to="/analytics" className={isActive('/analytics')}>Analytics</Link>}
                <Link to="/companies" className={isActive('/companies')}>Companies</Link>
                <Link to="/settings"   className={isActive('/settings')}>Settings</Link>
              </div>

              {/* User section */}
              <div className="navbar-user">
                {user?.is_admin && <span className="admin-badge">Admin</span>}

                <div className="dropdown" ref={dropRef}>
                  <button className="nav-user-btn" onClick={() => setDropOpen(o => !o)}>
                    <Avatar name={user?.full_name || user?.username} />
                    <span className="nav-username">{user?.full_name || user?.username}</span>
                    <span className="nav-chevron">▾</span>
                  </button>

                  {dropOpen && (
                    <div className="dropdown-menu dropdown-menu--open">
                      <div className="dropdown-header">
                        <Avatar name={user?.full_name || user?.username} />
                        <div>
                          <div className="dh-name">{user?.full_name || user?.username}</div>
                          <div className="dh-role">{user?.is_admin ? 'Administrator' : 'User'}</div>
                        </div>
                      </div>
                      <div className="dropdown-divider" />
                      <Link to="/dashboard" className="dropdown-item" onClick={() => setDropOpen(false)}>📊 Dashboard</Link>
                      <Link to="/resume"    className="dropdown-item" onClick={() => setDropOpen(false)}>📄 Resume</Link>
                      <Link to="/versions"  className="dropdown-item" onClick={() => setDropOpen(false)}>📋 Versions</Link>
                      <Link to="/prompts"   className="dropdown-item" onClick={() => setDropOpen(false)}>💬 Prompts</Link>
                      <Link to="/applied"     className="dropdown-item" onClick={() => setDropOpen(false)}>📝 Applied</Link>
                      <Link to="/recruiters"  className="dropdown-item" onClick={() => setDropOpen(false)}>👤 Recruiters</Link>
                      {user?.is_admin && <Link to="/jobs"      className="dropdown-item" onClick={() => setDropOpen(false)}>💼 Jobs</Link>}
                      {user?.is_admin && <Link to="/analytics" className="dropdown-item" onClick={() => setDropOpen(false)}>📊 Analytics</Link>}
                      <Link to="/companies" className="dropdown-item" onClick={() => setDropOpen(false)}>🏢 Companies</Link>
                      <Link to="/settings"  className="dropdown-item" onClick={() => setDropOpen(false)}>⚙️ Settings</Link>
                      <div className="dropdown-divider" />
                      <button onClick={handleLogout} className="dropdown-item logout-item">
                        🚪 Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="navbar-auth">
              <Link to="/login"  className="nav-link">Login</Link>
              <Link to="/signup" className="btn-signup">Get Started</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

