const fields = ['Reportable Data', 'Control Number', 'FLR Reviewed by', 'Extraction Status', 'File Name', 'File Size']

export default function SearchConditions({ conditions, setConditions, onConditionsChange, autoRun, setAutoRun, onRunSearch }) {
  const changeConditions = (nextConditions) => { setConditions(nextConditions); onConditionsChange(nextConditions) }
  const updateCondition = (id, key, value) => changeConditions(conditions.map((condition) => condition.id === id ? { ...condition, [key]: value } : condition))
  const addCondition = () => changeConditions([...conditions, { id: Date.now(), field: 'Reportable Data', operator: 'is', value: '' }])
  const removeCondition = (id) => changeConditions(conditions.filter((condition) => condition.id !== id))
  return <section className="documents-search-conditions">
    <div className="documents-section-heading"><strong>Search Conditions</strong><span className="panel-help">?</span></div>
    <div className="documents-condition-list">{conditions.map((condition) => <div className="documents-condition-row" key={condition.id}>
      <select value={condition.field} onChange={(event) => updateCondition(condition.id, 'field', event.target.value)} aria-label="Condition field">{fields.map((field) => <option key={field}>{field}</option>)}</select>
      <select value={condition.operator} onChange={(event) => updateCondition(condition.id, 'operator', event.target.value)} aria-label="Condition operator"><option>is</option><option>contains</option><option>is not</option></select>
      <input value={condition.value} onChange={(event) => updateCondition(condition.id, 'value', event.target.value)} placeholder="Value" aria-label="Condition value" />
      <button className="condition-delete" type="button" onClick={() => removeCondition(condition.id)} aria-label="Remove condition">x</button>
    </div>)}</div>
    <div className="documents-search-actions"><button className="documents-link-button" type="button" onClick={addCondition}>+ Condition</button><button className="legacy-button primary-legacy" type="button" onClick={onRunSearch}>Run Search</button><label><input type="checkbox" checked={autoRun} onChange={(event) => setAutoRun(event.target.checked)} /> Auto Run</label></div>
  </section>
}
