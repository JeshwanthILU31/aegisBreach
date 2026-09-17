import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ProjectTable from '../components/projects/ProjectTable'
import { projects } from '../data/projects'

export default function Projects() {
  const [query, setQuery] = useState('')
  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return projects
    }

    return projects.filter((project) =>
      [project.name, project.matterName, project.matterNumber, project.clientNumber]
        .some((value) => value.toLowerCase().includes(normalizedQuery)),
    )
  }, [query])

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
            <span className="user-avatar">TR</span>
            <span>Training User</span>
          </div>
        </div>

      </header>
      <main className="selection-content">
        <div className="page-heading-row">
          <div className="workspace-page-title"><h1>Workspaces</h1><span className="pin-message">Pin Favorite Workspaces</span></div>
          <div className="workspace-page-actions"><button type="button">Filter</button><button type="button">Columns</button><span>1 - {projects.length} of {projects.length}</span><select aria-label="Rows per page"><option>25</option></select><span>per page</span></div>
        </div>
        <p className="workspace-instruction">Click on the pin icon next to any workspace to pin it to the top of your list.<br />Dismiss this message</p>
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
        <ProjectTable projects={filteredProjects} />
      </main>
    </div>
  )
}
