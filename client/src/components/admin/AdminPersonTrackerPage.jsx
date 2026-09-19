import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import adminApi from '../../services/adminApi'
import * as projectsApi from '../../services/projectsApi'
import * as batchesApi from '../../services/batchesApi'
import ChangePasswordModal from './ChangePasswordModal'

export default function AdminPersonTrackerPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  // Data states
  const [items, setItems] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filter options
  const [projectsList, setProjectsList] = useState([])
  const [batchesList, setBatchesList] = useState([])

  // Filter query parameters (sent directly to API with AND semantics)
  const [filters, setFilters] = useState({
    projectId: '',
    batchId: '',
    documentId: '',
    reviewer: '',
    search: '',
  })

  // Pagination states
  const [pageSize, setPageSize] = useState(25)
  const [currentPage, setCurrentPage] = useState(1)

  // Detail Modal states
  const [selectedDocGroup, setSelectedDocGroup] = useState(null)
  const [selectedPersonIndex, setSelectedPersonIndex] = useState(0)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)

  // Fetch available projects for dropdown
  useEffect(() => {
    async function loadProjects() {
      try {
        const projs = await projectsApi.getProjects()
        if (Array.isArray(projs)) {
          setProjectsList(projs)
        }
      } catch {}
    }
    loadProjects()
  }, [])

  // Fetch batches when a project is selected
  useEffect(() => {
    async function loadBatches() {
      if (!filters.projectId) {
        setBatchesList([])
        return
      }
      try {
        const batches = await batchesApi.getBatches(filters.projectId)
        if (Array.isArray(batches)) {
          setBatchesList(batches)
        }
      } catch {
        setBatchesList([])
      }
    }
    loadBatches()
  }, [filters.projectId])

  // Fetch Person Tracker records from backend
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const queryParams = {}
      if (filters.projectId.trim()) queryParams.projectId = filters.projectId.trim()
      if (filters.batchId.trim()) queryParams.batchId = filters.batchId.trim()
      if (filters.documentId.trim()) queryParams.documentId = filters.documentId.trim()
      if (filters.reviewer.trim()) queryParams.reviewer = filters.reviewer.trim()
      if (filters.search.trim()) queryParams.search = filters.search.trim()

      const res = await adminApi.getPersonTracker(queryParams)
      if (res && Array.isArray(res.items)) {
        setItems(res.items)
        setTotalCount(res.total ?? res.items.length)
      } else {
        setItems([])
        setTotalCount(0)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch Person Tracker data.')
      setItems([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function handleFilterChange(key, value) {
    setCurrentPage(1)
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'projectId' ? { batchId: '' } : {}),
    }))
  }

  function handleClearFilters() {
    setCurrentPage(1)
    setFilters({
      projectId: '',
      batchId: '',
      documentId: '',
      reviewer: '',
      search: '',
    })
  }

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/login')
    }
  }

  // Group items by Document for the main table (Requirements 3 & 11)
  const groupedDocuments = useMemo(() => {
    const map = new Map()

    items.forEach((item) => {
      const docKey = item.document?.id || item.document?.controlNumber || 'unknown_doc'
      if (!map.has(docKey)) {
        map.set(docKey, {
          docKey,
          document: item.document || {},
          batch: item.batch || {},
          project: item.project || {},
          persons: [],
          latestAudit: item.audit || {},
        })
      }

      const group = map.get(docKey)
      group.persons.push({
        person: item.person || {},
        audit: item.audit || {},
      })

      // Update latest audit info
      const itemUpdated = new Date(item.audit?.updatedAt || item.audit?.createdAt || 0).getTime()
      const currentLatest = new Date(group.latestAudit?.updatedAt || group.latestAudit?.createdAt || 0).getTime()
      if (itemUpdated >= currentLatest) {
        group.latestAudit = item.audit || {}
      }
    })

    return Array.from(map.values())
  }, [items])

  // Pagination slicing
  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return groupedDocuments.slice(start, start + pageSize)
  }, [groupedDocuments, currentPage, pageSize])

  const totalPages = Math.max(1, Math.ceil(groupedDocuments.length / pageSize))

  function openDetailModal(group) {
    setSelectedDocGroup(group)
    setSelectedPersonIndex(0)
  }

  function closeDetailModal() {
    setSelectedDocGroup(null)
    setSelectedPersonIndex(0)
  }

  function formatTimestamp(ts) {
    if (!ts) return '-'
    const d = new Date(ts)
    if (isNaN(d.getTime())) return String(ts)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const selectedPersonEntry = selectedDocGroup?.persons[selectedPersonIndex]
  const currentPerson = selectedPersonEntry?.person || {}
  const currentAudit = selectedPersonEntry?.audit || {}

  const hasActiveFilters = Boolean(
    filters.projectId || filters.batchId || filters.documentId || filters.reviewer || filters.search
  )

  return (
    <div className="admin-page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f4f5f6' }}>
      {/* Top Header */}
      <header className="selection-header" style={{ flexShrink: 0 }}>
        <Link className="selection-brand" to="/admin">
          <span className="relativity-mark" style={{ background: '#7c3aed' }}>A</span>
          <span>AegisBreach Admin</span>
        </Link>

        {/* Admin Navigation Bar */}
        <nav style={{ marginLeft: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            to="/admin/projects"
            style={{
              color: '#cbd5e1',
              padding: '4px 10px',
              borderRadius: '3px',
              textDecoration: 'none',
              fontSize: '12px',
            }}
          >
            Workspaces &amp; Projects
          </Link>
          <Link
            to="/admin/person-tracker"
            style={{
              color: '#fff',
              background: '#374151',
              padding: '4px 10px',
              borderRadius: '3px',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            Person Tracker
          </Link>
        </nav>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            className="legacy-button"
            to="/projects"
            style={{ textDecoration: 'none', color: '#fff', background: '#374151', border: '1px solid #4b5563' }}
          >
            &larr; Review Workspace
          </Link>
          <div className="selection-user">
            <span className="user-avatar" style={{ background: '#7c3aed' }}>AD</span>
            <span>{user?.username || 'Admin'}</span>
          </div>
          <button
            className="legacy-button"
            type="button"
            onClick={() => setIsPasswordModalOpen(true)}
            style={{ color: '#e2e8f0', background: '#374151', border: '1px solid #4b5563', fontSize: '11px', padding: '4px 10px' }}
            title="Change your account password"
          >
            Change Password
          </button>
          <button
            className="logout-button"
            type="button"
            onClick={handleLogout}
            title="Sign out"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px', minHeight: 0, overflow: 'hidden' }}>
        {/* Page Title & Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '10px', color: '#68767e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ADMINISTRATION / PERSON TRACKER
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#33444e', margin: '2px 0 0 0' }}>
              Person Tracker Records
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#68767e', background: '#e2e8f0', padding: '4px 10px', borderRadius: '12px', fontWeight: 500 }}>
              {totalCount} Total Person{totalCount === 1 ? '' : 's'} across {groupedDocuments.length} Document{groupedDocuments.length === 1 ? '' : 's'}
            </span>
            <button
              className="legacy-button"
              type="button"
              onClick={fetchData}
              disabled={loading}
              title="Refresh Person Tracker records"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
            >
              &#x21bb; Refresh
            </button>
          </div>
        </div>

        {/* Toolbar & Filters Bar */}
        <div className="review-control-strip" style={{ marginBottom: '10px', borderRadius: '3px', flexWrap: 'wrap', gap: '8px 12px' }}>
          {/* General Search */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Search:</span>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Name, SSN, Address, ID..."
              style={{ width: '160px', height: '24px', fontSize: '11px' }}
            />
          </label>

          {/* Project Filter */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Project:</span>
            <select
              value={filters.projectId}
              onChange={(e) => handleFilterChange('projectId', e.target.value)}
              style={{ height: '24px', fontSize: '11px', minWidth: '130px' }}
            >
              <option value="">(All Projects)</option>
              {projectsList.map((p) => (
                <option key={p._id || p.slug} value={p._id || p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          {/* Batch Filter */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Batch:</span>
            {batchesList.length > 0 ? (
              <select
                value={filters.batchId}
                onChange={(e) => handleFilterChange('batchId', e.target.value)}
                style={{ height: '24px', fontSize: '11px', minWidth: '130px' }}
              >
                <option value="">(All Batches)</option>
                {batchesList.map((b) => (
                  <option key={b._id || b.name} value={b._id || b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={filters.batchId}
                onChange={(e) => handleFilterChange('batchId', e.target.value)}
                placeholder="Batch name / ID"
                style={{ width: '120px', height: '24px', fontSize: '11px' }}
              />
            )}
          </label>

          {/* Document Filter */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Document:</span>
            <input
              type="text"
              value={filters.documentId}
              onChange={(e) => handleFilterChange('documentId', e.target.value)}
              placeholder="Control #"
              style={{ width: '110px', height: '24px', fontSize: '11px' }}
            />
          </label>

          {/* Reviewer Filter */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Reviewer:</span>
            <input
              type="text"
              value={filters.reviewer}
              onChange={(e) => handleFilterChange('reviewer', e.target.value)}
              placeholder="Username"
              style={{ width: '100px', height: '24px', fontSize: '11px' }}
            />
          </label>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              className="legacy-button"
              type="button"
              onClick={handleClearFilters}
              style={{ height: '24px', fontSize: '11px' }}
            >
              Clear Filters
            </button>
          )}

          {/* Pagination Rows Selector */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#68767e' }}>
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              style={{ height: '22px', fontSize: '11px' }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div style={{ background: '#fdf2f2', border: '1px solid #f8b4b4', color: '#9b1c1c', padding: '8px 12px', fontSize: '12px', marginBottom: '10px', borderRadius: '3px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button className="legacy-button" type="button" onClick={fetchData}>Retry</button>
          </div>
        )}

        {/* Main Table / Results Container */}
        <div style={{ flex: 1, minHeight: 0, background: '#fff', border: '1px solid #c2cace', borderRadius: '3px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="review-results-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <table className="review-results-table" style={{ width: '100%', minWidth: '850px' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                  <th>Document</th>
                  <th>Batch</th>
                  <th>Project</th>
                  <th>Reviewer</th>
                  <th style={{ textAlign: 'center', width: '90px' }}>Persons</th>
                  <th>Last Updated</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#68767e' }}>
                      Loading Person Tracker data...
                    </td>
                  </tr>
                ) : groupedDocuments.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#68767e' }}>
                      No Person Tracker data found.
                    </td>
                  </tr>
                ) : (
                  paginatedDocs.map((group, index) => {
                    const rowNumber = (currentPage - 1) * pageSize + index + 1
                    const reviewerName = group.latestAudit?.updatedBy || group.latestAudit?.createdBy || '-'
                    const lastUpdated = formatTimestamp(group.latestAudit?.updatedAt || group.latestAudit?.createdAt)

                    return (
                      <tr
                        key={group.docKey}
                        onClick={() => openDetailModal(group)}
                        style={{ cursor: 'pointer' }}
                        title="Click to view detailed Person Tracker information"
                      >
                        <td style={{ textAlign: 'center', color: '#68767e' }}>{rowNumber}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#105280' }}>
                            {group.document?.controlNumber || '-'}
                          </div>
                          {group.document?.fileName && (
                            <div style={{ fontSize: '10px', color: '#68767e' }}>
                              {group.document.fileName}
                            </div>
                          )}
                        </td>
                        <td>{group.batch?.name || '-'}</td>
                        <td>{group.project?.name || '-'}</td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#334155' }}>
                            {reviewerName}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: '#e0e7ff',
                              color: '#3730a3',
                            }}
                          >
                            {group.persons.length}
                          </span>
                        </td>
                        <td style={{ fontSize: '11px', color: '#475569', whiteSpace: 'nowrap' }}>
                          {lastUpdated}
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            className="legacy-button primary-legacy"
                            type="button"
                            onClick={() => openDetailModal(group)}
                            style={{ padding: '2px 8px', fontSize: '11px' }}
                            title="Inspect complete Person Tracker data"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination Controls */}
          <div style={{ padding: '8px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b' }}>
            <div>
              Showing {groupedDocuments.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, groupedDocuments.length)} of {groupedDocuments.length} documents
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                className="legacy-button"
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{ padding: '2px 8px', fontSize: '11px' }}
              >
                &larr; Prev
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="legacy-button"
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{ padding: '2px 8px', fontSize: '11px' }}
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Read-Only Person Tracker Detail Modal */}
      {selectedDocGroup && (
        <div className="person-tracker-overlay" style={{ zIndex: 1000 }}>
          <div
            className="person-tracker-form"
            style={{ width: '840px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pt-detail-modal-title"
          >
            {/* Header */}
            <div className="person-tracker-form-header" style={{ background: 'linear-gradient(#4f46e5, #4338ca)', flexShrink: 0 }}>
              <strong id="pt-detail-modal-title">
                Person Tracker &mdash; Document: {selectedDocGroup.document?.controlNumber || 'N/A'}
              </strong>
              <button type="button" onClick={closeDetailModal} aria-label="Close modal">
                x
              </button>
            </div>

            {/* Context Breadcrumb & Person Selector (for multi-person docs) */}
            <div style={{ padding: '10px 18px', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', flexShrink: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '11px', color: '#475569', marginBottom: selectedDocGroup.persons.length > 1 ? '10px' : '0' }}>
                <div><strong>Project:</strong> {selectedDocGroup.project?.name || '-'}</div>
                <div><strong>Batch:</strong> {selectedDocGroup.batch?.name || '-'}</div>
                <div><strong>File:</strong> {selectedDocGroup.document?.fileName || '-'}</div>
                <div><strong>Total Persons:</strong> {selectedDocGroup.persons.length}</div>
              </div>

              {/* Multi-Person Selection Tabs (Requirement 12) */}
              {selectedDocGroup.persons.length > 1 && (
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingTop: '4px' }}>
                  {selectedDocGroup.persons.map((pEntry, pIdx) => {
                    const pName = [pEntry.person?.firstName, pEntry.person?.lastName].filter(Boolean).join(' ') || `Person ${pIdx + 1}`
                    const isSelected = pIdx === selectedPersonIndex

                    return (
                      <button
                        key={pEntry.person?._id || pIdx}
                        type="button"
                        onClick={() => setSelectedPersonIndex(pIdx)}
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: isSelected ? 600 : 400,
                          borderRadius: '3px',
                          border: isSelected ? '1px solid #4338ca' : '1px solid #cbd5e1',
                          background: isSelected ? '#4338ca' : '#fff',
                          color: isSelected ? '#fff' : '#334155',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Person {pIdx + 1}: {pName}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Scrollable Person Detail Body */}
            <div style={{ padding: '16px 18px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Group 1: Identity */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ background: '#f8fafc', padding: '6px 12px', fontWeight: 600, fontSize: '11px', color: '#334155', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase' }}>
                  Identity Information
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', padding: '12px' }}>
                  <DetailField label="FIRST NAME" value={currentPerson.firstName} />
                  <DetailField label="MIDDLE NAME" value={currentPerson.middleName} />
                  <DetailField label="LAST NAME" value={currentPerson.lastName} />
                  <DetailField label="SUFFIX" value={currentPerson.suffix} />
                  <DetailField label="DOB / DATE OF BIRTH" value={currentPerson.dob} />
                  <DetailField label="ROLE" value={currentPerson.role} />
                  <DetailField label="DATA OWNER" value={currentPerson.dataOwner} />
                  <DetailField label="HOSPITAL" value={currentPerson.hospital} />
                  <DetailField label="DATE OF DEATH" value={currentPerson.dateOfDeath} />
                  <DetailField label="PERSON DOC LINK" value={currentPerson.personDocLink} />
                  <DetailField label="ITEM NUMBER" value={currentPerson.itemNumber} />
                  <div style={{ gridColumn: '1 / -1' }}>
                    <DetailField label="NOTES" value={currentPerson.notes} />
                  </div>
                </div>
              </div>

              {/* Group 2: Address */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ background: '#f8fafc', padding: '6px 12px', fontWeight: 600, fontSize: '11px', color: '#334155', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase' }}>
                  Address &amp; Contact
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', padding: '12px' }}>
                  <div style={{ gridColumn: '1 / 3' }}>
                    <DetailField label="ADDRESS" value={currentPerson.address || currentPerson.address1} />
                  </div>
                  <DetailField label="ADDRESS 2" value={currentPerson.address2} />
                  <DetailField label="CITY" value={currentPerson.city} />
                  <DetailField label="STATE" value={currentPerson.state} />
                  <DetailField label="ZIP / POSTAL CODE" value={currentPerson.zip} />
                  <div style={{ gridColumn: '1 / 3' }}>
                    <DetailField label="INTERNATIONAL ADDRESS" value={currentPerson.internationalAddress} />
                  </div>
                  <DetailField label="COUNTRY" value={currentPerson.country} />
                  <DetailField label="PHONE" value={currentPerson.phone} />
                  <DetailField label="EMAIL" value={currentPerson.email} />
                </div>
              </div>

              {/* Group 3: Government IDs */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ background: '#f8fafc', padding: '6px 12px', fontWeight: 600, fontSize: '11px', color: '#334155', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase' }}>
                  Government Identification
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', padding: '12px' }}>
                  <DetailField label="SSN" value={currentPerson.ssn} />
                  <DetailField label="TIN / TAX ID" value={currentPerson.tin} />
                  <DetailField label="DRIVER LICENSE" value={currentPerson.driversLicenseNumber || currentPerson.driverLicense} />
                  <DetailField label="DL STATE" value={currentPerson.dlState || currentPerson.driverLicenseState} />
                  <DetailField label="PASSPORT NUMBER" value={currentPerson.passportNumber} />
                  <DetailField label="PASSPORT ISSUING COUNTRY" value={currentPerson.passportIssuingCountry || currentPerson.passportCountry} />
                  <DetailField label="PASSPORT EXPIRATION DATE" value={currentPerson.passportExpirationDate} />
                  <DetailField label="STATE ID CARD NUMBER" value={currentPerson.stateIdentificationCardNumber || currentPerson.stateIdCardNumber} />
                  <DetailField label="MILITARY ID NUMBER" value={currentPerson.militaryIdNumber} />
                  <DetailField label="STUDENT ID NUMBER" value={currentPerson.studentIdNumber} />
                  <DetailField label="ALIEN REGISTRATION NUMBER" value={currentPerson.alienRegistrationNumber} />
                  <DetailField label="TRIBAL ID NUMBER" value={currentPerson.tribalIdentificationNumber || currentPerson.tribalIdNumber} />
                  <DetailField label="OTHER GOV ID NUMBER" value={currentPerson.otherGovernmentIssuedIdNumber || currentPerson.otherGovIdNumber} />
                  <DetailField label="OTHER GOV ID TYPE" value={currentPerson.otherGovernmentIssuedType || currentPerson.otherGovIdType} />
                  <DetailField label="OTHER GOV ID COUNTRY" value={currentPerson.otherGovernmentIssuedIdCountry || currentPerson.otherGovIdCountry} />
                </div>
              </div>

              {/* Group 4: Financial */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ background: '#f8fafc', padding: '6px 12px', fontWeight: 600, fontSize: '11px', color: '#334155', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase' }}>
                  Financial Information
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', padding: '12px' }}>
                  <DetailField label="FINANCIAL ACCOUNT" value={currentPerson.financialAccountNumber || currentPerson.financialAccount} />
                  <DetailField label="FINANCIAL INSTITUTION" value={currentPerson.financialInstitutionName} />
                  <DetailField label="ROUTING NUMBER" value={currentPerson.financialRoutingNumber || currentPerson.financialRoutingNumberInternal} />
                  <DetailField label="PAYMENT CARD" value={currentPerson.paymentCardNumber || currentPerson.paymentCard} />
                  <DetailField label="PAYMENT CARD EXPIRATION" value={currentPerson.paymentCardExpirationDate} />
                  <DetailField label="LOGIN PLATFORM" value={currentPerson.loginPlatform} />
                </div>
              </div>

              {/* Group 5: Medical / Health & Biometric */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ background: '#f8fafc', padding: '6px 12px', fontWeight: 600, fontSize: '11px', color: '#334155', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase' }}>
                  Medical &amp; Biometric
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', padding: '12px' }}>
                  <DetailField label="MEDICAL RECORD NUMBER" value={currentPerson.medicalRecordNumber || currentPerson.medicalInfo} />
                  <DetailField label="HEALTH INSURANCE POLICY" value={currentPerson.healthInsurancePolicyNumber} />
                  <DetailField label="PATIENT ACCOUNT NUMBER" value={currentPerson.patientAccountNumber} />
                  <DetailField label="MEDICAID / MEDICARE" value={currentPerson.medicaidMedicareNumber} />
                  <div style={{ gridColumn: '1 / -1' }}>
                    <DetailField label="BIOMETRIC" value={currentPerson.biometric} />
                  </div>
                </div>
              </div>

              {/* Group 6: Audit Information (Requirement 8) */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden', background: '#fafafa' }}>
                <div style={{ background: '#f1f5f9', padding: '6px 12px', fontWeight: 600, fontSize: '11px', color: '#334155', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase' }}>
                  Audit Metadata
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', padding: '12px' }}>
                  <DetailField label="CREATED BY" value={currentAudit.createdBy || currentPerson.createdBy || '-'} />
                  <DetailField label="CREATED AT" value={formatTimestamp(currentAudit.createdAt || currentPerson.createdAt)} />
                  <DetailField label="UPDATED BY" value={currentAudit.updatedBy || currentPerson.updatedBy || '-'} />
                  <DetailField label="UPDATED AT" value={formatTimestamp(currentAudit.updatedAt || currentPerson.updatedAt)} />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="person-tracker-form-footer" style={{ flexShrink: 0, justifyContent: 'flex-end' }}>
              <button className="legacy-button" type="button" onClick={closeDetailModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <ChangePasswordModal onClose={() => setIsPasswordModalOpen(false)} />
      )}
    </div>
  )
}

function DetailField({ label, value }) {
  const displayVal = value !== undefined && value !== null && String(value).trim() !== '' ? String(value) : '-'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', letterSpacing: '0.4px' }}>
        {label}
      </span>
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '3px',
          padding: '5px 8px',
          fontSize: '11px',
          color: displayVal === '-' ? '#94a3b8' : '#1e293b',
          minHeight: '26px',
          wordBreak: 'break-word',
        }}
      >
        {displayVal}
      </div>
    </div>
  )
}
