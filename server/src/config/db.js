import mongoose from 'mongoose'

export async function connectDatabase() {
  if (!process.env.MONGO_URI) {
    console.warn('MONGO_URI is not configured; skipping MongoDB connection.')
    return
  }

  await mongoose.connect(process.env.MONGO_URI)
  console.log('MongoDB connected')
}
