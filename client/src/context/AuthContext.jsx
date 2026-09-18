import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser as loginApi } from '../services/authApi'

export const TOKEN_KEY = 'aegisbreach_token'
export const USER_KEY = 'aegisbreach_user'
export const IDLE_TIMEOUT_MS = 60 * 60 * 1000 // 1 hour in milliseconds

export const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'click',
  'keydown',
  'scroll',
  'touchstart',
  'touchmove',
  'wheel',
]

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_KEY) || null
    } catch {
      return null
    }
  })

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(USER_KEY)
      if (!savedUser) return null
      const parsed = JSON.parse(savedUser)
      // Validate safe structure (id, username, email, role)
      if (parsed && typeof parsed === 'object' && parsed.id && parsed.role) {
        return {
          id: parsed.id,
          username: parsed.username,
          email: parsed.email,
          role: parsed.role,
        }
      }
      // If malformed, clear storage safely
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(TOKEN_KEY)
      return null
    } catch {
      try {
        localStorage.removeItem(USER_KEY)
        localStorage.removeItem(TOKEN_KEY)
      } catch { }
      return null
    }
  })

  const [authNotice, setAuthNotice] = useState(null)
  const isAuthenticated = Boolean(token && user)
  const timerRef = useRef(null)

  function showAuthNotice(message, duration = 3500) {
    setAuthNotice(message)
    setTimeout(() => {
      setAuthNotice(null)
    }, duration)
  }

  const handleIdleTimeout = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    } catch (err) {
      console.error('Failed to remove auth state from storage', err)
    }
    setToken(null)
    setUser(null)
    showAuthNotice('You have been logged out due to inactivity.')
    if (typeof navigate === 'function') {
      navigate('/login')
    }
  }, [navigate])

  // Inactivity / Idle Timeout Lifecycle
  useEffect(() => {
    if (!isAuthenticated) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(handleIdleTimeout, IDLE_TIMEOUT_MS)
    }

    let lastActivityTime = Date.now()
    const onActivity = () => {
      const now = Date.now()
      // Throttle timer resetting to prevent overhead from high-frequency events (e.g. mousemove/scroll)
      if (now - lastActivityTime > 500) {
        lastActivityTime = now
        resetTimer()
      }
    }

    // Start timer upon authentication
    resetTimer()

    // Register user activity listeners
    if (typeof window !== 'undefined' && window.addEventListener) {
      ACTIVITY_EVENTS.forEach((event) => {
        window.addEventListener(event, onActivity, { passive: true })
      })
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      if (typeof window !== 'undefined' && window.removeEventListener) {
        ACTIVITY_EVENTS.forEach((event) => {
          window.removeEventListener(event, onActivity)
        })
      }
    }
  }, [isAuthenticated, handleIdleTimeout])

  async function login(identifier, password) {
    const data = await loginApi({ identifier, password })
    const { token: receivedToken, user: receivedUser } = data

    // Store only minimal safe fields (id, username, email, role)
    const safeUser = {
      id: receivedUser.id || receivedUser._id,
      username: receivedUser.username,
      email: receivedUser.email,
      role: receivedUser.role,
    }

    try {
      localStorage.setItem(TOKEN_KEY, receivedToken)
      localStorage.setItem(USER_KEY, JSON.stringify(safeUser))
    } catch (err) {
      console.error('Failed to save auth state to storage', err)
    }

    setToken(receivedToken)
    setUser(safeUser)

    const roleLabel = safeUser.role === 'admin' ? 'Admin' : 'User'
    showAuthNotice(`Logged in as ${roleLabel}`)

    return { ...data, token: receivedToken, user: safeUser }
  }

  function logout(notice = null) {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    } catch (err) {
      console.error('Failed to remove auth state from storage', err)
    }
    setToken(null)
    setUser(null)
    if (notice) {
      showAuthNotice(notice)
    } else {
      setAuthNotice(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated,
        authNotice,
        showAuthNotice,
        login,
        logout,
        handleIdleTimeout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
