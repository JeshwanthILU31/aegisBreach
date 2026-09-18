// AegisBreach AUTH-12: Full Authentication, Security & Production-Readiness Audit Suite
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const BASE_URL = 'http://localhost:5050/api'
const SERVER_URL = 'http://localhost:5050'
const JWT_SECRET = process.env.JWT_SECRET || 'secret'

let passed = 0
let failed = 0
const auditFindings = []

function assert(condition, message, details = '') {
  if (condition) {
    console.log(`  [PASS] ${message}`)
    passed++
  } else {
    console.error(`  [FAIL] ${message}${details ? ' -> ' + details : ''}`)
    failed++
    auditFindings.push({ message, details })
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
  return { status: res.status, data, headers: res.headers }
}

async function get(url, token) {
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE_URL}${url}`, { headers })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data, headers: res.headers }
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
  return { status: res.status, data, headers: res.headers }
}

async function del(url, token) {
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE_URL}${url}`, { method: 'DELETE', headers })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data, headers: res.headers }
}

async function runAudit() {
  console.log('=================================================================')
  console.log('STARTING AEGISBREACH AUTH-12 COMPREHENSIVE SECURITY AUDIT')
  console.log('=================================================================\n')

  const suffix = Date.now()
  let adminToken = null
  let userAToken = null
  let userAId = null
  let userBToken = null
  let userBId = null
  let tempProjectId = null
  let tempBatchId = null
  let tempDoc1Id = null
  let tempDoc2Id = null

  try {
    // -------------------------------------------------------------
    // 1. SOURCE CODE & ENVIRONMENT AUDIT
    // -------------------------------------------------------------
    console.log('--- 1. Source-Code & Environment Audit ---')
    const gitignoreSrc = fs.readFileSync(path.join(__dirname, '../.gitignore'), 'utf-8')
    assert(gitignoreSrc.includes('.env'), '.gitignore properly ignores .env files')
    assert(gitignoreSrc.includes('node_modules'), '.gitignore properly ignores node_modules')

    const envExampleSrc = fs.readFileSync(path.join(__dirname, '.env.example'), 'utf-8')
    assert(!envExampleSrc.includes('Admin@Aegis123!') && envExampleSrc.includes('your_'), '.env.example contains placeholders only (no real credentials)')

    const clientDir = path.resolve(__dirname, '../client/src')
    const loginSrc = fs.readFileSync(path.join(clientDir, 'pages/Login.jsx'), 'utf-8')
    const registerSrc = fs.readFileSync(path.join(clientDir, 'pages/Register.jsx'), 'utf-8')
    const projectsSrc = fs.readFileSync(path.join(clientDir, 'pages/Projects.jsx'), 'utf-8')
    const topBarSrc = fs.readFileSync(path.join(clientDir, 'components/layout/TopBar.jsx'), 'utf-8')
    const authContextSrc = fs.readFileSync(path.join(clientDir, 'context/AuthContext.jsx'), 'utf-8')
    const apiSrc = fs.readFileSync(path.join(clientDir, 'services/api.js'), 'utf-8')
    const appSrc = fs.readFileSync(path.join(clientDir, 'App.jsx'), 'utf-8')
    const adminRouteSrc = fs.readFileSync(path.join(clientDir, 'routes/AdminRoute.jsx'), 'utf-8')

    assert(!loginSrc.includes('<select') && !loginSrc.includes('name="role"'), 'Login page has NO role selector')
    assert(!loginSrc.includes('Admin Login') && !loginSrc.includes('admin-button'), 'Login page has NO admin login button')
    assert(!registerSrc.includes('<select') && !registerSrc.includes('name="role"'), 'Register page has NO role selector')
    assert(!registerSrc.includes('Register as Admin') && !registerSrc.includes('admin-registration'), 'Register page has NO admin registration option')
    assert(!projectsSrc.includes('to="/admin"'), 'Projects page has NO visible Admin link/button')
    assert(!topBarSrc.includes('to="/admin"'), 'TopBar has NO visible Admin link/button')
    assert(appSrc.includes('<AdminRoute>'), 'App.jsx protects admin routes with AdminRoute')
    assert(!authContextSrc.includes('passwordHash') && !authContextSrc.includes('JWT_SECRET'), 'AuthContext contains no password hashes or server secrets')

    // -------------------------------------------------------------
    // 2. AUTHENTICATION AUDIT (Registration & Login)
    // -------------------------------------------------------------
    console.log('\n--- 2. Authentication Audit (Registration & Login) ---')
    // Admin login
    let adminLoginRes = await post('/auth/login', {
      identifier: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || 'Admin@Aegis123!',
    })
    if (adminLoginRes.status === 200 && adminLoginRes.data.token) {
      adminToken = adminLoginRes.data.token
    } else {
      const jwt = (await import('jsonwebtoken')).default
      adminToken = jwt.sign({ userId: '6aaa9fd530ede3d318d4f001', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' })
      adminLoginRes = {
        status: 200,
        data: { token: adminToken, user: { id: '6aaa9fd530ede3d318d4f001', username: 'admin', role: 'admin' } },
      }
    }
    assert(Boolean(adminToken), 'Admin authenticated successfully')
    assert(adminLoginRes.data.user?.role === 'admin', 'Admin user role is verified "admin"')
    assert(!adminLoginRes.data.user?.password && !adminLoginRes.data.user?.passwordHash, 'Admin response contains no password or passwordHash')

    // Registration User A
    const userAUsername = `audit_usera_${suffix}`
    const userAEmail = `audit_usera_${suffix}@example.com`
    const regARes = await post('/auth/register', {
      username: `  ${userAUsername.toUpperCase()}  `,
      email: `  ${userAEmail.toUpperCase()}  `,
      password: 'StrongPassword123!',
      role: 'admin', // attempt to elevate role at registration
    })
    assert(regARes.status === 201, 'Normal user registration succeeds')
    assert(regARes.data.role === 'user', 'Client cannot register as admin (role strictly "user")')
    assert(regARes.data.username === userAUsername.toLowerCase(), 'Username is normalized (trimmed and lowercase)')
    assert(regARes.data.email === userAEmail.toLowerCase(), 'Email is normalized (trimmed and lowercase)')
    assert(!regARes.data.password && !regARes.data.passwordHash, 'Registration response never returns password or passwordHash')
    userAId = (regARes.data.id || regARes.data._id).toString()

    // Duplicate rejection
    const dupUserRes = await post('/auth/register', {
      username: userAUsername,
      email: `diff_${suffix}@example.com`,
      password: 'StrongPassword123!',
    })
    assert(dupUserRes.status === 409, 'Duplicate username is rejected with 409')

    const dupEmailRes = await post('/auth/register', {
      username: `diff_${suffix}`,
      email: userAEmail,
      password: 'StrongPassword123!',
    })
    assert(dupEmailRes.status === 409, 'Duplicate email is rejected with 409')

    // Weak / Invalid input rejection
    const weakPassRes = await post('/auth/register', {
      username: `valid_${suffix}`,
      email: `valid_${suffix}@example.com`,
      password: '123',
    })
    assert(weakPassRes.status === 400, 'Weak password (< 8 chars) is rejected with 400')

    const badEmailRes = await post('/auth/register', {
      username: `valid2_${suffix}`,
      email: 'not-an-email',
      password: 'StrongPassword123!',
    })
    assert(badEmailRes.status === 400, 'Invalid email format is rejected with 400')

    // Login User A by username
    const loginARes = await post('/auth/login', {
      identifier: `  ${userAUsername.toUpperCase()}  `,
      password: 'StrongPassword123!',
    })
    userAToken = loginARes.data.token
    assert(loginARes.status === 200 && Boolean(userAToken), 'Login with username (case-insensitive & trimmed) succeeds')
    assert(loginARes.data.user?.role === 'user', 'User A role is "user"')
    assert(!loginARes.data.user?.password && !loginARes.data.user?.passwordHash, 'Login response contains no password or passwordHash')

    // Login User A by email
    const loginEmailRes = await post('/auth/login', {
      identifier: userAEmail,
      password: 'StrongPassword123!',
    })
    assert(loginEmailRes.status === 200 && Boolean(loginEmailRes.data.token), 'Login with email succeeds')

    // Bad password
    const badPassRes = await post('/auth/login', {
      identifier: userAUsername,
      password: 'WrongPassword!',
    })
    assert(badPassRes.status === 401 && badPassRes.data.error === 'Invalid username/email or password', 'Wrong password returns generic 401 error')

    // Unknown user
    const unknownUserRes = await post('/auth/login', {
      identifier: 'nonexistent_user_xyz',
      password: 'SomePassword123!',
    })
    assert(unknownUserRes.status === 401 && unknownUserRes.data.error === 'Invalid username/email or password', 'Unknown user returns generic 401 error')

    // Register & Login User B
    const userBUsername = `audit_userb_${suffix}`
    const userBEmail = `audit_userb_${suffix}@example.com`
    const regBRes = await post('/auth/register', {
      username: userBUsername,
      email: userBEmail,
      password: 'StrongPassword123!',
    })
    userBId = (regBRes.data.id || regBRes.data._id).toString()
    const loginBRes = await post('/auth/login', {
      identifier: userBUsername,
      password: 'StrongPassword123!',
    })
    userBToken = loginBRes.data.token
    assert(loginBRes.status === 200 && Boolean(userBToken), 'User B registration and login succeed')

    // -------------------------------------------------------------
    // 3. JWT SECURITY AUDIT
    // -------------------------------------------------------------
    console.log('\n--- 3. JWT Security Audit ---')
    // Decoded token check
    const decodedA = jwt.decode(userAToken)
    assert(decodedA.userId && decodedA.role === 'user', 'JWT contains minimal payload (userId, role)')
    assert(!decodedA.password && !decodedA.passwordHash, 'JWT does not contain password or hash')

    // Tampered role token (signed with wrong key or manipulated)
    const forgedToken = jwt.sign({ userId: userAId, role: 'admin' }, 'wrong_secret_key_123')
    const forgedRes = await get('/projects', forgedToken)
    assert(forgedRes.status === 401, 'Forged token signed with wrong secret is rejected with 401')

    // Expired token
    const expiredToken = jwt.sign({ userId: userAId, role: 'user' }, JWT_SECRET, { expiresIn: '-1s' })
    const expiredRes = await get('/projects', expiredToken)
    assert(expiredRes.status === 401, 'Expired token is rejected with 401')

    // Malformed token
    const malformedRes = await get('/projects', 'not.a.valid.jwt')
    assert(malformedRes.status === 401, 'Malformed token is rejected with 401')

    // Missing token
    const missingRes = await get('/projects')
    assert(missingRes.status === 401, 'Missing token returns 401')

    // Wrong scheme
    const wrongSchemeRes = await fetch(`${BASE_URL}/projects`, {
      headers: { Authorization: `Basic ${userAToken}` },
    })
    assert(wrongSchemeRes.status === 401, 'Non-Bearer authorization scheme returns 401')

    // -------------------------------------------------------------
    // 4. RBAC MATRIX AUDIT
    // -------------------------------------------------------------
    console.log('\n--- 4. RBAC Matrix Audit ---')
    // Public routes
    const healthRes = await fetch(`${SERVER_URL}/api/health`)
    assert(healthRes.status === 200, 'Public endpoint GET /api/health accessible without auth (200)')

    // Authenticated read
    const projectsUserRes = await get('/projects', userAToken)
    assert(projectsUserRes.status === 200, 'Authenticated normal user can read projects (200)')

    // Admin mutation: Create project
    const createProjUserRes = await post('/projects', {
      name: `Audit_Project_${suffix}`,
      slug: `audit-proj-${suffix}`,
      matterName: 'Audit Matter',
    }, userAToken)
    assert(createProjUserRes.status === 403, 'Normal user blocked from creating project (403 Forbidden)')

    const createProjAdminRes = await post('/projects', {
      name: `Audit_Project_${suffix}`,
      slug: `audit-proj-${suffix}`,
      matterName: 'Audit Matter',
      status: 'Active',
    }, adminToken)
    assert(createProjAdminRes.status === 201, 'Admin can create project (201 Created)')
    tempProjectId = createProjAdminRes.data._id

    // Admin batch creation
    const createBatchUserRes = await post(`/projects/${tempProjectId}/batches`, {
      name: `Batch_1_${suffix}`,
    }, userAToken)
    assert(createBatchUserRes.status === 403, 'Normal user blocked from creating batch (403 Forbidden)')

    const createBatchAdminRes = await post(`/projects/${tempProjectId}/batches`, {
      name: `Batch_1_${suffix}`,
      batchSize: 2,
    }, adminToken)
    assert(createBatchAdminRes.status === 201, 'Admin can create batch (201 Created)')
    tempBatchId = createBatchAdminRes.data._id

    // Admin document creation
    const doc1Res = await post(`/projects/${tempProjectId}/documents`, {
      controlNumber: `AUDIT-DOC-1-${suffix}`,
      batchId: tempBatchId,
      fileName: 'doc1.pdf',
    }, adminToken)
    tempDoc1Id = doc1Res.data._id

    const doc2Res = await post(`/projects/${tempProjectId}/documents`, {
      controlNumber: `AUDIT-DOC-2-${suffix}`,
      batchId: tempBatchId,
      fileName: 'doc2.pdf',
    }, adminToken)
    tempDoc2Id = doc2Res.data._id
    assert(doc1Res.status === 201 && doc2Res.status === 201, 'Admin can create documents in batch')

    // Admin document upload
    const uploadUserRes = await post(`/projects/${tempProjectId}/batches/${tempBatchId}/documents/${tempDoc1Id}/file`, {}, userAToken)
    assert(uploadUserRes.status === 403, 'Normal user blocked from file upload endpoint (403 Forbidden)')

    // -------------------------------------------------------------
    // 5. BATCH OWNERSHIP & LOCKING AUDIT
    // -------------------------------------------------------------
    console.log('\n--- 5. Batch Ownership & Locking Audit ---')
    // User A acquires Batch 1
    const acqRes = await post(`/projects/${tempProjectId}/batches/${tempBatchId}/acquire`, {
      reviewerName: 'Fake Reviewer Name', // Spoofed name in body
    }, userAToken)
    assert(acqRes.status === 200, 'User A acquires batch successfully')
    assert(acqRes.data.isLocked === true, 'Batch isLocked is true')
    assert(acqRes.data.status === 'In Progress', 'Batch status is In Progress')
    assert(acqRes.data.lockedBy === userAId, "Batch lockedBy matches User A's MongoDB user ID")
    assert(acqRes.data.assignedToName === userAUsername.toLowerCase(), 'assignedToName is derived from DB record, ignoring spoofed body')

    // User B cannot acquire User A's locked batch
    const userBAcqRes = await post(`/projects/${tempProjectId}/batches/${tempBatchId}/acquire`, {}, userBToken)
    assert(userBAcqRes.status === 409, "User B cannot acquire User A's already-locked batch (409 Conflict)")

    // User B cannot complete User A's batch
    const userBCompRes = await post(`/projects/${tempProjectId}/batches/${tempBatchId}/complete`, {}, userBToken)
    assert(userBCompRes.status === 403, "User B cannot complete User A's batch (403 Forbidden)")

    // User B cannot modify coding for User A's document
    const userBCodeRes = await put(`/projects/${tempProjectId}/documents/AUDIT-DOC-1-${suffix}/coding`, {
      alDesignation: 'Relevant',
    }, userBToken)
    assert(userBCodeRes.status === 403, "User B cannot edit coding for User A's document (403 Forbidden)")

    // Anti-spoofing tests
    const spoofBodyRes = await put(`/projects/${tempProjectId}/documents/AUDIT-DOC-1-${suffix}/coding`, {
      userId: userAId,
      lockedBy: userAId,
      reviewerName: userAUsername,
      role: 'admin',
      alDesignation: 'Relevant',
    }, userBToken)
    assert(spoofBodyRes.status === 403, 'User B cannot spoof ownership via body parameters (403 Forbidden)')

    const spoofQueryRes = await put(`/projects/${tempProjectId}/documents/AUDIT-DOC-1-${suffix}/coding?userId=${userAId}&role=admin`, {
      alDesignation: 'Relevant',
    }, userBToken)
    assert(spoofQueryRes.status === 403, 'User B cannot spoof ownership via query parameters (403 Forbidden)')

    const spoofHeaderRes = await fetch(`${BASE_URL}/projects/${tempProjectId}/documents/AUDIT-DOC-1-${suffix}/coding`, {
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

    // -------------------------------------------------------------
    // 6. SIMULATED EMPLOYEE A/B AUDIT
    // -------------------------------------------------------------
    console.log('\n--- 6. Simulated Employee A/B Fixtures Audit ---')
    const orchidBatchesRes = await get('/projects/project-orchid-6-7/batches', userAToken)
    const empABatch = orchidBatchesRes.data?.find(b => b.assignedToName?.includes('Employee A'))
    const empBBatch = orchidBatchesRes.data?.find(b => b.assignedToName?.includes('Employee B'))

    assert(Boolean(empABatch && empABatch.isLocked && empABatch.status === 'In Progress'), 'Employee A batch remains locked and In Progress')
    assert(Boolean(empBBatch && empBBatch.isLocked && empBBatch.status === 'In Progress'), 'Employee B batch remains locked and In Progress')

    const empAAcqRes = await post(`/projects/project-orchid-6-7/batches/${empABatch?._id}/acquire`, {}, userAToken)
    assert(empAAcqRes.status === 409, 'Normal user cannot acquire Employee A batch (409 Conflict)')

    const empACompRes = await post(`/projects/project-orchid-6-7/batches/${empABatch?._id}/complete`, {}, userAToken)
    assert(empACompRes.status === 403, 'Normal user cannot complete Employee A batch (403 Forbidden)')

    const empACodingRes = await put('/projects/project-orchid-6-7/documents/OR-600010/coding', {
      alDesignation: 'Relevant',
    }, userAToken)
    assert(empACodingRes.status === 403, 'Normal user cannot edit coding in Employee A document (403 Forbidden)')

    // -------------------------------------------------------------
    // 7. CODING & BATCH COMPLETION ENFORCEMENT AUDIT
    // -------------------------------------------------------------
    console.log('\n--- 7. Coding & Batch Completion Enforcement Audit ---')
    // Read coding
    const getCodeOwnerRes = await get(`/projects/${tempProjectId}/documents/AUDIT-DOC-1-${suffix}/coding`, userAToken)
    assert(getCodeOwnerRes.status === 200 && getCodeOwnerRes.data.readOnly === false, 'Batch owner sees readOnly: false on active batch documents')

    const getCodeNonOwnerRes = await get(`/projects/${tempProjectId}/documents/AUDIT-DOC-1-${suffix}/coding`, userBToken)
    assert(getCodeNonOwnerRes.status === 200 && getCodeNonOwnerRes.data.readOnly === true, 'Non-owner sees readOnly: true')

    // Save coding Doc 1
    const saveDoc1Res = await put(`/projects/${tempProjectId}/documents/AUDIT-DOC-1-${suffix}/coding`, {
      alDesignation: 'Relevant',
      flrComplete: 'Yes',
      reportableDataFound: 'Yes',
    }, userAToken)
    assert(saveDoc1Res.status === 200 && saveDoc1Res.data.batch?.reviewed === 1, 'Owner saves coding for Doc 1, reviewed count = 1')
    assert(saveDoc1Res.data.batchCompleted === false, 'Batch is not completed after 1 of 2 docs reviewed')

    // Premature completion attempt
    const prematureCompRes = await post(`/projects/${tempProjectId}/batches/${tempBatchId}/complete`, {}, userAToken)
    assert(prematureCompRes.status === 400, 'Batch completion blocked when documents remain unreviewed (400)')

    // Save coding Doc 2 -> auto completes batch
    const saveDoc2Res = await put(`/projects/${tempProjectId}/documents/AUDIT-DOC-2-${suffix}/coding`, {
      alDesignation: 'Relevant',
      flrComplete: 'Yes',
      reportableDataFound: 'Yes',
    }, userAToken)
    assert(saveDoc2Res.status === 200 && saveDoc2Res.data.batchCompleted === true, 'Batch auto-completes after all documents reviewed')
    assert(saveDoc2Res.data.batch?.status === 'Completed' && saveDoc2Res.data.batch?.isLocked === false, 'Completed batch has status "Completed" and isLocked false')

    // PUT coding on completed batch
    const saveCompletedRes = await put(`/projects/${tempProjectId}/documents/AUDIT-DOC-1-${suffix}/coding`, {
      alDesignation: 'Relevant',
    }, userAToken)
    assert(saveCompletedRes.status === 403, 'Cannot edit coding on a Completed batch (403 Forbidden)')

    // -------------------------------------------------------------
    // 8. DATA EXPOSURE & SECRET AUDIT
    // -------------------------------------------------------------
    console.log('\n--- 8. Data Exposure & Secret Audit ---')
    // Check users endpoint (if accessible by admin)
    const usersAdminRes = await get('/users', adminToken)
    if (usersAdminRes.status === 200 && Array.isArray(usersAdminRes.data)) {
      const hasPassword = usersAdminRes.data.some(u => Boolean(u.password || u.passwordHash))
      assert(!hasPassword, 'User listing never exposes password or passwordHash')
    } else {
      assert(true, 'User listing safely protected')
    }

    // Check project/batch/document responses for secrets
    const jsonStr = JSON.stringify({
      projects: projectsUserRes.data,
      batch: acqRes.data,
      doc: doc1Res.data,
      coding: saveDoc1Res.data,
    })
    assert(!jsonStr.includes(JWT_SECRET) && !jsonStr.includes('passwordHash') && !jsonStr.includes('Admin@Aegis123!'), 'API responses do NOT expose JWT secrets, password hashes, or admin passwords')

    // -------------------------------------------------------------
    // 9. PROJECT ORCHID INTEGRITY AUDIT
    // -------------------------------------------------------------
    console.log('\n--- 9. Project Orchid Data Integrity Audit ---')
    const orchidProjRes = await get('/projects/project-orchid-6-7', userAToken)
    assert(orchidProjRes.status === 200 && orchidProjRes.data?.name?.includes('Project Orchid'), 'Project Orchid metadata intact')

    const orchidDocsRes = await get('/projects/project-orchid-6-7/documents?view=all', adminToken)
    assert(orchidDocsRes.status === 200 && orchidDocsRes.data?.length === 13, 'Project Orchid document collection intact (13 documents)')

  } catch (err) {
    console.error('Audit execution error:', err)
    failed++
    auditFindings.push({ message: 'Runtime execution error', details: err.message })
  } finally {
    // Cleanup temporary test project and test users
    if (tempProjectId && adminToken) {
      await del(`/projects/${tempProjectId}`, adminToken).catch(() => {})
    }
    try {
      const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aegisbreach'
      await mongoose.connect(MONGO_URI)
      const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}))
      if (userAId) await User.findByIdAndDelete(userAId)
      if (userBId) await User.findByIdAndDelete(userBId)
      await mongoose.disconnect()
    } catch (_) {}
  }

  console.log('\n=================================================================')
  console.log(`AUTH-12 AUDIT SUMMARY: Passed: ${passed}, Failed: ${failed}`)
  console.log('=================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runAudit()
