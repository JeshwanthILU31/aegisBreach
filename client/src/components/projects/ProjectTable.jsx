import { Link } from 'react-router-dom'

export default function ProjectTable({
  projects = [],
  loading = false,
  filters = {},
  onFilterChange = () => {},
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
              const artifactId = project.caseArtifactId || (project._id ? parseInt(project._id.slice(-6), 16) : 11420698 + index)
              return (
                <tr key={projectKey}>
                  <td className="row-number">{index + 1}</td>
                  <td className="check-column"><input type="checkbox" aria-label={`Select ${project.name}`} /></td>
                  <td className="artifact-id">{artifactId}</td>
                  <td><button className="pin-button" type="button" aria-label={`Pin ${project.name}`}>*</button></td>
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
