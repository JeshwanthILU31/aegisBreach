import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../models/User.js'

export async function bootstrapAdmin() {
  const mongoUri = process.env.MONGO_URI
  if (!mongoUri) {
    console.error('MONGO_URI is missing. Cannot bootstrap admin.')
    process.exit(1)
  }

  const username = process.env.ADMIN_USERNAME
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!username || !email || !password) {
    console.error('ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD environment variables are required for admin bootstrap.')
    process.exit(1)
  }

  const shouldCloseConnection = mongoose.connection.readyState === 0
  if (shouldCloseConnection) {
    await mongoose.connect(mongoUri)
  }

  try {
    // Check if an admin account already exists
    const existingAdmin = await User.findOne({ role: 'admin' })
    if (existingAdmin) {
      console.log(`Admin account already exists (${existingAdmin.username || existingAdmin.email}). Skipping bootstrap.`)
      return existingAdmin
    }

    // Check if user with that email or username already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { username: username.toLowerCase().trim() },
      ],
    })

    if (existingUser) {
      console.log(`User with specified email or username already exists (${existingUser.email}). Skipping bootstrap.`)
      return existingUser
    }

    // Create exactly one admin using environment variables
    const adminUser = new User({
      username: username.trim().toLowerCase(),
      name: 'System Administrator',
      email: email.trim().toLowerCase(),
      password: password,
      role: 'admin',
    })

    await adminUser.save()
    console.log(`Admin account successfully initialized: ${adminUser.username} (${adminUser.email}) with role "admin".`)
    return adminUser
  } finally {
    if (shouldCloseConnection && process.argv[1] === fileURLToPath(import.meta.url)) {
      await mongoose.disconnect()
    }
  }
}

import { fileURLToPath } from 'url'

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  bootstrapAdmin()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Admin bootstrap error:', error.message)
      process.exit(1)
    })
}
