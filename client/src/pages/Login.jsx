import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const { identifier, password } = formData

    if (!identifier.trim()) {
      setError('Username or email is required')
      return
    }

    if (!password) {
      setError('Password is required')
      return
    }

    setLoading(true)
    try {
      const authResult = await login(identifier.trim(), password)
      const role = authResult?.user?.role
      if (role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/projects')
      }
    } catch (err) {
      const serverError = err.response?.data?.error || 'Invalid username/email or password'
      setError(serverError)
    } finally {
      setLoading(false)
    }
  }


  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-brand">
          <span className="brand-mark">A</span>
          <span>aegisBreach</span>
        </div>

        <div className="login-heading">
          <p className="eyebrow">Internal training environment</p>
          <h1 id="login-title">Sign in</h1>
          <p>Enter your credentials to access the review workspace.</p>
        </div>

        {error && (
          <div className="auth-alert auth-alert-error" role="alert">
            {error}
          </div>
        )}


        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="identifier">Username or Email</label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            placeholder="Username or email"
            value={formData.identifier}
            onChange={handleChange}
            disabled={loading}
            autoComplete="username"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            disabled={loading}
            autoComplete="current-password"
            required
          />

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="auth-footer-links">
          <Link className="login-project-link" to="/register">
            Don't have an account? Register here
          </Link>
        </div>
      </section>
    </main>
  )
}
