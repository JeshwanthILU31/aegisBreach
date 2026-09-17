import { Link, Route, Routes } from 'react-router-dom'
import { Login, ProjectWorkspace, Projects } from './pages'
import AdminProjectsPage from './components/admin/AdminProjectsPage'
import AdminBatchesPage from './components/admin/AdminBatchesPage'
import AdminDocumentsPage from './components/admin/AdminDocumentsPage'

function NotFoundPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-slate-900">Page not found</h1>
      <Link className="mt-4 inline-block text-slate-600 underline" to="/">
        Return home
      </Link>
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/projects" element={<Projects />} />
      <Route path="/admin" element={<AdminProjectsPage />} />
      <Route path="/admin/projects" element={<AdminProjectsPage />} />
      <Route path="/admin/projects/:projectId/batches" element={<AdminBatchesPage />} />
      <Route path="/admin/projects/:projectId/batches/:batchId/documents" element={<AdminDocumentsPage />} />
      <Route path="/projects/:projectId/*" element={<ProjectWorkspace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
