import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import api from '../services/api'
import '../styles/Companies.css'

function prettyDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

function getInitials(name = '') {
  return (name || '?').trim().slice(0, 1).toUpperCase()
}

function randomLightColor() {
  const r = 220 + Math.floor(Math.random() * 26)
  const g = 226 + Math.floor(Math.random() * 24)
  const b = 220 + Math.floor(Math.random() * 26)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function parseHex(hex) {
  const v = (hex || '').trim()
  const m = /^#([0-9a-fA-F]{6})$/.exec(v)
  if (!m) return null
  const n = m[1]
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  }
}

function darkAccentFromCardColor(cardColor) {
  const parsed = parseHex(cardColor)
  if (!parsed) return '#1f2937'
  const dark = (x) => Math.max(18, Math.round(x * 0.48))
  const r = dark(parsed.r)
  const g = dark(parsed.g)
  const b = dark(parsed.b)
  return `rgb(${r}, ${g}, ${b})`
}

function fallbackColorForCompany(c) {
  const key = `${c?.id || ''}-${c?.name || ''}`
  let hash = 0
  for (let i = 0; i < key.length; i += 1) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i)
    hash |= 0
  }
  const base = Math.abs(hash)
  const r = 220 + (base % 24)
  const g = 226 + ((base >> 3) % 20)
  const b = 220 + ((base >> 6) % 24)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export default function Companies() {
  const { token } = useSelector((s) => s.auth)
  const [rows, setRows] = useState([])
  const [groups, setGroups] = useState([])
  const [activeGroup, setActiveGroup] = useState(null)
  const [name, setName] = useState('')
  const [applyUrl, setApplyUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [groupName, setGroupName] = useState('')
  const [groupMembers, setGroupMembers] = useState([])
  const [groupSaving, setGroupSaving] = useState(false)
  const [groupError, setGroupError] = useState('')
  const [deletingGroupId, setDeletingGroupId] = useState(null)
  const [showAddToGroup, setShowAddToGroup] = useState(false)
  const [addToGroupMembers, setAddToGroupMembers] = useState([])
  const [addToGroupSaving, setAddToGroupSaving] = useState(false)
  const [addToGroupError, setAddToGroupError] = useState('')
  const groupNameRef = useRef(null)

  const loadCompanies = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const [data, grpData] = await Promise.all([
        api.getTrackedCompanies(token),
        api.getTrackedCompanyGroups(token),
      ])
      setRows(data)
      setGroups(grpData)
    } catch (e) {
      setError(e.message || 'Failed to load companies')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadCompanies() }, [loadCompanies])

  useEffect(() => {
    if (showGroupForm) {
      setTimeout(() => groupNameRef.current?.focus(), 60)
    }
  }, [showGroupForm])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!name.trim() || !applyUrl.trim()) {
      setError('Company name and apply URL are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const cardColor = randomLightColor()
      const created = await api.createTrackedCompany(token, {
        name: name.trim(),
        apply_url: applyUrl.trim(),
        card_color: cardColor,
      })
      setRows(prev => [created, ...prev])
      setName('')
      setApplyUrl('')
    } catch (e2) {
      setError(e2.message || 'Failed to add company')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    setDeletingId(id)
    setError('')
    try {
      await api.deleteTrackedCompany(token, id)
      setRows(prev => prev.filter(r => r.id !== id))
      setGroups(prev => prev.map(g => ({
        ...g,
        member_ids: (g.member_ids || []).filter(mid => mid !== id),
      })))
    } catch (e) {
      setError(e.message || 'Failed to delete company')
    } finally {
      setDeletingId(null)
    }
  }

  const openCreateGroup = () => {
    setEditingGroup(null)
    setGroupName('')
    setGroupMembers([])
    setGroupError('')
    setShowGroupForm(true)
  }

  const openEditGroup = (g) => {
    setEditingGroup(g)
    setGroupName(g.name || '')
    setGroupMembers([...(g.member_ids || [])])
    setGroupError('')
    setShowGroupForm(true)
  }

  const toggleMember = (id) => {
    setGroupMembers(prev => prev.includes(id)
      ? prev.filter(x => x !== id)
      : [...prev, id]
    )
  }

  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      setGroupError('Group name is required')
      return
    }
    setGroupSaving(true)
    setGroupError('')
    try {
      const payload = { name: groupName.trim(), member_ids: groupMembers }
      if (editingGroup) {
        const updated = await api.updateTrackedCompanyGroup(token, editingGroup.id, payload)
        setGroups(prev => prev.map(g => g.id === editingGroup.id ? updated : g))
      } else {
        const created = await api.createTrackedCompanyGroup(token, payload)
        setGroups(prev => [...prev, created])
      }
      setShowGroupForm(false)
    } catch (e) {
      setGroupError(e.message || 'Failed to save group')
    } finally {
      setGroupSaving(false)
    }
  }

  const handleDeleteGroup = async (id) => {
    setDeletingGroupId(id)
    try {
      await api.deleteTrackedCompanyGroup(token, id)
      setGroups(prev => prev.filter(g => g.id !== id))
      if (activeGroup === id) setActiveGroup(null)
    } catch (e) {
      setError(e.message || 'Failed to delete group')
    } finally {
      setDeletingGroupId(null)
    }
  }

  const openAddToGroup = () => {
    if (activeGroup === null) return
    const grp = groups.find(g => g.id === activeGroup)
    setAddToGroupMembers([...(grp?.member_ids || [])])
    setAddToGroupError('')
    setShowAddToGroup(true)
  }

  const toggleAddToGroupMember = (id) => {
    setAddToGroupMembers(prev => prev.includes(id)
      ? prev.filter(x => x !== id)
      : [...prev, id]
    )
  }

  const saveAddToGroup = async () => {
    if (activeGroup === null) return
    setAddToGroupSaving(true)
    setAddToGroupError('')
    try {
      const updated = await api.updateTrackedCompanyGroup(token, activeGroup, { member_ids: addToGroupMembers })
      setGroups(prev => prev.map(g => g.id === activeGroup ? updated : g))
      setShowAddToGroup(false)
    } catch (e) {
      setAddToGroupError(e.message || 'Failed to update group members')
    } finally {
      setAddToGroupSaving(false)
    }
  }

  const removeCompanyFromGroup = async (companyId) => {
    if (activeGroup === null) return
    const grp = groups.find(g => g.id === activeGroup)
    if (!grp) return
    const member_ids = (grp.member_ids || []).filter(id => id !== companyId)
    try {
      const updated = await api.updateTrackedCompanyGroup(token, grp.id, { member_ids })
      setGroups(prev => prev.map(g => g.id === grp.id ? updated : g))
    } catch (e) {
      setError(e.message || 'Failed to update group')
    }
  }

  const filteredRows = useMemo(() => {
    if (activeGroup === null) return rows
    const grp = groups.find(g => g.id === activeGroup)
    const ids = new Set(grp?.member_ids || [])
    return rows.filter(r => ids.has(r.id))
  }, [rows, groups, activeGroup])

  const countLabel = useMemo(() => `${rows.length} tracked`, [rows.length])

  return (
    <div className="companies-container">
      <div className="companies-header">
        <div>
          <h1 className="companies-title">My Companies</h1>
          <p className="companies-subtitle">
            Independent, user-specific company list
            <span className="companies-count-pill">{countLabel}</span>
          </p>
        </div>
      </div>

      {showGroupForm && (
        <div className="companies-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowGroupForm(false) }}>
          <div className="companies-modal">
            <div className="companies-modal-head">
              <h3>{editingGroup ? 'Edit Company Group' : 'Create Company Group'}</h3>
              <button className="companies-close" onClick={() => setShowGroupForm(false)}>✕</button>
            </div>
            <div className="companies-modal-body">
              <label className="companies-label">Group Name</label>
              <input
                ref={groupNameRef}
                className="companies-input"
                placeholder="e.g. Dream Companies"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
              <label className="companies-label">Members ({groupMembers.length} selected)</label>
              <div className="companies-member-list">
                {rows.length === 0 ? (
                  <div className="companies-empty-small">No companies available to add yet.</div>
                ) : rows.map(c => {
                  const on = groupMembers.includes(c.id)
                  return (
                    <label key={c.id} className={`companies-member-item${on ? ' companies-member-item--on' : ''}`}>
                      <input type="checkbox" checked={on} onChange={() => toggleMember(c.id)} />
                      <div className="companies-member-avatar">{getInitials(c.name)}</div>
                      <div className="companies-member-meta">
                        <span className="companies-member-name">{c.name}</span>
                        <span className="companies-member-sub">{prettyDomain(c.apply_url)}</span>
                      </div>
                    </label>
                  )
                })}
              </div>
              {groupError && <div className="companies-error">{groupError}</div>}
            </div>
            <div className="companies-modal-actions">
              <button className="companies-add-btn" onClick={handleSaveGroup} disabled={groupSaving}>
                {groupSaving ? 'Saving...' : editingGroup ? 'Save Group' : 'Create Group'}
              </button>
              <button className="companies-ghost-btn" onClick={() => setShowGroupForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showAddToGroup && activeGroup !== null && (
        <div className="companies-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddToGroup(false) }}>
          <div className="companies-modal">
            <div className="companies-modal-head">
              <h3>Add Companies To Group</h3>
              <button className="companies-close" onClick={() => setShowAddToGroup(false)}>✕</button>
            </div>
            <div className="companies-modal-body">
              <label className="companies-label">
                Group: {groups.find(g => g.id === activeGroup)?.name || 'Selected Group'}
              </label>
              <label className="companies-label">Members ({addToGroupMembers.length} selected)</label>
              <div className="companies-member-list">
                {rows.length === 0 ? (
                  <div className="companies-empty-small">No companies available.</div>
                ) : rows.map(c => {
                  const on = addToGroupMembers.includes(c.id)
                  return (
                    <label key={c.id} className={`companies-member-item${on ? ' companies-member-item--on' : ''}`}>
                      <input type="checkbox" checked={on} onChange={() => toggleAddToGroupMember(c.id)} />
                      <div className="companies-member-avatar">{getInitials(c.name)}</div>
                      <div className="companies-member-meta">
                        <span className="companies-member-name">{c.name}</span>
                        <span className="companies-member-sub">{prettyDomain(c.apply_url)}</span>
                      </div>
                    </label>
                  )
                })}
              </div>
              {addToGroupError && <div className="companies-error">{addToGroupError}</div>}
            </div>
            <div className="companies-modal-actions">
              <button className="companies-add-btn" onClick={saveAddToGroup} disabled={addToGroupSaving}>
                {addToGroupSaving ? 'Saving...' : 'Save Members'}
              </button>
              <button className="companies-ghost-btn" onClick={() => setShowAddToGroup(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="companies-body">
        <aside className="companies-sidebar">
          <div className="companies-sidebar-head">
            <span>Groups</span>
            <button className="companies-sidebar-add" onClick={openCreateGroup}>＋</button>
          </div>

          <div
            className={`companies-group-item${activeGroup === null ? ' companies-group-item--active' : ''}`}
            onClick={() => setActiveGroup(null)}
          >
            <span className="companies-group-icon">🏢</span>
            <span className="companies-group-name">All Companies</span>
            <span className="companies-group-count">{rows.length}</span>
          </div>

          {groups.length > 0 && <div className="companies-sidebar-divider" />}

          {groups.map(g => (
            <div
              key={g.id}
              className={`companies-group-item${activeGroup === g.id ? ' companies-group-item--active' : ''}`}
              onClick={() => setActiveGroup(g.id)}
            >
              <span className="companies-group-icon">🗂️</span>
              <button className="companies-group-main">
                <span className="companies-group-name">{g.name}</span>
                <span className="companies-group-count">{(g.member_ids || []).length}</span>
              </button>
              <div className="companies-group-actions" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => openEditGroup(g)} title="Edit">✏️</button>
                <button onClick={() => handleDeleteGroup(g.id)} disabled={deletingGroupId === g.id} title="Delete">🗑️</button>
              </div>
            </div>
          ))}

          {groups.length === 0 && (
            <div className="companies-sidebar-hint">No groups yet.<br />Create one to organize companies.</div>
          )}
        </aside>

        <main className="companies-main">
      {activeGroup === null ? (
      <form className="companies-form" onSubmit={handleAdd}>
        <div className="companies-form-grid">
          <input
            className="companies-input"
            placeholder="Company name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="companies-input"
            placeholder="Apply URL (https://...)"
            value={applyUrl}
            onChange={(e) => setApplyUrl(e.target.value)}
          />
          <button className="companies-add-btn" type="submit" disabled={saving}>
            {saving ? 'Adding...' : 'Add Company'}
          </button>
        </div>
        {error && <div className="companies-error">{error}</div>}
      </form>
      ) : (
      <div className="companies-form companies-group-toolbar">
        <div className="companies-group-toolbar-left">
          <strong>{groups.find(g => g.id === activeGroup)?.name}</strong>
          <span>Manage companies in this group</span>
        </div>
        <button type="button" className="companies-add-btn" onClick={openAddToGroup}>
          Add To Group
        </button>
      </div>
      )}

      {loading ? (
        <div className="companies-empty">Loading companies...</div>
      ) : filteredRows.length === 0 ? (
        <div className="companies-empty">No companies yet. Add your first company above.</div>
      ) : (
        <div className="companies-grid">
          {filteredRows.map((c) => {
            const cardBg = c.card_color || fallbackColorForCompany(c)
            return (
            <div
              key={c.id}
              className="company-card"
              style={{
                '--card-bg': cardBg,
                '--accent-dark': darkAccentFromCardColor(cardBg),
              }}
            >
              <div className="company-card-top">
                <div className="company-logo-wrap">
                  <span className="company-initial">{(c.name || '?').charAt(0).toUpperCase()}</span>
                </div>
                <div className="company-info">
                  <h2 className="company-name">{c.name}</h2>
                  <span className="company-hq">{prettyDomain(c.apply_url)}</span>
                </div>
              </div>


              <div className="company-actions">
                <a href={c.apply_url} target="_blank" rel="noopener noreferrer" className="company-btn company-btn--primary">
                  Apply ↗
                </a>
                <button
                  type="button"
                  className="company-btn company-btn--danger"
                  onClick={() => handleDelete(c.id)}
                  disabled={deletingId === c.id}
                >
                  {deletingId === c.id ? 'Deleting...' : 'Delete'}
                </button>
                {activeGroup !== null && (
                  <button
                    type="button"
                    className="company-btn company-btn--secondary"
                    onClick={() => removeCompanyFromGroup(c.id)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          )})}
        </div>
      )}
        </main>
      </div>
    </div>
  )
}
