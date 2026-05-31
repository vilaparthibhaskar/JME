import { useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../services/api'

const IC = {
  wave:  String.fromCodePoint(0x1F44B),         // 👋
  clip:  String.fromCodePoint(0x1F4CB),         // 📋
  inbox: String.fromCodePoint(0x1F4E5),         // 📥
  cal:   String.fromCodePoint(0x1F4C5),         // 📅
  clock: String.fromCodePoint(0x1F550),         // 🕐
  doc:   String.fromCodePoint(0x1F4C4),         // 📄
  chat:  String.fromCodePoint(0x1F4AC),         // 💬
  gear:  String.fromCodePoint(0x2699, 0xFE0F),  // ⚙️
  edit:  String.fromCodePoint(0x270F, 0xFE0F),  // ✏️
  down:  String.fromCodePoint(0x2B07, 0xFE0F),  // ⬇️
  arr:   '\u2192',  // →
  dash:  '\u2014',  // —
  dots:  '\u2026',  // …
}

function timeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function fmtDate(iso) {
  if (!iso) return IC.dash
  const ts = iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z'
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    timeZone: 'America/New_York',
  })
}

export default function Dashboard() {
  const { user, token } = useSelector((state) => state.auth)
  const navigate = useNavigate()
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getVersions(token)
      .then(setVersions)
      .catch(() => setVersions([]))
      .finally(() => setLoading(false))
  }, [token])

  const recent = [...versions].reverse().slice(0, 3)

  return (
    <div className="db-root">

      {/* â”€â”€ HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="db-header">
        <div>
          <h1 className="db-greeting">{timeOfDay()}, {user?.full_name || user?.username} {IC.wave}</h1>
          <p className="db-sub">Here's your resume workspace at a glance.</p>
        </div>
        <button className="db-cta-btn" onClick={() => navigate('/versions')}>
          + New Version
        </button>
      </div>

      {/* â”€â”€ STATS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="db-stats">
        <div className="db-stat">
          <span className="db-stat-icon">{IC.clip}</span>
          <div>
            <div className="db-stat-val">{loading ? IC.dots : versions.length}</div>
            <div className="db-stat-label">Resume Versions</div>
          </div>
        </div>
        <div className="db-stat">
          <span className="db-stat-icon">{IC.inbox}</span>
          <div>
            <div className="db-stat-val">{user?.resume_downloads ?? 0}</div>
            <div className="db-stat-label">Downloads</div>
          </div>
        </div>
        <div className="db-stat">
          <span className="db-stat-icon">{IC.cal}</span>
          <div>
            <div className="db-stat-val">{fmtDate(user?.created_at)}</div>
            <div className="db-stat-label">Member Since</div>
          </div>
        </div>
        <div className="db-stat">
          <span className="db-stat-icon">{IC.clock}</span>
          <div>
            <div className="db-stat-val">{fmtDate(user?.last_login)}</div>
            <div className="db-stat-label">Last Login</div>
          </div>
        </div>
      </div>

      <div className="db-grid">

        {/* â”€â”€ RECENT VERSIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="db-section db-versions">
          <div className="db-section-head">
            <h2 className="db-section-title">Recent Versions</h2>
            <Link to="/versions" className="db-link">View all {IC.arr}</Link>
          </div>

          {loading ? (
            <div className="db-empty">Loading{IC.dots}</div>
          ) : recent.length === 0 ? (
            <div className="db-empty-state">
              <span className="db-empty-icon">{IC.doc}</span>
              <p>No versions yet.</p>
              <button className="db-pill-btn" onClick={() => navigate('/versions')}>
                Create your first version
              </button>
            </div>
          ) : (
            <div className="db-version-list">
              {recent.map((v) => (
                <div key={v.id} className="db-version-row">
                  <div className="db-version-info">
                    <div className="db-version-name">{v.name || `Version ${v.id}`}</div>
                    <div className="db-version-meta">
                      {v.target_role && <span className="db-tag">{v.target_role}</span>}
                      <span className="db-date">{fmtDate(v.created_at || v.updated_at)}</span>
                    </div>
                  </div>
                  <div className="db-version-actions">
                    <button className="db-icon-btn" title="Edit version" onClick={() => navigate('/versions')}>{IC.edit}</button>
                    <button className="db-icon-btn" title="Generate resume" onClick={() => navigate('/resume')}>{IC.down}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* â”€â”€ QUICK ACTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="db-section db-actions">
          <h2 className="db-section-title">Quick Actions</h2>
          <div className="db-action-list">
            {[
              { icon: IC.clip,  label: 'Manage Versions',  sub: 'Create or edit resume versions',   path: '/versions' },
              { icon: IC.doc,   label: 'Generate Resume',  sub: 'Export a polished .docx file',     path: '/resume'   },
              { icon: IC.chat,  label: 'AI Prompts',       sub: 'Tailor your content with prompts', path: '/prompts'  },
              { icon: IC.gear,  label: 'Settings',         sub: 'Update profile & password',        path: '/settings' },
            ].map((a) => (
              <button key={a.path} className="db-action-card" onClick={() => navigate(a.path)}>
                <span className="db-action-icon">{a.icon}</span>
                <div>
                  <div className="db-action-label">{a.label}</div>
                  <div className="db-action-sub">{a.sub}</div>
                </div>
                <span className="db-action-arrow">{IC.arr}</span>
              </button>
            ))}
          </div>
        </div>

        {/* â”€â”€ PROFILE SNAPSHOT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="db-section db-profile">
          <h2 className="db-section-title">Profile</h2>
          <div className="db-profile-avatar">
            {(user?.full_name || user?.username || '?')[0].toUpperCase()}
          </div>
          <div className="db-profile-name">{user?.full_name || user?.username}</div>
          <div className="db-profile-username">@{user?.username}</div>
          {user?.is_admin && <span className="db-admin-badge">Admin</span>}

          <div className="db-profile-rows">
            <div className="db-profile-row">
              <span className="db-profile-label">Email</span>
              <span className="db-profile-val">{user?.email || IC.dash}</span>
            </div>
            <div className="db-profile-row">
              <span className="db-profile-label">Status</span>
              <span className="db-online-dot" /> <span className="db-profile-val">Active</span>
            </div>
          </div>

          <button className="db-pill-btn db-pill-outline" onClick={() => navigate('/settings')}>
            Edit Profile
          </button>
        </div>

      </div>

      <style>{`
        .db-root {
          min-height: calc(100vh - 64px);
          background: #f3f4f8;
          padding: 36px 32px 60px;
          font-family: inherit;
        }

        /* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        .db-header {
          max-width: 1200px;
          margin: 0 auto 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .db-greeting {
          font-size: 28px;
          font-weight: 800;
          color: #1a1a2e;
          margin-bottom: 4px;
        }
        .db-sub {
          font-size: 14.5px;
          color: #7070a0;
        }
        .db-cta-btn {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 11px 22px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(102,126,234,0.35);
          transition: opacity 0.2s, transform 0.2s;
        }
        .db-cta-btn:hover { opacity: 0.9; transform: translateY(-1px); }

        /* â”€â”€ Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        .db-stats {
          max-width: 1200px;
          margin: 0 auto 32px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }
        .db-stat {
          background: #fff;
          border-radius: 14px;
          padding: 22px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.06);
          border: 1px solid rgba(0,0,0,0.04);
        }
        .db-stat-icon { font-size: 28px; flex-shrink: 0; }
        .db-stat-val {
          font-size: 22px;
          font-weight: 800;
          color: #1a1a2e;
          line-height: 1;
          margin-bottom: 4px;
        }
        .db-stat-label {
          font-size: 12px;
          font-weight: 600;
          color: #9090b0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* â”€â”€ Main grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        .db-grid {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 340px 260px;
          grid-template-rows: auto;
          gap: 20px;
        }
        .db-section {
          background: #fff;
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.06);
          border: 1px solid rgba(0,0,0,0.04);
        }

        .db-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .db-section-title {
          font-size: 16px;
          font-weight: 700;
          color: #1a1a2e;
          margin-bottom: 20px;
        }
        .db-section-head .db-section-title { margin-bottom: 0; }
        .db-link {
          font-size: 13px;
          font-weight: 600;
          color: #667eea;
          text-decoration: none;
        }
        .db-link:hover { text-decoration: underline; }

        /* â”€â”€ Version list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        .db-version-list { display: flex; flex-direction: column; gap: 12px; }
        .db-version-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px;
          background: #f8f8fc;
          border-radius: 10px;
          border: 1px solid rgba(102,126,234,0.08);
          transition: border-color 0.2s;
        }
        .db-version-row:hover { border-color: rgba(102,126,234,0.3); }
        .db-version-name {
          font-size: 14.5px;
          font-weight: 600;
          color: #1a1a2e;
          margin-bottom: 5px;
        }
        .db-version-meta { display: flex; align-items: center; gap: 8px; }
        .db-tag {
          background: rgba(102,126,234,0.1);
          color: #667eea;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 10px;
        }
        .db-date { font-size: 12px; color: #9090b0; }
        .db-version-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .db-icon-btn {
          background: #f0f0f8;
          border: none;
          border-radius: 8px;
          width: 32px; height: 32px;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.15s;
          display: flex; align-items: center; justify-content: center;
        }
        .db-icon-btn:hover { background: #e0e0f0; }

        .db-empty { color: #9090b0; font-size: 14px; }
        .db-empty-state {
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; padding: 32px 0; color: #9090b0; text-align: center;
        }
        .db-empty-icon { font-size: 40px; }

        /* â”€â”€ Quick actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        .db-action-list { display: flex; flex-direction: column; gap: 10px; }
        .db-action-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          background: #f8f8fc;
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: 11px;
          cursor: pointer;
          width: 100%;
          text-align: left;
          transition: background 0.15s, border-color 0.2s, transform 0.15s;
        }
        .db-action-card:hover {
          background: rgba(102,126,234,0.06);
          border-color: rgba(102,126,234,0.25);
          transform: translateX(2px);
        }
        .db-action-icon { font-size: 22px; flex-shrink: 0; }
        .db-action-label { font-size: 14px; font-weight: 600; color: #1a1a2e; margin-bottom: 2px; }
        .db-action-sub { font-size: 12px; color: #9090b0; }
        .db-action-arrow { margin-left: auto; color: #c0c0d8; font-size: 16px; flex-shrink: 0; }

        /* â”€â”€ Profile card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        .db-profile { display: flex; flex-direction: column; align-items: center; text-align: center; }
        .db-profile-avatar {
          width: 64px; height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: #fff;
          font-size: 26px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 12px;
          box-shadow: 0 4px 16px rgba(102,126,234,0.35);
        }
        .db-profile-name { font-size: 16px; font-weight: 700; color: #1a1a2e; margin-bottom: 3px; }
        .db-profile-username { font-size: 12.5px; color: #9090b0; margin-bottom: 10px; }
        .db-admin-badge {
          font-size: 10px; font-weight: 700; letter-spacing: 0.6px;
          text-transform: uppercase;
          color: #d97706;
          background: rgba(251,191,36,0.12);
          border: 1px solid rgba(251,191,36,0.35);
          padding: 3px 10px; border-radius: 20px;
          margin-bottom: 16px;
        }
        .db-profile-rows { width: 100%; margin-bottom: 20px; }
        .db-profile-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px;
        }
        .db-profile-row:last-child { border-bottom: none; }
        .db-profile-label { color: #9090b0; font-weight: 600; }
        .db-profile-val { color: #1a1a2e; font-weight: 500; text-align: right; word-break: break-all; }
        .db-online-dot {
          display: inline-block; width: 7px; height: 7px;
          border-radius: 50%; background: #22c55e; margin-right: 4px;
        }

        /* â”€â”€ Buttons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        .db-pill-btn {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: #fff; border: none; border-radius: 8px;
          padding: 9px 20px; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: opacity 0.2s, transform 0.15s;
        }
        .db-pill-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .db-pill-outline {
          background: transparent !important;
          color: #667eea !important;
          border: 1.5px solid #667eea !important;
          width: 100%;
        }
        .db-pill-outline:hover { background: rgba(102,126,234,0.07) !important; }

        /* â”€â”€ Responsive â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        @media (max-width: 1100px) {
          .db-grid { grid-template-columns: 1fr 300px; }
          .db-profile { grid-column: 1 / -1; flex-direction: row; flex-wrap: wrap; text-align: left; gap: 20px; }
          .db-profile-avatar { margin-bottom: 0; }
          .db-profile-rows { flex: 1; min-width: 200px; margin-bottom: 0; }
          .db-pill-outline { width: auto; }
        }
        @media (max-width: 800px) {
          .db-root { padding: 24px 16px 48px; }
          .db-stats { grid-template-columns: repeat(2, 1fr); }
          .db-grid { grid-template-columns: 1fr; }
          .db-profile { flex-direction: column; align-items: center; text-align: center; }
          .db-pill-outline { width: 100%; }
        }
        @media (max-width: 480px) {
          .db-stats { grid-template-columns: 1fr 1fr; gap: 12px; }
          .db-greeting { font-size: 22px; }
        }
      `}</style>
    </div>
  )
}
