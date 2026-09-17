import { useState } from 'react'

const batches = [
  ['Monday Batch1', 'Monday\nBatch1_00012', 'In Progress', 'Alternate Workflow\n6+ Entries', 'Kumar, Kashishka', '32', '50'],
  ['Monday Batch1', 'Monday\nBatch1_00014', 'In Progress', 'Alternate Workflow\n6+ Entries', 'Aziz, Abdullah', '8', '50'],
  ['Monday Batch1', 'Monday\nBatch1_00015', 'In Progress', 'Alternate Workflow\n6+ Entries', 'Sundar, Madha', '9', '50'],
  ['Monday Batch1', 'Monday\nBatch1_00016', 'In Progress', 'Alternate Workflow\n6+ Entries', 'Ali, Rayyan', '18', '50'],
  ['Monday Batch1', 'Monday\nBatch1_00017', 'In Progress', 'Alternate Workflow\n6+ Entries', 'Kant, Anuj', '27', '50'],
  ['Monday Batch1', 'Monday\nBatch1_00018', 'In Progress', 'Alternate Workflow\n6+ Entries', 'Palsa, Jagesh', '7', '50'],
  ['Monday Batch1', 'Monday\nBatch1_00019', 'In Progress', 'Alternate Workflow\n6+ Entries', 'Mandal, Prathiba', '15', '50'],
  ['Monday Batch1', 'Monday\nBatch1_00020', 'In Progress', 'Alternate Workflow\n6+ Entries', 'Parmar, Kajal', '16', '50'],
  ['Monday Batch1', 'Monday\nBatch1_00021', 'In Progress', 'Alternate Workflow\n6+ Entries', 'Auri, Monu', '12', '50'],
  ['Monday Batch1', 'Monday\nBatch1_00022', 'In Progress', 'Alternate Workflow\n6+ Entries', 'Srivall, Nchelalkala', '8', '50'],
  ['Monday Batch1', 'Monday\nBatch1_00024', 'In Progress', 'Alternate Workflow\n6+ Entries', 'Sharma, Tanvi', '13', '50'],
  ['Monday Batch1', 'Monday\nBatch1_00025', 'In Progress', 'Alternate Workflow\n6+ Entries', 'Indirloa, Keerthi', '11', '50'],
]

function FilterInput({ label }) {
  return <input className="review-filter" aria-label={`Filter ${label}`} placeholder="Filter" />
}

export default function ReviewBatches() {
  const [selected, setSelected] = useState([])
  const [batchSet, setBatchSet] = useState('All Batches')
  const toggleAll = (event) => setSelected(event.target.checked ? batches.map((_, index) => index) : [])
  const toggleRow = (index) => setSelected((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])

  return <main className="review-batches-page">
    <div className="review-tabs"><button className="review-tab is-active" type="button">Review Queues</button><button className="review-tab" type="button">Question</button></div>
    <div className="review-toolbar"><button className="review-icon-button" type="button">&gt;</button><button className="review-icon-button" type="button">q</button><select value={batchSet} onChange={(event) => setBatchSet(event.target.value)}><option>All Batches</option><option>Monday Batch1</option><option>Completed Batches</option></select></div>
    <div className="review-grid-toolbar"><span className="review-filter-icon">v</span><span className="grid-nav">|&lt; &lt; <strong>1</strong> &gt; &gt;|</span><span>1-25 of 2,789</span><select defaultValue="25"><option>25</option><option>50</option><option>100</option></select><span>per page</span></div>
    <div className="review-table-wrap"><table className="review-table"><thead><tr><th className="review-row-number">#</th><th className="review-check"><input type="checkbox" checked={selected.length === batches.length} onChange={toggleAll} aria-label="Select all batches" /></th><th>Batch Set</th><th>Batch</th><th>Batch Status</th><th>Batch Unit</th><th>Assigned To</th><th>Reviewed</th><th>Batch Size</th></tr><tr className="review-filter-row"><th colSpan="2" /><th><select defaultValue="All"><option>All</option></select></th><th><FilterInput label="Batch" /></th><th><select defaultValue="All"><option>All</option></select></th><th><select defaultValue="All"><option>All</option></select></th><th><select defaultValue="All"><option>All</option></select></th><th><select defaultValue="All"><option>All</option></select></th><th><FilterInput label="Batch Size" /></th></tr></thead><tbody>{batches.map((batch, index) => <tr key={batch[1]}><td className="review-row-number">{index + 13}</td><td className="review-check"><input type="checkbox" checked={selected.includes(index)} onChange={() => toggleRow(index)} aria-label={`Select ${batch[1]}`} /></td><td>{batch[0]}</td><td className="batch-name"><button type="button">{batch[1].split('\n').map((line) => <span key={line}>{line}<br /></span>)}</button></td><td>{batch[2]}</td><td className="batch-unit">{batch[3].split('\n').map((line) => <span key={line}>{line}<br /></span>)}</td><td>{batch[4]}</td><td>{batch[5]}</td><td>{batch[6]}</td></tr>)}</tbody></table></div>
    <div className="review-footer"><select defaultValue="25"><option>25</option><option>50</option></select><button type="button">Export to File</button><button className="footer-more" type="button">^</button><span>Total: 2,789</span></div>
  </main>
}