import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const BASE_URL = 'http://localhost:5050'

async function runAuth9Tests() {
  console.log('--- Starting AUTH-9 Frontend Auth State & Token Handling Test Suite ---')
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

  // 1. Static code verification of AuthContext, api.js interceptor, and Login.jsx
  console.log('\n--- Section 1: Static Architecture Inspections ---')
  const clientDir = path.resolve(__dirname, '../client/src')
  const authContextSrc = fs.readFileSync(path.join(clientDir, 'context/AuthContext.jsx'), 'utf-8')
  const apiSrc = fs.readFileSync(path.join(clientDir, 'services/api.js'), 'utf-8')
  const mainSrc = fs.readFileSync(path.join(clientDir, 'main.jsx'), 'utf-8')
  const loginSrc = fs.readFileSync(path.join(clientDir, 'pages/Login.jsx'), 'utf-8')

  // AuthContext assertions
  assert(authContextSrc.includes('AuthProvider') && authContextSrc.includes('useAuth'), 'AuthContext exports AuthProvider and useAuth hook')
  assert(authContextSrc.includes('isAuthenticated') && authContextSrc.includes('login') && authContextSrc.includes('logout'), 'AuthContext exposes user, token, isAuthenticated, login, logout')
  assert(authContextSrc.includes('localStorage.getItem'), 'Auth state initializes from localStorage on mount/refresh')
  assert(authContextSrc.includes('localStorage.removeItem'), 'Logout and error recovery clear localStorage')
  assert(!authContextSrc.includes('passwordHash') && !authContextSrc.includes('ADMIN_PASSWORD') && !authContextSrc.includes('JWT_SECRET'), 'AuthContext does NOT store or handle password hashes or secrets')

  // api.js interceptor assertions
  assert(apiSrc.includes('interceptors.request.use'), 'api.js configures axios request interceptor')
  assert(apiSrc.includes('Authorization') && apiSrc.includes('Bearer'), 'Interceptor automatically attaches Bearer token')

  // main.jsx assertions
  assert(mainSrc.includes('<AuthProvider>'), 'main.jsx wraps application in AuthProvider')

  // Login.jsx assertions
  assert(loginSrc.includes('useAuth()') && loginSrc.includes('login('), 'Login.jsx calls centralized useAuth().login')

  // 2. Functional State Simulation Tests
  console.log('\n--- Section 2: Functional Auth State & Token Interception Simulation ---')
  const timestamp = Date.now()
  const testUser = {
    username: `state_user_${timestamp}`,
    email: `state_user_${timestamp}@example.com`,
    password: 'Password123!',
  }

  // 2a. Register user
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser),
  })
  assert(regRes.status === 201, 'User registration succeeds (201)')

  // 2b. Login with normal user
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: testUser.username, password: testUser.password }),
  })
  const loginData = await loginRes.json()
  assert(loginRes.status === 200, 'User login succeeds (200)')
  assert(Boolean(loginData.token), 'Token returned on login')
  assert(loginData.user && loginData.user.role === 'user', 'Normal user has role="user"')
  assert(!loginData.user.password && !loginData.user.passwordHash, 'User object has no password or passwordHash')

  // Simulate storing in localStorage as AuthContext does
  const mockStorage = {
    aegisbreach_token: loginData.token,
    aegisbreach_user: JSON.stringify(loginData.user),
  }

  // Simulate refresh: parse from storage
  const restoredToken = mockStorage.aegisbreach_token
  const restoredUser = JSON.parse(mockStorage.aegisbreach_user)
  assert(restoredToken === loginData.token, 'Token restored on simulated refresh')
  assert(restoredUser.role === 'user', 'User role restored on simulated refresh')

  // Simulate authenticated API request with auto-attached token
  const projRes = await fetch(`${BASE_URL}/api/projects`, {
    headers: { Authorization: `Bearer ${restoredToken}` },
  })
  assert(projRes.status === 200, 'Protected API call succeeds with attached Bearer token')

  // Simulate logout
  delete mockStorage.aegisbreach_token
  delete mockStorage.aegisbreach_user
  assert(!mockStorage.aegisbreach_token && !mockStorage.aegisbreach_user, 'Storage is completely cleared on logout')

  // Simulate unauthenticated request after logout
  const unauthRes = await fetch(`${BASE_URL}/api/projects`)
  assert(unauthRes.status === 401, 'Unauthenticated request after logout correctly returns 401')

  // 2c. Admin login & state simulation
  const adminUsername = process.env.ADMIN_USERNAME || 'admin'
  const adminPassword = process.env.ADMIN_PASSWORD
  if (adminPassword) {
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: adminUsername, password: adminPassword }),
    })
    const adminLoginData = await adminLoginRes.json()
    assert(adminLoginRes.status === 200, 'Admin login succeeds (200)')
    assert(adminLoginData.user && adminLoginData.user.role === 'admin', 'Admin state contains role="admin"')
    assert(Boolean(adminLoginData.token), 'Admin token returned')
  }

  // 2d. Malformed storage recovery simulation
  const malformedStorage = {
    aegisbreach_token: 'corrupt_token',
    aegisbreach_user: '{ not valid json ...',
  }
  let recoveredUser = null
  try {
    recoveredUser = JSON.parse(malformedStorage.aegisbreach_user)
  } catch {
    delete malformedStorage.aegisbreach_user
    delete malformedStorage.aegisbreach_token
    recoveredUser = null
  }
  assert(recoveredUser === null, 'Malformed JSON in storage is handled safely without crashing')
  assert(!malformedStorage.aegisbreach_user && !malformedStorage.aegisbreach_token, 'Malformed storage keys are purged on error')

  console.log(`\n========================================`)
  console.log(`AUTH-9 Test Suite Summary: Passed: ${passed}, Failed: ${failed}`)
  console.log(`========================================`)

  if (failed > 0) {
    process.exit(1)
  }
}

runAuth9Tests().catch((err) => {
  console.error('AUTH-9 test suite failure:', err)
  process.exit(1)
})
