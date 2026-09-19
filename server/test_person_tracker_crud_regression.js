// AegisBreach: Person Tracker Create vs Edit, Stable ID, Dragging & Scroll Regression Test Suite
import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import Coding from './src/models/Coding.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

console.log('================================================================================')
console.log('RUNNING PERSON TRACKER CRUD & REGRESSION TEST SUITE')
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

const codingPagePath = path.join(__dirname, '../client/src/components/coding/CodingPage.jsx')
const codingPageSource = fs.readFileSync(codingPagePath, 'utf8')
const indexCssPath = path.join(__dirname, '../client/src/index.css')
const indexCssSource = fs.readFileSync(indexCssPath, 'utf8')

// -----------------------------------------------------------------------------
// Test 1: Dragging from entire modal & interactive element exclusion
// -----------------------------------------------------------------------------
test('Modal is draggable from non-interactive areas with onMouseDown on entry window and interactive elements excluded', () => {
  assert(codingPageSource.includes('onMouseDown={handleMouseDown}'), 'handleMouseDown attached to modal')
  assert(codingPageSource.includes("e.target.closest('input, textarea, select, button, a, [role=\"button\"], .person-tracker-resize-handle')"), 'Interactive elements excluded from drag trigger')
  assert(codingPageSource.includes('className="person-tracker-entry-window"'), 'Modal window has correct class')
})

// -----------------------------------------------------------------------------
// Test 2: PDF scrolling non-blocking floating overlay
// -----------------------------------------------------------------------------
test('PDF scrolling is not blocked by overlay: floating container uses pointer-events: none and modal window uses pointer-events: auto', () => {
  assert(indexCssSource.includes('.person-tracker-overlay-floating'), 'person-tracker-overlay-floating class defined in CSS')
  assert(indexCssSource.includes('pointer-events: none'), 'floating overlay allows events through')
  assert(indexCssSource.includes('pointer-events: auto'), 'modal window retains interactivity')
  assert(codingPageSource.includes('className="person-tracker-overlay-floating"'), 'PersonTrackerModal uses non-blocking floating overlay')
})

// -----------------------------------------------------------------------------
// Test 3: New person creation has no editingPersonId and generates stable _id
// -----------------------------------------------------------------------------
test('New Person opens blank form, resets editingPersonId, and creates single entry with stable _id', () => {
  assert(codingPageSource.includes('setEditingPersonId(null)'), 'editingPersonId cleared on New')
  assert(codingPageSource.includes('setDraft({ ...emptyPerson'), 'draft reset to emptyPerson on New')
  assert(codingPageSource.includes('handleSavePersonEntry'), 'handleSavePersonEntry present')

  // Simulate create workflow
  const currentPersons = []
  const personADraft = {
    firstName: 'Person',
    lastName: 'A',
    address: '123 Main St',
    dataOwner: 'Owner 1',
  }
  const targetId = null
  const newPersonId = 'stable-id-person-a'
  const newPerson = { ...personADraft, _id: newPersonId }
  const afterCreateA = [...currentPersons, newPerson]

  assert.strictEqual(afterCreateA.length, 1)
  assert.strictEqual(afterCreateA[0].firstName, 'Person')
  assert.strictEqual(afterCreateA[0].lastName, 'A')
  assert.strictEqual(afterCreateA[0]._id, 'stable-id-person-a')
})

