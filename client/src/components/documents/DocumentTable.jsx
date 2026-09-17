const filterOptions = {
  reportableData: ['All', 'Yes', 'No', 'Pending'],
  flrReviewedBy: ['All', 'Review User', 'Training User', 'Case Reviewer', 'Unassigned'],
  extractionStatus: ['All', 'Complete', 'Pending'],
}

function FilterSelect({ value, onChange, options, label }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>{options.map((option) => <option key={option}>{option}</option>)}</select>
}

export default function DocumentTable({ rows, filters, setFilters, selected, setSelected, onOpen }) {
  const allSelected = rows.length > 0 && rows.every((row) => selected.includes(row.id))
  const toggleAll = (event) => setSelected(event.target.checked ? rows.map((row) => row.id) : [])
  const toggleRow = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  return <div className="documents-table-scroll"><table className="documents-results-table"><thead><tr>
    <th className="document-select-column"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all documents" /></th><th className="document-action-column">Edit</th><th>Control Number</th><th>Reportable Data</th><th>FLR Reviewed by</th><th>FLR Reviewed on</th><th>Extraction Status</th><th>Extracted By</th><th>Extracted On</th><th>File Name</th><th>File Size</th>
  </tr><tr className="documents-filter-row"><th colSpan="2" /><th><input value={filters.controlNumber} onChange={(event) => updateFilter('controlNumber', event.target.value)} placeholder="Filter" aria-label="Filter control number" /></th><th><FilterSelect value={filters.reportableData} onChange={(value) => updateFilter('reportableData', value)} options={filterOptions.reportableData} label="Filter reportable data" /></th><th><FilterSelect value={filters.flrReviewedBy} onChange={(value) => updateFilter('flrReviewedBy', value)} options={filterOptions.flrReviewedBy} label="Filter FLR reviewed by" /></th><th><input value={filters.flrReviewedOn} onChange={(event) => updateFilter('flrReviewedOn', event.target.value)} placeholder="Filter" aria-label="Filter FLR reviewed on" /></th><th><FilterSelect value={filters.extractionStatus} onChange={(value) => updateFilter('extractionStatus', value)} options={filterOptions.extractionStatus} label="Filter extraction status" /></th><th><input value={filters.extractedBy} onChange={(event) => updateFilter('extractedBy', event.target.value)} placeholder="Filter" aria-label="Filter extracted by" /></th><th><input value={filters.extractedOn} onChange={(event) => updateFilter('extractedOn', event.target.value)} placeholder="Filter" aria-label="Filter extracted on" /></th><th><input value={filters.fileName} onChange={(event) => updateFilter('fileName', event.target.value)} placeholder="Filter" aria-label="Filter file name" /></th><th><input value={filters.fileSize} onChange={(event) => updateFilter('fileSize', event.target.value)} placeholder="Filter" aria-label="Filter file size" /></th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className={selected.includes(row.id) ? 'is-selected' : ''}>
    <td className="document-select-column"><input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleRow(row.id)} aria-label={`Select ${row.controlNumber}`} /></td><td className="document-action-column"><button type="button" onClick={() => onOpen(row)} aria-label={`Open ${row.controlNumber}`}>[ ]</button></td><td><button className="document-open-link" type="button" onClick={() => onOpen(row)}>{row.controlNumber}</button></td><td>{row.reportableData}</td><td>{row.flrReviewedBy || 'Unassigned'}</td><td>{row.flrReviewedOn || '-'}</td><td>{row.extractionStatus}</td><td>{row.extractedBy || '-'}</td><td>{row.extractedOn || '-'}</td><td>{row.fileName}</td><td>{row.fileSize}</td>
  </tr>)}</tbody></table></div>
}
