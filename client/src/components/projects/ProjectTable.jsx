import { Link } from 'react-router-dom'

export default function ProjectTable({ projects }) {
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
            <th><input aria-label="Filter case artifact ID" placeholder="Filter" /></th>
            <th />
            <th><input aria-label="Filter workspace name" placeholder="Filter" /></th>
            <th><input aria-label="Filter matter name" placeholder="Filter" /></th>
            <th><input aria-label="Filter matter number" placeholder="Filter" /></th>
            <th><select aria-label="Filter status" defaultValue="All"><option value="All">(All)</option><option>Active</option></select></th>
            <th><input aria-label="Filter client number" placeholder="Filter" /></th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project, index) => (
            <tr key={project.id}>
              <td className="row-number">{index + 1}</td>
              <td className="check-column"><input type="checkbox" aria-label={`Select ${project.name}`} /></td>
              <td className="artifact-id">{11420698 + index}</td>
              <td><button className="pin-button" type="button" aria-label={`Pin ${project.name}`}>*</button></td>
              <td>
                <Link className="table-link" to={`/projects/${project.id}`}>
                  {project.name}
                </Link>
              </td>
              <td>{project.matterName}</td>
              <td>{project.matterNumber}</td>
              <td><span className="status-badge">{project.status}</span></td>
              <td>{project.clientNumber}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
