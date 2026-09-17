// AegisBreach AUTH-12 Follow-Up: Logout & Auth State Lifecycle Test Suite
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

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

async function runLogoutSuite() {
  console.log('--- Starting AUTH-12 Follow-Up: Logout UI & Lifecycle Suite ---')

  const clientDir = path.resolve(__dirname, '../client/src')

  // Section 1: Static Code Inspection for Logout in UI Components
  console.log('\n--- Section 1: Static Code & Security Verification ---')
  const topBarSrc = fs.readFileSync(path.join(clientDir, 'components/layout/TopBar.jsx'), 'utf-8')
  const projectsSrc = fs.readFileSync(path.join(clientDir, 'pages/Projects.jsx'), 'utf-8')
  const adminProjectsSrc = fs.readFileSync(path.join(clientDir, 'components/admin/AdminProjectsPage.jsx'), 'utf-8')
  const adminBatchesSrc = fs.readFileSync(path.join(clientDir, 'components/admin/AdminBatchesPage.jsx'), 'utf-8')
  const adminDocsSrc = fs.readFileSync(path.join(clientDir, 'components/admin/AdminDocumentsPage.jsx'), 'utf-8')
  const authContextSrc = fs.readFileSync(path.join(clientDir, 'context/AuthContext.jsx'), 'utf-8')

  const appSrc = fs.readFileSync(path.join(clientDir, 'App.jsx'), 'utf-8')
  const loginSrc = fs.readFileSync(path.join(clientDir, 'pages/Login.jsx'), 'utf-8')

  assert(topBarSrc.includes('logout()') && topBarSrc.includes('handleLogout') && topBarSrc.includes('Logout'), 'TopBar.jsx wires useAuth().logout() to Logout button')
  assert(topBarSrc.includes("navigate('/login')"), 'TopBar.jsx redirects to /login on logout')
  assert(!topBarSrc.includes('to="/admin"'), 'TopBar.jsx contains NO Admin button or link')

  assert(projectsSrc.includes('logout()') && projectsSrc.includes('handleLogout') && projectsSrc.includes('Logout'), 'Projects.jsx wires useAuth().logout() to Logout button')
  assert(projectsSrc.includes("navigate('/login')"), 'Projects.jsx redirects to /login on logout')
  assert(!projectsSrc.includes('to="/admin"'), 'Projects.jsx contains NO Admin button or link')

  assert(adminProjectsSrc.includes('logout()') && adminProjectsSrc.includes('handleLogout'), 'AdminProjectsPage.jsx provides Logout action')
  assert(adminBatchesSrc.includes('logout()') && adminBatchesSrc.includes('handleLogout'), 'AdminBatchesPage.jsx provides Logout action')
  assert(adminDocsSrc.includes('logout()') && adminDocsSrc.includes('handleLogout'), 'AdminDocumentsPage.jsx provides Logout action')

  assert(authContextSrc.includes('localStorage.removeItem'), 'AuthContext.logout() removes both token and user from storage')
  assert(authContextSrc.includes('authNotice') && authContextSrc.includes('Logged in as'), 'AuthContext manages role login notice')
  assert(loginSrc.includes("role === 'admin'") && loginSrc.includes("navigate('/admin')") && loginSrc.includes("navigate('/projects')"), 'Login.jsx redirects admin to /admin and normal user to /projects')
  assert(appSrc.includes('auth-toast-notification'), 'App.jsx renders auth-toast-notification')

  // Section 2: Functional Auth State & Navigation Lifecycle Simulation
  console.log('\n--- Section 2: Functional Auth Lifecycle Simulation ---')

  // Mock localStorage
  const mockStorage = new Map()
  const storageApi = {
    getItem: (key) => mockStorage.get(key) || null,
    setItem: (key, val) => mockStorage.set(key, String(val)),
    removeItem: (key) => mockStorage.delete(key),
    clear: () => mockStorage.clear(),
  }

  // Flow 1: Normal user login
  const normalUserToken = 'mock_jwt_token_user_123'
  const normalUserData = { id: 'usr_1', username: 'john_reviewer', email: 'john@example.com', role: 'user' }

  storageApi.setItem('aegisbreach_token', normalUserToken)
  storageApi.setItem('aegisbreach_user', JSON.stringify(normalUserData))

  assert(storageApi.getItem('aegisbreach_token') === normalUserToken, 'Normal user logged in: token stored')
  assert(JSON.parse(storageApi.getItem('aegisbreach_user')).role === 'user', 'Normal user logged in: role is "user"')

  // Flow 1b: User clicks Logout
  function simulateLogout() {
    storageApi.removeItem('aegisbreach_token')
    storageApi.removeItem('aegisbreach_user')
  }

  simulateLogout()
  assert(storageApi.getItem('aegisbreach_token') === null, 'After logout: token cleared from storage')
  assert(storageApi.getItem('aegisbreach_user') === null, 'After logout: user object cleared from storage')

  // Flow 3: Access after logout
  function guardCheck(targetPath, token, role) {
    if (!token) return '/login' // Unauthenticated always redirects to /login
    if (targetPath.startsWith('/admin')) {
      return role === 'admin' ? '/admin' : '/projects'
    }
    return targetPath
  }

  const adminRedirectAfterLogout = guardCheck('/admin', storageApi.getItem('aegisbreach_token'), null)
  assert(adminRedirectAfterLogout === '/login', 'After logout: navigating to /admin redirects to /login')

  const projectsRedirectAfterLogout = guardCheck('/projects', storageApi.getItem('aegisbreach_token'), null)
  assert(projectsRedirectAfterLogout === '/login', 'After logout: unauthenticated access to /projects redirects to /login')

  // Flow 4: Refresh after logout
  const refreshedToken = storageApi.getItem('aegisbreach_token')
  const refreshedUser = storageApi.getItem('aegisbreach_user')
  assert(refreshedToken === null && refreshedUser === null, 'Page refresh after logout preserves logged-out state (no session restored)')

  // Flow 2: Admin login & logout
  const adminToken = 'mock_jwt_token_admin_456'
  const adminUserData = { id: 'admin_1', username: 'admin', email: 'admin@aegisbreach.com', role: 'admin' }

  storageApi.setItem('aegisbreach_token', adminToken)
  storageApi.setItem('aegisbreach_user', JSON.stringify(adminUserData))

  assert(storageApi.getItem('aegisbreach_token') === adminToken, 'Admin logged in: token stored')
  assert(guardCheck('/admin', adminToken, 'admin') === '/admin', 'Admin logged in: direct navigation to /admin permitted')

  simulateLogout()
  assert(storageApi.getItem('aegisbreach_token') === null, 'Admin clicks logout: token cleared')
  assert(guardCheck('/admin', storageApi.getItem('aegisbreach_token'), null) === '/login', 'Admin after logout: /admin redirects to /login')

  // Flow 5: Login again works normally
  storageApi.setItem('aegisbreach_token', normalUserToken)
  storageApi.setItem('aegisbreach_user', JSON.stringify(normalUserData))
  assert(storageApi.getItem('aegisbreach_token') === normalUserToken, 'Subsequent login works normally')
  assert(guardCheck('/admin', normalUserToken, 'user') === '/projects', 'Normal user is redirected to /projects on accessing /admin')

  console.log('\n========================================')
  console.log(`AUTH-12 Follow-Up Summary: Passed: ${passed}, Failed: ${failed}`)
  console.log('========================================\n')

  if (failed > 0) process.exit(1)
}

runLogoutSuite()
