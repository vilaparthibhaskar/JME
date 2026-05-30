import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'

const ROTATING_WORDS = ['Tailored.', 'Polished.', 'Ready.', 'Yours.']

const FEATURES = [
  {
    icon: '📋',
    title: 'Resume Versions',
    desc: 'Maintain multiple tailored resume versions — one for each role, industry, or application.',
    color: '#667eea',
  },
  {
    icon: '📄',
    title: 'DOCX Export',
    desc: 'Download a professionally formatted Word document instantly, ready to send to recruiters.',
    color: '#f093fb',
  },
  {
    icon: '🎨',
    title: 'Multiple Templates',
    desc: 'Switch between resume templates with a single click — no reformatting required.',
    color: '#4facfe',
  },
  {
    icon: '🤖',
    title: 'AI Prompts',
    desc: 'Use curated AI prompts to tailor your resume content to a specific job description.',
    color: '#43e97b',
  },
  {
    icon: '🔗',
    title: 'Clickable Links',
    desc: 'GitHub, LinkedIn, and LeetCode links are embedded as live hyperlinks in your DOCX.',
    color: '#fa709a',
  },
  {
    icon: '⚡',
    title: 'Instant Updates',
    desc: 'Edit any field, save, and regenerate — your resume stays fresh with no friction.',
    color: '#f6d365',
  },
]

const STEPS = [
  { num: '01', title: 'Create a Version', desc: 'Fill in your personal info, skills, projects, and experience in a structured form.' },
  { num: '02', title: 'Pick a Template', desc: 'Choose the layout that fits the role you\'re applying to.' },
  { num: '03', title: 'Export & Apply', desc: 'Download your polished DOCX resume and hit send.' },
]

