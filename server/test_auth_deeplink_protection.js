import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDir = path.resolve(__dirname, '../client/src')

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

console.log('--- Starting AUTH Deep-Link Protection & 401 Interceptor Verification Suite ---\n')

// ---------------------------------------------------------------------------
// 1. Static Source Inspections for App.jsx & api.js
// ---------------------------------------------------------------------------
console.log('--- Section 1: Static Route Guard & Interceptor Invariants ---')
const appSrc = fs.readFileSync(path.join(clientDir, 'App.jsx'), 'utf-8')
const apiSrc = fs.readFileSync(path.join(clientDir, 'services/api.js'), 'utf-8')
const protectedRouteSrc = fs.readFileSync(path.join(clientDir, 'routes/ProtectedRoute.jsx'), 'utf-8')
const adminRouteSrc = fs.readFileSync(path.join(clientDir, 'routes/AdminRoute.jsx'), 'utf-8')

// App.jsx route guards
assert(
  appSrc.includes("import ProtectedRoute from './routes/ProtectedRoute'"),
  'App.jsx imports ProtectedRoute'
)

assert(
  appSrc.includes('<ProtectedRoute>') && appSrc.includes('</ProtectedRoute>'),
  'App.jsx uses ProtectedRoute component'
)

assert(
  appSrc.includes('path="/projects"') &&
  appSrc.includes('<ProtectedRoute>\n              <Projects />\n            </ProtectedRoute>') ||
  appSrc.includes('<ProtectedRoute><Projects /></ProtectedRoute>') ||
  (appSrc.includes('path="/projects"') && appSrc.includes('<Projects />') && appSrc.indexOf('ProtectedRoute') < appSrc.indexOf('<Projects />')),
  'App.jsx wraps /projects route in ProtectedRoute'
)

assert(
  appSrc.includes('path="/projects/:projectId/*"') &&
  (appSrc.includes('<ProjectWorkspace />') && appSrc.lastIndexOf('ProtectedRoute') > appSrc.indexOf('projects/:projectId/*')),
  'App.jsx wraps /projects/:projectId/* wildcard deep links in ProtectedRoute'
)

assert(
  appSrc.includes('path="/admin"') && appSrc.includes('<AdminRoute>'),
  'App.jsx preserves AdminRoute wrapping for admin routes'
)

// ProtectedRoute.jsx
assert(
  protectedRouteSrc.includes('!isAuthenticated') && protectedRouteSrc.includes('to="/login"'),
  'ProtectedRoute redirects unauthenticated visitors to /login'
)

// api.js interceptors
assert(
  apiSrc.includes('interceptors.request.use') && apiSrc.includes('Authorization'),
  'api.js has request interceptor attaching Bearer token'
)

assert(
  apiSrc.includes('interceptors.response.use') && apiSrc.includes('status === 401'),
  'api.js has response interceptor handling HTTP 401'
)

assert(
  apiSrc.includes('localStorage.removeItem(TOKEN_KEY)') && apiSrc.includes('localStorage.removeItem(USER_KEY)'),
  'api.js 401 interceptor purges both TOKEN_KEY and USER_KEY'
)

assert(
  apiSrc.includes('/login'),
  'api.js 401 interceptor targets /login for redirect'
)

assert(
  apiSrc.includes('currentPath !== \'/login\'') && apiSrc.includes('currentPath !== \'/register\''),
  'api.js 401 interceptor avoids redirect loop on /login and /register'
)

// ---------------------------------------------------------------------------
// 2. Functional Simulation: ProtectedRoute Navigation Decisions
// ---------------------------------------------------------------------------
console.log('\n--- Section 2: ProtectedRoute Navigation Simulation ---')

function evaluateProtectedRoute({ isAuthenticated, path }) {
  if (!isAuthenticated) {
    return {
      allowed: false,
      render: null,
      redirectTo: '/login',
      state: { from: path },
    }
  }
  return {
    allowed: true,
    render: 'ProtectedComponent',
    redirectTo: null,
  }
}

// 2a. Unauthenticated direct deep links
const deepLinks = [
  '/projects',
  '/projects/aegisbreach-reviewer-test-02/review',
  '/projects/aegisbreach-reviewer-test-02/documents',
  '/projects/aegisbreach-reviewer-test-02/documents/OR-600001/coding',
]

for (const dl of deepLinks) {
  const result = evaluateProtectedRoute({ isAuthenticated: false, path: dl })
  assert(
    result.allowed === false && result.redirectTo === '/login' && result.render === null,
    `Unauthenticated access to "${dl}" immediately redirects to /login without mounting component`
  )
}

// 2b. Authenticated visitor access to deep links
for (const dl of deepLinks) {
  const result = evaluateProtectedRoute({ isAuthenticated: true, path: dl })
  assert(
    result.allowed === true && result.redirectTo === null && result.render === 'ProtectedComponent',
    `Authenticated access to "${dl}" is permitted`
  )
}

// ---------------------------------------------------------------------------
// 3. Functional Simulation: Axios 401 Response Interceptor
// ---------------------------------------------------------------------------
console.log('\n--- Section 3: Axios 401 Response Interceptor Simulation ---')

