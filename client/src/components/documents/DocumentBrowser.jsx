import { useState } from 'react'

const folders = [
  { label: 'Project Orchid (6-7)', children: ['Set 6', 'Set 7', 'New Folder'] },
  { label: 'Project Orchid - Special Analysis', children: ['Working Set', 'Productions'] },
]

function FolderBranch({ label, children, selectedFolder, onSelect }) {
  const [expanded, setExpanded] = useState(true)
  return (
    <div className="documents-tree-branch">
      <button className={`documents-tree-row ${selectedFolder === label ? 'is-selected' : ''}`} type="button" onClick={() => onSelect(label)}>
        <span className="tree-expander" onClick={(event) => { event.stopPropagation(); setExpanded((value) => !value) }}>{expanded ? '-' : '+'}</span>
        <span className="tree-folder">{expanded ? 'v' : '>'}</span>
        <span>{label}</span>
      </button>
      {expanded && <div className="documents-tree-children">{children.map((child) => <button className={`documents-tree-row ${selectedFolder === child ? 'is-selected' : ''}`} key={child} type="button" onClick={() => onSelect(child)}><span className="tree-expander" /><span className="tree-folder">*</span><span>{child}</span></button>)}</div>}
    </div>
  )
}

export default function DocumentBrowser({ selectedFolder, onSelectFolder }) {
  const [browserSearch, setBrowserSearch] = useState('')
  const visibleFolders = folders.filter((folder) => `${folder.label} ${folder.children.join(' ')}`.toLowerCase().includes(browserSearch.toLowerCase()))
  return <aside className="documents-browser-panel">
    <div className="documents-panel-title">Browsers</div>
    <div className="documents-browser-search"><input value={browserSearch} onChange={(event) => setBrowserSearch(event.target.value)} placeholder="Search browsers" aria-label="Search browsers" /><button type="button" aria-label="Clear browser search" onClick={() => setBrowserSearch('')}>x</button></div>
    <div className="documents-tree-scroll">{visibleFolders.map((folder) => <FolderBranch key={folder.label} {...folder} selectedFolder={selectedFolder} onSelect={onSelectFolder} />)}</div>
    <div className="documents-browser-status">Selected: {selectedFolder}</div>
  </aside>
}
