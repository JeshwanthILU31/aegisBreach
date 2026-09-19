// AegisBreach: Admin Person Tracker UI Contract & RBAC Integration Test Suite
import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import 'dotenv/config'
import Project from './src/models/Project.js'
import Batch from './src/models/Batch.js'
import Document from './src/models/Document.js'
import Coding from './src/models/Coding.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5050/api'
const JWT_SECRET = process.env.JWT_SECRET || 'aegisbreach-jwt-secret-key-production-change-me'

console.log('================================================================================')
console.log('RUNNING ADMIN PERSON TRACKER UI CONTRACT & RBAC TEST SUITE')
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

  // 1. Static Frontend Architecture & Contract Checks
  const appJsxPath = path.join(__dirname, '../client/src/App.jsx')
  const appJsx = fs.readFileSync(appJsxPath, 'utf8')
  const adminPTPath = path.join(__dirname, '../client/src/components/admin/AdminPersonTrackerPage.jsx')
  const adminPTJsx = fs.readFileSync(adminPTPath, 'utf8')
  const adminRoutePath = path.join(__dirname, '../client/src/routes/AdminRoute.jsx')
  const adminRouteJsx = fs.readFileSync(adminRoutePath, 'utf8')
  const projectsPagePath = path.join(__dirname, '../client/src/pages/Projects.jsx')
  const projectsPageJsx = fs.readFileSync(projectsPagePath, 'utf8')

  test('App.jsx registers /admin/person-tracker route enclosed in AdminRoute', () => {
    assert(appJsx.includes('path="/admin/person-tracker"'), 'Route path registered')
    assert(appJsx.includes('<AdminRoute>'), 'Protected by AdminRoute')
    assert(appJsx.includes('<AdminPersonTrackerPage />'), 'Renders AdminPersonTrackerPage')
  })

  test('AdminRoute strictly enforces admin role and redirects normal users to /projects and guests to /login', () => {
    assert(adminRouteJsx.includes("if (user.role !== 'admin')"), 'Checks user.role')
    assert(adminRouteJsx.includes('to="/projects"'), 'Redirects non-admin to /projects')
    assert(adminRouteJsx.includes('to="/login"'), 'Redirects unauthenticated to /login')
  })

  test('Normal reviewer workspace pages do not expose Admin Portal to non-admin users', () => {
    assert(projectsPageJsx.includes("user?.role === 'admin'"), 'Admin portal link conditionally rendered')
    assert(projectsPageJsx.includes('Admin Portal'), 'Contains Admin Portal text link')
  })

  test('Admin Person Tracker UI component contains required filters, table headers, and empty state', () => {
    assert(adminPTJsx.includes('No Person Tracker data found.'), 'Empty state text present')
    assert(adminPTJsx.includes('Document'), 'Document column present')
    assert(adminPTJsx.includes('Batch'), 'Batch column present')
    assert(adminPTJsx.includes('Project'), 'Project column present')
    assert(adminPTJsx.includes('Reviewer'), 'Reviewer column present')
    assert(adminPTJsx.includes('Persons'), 'Persons count column present')
    assert(adminPTJsx.includes('Last Updated'), 'Last Updated column present')
    assert(adminPTJsx.includes('projectId'), 'Filter projectId present')
    assert(adminPTJsx.includes('batchId'), 'Filter batchId present')
    assert(adminPTJsx.includes('documentId'), 'Filter documentId present')
    assert(adminPTJsx.includes('reviewer'), 'Filter reviewer present')
    assert(adminPTJsx.includes('search'), 'Filter search present')
  })

  test('Detail view exposes all grouped Person Tracker fields and audit metadata without hiding', () => {
    const requiredSections = [
      'Identity Information',
      'Address &amp; Contact',
      'Government Identification',
      'Financial Information',
      'Medical &amp; Biometric',
      'Audit Metadata',
    ]
    requiredSections.forEach((section) => {
      assert(adminPTJsx.includes(section), `Contains section: ${section}`)
    })

    const requiredFields = [
      'FIRST NAME',
      'MIDDLE NAME',
      'LAST NAME',
      'DOB / DATE OF BIRTH',
      'ROLE',
      'PERSON DOC LINK',
      'NOTES',
      'ADDRESS',
      'ADDRESS 2',
      'CITY',
      'STATE',
      'ZIP / POSTAL CODE',
      'COUNTRY',
      'PHONE',
      'EMAIL',
      'SSN',
      'DRIVER LICENSE',
      'DL STATE',
      'PASSPORT NUMBER',
      'PASSPORT ISSUING COUNTRY',
      'TIN / TAX ID',
      'FINANCIAL ACCOUNT',
      'PAYMENT CARD',
      'MEDICAL RECORD NUMBER',
      'BIOMETRIC',
      'CREATED BY',
      'CREATED AT',
      'UPDATED BY',
      'UPDATED AT',
    ]
    requiredFields.forEach((field) => {
      assert(adminPTJsx.includes(field), `Contains field: ${field}`)
    })
  })

  test('Detail view supports multi-person selector for documents with multiple persons', () => {
    assert(adminPTJsx.includes('selectedDocGroup.persons.length > 1'), 'Checks for multi-person condition')
    assert(adminPTJsx.includes('Person ${pIdx + 1}'), 'Provides Person N selector button')
    assert(adminPTJsx.includes('setSelectedPersonIndex'), 'Switches person view on selection')
  })

  // 2. Integration Contract Testing with Live MongoDB and Backend
  const adminToken = jwt.sign(
    { userId: new mongoose.Types.ObjectId(), username: 'admin_ui_tester', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  )

  const normalUserToken = jwt.sign(
    { userId: new mongoose.Types.ObjectId(), username: 'reviewer_ui_tester', role: 'user' },
    JWT_SECRET,
    { expiresIn: '1h' }
  )

  if (mongoose.connection.readyState === 0) {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/aegisbreach'
    await mongoose.connect(mongoUri)
  }

  // Setup sample test fixtures
  const testProject = await Project.create({
    name: `UI_Contract_Project_${timestamp}`,
    slug: `ui-contract-proj-${timestamp}`,
    status: 'Active',
  })

  const testBatch = await Batch.create({
    name: `UI_Contract_Batch_${timestamp}`,
    projectId: testProject._id,
    isLocked: false,
  })

  const testDoc1 = await Document.create({
    controlNumber: `UI-DOC1-${timestamp}`,
    fileName: `ui_contract_sample_1_${timestamp}.pdf`,
    batchId: testBatch._id,
    projectId: testProject._id,
  })

  const testDoc2 = await Document.create({
    controlNumber: `UI-DOC2-${timestamp}`,
    fileName: `ui_contract_sample_2_${timestamp}.pdf`,
    batchId: testBatch._id,
    projectId: testProject._id,
  })

  const personA = {
    _id: new mongoose.Types.ObjectId(),
    personDocLink: 'YES',
    firstName: 'Eleanor',
    middleName: 'M',
    lastName: 'Vance',
    dob: '1985-11-20',
    role: 'Principal',
    address: '100 Main Street',
    city: 'Seattle',
    state: 'WA',
    zip: '98101',
    country: 'USA',
    phone: '206-555-0144',
    email: 'eleanor.vance@example.com',
    ssn: '987-65-4321',
    driversLicenseNumber: 'WADL44882',
    dlState: 'WA',
    financialAccountNumber: 'ACC-88331',
    paymentCardNumber: 'CARD-4111-2222',
    medicalRecordNumber: 'MED-99201',
    biometric: 'Iris Scan #90',
    notes: 'Primary subject',
    createdBy: 'reviewer_alice',
    createdAt: new Date('2026-09-18T10:00:00Z'),
    updatedBy: 'reviewer_bob',
    updatedAt: new Date('2026-09-19T11:30:00Z'),
  }

  const personB = {
    _id: new mongoose.Types.ObjectId(),
    personDocLink: 'NO',
    firstName: 'Arthur',
    lastName: 'Dent',
    dob: '1979-03-11',
    role: 'Associate',
    address: '42 Cottington Lane',
    city: 'London',
    state: 'England',
    zip: 'SW1A 1AA',
    country: 'UK',
    createdBy: 'reviewer_alice',
    createdAt: new Date('2026-09-18T10:05:00Z'),
    updatedBy: 'reviewer_alice',
    updatedAt: new Date('2026-09-18T10:05:00Z'),
  }

  const personC = {
    _id: new mongoose.Types.ObjectId(),
    personDocLink: 'YES',
    firstName: 'Theodora',
    lastName: 'Crain',
    dob: '1990-07-04',
    role: 'Consultant',
    city: 'Boston',
    state: 'MA',
    createdBy: 'reviewer_carol',
    createdAt: new Date('2026-09-19T09:00:00Z'),
    updatedBy: 'reviewer_carol',
    updatedAt: new Date('2026-09-19T09:00:00Z'),
  }

  // Save Coding records: Doc1 has 2 persons (Person A & Person B), Doc2 has 1 person (Person C)
  const testCoding1 = await Coding.create({
    documentId: testDoc1.controlNumber,
    projectId: testProject._id.toString(),
    persons: [personA, personB],
  })

  const testCoding2 = await Coding.create({
    documentId: testDoc2.controlNumber,
    projectId: testProject._id.toString(),
    persons: [personC],
  })

  // 3. API Contract tests matching UI expectations
  // Non-admin request gets 403
  const userRes = await fetch(`${BASE_URL}/admin/person-tracker`, {
    headers: { Authorization: `Bearer ${normalUserToken}` },
  })
  test('Normal user receives 403 Forbidden', () => {
    assert.strictEqual(userRes.status, 403)
  })

  // Admin query returns complete list of person tracker items
  const adminRes = await fetch(`${BASE_URL}/admin/person-tracker?projectId=${testProject._id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  test('Admin query succeeds with 200 OK', () => {
    assert.strictEqual(adminRes.status, 200)
  })

  const adminData = await adminRes.json()
  test('Returns all 3 persons across test documents', () => {
    assert.strictEqual(adminData.items.length, 3)
    assert.strictEqual(adminData.total, 3)
  })

  test('Document 1 correctly associates multiple persons with context and audit', () => {
    const doc1Items = adminData.items.filter((i) => i.document.controlNumber === testDoc1.controlNumber)
    assert.strictEqual(doc1Items.length, 2, 'Doc 1 has 2 person records')
    const itemA = doc1Items.find((i) => i.person.firstName === 'Eleanor')
    assert(itemA, 'Found Eleanor')
    assert.strictEqual(itemA.audit.createdBy, 'reviewer_alice')
    assert.strictEqual(itemA.audit.updatedBy, 'reviewer_bob')
    assert.strictEqual(itemA.person.address, '100 Main Street')
    assert.strictEqual(itemA.person.financialAccountNumber, 'ACC-88331')
  })

  test('Filter by reviewer works with AND semantics', () => {
    const filteredByBob = adminData.items.filter((i) => i.audit.updatedBy === 'reviewer_bob')
    assert.strictEqual(filteredByBob.length, 1)
    assert.strictEqual(filteredByBob[0].person.firstName, 'Eleanor')
  })

  test('Empty search returns clean { items: [], total: 0 } with 200 OK', async () => {
    const emptyRes = await fetch(`${BASE_URL}/admin/person-tracker?search=NONEXISTENT_QUERY_STRING_${timestamp}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    assert.strictEqual(emptyRes.status, 200)
    const emptyData = await emptyRes.json()
    assert.strictEqual(emptyData.items.length, 0)
    assert.strictEqual(emptyData.total, 0)
  })

  // Cleanup test fixtures
  await Coding.findByIdAndDelete(testCoding1._id)
  await Coding.findByIdAndDelete(testCoding2._id)
  await Document.findByIdAndDelete(testDoc1._id)
  await Document.findByIdAndDelete(testDoc2._id)
  await Batch.findByIdAndDelete(testBatch._id)
  await Project.findByIdAndDelete(testProject._id)

  console.log('\n================================================================================')
  console.log(`ADMIN PERSON TRACKER UI CONTRACT TEST SUMMARY: Passed: ${passed}, Failed: ${failed}`)
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
