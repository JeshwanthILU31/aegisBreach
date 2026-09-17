import mongoose from 'mongoose'

const documentSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
      index: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: [true, 'Batch ID is required'],
      index: true,
    },
    controlNumber: {
      type: String,
      required: [true, 'Control number is required'],
      trim: true,
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    fileSize: {
      type: String,
      default: '1.5 MB',
      trim: true,
    },
    folder: {
      type: String,
      default: 'Set 6',
      trim: true,
    },
    reportableData: {
      type: String,
      enum: ['Yes', 'No', 'Pending'],
      default: 'Pending',
    },
    flrReviewedBy: {
      type: String,
      default: '',
      trim: true,
    },
    flrReviewedOn: {
      type: String,
      default: '',
      trim: true,
    },
    extractionStatus: {
      type: String,
      enum: ['Complete', 'Completed', 'Pending', 'In Progress'],
      default: 'Pending',
    },
    extractedBy: {
      type: String,
      default: '',
      trim: true,
    },
    extractedOn: {
      type: String,
      default: '',
      trim: true,
    },
    fileUrl: {
      type: String,
      default: '',
      trim: true,
    },
    cloudinaryPublicId: {
      type: String,
      default: '',
      trim: true,
    },
    resourceType: {
      type: String,
      enum: ['image', 'raw', 'auto'],
      default: 'auto',
    },
    format: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
)

documentSchema.index({ projectId: 1, batchId: 1 })
documentSchema.index({ projectId: 1, controlNumber: 1 }, { unique: true })

export default mongoose.models.Document || mongoose.model('Document', documentSchema)
