import User from '../models/User.js'

export async function getAllUsers() {
  return User.find().select('_id name username email role createdAt updatedAt').lean()
}

export async function getUserById(id) {
  return User.findById(id).select('_id name username email role createdAt updatedAt').lean()
}

export async function createUser(data) {
  const user = new User({
    name: data.name || data.username,
    username: data.username || (data.name ? data.name.toLowerCase().replace(/\s+/g, '') : undefined),
    email: data.email,
    password: data.password || data.passwordHash,
    role: 'user', // Public/standard registration is always role: 'user'
  })
  const saved = await user.save()
  const obj = saved.toObject()
  return {
    _id: obj._id,
    name: obj.name,
    username: obj.username,
    email: obj.email,
    role: obj.role,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  }
}
