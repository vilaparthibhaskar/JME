import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useJobs } from '../hooks/useJobs'
import api from '../services/api'

// ── Company metadata (id / name / initials / color / industry) ───────────────
// Exact IDs must match backend company_registry.py
const COMPANIES = [
  { id: 1,  name: 'Google',         initials: 'G',  color: '#4285F4', industry: 'Technology' },
  { id: 2,  name: 'Meta',           initials: 'M',  color: '#0866FF', industry: 'Technology' },
  { id: 3,  name: 'Amazon',         initials: 'A',  color: '#FF9900', industry: 'Technology' },
  { id: 4,  name: 'Microsoft',      initials: 'Ms', color: '#00A4EF', industry: 'Technology' },
  { id: 5,  name: 'Apple',          initials: 'Ap', color: '#555555', industry: 'Technology' },
  { id: 6,  name: 'Stripe',         initials: 'S',  color: '#635BFF', industry: 'Finance' },
  { id: 7,  name: 'Goldman Sachs',  initials: 'GS', color: '#6B8E6B', industry: 'Finance' },
  { id: 8,  name: 'JPMorgan Chase', initials: 'JP', color: '#003087', industry: 'Finance' },
  { id: 9,  name: 'Plaid',          initials: 'Pl', color: '#111111', industry: 'Finance' },
  { id: 10, name: 'Netflix',        initials: 'N',  color: '#E50914', industry: 'Entertainment' },
  { id: 11, name: 'Spotify',        initials: 'Sp', color: '#1DB954', industry: 'Entertainment' },
  { id: 12, name: 'Roblox',         initials: 'R',  color: '#E8222E', industry: 'Entertainment' },
  { id: 13, name: 'Epic Systems',   initials: 'E',  color: '#D52B1E', industry: 'Healthcare' },
  { id: 14, name: 'Veeva',          initials: 'V',  color: '#F26724', industry: 'Healthcare' },
  { id: 15, name: 'Cloudflare',     initials: 'CF', color: '#F48120', industry: 'Cloud & Infrastructure' },
  { id: 16, name: 'HashiCorp',      initials: 'HC', color: '#7B42BC', industry: 'Cloud & Infrastructure' },
  { id: 17, name: 'Datadog',        initials: 'DD', color: '#632CA6', industry: 'Cloud & Infrastructure' },
]

const COMPANY_MAP = Object.fromEntries(COMPANIES.map(c => [c.id, c]))

const INDUSTRY_GROUPS = COMPANIES.reduce((acc, c) => {
  let g = acc.find(x => x.industry === c.industry)
  if (!g) { g = { industry: c.industry, companies: [] }; acc.push(g) }
  g.companies.push(c)
  return acc
}, [])

const DATE_FILTERS = ['All', 'Today', 'This Week', 'Custom']

