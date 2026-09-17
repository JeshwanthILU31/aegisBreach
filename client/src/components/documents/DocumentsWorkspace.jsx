import { useMemo, useRef, useState } from 'react'

const documents = [
  { id: 'DOC-000184', name: 'Email_Production_001.pdf', custodian: 'A. Morrison', date: '03/18/2024', type: 'Email', status: 'Review' },
  { id: 'DOC-000185', name: 'Email_Production_002.pdf', custodian: 'A. Morrison', date: '03/18/2024', type: 'Email', status: 'Review' },
  { id: 'DOC-000186', name: 'Invoice_7741.xlsx', custodian: 'L. Chen', date: '03/19/2024', type: 'Spreadsheet', status: 'Pending' },
  { id: 'DOC-000187', name: 'Board_Meeting_Notes.docx', custodian: 'R. Patel', date: '03/20/2024', type: 'Word', status: 'Reviewed' },
  { id: 'DOC-000188', name: 'Project_Orion_Contract.pdf', custodian: 'J. Alvarez', date: '03/21/2024', type: 'Contract', status: 'Review' },
  { id: 'DOC-000189', name: 'Q1_Communications.zip', custodian: 'D. Wilson', date: '03/22/2024', type: 'Archive', status: 'Pending' },
]

function TinyButton({ children, className = '', ...props }) {
  return <button className={`legacy-button ${className}`} type="button" {...props}>{children}</button>
}

function TreeNode({ label, open = false, active = false, children }) {
  return (
    <div className="tree-node">
      <button className={`tree-row ${active ? 'is-active' : ''}`} type="button">
        <span className="tree-expander">{children ? (open ? '-' : '+') : ''}</span>
        <span className="tree-folder">{children ? (open ? 'v' : '>') : '*'}</span>
        <span>{label}</span>
      </button>
      {open && <div className="tree-children">{children}</div>}
    </div>
  )
}

function FolderTree() {
  return (
    <aside className="document-browser">
      <div className="browser-title">BROWSER</div>
      <div className="browser-toolbar"><TinyButton>+</TinyButton><TinyButton>-</TinyButton><TinyButton>Refresh</TinyButton></div>
      <div className="tree-scroll">
        <TreeNode label="AegisBreach - Project Orion" open>
          <TreeNode label="01 Case Materials" open active>
            <TreeNode label="Correspondence" />
            <TreeNode label="Financial Records" />
            <TreeNode label="Meeting Notes" />
          </TreeNode>
          <TreeNode label="02 Productions" />
          <TreeNode label="03 Privilege" />
          <TreeNode label="04 Work Product" />
        </TreeNode>
      </div>
      <div className="browser-footer"><span>Items: 4</span><span className="resize-grip">///</span></div>
    </aside>
  )
}

function SearchBuilder({ query, setQuery, autoRun, setAutoRun }) {
  return (
    <section className="search-panel">
      <div className="search-panel-heading"><strong>Search Conditions</strong><span className="panel-help">?</span></div>
      <div className="condition-row">
        <select aria-label="Search field" defaultValue="Document Name"><option>Document Name</option><option>Custodian</option><option>Document ID</option><option>Status</option></select>
        <select aria-label="Search operator" defaultValue="Contains"><option>Contains</option><option>Equals</option><option>Begins with</option></select>
        <input aria-label="Search value" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter value" />
        <TinyButton className="condition-remove">x</TinyButton>
      </div>
      <div className="search-actions"><button className="condition-link" type="button">+ Condition</button><TinyButton className="run-button">Run Search</TinyButton><label className="auto-run"><input type="checkbox" checked={autoRun} onChange={(event) => setAutoRun(event.target.checked)} /> Auto Run</label></div>
    </section>
  )
}

function DocumentTable({ rows, selected, setSelected, onOpen }) {
  const toggleAll = (event) => setSelected(event.target.checked ? rows.map((row) => row.id) : [])
  const toggleRow = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  return (
    <div className="document-table-frame">
      <table className="document-table">
        <thead><tr><th className="select-col"><input type="checkbox" checked={rows.length > 0 && selected.length === rows.length} onChange={toggleAll} /></th><th>Document ID</th><th>Document Name</th><th>Custodian</th><th>Date</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id} className={selected.includes(row.id) ? 'is-selected' : ''}>
          <td><input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleRow(row.id)} /></td>
          <td className="document-id">{row.id}</td><td><button className="document-link" type="button" onClick={() => onOpen(row)}>{row.name}</button></td><td>{row.custodian}</td><td>{row.date}</td><td>{row.type}</td><td><span className={`status-label status-${row.status.toLowerCase()}`}>{row.status}</span></td><td><button className="icon-action" type="button" aria-label={`Open ${row.name}`} onClick={() => onOpen(row)}>[ ]</button><button className="icon-action" type="button" aria-label={`More actions for ${row.name}`}>...</button></td>
        </tr>)}</tbody>
      </table>
    </div>
  )
}