export default function Home() {
  const { isAuthenticated, user } = useSelector((state) => state.auth)
  const [wordIdx, setWordIdx] = useState(0)
  const [visible, setVisible] = useState(true)

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

  return (
    <div className="hm-root">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="hm-hero">
        <div className="hm-hero-blob hm-blob1" />
        <div className="hm-hero-blob hm-blob2" />
        <div className="hm-hero-inner">
          <div className="hm-badge">✦ Resume Manager</div>
          <h1 className="hm-title">
            Your Resume.{' '}
            <span
              className="hm-rotating-word"
              style={{ opacity: visible ? 1 : 0 }}
            >
              {ROTATING_WORDS[wordIdx]}
            </span>
          </h1>
          <p className="hm-subtitle">
            Build, version, and export job-winning resumes — all from one place.
            No design tools, no reformatting. Just results.
          </p>

          {isAuthenticated ? (
            <div className="hm-actions">
              <span className="hm-greeting">👋 Hey, <strong>{user?.full_name || user?.username}</strong></span>
              <Link to="/versions" className="hm-btn hm-btn-primary">📋 My Versions</Link>
              <Link to="/resume" className="hm-btn hm-btn-outline">⬇ Generate Resume</Link>
            </div>
          ) : (
            <div className="hm-actions">
              <Link to="/signup" className="hm-btn hm-btn-primary">Get Started Free</Link>
              <Link to="/login" className="hm-btn hm-btn-outline">Sign In</Link>
            </div>
          )}
        </div>

        {/* floating resume card mockup */}
        <div className="hm-card-preview">
          <div className="hm-preview-line hm-line-name" />
          <div className="hm-preview-line hm-line-title" />
          <div className="hm-preview-divider" />
          <div className="hm-preview-section">
            <div className="hm-preview-label" />
            <div className="hm-preview-line hm-line-short" />
            <div className="hm-preview-line hm-line-med" />
            <div className="hm-preview-line hm-line-short" />
          </div>
          <div className="hm-preview-section">
            <div className="hm-preview-label" />
            <div className="hm-preview-line hm-line-full" />
            <div className="hm-preview-line hm-line-med" />
          </div>
          <div className="hm-preview-badge">📄 .docx</div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section className="hm-steps-section">
        <p className="hm-section-eyebrow">How it works</p>
        <h2 className="hm-section-title">Three steps to your next interview</h2>
        <div className="hm-steps">
          {STEPS.map((s, i) => (
            <div key={i} className="hm-step">
              <div className="hm-step-num">{s.num}</div>
              <h3 className="hm-step-title">{s.title}</h3>
              <p className="hm-step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section className="hm-features-section">
        <p className="hm-section-eyebrow">Features</p>
        <h2 className="hm-section-title">Everything you need, nothing you don't</h2>
        <div className="hm-features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="hm-feature-card" style={{ '--accent': f.color }}>
              <div className="hm-feature-icon">{f.icon}</div>
              <h3 className="hm-feature-title">{f.title}</h3>
              <p className="hm-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      {!isAuthenticated && (
        <section className="hm-cta">
          <h2 className="hm-cta-title">Ready to land your next role?</h2>
          <p className="hm-cta-sub">Create your account in seconds. No credit card required.</p>
          <Link to="/signup" className="hm-btn hm-btn-primary hm-btn-lg">Start Building Your Resume</Link>
        </section>
      )}

      <style>{`
        /* ── Root ──────────────────────────────────────────────────────── */
        .hm-root {
          min-height: calc(100vh - 70px);
          background: #0d0d14;
          color: #e8e8f0;
          font-family: inherit;
          overflow-x: hidden;
        }

        /* ── Hero ──────────────────────────────────────────────────────── */
        .hm-hero {
          position: relative;
          min-height: 88vh;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 40px;
          max-width: 1200px;
          margin: 0 auto;
          padding: 80px 40px;
          overflow: hidden;
        }

        /* animated blobs */
        .hm-hero-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.35;
          pointer-events: none;
          animation: blobFloat 8s ease-in-out infinite;
        }
        .hm-blob1 {
          width: 520px; height: 520px;
          background: radial-gradient(circle, #667eea, #764ba2);
          top: -120px; left: -160px;
          animation-delay: 0s;
        }
        .hm-blob2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, #f093fb, #4facfe);
          bottom: -80px; right: -100px;
          animation-delay: 4s;
        }
        @keyframes blobFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(20px, -30px) scale(1.05); }
        }

        .hm-hero-inner {
          position: relative;
          z-index: 1;
          flex: 1;
          max-width: 600px;
        }

        .hm-badge {
          display: inline-block;
          padding: 6px 14px;
          background: rgba(102, 126, 234, 0.15);
          border: 1px solid rgba(102, 126, 234, 0.4);
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          color: #a5b4fc;
          letter-spacing: 0.05em;
          margin-bottom: 24px;
        }

        .hm-title {
          font-size: clamp(38px, 5vw, 62px);
          font-weight: 800;
          line-height: 1.15;
          color: #f0f0ff;
          margin-bottom: 20px;
        }

        .hm-rotating-word {
          background: linear-gradient(135deg, #667eea 0%, #f093fb 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          transition: opacity 0.35s ease;
          display: inline-block;
        }

        .hm-subtitle {
          font-size: 18px;
          color: #9090b0;
          line-height: 1.7;
          margin-bottom: 36px;
          max-width: 520px;
        }

        .hm-greeting {
          font-size: 15px;
          color: #a0a0c0;
          display: block;
          margin-bottom: 16px;
        }
        .hm-greeting strong { color: #c8c8e8; }

        .hm-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          align-items: center;
        }

        .hm-btn {
          padding: 13px 28px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.25s;
          display: inline-block;
        }
        .hm-btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.35);
        }
        .hm-btn-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 32px rgba(102, 126, 234, 0.55);
          color: #fff;
        }
        .hm-btn-outline {
          border: 1.5px solid rgba(102, 126, 234, 0.5);
          color: #a5b4fc;
          background: rgba(102, 126, 234, 0.07);
        }
        .hm-btn-outline:hover {
          background: rgba(102, 126, 234, 0.18);
          border-color: #667eea;
          color: #c4cfff;
          transform: translateY(-2px);
        }
        .hm-btn-lg {
          padding: 16px 38px;
          font-size: 17px;
        }

        /* ── Resume card mockup ────────────────────────────────────────── */
        .hm-card-preview {
          position: relative;
          z-index: 1;
          flex-shrink: 0;
          width: 220px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 24px 20px;
          backdrop-filter: blur(12px);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          animation: cardFloat 6s ease-in-out infinite;
        }
        @keyframes cardFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }

        .hm-preview-line {
          height: 8px;
          border-radius: 4px;
          background: rgba(255,255,255,0.15);
          margin-bottom: 8px;
        }
        .hm-line-name  { width: 70%; height: 14px; background: rgba(165,180,252,0.4); }
        .hm-line-title { width: 50%; background: rgba(240,147,251,0.3); }
        .hm-line-short { width: 55%; }
        .hm-line-med   { width: 75%; }
        .hm-line-full  { width: 100%; }

        .hm-preview-divider {
          height: 1px;
          background: rgba(255,255,255,0.1);
          margin: 12px 0;
        }
        .hm-preview-section { margin-bottom: 14px; }
        .hm-preview-label {
          width: 40%;
          height: 7px;
          border-radius: 4px;
          background: rgba(102,126,234,0.5);
          margin-bottom: 8px;
        }

        .hm-preview-badge {
          position: absolute;
          bottom: -14px;
          right: 16px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: 20px;
          box-shadow: 0 4px 12px rgba(102,126,234,0.5);
        }

        /* ── Section commons ───────────────────────────────────────────── */
        .hm-section-eyebrow {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #667eea;
          text-align: center;
          margin-bottom: 10px;
        }
        .hm-section-title {
          font-size: clamp(26px, 3.5vw, 40px);
          font-weight: 800;
          color: #f0f0ff;
          text-align: center;
          margin-bottom: 60px;
        }

        /* ── How it works ──────────────────────────────────────────────── */
        .hm-steps-section {
          max-width: 1100px;
          margin: 0 auto;
          padding: 80px 40px;
        }

        .hm-steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
          position: relative;
        }
        .hm-steps::before {
          content: '';
          position: absolute;
          top: 36px;
          left: calc(16.66% + 20px);
          width: calc(66.66% - 40px);
          height: 2px;
          background: linear-gradient(90deg, rgba(102,126,234,0.6), rgba(240,147,251,0.6));
        }

        .hm-step {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 28px 24px;
          text-align: center;
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .hm-step:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.3);
        }

        .hm-step-num {
          width: 52px;
          height: 52px;
          line-height: 52px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: #fff;
          font-size: 16px;
          font-weight: 800;
          margin: 0 auto 18px;
          box-shadow: 0 6px 20px rgba(102,126,234,0.4);
        }
        .hm-step-title {
          font-size: 18px;
          font-weight: 700;
          color: #e8e8f8;
          margin-bottom: 10px;
        }
        .hm-step-desc {
          font-size: 14px;
          color: #7878a0;
          line-height: 1.65;
        }

        /* ── Features ──────────────────────────────────────────────────── */
        .hm-features-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 80px 40px;
        }

        .hm-features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
        }

        .hm-feature-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 30px 28px;
          transition: transform 0.3s, box-shadow 0.3s, border-color 0.3s;
          position: relative;
          overflow: hidden;
        }
        .hm-feature-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 3px;
          background: var(--accent, #667eea);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s ease;
        }
        .hm-feature-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 48px rgba(0,0,0,0.35);
          border-color: rgba(255,255,255,0.15);
        }
        .hm-feature-card:hover::before { transform: scaleX(1); }

        .hm-feature-icon {
          font-size: 36px;
          margin-bottom: 16px;
        }
        .hm-feature-title {
          font-size: 17px;
          font-weight: 700;
          color: #e8e8f8;
          margin-bottom: 10px;
        }
        .hm-feature-desc {
          font-size: 14px;
          color: #7878a0;
          line-height: 1.65;
        }

        /* ── CTA ────────────────────────────────────────────────────────  */
        .hm-cta {
          text-align: center;
          padding: 100px 40px;
          background: linear-gradient(180deg, transparent 0%, rgba(102,126,234,0.08) 100%);
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .hm-cta-title {
          font-size: clamp(28px, 4vw, 46px);
          font-weight: 800;
          color: #f0f0ff;
          margin-bottom: 16px;
        }
        .hm-cta-sub {
          font-size: 16px;
          color: #8080a0;
          margin-bottom: 36px;
        }

        /* ── Responsive ────────────────────────────────────────────────── */
        @media (max-width: 900px) {
          .hm-hero { flex-direction: column; text-align: center; padding: 60px 24px; }
          .hm-hero-inner { max-width: 100%; }
          .hm-actions { justify-content: center; }
          .hm-card-preview { width: 180px; align-self: center; }
          .hm-steps { grid-template-columns: 1fr; }
          .hm-steps::before { display: none; }
          .hm-steps-section, .hm-features-section { padding: 60px 24px; }
        }
        @media (max-width: 480px) {
          .hm-btn { width: 100%; text-align: center; }
          .hm-actions { flex-direction: column; }
          .hm-card-preview { display: none; }
        }
      `}</style>
    </div>
  )
}
