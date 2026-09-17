import mongoose from 'mongoose'

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    matterName: {
      type: String,
      trim: true,
      default: '',
    },
    matterNumber: {
      type: String,
      trim: true,
      default: '',
    },
    clientNumber: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['Active', 'Archived', 'Pending'],
      default: 'Active',
    },
  },
  { timestamps: true }
)

export default mongoose.models.Project || mongoose.model('Project', projectSchema)
