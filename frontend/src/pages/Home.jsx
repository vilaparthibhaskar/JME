import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'

export default function Home() {
  const { isAuthenticated, user } = useSelector((state) => state.auth)

  return (
    <div className="home-container">
      <div className="hero-section">
        <h1 className="hero-title">Welcome to JME</h1>
        <p className="hero-subtitle">
          Your all-in-one platform for managing everything you need
        </p>

        {isAuthenticated ? (
          <div className="hero-actions">
            <p className="welcome-message">Welcome back, <strong>{user?.full_name || user?.username}</strong>!</p>
            <Link to="/dashboard" className="btn btn-primary btn-lg">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="hero-actions">
            <Link to="/login" className="btn btn-primary btn-lg">
              Login
            </Link>
            <Link to="/signup" className="btn btn-outline-primary btn-lg">
              Sign Up
            </Link>
          </div>
        )}
      </div>

      <div className="features-section">
        <h2>Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🔐</div>
            <h3>Secure Authentication</h3>
            <p>Your account is protected with industry-standard security</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Lightning Fast</h3>
            <p>Experience blazing-fast performance with our optimized platform</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👑</div>
            <h3>Admin Controls</h3>
            <p>Advanced admin features for managing your applications</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Analytics</h3>
            <p>Get insights with our comprehensive analytics dashboard</p>
          </div>
        </div>
      </div>

      <style>{`
        .home-container {
          min-height: calc(100vh - 70px);
          background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
        }

        .hero-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 100px 20px;
          text-align: center;
        }

        .hero-title {
          font-size: 48px;
          font-weight: 700;
          color: #333;
          margin-bottom: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          font-size: 20px;
          color: #666;
          margin-bottom: 40px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .welcome-message {
          font-size: 16px;
          color: #666;
          margin-bottom: 20px;
        }

        .hero-actions {
          display: flex;
          gap: 20px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .btn {
          padding: 14px 32px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          transition: all 0.3s;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
          color: white;
        }

        .btn-lg {
          padding: 16px 40px;
          font-size: 18px;
        }

        .btn-outline-primary {
          border: 2px solid #667eea;
          color: #667eea;
          background-color: white;
        }

        .btn-outline-primary:hover {
          background-color: #667eea;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
        }

        .features-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 80px 20px;
        }

        .features-section h2 {
          font-size: 36px;
          font-weight: 700;
          color: #333;
          text-align: center;
          margin-bottom: 50px;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 30px;
        }

        .feature-card {
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          text-align: center;
          transition: all 0.3s;
        }

        .feature-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
        }

        .feature-icon {
          font-size: 48px;
          margin-bottom: 20px;
        }

        .feature-card h3 {
          font-size: 20px;
          font-weight: 600;
          color: #333;
          margin-bottom: 10px;
        }

        .feature-card p {
          color: #666;
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 32px;
          }

          .hero-subtitle {
            font-size: 16px;
          }

          .hero-section {
            padding: 60px 20px;
          }

          .hero-actions {
            flex-direction: column;
            gap: 15px;
          }

          .btn {
            width: 100%;
          }

          .features-section {
            padding: 40px 20px;
          }

          .features-section h2 {
            font-size: 28px;
            margin-bottom: 30px;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
