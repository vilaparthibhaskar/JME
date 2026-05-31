import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { loginStart, loginSuccess, loginFailure } from '../store/authSlice'
import api from '../services/api'

const ROTATING_WORDS = ['Tailored.', 'Polished.', 'Ready.', 'Yours.']

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [wordIdx, setWordIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setWordIdx(i => (i + 1) % ROTATING_WORDS.length)
        setVisible(true)
      }, 350)
    }, 2200)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    dispatch(loginStart())
    try {
      const data = await api.login(username.toLowerCase(), password)
      dispatch(loginSuccess({ user: data.user, token: data.access_token }))
      navigate('/dashboard')
    } catch {
      const msg = 'Username or password is incorrect'
      setError(msg)
      dispatch(loginFailure(msg))
    }
  }

  return (
    <div className="lg-root">
      {/* blobs */}
      <div className="lg-blob lg-blob1" />
      <div className="lg-blob lg-blob2" />

      {/* ── LEFT — hero ─────────────────────────────── */}
      <div className="lg-left">
        <div className="lg-brand">
          <span className="lg-brand-mark">J</span>
          <span className="lg-brand-text">JME</span>
        </div>

        <span className="lg-eyebrow">✦ Resume Manager</span>

        <h1 className="lg-title">
          Your Resume.{' '}
          <span className="lg-rotating" style={{ opacity: visible ? 1 : 0 }}>
            {ROTATING_WORDS[wordIdx]}
          </span>
        </h1>

        <p className="lg-subtitle">
          Build, version, and export job-winning resumes — all from one place.
          No design tools, no reformatting. Just results.
        </p>

        <div className="lg-pills">
          {[
            { icon: '📋', label: 'Resume Versions' },
            { icon: '📄', label: 'DOCX Export' },
            { icon: '🤖', label: 'AI Prompts' },
            { icon: '⚡', label: 'Instant Updates' },
          ].map((f, i) => (
            <span key={i} className="lg-pill">
              {f.icon} {f.label}
            </span>
          ))}
        </div>

        {/* floating resume card mockup */}
        <div className="lg-preview">
          <div className="lg-pl lg-pl-name" />
          <div className="lg-pl lg-pl-title" />
          <div className="lg-pd" />
          <div className="lg-ps">
            <div className="lg-plabel" />
            <div className="lg-pl lg-pl-short" />
            <div className="lg-pl lg-pl-med" />
          </div>
          <div className="lg-ps">
            <div className="lg-plabel" />
            <div className="lg-pl lg-pl-full" />
            <div className="lg-pl lg-pl-short" />
          </div>
          <div className="lg-docx-badge">📄 .docx</div>
        </div>
      </div>

      {/* ── RIGHT — form ────────────────────────────── */}
      <div className="lg-right">
        <div className="lg-card">
          <div className="lg-card-header">
            <h2 className="lg-card-title">Welcome back</h2>
            <p className="lg-card-sub">Sign in to your account</p>
          </div>

          {error && <div className="lg-error">{error}</div>}

          <form onSubmit={handleSubmit} className="lg-form">
            <div className="lg-field">
              <label className="lg-label">Username</label>
              <input
                type="text"
                className="lg-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your username"
                autoComplete="username"
                required
              />
            </div>

            <div className="lg-field">
              <label className="lg-label">Password</label>
              <div className="lg-pw-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="lg-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="lg-pw-toggle"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" className="lg-submit">
              Sign In →
            </button>
          </form>

          <p className="lg-footer-link">
            Don't have an account?{' '}
            <Link to="/signup">Create one free</Link>
          </p>
        </div>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .lg-root {
          min-height: 100vh;
          background: #0d0d14;
          color: #e8e8f0;
          display: flex;
          align-items: stretch;
          position: relative;
          overflow: hidden;
          font-family: inherit;
        }

        /* ── Blobs ───────────────────── */
        .lg-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          opacity: 0.28;
          pointer-events: none;
          animation: lgFloat 8s ease-in-out infinite;
        }
        .lg-blob1 {
          width: 560px; height: 560px;
          background: radial-gradient(circle, #667eea, #764ba2);
          top: -160px; left: -160px;
        }
        .lg-blob2 {
          width: 420px; height: 420px;
          background: radial-gradient(circle, #f093fb, #4facfe);
          bottom: -100px; right: -80px;
          animation-delay: 4s;
        }
        @keyframes lgFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(18px, -28px) scale(1.06); }
        }

        /* ── Left panel ──────────────── */
        .lg-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 64px 60px;
          position: relative;
          z-index: 1;
          max-width: 620px;
        }

        .lg-brand {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-bottom: 52px;
        }
        .lg-brand-mark {
          width: 38px; height: 38px;
          border-radius: 11px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: #fff;
          font-size: 18px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 14px rgba(102,126,234,0.55);
        }
        .lg-brand-text {
          font-size: 22px; font-weight: 800; letter-spacing: 2.5px;
          background: linear-gradient(135deg, #e0e0ff, #b0b8ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .lg-eyebrow {
          display: inline-block;
          padding: 5px 14px;
          background: rgba(102,126,234,0.15);
          border: 1px solid rgba(102,126,234,0.4);
          border-radius: 20px;
          font-size: 12px; font-weight: 600;
          color: #a5b4fc; letter-spacing: 0.05em;
          margin-bottom: 24px;
          width: fit-content;
        }

        .lg-title {
          font-size: clamp(34px, 4vw, 56px);
          font-weight: 800;
          line-height: 1.18;
          color: #f0f0ff;
          margin-bottom: 20px;
        }
        .lg-rotating {
          background: linear-gradient(135deg, #667eea, #f093fb);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          transition: opacity 0.35s ease;
          display: inline-block;
        }

        .lg-subtitle {
          font-size: 16px;
          color: #7070a0;
          line-height: 1.75;
          max-width: 460px;
          margin-bottom: 36px;
        }

        .lg-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 52px;
        }
        .lg-pill {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 13px;
          color: rgba(200,200,240,0.7);
          font-weight: 500;
        }

        /* floating card */
        .lg-preview {
          position: relative;
          width: 210px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 22px 18px;
          backdrop-filter: blur(12px);
          box-shadow: 0 24px 60px rgba(0,0,0,0.4);
          animation: lgCard 6s ease-in-out infinite;
        }
        @keyframes lgCard {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-10px); }
        }
        .lg-pl { height: 7px; border-radius: 4px; background: rgba(255,255,255,0.12); margin-bottom: 8px; }
        .lg-pl-name  { width: 70%; height: 13px; background: rgba(165,180,252,0.4); }
        .lg-pl-title { width: 50%; background: rgba(240,147,251,0.3); }
        .lg-pl-short { width: 55%; }
        .lg-pl-med   { width: 78%; }
        .lg-pl-full  { width: 100%; }
        .lg-pd { height: 1px; background: rgba(255,255,255,0.08); margin: 12px 0; }
        .lg-ps { margin-bottom: 14px; }
        .lg-plabel { width: 40%; height: 6px; border-radius: 4px; background: rgba(102,126,234,0.45); margin-bottom: 8px; }
        .lg-docx-badge {
          position: absolute; bottom: -13px; right: 14px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: #fff; font-size: 11px; font-weight: 700;
          padding: 4px 12px; border-radius: 20px;
          box-shadow: 0 4px 14px rgba(102,126,234,0.5);
        }

        /* ── Right panel ─────────────── */
        .lg-right {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 52px;
          z-index: 1;
          position: relative;
          flex-shrink: 0;
          width: 460px;
        }

        .lg-card {
          width: 100%;
          max-width: 390px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 22px;
          padding: 44px 38px;
          backdrop-filter: blur(22px);
          box-shadow:
            0 32px 80px rgba(0,0,0,0.55),
            0 0 0 1px rgba(102,126,234,0.12);
        }

        .lg-card-header { margin-bottom: 32px; }
        .lg-card-title {
          font-size: 27px; font-weight: 800; color: #f0f0ff;
          margin-bottom: 6px;
        }
        .lg-card-sub {
          font-size: 14px; color: rgba(140,140,190,0.7);
        }

        .lg-error {
          background: rgba(220,38,38,0.12);
          border: 1px solid rgba(220,38,38,0.35);
          color: #fca5a5;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13.5px;
          margin-bottom: 22px;
        }

        .lg-form { display: flex; flex-direction: column; gap: 22px; }

        .lg-field { display: flex; flex-direction: column; gap: 8px; }
        .lg-label {
          font-size: 12.5px; font-weight: 600;
          color: rgba(190,190,240,0.75);
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }
        .lg-input {
          width: 100%;
          padding: 13px 16px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 11px;
          color: #e8e8f8;
          font-size: 15px;
          outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .lg-input::placeholder { color: rgba(130,130,180,0.4); }
        .lg-input:focus {
          border-color: rgba(102,126,234,0.65);
          background: rgba(102,126,234,0.07);
          box-shadow: 0 0 0 3px rgba(102,126,234,0.13);
        }

        .lg-pw-wrap { position: relative; }
        .lg-pw-wrap .lg-input { padding-right: 46px; }
        .lg-pw-toggle {
          position: absolute; right: 13px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          font-size: 15px; padding: 0;
          color: rgba(140,140,190,0.55);
          transition: color 0.15s;
        }
        .lg-pw-toggle:hover { color: #a5b4fc; }

        .lg-submit {
          width: 100%;
          padding: 14px;
          margin-top: 4px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none; border-radius: 11px;
          color: #fff; font-size: 15px; font-weight: 700;
          letter-spacing: 0.4px;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(102,126,234,0.4);
        }
        .lg-submit:hover {
          opacity: 0.9;
          transform: translateY(-1px);
          box-shadow: 0 8px 30px rgba(102,126,234,0.6);
        }
        .lg-submit:active { transform: translateY(0); }

        .lg-footer-link {
          text-align: center;
          margin-top: 26px;
          font-size: 13.5px;
          color: rgba(140,140,190,0.6);
        }
        .lg-footer-link a {
          color: #a5b4fc; text-decoration: none; font-weight: 600;
        }
        .lg-footer-link a:hover { color: #c4cfff; text-decoration: underline; }

        /* ── Responsive ──────────────── */
        @media (max-width: 920px) {
          .lg-root { flex-direction: column; }
          .lg-left {
            max-width: 100%;
            padding: 52px 36px 28px;
            align-items: center;
            text-align: center;
          }
          .lg-pills { justify-content: center; }
          .lg-preview { display: none; }
          .lg-right { width: 100%; padding: 0 24px 52px; }
          .lg-card { max-width: 460px; }
        }
        @media (max-width: 480px) {
          .lg-left { padding: 44px 20px 24px; }
          .lg-card { padding: 32px 24px; }
        }
      `}</style>
    </div>
  )
}

