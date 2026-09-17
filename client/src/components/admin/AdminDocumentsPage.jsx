import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as documentsApi from '../../services/documentsApi'
import * as batchesApi from '../../services/batchesApi'
import * as projectsApi from '../../services/projectsApi'

const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024 // 30 MB
const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.tiff',
  '.bmp',
  '.txt',
  '.csv',
  '.docx',
  '.xlsx',
  '.pptx',
  '.doc',
  '.xls',
]
const ACCEPT_FILE_STRING = ALLOWED_EXTENSIONS.join(',')

function validateFile(file) {
  if (!file) return 'No file selected.'
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit of 30 MB.`
  }
  const ext = '.' + (file.name.split('.').pop() || '').toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `File type "${ext}" is not supported. Please upload a PDF, image, text, or office document.`
  }
  return null
}

const emptyDocumentForm = {
  controlNumber: '',
  fileName: '',
  fileSize: '1.5 MB',
  folder: 'Set 6',
  extractionStatus: 'Pending',
  reportableData: 'Pending',
}

const createEmptyBulkRow = () => ({
  id: Date.now() + Math.random(),
  controlNumber: '',
  fileName: '',
  fileSize: '1.5 MB',
  folder: 'Set 6',
})

export default function AdminDocumentsPage() {
  const { projectId, batchId } = useParams()
  const navigate = useNavigate()
  const activeProjectId = projectId || 'project-orchid-6-7'

  const fileInputRef = useRef(null)

  const [project, setProject] = useState(null)
  const [batch, setBatch] = useState(null)
  const [allBatches, setAllBatches] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Row-level upload state
  const [uploadingDoc, setUploadingDoc] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadFeedback, setUploadFeedback] = useState({ message: '', type: '' })

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [extractionFilter, setExtractionFilter] = useState('All')
  const [reportableFilter, setReportableFilter] = useState('All')
  const [reviewFilter, setReviewFilter] = useState('All')
  const [fileFilter, setFileFilter] = useState('All')

  // Modals: 'create' | 'bulk' | 'delete' | null
  const [modalMode, setModalMode] = useState(null)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [formData, setFormData] = useState(emptyDocumentForm)
  const [modalFile, setModalFile] = useState(null)
  const [bulkRows, setBulkRows] = useState([createEmptyBulkRow(), createEmptyBulkRow(), createEmptyBulkRow()])
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Load project, batch, and documents
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      // Fetch project info
      const projs = await projectsApi.getProjects()
      if (Array.isArray(projs)) {
        const currentProj = projs.find((p) => p._id === activeProjectId || p.slug === activeProjectId)
        if (currentProj) setProject(currentProj)
      }

      // Fetch batches for this project
      const batchList = await batchesApi.getBatches(activeProjectId)
      if (Array.isArray(batchList)) {
        setAllBatches(batchList)
        const currentBatch = batchList.find((b) => b._id === batchId)
        if (currentBatch) setBatch(currentBatch)
      }

      // Fetch documents for this batch
      const docList = await documentsApi.getDocuments(activeProjectId, { batchId })
      if (Array.isArray(docList)) {
        setDocuments(docList)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load documents.')
    } finally {
      setLoading(false)
    }
  }, [activeProjectId, batchId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Computed counts
  const totalCount = documents.length
  const reviewedCount = useMemo(() => documents.filter((d) => Boolean(d.flrReviewedBy)).length, [documents])
  const unreviewedCount = totalCount - reviewedCount
  const withFileCount = useMemo(() => documents.filter((d) => Boolean(d.fileUrl)).length, [documents])

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return documents.filter((doc) => {
      const matchesSearch = !q || [
        doc.controlNumber,
        doc.fileName,
        doc.folder,
        doc.flrReviewedBy,
        doc.flrReviewedOn,
        doc.format,
      ].some((val) => String(val || '').toLowerCase().includes(q))

      const matchesExtraction = extractionFilter === 'All' || doc.extractionStatus === extractionFilter
      const matchesReportable = reportableFilter === 'All' || doc.reportableData === reportableFilter
      const isReviewed = Boolean(doc.flrReviewedBy)
      const matchesReview =
        reviewFilter === 'All' ||
        (reviewFilter === 'Reviewed' && isReviewed) ||
        (reviewFilter === 'Unreviewed' && !isReviewed)
      const hasFile = Boolean(doc.fileUrl)
      const matchesFile =
        fileFilter === 'All' ||
        (fileFilter === 'Has File' && hasFile) ||
        (fileFilter === 'No File' && !hasFile)

      return matchesSearch && matchesExtraction && matchesReportable && matchesReview && matchesFile
    })
  }, [documents, searchQuery, extractionFilter, reportableFilter, reviewFilter, fileFilter])

  // Trigger file upload for a specific document row
  const triggerFileUpload = (doc) => {
    setUploadingDoc(doc)
    setUploadProgress(0)
    setUploadFeedback({ message: '', type: '' })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  // Handle row-level file selected
  const handleRowFileSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !uploadingDoc) return

    const validationErr = validateFile(file)
    if (validationErr) {
      setUploadFeedback({ message: validationErr, type: 'error' })
      setUploadingDoc(null)
      return
    }

    try {
      setUploadProgress(1)
      const updated = await documentsApi.uploadDocumentFile(
        activeProjectId,
        batchId,
        uploadingDoc.controlNumber || uploadingDoc._id,
        file,
        (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setUploadProgress(percent)
          }
        }
      )
      setUploadFeedback({
        message: `File "${file.name}" uploaded successfully for ${uploadingDoc.controlNumber}.`,
        type: 'success',
      })
      setUploadingDoc(null)
      setUploadProgress(0)
      // Update local state and reload
      setDocuments((prev) =>
        prev.map((d) => (d._id === updated._id || d.controlNumber === updated.controlNumber ? updated : d))
      )
      await loadData()
    } catch (err) {
      setUploadFeedback({
        message: err.response?.data?.error || err.message || 'File upload failed.',
        type: 'error',
      })
      setUploadingDoc(null)
      setUploadProgress(0)
    }
  }

  // Open Modals
  const openCreateModal = () => {
    setFormData(emptyDocumentForm)
    setModalFile(null)
    setFormError('')
    setSelectedDoc(null)
    setModalMode('create')
  }

  const openBulkModal = () => {
    setBulkRows([createEmptyBulkRow(), createEmptyBulkRow(), createEmptyBulkRow()])
    setFormError('')
    setModalMode('bulk')
  }

  const openDeleteModal = (doc) => {
    setFormError('')
    setSelectedDoc(doc)
    setModalMode('delete')
  }

  const closeModal = () => {
    if (submitting) return
    setModalMode(null)
    setSelectedDoc(null)
    setModalFile(null)
    setFormError('')
  }

  // Handle modal file selector change
  const handleModalFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const validationErr = validateFile(file)
      if (validationErr) {
        setFormError(validationErr)
        setModalFile(null)
        e.target.value = ''
        return
      }
      setFormError('')
      setModalFile(file)
      if (!formData.fileName) {
        setFormData((prev) => ({ ...prev, fileName: file.name }))
      }
    } else {
      setModalFile(null)
    }
  }

  // Handle Single Document Submit (Metadata + Optional File)
  const handleSingleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.controlNumber.trim()) {
      setFormError('Control Number is required.')
      return
    }
    if (!formData.fileName.trim()) {
      setFormError('File Name is required.')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      const payload = {
        batchId,
        controlNumber: formData.controlNumber.trim(),
        fileName: formData.fileName.trim(),
        fileSize: formData.fileSize?.trim() || '1.5 MB',
        folder: formData.folder?.trim() || 'Set 6',
        extractionStatus: formData.extractionStatus || 'Pending',
        reportableData: formData.reportableData || 'Pending',
      }

      // Step 1: Create document metadata
      const createdDoc = await documentsApi.createDocument(activeProjectId, payload)

      // Step 2: Upload file if provided
      if (modalFile && createdDoc) {
        try {
          await documentsApi.uploadDocumentFile(
            activeProjectId,
            batchId,
            createdDoc.controlNumber || createdDoc._id,
            modalFile
          )
        } catch (uploadErr) {
          // Keep document, show clear feedback
          setFormError(
            `Document metadata was created successfully, but file upload failed: ${
              uploadErr.response?.data?.error || uploadErr.message
            }. You can retry uploading the file from the table.`
          )
          await loadData()
          setSubmitting(false)
          return
        }
      }

      setModalMode(null)
      setModalFile(null)
      await loadData()
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Failed to create document.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Bulk Row Changes
  const updateBulkRow = (index, field, value) => {
    setBulkRows((rows) => {
      const updated = [...rows]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const addBulkRow = () => {
    setBulkRows((rows) => [...rows, createEmptyBulkRow()])
  }

  const removeBulkRow = (index) => {
    if (bulkRows.length <= 1) return
    setBulkRows((rows) => rows.filter((_, i) => i !== index))
  }

  // Handle Bulk Submit
  const handleBulkSubmit = async (e) => {
    e.preventDefault()
    const cleanedRows = []
    const seenControlNumbers = new Set()

    for (let i = 0; i < bulkRows.length; i++) {
      const row = bulkRows[i]
      const cn = row.controlNumber.trim()
      const fn = row.fileName.trim()

      if (!cn && !fn) continue

      if (!cn) {
        setFormError(`Row ${i + 1}: Control Number is required.`)
        return
      }
      if (!fn) {
        setFormError(`Row ${i + 1}: File Name is required.`)
        return
      }
      if (seenControlNumbers.has(cn)) {
        setFormError(`Duplicate control number "${cn}" in row ${i + 1}.`)
        return
      }

      seenControlNumbers.add(cn)
      cleanedRows.push({
        controlNumber: cn,
        fileName: fn,
        fileSize: row.fileSize?.trim() || '1.5 MB',
        folder: row.folder?.trim() || 'Set 6',
      })
    }

    if (cleanedRows.length === 0) {
      setFormError('Please enter at least one valid document row.')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      await documentsApi.createBulkDocuments(activeProjectId, {
        batchId,
        documents: cleanedRows,
      })
      setModalMode(null)
      await loadData()
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Failed to create bulk documents.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!selectedDoc) return
    setSubmitting(true)
    setFormError('')

    try {
      await documentsApi.deleteDocument(activeProjectId, selectedDoc.controlNumber || selectedDoc._id)
      setModalMode(null)
      setSelectedDoc(null)
      await loadData()
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Failed to delete document.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f4f5f6' }}>
      {/* Hidden file input for row-level upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleRowFileSelected}
        style={{ display: 'none' }}
        accept={ACCEPT_FILE_STRING}
      />

      {/* Top Header */}
      <header className="selection-header" style={{ flexShrink: 0 }}>
        <Link className="selection-brand" to="/admin">
          <span className="relativity-mark" style={{ background: '#7c3aed' }}>A</span>
          <span>AegisBreach Admin</span>
        </Link>
        <div style={{ marginLeft: '16px', color: '#c4cdd5', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link to="/admin/projects" style={{ color: '#93c5fd', textDecoration: 'none' }}>Projects</Link>
          <span>/</span>
          <Link to={`/admin/projects/${project?.slug || activeProjectId}/batches`} style={{ color: '#93c5fd', textDecoration: 'none' }}>
            {project?.name || activeProjectId}
          </Link>
          <span>/</span>
          <Link to={`/admin/projects/${project?.slug || activeProjectId}/batches`} style={{ color: '#93c5fd', textDecoration: 'none' }}>
            Batches
          </Link>
          <span>/</span>
          <strong style={{ color: '#fff' }}>{batch?.name || 'Documents'}</strong>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            className="legacy-button"
            to={`/projects/${project?.slug || activeProjectId}/review`}
            style={{ textDecoration: 'none', color: '#fff', background: '#374151', border: '1px solid #4b5563' }}
          >
            &larr; Review Workspace
          </Link>
          <div className="selection-user">
            <span className="user-avatar" style={{ background: '#7c3aed' }}>AD</span>
            <span>Admin</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px', minHeight: 0, overflow: 'hidden' }}>
        {/* Page Title & Batch Switcher & Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '10px', color: '#68767e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ADMINISTRATION / {project?.name?.toUpperCase() || activeProjectId.toUpperCase()} / BATCH: {batch?.name || batchId}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#33444e', margin: '2px 0 0 0' }}>
                Document Management
              </h1>
              {allBatches.length > 1 && (
                <select
                  value={batchId}
                  onChange={(e) => navigate(`/admin/projects/${project?.slug || activeProjectId}/batches/${e.target.value}/documents`)}
                  style={{ height: '24px', fontSize: '11px', marginTop: '2px' }}
                  aria-label="Switch batch"
                >
                  {allBatches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name} ({b.status})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Link
              to={`/admin/projects/${project?.slug || activeProjectId}/batches`}
              className="legacy-button"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '12px' }}
            >
              &larr; Back to Batches
            </Link>
            <button
              className="legacy-button"
              type="button"
              onClick={openBulkModal}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '12px' }}
            >
              <span>++</span> Add Multiple
            </button>
            <button
              className="legacy-button primary-legacy"
              type="button"
              onClick={openCreateModal}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12px' }}
            >
              <span>+</span> New Document
            </button>
          </div>
        </div>

        {/* Batch Status & Counts Header Banner */}
        <div style={{ display: 'flex', gap: '16px', background: '#fff', border: '1px solid #c2cace', borderRadius: '3px', padding: '8px 14px', marginBottom: '10px', fontSize: '12px', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <span style={{ color: '#68767e' }}>Batch Set:</span> <strong>{batch?.batchSet || '-'}</strong>
          </div>
          <div style={{ height: '14px', width: '1px', background: '#e2e8f0' }} />
          <div>
            <span style={{ color: '#68767e' }}>Batch Status:</span>{' '}
            <span
              style={{
                display: 'inline-block',
                padding: '1px 6px',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: 600,
                background:
                  batch?.status === 'Completed'
                    ? '#def7ec'
                    : batch?.status === 'In Progress'
                    ? '#e0e7ff'
                    : '#f3f4f6',
                color:
                  batch?.status === 'Completed'
                    ? '#03543f'
                    : batch?.status === 'In Progress'
                    ? '#3730a3'
                    : '#4b5563',
              }}
            >
              {batch?.status || 'Available'}
            </span>
          </div>
          <div style={{ height: '14px', width: '1px', background: '#e2e8f0' }} />
          <div>
            <span style={{ color: '#68767e' }}>Assigned To:</span>{' '}
            <strong>{batch?.assignedToName || 'Unassigned'}</strong>
            {batch?.isLocked && ' 🔒'}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div>
              <span style={{ color: '#68767e' }}>Total Docs:</span> <strong>{totalCount}</strong>
            </div>
            <div>
              <span style={{ color: '#03543f' }}>Reviewed:</span> <strong>{reviewedCount}</strong>
            </div>
            <div>
              <span style={{ color: '#b45309' }}>Unreviewed:</span> <strong>{unreviewedCount}</strong>
            </div>
            <div>
              <span style={{ color: '#2563eb' }}>Attached Files:</span> <strong>{withFileCount}</strong>
            </div>
          </div>
        </div>

        {/* Feedback / Upload Banner */}
        {uploadFeedback.message && (
          <div
            style={{
              background: uploadFeedback.type === 'success' ? '#def7ec' : '#fdf2f2',
              border: `1px solid ${uploadFeedback.type === 'success' ? '#84e1bc' : '#f8b4b4'}`,
              color: uploadFeedback.type === 'success' ? '#03543f' : '#9b1c1c',
              padding: '8px 12px',
              fontSize: '12px',
              marginBottom: '10px',
              borderRadius: '3px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{uploadFeedback.message}</span>
            <button
              className="legacy-button"
              type="button"
              onClick={() => setUploadFeedback({ message: '', type: '' })}
              style={{ fontSize: '11px', padding: '2px 6px' }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Toolbar & Filters */}
        <div className="review-control-strip" style={{ marginBottom: '10px', borderRadius: '3px' }}>
          <label>
            Search{' '}
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search control #, filename, format..."
              style={{ width: '200px', height: '26px' }}
            />
          </label>
          <label style={{ marginLeft: '6px' }}>
            Extraction{' '}
            <select
              value={extractionFilter}
              onChange={(e) => setExtractionFilter(e.target.value)}
              style={{ height: '26px', padding: '0 6px' }}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="In Progress">In Progress</option>
            </select>
          </label>
          <label style={{ marginLeft: '6px' }}>
            Reportable{' '}
            <select
              value={reportableFilter}
              onChange={(e) => setReportableFilter(e.target.value)}
              style={{ height: '26px', padding: '0 6px' }}
            >
              <option value="All">All</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="Pending">Pending</option>
            </select>
          </label>
          <label style={{ marginLeft: '6px' }}>
            Review{' '}
            <select
              value={reviewFilter}
              onChange={(e) => setReviewFilter(e.target.value)}
              style={{ height: '26px', padding: '0 6px' }}
            >
              <option value="All">All Docs</option>
              <option value="Reviewed">Reviewed Only</option>
              <option value="Unreviewed">Unreviewed Only</option>
            </select>
          </label>
          <label style={{ marginLeft: '6px' }}>
            Storage{' '}
            <select
              value={fileFilter}
              onChange={(e) => setFileFilter(e.target.value)}
              style={{ height: '26px', padding: '0 6px' }}
            >
              <option value="All">All Storage</option>
              <option value="Has File">Has File</option>
              <option value="No File">No File</option>
            </select>
          </label>
          {searchQuery && (
            <button
              className="legacy-button"
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ height: '26px' }}
            >
              Clear
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#68767e' }}>
            {filteredDocuments.length} of {documents.length} documents
          </span>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div style={{ background: '#fdf2f2', border: '1px solid #f8b4b4', color: '#9b1c1c', padding: '8px 12px', fontSize: '12px', marginBottom: '10px', borderRadius: '3px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button className="legacy-button" type="button" onClick={loadData}>Retry</button>
          </div>
        )}

        {/* Table / Results Container */}
        <div style={{ flex: 1, minHeight: 0, background: '#fff', border: '1px solid #c2cace', borderRadius: '3px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="review-results-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <table className="review-results-table" style={{ width: '100%', minWidth: '1120px' }}>
              <thead>
                <tr>
                  <th style={{ width: '35px', textAlign: 'center' }}>#</th>
                  <th>Control Number</th>
                  <th>File Name</th>
                  <th style={{ width: '70px', textAlign: 'center' }}>File</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>File Size</th>
                  <th>Folder</th>
                  <th>Extraction Status</th>
                  <th>Reportable Data</th>
                  <th>FLR Reviewed By</th>
                  <th>FLR Reviewed On</th>
                  <th style={{ width: '150px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: '36px', color: '#68767e' }}>
                      Loading documents for batch...
                    </td>
                  </tr>
                ) : filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: '36px', color: '#68767e' }}>
                      {documents.length === 0
                        ? 'No documents found in this batch. Click "+ New Document" or "++ Add Multiple" above to add metadata.'
                        : 'No documents match your filter criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc, index) => {
                    const isReviewed = Boolean(doc.flrReviewedBy)
                    const isCurrentUploading = uploadingDoc?._id === doc._id || uploadingDoc?.controlNumber === doc.controlNumber
                    const fileExtension = (doc.format || doc.fileName?.split('.').pop() || 'FILE').toUpperCase()

                    return (
                      <tr key={doc._id || doc.controlNumber || index}>
                        <td style={{ textAlign: 'center', color: '#68767e' }}>{index + 1}</td>
                        <td style={{ fontWeight: 600, color: '#105280', fontFamily: 'monospace' }}>
                          {doc.controlNumber}
                        </td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.fileName}>
                          {doc.fileName}
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {doc.fileUrl ? (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-block',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 700,
                                background: '#e0e7ff',
                                color: '#3730a3',
                                textDecoration: 'none',
                                border: '1px solid #c7d2fe',
                              }}
                              title={`Open stored ${fileExtension} file in new tab`}
                            >
                              {fileExtension}
                            </a>
                          ) : (
                            <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '11px' }}>
                              No file
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', color: '#68767e' }}>{doc.fileSize || '1.5 MB'}</td>
                        <td>{doc.folder || 'Set 6'}</td>
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '10px',
                              fontWeight: 600,
                              background:
                                doc.extractionStatus === 'Completed' || doc.extractionStatus === 'Complete'
                                  ? '#def7ec'
                                  : doc.extractionStatus === 'In Progress'
                                  ? '#e0e7ff'
                                  : '#f3f4f6',
                              color:
                                doc.extractionStatus === 'Completed' || doc.extractionStatus === 'Complete'
                                  ? '#03543f'
                                  : doc.extractionStatus === 'In Progress'
                                  ? '#3730a3'
                                  : '#4b5563',
                            }}
                          >
                            {doc.extractionStatus || 'Pending'}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '10px',
                              fontWeight: 600,
                              background:
                                doc.reportableData === 'Yes'
                                  ? '#def7ec'
                                  : doc.reportableData === 'No'
                                  ? '#fde8e8'
                                  : '#fef08a',
                              color:
                                doc.reportableData === 'Yes'
                                  ? '#03543f'
                                  : doc.reportableData === 'No'
                                  ? '#9b1c1c'
                                  : '#713f12',
                            }}
                          >
                            {doc.reportableData || 'Pending'}
                          </span>
                        </td>
                        <td>
                          {isReviewed ? (
                            <span style={{ fontWeight: 600, color: '#03543f' }}>{doc.flrReviewedBy}</span>
                          ) : (
                            <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Unreviewed</span>
                          )}
                        </td>
                        <td style={{ color: '#4d5e67' }}>{doc.flrReviewedOn || '-'}</td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '4px' }}>
                            <button
                              className="legacy-button"
                              type="button"
                              onClick={() => triggerFileUpload(doc)}
                              disabled={isCurrentUploading}
                              title={
                                doc.fileUrl
                                  ? 'Upload a new file to replace the existing Cloudinary asset'
                                  : 'Upload file to Cloudinary'
                              }
                              style={{ padding: '2px 8px', fontSize: '11px', color: doc.fileUrl ? '#1e40af' : '#03543f' }}
                            >
                              {isCurrentUploading
                                ? `Uploading ${uploadProgress}%...`
                                : doc.fileUrl
                                ? 'Replace'
                                : 'Upload File'}
                            </button>
                            <button
                              className="legacy-button"
                              type="button"
                              onClick={() => openDeleteModal(doc)}
                              disabled={isCurrentUploading}
                              title="Delete document & coding record"
                              style={{ padding: '2px 8px', fontSize: '11px', color: '#9b1c1c' }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Create Single Document Modal (Metadata + Optional File Upload) */}
      {modalMode === 'create' && (
        <div className="person-tracker-overlay" style={{ zIndex: 1000 }}>
          <div className="person-tracker-form" style={{ width: '540px' }} role="dialog" aria-modal="true" aria-labelledby="doc-modal-title">
            <div className="person-tracker-form-header">
              <strong id="doc-modal-title">Add Document Metadata</strong>
              <button type="button" onClick={closeModal} aria-label="Close modal" disabled={submitting}>
                x
              </button>
            </div>

            <form onSubmit={handleSingleSubmit}>
              <div className="person-tracker-form-body" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {formError && (
                  <div style={{ gridColumn: '1 / -1', background: '#fdf2f2', border: '1px solid #f8b4b4', color: '#9b1c1c', padding: '6px 10px', fontSize: '11px', borderRadius: '3px' }}>
                    {formError}
                  </div>
                )}

                <div style={{ gridColumn: '1 / -1', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '6px 10px', fontSize: '11px', color: '#475569' }}>
                  <strong>Target Batch:</strong> {batch?.name || batchId} | <strong>Project:</strong> {project?.name || activeProjectId}
                </div>

                <label className="coding-field" style={{ gridColumn: '1 / -1' }}>
                  <span>CONTROL NUMBER *</span>
                  <input
                    autoFocus
                    required
                    value={formData.controlNumber}
                    onChange={(e) => setFormData({ ...formData, controlNumber: e.target.value })}
                    placeholder="e.g. OR-600010"
                    disabled={submitting}
                  />
                </label>

                <label className="coding-field" style={{ gridColumn: '1 / -1' }}>
                  <span>FILE NAME *</span>
                  <input
                    required
                    value={formData.fileName}
                    onChange={(e) => setFormData({ ...formData, fileName: e.target.value })}
                    placeholder="e.g. statement_report_2026.pdf"
                    disabled={submitting}
                  />
                </label>

                {/* Optional File Selector */}
                <label className="coding-field" style={{ gridColumn: '1 / -1' }}>
                  <span>ATTACH FILE (OPTIONAL - CLOUDINARY)</span>
                  <input
                    type="file"
                    onChange={handleModalFileChange}
                    accept={ACCEPT_FILE_STRING}
                    disabled={submitting}
                    style={{ padding: '3px 4px', fontSize: '11px' }}
                  />
                  {modalFile && (
                    <span style={{ fontSize: '10px', color: '#03543f', marginTop: '2px' }}>
                      Selected: {modalFile.name} ({(modalFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  )}
                </label>

                <label className="coding-field">
                  <span>FILE SIZE</span>
                  <input
                    value={formData.fileSize}
                    onChange={(e) => setFormData({ ...formData, fileSize: e.target.value })}
                    placeholder="e.g. 1.5 MB"
                    disabled={submitting}
                  />
                </label>

                <label className="coding-field">
                  <span>FOLDER</span>
                  <input
                    value={formData.folder}
                    onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
                    placeholder="e.g. Set 6"
                    disabled={submitting}
                  />
                </label>

                <label className="coding-field">
                  <span>EXTRACTION STATUS</span>
                  <select
                    value={formData.extractionStatus}
                    onChange={(e) => setFormData({ ...formData, extractionStatus: e.target.value })}
                    disabled={submitting}
                    style={{ height: '26px' }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </label>

                <label className="coding-field">
                  <span>REPORTABLE DATA</span>
                  <select
                    value={formData.reportableData}
                    onChange={(e) => setFormData({ ...formData, reportableData: e.target.value })}
                    disabled={submitting}
                    style={{ height: '26px' }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </label>
              </div>

              <div className="person-tracker-form-footer">
                <button className="legacy-button primary-legacy" type="submit" disabled={submitting}>
                  {submitting
                    ? modalFile
                      ? 'Creating & Uploading...'
                      : 'Creating...'
                    : modalFile
                    ? 'Create & Upload'
                    : 'Create Document'}
                </button>
                <button className="legacy-button" type="button" onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Document Creation Modal */}
      {modalMode === 'bulk' && (
        <div className="person-tracker-overlay" style={{ zIndex: 1000 }}>
          <div className="person-tracker-form" style={{ width: '740px', maxWidth: '95vw' }} role="dialog" aria-modal="true" aria-labelledby="bulk-modal-title">
            <div className="person-tracker-form-header">
              <strong id="bulk-modal-title">Add Multiple Documents (Metadata)</strong>
              <button type="button" onClick={closeModal} aria-label="Close modal" disabled={submitting}>
                x
              </button>
            </div>

            <form onSubmit={handleBulkSubmit}>
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '60vh', overflowY: 'auto' }}>
                {formError && (
                  <div style={{ background: '#fdf2f2', border: '1px solid #f8b4b4', color: '#9b1c1c', padding: '6px 10px', fontSize: '11px', borderRadius: '3px' }}>
                    {formError}
                  </div>
                )}

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '6px 10px', fontSize: '11px', color: '#475569' }}>
                  Adding metadata records to <strong>{batch?.name || batchId}</strong>. Each record starts in an unreviewed state.
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: '#e5e7eb', textAlign: 'left', color: '#374151' }}>
                      <th style={{ padding: '6px 8px', width: '30px', textAlign: 'center' }}>#</th>
                      <th style={{ padding: '6px 8px' }}>Control Number *</th>
                      <th style={{ padding: '6px 8px' }}>File Name *</th>
                      <th style={{ padding: '6px 8px', width: '100px' }}>Folder</th>
                      <th style={{ padding: '6px 8px', width: '90px' }}>File Size</th>
                      <th style={{ padding: '6px 8px', width: '40px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.map((row, index) => (
                      <tr key={row.id || index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ textAlign: 'center', color: '#68767e' }}>{index + 1}</td>
                        <td style={{ padding: '4px' }}>
                          <input
                            required
                            value={row.controlNumber}
                            onChange={(e) => updateBulkRow(index, 'controlNumber', e.target.value)}
                            placeholder="e.g. OR-600020"
                            style={{ width: '100%', height: '24px', padding: '2px 6px', fontSize: '11px' }}
                            disabled={submitting}
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <input
                            required
                            value={row.fileName}
                            onChange={(e) => updateBulkRow(index, 'fileName', e.target.value)}
                            placeholder="e.g. financial_doc.pdf"
                            style={{ width: '100%', height: '24px', padding: '2px 6px', fontSize: '11px' }}
                            disabled={submitting}
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <input
                            value={row.folder}
                            onChange={(e) => updateBulkRow(index, 'folder', e.target.value)}
                            placeholder="Set 6"
                            style={{ width: '100%', height: '24px', padding: '2px 6px', fontSize: '11px' }}
                            disabled={submitting}
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <input
                            value={row.fileSize}
                            onChange={(e) => updateBulkRow(index, 'fileSize', e.target.value)}
                            placeholder="1.5 MB"
                            style={{ width: '100%', height: '24px', padding: '2px 6px', fontSize: '11px' }}
                            disabled={submitting}
                          />
                        </td>
                        <td style={{ textAlign: 'center', padding: '4px' }}>
                          <button
                            type="button"
                            onClick={() => removeBulkRow(index)}
                            disabled={bulkRows.length <= 1 || submitting}
                            style={{ color: bulkRows.length > 1 ? '#9b1c1c' : '#9ca3af', background: 'none', border: 'none', cursor: bulkRows.length > 1 ? 'pointer' : 'default', fontWeight: 'bold' }}
                            title="Remove row"
                          >
                            &times;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div>
                  <button
                    type="button"
                    className="legacy-button"
                    onClick={addBulkRow}
                    disabled={submitting}
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                  >
                    + Add Another Row
                  </button>
                </div>
              </div>

              <div className="person-tracker-form-footer">
                <button className="legacy-button primary-legacy" type="submit" disabled={submitting}>
                  {submitting ? 'Creating Documents...' : `Create ${bulkRows.filter((r) => r.controlNumber.trim()).length || bulkRows.length} Documents`}
                </button>
                <button className="legacy-button" type="button" onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {modalMode === 'delete' && selectedDoc && (
        <div className="person-tracker-overlay" style={{ zIndex: 1000 }}>
          <div className="person-tracker-form" style={{ width: '480px' }} role="dialog" aria-modal="true" aria-labelledby="delete-doc-title">
            <div className="person-tracker-form-header" style={{ background: 'linear-gradient(#9b1c1c, #771d1d)' }}>
              <strong id="delete-doc-title">Confirm Document Deletion</strong>
              <button type="button" onClick={closeModal} aria-label="Close modal" disabled={submitting}>
                x
              </button>
            </div>

            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {formError && (
                <div style={{ background: '#fdf2f2', border: '1px solid #f8b4b4', color: '#9b1c1c', padding: '6px 10px', fontSize: '11px', borderRadius: '3px' }}>
                  {formError}
                </div>
              )}

              <p style={{ margin: 0, fontSize: '13px', color: '#1f2937', fontWeight: 500 }}>
                Are you sure you want to delete document <strong>&ldquo;{selectedDoc.controlNumber}&rdquo;</strong> ({selectedDoc.fileName})?
              </p>

              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '4px', padding: '10px 12px', fontSize: '12px', color: '#92400e', lineHeight: '1.4' }}>
                <strong>&bull; Associated Coding Warning:</strong>
                <div style={{ marginTop: '4px' }}>
                  Deleting this document will also permanently remove its associated <strong>Coding Record</strong> from MongoDB and update the batch reviewed count.
                </div>
              </div>

              <div style={{ fontSize: '11px', color: '#68767e' }}>
                Batch: {batch?.name || batchId} | Folder: {selectedDoc.folder || 'Set 6'} | Review: {selectedDoc.flrReviewedBy ? `Reviewed by ${selectedDoc.flrReviewedBy}` : 'Unreviewed'}
              </div>
            </div>

            <div className="person-tracker-form-footer">
              <button
                className="legacy-button"
                type="button"
                onClick={handleDeleteConfirm}
                disabled={submitting}
                style={{ background: '#9b1c1c', color: '#fff', borderColor: '#771d1d', fontWeight: 600 }}
              >
                {submitting ? 'Deleting...' : 'Permanently Delete'}
              </button>
              <button className="legacy-button" type="button" onClick={closeModal} disabled={submitting}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
