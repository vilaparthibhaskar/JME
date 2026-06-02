import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import api from '../services/api'
import '../styles/Resume.css'

export default function Resume() {
  const { user, token } = useSelector((state) => state.auth)

  const [jsonInput, setJsonInput] = useState('')
  const [jdInput, setJdInput] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [versions, setVersions] = useState([])
  const [selectedVersionId, setSelectedVersionId] = useState('')
  const [copied, setCopied] = useState(false)
  const [prompts, setPrompts] = useState([])
  const [selectedPromptId, setSelectedPromptId] = useState('')
  const [promptCopied, setPromptCopied] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('template1')

  // ── Edit-by-Experience modal state ──
  const [showExpModal, setShowExpModal] = useState(false)
  const [modalExpIndex, setModalExpIndex] = useState(0)
  const [modalJdInput, setModalJdInput] = useState('')
  const [modalSelectedPromptId, setModalSelectedPromptId] = useState('')
  const [modalPromptCopied, setModalPromptCopied] = useState(false)
  const [modalExpJsonEdits, setModalExpJsonEdits] = useState({})

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 4000)
  }

  useEffect(() => {
    if (token) {
      api.getVersions(token)
        .then(setVersions)
        .catch(() => {})
      api.getPrompts(token)
        .then(setPrompts)
        .catch(() => {})
    }
  }, [token])

  const handleVersionChange = (e) => {
    const id = e.target.value
    setSelectedVersionId(id)
    if (id) {
      const v = versions.find((ver) => ver.id === parseInt(id))
      if (v?.base_exp_json?.trim()) {
        setJsonInput(v.base_exp_json)
      }
    }
  }

  const handleCopyPrompt = async () => {
    if (!selectedPromptId) { showMessage('Select a prompt first', 'error'); return }
    const prompt = prompts.find((p) => p.id === parseInt(selectedPromptId))
    if (!prompt) return
    const filledPrompt = prompt.content.replace(/JD_VARIABLE_REPLACE/g, jdInput)
    const combined = jsonInput.trim()
      ? `${jsonInput.trim()}\n\n${filledPrompt}`
      : filledPrompt
    try {
      await navigator.clipboard.writeText(combined)
      setPromptCopied(true)
      setTimeout(() => setPromptCopied(false), 2500)
    } catch {
      showMessage('Failed to copy', 'error')
    }
  }

  const handleCopy = async () => {
    if (!jsonInput.trim()) { showMessage('Nothing to copy', 'error'); return }
    try {
      await navigator.clipboard.writeText(jsonInput)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      showMessage('Failed to copy', 'error')
    }
  }

  // ── Edit-by-Experience helpers ──
  const getExperiences = () => {
    if (!jsonInput.trim()) return []
    try {
      const parsed = JSON.parse(jsonInput)
      return Array.isArray(parsed.experiences) ? parsed.experiences : []
    } catch {
      return []
    }
  }

  const handleOpenExpModal = () => {
    const exps = getExperiences()
    if (exps.length === 0) {
      showMessage('No experiences found in JSON. Make sure your JSON has an "experiences" array.', 'error')
      return
    }
    // Pre-populate edits from current JSON if not already set
    const edits = {}
    exps.forEach((exp, i) => {
      edits[i] = JSON.stringify(exp, null, 2)
    })
    setModalExpJsonEdits(edits)
    setModalExpIndex(0)
    setShowExpModal(true)
  }

  const handleSelectExp = (index) => {
    setModalExpIndex(index)
  }

  const handleModalExpJsonChange = (index, value) => {
    setModalExpJsonEdits(prev => ({ ...prev, [index]: value }))
  }

  const handleSaveExpEdits = () => {
    let parsed
    try {
      parsed = JSON.parse(jsonInput)
    } catch {
      showMessage('Main JSON is invalid. Cannot save.', 'error')
      return
    }
    const originalExps = Array.isArray(parsed.experiences) ? parsed.experiences : []
    const skipped = []
    const updated = originalExps.map((original, i) => {
      const editText = modalExpJsonEdits[i]
      if (editText === undefined) return original
      try {
        return JSON.parse(editText)
      } catch {
        skipped.push(i + 1)
        return original
      }
    })
    parsed.experiences = updated
    setJsonInput(JSON.stringify(parsed, null, 2))
    setShowExpModal(false)
    if (skipped.length > 0) {
      showMessage(`Saved. Experience${skipped.length > 1 ? 's' : ''} ${skipped.join(', ')} had invalid JSON and kept original.`, 'error')
    } else {
      showMessage('All experiences saved successfully!')
    }
  }

  const handleModalCopyPrompt = async () => {
    if (!modalSelectedPromptId) { showMessage('Select a prompt first', 'error'); return }
    const prompt = prompts.find((p) => p.id === parseInt(modalSelectedPromptId))
    if (!prompt) return
    const filledPrompt = prompt.content.replace(/JD_VARIABLE_REPLACE/g, modalJdInput)
    const expJson = modalExpJsonEdits[modalExpIndex] || ''
    const combined = expJson.trim()
      ? `${expJson.trim()}\n\n${filledPrompt}`
      : filledPrompt
    try {
      await navigator.clipboard.writeText(combined)
      setModalPromptCopied(true)
      setTimeout(() => setModalPromptCopied(false), 2500)
    } catch {
      showMessage('Failed to copy', 'error')
    }
  }

  const handleDownloadResume = async () => {
    if (!jsonInput.trim()) {
      showMessage('Please paste or load JSON data first', 'error')
      return
    }
    let resumeJson = null
    try {
      resumeJson = JSON.parse(jsonInput)
    } catch {
      showMessage('Invalid JSON format. Please check the syntax.', 'error')
      return
    }
    if (selectedVersionId) {
      const version = versions.find((v) => v.id === parseInt(selectedVersionId))
      if (version) {
        if ((version.projects || []).length)     resumeJson.PROJECTS              = version.projects
        if (version.education)                   resumeJson.EDUCATION             = version.education
        if (version.cgpa)                        resumeJson.CGPA                  = version.cgpa
        if (version.edu_timeline)                resumeJson.EDU_TIMELINE          = version.edu_timeline
        if (version.resume_title)                resumeJson.RESUME_TITLE           = version.resume_title
        if (version.resume_name_displayed)       resumeJson.RESUME_NAME_DISPLAYED  = version.resume_name_displayed
        if (version.user_location)               resumeJson.USER_LOCATION         = version.user_location
        if (version.user_email)                  resumeJson.USER_EMAIL            = version.user_email
        if (version.github)                      resumeJson.GITHUB                = version.github
        if (version.linkedin)                    resumeJson.LINKEDIN              = version.linkedin
        if (version.phone_number)                resumeJson.PHONE_NUMBER          = version.phone_number
        if (version.leetcode)                    resumeJson.LEETCODE              = version.leetcode
        if ((version.skills || []).length)       resumeJson.SKILLS                = version.skills
        // Merge hobbies + achievements into single HOBBIES list (template uses only HOBBIES)
        const combined = [...(version.hobbies || []), ...(version.achievements || [])]
        if (combined.length)                     resumeJson.HOBBIES               = combined
      }
    }
    if (!token) { showMessage('Authentication required', 'error'); return }
    setDownloading(true)
    try {
      const blob = await api.generateResume(token, resumeJson, selectedTemplate)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const vName = selectedVersionId
        ? `_${versions.find((v) => v.id === parseInt(selectedVersionId))?.name || ''}`
        : ''
      link.download = `${user?.resume_name || 'Resume'}.docx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      showMessage('Resume downloaded successfully!')
    } catch (error) {
      showMessage(error.message, 'error')
    } finally {
      setDownloading(false)
    }
  }

  const selectedVersion = versions.find((v) => v.id === parseInt(selectedVersionId))

  return (
    <div className="resume-container">
      <div className="resume-header">
        <h1>📄 Resume Builder</h1>
        <p>Select a version to load its experience JSON, then download your DOCX</p>
      </div>
      {message.text && (
        <div className={`message-alert ${message.type}`}>{message.text}</div>
      )}

      {/* ── Full-width Version Selector ── */}
      <div className="version-selector-bar">
        <div className="vsb-left">
          <label className="vsb-label">🗂️ Version Profile</label>
          <select
            className="version-select vsb-select"
            value={selectedVersionId}
            onChange={handleVersionChange}
          >
            <option value="">— No version selected —</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
        <div className="vsb-right">
          {selectedVersion ? (
            <div className="version-badge-row">
              <span className="version-active-badge">✅ {selectedVersion.name}</span>
              {(selectedVersion.projects || []).slice(0, 3).map((p, i) => (
                <span key={i} className="version-tag">🚀 {p.TITLE}</span>
              ))}
              {selectedVersion.education && (
                <span className="version-tag">🎓 {selectedVersion.education}</span>
              )}
            </div>
          ) : (
            <p className="vsb-hint">
              {versions.length === 0
                ? <><a href="/versions">Create a version</a> to store your experience JSON, projects &amp; education.</>
                : 'Select a version to auto-load its experience JSON and merge project/education data on download.'}
            </p>
          )}
        </div>
      </div>

      {/* ── Edit by Experience button ── */}
      <div className="edit-by-exp-bar">
        <button className="edit-by-exp-btn" onClick={handleOpenExpModal}>
          ✏️ Edit by Experience
        </button>
      </div>

      <div className="resume-two-col-layout">

          {/* ── Left: Job Description ── */}
          <div className="resume-col-card">
            <div className="col-card-header">
              <h3>📄 Job Description (JD)</h3>
            </div>
            <p className="col-card-hint">Paste the job description here. Select a prompt below and copy the combined output.</p>
            <textarea
              className="jd-textarea"
              placeholder="Paste the job description here..."
              value={jdInput}
              onChange={(e) => setJdInput(e.target.value)}
              rows={20}
              spellCheck={false}
            />
            <div className="jd-prompt-bar">
              <select
                className="jd-prompt-select"
                value={selectedPromptId}
                onChange={(e) => setSelectedPromptId(e.target.value)}
              >
                <option value="">— Select a prompt —</option>
                {prompts.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <button
                className={`copy-prompt-btn jd-copy-btn${promptCopied ? ' copied' : ''}`}
                onClick={handleCopyPrompt}
              >
                {promptCopied ? '✅ Copied!' : '📋 Copy Prompt'}
              </button>
            </div>
          </div>

          {/* ── Right: JSON + Download ── */}
          <div className="resume-col-card">
          <div className="json-editor-header">
            <h3>📋 Experience JSON</h3>
            <button
              className={`copy-prompt-btn${copied ? ' copied' : ''}`}
              onClick={handleCopy}
            >
              {copied ? '✅ Copied!' : '📋 Copy'}
            </button>
          </div>
          <textarea
            className="json-textarea"
            placeholder="Paste your experience JSON here, or select a version above to auto-load it."
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            rows={14}
            spellCheck={false}
          />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>📄 Template:</label>
            <select
              className="version-select"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
            >
              <option value="template1">FT Template</option>
              <option value="template2">Java Template</option>
              <option value="template3">Data Template</option>
            </select>
          </div>
          <button
            className="download-docx-btn large-btn"
            onClick={handleDownloadResume}
            disabled={downloading || !jsonInput.trim()}
          >
            {downloading ? '⏳ Generating...' : '⬇️ Download Resume (DOCX)'}
          </button>
          </div>

      </div>

      {/* ── Edit by Experience Modal ── */}
      {showExpModal && (() => {
        const experiences = getExperiences()
        return (
          <div className="exp-modal-overlay" onClick={() => setShowExpModal(false)}>
            <div className="exp-modal" onClick={(e) => e.stopPropagation()}>
              <div className="exp-modal-header">
                <h2>✏️ Edit by Experience</h2>
                <div className="exp-modal-header-actions">
                  <button className="exp-modal-save-btn" onClick={handleSaveExpEdits}>💾 Save</button>
                  <button className="exp-modal-close" onClick={() => setShowExpModal(false)}>✕</button>
                </div>
              </div>
              <div className="exp-modal-body">

                {/* ── Left 1/3 — Experience list ── */}
                <div className="exp-modal-col exp-modal-col-left">
                  <h4 className="exp-modal-col-title">Experiences</h4>
                  <div className="exp-list">
                    {experiences.map((exp, i) => (
                      <button
                        key={i}
                        className={`exp-list-item${modalExpIndex === i ? ' active' : ''}`}
                        onClick={() => handleSelectExp(i)}
                      >
                        <span className="exp-list-num">Experience {i + 1}</span>
                        {exp.client && <span className="exp-list-sub">{exp.client}</span>}
                        {exp.role && <span className="exp-list-role">{exp.role}</span>}
                        {exp.timeline && <span className="exp-list-timeline">{exp.timeline}</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Middle 1/3 — JD + Prompt ── */}
                <div className="exp-modal-col exp-modal-col-mid">
                  <h4 className="exp-modal-col-title">Job Description</h4>
                  <textarea
                    className="exp-modal-textarea"
                    placeholder="Paste the job description here..."
                    value={modalJdInput}
                    onChange={(e) => setModalJdInput(e.target.value)}
                    spellCheck={false}
                  />
                  <div className="exp-modal-prompt-bar">
                    <select
                      className="jd-prompt-select"
                      value={modalSelectedPromptId}
                      onChange={(e) => setModalSelectedPromptId(e.target.value)}
                    >
                      <option value="">— Select a prompt —</option>
                      {prompts.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                    <button
                      className={`copy-prompt-btn${modalPromptCopied ? ' copied' : ''}`}
                      onClick={handleModalCopyPrompt}
                    >
                      {modalPromptCopied ? '✅ Copied!' : '📋 Copy Prompt'}
                    </button>
                  </div>
                </div>

                {/* ── Right 1/3 — Experience JSON ── */}
                <div className="exp-modal-col exp-modal-col-right">
                  <h4 className="exp-modal-col-title">Experience {modalExpIndex + 1} JSON</h4>
                  <textarea
                    className="exp-modal-textarea exp-modal-json-textarea"
                    placeholder="Experience JSON will appear here..."
                    value={modalExpJsonEdits[modalExpIndex] || ''}
                    onChange={(e) => handleModalExpJsonChange(modalExpIndex, e.target.value)}
                    spellCheck={false}
                  />
                </div>

              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}
