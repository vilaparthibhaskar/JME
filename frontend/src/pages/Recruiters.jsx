import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSelector } from 'react-redux'
import api from '../services/api'

const EMPTY_FORM = {
  name: '', company: '', title: '', email: '', phone: '', linkedin: '', notes: '', last_contact: '',
}
const EMPTY_GROUP_FORM = { name: '' }

function getInitials(name = '') {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function timeSince(iso) {
  if (!iso) return null
  const d = new Date(iso + 'T00:00:00')
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

const AVATAR_COLORS = [
  '#667eea', '#764ba2', '#f093fb', '#0d9488', '#d97706',
  '#ef4444', '#22c55e', '#3b82f6', '#ec4899', '#8b5cf6',
]
function avatarColor(name = '') {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[Math.abs(h)]
}

export default function Recruiters() {
  const { token } = useSelector(s => s.auth)

  // ── Recruiters state ───────────────────────────────────────────────────────
  const [recruiters, setRecruiters] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [search,     setSearch]     = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [saving,     setSaving]     = useState(false)
  const [saveErr,    setSaveErr]    = useState('')
  const [delTarget,  setDelTarget]  = useState(null)
  const [deleting,   setDeleting]   = useState(false)
  const nameRef = useRef(null)

  // ── Groups state ───────────────────────────────────────────────────────────
  const [groups,         setGroups]         = useState([])
  const [activeGroup,    setActiveGroup]    = useState(null)
  const [showGroupForm,  setShowGroupForm]  = useState(false)
  const [editingGroup,   setEditingGroup]   = useState(null)
  const [groupForm,      setGroupForm]      = useState(EMPTY_GROUP_FORM)
  const [groupMembers,   setGroupMembers]   = useState([])
  const [groupSaving,    setGroupSaving]    = useState(false)
  const [groupSaveErr,   setGroupSaveErr]   = useState('')
  const [delGroupTarget, setDelGroupTarget] = useState(null)
  const [delGrouping,    setDelGrouping]    = useState(false)
  const groupNameRef = useRef(null)

  // ── Load data ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const [recs, grps] = await Promise.all([
        api.getRecruiters(token),
        api.getRecruiterGroups(token),
      ])
      setRecruiters(recs)
      setGroups(grps)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (showForm)      setTimeout(() => nameRef.current?.focus(), 60)
  }, [showForm])

  useEffect(() => {
    if (showGroupForm) setTimeout(() => groupNameRef.current?.focus(), 60)
  }, [showGroupForm])

  // ── Filtered recruiters ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let base = recruiters
    if (activeGroup !== null) {
      const grp = groups.find(g => g.id === activeGroup)
      const ids = new Set(grp?.member_ids || [])
      base = base.filter(r => ids.has(r.id))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      base = base.filter(r =>
        (r.name    || '').toLowerCase().includes(q) ||
        (r.company || '').toLowerCase().includes(q) ||
        (r.title   || '').toLowerCase().includes(q) ||
        (r.email   || '').toLowerCase().includes(q)
      )
    }
    return base
  }, [recruiters, groups, activeGroup, search])

  // ── Recruiter CRUD ─────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setSaveErr('')
    setShowForm(true)
  }

  const openEdit = r => {
    setEditing(r)
    setForm({
      name: r.name || '', company: r.company || '', title: r.title || '',
      email: r.email || '', phone: r.phone || '', linkedin: r.linkedin || '',
      notes: r.notes || '', last_contact: r.last_contact || '',
    })
    setSaveErr('')
    setShowForm(true)
  }

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) { setSaveErr('Name is required.'); return }
    setSaving(true); setSaveErr('')
    try {
      const payload = {
        name:         form.name.trim(),
        company:      form.company.trim() || null,
        title:        form.title.trim() || null,
        email:        form.email.trim() || null,
        phone:        form.phone.trim() || null,
        linkedin:     form.linkedin.trim() || null,
        notes:        form.notes.trim() || null,
        last_contact: form.last_contact || null,
      }
      if (editing) {
        const updated = await api.updateRecruiter(token, editing.id, payload)
        setRecruiters(rs => rs.map(r => r.id === editing.id ? updated : r))
      } else {
        const created = await api.createRecruiter(token, payload)
        setRecruiters(rs => [created, ...rs])
      }
      setShowForm(false)
    } catch (e) { setSaveErr(e.message) }
    finally     { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!delTarget) return
    setDeleting(true)
    try {
      await api.deleteRecruiter(token, delTarget.id)
      const deletedId = delTarget.id
      setRecruiters(rs => rs.filter(r => r.id !== deletedId))
      setGroups(gs => gs.map(g => ({
        ...g, member_ids: (g.member_ids || []).filter(id => id !== deletedId)
      })))
      setDelTarget(null)
    } catch (e) { setError(e.message) }
    finally     { setDeleting(false) }
  }

  // ── Group CRUD ─────────────────────────────────────────────────────────────
  const openAddGroup = () => {
    setEditingGroup(null)
    setGroupForm(EMPTY_GROUP_FORM)
    setGroupMembers([])
    setGroupSaveErr('')
    setShowGroupForm(true)
  }

  const openEditGroup = g => {
    setEditingGroup(g)
    setGroupForm({ name: g.name })
    setGroupMembers([...(g.member_ids || [])])
    setGroupSaveErr('')
    setShowGroupForm(true)
  }

  const toggleMember = id =>
    setGroupMembers(ms => ms.includes(id) ? ms.filter(m => m !== id) : [...ms, id])

  const handleGroupSave = async () => {
    if (!groupForm.name.trim()) { setGroupSaveErr('Group name is required.'); return }
    setGroupSaving(true); setGroupSaveErr('')
    try {
      const payload = { name: groupForm.name.trim(), member_ids: groupMembers }
      if (editingGroup) {
        const updated = await api.updateRecruiterGroup(token, editingGroup.id, payload)
        setGroups(gs => gs.map(g => g.id === editingGroup.id ? updated : g))
      } else {
        const created = await api.createRecruiterGroup(token, payload)
        setGroups(gs => [...gs, created])
      }
      setShowGroupForm(false)
    } catch (e) { setGroupSaveErr(e.message) }
    finally     { setGroupSaving(false) }
  }

  const handleGroupDelete = async () => {
    if (!delGroupTarget) return
    setDelGrouping(true)
    try {
      await api.deleteRecruiterGroup(token, delGroupTarget.id)
      setGroups(gs => gs.filter(g => g.id !== delGroupTarget.id))
      if (activeGroup === delGroupTarget.id) setActiveGroup(null)
      setDelGroupTarget(null)
    } catch (e) { setError(e.message) }
    finally     { setDelGrouping(false) }
  }

  const removeFromGroup = async (recruiterId) => {
    const grp = groups.find(g => g.id === activeGroup)
    if (!grp) return
    const newIds = (grp.member_ids || []).filter(id => id !== recruiterId)
    try {
      const updated = await api.updateRecruiterGroup(token, grp.id, { member_ids: newIds })
      setGroups(gs => gs.map(g => g.id === grp.id ? updated : g))
    } catch (e) { setError(e.message) }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="rc-root">

      {/* ── Delete group confirmation ─────────────────────────────────────── */}
      {delGroupTarget && (
        <div className="rc-overlay">
          <div className="rc-modal">
            <div className="rc-modal-icon">🗂️</div>
            <div className="rc-modal-title">Delete Group?</div>
            <div className="rc-modal-body">
              Delete group <strong>"{delGroupTarget.name}"</strong>? The recruiters inside will not be deleted.
            </div>
            <div className="rc-modal-actions">
              <button className="rc-modal-del-btn" onClick={handleGroupDelete} disabled={delGrouping}>
                {delGrouping ? 'Deleting…' : 'Delete Group'}
              </button>
              <button className="rc-modal-cancel-btn" onClick={() => setDelGroupTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete recruiter confirmation ─────────────────────────────────────── */}
      {delTarget && (
        <div className="rc-overlay">
          <div className="rc-modal">
            <div className="rc-modal-icon">🗑️</div>
            <div className="rc-modal-title">Delete Recruiter?</div>
            <div className="rc-modal-body">
              Remove <strong>{delTarget.name}</strong>
              {delTarget.company ? ` from ${delTarget.company}` : ''}? This cannot be undone.
            </div>
            <div className="rc-modal-actions">
              <button className="rc-modal-del-btn" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
              <button className="rc-modal-cancel-btn" onClick={() => setDelTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}



      {/* ── Add / Edit recruiter drawer ───────────────────────────────────── */}
      {showForm && (
        <div className="rc-overlay" onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="rc-drawer">
            <div className="rc-drawer-head">
              <span className="rc-drawer-title">{editing ? 'Edit Recruiter' : 'Add Recruiter'}</span>
              <button className="rc-drawer-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="rc-form-body">
              <div className="rc-form-row">
                <label className="rc-label">Name <span className="rc-required">*</span></label>
                <input ref={nameRef} className="rc-input" placeholder="Full name"
                  value={form.name} onChange={e => setField('name', e.target.value)} />
              </div>
              <div className="rc-form-2col">
                <div className="rc-form-row">
                  <label className="rc-label">Company</label>
                  <input className="rc-input" placeholder="Company" value={form.company} onChange={e => setField('company', e.target.value)} />
                </div>
                <div className="rc-form-row">
                  <label className="rc-label">Title / Role</label>
                  <input className="rc-input" placeholder="e.g. Technical Recruiter" value={form.title} onChange={e => setField('title', e.target.value)} />
                </div>
              </div>
              <div className="rc-form-2col">
                <div className="rc-form-row">
                  <label className="rc-label">Email</label>
                  <input className="rc-input" type="email" placeholder="recruiter@company.com" value={form.email} onChange={e => setField('email', e.target.value)} />
                </div>
                <div className="rc-form-row">
                  <label className="rc-label">Phone</label>
                  <input className="rc-input" placeholder="+1 (555) 000-0000" value={form.phone} onChange={e => setField('phone', e.target.value)} />
                </div>
              </div>
              <div className="rc-form-2col">
                <div className="rc-form-row">
                  <label className="rc-label">LinkedIn URL</label>
                  <input className="rc-input" placeholder="https://linkedin.com/in/…" value={form.linkedin} onChange={e => setField('linkedin', e.target.value)} />
                </div>
                <div className="rc-form-row">
                  <label className="rc-label">Last Contact</label>
                  <input className="rc-input" type="date" value={form.last_contact} onChange={e => setField('last_contact', e.target.value)} />
                </div>
              </div>
              <div className="rc-form-row">
                <label className="rc-label">Notes</label>
                <textarea className="rc-textarea" placeholder="Any notes about this recruiter…" rows={3}
                  value={form.notes} onChange={e => setField('notes', e.target.value)} />
              </div>
              {saveErr && <div className="rc-save-err">{saveErr}</div>}
            </div>
            <div className="rc-drawer-foot">
              <button className="rc-save-btn" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Recruiter'}
              </button>
              <button className="rc-cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit group drawer ───────────────────────────────────────── */}
      {showGroupForm && (
        <div className="rc-overlay" onClick={e => { if (e.target === e.currentTarget) setShowGroupForm(false) }}>
          <div className="rc-drawer rc-group-drawer">
            <div className="rc-drawer-head">
              <span className="rc-drawer-title">{editingGroup ? 'Edit Group' : 'Create Group'}</span>
              <button className="rc-drawer-close" onClick={() => setShowGroupForm(false)}>✕</button>
            </div>
            <div className="rc-form-body">
              <div className="rc-form-row">
                <label className="rc-label">Group Name <span className="rc-required">*</span></label>
                <input ref={groupNameRef} className="rc-input" placeholder="e.g. FAANG, Contract Pipeline…"
                  value={groupForm.name} onChange={e => setGroupForm({ name: e.target.value })} />
              </div>

              <div className="rc-form-row">
                <label className="rc-label">Members ({groupMembers.length} selected)</label>
                {recruiters.length === 0 ? (
                  <div className="rc-grp-empty-msg">No recruiters yet — add some first.</div>
                ) : (
                  <div className="rc-member-list">
                    {recruiters.map(r => {
                      const checked = groupMembers.includes(r.id)
                      return (
                        <label key={r.id} className={`rc-member-item${checked ? ' rc-member-item--on' : ''}`}>
                          <div className="rc-member-avatar" style={{ background: avatarColor(r.name) }}>
                            {getInitials(r.name)}
                          </div>
                          <div className="rc-member-info">
                            <span className="rc-member-name">{r.name}</span>
                            {(r.company || r.title) && (
                              <span className="rc-member-sub">
                                {[r.title, r.company].filter(Boolean).join(' · ')}
                              </span>
                            )}
                          </div>
                          <input type="checkbox" className="rc-member-cb" checked={checked}
                            onChange={() => toggleMember(r.id)} />
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
              {groupSaveErr && <div className="rc-save-err">{groupSaveErr}</div>}
            </div>
            <div className="rc-drawer-foot">
              <button className="rc-save-btn" onClick={handleGroupSave} disabled={groupSaving}>
                {groupSaving ? 'Saving…' : editingGroup ? 'Save Group' : 'Create Group'}
              </button>
              <button className="rc-cancel-btn" onClick={() => setShowGroupForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="rc-topbar">
        <div className="rc-topbar-left">
          <h1 className="rc-page-title">Recruiters</h1>
          <span className="rc-count-badge">{recruiters.length}</span>
        </div>
        <div className="rc-topbar-right">
          <div className="rc-search-wrap">
            <span className="rc-search-icon">🔍</span>
            <input className="rc-search" placeholder="Search name, company, title…"
              value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button className="rc-search-clear" onClick={() => setSearch('')}>✕</button>}
          </div>
          <button className="rc-add-btn" onClick={openAdd}>+ Add Recruiter</button>
        </div>
      </div>

      {/* ── Body: sidebar + cards ─────────────────────────────────────────── */}
      <div className="rc-body">

        {/* Left sidebar */}
        <aside className="rc-sidebar">
          <div className="rc-sidebar-head">
            <span className="rc-sidebar-title">Groups</span>
            <button className="rc-sidebar-add" onClick={openAddGroup} title="Create group">＋</button>
          </div>

          <button
            className={`rc-group-item${activeGroup === null ? ' rc-group-item--active' : ''}`}
            onClick={() => setActiveGroup(null)}
          >
            <span className="rc-group-item-icon">👥</span>
            <span className="rc-group-item-name">All Recruiters</span>
            <span className="rc-group-item-cnt">{recruiters.length}</span>
          </button>

          {groups.length > 0 && <div className="rc-sidebar-divider" />}

          {groups.map(g => {
            const cnt = (g.member_ids || []).length
            const active = activeGroup === g.id
            return (
              <div key={g.id} className={`rc-group-item${active ? ' rc-group-item--active' : ''}`}
                onClick={() => setActiveGroup(g.id)}
              >
                <span className="rc-group-item-icon">🗂️</span>
                <span className="rc-group-item-name">{g.name}</span>
                <span className="rc-group-item-cnt">{cnt}</span>
                <div className="rc-group-actions" onClick={e => e.stopPropagation()}>
                  <button className="rc-group-action-btn" onClick={() => openEditGroup(g)} title="Edit group">✏️</button>
                  <button className="rc-group-action-btn rc-group-action-btn--del" onClick={() => setDelGroupTarget(g)} title="Delete group">🗑️</button>
                </div>
              </div>
            )
          })}

          {groups.length === 0 && (
            <div className="rc-sidebar-hint">No groups yet.<br />Create one to organise recruiters.</div>
          )}
        </aside>

        {/* Right main */}
        <main className="rc-main">
          {loading ? (
            <div className="rc-loading">
              <div className="rc-spinner" />
              <span>Loading…</span>
            </div>
          ) : error ? (
            <div className="rc-empty">
              <div className="rc-empty-icon">⚠️</div>
              <h3>Error loading recruiters</h3>
              <p>{error}</p>
              <button className="rc-add-btn" onClick={load}>Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rc-empty">
              <div className="rc-empty-icon">{activeGroup !== null ? '🗂️' : '👤'}</div>
              {search ? (
                <>
                  <h3>No matches for "{search}"</h3>
                  <p>Try a different search term.</p>
                </>
              ) : activeGroup !== null ? (
                <>
                  <h3>This group is empty</h3>
                  <p>Edit the group to add recruiters to it.</p>
                  <button className="rc-add-btn" onClick={() => openEditGroup(groups.find(g => g.id === activeGroup))}>
                    Edit Group
                  </button>
                </>
              ) : (
                <>
                  <h3>No recruiters yet</h3>
                  <p>Start tracking the recruiters you have connected with.</p>
                  <button className="rc-add-btn" onClick={openAdd}>+ Add Your First Recruiter</button>
                </>
              )}
            </div>
          ) : (
            <>
              {activeGroup !== null && (
                <div className="rc-active-group-label">
                  <span>🗂️ {groups.find(g => g.id === activeGroup)?.name}</span>
                  <span className="rc-active-group-cnt">{filtered.length} recruiter{filtered.length !== 1 ? 's' : ''}</span>
                </div>
              )}
              <div className="rc-grid">
                {filtered.map(r => {
                  const color = avatarColor(r.name)
                  const since = timeSince(r.last_contact)
                  return (
                    <div key={r.id} className="rc-card">
                      <div className="rc-card-head">
                        <div className="rc-avatar" style={{ background: color }}>{getInitials(r.name)}</div>
                        <div className="rc-card-info">
                          <div className="rc-card-name">{r.name}</div>
                          {(r.title || r.company) && (
                            <div className="rc-card-sub">
                              {r.title && <span>{r.title}</span>}
                              {r.title && r.company && <span className="rc-card-dot">·</span>}
                              {r.company && <span className="rc-card-co">{r.company}</span>}
                            </div>
                          )}
                        </div>
                        <div className="rc-card-actions">
                          <button className="rc-icon-btn rc-icon-btn--edit" onClick={() => openEdit(r)} title="Edit">✏️</button>
                          {activeGroup !== null && (
                            <button className="rc-icon-btn rc-icon-btn--remove" onClick={() => removeFromGroup(r.id)} title="Remove from group">✕</button>
                          )}
                          <button className="rc-icon-btn rc-icon-btn--del" onClick={() => setDelTarget(r)} title="Delete recruiter">🗑️</button>
                        </div>
                      </div>

                      <div className="rc-card-contacts">
                        {r.email && (
                          <a href={`mailto:${r.email}`} className="rc-contact-row rc-contact-row--email">
                            <span className="rc-contact-icon">✉️</span>
                            <span className="rc-contact-val">{r.email}</span>
                          </a>
                        )}
                        {r.phone && (
                          <a href={`tel:${r.phone}`} className="rc-contact-row rc-contact-row--phone">
                            <span className="rc-contact-icon">📞</span>
                            <span className="rc-contact-val">{r.phone}</span>
                          </a>
                        )}
                        {r.linkedin && (
                          <a href={r.linkedin} target="_blank" rel="noopener noreferrer" className="rc-contact-row rc-contact-row--li">
                            <span className="rc-contact-icon">💼</span>
                            <span className="rc-contact-val">LinkedIn</span>
                            <span className="rc-li-arrow">↗</span>
                          </a>
                        )}
                      </div>

                      {r.notes && <div className="rc-card-notes">{r.notes}</div>}

                      {since && (
                        <div className="rc-card-foot">
                          <span className="rc-last-contact">Last contact: <strong>{since}</strong></span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </main>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        .rc-root { height: calc(100vh - 64px); display: flex; flex-direction: column; background: transparent; overflow: hidden; }
        .rc-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }

        /* ── Modals ─────────────────────────────────────────────────────── */
        .rc-modal { background: #fff; border-radius: 18px; padding: 32px 28px 24px; max-width: 400px; width: 90%; text-align: center; box-shadow: 0 24px 64px rgba(0,0,0,0.18); }
        .rc-modal-icon { font-size: 42px; margin-bottom: 12px; }
        .rc-modal-title { font-size: 18px; font-weight: 800; color: #1a1a2e; margin: 0 0 10px; }
        .rc-modal-body { font-size: 14px; color: #6868a0; line-height: 1.6; margin: 0 0 22px; }
        .rc-modal-body strong { color: #1a1a2e; }
        .rc-modal-actions { display: flex; gap: 10px; justify-content: center; }
        .rc-modal-del-btn { background: #ef4444; color: #fff; border: none; border-radius: 10px; padding: 10px 24px; font-size: 14px; font-weight: 700; cursor: pointer; transition: opacity 0.15s; }
        .rc-modal-del-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .rc-modal-del-btn:not(:disabled):hover { opacity: 0.85; }
        .rc-modal-cancel-btn { background: #f5f5fc; color: #7070a0; border: 1px solid #e0e0ea; border-radius: 10px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; }
        .rc-modal-cancel-btn:hover { background: #ececf5; }

        /* ── Drawer ─────────────────────────────────────────────────────── */
        .rc-drawer { background: #fff; border-radius: 20px; width: 540px; max-width: 95vw; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 24px 64px rgba(0,0,0,0.2); overflow: hidden; }
        .rc-group-drawer { width: 480px; }
        .rc-drawer-head { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 16px; border-bottom: 1px solid #f0f0f8; flex-shrink: 0; }
        .rc-drawer-title { font-size: 17px; font-weight: 800; color: #1a1a2e; }
        .rc-drawer-close { background: none; border: none; font-size: 16px; color: #9090b0; cursor: pointer; padding: 4px 6px; border-radius: 6px; }
        .rc-drawer-close:hover { background: #f0f0f8; color: #1a1a2e; }
        .rc-form-body { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
        .rc-form-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .rc-form-row { display: flex; flex-direction: column; gap: 5px; }
        .rc-label { font-size: 11.5px; font-weight: 700; color: #7070a0; text-transform: uppercase; letter-spacing: 0.5px; }
        .rc-required { color: #ef4444; }
        .rc-input { border: 1.5px solid #e0e0ea; border-radius: 10px; padding: 9px 13px; font-size: 13.5px; color: #1a1a2e; background: #fafafc; outline: none; font-family: inherit; transition: border-color 0.15s, background 0.15s; }
        .rc-input:focus { border-color: #667eea; background: #fff; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }
        .rc-textarea { border: 1.5px solid #e0e0ea; border-radius: 10px; padding: 9px 13px; font-size: 13.5px; color: #1a1a2e; background: #fafafc; outline: none; font-family: inherit; resize: vertical; min-height: 72px; transition: border-color 0.15s; }
        .rc-textarea:focus { border-color: #667eea; background: #fff; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }
        .rc-save-err { font-size: 12.5px; color: #ef4444; background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; padding: 8px 12px; }
        .rc-drawer-foot { padding: 14px 24px 20px; border-top: 1px solid #f0f0f8; display: flex; gap: 10px; flex-shrink: 0; }
        .rc-save-btn { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; border-radius: 10px; padding: 10px 28px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 3px 12px rgba(102,126,234,0.35); transition: opacity 0.15s; }
        .rc-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .rc-save-btn:not(:disabled):hover { opacity: 0.88; }
        .rc-cancel-btn { background: #f5f5fc; color: #7070a0; border: 1px solid #e0e0ea; border-radius: 10px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; }
        .rc-cancel-btn:hover { background: #ececf5; }

        /* Member checklist */
        .rc-member-list { display: flex; flex-direction: column; gap: 4px; max-height: 340px; overflow-y: auto; border: 1.5px solid #e0e0ea; border-radius: 12px; padding: 6px; background: #fafafc; }
        .rc-member-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 9px; cursor: pointer; user-select: none; transition: background 0.12s; }
        .rc-member-item:hover { background: #f0f0fa; }
        .rc-member-item--on { background: rgba(102,126,234,0.08); }
        .rc-member-avatar { width: 30px; height: 30px; border-radius: 8px; color: #fff; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .rc-member-info { flex: 1; min-width: 0; }
        .rc-member-name { font-size: 13px; font-weight: 600; color: #1a1a2e; display: block; }
        .rc-member-sub  { font-size: 11.5px; color: #9090b0; display: block; }
        .rc-member-cb { width: 16px; height: 16px; accent-color: #667eea; cursor: pointer; flex-shrink: 0; }
        .rc-grp-empty-msg { font-size: 13px; color: #9090b0; padding: 12px; text-align: center; }

        /* ── Top bar ────────────────────────────────────────────────────── */
        .rc-topbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 28px; background: #fff; border-bottom: 1px solid #e8e8f0; flex-shrink: 0; flex-wrap: wrap; }
        .rc-topbar-left { display: flex; align-items: center; gap: 10px; }
        .rc-topbar-right { display: flex; align-items: center; gap: 10px; }
        .rc-page-title { font-size: 20px; font-weight: 800; color: #1a1a2e; margin: 0; }
        .rc-count-badge { background: rgba(102,126,234,0.12); color: #667eea; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
        .rc-search-wrap { position: relative; display: flex; align-items: center; }
        .rc-search-icon { position: absolute; left: 10px; font-size: 13px; pointer-events: none; }
        .rc-search { border: 1.5px solid #e0e0ea; border-radius: 10px; padding: 8px 32px 8px 32px; font-size: 13px; color: #1a1a2e; background: #fafafc; outline: none; width: 240px; font-family: inherit; transition: border-color 0.15s; }
        .rc-search:focus { border-color: #667eea; background: #fff; }
        .rc-search-clear { position: absolute; right: 8px; background: none; border: none; color: #9090b0; cursor: pointer; font-size: 12px; padding: 2px 4px; }
        .rc-add-btn { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; border-radius: 10px; padding: 9px 20px; font-size: 13.5px; font-weight: 700; cursor: pointer; box-shadow: 0 3px 12px rgba(102,126,234,0.35); transition: opacity 0.15s, transform 0.15s; white-space: nowrap; }
        .rc-add-btn:hover { opacity: 0.9; transform: translateY(-1px); }

        /* ── 2-column layout ────────────────────────────────────────────── */
        .rc-body { flex: 1; display: flex; overflow: hidden; }

        /* Sidebar */
        .rc-sidebar { width: 220px; flex-shrink: 0; border-right: 1px solid #e8e8f0; background: #fafafc; display: flex; flex-direction: column; overflow-y: auto; padding: 14px 10px; gap: 2px; }
        .rc-sidebar-head { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px 10px; }
        .rc-sidebar-title { font-size: 10.5px; font-weight: 800; color: #9090b0; text-transform: uppercase; letter-spacing: 0.8px; }
        .rc-sidebar-add { background: none; border: 1px solid #d0d0e8; border-radius: 7px; color: #667eea; font-size: 16px; line-height: 1; cursor: pointer; padding: 1px 6px; transition: background 0.12s; }
        .rc-sidebar-add:hover { background: rgba(102,126,234,0.1); }
        .rc-sidebar-divider { height: 1px; background: #e8e8f0; margin: 6px 8px; }
        .rc-sidebar-hint { font-size: 12px; color: #b0b0c8; text-align: center; padding: 16px 8px; line-height: 1.5; }

        /* Group items */
        .rc-group-item { width: 100%; display: flex; align-items: center; gap: 7px; padding: 8px 10px; border-radius: 10px; background: none; border: none; cursor: pointer; text-align: left; transition: background 0.12s; position: relative; }
        .rc-group-item:hover { background: #f0f0fa; }
        .rc-group-item:hover .rc-group-actions { opacity: 1; }
        .rc-group-item--active { background: rgba(102,126,234,0.1) !important; }
        .rc-group-item-icon { font-size: 14px; flex-shrink: 0; }
        .rc-group-item-name { font-size: 13px; font-weight: 600; color: #1a1a2e; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .rc-group-item--active .rc-group-item-name { color: #667eea; }
        .rc-group-item-cnt { font-size: 11px; font-weight: 700; color: #9090b0; background: #ececf5; padding: 1px 7px; border-radius: 20px; flex-shrink: 0; }
        .rc-group-item--active .rc-group-item-cnt { background: rgba(102,126,234,0.15); color: #667eea; }
        .rc-group-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.15s; position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: #fafafc; border-radius: 6px; padding: 1px; }
        .rc-group-action-btn { background: none; border: none; cursor: pointer; font-size: 12px; padding: 3px 4px; border-radius: 5px; line-height: 1; }
        .rc-group-action-btn:hover { background: #e8e8f0; }
        .rc-group-action-btn--del:hover { background: rgba(239,68,68,0.1); }

        /* Main area */
        .rc-main { flex: 1; overflow-y: auto; padding: 20px 24px; }
        .rc-active-group-label { display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 700; color: #667eea; margin-bottom: 14px; padding: 8px 14px; background: rgba(102,126,234,0.07); border-radius: 10px; border: 1px solid rgba(102,126,234,0.15); }
        .rc-active-group-cnt { font-size: 12px; font-weight: 600; color: #9090b0; }

        /* Loading / empty */
        .rc-loading { display: flex; align-items: center; justify-content: center; gap: 12px; height: 200px; font-size: 14px; color: #9090b0; }
        .rc-spinner { width: 22px; height: 22px; border: 3px solid #e0e0ea; border-top-color: #667eea; border-radius: 50%; animation: rcSpin 0.7s linear infinite; }
        @keyframes rcSpin { to { transform: rotate(360deg); } }
        .rc-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; min-height: 260px; text-align: center; }
        .rc-empty-icon { font-size: 52px; }
        .rc-empty h3 { font-size: 17px; font-weight: 800; color: #1a1a2e; margin: 0; }
        .rc-empty p  { font-size: 14px; color: #9090b0; margin: 0; }

        /* ── Cards ──────────────────────────────────────────────────────── */
        .rc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .rc-card { background: var(--th-card, #fff); border: 1px solid var(--th-border, #e8e8f0); border-radius: 16px; padding: 16px 16px 12px; display: flex; flex-direction: column; gap: 11px; transition: box-shadow 0.2s, transform 0.2s; }
        .rc-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.09); transform: translateY(-2px); }
        .rc-card-head { display: flex; align-items: flex-start; gap: 11px; }
        .rc-avatar { width: 42px; height: 42px; border-radius: 11px; color: #fff; font-size: 14px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .rc-card-info { flex: 1; min-width: 0; }
        .rc-card-name { font-size: 14.5px; font-weight: 800; color: #1a1a2e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rc-card-sub { font-size: 12px; color: #7070a0; margin-top: 2px; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
        .rc-card-dot { color: #c0c0d8; }
        .rc-card-co { font-weight: 600; color: #667eea; }
        .rc-card-actions { display: flex; gap: 4px; flex-shrink: 0; }
        .rc-icon-btn { background: none; border: 1px solid #e8e8f0; border-radius: 8px; cursor: pointer; padding: 5px 7px; font-size: 12px; line-height: 1; transition: background 0.15s, border-color 0.15s; }
        .rc-icon-btn--edit:hover   { background: rgba(102,126,234,0.08); border-color: rgba(102,126,234,0.3); }
        .rc-icon-btn--del:hover    { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.3); }
        .rc-icon-btn--remove:hover { background: rgba(234,88,12,0.08); border-color: rgba(234,88,12,0.3); color: #ea580c; }

        /* Contacts */
        .rc-card-contacts { display: flex; flex-direction: column; gap: 5px; }
        .rc-contact-row { display: flex; align-items: center; gap: 7px; font-size: 12px; text-decoration: none; color: #4a4a8a; padding: 5px 7px; border-radius: 8px; transition: background 0.15s; }
        .rc-contact-row:hover { background: #f0f0fa; }
        .rc-contact-row--email:hover { color: #667eea; }
        .rc-contact-row--phone:hover { color: #22c55e; }
        .rc-contact-row--li:hover { color: #0284c7; }
        .rc-contact-icon { font-size: 13px; flex-shrink: 0; }
        .rc-contact-val { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
        .rc-li-arrow { font-size: 11px; color: #b0b0c8; }

        /* Notes */
        .rc-card-notes { font-size: 12px; color: #6868a0; line-height: 1.5; background: #fafafc; border-left: 3px solid #e0e0ea; padding: 6px 10px; border-radius: 0 6px 6px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        /* Footer */
        .rc-card-foot { border-top: 1px solid #f0f0f8; padding-top: 9px; }
        .rc-last-contact { font-size: 11px; color: #9090b0; }
        .rc-last-contact strong { color: #667eea; font-weight: 700; }

        @media (max-width: 700px) {
          .rc-body { flex-direction: column; }
          .rc-sidebar { width: 100%; flex-direction: row; overflow-x: auto; overflow-y: hidden; flex-wrap: nowrap; border-right: none; border-bottom: 1px solid #e8e8f0; padding: 8px; gap: 6px; max-height: 64px; }
          .rc-sidebar-head { display: none; }
          .rc-sidebar-hint { display: none; }
          .rc-sidebar-divider { width: 1px; height: auto; margin: 0; }
          .rc-group-item { white-space: nowrap; flex-shrink: 0; width: auto; padding: 6px 12px; }
          .rc-group-actions { display: none; }
          .rc-topbar { flex-direction: column; align-items: flex-start; }
          .rc-topbar-right { width: 100%; flex-wrap: wrap; }
          .rc-search { width: 100%; }
          .rc-form-2col { grid-template-columns: 1fr; }
          .rc-main { padding: 12px; }
        }
      `}</style>
    </div>
  )
}