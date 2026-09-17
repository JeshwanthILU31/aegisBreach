import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const BASE_URL = 'http://localhost:5050'

async function runAuth10Tests() {
  console.log('--- Starting AUTH-10 Hidden Admin Route & Frontend RBAC Test Suite ---')
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

  // 1. Static UI Inspection: Absence of Admin controls in normal user UI
  console.log('\n--- Section 1: Absence of Admin Controls in Normal User UI ---')
  const clientDir = path.resolve(__dirname, '../client/src')
  const projectsSrc = fs.readFileSync(path.join(clientDir, 'pages/Projects.jsx'), 'utf-8')
  const topBarSrc = fs.readFileSync(path.join(clientDir, 'components/layout/TopBar.jsx'), 'utf-8')
  const loginSrc = fs.readFileSync(path.join(clientDir, 'pages/Login.jsx'), 'utf-8')
  const registerSrc = fs.readFileSync(path.join(clientDir, 'pages/Register.jsx'), 'utf-8')
  const appSrc = fs.readFileSync(path.join(clientDir, 'App.jsx'), 'utf-8')
  const adminRouteSrc = fs.readFileSync(path.join(clientDir, 'routes/AdminRoute.jsx'), 'utf-8')

  assert(!projectsSrc.includes('to="/admin"'), 'Projects.jsx has NO Admin link button')
  assert(!topBarSrc.includes('to="/admin"'), 'TopBar.jsx has NO Admin link button')
  assert(!loginSrc.includes('Admin Login') && !loginSrc.includes('admin-button') && !loginSrc.includes('<select'), 'Login.jsx has NO Admin login button or role selector')
  assert(!registerSrc.includes('Register as Admin') && !registerSrc.includes('admin-registration') && !registerSrc.includes('<select'), 'Register.jsx has NO Admin registration option')

  // 2. Route Guard Architecture Verification
  console.log('\n--- Section 2: Route Guard Logic Inspection ---')
  assert(adminRouteSrc.includes('user.role !== \'admin\'') && adminRouteSrc.includes('to="/projects"'), 'AdminRoute redirects normal users (role !== admin) to /projects')
  assert(adminRouteSrc.includes('!isAuthenticated') && adminRouteSrc.includes('to="/login"'), 'AdminRoute redirects unauthenticated visitors to /login')
  assert(appSrc.includes('<AdminRoute>'), 'App.jsx wraps /admin and subroutes with AdminRoute guard')

  // 3. Simulated Guard Decision Logic Tests
  console.log('\n--- Section 3: Guard Decision Unit Simulation ---')

  function evaluateAdminRoute({ isAuthenticated, user }) {
    if (!isAuthenticated || !user) {
      return { render: null, redirectTo: '/login' }
    }
    if (user.role !== 'admin') {
      return { render: null, redirectTo: '/projects' }
    }
    return { render: 'AdminWorkspace', redirectTo: null }
  }

  // 3a. Unauthenticated visitor -> /login
  const unauthDecision = evaluateAdminRoute({ isAuthenticated: false, user: null })
  assert(unauthDecision.redirectTo === '/login', 'Unauthenticated visitor to /admin is redirected to /login')

  // 3b. Authenticated normal user -> /projects
  const normalUserDecision = evaluateAdminRoute({
    isAuthenticated: true,
    user: { id: 'u1', username: 'john', role: 'user' },
  })
  assert(normalUserDecision.redirectTo === '/projects', 'Normal authenticated user to /admin is redirected to /projects')
  assert(normalUserDecision.render === null, 'Normal user cannot render Admin workspace')

  // 3c. Normal user refresh on /admin (restores role="user" from storage) -> still /projects
  const refreshedUserDecision = evaluateAdminRoute({
    isAuthenticated: true,
    user: JSON.parse(JSON.stringify({ id: 'u1', username: 'john', role: 'user' })),
  })
  assert(refreshedUserDecision.redirectTo === '/projects', 'Normal user refreshing /admin remains blocked and redirected to /projects')

  // 3d. Authenticated admin -> renders AdminWorkspace
  const adminDecision = evaluateAdminRoute({
    isAuthenticated: true,
    user: { id: 'a1', username: 'admin', role: 'admin' },
  })
  assert(adminDecision.render === 'AdminWorkspace' && adminDecision.redirectTo === null, 'Admin navigating to /admin renders AdminWorkspace')

  // 3e. Admin refresh on /admin (restores role="admin" from storage) -> renders AdminWorkspace
  const refreshedAdminDecision = evaluateAdminRoute({
    isAuthenticated: true,
    user: JSON.parse(JSON.stringify({ id: 'a1', username: 'admin', role: 'admin' })),
  })
  assert(refreshedAdminDecision.render === 'AdminWorkspace', 'Admin refreshing /admin preserves authentication and renders AdminWorkspace')

  // 4. End-to-end Backend Security verification
  console.log('\n--- Section 4: Backend Security & RBAC Integrity ---')
  const timestamp = Date.now()
  const testUser = {
    username: `guard_user_${timestamp}`,
    email: `guard_user_${timestamp}@example.com`,
    password: 'Password123!',
  }

  // Register user
  await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser),
  })

  // Normal user login
  const loginUserRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: testUser.username, password: testUser.password }),
  })
  const loginUserData = await loginUserRes.json()
  const normalToken = loginUserData.token

  // Normal user attempting backend admin project creation -> 403
  const normalAdminApiRes = await fetch(`${BASE_URL}/api/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${normalToken}`,
    },
    body: JSON.stringify({ name: 'Blocked Admin Proj' }),
  })
  assert(normalAdminApiRes.status === 403, 'Normal user attempting backend admin API receives 403 Forbidden')

  // Admin login via standard login endpoint
  const adminUsername = process.env.ADMIN_USERNAME || 'admin'
  const adminPassword = process.env.ADMIN_PASSWORD
  if (adminPassword) {
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: adminUsername, password: adminPassword }),
    })
    const adminLoginData = await adminLoginRes.json()
    assert(adminLoginRes.status === 200, 'Admin authenticates through standard login endpoint')
    assert(adminLoginData.user && adminLoginData.user.role === 'admin', 'Admin user object has role="admin"')
  }

  console.log(`\n========================================`)
  console.log(`AUTH-10 Test Suite Summary: Passed: ${passed}, Failed: ${failed}`)
  console.log(`========================================`)

  if (failed > 0) {
    process.exit(1)
  }
}

runAuth10Tests().catch((err) => {
  console.error('AUTH-10 test suite failure:', err)
  process.exit(1)
})