function DocumentsList({ onOpen }) {
  const [query, setQuery] = useState('')
  const [autoRun, setAutoRun] = useState(false)
  const [selected, setSelected] = useState([])
  const filteredDocuments = useMemo(() => documents.filter((document) => Object.values(document).some((value) => value.toLowerCase().includes(query.toLowerCase()))), [query])
  return <div className="documents-page">
    <div className="legacy-heading"><div><div className="crumb-line">PROJECT ORION / CASE MATERIALS</div><h1>Documents</h1></div><div className="heading-actions"><TinyButton>Import</TinyButton><TinyButton>Export</TinyButton><TinyButton className="primary-legacy">New Folder</TinyButton></div></div>
    <div className="document-workspace">
      <FolderTree />
      <main className="document-results">
        <div className="results-toolbar"><span className="toolbar-label">DOCUMENTS</span><span className="record-count">{filteredDocuments.length} of 18,426 records</span><div className="toolbar-spacer" /><TinyButton>Columns</TinyButton><TinyButton>Views</TinyButton></div>
        <SearchBuilder query={query} setQuery={setQuery} autoRun={autoRun} setAutoRun={setAutoRun} />
        <div className="table-toolbar"><strong>Document Results</strong><span>{selected.length} selected</span><div className="toolbar-spacer" /><TinyButton disabled={!selected.length}>Assign</TinyButton><TinyButton disabled={!selected.length}>Mark Reviewed</TinyButton></div>
        <DocumentTable rows={filteredDocuments} selected={selected} setSelected={setSelected} onOpen={onOpen} />
        <div className="results-footer"><span>Showing 1 - {filteredDocuments.length} of 18,426</span><div className="pagination"><TinyButton>&lt;</TinyButton><button className="page-number is-current" type="button">1</button><button className="page-number" type="button">2</button><button className="page-number" type="button">3</button><TinyButton>&gt;</TinyButton><select aria-label="Records per page" defaultValue="25"><option>25 / page</option><option>50 / page</option><option>100 / page</option></select></div></div>
      </main>
    </div>
  </div>
}

function ViewerToolbar({ document, onExit }) {
  return <div className="viewer-toolbar"><TinyButton onClick={onExit}>Exit Viewer</TinyButton><span className="viewer-divider" /><strong>{document.id}</strong><TinyButton>Documents</TinyButton><TinyButton>Native</TinyButton><TinyButton>No Image</TinyButton><TinyButton>Extracted Text</TinyButton><TinyButton>No Production</TinyButton><span className="toolbar-spacer" /><TinyButton>-</TinyButton><span className="zoom-value">100%</span><TinyButton>+</TinyButton><TinyButton>Find</TinyButton></div>
}

function CodingSection({ title, children, open = true }) {
  return <section className="coding-section"><div className="coding-section-title"><span>{open ? '-' : '+'}</span><strong>{title}</strong></div>{open && <div className="coding-section-body">{children}</div>}</section>
}

function CodingLayout({ onNew }) {
  const [reviewStatus, setReviewStatus] = useState('Needs Review')
  const [notes, setNotes] = useState('')
  return <aside className="coding-layout"><div className="coding-header"><strong>Coding Layout</strong><div><TinyButton className="primary-legacy">Save &amp; Next</TinyButton><TinyButton>Save</TinyButton><TinyButton>Cancel</TinyButton></div></div>
    <div className="coding-scroll"><CodingSection title="Review Controls"><label className="field-label">Workflow</label><select defaultValue="Document Review"><option>Document Review</option><option>Privilege Review</option><option>QC Review</option></select><label className="field-label">Review Status</label><select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value)}><option>Needs Review</option><option>In Progress</option><option>Reviewed</option></select><div className="radio-line"><label><input type="radio" name="responsive" defaultChecked /> Responsive</label><label><input type="radio" name="responsive" /> Not Responsive</label></div><label className="check-line"><input type="checkbox" /> Privileged</label><label className="check-line"><input type="checkbox" /> Confidential</label></CodingSection>
      <CodingSection title="Reviewer Notes"><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Enter reviewer notes..." /></CodingSection>
      <CodingSection title="Person Tracker"><div className="section-actions"><TinyButton onClick={onNew}>New</TinyButton><TinyButton>Link</TinyButton><TinyButton>Unlink</TinyButton></div><table className="mini-table"><thead><tr><th>Person</th><th>Role</th><th>Link</th></tr></thead><tbody><tr><td colSpan="3" className="empty-mini">No linked persons</td></tr></tbody></table></CodingSection>
      <CodingSection title="Family Group"><label className="field-label">Family Group</label><select defaultValue="None"><option>None</option><option>Orion Correspondence</option><option>Orion Financials</option></select></CodingSection><CodingSection title="Production History"><div className="history-line"><span>Production Set</span><strong>None</strong></div><div className="history-line"><span>Last Modified</span><strong>03/22/2024</strong></div></CodingSection></div>
  </aside>
}

