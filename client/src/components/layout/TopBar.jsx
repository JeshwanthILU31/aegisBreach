import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function TopBar({ project }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const username = user?.username || 'Training User'
  const initials = username.slice(0, 2).toUpperCase()

  return (
    <header className="top-bar">
      <div className="top-bar-title-group">
        <Link className="top-bar-back" to="/projects" aria-label="Back to projects">
          Projects
        </Link>
        <span className="top-bar-divider">/</span>
        <span className="top-bar-title">{project?.name || 'Project workspace'}</span>
      </div>
      <div className="top-bar-actions">
        <span className="top-bar-environment">Training environment</span>
        <div className="user-menu" style={{ cursor: 'default' }}>
          <span className="user-avatar">{initials}</span>
          <span>{username}</span>
        </div>
        <button
          className="logout-button"
          type="button"
          onClick={handleLogout}
          title="Sign out"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
