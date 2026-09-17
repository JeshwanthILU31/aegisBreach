import User from '../models/User.js'

export async function getAllUsers() {
  return User.find().select('_id name email role createdAt updatedAt').lean()
}

export async function getUserById(id) {
  return User.findById(id).select('_id name email role createdAt updatedAt').lean()
}

export async function createUser(data) {
  const user = new User({
    name: data.name,
    email: data.email,
    role: data.role || 'user',
  })
  const saved = await user.save()
  const obj = saved.toObject()
  return {
    _id: obj._id,
    name: obj.name,
    email: obj.email,
    role: obj.role,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  }
}
