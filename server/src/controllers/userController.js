import * as userService from '../services/userService.js'

export async function getUsers(_request, response) {
  try {
    const users = await userService.getAllUsers()
    response.json(users)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
}

export async function getUser(request, response) {
  try {
    const { id } = request.params
    const user = await userService.getUserById(id)
    if (!user) {
      return response.status(404).json({ error: 'User not found' })
    }
    response.json(user)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
}

export async function createUser(request, response) {
  try {
    const { name, email } = request.body
    if (!name || typeof name !== 'string' || !name.trim()) {
      return response.status(400).json({ error: 'User name is required' })
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return response.status(400).json({ error: 'Email is required' })
    }

    const user = await userService.createUser(request.body)
    response.status(201).json(user)
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({ error: 'A user with that email already exists' })
    }
    if (error.name === 'ValidationError') {
      return response.status(400).json({ error: error.message })
    }
    response.status(500).json({ error: error.message })
  }
}
