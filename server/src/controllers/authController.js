import * as authService from '../services/authService.js'

export async function register(request, response) {
  try {
    const { username, email, password } = request.body || {}
    const user = await authService.registerUser({ username, email, password })
    response.status(201).json(user)
  } catch (error) {
    if (error.code === 11000) {
      const isUsername = error.keyPattern && error.keyPattern.username
      return response.status(409).json({
        error: isUsername ? 'A user with that username already exists' : 'A user with that email already exists',
      })
    }
    if (error.status) {
      return response.status(error.status).json({ error: error.message })
    }
    if (error.name === 'ValidationError') {
      return response.status(400).json({ error: error.message })
    }
    response.status(500).json({ error: error.message || 'Internal server error' })
  }
}

export async function login(request, response) {
  try {
    const { identifier, password } = request.body || {}
    const result = await authService.loginUser({ identifier, password })
    response.status(200).json(result)
  } catch (error) {
    if (error.status) {
      return response.status(error.status).json({ error: error.message })
    }
    response.status(500).json({ error: error.message || 'Internal server error' })
  }
}

export async function changePassword(request, response) {
  try {
    const userId = request.user?.userId
    if (!userId) {
      return response.status(401).json({ error: 'Authentication required' })
    }
    const { currentPassword, newPassword } = request.body || {}
    const result = await authService.changePassword({ userId, currentPassword, newPassword })
    response.status(200).json(result)
  } catch (error) {
    if (error.status) {
      return response.status(error.status).json({ error: error.message })
    }
    if (error.name === 'ValidationError') {
      return response.status(400).json({ error: error.message })
    }
    response.status(500).json({ error: error.message || 'Internal server error' })
  }
}