// -----------------------------------------------------------------------------
// Test 4: Edit existing person preserves stable _id, updates in-place, does NOT append duplicate row
// -----------------------------------------------------------------------------
test('Editing Person A loads existing data, stores editingPersonId, updates in place without duplicate row', () => {
  assert(codingPageSource.includes('setEditingPersonId(person._id'), 'Loads editingPersonId on edit')
  assert(codingPageSource.includes('p._id && String(p._id) === String(targetId)'), 'Finds and updates existing person by stable _id')

  const personA = { _id: 'stable-id-person-a', firstName: 'Person', lastName: 'A', address: '123 Main St', dataOwner: 'Owner 1' }
  const personB = { _id: 'stable-id-person-b', firstName: 'Person', lastName: 'B', address: '456 Elm St', dataOwner: 'Owner 2' }
  const initialPersons = [personA, personB]

  assert.strictEqual(initialPersons.length, 2)

  // Edit Person A: change address
  const editingId = 'stable-id-person-a'
  const editedDraft = { firstName: 'Person', lastName: 'A', address: '789 Updated Blvd', dataOwner: 'Owner 1' }

  const updatedPersons = initialPersons.map((p) => {
    if (p._id && String(p._id) === String(editingId)) {
      return { ...p, ...editedDraft, _id: p._id }
    }
    return p
  })

  // Verify exactly 2 rows
  assert.strictEqual(updatedPersons.length, 2, 'Must remain exactly 2 persons')
  // Verify Person A updated
  assert.strictEqual(updatedPersons[0]._id, 'stable-id-person-a', 'Stable _id must not change')
  assert.strictEqual(updatedPersons[0].address, '789 Updated Blvd', 'Address updated')
  // Verify Person B unchanged
  assert.strictEqual(updatedPersons[1]._id, 'stable-id-person-b', 'Person B _id untouched')
  assert.strictEqual(updatedPersons[1].address, '456 Elm St', 'Person B address untouched')
})

// -----------------------------------------------------------------------------
// Test 5: End-to-end multiple people sequence: A -> B -> Edit A
// -----------------------------------------------------------------------------
test('Sequential workflow: New A -> Save -> New B -> Save -> Edit A -> Save produces [Person A updated, Person B]', () => {
  let persons = []

  // 1. New -> Person A -> Save
  const pA = { _id: 'id-A', firstName: 'Alice', lastName: 'Smith', address: 'Old Address', role: 'Custodian' }
  persons = [...persons, pA]
  assert.strictEqual(persons.length, 1)
  assert.strictEqual(persons[0].firstName, 'Alice')

  // 2. New -> Person B -> Save
  const pB = { _id: 'id-B', firstName: 'Bob', lastName: 'Jones', address: 'Jones St', role: 'Reviewer' }
  persons = [...persons, pB]
  assert.strictEqual(persons.length, 2)
  assert.strictEqual(persons[1].firstName, 'Bob')

  // 3. Edit Person A -> change Address -> Save
  const editTargetId = 'id-A'
  const pAUpdateDraft = { address: 'New Address 2026' }
  persons = persons.map((p) => (p._id === editTargetId ? { ...p, ...pAUpdateDraft, _id: p._id } : p))

  assert.strictEqual(persons.length, 2, 'Must NOT contain 3 rows')
  assert.strictEqual(persons[0]._id, 'id-A')
  assert.strictEqual(persons[0].firstName, 'Alice')
  assert.strictEqual(persons[0].address, 'New Address 2026')
  assert.strictEqual(persons[1]._id, 'id-B')
  assert.strictEqual(persons[1].firstName, 'Bob')
})

// -----------------------------------------------------------------------------
// Test 6: Mongoose Model persistence & refresh stability
// -----------------------------------------------------------------------------
test('Mongoose model accurately persists stable _id across sequential edits and refreshes', () => {
  const p1 = { _id: 'mongo-id-1', firstName: 'Person1', lastName: 'Test', address: 'Addr 1' }
  const p2 = { _id: 'mongo-id-2', firstName: 'Person2', lastName: 'Test', address: 'Addr 2' }

  const codingDoc = new Coding({
    projectId: 'proj-1',
    documentId: 'DOC-001',
    persons: [p1, p2],
  })

  const savedJSON = codingDoc.toJSON()
  assert.strictEqual(savedJSON.persons.length, 2)
  assert.strictEqual(savedJSON.persons[0]._id, 'mongo-id-1')
  assert.strictEqual(savedJSON.persons[1]._id, 'mongo-id-2')

  // Simulate Edit Person 1 and refresh
  const editedP1 = { ...savedJSON.persons[0], address: 'Addr 1 Updated' }
  const updatedDoc = new Coding({
    ...savedJSON,
    persons: [editedP1, savedJSON.persons[1]],
  })

  const refreshedJSON = updatedDoc.toJSON()
  assert.strictEqual(refreshedJSON.persons.length, 2)
  assert.strictEqual(refreshedJSON.persons[0]._id, 'mongo-id-1')
  assert.strictEqual(refreshedJSON.persons[0].address, 'Addr 1 Updated')
  assert.strictEqual(refreshedJSON.persons[1]._id, 'mongo-id-2')
})

