import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDir = path.resolve(__dirname, '../client/src')

let passed = 0
let failed = 0

function assert(condition, message, details = '') {
  if (condition) {
    console.log(`  [PASS] ${message}`)
    passed++
  } else {
    console.error(`  [FAIL] ${message}${details ? ' -> ' + details : ''}`)
    failed++
  }
}

console.log('--- Starting AUTH Batch Ownership UI & Frontend Permission Verification Suite ---\n')

// ---------------------------------------------------------------------------
// 1. Static Source Code Inspections for CodingPage.jsx
// ---------------------------------------------------------------------------
console.log('--- Section 1: CodingPage.jsx Static Invariants ---')
const codingPageSrc = fs.readFileSync(path.join(clientDir, 'components/coding/CodingPage.jsx'), 'utf-8')

assert(
  codingPageSrc.includes('import { useAuth } from') || codingPageSrc.includes('useAuth()'),
  'CodingPage.jsx imports and uses useAuth hook'
)

assert(
  !codingPageSrc.includes("batch.assignedToName === 'Current Reviewer'"),
  'CodingPage.jsx does NOT contain hardcoded "batch.assignedToName === \'Current Reviewer\'"'
)

assert(
  !codingPageSrc.includes("reviewerName: 'Current Reviewer'"),
  'CodingPage.jsx does NOT contain hardcoded "reviewerName: \'Current Reviewer\'" in API payloads'
)

assert(
  codingPageSrc.includes('codingRes.data.readOnly') || codingPageSrc.includes('serverReadOnly'),
  'CodingPage.jsx captures and respects backend authoritative readOnly value'
)

assert(
  codingPageSrc.includes('user.role === \'admin\'') || codingPageSrc.includes('isAdmin'),
  'CodingPage.jsx preserves admin privileged editability'
)

assert(
  codingPageSrc.includes('String(batch.lockedBy) === String(user.id)') ||
  codingPageSrc.includes('String(batch.assignedTo) === String(user.id)'),
  'CodingPage.jsx performs safe String comparison between MongoDB ObjectIds and user.id'
)

// ---------------------------------------------------------------------------
// 2. Static Source Code Inspections for ReviewPage.jsx
// ---------------------------------------------------------------------------
console.log('\n--- Section 2: ReviewPage.jsx Static Invariants ---')
const reviewPageSrc = fs.readFileSync(path.join(clientDir, 'components/review/ReviewPage.jsx'), 'utf-8')

assert(
  reviewPageSrc.includes('import { useAuth } from') || reviewPageSrc.includes('useAuth()'),
  'ReviewPage.jsx imports and uses useAuth hook'
)

assert(
  !reviewPageSrc.includes("item.assignedToName === 'Current Reviewer'"),
  'ReviewPage.jsx does NOT contain hardcoded "item.assignedToName === \'Current Reviewer\'"'
)

assert(
  !reviewPageSrc.includes("reviewerName: 'Current Reviewer'"),
  'ReviewPage.jsx does NOT contain hardcoded "reviewerName: \'Current Reviewer\'" in acquire request'
)

assert(
  reviewPageSrc.includes('String(item.lockedBy) === String(user.id)') ||
  reviewPageSrc.includes('String(item.assignedTo) === String(user.id)'),
  'ReviewPage.jsx matches batch ownership using authenticated user.id'
)

assert(
  reviewPageSrc.includes('isTakenByMe') && reviewPageSrc.includes('isTakenByOther'),
  'ReviewPage.jsx defines clear isTakenByMe and isTakenByOther states'
)

assert(
  reviewPageSrc.includes('acquiredCount') && !reviewPageSrc.includes("b.assignedTo === 'Current Reviewer'"),
  'ReviewPage.jsx acquiredCount counts batches owned by the current authenticated user'
)

// ---------------------------------------------------------------------------
// 3. Functional Simulation: CodingPage Ownership Resolution Logic
// ---------------------------------------------------------------------------
console.log('\n--- Section 3: CodingPage Permission Resolution Simulation ---')

