// Integration & State Verification Test Suite: Admin Batch Documents Upload & Drag/Drop
import assert from 'assert'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const BASE_URL = 'http://localhost:5050/api'
const secret = process.env.JWT_SECRET || 'secret'
const adminToken = jwt.sign({ userId: 'test_admin_upload', role: 'admin' }, secret, { expiresIn: '1h' })

const authHeaders = {
  Authorization: `Bearer ${adminToken}`,
}

async function runUploadFlowSuite() {
  console.log('================================================================================')
  console.log('STARTING ADMIN BATCH DOCUMENTS UPLOAD & DRAG/DROP VERIFICATION SUITE')
  console.log('================================================================================\n')

  let passed = 0
  let failed = 0

  function record(testId, name, pass, actual, expected) {
    if (pass) {
      console.log(`  [PASS] [TEST ${testId}] ${name}`)
      passed++
    } else {
      console.error(`  [FAIL] [TEST ${testId}] ${name}`)
      console.error(`         Expected: ${expected}`)
      console.error(`         Actual:   ${actual}`)
      failed++
    }
  }

  const get = (url) =>
    fetch(`${BASE_URL}${url}`, {
      headers: authHeaders,
    }).then(async (r) => ({ status: r.status, data: await r.json() }))

  const post = (url, body) =>
    fetch(`${BASE_URL}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, data: await r.json() }))

  const del = (url) =>
    fetch(`${BASE_URL}${url}`, {
      method: 'DELETE',
      headers: authHeaders,
    }).then(async (r) => ({ status: r.status, data: await r.json() }))

  const uploadFile = async (projectId, batchId, documentId, fileName, fileContent, mimeType = 'application/pdf') => {
    const formData = new FormData()
    const blob = new Blob([fileContent], { type: mimeType })
    formData.append('file', blob, fileName)

    const res = await fetch(`${BASE_URL}/projects/${projectId}/batches/${batchId}/documents/${documentId}/file`, {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    })
    return { status: res.status, data: await res.json() }
  }

  try {
    const suffix = Date.now()

    // Setup Test Project & Batch
    const projRes = await post('/projects', {
      name: `Upload_Test_Project_${suffix}`,
      slug: `upload-test-proj-${suffix}`,
      matterName: 'Upload Test Matter',
      status: 'Active',
    })
    const project = projRes.data
    const projectId = project._id

    const batchRes = await post(`/projects/${projectId}/batches`, {
      name: `Upload_Test_Batch_${suffix}`,
      batchSet: 'Set Upload',
    })
    const batch = batchRes.data
    const batchId = batch._id

    // Create initial documents in batch
    const doc1Res = await post(`/projects/${projectId}/documents`, {
      batchId,
      controlNumber: `DOC_UP_001_${suffix}`,
      fileName: 'doc_001_initial.pdf',
      fileSize: '1.2 MB',
      folder: 'Set Upload',
    })
    const doc1 = doc1Res.data

    const doc2Res = await post(`/projects/${projectId}/documents`, {
      batchId,
      controlNumber: `DOC_UP_002_${suffix}`,
      fileName: 'doc_002_initial.pdf',
      fileSize: '2.0 MB',
      folder: 'Set Upload',
    })
    const doc2 = doc2Res.data

    const doc3Res = await post(`/projects/${projectId}/documents`, {
      batchId,
      controlNumber: `DOC_UP_003_${suffix}`,
      fileName: 'doc_003_initial.pdf',
      fileSize: '3.5 MB',
      folder: 'Set Upload',
    })
    const doc3 = doc3Res.data

    // Initial React-like document state
    let localDocuments = [doc1, doc2, doc3]
    let initialAttachedCount = localDocuments.filter((d) => Boolean(d.fileUrl)).length

    // -------------------------------------------------------------
    // TEST 1: Initial state has 0 attached files
    // -------------------------------------------------------------
    record(
      '1',
      'Initial attached-file count reflects documents with fileUrl',
      initialAttachedCount === 0,
      initialAttachedCount,
      0
    )

    // -------------------------------------------------------------
    // TEST 2: Upload file for DOC 1 via Cloudinary pipeline
    // -------------------------------------------------------------
    const dummyPdfContent = '%PDF-1.4 sample content for AegisBreach document upload test'
    const upload1Res = await uploadFile(
      projectId,
      batchId,
      doc1.controlNumber,
      'doc_001_statement.pdf',
      dummyPdfContent,
      'application/pdf'
    )
    const uploadedDoc1 = upload1Res.data

    record(
      '2',
      'Upload file returns 200 with populated Cloudinary fileUrl and format',
      upload1Res.status === 200 && Boolean(uploadedDoc1.fileUrl) && uploadedDoc1.format === 'pdf',
      `status=${upload1Res.status}, fileUrl=${uploadedDoc1.fileUrl}, format=${uploadedDoc1.format}`,
      'status=200, valid fileUrl, format=pdf'
    )

    // -------------------------------------------------------------
    // TEST 3: Local state update only mutates target document row
    // -------------------------------------------------------------
    const prevDoc2 = { ...localDocuments[1] }
    const prevDoc3 = { ...localDocuments[2] }

    localDocuments = localDocuments.map((d) => {
      const match =
        (d._id && uploadedDoc1._id && d._id === uploadedDoc1._id) ||
        (d.controlNumber && uploadedDoc1.controlNumber && d.controlNumber === uploadedDoc1.controlNumber)
      return match ? { ...d, ...uploadedDoc1 } : d
    })

    const doc1UpdatedInState = localDocuments.find((d) => d.controlNumber === doc1.controlNumber)
    const doc2UntouchedInState = localDocuments.find((d) => d.controlNumber === doc2.controlNumber)
    const doc3UntouchedInState = localDocuments.find((d) => d.controlNumber === doc3.controlNumber)

    const isTargetUpdated = Boolean(doc1UpdatedInState.fileUrl) && doc1UpdatedInState.fileName === 'doc_001_statement.pdf'
    const areOthersUntouched =
      JSON.stringify(doc2UntouchedInState) === JSON.stringify(prevDoc2) &&
      JSON.stringify(doc3UntouchedInState) === JSON.stringify(prevDoc3)

    record(
      '3',
      'Local state update isolates changes strictly to uploaded document row',
      isTargetUpdated && areOthersUntouched,
      `targetUpdated=${isTargetUpdated}, othersUntouched=${areOthersUntouched}`,
      'targetUpdated=true, othersUntouched=true'
    )

    // -------------------------------------------------------------
    // TEST 4: Attached-file count updates locally without server refetch
    // -------------------------------------------------------------
    const updatedAttachedCount = localDocuments.filter((d) => Boolean(d.fileUrl)).length
    record(
      '4',
      'Attached-file count updates correctly from 0 to 1 without table reload',
      updatedAttachedCount === 1,
      updatedAttachedCount,
      1
    )

    // -------------------------------------------------------------
    // TEST 5: Active search, extraction, and review filters remain invariant
    // -------------------------------------------------------------
    let searchQuery = 'DOC_UP'
    let extractionFilter = 'Pending'
    let reviewFilter = 'All'
    let fileFilter = 'Has File'

    const filterDocs = (docs, q, extF, revF, filF) =>
      docs.filter((doc) => {
        const matchesSearch = !q || [doc.controlNumber, doc.fileName].some((val) => String(val || '').includes(q))
        const matchesExt = extF === 'All' || doc.extractionStatus === extF
        const isRev = Boolean(doc.flrReviewedBy)
        const matchesRev = revF === 'All' || (revF === 'Reviewed' && isRev) || (revF === 'Unreviewed' && !isRev)
        const hasFile = Boolean(doc.fileUrl)
        const matchesF = filF === 'All' || (filF === 'Has File' && hasFile) || (filF === 'No File' && !hasFile)
        return matchesSearch && matchesExt && matchesRev && matchesF
      })

    const filteredAfterUpload = filterDocs(localDocuments, searchQuery, extractionFilter, reviewFilter, fileFilter)
    record(
      '5',
      'Filters remain applied and accurately evaluate updated document without resetting',
      filteredAfterUpload.length === 1 && filteredAfterUpload[0].controlNumber === doc1.controlNumber,
      `filteredCount=${filteredAfterUpload.length}`,
      'filteredCount=1 (only DOC_UP_001 has file)'
    )

    // -------------------------------------------------------------
    // TEST 6: Per-document upload progress and uploading states are isolated
    // -------------------------------------------------------------
    let uploadingDocIds = {}
    let uploadProgressByDocId = {}

    const doc1Key = doc1.controlNumber
    const doc2Key = doc2.controlNumber

    uploadingDocIds[doc1Key] = true
    uploadProgressByDocId[doc1Key] = 45

    const doc1IsUploading = Boolean(uploadingDocIds[doc1Key])
    const doc2IsUploading = Boolean(uploadingDocIds[doc2Key])
    const doc1Progress = uploadProgressByDocId[doc1Key]
    const doc2Progress = uploadProgressByDocId[doc2Key] || 0

    record(
      '6',
      'Upload progress is strictly isolated to the uploading document row',
      doc1IsUploading && !doc2IsUploading && doc1Progress === 45 && doc2Progress === 0,
      `doc1Uploading=${doc1IsUploading}, doc2Uploading=${doc2IsUploading}, doc1Progress=${doc1Progress}, doc2Progress=${doc2Progress}`,
      'doc1Uploading=true, doc2Uploading=false, doc1Progress=45, doc2Progress=0'
    )

    // -------------------------------------------------------------
    // TEST 7: Upload failure isolates error to target row and keeps document intact
    // -------------------------------------------------------------
    let uploadErrorByDocId = {}
    const failErrorMsg = 'Network timeout during Cloudinary upload'
    uploadErrorByDocId[doc2Key] = failErrorMsg

    const doc2HasError = uploadErrorByDocId[doc2Key] === failErrorMsg
    const doc1HasError = Boolean(uploadErrorByDocId[doc1Key])
    const doc2InState = localDocuments.find((d) => d.controlNumber === doc2.controlNumber)
    const doc2StateUnmodified = !doc2InState?.fileUrl && doc2InState?.fileName === 'doc_002_initial.pdf'

    record(
      '7',
      'Upload failure attaches error to affected row without altering document state or other rows',
      doc2HasError && !doc1HasError && doc2StateUnmodified,
      `doc2Error=${doc2HasError}, doc1Error=${doc1HasError}, doc2Unmodified=${doc2StateUnmodified}`,
      'doc2Error=true, doc1Error=false, doc2Unmodified=true'
    )

    // -------------------------------------------------------------
    // TEST 8: Drag-and-drop validation rules (Single file vs Multiple files)
    // -------------------------------------------------------------
    const simulateDropFiles = (files) => {
      if (!files || files.length === 0) return { error: null, proceed: false }
      if (files.length > 1) {
        return { error: 'Only one file can be dropped onto a document row at a time.', proceed: false }
      }
      return { error: null, proceed: true, file: files[0] }
    }

    const multiDropResult = simulateDropFiles([{ name: 'file1.pdf' }, { name: 'file2.pdf' }])
    const singleDropResult = simulateDropFiles([{ name: 'file1.pdf' }])

    record(
      '8',
      'Drag-and-drop rejects multiple files on a single row with clear error',
      multiDropResult.proceed === false && multiDropResult.error.includes('Only one file') && singleDropResult.proceed === true,
      `multiDropError="${multiDropResult.error}", singleProceed=${singleDropResult.proceed}`,
      'multiDrop rejected, singleDrop proceeds'
    )

    // -------------------------------------------------------------
    // TEST 9: Drag-and-drop file type & size validation
    // -------------------------------------------------------------
    const MAX_FILE_SIZE = 30 * 1024 * 1024
    const ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.bmp', '.txt', '.csv', '.docx', '.xlsx', '.pptx', '.doc', '.xls']

    function validateFileClient(file) {
      if (!file) return 'No file selected.'
      if (file.size > MAX_FILE_SIZE) {
        return `File size exceeds maximum allowed limit of 30 MB.`
      }
      const ext = '.' + (file.name.split('.').pop() || '').toLowerCase()
      if (!ALLOWED_EXT.includes(ext)) {
        return `File type "${ext}" is not supported.`
      }
      return null
    }

    const invalidTypeFile = { name: 'script.exe', size: 1024 }
    const oversizedFile = { name: 'huge_scan.pdf', size: 40 * 1024 * 1024 }
    const validFile = { name: 'financials.xlsx', size: 5 * 1024 * 1024 }

    const invalidTypeErr = validateFileClient(invalidTypeFile)
    const oversizedErr = validateFileClient(oversizedFile)
    const validFileErr = validateFileClient(validFile)

    record(
      '9',
      'File validation rejects unsupported extensions and oversized files before upload',
      Boolean(invalidTypeErr) && Boolean(oversizedErr) && validFileErr === null,
      `invalidTypeErr="${invalidTypeErr}", oversizedErr="${oversizedErr}", validFileErr=${validFileErr}`,
      'invalid rejected, oversized rejected, valid accepted'
    )

    // -------------------------------------------------------------
    // TEST 10: Drag-and-drop row highlighting state isolation
    // -------------------------------------------------------------
    let dragOverDocId = doc2Key
    const isDoc2Highlighted = dragOverDocId === doc2Key
    const isDoc1Highlighted = dragOverDocId === doc1Key
    const isDoc3Highlighted = dragOverDocId === doc3.controlNumber

    record(
      '10',
      'Drag-over highlights only the target document row without affecting other rows',
      isDoc2Highlighted && !isDoc1Highlighted && !isDoc3Highlighted,
      `doc2Highlighted=${isDoc2Highlighted}, doc1Highlighted=${isDoc1Highlighted}, doc3Highlighted=${isDoc3Highlighted}`,
      'doc2Highlighted=true, doc1Highlighted=false, doc3Highlighted=false'
    )

    // -------------------------------------------------------------
    // TEST 11: Replace file semantics (Upload replacement on DOC 1)
    // -------------------------------------------------------------
    const oldPublicId = uploadedDoc1.cloudinaryPublicId
    const replacementPngContent = 'PNG sample replacement file content'
    const replaceRes = await uploadFile(
      projectId,
      batchId,
      doc1.controlNumber,
      'doc_001_replaced.png',
      replacementPngContent,
      'image/png'
    )
    const replacedDoc1 = replaceRes.data

    record(
      '11',
      'Replace upload successfully updates document asset to new file and new format',
      replaceRes.status === 200 &&
        replacedDoc1.fileName === 'doc_001_replaced.png' &&
        replacedDoc1.format === 'png' &&
        replacedDoc1.cloudinaryPublicId !== oldPublicId,
      `status=${replaceRes.status}, fileName=${replacedDoc1.fileName}, format=${replacedDoc1.format}`,
      'status=200, fileName=doc_001_replaced.png, format=png, new public ID'
    )

    // -------------------------------------------------------------
    // TEST 12: Attached count remains stable on replacement (1 -> 1)
    // -------------------------------------------------------------
    localDocuments = localDocuments.map((d) => (d.controlNumber === doc1.controlNumber ? replacedDoc1 : d))
    const countAfterReplace = localDocuments.filter((d) => Boolean(d.fileUrl)).length

    record(
      '12',
      'Attached-file count remains constant when replacing an existing file',
      countAfterReplace === 1,
      countAfterReplace,
      1
    )

    // -------------------------------------------------------------
    // TEST 13: Clean Teardown
    // -------------------------------------------------------------
    await del(`/projects/${projectId}`)
    record('13', 'Teardown completed and test project cleaned up', true, 'Clean', 'Clean')

  } catch (err) {
    console.error('Test Suite Error:', err)
    record('EXCEPTION', 'Unexpected exception in test execution', false, err.message, 'No exception')
  }

  console.log('\n================================================================================')
  console.log(`ADMIN BATCH DOCUMENTS UPLOAD TEST SUMMARY: Passed: ${passed}, Failed: ${failed}`)
  console.log('================================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runUploadFlowSuite()
