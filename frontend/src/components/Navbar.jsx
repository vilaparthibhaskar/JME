import { useSelector, useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../store/authSlice'
import '../styles/Navbar.css'

export default function Navbar() {
  const { isAuthenticated, user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">⚡</span> JME
        </Link>

        <div className="navbar-menu">
          {isAuthenticated ? (
            <>
              <div className="navbar-links">
                <Link to="/dashboard" className="nav-link">
                  Dashboard
                </Link>
                <Link to="/resume" className="nav-link resume-link">
                  📄 Resume
                </Link>
                <Link to="/versions" className="nav-link">
                  📋 Versions
                </Link>
                <Link to="/prompts" className="nav-link">
                  💬 Prompts
                </Link>
                <Link to="/settings" className="nav-link">
                  Settings
                </Link>
              </div>

              <div className="navbar-user">
                <div className="user-info">
                  <span className="user-name">{user?.full_name || user?.username}</span>
                  {user?.is_admin && <span className="admin-badge">Admin</span>}
                </div>

                <div className="dropdown">
                  <button className="btn-dropdown">
                    ⋮
                  </button>
                  <div className="dropdown-menu">
                    <Link to="/dashboard" className="dropdown-item">
                      📊 Dashboard
                    </Link>
                    <Link to="/resume" className="dropdown-item">
                      📄 Resume
                    </Link>
                    <Link to="/versions" className="dropdown-item">
                      📋 Versions
                    </Link>
                    <Link to="/prompts" className="dropdown-item">
                      💬 Prompts
                    </Link>
                    <Link to="/settings" className="dropdown-item">
                      ⚙️ Settings
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="dropdown-item logout-item"
                    >
                      🚪 Logout
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="navbar-auth">
              <Link to="/login" className="nav-link">
                Login
              </Link>
              <Link to="/signup" className="btn btn-primary-nav">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
