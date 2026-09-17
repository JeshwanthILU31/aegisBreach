import jwt from 'jsonwebtoken'
import express from 'express'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { authenticate } from './src/middleware/authMiddleware.js'
import { requireRole, requireAdmin } from './src/middleware/roleMiddleware.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

async function runRoleMiddlewareTests() {
  console.log('--- Starting AUTH-6 Role-Based Authorization Middleware Test Suite ---')
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

  const secret = process.env.JWT_SECRET || 'test_secret_for_suite'

  // Helper for mock contexts
  function createMockContext({ user = null, headers = {}, body = {}, query = {}, params = {} } = {}) {
    let statusCode = 200
    let jsonResponse = null
    let nextCalled = false

    const req = {
      user,
      headers,
      body,
      query,
      params,
    }

    const res = {
      status(code) {
        statusCode = code
        return this
      },
      json(data) {
        jsonResponse = data
        return this
      },
    }

    const next = () => {
      nextCalled = true
    }

    return { req, res, next, getResult: () => ({ statusCode, jsonResponse, nextCalled, user: req.user }) }
  }

  // 1. Authenticated admin + requireRole("admin") → next()
  console.log('\n--- Test 1: Authenticated admin + requireRole("admin") ---')
  {
    const ctx = createMockContext({ user: { userId: 'admin_123', role: 'admin' } })
    const middleware = requireRole('admin')
    middleware(ctx.req, ctx.res, ctx.next)
    const res = ctx.getResult()
    assert(res.nextCalled === true, 'Admin passes requireRole("admin")')
    assert(res.statusCode === 200, 'Status remains 200')
  }

  // 1b. Test requireAdmin helper
  console.log('\n--- Test 1b: Authenticated admin + requireAdmin helper ---')
  {
    const ctx = createMockContext({ user: { userId: 'admin_123', role: 'admin' } })
    requireAdmin(ctx.req, ctx.res, ctx.next)
    const res = ctx.getResult()
    assert(res.nextCalled === true, 'Admin passes requireAdmin helper')
  }

  // 2. Authenticated normal user + requireRole("admin") → 403
  console.log('\n--- Test 2: Authenticated normal user + requireRole("admin") ---')
  {
    const ctx = createMockContext({ user: { userId: 'user_456', role: 'user' } })
    const middleware = requireRole('admin')
    middleware(ctx.req, ctx.res, ctx.next)
    const res = ctx.getResult()
    assert(res.nextCalled === false, 'Normal user is blocked by requireRole("admin")')
    assert(res.statusCode === 403, 'Returns 403 Forbidden')
    assert(res.jsonResponse && typeof res.jsonResponse.error === 'string', 'Returns safe error message')
  }

  // 3. Missing req.user → 401
  console.log('\n--- Test 3: Missing req.user ---')
  {
    const ctx1 = createMockContext({ user: null })
    const middleware = requireRole('admin')
    middleware(ctx1.req, ctx1.res, ctx1.next)
    const res1 = ctx1.getResult()
    assert(res1.nextCalled === false, 'Missing req.user does not call next()')
    assert(res1.statusCode === 401, 'Missing req.user returns 401')

    const ctx2 = createMockContext({ user: { userId: 'user_456' } }) // missing role property
    middleware(ctx2.req, ctx2.res, ctx2.next)
    const res2 = ctx2.getResult()
    assert(res2.nextCalled === false, 'req.user without role does not call next()')
    assert(res2.statusCode === 401, 'req.user without role returns 401')
  }

  // 4. Spoof role="admin" in body while req.user.role="user" → 403
  console.log('\n--- Test 4: Spoof role="admin" in req.body ---')
  {
    const ctx = createMockContext({
      user: { userId: 'user_456', role: 'user' },
      body: { role: 'admin' },
    })
    const middleware = requireRole('admin')
    middleware(ctx.req, ctx.res, ctx.next)
    const res = ctx.getResult()
    assert(res.nextCalled === false, 'Body role="admin" does not bypass check')
    assert(res.statusCode === 403, 'Returns 403 Forbidden')
  }

  // 5. Spoof role="admin" in query while req.user.role="user" → 403
  console.log('\n--- Test 5: Spoof role="admin" in req.query ---')
  {
    const ctx = createMockContext({
      user: { userId: 'user_456', role: 'user' },
      query: { role: 'admin' },
    })
    const middleware = requireRole('admin')
    middleware(ctx.req, ctx.res, ctx.next)
    const res = ctx.getResult()
    assert(res.nextCalled === false, 'Query role="admin" does not bypass check')
    assert(res.statusCode === 403, 'Returns 403 Forbidden')
  }

  // 6. Spoof role="admin" in params while req.user.role="user" → 403
  console.log('\n--- Test 6: Spoof role="admin" in req.params ---')
  {
    const ctx = createMockContext({
      user: { userId: 'user_456', role: 'user' },
      params: { role: 'admin' },
    })
    const middleware = requireRole('admin')
    middleware(ctx.req, ctx.res, ctx.next)
    const res = ctx.getResult()
    assert(res.nextCalled === false, 'Params role="admin" does not bypass check')
    assert(res.statusCode === 403, 'Returns 403 Forbidden')
  }

  // 7. Spoof role through custom headers → must not affect authorization
  console.log('\n--- Test 7: Spoof role in custom headers ---')
  {
    const ctx = createMockContext({
      user: { userId: 'user_456', role: 'user' },
      headers: { 'x-user-role': 'admin', 'x-role': 'admin', role: 'admin' },
    })
    const middleware = requireRole('admin')
    middleware(ctx.req, ctx.res, ctx.next)
    const res = ctx.getResult()
    assert(res.nextCalled === false, 'Custom headers do not bypass check')
    assert(res.statusCode === 403, 'Returns 403 Forbidden')
  }

  // 8. Multiple allowed roles
  console.log('\n--- Test 8: Multiple allowed roles ---')
  {
    const middleware = requireRole('admin', 'user')

    const userCtx = createMockContext({ user: { userId: 'u1', role: 'user' } })
    middleware(userCtx.req, userCtx.res, userCtx.next)
    assert(userCtx.getResult().nextCalled === true, 'User passes requireRole("admin", "user")')

    const adminCtx = createMockContext({ user: { userId: 'a1', role: 'admin' } })
    middleware(adminCtx.req, adminCtx.res, adminCtx.next)
    assert(adminCtx.getResult().nextCalled === true, 'Admin passes requireRole("admin", "user")')

    const guestCtx = createMockContext({ user: { userId: 'g1', role: 'guest' } })
    middleware(guestCtx.req, guestCtx.res, guestCtx.next)
    assert(guestCtx.getResult().statusCode === 403, 'Guest fails requireRole("admin", "user") with 403')

    // Array form requireRole(['admin', 'user'])
    const arrayMiddleware = requireRole(['admin', 'user'])
    const arrayCtx = createMockContext({ user: { userId: 'u1', role: 'user' } })
    arrayMiddleware(arrayCtx.req, arrayCtx.res, arrayCtx.next)
    assert(arrayCtx.getResult().nextCalled === true, 'Array syntax requireRole(["admin", "user"]) works')
  }

  // 9. Unsupported / empty role configuration fails safely
  console.log('\n--- Test 9: Unsupported / empty role configuration ---')
  {
    const emptyMiddleware = requireRole()
    const ctx = createMockContext({ user: { userId: 'u1', role: 'user' } })
    emptyMiddleware(ctx.req, ctx.res, ctx.next)
    assert(ctx.getResult().statusCode === 403, 'Empty allowedRoles fails safely with 403')
  }

  // 10. Pipeline integration: authenticate + requireRole in Express HTTP server
  console.log('\n--- Test 10: End-to-End Pipeline (authenticate -> requireRole) ---')
  const userToken = jwt.sign({ userId: 'pipeline_user', role: 'user' }, secret, { expiresIn: '1h' })
  const adminToken = jwt.sign({ userId: 'pipeline_admin', role: 'admin' }, secret, { expiresIn: '1h' })

  const testApp = express()
  testApp.use(express.json())

  // Admin-only route
  testApp.get('/admin-only', authenticate, requireRole('admin'), (req, res) => {
    res.json({ message: 'Welcome Admin', user: req.user })
  })

  // Multi-role route
  testApp.get('/shared', authenticate, requireRole('admin', 'user'), (req, res) => {
    res.json({ message: 'Welcome Member', user: req.user })
  })

  const server = testApp.listen(0)
  const port = server.address().port
  const base = `http://127.0.0.1:${port}`

  try {
    // 10a. Unauthenticated to admin route → 401
    const resNoAuth = await fetch(`${base}/admin-only`)
    assert(resNoAuth.status === 401, 'No auth token to /admin-only returns 401')

    // 10b. Normal user to admin route → 403
    const resUserAdmin = await fetch(`${base}/admin-only`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert(resUserAdmin.status === 403, 'User token to /admin-only returns 403')

    // 10c. Admin to admin route → 200
    const resAdminAdmin = await fetch(`${base}/admin-only`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const dataAdminAdmin = await resAdminAdmin.json()
    assert(resAdminAdmin.status === 200, 'Admin token to /admin-only returns 200')
    assert(dataAdminAdmin.user && dataAdminAdmin.user.role === 'admin', 'Response returns verified admin user')

    // 10d. User to shared route → 200
    const resUserShared = await fetch(`${base}/shared`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    assert(resUserShared.status === 200, 'User token to /shared returns 200')

    // 10e. Admin to shared route → 200
    const resAdminShared = await fetch(`${base}/shared`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    assert(resAdminShared.status === 200, 'Admin token to /shared returns 200')

    // 10f. User with spoof payload to admin route → 403
    const resSpoofUser = await fetch(`${base}/admin-only?role=admin`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'x-user-role': 'admin',
      },
    })
    assert(resSpoofUser.status === 403, 'User token with spoofed role params/headers to /admin-only returns 403')
  } finally {
    server.close()
  }

  console.log(`\n========================================`)
  console.log(`AUTH-6 Role Middleware Test Suite Summary: Passed: ${passed}, Failed: ${failed}`)
  console.log(`========================================`)

  if (failed > 0) {
    process.exit(1)
  }
}

runRoleMiddlewareTests().catch((err) => {
  console.error('Role middleware test suite failed:', err)
  process.exit(1)
})
