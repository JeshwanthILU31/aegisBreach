import { useState } from 'react'
import { changePassword as changePasswordApi } from '../../services/authApi'

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (error) setError('')
    if (success) setSuccess('')
  }

  function handleClose() {
    if (loading) return
    setError('')
    setSuccess('')
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const { currentPassword, newPassword, confirmPassword } = formData

    if (!currentPassword) {
      setError('Current password is required')
      return
    }

    if (!newPassword) {
      setError('New password is required')
      return
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match')
      return
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from current password')
      return
    }

    setLoading(true)

    try {
      const response = await changePasswordApi({
        currentPassword,
        newPassword,
      })

      setSuccess(response.message || 'Password changed successfully')
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (err) {
      const serverError = err.response?.data?.error || 'Failed to change password. Please verify your current password.'
      setError(serverError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="person-tracker-overlay" style={{ zIndex: 1000 }}>
      <div
        className="person-tracker-form"
        style={{ width: '440px' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
      >
        <div className="person-tracker-form-header">
          <strong id="change-password-title">Change Password</strong>
          <button type="button" onClick={handleClose} aria-label="Close modal" disabled={loading}>
            x
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {error && (
              <div
                style={{
                  background: '#fdf2f2',
                  border: '1px solid #f8b4b4',
                  color: '#9b1c1c',
                  padding: '7px 10px',
                  fontSize: '11px',
                  borderRadius: '3px',
                }}
                role="alert"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  color: '#166534',
                  padding: '7px 10px',
                  fontSize: '11px',
                  borderRadius: '3px',
                }}
                role="status"
              >
                &#10003; {success}
              </div>
            )}

            <label className="coding-field" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>CURRENT PASSWORD</span>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="Enter current password"
                disabled={loading}
                autoComplete="current-password"
                required
                style={{ height: '28px', padding: '4px 8px', fontSize: '12px' }}
              />
            </label>

            <label className="coding-field" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>NEW PASSWORD</span>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Minimum 8 characters"
                disabled={loading}
                autoComplete="new-password"
                required
                style={{ height: '28px', padding: '4px 8px', fontSize: '12px' }}
              />
            </label>

            <label className="coding-field" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>CONFIRM NEW PASSWORD</span>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter new password"
                disabled={loading}
                autoComplete="new-password"
                required
                style={{ height: '28px', padding: '4px 8px', fontSize: '12px' }}
              />
            </label>
          </div>

          <div className="person-tracker-form-footer">
            <button
              className="legacy-button primary-legacy"
              type="submit"
              disabled={loading}
              style={{ fontWeight: 600 }}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
            <button
              className="legacy-button"
              type="button"
              onClick={handleClose}
              disabled={loading}
            >
              {success ? 'Close' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
