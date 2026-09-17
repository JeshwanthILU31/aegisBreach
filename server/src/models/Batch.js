import mongoose from 'mongoose'

const batchSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Batch name is required'],
      trim: true,
    },
    batchSet: {
      type: String,
      trim: true,
      default: 'All Batches',
    },
    batchUnit: {
      type: String,
      trim: true,
      default: 'Alternate Workflow 6+ Entries',
    },
    status: {
      type: String,
      enum: ['Available', 'In Progress', 'Completed'],
      default: 'Available',
      index: true,
    },
    isLocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    acquiredAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    assignedToName: {
      type: String,
      trim: true,
      default: '',
    },
    reviewed: {
      type: Number,
      default: 0,
      min: 0,
    },
    batchSize: {
      type: Number,
      default: 50,
      min: 1,
    },
  },
  { timestamps: true }
)

batchSchema.index({ projectId: 1, name: 1 }, { unique: true })
batchSchema.index({ projectId: 1, status: 1, isLocked: 1 })

export default mongoose.models.Batch || mongoose.model('Batch', batchSchema)
