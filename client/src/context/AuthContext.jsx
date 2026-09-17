import { createContext, useContext, useState } from 'react'
import { loginUser as loginApi } from '../services/authApi'

const TOKEN_KEY = 'aegisbreach_token'
const USER_KEY = 'aegisbreach_user'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
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
      } catch {}
      return null
    }
  })

  const isAuthenticated = Boolean(token && user)

  async function login(identifier, password) {
    const data = await loginApi({ identifier, password })
    const { token: receivedToken, user: receivedUser } = data

    // Store only minimal safe fields (id, username, email, role)
    const safeUser = {
      id: receivedUser.id,
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
    return data
  }

  function logout() {
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    } catch (err) {
      console.error('Failed to remove auth state from storage', err)
    }
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated,
        login,
        logout,
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
