import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import api from '../services/api'
import '../styles/Prompts.css'

const EMPTY_FORM = {
  title: '',
  content: '',
}

export default function Prompts() {
  const { token } = useSelector((state) => state.auth)
  const [prompts, setPrompts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 4000)
  }

  const loadPrompts = async () => {
    setLoading(true)
    try {
      const data = await api.getPrompts(token)
      setPrompts(data)
    } catch (error) {
      showMessage(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPrompts() }, [])

  const setField = (field, value) =>
    setFormData(prev => ({ ...prev, [field]: value }))

  const openNew = () => {
    setFormData(EMPTY_FORM)
    setEditingId(null)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openEdit = (prompt) => {
    setFormData({ title: prompt.title, content: prompt.content })
    setEditingId(prompt.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData(EMPTY_FORM)
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      showMessage('Title is required.', 'error')
      return
    }
    if (!formData.content.trim()) {
      showMessage('Prompt content is required.', 'error')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: formData.title.trim(),
        content: formData.content.trim(),
      }

      if (editingId) {
        await api.updatePrompt(token, editingId, payload)
        showMessage('Prompt updated successfully!')
      } else {
        await api.createPrompt(token, payload)
        showMessage('Prompt created successfully!')
      }

      cancelForm()
      loadPrompts()
    } catch (error) {
      showMessage(error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.deletePrompt(token, id)
      setDeleteConfirm(null)
      showMessage('Prompt deleted.')
      loadPrompts()
    } catch (error) {
      showMessage(error.message, 'error')
    }
  }

  const handleCopy = (content, id) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  return (
    <div className="prompts-page">
      <div className="prompts-header">
        <div>
          <h2 className="prompts-title">💬 Prompts</h2>
          <p className="prompts-subtitle">Manage your reusable prompts for resume generation.</p>
        </div>
        {!showForm && (
          <button className="btn-new-prompt" onClick={openNew}>
            + New Prompt
          </button>
        )}
      </div>

      {message.text && (
        <div className={`prompt-message ${message.type === 'error' ? 'msg-error' : 'msg-success'}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="prompt-form-card">
          <h3 className="prompt-form-title">
            {editingId ? '✏️ Edit Prompt' : '+ New Prompt'}
          </h3>

          <div className="prompt-form-group">
            <label className="prompt-label">Title</label>
            <input
              className="prompt-input"
              type="text"
              placeholder="e.g. Senior React Developer"
              value={formData.title}
              onChange={e => setField('title', e.target.value)}
            />
          </div>

          <div className="prompt-form-group">
            <label className="prompt-label">Prompt Content</label>
            <textarea
              className="prompt-textarea"
              placeholder="Write your full prompt here..."
              rows={10}
              value={formData.content}
              onChange={e => setField('content', e.target.value)}
            />
          </div>

          <div className="prompt-form-actions">
            <button className="btn-save-prompt" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Prompt' : 'Save Prompt'}
            </button>
            <button className="btn-cancel-prompt" onClick={cancelForm}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="prompts-loading">Loading prompts...</div>
      ) : prompts.length === 0 ? (
        <div className="prompts-empty">
          <p>No prompts yet. Create your first prompt to get started.</p>
        </div>
      ) : (
        <div className="prompts-list">
          {prompts.map(prompt => (
            <div key={prompt.id} className="prompt-card">
              <div className="prompt-card-header">
                <span className="prompt-card-title">{prompt.title}</span>
                <div className="prompt-card-actions">
                  <button
                    className={`btn-copy-prompt ${copiedId === prompt.id ? 'copied' : ''}`}
                    onClick={() => handleCopy(prompt.content, prompt.id)}
                    title="Copy prompt"
                  >
                    {copiedId === prompt.id ? '✓ Copied' : '📋 Copy'}
                  </button>
                  <button
                    className="btn-edit-prompt"
                    onClick={() => openEdit(prompt)}
                    title="Edit prompt"
                  >
                    ✏️ Edit
                  </button>
                  {deleteConfirm === prompt.id ? (
                    <>
                      <button
                        className="btn-confirm-delete"
                        onClick={() => handleDelete(prompt.id)}
                      >
                        Confirm Delete
                      </button>
                      <button
                        className="btn-cancel-delete"
                        onClick={() => setDeleteConfirm(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn-delete-prompt"
                      onClick={() => setDeleteConfirm(prompt.id)}
                      title="Delete prompt"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>
              <pre className="prompt-card-content">{prompt.content}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