function PersonTracker({ onClose }) {
  const [position, setPosition] = useState({ x: 250, y: 96 })
  const drag = useRef(null)
  const [form, setForm] = useState({})
  const fields = [
    'Item Number', 'PersonDocLink', 'FIRST NAME *', 'MIDDLE NAME', 'LAST NAME *', 'SUFFIX',
    'ADDRESS', 'CITY', 'STATE', 'ZIP', 'INTERNATIONAL ADDRESS', 'COUNTRY', 'TIN',
    'Financial Account Number', 'Financial Routing Number - Internal', 'Payment Card Number',
    'Passport Number', 'Military ID Number', "Driver's License Number", 'Other Government Issued ID Number',
    'Other Government Issued Type', 'Alien Registration Number', 'Tribal Identification Number',
    'Patient Account Number', 'Medicaid / Medicare Number', 'Date of Death',
    'DOB', 'SSN', 'Financial Institution Name', 'Login Platform', 'Payment Card Expiration Date',
    'Passport Issuing Country', 'Passport Expiration Date', 'DL State', 'Other Government Issued ID Country',
    'Student ID Number', 'State Identification Card Number', 'Medical Record Number',
    'Health Insurance Policy Number', 'Data Owner *'
  ]
  const updatePosition = (event) => { if (!drag.current) return; setPosition({ x: Math.max(12, event.clientX - drag.current.offsetX), y: Math.max(12, event.clientY - drag.current.offsetY) }) }
  const stopDrag = () => { drag.current = null; window.removeEventListener('mousemove', updatePosition); window.removeEventListener('mouseup', stopDrag) }
  const startDrag = (event) => { drag.current = { offsetX: event.clientX - position.x, offsetY: event.clientY - position.y }; window.addEventListener('mousemove', updatePosition); window.addEventListener('mouseup', stopDrag) }
  return <div className="tracker-window" style={{ left: position.x, top: position.y }}><div className="tracker-titlebar" onMouseDown={startDrag}><strong>Person Tracker</strong><button type="button" onClick={onClose} aria-label="Close Person Tracker">x</button></div><div className="tracker-body"><div className="tracker-form-grid">{fields.map((field) => <label key={field}>{field}<input value={form[field] || ''} onChange={(event) => setForm({ ...form, [field]: event.target.value })} /></label>)}</div></div><div className="tracker-footer"><TinyButton className="primary-legacy" onClick={onClose}>Save</TinyButton><TinyButton onClick={onClose}>Cancel</TinyButton></div></div>
}

function DocumentViewer({ document, onExit }) {
  const [showTracker, setShowTracker] = useState(false)
  return <div className="viewer-page"><ViewerToolbar document={document} onExit={onExit} /><div className="viewer-body"><main className="document-canvas"><div className="canvas-ruler">Page 1 of 1 <span>Document View</span></div><article className="document-paper"><div className="paper-meta">{document.name}<span>{document.id}</span></div><h2>PROJECT ORION</h2><h3>CONFIDENTIAL BUSINESS RECORD</h3><p>Document review workspace preview</p><div className="redaction-line" /><p>This document is displayed in the native review area. Use the coding panel to classify, tag, and track related people.</p><p>Custodian: {document.custodian}</p><p>Date: {document.date}</p><div className="paper-block" /><div className="paper-block short" /></article></main><CodingLayout onNew={() => setShowTracker(true)} /></div>{showTracker && <PersonTracker onClose={() => setShowTracker(false)} />}</div>
}

export default function DocumentsWorkspace() {
  const [openedDocument, setOpenedDocument] = useState(null)
  return openedDocument ? <DocumentViewer document={openedDocument} onExit={() => setOpenedDocument(null)} /> : <DocumentsList onOpen={setOpenedDocument} />
}