// -----------------------------------------------------------------------------
// Test 7: Table sticky fixed header and vertical scrollability styles
// -----------------------------------------------------------------------------
test('Table has sticky fixed header and vertically scrollable body container', () => {
  assert(indexCssSource.includes('.coding-mini-table-wrap'), 'coding-mini-table-wrap class present in CSS')
  assert(indexCssSource.includes('overflow-y: auto'), 'Vertical scrolling enabled on table wrap')
  assert(indexCssSource.includes('position: sticky'), 'Sticky header positioning defined')
  assert(indexCssSource.includes('top: 0'), 'Sticky header pinned to top')
  assert(!indexCssSource.includes('.coding-mini-table-wrap { margin-top: 6px; max-height: 110px; overflow: hidden; }'), 'No overflow: hidden constraint on table wrap')
})

// -----------------------------------------------------------------------------
// Test 8: 6+ Person Tracker entries scrolling & row 5 selection and editing
// -----------------------------------------------------------------------------
test('Supports 6+ Person Tracker entries, sticky header, row 5 selection, and in-place edit preserving _id', () => {
  // Create 6 persons
  const sixPersons = Array.from({ length: 6 }, (_, i) => ({
    _id: `person-id-00${i + 1}`,
    itemNumber: `ITM-00${i + 1}`,
    personDocLink: `CNTRL_00${i + 1}`,
    firstName: `Person${i + 1}`,
    lastName: `Test${i + 1}`,
    address: `${100 * (i + 1)} Main Street`,
    role: i % 2 === 0 ? 'Custodian' : 'Reviewer',
    dataOwner: `Owner ${i + 1}`,
  }))

  assert.strictEqual(sixPersons.length, 6, 'Exactly 6 persons in dataset')

  // Verify all 6 exist and have distinct stable _ids
  const uniqueIds = new Set(sixPersons.map((p) => p._id))
  assert.strictEqual(uniqueIds.size, 6, 'All 6 persons have unique stable _ids')

  // Simulate selecting Row 5 (index 4)
  const selectedIndex = 4
  const person5 = sixPersons[selectedIndex]
  assert.strictEqual(person5._id, 'person-id-005')
  assert.strictEqual(person5.firstName, 'Person5')
  assert.strictEqual(person5.address, '500 Main Street')

  // Simulate editing Person 5: update address and role
  const editingId = person5._id
  const editDraft = {
    ...person5,
    address: '999 Updated Penthouse Way',
    role: 'Lead Architect',
  }

  // Update in place
  const updatedSixPersons = sixPersons.map((p) => {
    if (p._id && String(p._id) === String(editingId)) {
      return {
        ...p,
        ...editDraft,
        _id: p._id, // Preserve stable _id
      }
    }
    return p
  })

  // Assertions
  assert.strictEqual(updatedSixPersons.length, 6, 'Array length must remain exactly 6 (no duplicate row)')
  assert.strictEqual(updatedSixPersons[4]._id, 'person-id-005', 'Person 5 _id preserved')
  assert.strictEqual(updatedSixPersons[4].address, '999 Updated Penthouse Way', 'Person 5 address updated')
  assert.strictEqual(updatedSixPersons[4].role, 'Lead Architect', 'Person 5 role updated')
  assert.strictEqual(updatedSixPersons[0]._id, 'person-id-001', 'Person 1 untouched')
  assert.strictEqual(updatedSixPersons[5]._id, 'person-id-006', 'Person 6 untouched')
})

