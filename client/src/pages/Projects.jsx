import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Pin } from 'lucide-react'
import ProjectTable from '../components/projects/ProjectTable'
import * as projectsApi from '../services/projectsApi'
import { useAuth } from '../context/AuthContext'

export default function Projects() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [columnFilters, setColumnFilters] = useState({
    caseArtifactId: '',
    name: '',
    matterName: '',
    matterNumber: '',
    status: 'All',
    clientNumber: '',
  })

  const userId = user?.id || user?._id || 'guest'
  const storageKey = `aegisbreach_pinned_workspaces_${userId}`
  const dismissKey = `aegisbreach_dismiss_pin_msg_${userId}`

  const [pinnedIds, setPinnedIds] = useState(() => {
    try {
      const stored = localStorage.getItem(`aegisbreach_pinned_workspaces_${user?.id || user?._id || 'guest'}`)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const [instructionDismissed, setInstructionDismissed] = useState(() => {
    try {
      return localStorage.getItem(`aegisbreach_dismiss_pin_msg_${user?.id || user?._id || 'guest'}`) === 'true'
    } catch {
      return false
    }
  })

  // Synchronize state if user identity changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      setPinnedIds(stored ? JSON.parse(stored) : [])
      setInstructionDismissed(localStorage.getItem(dismissKey) === 'true')
    } catch {
      setPinnedIds([])
    }
  }, [storageKey, dismissKey])

  function handleColumnFilterChange(column, value) {
    setColumnFilters((prev) => ({ ...prev, [column]: value }))
  }

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await projectsApi.getProjects()
      if (Array.isArray(data)) {
        setProjects(data)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch projects.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Automatically prune stale pinned IDs if live projects no longer exist
  useEffect(() => {
    if (projects.length > 0 && pinnedIds.length > 0) {
      const validProjectIds = new Set(projects.map((p) => String(p._id || p.id || p.slug)))
      const cleaned = pinnedIds.filter((id) => validProjectIds.has(String(id)))
      if (cleaned.length !== pinnedIds.length) {
        setPinnedIds(cleaned)
        try {
          localStorage.setItem(storageKey, JSON.stringify(cleaned))
        } catch {}
      }
    }
  }, [projects, pinnedIds, storageKey])

  function handleTogglePin(projectId) {
    const sId = String(projectId)
    setPinnedIds((prev) => {
      const next = prev.includes(sId) ? prev.filter((id) => id !== sId) : [...prev, sId]
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {}
      return next
    })
  }

  function handleDismissInstruction() {
    setInstructionDismissed(true)
    try {
      localStorage.setItem(dismissKey, 'true')
    } catch {}
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const username = user?.username || 'Training User'
  const initials = username.slice(0, 2).toUpperCase()

  // 1. Filter projects based on global search and column filters
  const filteredProjects = useMemo(() => {
    return projects.filter((project, index) => {
      const artifactId = String(
        project.caseArtifactId || (project._id ? parseInt(project._id.slice(-6), 16) : 11420698 + index)
      )

      // Global Toolbar Search
      const normalizedQuery = query.trim().toLowerCase()
      if (normalizedQuery) {
        const matchesGlobal = [
          project.name,
          project.matterName,
          project.matterNumber,
          project.clientNumber,
          artifactId,
        ].some((value) => value && typeof value === 'string' && value.toLowerCase().includes(normalizedQuery))

        if (!matchesGlobal) return false
      }

      // Case Artifact ID Column Filter
      const cId = columnFilters.caseArtifactId.trim().toLowerCase()
      if (cId && !artifactId.toLowerCase().includes(cId)) {
        return false
      }

      // Name Column Filter
      const nameF = columnFilters.name.trim().toLowerCase()
      if (nameF && (!project.name || !project.name.toLowerCase().includes(nameF))) {
        return false
      }

      // Matter Name Column Filter
      const matterNameF = columnFilters.matterName.trim().toLowerCase()
      if (matterNameF && (!project.matterName || !project.matterName.toLowerCase().includes(matterNameF))) {
        return false
      }

      // Matter Number Column Filter
      const matterNumF = columnFilters.matterNumber.trim().toLowerCase()
      if (matterNumF && (!project.matterNumber || !project.matterNumber.toLowerCase().includes(matterNumF))) {
        return false
      }

      // Status Column Filter
      const statusF = columnFilters.status
      if (statusF && statusF !== 'All' && statusF !== '(All)') {
        if (!project.status || project.status.toLowerCase() !== statusF.toLowerCase()) {
          return false
        }
      }

      // Client Number Column Filter
      const clientNumF = columnFilters.clientNumber.trim().toLowerCase()
      if (clientNumF && (!project.clientNumber || !project.clientNumber.toLowerCase().includes(clientNumF))) {
        return false
      }

      return true
    })
  }, [projects, query, columnFilters])

  // 2. Matching pinned projects (respecting current filters)
  const matchingPinnedProjects = useMemo(() => {
    return filteredProjects.filter((p) => pinnedIds.includes(String(p._id || p.id || p.slug)))
  }, [filteredProjects, pinnedIds])

  // 3. Normal workspace list with pinned projects appearing first
  const sortedFilteredProjects = useMemo(() => {
    const pinned = []
    const unpinned = []
    filteredProjects.forEach((p) => {
      const sId = String(p._id || p.id || p.slug)
      if (pinnedIds.includes(sId)) {
        pinned.push(p)
      } else {
        unpinned.push(p)
      }
    })
    return [...pinned, ...unpinned]
  }, [filteredProjects, pinnedIds])

  return (
    <div className="selection-page relativity-page">
      <header className="selection-header">
        <Link className="selection-brand" to="/">
          <span className="relativity-mark">R</span>
          <span>Relativity</span>
        </Link>
        <div className="workspace-picker"><span className="picker-search">x</span><select aria-label="Workspace list"><option>T048ap Workspaces</option></select></div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className="legacy-button"
              style={{ textDecoration: 'none', color: '#fff', background: '#7c3aed', border: '1px solid #6d28d9', fontSize: '11px', padding: '4px 10px' }}
              title="Open Admin Management"
            >
              Admin Portal
            </Link>
          )}
          <div className="selection-user">
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
      <main className="selection-content">
        <div className="page-heading-row">
          <div className="workspace-page-title">
            <h1>Workspaces</h1>
            <span className="pin-message">Pin Favorite Workspaces</span>
          </div>
          <div className="workspace-page-actions">
            <button type="button">Filter</button>
            <button type="button">Columns</button>
            <span>1 - {sortedFilteredProjects.length} of {sortedFilteredProjects.length}</span>
            <select aria-label="Rows per page"><option>25</option></select>
            <span>per page</span>
          </div>
        </div>

        {/* Pin Favorite Workspaces Section */}
        <div className="pinned-favorites-container">
          <div className="pinned-favorites-header">
            <span className="pinned-favorites-title">Pin Favorite Workspaces</span>
          </div>
          <div className="pinned-favorites-body">
            {matchingPinnedProjects.length > 0 ? (
              <div className="pinned-favorites-grid">
                {matchingPinnedProjects.map((project) => {
                  const projectKey = project.slug || project._id || project.id
                  const sId = String(project._id || project.id || project.slug)
                  return (
                    <div key={sId} className="pinned-favorite-item">
                      <button
                        type="button"
                        className="pinned-item-unpin"
                        title={`Unpin ${project.name}`}
                        aria-label={`Unpin ${project.name}`}
                        onClick={() => handleTogglePin(sId)}
                      >
                        <Pin
                          size={12}
                          style={{
                            transform: 'rotate(-30deg)',
                            fill: '#2e648e',
                            color: '#2e648e',
                          }}
                        />
                      </button>
                      <Link to={`/projects/${projectKey}`} className="pinned-item-name">
                        {project.name}
                      </Link>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="pinned-favorites-empty">
                Pin a workspace to keep it at the top of your workspace list.
              </div>
            )}
          </div>
        </div>

        {!instructionDismissed && (
          <p className="workspace-instruction">
            Click on the pin icon next to any workspace to pin it to the top of your list.
            <br />
            <button
              type="button"
              className="dismiss-instruction-btn"
              onClick={handleDismissInstruction}
            >
              Dismiss this message
            </button>
          </p>
        )}

        {error && (
          <div className="auth-alert auth-alert-error" role="alert" style={{ marginBottom: '16px' }}>
            {error}
          </div>
        )}
        <div className="toolbar">
          <div className="toolbar-search">
            <label htmlFor="project-search">Search</label>
            <input
              id="project-search"
              type="search"
              placeholder="Search projects"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <button className="secondary-button" type="button">Filters <span className="chevron">v</span></button>
        </div>
        <ProjectTable
          projects={sortedFilteredProjects}
          loading={loading}
          filters={columnFilters}
          onFilterChange={handleColumnFilterChange}
          pinnedIds={pinnedIds}
          onTogglePin={handleTogglePin}
        />
      </main>
    </div>
  )
}
