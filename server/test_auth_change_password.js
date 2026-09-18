// AegisBreach: Change Password Endpoint & Security Test Suite
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const BASE_URL = 'http://localhost:5050/api'

let passed = 0
let failed = 0

function assert(condition, message, details = '') {
  if (condition) {
    console.log(`  [PASS] ${message}`)
    passed++
  } else {
    console.error(`  [FAIL] ${message}${details ? ' -> ' + details : ''}`)
    failed++
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
  return { status: res.status, data }
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
  return { status: res.status, data }
}

async function runTestSuite() {
  console.log('--- Starting AegisBreach Change Password Test Suite ---')

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aegisbreach'
  await mongoose.connect(mongoUri)
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }))

  // Unique test users
  const testUserA_name = `pwtest_a_${Date.now()}`
  const testUserA_email = `${testUserA_name}@test.com`
  const initialPasswordA = 'InitialPassword123!'
  const updatedPasswordA = 'NewSuperSecret456!'

  const testUserB_name = `pwtest_b_${Date.now()}`
  const testUserB_email = `${testUserB_name}@test.com`
  const initialPasswordB = 'UserBPassword123!'

  try {
    // 1. Register test users
    console.log('\n--- 1. User Registration & Setup ---')
    const regA = await post('/auth/register', {
      username: testUserA_name,
      email: testUserA_email,
      password: initialPasswordA,
    })
    assert(regA.status === 201, 'User A registered successfully')

    const regB = await post('/auth/register', {
      username: testUserB_name,
      email: testUserB_email,
      password: initialPasswordB,
    })
    assert(regB.status === 201, 'User B registered successfully')

    // 2. Login to get JWT tokens
    const loginA = await post('/auth/login', {
      identifier: testUserA_name,
      password: initialPasswordA,
    })
    assert(loginA.status === 200 && loginA.data.token, 'User A logged in, token received')
    const tokenA = loginA.data.token
    const userA_id = loginA.data.user.id

    const loginB = await post('/auth/login', {
      identifier: testUserB_name,
      password: initialPasswordB,
    })
    assert(loginB.status === 200 && loginB.data.token, 'User B logged in, token received')
    const tokenB = loginB.data.token
    const userB_id = loginB.data.user.id

    // 3. Unauthenticated request verification
    console.log('\n--- 2. Unauthenticated & Malformed Request Tests ---')
    const noAuthRes = await put('/auth/change-password', {
      currentPassword: initialPasswordA,
      newPassword: updatedPasswordA,
    })
    assert(noAuthRes.status === 401, 'Unauthenticated change password request rejected with 401')

    const malformedTokenRes = await put(
      '/auth/change-password',
      { currentPassword: initialPasswordA, newPassword: updatedPasswordA },
      'invalid-token-here'
    )
    assert(malformedTokenRes.status === 401, 'Malformed token rejected with 401')

    // 4. Missing / Invalid Field Validations
    console.log('\n--- 3. Field & Validation Tests ---')
    const missingCurrentRes = await put(
      '/auth/change-password',
      { newPassword: updatedPasswordA },
      tokenA
    )
    assert(missingCurrentRes.status === 400, 'Missing currentPassword rejected with 400', missingCurrentRes.data.error)

    const missingNewRes = await put(
      '/auth/change-password',
      { currentPassword: initialPasswordA },
      tokenA
    )
    assert(missingNewRes.status === 400, 'Missing newPassword rejected with 400', missingNewRes.data.error)

    const shortPasswordRes = await put(
      '/auth/change-password',
      { currentPassword: initialPasswordA, newPassword: 'short' },
      tokenA
    )
    assert(shortPasswordRes.status === 400, 'New password < 8 characters rejected with 400', shortPasswordRes.data.error)

    const samePasswordRes = await put(
      '/auth/change-password',
      { currentPassword: initialPasswordA, newPassword: initialPasswordA },
      tokenA
    )
    assert(samePasswordRes.status === 400, 'New password identical to current password rejected with 400', samePasswordRes.data.error)

    // 5. Wrong Current Password Verification
    console.log('\n--- 4. Wrong Current Password Rejection ---')
    const wrongCurrentRes = await put(
      '/auth/change-password',
      { currentPassword: 'WrongPassword999!', newPassword: updatedPasswordA },
      tokenA
    )
    assert(wrongCurrentRes.status === 401, 'Wrong current password rejected with generic 401', wrongCurrentRes.data.error)

    // 6. Body Spoofing Prevention (JWT userId authority)
    console.log('\n--- 5. Body Identity Spoofing Protection ---')
    // User A attempts to send userB_id in body to change User B's password
    const spoofRes = await put(
      '/auth/change-password',
      {
        userId: userB_id,
        currentPassword: initialPasswordB, // User B's password
        newPassword: 'HackedUserBPassword!',
      },
      tokenA // but authenticated as User A!
    )
    // Should fail with 401 because User A's current password is NOT initialPasswordB
    assert(
      spoofRes.status === 401,
      'Body userId spoofing ignored; verified JWT target user A password checked (rejected 401)'
    )

    // Verify User B's password was NOT changed
    const userB_db = await User.findById(userB_id).lean()
    const isUserB_intact = await bcrypt.compare(initialPasswordB, userB_db.password)
    assert(isUserB_intact, 'User B password in DB remained intact after spoof attempt')

    // 7. Successful Password Change for User A
    console.log('\n--- 6. Successful Password Change & Response Inspection ---')
    const changeSuccessRes = await put(
      '/auth/change-password',
      { currentPassword: initialPasswordA, newPassword: updatedPasswordA },
      tokenA
    )
    assert(changeSuccessRes.status === 200, 'Password change request succeeded with 200')
    assert(
      changeSuccessRes.data.message === 'Password changed successfully',
      'Response returned "Password changed successfully"'
    )
    assert(!changeSuccessRes.data.password, 'Response does NOT contain password')
    assert(!changeSuccessRes.data.passwordHash, 'Response does NOT contain passwordHash')
    assert(!changeSuccessRes.data.secret, 'Response does NOT contain secret')

    // 8. MongoDB Verification
    console.log('\n--- 7. Database & Login Lifecycle Verification ---')
    const userA_db = await User.findById(userA_id).lean()
    assert(userA_db.password.startsWith('$2a$') || userA_db.password.startsWith('$2b$'), 'New password is saved as a bcrypt hash in MongoDB')
    const isNewHashMatch = await bcrypt.compare(updatedPasswordA, userA_db.password)
    assert(isNewHashMatch, 'New password matches MongoDB bcrypt hash')
    const isOldHashMatch = await bcrypt.compare(initialPasswordA, userA_db.password)
    assert(!isOldHashMatch, 'Old password does NOT match MongoDB bcrypt hash')

    // 9. Login with old password fails
    const oldLoginRes = await post('/auth/login', {
      identifier: testUserA_name,
      password: initialPasswordA,
    })
    assert(oldLoginRes.status === 401, 'Login with old password now rejected with 401')

    // 10. Login with new password succeeds
    const newLoginRes = await post('/auth/login', {
      identifier: testUserA_name,
      password: updatedPasswordA,
    })
    assert(newLoginRes.status === 200 && newLoginRes.data.token, 'Login with new password succeeds with 200')

  } finally {
    // Cleanup temporary test users
    await User.deleteMany({
      username: { $in: [testUserA_name, testUserB_name] },
    })
    await mongoose.disconnect()
  }

  console.log(`\n========================================`)
  console.log(`Change Password Suite Summary: Passed: ${passed}, Failed: ${failed}`)
  console.log(`========================================\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

runTestSuite().catch((err) => {
  console.error('Test runner failed:', err)
  process.exit(1)
})