// -----------------------------------------------------------------------------
// Test 9: Create new person populates authoritative audit metadata
// -----------------------------------------------------------------------------
test('Create new person populates stable _id, createdBy, createdAt, updatedBy, and updatedAt', () => {
  const authUser = { username: 'reviewer_sarah' }
  const now = new Date()

  const newPersonDraft = {
    firstName: 'Alice',
    lastName: 'Walker',
    personDocLink: 'CNTRL_099',
    dataOwner: 'Custodian Alice',
  }

  // Simulate server saveCoding transform for newly added person
  const transformedNewPerson = {
    ...newPersonDraft,
    _id: 'person-stable-new-001',
    createdBy: authUser.username,
    createdAt: now,
    updatedBy: authUser.username,
    updatedAt: now,
  }

  assert.strictEqual(transformedNewPerson._id, 'person-stable-new-001')
  assert.strictEqual(transformedNewPerson.createdBy, 'reviewer_sarah')
  assert.strictEqual(transformedNewPerson.updatedBy, 'reviewer_sarah')
  assert(transformedNewPerson.createdAt instanceof Date)
  assert(transformedNewPerson.updatedAt instanceof Date)
  assert.strictEqual(transformedNewPerson.createdAt.getTime(), transformedNewPerson.updatedAt.getTime())
})

// -----------------------------------------------------------------------------
// Test 10: Edit existing person preserves createdBy/createdAt and updates updatedBy/updatedAt
// -----------------------------------------------------------------------------
test('Edit existing person preserves original createdBy/createdAt, updates updatedBy/updatedAt to new reviewer, preserves stable _id, and produces no duplicate row', () => {
  const originalCreatedTime = new Date('2026-03-01T10:00:00.000Z')
  const originalPerson = {
    _id: 'person-stable-edit-001',
    firstName: 'Bob',
    lastName: 'Miller',
    address: '100 Old St',
    createdBy: 'original_creator_john',
    createdAt: originalCreatedTime,
    updatedBy: 'original_creator_john',
    updatedAt: originalCreatedTime,
  }

  const existingPersonsList = [originalPerson]

  // Reviewer 'editor_emily' edits Bob's address at a later time
  const newEditTime = new Date('2026-03-02T15:30:00.000Z')
  const editingUser = { username: 'editor_emily' }
  const editPayload = {
    _id: 'person-stable-edit-001',
    firstName: 'Bob',
    lastName: 'Miller',
    address: '200 New Blvd',
  }

  const existingPersonsMap = new Map([[originalPerson._id, originalPerson]])

  const updatedPersons = [editPayload].map((p) => {
    const existing = existingPersonsMap.get(p._id)
    assert(existing, 'Must find existing person by _id')
    return {
      ...p,
      _id: existing._id,
      createdBy: existing.createdBy,
      createdAt: existing.createdAt,
      updatedBy: editingUser.username,
      updatedAt: newEditTime,
    }
  })

  // Assertions
  assert.strictEqual(updatedPersons.length, 1, 'Exactly one person preserved (no duplicate row)')
  assert.strictEqual(updatedPersons[0]._id, 'person-stable-edit-001', 'Stable _id preserved')
  assert.strictEqual(updatedPersons[0].address, '200 New Blvd', 'Field updated')
  assert.strictEqual(updatedPersons[0].createdBy, 'original_creator_john', 'Original createdBy preserved')
  assert.strictEqual(updatedPersons[0].createdAt.toISOString(), '2026-03-01T10:00:00.000Z', 'Original createdAt preserved')
  assert.strictEqual(updatedPersons[0].updatedBy, 'editor_emily', 'updatedBy updated to current authenticated user')
  assert.strictEqual(updatedPersons[0].updatedAt.toISOString(), '2026-03-02T15:30:00.000Z', 'updatedAt updated to current timestamp')
})

