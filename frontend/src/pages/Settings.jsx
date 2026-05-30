import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { updateProfileStart, updateProfileSuccess, updateProfileFailure } from '../store/authSlice'
import '../styles/Settings.css'

export default function Settings() {
  const { user, token } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // Set active tab from URL query param on mount
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'security') {
      setActiveTab('security')
    }
  }, [searchParams])

  // Profile form state
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    resume_name: user?.resume_name || '',
  })

  // Password form state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    dispatch(updateProfileStart())
    setError('')
    setSuccess('')

    try {
      const updateData = {
        full_name: profileData.full_name,
        resume_name: profileData.resume_name || null,
      }
      
      const response = await api.updateProfile(token, updateData)
      dispatch(updateProfileSuccess(response))
      setSuccess('✅ Profile updated successfully!')
      
      setTimeout(() => {
        setSuccess('')
      }, 3000)
    } catch (err) {
      const errorMessage = err.message || 'Failed to update profile'
      setError(errorMessage)
      dispatch(updateProfileFailure(errorMessage))
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Validation
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match')
      setLoading(false)
      return
    }

    if (passwordData.new_password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    if (passwordData.current_password === passwordData.new_password) {
      setError('New password must be different from current password')
      setLoading(false)
      return
    }

    try {
      await api.changePassword(
        token,
        passwordData.current_password,
        passwordData.new_password,
        passwordData.confirm_password
      )
      
      setSuccess('✅ Password changed successfully! Please login again.')
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      })
      
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      const errorMessage = err.message || 'Failed to change password'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your profile and security</p>
      </div>

      <div className="settings-content">
        <div className="settings-sidebar">
          <div className="settings-menu">
            <button 
              className={`settings-menu-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              👤 Profile
            </button>
            <button 
              className={`settings-menu-item ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              🔐 Security
            </button>
            <button 
              className={`settings-menu-item ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
              disabled
              title="Coming soon"
            >
              🔔 Notifications
            </button>
          </div>
        </div>

        <div className="settings-main">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <>
              <div className="settings-card">
                <h2>Profile Information</h2>
                
                {success && (
                  <div className="alert alert-success">
                    {success}
                  </div>
                )}

                {error && (
                  <div className="alert alert-danger">
                    ❌ {error}
                  </div>
                )}

                <form onSubmit={handleProfileSubmit}>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      name="full_name"
                      className="form-control"
                      value={profileData.full_name}
                      onChange={handleProfileChange}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Resume File Name</label>
                    <input
                      type="text"
                      name="resume_name"
                      className="form-control"
                      value={profileData.resume_name}
                      onChange={handleProfileChange}
                      placeholder="e.g. John_Doe (default: Resume)"
                    />
                    <small className="text-muted">Used as the downloaded DOCX filename</small>
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      className="form-control"
                      value={user?.email}
                      disabled
                      title="Email cannot be changed"
                    />
                    <small className="text-muted">Email cannot be changed</small>
                  </div>

                  <div className="form-group">
                    <label>Username</label>
                    <input
                      type="text"
                      name="username"
                      className="form-control"
                      value={user?.username}
                      disabled
                      title="Username cannot be changed"
                    />
                    <small className="text-muted">Username cannot be changed</small>
                  </div>

                  <div className="form-group">
                    <label>Account Type</label>
                    <div className="account-type">
                      <span className={user?.is_admin ? 'badge badge-admin' : 'badge badge-user'}>
                        {user?.is_admin ? '👑 Admin' : '👤 User'}
                      </span>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => navigate('/dashboard')}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>

              <div className="settings-card account-info">
                <h3>Account Information</h3>
                <div className="info-group">
                  <span className="info-label">Member Since:</span>
                  <span className="info-value">
                    {user?.created_at 
                      ? new Date(user.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'Not available'
                    }
                  </span>
                </div>
                <div className="info-group">
                  <span className="info-label">Account Status:</span>
                  <span className="info-value">
                    {user?.is_active ? '🟢 Active' : '🔴 Inactive'}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="settings-card">
              <h2>Change Password</h2>
              
              {success && (
                <div className="alert alert-success">
                  {success}
                </div>
              )}

              {error && (
                <div className="alert alert-danger">
                  ❌ {error}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit}>
                <div className="form-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    name="current_password"
                    className="form-control"
                    value={passwordData.current_password}
                    onChange={handlePasswordChange}
                    placeholder="Enter your current password"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    name="new_password"
                    className="form-control"
                    value={passwordData.new_password}
                    onChange={handlePasswordChange}
                    placeholder="Enter your new password"
                    required
                    minLength="6"
                  />
                  <small className="text-muted">Minimum 6 characters</small>
                </div>

                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    name="confirm_password"
                    className="form-control"
                    value={passwordData.confirm_password}
                    onChange={handlePasswordChange}
                    placeholder="Confirm your new password"
                    required
                    minLength="6"
                  />
                </div>

                <div className="password-requirements">
                  <h4>Password Requirements:</h4>
                  <ul>
                    <li>Minimum 6 characters</li>
                    <li>Must be different from current password</li>
                    <li>Passwords must match</li>
                  </ul>
                </div>

                <div className="form-actions">
                  <button 
                    type="submit" 
                    className="btn btn-danger"
                    disabled={loading}
                  >
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => navigate('/dashboard')}
                  >
                    Back to Dashboard
                  </button>
                </div>

                <div className="security-info">
                  <p><strong>ℹ️ Security Note:</strong> After changing your password, you'll need to login again with your new password for security reasons.</p>
                </div>
              </form>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="settings-card">
              <h2>Notifications</h2>
              <p style={{ color: '#999', textAlign: 'center', padding: '40px 0' }}>
                Notification settings coming soon...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
