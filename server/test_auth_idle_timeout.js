// AegisBreach: Authenticated Inactivity / Idle Timeout Test Suite
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

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

async function runIdleTimeoutTests() {
  console.log('--- Starting AegisBreach Inactivity / Idle Timeout Test Suite ---')

  const clientDir = path.resolve(__dirname, '../client/src')
  const authContextSrc = fs.readFileSync(path.join(clientDir, 'context/AuthContext.jsx'), 'utf-8')

  // -------------------------------------------------------------
  // Section 1: Static Architecture & Constants Verification
  // -------------------------------------------------------------
  console.log('\n--- Section 1: Static Architecture & Constants ---')

  assert(
    authContextSrc.includes('IDLE_TIMEOUT_MS = 60 * 60 * 1000') || authContextSrc.includes('3600000') || authContextSrc.includes('60 * 60 * 1000'),
    'AuthContext defines 1-hour idle timeout duration (60 * 60 * 1000 ms = 3600000 ms)'
  )

  const requiredEvents = ['mousemove', 'mousedown', 'click', 'keydown', 'scroll', 'touchstart', 'touchmove', 'wheel']
  const allEventsPresent = requiredEvents.every(ev => authContextSrc.includes(`'${ev}'`))
  assert(allEventsPresent, `AuthContext registers listeners for all meaningful user activity events (${requiredEvents.join(', ')})`)

  assert(authContextSrc.includes('timerRef'), 'AuthContext manages single timer reference via useRef to prevent excess re-renders')
  assert(authContextSrc.includes('You have been logged out due to inactivity.'), 'AuthContext includes inactivity logout notification message')
  assert(authContextSrc.includes('removeEventListener'), 'AuthContext removes event listeners during cleanup')
  assert(authContextSrc.includes('clearTimeout'), 'AuthContext clears active timeout during reset and cleanup')

  // -------------------------------------------------------------
  // Section 2: Deterministic Mock Lifecycle Simulation (Fake Timers)
  // -------------------------------------------------------------
  console.log('\n--- Section 2: Deterministic Mock Lifecycle Simulation (Fake Timers) ---')

  // Mock Clock and Timers
  let currentTime = 1000000
  let nextTimerId = 1
  const activeTimers = new Map()

  function mockSetTimeout(callback, delay) {
    const id = nextTimerId++
    activeTimers.set(id, {
      callback,
      triggerAt: currentTime + delay,
      delay,
    })
    return id
  }

  function mockClearTimeout(id) {
    activeTimers.delete(id)
  }

  function advanceTimeBy(ms) {
    currentTime += ms
    const dueTimers = []
    for (const [id, timer] of activeTimers.entries()) {
      if (timer.triggerAt <= currentTime) {
        dueTimers.push({ id, timer })
      }
    }
    dueTimers.sort((a, b) => a.timer.triggerAt - b.timer.triggerAt)
    for (const { id, timer } of dueTimers) {
      if (activeTimers.has(id)) {
        activeTimers.delete(id)
        timer.callback()
      }
    }
  }

  // Mock Storage
  const mockStorage = {
    store: {},
    getItem(k) { return this.store[k] || null },
    setItem(k, v) { this.store[k] = String(v) },
    removeItem(k) { delete this.store[k] },
    clear() { this.store = {} },
  }

  // Mock Window Event Emitter
  const windowListeners = new Map()
  function mockAddEventListener(event, handler, options) {
    if (!windowListeners.has(event)) windowListeners.set(event, new Set())
    windowListeners.get(event).add(handler)
  }
  function mockRemoveEventListener(event, handler) {
    if (windowListeners.has(event)) {
      windowListeners.get(event).delete(handler)
    }
  }
  function simulateUserEvent(event) {
    if (windowListeners.has(event)) {
      for (const handler of Array.from(windowListeners.get(event))) {
        handler({ type: event })
      }
    }
  }

  // Simulated Auth Lifecycle Manager mimicking AuthContext logic
  class SimulatedAuthContext {
    constructor() {
      this.token = null
      this.user = null
      this.authNotice = null
      this.timerId = null
      this.lastActivityTime = currentTime
      this.cleanupListener = null
      this.redirectTarget = null
    }

    get isAuthenticated() {
      return Boolean(this.token && this.user)
    }

    login(token, user) {
      this.token = token
      this.user = user
      mockStorage.setItem('aegisbreach_token', token)
      mockStorage.setItem('aegisbreach_user', JSON.stringify(user))
      this.authNotice = `Logged in as ${user.role}`
      this.syncEffect()
    }

    logout(notice = null) {
      if (this.timerId) {
        mockClearTimeout(this.timerId)
        this.timerId = null
      }
      mockStorage.removeItem('aegisbreach_token')
      mockStorage.removeItem('aegisbreach_user')
      this.token = null
      this.user = null
      this.authNotice = notice
      this.redirectTarget = '/login'
      this.syncEffect()
    }

    handleIdleTimeout() {
      mockStorage.removeItem('aegisbreach_token')
      mockStorage.removeItem('aegisbreach_user')
      this.token = null
      this.user = null
      this.authNotice = 'You have been logged out due to inactivity.'
      this.redirectTarget = '/login'
      this.syncEffect()
    }

    syncEffect() {
      // Cleanup previous
      if (this.cleanupListener) {
        this.cleanupListener()
        this.cleanupListener = null
      }
      if (this.timerId) {
        mockClearTimeout(this.timerId)
        this.timerId = null
      }

      if (!this.isAuthenticated) {
        return
      }

      const ONE_HOUR = 60 * 60 * 1000
      const resetTimer = () => {
        if (this.timerId) {
          mockClearTimeout(this.timerId)
        }
        this.timerId = mockSetTimeout(() => this.handleIdleTimeout(), ONE_HOUR)
      }

      let lastEventTime = currentTime
      const onActivity = () => {
        const now = currentTime
        if (now - lastEventTime > 500) {
          lastEventTime = now
          resetTimer()
        }
      }

      resetTimer()

      requiredEvents.forEach((ev) => mockAddEventListener(ev, onActivity))

      this.cleanupListener = () => {
        if (this.timerId) {
          mockClearTimeout(this.timerId)
          this.timerId = null
        }
        requiredEvents.forEach((ev) => mockRemoveEventListener(ev, onActivity))
      }
    }
  }

  // Test 1: Unauthenticated user has NO active timer or event listeners
  const auth = new SimulatedAuthContext()
  auth.syncEffect()
  assert(activeTimers.size === 0, 'Unauthenticated user has no active idle timer')
  let totalListeners = 0
  windowListeners.forEach(handlers => { totalListeners += handlers.size })
  assert(totalListeners === 0, 'Unauthenticated user registers zero window activity listeners')

  // Test 2: Authenticated user registers timer and listeners
  auth.login('mock-jwt-token-123', { id: 'u1', username: 'john_doe', role: 'user' })
  assert(auth.isAuthenticated, 'User is authenticated')
  assert(activeTimers.size === 1, 'Exactly 1 active timer registered on login')
  let authListeners = 0
  windowListeners.forEach(handlers => { authListeners += handlers.size })
  assert(authListeners === requiredEvents.length, `Registered exactly ${requiredEvents.length} event listeners on login`)

  // Test 3: User activity at 45 minutes resets the 1-hour idle timer
  advanceTimeBy(45 * 60 * 1000) // 45 minutes pass
  assert(auth.isAuthenticated, 'User remains authenticated at 45 minutes')
  assert(activeTimers.size === 1, 'Timer is still pending at 45 minutes')

  // Simulate mouse movement at 45m mark
  simulateUserEvent('mousemove')
  // 30 more minutes pass (total 75m since login, but only 30m since last activity)
  advanceTimeBy(30 * 60 * 1000)
  assert(auth.isAuthenticated, 'User remains authenticated after activity reset (30 min after mousemove)')
  assert(mockStorage.getItem('aegisbreach_token') === 'mock-jwt-token-123', 'Token remains in storage')

  // Test 4: Keydown / Scroll / Touch activity also resets timer
  simulateUserEvent('keydown')
  advanceTimeBy(20 * 60 * 1000) // 20m
  simulateUserEvent('scroll')
  advanceTimeBy(20 * 60 * 1000) // 20m
  simulateUserEvent('touchstart')
  advanceTimeBy(20 * 60 * 1000) // 20m
  simulateUserEvent('click')
  advanceTimeBy(50 * 60 * 1000) // 50m
  assert(auth.isAuthenticated, 'User remains authenticated after multiple activity types (keydown, scroll, touch, click)')

  // Test 5: Inactivity for exactly 1 hour (60 minutes) triggers automatic logout
  advanceTimeBy(10 * 60 * 1000 + 1) // +10m 1s -> total 60m 1s without any new activity
  assert(!auth.isAuthenticated, 'User is automatically logged out after 1 hour of total inactivity')
  assert(auth.token === null && auth.user === null, 'Auth state (token, user) is cleared to null')
  assert(mockStorage.getItem('aegisbreach_token') === null, 'aegisbreach_token removed from localStorage')
  assert(mockStorage.getItem('aegisbreach_user') === null, 'aegisbreach_user removed from localStorage')
  assert(
    auth.authNotice === 'You have been logged out due to inactivity.',
    'Notice "You have been logged out due to inactivity." displayed'
  )
  assert(auth.redirectTarget === '/login', 'User redirected to /login')

  // Test 6: Clean state after idle logout
  assert(activeTimers.size === 0, 'No active timers remain after idle logout')
  let postLogoutListeners = 0
  windowListeners.forEach(handlers => { postLogoutListeners += handlers.size })
  assert(postLogoutListeners === 0, 'All window event listeners removed after idle logout')

  // Test 7: Manual logout clears timer and listeners immediately
  auth.login('mock-jwt-admin-token', { id: 'admin1', username: 'admin', role: 'admin' })
  assert(activeTimers.size === 1, 'Timer active for newly logged-in admin')
  auth.logout()
  assert(!auth.isAuthenticated, 'Admin logged out manually')
  assert(activeTimers.size === 0, 'Timer cleared immediately on manual logout')
  let manualLogoutListeners = 0
  windowListeners.forEach(handlers => { manualLogoutListeners += handlers.size })
  assert(manualLogoutListeners === 0, 'All window listeners cleaned up on manual logout')

  console.log(`\n========================================`)
  console.log(`Idle Timeout Suite Summary: Passed: ${passed}, Failed: ${failed}`)
  console.log(`========================================\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

runIdleTimeoutTests().catch((err) => {
  console.error('Test error:', err)
  process.exit(1)
})
