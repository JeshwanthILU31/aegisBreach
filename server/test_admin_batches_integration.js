// Integration tests for Admin Step 3: Batch Management APIs & Reviewer Integrity

const BASE_URL = 'http://localhost:5050/api'

async function runTests() {
  console.log('=================================================================')
  console.log('STARTING ADMIN STEP 3 BATCH MANAGEMENT INTEGRATION TESTS')
  console.log('=================================================================\n')

  const results = []

  function logTest(num, name, pass, actual, expected) {
    results.push({ num, name, status: pass ? 'PASS' : 'FAIL', actual, expected })
    console.log(`[TEST ${num}] ${name}: ${pass ? 'PASS' : 'FAIL'}`)
    console.log(`   Expected: ${expected}`)
    console.log(`   Actual:   ${actual}\n`)
  }

  const get = (url) => fetch(`${BASE_URL}${url}`).then(async (r) => ({ status: r.status, data: await r.json() }))
  const post = (url, body) => fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(async (r) => ({ status: r.status, data: await r.json() }))
  const put = (url, body) => fetch(`${BASE_URL}${url}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(async (r) => ({ status: r.status, data: await r.json() }))
  const del = (url) => fetch(`${BASE_URL}${url}`, { method: 'DELETE' }).then(async (r) => ({ status: r.status, data: await r.json() }))

  try {
    const suffix = Date.now()

    // Setup: Create an isolated temporary test project
    const tempProjRes = await post('/projects', {
      name: `Batch_Admin_Test_Project_${suffix}`,
      slug: `batch-admin-test-proj-${suffix}`,
      matterName: 'Batch Admin Test Matter',
      status: 'Active'
    })
    const tempProj = tempProjRes.data
    const tempProjId = tempProj._id

    // Setup: Create a second project to verify cross-project isolation
    const otherProjRes = await post('/projects', {
      name: `Other_Project_${suffix}`,
      slug: `other-proj-${suffix}`,
      matterName: 'Other Matter',
      status: 'Active'
    })
    const otherProjId = otherProjRes.data._id

    // Test A: List batches for project (initially empty or returns array)
    const tA = await get(`/projects/${tempProjId}/batches`)
    const passA = tA.status === 200 && Array.isArray(tA.data)
    logTest('A', 'List batches for project', passA, `Status ${tA.status}, count=${tA.data?.length}`, 'Status 200, array returned')

    // Test B: Create batch with clean initial defaults
    const batchPayload = {
      name: `Test_Batch_Alpha_${suffix}`,
      batchSet: 'Batch Set Alpha',
      batchUnit: 'Unit Alpha',
      batchSize: 25,
      status: 'Available'
    }
    const tB = await post(`/projects/${tempProjId}/batches`, batchPayload)
    const passB = tB.status === 201 &&
      tB.data.name === batchPayload.name &&
      tB.data.batchSet === batchPayload.batchSet &&
      tB.data.batchSize === 25 &&
      tB.data.status === 'Available' &&
      tB.data.isLocked === false &&
      tB.data.reviewed === 0
    logTest('B', 'Create batch with clean defaults', passB, `Status ${tB.status}, ID=${tB.data?._id}, isLocked=${tB.data?.isLocked}, reviewed=${tB.data?.reviewed}`, 'Status 201, clean default state')

    const createdBatchId = tB.data._id

    // Test C: Reject invalid project
    const tC = await post('/projects/nonexistent-project-slug-9999/batches', { name: 'Orphan Batch' })
    const passC = tC.status === 404
    logTest('C', 'Reject batch creation on invalid project', passC, `Status ${tC.status} (Error: "${tC.data?.error}")`, 'Status 404 Project not found')

    // Test D: Reject invalid batch data (missing name)
    const tD = await post(`/projects/${tempProjId}/batches`, { batchSet: 'No Name Set' })
    const passD = tD.status === 400
    logTest('D', 'Reject invalid batch data (missing name)', passD, `Status ${tD.status} (Error: "${tD.data?.error}")`, 'Status 400 Bad Request')

    // Test E: Edit batch metadata
    const editPayload = {
      name: `Test_Batch_Alpha_Updated_${suffix}`,
      batchSet: 'Batch Set Alpha Updated',
      batchUnit: 'Unit Beta',
      batchSize: 30
    }
    const tE = await put(`/projects/${tempProjId}/batches/${createdBatchId}`, editPayload)
    const passE = tE.status === 200 &&
      tE.data.name === editPayload.name &&
      tE.data.batchSet === editPayload.batchSet &&
      tE.data.batchSize === 30
    logTest('E', 'Edit batch metadata via PUT', passE, `Status ${tE.status}, updated name="${tE.data?.name}", size=${tE.data?.batchSize}`, 'Status 200, updated batch returned')

    // Setup documents & coding for cascade deletion test
    const doc1Res = await post(`/projects/${tempProjId}/documents`, {
      controlNumber: `TEST-DOC-1-${suffix}`,
      batchId: createdBatchId,
      documentTitle: 'Document 1 for Batch Cascade'
    })
    const doc2Res = await post(`/projects/${tempProjId}/documents`, {
      controlNumber: `TEST-DOC-2-${suffix}`,
      batchId: createdBatchId,
      documentTitle: 'Document 2 for Batch Cascade'
    })
    // Add coding for doc1
    await put(`/projects/${tempProjId}/documents/TEST-DOC-1-${suffix}/coding`, {
      flrReviewedBy: 'Current Reviewer',
      extractionStatus: 'Completed',
      comments: 'Test coding for cascade'
    })

    // Test F & G: Delete batch and verify cascade removes its documents and coding
    const tF = await del(`/projects/${tempProjId}/batches/${createdBatchId}`)
    const getBatchVerify = await get(`/projects/${tempProjId}/batches/${createdBatchId}`)
    const passF = tF.status === 200 && getBatchVerify.status === 404
    logTest('F', 'Delete batch via DELETE /api/projects/:projectId/batches/:batchId', passF, `Delete status ${tF.status}, verify status ${getBatchVerify.status}`, 'Status 200, batch removed (404)')

    const getDoc1 = await get(`/projects/${tempProjId}/documents/TEST-DOC-1-${suffix}`)
    const getDoc2 = await get(`/projects/${tempProjId}/documents/TEST-DOC-2-${suffix}`)
    const getCoding1 = await get(`/projects/${tempProjId}/documents/TEST-DOC-1-${suffix}/coding`)
    const passG = getDoc1.status === 404 && getDoc2.status === 404 && (!getCoding1.data?.flrReviewedBy)
    logTest('G', 'Verify cascade removes batch documents & coding records', passG, `Doc1 status ${getDoc1.status}, Doc2 status ${getDoc2.status}`, 'Documents & coding cascade deleted')

    // Test H: Verify another project's batches remain untouched
    const otherBatchRes = await post(`/projects/${otherProjId}/batches`, {
      name: `Other_Project_Batch_${suffix}`,
      batchSize: 10
    })
    const otherBatchId = otherBatchRes.data._id

    const otherBatchesList = await get(`/projects/${otherProjId}/batches`)
    const passH = otherBatchesList.status === 200 && otherBatchesList.data.some(b => b._id === otherBatchId)
    logTest('H', 'Verify other project batches remain untouched', passH, `Other project batch count=${otherBatchesList.data?.length}`, 'Isolated project batches unaffected')

    // Test I: Verify existing batch acquisition still works
    const acqBatchRes = await post(`/projects/${tempProjId}/batches`, {
      name: `Acquisition_Test_Batch_${suffix}`,
      batchSize: 5
    })
    const acqBatchId = acqBatchRes.data._id

    const acquireRes = await post(`/projects/${tempProjId}/batches/${acqBatchId}/acquire`, {
      reviewerName: `Reviewer_Temp_${suffix}`
    })
    const passI = acquireRes.status === 200 &&
      acquireRes.data.isLocked === true &&
      acquireRes.data.status === 'In Progress' &&
      acquireRes.data.assignedToName === `Reviewer_Temp_${suffix}`
    logTest('I', 'Verify batch acquisition works and updates lock/status/assignee', passI, `Status ${acquireRes.status}, isLocked=${acquireRes.data?.isLocked}, assignedTo=${acquireRes.data?.assignedToName}`, 'Status 200, batch locked by reviewer')

    // Test J: Verify single-active-batch rule still works
    const secondBatchRes = await post(`/projects/${tempProjId}/batches`, {
      name: `Second_Batch_${suffix}`,
      batchSize: 5
    })
    const secondBatchId = secondBatchRes.data._id

    const acquireSecondRes = await post(`/projects/${tempProjId}/batches/${secondBatchId}/acquire`, {
      reviewerName: `Reviewer_Temp_${suffix}`
    })
    const passJ = acquireSecondRes.status === 409
    logTest('J', 'Verify single-active-batch rule prevents acquiring 2nd batch', passJ, `Status ${acquireSecondRes.status} (Error: "${acquireSecondRes.data?.error}")`, 'Status 409 Conflict')

    // Test K: Verify active reviewer batch is not accidentally reassigned/unlocked via admin edit
    const adminEditActiveBatchRes = await put(`/projects/${tempProjId}/batches/${acqBatchId}`, {
      name: `Acquisition_Renamed_${suffix}`,
      assignedToName: '', // Trying to clear assignment
      isLocked: false     // Trying to force unlock
    })
    const passK = adminEditActiveBatchRes.status === 200 &&
      adminEditActiveBatchRes.data.isLocked === true &&
      adminEditActiveBatchRes.data.assignedToName === `Reviewer_Temp_${suffix}` &&
      adminEditActiveBatchRes.data.name === `Acquisition_Renamed_${suffix}`
    logTest('K', 'Verify Current Reviewer active batch is not accidentally reassigned/unlocked', passK, `Status ${adminEditActiveBatchRes.status}, isLocked=${adminEditActiveBatchRes.data?.isLocked}, assignedTo=${adminEditActiveBatchRes.data?.assignedToName}`, 'Reviewer lock and assignment protected during admin edit')

    // Test L: Verify batch reviewed count remains accurate after document review
    const acqDocRes = await post(`/projects/${tempProjId}/documents`, {
      controlNumber: `ACQ-DOC-1-${suffix}`,
      batchId: acqBatchId,
      fileName: 'reviewable_doc_1.pdf'
    })
    await put(`/projects/${tempProjId}/documents/ACQ-DOC-1-${suffix}/coding`, {
      reviewerName: `Reviewer_Temp_${suffix}`,
      flrReviewedBy: `Reviewer_Temp_${suffix}`,
      extractionStatus: 'Completed'
    })
    const getAcqBatch = await get(`/projects/${tempProjId}/batches/${acqBatchId}`)
    const passL = getAcqBatch.status === 200 && getAcqBatch.data.reviewed === 1
    logTest('L', 'Verify batch reviewed count accurately reflects completed documents', passL, `Status ${getAcqBatch.status}, reviewed=${getAcqBatch.data?.reviewed} / ${getAcqBatch.data?.batchSize}`, 'Batch reviewed count matches reviewed documents (1)')

    // Cleanup: Remove temporary test projects (which cascade removes test batches & documents)
    await del(`/projects/${tempProjId}`)
    await del(`/projects/${otherProjId}`)

    // Summary
    const totalPassed = results.filter(r => r.status === 'PASS').length
    console.log('=================================================================')
    console.log(`ADMIN STEP 3 TEST RESULTS: ${totalPassed} / ${results.length} PASSED`)
    console.log('=================================================================')

  } catch (err) {
    console.error('Test execution error:', err)
  }
}

runTests()
