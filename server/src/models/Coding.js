import mongoose from 'mongoose'

const personSchema = new mongoose.Schema({
  personDocLink: { type: String, default: '' },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  role: { type: String, default: '' },
}, { _id: false })

const codingSchema = new mongoose.Schema({
  projectId: { type: String, required: true, index: true },
  documentId: { type: String, required: true, index: true },
  alDesignation: { type: String, default: 'Relevant' },
  flrComplete: { type: String, default: 'Yes' },
  reportableDataFound: { type: String, default: 'Alternate Workflow 6+ Entries' },
  extractionStatus: { type: String, default: 'Completed' },
  alternateWorkflowEstimate: { type: String, default: '6 - 25 Entries' },
  alternateWorkflowComplete: { type: String, default: 'Yes' },
  awfExtractionCompleted: { type: String, default: 'Yes' },
  extractedOutsideRelativity: { type: String, default: '' },
  txtStatus: { type: String, default: '' },
  entriesCompleted: { type: String, default: '' },
  reviewerNotes: { type: String, default: '' },
  familyGroup: { type: String, default: 'None' },
  persons: { type: [personSchema], default: [] },
}, { timestamps: true })

codingSchema.index({ projectId: 1, documentId: 1 }, { unique: true })

export default mongoose.models.Coding || mongoose.model('Coding', codingSchema)

