// AegisBreach: Admin Person Tracker API Integration & RBAC Test Suite
import assert from 'assert'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import 'dotenv/config'
import User from './src/models/User.js'
import Project from './src/models/Project.js'
import Batch from './src/models/Batch.js'
import Document from './src/models/Document.js'
import Coding from './src/models/Coding.js'

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5050/api'
const JWT_SECRET = process.env.JWT_SECRET || 'aegisbreach-jwt-secret-key-production-change-me'

console.log('================================================================================')
console.log('RUNNING ADMIN PERSON TRACKER API & RBAC TEST SUITE')
console.log('================================================================================\n')

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

async function runTests() {
  const timestamp = Date.now()

  // 1. Create helper JWTs
  const adminToken = jwt.sign(
    { userId: new mongoose.Types.ObjectId(), username: 'admin_test_user', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  )

  const normalUserToken = jwt.sign(
    { userId: new mongoose.Types.ObjectId(), username: 'reviewer_normal', role: 'user' },
    JWT_SECRET,
    { expiresIn: '1h' }
  )

  // 2. Connect DB if needed for test data setup
  if (mongoose.connection.readyState === 0) {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/aegisbreach'
    await mongoose.connect(mongoUri)
  }

  // 3. Setup Test Project, Batch, Document, and Coding records with Person Tracker entries
  const testProject = await Project.create({
    name: `Admin_PT_Project_${timestamp}`,
    slug: `admin-pt-proj-${timestamp}`,
    status: 'Active',
  })

  const testBatch = await Batch.create({
    projectId: testProject._id,
    name: `Admin_PT_Batch_${timestamp}`,
    status: 'In Progress',
  })

  const testDoc = await Document.create({
    projectId: testProject._id,
    batchId: testBatch._id,
    controlNumber: `CTRL-PT-${timestamp}`,
    fileName: `pt_evidence_${timestamp}.pdf`,
    reportableData: 'Yes',
  })

  const p1 = {
    _id: `person_pt_01_${timestamp}`,
    itemNumber: 'ITM-901',
    personDocLink: `CTRL-PT-${timestamp}`,
    firstName: 'Eleanor',
    middleName: 'M',
    lastName: 'Vance',
    suffix: 'Jr',
    address: '888 Hill House Way',
    city: 'Boston',
    state: 'MA',
    zip: '02108',
    country: 'USA',
    dob: '05/12/1985',
    ssn: '123-45-6789',
    tin: '98-7654321',
    financialAccountNumber: 'ACCT-55443322',
    passportNumber: 'PASS-889900',
    driversLicenseNumber: 'DL-MA-998877',
    dataOwner: 'Custodian Eleanor',
    role: 'Primary Subject',
    createdBy: 'reviewer_sarah',
    createdAt: new Date('2026-02-15T09:00:00.000Z'),
    updatedBy: 'editor_mark',
    updatedAt: new Date('2026-02-16T14:30:00.000Z'),
  }

  const p2 = {
    _id: `person_pt_02_${timestamp}`,
    itemNumber: 'ITM-902',
    personDocLink: `CTRL-PT-${timestamp}`,
    firstName: 'Theodora',
    middleName: 'K',
    lastName: 'Crain',
    address: '456 Studio Loft St',
    city: 'Salem',
    state: 'MA',
    zip: '01970',
    country: 'USA',
    dob: '08/24/1990',
    ssn: '987-65-4321',
    dataOwner: 'Custodian Theo',
    role: 'Associate',
    createdBy: 'reviewer_alex',
    createdAt: new Date('2026-02-18T11:00:00.000Z'),
    updatedBy: 'reviewer_alex',
    updatedAt: new Date('2026-02-18T11:00:00.000Z'),
  }

  const testCoding = await Coding.create({
    projectId: testProject.slug,
    documentId: testDoc.controlNumber,
    persons: [p1, p2],
  })

  // ---------------------------------------------------------------------------
  // Test 1: Unauthenticated request gets 401 Unauthorized
  // ---------------------------------------------------------------------------
  const unauthRes = await fetch(`${BASE_URL}/admin/person-tracker`)
  test('Unauthenticated request gets 401 Unauthorized', () => {
    assert.strictEqual(unauthRes.status, 401, `Expected 401, received ${unauthRes.status}`)
  })

  // ---------------------------------------------------------------------------
  // Test 2: Normal user (role: 'user') gets 403 Forbidden
  // ---------------------------------------------------------------------------
  const normalUserRes = await fetch(`${BASE_URL}/admin/person-tracker`, {
    headers: { Authorization: `Bearer ${normalUserToken}` },
  })
  test('Normal user request gets 403 Forbidden', () => {
    assert.strictEqual(normalUserRes.status, 403, `Expected 403, received ${normalUserRes.status}`)
  })

  // ---------------------------------------------------------------------------
  // Test 3: Admin user (role: 'admin') can access endpoint (200 OK)
  // ---------------------------------------------------------------------------
  const adminRes = await fetch(`${BASE_URL}/admin/person-tracker`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const adminData = await adminRes.json()
  test('Admin user accesses endpoint successfully (200 OK)', () => {
    assert.strictEqual(adminRes.status, 200, `Expected 200, received ${adminRes.status}`)
    assert(Array.isArray(adminData.items), 'Expected items array in response')
    assert(typeof adminData.total === 'number', 'Expected total number in response')
    assert(adminData.total >= 2, 'Expected at least 2 person records in response')
  })

  // ---------------------------------------------------------------------------
  // Test 4: Response includes full project, batch, document, and audit context
  // ---------------------------------------------------------------------------
  const matchedItem = adminData.items.find((item) => item.person?._id === `person_pt_01_${timestamp}`)
  test('Response includes contextualized document, batch, project, and audit metadata', () => {
    assert(Boolean(matchedItem), 'Test person 1 found in results')

    // Document context
    assert.strictEqual(matchedItem.document.controlNumber, testDoc.controlNumber)
    assert.strictEqual(matchedItem.document.fileName, testDoc.fileName)
    assert.strictEqual(matchedItem.document.id, testDoc._id.toString())

    // Batch context
    assert.strictEqual(matchedItem.batch.id, testBatch._id.toString())
    assert.strictEqual(matchedItem.batch.name, testBatch.name)

    // Project context
    assert.strictEqual(matchedItem.project.name, testProject.name)

    // Audit context
    assert.strictEqual(matchedItem.audit.createdBy, 'reviewer_sarah')
    assert.strictEqual(matchedItem.audit.updatedBy, 'editor_mark')
    assert(Boolean(matchedItem.audit.createdAt))
    assert(Boolean(matchedItem.audit.updatedAt))
  })

  // ---------------------------------------------------------------------------
  // Test 5: All existing Person Tracker fields are preserved
  // ---------------------------------------------------------------------------
  test('All existing Person Tracker fields are preserved on person object', () => {
    const p = matchedItem.person
    assert.strictEqual(p._id, `person_pt_01_${timestamp}`)
    assert.strictEqual(p.firstName, 'Eleanor')
    assert.strictEqual(p.lastName, 'Vance')
    assert.strictEqual(p.address, '888 Hill House Way')
    assert.strictEqual(p.city, 'Boston')
    assert.strictEqual(p.state, 'MA')
    assert.strictEqual(p.zip, '02108')
    assert.strictEqual(p.dob, '05/12/1985')
    assert.strictEqual(p.ssn, '123-45-6789')
    assert.strictEqual(p.tin, '98-7654321')
    assert.strictEqual(p.financialAccountNumber, 'ACCT-55443322')
    assert.strictEqual(p.passportNumber, 'PASS-889900')
    assert.strictEqual(p.driversLicenseNumber, 'DL-MA-998877')
    assert.strictEqual(p.dataOwner, 'Custodian Eleanor')
    assert.strictEqual(p.role, 'Primary Subject')
  })

  // ---------------------------------------------------------------------------
  // Test 6: Filtering by projectId
  // ---------------------------------------------------------------------------
  const projFilterRes = await fetch(`${BASE_URL}/admin/person-tracker?projectId=${testProject.slug}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const projFilterData = await projFilterRes.json()
  test('Filter by projectId matches only persons in target project', () => {
    assert.strictEqual(projFilterRes.status, 200)
    assert(projFilterData.items.length >= 2)
    assert(projFilterData.items.every((it) => it.project.id === testProject._id.toString() || it.project.id === testProject.slug || it.project.name === testProject.name))
  })

  // ---------------------------------------------------------------------------
  // Test 7: Filtering by batchId
  // ---------------------------------------------------------------------------
  const batchFilterRes = await fetch(`${BASE_URL}/admin/person-tracker?batchId=${testBatch._id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const batchFilterData = await batchFilterRes.json()
  test('Filter by batchId matches only persons in target batch', () => {
    assert.strictEqual(batchFilterRes.status, 200)
    assert.strictEqual(batchFilterData.items.length, 2)
    assert(batchFilterData.items.every((it) => it.batch.id === testBatch._id.toString()))
  })

  // ---------------------------------------------------------------------------
  // Test 8: Filtering by documentId
  // ---------------------------------------------------------------------------
  const docFilterRes = await fetch(`${BASE_URL}/admin/person-tracker?documentId=${testDoc.controlNumber}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const docFilterData = await docFilterRes.json()
  test('Filter by documentId matches only persons for target document control number', () => {
    assert.strictEqual(docFilterRes.status, 200)
    assert.strictEqual(docFilterData.items.length, 2)
    assert(docFilterData.items.every((it) => it.document.controlNumber === testDoc.controlNumber))
  })

  // ---------------------------------------------------------------------------
  // Test 9: Filtering by reviewer
  // ---------------------------------------------------------------------------
  const revFilterRes = await fetch(`${BASE_URL}/admin/person-tracker?reviewer=editor_mark`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const revFilterData = await revFilterRes.json()
  test('Filter by reviewer matches creator or updater', () => {
    assert.strictEqual(revFilterRes.status, 200)
    assert(revFilterData.items.some((it) => it.person._id === `person_pt_01_${timestamp}`))
    assert(revFilterData.items.every((it) => it.audit.createdBy === 'editor_mark' || it.audit.updatedBy === 'editor_mark'))
  })

  // ---------------------------------------------------------------------------
  // Test 10: Global search filtering
  // ---------------------------------------------------------------------------
  const searchRes = await fetch(`${BASE_URL}/admin/person-tracker?search=Hill+House`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const searchData = await searchRes.json()
  test('Search filtering matches person address keyword', () => {
    assert.strictEqual(searchRes.status, 200)
    assert(searchData.items.some((it) => it.person.address === '888 Hill House Way'))
    assert(!searchData.items.some((it) => it.person._id === `person_pt_02_${timestamp}`))
  })

  // ---------------------------------------------------------------------------
  // Test 11: Combined AND filters
  // ---------------------------------------------------------------------------
  const combinedRes = await fetch(`${BASE_URL}/admin/person-tracker?projectId=${testProject.slug}&search=Theodora`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const combinedData = await combinedRes.json()
  test('Combined filters apply with AND semantics', () => {
    assert.strictEqual(combinedRes.status, 200)
    assert.strictEqual(combinedData.items.length, 1)
    assert.strictEqual(combinedData.items[0].person.firstName, 'Theodora')
  })

  // ---------------------------------------------------------------------------
  // Test 12: Empty results behavior
  // ---------------------------------------------------------------------------
  const emptyRes = await fetch(`${BASE_URL}/admin/person-tracker?search=NonExistentKeywordXYZ999`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const emptyData = await emptyRes.json()
  test('Empty search results return valid 200 JSON with empty array and total: 0', () => {
    assert.strictEqual(emptyRes.status, 200)
    assert.deepStrictEqual(emptyData, { items: [], total: 0 })
  })

  // ---------------------------------------------------------------------------
  // Test 13: Sensitive user credentials and system secrets are not exposed
  // ---------------------------------------------------------------------------
  const rawText = JSON.stringify(adminData)
  test('Response never exposes passwords, password hashes, JWTs, or secrets', () => {
    assert(!rawText.includes('passwordHash'), 'No passwordHash in response')
    assert(!rawText.includes('$2a$') && !rawText.includes('$2b$'), 'No bcrypt hashes in response')
    assert(!rawText.includes('CLOUDINARY_API_SECRET'), 'No Cloudinary secret in response')
  })

  // Cleanup test fixtures
  await Coding.findByIdAndDelete(testCoding._id)
  await Document.findByIdAndDelete(testDoc._id)
  await Batch.findByIdAndDelete(testBatch._id)
  await Project.findByIdAndDelete(testProject._id)

  console.log('\n================================================================================')
  console.log(`ADMIN PERSON TRACKER TEST SUMMARY: Passed: ${passed}, Failed: ${failed}`)
  console.log('================================================================================')

  await mongoose.disconnect()
  if (failed > 0) {
    process.exit(1)
  }
  process.exit(0)
}

runTests().catch((err) => {
  console.error('Test execution error:', err)
  process.exit(1)
})
