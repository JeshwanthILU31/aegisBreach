import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const BASE_URL = 'http://localhost:5050'

async function runRbacTests() {
  console.log('--- Starting AUTH-7 API Protection & RBAC Test Suite ---')
  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`)
      passed++
    } else {
      console.error(`  [FAIL] ${message}`)
      failed++
    }
  }

  const secret = process.env.JWT_SECRET || 'secret'
  const timestamp = Date.now()

  const testUserObjId = new mongoose.Types.ObjectId().toString()
  const testAdminObjId = new mongoose.Types.ObjectId().toString()

  // Setup test tokens
  const userToken = jwt.sign({ userId: testUserObjId, role: 'user' }, secret, { expiresIn: '1h' })
  const adminToken = jwt.sign({ userId: testAdminObjId, role: 'admin' }, secret, { expiresIn: '1h' })
  const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'

  // 1. PUBLIC ROUTES
  console.log('\n--- Section 1: Public Routes (No Token Required) ---')
  
  // Health
  const healthRes = await fetch(`${BASE_URL}/api/health`)
  assert(healthRes.status === 200, 'GET /api/health without token returns 200')

  // Register
  const regUser = {
    username: `rbac_reg_${timestamp}`,
    email: `rbac_reg_${timestamp}@example.com`,
    password: 'Password123!',
  }
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(regUser),
  })
  assert(regRes.status === 201, 'POST /api/auth/register without token returns 201')

  // Login
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: regUser.username, password: regUser.password }),
  })
  assert(loginRes.status === 200, 'POST /api/auth/login without token returns 200')

  // 2. AUTHENTICATED REVIEWER WORKFLOW ROUTES
  console.log('\n--- Section 2: Authenticated Routes (User + Admin Allowed) ---')

  // 4. Protected reviewer GET without token → 401
  const projNoAuth = await fetch(`${BASE_URL}/api/projects`)
  assert(projNoAuth.status === 401, 'GET /api/projects without token returns 401')

  // 5. Protected reviewer GET with normal user token → 200
  const projUser = await fetch(`${BASE_URL}/api/projects`, {
    headers: { Authorization: `Bearer ${userToken}` },
  })
  assert(projUser.status === 200, 'GET /api/projects with normal user token returns 200')

  // 6. Protected reviewer GET with admin token → 200
  const projAdmin = await fetch(`${BASE_URL}/api/projects`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  assert(projAdmin.status === 200, 'GET /api/projects with admin token returns 200')

  // We need a test project, batch, and document to test coding and batch workflow
  console.log('\n--- Setting up test project & batch using admin token ---')
  const createProjRes = await fetch(`${BASE_URL}/api/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: `RBAC Test Project ${timestamp}`,
      client: 'RBAC Client',
      type: 'Incident Response',
    }),
  })
  const testProject = await createProjRes.json()
  assert(createProjRes.status === 201, 'Admin can create test project (201)')

  const createBatchRes = await fetch(`${BASE_URL}/api/projects/${testProject._id}/batches`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: `RBAC Test Batch ${timestamp}`,
      size: 5,
    }),
  })
  const testBatch = await createBatchRes.json()
  assert(createBatchRes.status === 201, 'Admin can create test batch (201)')

  const createDocRes = await fetch(`${BASE_URL}/api/projects/${testProject._id}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      batchId: testBatch._id,
      controlNumber: `CTRL-RBAC-${timestamp}`,
      fileName: 'test_doc.pdf',
    }),
  })
  const testDoc = await createDocRes.json()
  assert(createDocRes.status === 201, 'Admin can create test document (201)')

  // 7. Protected coding GET without token → 401
  const codingNoAuth = await fetch(`${BASE_URL}/api/projects/${testProject._id}/documents/${testDoc._id}/coding`)
  assert(codingNoAuth.status === 401, 'GET coding without token returns 401')

  // 8. Protected coding GET with normal user token → 200
  const codingUser = await fetch(`${BASE_URL}/api/projects/${testProject._id}/documents/${testDoc._id}/coding`, {
    headers: { Authorization: `Bearer ${userToken}` },
  })
  assert(codingUser.status === 200, 'GET coding with normal user token returns 200')

  // Acquire batch with normal user token
  const acquireRes = await fetch(`${BASE_URL}/api/projects/${testProject._id}/batches/${testBatch._id}/acquire`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({ reviewerName: 'Current Reviewer' }),
  })
  assert(acquireRes.status === 200, 'POST acquire batch with normal user token returns 200')

  // 9. Protected coding PUT without token → 401
  const codingPutNoAuth = await fetch(`${BASE_URL}/api/projects/${testProject._id}/documents/${testDoc._id}/coding`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ responsiveness: 'Responsive', reviewerName: 'Current Reviewer' }),
  })
  assert(codingPutNoAuth.status === 401, 'PUT coding without token returns 401')

  // 10. Protected coding PUT with normal user token → 200
  const codingPutUser = await fetch(`${BASE_URL}/api/projects/${testProject._id}/documents/${testDoc._id}/coding`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      responsiveness: 'Responsive',
      reviewerName: 'Current Reviewer',
      flrReviewedBy: 'Current Reviewer',
      persons: [{ firstName: 'Jane', lastName: 'Doe' }],
    }),
  })
  assert(codingPutUser.status === 200, 'PUT coding with normal user token returns 200')


  // 3. ADMIN-ONLY MUTATION ROUTES
  console.log('\n--- Section 3: Admin-Only Routes (User Blocked with 403, Admin Allowed with 200/201) ---')

  // 11. Admin project endpoint without token → 401
  const projCreateNoAuth = await fetch(`${BASE_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Blocked Project' }),
  })
  assert(projCreateNoAuth.status === 401, 'POST /api/projects without token returns 401')

  // 12. Admin project endpoint with normal user token → 403
  const projCreateUser = await fetch(`${BASE_URL}/api/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({ name: 'Blocked Project' }),
  })
  assert(projCreateUser.status === 403, 'POST /api/projects with normal user token returns 403')

  // 13. Admin project endpoint with admin token → works
  const projUpdateAdmin = await fetch(`${BASE_URL}/api/projects/${testProject._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ name: `RBAC Updated Proj ${timestamp}` }),
  })
  assert(projUpdateAdmin.status === 200, 'PUT /api/projects/:id with admin token returns 200')

  // 14. Admin batch endpoint with normal user token → 403
  const batchCreateUser = await fetch(`${BASE_URL}/api/projects/${testProject._id}/batches`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({ name: 'Forbidden Batch' }),
  })
  assert(batchCreateUser.status === 403, 'POST /api/projects/:id/batches with user token returns 403')

  const batchDeleteUser = await fetch(`${BASE_URL}/api/projects/${testProject._id}/batches/${testBatch._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userToken}` },
  })
  assert(batchDeleteUser.status === 403, 'DELETE /api/projects/:id/batches/:id with user token returns 403')

  // 15. Admin batch endpoint with admin token → works
  const batchUpdateAdmin = await fetch(`${BASE_URL}/api/projects/${testProject._id}/batches/${testBatch._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ name: `Updated Batch Name ${timestamp}` }),
  })
  assert(batchUpdateAdmin.status === 200, 'PUT /api/projects/:id/batches/:id with admin token returns 200')

  // 16. Admin document endpoint with normal user token → 403
  const docCreateUser = await fetch(`${BASE_URL}/api/projects/${testProject._id}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({ batchId: testBatch._id, controlNumber: 'FORBIDDEN-01' }),
  })
  assert(docCreateUser.status === 403, 'POST /api/projects/:id/documents with user token returns 403')

  const docBulkUser = await fetch(`${BASE_URL}/api/projects/${testProject._id}/documents/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({ batchId: testBatch._id, documents: [] }),
  })
  assert(docBulkUser.status === 403, 'POST /api/projects/:id/documents/bulk with user token returns 403')

  const docDeleteUser = await fetch(`${BASE_URL}/api/projects/${testProject._id}/documents/${testDoc._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userToken}` },
  })
  assert(docDeleteUser.status === 403, 'DELETE /api/projects/:id/documents/:id with user token returns 403')

  // 17. Admin document endpoint with admin token → works
  const docBulkAdmin = await fetch(`${BASE_URL}/api/projects/${testProject._id}/documents/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      batchId: testBatch._id,
      documents: [{ controlNumber: `BULK-${timestamp}-1`, fileName: 'b1.pdf' }],
    }),
  })
  assert(docBulkAdmin.status === 201, 'POST /api/projects/:id/documents/bulk with admin token returns 201')

  // 18 & 19. Admin document upload with user (403) and admin (reject 400 bad request without file vs 403)
  const uploadUser = await fetch(`${BASE_URL}/api/projects/${testProject._id}/batches/${testBatch._id}/documents/${testDoc._id}/file`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
  })
  assert(uploadUser.status === 403, 'POST document file upload with user token returns 403')

  const uploadAdmin = await fetch(`${BASE_URL}/api/projects/${testProject._id}/batches/${testBatch._id}/documents/${testDoc._id}/file`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  assert(uploadAdmin.status === 400, 'POST document file upload with admin token passes auth/role check (returns 400 for no file)')

  // 4. SPOOFING AND SECURITY DEFENSE
  console.log('\n--- Section 4: Spoofing Resistance & Security Checks ---')

  // 20. Body role spoofing cannot elevate user
  const spoofBody = await fetch(`${BASE_URL}/api/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({ name: 'Spoof Proj', role: 'admin' }),
  })
  assert(spoofBody.status === 403, 'Body role="admin" cannot bypass requireAdmin (403)')

  // 21. Query role spoofing cannot elevate user
  const spoofQuery = await fetch(`${BASE_URL}/api/projects?role=admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({ name: 'Spoof Proj' }),
  })
  assert(spoofQuery.status === 403, 'Query role="admin" cannot bypass requireAdmin (403)')

  // 22. Custom headers cannot elevate user
  const spoofHeader = await fetch(`${BASE_URL}/api/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
      'X-Role': 'admin',
      'X-User-Role': 'admin',
    },
    body: JSON.stringify({ name: 'Spoof Proj' }),
  })
  assert(spoofHeader.status === 403, 'Custom headers cannot bypass requireAdmin (403)')

  // 24. Invalid JWT → 401
  const invalidJwtRes = await fetch(`${BASE_URL}/api/projects`, {
    headers: { Authorization: `Bearer ${invalidToken}` },
  })
  assert(invalidJwtRes.status === 401, 'Invalid JWT signature returns 401')

  // Clean up test data
  console.log('\n--- Cleaning up test records ---')
  await fetch(`${BASE_URL}/api/projects/${testProject._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aegisBreach')
    const User = (await import('./src/models/User.js')).default
    await User.deleteOne({ email: regUser.email.toLowerCase() })
    await mongoose.disconnect()
    console.log('Cleanup completed successfully.')
  } catch (e) {
    console.error('Cleanup error:', e.message)
  }

  console.log(`\n========================================`)
  console.log(`AUTH-7 RBAC Test Suite Summary: Passed: ${passed}, Failed: ${failed}`)
  console.log(`========================================`)

  if (failed > 0) {
    process.exit(1)
  }
}

runRbacTests().catch((err) => {
  console.error('RBAC test suite error:', err)
  process.exit(1)
})
