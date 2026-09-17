import { Link } from 'react-router-dom'

export default function TopBar({ project }) {
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
        <button className="user-menu" type="button">
          <span className="user-avatar">TR</span>
          <span>Training User</span>
          <span className="chevron">v</span>
        </button>
      </div>

    </header>
  )
}
