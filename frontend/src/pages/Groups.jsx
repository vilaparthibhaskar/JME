import { useState, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import api from '../services/api'
import '../styles/Groups.css'

function avatarInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Groups() {
  const { user, token } = useSelector((s) => s.auth)

  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [posts, setPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [postInput, setPostInput] = useState('')
  const [posting, setPosting] = useState(false)

  // Create group
  const [showCreate, setShowCreate] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [creating, setCreating] = useState(false)

  // Add member
  const [showAddMember, setShowAddMember] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberResults, setMemberResults] = useState([])
  const [memberSearching, setMemberSearching] = useState(false)

  // Delete group confirm
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const [message, setMessage] = useState({ text: '', type: '' })
  const feedRef = useRef(null)

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 4000)
  }

  // ── Load groups ────────────────────────────────────────────────────────────
  const loadGroups = async () => {
    try {
      const data = await api.getUserGroups(token)
      setGroups(data)
    } catch (e) {
      showMsg(e.message, 'error')
    }
  }

  useEffect(() => { if (token) loadGroups() }, [token])

  // ── Select group → load posts ──────────────────────────────────────────────
  const selectGroup = async (group) => {
    setSelectedGroup(group)
    setShowAddMember(false)
    setMemberSearch('')
    setMemberResults([])
    setLoadingPosts(true)
    try {
      const data = await api.getGroupPosts(token, group.id)
      setPosts(data)
    } catch (e) {
      showMsg(e.message, 'error')
    } finally {
      setLoadingPosts(false)
    }
  }

  // Scroll feed to bottom when posts load
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [posts])

  // ── Create group ───────────────────────────────────────────────────────────
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) { showMsg('Group name is required', 'error'); return }
    setCreating(true)
    try {
      const g = await api.createUserGroup(token, { name: newGroupName.trim(), description: newGroupDesc.trim() || null })
      setGroups(prev => [g, ...prev])
      setNewGroupName('')
      setNewGroupDesc('')
      setShowCreate(false)
      selectGroup(g)
      showMsg('Group created!')
    } catch (e) {
      showMsg(e.message, 'error')
    } finally {
      setCreating(false)
    }
  }

  // ── Delete group ───────────────────────────────────────────────────────────
  const handleDeleteGroup = async (groupId) => {
    try {
      await api.deleteUserGroup(token, groupId)
      setGroups(prev => prev.filter(g => g.id !== groupId))
      if (selectedGroup?.id === groupId) { setSelectedGroup(null); setPosts([]) }
      setDeleteConfirm(null)
      showMsg('Group deleted')
    } catch (e) {
      showMsg(e.message, 'error')
    }
  }

  // ── Leave group ────────────────────────────────────────────────────────────
  const handleLeave = async (groupId) => {
    try {
      await api.leaveGroup(token, groupId)
      setGroups(prev => prev.filter(g => g.id !== groupId))
      if (selectedGroup?.id === groupId) { setSelectedGroup(null); setPosts([]) }
      showMsg('Left the group')
    } catch (e) {
      showMsg(e.message, 'error')
    }
  }

  // ── Member search ──────────────────────────────────────────────────────────
  const handleMemberSearch = async (q) => {
    setMemberSearch(q)
    if (!q.trim()) { setMemberResults([]); return }
    setMemberSearching(true)
    try {
      const results = await api.searchUsers(token, q)
      // Exclude already-members
      const memberIds = new Set((selectedGroup?.members || []).map(m => m.id))
      setMemberResults(results.filter(u => !memberIds.has(u.id)))
    } catch {
      setMemberResults([])
    } finally {
      setMemberSearching(false)
    }
  }

  const handleAddMember = async (targetUser) => {
    try {
      const updated = await api.addGroupMember(token, selectedGroup.id, targetUser.id)
      setGroups(prev => prev.map(g => g.id === updated.id ? updated : g))
      setSelectedGroup(updated)
      setMemberResults(prev => prev.filter(u => u.id !== targetUser.id))
      showMsg(`${targetUser.full_name || targetUser.username} added!`)
    } catch (e) {
      showMsg(e.message, 'error')
    }
  }

  const handleRemoveMember = async (targetUserId) => {
    try {
      const updated = await api.removeGroupMember(token, selectedGroup.id, targetUserId)
      setGroups(prev => prev.map(g => g.id === updated.id ? updated : g))
      setSelectedGroup(updated)
      showMsg('Member removed')
    } catch (e) {
      showMsg(e.message, 'error')
    }
  }

  // ── Post message ───────────────────────────────────────────────────────────
  const handlePost = async () => {
    if (!postInput.trim() || !selectedGroup) return
    setPosting(true)
    try {
      const p = await api.createGroupPost(token, selectedGroup.id, postInput.trim())
      setPosts(prev => [...prev, p])
      setPostInput('')
    } catch (e) {
      showMsg(e.message, 'error')
    } finally {
      setPosting(false)
    }
  }

  const handleDeletePost = async (postId) => {
    try {
      await api.deleteGroupPost(token, selectedGroup.id, postId)
      setPosts(prev => prev.filter(p => p.id !== postId))
    } catch (e) {
      showMsg(e.message, 'error')
    }
  }

  const handlePostKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handlePost()
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="groups-page">
      {message.text && (
        <div className={`groups-msg groups-msg--${message.type}`}>{message.text}</div>
      )}

      <div className="groups-layout">

        {/* ── LEFT 1/3: Groups sidebar ── */}
        <div className="groups-sidebar">
          <div className="groups-sidebar-header">
            <h2 className="groups-sidebar-title">💬 Groups</h2>
            <button className="groups-new-btn" onClick={() => setShowCreate(s => !s)}>
              {showCreate ? '✕' : '+ New'}
            </button>
          </div>

          {showCreate && (
            <div className="groups-create-form">
              <input
                className="groups-input"
                placeholder="Group name *"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateGroup()}
              />
              <input
                className="groups-input"
                placeholder="Description (optional)"
                value={newGroupDesc}
                onChange={e => setNewGroupDesc(e.target.value)}
              />
              <button
                className="groups-btn groups-btn--primary"
                onClick={handleCreateGroup}
                disabled={creating}
              >
                {creating ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          )}

          <div className="groups-list">
            {groups.length === 0 && (
              <p className="groups-empty">No groups yet. Create one!</p>
            )}
            {groups.map(g => (
              <div
                key={g.id}
                className={`groups-list-item${selectedGroup?.id === g.id ? ' active' : ''}`}
                onClick={() => selectGroup(g)}
              >
                <div className="gli-avatar">{avatarInitials(g.name)}</div>
                <div className="gli-info">
                  <span className="gli-name">{g.name}</span>
                  <span className="gli-meta">
                    {g.member_count} member{g.member_count !== 1 ? 's' : ''}
                    {g.is_admin && <span className="gli-admin-badge">Admin</span>}
                  </span>
                </div>
                <div className="gli-actions" onClick={e => e.stopPropagation()}>
                  {g.is_admin ? (
                    deleteConfirm === g.id ? (
                      <>
                        <button className="gli-action-btn gli-confirm" onClick={() => handleDeleteGroup(g.id)}>Yes</button>
                        <button className="gli-action-btn gli-cancel" onClick={() => setDeleteConfirm(null)}>No</button>
                      </>
                    ) : (
                      <button className="gli-action-btn gli-delete" onClick={() => setDeleteConfirm(g.id)} title="Delete group">🗑</button>
                    )
                  ) : (
                    <button className="gli-action-btn gli-leave" onClick={() => handleLeave(g.id)} title="Leave group">↩</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT 2/3: Feed ── */}
        <div className="groups-feed-panel">
          {!selectedGroup ? (
            <div className="groups-no-selection">
              <div className="groups-no-selection-icon">💬</div>
              <h3>Select a group to view messages</h3>
              <p>Create a group or select one from the left to start collaborating.</p>
            </div>
          ) : (
            <>
              {/* Group header */}
              <div className="groups-feed-header">
                <div className="gfh-left">
                  <div className="gfh-avatar">{avatarInitials(selectedGroup.name)}</div>
                  <div>
                    <h3 className="gfh-name">{selectedGroup.name}</h3>
                    {selectedGroup.description && (
                      <p className="gfh-desc">{selectedGroup.description}</p>
                    )}
                  </div>
                </div>

                <div className="gfh-right">
                  {/* Members chips */}
                  <div className="gfh-members">
                    {selectedGroup.members.map(m => (
                      <div key={m.id} className="member-chip" title={m.full_name || m.username}>
                        <span className="member-chip-avatar">{avatarInitials(m.full_name || m.username)}</span>
                        <span className="member-chip-name">{m.full_name || m.username}</span>
                        {selectedGroup.is_admin && m.id !== user?.id && (
                          <button
                            className="member-chip-remove"
                            onClick={() => handleRemoveMember(m.id)}
                            title="Remove member"
                          >✕</button>
                        )}
                        {m.id === selectedGroup.admin_id && (
                          <span className="member-chip-crown" title="Admin">👑</span>
                        )}
                      </div>
                    ))}
                    {selectedGroup.is_admin && (
                      <button
                        className={`add-member-btn${showAddMember ? ' active' : ''}`}
                        onClick={() => setShowAddMember(s => !s)}
                      >+ Add</button>
                    )}
                  </div>

                  {/* Add member search */}
                  {showAddMember && selectedGroup.is_admin && (
                    <div className="add-member-search">
                      <input
                        className="groups-input"
                        placeholder="Search by username..."
                        value={memberSearch}
                        onChange={e => handleMemberSearch(e.target.value)}
                        autoFocus
                      />
                      {memberSearching && <p className="member-searching">Searching...</p>}
                      {memberResults.length > 0 && (
                        <div className="member-results">
                          {memberResults.map(u => (
                            <div key={u.id} className="member-result-item">
                              <span className="mr-avatar">{avatarInitials(u.full_name || u.username)}</span>
                              <span className="mr-name">{u.full_name || u.username}</span>
                              <span className="mr-username">@{u.username}</span>
                              <button className="mr-add-btn" onClick={() => handleAddMember(u)}>Add</button>
                            </div>
                          ))}
                        </div>
                      )}
                      {!memberSearching && memberSearch.trim() && memberResults.length === 0 && (
                        <p className="member-no-results">No users found</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Feed */}
              <div className="groups-feed" ref={feedRef}>
                {loadingPosts && <p className="feed-loading">Loading messages...</p>}
                {!loadingPosts && posts.length === 0 && (
                  <div className="feed-empty">
                    <p>No messages yet. Be the first to post!</p>
                  </div>
                )}
                {posts.map(p => {
                  const isOwn = p.user_id === user?.id
                  const canDelete = isOwn || selectedGroup.is_admin
                  return (
                    <div key={p.id} className={`feed-post${isOwn ? ' feed-post--own' : ''}`}>
                      <div className="fp-avatar">{avatarInitials(p.author_full_name)}</div>
                      <div className="fp-body">
                        <div className="fp-meta">
                          <span className="fp-author">{p.author_full_name}</span>
                          <span className="fp-time">{formatTime(p.created_at)}</span>
                          {canDelete && (
                            <button className="fp-delete" onClick={() => handleDeletePost(p.id)} title="Delete">🗑</button>
                          )}
                        </div>
                        <div className="fp-content">{p.content}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Post input */}
              <div className="groups-post-bar">
                <textarea
                  className="groups-post-input"
                  placeholder="Write a message... (Enter to send, Shift+Enter for new line)"
                  value={postInput}
                  onChange={e => setPostInput(e.target.value)}
                  onKeyDown={handlePostKeyDown}
                  rows={2}
                />
                <button
                  className="groups-btn groups-btn--send"
                  onClick={handlePost}
                  disabled={posting || !postInput.trim()}
                >
                  {posting ? '...' : '➤'}
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