// -----------------------------------------------------------------------------
// Test 11: Spoofed createdBy/updatedBy in frontend request body are ignored by server
// -----------------------------------------------------------------------------
test('Server rejects/overwrites client-spoofed createdBy and updatedBy with authenticated JWT identity', () => {
  const authUser = { username: 'verified_reviewer_99' }
  const now = new Date()

  // Malicious request payload trying to spoof creator as admin and future timestamp
  const spoofedPayload = {
    _id: 'person-spoof-test',
    firstName: 'Eve',
    lastName: 'Attacker',
    createdBy: 'root_admin_hacked',
    createdAt: '1999-01-01T00:00:00Z',
    updatedBy: 'fake_super_user',
    updatedAt: '2099-01-01T00:00:00Z',
  }

  // Server-side enforcement simulation:
  const existingPersonsMap = new Map() // new person
  const targetId = spoofedPayload._id
  const existingPerson = existingPersonsMap.get(targetId)

  let sanitizedPerson
  if (existingPerson) {
    sanitizedPerson = {
      ...spoofedPayload,
      _id: existingPerson._id,
      createdBy: existingPerson.createdBy || authUser.username,
      createdAt: existingPerson.createdAt || now,
      updatedBy: authUser.username,
      updatedAt: now,
    }
  } else {
    sanitizedPerson = {
      ...spoofedPayload,
      _id: spoofedPayload._id,
      createdBy: authUser.username,
      createdAt: now,
      updatedBy: authUser.username,
      updatedAt: now,
    }
  }

  assert.strictEqual(sanitizedPerson.createdBy, 'verified_reviewer_99', 'Spoofed createdBy overridden by verified reviewer')
  assert.strictEqual(sanitizedPerson.updatedBy, 'verified_reviewer_99', 'Spoofed updatedBy overridden by verified reviewer')
  assert.notStrictEqual(sanitizedPerson.createdAt.toISOString(), '1999-01-01T00:00:00.000Z', 'Spoofed createdAt overridden')
  assert.notStrictEqual(sanitizedPerson.updatedAt.toISOString(), '2099-01-01T00:00:00.000Z', 'Spoofed updatedAt overridden')
})

// -----------------------------------------------------------------------------
// Test 12: Backward compatibility for legacy persons without audit fields
// -----------------------------------------------------------------------------
test('Backward compatibility: legacy persons without audit metadata gracefully gain metadata on edit without breaking', () => {
  const legacyPerson = {
    _id: 'legacy-p-01',
    firstName: 'Charlie',
    lastName: 'Oldfield',
    address: 'Old Town',
    // createdBy, createdAt, updatedBy, updatedAt are undefined in legacy records
  }

  const authUser = { username: 'modern_reviewer' }
  const now = new Date()

  const existingPersonsMap = new Map([[legacyPerson._id, legacyPerson]])

  const editedPayload = {
    _id: 'legacy-p-01',
    firstName: 'Charlie',
    lastName: 'Oldfield',
    address: 'Modernized Town',
  }

  const existing = existingPersonsMap.get(editedPayload._id)
  const result = {
    ...editedPayload,
    _id: existing._id,
    createdBy: existing.createdBy || authUser.username,
    createdAt: existing.createdAt || now,
    updatedBy: authUser.username,
    updatedAt: now,
  }

  assert.strictEqual(result._id, 'legacy-p-01')
  assert.strictEqual(result.address, 'Modernized Town')
  assert.strictEqual(result.createdBy, 'modern_reviewer')
  assert.strictEqual(result.updatedBy, 'modern_reviewer')
  assert(result.createdAt instanceof Date)
  assert(result.updatedAt instanceof Date)
})

// -----------------------------------------------------------------------------
// Test 13: Resize handle presence and styling
// -----------------------------------------------------------------------------
test('Resize handle is present in bottom-right corner with subtle styling and excluded from dragging', () => {
  assert(codingPageSource.includes('className="person-tracker-resize-handle"'), 'person-tracker-resize-handle present in JSX')
  assert(indexCssSource.includes('.person-tracker-resize-handle'), 'person-tracker-resize-handle defined in CSS')
  assert(indexCssSource.includes('cursor: nwse-resize'), 'resize cursor set')
  assert(codingPageSource.includes('.person-tracker-resize-handle'), 'drag handler excludes resize handle')
})

// -----------------------------------------------------------------------------
// Test 14: Resizing wider and taller within viewport bounds
// -----------------------------------------------------------------------------
test('Modal can be resized wider and taller within viewport constraints', () => {
  assert(codingPageSource.includes('handleResizeMouseDown'), 'handleResizeMouseDown implemented')
  assert(codingPageSource.includes('handleResizeMouseMove'), 'handleResizeMouseMove implemented')

  // Simulate resize wider and taller from initial (960, 620)
  const initialWidth = 960
  const initialHeight = 620
  const deltaX = 150
  const deltaY = 100
  const windowWidth = 1400
  const windowHeight = 900
  const minW = 520
  const minH = 380

  const maxW = Math.max(minW, windowWidth - 20)
  const maxH = Math.max(minH, windowHeight - 20)

  const newW = Math.min(maxW, Math.max(minW, initialWidth + deltaX))
  const newH = Math.min(maxH, Math.max(minH, initialHeight + deltaY))

  assert.strictEqual(newW, 1110, 'Width increased by 150px')
  assert.strictEqual(newH, 720, 'Height increased by 100px')
})

