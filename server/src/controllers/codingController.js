import Coding from '../models/Coding.js'
import Document from '../models/Document.js'
import Batch from '../models/Batch.js'
import * as documentService from '../services/documentService.js'

const defaultCoding = (projectId, documentId) => ({
  projectId,
  documentId,
  alDesignation: 'Relevant',
  flrComplete: 'Yes',
  reportableDataFound: 'Alternate Workflow 6+ Entries',
  extractionStatus: 'Completed',
  alternateWorkflowEstimate: '6 - 25 Entries',
  alternateWorkflowComplete: 'Yes',
  awfExtractionCompleted: 'Yes',
  extractedOutsideRelativity: '',
  txtStatus: '',
  entriesCompleted: '',
  reviewerNotes: '',
  familyGroup: 'None',
  persons: [],
})

export async function getCoding(request, response) {
  try {
    const { projectId, documentId } = request.params
    const document = await documentService.getDocumentById(projectId, documentId)
    if (!document) {
      return response.status(404).json({ error: 'Document not found' })
    }

    const coding = await Coding.findOne({
      projectId: document.projectId,
      documentId: document.controlNumber,
    }).lean()

    const batch = document.batchId
    const isAssignedToMe = Boolean(
      batch &&
      batch.assignedToName === 'Current Reviewer' &&
      batch.isLocked &&
      batch.status === 'In Progress'
    )

    const result = {
      ...(coding || defaultCoding(projectId, document.controlNumber)),
      readOnly: !isAssignedToMe,
      assignedToName: batch?.assignedToName || '',
      batchStatus: batch?.status || 'Available',
      document: {
        id: document._id,
        controlNumber: document.controlNumber,
        fileName: document.fileName,
        folder: document.folder,
        batchId: batch?._id,
        batchName: batch?.name || '',
      },
    }

    response.json(result)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
}

export async function saveCoding(request, response) {
  try {
    const { projectId, documentId } = request.params
    const reviewerName = request.body?.reviewerName || 'Current Reviewer'

    const document = await documentService.getDocumentById(projectId, documentId)
    if (!document) {
      return response.status(404).json({ error: 'Document not found' })
    }

    const batch = document.batchId
    if (
      !batch ||
      batch.assignedToName !== reviewerName ||
      !batch.isLocked ||
      batch.status !== 'In Progress'
    ) {
      return response.status(403).json({
        error: "Cannot edit document belonging to another employee's batch.",
        readOnly: true,
        assignedToName: batch?.assignedToName || '',
      })
    }

    const payload = {
      ...defaultCoding(projectId, document.controlNumber),
      ...request.body,
      projectId: document.projectId,
      documentId: document.controlNumber,
    }

    const coding = await Coding.findOneAndUpdate(
      { projectId: document.projectId, documentId: document.controlNumber },
      payload,
      { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean()

    // Update document review metadata (separate from extraction status)
    const today = new Date().toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    })

    const docUpdate = {
      flrReviewedBy: reviewerName,
      flrReviewedOn: today,
      reportableData: payload.reportableDataFound ? (payload.reportableDataFound === 'No' ? 'No' : 'Yes') : 'Yes',
    }

    // Only update extractionStatus on Document if explicitly provided as an extraction update
    if (request.body?.isExtractionUpdate && request.body?.extractionStatus) {
      docUpdate.extractionStatus = request.body.extractionStatus
    }

    await Document.findByIdAndUpdate(document._id, docUpdate)

    // Check batch documents for actual reviewed count and completion
    const batchDocs = await Document.find({ batchId: batch._id }).lean()
    const totalBatchDocs = batchDocs.length

    // A document is considered reviewed only when flrReviewedBy is non-empty
    const reviewedDocs = batchDocs.filter((d) => Boolean(d.flrReviewedBy))
    const reviewedCount = reviewedDocs.length

    // Batch is completed only when all documents in the batch have been reviewed
    const allCompleted = totalBatchDocs > 0 && batchDocs.every((d) => Boolean(d.flrReviewedBy))

    let updatedBatch
    if (allCompleted && totalBatchDocs > 0) {
      updatedBatch = await Batch.findByIdAndUpdate(
        batch._id,
        {
          $set: {
            status: 'Completed',
            isLocked: false,
            completedAt: new Date(),
            reviewed: totalBatchDocs,
          },
        },
        { returnDocument: 'after' }
      ).lean()
    } else {
      updatedBatch = await Batch.findByIdAndUpdate(
        batch._id,
        {
          $set: {
            reviewed: reviewedCount,
          },
        },
        { returnDocument: 'after' }
      ).lean()
    }

    response.json({
      ...coding,
      batch: updatedBatch,
      batchCompleted: allCompleted,
    })
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
}