export default function Jobs() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = useSelector(state => state.auth.token)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selectedCompanies, setSelectedCompanies] = useState(new Set())
  const [dateFilter, setDateFilter] = useState('All')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [companySearch, setCompanySearch] = useState('')
  const [jobSearch, setJobSearch]   = useState('')
  const [savedView, setSavedView]   = useState(false)

  // ── Job status tracking { [job_id]: 'saved' | 'discarded' } ──────────────
  const [jobStatuses, setJobStatuses] = useState({})
  // Full details for saved jobs (title, url, company_id, first_seen_at)
  const [savedJobsList, setSavedJobsList] = useState([])

  // Load persisted statuses once the user is authenticated
  useEffect(() => {
    if (!token) return
    api.getUserJobStatuses(token)
      .then(data => {
        setJobStatuses(Object.fromEntries(
          Object.entries(data).map(([id, info]) => [id, info.status])
        ))
        setSavedJobsList(
          Object.entries(data)
            .filter(([, d]) => d.status === 'saved')
            .map(([job_id, d]) => ({ job_id, ...d }))
        )
      })
      .catch(() => {})
  }, [token])

  const handleStatusToggle = useCallback(async (job, newStatus) => {
    if (!token) return
    const current = jobStatuses[job.job_id]
    try {
      if (current === newStatus) {
        await api.removeJobStatus(token, job.job_id)
        setJobStatuses(prev => { const n = { ...prev }; delete n[job.job_id]; return n })
        setSavedJobsList(prev => prev.filter(j => j.job_id !== job.job_id))
      } else {
        await api.setJobStatus(token, job.job_id, newStatus, job.title, job.url, job.companyId)
        setJobStatuses(prev => ({ ...prev, [job.job_id]: newStatus }))
        if (newStatus === 'saved') {
          setSavedJobsList(prev =>
            prev.find(j => j.job_id === job.job_id)
              ? prev.map(j => j.job_id === job.job_id ? { ...j, status: 'saved' } : j)
              : [...prev, { job_id: job.job_id, title: job.title, url: job.url, company_id: job.companyId, status: 'saved', first_seen_at: new Date().toISOString() }]
          )
        } else {
          // Discarding removes from saved list
          setSavedJobsList(prev => prev.filter(j => j.job_id !== job.job_id))
        }
      }
    } catch (e) {
      console.error('Failed to update job status:', e)
    }
  }, [token, jobStatuses])

  // ── Data (fetching + pagination + infinite scroll) ────────────────────────
  const { jobs, loading, refreshing, hasMore, totalCount, sentinelRef } = useJobs({
    selectedCompanyIds: selectedCompanies,
    dateFilter,
    dateFrom,
    dateTo,
    jobSearch,
  })

  // ── Helpers ───────────────────────────────────────────────────────────────
  const allCompanyIds = INDUSTRY_GROUPS.flatMap(g => g.companies.map(c => c.id))

  const toggleCompany = (id) =>
    setSelectedCompanies(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const selectAll = () => setSelectedCompanies(new Set(allCompanyIds))
  const clearAll  = () => setSelectedCompanies(new Set())

  const filteredGroups = INDUSTRY_GROUPS
    .map(g => ({
      ...g,
      companies: g.companies.filter(c =>
        c.name.toLowerCase().includes(companySearch.toLowerCase())
      ),
    }))
    .filter(g => g.companies.length > 0)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="jb-root">

      {/* ── TOP FILTER BAR ─────────────────────────────────────────────── */}
      <div className="jb-topbar">
        <div className="jb-topbar-left">
          <h1 className="jb-page-title">Jobs Board</h1>
          {!savedView && selectedCompanies.size > 0 && (
            <span className="jb-count-badge">{totalCount} positions</span>
          )}
          {token && (
            <button
              className={`jb-saved-toggle${savedView ? ' active' : ''}`}
              onClick={() => setSavedView(v => !v)}
            >
              &#9733; Saved {savedJobsList.length > 0 && `(${savedJobsList.length})`}
            </button>
          )}
        </div>

        <div className="jb-filters">
          <div className="jb-date-pills">
            {DATE_FILTERS.map(f => (
              <button
                key={f}
                className={`jb-pill${dateFilter === f ? ' active' : ''}`}
                onClick={() => setDateFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>

          {dateFilter === 'Custom' && (
            <div className="jb-date-range">
              <label className="jb-date-label">From</label>
              <input type="date" className="jb-date-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <label className="jb-date-label">To</label>
              <input type="date" className="jb-date-input" value={dateTo}   onChange={e => setDateTo(e.target.value)} />
            </div>
          )}

          <div className="jb-search-wrap">
            <span className="jb-search-icon">&#128269;</span>
            <input
              className="jb-search"
              placeholder="Search jobs, skills&hellip;"
              value={jobSearch}
              onChange={e => setJobSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── BODY ───────────────────────────────────────────────────────── */}
      <div className="jb-body">

        {/* ── COMPANIES SIDEBAR (1/4) ─────────────────────────────────── */}
        <aside className="jb-sidebar">
          <div className="jb-sidebar-head">
            <span className="jb-sidebar-title">Companies</span>
            <div className="jb-sidebar-actions">
              <button className="jb-text-btn" onClick={selectAll}>All</button>
              <span className="jb-sep">&middot;</span>
              <button className="jb-text-btn" onClick={clearAll}>Clear</button>
            </div>
          </div>

          <div className="jb-company-search-wrap">
            <input
              className="jb-company-search"
              placeholder="Filter companies&hellip;"
              value={companySearch}
              onChange={e => setCompanySearch(e.target.value)}
            />
          </div>

          <div className="jb-company-list">
            {filteredGroups.map(group => (
              <div key={group.industry} className="jb-group">
                <div className="jb-group-label">{group.industry}</div>
                {group.companies.map(c => {
                  const sel = selectedCompanies.has(c.id)
                  return (
                    <button
                      key={c.id}
                      className={`jb-company-row${sel ? ' selected' : ''}`}
                      onClick={() => toggleCompany(c.id)}
                    >
                      <span className="jb-co-logo" style={{ background: c.color }}>
                        {c.initials}
                      </span>
                      <span className="jb-co-name">{c.name}</span>
                      {sel && <span className="jb-co-check">&#10003;</span>}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* ── JOBS FEED (3/4) ─────────────────────────────────────────── */}
        <main className="jb-feed">

          {/* ── SAVED JOBS VIEW ──────────────────────────────────────── */}
          {savedView && (
            savedJobsList.length === 0 ? (
              <div className="jb-no-selection">
                <div className="jb-no-sel-icon">&#9733;</div>
                <h3>No saved jobs yet</h3>
                <p>Click the <strong>☆ Save</strong> button on any job card to track it here.</p>
                <button className="jb-cta-btn" onClick={() => setSavedView(false)}>Browse Jobs</button>
              </div>
            ) : (
              <div className="jb-cards">
                {savedJobsList.map(job => {
                  const company = COMPANY_MAP[job.company_id]
                  const savedDate = job.first_seen_at
                    ? new Date(job.first_seen_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                    : ''
                  return (
                    <div key={job.job_id} className="jb-card">
                      <div className="jb-card-top">
                        <span className="jb-card-logo" style={{ background: company?.color }}>
                          {company?.initials}
                        </span>
                        <div className="jb-card-meta">
                          <div className="jb-card-company">{company?.name}</div>
                          <div className="jb-card-posted">Saved {savedDate}</div>
                        </div>
                        <div className="jb-card-badges">
                          <span className="jb-badge jb-badge-saved">&#9733; Saved</span>
                        </div>
                      </div>
                      <h3 className="jb-card-title">{job.title}</h3>
                      <div className="jb-card-actions">
                        <button className="jb-btn-apply" onClick={() => window.open(job.url, '_blank', 'noopener,noreferrer')}>Apply Now</button>
                        <button
                          className="jb-btn-save active"
                          title="Remove from saved"
                          onClick={() => handleStatusToggle({ job_id: job.job_id, title: job.title, url: job.url, companyId: job.company_id }, 'saved')}
                        >
                          &#9733; Saved
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}

          {!savedView && selectedCompanies.size === 0 && (
            <div className="jb-no-selection">
              <div className="jb-no-sel-icon">&#128226;</div>
              <h3>Select companies to browse jobs</h3>
              <p>Pick one or more companies from the sidebar to see their open positions.</p>
              <button className="jb-cta-btn" onClick={selectAll}>
                Show all companies
              </button>
            </div>
          )}

          {!savedView && loading && selectedCompanies.size > 0 && (
            <div className="jb-loading">
              <div className="jb-load-dots"><span /><span /><span /></div>
              <p>Loading jobs&hellip;</p>
            </div>
          )}

          {!savedView && !loading && selectedCompanies.size > 0 && jobs.length === 0 && !refreshing && (
            <div className="jb-no-selection">
              <div className="jb-no-sel-icon">&#128269;</div>
              <h3>No jobs match your filters</h3>
              <p>Try adjusting the date range or clearing your search.</p>
            </div>
          )}

          {!savedView && refreshing && (
            <div className="jb-refreshing">
              <div className="jb-load-dots"><span /><span /><span /></div>
              <span>Refreshing jobs&hellip;</span>
            </div>
          )}

          {!savedView && !loading && jobs.length > 0 && (
            <div className="jb-cards">
              {jobs.map(job => {
                const company   = COMPANY_MAP[job.companyId]
                const jobStatus = jobStatuses[job.job_id]   // 'saved' | 'discarded' | undefined
                const isNew     = token && !jobStatus
                return (
                  <div
                    key={`${job.companyId}-${job.id || job.job_id}`}
                    className={`jb-card${jobStatus === 'discarded' ? ' jb-card-discarded' : ''}`}
                  >
                    <div className="jb-card-top">
                      <span className="jb-card-logo" style={{ background: company?.color }}>
                        {company?.initials}
                      </span>
                      <div className="jb-card-meta">
                        <div className="jb-card-company">{company?.name}</div>
                        <div className="jb-card-posted">Posted {job.posted}</div>
                      </div>
                      <div className="jb-card-badges">
                        {isNew    && <span className="jb-badge jb-badge-new">NEW</span>}
                        {jobStatus === 'saved'     && <span className="jb-badge jb-badge-saved">&#9733; Saved</span>}
                        {jobStatus === 'discarded' && <span className="jb-badge jb-badge-disc">&#10005; Hidden</span>}
                        {job.remote && <span className="jb-badge jb-badge-remote">Remote</span>}
                        <span className="jb-badge jb-badge-type">{job.type}</span>
                        {job.experience && <span className="jb-badge jb-badge-exp">&#128203; {job.experience}</span>}
                      </div>
                    </div>

                    <h3 className="jb-card-title">{job.title}</h3>

                    <div className="jb-card-location">
                      <span className="jb-loc-icon">&#128205;</span> {job.location}
                      {job.salary && <span className="jb-salary">&middot; {job.salary}</span>}
                    </div>

                    <p className="jb-card-desc">{job.desc}</p>

                    <div className="jb-card-tags">
                      {job.tags.map(t => <span key={t} className="jb-tag">{t}</span>)}
                    </div>

                    <div className="jb-card-actions">
                      <button className="jb-btn-apply" onClick={() => window.open(job.url, '_blank', 'noopener,noreferrer')}>Apply Now</button>
                      {token && (
                        <>
                          <button
                            className={`jb-btn-save${jobStatus === 'saved' ? ' active' : ''}`}
                            title="Save job"
                            onClick={() => handleStatusToggle(job, 'saved')}
                          >
                            {jobStatus === 'saved' ? '★ Saved' : '☆ Save'}
                          </button>
                          <button
                            className={`jb-btn-discard${jobStatus === 'discarded' ? ' active' : ''}`}
                            title="Hide job"
                            onClick={() => handleStatusToggle(job, 'discarded')}
                          >
                            &#10005;
                          </button>
                        </>
                      )}
                      <button className="jb-btn-resume">Generate Resume</button>
                    </div>
                  </div>
                )
              })}

              {hasMore ? (
                <div className="jb-load-more" ref={sentinelRef}>
                  <div className="jb-load-dots"><span /><span /><span /></div>
                  <p>Loading more positions&hellip;</p>
                </div>
              ) : (
                <div className="jb-load-more">
                  <p style={{ color: '#b0b0c8', fontSize: 13 }}>
                    &#10003; All {totalCount} positions loaded
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        .jb-root {
          height: calc(100vh - 64px); display: flex; flex-direction: column;
          background: #f3f4f8; font-family: inherit; overflow: hidden;
        }
        .jb-topbar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; padding: 14px 28px; background: #fff;
          border-bottom: 1px solid #e8e8f0; flex-shrink: 0; flex-wrap: wrap;
        }
        .jb-topbar-left { display: flex; align-items: center; gap: 12px; }
        .jb-page-title  { font-size: 20px; font-weight: 800; color: #1a1a2e; margin: 0; }
        .jb-count-badge { background: rgba(102,126,234,0.12); color: #667eea; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
        .jb-filters     { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .jb-date-pills  { display: flex; gap: 4px; background: #f3f4f8; border-radius: 10px; padding: 4px; }
        .jb-pill { padding: 6px 14px; border: none; border-radius: 7px; font-size: 13px; font-weight: 600; color: #7878a0; background: transparent; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .jb-pill.active { background: #fff; color: #667eea; box-shadow: 0 1px 6px rgba(0,0,0,0.1); }
        .jb-pill:hover:not(.active) { color: #1a1a2e; }
        .jb-date-range { display: flex; align-items: center; gap: 8px; }
        .jb-date-label { font-size: 12px; font-weight: 600; color: #9090b0; text-transform: uppercase; letter-spacing: 0.4px; }
        .jb-date-input { border: 1px solid #e0e0ea; border-radius: 8px; padding: 6px 10px; font-size: 13px; color: #1a1a2e; background: #fff; outline: none; cursor: pointer; }
        .jb-date-input:focus { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }
        .jb-search-wrap { position: relative; display: flex; align-items: center; }
        .jb-search-icon { position: absolute; left: 10px; font-size: 14px; pointer-events: none; opacity: 0.5; }
        .jb-search { padding: 7px 14px 7px 32px; border: 1px solid #e0e0ea; border-radius: 10px; font-size: 13.5px; color: #1a1a2e; background: #f8f8fc; outline: none; width: 220px; transition: border-color 0.2s, box-shadow 0.2s, width 0.2s; }
        .jb-search:focus { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); width: 260px; background: #fff; }
        .jb-search::placeholder { color: #b0b0c8; }
        .jb-body { display: flex; flex: 1; overflow: hidden; }
        .jb-sidebar { width: 25%; min-width: 220px; max-width: 300px; background: #fff; border-right: 1px solid #e8e8f0; display: flex; flex-direction: column; flex-shrink: 0; }
        .jb-sidebar-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 10px; flex-shrink: 0; }
        .jb-sidebar-title { font-size: 13px; font-weight: 700; color: #9090b0; text-transform: uppercase; letter-spacing: 0.6px; }
        .jb-sidebar-actions { display: flex; align-items: center; gap: 4px; }
        .jb-text-btn { background: none; border: none; font-size: 12px; font-weight: 600; color: #667eea; cursor: pointer; padding: 2px 4px; border-radius: 4px; transition: background 0.15s; }
        .jb-text-btn:hover { background: rgba(102,126,234,0.08); }
        .jb-sep { color: #d0d0e0; font-size: 12px; }
        .jb-company-search-wrap { padding: 0 14px 12px; flex-shrink: 0; }
        .jb-company-search { width: 100%; padding: 8px 12px; border: 1px solid #e8e8f0; border-radius: 9px; font-size: 13px; background: #f8f8fc; color: #1a1a2e; outline: none; transition: border-color 0.2s; }
        .jb-company-search:focus { border-color: #667eea; background: #fff; }
        .jb-company-search::placeholder { color: #b0b0c8; }
        .jb-company-list { flex: 1; overflow-y: auto; padding: 0 8px 16px; }
        .jb-company-list::-webkit-scrollbar { width: 4px; }
        .jb-company-list::-webkit-scrollbar-track { background: transparent; }
        .jb-company-list::-webkit-scrollbar-thumb { background: #e0e0ea; border-radius: 4px; }
        .jb-group { margin-bottom: 6px; }
        .jb-group-label { font-size: 10.5px; font-weight: 700; color: #b0b0c8; text-transform: uppercase; letter-spacing: 0.7px; padding: 10px 10px 4px; }
        .jb-company-row { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px; border: none; background: none; border-radius: 10px; cursor: pointer; text-align: left; transition: background 0.15s; }
        .jb-company-row:hover    { background: #f5f5fc; }
        .jb-company-row.selected { background: rgba(102,126,234,0.1); }
        .jb-co-logo { width: 30px; height: 30px; border-radius: 8px; color: #fff; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .jb-co-name { font-size: 13.5px; font-weight: 600; color: #1a1a2e; flex: 1; }
        .jb-company-row.selected .jb-co-name { color: #667eea; }
        .jb-co-check { font-size: 11px; color: #667eea; font-weight: 700; }
        .jb-feed { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; }
        .jb-feed::-webkit-scrollbar { width: 6px; }
        .jb-feed::-webkit-scrollbar-track { background: transparent; }
        .jb-feed::-webkit-scrollbar-thumb { background: #d0d0e0; border-radius: 6px; }
        .jb-no-selection { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 60px 20px; }
        .jb-no-sel-icon { font-size: 52px; margin-bottom: 18px; opacity: 0.7; }
        .jb-no-selection h3 { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 10px; }
        .jb-no-selection p  { font-size: 14.5px; color: #9090b0; max-width: 340px; line-height: 1.6; margin-bottom: 24px; }
        .jb-cta-btn { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; border-radius: 10px; padding: 11px 24px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 16px rgba(102,126,234,0.35); transition: opacity 0.2s, transform 0.15s; }
        .jb-cta-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .jb-loading { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: #b0b0c8; font-size: 13px; }
        .jb-refreshing { display: flex; align-items: center; gap: 10px; padding: 8px 14px; margin-bottom: 12px; background: rgba(102,126,234,0.07); border: 1px solid rgba(102,126,234,0.15); border-radius: 10px; color: #667eea; font-size: 12.5px; font-weight: 600; flex-shrink: 0; }
        .jb-saved-toggle { display: flex; align-items: center; gap: 5px; padding: 5px 14px; border: 1.5px solid #e0e0ea; border-radius: 20px; background: #fff; font-size: 13px; font-weight: 700; color: #7878a0; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .jb-saved-toggle:hover { border-color: #f4b942; color: #f4b942; background: rgba(244,185,66,0.06); }
        .jb-saved-toggle.active { border-color: #f4b942; background: rgba(244,185,66,0.1); color: #d4920a; box-shadow: 0 2px 8px rgba(244,185,66,0.2); }
        .jb-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 18px; align-content: start; }
        .jb-card { background: #fff; border: 1px solid #e8e8f0; border-radius: 16px; padding: 22px 22px 18px; display: flex; flex-direction: column; gap: 12px; transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s; }
        .jb-card:hover { box-shadow: 0 8px 30px rgba(102,126,234,0.12); border-color: rgba(102,126,234,0.3); transform: translateY(-2px); }
        .jb-card-top   { display: flex; align-items: center; gap: 12px; }
        .jb-card-logo  { width: 40px; height: 40px; border-radius: 10px; color: #fff; font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .jb-card-meta    { flex: 1; }
        .jb-card-company { font-size: 13px; font-weight: 700; color: #667eea; }
        .jb-card-posted  { font-size: 11.5px; color: #b0b0c8; margin-top: 2px; }
        .jb-card-badges  { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
        .jb-badge        { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; }
        .jb-badge-remote { background: rgba(34,197,94,0.1);  color: #16a34a; }
        .jb-badge-exp    { background: rgba(251,191,36,0.12); color: #b45309; }
        .jb-badge-type   { background: rgba(102,126,234,0.1); color: #667eea; }
        .jb-badge-new    { background: rgba(239,68,68,0.12);  color: #dc2626; animation: jb-pulse 1.6s ease-in-out infinite; }
        .jb-badge-saved  { background: rgba(34,197,94,0.12);  color: #16a34a; }
        .jb-badge-disc   { background: rgba(156,163,175,0.18); color: #9ca3af; }
        @keyframes jb-pulse { 0%,100% { opacity:1 } 50% { opacity:0.55 } }
        .jb-card-title    { font-size: 16.5px; font-weight: 800; color: #1a1a2e; margin: 0; line-height: 1.3; }
        .jb-card-location { font-size: 13px; color: #7070a0; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .jb-loc-icon { font-size: 12px; }
        .jb-salary   { color: #22c55e; font-weight: 700; }
        .jb-card-desc { font-size: 13.5px; color: #6868a0; line-height: 1.65; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .jb-card-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .jb-tag { background: #f0f0fa; color: #6868a0; font-size: 11.5px; font-weight: 600; padding: 3px 10px; border-radius: 6px; border: 1px solid #e4e4f0; }
        .jb-card-actions { display: flex; gap: 8px; margin-top: 4px; flex-wrap: wrap; align-items: center; }
        .jb-btn-apply  { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; border-radius: 8px; padding: 8px 18px; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 10px rgba(102,126,234,0.3); transition: opacity 0.15s, transform 0.15s; }
        .jb-btn-apply:hover { opacity: 0.9; transform: translateY(-1px); }
        .jb-btn-save   { background: #f5f5fc; color: #667eea; border: 1.5px solid rgba(102,126,234,0.25); border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s, border-color 0.15s; }
        .jb-btn-save:hover  { background: rgba(102,126,234,0.1); border-color: #667eea; }
        .jb-btn-save.active { background: rgba(34,197,94,0.1); color: #16a34a; border-color: #16a34a; }
        .jb-btn-discard { background: #f5f5fc; color: #9ca3af; border: 1.5px solid #e8e8f0; border-radius: 8px; padding: 8px 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.15s, color 0.15s; line-height: 1; }
        .jb-btn-discard:hover  { background: rgba(239,68,68,0.08); color: #ef4444; border-color: #fca5a5; }
        .jb-btn-discard.active { background: rgba(156,163,175,0.15); color: #6b7280; border-color: #d1d5db; }
        .jb-btn-resume { background: #f5f5fc; color: #7070a0; border: 1.5px solid #e8e8f0; border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s; margin-left: auto; }
        .jb-btn-resume:hover { background: rgba(102,126,234,0.07); }
        .jb-card-discarded { opacity: 0.45; }
        .jb-btn-resume:hover { background: #eeeef8; color: #1a1a2e; }
        .jb-load-more { grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 32px 0 8px; color: #b0b0c8; font-size: 13px; }
        .jb-load-dots { display: flex; gap: 6px; }
        .jb-load-dots span { width: 8px; height: 8px; border-radius: 50%; background: #d0d0e0; animation: jbPulse 1.4s ease-in-out infinite; }
        .jb-load-dots span:nth-child(2) { animation-delay: 0.2s; }
        .jb-load-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes jbPulse { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); } 40% { opacity: 1; transform: scale(1); } }
        @media (max-width: 900px) { .jb-sidebar { width: 200px; min-width: 180px; } .jb-cards { grid-template-columns: 1fr; } }

        @media (max-width: 640px) { .jb-body { flex-direction: column; overflow: auto; } .jb-sidebar { width: 100%; max-width: 100%; height: 200px; border-right: none; border-bottom: 1px solid #e8e8f0; } .jb-feed { overflow-y: auto; } .jb-topbar { padding: 12px 16px; } }
      `}</style>
    </div>
  )
}