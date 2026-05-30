import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logout } from '../store/authSlice'

export default function Dashboard() {
  const { user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome back, {user?.full_name || user?.username}! 👋</h1>
        <p>Here's your dashboard overview</p>
      </div>

      <div className="dashboard-content">
        <div className="card dashboard-card">
          <div className="card-header gradient-primary">
            <h2>Profile Overview</h2>
          </div>
          <div className="card-body">
            <div className="info-row">
              <span className="info-label">📧 Email:</span>
              <span className="info-value">{user?.email}</span>
            </div>
            <div className="info-row">
              <span className="info-label">👤 Username:</span>
              <span className="info-value">{user?.username}</span>
            </div>
            <div className="info-row">
              <span className="info-label">✨ Full Name:</span>
              <span className="info-value">{user?.full_name || 'Not set'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">🟢 Status:</span>
              <span className="info-value">{user?.is_active ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">👑 Role:</span>
              <span className={`info-value badge ${user?.is_admin ? 'bg-warning' : 'bg-info'}`}>
                {user?.is_admin ? 'Admin' : 'User'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">📅 Member Since:</span>
              <span className="info-value">
                {user?.created_at 
                  ? new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'Not available'
                }
              </span>
            </div>
          </div>
        </div>

        <div className="card dashboard-card">
          <div className="card-header gradient-secondary">
            <h2>Quick Actions</h2>
          </div>
          <div className="card-body action-buttons">
            <button 
              onClick={() => navigate('/settings')}
              className="btn btn-action btn-primary"
            >
              ⚙️ Edit Profile
            </button>
            <button 
              onClick={() => navigate('/settings?tab=security')}
              className="btn btn-action btn-secondary"
            >
              🔐 Change Password
            </button>
            <button 
              onClick={handleLogout}
              className="btn btn-action btn-danger"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-container {
          min-height: calc(100vh - 70px);
          background: #f5f7fa;
          padding: 40px 20px;
        }

        .dashboard-header {
          max-width: 1200px;
          margin: 0 auto 40px;
          text-align: center;
        }

        .dashboard-header h1 {
          font-size: 36px;
          font-weight: 700;
          color: #333;
          margin-bottom: 10px;
        }

        .dashboard-header p {
          font-size: 16px;
          color: #666;
        }

        .dashboard-content {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 30px;
        }

        .dashboard-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transition: transform 0.3s, box-shadow 0.3s;
        }

        .dashboard-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }

        .card-header {
          padding: 20px;
          color: white;
        }

        .card-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }

        .gradient-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .gradient-secondary {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        .card-body {
          padding: 30px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-label {
          font-weight: 600;
          color: #666;
          font-size: 14px;
        }

        .info-value {
          color: #333;
          font-weight: 500;
        }

        .badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .bg-warning {
          background-color: #ffc107;
          color: #333;
        }

        .bg-info {
          background-color: #17a2b8;
          color: white;
        }

        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-action {
          width: 100%;
          text-align: left;
        }

        .btn-primary {
          background-color: #667eea;
          color: white;
        }

        .btn-primary:hover {
          background-color: #5568d3;
        }

        .btn-secondary {
          background-color: #e9ecef;
          color: #333;
        }

        .btn-secondary:hover {
          background-color: #dee2e6;
        }

        .btn-danger {
          background-color: #dc3545;
          color: white;
        }

        .btn-danger:hover {
          background-color: #c82333;
        }

        @media (max-width: 768px) {
          .dashboard-container {
            padding: 20px 10px;
          }

          .dashboard-header h1 {
            font-size: 24px;
          }

          .dashboard-content {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }
      `}</style>
    </div>
  )
}
