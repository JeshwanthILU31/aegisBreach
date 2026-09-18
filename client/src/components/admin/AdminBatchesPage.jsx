import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as batchesApi from '../../services/batchesApi'
import * as projectsApi from '../../services/projectsApi'
import { useAuth } from '../../context/AuthContext'
import ChangePasswordModal from './ChangePasswordModal'

const emptyBatchForm = {
  name: '',
  batchSet: 'Monday Batch1',
  batchUnit: 'Alternate Workflow 6+ Entries',
  batchSize: 50,
  status: 'Available',
  assignedToName: '',
}

const simulatedReviewers = [
  { label: 'Unassigned', value: '' },
  { label: 'Employee A (Gupta, Anjali)', value: 'Employee A (Gupta, Anjali)' },
  { label: 'Employee B (Saini, Suresh)', value: 'Employee B (Saini, Suresh)' },
  { label: 'Current Reviewer', value: 'Current Reviewer' },
]

export default function AdminBatchesPage() {
  const { logout } = useAuth()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const activeProjectId = projectId || 'project-orchid-6-7'

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const [project, setProject] = useState(null)
  const [allProjects, setAllProjects] = useState([])
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [assigneeFilter, setAssigneeFilter] = useState('All')
  const [setFilter, setSetFilter] = useState('All')

  // Modal states
  const [modalMode, setModalMode] = useState(null) // 'create' | 'edit' | 'delete' | null
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [formData, setFormData] = useState(emptyBatchForm)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)

  // Fetch Project & Batches
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      // Fetch projects for context switcher
      const projs = await projectsApi.getProjects()
      if (Array.isArray(projs)) {
        setAllProjects(projs)
        const current = projs.find((p) => p._id === activeProjectId || p.slug === activeProjectId)
        if (current) setProject(current)
      }

      // Fetch batches for this project
      const batchList = await batchesApi.getBatches(activeProjectId)
      if (Array.isArray(batchList)) {
        setBatches(batchList)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load batches.')
    } finally {
      setLoading(false)
    }
  }, [activeProjectId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Extract unique batch sets
  const batchSets = useMemo(() => {
    const sets = new Set(batches.map((b) => b.batchSet).filter(Boolean))
    return ['All', ...Array.from(sets)]
  }, [batches])

  // Filtered Batches
  const filteredBatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return batches.filter((batch) => {
      const matchesSearch = !q || [
        batch.name,
        batch.batchSet,
        batch.batchUnit,
        batch.assignedToName,
        batch.status,
      ].some((val) => String(val || '').toLowerCase().includes(q))

      const matchesStatus = statusFilter === 'All' || batch.status === statusFilter
      const matchesSet = setFilter === 'All' || batch.batchSet === setFilter
      const matchesAssignee =
        assigneeFilter === 'All' ||
        (assigneeFilter === 'Unassigned' ? !batch.assignedToName : batch.assignedToName === assigneeFilter)

      return matchesSearch && matchesStatus && matchesSet && matchesAssignee
    })
  }, [batches, searchQuery, statusFilter, setFilter, assigneeFilter])

  // Modal handlers
  const openCreateModal = () => {
    setFormData(emptyBatchForm)
    setFormError('')
    setSelectedBatch(null)
    setModalMode('create')
  }

  const openEditModal = (batch) => {
    setFormData({
      name: batch.name || '',
      batchSet: batch.batchSet || 'Monday Batch1',
      batchUnit: batch.batchUnit || 'Alternate Workflow 6+ Entries',
      batchSize: batch.batchSize || 50,
      status: batch.status || 'Available',
      assignedToName: batch.assignedToName || '',
    })
    setFormError('')
    setSelectedBatch(batch)
    setModalMode('edit')
  }

  const openDeleteModal = (batch) => {
    setFormError('')
    setSelectedBatch(batch)
    setModalMode('delete')
  }

  const closeModal = () => {
    if (submitting) return
    setModalMode(null)
    setSelectedBatch(null)
    setFormError('')
  }

  // Handle Create / Edit Submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setFormError('Batch name is required.')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      if (modalMode === 'create') {
        const payload = {
          name: formData.name.trim(),
          batchSet: formData.batchSet.trim() || 'Monday Batch1',
          batchUnit: formData.batchUnit.trim() || 'Alternate Workflow 6+ Entries',
          batchSize: Number(formData.batchSize) || 50,
          status: formData.status || 'Available',
          assignedToName: formData.assignedToName || '',
        }
        await batchesApi.createBatch(activeProjectId, payload)
      } else if (modalMode === 'edit' && selectedBatch) {
        const payload = {
          name: formData.name.trim(),
          batchSet: formData.batchSet.trim(),
          batchUnit: formData.batchUnit.trim(),
          batchSize: Number(formData.batchSize) || 50,
          status: formData.status,
          assignedToName: formData.assignedToName,
        }
        await batchesApi.updateBatch(activeProjectId, selectedBatch._id, payload)
      }

      setModalMode(null)
      await loadData()
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Failed to save batch.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!selectedBatch) return
    setSubmitting(true)
    setFormError('')

    try {
      await batchesApi.deleteBatch(activeProjectId, selectedBatch._id)
      setModalMode(null)
      setSelectedBatch(null)
      await loadData()
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Failed to delete batch.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f4f5f6' }}>
      {/* Top Header */}
      <header className="selection-header" style={{ flexShrink: 0 }}>
        <Link className="selection-brand" to="/admin">
          <span className="relativity-mark" style={{ background: '#7c3aed' }}>A</span>
          <span>AegisBreach Admin</span>
        </Link>
        <div style={{ marginLeft: '16px', color: '#c4cdd5', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link to="/admin/projects" style={{ color: '#93c5fd', textDecoration: 'none' }}>Projects</Link>
          <span>/</span>
          <span>{project?.name || activeProjectId}</span>
          <span>/</span>
          <strong style={{ color: '#fff' }}>Batches</strong>
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
              ADMINISTRATION / {project?.name?.toUpperCase() || activeProjectId.toUpperCase()}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#33444e', margin: '2px 0 0 0' }}>
                Batch Management
              </h1>
              {allProjects.length > 1 && (
                <select
                  value={activeProjectId}
                  onChange={(e) => navigate(`/admin/projects/${e.target.value}/batches`)}
                  style={{ height: '24px', fontSize: '11px', marginTop: '2px' }}
                  aria-label="Switch project"
                >
                  {allProjects.map((p) => (
                    <option key={p._id} value={p.slug || p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link
              to="/admin/projects"
              className="legacy-button"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '12px' }}
            >
              &larr; All Projects
            </Link>
            <button
              className="legacy-button primary-legacy"
              type="button"
              onClick={openCreateModal}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12px' }}
            >
              <span>+</span> New Batch
            </button>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="review-control-strip" style={{ marginBottom: '10px', borderRadius: '3px' }}>
          <label>
            Search{' '}
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search batches, sets, assignees..."
              style={{ width: '220px', height: '26px' }}
            />
          </label>
          <label style={{ marginLeft: '6px' }}>
            Batch Set{' '}
            <select
              value={setFilter}
              onChange={(e) => setSetFilter(e.target.value)}
              style={{ height: '26px', padding: '0 6px' }}
            >
              {batchSets.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label style={{ marginLeft: '6px' }}>
            Status{' '}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ height: '26px', padding: '0 6px' }}
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </label>
          <label style={{ marginLeft: '6px' }}>
            Assignee{' '}
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              style={{ height: '26px', padding: '0 6px' }}
            >
              <option value="All">All Assignees</option>
              <option value="Unassigned">Unassigned</option>
              <option value="Current Reviewer">Current Reviewer</option>
              <option value="Employee A (Gupta, Anjali)">Employee A (Gupta, Anjali)</option>
              <option value="Employee B (Saini, Suresh)">Employee B (Saini, Suresh)</option>
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
            {filteredBatches.length} of {batches.length} batches
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
            <table className="review-results-table" style={{ width: '100%', minWidth: '1050px' }}>
              <thead>
                <tr>
                  <th style={{ width: '35px', textAlign: 'center' }}>#</th>
                  <th>Batch Name</th>
                  <th>Batch Set</th>
                  <th>Batch Unit</th>
                  <th style={{ width: '70px', textAlign: 'center' }}>Batch Size</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Reviewed</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th style={{ width: '70px', textAlign: 'center' }}>Locked</th>
                  <th style={{ width: '140px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '36px', color: '#68767e' }}>
                      Loading batches for project...
                    </td>
                  </tr>
                ) : filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '36px', color: '#68767e' }}>
                      {batches.length === 0
                        ? 'No batches configured for this project. Click "+ New Batch" above to create one.'
                        : 'No batches match your filter criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((batch, index) => {
                    const isTakenByCurrent = batch.assignedToName === 'Current Reviewer' && batch.isLocked
                    const isTakenByOther = batch.isLocked && batch.assignedToName && batch.assignedToName !== 'Current Reviewer'

                    return (
                      <tr key={batch._id || index} className={isTakenByOther ? 'is-taken' : ''}>
                        <td style={{ textAlign: 'center', color: '#68767e' }}>{index + 1}</td>
                        <td style={{ fontWeight: 600, color: '#2c3e50' }}>{batch.name}</td>
                        <td>{batch.batchSet}</td>
                        <td>{batch.batchUnit}</td>
                        <td style={{ textAlign: 'center' }}>{batch.batchSize || 50}</td>
                        <td style={{ textAlign: 'center', fontWeight: 500 }}>
                          <span style={{ color: batch.reviewed === batch.batchSize && batch.batchSize > 0 ? '#03543f' : '#33444e' }}>
                            {batch.reviewed || 0} / {batch.batchSize || 50}
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
                                batch.status === 'Completed'
                                  ? '#def7ec'
                                  : batch.status === 'In Progress'
                                  ? '#e0e7ff'
                                  : '#f3f4f6',
                              color:
                                batch.status === 'Completed'
                                  ? '#03543f'
                                  : batch.status === 'In Progress'
                                  ? '#3730a3'
                                  : '#4b5563',
                            }}
                          >
                            {batch.status || 'Available'}
                          </span>
                        </td>
                        <td>
                          {batch.assignedToName ? (
                            <span style={{ fontWeight: isTakenByCurrent ? 600 : 400, color: isTakenByCurrent ? '#105280' : '#4d5e67' }}>
                              {batch.assignedToName}
                              {isTakenByCurrent && ' (Active)'}
                            </span>
                          ) : (
                            <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Unassigned</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {batch.isLocked ? (
                            <span style={{ color: '#b91c1c', fontWeight: 600 }} title="Locked">🔒 Yes</span>
                          ) : (
                            <span style={{ color: '#059669' }}>🔓 No</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <Link
                              to={`/admin/projects/${project?.slug || activeProjectId}/batches/${batch._id}/documents`}
                              className="legacy-button primary-legacy"
                              style={{ padding: '2px 8px', fontSize: '11px', textDecoration: 'none' }}
                              title="Manage documents in this batch"
                            >
                              Documents
                            </Link>
                            <button
                              className="legacy-button"
                              type="button"
                              onClick={() => openEditModal(batch)}
                              title="Edit batch metadata"
                              style={{ padding: '2px 8px', fontSize: '11px' }}
                            >
                              Edit
                            </button>
                            <button
                              className="legacy-button"
                              type="button"
                              onClick={() => openDeleteModal(batch)}
                              title="Delete batch & cascade cleanup"
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

      {/* Create / Edit Batch Modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="person-tracker-overlay" style={{ zIndex: 1000 }}>
          <div className="person-tracker-form" style={{ width: '540px' }} role="dialog" aria-modal="true" aria-labelledby="batch-modal-title">
            <div className="person-tracker-form-header">
              <strong id="batch-modal-title">
                {modalMode === 'create' ? 'Create New Batch' : `Edit Batch: ${selectedBatch?.name}`}
              </strong>
              <button type="button" onClick={closeModal} aria-label="Close modal" disabled={submitting}>
                x
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="person-tracker-form-body" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {formError && (
                  <div style={{ gridColumn: '1 / -1', background: '#fdf2f2', border: '1px solid #f8b4b4', color: '#9b1c1c', padding: '6px 10px', fontSize: '11px', borderRadius: '3px' }}>
                    {formError}
                  </div>
                )}

                {modalMode === 'edit' && selectedBatch?.assignedToName === 'Current Reviewer' && selectedBatch?.isLocked && (
                  <div style={{ gridColumn: '1 / -1', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '6px 10px', fontSize: '11px', borderRadius: '3px' }}>
                    ℹ️ <strong>Active Reviewer Batch:</strong> This batch is currently locked by Current Reviewer. Its active lock status is protected to preserve reviewer state integrity.
                  </div>
                )}

                <label className="coding-field" style={{ gridColumn: '1 / -1' }}>
                  <span>BATCH NAME *</span>
                  <input
                    autoFocus
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Monday Batch1_00018"
                    disabled={submitting}
                  />
                </label>

                <label className="coding-field">
                  <span>BATCH SET</span>
                  <input
                    value={formData.batchSet}
                    onChange={(e) => setFormData({ ...formData, batchSet: e.target.value })}
                    placeholder="e.g. Monday Batch1"
                    disabled={submitting}
                  />
                </label>

                <label className="coding-field">
                  <span>BATCH UNIT</span>
                  <input
                    value={formData.batchUnit}
                    onChange={(e) => setFormData({ ...formData, batchUnit: e.target.value })}
                    placeholder="e.g. Alternate Workflow 6+ Entries"
                    disabled={submitting}
                  />
                </label>

                <label className="coding-field">
                  <span>BATCH SIZE</span>
                  <input
                    type="number"
                    min="1"
                    value={formData.batchSize}
                    onChange={(e) => setFormData({ ...formData, batchSize: e.target.value })}
                    disabled={submitting}
                  />
                </label>

                <label className="coding-field">
                  <span>STATUS</span>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    disabled={submitting}
                    style={{ height: '26px' }}
                  >
                    <option value="Available">Available</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </label>

                <label className="coding-field" style={{ gridColumn: '1 / -1' }}>
                  <span>ASSIGNED TO (SIMULATED EMPLOYEE / REVIEWER)</span>
                  <select
                    value={formData.assignedToName}
                    onChange={(e) => setFormData({ ...formData, assignedToName: e.target.value })}
                    disabled={submitting}
                    style={{ height: '26px' }}
                  >
                    {simulatedReviewers.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="person-tracker-form-footer">
                <button className="legacy-button primary-legacy" type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : modalMode === 'create' ? 'Create Batch' : 'Save Changes'}
                </button>
                <button className="legacy-button" type="button" onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Cascade Warning) */}
      {modalMode === 'delete' && selectedBatch && (
        <div className="person-tracker-overlay" style={{ zIndex: 1000 }}>
          <div className="person-tracker-form" style={{ width: '480px' }} role="dialog" aria-modal="true" aria-labelledby="delete-batch-title">
            <div className="person-tracker-form-header" style={{ background: 'linear-gradient(#9b1c1c, #771d1d)' }}>
              <strong id="delete-batch-title">Confirm Batch Deletion</strong>
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
                Are you sure you want to delete batch <strong>&ldquo;{selectedBatch.name}&rdquo;</strong>?
              </p>

              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '4px', padding: '10px 12px', fontSize: '12px', color: '#92400e', lineHeight: '1.4' }}>
                <strong>&bull; Cascade Cleanup Warning:</strong>
                <div style={{ marginTop: '4px' }}>
                  Deleting this batch will permanently remove all associated <strong>Documents</strong> and <strong>Coding Records</strong> belonging to this batch from MongoDB.
                </div>
              </div>

              <div style={{ fontSize: '11px', color: '#68767e' }}>
                Batch ID: <code>{selectedBatch._id}</code><br />
                Set: {selectedBatch.batchSet} | Status: {selectedBatch.status} | Reviewed: {selectedBatch.reviewed || 0}/{selectedBatch.batchSize || 50}
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

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  )
}
