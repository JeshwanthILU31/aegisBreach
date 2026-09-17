import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const BASE_URL = 'http://localhost:5050'

async function runFrontendAuthTests() {
  console.log('--- Starting AUTH-8 Frontend Login & Registration UI Verification ---')
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

  // 1. Static UI Source Code Inspections
  console.log('\n--- Section 1: Static UI Source Code Inspections ---')
  const clientDir = path.resolve(__dirname, '../client/src')
  const loginSrc = fs.readFileSync(path.join(clientDir, 'pages/Login.jsx'), 'utf-8')
  const registerSrc = fs.readFileSync(path.join(clientDir, 'pages/Register.jsx'), 'utf-8')
  const appSrc = fs.readFileSync(path.join(clientDir, 'App.jsx'), 'utf-8')

  // Check Login fields
  assert(loginSrc.includes('name="identifier"') || loginSrc.includes('id="identifier"'), 'Login has identifier input field')
  assert(loginSrc.includes('type="password"'), 'Login password input uses type="password"')
  assert(!loginSrc.includes('<select') && !loginSrc.includes('name="role"'), 'Login has NO role selector')
  assert(!loginSrc.includes('admin-button') && !loginSrc.includes('Admin Login'), 'Login has NO admin button/selector')

  // Check Register fields
  assert(registerSrc.includes('name="username"'), 'Register has username input field')
  assert(registerSrc.includes('name="email"'), 'Register has email input field')
  assert(registerSrc.includes('name="password"') && registerSrc.includes('name="confirmPassword"'), 'Register has password and confirmPassword fields')
  assert(!registerSrc.includes('<select') && !registerSrc.includes('name="role"'), 'Register has NO role selector')
  assert(!registerSrc.includes('admin') && !registerSrc.includes('Admin Registration'), 'Register has NO admin registration option')


  // Check App routes
  assert(appSrc.includes('path="/login"') && appSrc.includes('path="/register"'), 'App.jsx registers /login and /register routes')

  // 2. Functional API integration for UI flows
  console.log('\n--- Section 2: Functional API Integration for UI Flows ---')
  const timestamp = Date.now()
  const testUser = {
    username: `fe_user_${timestamp}`,
    email: `fe_user_${timestamp}@example.com`,
    password: 'SuperPassword123!',
  }

  // Register
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser),
  })
  const regData = await regRes.json()
  assert(regRes.status === 201, 'Valid registration from UI payload returns 201')
  assert(regData.role === 'user', 'Created user is strictly role="user"')

  // Duplicate username
  const dupUserRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: testUser.username,
      email: `other_${timestamp}@example.com`,
      password: 'SuperPassword123!',
    }),
  })
  const dupUserData = await dupUserRes.json()
  assert(dupUserRes.status === 409, 'Duplicate username returns 409 Conflict')
  assert(dupUserData.error && dupUserData.error.includes('username already exists'), 'Duplicate username returns clear error message')

  // Duplicate email
  const dupEmailRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `other_user_${timestamp}`,
      email: testUser.email,
      password: 'SuperPassword123!',
    }),
  })
  const dupEmailData = await dupEmailRes.json()
  assert(dupEmailRes.status === 409, 'Duplicate email returns 409 Conflict')
  assert(dupEmailData.error && dupEmailData.error.includes('email already exists'), 'Duplicate email returns clear error message')

  // Login with Username
  const loginUserRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testUser.username,
      password: testUser.password,
    }),
  })
  const loginUserData = await loginUserRes.json()
  assert(loginUserRes.status === 200, 'Login with username returns 200')
  assert(loginUserData.user && loginUserData.user.role === 'user', 'Normal user login returns role="user"')
  assert(Boolean(loginUserData.token), 'Login returns valid token')

  // Login with Email
  const loginEmailRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testUser.email,
      password: testUser.password,
    }),
  })
  assert(loginEmailRes.status === 200, 'Login with email returns 200')

  // Login with Invalid Password
  const badPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testUser.username,
      password: 'WrongPassword999!',
    }),
  })
  const badPassData = await badPassRes.json()
  assert(badPassRes.status === 401, 'Invalid password returns 401')
  assert(badPassData.error === 'Invalid username/email or password', 'Generic error message on bad password')

  // Admin Login through same endpoint
  const adminUsername = process.env.ADMIN_USERNAME || 'admin'
  const adminPassword = process.env.ADMIN_PASSWORD
  if (adminPassword) {
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: adminUsername,
        password: adminPassword,
      }),
    })
    const adminLoginData = await adminLoginRes.json()
    assert(adminLoginRes.status === 200, 'Admin can login via same endpoint (200)')
    assert(adminLoginData.user && adminLoginData.user.role === 'admin', 'Admin user role is "admin"')
  }

  console.log(`\n========================================`)
  console.log(`AUTH-8 UI Integration Summary: Passed: ${passed}, Failed: ${failed}`)
  console.log(`========================================`)

  if (failed > 0) {
    process.exit(1)
  }
}

runFrontendAuthTests().catch((err) => {
  console.error('UI integration test error:', err)
  process.exit(1)
})
