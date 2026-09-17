// Native fetch in Node 18+

const BASE_URL = 'http://localhost:5050/api'
const PROJECT_ID = 'project-orchid-6-7'
const REVIEWER = 'Current Reviewer'

async function runTests() {
  console.log('=================================================================')
  console.log('STARTING END-TO-END VERIFICATION: REVIEW -> BATCH -> DOCS -> FLR')
  console.log('=================================================================\n')

  const results = []

  function logTest(testNum, name, pass, actual, expected, apiRoute, file, reason = '') {
    const res = {
      testNum,
      name,
      status: pass ? 'PASS' : 'FAIL',
      actual,
      expected,
      apiRoute,
      file,
      reason,
    }
    results.push(res)
    console.log(`[TEST ${testNum}] ${name}: ${res.status}`)
    console.log(`   Expected: ${expected}`)
    console.log(`   Actual:   ${actual}`)
    console.log(`   API:      ${apiRoute}`)
    console.log(`   File:     ${file}`)
    if (!pass) console.log(`   Reason:   ${reason}`)
    console.log('')
  }

  // Helper fetch
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

  try {
    // 0. Fetch initial batches
    const { data: initialBatches } = await get(`/projects/${PROJECT_ID}/batches`)
    const batch1 = initialBatches.find(b => b.name === 'Monday Batch1_00017')
    const batch2 = initialBatches.find(b => b.name === 'Monday Batch1_00015')
    const batch3 = initialBatches.find(b => b.name === 'Monday Batch1_00012')

    if (!batch1 || !batch2 || !batch3) {
      throw new Error('Initial batches not found. Please run npm run seed first.')
    }

    // ==========================================
    // TEST 1: Acquire Batch 1
    // ==========================================
    const t1Res = await post(`/batches/${batch1._id}/acquire`, { reviewerName: REVIEWER })
    const t1Pass = t1Res.status === 200 &&
                   t1Res.data.status === 'In Progress' &&
                   t1Res.data.isLocked === true &&
                   t1Res.data.assignedToName === REVIEWER

    logTest(
      1,
      'Acquire Batch 1',
      t1Pass,
      `Status ${t1Res.status}, status="${t1Res.data.status}", isLocked=${t1Res.data.isLocked}, assignedToName="${t1Res.data.assignedToName}"`,
      'Status 200, status="In Progress", isLocked=true, assignedToName="Current Reviewer"',
      'POST /api/batches/:batchId/acquire',
      'server/src/controllers/batchController.js & batchService.js'
    )

    // ==========================================
    // TEST 2: Attempt to acquire Batch 2 while Batch 1 is still incomplete
    // ==========================================
    const t2Res = await post(`/batches/${batch2._id}/acquire`, { reviewerName: REVIEWER })
    const { data: b2Check } = await get(`/projects/${PROJECT_ID}/batches/${batch2._id}`)
    const t2Pass = t2Res.status === 409 &&
                   b2Check.status === 'Available' &&
                   b2Check.isLocked === false

    logTest(
      2,
      'Attempt to acquire Batch 2 while Batch 1 is incomplete',
      t2Pass,
      `Status ${t2Res.status} (Error: "${t2Res.data.error}"), Batch 2 status="${b2Check.status}", isLocked=${b2Check.isLocked}`,
      'Status 409 Conflict, Batch 2 remains Available and unlocked',
      'POST /api/batches/:batchId/acquire',
      'server/src/services/batchService.js'
    )

    // ==========================================
    // TEST 3: Open "My Batched Out Docs"
    // ==========================================
    const t3Res = await get(`/projects/${PROJECT_ID}/documents?view=My+Batched+Out+Docs&reviewerName=${encodeURIComponent(REVIEWER)}`)
    const t3Docs = t3Res.data
    const t3ControlNumbers = t3Docs.map(d => d.controlNumber)
    const t3Pass = t3Res.status === 200 &&
                   t3Docs.length === 3 &&
                   t3ControlNumbers.includes('OR-600001') &&
                   t3ControlNumbers.includes('OR-600002') &&
                   t3ControlNumbers.includes('OR-600003') &&
                   !t3ControlNumbers.includes('OR-600004')

    logTest(
      3,
      'Open "My Batched Out Docs"',
      t3Pass,
      `Returned ${t3Docs.length} documents: [${t3ControlNumbers.join(', ')}]`,
      'ONLY Batch 1 documents (OR-600001, OR-600002, OR-600003) returned',
      'GET /api/projects/:projectId/documents?view=My+Batched+Out+Docs',
      'server/src/services/documentService.js'
    )

    // ==========================================
    // TEST 4: Open each Batch 1 document & verify FLR layout fields
    // ==========================================
    let t4Pass = true
    let t4Details = []
    for (const doc of t3Docs) {
      const docCodingRes = await get(`/projects/${PROJECT_ID}/documents/${doc._id}/coding`)
      const dData = docCodingRes.data
      const hasNoSensitive = !('highlySensitive' in dData) && !('sensitiveOptions' in dData)
      const hasFlrFields = 'alDesignation' in dData && 'flrComplete' in dData && 'reportableDataFound' in dData && 'extractionStatus' in dData
      const isEditable = dData.readOnly === false
      if (docCodingRes.status !== 200 || !hasNoSensitive || !hasFlrFields || !isEditable) {
        t4Pass = false
      }
      t4Details.push(`${doc.controlNumber}: readOnly=${dData.readOnly}, flrFields=${hasFlrFields}, sensitiveRemoved=${hasNoSensitive}`)
    }

    logTest(
      4,
      'Open each Batch 1 document & verify FLR fields',
      t4Pass,
      t4Details.join(' | '),
      'Status 200, FLR fields present, Highly Sensitive section absent, readOnly=false',
      'GET /api/projects/:projectId/documents/:documentId/coding',
      'server/src/controllers/codingController.js & client/src/components/coding/CodingPage.jsx'
    )

    // ==========================================
    // TEST 5: Save/complete some but NOT all Batch 1 documents
    // ==========================================
    // Code doc 1 (OR-600001)
    const doc1 = t3Docs[0]
    const doc2 = t3Docs[1]
    const doc3 = t3Docs[2]

    const t5Code1 = await put(`/projects/${PROJECT_ID}/documents/${doc1._id}/coding`, {
      reviewerName: REVIEWER,
      alDesignation: 'Relevant',
      flrComplete: 'Yes',
      reportableDataFound: 'Yes',
      extractionStatus: 'Completed',
      reviewerNotes: 'Document 1 FLR review complete',
    })

    // Code doc 2 (OR-600002)
    const t5Code2 = await put(`/projects/${PROJECT_ID}/documents/${doc2._id}/coding`, {
      reviewerName: REVIEWER,
      alDesignation: 'Relevant',
      flrComplete: 'Yes',
      reportableDataFound: 'No',
      extractionStatus: 'Completed',
      reviewerNotes: 'Document 2 FLR review complete',
    })

    const { data: b1MidCheck } = await get(`/projects/${PROJECT_ID}/batches/${batch1._id}`)
    const t5AcquireB2 = await post(`/batches/${batch2._id}/acquire`, { reviewerName: REVIEWER })

    const t5Pass = t5Code1.status === 200 &&
                   t5Code2.status === 200 &&
                   t5Code1.data.batchCompleted === false &&
                   b1MidCheck.status === 'In Progress' &&
                   b1MidCheck.isLocked === true &&
                   t5AcquireB2.status === 409

    logTest(
      5,
      'Save/complete 2 of 3 Batch 1 documents',
      t5Pass,
      `Doc 1 & 2 coded, batchCompleted=${t5Code2.data.batchCompleted}, Batch 1 status="${b1MidCheck.status}" (reviewed=${b1MidCheck.reviewed}/3), Acquire Batch 2 rejected with status ${t5AcquireB2.status}`,
      'Documents saved, Batch 1 remains In Progress, Acquire Batch 2 rejected',
      'PUT /api/projects/:projectId/documents/:documentId/coding',
      'server/src/controllers/codingController.js'
    )

    // ==========================================
    // TEST 6: Complete the final Batch 1 document
    // ==========================================
    const t6Code3 = await put(`/projects/${PROJECT_ID}/documents/${doc3._id}/coding`, {
      reviewerName: REVIEWER,
      alDesignation: 'Relevant',
      flrComplete: 'Yes',
      reportableDataFound: 'Yes',
      extractionStatus: 'Completed',
      reviewerNotes: 'Document 3 FLR review complete',
    })

    const { data: b1FinalCheck } = await get(`/projects/${PROJECT_ID}/batches/${batch1._id}`)
    const t6Pass = t6Code3.status === 200 &&
                   t6Code3.data.batchCompleted === true &&
                   b1FinalCheck.status === 'Completed' &&
                   b1FinalCheck.isLocked === false

    logTest(
      6,
      'Complete the final Batch 1 document',
      t6Pass,
      `batchCompleted=${t6Code3.data.batchCompleted}, Batch 1 status="${b1FinalCheck.status}", isLocked=${b1FinalCheck.isLocked}, reviewed=${b1FinalCheck.reviewed}`,
      'All docs complete, Batch 1 transitions to Completed, isLocked=false',
      'PUT /api/projects/:projectId/documents/:documentId/coding',
      'server/src/controllers/codingController.js'
    )

    // ==========================================
    // TEST 7: Acquire Batch 2
    // ==========================================
    const t7Res = await post(`/batches/${batch2._id}/acquire`, { reviewerName: REVIEWER })
    const t7MyDocs = await get(`/projects/${PROJECT_ID}/documents?view=My+Batched+Out+Docs&reviewerName=${encodeURIComponent(REVIEWER)}`)
    const t7ControlNumbers = t7MyDocs.data.map(d => d.controlNumber)

    const t7Pass = t7Res.status === 200 &&
                   t7Res.data.status === 'In Progress' &&
                   t7Res.data.isLocked === true &&
                   t7MyDocs.data.length === 3 &&
                   t7ControlNumbers.includes('OR-600004') &&
                   t7ControlNumbers.includes('OR-600005') &&
                   t7ControlNumbers.includes('OR-600006') &&
                   !t7ControlNumbers.includes('OR-600001')

    logTest(
      7,
      'Acquire Batch 2',
      t7Pass,
      `Status ${t7Res.status}, Batch 2 isLocked=${t7Res.data.isLocked}, My Batched Out Docs: [${t7ControlNumbers.join(', ')}]`,
      'Batch 2 acquired, becomes In Progress, ONLY Batch 2 docs returned in My Batched Out Docs',
      'POST /api/batches/:batchId/acquire',
      'server/src/services/batchService.js & documentService.js'
    )

    // ==========================================
    // TEST 8: Repeat process for Batch 2 -> Complete Batch 2
    // ==========================================
    const b2Docs = t7MyDocs.data
    for (const b2d of b2Docs) {
      await put(`/projects/${PROJECT_ID}/documents/${b2d._id}/coding`, {
        reviewerName: REVIEWER,
        alDesignation: 'Relevant',
        flrComplete: 'Yes',
        reportableDataFound: 'Yes',
        extractionStatus: 'Completed',
        reviewerNotes: `Batch 2 ${b2d.controlNumber} complete`,
      })
    }
    const { data: b2FinalCheck } = await get(`/projects/${PROJECT_ID}/batches/${batch2._id}`)
    const t8AcquireB3 = await post(`/batches/${batch3._id}/acquire`, { reviewerName: REVIEWER })

    const t8Pass = b2FinalCheck.status === 'Completed' &&
                   b2FinalCheck.isLocked === false &&
                   t8AcquireB3.status === 200 &&
                   t8AcquireB3.data.status === 'In Progress'

    logTest(
      8,
      'Repeat process for Batch 2 and Acquire Batch 3',
      t8Pass,
      `Batch 2 status="${b2FinalCheck.status}", Batch 3 acquire status=${t8AcquireB3.status} (status="${t8AcquireB3.data.status}")`,
      'Batch 2 transitions to Completed, Reviewer successfully acquires Batch 3',
      'PUT /api/projects/:projectId/documents/:documentId/coding & POST /api/batches/:batchId/acquire',
      'server/src/controllers/codingController.js & batchService.js'
    )

    // Reset Batch 3 for concurrency test: complete it
    const t8MyDocs = await get(`/projects/${PROJECT_ID}/documents?view=My+Batched+Out+Docs&reviewerName=${encodeURIComponent(REVIEWER)}`)
    for (const b3d of t8MyDocs.data) {
      await put(`/projects/${PROJECT_ID}/documents/${b3d._id}/coding`, {
        reviewerName: REVIEWER,
        flrComplete: 'Yes',
      })
    }

    // ==========================================
    // TEST 9 — CONCURRENCY: Simultaneous acquisition of the same batch
    // ==========================================
    // Let's create an available test batch for concurrency
    const concBatchRes = await post(`/projects/${PROJECT_ID}/batches`, {
      name: `Concurrency_Test_Batch_${Date.now()}`,
      batchSet: 'Monday Batch1',
      batchUnit: 'Alternate Workflow 6+ Entries',
      status: 'Available',
      isLocked: false,
    })
    const concBatch = concBatchRes.data

    const [reqA, reqB] = await Promise.all([
      post(`/batches/${concBatch._id}/acquire`, { reviewerName: 'Simulated User A' }),
      post(`/batches/${concBatch._id}/acquire`, { reviewerName: 'Simulated User B' })
    ])

    const successCount = (reqA.status === 200 ? 1 : 0) + (reqB.status === 200 ? 1 : 0)
    const conflictCount = (reqA.status === 409 ? 1 : 0) + (reqB.status === 409 ? 1 : 0)
    const { data: concBatchCheck } = await get(`/projects/${PROJECT_ID}/batches/${concBatch._id}`)

    const t9Pass = successCount === 1 && conflictCount === 1 && concBatchCheck.isLocked === true

    logTest(
      9,
      'Simultaneous Batch Acquisition Concurrency',
      t9Pass,
      `Req A status: ${reqA.status}, Req B status: ${reqB.status}, Total Success: ${successCount}, Total Conflict: ${conflictCount}, Owner: "${concBatchCheck.assignedToName}"`,
      'Exactly ONE request succeeds (200), ONE receives Conflict (409)',
      'POST /api/batches/:batchId/acquire',
      'server/src/services/batchService.js'
    )

    // ==========================================
    // TEST 10 — RELOAD / PERSISTENCE
    // ==========================================
    // Verify that all states (Batch 1 Completed, Batch 2 Completed, Coding entries) exist in MongoDB
    const { data: allBatchesAfter } = await get(`/projects/${PROJECT_ID}/batches`)
    const b1After = allBatchesAfter.find(b => b._id === batch1._id)
    const b2After = allBatchesAfter.find(b => b._id === batch2._id)
    const { data: doc1CodingAfter } = await get(`/projects/${PROJECT_ID}/documents/${doc1._id}/coding`)

    const t10Pass = b1After.status === 'Completed' &&
                    b2After.status === 'Completed' &&
                    doc1CodingAfter.reportableDataFound === 'Yes' &&
                    doc1CodingAfter.reviewerNotes === 'Document 1 FLR review complete'

    logTest(
      10,
      'Reload & MongoDB Persistence Verification',
      t10Pass,
      `Batch 1 status in DB="${b1After.status}", Batch 2 status in DB="${b2After.status}", Doc 1 Notes="${doc1CodingAfter.reviewerNotes}"`,
      'All batch ownerships, statuses, document review statuses, and notes persist in MongoDB',
      'GET /api/projects/:projectId/batches & GET /api/projects/:projectId/documents/:id/coding',
      'server/src/models/Batch.js, Document.js, Coding.js'
    )

    // Summary
    const totalPassed = results.filter(r => r.status === 'PASS').length
    console.log('=================================================================')
    console.log(`TEST SUITE COMPLETED: ${totalPassed} / ${results.length} PASSED`)
    console.log('=================================================================')

  } catch (err) {
    console.error('Test execution error:', err)
  }
}

runTests()
