import api from './api'

export async function loginUser(credentials) {
  const response = await api.post('/auth/login', credentials)
  return response.data
}

export async function registerUser(userData) {
  const response = await api.post('/auth/register', userData)
  return response.data
}

export async function changePassword(passwordData) {
  const response = await api.put('/auth/change-password', passwordData)
  return response.data
}
