import { Link, useParams } from 'react-router-dom'

export default function DocumentViewerPlaceholder() {
  const { projectId, documentId } = useParams()
  return <section className="workspace-panel placeholder-panel document-viewer-placeholder"><p className="eyebrow">Documents</p><h1>Document Viewer</h1><p className="muted-text">Document {documentId} is ready for the viewer implementation.</p><Link className="secondary-button" to={`/projects/${projectId}/documents`}>Back to Documents</Link></section>
}
