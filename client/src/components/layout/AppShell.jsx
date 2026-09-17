import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function AppShell({ children, project }) {
  const projectKey = project?.slug || project?._id || project?.id
  return (
    <div className="app-shell workspace-shell">
      <Sidebar projectId={projectKey} />
      <div className="app-main">
        <TopBar project={project} />
        <div className="app-content">{children}</div>
      </div>
    </div>
  )
}
