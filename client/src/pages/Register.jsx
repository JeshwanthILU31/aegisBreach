import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../services/authApi'

export default function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const { username, email, password, confirmPassword } = formData

    if (!username.trim()) {
      setError('Username is required')
      return
    }

    if (!email.trim()) {
      setError('Email address is required')
      return
    }

    if (!password) {
      setError('Password is required')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await registerUser({
        username: username.trim(),
        email: email.trim(),
        password,
      })
      setSuccess(true)
    } catch (err) {
      const serverError = err.response?.data?.error || 'Registration failed. Please try again.'
      setError(serverError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="register-title">
        <div className="login-brand">
          <span className="brand-mark">A</span>
          <span>aegisBreach</span>
        </div>

        <div className="login-heading">
          <p className="eyebrow">Internal training environment</p>
          <h1 id="register-title">Create Account</h1>
          <p>Register as a reviewer to access the review workspace.</p>
        </div>

        {error && (
          <div className="auth-alert auth-alert-error" role="alert">
            {error}
          </div>
        )}

        {success ? (
          <div className="auth-success-state">
            <div className="auth-alert auth-alert-success" role="status">
              Account created successfully! You can now sign in with your credentials.
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={() => navigate('/login')}
              style={{ width: '100%', marginTop: '16px' }}
            >
              Proceed to Sign in
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="e.g. jdoe"
              value={formData.username}
              onChange={handleChange}
              disabled={loading}
              autoComplete="username"
              required
            />

            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="name@company.com"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              autoComplete="email"
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="At least 8 characters"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              autoComplete="new-password"
              required
            />

            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              autoComplete="new-password"
              required
            />

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Register'}
            </button>
          </form>
        )}

        <div className="auth-footer-links">
          <Link className="login-project-link" to="/login">
            Already have an account? Sign in
          </Link>
        </div>
      </section>
    </main>
  )
}
