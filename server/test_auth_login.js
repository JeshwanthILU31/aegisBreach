import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const BASE_URL = 'http://localhost:5050'

async function runAuthTests() {
  console.log('--- Starting AUTH-3 Registration & AUTH-4 Login Test Suite ---')
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

  const timestamp = Date.now()
  const testUser = {
    username: `testuser_${timestamp}`,
    email: `testuser_${timestamp}@example.com`,
    password: 'SuperSecretPassword123!',
  }

  const adminUsername = process.env.ADMIN_USERNAME || 'admin'
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@aegisbreach.com'
  const adminPassword = process.env.ADMIN_PASSWORD

  // 1. Register test normal user
  console.log('\n--- Step 1: Register Normal User (AUTH-3) ---')
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser),
  })
  const regData = await regRes.json()
  assert(regRes.status === 201, 'Registration returns 201')
  assert(regData.username === testUser.username.toLowerCase(), 'Registration returns correct username')
  assert(regData.email === testUser.email.toLowerCase(), 'Registration returns correct email')
  assert(regData.role === 'user', 'Registration assigns role="user"')
  assert(!regData.password && !regData.passwordHash, 'Registration does not return password/passwordHash')

  // 2. Test Login with Username
  console.log('\n--- Step 2: Login with Username (AUTH-4) ---')
  const loginUserRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testUser.username,
      password: testUser.password,
    }),
  })
  const loginUserData = await loginUserRes.json()
  assert(loginUserRes.status === 200, 'Valid login with username returns 200')
  assert(typeof loginUserData.token === 'string' && loginUserData.token.length > 0, 'Login response contains JWT token')
  assert(loginUserData.user && loginUserData.user.role === 'user', 'Normal user role is "user"')
  assert(loginUserData.user && loginUserData.user.username === testUser.username.toLowerCase(), 'User username matches')
  assert(loginUserData.user && loginUserData.user.email === testUser.email.toLowerCase(), 'User email matches')
  assert(!loginUserData.user.password && !loginUserData.user.passwordHash, 'Response user object does not contain password/passwordHash')
  assert(!loginUserData.password && !loginUserData.passwordHash, 'Response top-level does not contain password/passwordHash')

  // 3. Test JWT Decoding for normal user
  console.log('\n--- Step 3: JWT Payload Validation ---')
  const decodedNormal = jwt.decode(loginUserData.token)
  assert(decodedNormal && decodedNormal.userId, 'JWT contains userId')
  assert(decodedNormal && decodedNormal.role === 'user', 'JWT contains role="user"')
  assert(!decodedNormal.password && !decodedNormal.passwordHash, 'JWT does NOT contain password or passwordHash')

  // 4. Test Login with Email
  console.log('\n--- Step 4: Login with Email (AUTH-4) ---')
  const loginEmailRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testUser.email,
      password: testUser.password,
    }),
  })
  const loginEmailData = await loginEmailRes.json()
  assert(loginEmailRes.status === 200, 'Valid login with email returns 200')
  assert(typeof loginEmailData.token === 'string', 'Login with email returns token')
  assert(loginEmailData.user && loginEmailData.user.id === regData.id, 'User ID matches registered user')

  // 5. Test Case-insensitivity & Trim
  console.log('\n--- Step 5: Normalization (Whitespace & Mixed Case) ---')
  const loginNormRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: `  ${testUser.username.toUpperCase()}  `,
      password: testUser.password,
    }),
  })
  assert(loginNormRes.status === 200, 'Login with uppercase/padded username returns 200')

  // 6. Test Admin Login (if admin credentials exist in .env)
  console.log('\n--- Step 6: Admin Login (AUTH-4) ---')
  if (adminPassword) {
    const loginAdminRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: adminUsername,
        password: adminPassword,
      }),
    })
    const loginAdminData = await loginAdminRes.json()
    assert(loginAdminRes.status === 200, 'Valid admin login with username returns 200')
    assert(loginAdminData.user && loginAdminData.user.role === 'admin', 'Admin user role is "admin"')
    assert(!loginAdminData.user.password && !loginAdminData.user.passwordHash, 'Admin response does not leak password')

    const decodedAdmin = jwt.decode(loginAdminData.token)
    assert(decodedAdmin && decodedAdmin.role === 'admin', 'Admin JWT payload role is "admin"')
    assert(!decodedAdmin.password && !decodedAdmin.passwordHash, 'Admin JWT does not contain password')

    // Admin login with email
    const loginAdminEmailRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: adminEmail,
        password: adminPassword,
      }),
    })
    assert(loginAdminEmailRes.status === 200, 'Valid admin login with email returns 200')
  } else {
    console.log('  [SKIP] ADMIN_PASSWORD not in .env, skipping admin credentials test')
  }

  // 7. Error Cases
  console.log('\n--- Step 7: Authentication Failure Cases ---')

  // Invalid password
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
  assert(badPassData.error === 'Invalid username/email or password', 'Generic error message for bad password')

  // Non-existent username/email
  const badUserRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: `nonexistent_user_${timestamp}`,
      password: 'SomePassword123!',
    }),
  })
  const badUserData = await badUserRes.json()
  assert(badUserRes.status === 401, 'Non-existent identifier returns 401')
  assert(badUserData.error === 'Invalid username/email or password', 'Generic error message for non-existent identifier')

  // Missing identifier
  const missingIdRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      password: 'SomePassword123!',
    }),
  })
  assert(missingIdRes.status === 400, 'Missing identifier returns 400')

  // Missing password
  const missingPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testUser.username,
    }),
  })
  assert(missingPassRes.status === 400, 'Missing password returns 400')

  // Empty identifier
  const emptyIdRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: '   ',
      password: 'SomePassword123!',
    }),
  })
  assert(emptyIdRes.status === 400, 'Whitespace identifier returns 400')

  console.log(`\n========================================`)
  console.log(`Auth Test Suite Summary: Passed: ${passed}, Failed: ${failed}`)
  console.log(`========================================`)

  // Cleanup test normal user
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aegisBreach')
    const User = (await import('./src/models/User.js')).default
    await User.deleteOne({ email: testUser.email.toLowerCase() })
    await mongoose.disconnect()
    console.log('Cleaned up test user successfully.')
  } catch (e) {
    console.error('Cleanup error:', e.message)
  }

  if (failed > 0) {
    process.exit(1)
  }
}

runAuthTests().catch((err) => {
  console.error('Unhandled test failure:', err)
  process.exit(1)
})
