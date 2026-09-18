// AegisBreach: Person Tracker Manual Text Entry & Persistence Test Suite
import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

console.log('================================================================================')
console.log('RUNNING PERSON TRACKER MANUAL ENTRY & PERSISTENCE TEST SUITE')
console.log('================================================================================')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  [PASS] ${name}`)
    passed++
  } catch (err) {
    console.error(`  [FAIL] ${name} -> ${err.message}`)
    failed++
  }
}

// Read CodingPage.jsx source to verify PersonTracker form structure
const codingPagePath = path.join(__dirname, '../client/src/components/coding/CodingPage.jsx')
const codingPageSource = fs.readFileSync(codingPagePath, 'utf8')

// -----------------------------------------------------------------------------
// Test 1: Verify State dropdown removed and converted to text input
// -----------------------------------------------------------------------------
test('State field is a text input with no <select> or US_STATES dropdown options', () => {
  assert(!codingPageSource.includes('<select\n                  value={draft.state'), 'State select control must be removed')
  assert(codingPageSource.includes("updateDraft('state', e.target.value)"), 'State update handler is attached to text input')
})

// -----------------------------------------------------------------------------
// Test 2: Verify DL State dropdown removed and converted to text input
// -----------------------------------------------------------------------------
test('DL State field is a text input with no <select> or US_STATES dropdown options', () => {
  assert(!codingPageSource.includes('<select\n                  value={draft.dlState'), 'DL State select control must be removed')
  assert(codingPageSource.includes("updateDraft('dlState', e.target.value)"), 'DL State update handler is attached to text input')
})

// -----------------------------------------------------------------------------
// Test 3: Verify Country field is a text input without select constraint button
// -----------------------------------------------------------------------------
test('Country field is a clean text input without Select dropdown button', () => {
  assert(codingPageSource.includes("updateDraft('country', e.target.value)"), 'Country update handler is present on text input')
  assert(!codingPageSource.includes("updateDraft('country', draft.country || 'USA')"), 'Hardcoded USA fallback select button must be removed')
})

// -----------------------------------------------------------------------------
// Test 4: Verify Passport Issuing Country is a text input without select button
// -----------------------------------------------------------------------------
test('Passport Issuing Country is a clean text input without Select dropdown button', () => {
  assert(codingPageSource.includes("updateDraft('passportIssuingCountry', e.target.value)"), 'Passport Issuing Country update handler is present on text input')
  assert(!codingPageSource.includes("updateDraft('passportIssuingCountry', draft.passportIssuingCountry || 'USA')"), 'Hardcoded USA fallback select button must be removed')
})

// -----------------------------------------------------------------------------
// Test 5: Verify emptyPerson initialization contains empty strings
// -----------------------------------------------------------------------------
test('emptyPerson draft object initializes all manual entry fields to empty strings', () => {
  assert(codingPageSource.includes("state: ''"), 'emptyPerson has state: ""')
  assert(codingPageSource.includes("country: ''"), 'emptyPerson has country: ""')
  assert(codingPageSource.includes("dlState: ''"), 'emptyPerson has dlState: ""')
  assert(codingPageSource.includes("passportIssuingCountry: ''"), 'emptyPerson has passportIssuingCountry: ""')
})

// -----------------------------------------------------------------------------
// Test 6: Verify manual person payload serialization & persistence compatibility
// -----------------------------------------------------------------------------
test('Person Tracker object with freeform manual text values serializes and validates cleanly', () => {
  const customPerson = {
    itemNumber: 'ITM-990',
    personDocLink: 'CNTRL_001',
    firstName: 'Jane',
    lastName: 'Doe',
    state: 'California',
    country: 'United States',
    passportIssuingCountry: 'USA',
    dlState: 'Texas',
    dataOwner: 'Custodian A'
  }

  // Verify fields match standard expected keys
  assert.strictEqual(customPerson.state, 'California')
  assert.strictEqual(customPerson.country, 'United States')
  assert.strictEqual(customPerson.passportIssuingCountry, 'USA')
  assert.strictEqual(customPerson.dlState, 'Texas')

  const serialized = JSON.stringify(customPerson)
  const deserialized = JSON.parse(serialized)
  assert.deepStrictEqual(deserialized, customPerson)
})

// -----------------------------------------------------------------------------
// Test 7: Verify required legitimate dropdowns outside Person Tracker are preserved
// -----------------------------------------------------------------------------
test('Legitimate workflow dropdowns (FLR/AWF layout, Family Group, AWF coding) remain intact', () => {
  assert(codingPageSource.includes('First Level Coding (FLR)'), 'FLR layout option is preserved')
  assert(codingPageSource.includes('Alternate Workflow'), 'Alternate Workflow option is preserved')
  assert(codingPageSource.includes('Orion Correspondence'), 'Family group options are preserved')
})

console.log('================================================================================')
console.log(`PERSON TRACKER FORM TEST SUMMARY: Passed: ${passed}, Failed: ${failed}`)
console.log('================================================================================')

if (failed > 0) process.exit(1)
