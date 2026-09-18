import axios from 'axios'

const TOKEN_KEY = 'aegisbreach_token'
const USER_KEY = 'aegisbreach_user'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

// Request interceptor: automatically attach Bearer token if present
api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch {}
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle 401 Unauthorized by clearing storage and redirecting to /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      try {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      } catch {}

      if (typeof window !== 'undefined' && window.location) {
        const currentPath = window.location.pathname
        if (currentPath !== '/login' && currentPath !== '/register') {
          if (typeof window.location.assign === 'function') {
            window.location.assign('/login')
          } else {
            window.location.href = '/login'
          }
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