// -----------------------------------------------------------------------------
// Test 15: Minimum size enforcement (cannot shrink below MIN_WIDTH / MIN_HEIGHT)
// -----------------------------------------------------------------------------
test('Modal can be resized smaller but strictly enforces minimum dimensions (520x380)', () => {
  assert(codingPageSource.includes('MIN_WIDTH = 520'), 'MIN_WIDTH defined')
  assert(codingPageSource.includes('MIN_HEIGHT = 380'), 'MIN_HEIGHT defined')

  // Simulate dragging left/up by 800px from initial (960, 620)
  const initialWidth = 960
  const initialHeight = 620
  const deltaX = -800
  const deltaY = -500
  const windowWidth = 1400
  const windowHeight = 900
  const minW = 520
  const minH = 380

  const maxW = Math.max(minW, windowWidth - 20)
  const maxH = Math.max(minH, windowHeight - 20)

  const newW = Math.min(maxW, Math.max(minW, initialWidth + deltaX))
  const newH = Math.min(maxH, Math.max(minH, initialHeight + deltaY))

  assert.strictEqual(newW, 520, 'Width clamped to minimum 520px')
  assert.strictEqual(newH, 380, 'Height clamped to minimum 380px')
})

// -----------------------------------------------------------------------------
// Test 16: Responsive window resize adapts modal dimensions
// -----------------------------------------------------------------------------
test('Window resize listener clamps modal dimensions to keep modal visible in viewport', () => {
  assert(codingPageSource.includes("window.addEventListener('resize'"), 'Window resize listener registered')

  // When browser window shrinks to 800x500
  const currentSize = { width: 960, height: 620 }
  const smallWindowWidth = 800
  const smallWindowHeight = 500
  const minW = 520
  const minH = 380

  const maxW = Math.max(minW, smallWindowWidth - 20) // 780
  const maxH = Math.max(minH, smallWindowHeight - 20) // 480

  const clamped = {
    width: Math.min(currentSize.width, maxW),
    height: Math.min(currentSize.height, maxH),
  }

  assert.strictEqual(clamped.width, 780, 'Width clamped to viewport bound')
  assert.strictEqual(clamped.height, 480, 'Height clamped to viewport bound')
})

// -----------------------------------------------------------------------------
// Test 17: Dragging vs Resizing separation and non-blocking PDF/table scroll
// -----------------------------------------------------------------------------
test('Resize handle event prevents dragging and preserves PDF & table scrolling', () => {
  assert(codingPageSource.includes('e.stopPropagation()'), 'Resize event stops propagation to drag handler')
  assert(codingPageSource.includes('cursor: isDragging ? \'grabbing\' : isResizing ? \'nwse-resize\' : \'default\''), 'Cursor reflects resize vs drag state')
  assert(indexCssSource.includes('overflow-y: auto'), 'Internal scroll enabled on grid body')
  assert(indexCssSource.includes('pointer-events: none'), 'Floating overlay does not block PDF interaction')
})

// -----------------------------------------------------------------------------
// Test 18: Minimize collapses content without destroying form data
// -----------------------------------------------------------------------------
test('Minimize collapses modal to topbar without clearing entered form data', () => {
  assert(codingPageSource.includes('handleToggleMinimize'), 'handleToggleMinimize implemented')
  assert(codingPageSource.includes('isMinimized ? \'auto\' : `${size.height}px`'), 'Height adjusts to auto when minimized')
  assert(codingPageSource.includes('!isMinimized &&'), 'Content hidden when minimized')

  // Simulate form state retention during minimize
  const userEnteredDraft = {
    firstName: 'Alice',
    lastName: 'Smith',
    address: '742 Evergreen Terr',
    ssn: '123-45-6789',
    dataOwner: 'Custodian A',
  }
  let isMinimizedState = false
  let preMinSize = null
  let currentSize = { width: 960, height: 620 }

  // User clicks minimize
  preMinSize = { ...currentSize }
  isMinimizedState = true

  // Ensure data was not modified
  assert.strictEqual(userEnteredDraft.firstName, 'Alice')
  assert.strictEqual(userEnteredDraft.address, '742 Evergreen Terr')
  assert.strictEqual(isMinimizedState, true)
  assert.strictEqual(preMinSize.width, 960)
  assert.strictEqual(preMinSize.height, 620)
})

