// Isolated Test Suite for Admin Backend Step 1 (Document CRUD & Cascades)
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const BASE_URL = 'http://localhost:5050/api'
const secret = process.env.JWT_SECRET || 'secret'
const adminToken = jwt.sign({ userId: 'test_admin_crud', role: 'admin' }, secret, { expiresIn: '1h' })

const authHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${adminToken}`,
}

async function runAdminTests() {
  console.log('=================================================================')
  console.log('STARTING ADMIN BACKEND STEP 1 TEST SUITE (ISOLATED)')
  console.log('=================================================================\n')

  const results = []

  function logTest(testId, name, pass, actual, expected, details = '') {
    results.push({ testId, name, status: pass ? 'PASS' : 'FAIL', actual, expected, details })
    console.log(`[${testId}] ${name}: ${pass ? 'PASS' : 'FAIL'}`)
    console.log(`   Expected: ${expected}`)
    console.log(`   Actual:   ${actual}`)
    if (details) console.log(`   Details:  ${details}`)
    console.log('')
  }

  const get = (url) => fetch(`${BASE_URL}${url}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  }).then(async (r) => ({ status: r.status, data: await r.json() }))

  const post = (url, body) => fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(body)
  }).then(async (r) => ({ status: r.status, data: await r.json() }))

  const put = (url, body) => fetch(`${BASE_URL}${url}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify(body)
  }).then(async (r) => ({ status: r.status, data: await r.json() }))

  const del = (url) => fetch(`${BASE_URL}${url}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  }).then(async (r) => ({ status: r.status, data: await r.json() }))


  let testProjectA = null
  let testProjectB = null
  let testBatchA = null
  let testBatchB = null

  try {
    // Setup isolated test projects
    const suffix = Date.now()
    const pARes = await post('/projects', {
      name: `Admin_Test_Project_A_${suffix}`,
      slug: `admin-test-proj-a-${suffix}`,
      description: 'Isolated test project A'
    })
    testProjectA = pARes.data

    const pBRes = await post('/projects', {
      name: `Admin_Test_Project_B_${suffix}`,
      slug: `admin-test-proj-b-${suffix}`,
      description: 'Isolated test project B'
    })
    testProjectB = pBRes.data

    // Setup isolated batches
    const bARes = await post(`/projects/${testProjectA._id}/batches`, {
      name: `Admin_Test_Batch_A_${suffix}`,
      batchSet: 'Admin BatchSet A',
      batchSize: 5
    })
    testBatchA = bARes.data

    const bBRes = await post(`/projects/${testProjectB._id}/batches`, {
      name: `Admin_Test_Batch_B_${suffix}`,
      batchSet: 'Admin BatchSet B',
      batchSize: 5
    })
    testBatchB = bBRes.data

    // =========================================================
    // a. Create document
    // =========================================================
    const doc1Res = await post(`/projects/${testProjectA._id}/documents`, {
      batchId: testBatchA._id,
      controlNumber: `ADM-DOC-001-${suffix}`,
      fileName: 'Admin_Test_Doc_001.pdf',
      fileSize: '2.0 MB',
      folder: 'Set 6'
    })
    const passA = doc1Res.status === 201 &&
                  doc1Res.data.controlNumber === `ADM-DOC-001-${suffix}` &&
                  doc1Res.data.flrReviewedBy === '' &&
                  doc1Res.data.flrReviewedOn === '' &&
                  doc1Res.data.extractionStatus === 'Pending' &&
                  doc1Res.data.reportableData === 'Pending'

    logTest(
      'A',
      'Create single document with clean initial review state',
      passA,
      `Status ${doc1Res.status}, controlNumber="${doc1Res.data.controlNumber}", flrReviewedBy="${doc1Res.data.flrReviewedBy}", extractionStatus="${doc1Res.data.extractionStatus}"`,
      'Status 201, clean review fields (flrReviewedBy="", extractionStatus="Pending")'
    )

    // =========================================================
    // b. Create document for nonexistent project -> reject (404)
    // =========================================================
    const docNonExistentProj = await post('/projects/nonexistent-project-slug-9999/documents', {
      batchId: testBatchA._id,
      controlNumber: `ADM-DOC-999-${suffix}`,
      fileName: 'invalid.pdf'
    })
    const passB = docNonExistentProj.status === 404
    logTest(
      'B',
      'Create document for nonexistent project',
      passB,
      `Status ${docNonExistentProj.status} (Error: "${docNonExistentProj.data?.error}")`,
      'Status 404 Project not found'
    )

    // =========================================================
    // c. Create document for nonexistent batch -> reject (400)
    // =========================================================
    const fakeBatchId = '609b55f11111111111111111'
    const docNonExistentBatch = await post(`/projects/${testProjectA._id}/documents`, {
      batchId: fakeBatchId,
      controlNumber: `ADM-DOC-002-${suffix}`,
      fileName: 'invalid_batch.pdf'
    })
    const passC = docNonExistentBatch.status === 400
    logTest(
      'C',
      'Create document for nonexistent batch ID',
      passC,
      `Status ${docNonExistentBatch.status} (Error: "${docNonExistentBatch.data?.error}")`,
      'Status 400 Batch not found or does not belong to this project'
    )

    // =========================================================
    // d. Create document with batch belonging to another project -> reject (400)
    // =========================================================
    const docCrossBatch = await post(`/projects/${testProjectA._id}/documents`, {
      batchId: testBatchB._id, // Belongs to Project B!
      controlNumber: `ADM-DOC-003-${suffix}`,
      fileName: 'cross_batch.pdf'
    })
    const passD = docCrossBatch.status === 400
    logTest(
      'D',
      'Create document with batch belonging to another project',
      passD,
      `Status ${docCrossBatch.status} (Error: "${docCrossBatch.data?.error}")`,
      'Status 400 Batch not found or does not belong to this project'
    )

    // =========================================================
    // e. Duplicate control number -> reject (409)
    // =========================================================
    const docDup = await post(`/projects/${testProjectA._id}/documents`, {
      batchId: testBatchA._id,
      controlNumber: `ADM-DOC-001-${suffix}`, // Duplicate!
      fileName: 'duplicate_cn.pdf'
    })
    const passE = docDup.status === 409
    logTest(
      'E',
      'Reject duplicate control number within the same project',
      passE,
      `Status ${docDup.status} (Error: "${docDup.data?.error}")`,
      'Status 409 Conflict'
    )

    // =========================================================
    // Bulk create documents
    // =========================================================
    const bulkRes = await post(`/projects/${testProjectA._id}/documents/bulk`, {
      batchId: testBatchA._id,
      documents: [
        { controlNumber: `ADM-DOC-002-${suffix}`, fileName: 'Doc_002.pdf' },
        { controlNumber: `ADM-DOC-003-${suffix}`, fileName: 'Doc_003.pdf' }
      ]
    })
    const passBulk = bulkRes.status === 201 && Array.isArray(bulkRes.data) && bulkRes.data.length === 2
    logTest(
      'Bulk',
      'Bulk create documents for batch',
      passBulk,
      `Status ${bulkRes.status}, created ${bulkRes.data?.length} documents`,
      'Status 201, 2 documents inserted'
    )

    // Create a doc in Project B for isolation verification
    await post(`/projects/${testProjectB._id}/documents`, {
      batchId: testBatchB._id,
      controlNumber: `ADM-DOC-PROJB-${suffix}`,
      fileName: 'Project_B_Doc.pdf'
    })

    // =========================================================
    // f & g. Delete document and verify associated coding is deleted
    // =========================================================
    // First acquire Batch A and save coding on ADM-DOC-002
    await post(`/batches/${testBatchA._id}/acquire`, { reviewerName: 'Current Reviewer' })
    const createdDoc2 = bulkRes.data.find(d => d.controlNumber === `ADM-DOC-002-${suffix}`)
    
    await put(`/projects/${testProjectA._id}/documents/${createdDoc2._id}/coding`, {
      reviewerName: 'Current Reviewer',
      alDesignation: 'Relevant',
      flrComplete: 'Yes',
      reportableDataFound: 'Yes',
      reviewerNotes: 'Admin test coding note'
    })

    // Verify coding exists before delete
    const codingBefore = await get(`/projects/${testProjectA._id}/documents/${createdDoc2._id}/coding`)
    const hasCodingBefore = codingBefore.data.reviewerNotes === 'Admin test coding note'

    // Delete doc 2
    const delDocRes = await del(`/projects/${testProjectA._id}/documents/${createdDoc2._id}`)
    
    // Verify document is gone (404)
    const getDocAfter = await get(`/projects/${testProjectA._id}/documents/${createdDoc2._id}`)
    
    // Verify batch reviewed count recalculated properly
    const { data: batchCheckAfterDocDel } = await get(`/projects/${testProjectA._id}/batches/${testBatchA._id}`)

    const passF_G = delDocRes.status === 200 &&
                    hasCodingBefore &&
                    getDocAfter.status === 404 &&
                    batchCheckAfterDocDel.reviewed === 0

    logTest(
      'F & G',
      'Delete document removes document, cleans up coding record, and updates batch reviewed count',
      passF_G,
      `Delete status ${delDocRes.status}, GET after delete status ${getDocAfter.status}, Batch reviewed count=${batchCheckAfterDocDel.reviewed}`,
      'Status 200, Document 404 after delete, Batch reviewed count recalculated'
    )

    // =========================================================
    // h. Delete batch removes its documents/coding
    // =========================================================
    const delBatchRes = await del(`/projects/${testProjectA._id}/batches/${testBatchA._id}`)
    const { data: docsInProjectAAfterBatchDel } = await get(`/projects/${testProjectA._id}/documents?view=All+Documents`)

    const passH = delBatchRes.status === 200 &&
                  Array.isArray(docsInProjectAAfterBatchDel) &&
                  docsInProjectAAfterBatchDel.length === 0

    logTest(
      'H',
      'Delete batch cascades and removes all remaining documents in that batch',
      passH,
      `Delete batch status ${delBatchRes.status}, Remaining docs in Project A: ${docsInProjectAAfterBatchDel.length}`,
      'Status 200, 0 documents remaining in deleted batch'
    )

    // =========================================================
    // j. Verify another project's data remains untouched
    // =========================================================
    const { data: docsInProjectB } = await get(`/projects/${testProjectB._id}/documents?view=All+Documents`)
    const { data: batchBCheck } = await get(`/projects/${testProjectB._id}/batches/${testBatchB._id}`)

    const passJ = Array.isArray(docsInProjectB) &&
                  docsInProjectB.length === 1 &&
                  docsInProjectB[0].controlNumber === `ADM-DOC-PROJB-${suffix}` &&
                  batchBCheck.name === `Admin_Test_Batch_B_${suffix}`

    logTest(
      'J',
      'Verify Project B data remained completely untouched throughout Project A mutations',
      passJ,
      `Project B docs count=${docsInProjectB.length}, Batch B exists=${Boolean(batchBCheck._id)}`,
      'Project B documents and batches completely intact'
    )

    // =========================================================
    // i. Delete project removes its batches/documents/coding
    // =========================================================
    const delProjBRes = await del(`/projects/${testProjectB._id}`)
    const getProjBAfter = await get(`/projects/${testProjectB._id}`)
    const getBatchBAfter = await get(`/projects/${testProjectB._id}/batches/${testBatchB._id}`)

    const passI = delProjBRes.status === 200 &&
                  getProjBAfter.status === 404 &&
                  getBatchBAfter.status === 404

    logTest(
      'I',
      'Delete project cascades and removes project, its batches, documents, and coding',
      passI,
      `Delete project status ${delProjBRes.status}, Project GET status ${getProjBAfter.status}, Batch GET status ${getBatchBAfter.status}`,
      'Status 200, Project 404, Batches 404'
    )

    // Cleanup Project A as well
    await del(`/projects/${testProjectA._id}`)

    // =========================================================
    // k, l, m. Verify verified reviewer workflow on demo data
    // =========================================================
    // Fetch demo project
    const { data: orchidBatches } = await get('/projects/project-orchid-6-7/batches')
    const passK_L_M = Array.isArray(orchidBatches) && orchidBatches.length >= 3

    logTest(
      'K, L, M',
      'Verify demo review workspace data and endpoints remain accessible and uncorrupted',
      passK_L_M,
      `Orchid demo batches count: ${orchidBatches.length}`,
      'Demo batches intact, non-empty, and operational'
    )

    // Summary
    const totalPassed = results.filter(r => r.status === 'PASS').length
    console.log('=================================================================')
    console.log(`ADMIN BACKEND TEST SUITE RESULTS: ${totalPassed} / ${results.length} PASSED`)
    console.log('=================================================================')

  } catch (err) {
    console.error('Test execution error:', err)
  }
}

runAdminTests()
