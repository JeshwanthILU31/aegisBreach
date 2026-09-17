import axios from 'axios'

const TOKEN_KEY = 'aegisbreach_token'

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
export default api
