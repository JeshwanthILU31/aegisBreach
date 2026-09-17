import { useCallback, useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import CodingPage from '../components/coding/CodingPage'
import DocumentsPage from '../components/documents/DocumentsPage'
import DocumentViewerPlaceholder from '../components/documents/DocumentViewerPlaceholder'
import ReviewPage from '../components/review/ReviewPage'
import * as projectsApi from '../services/projectsApi'

const sectionLabels = {
  documents: 'Documents',
  review: 'Review',
}

function SectionPlaceholder({ label }) {
  return (
    <section className="workspace-panel placeholder-panel">
      <p className="eyebrow">Project workspace</p>
      <h1>{label}</h1>
      <p className="muted-text">{label} — Coming in next implementation step</p>
    </section>
  )
}

function WorkspaceOverview({ project }) {
  return (
    <section className="workspace-panel placeholder-panel">
      <p className="eyebrow">Project workspace</p>
      <h1>{project.name}</h1>
      <p className="muted-text">Select Documents or Review from the project navigation.</p>
    </section>
  )
}

export default function ProjectWorkspace() {
  const { projectId } = useParams()
  const location = useLocation()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchProject = useCallback(async () => {
    if (!projectId) return
    try {
      setLoading(true)
      setError('')
      const data = await projectsApi.getProject(projectId)
      if (data && (data._id || data.id)) {
        setProject(data)
      } else {
        setError('Project not found')
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Project not found')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  const pathParts = location.pathname.split('/').filter(Boolean)
  const sectionKey = pathParts.at(-1)
  const isDocumentRoute = pathParts.at(-2) === 'documents'
  const isReviewRoute = pathParts.at(-2) === 'review'
  const isCodingRoute = pathParts.at(-1) === 'coding' && pathParts.at(-3) === 'documents'
  const sectionLabel = sectionLabels[sectionKey]

  if (loading) {
    return (
      <div className="not-found-state" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <h2>Loading workspace...</h2>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="not-found-state" style={{ padding: '40px', textAlign: 'center' }}>
        <h1>{error || 'Project not found'}</h1>
      </div>
    )
  }

  return (
    <AppShell project={project}>
      {isCodingRoute ? <CodingPage /> : isDocumentRoute && sectionKey !== 'documents' ? <DocumentViewerPlaceholder /> : isReviewRoute ? <DocumentViewerPlaceholder /> : sectionKey === 'documents' ? <DocumentsPage /> : sectionKey === 'review' ? <ReviewPage /> : sectionLabel ? <SectionPlaceholder label={sectionLabel} /> : <WorkspaceOverview project={project} />}
    </AppShell>
  )
}
