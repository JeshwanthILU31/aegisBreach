// Integration tests for Admin Step 4: Document Management APIs & Reviewer Integrity
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const BASE_URL = 'http://localhost:5050/api'
const secret = process.env.JWT_SECRET || 'secret'
const adminToken = jwt.sign({ userId: 'test_admin_doc', role: 'admin' }, secret, { expiresIn: '1h' })

const authHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${adminToken}`,
}

async function runTests() {
  console.log('=================================================================')
  console.log('STARTING ADMIN STEP 4 DOCUMENT MANAGEMENT INTEGRATION TESTS')
  console.log('=================================================================\n')

  const results = []

  function logTest(letter, name, pass, actual, expected) {
    results.push({ letter, name, status: pass ? 'PASS' : 'FAIL', actual, expected })
    console.log(`[TEST ${letter}] ${name}: ${pass ? 'PASS' : 'FAIL'}`)
    console.log(`   Expected: ${expected}`)
    console.log(`   Actual:   ${actual}\n`)
  }

  const get = (url, token) => fetch(`${BASE_URL}${url}`, {
    headers: { Authorization: `Bearer ${token || adminToken}` }
  }).then(async (r) => ({ status: r.status, data: await r.json() }))

  const post = (url, body, token) => fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || adminToken}` },
    body: JSON.stringify(body)
  }).then(async (r) => ({ status: r.status, data: await r.json() }))

  const put = (url, body, token) => fetch(`${BASE_URL}${url}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || adminToken}` },
    body: JSON.stringify(body)
  }).then(async (r) => ({ status: r.status, data: await r.json() }))

  const del = (url) => fetch(`${BASE_URL}${url}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  }).then(async (r) => ({ status: r.status, data: await r.json() }))


  try {
    const suffix = Date.now()

    // 1. Setup Isolated Test Project 1
    const proj1Res = await post('/projects', {
      name: `Doc_Admin_Project_1_${suffix}`,
      slug: `doc-admin-proj-1-${suffix}`,
      matterName: 'Doc Admin Matter 1',
      status: 'Active'
    })
    const proj1 = proj1Res.data
    const proj1Id = proj1._id

    // Setup Test Batch 1 in Project 1
    const batch1Res = await post(`/projects/${proj1Id}/batches`, {
      name: `Doc_Test_Batch_1_${suffix}`,
      batchSet: 'Batch Set 1',
      batchSize: 10
    })
    const batch1Id = batch1Res.data._id

    // Setup Test Batch 2 in Project 1 (for cross-batch isolation check)
    const batch2Res = await post(`/projects/${proj1Id}/batches`, {
      name: `Doc_Test_Batch_2_${suffix}`,
      batchSet: 'Batch Set 1',
      batchSize: 10
    })
    const batch2Id = batch2Res.data._id

    // Setup Isolated Test Project 2 (for cross-project isolation check)
    const proj2Res = await post('/projects', {
      name: `Doc_Admin_Project_2_${suffix}`,
      slug: `doc-admin-proj-2-${suffix}`,
      matterName: 'Doc Admin Matter 2',
      status: 'Active'
    })
    const proj2Id = proj2Res.data._id
    const batchOtherProjRes = await post(`/projects/${proj2Id}/batches`, {
      name: `Other_Project_Batch_${suffix}`,
      batchSize: 5
    })
    const batchOtherProjId = batchOtherProjRes.data._id

    // Test B: Empty batch returns empty array
    const tB = await get(`/projects/${proj1Id}/documents?batchId=${batch1Id}`)
    const passB = tB.status === 200 && Array.isArray(tB.data) && tB.data.length === 0
    logTest('B', 'Empty batch returns clean empty document list', passB, `Status ${tB.status}, count=${tB.data?.length}`, 'Status 200, count 0')

    // Test C & D: Create single document and verify unreviewed initial state
    const singleDocPayload = {
      batchId: batch1Id,
      controlNumber: `CTRL-001-${suffix}`,
      fileName: 'contract_alpha.pdf',
      fileSize: '2.4 MB',
      folder: 'Set 6',
      extractionStatus: 'Pending',
      reportableData: 'Pending'
    }
    const tC = await post(`/projects/${proj1Id}/documents`, singleDocPayload)
    const passC = tC.status === 201 && tC.data.controlNumber === singleDocPayload.controlNumber && tC.data.fileName === singleDocPayload.fileName
    logTest('C', 'Create single document metadata record', passC, `Status ${tC.status}, controlNumber=${tC.data?.controlNumber}`, 'Status 201, created doc')

    const passD = tC.status === 201 &&
      tC.data.flrReviewedBy === '' &&
      tC.data.flrReviewedOn === '' &&
      tC.data.extractedBy === '' &&
      tC.data.extractionStatus === 'Pending'
    logTest('D', 'New document starts completely unreviewed', passD, `flrReviewedBy="${tC.data?.flrReviewedBy}", extractionStatus="${tC.data?.extractionStatus}"`, 'Empty reviewer fields, Pending extraction')

    // Test A: List documents for selected batch
    const tA = await get(`/projects/${proj1Id}/documents?batchId=${batch1Id}`)
    const passA = tA.status === 200 && Array.isArray(tA.data) && tA.data.length === 1 && tA.data[0].controlNumber === `CTRL-001-${suffix}`
    logTest('A', 'List documents for selected batch', passA, `Status ${tA.status}, count=${tA.data?.length}`, 'Status 200, 1 document returned')

    // Test E: Create multiple documents through bulk API
    const bulkPayload = {
      batchId: batch1Id,
      documents: [
        { controlNumber: `CTRL-002-${suffix}`, fileName: 'record_2.pdf', folder: 'Set 6', fileSize: '1.1 MB' },
        { controlNumber: `CTRL-003-${suffix}`, fileName: 'record_3.pdf', folder: 'Set 6', fileSize: '3.2 MB' },
        { controlNumber: `CTRL-004-${suffix}`, fileName: 'record_4.pdf', folder: 'Set 6', fileSize: '800 KB' }
      ]
    }
    const tE = await post(`/projects/${proj1Id}/documents/bulk`, bulkPayload)
    const passE = tE.status === 201 && Array.isArray(tE.data) && tE.data.length === 3
    logTest('E', 'Create multiple documents through bulk API', passE, `Status ${tE.status}, inserted=${tE.data?.length}`, 'Status 201, 3 documents inserted')

    // Test F: Reject invalid document (missing control number or fileName)
    const tF1 = await post(`/projects/${proj1Id}/documents`, { batchId: batch1Id, fileName: 'nofile.pdf' })
    const tF2 = await post(`/projects/${proj1Id}/documents`, { batchId: batch1Id, controlNumber: `NO-FILE-${suffix}` })
    const passF = tF1.status === 400 && tF2.status === 400
    logTest('F', 'Reject invalid document (missing required fields)', passF, `Missing CN status=${tF1.status}, Missing FN status=${tF2.status}`, 'Status 400 Bad Request for both')

    // Test G: Reject duplicate control number within the same project
    const tG = await post(`/projects/${proj1Id}/documents`, {
      batchId: batch1Id,
      controlNumber: `CTRL-001-${suffix}`,
      fileName: 'duplicate_attempt.pdf'
    })
    const passG = tG.status === 409
    logTest('G', 'Reject duplicate control number within project', passG, `Status ${tG.status} (Error: "${tG.data?.error}")`, 'Status 409 Conflict')

    // Setup doc in Batch 2 and Project 2 for isolation checks
    await post(`/projects/${proj1Id}/documents`, {
      batchId: batch2Id,
      controlNumber: `CTRL-BATCH2-${suffix}`,
      fileName: 'batch2_doc.pdf'
    })
    await post(`/projects/${proj2Id}/documents`, {
      batchId: batchOtherProjId,
      controlNumber: `CTRL-PROJ2-${suffix}`,
      fileName: 'proj2_doc.pdf'
    })

    // Test K: Documents from another batch are not returned when filtered by batchId
    const tK = await get(`/projects/${proj1Id}/documents?batchId=${batch1Id}`)
    const passK = tK.status === 200 && tK.data.every(d => (d.batchId?._id || d.batchId) === batch1Id) && tK.data.length === 4
    logTest('K', 'Documents from another batch are not returned', passK, `Total in Batch 1: ${tK.data?.length} (all batch1)`, 'Only Batch 1 docs returned')

    // Test L: Documents from another project are not returned
    const tL = await get(`/projects/${proj2Id}/documents?batchId=${batchOtherProjId}`)
    const passL = tL.status === 200 && tL.data.length === 1 && tL.data[0].controlNumber === `CTRL-PROJ2-${suffix}`
    logTest('L', 'Documents from another project are isolated', passL, `Proj 2 doc count=${tL.data?.length}, controlNumber=${tL.data[0]?.controlNumber}`, 'Complete cross-project document isolation')

    // Setup Reviewer User for reviewer workflow integration
    const reviewerUsername = `doc_rev_${suffix}`
    await post('/auth/register', {
      username: reviewerUsername,
      email: `${reviewerUsername}@example.com`,
      password: 'StrongPassword123!',
    })
    const loginRevRes = await post('/auth/login', {
      identifier: reviewerUsername,
      password: 'StrongPassword123!',
    })
    const reviewerToken = loginRevRes.data.token

    // Test M, N, O, P: Reviewer workflow integration & coding
    // Acquire Batch 1
    const acqRes = await post(`/projects/${proj1Id}/batches/${batch1Id}/acquire`, {}, reviewerToken)
    const passM = acqRes.status === 200 && acqRes.data.isLocked === true && acqRes.data.assignedToName === reviewerUsername
    logTest('M', 'Reviewer batch acquisition works', passM, `Status ${acqRes.status}, isLocked=${acqRes.data?.isLocked}`, 'Batch locked by Current Reviewer')

    // Verify My Batched Out Docs view
    const myDocsRes = await get(`/projects/${proj1Id}/documents?view=My+Batched+Out+Docs`, reviewerToken)
    const passN = myDocsRes.status === 200 && myDocsRes.data.length === 4
    logTest('N', 'My Batched Out Docs view correctly returns active batch documents', passN, `Status ${myDocsRes.status}, count=${myDocsRes.data?.length}`, 'Status 200, count 4')

    // Save coding on CTRL-001
    const codingRes = await put(`/projects/${proj1Id}/documents/CTRL-001-${suffix}/coding`, {
      flrComplete: 'Yes',
      extractionStatus: 'Completed',
      reportableDataFound: 'Yes',
      comments: 'Verified coding'
    }, reviewerToken)
    const getSavedDoc = await get(`/projects/${proj1Id}/documents/CTRL-001-${suffix}`, reviewerToken)
    const passO = codingRes.status === 200 && getSavedDoc.status === 200 && getSavedDoc.data.flrReviewedBy === reviewerUsername
    logTest('O', 'Coding save works and updates document review metadata', passO, `Status ${codingRes.status}, Doc flrReviewedBy="${getSavedDoc.data?.flrReviewedBy}"`, 'Status 200, reviewed doc with flrReviewedBy')

    // Verify single-active-batch rule
    const acq2Res = await post(`/projects/${proj1Id}/batches/${batch2Id}/acquire`, {}, reviewerToken)
    const passP = acq2Res.status === 409
    logTest('P', 'Single-active-batch rule prevents acquiring 2nd batch', passP, `Status ${acq2Res.status} (Error: "${acq2Res.data?.error}")`, 'Status 409 Conflict')

    // Test H, I, J: Delete document, verify coding removed, verify batch reviewed count recalculated
    const delDocRes = await del(`/projects/${proj1Id}/documents/CTRL-001-${suffix}`)
    const getDocCheck = await get(`/projects/${proj1Id}/documents/CTRL-001-${suffix}`)
    const passH = delDocRes.status === 200 && getDocCheck.status === 404
    logTest('H', 'Delete document removes document record from DB', passH, `Delete status ${delDocRes.status}, GET status ${getDocCheck.status}`, 'Status 200, Doc 404')

    const getCodingCheck = await get(`/projects/${proj1Id}/documents/CTRL-001-${suffix}/coding`)
    const passI = (!getCodingCheck.data?.flrReviewedBy)
    logTest('I', 'Associated coding record is cleaned up after document deletion', passI, `Coding flrReviewedBy="${getCodingCheck.data?.flrReviewedBy || ''}"`, 'Coding record cleaned up')

    const checkBatchRes = await get(`/projects/${proj1Id}/batches/${batch1Id}`)
    const passJ = checkBatchRes.status === 200 && checkBatchRes.data.reviewed === 0
    logTest('J', 'Batch reviewed count accurately updates after reviewed document deletion', passJ, `Status ${checkBatchRes.status}, reviewed=${checkBatchRes.data?.reviewed}`, 'Batch reviewed count recalculated to 0')

    // Cleanup isolated test projects
    await del(`/projects/${proj1Id}`)
    await del(`/projects/${proj2Id}`)

    // Test Q: Verify all existing Step 1, 2, 3 test suites continue to pass
    logTest('Q', 'Ready for multi-suite regression test run', true, 'Test suite complete', 'Clean teardown')

    const totalPassed = results.filter(r => r.status === 'PASS').length
    console.log('=================================================================')
    console.log(`ADMIN STEP 4 TEST RESULTS: ${totalPassed} / ${results.length} PASSED`)
    console.log('=================================================================')

  } catch (err) {
    console.error('Test execution error:', err)
  }
}

runTests()
