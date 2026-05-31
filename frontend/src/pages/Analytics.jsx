import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import api from '../services/api'
import '../styles/Analytics.css'

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className={`stat-card stat-card--${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-body">
        <div className="stat-value">{value ?? '—'}</div>
        <div className="stat-label">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  )
}

function formatDate(iso) {
  if (!iso) return 'Never'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(iso) {
  if (!iso) return 'Never'
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function statusBadge(user) {
  if (!user.last_login) return <span className="badge badge--never">Never logged in</span>
  const diff = Date.now() - new Date(user.last_login).getTime()
  if (diff < 60 * 60 * 1000) return <span className="badge badge--online">Online now</span>
  if (diff < 30 * 24 * 60 * 60 * 1000) return <span className="badge badge--active">Active</span>
  return <span className="badge badge--inactive">Inactive</span>
}

export default function Analytics() {
  const { token } = useSelector((s) => s.auth)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.getAnalytics(token)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  const filtered = data?.users?.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name || '').toLowerCase().includes(search.toLowerCase())
  ) ?? []

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <div>
          <h1 className="analytics-title">📊 Analytics</h1>
          <p className="analytics-subtitle">Platform insights and usage statistics</p>
        </div>
        {data && (
          <button className="analytics-refresh" onClick={() => {
            setLoading(true); setError('')
            api.getAnalytics(token).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false))
          }}>↻ Refresh</button>
        )}
      </div>

      {error && <div className="analytics-error">❌ {error}</div>}

      {loading ? (
        <div className="analytics-loading">Loading analytics…</div>
      ) : data && (
        <>
          {/* Stats Grid */}
          <div className="stats-grid">
            <StatCard icon="👥" label="Total Users" value={data.total_users} color="blue" />
            <StatCard icon="✅" label="Active Users" value={data.active_users} sub="Logged in within 30 days" color="green" />
            <StatCard icon="💤" label="Inactive Users" value={data.inactive_users} sub="No login in 30+ days" color="gray" />
            <StatCard icon="🟢" label="Online Now" value={data.online_now} sub="Logged in within 1 hour" color="teal" />
            <StatCard icon="📄" label="Resumes Downloaded" value={data.total_resumes_downloaded} color="purple" />
            <StatCard icon="📋" label="Resume Versions" value={data.total_versions} color="orange" />
            <StatCard icon="💬" label="Prompts Created" value={data.total_prompts} color="pink" />
            <StatCard icon="🆕" label="New This Month" value={data.new_users_this_month} sub="User registrations" color="indigo" />
            <StatCard icon="🛡️" label="Admin Users" value={data.admin_count} color="red" />
          </div>

          {/* Users Table */}
          <div className="analytics-table-section">
            <div className="analytics-table-header">
              <h2>All Users <span className="user-count">({data.total_users})</span></h2>
              <input
                className="analytics-search"
                placeholder="Search by name, username or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="analytics-table-wrap">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Joined</th>
                    <th>Downloads</th>
                    <th>Versions</th>
                    <th>Prompts</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={10} className="table-empty">No users match your search.</td></tr>
                  ) : filtered.map((u, i) => (
                    <tr key={u.id}>
                      <td className="td-num">{i + 1}</td>
                      <td className="td-user">
                        <div className="user-cell">
                          <div className="user-avatar">{(u.full_name || u.username)[0].toUpperCase()}</div>
                          <div>
                            <div className="user-name">{u.full_name || u.username}</div>
                            <div className="user-handle">@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="td-email">{u.email}</td>
                      <td>{u.is_admin ? <span className="badge badge--admin">Admin</span> : <span className="badge badge--user">User</span>}</td>
                      <td>{statusBadge(u)}</td>
                      <td className="td-date">{formatDateTime(u.last_login)}</td>
                      <td className="td-date">{formatDate(u.created_at)}</td>
                      <td className="td-num">{u.resume_downloads}</td>
                      <td className="td-num">{u.versions_count}</td>
                      <td className="td-num">{u.prompts_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

