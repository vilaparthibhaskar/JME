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

  // ── Applied Jobs ───────────────────────────────────────────────────────────
  async getAppliedJobs(token) {
    const response = await fetch(`${API_BASE_URL}/api/applied-jobs?token=${token}`)
    if (!response.ok) throw new Error('Failed to fetch applied jobs')
    return response.json()
  },

  async createAppliedJob(token, data) {
    const response = await fetch(`${API_BASE_URL}/api/applied-jobs?token=${token}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to create applied job')
    }
    return response.json()
  },

  async updateAppliedJob(token, id, data) {
    const response = await fetch(`${API_BASE_URL}/api/applied-jobs/${id}?token=${token}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to update applied job')
    return response.json()
  },

  async deleteAppliedJob(token, id) {
    const response = await fetch(`${API_BASE_URL}/api/applied-jobs/${id}?token=${token}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete applied job')
    return response.json()
  },

  // ── User Companies ─────────────────────────────────────────────────────
  async getUserCompanies(token) {
    const response = await fetch(`${API_BASE_URL}/api/user-companies?token=${token}`)
    if (!response.ok) throw new Error('Failed to fetch companies')
    return response.json()
  },

  async createUserCompany(token, data) {
    const response = await fetch(`${API_BASE_URL}/api/user-companies?token=${token}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to create company')
    }
    return response.json()
  },

  async deleteUserCompany(token, id) {
    const response = await fetch(`${API_BASE_URL}/api/user-companies/${id}?token=${token}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to delete company')
    }
    return response.json()
  },

  // ── Companies Page (independent) ────────────────────────────────────────
  async getTrackedCompanies(token) {
    const response = await fetch(`${API_BASE_URL}/api/tracked-companies?token=${token}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to fetch tracked companies')
    }
    return response.json()
  },

  async createTrackedCompany(token, data) {
    const response = await fetch(`${API_BASE_URL}/api/tracked-companies?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to create tracked company')
    }
    return response.json()
  },

  async deleteTrackedCompany(token, id) {
    const response = await fetch(`${API_BASE_URL}/api/tracked-companies/${id}?token=${token}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to delete tracked company')
    }
    return response.json()
  },

  async getTrackedCompanyGroups(token) {
    const response = await fetch(`${API_BASE_URL}/api/tracked-company-groups?token=${token}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to load company groups')
    }
    return response.json()
  },

  async createTrackedCompanyGroup(token, data) {
    const response = await fetch(`${API_BASE_URL}/api/tracked-company-groups?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to create company group')
    }
    return response.json()
  },

  async updateTrackedCompanyGroup(token, id, data) {
    const response = await fetch(`${API_BASE_URL}/api/tracked-company-groups/${id}?token=${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to update company group')
    }
    return response.json()
  },

  async deleteTrackedCompanyGroup(token, id) {
    const response = await fetch(`${API_BASE_URL}/api/tracked-company-groups/${id}?token=${token}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to delete company group')
    }
  },

  // ── Recruiters ─────────────────────────────────────────────────────────────
  async getRecruiters(token) {
    const response = await fetch(`${API_BASE_URL}/api/recruiters?token=${token}`)
    if (!response.ok) throw new Error('Failed to fetch recruiters')
    return response.json()
  },

  async createRecruiter(token, data) {
    const response = await fetch(`${API_BASE_URL}/api/recruiters?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to create recruiter')
    }
    return response.json()
  },

  async updateRecruiter(token, id, data) {
    const response = await fetch(`${API_BASE_URL}/api/recruiters/${id}?token=${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to update recruiter')
    }
    return response.json()
  },

  async deleteRecruiter(token, id) {
    const response = await fetch(`${API_BASE_URL}/api/recruiters/${id}?token=${token}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to delete recruiter')
    }
  },

  // ── Recruiter Groups ──────────────────────────────────────────────────────

  async getRecruiterGroups(token) {
    const response = await fetch(`${API_BASE_URL}/api/recruiter-groups?token=${token}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to load groups')
    }
    return response.json()
  },

  async createRecruiterGroup(token, data) {
    const response = await fetch(`${API_BASE_URL}/api/recruiter-groups?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to create group')
    }
    return response.json()
  },

  async updateRecruiterGroup(token, id, data) {
    const response = await fetch(`${API_BASE_URL}/api/recruiter-groups/${id}?token=${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to update group')
    }
    return response.json()
  },

  async deleteRecruiterGroup(token, id) {
    const response = await fetch(`${API_BASE_URL}/api/recruiter-groups/${id}?token=${token}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to delete group')
    }
  },

  // ── User Groups ────────────────────────────────────────────────────────────

  async getUserGroups(token) {
    const response = await fetch(`${API_BASE_URL}/api/user-groups?token=${token}`)
    if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Failed to fetch groups') }
    return response.json()
  },

  async createUserGroup(token, data) {
    const response = await fetch(`${API_BASE_URL}/api/user-groups?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Failed to create group') }
    return response.json()
  },

  async deleteUserGroup(token, groupId) {
    const response = await fetch(`${API_BASE_URL}/api/user-groups/${groupId}?token=${token}`, { method: 'DELETE' })
    if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Failed to delete group') }
    return response.json()
  },

  async searchUsers(token, q = '') {
    const response = await fetch(`${API_BASE_URL}/api/user-groups/users?token=${token}&q=${encodeURIComponent(q)}`)
    if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Failed to search users') }
    return response.json()
  },

  async addGroupMember(token, groupId, userId) {
    const response = await fetch(`${API_BASE_URL}/api/user-groups/${groupId}/members?token=${token}&user_id=${userId}`, { method: 'POST' })
    if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Failed to add member') }
    return response.json()
  },

  async removeGroupMember(token, groupId, userId) {
    const response = await fetch(`${API_BASE_URL}/api/user-groups/${groupId}/members/${userId}?token=${token}`, { method: 'DELETE' })
    if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Failed to remove member') }
    return response.json()
  },

  async leaveGroup(token, groupId) {
    const response = await fetch(`${API_BASE_URL}/api/user-groups/${groupId}/leave?token=${token}`, { method: 'DELETE' })
    if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Failed to leave group') }
    return response.json()
  },

  async getGroupPosts(token, groupId) {
    const response = await fetch(`${API_BASE_URL}/api/user-groups/${groupId}/posts?token=${token}`)
    if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Failed to fetch posts') }
    return response.json()
  },

  async createGroupPost(token, groupId, content) {
    const response = await fetch(`${API_BASE_URL}/api/user-groups/${groupId}/posts?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Failed to post message') }
    return response.json()
  },

  async deleteGroupPost(token, groupId, postId) {
    const response = await fetch(`${API_BASE_URL}/api/user-groups/${groupId}/posts/${postId}?token=${token}`, { method: 'DELETE' })
    if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Failed to delete post') }
    return response.json()
  },
}

export default api