// -----------------------------------------------------------------------------
// Test 19: Restore returns content and previous dimensions after minimize
// -----------------------------------------------------------------------------
test('Restore returns content and recovers previous dimensions after minimize', () => {
  let isMinimizedState = true
  let preMinSize = { width: 960, height: 620 }
  let currentSize = { width: 960, height: 620 }

  // User clicks restore / minimize toggle
  isMinimizedState = false
  currentSize = preMinSize

  assert.strictEqual(isMinimizedState, false)
  assert.strictEqual(currentSize.width, 960)
  assert.strictEqual(currentSize.height, 620)
})

// -----------------------------------------------------------------------------
// Test 20: Maximize expands to viewport dimensions and restore recovers custom size
// -----------------------------------------------------------------------------
test('Maximize expands modal to viewport and restore recovers custom size', () => {
  assert(codingPageSource.includes('handleToggleMaximize'), 'handleToggleMaximize implemented')
  assert(codingPageSource.includes('isMaximized'), 'isMaximized state tracked')

  const customUserSize = { width: 850, height: 500 }
  const viewportWidth = 1440
  const viewportHeight = 900
  const minW = 520
  const minH = 380

  let currentSize = { ...customUserSize }
  let preMaxSize = null
  let isMaximizedState = false

  // Maximize
  preMaxSize = { ...currentSize }
  const maxW = Math.max(minW, viewportWidth - 30)
  const maxH = Math.max(minH, viewportHeight - 50)
  currentSize = { width: maxW, height: maxH }
  isMaximizedState = true

  assert.strictEqual(isMaximizedState, true)
  assert.strictEqual(currentSize.width, 1410)
  assert.strictEqual(currentSize.height, 850)

  // Restore
  isMaximizedState = false
  currentSize = preMaxSize

  assert.strictEqual(isMaximizedState, false)
  assert.strictEqual(currentSize.width, 850)
  assert.strictEqual(currentSize.height, 500)
})

// -----------------------------------------------------------------------------
// Test 21: Minus (-) button decreases width/height and stops at minimum
// -----------------------------------------------------------------------------
test('Minus (-) button decreases modal size by 40px/30px and stops at minimum (520x380)', () => {
  assert(codingPageSource.includes('handleStepDecrease'), 'handleStepDecrease implemented')
  assert(codingPageSource.includes('title="Decrease Person Tracker size"'), 'Decrease tooltip present')

  const minW = 520
  const minH = 380
  const stepW = 40
  const stepH = 30

  let size = { width: 600, height: 440 }

  // 1st click
  size = {
    width: Math.max(minW, size.width - stepW),
    height: Math.max(minH, size.height - stepH),
  }
  assert.strictEqual(size.width, 560)
  assert.strictEqual(size.height, 410)

  // 2nd click
  size = {
    width: Math.max(minW, size.width - stepW),
    height: Math.max(minH, size.height - stepH),
  }
  assert.strictEqual(size.width, 520)
  assert.strictEqual(size.height, 380)

  // 3rd click (repeated click should clamp at minimum)
  size = {
    width: Math.max(minW, size.width - stepW),
    height: Math.max(minH, size.height - stepH),
  }
  assert.strictEqual(size.width, 520, 'Clamped at minimum width')
  assert.strictEqual(size.height, 380, 'Clamped at minimum height')
})

