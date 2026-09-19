import mongoose from 'mongoose'
import Coding from '../models/Coding.js'
import Document from '../models/Document.js'
import Batch from '../models/Batch.js'
import User from '../models/User.js'
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
    const authUser = request.user
    const isAdmin = authUser?.role === 'admin'

    let isAssignedToMe = false
    if (isAdmin) {
      isAssignedToMe = true
    } else if (batch && batch.isLocked && batch.status === 'In Progress' && authUser?.userId) {
      const userIdStr = authUser.userId.toString()
      const lockedByStr = batch.lockedBy ? batch.lockedBy.toString() : null
      const assignedToStr = batch.assignedTo ? batch.assignedTo.toString() : null
      if (lockedByStr === userIdStr || assignedToStr === userIdStr) {
        isAssignedToMe = true
      }
    }

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
    const authUser = request.user
    const isAdmin = authUser?.role === 'admin'

    const document = await documentService.getDocumentById(projectId, documentId)
    if (!document) {
      return response.status(404).json({ error: 'Document not found' })
    }

    const batch = document.batchId

    // For normal users, enforce batch in-progress and verified ownership checks
    if (!isAdmin) {
      if (!batch) {
        return response.status(403).json({
          error: 'Document does not belong to a valid batch.',
          readOnly: true,
        })
      }

      // Must be In Progress and locked
      if (!batch.isLocked || batch.status !== 'In Progress') {
        return response.status(403).json({
          error: 'Cannot edit document in a batch that is not currently in progress.',
          readOnly: true,
          assignedToName: batch.assignedToName || '',
          batchStatus: batch.status,
        })
      }

      // Check ownership
      let isOwner = false
      if (authUser?.userId) {
        const userIdStr = authUser.userId.toString()
        const lockedByStr = batch.lockedBy ? batch.lockedBy.toString() : null
        const assignedToStr = batch.assignedTo ? batch.assignedTo.toString() : null

        if (lockedByStr === userIdStr || assignedToStr === userIdStr) {
          isOwner = true
        }
      }

      if (!isOwner) {
        return response.status(403).json({
          error: "Cannot edit document belonging to another employee's batch.",
          readOnly: true,
          assignedToName: batch.assignedToName || '',
        })
      }
    }

    // Safe reviewer name derived from authenticated DB user / token
    let reviewerName = 'Current Reviewer'
    if (authUser?.userId) {
      const isObjectId = mongoose.Types.ObjectId.isValid(authUser.userId)
      if (isObjectId) {
        const dbUser = await User.findById(authUser.userId).select('username email').lean()
        if (dbUser) {
          reviewerName = dbUser.username || dbUser.email || reviewerName
        }
      } else {
        reviewerName = authUser.username || (isAdmin ? 'Admin' : reviewerName)
      }
    }

    const payload = {
      ...defaultCoding(projectId, document.controlNumber),
      ...request.body,
      projectId: document.projectId.toString(),
      documentId: document.controlNumber,
    }

    const existingCoding = await Coding.findOne({
      projectId: document.projectId.toString(),
      documentId: document.controlNumber,
    }).lean()

    const existingPersonsMap = new Map()
    if (existingCoding && Array.isArray(existingCoding.persons)) {
      for (const p of existingCoding.persons) {
        if (p._id) {
          existingPersonsMap.set(String(p._id), p)
        }
      }
    }

    const now = new Date()

    if (Array.isArray(payload.persons)) {
      payload.persons = payload.persons.map((p) => {
        const targetId = p._id ? String(p._id) : null
        const existingPerson = targetId ? existingPersonsMap.get(targetId) : null

        if (existingPerson) {
          // EDIT: Preserve stable _id, createdBy, and createdAt; update updatedBy & updatedAt to authenticated reviewer
          return {
            ...p,
            _id: existingPerson._id || targetId,
            createdBy: existingPerson.createdBy || p.createdBy || reviewerName,
            createdAt: existingPerson.createdAt || p.createdAt || now,
            updatedBy: reviewerName,
            updatedAt: now,
          }
        } else {
          // CREATE: Generate stable _id if missing; set authoritative createdBy/createdAt & updatedBy/updatedAt
          return {
            ...p,
            _id: p._id || new mongoose.Types.ObjectId().toString(),
            createdBy: reviewerName,
            createdAt: now,
            updatedBy: reviewerName,
            updatedAt: now,
          }
        }
      })
    }

    // Remove client-spoofed identities
    delete payload.reviewerName
    delete payload.userId
    delete payload.role
    delete payload.lockedBy

    const coding = await Coding.findOneAndUpdate(
      { projectId: document.projectId.toString(), documentId: document.controlNumber },
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
