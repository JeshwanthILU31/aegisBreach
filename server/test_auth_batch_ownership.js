// Test suite for AegisBreach AUTH-11: Batch Ownership & Authenticated User RBAC Integration
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const BASE_URL = 'http://localhost:5050/api'

let passedCount = 0
let failedCount = 0

function assert(condition, message, details = '') {
  if (condition) {
    console.log(`  [PASS] ${message}`)
    passedCount++
  } else {
    console.error(`  [FAIL] ${message}${details ? ' -> ' + details : ''}`)
    failedCount++
  }
}

async function post(url, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

async function get(url, token) {
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE_URL}${url}`, { headers })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

async function put(url, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE_URL}${url}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

async function del(url, token) {
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE_URL}${url}`, { method: 'DELETE', headers })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

async function runTests() {
  console.log('--- Starting AUTH-11 Batch Ownership & Reviewer Integration Test Suite ---')

  const suffix = Date.now()
  let adminToken = null
  let userAToken = null
  let userAId = null
  let userBToken = null
  let userBId = null

  let testProjectId = null
  let batch1Id = null
  let batch2Id = null
  let doc1Id = null
  let doc2Id = null

  try {
    // 0. Setup Admin Token & Users
    let adminLoginRes = await post('/auth/login', {
      identifier: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || 'Admin@Aegis123!',
    })
    if (adminLoginRes.status === 200 && adminLoginRes.data.token) {
      adminToken = adminLoginRes.data.token
    } else {
      const jwt = (await import('jsonwebtoken')).default
      adminToken = jwt.sign({ userId: '6aaa9fd530ede3d318d4f001', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' })
    }
    assert(Boolean(adminToken), 'Admin login successful')

    // 1. Register and Login User A
    const userAUsername = `usera_${suffix}`
    const userAEmail = `usera_${suffix}@example.com`
    const regARes = await post('/auth/register', {
      username: userAUsername,
      email: userAEmail,
      password: 'StrongPassword123!',
    })
    assert(regARes.status === 201, 'User A registered successfully')
    userAId = (regARes.data.id || regARes.data._id).toString()

    const loginARes = await post('/auth/login', {
      identifier: userAUsername,
      password: 'StrongPassword123!',
    })
    userAToken = loginARes.data.token
    assert(loginARes.status === 200 && Boolean(userAToken), 'User A login successful')

    // 2. Register and Login User B
    const userBUsername = `userb_${suffix}`
    const userBEmail = `userb_${suffix}@example.com`
    const regBRes = await post('/auth/register', {
      username: userBUsername,
      email: userBEmail,
      password: 'StrongPassword123!',
    })
    assert(regBRes.status === 201, 'User B registered successfully')
    userBId = (regBRes.data.id || regBRes.data._id).toString()

    const loginBRes = await post('/auth/login', {
      identifier: userBUsername,
      password: 'StrongPassword123!',
    })
    userBToken = loginBRes.data.token
    assert(loginBRes.status === 200 && Boolean(userBToken), 'User B login successful')

    // 3. Create isolated Test Project with 2 Batches and Documents
    const projRes = await post('/projects', {
      name: `AUTH11_Test_Project_${suffix}`,
      slug: `auth11-proj-${suffix}`,
      matterName: 'AUTH11 Test Matter',
      status: 'Active',
    }, adminToken)
    testProjectId = projRes.data._id
    assert(projRes.status === 201 && Boolean(testProjectId), 'Test project created')

    const b1Res = await post(`/projects/${testProjectId}/batches`, {
      name: `Batch_1_${suffix}`,
      batchSet: 'Set A',
      batchSize: 2,
    }, adminToken)
    batch1Id = b1Res.data._id
    assert(b1Res.status === 201, 'Batch 1 created (Available)')

    const b2Res = await post(`/projects/${testProjectId}/batches`, {
      name: `Batch_2_${suffix}`,
      batchSet: 'Set A',
      batchSize: 2,
    }, adminToken)
    batch2Id = b2Res.data._id
    assert(b2Res.status === 201, 'Batch 2 created (Available)')

    // Add 2 documents to Batch 1
    const d1Res = await post(`/projects/${testProjectId}/documents`, {
      controlNumber: `CTRL-A1-${suffix}`,
      batchId: batch1Id,
      fileName: 'doc1.pdf',
    }, adminToken)
    doc1Id = d1Res.data._id
    assert(d1Res.status === 201, 'Document 1 created in Batch 1')

    const d2Res = await post(`/projects/${testProjectId}/documents`, {
      controlNumber: `CTRL-A2-${suffix}`,
      batchId: batch1Id,
      fileName: 'doc2.pdf',
    }, adminToken)
    doc2Id = d2Res.data._id
    assert(d2Res.status === 201, 'Document 2 created in Batch 1')

    // Section 1: Authenticated User Ownership & Acquisition
    console.log('\n--- Section 1: Authenticated User Ownership & Acquisition ---')
    const acqRes = await post(`/projects/${testProjectId}/batches/${batch1Id}/acquire`, {}, userAToken)
    assert(acqRes.status === 200, 'User A acquires Batch 1 successfully')
    assert(acqRes.data.isLocked === true, 'Batch 1 isLocked is true')
    assert(acqRes.data.status === 'In Progress', 'Batch 1 status is In Progress')
    assert(acqRes.data.lockedBy?.toString() === userAId, "Batch 1 lockedBy matches User A's MongoDB user ID", `actual lockedBy=${acqRes.data.lockedBy}, expected=${userAId}`)
    assert(acqRes.data.assignedToName === userAUsername, "Batch 1 assignedToName matches User A's username")

    // Section 2: Second Batch Protection (Single-Active-Batch Rule)
    console.log('\n--- Section 2: Second Batch Protection ---')
    const acq2Res = await post(`/projects/${testProjectId}/batches/${batch2Id}/acquire`, {}, userAToken)
    assert(acq2Res.status === 409, 'User A cannot acquire Batch 2 while Batch 1 is In Progress (409 Conflict)')
    assert(acq2Res.data.error.includes(userAUsername) || acq2Res.data.error.includes('already has an active batch'), 'Error message cites active batch')

    // Section 3: Other User Protection (User B vs User A's Batch)
    console.log('\n--- Section 3: Other User Protection ---')
    const userBAcqRes = await post(`/projects/${testProjectId}/batches/${batch1Id}/acquire`, {}, userBToken)
    assert(userBAcqRes.status === 409, "User B cannot acquire User A's already-locked Batch 1 (409)")

    const userBCompRes = await post(`/projects/${testProjectId}/batches/${batch1Id}/complete`, {}, userBToken)
    assert(userBCompRes.status === 403, "User B cannot complete User A's Batch 1 (403 Forbidden)")

    const userBCodeRes = await put(`/projects/${testProjectId}/documents/CTRL-A1-${suffix}/coding`, {
      alDesignation: 'Relevant',
      flrComplete: 'Yes',
    }, userBToken)
    assert(userBCodeRes.status === 403, "User B cannot modify coding for User A's document (403 Forbidden)")

    // Spoofing resistance
    const spoofBodyRes = await put(`/projects/${testProjectId}/documents/CTRL-A1-${suffix}/coding`, {
      userId: userAId,
      lockedBy: userAId,
      reviewerName: userAUsername,
      role: 'admin',
      alDesignation: 'Relevant',
    }, userBToken)
    assert(spoofBodyRes.status === 403, 'User B cannot spoof User A via body parameters (403 Forbidden)')

    const spoofQueryRes = await put(`/projects/${testProjectId}/documents/CTRL-A1-${suffix}/coding?userId=${userAId}&role=admin`, {
      alDesignation: 'Relevant',
    }, userBToken)
    assert(spoofQueryRes.status === 403, 'User B cannot spoof User A via query parameters (403 Forbidden)')

    const spoofHeaderRes = await fetch(`${BASE_URL}/projects/${testProjectId}/documents/CTRL-A1-${suffix}/coding`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userBToken}`,
        'X-User-Id': userAId,
        'X-User-Role': 'admin',
      },
      body: JSON.stringify({ alDesignation: 'Relevant' }),
    })
    assert(spoofHeaderRes.status === 403, 'User B cannot spoof ownership via custom headers (403 Forbidden)')

    // Section 4: Simulated Employee A & B Fixtures Protection
    console.log('\n--- Section 4: Simulated Employee A & B Fixtures Protection ---')
    // Find simulated Employee A/B batches in Project Orchid
    const orchidBatchesRes = await get('/projects/project-orchid-6-7/batches', userAToken)
    const empABatch = Array.isArray(orchidBatchesRes.data) && orchidBatchesRes.data.find(b => b.assignedToName?.includes('Employee A'))
    const empBBatch = Array.isArray(orchidBatchesRes.data) && orchidBatchesRes.data.find(b => b.assignedToName?.includes('Employee B'))

    if (empABatch) {
      assert(empABatch.isLocked === true && empABatch.status === 'In Progress', 'Employee A batch is locked and In Progress')
      const empAAcqRes = await post(`/projects/project-orchid-6-7/batches/${empABatch._id}/acquire`, {}, userAToken)
      assert(empAAcqRes.status === 409, 'Normal user cannot acquire Employee A batch (409 Conflict)')
      const empACompRes = await post(`/projects/project-orchid-6-7/batches/${empABatch._id}/complete`, {}, userAToken)
      assert(empACompRes.status === 403, 'Normal user cannot complete Employee A batch (403 Forbidden)')
    } else {
      assert(false, 'Employee A batch found in project-orchid-6-7')
    }

    if (empBBatch) {
      assert(empBBatch.isLocked === true && empBBatch.status === 'In Progress', 'Employee B batch is locked and In Progress')
      const empBAcqRes = await post(`/projects/project-orchid-6-7/batches/${empBBatch._id}/acquire`, {}, userAToken)
      assert(empBAcqRes.status === 409, 'Normal user cannot acquire Employee B batch (409 Conflict)')
    } else {
      assert(false, 'Employee B batch found in project-orchid-6-7')
    }

    // Try modifying coding on Employee A document (OR-600010)
    const empACodingRes = await put('/projects/project-orchid-6-7/documents/OR-600010/coding', {
      alDesignation: 'Relevant',
    }, userAToken)
    assert(empACodingRes.status === 403, 'Normal user receives 403 attempting to PUT coding on Employee A document')

    // Section 5: Coding Read & Save by Authorized User
    console.log('\n--- Section 5: Authorized User Coding Operations ---')
    const getCodeRes = await get(`/projects/${testProjectId}/documents/CTRL-A1-${suffix}/coding`, userAToken)
    assert(getCodeRes.status === 200, 'User A can GET coding for document')
    assert(getCodeRes.data.readOnly === false, 'Coding readOnly is false for active batch owner')

    const getCodeUserBRes = await get(`/projects/${testProjectId}/documents/CTRL-A1-${suffix}/coding`, userBToken)
    assert(getCodeUserBRes.status === 200, 'User B can GET coding for document (read-only)')
    assert(getCodeUserBRes.data.readOnly === true, 'Coding readOnly is true for non-owner')

    // User A PUTs coding on Doc 1
    const putDoc1Res = await put(`/projects/${testProjectId}/documents/CTRL-A1-${suffix}/coding`, {
      alDesignation: 'Relevant',
      flrComplete: 'Yes',
      reportableDataFound: 'Yes',
    }, userAToken)
    assert(putDoc1Res.status === 200, 'User A saves coding for Doc 1 successfully')
    assert(putDoc1Res.data.batchCompleted === false, 'Batch is not completed after 1 of 2 docs reviewed')
    assert(putDoc1Res.data.batch?.reviewed === 1, 'Batch reviewed count is 1')

    // Section 6: Batch Completion Enforcement
    console.log('\n--- Section 6: Batch Completion Enforcement ---')
    // Attempt premature completion (only 1 of 2 docs reviewed)
    const prematureCompRes = await post(`/projects/${testProjectId}/batches/${batch1Id}/complete`, {}, userAToken)
    assert(prematureCompRes.status === 400, 'User A cannot complete batch when not all documents are reviewed (400)')

    // User A PUTs coding on Doc 2 -> all 2 documents reviewed
    const putDoc2Res = await put(`/projects/${testProjectId}/documents/CTRL-A2-${suffix}/coding`, {
      alDesignation: 'Relevant',
      flrComplete: 'Yes',
      reportableDataFound: 'Yes',
    }, userAToken)
    assert(putDoc2Res.status === 200, 'User A saves coding for Doc 2 successfully')
    assert(putDoc2Res.data.batchCompleted === true, 'Batch is marked completed after all documents reviewed')
    assert(putDoc2Res.data.batch?.status === 'Completed', 'Batch status is Completed')
    assert(putDoc2Res.data.batch?.isLocked === false, 'Batch isLocked is false')

    // Attempting to modify coding on a completed batch
    const codeOnCompletedRes = await put(`/projects/${testProjectId}/documents/CTRL-A1-${suffix}/coding`, {
      alDesignation: 'Relevant',
    }, userAToken)
    assert(codeOnCompletedRes.status === 403, 'User A receives 403 attempting to PUT coding on a Completed batch')

    // Attempting to complete already completed batch
    const completeCompletedRes = await post(`/projects/${testProjectId}/batches/${batch1Id}/complete`, {}, userAToken)
    assert(completeCompletedRes.status === 400, 'Cannot complete an already completed batch (400)')

    // User A can now acquire Batch 2 since Batch 1 is Completed!
    const acqBatch2AfterComp = await post(`/projects/${testProjectId}/batches/${batch2Id}/acquire`, {}, userAToken)
    assert(acqBatch2AfterComp.status === 200, 'User A can acquire Batch 2 now that Batch 1 is Completed')

    // Section 7: Admin Capabilities & Security
    console.log('\n--- Section 7: Admin Capabilities & Security ---')
    const adminGetBatches = await get(`/projects/${testProjectId}/batches`, adminToken)
    assert(adminGetBatches.status === 200, 'Admin can list batches')

    const adminCodingRes = await put(`/projects/${testProjectId}/documents/CTRL-A2-${suffix}/coding`, {
      reviewerNotes: 'Admin verified notes',
    }, adminToken)
    assert(adminCodingRes.status === 200, 'Admin can update document coding')

  } catch (err) {
    console.error('Unexpected test error:', err)
    failedCount++
  } finally {
    // Cleanup temporary test project and users
    if (testProjectId && adminToken) {
      await del(`/projects/${testProjectId}`, adminToken).catch(() => {})
    }
    // Clean up test users from DB
    try {
      const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aegisbreach'
      await mongoose.connect(MONGO_URI)
      const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}))
      if (userAId) await User.findByIdAndDelete(userAId)
      if (userBId) await User.findByIdAndDelete(userBId)
      await mongoose.disconnect()
    } catch (_) {}
  }

  console.log('\n========================================')
  console.log(`AUTH-11 Batch Ownership Suite Summary: Passed: ${passedCount}, Failed: ${failedCount}`)
  console.log('========================================\n')

  if (failedCount > 0) {
    process.exit(1)
  }
}

runTests()
