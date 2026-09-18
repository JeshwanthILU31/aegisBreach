import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const initialFilters = { batchSet: 'All', batch: '', batchStatus: 'All', batchUnit: 'All', assignedTo: 'All' }

function ReviewTable({ rows, filters, setFilters, selected, setSelected, onOpen, user }) {
  const selectableRows = rows.filter((row) => !row.takenByOther && !row.isLocked)
  const allSelected = selectableRows.length > 0 && selectableRows.every((row) => selected.includes(row.id))
  const toggleAll = (event) => setSelected(event.target.checked ? selectableRows.map((row) => row.id) : [])
  const toggleRow = (row) => {
    if (!row.takenByOther && !row.isLocked) {
      setSelected((current) => current.includes(row.id) ? current.filter((item) => item !== row.id) : [...current, row.id])
    }
  }
  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }))

  return (
    <div className="review-results-scroll">
      <table className="review-results-table review-batches-table">
        <thead>
          <tr>
            <th className="review-row-number">#</th>
            <th className="review-select-column">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select available batches" />
            </th>
            <th className="review-edit-column">Edit</th>
            <th>Batch Set</th>
            <th>Batch</th>
            <th>Batch Status</th>
            <th>Batch Unit</th>
            <th>Assigned To</th>
            <th>Reviewed</th>
            <th>Batch Size</th>
          </tr>
          <tr className="review-filter-row">
            <th colSpan="3" />
            <th>
              <select value={filters.batchSet} onChange={(event) => update('batchSet', event.target.value)} aria-label="Filter batch set">
                <option>All</option>
                <option>Monday Batch1</option>
              </select>
            </th>
            <th>
              <input value={filters.batch} onChange={(event) => update('batch', event.target.value)} placeholder="Filter" aria-label="Filter batch" />
            </th>
            <th>
              <select value={filters.batchStatus} onChange={(event) => update('batchStatus', event.target.value)} aria-label="Filter batch status">
                <option>All</option>
                <option>Available</option>
                <option>In Progress</option>
                <option>Taken</option>
              </select>
            </th>
            <th>
              <select value={filters.batchUnit} onChange={(event) => update('batchUnit', event.target.value)} aria-label="Filter batch unit">
                <option>All</option>
                <option>Alternate Workflow 6+ Entries</option>
              </select>
            </th>
            <th>
              <select value={filters.assignedTo} onChange={(event) => update('assignedTo', event.target.value)} aria-label="Filter assigned reviewer">
                <option>All</option>
                <option>Unassigned</option>
                {user?.username && <option>{user.username}</option>}
                <option>Employee A (Gupta, Anjali)</option>
                <option>Employee B (Saini, Suresh)</option>
              </select>
            </th>
            <th />
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr className={`${selected.includes(row.id) ? 'is-selected' : ''} ${row.takenByOther ? 'is-taken' : ''}`} key={row.id}>
              <td className="review-row-number">{index + 1}</td>
              <td className="review-select-column">
                <input
                  type="checkbox"
                  disabled={row.takenByOther || row.isLocked}
                  checked={selected.includes(row.id)}
                  onChange={() => toggleRow(row)}
                  aria-label={`Select ${row.batch}`}
                />
              </td>
              <td className="review-edit-column">
                <button type="button" onClick={() => onOpen(row)} aria-label={`Open ${row.batch}`}>[ ]</button>
              </td>
              <td>{row.batchSet}</td>
              <td>
                <button className="review-open-link" type="button" onClick={() => onOpen(row)}>{row.batch}</button>
              </td>
              <td>
                <span className={`batch-status ${row.takenByOther ? 'is-taken' : ''}`}>
                  {row.batchStatus}
                  {row.takenByOther && <small> (another user)</small>}
                </span>
              </td>
              <td>{row.batchUnit}</td>
              <td>{row.assignedTo || 'Unassigned'}</td>
              <td>{row.reviewed}</td>
              <td>{row.batchSize}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ReviewPage() {
  const { user } = useAuth()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [projectView, setProjectView] = useState('Project Orchid (6-7)')
  const [batchSet, setBatchSet] = useState('All Batches')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [filters, setFilters] = useState(initialFilters)
  const [selected, setSelected] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [dbBatches, setDbBatches] = useState([])
  const [actionError, setActionError] = useState('')

  const fetchBatches = useCallback(async () => {
    try {
      const activeProjectId = projectId || 'project-orchid-6-7'
      const { data } = await api.get(`/projects/${activeProjectId}/batches`)
      if (Array.isArray(data)) {
        const mapped = data.map((item) => {
          const isTakenByMe = Boolean(
            item.isLocked &&
            user &&
            (
              (item.lockedBy && String(item.lockedBy) === String(user.id)) ||
              (item.assignedTo && String(item.assignedTo) === String(user.id)) ||
              (item.assignedToName && user.username && item.assignedToName === user.username)
            )
          )
          const isTakenByOther = Boolean(item.isLocked && !isTakenByMe)
          let displayStatus = item.status || 'Available'
          if (isTakenByOther) displayStatus = 'Taken'
          else if (isTakenByMe) displayStatus = 'In Progress'

          return {
            id: item._id,
            batch: item.name,
            batchSet: item.batchSet || 'Monday Batch1',
            batchStatus: displayStatus,
            batchUnit: item.batchUnit || 'Alternate Workflow 6+ Entries',
            assignedTo: item.assignedToName || '',
            assignedToName: item.assignedToName || '',
            lockedBy: item.lockedBy,
            assignedToId: item.assignedTo,
            reviewed: item.reviewed || 0,
            batchSize: item.batchSize || 50,
            takenByOther: isTakenByOther,
            isTakenByMe: isTakenByMe,
            isLocked: Boolean(item.isLocked),
          }
        })
        setDbBatches(mapped)
      }
    } catch {
      // Backend error fallback
    }
  }, [projectId, user])

  useEffect(() => {
    fetchBatches()
  }, [fetchBatches])

  const rows = useMemo(() => {
    return dbBatches.filter((row) => {
      const searchable = Object.values(row).join(' ').toLowerCase()
      const matchesSearch = !appliedSearch || searchable.includes(appliedSearch.toLowerCase())
      const matchesBatchSet = batchSet === 'All Batches' || row.batchSet === batchSet
      const matchesFilterBatchSet = filters.batchSet === 'All' || row.batchSet === filters.batchSet
      const matchesFilterBatch = !filters.batch || row.batch.toLowerCase().includes(filters.batch.toLowerCase())
      const matchesFilterStatus = filters.batchStatus === 'All' || row.batchStatus === filters.batchStatus
      const matchesFilterUnit = filters.batchUnit === 'All' || row.batchUnit === filters.batchUnit
      const matchesFilterAssigned = filters.assignedTo === 'All' || (filters.assignedTo === 'Unassigned' ? !row.assignedTo : row.assignedTo === filters.assignedTo)

      return matchesSearch && matchesBatchSet && matchesFilterBatchSet && matchesFilterBatch && matchesFilterStatus && matchesFilterUnit && matchesFilterAssigned
    })
  }, [appliedSearch, batchSet, dbBatches, filters])

  const acquiredCount = useMemo(() => dbBatches.filter((b) => b.isLocked && b.isTakenByMe).length, [dbBatches])
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize)

  const runSearch = () => {
    setAppliedSearch(search)
    setPage(1)
  }

  const clearSearch = () => {
    setSearch('')
    setAppliedSearch('')
    setBatchSet('All Batches')
    setFilters(initialFilters)
    setSelected([])
    setActionError('')
    setPage(1)
  }

  const batchOut = async () => {
    if (!selected.length) return
    setActionError('')
    let hadError = false

    for (const batchId of selected) {
      try {
        await api.post(`/batches/${batchId}/acquire`)
      } catch (error) {
        hadError = true
        const errorMessage = error.response?.data?.error || 'Batch could not be acquired.'
        setActionError(errorMessage)
        break
      }
    }

    if (!hadError) {
      setSelected([])
    }
    await fetchBatches()
  }

  const openBatch = (row) => {
    if (!row.takenByOther) {
      navigate(`/projects/${projectId}/review/${row.id}`)
    }
  }

  const canBatchOut = selected.length > 0 && selected.every((id) => {
    const found = dbBatches.find((row) => row.id === id)
    return found && !found.takenByOther && !found.isLocked
  })

  return (
    <div className="review-page-v2">
      <div className="review-page-heading">
        <div>
          <div className="crumb-line">{projectView.toUpperCase()} / WORKSPACE</div>
          <h1>Review</h1>
        </div>
        <div className="review-top-selectors">
          <select value={projectView} onChange={(event) => setProjectView(event.target.value)} aria-label="Current project">
            <option>Project Orchid (6-7)</option>
            <option>Project Orchid - Special Analysis</option>
          </select>
          <select value={batchSet} onChange={(event) => setBatchSet(event.target.value)} aria-label="Review batch set">
            <option>All Batches</option>
            <option>Monday Batch1</option>
          </select>
        </div>
      </div>

      <div className="review-control-strip">
        <label>
          Search <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && runSearch()} placeholder="Search batches" />
        </label>
        <button className="legacy-button primary-legacy" type="button" onClick={runSearch}>Search</button>
        <button className="legacy-button" type="button" onClick={clearSearch}>Clear</button>
        <div className="review-action-buttons">
          <button className="legacy-button" type="button" disabled={!canBatchOut} onClick={batchOut}>Batch Out</button>
          <button className="legacy-button" type="button" disabled={!selected.length}>Open</button>
          <button className="legacy-button" type="button" disabled={!selected.length}>Edit</button>
        </div>
      </div>

      {actionError && (
        <div style={{ background: '#fdf2f2', border: '1px solid #f8b4b4', color: '#9b1c1c', padding: '8px 12px', fontSize: '12px', marginBottom: '8px' }}>
          {actionError}
        </div>
      )}

      <div className="review-results-heading">
        <strong>Review Batches</strong>
        <span>{selected.length} selected / {rows.length} records / {acquiredCount} batched out</span>
      </div>

      <ReviewTable rows={pageRows} filters={filters} setFilters={setFilters} selected={selected} setSelected={setSelected} onOpen={openBatch} user={user} />

      <div className="review-pagination">
        <span>Showing {rows.length ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, rows.length)} of {rows.length}</span>
        <button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>&lt;</button>
        <strong>{page}</strong>
        <button type="button" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>&gt;</button>
        <label>
          Rows{' '}
          <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }}>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="1000">1,000</option>
          </select>
        </label>
      </div>
    </div>
  )
}

