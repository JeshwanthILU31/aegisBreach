import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import api from '../../services/api'

const defaultCoding = {
  alDesignation: 'Relevant',
  flrComplete: 'Yes',
  reportableDataFound: 'Alternate Workflow 6+ Entries',
  extractionStatus: 'Completed',
  alternateWorkflowEstimate: '6 - 25 Entries',
  alternateWorkflowComplete: 'Yes',
  awfExtractionCompleted: 'Yes',
  extractedOutsideRelativity: '',
  txtStatus: '',
  entriesCompleted: '',
  reviewerNotes: '',
  familyGroup: 'None',
  persons: [],
}

const emptyPerson = { personDocLink: '', firstName: '', lastName: '', role: '' }

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="coding-panel-section">
      <button
        className="coding-panel-section-title"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <span>{open ? '-' : '+'}</span>
        <strong>{title}</strong>
      </button>
      {open && <div className="coding-panel-section-body">{children}</div>}
    </section>
  )
}

function CodingField({ label, children }) {
  return (
    <label className="coding-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function PersonTracker({ persons, setPersons, readOnly }) {
  const [draft, setDraft] = useState(emptyPerson)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const handleMouseDown = (e) => {
    if (e.target.tagName === 'BUTTON') return
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    },
    [isDragging, dragStart]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }))

  const addPerson = () => {
    if (!draft.firstName && !draft.lastName && !draft.personDocLink) return
    setPersons((current) => [...current, draft])
    setDraft(emptyPerson)
    setShowForm(false)
  }

  const removePerson = () => {
    if (selectedIndex === null) return
    setPersons((current) => current.filter((_, index) => index !== selectedIndex))
    setSelectedIndex(null)
  }

  return (
    <>
      <div className="coding-inline-actions">
        <button
          className="legacy-button"
          type="button"
          disabled={readOnly}
          onClick={() => {
            setDraft(emptyPerson)
            setPosition({ x: 0, y: 0 })
            setShowForm(true)
          }}
        >
          New
        </button>
        <button
          className="legacy-button"
          type="button"
          disabled={readOnly}
          onClick={() => {
            setDraft(emptyPerson)
            setPosition({ x: 0, y: 0 })
            setShowForm(true)
          }}
        >
          Link
        </button>
        <button
          className="legacy-button"
          type="button"
          disabled={readOnly || selectedIndex === null}
          onClick={removePerson}
        >
          Unlink
        </button>
      </div>

      <div className="person-tracker-fields">
        <CodingField label="PersonDocLink">
          <input
            disabled={readOnly}
            value={draft.personDocLink}
            onChange={(event) => updateDraft('personDocLink', event.target.value)}
          />
        </CodingField>
        <CodingField label="First Name">
          <input
            disabled={readOnly}
            value={draft.firstName}
            onChange={(event) => updateDraft('firstName', event.target.value)}
          />
        </CodingField>
        <CodingField label="Last Name">
          <input
            disabled={readOnly}
            value={draft.lastName}
            onChange={(event) => updateDraft('lastName', event.target.value)}
          />
        </CodingField>
        <CodingField label="Role">
          <input
            disabled={readOnly}
            value={draft.role}
            onChange={(event) => updateDraft('role', event.target.value)}
          />
        </CodingField>
      </div>

      <div className="coding-mini-table-wrap">
        <table className="coding-mini-table">
          <thead>
            <tr>
              <th>PersonDocLink</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {persons.length ? (
              persons.map((person, index) => (
                <tr
                  className={selectedIndex === index ? 'is-selected' : ''}
                  key={`${person.personDocLink}-${index}`}
                  onClick={() => setSelectedIndex(index)}
                >
                  <td>{person.personDocLink}</td>
                  <td>{person.firstName}</td>
                  <td>{person.lastName}</td>
                  <td>{person.role}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="coding-empty">
                  No linked persons
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="person-tracker-overlay">
          <div
            className="person-tracker-form"
            role="dialog"
            aria-modal="true"
            aria-labelledby="person-tracker-title"
            style={{
              transform: `translate(${position.x}px, ${position.y}px)`,
              cursor: isDragging ? 'grabbing' : 'default',
            }}
          >
            <div
              className="person-tracker-form-header"
              onMouseDown={handleMouseDown}
              style={{ cursor: 'grab', userSelect: 'none' }}
            >
              <strong id="person-tracker-title">New Person Tracker</strong>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Close person tracker form">
                x
              </button>
            </div>
            <div className="person-tracker-form-body">
              <CodingField label="Item Number">
                <input value={draft.itemNumber || ''} onChange={(event) => updateDraft('itemNumber', event.target.value)} />
              </CodingField>
              <CodingField label="PersonDocLink">
                <input value={draft.personDocLink} onChange={(event) => updateDraft('personDocLink', event.target.value)} />
              </CodingField>
              <CodingField label="FIRST NAME *">
                <input autoFocus value={draft.firstName} onChange={(event) => updateDraft('firstName', event.target.value)} />
              </CodingField>
              <CodingField label="MIDDLE NAME">
                <input value={draft.middleName || ''} onChange={(event) => updateDraft('middleName', event.target.value)} />
              </CodingField>
              <CodingField label="LAST NAME *">
                <input value={draft.lastName} onChange={(event) => updateDraft('lastName', event.target.value)} />
              </CodingField>
              <CodingField label="SUFFIX">
                <input value={draft.suffix || ''} onChange={(event) => updateDraft('suffix', event.target.value)} />
              </CodingField>
              <CodingField label="ADDRESS">
                <input value={draft.address || ''} onChange={(event) => updateDraft('address', event.target.value)} />
              </CodingField>
              <CodingField label="CITY">
                <input value={draft.city || ''} onChange={(event) => updateDraft('city', event.target.value)} />
              </CodingField>
              <CodingField label="STATE">
                <input value={draft.state || ''} onChange={(event) => updateDraft('state', event.target.value)} />
              </CodingField>
              <CodingField label="ZIP">
                <input value={draft.zip || ''} onChange={(event) => updateDraft('zip', event.target.value)} />
              </CodingField>
              <CodingField label="COUNTRY">
                <input value={draft.country || ''} onChange={(event) => updateDraft('country', event.target.value)} />
              </CodingField>
              <CodingField label="DOB">
                <input value={draft.dob || ''} onChange={(event) => updateDraft('dob', event.target.value)} />
              </CodingField>
              <CodingField label="SSN">
                <input value={draft.ssn || ''} onChange={(event) => updateDraft('ssn', event.target.value)} />
              </CodingField>
              <CodingField label="HOSPITAL/HEALTH CENTER *">
                <input value={draft.hospital || ''} onChange={(event) => updateDraft('hospital', event.target.value)} />
              </CodingField>
            </div>
            <div className="person-tracker-form-footer">
              <button className="legacy-button primary-legacy" type="button" onClick={addPerson}>
                Save
              </button>
              <button className="legacy-button" type="button" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function CodingPage() {
  const { projectId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const routeDocumentId = location.pathname.split('/').filter(Boolean).at(-2)

  const [document, setDocument] = useState(null)
  const [activeBatchDocs, setActiveBatchDocs] = useState([])
  const [coding, setCoding] = useState(defaultCoding)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [isBatchCompleted, setIsBatchCompleted] = useState(false)
  const [selectedLayout, setSelectedLayout] = useState('First Level Coding (FLR)')
  const [familyGroupOpen, setFamilyGroupOpen] = useState(false)

  // Person modal for Alternate Workflow layout
  const [showAwfPersonForm, setShowAwfPersonForm] = useState(false)
  const [awfPersonDraft, setAwfPersonDraft] = useState(emptyPerson)
  const [selectedAwfPersonIndex, setSelectedAwfPersonIndex] = useState(null)
  const [awfPosition, setAwfPosition] = useState({ x: 0, y: 0 })
  const [isAwfDragging, setIsAwfDragging] = useState(false)
  const [awfDragStart, setAwfDragStart] = useState({ x: 0, y: 0 })

  const handleAwfMouseDown = (e) => {
    if (e.target.tagName === 'BUTTON') return
    setIsAwfDragging(true)
    setAwfDragStart({ x: e.clientX - awfPosition.x, y: e.clientY - awfPosition.y })
  }

  const handleAwfMouseMove = useCallback(
    (e) => {
      if (!isAwfDragging) return
      setAwfPosition({
        x: e.clientX - awfDragStart.x,
        y: e.clientY - awfDragStart.y,
      })
    },
    [isAwfDragging, awfDragStart]
  )

  const handleAwfMouseUp = useCallback(() => {
    setIsAwfDragging(false)
  }, [])

  useEffect(() => {
    if (isAwfDragging) {
      window.addEventListener('mousemove', handleAwfMouseMove)
      window.addEventListener('mouseup', handleAwfMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleAwfMouseMove)
        window.removeEventListener('mouseup', handleAwfMouseUp)
      }
    }
  }, [isAwfDragging, handleAwfMouseMove, handleAwfMouseUp])

  // Viewer state
  const [viewMode, setViewMode] = useState('native')
  const [viewerError, setViewerError] = useState(false)
  const [textContent, setTextContent] = useState('')
  const [textLoading, setTextLoading] = useState(false)

  const activeProjectId = projectId || 'project-orchid-6-7'

  // Fetch document details and coding from MongoDB
  const loadDocumentData = useCallback(async () => {
    try {
      setSaved(false)
      setSaveError('')
      const docRes = await api.get(`/projects/${activeProjectId}/documents/${routeDocumentId}`)
      if (docRes.data) {
        setDocument(docRes.data)
      }

      // Fetch active batch documents for navigation
      const batchDocsRes = await api.get(`/projects/${activeProjectId}/documents`, {
        params: { view: 'My Batched Out Docs', reviewerName: 'Current Reviewer' },
      })
      if (Array.isArray(batchDocsRes.data)) {
        setActiveBatchDocs(batchDocsRes.data)
      }

      const codingRes = await api.get(`/projects/${activeProjectId}/documents/${routeDocumentId}/coding`)
      if (codingRes.data) {
        setCoding({
          ...defaultCoding,
          ...codingRes.data,
          persons: Array.isArray(codingRes.data.persons) ? codingRes.data.persons : [],
        })
      }
    } catch (error) {
      setSaveError(error.response?.data?.error || 'Failed to load document coding.')
    }
  }, [activeProjectId, routeDocumentId])

  useEffect(() => {
    loadDocumentData()
  }, [loadDocumentData])

  // Ownership resolution
  const batch = document?.batchId
  const isAssignedToMe = Boolean(
    batch &&
    batch.assignedToName === 'Current Reviewer' &&
    batch.isLocked &&
    batch.status === 'In Progress'
  )
  const readOnly = !isAssignedToMe

  const update = (key, value) => {
    setCoding((current) => ({ ...current, [key]: value }))
    setSaved(false)
  }

  const updatePersons = (next) => {
    setSaved(false)
    setCoding((current) => ({
      ...current,
      persons: typeof next === 'function' ? next(current.persons) : next,
    }))
  }

  // Save coding to backend MongoDB
  const saveCoding = async (andNext = false, goBack = false) => {
    if (readOnly) return
    setSaveError('')
    try {
      const { data } = await api.put(`/projects/${activeProjectId}/documents/${routeDocumentId}/coding`, {
        ...coding,
        reviewerName: 'Current Reviewer',
      })

      setSaved(true)
      if (data?.batchCompleted) {
        setIsBatchCompleted(true)
      }

      if (goBack) {
        navigate(`/projects/${projectId}/documents`)
        return
      }

      if (andNext) {
        const currentIndex = activeBatchDocs.findIndex(
          (d) => d._id === routeDocumentId || d.controlNumber === routeDocumentId
        )
        if (currentIndex !== -1 && currentIndex + 1 < activeBatchDocs.length) {
          const nextDoc = activeBatchDocs[currentIndex + 1]
          navigate(`/projects/${projectId}/documents/${nextDoc._id || nextDoc.controlNumber}/coding`)
        } else if (data?.batchCompleted) {
          setTimeout(() => {
            navigate(`/projects/${projectId}/documents`)
          }, 500)
        }
      }
    } catch (error) {
      setSaveError(error.response?.data?.error || 'Failed to save coding to server.')
    }
  }

  const addAwfPerson = () => {
    if (!awfPersonDraft.firstName && !awfPersonDraft.lastName && !awfPersonDraft.personDocLink) return
    setCoding((current) => ({
      ...current,
      persons: [...(current.persons || []), awfPersonDraft],
    }))
    setAwfPersonDraft(emptyPerson)
    setShowAwfPersonForm(false)
    setSaved(false)
  }

  const removeAwfPerson = () => {
    if (selectedAwfPersonIndex === null) return
    setCoding((current) => ({
      ...current,
      persons: (current.persons || []).filter((_, i) => i !== selectedAwfPersonIndex),
    }))
    setSelectedAwfPersonIndex(null)
    setSaved(false)
  }

  // Navigation indices for Previous / Next buttons
  const currentIndex = activeBatchDocs.findIndex(
    (d) => d._id === routeDocumentId || d.controlNumber === routeDocumentId
  )
  const prevDoc = currentIndex > 0 ? activeBatchDocs[currentIndex - 1] : null
  const nextDoc = currentIndex !== -1 && currentIndex + 1 < activeBatchDocs.length ? activeBatchDocs[currentIndex + 1] : null

  const goToPrev = () => {
    if (prevDoc) {
      navigate(`/projects/${projectId}/documents/${prevDoc._id || prevDoc.controlNumber}/coding`)
    }
  }

  const goToNext = () => {
    if (nextDoc) {
      navigate(`/projects/${projectId}/documents/${nextDoc._id || nextDoc.controlNumber}/coding`)
    }
  }

  const radioList = (name, options, value, key) => (
    <div className="coding-radio-stack">
      {options.map((option) => (
        <label key={option}>
          <input
            disabled={readOnly}
            type="radio"
            name={name}
            checked={value === option}
            onChange={() => update(key, option)}
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
  )

  // Text loader effect for txt and csv documents
  useEffect(() => {
    setViewerError(false)
    setTextContent('')
    if (!document?.fileUrl) return

    const format = (document.format || document.fileName?.split('.').pop() || '').toLowerCase()
    if (format === 'txt' || format === 'csv') {
      let isCurrent = true
      setTextLoading(true)
      fetch(document.fileUrl)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch text content')
          return res.text()
        })
        .then((text) => {
          if (isCurrent) {
            setTextContent(text)
            setTextLoading(false)
          }
        })
        .catch((err) => {
          if (isCurrent) {
            console.error('Error loading text content:', err)
            setTextLoading(false)
            setViewerError(true)
          }
        })

      return () => {
        isCurrent = false
      }
    }
  }, [document?.fileUrl, document?.format, document?.fileName])

  const docControlNumber = document?.controlNumber || routeDocumentId || ''
  const docFileName = document?.fileName || ''
  const format = (document?.format || document?.fileName?.split('.').pop() || '').toLowerCase()
  const hasFile = Boolean(document?.fileUrl)

  const renderViewer = () => {
    // Extracted Text View
    if (viewMode === 'extracted') {
      const extractedText = document?.extractedText || (['txt', 'csv'].includes(format) ? textContent : '')
      if (extractedText) {
        return (
          <div className="coding-text-container">
            <pre className="coding-text-pre">{extractedText}</pre>
          </div>
        )
      }
      return (
        <div className="coding-no-file-viewer">
          <div className="no-file-card">
            <p className="no-file-title">No extracted text available</p>
            <p className="no-file-subtitle">There is no extracted text record for this document.</p>
          </div>
        </div>
      )
    }

    // No file attached
    if (!hasFile) {
      return (
        <div className="coding-no-file-viewer">
          <div className="no-file-card">
            <p className="no-file-title">No document file attached.</p>
            <p className="no-file-subtitle">Document metadata is loaded. The coding form remains fully usable.</p>
          </div>
        </div>
      )
    }

    // Error state
    if (viewerError) {
      return (
        <div className="coding-unsupported-container">
          <div className="coding-fallback-card error-card">
            <div className="fallback-badge">ERROR</div>
            <div className="fallback-filename">{docFileName || 'Document'}</div>
            <p className="fallback-message">Unable to preview this document.</p>
            <a
              href={document.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="legacy-button primary-legacy"
              download={docFileName}
            >
              Download Native File
            </a>
          </div>
        </div>
      )
    }

    // PDF files
    if (format === 'pdf') {
      return (
        <iframe
          key={document.fileUrl}
          src={`${document.fileUrl}#toolbar=1&navpanes=0`}
          title={docFileName || 'PDF Document'}
          className="coding-pdf-frame"
          onError={() => setViewerError(true)}
        />
      )
    }

    // Image files
    if (['png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp', 'gif', 'svg'].includes(format)) {
      return (
        <div className="coding-image-container">
          <img
            key={document.fileUrl}
            src={document.fileUrl}
            alt={docFileName || 'Image Document'}
            className="coding-image-element"
            onError={() => setViewerError(true)}
          />
        </div>
      )
    }

    // Text and CSV files
    if (['txt', 'csv'].includes(format)) {
      if (textLoading) {
        return <div className="coding-viewer-loading">Loading text content...</div>
      }
      return (
        <div className="coding-text-container">
          <pre className="coding-text-pre">{textContent || '(Empty file)'}</pre>
        </div>
      )
    }

    // Office documents (doc, docx, xls, xlsx, ppt, pptx)
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(format)) {
      return (
        <div className="coding-office-container">
          <iframe
            key={document.fileUrl}
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(document.fileUrl)}&embedded=true`}
            title={docFileName || 'Office Document'}
            className="coding-office-frame"
            onError={() => setViewerError(true)}
          />
          <div className="coding-office-fallback-bar">
            <span>
              <strong>{docFileName}</strong> ({format.toUpperCase()})
              {document.fileSize ? ` — ${(document.fileSize / 1024).toFixed(1)} KB` : ''}
            </span>
            <a
              href={document.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="legacy-button"
              download={docFileName}
            >
              Download Native File
            </a>
          </div>
        </div>
      )
    }

    // Unsupported file formats
    return (
      <div className="coding-unsupported-container">
        <div className="coding-fallback-card">
          <div className="fallback-badge">{(format || 'FILE').toUpperCase()}</div>
          <div className="fallback-filename">{docFileName || 'Document'}</div>
          <div className="fallback-details">
            <span>Type: {format ? format.toUpperCase() : 'Unknown'}</span>
            {document.fileSize && <span>Size: {(document.fileSize / 1024).toFixed(1)} KB</span>}
          </div>
          <p className="fallback-message">Preview unavailable for this file format.</p>
          <a
            href={document.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="legacy-button primary-legacy"
            download={docFileName}
          >
            Download Native File
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="coding-page">
      {/* Top Document Toolbar */}
      <div className="coding-page-toolbar">
        <div className="coding-document-context">
          <Link to={`/projects/${projectId}/documents`}>Documents</Link>
          <span>/</span>
          <strong>{docControlNumber}</strong>
          <span>{docFileName}</span>
        </div>
        <div className="coding-toolbar-actions">
          <button className="legacy-button" type="button" disabled={!prevDoc} onClick={goToPrev}>
            Previous
          </button>
          <button className="legacy-button" type="button" disabled={!nextDoc} onClick={goToNext}>
            Next
          </button>
          <button
            className="legacy-button primary-legacy"
            type="button"
            disabled={readOnly}
            onClick={() => saveCoding(false, false)}
          >
            Save
          </button>
          <Link className="legacy-button" to={`/projects/${projectId}/documents`}>
            Exit
          </Link>
        </div>
      </div>

      {/* Main Coding Layout Area */}
      <div className="coding-main">
        {/* Document Viewer on the Left */}
        <main className="coding-document-viewer">
          <div className="coding-viewer-toolbar">
            <button
              className={`legacy-button ${viewMode === 'native' ? 'active-viewer-tab' : ''}`}
              type="button"
              onClick={() => setViewMode('native')}
            >
              Native
            </button>
            <button
              className={`legacy-button ${viewMode === 'extracted' ? 'active-viewer-tab' : ''}`}
              type="button"
              onClick={() => setViewMode('extracted')}
            >
              Extracted Text
            </button>
            <span className="toolbar-spacer" />
            <span>Document View</span>
          </div>
          <div className="coding-viewer-container" aria-label="Document viewer">
            {renderViewer()}
          </div>
        </main>

        {/* Coding Layout Panel on the Right */}
        <aside className="coding-panel">
          {/* Header */}
          <div className="coding-panel-header">
            <div className="coding-panel-header-top">
              <span className="coding-panel-tab-title">Coding Layout</span>
            </div>

            {/* Action Buttons */}
            <div className="coding-panel-header-actions">
              {selectedLayout === 'First Level Coding (FLR)' ? (
                <>
                  <button
                    className="legacy-button primary-legacy"
                    type="button"
                    disabled={readOnly}
                    onClick={() => saveCoding(true, false)}
                  >
                    Save &amp; Next
                  </button>
                  <button
                    className="legacy-button"
                    type="button"
                    disabled={readOnly}
                    onClick={() => saveCoding(false, false)}
                  >
                    Save
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="legacy-button primary-legacy"
                    type="button"
                    disabled={readOnly}
                    onClick={() => saveCoding(false, false)}
                  >
                    Save
                  </button>
                  <button
                    className="legacy-button"
                    type="button"
                    disabled={readOnly}
                    onClick={() => saveCoding(false, true)}
                  >
                    Save &amp; Back
                  </button>
                </>
              )}
              <button
                className="legacy-button"
                type="button"
                onClick={() => loadDocumentData()}
              >
                Cancel
              </button>
            </div>

            {/* Layout Selector */}
            <div className="coding-layout-selector-row">
              <select
                value={selectedLayout}
                onChange={(e) => setSelectedLayout(e.target.value)}
                aria-label="Layout selector"
              >
                <option value="First Level Coding (FLR)">First Level Coding (FLR)</option>
                <option value="Alternate Workflow">Alternate Workflow</option>
              </select>
              <button type="button" title="Edit layout">
                ✏️
              </button>
            </div>
          </div>

          {/* Form Scroll Area */}
          <div className="coding-panel-scroll">
            {selectedLayout === 'First Level Coding (FLR)' ? (
              /* ================= FIRST LEVEL CODING (FLR) LAYOUT ================= */
              <div>
                {/* 1. FLR Coding Section */}
                <Section title="FLR Coding">
                  <div className="coding-metadata-grid">
                    <span>Control Number</span>
                    <strong>{docControlNumber}</strong>
                    <span>File Name</span>
                    <strong>{docFileName}</strong>
                    <span>Source Path</span>
                    <strong>-</strong>
                  </div>

                  {/* 1. AL Designation */}
                  <CodingField label="AL Designation">
                    {radioList('alDesignation', ['Relevant', 'Not Relevant'], coding.alDesignation || 'Relevant', 'alDesignation')}
                  </CodingField>

                  {/* 2. FLR Review Complete */}
                  <CodingField label="FLR Review Complete">
                    {radioList('flrComplete', ['Yes', 'No'], coding.flrComplete || 'Yes', 'flrComplete')}
                  </CodingField>

                  {/* 3. Reportable Data Found */}
                  <CodingField label="Reportable Data Found">
                    {radioList(
                      'reportableDataFound',
                      [
                        'Yes',
                        'No',
                        'Needs Further Review',
                        'Technical Issue',
                        'Password Protected',
                        'Foreign Language',
                        'Illegible',
                        'Duplicate',
                        'Alternate Workflow 6+ Entries',
                      ],
                      coding.reportableDataFound || 'Alternate Workflow 6+ Entries',
                      'reportableDataFound'
                    )}
                  </CodingField>

                  {/* 4. Extraction Status */}
                  <CodingField label="Extraction Status">
                    {radioList(
                      'extractionStatus',
                      ['Completed', 'Yes to No', 'Yes to AWF'],
                      coding.extractionStatus || 'Completed',
                      'extractionStatus'
                    )}
                  </CodingField>

                  {/* 5. Alternate Workflow Estimate */}
                  <CodingField label="Alternate Workflow Estimate">
                    {radioList(
                      'alternateWorkflowEstimate',
                      ['6 - 25 Entries', '26 - 50 Entries', '51 - 150 Entries', '151+ Entries'],
                      coding.alternateWorkflowEstimate || '6 - 25 Entries',
                      'alternateWorkflowEstimate'
                    )}
                  </CodingField>

                  {/* 6, 7, 8: Text Inputs */}
                  <div className="coding-inline-meta">
                    <CodingField label="Extracted Outside Relativity">
                      <input
                        disabled={readOnly}
                        value={coding.extractedOutsideRelativity || ''}
                        onChange={(event) => update('extractedOutsideRelativity', event.target.value)}
                      />
                    </CodingField>
                    <CodingField label="TXT Status">
                      <input
                        disabled={readOnly}
                        value={coding.txtStatus || ''}
                        onChange={(event) => update('txtStatus', event.target.value)}
                      />
                    </CodingField>
                    <CodingField label="Entries Completed">
                      <input
                        disabled={readOnly}
                        value={coding.entriesCompleted || ''}
                        onChange={(event) => update('entriesCompleted', event.target.value)}
                      />
                    </CodingField>
                  </div>
                </Section>

                {/* 9. Reviewer Notes Section */}
                <Section title="Reviewer Notes">
                  <textarea
                    className="coding-notes"
                    disabled={readOnly}
                    value={coding.reviewerNotes || ''}
                    onChange={(event) => update('reviewerNotes', event.target.value)}
                    placeholder="Reviewer Notes"
                  />
                </Section>

                {/* 10. Person Tracker (PersonDocLink) Section */}
                <Section title="Person Tracker (PersonDocLink)">
                  <PersonTracker
                    persons={coding.persons || []}
                    setPersons={updatePersons}
                    readOnly={readOnly}
                  />
                </Section>

                {/* 11. Family Group Section */}
                <Section title="Family Group">
                  <CodingField label="Family Group">
                    <select
                      disabled={readOnly}
                      value={coding.familyGroup || 'None'}
                      onChange={(event) => update('familyGroup', event.target.value)}
                    >
                      <option>None</option>
                      <option>Orion Correspondence</option>
                      <option>Orion Financial Records</option>
                    </select>
                  </CodingField>
                </Section>

                {/* 12. Production History Section */}
                <Section title="Production History" defaultOpen={false}>
                  <div className="coding-history-row">
                    <span>Production Set</span>
                    <strong>None</strong>
                  </div>
                  <div className="coding-history-row">
                    <span>Last Modified</span>
                    <strong>Current document</strong>
                  </div>
                </Section>
              </div>
            ) : (
              /* ================= ALTERNATE WORKFLOW LAYOUT ================= */
              <div>
                {/* Section 1: Document Information */}
                <div className="coding-relativity-section">
                  <div className="coding-relativity-section-header">Document Information</div>

                  <div className="coding-relativity-row">
                    <div className="coding-relativity-label">Control Number</div>
                    <div className="coding-relativity-value">{docControlNumber}</div>
                  </div>

                  <div className="coding-relativity-row">
                    <div className="coding-relativity-label">File Name</div>
                    <div className="coding-relativity-value">{docFileName}</div>
                  </div>
                </div>

                {/* Section 2: AWF Coding */}
                <div className="coding-relativity-section">
                  <div className="coding-relativity-section-header">AWF Coding</div>

                  <div className="coding-relativity-row">
                    <div className="coding-relativity-label">
                      Alternate Workflow<br />Complete
                    </div>
                    <div className="coding-relativity-value">
                      <div className="coding-relativity-radios">
                        {['Yes', 'N/A'].map((option) => (
                          <label key={option}>
                            <input
                              disabled={readOnly}
                              type="radio"
                              name="alternateWorkflowComplete"
                              checked={(coding.alternateWorkflowComplete || 'Yes') === option}
                              onChange={() => update('alternateWorkflowComplete', option)}
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="coding-relativity-row">
                    <div className="coding-relativity-label">
                      Alternate Workflow<br />Estimate
                    </div>
                    <div className="coding-relativity-value">
                      <div className="coding-relativity-radios">
                        {['6 - 25 Entries', '26 - 50 Entries', '51 - 150 Entries', '151+ Entries'].map((option) => (
                          <label key={option}>
                            <input
                              disabled={readOnly}
                              type="radio"
                              name="alternateWorkflowEstimate"
                              checked={(coding.alternateWorkflowEstimate || '6 - 25 Entries') === option}
                              onChange={() => update('alternateWorkflowEstimate', option)}
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: FLR Coding */}
                <div className="coding-relativity-section">
                  <div className="coding-relativity-section-header">FLR Coding</div>

                  <div className="coding-relativity-row">
                    <div className="coding-relativity-label">
                      Reportable Data<span className="required-star">*</span><br />Found
                    </div>
                    <div className="coding-relativity-value">
                      <div className="coding-relativity-radios">
                        {[
                          'Yes',
                          'No',
                          'Needs Further Review',
                          'Technical Issue',
                          'Password Protected',
                          'Foreign Language',
                          'Illegible',
                          'Duplicate',
                          'Alternate Workflow 6+ Entries',
                        ].map((option) => (
                          <label key={option}>
                            <input
                              disabled={readOnly}
                              type="radio"
                              name="reportableDataFound"
                              checked={(coding.reportableDataFound || 'Yes') === option}
                              onChange={() => update('reportableDataFound', option)}
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="coding-relativity-row">
                    <div className="coding-relativity-label">FLR Review Complete</div>
                    <div className="coding-relativity-value">
                      {coding.flrComplete || 'Yes'}
                    </div>
                  </div>

                  <div className="coding-relativity-row">
                    <div className="coding-relativity-label">Reviewer Notes</div>
                    <div className="coding-relativity-value">
                      <textarea
                        className="coding-relativity-textarea"
                        disabled={readOnly}
                        value={coding.reviewerNotes || ''}
                        onChange={(e) => update('reviewerNotes', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="coding-relativity-row">
                    <div className="coding-relativity-label">
                      AWF Extraction<br />Completed
                    </div>
                    <div className="coding-relativity-value">
                      <div className="coding-relativity-radios">
                        <label>
                          <input
                            disabled={readOnly}
                            type="radio"
                            name="awfExtractionCompleted"
                            checked={(coding.awfExtractionCompleted || 'Yes') === 'Yes'}
                            onChange={() => update('awfExtractionCompleted', 'Yes')}
                          />
                          <span>Yes</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Person Tracker (PersonDocLink) */}
                <div className="coding-relativity-section">
                  <div className="person-tracker-header-row">
                    <span>Person Tracker (PersonDocLink)</span>
                    <div className="person-tracker-header-actions">
                      <button
                        className="legacy-button"
                        type="button"
                        disabled={readOnly}
                        onClick={() => {
                          setAwfPersonDraft(emptyPerson)
                          setShowAwfPersonForm(true)
                        }}
                      >
                        New
                      </button>
                      <button
                        className="legacy-button"
                        type="button"
                        disabled={readOnly}
                        onClick={() => {
                          setAwfPersonDraft(emptyPerson)
                          setShowAwfPersonForm(true)
                        }}
                      >
                        Link
                      </button>
                      <button
                        className="legacy-button"
                        type="button"
                        disabled={readOnly || selectedAwfPersonIndex === null}
                        onClick={removeAwfPerson}
                      >
                        Unlink
                      </button>
                    </div>
                  </div>

                  <div className="coding-mini-table-wrap" style={{ margin: '6px 10px' }}>
                    <table className="coding-mini-table">
                      <thead>
                        <tr>
                          <th>PersonDocLink</th>
                          <th>First Name</th>
                          <th>Last Name</th>
                          <th>Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coding.persons && coding.persons.length ? (
                          coding.persons.map((person, index) => (
                            <tr
                              className={selectedAwfPersonIndex === index ? 'is-selected' : ''}
                              key={`${person.personDocLink}-${index}`}
                              onClick={() => setSelectedAwfPersonIndex(index)}
                            >
                              <td>{person.personDocLink}</td>
                              <td>{person.firstName}</td>
                              <td>{person.lastName}</td>
                              <td>{person.role}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="coding-empty">
                              No linked persons
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 5: Family Group Accordion Bar */}
                <div
                  className="family-group-accordion-bar"
                  onClick={() => setFamilyGroupOpen((v) => !v)}
                >
                  <span>Family Group {familyGroupOpen ? '▲' : '▼'}</span>
                  <span>☰ ⤢</span>
                </div>

                {familyGroupOpen && (
                  <div style={{ padding: '8px 10px', background: '#eaeff2' }}>
                    <select
                      disabled={readOnly}
                      value={coding.familyGroup || 'None'}
                      onChange={(e) => update('familyGroup', e.target.value)}
                      style={{ width: '100%', height: '26px' }}
                    >
                      <option>None</option>
                      <option>Orion Correspondence</option>
                      <option>Orion Financial Records</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Save & ReadOnly Status */}
          <div className="coding-save-status">
            {readOnly && (
              <span>
                Read-only: batch is taken by {batch?.assignedToName || 'another user'}.
              </span>
            )}
            {saved && !isBatchCompleted && <span>Saved</span>}
            {isBatchCompleted && <span>Batch completed! All documents reviewed.</span>}
            {saveError && <span style={{ color: '#9b1c1c' }}>{saveError}</span>}
          </div>
        </aside>
      </div>

      {/* Person Tracker Modal for Alternate Workflow layout */}
      {showAwfPersonForm && (
        <div className="person-tracker-overlay">
          <div
            className="person-tracker-form"
            role="dialog"
            aria-modal="true"
            aria-labelledby="awf-person-tracker-title"
            style={{
              transform: `translate(${awfPosition.x}px, ${awfPosition.y}px)`,
              cursor: isAwfDragging ? 'grabbing' : 'default',
            }}
          >
            <div
              className="person-tracker-form-header"
              onMouseDown={handleAwfMouseDown}
              style={{ cursor: 'grab', userSelect: 'none' }}
            >
              <strong id="awf-person-tracker-title">New Person Tracker</strong>
              <button type="button" onClick={() => setShowAwfPersonForm(false)} aria-label="Close person tracker form">
                x
              </button>
            </div>
            <div className="person-tracker-form-body">
              <label className="coding-field">
                <span>Item Number</span>
                <input
                  value={awfPersonDraft.itemNumber || ''}
                  onChange={(e) => setAwfPersonDraft((c) => ({ ...c, itemNumber: e.target.value }))}
                />
              </label>
              <label className="coding-field">
                <span>PersonDocLink</span>
                <input
                  value={awfPersonDraft.personDocLink || ''}
                  onChange={(e) => setAwfPersonDraft((c) => ({ ...c, personDocLink: e.target.value }))}
                />
              </label>
              <label className="coding-field">
                <span>FIRST NAME *</span>
                <input
                  autoFocus
                  value={awfPersonDraft.firstName || ''}
                  onChange={(e) => setAwfPersonDraft((c) => ({ ...c, firstName: e.target.value }))}
                />
              </label>
              <label className="coding-field">
                <span>MIDDLE NAME</span>
                <input
                  value={awfPersonDraft.middleName || ''}
                  onChange={(e) => setAwfPersonDraft((c) => ({ ...c, middleName: e.target.value }))}
                />
              </label>
              <label className="coding-field">
                <span>LAST NAME *</span>
                <input
                  value={awfPersonDraft.lastName || ''}
                  onChange={(e) => setAwfPersonDraft((c) => ({ ...c, lastName: e.target.value }))}
                />
              </label>
              <label className="coding-field">
                <span>SUFFIX</span>
                <input
                  value={awfPersonDraft.suffix || ''}
                  onChange={(e) => setAwfPersonDraft((c) => ({ ...c, suffix: e.target.value }))}
                />
              </label>
              <label className="coding-field">
                <span>ADDRESS</span>
                <input
                  value={awfPersonDraft.address || ''}
                  onChange={(e) => setAwfPersonDraft((c) => ({ ...c, address: e.target.value }))}
                />
              </label>
              <label className="coding-field">
                <span>CITY</span>
                <input
                  value={awfPersonDraft.city || ''}
                  onChange={(e) => setAwfPersonDraft((c) => ({ ...c, city: e.target.value }))}
                />
              </label>
              <label className="coding-field">
                <span>STATE</span>
                <input
                  value={awfPersonDraft.state || ''}
                  onChange={(e) => setAwfPersonDraft((c) => ({ ...c, state: e.target.value }))}
                />
              </label>
              <label className="coding-field">
                <span>ZIP</span>
                <input
                  value={awfPersonDraft.zip || ''}
                  onChange={(e) => setAwfPersonDraft((c) => ({ ...c, zip: e.target.value }))}
                />
              </label>
              <label className="coding-field">
                <span>COUNTRY</span>
                <input
                  value={awfPersonDraft.country || ''}
                  onChange={(e) => setAwfPersonDraft((c) => ({ ...c, country: e.target.value }))}
                />
              </label>
              <label className="coding-field">
                <span>DOB</span>
                <input
                  value={awfPersonDraft.dob || ''}
                  onChange={(e) => setAwfPersonDraft((c) => ({ ...c, dob: e.target.value }))}
                />
              </label>
              <label className="coding-field">
                <span>SSN</span>
                <input
                  value={awfPersonDraft.ssn || ''}
                  onChange={(e) => setAwfPersonDraft((c) => ({ ...c, ssn: e.target.value }))}
                />
              </label>
              <label className="coding-field">
                <span>HOSPITAL/HEALTH CENTER *</span>
                <input
                  value={awfPersonDraft.hospital || ''}
                  onChange={(e) => setAwfPersonDraft((c) => ({ ...c, hospital: e.target.value }))}
                />
              </label>
            </div>
            <div className="person-tracker-form-footer">
              <button className="legacy-button primary-legacy" type="button" onClick={addAwfPerson}>
                Save
              </button>
              <button className="legacy-button" type="button" onClick={() => setShowAwfPersonForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
