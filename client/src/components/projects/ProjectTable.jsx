import { Link } from 'react-router-dom'
import { Pin } from 'lucide-react'

export default function ProjectTable({
  projects = [],
  loading = false,
  filters = {},
  onFilterChange = () => {},
  pinnedIds = [],
  onTogglePin = () => {},
}) {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th className="row-number">#</th>
            <th className="check-column"><input type="checkbox" aria-label="Select all workspaces" /></th>
            <th>Case Artifact ID</th>
            <th>Pin</th>
            <th>Name</th>
            <th>Matter Name</th>
            <th>Matter number</th>
            <th>Status</th>
            <th>Client Number</th>
          </tr>
          <tr className="filter-row">
            <th colSpan="2" />
            <th>
              <input
                aria-label="Filter case artifact ID"
                placeholder="Filter"
                value={filters.caseArtifactId || ''}
                onChange={(e) => onFilterChange('caseArtifactId', e.target.value)}
              />
            </th>
            <th />
            <th>
              <input
                aria-label="Filter workspace name"
                placeholder="Filter"
                value={filters.name || ''}
                onChange={(e) => onFilterChange('name', e.target.value)}
              />
            </th>
            <th>
              <input
                aria-label="Filter matter name"
                placeholder="Filter"
                value={filters.matterName || ''}
                onChange={(e) => onFilterChange('matterName', e.target.value)}
              />
            </th>
            <th>
              <input
                aria-label="Filter matter number"
                placeholder="Filter"
                value={filters.matterNumber || ''}
                onChange={(e) => onFilterChange('matterNumber', e.target.value)}
              />
            </th>
            <th>
              <select
                aria-label="Filter status"
                value={filters.status || 'All'}
                onChange={(e) => onFilterChange('status', e.target.value)}
              >
                <option value="All">(All)</option>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Archived">Archived</option>
              </select>
            </th>
            <th>
              <input
                aria-label="Filter client number"
                placeholder="Filter"
                value={filters.clientNumber || ''}
                onChange={(e) => onFilterChange('clientNumber', e.target.value)}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                Loading workspaces...
              </td>
            </tr>
          ) : projects.length === 0 ? (
            <tr>
              <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                No workspaces found.
              </td>
            </tr>
          ) : (
            projects.map((project, index) => {
              const projectKey = project.slug || project._id || project.id
              const stableId = String(project._id || project.id || project.slug)
              const isPinned = pinnedIds.includes(stableId)
              const artifactId = project.caseArtifactId || (project._id ? parseInt(project._id.slice(-6), 16) : 11420698 + index)
              return (
                <tr key={projectKey} className={isPinned ? 'is-pinned-row' : ''}>
                  <td className="row-number">{index + 1}</td>
                  <td className="check-column"><input type="checkbox" aria-label={`Select ${project.name}`} /></td>
                  <td className="artifact-id">{artifactId}</td>
                  <td>
                    <button
                      className={`pin-button ${isPinned ? 'is-pinned' : ''}`}
                      type="button"
                      aria-label={isPinned ? `Unpin ${project.name}` : `Pin ${project.name}`}
                      title={isPinned ? `Unpin ${project.name}` : `Pin ${project.name}`}
                      onClick={() => onTogglePin(stableId)}
                    >
                      <Pin
                        size={12}
                        style={{
                          transform: isPinned ? 'rotate(-30deg)' : 'none',
                          fill: isPinned ? '#2e648e' : 'none',
                          color: isPinned ? '#2e648e' : '#8c9ba5',
                        }}
                      />
                    </button>
                  </td>
                  <td>
                    <Link className="table-link" to={`/projects/${projectKey}`}>
                      {project.name}
                    </Link>
                  </td>
                  <td>{project.matterName || ''}</td>
                  <td>{project.matterNumber || ''}</td>
                  <td><span className="status-badge">{project.status || 'Active'}</span></td>
                  <td>{project.clientNumber || ''}</td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
