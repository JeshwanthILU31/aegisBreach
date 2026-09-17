import { NavLink } from 'react-router-dom'
import AppIcon from '../common/AppIcon'

const navigationItems = [
  { label: 'Documents', key: 'documents', icon: 'documents' },
  { label: 'Review', key: 'review', icon: 'review' },
]

export default function Sidebar({ projectId }) {
  return (
    <aside className="app-sidebar" aria-label="Project navigation">
      <div className="sidebar-brand">
        <span className="brand-mark">A</span>
        <span className="sidebar-brand-name">aegisBreach</span>
      </div>

      <nav className="sidebar-nav">
        {navigationItems.map((item) => (
          <NavLink
            className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}
            key={item.key}
            to={`/projects/${projectId}/${item.key}`}
          >
            <AppIcon name={item.icon} className="sidebar-icon" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-link sidebar-link-static" type="button">
          <AppIcon name="help" className="sidebar-icon" />
          <span>Help</span>
        </button>
      </div>
    </aside>
  )
}