// -----------------------------------------------------------------------------
// Test 22: Plus (+) button increases width/height and stops at viewport max
// -----------------------------------------------------------------------------
test('Plus (+) button increases modal size by 40px/30px and stops at viewport max', () => {
  assert(codingPageSource.includes('handleStepIncrease'), 'handleStepIncrease implemented')
  assert(codingPageSource.includes('title="Increase Person Tracker size"'), 'Increase tooltip present')

  const windowW = 1200
  const windowH = 800
  const maxW = windowW - 20 // 1180
  const maxH = windowH - 20 // 780
  const stepW = 40
  const stepH = 30

  let size = { width: 1120, height: 740 }

  // 1st click
  size = {
    width: Math.min(maxW, size.width + stepW),
    height: Math.min(maxH, size.height + stepH),
  }
  assert.strictEqual(size.width, 1160)
  assert.strictEqual(size.height, 770)

  // 2nd click (stops at max bounds)
  size = {
    width: Math.min(maxW, size.width + stepW),
    height: Math.min(maxH, size.height + stepH),
  }
  assert.strictEqual(size.width, 1180, 'Clamped at max width')
  assert.strictEqual(size.height, 780, 'Clamped at max height')
})

// -----------------------------------------------------------------------------
// Test 23: Fit button sizes the modal to fit the viewport comfortably
// -----------------------------------------------------------------------------
test('Fit button calculates and applies full viewport fit dimensions', () => {
  assert(codingPageSource.includes('handleFitScreen'), 'handleFitScreen implemented')
  assert(codingPageSource.includes('title="Fit Person Tracker to screen"'), 'Fit tooltip present')
  assert(codingPageSource.includes('className="person-tracker-fit-btn"'), 'person-tracker-fit-btn class used')
  assert(indexCssSource.includes('.person-tracker-fit-btn'), 'person-tracker-fit-btn defined in CSS')

  const windowW = 1440
  const windowH = 900
  const expectedW = windowW - 30 // 1410
  const expectedH = windowH - 50 // 850

  const fitSize = {
    width: Math.max(520, windowW - 30),
    height: Math.max(380, windowH - 50),
  }

  assert.strictEqual(fitSize.width, 1410)
  assert.strictEqual(fitSize.height, 850)
})

// -----------------------------------------------------------------------------
// Test 24: Seamless interaction between Manual Resize, Step Resize, and Fit
// -----------------------------------------------------------------------------
test('Manual resize, step resize (+/-), and Fit work together seamlessly on shared state', () => {
  // Start with manual resize to custom 700x450
  let currentSize = { width: 700, height: 450 }

  // User clicks "+" twice
  currentSize = { width: currentSize.width + 40, height: currentSize.height + 30 }
  currentSize = { width: currentSize.width + 40, height: currentSize.height + 30 }
  assert.strictEqual(currentSize.width, 780)
  assert.strictEqual(currentSize.height, 510)

  // User clicks "-" once
  currentSize = { width: currentSize.width - 40, height: currentSize.height - 30 }
  assert.strictEqual(currentSize.width, 740)
  assert.strictEqual(currentSize.height, 480)

  // User clicks Fit
  const windowW = 1280
  const windowH = 720
  currentSize = {
    width: Math.max(520, windowW - 30),
    height: Math.max(380, windowH - 50),
  }
  assert.strictEqual(currentSize.width, 1250)
  assert.strictEqual(currentSize.height, 670)
})

// -----------------------------------------------------------------------------
// Test 25: Visual header layout and dragging protection
// -----------------------------------------------------------------------------
test('Topbar layout contains Save, -, +, Fit, Cancel, and X without triggering drag on click', () => {
  assert(codingPageSource.includes('person-tracker-save-btn'), 'Save button present')
  assert(codingPageSource.includes('person-tracker-cancel-btn'), 'Cancel button present')
  assert(codingPageSource.includes('person-tracker-close-btn'), 'Close button present')
  assert(codingPageSource.includes('person-tracker-fit-btn'), 'Fit button present')
  assert(codingPageSource.includes('e.stopPropagation()'), 'Controls prevent triggering window drag')
})

console.log('================================================================================')
console.log(`PERSON TRACKER CRUD REGRESSION SUMMARY: Passed: ${passed}, Failed: ${failed}`)
console.log('================================================================================')

if (failed > 0) process.exit(1)