function evaluateCodingPageReadOnly({ user, document, serverReadOnly }) {
  const batch = document?.batchId
  const isAdmin = user?.role === 'admin'
  const isBatchActiveAndLocked = Boolean(batch && batch.isLocked && batch.status === 'In Progress')
  const isBatchOwner = Boolean(
    user &&
    batch &&
    (
      (user.id && batch.lockedBy && String(batch.lockedBy) === String(user.id)) ||
      (user.id && batch.assignedTo && String(batch.assignedTo) === String(user.id)) ||
      (user.username && batch.assignedToName && batch.assignedToName === user.username)
    )
  )

  const isAssignedToMe = isAdmin || (isBatchActiveAndLocked && isBatchOwner)
  const readOnly = isAdmin ? false : (serverReadOnly !== null ? serverReadOnly : !isAssignedToMe)
  return { isAssignedToMe, readOnly }
}

const user1 = { id: '650000000000000000000001', username: 'user1', role: 'user' }
const user2 = { id: '650000000000000000000002', username: 'user2', role: 'user' }
const adminUser = { id: '650000000000000000000099', username: 'admin', role: 'admin' }

const user1Batch = {
  _id: '650000000000000000000010',
  name: 'Monday Batch1_00001',
  status: 'In Progress',
  isLocked: true,
  lockedBy: '650000000000000000000001',
  assignedTo: '650000000000000000000001',
  assignedToName: 'user1',
}

const user1Doc = {
  _id: '650000000000000000000100',
  controlNumber: 'CTRL-0001',
  batchId: user1Batch,
}

// 3a. User 1 opens user 1's batch (Owner scenario)
const user1Res = evaluateCodingPageReadOnly({
  user: user1,
  document: user1Doc,
  serverReadOnly: false,
})
assert(user1Res.isAssignedToMe === true, 'Owner user1 is recognized as isAssignedToMe=true')
assert(user1Res.readOnly === false, 'Owner user1 has readOnly=false (editable access enabled)')

// 3b. User 2 opens user 1's batch (Other user scenario)
const user2Res = evaluateCodingPageReadOnly({
  user: user2,
  document: user1Doc,
  serverReadOnly: true,
})
assert(user2Res.isAssignedToMe === false, 'Non-owner user2 is evaluated as isAssignedToMe=false')
assert(user2Res.readOnly === true, 'Non-owner user2 has readOnly=true (read-only enforced)')

// 3c. Admin opens user 1's batch (Admin privileged scenario)
const adminRes = evaluateCodingPageReadOnly({
  user: adminUser,
  document: user1Doc,
  serverReadOnly: false,
})
assert(adminRes.isAssignedToMe === true, 'Admin is evaluated as isAssignedToMe=true')
assert(adminRes.readOnly === false, 'Admin has readOnly=false (privileged edit access preserved)')

// 3d. Completed batch (No longer in progress)
const completedBatch = {
  ...user1Batch,
  status: 'Completed',
  isLocked: false,
}
const completedDoc = { ...user1Doc, batchId: completedBatch }
const completedRes = evaluateCodingPageReadOnly({
  user: user1,
  document: completedDoc,
  serverReadOnly: true,
})
assert(completedRes.readOnly === true, 'Completed batch document is readOnly=true even for original owner')

// 3e. Simulated Employee A batch
const empABatch = {
  _id: '650000000000000000000020',
  name: 'Monday Batch1_00002',
  status: 'In Progress',
  isLocked: true,
  lockedBy: '650000000000000000000088',
  assignedTo: '650000000000000000000088',
  assignedToName: 'Employee A (Gupta, Anjali)',
}
const empADoc = { _id: '650000000000000000000101', controlNumber: 'CTRL-0002', batchId: empABatch }
const empARes = evaluateCodingPageReadOnly({
  user: user1,
  document: empADoc,
  serverReadOnly: true,
})
assert(empARes.isAssignedToMe === false && empARes.readOnly === true, 'Simulated Employee A batch is readOnly for normal user1')