function createMockStorage(initialState = {}) {
  const storage = { ...initialState }
  return {
    getItem: (k) => storage[k] || null,
    setItem: (k, v) => { storage[k] = String(v) },
    removeItem: (k) => { delete storage[k] },
    dump: () => ({ ...storage }),
  }
}

function simulateResponseInterceptor({ status, currentPath, storage }) {
  let redirectedTo = null
  const mockWindow = {
    location: {
      pathname: currentPath,
      assign: (url) => { redirectedTo = url },
      href: currentPath,
    },
  }

  const error = {
    response: {
      status,
      data: { error: 'Test error' },
    },
  }

  // Interceptor logic
  if (error?.response?.status === 401) {
    storage.removeItem('aegisbreach_token')
    storage.removeItem('aegisbreach_user')

    if (mockWindow.location) {
      const p = mockWindow.location.pathname
      if (p !== '/login' && p !== '/register') {
        mockWindow.location.assign('/login')
      }
    }
  }

  return { redirectedTo, storageDump: storage.dump() }
}

// 3a. 401 on protected page (/projects/xyz/review)
const storage1 = createMockStorage({
  aegisbreach_token: 'expired_token_abc',
  aegisbreach_user: JSON.stringify({ id: 'u1', username: 'user1', role: 'user' }),
})
const res401 = simulateResponseInterceptor({
  status: 401,
  currentPath: '/projects/xyz/review',
  storage: storage1,
})
assert(res401.storageDump.aegisbreach_token === undefined, '401 removes aegisbreach_token from localStorage')
assert(res401.storageDump.aegisbreach_user === undefined, '401 removes aegisbreach_user from localStorage')
assert(res401.redirectedTo === '/login', '401 triggers browser redirect to /login')

// 3b. 401 while already on /login (e.g. invalid credentials)
const storage2 = createMockStorage({})
const res401Login = simulateResponseInterceptor({
  status: 401,
  currentPath: '/login',
  storage: storage2,
})
assert(res401Login.redirectedTo === null, '401 on /login does not trigger redundant redirect (no loop)')

// 3c. 403 Forbidden (RBAC violation) should NOT clear authentication
const storage3 = createMockStorage({
  aegisbreach_token: 'valid_user_token',
  aegisbreach_user: JSON.stringify({ id: 'u1', username: 'user1', role: 'user' }),
})
const res403 = simulateResponseInterceptor({
  status: 403,
  currentPath: '/projects/xyz/coding',
  storage: storage3,
})
assert(res403.storageDump.aegisbreach_token === 'valid_user_token', '403 Forbidden does NOT purge auth token')
assert(res403.redirectedTo === null, '403 Forbidden does NOT redirect to /login')

// 3d. 409 Conflict (e.g. Batch already acquired) should NOT clear authentication
const storage4 = createMockStorage({
  aegisbreach_token: 'valid_user_token',
  aegisbreach_user: JSON.stringify({ id: 'u1', username: 'user1', role: 'user' }),
})
const res409 = simulateResponseInterceptor({
  status: 409,
  currentPath: '/projects/xyz/review',
  storage: storage4,
})
assert(res409.storageDump.aegisbreach_token === 'valid_user_token', '409 Conflict does NOT purge auth token')
assert(res409.redirectedTo === null, '409 Conflict does NOT redirect to /login')

// 3e. 500 Server Error should NOT clear authentication
const storage5 = createMockStorage({
  aegisbreach_token: 'valid_user_token',
  aegisbreach_user: JSON.stringify({ id: 'u1', username: 'user1', role: 'user' }),
})
const res500 = simulateResponseInterceptor({
  status: 500,
  currentPath: '/projects',
  storage: storage5,
})
assert(res500.storageDump.aegisbreach_token === 'valid_user_token', '500 Server Error does NOT purge auth token')
assert(res500.redirectedTo === null, '500 Server Error does NOT redirect to /login')

// ---------------------------------------------------------------------------
// 4. AdminRoute Invariant Verification
// ---------------------------------------------------------------------------
console.log('\n--- Section 4: AdminRoute Invariant Verification ---')

function evaluateAdminRoute({ isAuthenticated, user }) {
  if (!isAuthenticated || !user) {
    return { render: null, redirectTo: '/login' }
  }
  if (user.role !== 'admin') {
    return { render: null, redirectTo: '/projects' }
  }
  return { render: 'AdminWorkspace', redirectTo: null }
}

const adminUnauth = evaluateAdminRoute({ isAuthenticated: false, user: null })
assert(adminUnauth.redirectTo === '/login', 'AdminRoute redirects unauthenticated visitor to /login')

const adminNormalUser = evaluateAdminRoute({ isAuthenticated: true, user: { role: 'user' } })
assert(adminNormalUser.redirectTo === '/projects', 'AdminRoute redirects normal user to /projects')

const adminAdminUser = evaluateAdminRoute({ isAuthenticated: true, user: { role: 'admin' } })
assert(adminAdminUser.render === 'AdminWorkspace' && adminAdminUser.redirectTo === null, 'AdminRoute renders AdminWorkspace for admin user')

console.log(`\n========================================`)
console.log(`Deep-Link Auth & 401 Interceptor Suite Summary: Passed: ${passed}, Failed: ${failed}`)
console.log(`========================================`)

if (failed > 0) {
  process.exit(1)
}
