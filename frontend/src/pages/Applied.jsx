import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSelector } from 'react-redux'
import api from '../services/api'

// ── Constants ─────────────────────────────────────────────────────────────────

// ── FilterDropdown ────────────────────────────────────────────────────────────
function FilterDropdown({ options, value, onChange, placeholder, accentColor = '#d97706' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div className="fdd-wrap" ref={ref}>
      <button
        className={`fdd-btn${open ? ' open' : ''}${value ? ' fdd-active' : ''}`}
        style={value ? { borderColor: accentColor, color: accentColor } : {}}
        onClick={() => setOpen(o => !o)}
      >
        <span className="fdd-val">{value || placeholder}</span>
        <span className="fdd-arrow">▾</span>
      </button>
      {open && (
        <div className="fdd-list" style={{ '--fdd-accent': accentColor }}>
          <div className="fdd-item fdd-item--all" onClick={() => { onChange(''); setOpen(false) }}>All</div>
          <div className="fdd-options">
            {options.map(opt => (
              <div key={opt}
                className={`fdd-item${value === opt ? ' fdd-selected' : ''}`}
                onClick={() => { onChange(opt); setOpen(false) }}>
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
const TEMPLATES = ['FT Template', 'Java Template', 'Data Template']

const COLOR_PALETTE = [
  '#4285F4', '#0866FF', '#FF9900', '#00A4EF', '#635BFF',
  '#6B8E6B', '#003087', '#E50914', '#1DB954', '#E8222E',
  '#D52B1E', '#F26724', '#7B42BC', '#632CA6', '#667eea',
  '#f59e0b', '#22c55e', '#06b6d4', '#ef4444', '#111111',
]

const STATUS_META = {
  applied:               { label: 'Applied',               color: '#667eea', bg: 'rgba(102,126,234,0.1)'  },
  shortlisted:           { label: 'Shortlisted',           color: '#06b6d4', bg: 'rgba(6,182,212,0.1)'    },
  assessment:            { label: 'Assessment',            color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'   },
  interview_in_progress: { label: 'Interview in Progress', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)'   },
  rtr:                   { label: 'RTR',                   color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)'   },
  submitted:             { label: 'Submitted',             color: '#6366f1', bg: 'rgba(99,102,241,0.1)'   },
  interviewed:           { label: 'Interviewed',           color: '#22c55e', bg: 'rgba(34,197,94,0.1)'    },
  rejected:              { label: 'Rejected',              color: '#ef4444', bg: 'rgba(239,68,68,0.1)'    },
}

const EMPTY_FORM = {
  job_title: '', version_id: '', template_name: '', exp_json: '', notes: '', status: 'applied',
  job_type: 'full_time',
  vendor_company: '', vendor_name: '', vendor_email: '', vendor_phone: '', location: '',
  impl_partner: '', end_client: '',
}

const AN_PRESETS = [
  { key: 'all',    label: 'All Time' },
  { key: '7d',     label: 'Last 7 Days' },
  { key: '30d',    label: 'Last 30 Days' },
  { key: '90d',    label: 'Last 90 Days' },
  { key: 'year',   label: 'This Year' },
  { key: 'custom', label: 'Custom Range' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name) {
  return (name || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function buildResumeJson(app) {
  let base = {}
  if (app.exp_json) { try { base = JSON.parse(app.exp_json) } catch { /* non-fatal */ } }
  const v = app.version_snapshot
  if (v) {
    if ((v.projects  || []).length)  base.PROJECTS              = v.projects
    if (v.education)                 base.EDUCATION             = v.education
    if (v.cgpa)                      base.CGPA                  = v.cgpa
    if (v.edu_timeline)              base.EDU_TIMELINE          = v.edu_timeline
    if (v.resume_title)              base.RESUME_TITLE          = v.resume_title
    if (v.resume_name_displayed)     base.RESUME_NAME_DISPLAYED = v.resume_name_displayed
    if (v.user_location)             base.USER_LOCATION         = v.user_location
    if (v.user_email)                base.USER_EMAIL            = v.user_email
    if (v.github)                    base.GITHUB                = v.github
    if (v.linkedin)                  base.LINKEDIN              = v.linkedin
    if (v.phone_number)              base.PHONE_NUMBER          = v.phone_number
    if (v.leetcode)                  base.LEETCODE              = v.leetcode
    if ((v.skills || []).length)     base.SKILLS                = v.skills
    const combined = [...(v.hobbies || []), ...(v.achievements || [])]
    if (combined.length)             base.HOBBIES               = combined
  }
  return base
}

function fmtDate(isoStr) {
  if (!isoStr) return ''
  return new Date(isoStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'America/New_York',
  }) + ' ET'
}

// ── DonutChart ────────────────────────────────────────────────────────────────
function DonutChart({ segments, size = 120, thickness = 20, centerLabel, centerSub }) {
  const r = (size - thickness) / 2
  const cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  const total = segments.reduce((s, g) => s + g.value, 0)
  let cum = 0
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f0f8" strokeWidth={thickness} />
        {total > 0 && segments.filter(s => s.value > 0).map((seg, i) => {
          const len = (seg.value / total) * circ
          const off = -(cum / total) * circ
          cum += seg.value
          return <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth={thickness}
            strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={off} />
        })}
      </svg>
      {centerLabel !== undefined && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <span style={{ fontSize: Math.round(size * 0.2), fontWeight: 800, color: '#1a1a2e', lineHeight: 1 }}>{centerLabel}</span>
          {centerSub && <span style={{ fontSize: Math.round(size * 0.11), color: '#9090b0', marginTop: 2 }}>{centerSub}</span>}
        </div>
      )}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Applied() {
  const { user, token } = useSelector(s => s.auth)

  // Data
  const [applications,  setApplications]  = useState([])
  const [versions,      setVersions]      = useState([])
  const [companies,     setCompanies]     = useState([])
  const [loading,       setLoading]       = useState(true)

  // View toggle
  const [activeTab, setActiveTab] = useState('applications') // 'applications' | 'analytics'

  // Analytics date filter
  const [anPreset,          setAnPreset]          = useState('all')
  const [anDateFrom,        setAnDateFrom]        = useState('')
  const [anDateTo,          setAnDateTo]          = useState('')
  const [coTooltip,         setCoTooltip]         = useState(null) // { id, x, y }
  const [anFilterType,       setAnFilterType]       = useState('')
  const [anFilterVendorCo,   setAnFilterVendorCo]   = useState('')
  const [anFilterVendorName, setAnFilterVendorName] = useState('')
  const [anFilterVendorEmail,setAnFilterVendorEmail]= useState('')
  const [anFilterImplPart,   setAnFilterImplPart]   = useState('')
  const [anFilterEndClient,  setAnFilterEndClient]  = useState('')
  const [anFilterLocation,   setAnFilterLocation]   = useState('')
  const clearAnFilters = () => {
    setAnFilterType(''); setAnFilterVendorCo(''); setAnFilterVendorName('')
    setAnFilterVendorEmail(''); setAnFilterImplPart(''); setAnFilterEndClient(''); setAnFilterLocation('')
  }
  const activeAnFilters = [anFilterType, anFilterVendorCo, anFilterVendorName, anFilterVendorEmail, anFilterImplPart, anFilterEndClient, anFilterLocation].filter(Boolean).length

  // UI — application form
  const [selectedCompany,     setSelectedCompany]     = useState(null)
  const [companySearch,       setCompanySearch]       = useState('')
  const [showForm,            setShowForm]            = useState(false)
  const [form,                setForm]                = useState(EMPTY_FORM)
  const [saving,              setSaving]              = useState(false)
  const [error,               setError]               = useState('')
  const [deletingId,          setDeletingId]          = useState(null)
  const [downloadingResumeId, setDownloadingResumeId] = useState(null)

  // UI — add company
  const [showAddCompany,  setShowAddCompany]  = useState(false)
  const [newCoName,       setNewCoName]       = useState('')
  const [newCoColor,      setNewCoColor]      = useState(COLOR_PALETTE[0])
  const [addingCompany,   setAddingCompany]   = useState(false)

  // UI — delete company confirmation
  const [confirmDeleteCo, setConfirmDeleteCo] = useState(null)
  const [deletingCompany, setDeletingCompany] = useState(false)

  // Filters
  const [filterStatus,      setFilterStatus]      = useState('')
  const [filterDateFrom,    setFilterDateFrom]    = useState('')
  const [filterDateTo,      setFilterDateTo]      = useState('')
  const [sortOrder,         setSortOrder]         = useState('newest')
  const [filterType,        setFilterType]        = useState('')
  const [filterVendorCo,    setFilterVendorCo]    = useState('')
  const [filterImplPartner, setFilterImplPartner] = useState('')
  const [filterEndClient,   setFilterEndClient]   = useState('')

  const clearFilters = () => {
    setFilterStatus(''); setFilterDateFrom(''); setFilterDateTo(''); setSortOrder('newest')
    setFilterType(''); setFilterVendorCo(''); setFilterImplPartner(''); setFilterEndClient('')
  }
  const activeFilters = [filterStatus, filterDateFrom, filterDateTo, filterType, filterVendorCo, filterImplPartner, filterEndClient].filter(Boolean).length

  const handleAnPreset = (preset) => {
    setAnPreset(preset)
    if (preset === 'all') {
      setAnDateFrom(''); setAnDateTo('')
    } else if (preset !== 'custom') {
      const now  = new Date()
      const days = preset === '7d' ? 6 : preset === '30d' ? 29 : 89
      const from = preset === 'year'
        ? `${now.getFullYear()}-01-01`
        : new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
      setAnDateFrom(from)
      setAnDateTo(now.toISOString().slice(0, 10))
    }
  }

  // Computed
  const companyMap = useMemo(
    () => Object.fromEntries(companies.map(c => [c.id, c])),
    [companies]
  )
  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  )
  const contractApps = useMemo(() => applications.filter(a => a.job_type === 'contract'), [applications])
  const uniqueVendorCos    = useMemo(() => [...new Set(contractApps.map(a => a.vendor_company).filter(Boolean))].sort(), [contractApps])
  const uniqueImplPartners = useMemo(() => [...new Set(contractApps.map(a => a.impl_partner).filter(Boolean))].sort(), [contractApps])
  const uniqueEndClients   = useMemo(() => [...new Set(contractApps.map(a => a.end_client).filter(Boolean))].sort(), [contractApps])
  const uniqueVendorNames  = useMemo(() => [...new Set(contractApps.map(a => a.vendor_name).filter(Boolean))].sort(), [contractApps])
  const uniqueVendorEmails = useMemo(() => [...new Set(contractApps.map(a => a.vendor_email).filter(Boolean))].sort(), [contractApps])
  const uniqueLocations    = useMemo(() => [...new Set(contractApps.map(a => a.location).filter(Boolean))].sort(), [contractApps])
  const displayed = useMemo(() => {
    // Treat applied_at as UTC (backend stores datetime.utcnow() without 'Z')
    const toUTC = ts => ts ? new Date(ts.includes('Z') || ts.includes('+') ? ts : ts + 'Z') : null
    let list = selectedCompany
      ? applications.filter(a => a.company_id === selectedCompany.id)
      : applications
    if (filterStatus) list = list.filter(a => a.status === filterStatus)
    if (filterType) list = list.filter(a => (a.job_type || 'full_time') === filterType)
    if (filterVendorCo)    list = list.filter(a => (a.vendor_company || '').toLowerCase().includes(filterVendorCo.toLowerCase()))
    if (filterImplPartner) list = list.filter(a => (a.impl_partner || '').toLowerCase().includes(filterImplPartner.toLowerCase()))
    if (filterEndClient)   list = list.filter(a => (a.end_client || '').toLowerCase().includes(filterEndClient.toLowerCase()))
    if (filterDateFrom) {
      const from = new Date(filterDateFrom + 'T00:00:00.000Z')
      list = list.filter(a => { const t = toUTC(a.applied_at); return t && t >= from })
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo + 'T23:59:59.999Z')
      list = list.filter(a => { const t = toUTC(a.applied_at); return t && t <= to })
    }
    return [...list].sort((a, b) => {
      const da = toUTC(a.applied_at) || new Date(0)
      const db = toUTC(b.applied_at) || new Date(0)
      return sortOrder === 'newest' ? db - da : da - db
    })
  }, [applications, selectedCompany, filterStatus, filterType, filterVendorCo, filterImplPartner, filterEndClient, filterDateFrom, filterDateTo, sortOrder])

  // ── Analytics ─────────────────────────────────────────────────────────────
  const analytics = useMemo(() => {
    const toUTC = ts => ts ? new Date(ts.includes('Z') || ts.includes('+') ? ts : ts + 'Z') : null
    let base = selectedCompany
      ? applications.filter(a => a.company_id === selectedCompany.id)
      : applications
    const totalAll = base.length
    if (anDateFrom) {
      const from = new Date(anDateFrom + 'T00:00:00.000Z')
      base = base.filter(a => { const t = toUTC(a.applied_at); return t && t >= from })
    }
    if (anDateTo) {
      const to = new Date(anDateTo + 'T23:59:59.999Z')
      base = base.filter(a => { const t = toUTC(a.applied_at); return t && t <= to })
    }
    if (anFilterType)       base = base.filter(a => (a.job_type || 'full_time') === anFilterType)
    if (anFilterVendorCo)   base = base.filter(a => a.vendor_company === anFilterVendorCo)
    if (anFilterVendorName) base = base.filter(a => a.vendor_name    === anFilterVendorName)
    if (anFilterVendorEmail)base = base.filter(a => a.vendor_email   === anFilterVendorEmail)
    if (anFilterImplPart)   base = base.filter(a => a.impl_partner   === anFilterImplPart)
    if (anFilterEndClient)  base = base.filter(a => a.end_client     === anFilterEndClient)
    if (anFilterLocation)   base = base.filter(a => a.location       === anFilterLocation)
    const total = base.length
    const statusCounts = {}
    Object.keys(STATUS_META).forEach(k => { statusCounts[k] = 0 })
    base.forEach(a => { if (a.status in statusCounts) statusCounts[a.status]++ })
    const coMap = {}
    const coStatusMap = {}
    base.forEach(a => {
      coMap[a.company_id] = (coMap[a.company_id] || 0) + 1
      if (!coStatusMap[a.company_id]) coStatusMap[a.company_id] = {}
      coStatusMap[a.company_id][a.status] = (coStatusMap[a.company_id][a.status] || 0) + 1
    })
    const topCompanies = Object.entries(coMap)
      .map(([id, count]) => ({ id: Number(id), count, co: companyMap[Number(id)], statusCounts: coStatusMap[Number(id)] || {} }))
      .filter(x => x.co)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    const dailyCounts = {}
    base.forEach(a => {
      const t = toUTC(a.applied_at)
      if (!t) return
      const date = t.toISOString().slice(0, 10)
      dailyCounts[date] = (dailyCounts[date] || 0) + 1
    })
    const days = Object.entries(dailyCounts).sort(([a], [b]) => a.localeCompare(b))
    const activeCount  = total - (statusCounts.rejected || 0)
    const rejRate      = total > 0 ? Math.round((statusCounts.rejected || 0) / total * 100) : 0
    const progressed   = ['shortlisted', 'assessment', 'interview_in_progress', 'rtr', 'submitted', 'interviewed']
      .reduce((s, k) => s + (statusCounts[k] || 0), 0)
    const fullTimeCount = base.filter(a => (a.job_type || 'full_time') === 'full_time').length
    const contractCount = base.filter(a => a.job_type === 'contract').length
    const vendorMap = {}, implPartnerMap = {}, endClientMap = {}, vendorNameMap = {}, vendorEmailMap = {}, locationMap = {}
    base.filter(a => a.job_type === 'contract').forEach(a => {
      if (a.vendor_company) vendorMap[a.vendor_company]       = (vendorMap[a.vendor_company] || 0) + 1
      if (a.impl_partner)   implPartnerMap[a.impl_partner]   = (implPartnerMap[a.impl_partner] || 0) + 1
      if (a.end_client)     endClientMap[a.end_client]       = (endClientMap[a.end_client] || 0) + 1
      if (a.vendor_name)    vendorNameMap[a.vendor_name]     = (vendorNameMap[a.vendor_name] || 0) + 1
      if (a.vendor_email)   vendorEmailMap[a.vendor_email]   = (vendorEmailMap[a.vendor_email] || 0) + 1
      if (a.location)       locationMap[a.location]           = (locationMap[a.location] || 0) + 1
    })
    const topVendors      = Object.entries(vendorMap).sort(([,a],[,b])=>b-a).slice(0,5).map(([name,count])=>({name,count}))
    const topImplPartners = Object.entries(implPartnerMap).sort(([,a],[,b])=>b-a).slice(0,5).map(([name,count])=>({name,count}))
    const topEndClients   = Object.entries(endClientMap).sort(([,a],[,b])=>b-a).slice(0,5).map(([name,count])=>({name,count}))
    const topVendorNames  = Object.entries(vendorNameMap).sort(([,a],[,b])=>b-a).slice(0,5).map(([name,count])=>({name,count}))
    const topVendorEmails = Object.entries(vendorEmailMap).sort(([,a],[,b])=>b-a).slice(0,5).map(([name,count])=>({name,count}))
    const topLocations    = Object.entries(locationMap).sort(([,a],[,b])=>b-a).slice(0,5).map(([name,count])=>({name,count}))
    return { total, totalAll, statusCounts, topCompanies, days, activeCount, rejRate, progressed, fullTimeCount, contractCount, topVendors, topImplPartners, topEndClients, topVendorNames, topVendorEmails, topLocations }
  }, [applications, selectedCompany, companyMap, anDateFrom, anDateTo, anFilterType, anFilterVendorCo, anFilterVendorName, anFilterVendorEmail, anFilterImplPart, anFilterEndClient, anFilterLocation])

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [apps, vers, cos] = await Promise.all([
        api.getAppliedJobs(token),
        api.getVersions(token),
        api.getUserCompanies(token),
      ])
      setApplications(apps)
      setVersions(vers)
      setCompanies(cos)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Company management ─────────────────────────────────────────────────────
  const handleAddCompany = async () => {
    if (!newCoName.trim()) return
    setAddingCompany(true)
    try {
      const created = await api.createUserCompany(token, { name: newCoName.trim(), color: newCoColor })
      setCompanies(prev => [...prev, created])
      setNewCoName(''); setNewCoColor(COLOR_PALETTE[0]); setShowAddCompany(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setAddingCompany(false)
    }
  }

  const promptDeleteCompany = (co) => {
    const appCount = applications.filter(a => a.company_id === co.id).length
    setConfirmDeleteCo({ id: co.id, name: co.name, appCount })
  }

  const handleDeleteCompany = async () => {
    if (!confirmDeleteCo) return
    setDeletingCompany(true)
    try {
      await api.deleteUserCompany(token, confirmDeleteCo.id)
      setCompanies(prev => prev.filter(c => c.id !== confirmDeleteCo.id))
      setApplications(prev => prev.filter(a => a.company_id !== confirmDeleteCo.id))
      if (selectedCompany?.id === confirmDeleteCo.id) { setSelectedCompany(null); setShowForm(false) }
      setConfirmDeleteCo(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setDeletingCompany(false)
    }
  }

  // ── Application management ─────────────────────────────────────────────────
  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const openForm  = () => { setForm(EMPTY_FORM); setError(''); setShowForm(true) }
  const closeForm = () => setShowForm(false)

  const handleSave = async () => {
    if (!form.job_title.trim()) { setError('Job title is required'); return }
    if (!selectedCompany)       { setError('Select a company first'); return }
    setSaving(true); setError('')
    try {
      const ver = versions.find(v => String(v.id) === String(form.version_id))
      const payload = {
        company_id:    selectedCompany.id,
        company_name:  selectedCompany.name,
        job_title:     form.job_title.trim(),
        version_id:    ver ? ver.id : null,
        template_name: form.template_name || null,
        exp_json:      form.exp_json.trim() || null,
        notes:         form.notes.trim() || null,
        status:        form.status || 'applied',
        job_type:      form.job_type || 'full_time',
        vendor_company: form.job_type === 'contract' ? (form.vendor_company.trim() || null) : null,
        vendor_name:    form.job_type === 'contract' ? (form.vendor_name.trim() || null) : null,
        vendor_email:   form.job_type === 'contract' ? (form.vendor_email.trim() || null) : null,
        vendor_phone:   form.job_type === 'contract' ? (form.vendor_phone.trim() || null) : null,
        location:       form.job_type === 'contract' ? (form.location.trim() || null) : null,
        impl_partner:   form.job_type === 'contract' ? (form.impl_partner.trim() || null) : null,
        end_client:     form.job_type === 'contract' ? (form.end_client.trim() || null) : null,
      }
      const created = await api.createAppliedJob(token, payload)
      setApplications(prev => [created, ...prev])
      closeForm()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteApp = async (id) => {
    setDeletingId(id)
    try {
      await api.deleteAppliedJob(token, id)
      setApplications(prev => prev.filter(a => a.id !== id))
    } catch (e) {
      setError(e.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleGetResume = async (app) => {
    if (!app.exp_json && !app.version_snapshot) { setError('No data to generate resume from'); return }
    setDownloadingResumeId(app.id)
    try {
      const blob = await api.generateResume(token, buildResumeJson(app), app.template_name || 'template1')
      const url  = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href  = url
      link.download = `${app.company_name}_${app.job_title}`.replace(/[^a-z0-9]/gi, '_') + '.docx'
      document.body.appendChild(link); link.click()
      document.body.removeChild(link); window.URL.revokeObjectURL(url)
    } catch (e) {
      setError(e.message)
    } finally {
      setDownloadingResumeId(null)
    }
  }

  const handleStatusChange = async (id, status) => {
    try {
      const updated = await api.updateAppliedJob(token, id, { status })
      setApplications(prev => prev.map(a => a.id === id ? updated : a))
    } catch (e) {
      setError(e.message)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="ap-root">

      {/* DELETE COMPANY CONFIRMATION MODAL */}
      {confirmDeleteCo && (
        <div className="ap-overlay" onClick={() => !deletingCompany && setConfirmDeleteCo(null)}>
          <div className="ap-modal" onClick={e => e.stopPropagation()}>
            <div className="ap-modal-icon">🗑️</div>
            <h3 className="ap-modal-title">Delete "{confirmDeleteCo.name}"?</h3>
            <p className="ap-modal-body">
              This will permanently delete this company
              {confirmDeleteCo.appCount > 0 && (
                <> and <strong>{confirmDeleteCo.appCount} application{confirmDeleteCo.appCount > 1 ? 's' : ''}</strong> associated with it</>
              )}.
              {' '}This cannot be undone.
            </p>
            <div className="ap-modal-actions">
              <button className="ap-modal-del-btn" disabled={deletingCompany} onClick={handleDeleteCompany}>
                {deletingCompany ? 'Deleting…' : 'Yes, Delete'}
              </button>
              <button className="ap-modal-cancel-btn" disabled={deletingCompany} onClick={() => setConfirmDeleteCo(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div className="ap-topbar">
        <div className="ap-topbar-left">
          <h1 className="ap-page-title">Applied Jobs</h1>
          <span className="ap-count-badge">
            {activeFilters > 0 && activeTab === 'applications'
              ? `${displayed.length} / ${applications.length}`
              : `${analytics.total} total`}
          </span>
          {selectedCompany && (
            <span className="ap-co-pill" style={{ background: selectedCompany.color }}>
              {selectedCompany.name}
              <button className="ap-pill-x" onClick={() => setSelectedCompany(null)}>✕</button>
            </span>
          )}
        </div>
        <div className="ap-tab-toggle">
          <button className={`ap-tab-btn${activeTab === 'applications' ? ' active' : ''}`}
            onClick={() => setActiveTab('applications')}>Applications</button>
          <button className={`ap-tab-btn${activeTab === 'analytics' ? ' active' : ''}`}
            onClick={() => { setActiveTab('analytics'); setShowForm(false) }}>Analytics</button>
        </div>
        {activeTab === 'applications' && selectedCompany && (
          <button className="ap-add-app-btn" onClick={openForm}>+ Add Application</button>
        )}
      </div>

      {/* BODY */}
      <div className="ap-body">

        {/* SIDEBAR */}
        <aside className="ap-sidebar">
          <div className="ap-sidebar-head">
            <span className="ap-sidebar-title">Companies</span>
            <button className="ap-text-btn" onClick={() => setSelectedCompany(null)}>All</button>
          </div>
          <div className="ap-co-search-wrap">
            <input className="ap-co-search" placeholder="Search companies…"
              value={companySearch} onChange={e => setCompanySearch(e.target.value)} />
          </div>
          <div className="ap-co-list">
            <button className={`ap-co-row${!selectedCompany ? ' active' : ''}`} onClick={() => setSelectedCompany(null)}>
              <span className="ap-co-logo" style={{ background: '#667eea' }}>All</span>
              <span className="ap-co-name-wrap">
                <span className="ap-co-name">All Companies</span>
                <span className="ap-co-count">{applications.length} apps</span>
              </span>
            </button>
            {filteredCompanies.map(c => {
              const count = applications.filter(a => a.company_id === c.id).length
              const sel   = selectedCompany?.id === c.id
              return (
                <div key={c.id} className={`ap-co-row-wrap${sel ? ' active' : ''}`}>
                  <button className={`ap-co-row${sel ? ' active' : ''}`}
                    onClick={() => { setSelectedCompany(c); setShowForm(false) }}>
                    <span className="ap-co-logo" style={{ background: c.color }}>{getInitials(c.name)}</span>
                    <span className="ap-co-name-wrap">
                      <span className="ap-co-name">{c.name}</span>
                      {count > 0 && <span className="ap-co-count">{count} app{count > 1 ? 's' : ''}</span>}
                    </span>
                    {sel && <span className="ap-co-check">✓</span>}
                  </button>
                  <button className="ap-co-del" title={`Delete ${c.name}`}
                    onClick={e => { e.stopPropagation(); promptDeleteCompany(c) }}>✕</button>
                </div>
              )
            })}
            {companies.length === 0 && !loading && (
              <p className="ap-co-empty">No companies yet.<br />Add one below.</p>
            )}
          </div>
          <div className="ap-add-co-wrap">
            {showAddCompany ? (
              <div className="ap-add-co-form">
                <input className="ap-add-co-input" placeholder="Company name…" value={newCoName}
                  autoFocus onChange={e => setNewCoName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddCompany() }} />
                <div className="ap-palette">
                  {COLOR_PALETTE.map(col => (
                    <button key={col} className={`ap-swatch${newCoColor === col ? ' picked' : ''}`}
                      style={{ background: col }} onClick={() => setNewCoColor(col)} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="ap-add-co-save" disabled={addingCompany || !newCoName.trim()} onClick={handleAddCompany}>
                    {addingCompany ? '…' : 'Add'}
                  </button>
                  <button className="ap-add-co-cancel" onClick={() => { setShowAddCompany(false); setNewCoName('') }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button className="ap-add-co-btn" onClick={() => setShowAddCompany(true)}>+ Add Company</button>
            )}
          </div>
        </aside>

        {/* MAIN */}
        <main className="ap-main">
          {error && (
            <div className="ap-error">{error}
              <button className="ap-error-x" onClick={() => setError('')}>✕</button>
            </div>
          )}

          {activeTab === 'applications' && showForm && selectedCompany && (
            <div className="ap-form-card">
              <div className="ap-form-head">
                <span className="ap-co-logo" style={{ background: selectedCompany.color, width: 32, height: 32, fontSize: 11 }}>
                  {getInitials(selectedCompany.name)}
                </span>
                <h3 className="ap-form-title">New Application — {selectedCompany.name}</h3>
                <button className="ap-form-close" onClick={closeForm}>✕</button>
              </div>
              <div className="ap-form-grid">
                <div className="ap-field ap-field--full">
                  <label className="ap-label">Job Title <span className="ap-req">*</span></label>
                  <input className="ap-input" placeholder="e.g. Software Engineer, L4"
                    value={form.job_title} onChange={e => setField('job_title', e.target.value)} />
                </div>
                <div className="ap-field">
                  <label className="ap-label">Version Used</label>
                  <select className="ap-select" value={form.version_id} onChange={e => setField('version_id', e.target.value)}>
                    <option value="">— None —</option>
                    {versions.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                  <p className="ap-hint">Full version data snapshotted at save time.</p>
                </div>
                <div className="ap-field">
                  <label className="ap-label">Template Used</label>
                  <select className="ap-select" value={form.template_name} onChange={e => setField('template_name', e.target.value)}>
                    <option value="">— None —</option>
                    {TEMPLATES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="ap-field">
                  <label className="ap-label">Status</label>
                  <select className="ap-select" value={form.status} onChange={e => setField('status', e.target.value)}>
                    {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="ap-field">
                  <label className="ap-label">Type</label>
                  <select className="ap-select" value={form.job_type} onChange={e => setField('job_type', e.target.value)}>
                    <option value="full_time">Full Time</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>
                {form.job_type === 'contract' && (
                  <>
                    <div className="ap-field ap-field--full ap-vendor-divider">
                      <span className="ap-vendor-label">Vendor / Staffing Details</span>
                    </div>
                    <div className="ap-field">
                      <label className="ap-label">Vendor Company</label>
                      <input className="ap-input" placeholder="e.g. Infosys, TCS…"
                        value={form.vendor_company} onChange={e => setField('vendor_company', e.target.value)} />
                    </div>
                    <div className="ap-field">
                      <label className="ap-label">Vendor Contact Name</label>
                      <input className="ap-input" placeholder="Recruiter / account manager"
                        value={form.vendor_name} onChange={e => setField('vendor_name', e.target.value)} />
                    </div>
                    <div className="ap-field">
                      <label className="ap-label">Vendor Email</label>
                      <input className="ap-input" type="email" placeholder="recruiter@vendor.com"
                        value={form.vendor_email} onChange={e => setField('vendor_email', e.target.value)} />
                    </div>
                    <div className="ap-field">
                      <label className="ap-label">Vendor Phone</label>
                      <input className="ap-input" type="tel" placeholder="+1 (555) 000-0000"
                        value={form.vendor_phone} onChange={e => setField('vendor_phone', e.target.value)} />
                    </div>
                    <div className="ap-field">
                      <label className="ap-label">Implementation Partner</label>
                      <input className="ap-input" placeholder="e.g. Accenture, Wipro…"
                        value={form.impl_partner} onChange={e => setField('impl_partner', e.target.value)} />
                    </div>
                    <div className="ap-field">
                      <label className="ap-label">End Client</label>
                      <input className="ap-input" placeholder="e.g. JPMorgan, Google…"
                        value={form.end_client} onChange={e => setField('end_client', e.target.value)} />
                    </div>
                    <div className="ap-field">
                      <label className="ap-label">Location</label>
                      <input className="ap-input" placeholder="City, State or Remote"
                        value={form.location} onChange={e => setField('location', e.target.value)} />
                    </div>
                  </>
                )}
                <div className="ap-field ap-field--full">
                  <label className="ap-label">Experience JSON</label>
                  <textarea className="ap-textarea" rows={6} placeholder="Paste the experience JSON used for this application…"
                    value={form.exp_json} onChange={e => setField('exp_json', e.target.value)} />
                </div>
                <div className="ap-field ap-field--full">
                  <label className="ap-label">Notes</label>
                  <textarea className="ap-textarea" rows={3} placeholder="Referral, recruiter name, portal link…"
                    value={form.notes} onChange={e => setField('notes', e.target.value)} />
                </div>
              </div>
              {error && <p className="ap-form-err">{error}</p>}
              <div className="ap-form-actions">
                <button className="ap-btn-save" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Application'}
                </button>
                <button className="ap-btn-cancel" onClick={closeForm}>Cancel</button>
              </div>
            </div>
          )}

          {loading && (
            <div className="ap-empty">
              <div className="ap-dots"><span /><span /><span /></div>
              <p>Loading…</p>
            </div>
          )}
          {activeTab === 'applications' && !loading && companies.length === 0 && (
            <div className="ap-empty">
              <div className="ap-empty-icon">🏢</div>
              <h3>Add your first company</h3>
              <p>Click <strong>+ Add Company</strong> in the sidebar to get started.</p>
            </div>
          )}
          {activeTab === 'applications' && !loading && companies.length > 0 && !showForm && !selectedCompany && applications.length === 0 && (
            <div className="ap-empty">
              <div className="ap-empty-icon">📋</div>
              <h3>No applications yet</h3>
              <p>Select a company from the sidebar then click <strong>+ Add Application</strong>.</p>
            </div>
          )}
          {activeTab === 'applications' && !loading && !showForm && selectedCompany && displayed.length === 0 && (
            <div className="ap-empty">
              <div className="ap-empty-icon">📭</div>
              <h3>No applications for {selectedCompany.name}</h3>
              <p>Click <strong>+ Add Application</strong> above to log your first one.</p>
            </div>
          )}

          {/* FILTER BAR */}
          {activeTab === 'applications' && !loading && applications.length > 0 && (
            <div className="ap-filters">
              <select className="ap-filter-sel" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select className="ap-filter-sel" value={filterType} onChange={e => { setFilterType(e.target.value); setFilterVendorCo(''); setFilterImplPartner(''); setFilterEndClient('') }}>
                <option value="">All Types</option>
                <option value="full_time">Full Time</option>
                <option value="contract">Contract</option>
              </select>
              {filterType === 'contract' && (
                <>
                  <FilterDropdown
                    options={uniqueVendorCos} value={filterVendorCo} onChange={setFilterVendorCo}
                    placeholder="Vendor company…" accentColor="#d97706" />
                  <FilterDropdown
                    options={uniqueImplPartners} value={filterImplPartner} onChange={setFilterImplPartner}
                    placeholder="Impl. partner…" accentColor="#7c3aed" />
                  <FilterDropdown
                    options={uniqueEndClients} value={filterEndClient} onChange={setFilterEndClient}
                    placeholder="End client…" accentColor="#0284c7" />
                </>
              )}
              <div className="ap-filter-date-wrap">
                <input type="date" className="ap-filter-date" value={filterDateFrom}
                  onChange={e => setFilterDateFrom(e.target.value)} title="From date" />
                <span className="ap-filter-sep">→</span>
                <input type="date" className="ap-filter-date" value={filterDateTo}
                  onChange={e => setFilterDateTo(e.target.value)} title="To date" />
              </div>
              <select className="ap-filter-sel" value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
              {activeFilters > 0 && (
                <button className="ap-filter-clear" onClick={clearFilters}>✕ Clear ({activeFilters})</button>
              )}
              {activeFilters > 0 && (
                <span className="ap-filter-shown">{displayed.length} shown</span>
              )}
            </div>
          )}

          {activeTab === 'applications' && !loading && displayed.length > 0 && (
            <div className="ap-cards">
              {displayed.map(app => {
                const co = companyMap[app.company_id]
                const sm = STATUS_META[app.status] || STATUS_META.applied
                return (
                  <div key={app.id} className="ap-card">
                    <div className="ap-card-top">
                      <span className="ap-card-logo" style={{ background: co?.color || '#667eea' }}>
                        {co ? getInitials(co.name) : (app.company_name || '?').slice(0, 2).toUpperCase()}
                      </span>
                      <div className="ap-card-meta">
                        <div className="ap-card-co">{app.company_name}</div>
                        <div className="ap-card-time">Applied {fmtDate(app.applied_at)}</div>
                      </div>
                      <div className="ap-card-right">
                        <select className="ap-status-sel"
                          value={app.status || 'applied'}
                          style={{ color: sm.color, background: sm.bg, borderColor: sm.color + '55' }}
                          disabled={downloadingResumeId === app.id}
                          onChange={e => handleStatusChange(app.id, e.target.value)}>
                          {Object.entries(STATUS_META).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                        <button className="ap-del-btn" title="Delete application"
                          disabled={deletingId === app.id} onClick={() => handleDeleteApp(app.id)}>
                          {deletingId === app.id ? '…' : '✕'}
                        </button>
                      </div>
                    </div>
                    <h3 className="ap-card-title">{app.job_title}</h3>
                    <div className="ap-chips">
                      {app.version_name && <span className="ap-chip ap-chip-v">📋 {app.version_name}</span>}
                      {app.template_name && <span className="ap-chip ap-chip-t">🎨 {app.template_name}</span>}
                      {app.job_type === 'contract'
                        ? <span className="ap-chip ap-chip-contract">Contract</span>
                        : <span className="ap-chip ap-chip-fulltime">Full Time</span>}
                      {app.location && <span className="ap-chip ap-chip-loc">📍 {app.location}</span>}
                    </div>
                    {app.job_type === 'contract' && (app.vendor_company || app.vendor_name || app.vendor_email || app.vendor_phone || app.impl_partner || app.end_client) && (
                      <div className="ap-vendor-info">
                        <span className="ap-vendor-header">Vendor</span>
                        {app.vendor_company && <span>{app.vendor_company}</span>}
                        {app.vendor_name    && <span>{app.vendor_name}</span>}
                        {app.vendor_email   && <a href={`mailto:${app.vendor_email}`}>{app.vendor_email}</a>}
                        {app.vendor_phone   && <span>{app.vendor_phone}</span>}
                        {app.impl_partner   && <span className="ap-vendor-subrow"><em>Impl. Partner:</em> {app.impl_partner}</span>}
                        {app.end_client     && <span className="ap-vendor-subrow"><em>End Client:</em> {app.end_client}</span>}
                      </div>
                    )}
                    {app.exp_json && (
                      <details className="ap-exp">
                        <summary className="ap-exp-sum">Experience JSON</summary>
                        <pre className="ap-exp-pre">{app.exp_json}</pre>
                      </details>
                    )}
                    {app.notes && <p className="ap-notes">{app.notes}</p>}
                    {(app.version_snapshot || app.exp_json) && (
                      <div className="ap-card-foot">
                        <button className="ap-resume-btn" disabled={downloadingResumeId === app.id}
                          onClick={() => handleGetResume(app)}>
                          {downloadingResumeId === app.id
                            ? <><span className="ap-spin" /> Generating…</>
                            : <>⬇ Get Resume</>}
                        </button>
                        <span className="ap-resume-hint">
                          {app.template_name || 'template1'}{app.version_snapshot ? ' · snapshot saved' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ANALYTICS VIEW */}
          {activeTab === 'analytics' && !loading && (
            <div className="an-root">

              {/* Date filter bar */}
              <div className="an-filter-bar">
                <div className="an-presets">
                  {AN_PRESETS.map(p => (
                    <button key={p.key}
                      className={`an-preset${anPreset === p.key ? ' active' : ''}`}
                      onClick={() => handleAnPreset(p.key)}>{p.label}</button>
                  ))}
                </div>
                {anPreset === 'custom' && (
                  <div className="an-custom-dates">
                    <input type="date" className="an-date-input" value={anDateFrom}
                      onChange={e => setAnDateFrom(e.target.value)} />
                    <span className="an-date-sep">→</span>
                    <input type="date" className="an-date-input" value={anDateTo}
                      onChange={e => setAnDateTo(e.target.value)} />
                  </div>
                )}
                {anPreset !== 'all' && (
                  <span className="an-filter-count">{analytics.total} / {analytics.totalAll}</span>
                )}
              </div>


              {/* Contract / vendor filter row */}
              <div className="an-filter-bar an-filter-bar--contract">
                <select className="ap-filter-sel" value={anFilterType}
                  onChange={e => { clearAnFilters(); setAnFilterType(e.target.value) }}>
                  <option value="">All Types</option>
                  <option value="full_time">Full Time</option>
                  <option value="contract">Contract</option>
                </select>
                {anFilterType === 'contract' && (
                  <>
                    <FilterDropdown options={uniqueVendorCos}    value={anFilterVendorCo}   onChange={setAnFilterVendorCo}   placeholder="Vendor company…" accentColor="#d97706" />
                    <FilterDropdown options={uniqueVendorNames}  value={anFilterVendorName} onChange={setAnFilterVendorName} placeholder="Vendor name…"    accentColor="#d97706" />
                    <FilterDropdown options={uniqueVendorEmails} value={anFilterVendorEmail} onChange={setAnFilterVendorEmail} placeholder="Vendor email…"   accentColor="#d97706" />
                    <FilterDropdown options={uniqueImplPartners} value={anFilterImplPart}   onChange={setAnFilterImplPart}   placeholder="Impl. partner…"  accentColor="#7c3aed" />
                    <FilterDropdown options={uniqueEndClients}   value={anFilterEndClient}  onChange={setAnFilterEndClient}  placeholder="End client…"     accentColor="#0284c7" />
                    <FilterDropdown options={uniqueLocations}    value={anFilterLocation}   onChange={setAnFilterLocation}   placeholder="Location…"       accentColor="#22c55e" />
                  </>
                )}
                {activeAnFilters > 0 && (
                  <button className="ap-filter-clear" onClick={clearAnFilters}>✕ Clear ({activeAnFilters})</button>
                )}
              </div>
              {analytics.total === 0 ? (
                <div className="ap-empty">
                  <div className="ap-empty-icon">📊</div>
                  <h3>No data yet</h3>
                  <p>Add applications to see analytics here.</p>
                </div>
              ) : (
                <>
                  <div className="an-stats">
                    <div className="an-stat">
                      <div className="an-stat-val">{analytics.total}</div>
                      <div className="an-stat-lbl">Total Applied</div>
                    </div>
                    <div className="an-stat">
                      <div className="an-stat-val" style={{ color: '#22c55e' }}>{analytics.activeCount}</div>
                      <div className="an-stat-lbl">Active</div>
                    </div>
                    <div className="an-stat">
                      <div className="an-stat-val" style={{ color: analytics.rejRate > 50 ? '#ef4444' : '#f59e0b' }}>{analytics.rejRate}%</div>
                      <div className="an-stat-lbl">Rej. Rate</div>
                    </div>
                    <div className="an-stat">
                      <div className="an-stat-val" style={{ color: '#8b5cf6' }}>{analytics.progressed}</div>
                      <div className="an-stat-lbl">Progressed</div>
                    </div>
                    <div className="an-stat">
                      <div className="an-stat-val" style={{ color: '#16a34a' }}>{analytics.fullTimeCount}</div>
                      <div className="an-stat-lbl">Full Time</div>
                    </div>
                    <div className="an-stat">
                      <div className="an-stat-val" style={{ color: '#d97706' }}>{analytics.contractCount}</div>
                      <div className="an-stat-lbl">Contract</div>
                    </div>
                  </div>

                  {/* Status Breakdown donut + Job Type donut — side by side */}
                  <div className="an-row-2col">
                    <div className="an-section">
                      <div className="an-section-title">Status Breakdown</div>
                      <div className="an-donut-wrap">
                        <DonutChart
                          segments={Object.entries(STATUS_META).map(([k, sm]) => ({ color: sm.color, value: analytics.statusCounts[k] || 0 }))}
                          size={130} thickness={22}
                          centerLabel={analytics.total} centerSub="apps"
                        />
                        <div className="an-donut-legend">
                          {Object.entries(STATUS_META).map(([k, sm]) => {
                            const c = analytics.statusCounts[k] || 0
                            if (!c) return null
                            return (
                              <div key={k} className="an-donut-row">
                                <span className="an-dot" style={{ background: sm.color }} />
                                <span className="an-donut-lbl">{sm.label}</span>
                                <span className="an-donut-cnt">{c}</span>
                                <span className="an-donut-pct">{Math.round(c / analytics.total * 100)}%</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="an-section">
                      <div className="an-section-title">Job Type Split</div>
                      <div className="an-type-donut">
                        <DonutChart
                          segments={[
                            { color: '#16a34a', value: analytics.fullTimeCount },
                            { color: '#d97706', value: analytics.contractCount },
                          ]}
                          size={100} thickness={20}
                          centerLabel={analytics.fullTimeCount + analytics.contractCount}
                          centerSub="total"
                        />
                        <div className="an-type-rows">
                          <div className="an-type-row">
                            <span className="an-dot" style={{ background: '#16a34a' }} />
                            <span className="an-type-nm">Full Time</span>
                            <strong className="an-type-cnt">{analytics.fullTimeCount}</strong>
                            <span className="an-donut-pct">{analytics.total ? Math.round(analytics.fullTimeCount / analytics.total * 100) : 0}%</span>
                          </div>
                          <div className="an-type-row">
                            <span className="an-dot" style={{ background: '#d97706' }} />
                            <span className="an-type-nm">Contract</span>
                            <strong className="an-type-cnt">{analytics.contractCount}</strong>
                            <span className="an-donut-pct">{analytics.total ? Math.round(analytics.contractCount / analytics.total * 100) : 0}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Daily Activity — full width bar chart (time series) */}
                  {analytics.days.length > 0 && (
                    <div className="an-section">
                      <div className="an-section-title">Daily Activity</div>
                      <div className="an-timeline">
                        {(() => {
                          const mx = Math.max(...analytics.days.map(([, c]) => c))
                          return analytics.days.map(([date, count]) => {
                            const h = Math.max(4, Math.round((count / mx) * 80))
                            const lbl = new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            return (
                              <div key={date} className="an-day" title={`${lbl}: ${count} app${count > 1 ? 's' : ''}`}>
                                <span className="an-day-n">{count}</span>
                                <div className="an-day-b" style={{ height: h }} />
                                <span className="an-day-l">{lbl}</span>
                              </div>
                            )
                          })
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Top Companies — full width (needs hover tooltip space) */}
                  {!selectedCompany && analytics.topCompanies.length > 0 && (
                    <div className="an-section">
                      <div className="an-section-title">Top Companies</div>
                      <div className="an-co-list">
                        {analytics.topCompanies.map(({ id, count, co, statusCounts: coStat }) => {
                          const pct = analytics.total > 0 ? count / analytics.total * 100 : 0
                          return (
                            <div key={id} className="an-co-row"
                              onMouseEnter={e => {
                                const rect = e.currentTarget.getBoundingClientRect()
                                const x = rect.right + 12 + 230 > window.innerWidth ? rect.left - 238 : rect.right + 12
                                const y = Math.min(rect.top, window.innerHeight - 240)
                                setCoTooltip({ id, x, y })
                              }}
                              onMouseLeave={() => setCoTooltip(null)}>
                              <span className="an-co-logo-sm" style={{ background: co.color }}>{getInitials(co.name)}</span>
                              <span className="an-co-nm">{co.name}</span>
                              <div className="an-bar-track">
                                <div className="an-bar-fill" style={{ width: `${pct > 0 ? Math.max(pct, 0.5) : 0}%`, background: co.color }} />
                              </div>
                              <span className="an-num">{count}</span>
                            </div>
                          )
                        })}
                      </div>
                      {coTooltip && (() => {
                        const tc = analytics.topCompanies.find(x => x.id === coTooltip.id)
                        if (!tc) return null
                        const statRows = Object.entries(STATUS_META).filter(([k]) => (tc.statusCounts[k] || 0) > 0)
                        return (
                          <div className="an-co-tooltip" style={{ left: coTooltip.x, top: coTooltip.y }}>
                            <div className="an-co-tt-head">
                              <span className="an-co-logo-sm" style={{ background: tc.co.color, flexShrink: 0 }}>{getInitials(tc.co.name)}</span>
                              <span className="an-co-tt-name">{tc.co.name}</span>
                              <span className="an-co-tt-total">{tc.count} app{tc.count !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="an-co-tt-div" />
                            <div className="an-co-tt-list">
                              {statRows.map(([k, sm]) => (
                                <div key={k} className="an-co-tt-row">
                                  <span className="an-dot" style={{ background: sm.color }} />
                                  <span className="an-co-tt-lbl">{sm.label}</span>
                                  <span className="an-co-tt-cnt">{tc.statusCounts[k]}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {/* Contract breakdowns — 2-column grid of compact bar charts */}
                  {analytics.contractCount > 0 && (
                    <div className="an-contract-grid">
                      {analytics.topVendors.length > 0 && (
                        <div className="an-section">
                          <div className="an-section-title">Top Vendors <span className="an-section-sub">({analytics.contractCount} contract)</span></div>
                          <div className="an-co-list">
                            {analytics.topVendors.map(({ name, count }) => {
                              const pct = analytics.contractCount > 0 ? count / analytics.contractCount * 100 : 0
                              return (
                                <div key={name} className="an-cgrid-row">
                                  <span className="an-vendor-logo">{name.slice(0,2).toUpperCase()}</span>
                                  <span className="an-cgrid-nm">{name}</span>
                                  <div className="an-bar-track"><div className="an-bar-fill" style={{ width: `${Math.max(pct,0.5)}%`, background: '#d97706' }} /></div>
                                  <span className="an-num">{count}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      {analytics.topImplPartners.length > 0 && (
                        <div className="an-section">
                          <div className="an-section-title">Top Implementation Partners</div>
                          <div className="an-co-list">
                            {analytics.topImplPartners.map(({ name, count }) => {
                              const pct = analytics.contractCount > 0 ? count / analytics.contractCount * 100 : 0
                              return (
                                <div key={name} className="an-cgrid-row">
                                  <span className="an-vendor-logo an-vendor-logo--purple">{name.slice(0,2).toUpperCase()}</span>
                                  <span className="an-cgrid-nm">{name}</span>
                                  <div className="an-bar-track"><div className="an-bar-fill" style={{ width: `${Math.max(pct,0.5)}%`, background: '#7c3aed' }} /></div>
                                  <span className="an-num">{count}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      {analytics.topEndClients.length > 0 && (
                        <div className="an-section">
                          <div className="an-section-title">Top End Clients</div>
                          <div className="an-co-list">
                            {analytics.topEndClients.map(({ name, count }) => {
                              const pct = analytics.contractCount > 0 ? count / analytics.contractCount * 100 : 0
                              return (
                                <div key={name} className="an-cgrid-row">
                                  <span className="an-vendor-logo an-vendor-logo--blue">{name.slice(0,2).toUpperCase()}</span>
                                  <span className="an-cgrid-nm">{name}</span>
                                  <div className="an-bar-track"><div className="an-bar-fill" style={{ width: `${Math.max(pct,0.5)}%`, background: '#0284c7' }} /></div>
                                  <span className="an-num">{count}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      {analytics.topVendorNames.length > 0 && (
                        <div className="an-section">
                          <div className="an-section-title">Top Vendor Contacts</div>
                          <div className="an-co-list">
                            {analytics.topVendorNames.map(({ name, count }) => {
                              const pct = analytics.contractCount > 0 ? count / analytics.contractCount * 100 : 0
                              return (
                                <div key={name} className="an-cgrid-row">
                                  <span className="an-vendor-logo an-vendor-logo--green">{name.slice(0,2).toUpperCase()}</span>
                                  <span className="an-cgrid-nm">{name}</span>
                                  <div className="an-bar-track"><div className="an-bar-fill" style={{ width: `${Math.max(pct,0.5)}%`, background: '#16a34a' }} /></div>
                                  <span className="an-num">{count}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      {analytics.topVendorEmails.length > 0 && (
                        <div className="an-section">
                          <div className="an-section-title">Top Vendor Emails</div>
                          <div className="an-co-list">
                            {analytics.topVendorEmails.map(({ name, count }) => {
                              const pct = analytics.contractCount > 0 ? count / analytics.contractCount * 100 : 0
                              return (
                                <div key={name} className="an-cgrid-row">
                                  <span className="an-vendor-logo an-vendor-logo--teal">{name.slice(0,2).toUpperCase()}</span>
                                  <span className="an-cgrid-nm">{name}</span>
                                  <div className="an-bar-track"><div className="an-bar-fill" style={{ width: `${Math.max(pct,0.5)}%`, background: '#0d9488' }} /></div>
                                  <span className="an-num">{count}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      {analytics.topLocations.length > 0 && (
                        <div className="an-section">
                          <div className="an-section-title">Top Locations</div>
                          <div className="an-co-list">
                            {analytics.topLocations.map(({ name, count }) => {
                              const pct = analytics.contractCount > 0 ? count / analytics.contractCount * 100 : 0
                              return (
                                <div key={name} className="an-cgrid-row">
                                  <span className="an-vendor-logo an-vendor-logo--slate">{name.slice(0,2).toUpperCase()}</span>
                                  <span className="an-cgrid-nm">{name}</span>
                                  <div className="an-bar-track"><div className="an-bar-fill" style={{ width: `${Math.max(pct,0.5)}%`, background: '#475569' }} /></div>
                                  <span className="an-num">{count}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </main>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        .ap-root { height: calc(100vh - 64px); display: flex; flex-direction: column; background: transparent; overflow: hidden; }
        .ap-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .ap-modal { background: #fff; border-radius: 18px; padding: 32px 28px 24px; max-width: 420px; width: 90%; text-align: center; box-shadow: 0 24px 64px rgba(0,0,0,0.18); }
        .ap-modal-icon { font-size: 44px; margin-bottom: 14px; }
        .ap-modal-title { font-size: 18px; font-weight: 800; color: #1a1a2e; margin: 0 0 12px; }
        .ap-modal-body { font-size: 14px; color: #6868a0; line-height: 1.6; margin: 0 0 24px; }
        .ap-modal-body strong { color: #1a1a2e; }
        .ap-modal-actions { display: flex; gap: 10px; justify-content: center; }
        .ap-modal-del-btn { background: #ef4444; color: #fff; border: none; border-radius: 10px; padding: 10px 24px; font-size: 14px; font-weight: 700; cursor: pointer; transition: opacity 0.15s; }
        .ap-modal-del-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .ap-modal-del-btn:not(:disabled):hover { opacity: 0.85; }
        .ap-modal-cancel-btn { background: #f5f5fc; color: #7070a0; border: 1px solid #e0e0ea; border-radius: 10px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; }
        .ap-modal-cancel-btn:hover { background: #ececf5; }
        .ap-topbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 28px; background: #fff; border-bottom: 1px solid #e8e8f0; flex-shrink: 0; flex-wrap: wrap; }
        .ap-topbar-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .ap-page-title { font-size: 20px; font-weight: 800; color: #1a1a2e; margin: 0; }
        .ap-count-badge { background: rgba(102,126,234,0.12); color: #667eea; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
        .ap-co-pill { display: flex; align-items: center; gap: 6px; color: #fff; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; }
        .ap-pill-x { background: none; border: none; color: rgba(255,255,255,0.8); cursor: pointer; font-size: 12px; padding: 0; line-height: 1; }
        .ap-pill-x:hover { color: #fff; }
        .ap-add-app-btn { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; border-radius: 10px; padding: 9px 20px; font-size: 13.5px; font-weight: 700; cursor: pointer; box-shadow: 0 3px 12px rgba(102,126,234,0.35); transition: opacity 0.15s, transform 0.15s; }
        .ap-add-app-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .ap-filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; background: #fff; border: 1px solid #e8e8f0; border-radius: 12px; padding: 10px 14px; flex-shrink: 0; }
        .ap-filter-sel { padding: 6px 10px; border: 1px solid #e0e0ea; border-radius: 8px; font-size: 12.5px; color: #1a1a2e; background: #fafafc; outline: none; cursor: pointer; }
        .ap-filter-sel:focus { border-color: #667eea; background: #fff; }
        .ap-filter-date-wrap { display: flex; align-items: center; gap: 6px; }
        .ap-filter-sep { font-size: 12px; color: #b0b0c8; }
        .ap-filter-date { padding: 6px 8px; border: 1px solid #e0e0ea; border-radius: 8px; font-size: 12px; color: #1a1a2e; background: #fafafc; outline: none; font-family: inherit; }
        .ap-filter-date:focus { border-color: #667eea; background: #fff; }
        .fdd-wrap { position: relative; flex-shrink: 0; }
        .fdd-btn { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border: 1px solid #e0e0ea; border-radius: 8px; font-size: 12.5px; color: #9090b0; background: #fafafc; cursor: pointer; white-space: nowrap; min-width: 120px; max-width: 150px; transition: border-color 0.15s, background 0.15s; font-family: inherit; }
        .fdd-btn.open, .fdd-btn:hover { background: #fff; border-color: #c0c0d8; }
        .fdd-btn.fdd-active { font-weight: 600; background: #fff; }
        .fdd-val { flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; }
        .fdd-arrow { font-size: 10px; color: #b0b0c8; flex-shrink: 0; transition: transform 0.15s; }
        .fdd-btn.open .fdd-arrow { transform: rotate(180deg); }
        .fdd-list { position: absolute; top: calc(100% + 4px); left: 0; min-width: 170px; background: #fff; border: 1px solid #e0e0ea; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.13); z-index: 300; overflow: hidden; }
        .fdd-item { padding: 8px 14px; font-size: 13px; cursor: pointer; color: #1a1a2e; transition: background 0.1s; white-space: nowrap; }
        .fdd-item:hover { background: #f5f5fc; }
        .fdd-item--all { color: #9090b0; font-size: 12px; font-weight: 600; border-bottom: 1px solid #f0f0f8; }
        .fdd-item--all:hover { background: #f8f8fc; }
        .fdd-selected { color: var(--fdd-accent, #d97706); font-weight: 700; background: rgba(217,119,6,0.05); }
        .fdd-options { max-height: 144px; overflow-y: auto; }
        .fdd-options::-webkit-scrollbar { width: 4px; }
        .fdd-options::-webkit-scrollbar-thumb { background: #e0e0ea; border-radius: 4px; }
        .ap-filter-clear { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); border-radius: 8px; color: #ef4444; font-size: 12px; font-weight: 700; padding: 5px 11px; cursor: pointer; transition: background 0.15s; }
        .ap-filter-clear:hover { background: rgba(239,68,68,0.14); }
        .ap-filter-shown { font-size: 12px; color: #9090b0; font-weight: 600; margin-left: 2px; }
        .ap-body { display: flex; flex: 1; overflow: hidden; }
        .ap-sidebar { width: 25%; min-width: 220px; max-width: 300px; background: var(--th-sidebar); background-attachment: fixed; border-right: 1px solid var(--th-border); display: flex; flex-direction: column; flex-shrink: 0; }
        .ap-sidebar-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 10px; flex-shrink: 0; }
        .ap-sidebar-title { font-size: 12px; font-weight: 700; color: #9090b0; text-transform: uppercase; letter-spacing: 0.6px; }
        .ap-text-btn { background: none; border: none; font-size: 12px; font-weight: 600; color: #667eea; cursor: pointer; padding: 2px 4px; border-radius: 4px; }
        .ap-text-btn:hover { background: rgba(102,126,234,0.08); }
        .ap-co-search-wrap { padding: 0 14px 10px; flex-shrink: 0; }
        .ap-co-search { width: 100%; padding: 8px 12px; border: 1px solid #e8e8f0; border-radius: 9px; font-size: 13px; background: #f8f8fc; color: #1a1a2e; outline: none; }
        .ap-co-search:focus { border-color: #667eea; background: #fff; }
        .ap-co-search::placeholder { color: #b0b0c8; }
        .ap-co-list { flex: 1; overflow-y: auto; padding: 0 8px 8px; }
        .ap-co-list::-webkit-scrollbar { width: 4px; }
        .ap-co-list::-webkit-scrollbar-thumb { background: #e0e0ea; border-radius: 4px; }
        .ap-co-row-wrap { display: flex; align-items: center; border-radius: 10px; transition: background 0.15s; }
        .ap-co-row-wrap:hover { background: #f5f5fc; }
        .ap-co-row-wrap.active { background: rgba(102,126,234,0.1); }
        .ap-co-row { display: flex; align-items: center; gap: 10px; flex: 1; padding: 8px 4px 8px 10px; border: none; background: none; cursor: pointer; text-align: left; }
        .ap-co-del { background: none; border: none; color: #d0d0e0; cursor: pointer; font-size: 11px; padding: 6px 8px; border-radius: 6px; line-height: 1; transition: color 0.15s, background 0.15s; flex-shrink: 0; }
        .ap-co-del:hover { color: #ef4444; background: rgba(239,68,68,0.08); }
        .ap-co-logo { width: 30px; height: 30px; border-radius: 8px; color: #fff; font-size: 10px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ap-co-name-wrap { display: flex; flex-direction: column; flex: 1; min-width: 0; }
        .ap-co-name { font-size: 13px; font-weight: 600; color: #1a1a2e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ap-co-row-wrap.active .ap-co-name { color: #667eea; }
        .ap-co-count { font-size: 10px; color: #b0b0c8; font-weight: 600; margin-top: 1px; }
        .ap-co-check { font-size: 11px; color: #667eea; font-weight: 700; }
        .ap-co-empty { font-size: 12px; color: #b0b0c8; text-align: center; padding: 20px 10px; line-height: 1.6; margin: 0; }
        .ap-add-co-wrap { padding: 10px 12px 14px; border-top: 1px solid #f0f0f8; flex-shrink: 0; }
        .ap-add-co-btn { width: 100%; padding: 9px; background: rgba(102,126,234,0.07); border: 1.5px dashed rgba(102,126,234,0.35); border-radius: 10px; color: #667eea; font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.15s; }
        .ap-add-co-btn:hover { background: rgba(102,126,234,0.13); }
        .ap-add-co-form { display: flex; flex-direction: column; gap: 8px; }
        .ap-add-co-input { padding: 8px 10px; border: 1px solid #e0e0ea; border-radius: 8px; font-size: 13px; color: #1a1a2e; outline: none; background: #fafafc; }
        .ap-add-co-input:focus { border-color: #667eea; background: #fff; }
        .ap-palette { display: flex; flex-wrap: wrap; gap: 5px; padding: 2px 0; }
        .ap-swatch { width: 18px; height: 18px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; padding: 0; transition: transform 0.12s, border-color 0.12s; }
        .ap-swatch.picked { border-color: #1a1a2e; transform: scale(1.3); }
        .ap-swatch:hover { transform: scale(1.18); }
        .ap-add-co-save { flex: 1; padding: 7px; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; transition: opacity 0.15s; }
        .ap-add-co-save:disabled { opacity: 0.5; cursor: not-allowed; }
        .ap-add-co-cancel { padding: 7px 10px; background: #f5f5fc; border: 1px solid #e0e0ea; border-radius: 8px; font-size: 13px; color: #7070a0; cursor: pointer; }
        .ap-main { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
        .ap-main::-webkit-scrollbar { width: 6px; }
        .ap-main::-webkit-scrollbar-thumb { background: #d0d0e0; border-radius: 6px; }
        .ap-error { display: flex; align-items: center; justify-content: space-between; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #dc2626; border-radius: 10px; padding: 10px 16px; font-size: 13px; font-weight: 600; flex-shrink: 0; }
        .ap-error-x { background: none; border: none; color: #dc2626; cursor: pointer; font-size: 14px; padding: 0; margin-left: 12px; }
        .ap-form-card { background: var(--th-card); background-attachment: fixed; border: 1px solid var(--th-border); border-radius: 16px; padding: 24px; flex-shrink: 0; }
        .ap-form-head { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .ap-form-title { font-size: 16px; font-weight: 800; color: #1a1a2e; margin: 0; flex: 1; }
        .ap-form-close { background: none; border: none; color: #9090b0; cursor: pointer; font-size: 16px; padding: 4px; border-radius: 6px; transition: background 0.15s; }
        .ap-form-close:hover { background: #f5f5fc; color: #1a1a2e; }
        .ap-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .ap-field { display: flex; flex-direction: column; gap: 6px; }
        .ap-field--full { grid-column: 1 / -1; }
        .ap-label { font-size: 12px; font-weight: 700; color: #7070a0; text-transform: uppercase; letter-spacing: 0.4px; }
        .ap-req { color: #ef4444; }
        .ap-input, .ap-select, .ap-textarea { border: 1px solid #e0e0ea; border-radius: 9px; padding: 9px 12px; font-size: 13.5px; color: #1a1a2e; background: #fafafc; outline: none; font-family: inherit; transition: border-color 0.2s, box-shadow 0.2s; }
        .ap-input:focus, .ap-select:focus, .ap-textarea:focus { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); background: #fff; }
        .ap-textarea { resize: vertical; min-height: 80px; font-family: 'Courier New', monospace; font-size: 12.5px; }
        .ap-hint { font-size: 11px; color: #b0b0c8; margin: 0; }
        .ap-form-err { color: #dc2626; font-size: 13px; font-weight: 600; margin: 8px 0 0; }
        .ap-form-actions { display: flex; gap: 10px; margin-top: 20px; }
        .ap-btn-save { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; border-radius: 9px; padding: 10px 22px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 3px 12px rgba(102,126,234,0.3); transition: opacity 0.15s; }
        .ap-btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
        .ap-btn-save:not(:disabled):hover { opacity: 0.9; }
        .ap-btn-cancel { background: #f5f5fc; color: #7070a0; border: 1px solid #e0e0ea; border-radius: 9px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; }
        .ap-btn-cancel:hover { background: #ececf5; }
        .ap-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 60px 20px; }
        .ap-empty-icon { font-size: 52px; margin-bottom: 18px; opacity: 0.7; }
        .ap-empty h3 { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 10px; }
        .ap-empty p { font-size: 14.5px; color: #9090b0; max-width: 360px; line-height: 1.6; margin: 0; }
        .ap-dots { display: flex; gap: 6px; margin-bottom: 12px; }
        .ap-dots span { width: 8px; height: 8px; border-radius: 50%; background: #d0d0e0; animation: apPulse 1.4s ease-in-out infinite; }
        .ap-dots span:nth-child(2) { animation-delay: 0.2s; }
        .ap-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes apPulse { 0%,80%,100%{opacity:.3;transform:scale(.85)} 40%{opacity:1;transform:scale(1)} }
        .ap-cards { display: flex; flex-direction: column; gap: 14px; }
        .ap-card { background: var(--th-card); background-attachment: fixed; border: 1px solid var(--th-border); border-radius: 16px; padding: 20px 22px 18px; display: flex; flex-direction: column; gap: 10px; transition: box-shadow 0.2s, transform 0.2s; }
        .ap-card:hover { box-shadow: 0 6px 24px rgba(102,126,234,0.1); transform: translateY(-1px); }
        .ap-card-top { display: flex; align-items: center; gap: 12px; }
        .ap-card-logo { width: 40px; height: 40px; border-radius: 10px; color: #fff; font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ap-card-meta { flex: 1; min-width: 0; }
        .ap-card-co { font-size: 13px; font-weight: 700; color: #667eea; }
        .ap-card-time { font-size: 11.5px; color: #b0b0c8; margin-top: 2px; }
        .ap-card-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .ap-status-sel { appearance: none; -webkit-appearance: none; border: 1px solid; border-radius: 20px; padding: 4px 28px 4px 12px; font-size: 12px; font-weight: 700; cursor: pointer; outline: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 9px center; min-width: 120px; white-space: nowrap; transition: opacity 0.15s; }
        .ap-status-sel:hover:not(:disabled) { opacity: 0.85; }
        .ap-status-sel:disabled { opacity: 0.5; cursor: not-allowed; }
        .ap-del-btn { background: none; border: 1px solid #e8e8f0; border-radius: 8px; color: #9ca3af; cursor: pointer; padding: 5px 9px; font-size: 13px; line-height: 1; transition: background 0.15s, color 0.15s, border-color 0.15s; }
        .ap-del-btn:hover:not(:disabled) { background: rgba(239,68,68,0.08); color: #ef4444; border-color: #fca5a5; }
        .ap-del-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ap-card-title { font-size: 17px; font-weight: 800; color: #1a1a2e; margin: 0; line-height: 1.3; }
        .ap-chips { display: flex; flex-wrap: wrap; gap: 7px; }
        .ap-chip { font-size: 11.5px; font-weight: 600; padding: 3px 10px; border-radius: 6px; border: 1px solid; }
        .ap-chip-v { background: rgba(102,126,234,0.08); color: #667eea; border-color: rgba(102,126,234,0.2); }
        .ap-chip-t { background: rgba(118,75,162,0.08); color: #764ba2; border-color: rgba(118,75,162,0.2); }
        .ap-chip-contract { background: rgba(245,158,11,0.09); color: #d97706; border-color: rgba(245,158,11,0.25); }
        .ap-chip-fulltime  { background: rgba(34,197,94,0.08);  color: #16a34a; border-color: rgba(34,197,94,0.22); }
        .ap-chip-loc { background: rgba(14,165,233,0.08); color: #0284c7; border-color: rgba(14,165,233,0.22); }
        .ap-vendor-divider { display: flex; align-items: center; padding: 0; }
        .ap-vendor-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #a0a0c0; padding: 0 4px 0 0; white-space: nowrap; }
        .ap-vendor-divider::after { content: ''; flex: 1; height: 1px; background: #e8e8f4; margin-left: 8px; }
        .ap-vendor-info { display: flex; flex-wrap: wrap; gap: 6px 14px; padding: 8px 12px; background: rgba(245,158,11,0.04); border: 1px solid rgba(245,158,11,0.15); border-radius: 8px; }
        .ap-vendor-header { width: 100%; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #d97706; }
        .ap-vendor-info span, .ap-vendor-info a { font-size: 12.5px; color: #555570; font-weight: 500; text-decoration: none; }
        .ap-vendor-subrow { width: 100%; }
        .ap-vendor-subrow em { font-style: normal; color: #d97706; font-weight: 600; margin-right: 4px; }
        .ap-vendor-info a:hover { color: #d97706; text-decoration: underline; }
        .ap-exp { border: 1px solid #e8e8f0; border-radius: 8px; overflow: hidden; }
        .ap-exp-sum { padding: 8px 14px; font-size: 12.5px; font-weight: 600; color: #7070a0; cursor: pointer; user-select: none; background: #fafafc; }
        .ap-exp-sum:hover { background: #f0f0fa; }
        .ap-exp-pre { margin: 0; padding: 12px 14px; background: #1a1a2e; color: #c9d1d9; font-size: 11.5px; overflow-x: auto; max-height: 220px; overflow-y: auto; }
        .ap-notes { font-size: 13.5px; color: #6868a0; line-height: 1.6; margin: 0; background: #fafafa; border-left: 3px solid #e0e0ea; padding: 8px 12px; border-radius: 0 6px 6px 0; }
        .ap-card-foot { display: flex; align-items: center; gap: 12px; padding-top: 10px; border-top: 1px solid #f0f0f8; }
        .ap-resume-btn { display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #22c55e, #16a34a); color: #fff; border: none; border-radius: 9px; padding: 8px 18px; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 10px rgba(34,197,94,0.3); transition: opacity 0.15s, transform 0.15s; }
        .ap-resume-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .ap-resume-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
        .ap-resume-hint { font-size: 11.5px; color: #b0b0c8; font-weight: 600; }
        .ap-spin { display: inline-block; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: apSpin 0.7s linear infinite; }
        @keyframes apSpin { to { transform: rotate(360deg); } }
        .ap-tab-toggle { display: flex; background: #f0f0f8; border-radius: 10px; padding: 3px; gap: 2px; }
        .ap-tab-btn { padding: 6px 18px; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; background: none; color: #9090b0; transition: background 0.15s, color 0.15s; white-space: nowrap; }
        .ap-tab-btn.active { background: #fff; color: #1a1a2e; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
        .ap-tab-btn:hover:not(.active) { color: #667eea; }
        .an-root { display: flex; flex-direction: column; gap: 16px; }
        .an-stats { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
        .an-stat { background: var(--th-card); background-attachment: fixed; border: 1px solid var(--th-border); border-radius: 14px; padding: 16px 14px; text-align: center; }
        .an-stat-val { font-size: 28px; font-weight: 800; color: #1a1a2e; line-height: 1; margin-bottom: 6px; }
        .an-stat-lbl { font-size: 10.5px; font-weight: 700; color: #9090b0; text-transform: uppercase; letter-spacing: 0.5px; }
        .an-section { background: var(--th-card); background-attachment: fixed; border: 1px solid var(--th-border); border-radius: 14px; padding: 18px 20px; }
        .an-section-title { font-size: 11px; font-weight: 700; color: #9090b0; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 14px; }
        /* 2-col row: Status donut + Job type donut */
        .an-row-2col { display: grid; grid-template-columns: 3fr 2fr; gap: 16px; }
        .an-donut-wrap { display: flex; align-items: flex-start; gap: 16px; }
        .an-donut-legend { flex: 1; display: flex; flex-direction: column; gap: 7px; padding-top: 2px; min-width: 0; }
        .an-donut-row { display: flex; align-items: center; gap: 7px; }
        .an-donut-lbl { flex: 1; font-size: 12px; color: #5050a0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .an-donut-cnt { font-size: 13px; font-weight: 700; color: #1a1a2e; }
        .an-donut-pct { font-size: 11.5px; color: #9090b0; width: 32px; text-align: right; flex-shrink: 0; }
        .an-type-donut { display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .an-type-rows { width: 100%; display: flex; flex-direction: column; gap: 10px; }
        .an-type-row { display: flex; align-items: center; gap: 8px; }
        .an-type-nm { flex: 1; font-size: 13px; color: #5050a0; }
        .an-type-cnt { font-size: 14px; font-weight: 800; color: #1a1a2e; }
        /* Contract 2-col grid */
        .an-contract-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .an-cgrid-row { display: grid; grid-template-columns: 22px 1fr 72px 28px; align-items: center; gap: 8px; }
        .an-cgrid-nm { font-size: 12.5px; font-weight: 600; color: #1a1a2e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .an-status-list { display: flex; flex-direction: column; gap: 11px; }
        .an-status-row { display: grid; grid-template-columns: 175px 1fr 38px 42px; align-items: center; gap: 10px; }
        .an-status-name { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #1a1a2e; }
        .an-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .an-bar-track { height: 8px; background: #f0f0f8; border-radius: 4px; overflow: hidden; }
        .an-bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
        .an-num { font-size: 13px; font-weight: 700; color: #1a1a2e; text-align: right; }
        .an-pct { font-size: 12px; color: #9090b0; font-weight: 600; text-align: right; }
        .an-co-list { display: flex; flex-direction: column; gap: 10px; }
        .an-co-row { display: grid; grid-template-columns: 26px 150px 1fr 38px; align-items: center; gap: 10px; }
        .an-co-logo-sm { width: 24px; height: 24px; border-radius: 6px; color: #fff; font-size: 9px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .an-vendor-logo { width: 24px; height: 24px; border-radius: 6px; background: rgba(217,119,6,0.13); color: #d97706; font-size: 9px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .an-vendor-logo--purple { background: rgba(124,58,237,0.1); color: #7c3aed; }
        .an-vendor-logo--blue   { background: rgba(2,132,199,0.1);  color: #0284c7; }
        .an-vendor-logo--green  { background: rgba(22,163,74,0.1);  color: #16a34a; }
        .an-vendor-logo--teal   { background: rgba(13,148,136,0.1); color: #0d9488; }
        .an-vendor-logo--slate  { background: rgba(71,85,105,0.1);  color: #475569; }
        .an-filter-bar--contract { flex-wrap: wrap; margin-top: 4px; }
        .an-section-sub { font-size: 11px; font-weight: 500; color: #b0b0c8; text-transform: none; letter-spacing: 0; }
        .an-co-nm { font-size: 13px; font-weight: 600; color: #1a1a2e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .an-timeline { display: flex; align-items: flex-end; gap: 10px; overflow-x: auto; padding-bottom: 28px; min-height: 110px; }
        .an-timeline::-webkit-scrollbar { height: 4px; } .an-timeline::-webkit-scrollbar-thumb { background: #d0d0e0; border-radius: 4px; }
        .an-day { display: flex; flex-direction: column; align-items: center; gap: 3px; flex-shrink: 0; }
        .an-day-n { font-size: 10px; font-weight: 700; color: #667eea; }
        .an-day-b { width: 28px; background: linear-gradient(180deg, #667eea, #764ba2); border-radius: 4px 4px 0 0; }
        .an-day-l { font-size: 9px; color: #9090b0; font-weight: 600; white-space: nowrap; display: block; transform: rotate(-40deg) translateX(-6px); transform-origin: top left; margin-top: 6px; }
        .an-filter-bar { background: var(--th-card); background-attachment: fixed; border: 1px solid var(--th-border); border-radius: 14px; padding: 16px 20px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; box-shadow: 0 1px 6px rgba(0,0,0,0.04); flex-shrink: 0; }
        .an-presets { display: flex; gap: 5px; flex-wrap: wrap; }
        .an-preset { padding: 6px 16px; border: 1.5px solid #e0e0ea; border-radius: 20px; background: #fafafc; color: #7070a0; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .an-preset:hover:not(.active) { border-color: #667eea; color: #667eea; background: rgba(102,126,234,0.05); }
        .an-preset.active { background: #1a1a2e; color: #fff; border-color: #1a1a2e; box-shadow: 0 2px 8px rgba(26,26,46,0.2); }
        .an-custom-dates { display: flex; align-items: center; gap: 10px; padding-left: 16px; border-left: 1.5px solid #e8e8f0; }
        .an-date-input { border: none; border-bottom: 2px solid #d0d0e0; background: transparent; padding: 4px 6px; font-size: 13px; color: #1a1a2e; outline: none; font-family: inherit; transition: border-color 0.2s; }
        .an-date-input:focus { border-bottom-color: #667eea; }
        .an-date-sep { color: #b0b0c8; font-size: 14px; }
        .an-filter-count { margin-left: auto; font-size: 12px; font-weight: 700; color: #667eea; background: rgba(102,126,234,0.08); border: 1px solid rgba(102,126,234,0.2); padding: 4px 14px; border-radius: 20px; white-space: nowrap; }
        .an-co-row { cursor: default; }
        .an-co-tooltip { position: fixed; z-index: 1200; background: #fff; border: 1px solid #e4e4f0; border-radius: 14px; padding: 14px 16px; min-width: 210px; max-width: 240px; box-shadow: 0 10px 36px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.06); pointer-events: none; }
        .an-co-tt-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .an-co-tt-name { font-size: 13.5px; font-weight: 800; color: #1a1a2e; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .an-co-tt-total { font-size: 12px; font-weight: 700; color: #667eea; background: rgba(102,126,234,0.1); border: 1px solid rgba(102,126,234,0.2); padding: 2px 9px; border-radius: 20px; white-space: nowrap; flex-shrink: 0; }
        .an-co-tt-div { height: 1px; background: #f0f0f8; margin-bottom: 10px; }
        .an-co-tt-list { display: flex; flex-direction: column; gap: 7px; }
        .an-co-tt-row { display: flex; align-items: center; gap: 8px; }
        .an-co-tt-lbl { font-size: 12px; color: #6868a0; flex: 1; }
        .an-co-tt-cnt { font-size: 13px; font-weight: 700; color: #1a1a2e; }
        @media (max-width: 900px) { .ap-sidebar { width: 200px; min-width: 180px; } }
        @media (max-width: 640px) {
          .ap-body { flex-direction: column; overflow: auto; }
          .ap-sidebar { width: 100%; max-width: 100%; border-right: none; border-bottom: 1px solid #e8e8f0; }
          .ap-co-list { max-height: 180px; }
          .ap-main { overflow-y: auto; }
          .ap-form-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
