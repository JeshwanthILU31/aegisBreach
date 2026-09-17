import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'user'],
        message: 'Role must be either "admin" or "user"',
      },
      default: 'user',
    },
  },
  { timestamps: true }
)

// Virtual passwordHash getter / setter for compatibility
userSchema.virtual('passwordHash')
  .get(function () {
    return this.password
  })
  .set(function (val) {
    this.password = val
  })

// Pre-save hook: auto-hash password if modified and not already hashed
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return
  // Only hash if not already a bcrypt hash
  if (!this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
  }
})

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false
  return bcrypt.compare(candidatePassword, this.password)
}

export default mongoose.models.User || mongoose.model('User', userSchema)
