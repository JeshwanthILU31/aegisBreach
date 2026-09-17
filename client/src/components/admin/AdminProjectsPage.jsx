import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as projectsApi from '../../services/projectsApi'
import { useAuth } from '../../context/AuthContext'

const emptyProjectForm = {
  name: '',
  slug: '',
  matterName: '',
  matterNumber: '',
  clientNumber: '',
  description: '',
  status: 'Active',
}

export default function AdminProjectsPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])

  function handleLogout() {
    logout()
    navigate('/login')
  }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  // Modal states
  const [modalMode, setModalMode] = useState(null) // 'create' | 'edit' | 'delete' | null
  const [selectedProject, setSelectedProject] = useState(null)
  const [formData, setFormData] = useState(emptyProjectForm)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await projectsApi.getProjects()
      if (Array.isArray(data)) {
        setProjects(data)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch projects.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Filtered projects
  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return projects.filter((project) => {
      const matchesSearch = !q || [
        project.name,
        project.slug,
        project.matterName,
        project.matterNumber,
        project.clientNumber,
        project.description,
      ].some((val) => String(val || '').toLowerCase().includes(q))

      const matchesStatus = statusFilter === 'All' || project.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [projects, searchQuery, statusFilter])

  // Open Create Modal
  const openCreateModal = () => {
    setFormData(emptyProjectForm)
    setFormError('')
    setSelectedProject(null)
    setModalMode('create')
  }

  // Open Edit Modal
  const openEditModal = (project) => {
    setFormData({
      name: project.name || '',
      slug: project.slug || '',
      matterName: project.matterName || '',
      matterNumber: project.matterNumber || '',
      clientNumber: project.clientNumber || '',
      description: project.description || '',
      status: project.status || 'Active',
    })
    setFormError('')
    setSelectedProject(project)
    setModalMode('edit')
  }

  // Open Delete Modal
  const openDeleteModal = (project) => {
    setFormError('')
    setSelectedProject(project)
    setModalMode('delete')
  }

  const closeModal = () => {
    if (submitting) return
    setModalMode(null)
    setSelectedProject(null)
    setFormError('')
  }

  // Handle Create / Edit Submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setFormError('Project name is required.')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      if (modalMode === 'create') {
        const payload = {
          name: formData.name.trim(),
          slug: formData.slug.trim() || formData.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          matterName: formData.matterName.trim(),
          matterNumber: formData.matterNumber.trim(),
          clientNumber: formData.clientNumber.trim(),
          description: formData.description.trim(),
          status: formData.status,
        }
        await projectsApi.createProject(payload)
      } else if (modalMode === 'edit' && selectedProject) {
        const payload = {
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          matterName: formData.matterName.trim(),
          matterNumber: formData.matterNumber.trim(),
          clientNumber: formData.clientNumber.trim(),
          description: formData.description.trim(),
          status: formData.status,
        }
        await projectsApi.updateProject(selectedProject._id, payload)
      }

      setModalMode(null)
      await fetchProjects()
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Failed to save project.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!selectedProject) return
    setSubmitting(true)
    setFormError('')

    try {
      await projectsApi.deleteProject(selectedProject._id)
      setModalMode(null)
      setSelectedProject(null)
      await fetchProjects()
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Failed to delete project.')
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
        <div style={{ marginLeft: '16px', color: '#c4cdd5', fontSize: '12px' }}>
          Project &amp; Workspace Management
        </div>
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
            <span>Admin</span>
          </div>
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
              ADMINISTRATION / WORKSPACES
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#33444e', margin: '2px 0 0 0' }}>
              Projects Management
            </h1>
          </div>
          <div>
            <button
              className="legacy-button primary-legacy"
              type="button"
              onClick={openCreateModal}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12px' }}
            >
              <span>+</span> New Project
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
              placeholder="Search by name, matter, client..."
              style={{ width: '280px', height: '26px' }}
            />
          </label>
          <label style={{ marginLeft: '8px' }}>
            Status{' '}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ height: '26px', padding: '0 6px' }}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Archived">Archived</option>
              <option value="Pending">Pending</option>
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
            {filteredProjects.length} of {projects.length} projects
          </span>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div style={{ background: '#fdf2f2', border: '1px solid #f8b4b4', color: '#9b1c1c', padding: '8px 12px', fontSize: '12px', marginBottom: '10px', borderRadius: '3px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button className="legacy-button" type="button" onClick={fetchProjects}>Retry</button>
          </div>
        )}

        {/* Table / Results Container */}
        <div style={{ flex: 1, minHeight: 0, background: '#fff', border: '1px solid #c2cace', borderRadius: '3px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="review-results-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <table className="review-results-table" style={{ width: '100%', minWidth: '950px' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                  <th>Project Name</th>
                  <th>Slug</th>
                  <th>Matter Name</th>
                  <th>Matter Number</th>
                  <th>Client Number</th>
                  <th>Status</th>
                  <th>Description</th>
                  <th style={{ width: '160px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: '#68767e' }}>
                      Loading projects from database...
                    </td>
                  </tr>
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: '#68767e' }}>
                      {projects.length === 0
                        ? 'No projects available. Click "+ New Project" above to create one.'
                        : 'No projects match your search criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((project, index) => (
                    <tr key={project._id || project.slug || index}>
                      <td style={{ textAlign: 'center', color: '#68767e' }}>{index + 1}</td>
                      <td>
                        <Link
                          to={`/projects/${project.slug || project._id}`}
                          className="table-link"
                          style={{ fontWeight: 600, color: '#105280', textDecoration: 'none' }}
                          title="Open workspace in review view"
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td style={{ color: '#68767e', fontFamily: 'monospace', fontSize: '11px' }}>
                        {project.slug || '-'}
                      </td>
                      <td>{project.matterName || '-'}</td>
                      <td>{project.matterNumber || '-'}</td>
                      <td>{project.clientNumber || '-'}</td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '10px',
                            fontWeight: 600,
                            background:
                              project.status === 'Active'
                                ? '#def7ec'
                                : project.status === 'Archived'
                                ? '#e5e7eb'
                                : '#fef08a',
                            color:
                              project.status === 'Active'
                                ? '#03543f'
                                : project.status === 'Archived'
                                ? '#374151'
                                : '#713f12',
                          }}
                        >
                          {project.status || 'Active'}
                        </span>
                      </td>
                      <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={project.description}>
                        {project.description || '-'}
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <Link
                            to={`/admin/projects/${project.slug || project._id}/batches`}
                            className="legacy-button primary-legacy"
                            style={{ padding: '2px 8px', fontSize: '11px', textDecoration: 'none' }}
                            title="Manage project batches"
                          >
                            Batches
                          </Link>
                          <button
                            className="legacy-button"
                            type="button"
                            onClick={() => openEditModal(project)}
                            title="Edit project metadata"
                            style={{ padding: '2px 8px', fontSize: '11px' }}
                          >
                            Edit
                          </button>
                          <button
                            className="legacy-button"
                            type="button"
                            onClick={() => openDeleteModal(project)}
                            title="Delete project & cascade cleanup"
                            style={{ padding: '2px 8px', fontSize: '11px', color: '#9b1c1c' }}
                          >
                            Delete
                          </button>
                          <Link
                            to={`/projects/${project.slug || project._id}`}
                            className="legacy-button"
                            style={{ padding: '2px 8px', fontSize: '11px', textDecoration: 'none' }}
                            title="Go to review workspace"
                          >
                            Review
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Create / Edit Modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="person-tracker-overlay" style={{ zIndex: 1000 }}>
          <div className="person-tracker-form" style={{ width: '560px' }} role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
            <div className="person-tracker-form-header">
              <strong id="project-modal-title">
                {modalMode === 'create' ? 'Create New Project' : `Edit Project: ${selectedProject?.name}`}
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

                <label className="coding-field" style={{ gridColumn: '1 / -1' }}>
                  <span>PROJECT NAME *</span>
                  <input
                    autoFocus
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Project Orchid (6-7)"
                    disabled={submitting}
                  />
                </label>

                <label className="coding-field">
                  <span>SLUG (URL IDENTIFIER)</span>
                  <input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g. project-orchid-6-7"
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
                    <option value="Active">Active</option>
                    <option value="Archived">Archived</option>
                    <option value="Pending">Pending</option>
                  </select>
                </label>

                <label className="coding-field">
                  <span>MATTER NAME</span>
                  <input
                    value={formData.matterName}
                    onChange={(e) => setFormData({ ...formData, matterName: e.target.value })}
                    placeholder="e.g. Orchid"
                    disabled={submitting}
                  />
                </label>

                <label className="coding-field">
                  <span>MATTER NUMBER</span>
                  <input
                    value={formData.matterNumber}
                    onChange={(e) => setFormData({ ...formData, matterNumber: e.target.value })}
                    placeholder="e.g. MTR-0067"
                    disabled={submitting}
                  />
                </label>

                <label className="coding-field">
                  <span>CLIENT NUMBER</span>
                  <input
                    value={formData.clientNumber}
                    onChange={(e) => setFormData({ ...formData, clientNumber: e.target.value })}
                    placeholder="e.g. CL-1042"
                    disabled={submitting}
                  />
                </label>

                <label className="coding-field" style={{ gridColumn: '1 / -1' }}>
                  <span>DESCRIPTION</span>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Project workspace description..."
                    disabled={submitting}
                    style={{ resize: 'vertical', width: '100%', padding: '4px 6px', fontSize: '11px' }}
                  />
                </label>
              </div>

              <div className="person-tracker-form-footer">
                <button className="legacy-button primary-legacy" type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : modalMode === 'create' ? 'Create Project' : 'Save Changes'}
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
      {modalMode === 'delete' && selectedProject && (
        <div className="person-tracker-overlay" style={{ zIndex: 1000 }}>
          <div className="person-tracker-form" style={{ width: '480px' }} role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
            <div className="person-tracker-form-header" style={{ background: 'linear-gradient(#9b1c1c, #771d1d)' }}>
              <strong id="delete-modal-title">Confirm Project Deletion</strong>
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
                Are you sure you want to delete project <strong>&ldquo;{selectedProject.name}&rdquo;</strong>?
              </p>

              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '4px', padding: '10px 12px', fontSize: '12px', color: '#92400e', lineHeight: '1.4' }}>
                <strong>&bull; Cascade Cleanup Warning:</strong>
                <div style={{ marginTop: '4px' }}>
                  Deleting this project will permanently remove all associated <strong>Batches</strong>, <strong>Documents</strong>, and <strong>Coding Records</strong> from MongoDB. This action cannot be undone.
                </div>
              </div>

              <div style={{ fontSize: '11px', color: '#68767e' }}>
                Project ID: <code>{selectedProject._id}</code><br />
                Matter: {selectedProject.matterName || '-'} ({selectedProject.matterNumber || '-'})
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
