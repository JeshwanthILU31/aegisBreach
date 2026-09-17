// Backend Integration Test for Cloudinary Phase 1 (Upload endpoint, validations, MongoDB storage)
import dotenv from 'dotenv'
dotenv.config()

const BASE_URL = 'http://localhost:5050/api'

async function runTests() {
  console.log('=================================================================')
  console.log('STARTING CLOUDINARY PHASE 1 INTEGRATION TESTS')
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
  const del = (url) => fetch(`${BASE_URL}${url}`, { method: 'DELETE' }).then(async (r) => ({ status: r.status, data: await r.json() }))

  const uploadFile = (url, fileBlob, filename) => {
    const formData = new FormData()
    if (fileBlob) {
      formData.append('file', fileBlob, filename || 'test.pdf')
    }
    return fetch(`${BASE_URL}${url}`, {
      method: 'POST',
      body: formData
    }).then(async (r) => ({ status: r.status, data: await r.json() }))
  }

  try {
    const suffix = Date.now()

    // Setup: Isolated temporary project
    const projRes = await post('/projects', {
      name: `Cloudinary_Test_Project_${suffix}`,
      slug: `cloudinary-test-proj-${suffix}`,
      matterName: 'Cloudinary Test Matter',
      status: 'Active'
    })
    const projId = projRes.data._id

    // Setup: Batch 1 in Project
    const batch1Res = await post(`/projects/${projId}/batches`, {
      name: `Cloudinary_Batch_1_${suffix}`,
      batchSet: 'Batch Set 1',
      batchSize: 10
    })
    const batch1Id = batch1Res.data._id

    // Setup: Batch 2 in Project (for cross-batch check)
    const batch2Res = await post(`/projects/${projId}/batches`, {
      name: `Cloudinary_Batch_2_${suffix}`,
      batchSet: 'Batch Set 2',
      batchSize: 10
    })
    const batch2Id = batch2Res.data._id

    // Setup: Document 1 in Batch 1
    const doc1Res = await post(`/projects/${projId}/documents`, {
      batchId: batch1Id,
      controlNumber: `CLD-DOC-1-${suffix}`,
      fileName: 'contract_unattached.pdf'
    })
    const doc1 = doc1Res.data
    const doc1Id = doc1.controlNumber

    // Setup: Document 2 in Batch 2
    const doc2Res = await post(`/projects/${projId}/documents`, {
      batchId: batch2Id,
      controlNumber: `CLD-DOC-2-${suffix}`,
      fileName: 'batch2_unattached.pdf'
    })
    const doc2Id = doc2Res.data.controlNumber

    // TEST 1: Reject missing file
    const t1 = await uploadFile(`/projects/${projId}/batches/${batch1Id}/documents/${doc1Id}/file`, null)
    const pass1 = t1.status === 400
    logTest(1, 'Reject upload when no file provided', pass1, `Status ${t1.status} (Error: "${t1.data?.error}")`, 'Status 400 Bad Request')

    // TEST 2: Reject upload for nonexistent project
    const pdfBlob = new Blob(['%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF'], { type: 'application/pdf' })
    const t2 = await uploadFile(`/projects/nonexistent-proj-slug/batches/${batch1Id}/documents/${doc1Id}/file`, pdfBlob, 'doc.pdf')
    const pass2 = t2.status === 404
    logTest(2, 'Reject upload for nonexistent project', pass2, `Status ${t2.status} (Error: "${t2.data?.error}")`, 'Status 404 Project not found')

    // TEST 3: Reject upload for nonexistent batch
    const fakeBatchId = '507f1f77bcf86cd799439011'
    const t3 = await uploadFile(`/projects/${projId}/batches/${fakeBatchId}/documents/${doc1Id}/file`, pdfBlob, 'doc.pdf')
    const pass3 = t3.status === 404
    logTest(3, 'Reject upload for nonexistent batch', pass3, `Status ${t3.status} (Error: "${t3.data?.error}")`, 'Status 404 Batch not found')

    // TEST 4: Reject upload for nonexistent document
    const t4 = await uploadFile(`/projects/${projId}/batches/${batch1Id}/documents/NONEXISTENT-DOC-ID/file`, pdfBlob, 'doc.pdf')
    const pass4 = t4.status === 404
    logTest(4, 'Reject upload for nonexistent document', pass4, `Status ${t4.status} (Error: "${t4.data?.error}")`, 'Status 404 Document not found')

    // TEST 5: Reject upload when document belongs to another batch
    const t5 = await uploadFile(`/projects/${projId}/batches/${batch1Id}/documents/${doc2Id}/file`, pdfBlob, 'doc.pdf')
    const pass5 = t5.status === 400
    logTest(5, 'Reject upload when document belongs to another batch', pass5, `Status ${t5.status} (Error: "${t5.data?.error}")`, 'Status 400 Mismatched batch')

    // TEST 6: Reject unsafe/blocked file types (.exe, .sh, .zip)
    const exeBlob = new Blob(['MZ\x90\x00\x03\x00\x00\x00'], { type: 'application/octet-stream' })
    const t6 = await uploadFile(`/projects/${projId}/batches/${batch1Id}/documents/${doc1Id}/file`, exeBlob, 'malicious.exe')
    const pass6 = t6.status === 400
    logTest(6, 'Reject unsafe blocked file extension (.exe)', pass6, `Status ${t6.status} (Error: "${t6.data?.error}")`, 'Status 400 Blocked file type')

    // TEST 7: Upload valid PDF document to Cloudinary
    const t7 = await uploadFile(`/projects/${projId}/batches/${batch1Id}/documents/${doc1Id}/file`, pdfBlob, 'sample_agreement.pdf')
    const hasCloudinary = t7.status === 200 && Boolean(t7.data.fileUrl) && Boolean(t7.data.cloudinaryPublicId)
    const pass7 = hasCloudinary && t7.data.fileName === 'sample_agreement.pdf' && t7.data.controlNumber === `CLD-DOC-1-${suffix}`
    logTest(7, 'Upload valid PDF document and verify MongoDB metadata', pass7, `Status ${t7.status}, fileUrl="${t7.data?.fileUrl}", publicId="${t7.data?.cloudinaryPublicId}", format="${t7.data?.format}"`, 'Status 200, secure_url and public_id populated')

    // TEST 8: Verify GET document endpoint returns Cloudinary fileUrl
    const t8 = await get(`/projects/${projId}/documents/${doc1Id}`)
    const pass8 = t8.status === 200 && t8.data.fileUrl === t7.data.fileUrl && t8.data.cloudinaryPublicId === t7.data.cloudinaryPublicId
    logTest(8, 'Verify GET document returns populated fileUrl and storage metadata', pass8, `Status ${t8.status}, fileUrl="${t8.data?.fileUrl}"`, 'Status 200, matching fileUrl')

    // TEST 9: Replacement upload (upload new version to the same document)
    const imageBlob = new Blob(['PNG_MOCK_IMAGE_DATA_BYTES'], { type: 'image/png' })
    const t9 = await uploadFile(`/projects/${projId}/batches/${batch1Id}/documents/${doc1Id}/file`, imageBlob, 'updated_chart.png')
    const pass9 = t9.status === 200 && Boolean(t9.data.fileUrl) && t9.data.fileName === 'updated_chart.png'
    logTest(9, 'Replace existing document file with new asset', pass9, `Status ${t9.status}, new file="${t9.data?.fileName}", new URL="${t9.data?.fileUrl}"`, 'Status 200, asset updated in DB')

    // Cleanup: Remove isolated test project (which cascades MongoDB data)
    await del(`/projects/${projId}`)

    // Summary
    const totalPassed = results.filter(r => r.status === 'PASS').length
    console.log('=================================================================')
    console.log(`CLOUDINARY PHASE 1 TEST RESULTS: ${totalPassed} / ${results.length} PASSED`)
    console.log('=================================================================')

  } catch (err) {
    console.error('Test execution error:', err)
  }
}

runTests()