// ---------------------------------------------------------------------------
// 4. Functional Simulation: ReviewPage Batch Mapping & Acquired Count
// ---------------------------------------------------------------------------
console.log('\n--- Section 4: ReviewPage Batch Mapping & Acquired Count Simulation ---')

function mapReviewBatches(batches, user) {
  return batches.map((item) => {
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
      batchStatus: displayStatus,
      assignedTo: item.assignedToName || '',
      isTakenByMe,
      isTakenByOther,
      isLocked: Boolean(item.isLocked),
    }
  })
}

const mockBatches = [
  // User 1 active batch
  {
    _id: 'b1',
    name: 'Batch 1',
    status: 'In Progress',
    isLocked: true,
    lockedBy: '650000000000000000000001',
    assignedTo: '650000000000000000000001',
    assignedToName: 'user1',
  },
  // User 2 active batch
  {
    _id: 'b2',
    name: 'Batch 2',
    status: 'In Progress',
    isLocked: true,
    lockedBy: '650000000000000000000002',
    assignedTo: '650000000000000000000002',
    assignedToName: 'user2',
  },
  // Employee A active batch
  {
    _id: 'b3',
    name: 'Batch 3',
    status: 'In Progress',
    isLocked: true,
    lockedBy: '650000000000000000000088',
    assignedTo: '650000000000000000000088',
    assignedToName: 'Employee A (Gupta, Anjali)',
  },
  // Available batch
  {
    _id: 'b4',
    name: 'Batch 4',
    status: 'Available',
    isLocked: false,
    lockedBy: null,
    assignedTo: null,
    assignedToName: '',
  },
]

// Map from user1 perspective
const mappedForUser1 = mapReviewBatches(mockBatches, user1)

// Check Batch 1 (Owned by user 1)
assert(mappedForUser1[0].isTakenByMe === true, 'Batch 1 isTakenByMe is true for user1')
assert(mappedForUser1[0].isTakenByOther === false, 'Batch 1 isTakenByOther is false for user1')
assert(mappedForUser1[0].batchStatus === 'In Progress', 'Batch 1 status is displayed as "In Progress" for user1')

// Check Batch 2 (Owned by user 2)
assert(mappedForUser1[1].isTakenByMe === false, 'Batch 2 isTakenByMe is false for user1')
assert(mappedForUser1[1].isTakenByOther === true, 'Batch 2 isTakenByOther is true for user1')
assert(mappedForUser1[1].batchStatus === 'Taken', 'Batch 2 status is displayed as "Taken" for user1')

// Check Batch 3 (Employee A)
assert(mappedForUser1[2].isTakenByMe === false, 'Batch 3 isTakenByMe is false for user1')
assert(mappedForUser1[2].isTakenByOther === true, 'Batch 3 isTakenByOther is true for user1')
assert(mappedForUser1[2].batchStatus === 'Taken', 'Batch 3 status is displayed as "Taken" for user1')

// Check Batch 4 (Available)
assert(mappedForUser1[3].isTakenByMe === false, 'Batch 4 isTakenByMe is false for available batch')
assert(mappedForUser1[3].isTakenByOther === false, 'Batch 4 isTakenByOther is false for available batch')
assert(mappedForUser1[3].batchStatus === 'Available', 'Batch 4 status is displayed as "Available"')

// Acquired count
const acquiredCountUser1 = mappedForUser1.filter((b) => b.isLocked && b.isTakenByMe).length
assert(acquiredCountUser1 === 1, `acquiredCount for user1 is exactly 1 (actual: ${acquiredCountUser1})`)

const mappedForUser2 = mapReviewBatches(mockBatches, user2)
const acquiredCountUser2 = mappedForUser2.filter((b) => b.isLocked && b.isTakenByMe).length
assert(acquiredCountUser2 === 1, `acquiredCount for user2 is exactly 1 (actual: ${acquiredCountUser2})`)

console.log(`\n========================================`)
console.log(`Batch Ownership UI Test Suite Summary: Passed: ${passed}, Failed: ${failed}`)
console.log(`========================================`)

if (failed > 0) {
  process.exit(1)
}
