const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = {
  async register(username, email, password, fullName = '', adminKey = null) {
    const payload = {
      username,
      email,
      password,
      full_name: fullName,
    }
    
    if (adminKey) {
      payload.admin_key = adminKey
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Registration failed')
    }
    return response.json()
  },

  async login(username, password) {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)

    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Login failed')
    }
    return response.json()
  },

  async getCurrentUser(token) {
    const response = await fetch(`${API_BASE_URL}/api/auth/me?token=${token}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    if (!response.ok) {
      throw new Error('Failed to fetch user')
    }
    return response.json()
  },

  async updateProfile(token, data) {
    const response = await fetch(`${API_BASE_URL}/api/auth/profile?token=${token}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to update profile')
    }
    return response.json()
  },

  async changePassword(token, currentPassword, newPassword, confirmPassword) {
    const response = await fetch(`${API_BASE_URL}/api/auth/change-password?token=${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to change password')
    }
    return response.json()
  },

  async generateResume(token, resumeData, template = 'template1') {
    const response = await fetch(`${API_BASE_URL}/api/resume/generate?token=${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        resume_data: resumeData,
        template,
      }),
    })
    if (!response.ok) {
      const errorText = await response.text()
      try {
        const error = JSON.parse(errorText)
        throw new Error(error.detail || 'Failed to generate resume')
      } catch {
        throw new Error('Failed to generate resume: ' + errorText)
      }
    }
    return response.blob()
  },

  async getVersions(token) {
    const response = await fetch(`${API_BASE_URL}/api/versions/?token=${token}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to fetch versions')
    }
    return response.json()
  },

  async createVersion(token, data) {
    const response = await fetch(`${API_BASE_URL}/api/versions/?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to create version')
    }
    return response.json()
  },

  async updateVersion(token, id, data) {
    const response = await fetch(`${API_BASE_URL}/api/versions/${id}?token=${token}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to update version')
    }
    return response.json()
  },

  async deleteVersion(token, id) {
    const response = await fetch(`${API_BASE_URL}/api/versions/${id}?token=${token}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to delete version')
    }
    return response.json()
  },

  // ── Prompts ────────────────────────────────────────────────────────────────
  async getPrompts(token) {
    const response = await fetch(`${API_BASE_URL}/api/prompts/?token=${token}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to fetch prompts')
    }
    return response.json()
  },

  async createPrompt(token, data) {
    const response = await fetch(`${API_BASE_URL}/api/prompts/?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to create prompt')
    }
    return response.json()
  },

  async updatePrompt(token, id, data) {
    const response = await fetch(`${API_BASE_URL}/api/prompts/${id}?token=${token}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to update prompt')
    }
    return response.json()
  },

  async deletePrompt(token, id) {
    const response = await fetch(`${API_BASE_URL}/api/prompts/${id}?token=${token}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to delete prompt')
    }
    return response.json()
  },

  // ── Jobs ───────────────────────────────────────────────────────────────────
  async getJobs({ companyIds, page = 1, perPage = 12, search = '', dateFrom = '', dateTo = '', useCache = false, signal } = {}) {    const params = new URLSearchParams({
      company_ids: companyIds.join(','),
      page:        String(page),
      per_page:    String(perPage),
      search:      search || '',
      date_from:   dateFrom || '',
      date_to:     dateTo || '',
      use_cache:   String(useCache),
    })
    const response = await fetch(`${API_BASE_URL}/api/jobs?${params}`, { signal })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to fetch jobs')
    }
    return response.json()
  },

  // ── User-job statuses ──────────────────────────────────────────────────────
  async getUserJobStatuses(token) {
    const response = await fetch(`${API_BASE_URL}/api/user-jobs?token=${token}`)
    if (!response.ok) throw new Error('Failed to fetch job statuses')
    return response.json()   // { [job_id]: { status, title, url, ... } }
  },

  async setJobStatus(token, jobId, status, title, url, companyId) {
    const response = await fetch(`${API_BASE_URL}/api/user-jobs/${encodeURIComponent(jobId)}?token=${token}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status, title, url, company_id: companyId }),
    })
    if (!response.ok) throw new Error('Failed to set job status')
    return response.json()
  },

  async removeJobStatus(token, jobId) {
    const response = await fetch(`${API_BASE_URL}/api/user-jobs/${encodeURIComponent(jobId)}?token=${token}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to remove job status')
    return response.json()
  },

  // ── Admin ──────────────────────────────────────────────────────────────────
  async getAnalytics(token) {
    const response = await fetch(`${API_BASE_URL}/api/admin/analytics?token=${token}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to fetch analytics')
    }
    return response.json()
  },
}

export default api
