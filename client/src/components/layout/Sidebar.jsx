import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import AppIcon from '../common/AppIcon'

const navigationItems = [
  { label: 'Documents', key: 'documents', icon: 'documents' },
  { label: 'Review', key: 'review', icon: 'review' },
]

const MIN_SIDEBAR_WIDTH = 160
const MAX_SIDEBAR_WIDTH = 360
const DEFAULT_SIDEBAR_WIDTH = 214
const STORAGE_KEY = 'aegis.sidebarWidth'

function getInitialWidth() {
  if (typeof window === 'undefined') return DEFAULT_SIDEBAR_WIDTH
  try {
    const val = localStorage.getItem(STORAGE_KEY)
    if (val) {
      const parsed = parseInt(val, 10)
      if (!Number.isNaN(parsed)) {
        return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, parsed))
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_SIDEBAR_WIDTH
}

export default function Sidebar({ projectId }) {
  const [width, setWidth] = useState(getInitialWidth)
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(DEFAULT_SIDEBAR_WIDTH)
  const [isResizing, setIsResizing] = useState(false)

  const handlePointerDown = (e) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    isDraggingRef.current = true
    startXRef.current = e.clientX
    startWidthRef.current = width
    setIsResizing(true)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return
    e.preventDefault()
    const delta = e.clientX - startXRef.current
    const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, startWidthRef.current + delta))
    setWidth(newWidth)
  }

  const handlePointerUp = (e) => {
    if (!isDraggingRef.current) return
    e.preventDefault()
    isDraggingRef.current = false
    setIsResizing(false)
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch {
      // ignore
    }
    setWidth((curr) => {
      try {
        localStorage.setItem(STORAGE_KEY, String(curr))
      } catch {
        // ignore
      }
      return curr
    })
  }

  return (
    <aside
      className="app-sidebar"
      aria-label="Project navigation"
      style={{
        '--sidebar-width': `${width}px`,
        width: `${width}px`,
        minWidth: `${width}px`,
        maxWidth: `${width}px`,
        flexBasis: `${width}px`,
      }}
    >
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

      <div
        className={`sidebar-resize-handle ${isResizing ? 'is-resizing' : ''}`}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        title="Drag to resize sidebar"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </aside>
  )
}
