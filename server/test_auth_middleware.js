import jwt from 'jsonwebtoken'
import express from 'express'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { authenticate, requireAuth } from './src/middleware/authMiddleware.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

async function runMiddlewareTests() {
  console.log('--- Starting AUTH-5 JWT Authentication Middleware Test Suite ---')
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

  // Helper to create mock Express req/res/next
  function createMockContext({ headers = {}, body = {}, query = {}, params = {} } = {}) {
    let statusCode = 200
    let jsonResponse = null
    let nextCalled = false

    const req = {
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

  // Generate tokens for testing
  const validUserToken = jwt.sign({ userId: 'user_12345', role: 'user' }, secret, { expiresIn: '1h' })
  const validAdminToken = jwt.sign({ userId: 'admin_67890', role: 'admin' }, secret, { expiresIn: '1h' })
  const expiredToken = jwt.sign({ userId: 'user_expired', role: 'user' }, secret, { expiresIn: '-1s' })
  const wrongSecretToken = jwt.sign({ userId: 'user_tampered', role: 'user' }, 'completely_different_secret', { expiresIn: '1h' })
  const sensitiveToken = jwt.sign({ userId: 'user_sensitive', role: 'user', password: 'password123', passwordHash: '$2b$10$hash' }, secret, { expiresIn: '1h' })

  // 1. Valid normal-user JWT
  console.log('\n--- Test 1: Valid normal-user JWT ---')
  {
    const ctx = createMockContext({
      headers: { authorization: `Bearer ${validUserToken}` },
    })
    authenticate(ctx.req, ctx.res, ctx.next)
    const res = ctx.getResult()
    assert(res.nextCalled === true, 'Valid normal-user JWT calls next()')
    assert(res.user && res.user.userId === 'user_12345', 'req.user.userId is correctly populated')
    assert(res.user && res.user.role === 'user', 'req.user.role is "user"')
  }

  // 2. Valid admin JWT
  console.log('\n--- Test 2: Valid admin JWT ---')
  {
    const ctx = createMockContext({
      headers: { authorization: `Bearer ${validAdminToken}` },
    })
    authenticate(ctx.req, ctx.res, ctx.next)
    const res = ctx.getResult()
    assert(res.nextCalled === true, 'Valid admin JWT calls next()')
    assert(res.user && res.user.userId === 'admin_67890', 'req.user.userId is correctly populated')
    assert(res.user && res.user.role === 'admin', 'req.user.role is "admin"')
  }

  // 3. Missing Authorization header
  console.log('\n--- Test 3: Missing Authorization header ---')
  {
    const ctx = createMockContext({ headers: {} })
    authenticate(ctx.req, ctx.res, ctx.next)
    const res = ctx.getResult()
    assert(res.nextCalled === false, 'Missing header does not call next()')
    assert(res.statusCode === 401, 'Missing header returns 401')
    assert(res.jsonResponse && typeof res.jsonResponse.error === 'string', 'Returns safe error message')
  }

  // 4. Missing Bearer token
  console.log('\n--- Test 4: Missing Bearer token in header ---')
  {
    const ctx = createMockContext({ headers: { authorization: 'Bearer ' } })
    authenticate(ctx.req, ctx.res, ctx.next)
    const res = ctx.getResult()
    assert(res.nextCalled === false, 'Empty Bearer token does not call next()')
    assert(res.statusCode === 401, 'Empty Bearer token returns 401')
  }

  // 5. Malformed Authorization header
  console.log('\n--- Test 5: Malformed Authorization header ---')
  {
    const ctx1 = createMockContext({ headers: { authorization: 'Basic dXNlcjpwYXNz' } })
    authenticate(ctx1.req, ctx1.res, ctx1.next)
    assert(ctx1.getResult().statusCode === 401, 'Non-Bearer scheme returns 401')

    const ctx2 = createMockContext({ headers: { authorization: 'InvalidHeaderWithoutScheme' } })
    authenticate(ctx2.req, ctx2.res, ctx2.next)
    assert(ctx2.getResult().statusCode === 401, 'Single word header returns 401')

    const ctx3 = createMockContext({ headers: { authorization: `Bearer token1 token2 extra` } })
    authenticate(ctx3.req, ctx3.res, ctx3.next)
    assert(ctx3.getResult().statusCode === 401, 'Extra parts in header returns 401')
  }

  // 6. Invalid JWT signature / malformed token string
  console.log('\n--- Test 6: Invalid JWT signature / corrupt token ---')
  {
    const corruptToken = `${validUserToken.slice(0, -5)}abcde`
    const ctx = createMockContext({ headers: { authorization: `Bearer ${corruptToken}` } })
    authenticate(ctx.req, ctx.res, ctx.next)
    const res = ctx.getResult()
    assert(res.nextCalled === false, 'Corrupt token signature does not call next()')
    assert(res.statusCode === 401, 'Corrupt token signature returns 401')
  }

  // 7. Expired JWT
  console.log('\n--- Test 7: Expired JWT ---')
  {
    const ctx = createMockContext({ headers: { authorization: `Bearer ${expiredToken}` } })
    authenticate(ctx.req, ctx.res, ctx.next)
    const res = ctx.getResult()
    assert(res.nextCalled === false, 'Expired token does not call next()')
    assert(res.statusCode === 401, 'Expired token returns 401')
  }

  // 8. JWT signed with another secret
  console.log('\n--- Test 8: JWT signed with wrong secret ---')
  {
    const ctx = createMockContext({ headers: { authorization: `Bearer ${wrongSecretToken}` } })
    authenticate(ctx.req, ctx.res, ctx.next)
    const res = ctx.getResult()
    assert(res.nextCalled === false, 'Wrong secret does not call next()')
    assert(res.statusCode === 401, 'Wrong secret returns 401')
  }

  // 9 & 10. Role verification: user and admin
  console.log('\n--- Test 9 & 10: Verified user and admin roles ---')
  {
    const userCtx = createMockContext({ headers: { authorization: `Bearer ${validUserToken}` } })
    authenticate(userCtx.req, userCtx.res, userCtx.next)
    assert(userCtx.getResult().user.role === 'user', 'Normal token sets req.user.role = "user"')

    const adminCtx = createMockContext({ headers: { authorization: `Bearer ${validAdminToken}` } })
    authenticate(adminCtx.req, adminCtx.res, adminCtx.next)
    assert(adminCtx.getResult().user.role === 'admin', 'Admin token sets req.user.role = "admin"')
  }

  // 11. Request body/query cannot override authenticated role
  console.log('\n--- Test 11: Request body/query/params spoofing resistance ---')
  {
    const ctx = createMockContext({
      headers: { authorization: `Bearer ${validUserToken}` },
      body: { role: 'admin', userId: 'admin_hijacked' },
      query: { role: 'admin', userId: 'admin_hijacked' },
      params: { role: 'admin' },
    })
    authenticate(ctx.req, ctx.res, ctx.next)
    const res = ctx.getResult()
    assert(res.nextCalled === true, 'Request passes with valid token')
    assert(res.user.role === 'user', 'req.user.role is strictly "user" despite body/query role="admin"')
    assert(res.user.userId === 'user_12345', 'req.user.userId is strictly from token despite spoofing')
  }

  // 12. JWT containing password/passwordHash does not propagate sensitive data
  console.log('\n--- Test 12: Sensitive field stripping ---')
  {
    const ctx = createMockContext({
      headers: { authorization: `Bearer ${sensitiveToken}` },
    })
    authenticate(ctx.req, ctx.res, ctx.next)
    const res = ctx.getResult()
    assert(res.nextCalled === true, 'Token verified')
    assert(res.user.password === undefined, 'req.user does not have password property')
    assert(res.user.passwordHash === undefined, 'req.user does not have passwordHash property')
    assert(Object.keys(res.user).sort().join(',') === 'role,userId', 'req.user contains only userId and role')
  }

  // End-to-End Express test with HTTP server
  console.log('\n--- Test 13: End-to-End HTTP Route with Middleware ---')
  const testApp = express()
  testApp.use(express.json())
  testApp.get('/test-protected', authenticate, (req, res) => {
    res.json({ success: true, user: req.user })
  })

  const server = testApp.listen(0)
  const port = server.address().port

  try {
    const httpRes = await fetch(`http://127.0.0.1:${port}/test-protected`, {
      headers: { Authorization: `Bearer ${validUserToken}` },
    })
    const httpData = await httpRes.json()
    assert(httpRes.status === 200, 'HTTP GET /test-protected returns 200')
    assert(httpData.user && httpData.user.role === 'user', 'HTTP route returns authenticated user')

    const unauthRes = await fetch(`http://127.0.0.1:${port}/test-protected`)
    assert(unauthRes.status === 401, 'Unauthenticated HTTP request returns 401')
  } finally {
    server.close()
  }

  console.log(`\n========================================`)
  console.log(`AUTH-5 Middleware Test Suite Summary: Passed: ${passed}, Failed: ${failed}`)
  console.log(`========================================`)

  if (failed > 0) {
    process.exit(1)
  }
}

runMiddlewareTests().catch((err) => {
  console.error('Middleware test failed:', err)
  process.exit(1)
})
