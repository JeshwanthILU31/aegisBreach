import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DocumentBrowser from './DocumentBrowser'
import DocumentTable from './DocumentTable'
import SearchConditions from './SearchConditions'
import api from '../../services/api'

const initialFilters = { controlNumber: '', reportableData: 'All', flrReviewedBy: 'All', flrReviewedOn: '', extractionStatus: 'All', extractedBy: '', extractedOn: '', fileName: '', fileSize: '' }
const initialCondition = { id: 1, field: 'Reportable Data', operator: 'is', value: '' }

function matchesText(value, filter) {
  return !filter || String(value || '').toLowerCase().includes(filter.toLowerCase())
}

function escapeCsv(value) {
  return `"${String(value || '').replaceAll('"', '""')}"`
}

export default function DocumentsPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [projectView, setProjectView] = useState('Project Orchid (6-7)')
  const [relatedItems, setRelatedItems] = useState('All Related Items')
  const [documentView, setDocumentView] = useState('My Batched Out Docs')
  const [selectedFolder, setSelectedFolder] = useState('Set 6')
  const [searchText, setSearchText] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [conditions, setConditions] = useState([initialCondition])
  const [appliedConditions, setAppliedConditions] = useState([initialCondition])
  const [autoRun, setAutoRun] = useState(false)
  const [filters, setFilters] = useState(initialFilters)
  const [selected, setSelected] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [savedSearches, setSavedSearches] = useState([])
  const [tableMode, setTableMode] = useState('Table')
  const [dbDocuments, setDbDocuments] = useState([])

  const fetchDocuments = useCallback(async () => {
    try {
      const activeProjectId = projectId || 'project-orchid-6-7'
      const { data } = await api.get(`/projects/${activeProjectId}/documents`, {
        params: {
          view: documentView,
          reviewerName: 'Current Reviewer',
        },
      })
      if (Array.isArray(data)) {
        const mapped = data.map((doc) => ({
          id: doc._id,
          batchId: doc.batchId?._id || doc.batchId,
          batchName: doc.batchId?.name || '',
          controlNumber: doc.controlNumber,
          reportableData: doc.reportableData || 'Pending',
          flrReviewedBy: doc.flrReviewedBy || '',
          flrReviewedOn: doc.flrReviewedOn || '',
          extractionStatus: doc.extractionStatus || 'Pending',
          extractedBy: doc.extractedBy || '',
          extractedOn: doc.extractedOn || '',
          fileName: doc.fileName,
          fileSize: doc.fileSize || '1.5 MB',
          folder: doc.folder || 'Set 6',
        }))
        setDbDocuments(mapped)
      }
    } catch {
      // Backend error fallback
    }
  }, [documentView, projectId])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const runSearch = () => {
    setAppliedSearch(searchText)
    setAppliedConditions(conditions)
    setPage(1)
  }

  const handleConditionsChange = (nextConditions) => {
    if (autoRun) {
      setAppliedSearch(searchText)
      setAppliedConditions(nextConditions)
      setPage(1)
    }
  }

  const filteredDocuments = useMemo(() => {
    return dbDocuments.filter((document) => {
      const searchable = Object.values(document).join(' ').toLowerCase()
      const globalMatch = !appliedSearch || searchable.includes(appliedSearch.toLowerCase())
      const filterMatch =
        matchesText(document.controlNumber, filters.controlNumber) &&
        matchesText(document.flrReviewedOn, filters.flrReviewedOn) &&
        matchesText(document.extractedBy, filters.extractedBy) &&
        matchesText(document.extractedOn, filters.extractedOn) &&
        matchesText(document.fileName, filters.fileName) &&
        matchesText(document.fileSize, filters.fileSize)
      const dropdownMatch =
        (filters.reportableData === 'All' || document.reportableData === filters.reportableData) &&
        (filters.flrReviewedBy === 'All' || (filters.flrReviewedBy === 'Unassigned' ? !document.flrReviewedBy : document.flrReviewedBy === filters.flrReviewedBy)) &&
        (filters.extractionStatus === 'All' || document.extractionStatus === filters.extractionStatus)
      const conditionMatch = appliedConditions.every(
        (condition) =>
          !condition.value ||
          matchesText(
            document[
              condition.field === 'Reportable Data'
                ? 'reportableData'
                : condition.field === 'Control Number'
                ? 'controlNumber'
                : condition.field === 'Extraction Status'
                ? 'extractionStatus'
                : condition.field === 'File Name'
                ? 'fileName'
                : 'fileName'
            ],
            condition.value
          )
      )
      return globalMatch && filterMatch && dropdownMatch && conditionMatch
    })
  }, [appliedConditions, appliedSearch, dbDocuments, filters])

  const pageCount = Math.max(1, Math.ceil(filteredDocuments.length / pageSize))
  const pageRows = filteredDocuments.slice((page - 1) * pageSize, page * pageSize)

  const clearSearch = () => {
    setSearchText('')
    setAppliedSearch('')
    setFilters(initialFilters)
    setConditions([initialCondition])
    setAppliedConditions([initialCondition])
    setPage(1)
  }

  const exportCsv = () => {
    const header = ['Control Number', 'Reportable Data', 'FLR Reviewed by', 'FLR Reviewed on', 'Extraction Status', 'Extracted By', 'Extracted On', 'File Name', 'File Size']
    const body = filteredDocuments.map((row) => [
      row.controlNumber,
      row.reportableData,
      row.flrReviewedBy,
      row.flrReviewedOn,
      row.extractionStatus,
      row.extractedBy,
      row.extractedOn,
      row.fileName,
      row.fileSize,
    ])
    const blob = new Blob([[header, ...body].map((line) => line.map(escapeCsv).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'aegisbreach-documents.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const saveSearch = () =>
    setSavedSearches((current) => [...current, { id: Date.now(), name: `Search ${current.length + 1}`, query: searchText }])

  return (
    <div className="documents-page documents-page-v2">
      <div className="documents-page-heading">
        <div>
          <div className="crumb-line">{projectView.toUpperCase()} / WORKSPACE</div>
          <h1>Documents</h1>
        </div>
        <div className="documents-top-selectors">
          <select value={projectView} onChange={(event) => setProjectView(event.target.value)} aria-label="Current project">
            <option>Project Orchid (6-7)</option>
            <option>Project Orchid - Special Analysis</option>
          </select>
          <select value={relatedItems} onChange={(event) => setRelatedItems(event.target.value)} aria-label="Related items">
            <option>All Related Items</option>
            <option>Current Workspace</option>
            <option>Linked Items</option>
          </select>
          <select value={documentView} onChange={(event) => setDocumentView(event.target.value)} aria-label="Document view">
            <option>My Batched Out Docs</option>
            <option>All Documents</option>
            <option>Recently Viewed</option>
          </select>
        </div>
      </div>

      <div className="documents-control-strip">
        <label>
          Search <input value={searchText} onChange={(event) => setSearchText(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && runSearch()} placeholder="Search documents" />
        </label>
        <button className="legacy-button primary-legacy" type="button" onClick={runSearch}>Search</button>
        <button className="legacy-button" type="button" onClick={clearSearch}>Clear</button>
        <span className="documents-saved-searches">Saved: {savedSearches.length}</span>
      </div>

      <div className="documents-main-workspace">
        <DocumentBrowser selectedFolder={selectedFolder} onSelectFolder={(folder) => { setSelectedFolder(folder); setPage(1) }} />
        <main className="documents-results-panel">
          <SearchConditions
            conditions={conditions}
            setConditions={setConditions}
            onConditionsChange={handleConditionsChange}
            autoRun={autoRun}
            setAutoRun={setAutoRun}
            onRunSearch={runSearch}
          />
          <div className="documents-results-heading">
            <strong>Document Results</strong>
            <span>{selected.length} selected / {filteredDocuments.length} records</span>
          </div>
          <DocumentTable
            rows={pageRows}
            filters={filters}
            setFilters={setFilters}
            selected={selected}
            setSelected={setSelected}
            onOpen={(row) => navigate(`/projects/${projectId}/documents/${row.id}/coding`)}
          />
          <div className="documents-pagination">
            <span>Showing {filteredDocuments.length ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, filteredDocuments.length)} of {filteredDocuments.length}</span>
            <button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>&lt;</button>
            <strong>{page}</strong>
            <button type="button" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>&gt;</button>
            <label>
              Rows{' '}
              <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }}>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </label>
          </div>
          <div className="documents-bottom-controls">
            <select aria-label="Result view count">
              <option>All {filteredDocuments.length}</option>
              <option>Selected {selected.length}</option>
            </select>
            <button type="button" onClick={exportCsv}>Export to File</button>
            <button className={tableMode === 'Table' ? 'is-active' : ''} type="button" onClick={() => setTableMode('Table')}>Table</button>
            <button className={tableMode === 'Summary' ? 'is-active' : ''} type="button" onClick={() => setTableMode('Summary')}>Sum/Average</button>
            <button type="button" onClick={saveSearch}>Save Search</button>
          </div>
          {tableMode === 'Summary' && (
            <div className="documents-summary">
              {filteredDocuments.length} documents in the current result set. Selected: {selected.length}.
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

