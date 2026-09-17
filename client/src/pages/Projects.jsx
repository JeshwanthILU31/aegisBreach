import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const username = user?.username || 'Training User'
  const initials = username.slice(0, 2).toUpperCase()

  const filteredProjects = useMemo(() => {
    return projects.filter((project, index) => {
      const artifactId = String(
        project.caseArtifactId || (project._id ? parseInt(project._id.slice(-6), 16) : 11420698 + index)
      )

      // 0. Global Toolbar Search
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

      // 1. Case Artifact ID Column Filter
      const cId = columnFilters.caseArtifactId.trim().toLowerCase()
      if (cId && !artifactId.toLowerCase().includes(cId)) {
        return false
      }

      // 2. Name Column Filter
      const nameF = columnFilters.name.trim().toLowerCase()
      if (nameF && (!project.name || !project.name.toLowerCase().includes(nameF))) {
        return false
      }

      // 3. Matter Name Column Filter
      const matterNameF = columnFilters.matterName.trim().toLowerCase()
      if (matterNameF && (!project.matterName || !project.matterName.toLowerCase().includes(matterNameF))) {
        return false
      }

      // 4. Matter Number Column Filter
      const matterNumF = columnFilters.matterNumber.trim().toLowerCase()
      if (matterNumF && (!project.matterNumber || !project.matterNumber.toLowerCase().includes(matterNumF))) {
        return false
      }

      // 5. Status Column Filter
      const statusF = columnFilters.status
      if (statusF && statusF !== 'All' && statusF !== '(All)') {
        if (!project.status || project.status.toLowerCase() !== statusF.toLowerCase()) {
          return false
        }
      }

      // 6. Client Number Column Filter
      const clientNumF = columnFilters.clientNumber.trim().toLowerCase()
      if (clientNumF && (!project.clientNumber || !project.clientNumber.toLowerCase().includes(clientNumF))) {
        return false
      }

      return true
    })
  }, [projects, query, columnFilters])

  return (
    <div className="selection-page relativity-page">
      <header className="selection-header">
        <Link className="selection-brand" to="/">
          <span className="relativity-mark">R</span>
          <span>Relativity</span>
        </Link>
        <div className="workspace-picker"><span className="picker-search">x</span><select aria-label="Workspace list"><option>T048ap Workspaces</option></select></div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
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
          <div className="workspace-page-title"><h1>Workspaces</h1><span className="pin-message">Pin Favorite Workspaces</span></div>
          <div className="workspace-page-actions"><button type="button">Filter</button><button type="button">Columns</button><span>1 - {filteredProjects.length} of {filteredProjects.length}</span><select aria-label="Rows per page"><option>25</option></select><span>per page</span></div>
        </div>
        <p className="workspace-instruction">Click on the pin icon next to any workspace to pin it to the top of your list.<br />Dismiss this message</p>
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
          projects={filteredProjects}
          loading={loading}
          filters={columnFilters}
          onFilterChange={handleColumnFilterChange}
        />
      </main>
    </div>
  )
}
