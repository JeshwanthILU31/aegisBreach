import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function AppShell({ children, project }) {
  return (
    <div className="app-shell workspace-shell">
      <Sidebar projectId={project?.id} />
      <div className="app-main">
        <TopBar project={project} />
        <div className="app-content">{children}</div>
      </div>
    </div>
  )
}
