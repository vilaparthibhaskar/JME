import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import api from '../services/api'
import '../styles/Versions.css'

const EMPTY_FORM = {
  name: '',
  projects: [],      // [{ TITLE, TECH, POINTS, _input }]
  education: '',
  cgpa: '',
  edu_timeline: '',
  hobbies: [],       // array of strings
  achievements: [],
  base_exp_json: '',
  resume_title: '',
  resume_name_displayed: '',
  user_location: '',
  user_email: '',
  github: '',
  linkedin: '',
  phone_number: '',
  leetcode: '',
  skills: [],        // [{ SKILL_NAME, SKILLS }]
  _hobbies_input: '',
  _achievement_input: '',
}

export default function Versions() {
  const { token } = useSelector((state) => state.auth)
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 4000)
  }

  const loadVersions = async () => {
    setLoading(true)
    try {
      const data = await api.getVersions(token)
      setVersions(data)
    } catch (error) {
      showMessage(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadVersions() }, [])

  const setField = (field, value) =>
    setFormData(prev => ({ ...prev, [field]: value }))

  // ── Project helpers ────────────────────────────────────────────────────────
  const addProject = () =>
    setFormData(prev => ({
      ...prev,
      projects: [...prev.projects, { TITLE: '', TECH: '', POINTS: [], _input: '' }],
    }))

  const removeProject = (i) =>
    setFormData(prev => ({
      ...prev,
      projects: prev.projects.filter((_, idx) => idx !== i),
    }))

  const setProjField = (i, field, value) =>
    setFormData(prev => {
      const updated = [...prev.projects]
      updated[i] = { ...updated[i], [field]: value }
      return { ...prev, projects: updated }
    })

  const addProjPoint = (i) => {
    const val = (formData.projects[i]?._input || '').trim()
    if (!val) return
    setFormData(prev => {
      const updated = [...prev.projects]
      updated[i] = { ...updated[i], POINTS: [...(updated[i].POINTS || []), val], _input: '' }
      return { ...prev, projects: updated }
    })
  }

  const removeProjPoint = (i, pi) =>
    setFormData(prev => {
      const updated = [...prev.projects]
      updated[i] = { ...updated[i], POINTS: updated[i].POINTS.filter((_, idx) => idx !== pi) }
      return { ...prev, projects: updated }
    })

  // ── Hobbies helpers ────────────────────────────────────────────────────────
  const addHobby = () => {
    const val = (formData._hobbies_input || '').trim()
    if (!val) return
    setFormData(prev => ({
      ...prev,
      hobbies: [...(prev.hobbies || []), val],
      _hobbies_input: '',
    }))
  }

  const removeHobby = (i) =>
    setFormData(prev => ({
      ...prev,
      hobbies: prev.hobbies.filter((_, idx) => idx !== i),
    }))

  // ── Achievement helpers ────────────────────────────────────────────────────
  const addAchievement = () => {
    const val = (formData._achievement_input || '').trim()
    if (!val) return
    setFormData(prev => ({
      ...prev,
      achievements: [...(prev.achievements || []), val],
      _achievement_input: '',
    }))
  }

  const removeAchievement = (i) =>
    setFormData(prev => ({
      ...prev,
      achievements: prev.achievements.filter((_, idx) => idx !== i),
    }))

  // ── Skills helpers ─────────────────────────────────────────────────────────
  const addSkill = () =>
    setFormData(prev => ({
      ...prev,
      skills: [...(prev.skills || []), { SKILL_NAME: '', SKILLS: '' }],
    }))

  const removeSkill = (i) =>
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, idx) => idx !== i),
    }))

  const setSkillField = (i, field, value) =>
    setFormData(prev => {
      const updated = [...prev.skills]
      updated[i] = { ...updated[i], [field]: value }
      return { ...prev, skills: updated }
    })

  // ── Open / Close ───────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null)
    setFormData(EMPTY_FORM)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openEdit = (version) => {
    setEditingId(version.id)
    setFormData({
      name: version.name || '',
      projects: (version.projects || []).map(p => ({ ...p, _input: '' })),
      education: version.education || '',
      cgpa: version.cgpa || '',
      edu_timeline: version.edu_timeline || '',
      hobbies: version.hobbies || [],
      achievements: version.achievements || [],
      base_exp_json: version.base_exp_json || '',
      resume_title: version.resume_title || '',
      resume_name_displayed: version.resume_name_displayed || '',
      user_location: version.user_location || '',
      user_email: version.user_email || '',
      github: version.github || '',
      linkedin: version.linkedin || '',
      phone_number: version.phone_number || '',
      leetcode: version.leetcode || '',
      skills: (version.skills || []),
      _hobbies_input: '',
      _achievement_input: '',
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!formData.name.trim()) {
      showMessage('Version name is required', 'error')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: formData.name,
        projects: (formData.projects || [])
          .filter(p => (p.TITLE || '').trim())
          .map(({ _input, ...p }) => p),  // eslint-disable-line no-unused-vars
        education: formData.education || null,
        cgpa: formData.cgpa || null,
        edu_timeline: formData.edu_timeline || null,
        hobbies: (formData.hobbies || []).length ? formData.hobbies : null,
        achievements: (formData.achievements || []).length ? formData.achievements : null,
        base_exp_json: formData.base_exp_json?.trim() || null,
        resume_title: formData.resume_title?.trim() || null,
        resume_name_displayed: formData.resume_name_displayed?.trim() || null,
        user_location: formData.user_location?.trim() || null,
        user_email: formData.user_email?.trim() || null,
        github: formData.github?.trim() || null,
        linkedin: formData.linkedin?.trim() || null,
        phone_number: formData.phone_number?.trim() || null,
        leetcode: formData.leetcode?.trim() || null,
        skills: (formData.skills || []).filter(s => (s.SKILL_NAME || '').trim()).length
          ? (formData.skills || []).filter(s => (s.SKILL_NAME || '').trim())
          : null,
      }
      if (editingId) {
        await api.updateVersion(token, editingId, payload)
        showMessage('Version updated successfully!')
      } else {
        await api.createVersion(token, payload)
        showMessage('Version created successfully!')
      }
      setShowForm(false)
      loadVersions()
    } catch (error) {
      showMessage(error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.deleteVersion(token, id)
      showMessage('Version deleted successfully!')
      setDeleteConfirm(null)
      loadVersions()
    } catch (error) {
      showMessage(error.message, 'error')
    }
  }

  // ── StringList ─────────────────────────────────────────────────────────────
  const StringList = ({ items, inputField, onAdd, onRemove, placeholder }) => (
    <div className="points-section">
      <div className="points-input-row">
        <input
          className="v-input"
          placeholder={placeholder}
          value={formData[inputField] || ''}
          onChange={(e) => setField(inputField, e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAdd())}
        />
        <button className="add-point-btn" type="button" onClick={onAdd}>+ Add</button>
      </div>
      {(items || []).length > 0 && (
        <div className="points-tags">
          {(items || []).map((item, i) => (
            <div key={i} className="point-tag">
              <span>{item}</span>
              <button type="button" onClick={() => onRemove(i)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="versions-container">
      <div className="versions-header">
        <div>
          <h1>📋 Resume Versions</h1>
          <p>Manage projects, education, and hobbies profiles for your resume</p>
        </div>
        {!showForm && (
          <button className="create-version-btn" onClick={openCreate}>➕ New Version</button>
        )}
      </div>

      {message.text && (
        <div className={`message-alert ${message.type}`}>{message.text}</div>
      )}

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="version-form-card">
          <div className="form-card-header">
            <h2>{editingId ? '✏️ Edit Version' : '➕ Create New Version'}</h2>
            <button className="close-form-btn" onClick={() => setShowForm(false)}>✕</button>
          </div>

          {/* Version Name */}
          <div className="form-section">
            <div className="section-title">📝 Version Name</div>
            <input
              className="v-input full-width"
              type="text"
              placeholder="e.g., Software Engineer v2, Internship Resume"
              value={formData.name}
              onChange={(e) => setField('name', e.target.value)}
            />
          </div>

          {/* Personal Info */}
          <div className="form-section">
            <div className="section-title">👤 Personal / Contact Info</div>
            <input className="v-input full-width" placeholder="Resume Title (e.g., Full Stack Developer)"
              value={formData.resume_title || ''}
              onChange={(e) => setField('resume_title', e.target.value)} />
            <div className="labeled-row two-col" style={{ marginTop: 10 }}>
              <input className="v-input" placeholder="Displayed Name (e.g., John Doe)"
                value={formData.resume_name_displayed || ''}
                onChange={(e) => setField('resume_name_displayed', e.target.value)} />
              <input className="v-input" placeholder="Location (e.g., New York, NY)"
                value={formData.user_location || ''}
                onChange={(e) => setField('user_location', e.target.value)} />
            </div>
            <div className="labeled-row two-col" style={{ marginTop: 10 }}>
              <input className="v-input" placeholder="Email"
                value={formData.user_email || ''}
                onChange={(e) => setField('user_email', e.target.value)} />
              <input className="v-input" placeholder="Phone Number"
                value={formData.phone_number || ''}
                onChange={(e) => setField('phone_number', e.target.value)} />
            </div>
            <div className="labeled-row two-col" style={{ marginTop: 10 }}>
              <input className="v-input" placeholder="GitHub URL or username"
                value={formData.github || ''}
                onChange={(e) => setField('github', e.target.value)} />
              <input className="v-input" placeholder="LinkedIn URL or username"
                value={formData.linkedin || ''}
                onChange={(e) => setField('linkedin', e.target.value)} />
            </div>
            <div className="labeled-row two-col" style={{ marginTop: 10 }}>
              <input className="v-input" placeholder="LeetCode URL or username"
                value={formData.leetcode || ''}
                onChange={(e) => setField('leetcode', e.target.value)} />
              <div /> {/* spacer */}
            </div>
          </div>

          {/* Skills */}
          <div className="form-section">
            <div className="section-title-row">
              <div className="section-title">🛠️ Skills</div>
              <button className="add-item-btn" type="button" onClick={addSkill}>+ Add Skill Row</button>
            </div>
            {(formData.skills || []).length === 0 && (
              <p className="empty-hint">No skill rows yet. Click &quot;+ Add Skill Row&quot; to begin.</p>
            )}
            {(formData.skills || []).map((skill, i) => (
              <div key={i} className="dynamic-item-block project-block">
                <div className="dynamic-item-header">
                  <span className="item-label">SKILL {i + 1}</span>
                  <button className="remove-item-btn" type="button" onClick={() => removeSkill(i)}>✕ Remove</button>
                </div>
                <div className="labeled-row two-col">
                  <input className="v-input" placeholder="Skill Category (e.g., Languages)"
                    value={skill.SKILL_NAME || ''}
                    onChange={(e) => setSkillField(i, 'SKILL_NAME', e.target.value)} />
                  <input className="v-input" placeholder="Skills (e.g., Python, JavaScript, C++)"
                    value={skill.SKILLS || ''}
                    onChange={(e) => setSkillField(i, 'SKILLS', e.target.value)} />
                </div>
              </div>
            ))}
          </div>
          <div className="form-section">
            <div className="section-title-row">
              <div className="section-title">🚀 Projects</div>
              <button className="add-item-btn" type="button" onClick={addProject}>+ Add Project</button>
            </div>
            {(formData.projects || []).length === 0 && (
              <p className="empty-hint">No projects yet. Click &quot;+ Add Project&quot; to begin.</p>
            )}
            {(formData.projects || []).map((proj, i) => (
              <div key={i} className="dynamic-item-block project-block">
                <div className="dynamic-item-header">
                  <span className="item-label">PROJ {i + 1}</span>
                  <button className="remove-item-btn" type="button" onClick={() => removeProject(i)}>✕ Remove</button>
                </div>
                <div className="labeled-row">
                  <input className="v-input" placeholder="Project Title"
                    value={proj.TITLE || ''}
                    onChange={(e) => setProjField(i, 'TITLE', e.target.value)} />
                  <input className="v-input" placeholder="Technologies Used (TECH)"
                    value={proj.TECH || ''}
                    onChange={(e) => setProjField(i, 'TECH', e.target.value)} />
                </div>
                <div className="indented">
                  <div className="points-section">
                    <div className="points-input-row">
                      <input className="v-input"
                        placeholder={`Bullet point for ${proj.TITLE || 'Project ' + (i + 1)}...`}
                        value={proj._input || ''}
                        onChange={(e) => setProjField(i, '_input', e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addProjPoint(i))} />
                      <button className="add-point-btn" type="button" onClick={() => addProjPoint(i)}>+ Add</button>
                    </div>
                    {(proj.POINTS || []).length > 0 && (
                      <div className="points-tags">
                        {proj.POINTS.map((pt, pi) => (
                          <div key={pi} className="point-tag">
                            <span>{pt}</span>
                            <button type="button" onClick={() => removeProjPoint(i, pi)}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Education */}
          <div className="form-section">
            <div className="section-title">🎓 Education</div>
            <input
              className="v-input full-width"
              placeholder="e.g., Master of Science in Computer Science, University Name"
              value={formData.education || ''}
              onChange={(e) => setField('education', e.target.value)}
            />
            <div className="labeled-row two-col" style={{ marginTop: 10 }}>
              <input className="v-input" placeholder="CGPA (e.g., 4.0)"
                value={formData.cgpa || ''}
                onChange={(e) => setField('cgpa', e.target.value)} />
              <input className="v-input" placeholder="Timeline (e.g., Aug 2023 \u2013 May 2025)"
                value={formData.edu_timeline || ''}
                onChange={(e) => setField('edu_timeline', e.target.value)} />
            </div>
          </div>

          {/* Hobbies */}
          <div className="form-section">
            <div className="section-title">🎯 Hobbies / Interests</div>
            <StringList
              items={formData.hobbies}
              inputField="_hobbies_input"
              onAdd={addHobby}
              onRemove={removeHobby}
              placeholder="e.g., Solved 700+ problems on LeetCode..."
            />
          </div>

          {/* Achievements */}
          <div className="form-section">
            <div className="section-title">🏆 Achievements</div>
            <StringList
              items={formData.achievements}
              inputField="_achievement_input"
              onAdd={addAchievement}
              onRemove={removeAchievement}
              placeholder="Add an achievement..."
            />
          </div>

          {/* Base Experience JSON */}
          <div className="form-section">
            <div className="section-title">💼 Base Experience JSON</div>
            <p className="section-hint">Paste the experience JSON for this version. Used on the Resume page to generate DOCX.</p>
            <textarea
              className="v-textarea"
              placeholder={'{ "experiences": [{ "client": "...", "timeline": "...", "role": "...", "responsibilities": [], "environment": "..." }] }'}
              value={formData.base_exp_json || ''}
              onChange={(e) => setField('base_exp_json', e.target.value)}
              rows={8}
              spellCheck={false}
            />
          </div>

          <div className="form-actions">
            <button className="cancel-btn" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="save-btn" type="button" onClick={handleSave} disabled={saving}>
              {saving ? '⏳ Saving...' : editingId ? '💾 Update Version' : '✅ Create Version'}
            </button>
          </div>
        </div>
      )}

      {/* ── Versions List ────────────────────────────────────────────────── */}
      <div className="versions-list-section">
        <h2>Your Versions ({versions.length})</h2>
        {loading ? (
          <div className="versions-loading">Loading versions...</div>
        ) : versions.length === 0 ? (
          <div className="versions-empty">
            <p>No versions yet. Create your first version to store your project and education details!</p>
          </div>
        ) : (
          <div className="versions-grid">
            {versions.map(v => (
              <div key={v.id} className="version-card">
                <div className="version-card-header">
                  <h3>{v.name}</h3>
                  <div className="version-card-actions">
                    <button className="edit-btn" onClick={() => openEdit(v)}>✏️ Edit</button>
                    {deleteConfirm === v.id ? (
                      <div className="delete-confirm-inline">
                        <span>Delete?</span>
                        <button className="confirm-yes-btn" onClick={() => handleDelete(v.id)}>Yes</button>
                        <button className="confirm-no-btn" onClick={() => setDeleteConfirm(null)}>No</button>
                      </div>
                    ) : (
                      <button className="delete-btn" onClick={() => setDeleteConfirm(v.id)}>🗑️ Delete</button>
                    )}
                  </div>
                </div>
                <div className="version-card-preview">
                  {v.resume_name_displayed && (
                    <div className="preview-line">
                      <span className="preview-icon">👤</span>
                      <span>{v.resume_name_displayed}{v.user_location ? ` · ${v.user_location}` : ''}</span>
                    </div>
                  )}
                  {(v.user_email || v.phone_number) && (
                    <div className="preview-line">
                      <span className="preview-icon">📬</span>
                      <span>{[v.user_email, v.phone_number].filter(Boolean).join(' · ')}</span>
                    </div>
                  )}
                  {(v.projects || []).length > 0 && (
                    <div className="preview-line">
                      <span className="preview-icon">🚀</span>
                      <span>{v.projects.map(p => p.TITLE).filter(Boolean).join(' \u00B7 ')}</span>
                    </div>
                  )}
                  {v.education && (
                    <div className="preview-line">
                      <span className="preview-icon">🎓</span>
                      <span>{v.education}{v.edu_timeline ? ` (${v.edu_timeline})` : ''}</span>
                    </div>
                  )}
                  {(v.hobbies || []).length > 0 && (
                    <div className="preview-line">
                      <span className="preview-icon">🎯</span>
                      <span>{v.hobbies.length} hobbies / interests</span>
                    </div>
                  )}
                  {(v.skills || []).length > 0 && (
                    <div className="preview-line">
                      <span className="preview-icon">🛠️</span>
                      <span>{v.skills.map(s => s.SKILL_NAME).filter(Boolean).join(' · ')}</span>
                    </div>
                  )}
                </div>
                <div className="version-card-meta">
                  <span>{(v.projects || []).length} projects</span>
                  <span>Created {new Date(v.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
