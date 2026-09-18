import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,30}$/
const MIN_PASSWORD_LENGTH = 8

export async function registerUser({ username, email, password }) {
  // 1. Validation
  if (!username || typeof username !== 'string' || !username.trim()) {
    const err = new Error('Username is required')
    err.status = 400
    throw err
  }

  const cleanUsername = username.trim().toLowerCase()
  if (!USERNAME_REGEX.test(cleanUsername)) {
    const err = new Error('Username must be between 3 and 30 characters and contain only letters, numbers, dots, hyphens, or underscores')
    err.status = 400
    throw err
  }

  if (!email || typeof email !== 'string' || !email.trim()) {
    const err = new Error('Email is required')
    err.status = 400
    throw err
  }

  const cleanEmail = email.trim().toLowerCase()
  if (!EMAIL_REGEX.test(cleanEmail)) {
    const err = new Error('Please provide a valid email address')
    err.status = 400
    throw err
  }

  if (!password || typeof password !== 'string') {
    const err = new Error('Password is required')
    err.status = 400
    throw err
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    const err = new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`)
    err.status = 400
    throw err
  }

  // 2. Pre-check uniqueness for clear error reporting
  const existingUsername = await User.findOne({ username: cleanUsername })
  if (existingUsername) {
    const err = new Error('A user with that username already exists')
    err.status = 409
    throw err
  }

  const existingEmail = await User.findOne({ email: cleanEmail })
  if (existingEmail) {
    const err = new Error('A user with that email already exists')
    err.status = 409
    throw err
  }

  // 3. Create user — strictly role: "user"
  const user = new User({
    username: cleanUsername,
    name: cleanUsername,
    email: cleanEmail,
    password: password,
    role: 'user', // strictly forced to normal user
  })

  const saved = await user.save()
  const obj = saved.toObject()

  // 4. Return safe representation (never password or sensitive hash)
  return {
    id: obj._id,
    username: obj.username,
    email: obj.email,
    role: obj.role,
    createdAt: obj.createdAt,
  }
}

export async function loginUser({ identifier, password }) {
  if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
    const err = new Error('Username or email is required')
    err.status = 400
    throw err
  }

  if (!password || typeof password !== 'string') {
    const err = new Error('Password is required')
    err.status = 400
    throw err
  }

  const cleanIdentifier = identifier.trim().toLowerCase()

  const user = await User.findOne({
    $or: [{ email: cleanIdentifier }, { username: cleanIdentifier }],
  }).select('+password')

  if (!user) {
    const err = new Error('Invalid username/email or password')
    err.status = 401
    throw err
  }

  const isMatch = await user.comparePassword(password)
  if (!isMatch) {
    const err = new Error('Invalid username/email or password')
    err.status = 401
    throw err
  }

  const secret = process.env.JWT_SECRET
  if (!secret) {
    const err = new Error('JWT_SECRET is not configured on the server')
    err.status = 500
    throw err
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '24h'

  const token = jwt.sign(
    {
      userId: user._id,
      role: user.role,
    },
    secret,
    { expiresIn }
  )

  return {
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  }
}

export async function changePassword({ userId, currentPassword, newPassword }) {
  if (!currentPassword || typeof currentPassword !== 'string' || !currentPassword.trim()) {
    const err = new Error('Current password is required')
    err.status = 400
    throw err
  }

  if (!newPassword || typeof newPassword !== 'string') {
    const err = new Error('New password is required')
    err.status = 400
    throw err
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    const err = new Error(`New password must be at least ${MIN_PASSWORD_LENGTH} characters long`)
    err.status = 400
    throw err
  }

  if (currentPassword === newPassword) {
    const err = new Error('New password must be different from current password')
    err.status = 400
    throw err
  }

  const user = await User.findById(userId).select('+password')
  if (!user) {
    const err = new Error('User not found')
    err.status = 404
    throw err
  }

  const isMatch = await user.comparePassword(currentPassword)
  if (!isMatch) {
    const err = new Error('Invalid current password')
    err.status = 401
    throw err
  }

  user.password = newPassword
  await user.save()

  return { message: 'Password changed successfully' }
}
