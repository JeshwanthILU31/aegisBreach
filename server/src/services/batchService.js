import mongoose from 'mongoose'
import Batch from '../models/Batch.js'
import Document from '../models/Document.js'
import Coding from '../models/Coding.js'
import User from '../models/User.js'
import { deleteAssetFromCloudinary } from './cloudinaryService.js'

export async function getBatchesByProjectId(projectId, filters = {}) {
  const query = { projectId }
  if (filters.batchSet && filters.batchSet !== 'All' && filters.batchSet !== 'All Batches') {
    query.batchSet = filters.batchSet
  }
  if (filters.status && filters.status !== 'All') {
    query.status = filters.status
  }
  return Batch.find(query).sort({ createdAt: -1 }).lean()
}

export async function getBatchById(projectId, batchId) {
  return Batch.findOne({ _id: batchId, projectId }).lean()
}

export async function createBatch(projectId, data) {
  const isAssigned = Boolean(data.assignedToName && data.assignedToName.trim())
  const batch = new Batch({
    name: data.name,
    batchSet: data.batchSet || 'Monday Batch1',
    batchUnit: data.batchUnit || 'Alternate Workflow 6+ Entries',
    batchSize: data.batchSize || 50,
    status: data.status || (isAssigned ? 'In Progress' : 'Available'),
    assignedToName: data.assignedToName || '',
    projectId,
    isLocked: isAssigned,
    lockedBy: null,
    acquiredAt: isAssigned ? new Date() : null,
    reviewed: 0,
  })
  return batch.save()
}

export async function updateBatch(projectId, batchId, data) {
  const existing = await Batch.findOne({ _id: batchId, projectId })
  if (!existing) return null

  // If this batch is currently locked/active, protect the active lock and assignment
  const isLockedActive = existing.isLocked && Boolean(existing.assignedToName)

  const updates = { ...data }
  delete updates._id
  delete updates.projectId
  delete updates.lockedBy
  delete updates.acquiredAt
  delete updates.completedAt
  delete updates.reviewed // Reviewed count remains protected and derived from actual reviews

  if (isLockedActive) {
    // Retain active lock and assignment
    delete updates.isLocked
    delete updates.assignedToName
  } else if (updates.assignedToName !== undefined) {
    // Simulated employee assignment handling on available batches
    if (updates.assignedToName.trim()) {
      updates.isLocked = true
      if (!updates.status || updates.status === 'Available') {
        updates.status = 'In Progress'
      }
    } else {
      // Unassigned
      updates.isLocked = false
      if (updates.status === 'In Progress') {
        updates.status = 'Available'
      }
    }
  }

  return Batch.findOneAndUpdate(
    { _id: batchId, projectId },
    { $set: updates },
    { returnDocument: 'after', runValidators: true }
  ).lean()
}

export async function deleteBatch(projectId, batchId) {
  const batch = await Batch.findOne({ _id: batchId, projectId }).lean()
  if (!batch) return null

  // Find all documents in this batch
  const batchDocs = await Document.find({ projectId, batchId }).select('controlNumber cloudinaryPublicId resourceType').lean()
  const controlNumbers = batchDocs.map((d) => d.controlNumber)

  // Clean up any Cloudinary assets associated with documents in this batch
  for (const doc of batchDocs) {
    if (doc.cloudinaryPublicId) {
      deleteAssetFromCloudinary(doc.cloudinaryPublicId, doc.resourceType).catch(() => {})
    }
  }

  if (controlNumbers.length > 0) {
    await Coding.deleteMany({
      projectId: projectId.toString(),
      documentId: { $in: controlNumbers },
    })
  }

  await Document.deleteMany({ projectId, batchId })
  return Batch.findOneAndDelete({ _id: batchId, projectId }).lean()
}

export async function acquireBatch(batchId, authUser) {
  const batch = await Batch.findById(batchId)
  if (!batch) {
    const error = new Error('Batch not found')
    error.status = 404
    throw error
  }

  if (batch.isLocked) {
    const employee = batch.assignedToName || 'another employee'
    const error = new Error(`Batch already taken by ${employee}.`)
    error.status = 409
    error.batch = batch
    throw error
  }

  // Resolve authentic reviewer identity from verified database user or auth payload
  let userId = null
  let displayName = 'Current Reviewer'

  if (authUser && typeof authUser === 'object') {
    if (authUser.userId) {
      const isObjectId = mongoose.Types.ObjectId.isValid(authUser.userId)
      if (isObjectId) {
        userId = new mongoose.Types.ObjectId(authUser.userId)
        const user = await User.findById(userId).select('username email').lean()
        if (user) {
          displayName = user.username || user.email || displayName
        }
      } else {
        displayName = authUser.username || (authUser.role === 'admin' ? 'Admin' : displayName)
      }
    }
  } else if (typeof authUser === 'string' && authUser.trim()) {
    displayName = authUser.trim()
  }

  // Check if reviewer already has an active in-progress batch in this project
  const activeBatchQuery = {
    projectId: batch.projectId,
    status: 'In Progress',
    isLocked: true,
  }

  if (userId) {
    activeBatchQuery.$or = [
      { lockedBy: userId },
      { assignedTo: userId },
      { assignedToName: displayName },
    ]
  } else {
    activeBatchQuery.assignedToName = displayName
  }

  const existingActiveBatch = await Batch.findOne(activeBatchQuery).lean()

  if (existingActiveBatch) {
    const error = new Error(`${displayName} already has an active batch. Complete it before acquiring another batch.`)
    error.status = 409
    error.activeBatch = existingActiveBatch
    throw error
  }

  // Calculate actual reviewed count from MongoDB documents for this batch
  const reviewedCount = await Document.countDocuments({
    batchId: batch._id,
    flrReviewedBy: { $exists: true, $ne: '' },
  })

  const updateFields = {
    isLocked: true,
    status: 'In Progress',
    assignedToName: displayName,
    acquiredAt: new Date(),
    reviewed: reviewedCount,
  }

  if (userId) {
    updateFields.lockedBy = userId
    updateFields.assignedTo = userId
  }

  const updatedBatch = await Batch.findOneAndUpdate(
    { _id: batchId, isLocked: false },
    { $set: updateFields },
    { returnDocument: 'after', runValidators: true }
  ).lean()

  if (!updatedBatch) {
    const freshBatch = await Batch.findById(batchId).lean()
    const employee = freshBatch?.assignedToName || 'another employee'
    const error = new Error(`Batch already taken by ${employee}.`)
    error.status = 409
    error.batch = freshBatch
    throw error
  }

  return updatedBatch
}

export async function completeBatch(batchId, authUser) {
  const batch = await Batch.findById(batchId)
  if (!batch) {
    const error = new Error('Batch not found')
    error.status = 404
    throw error
  }

  if (batch.status === 'Completed') {
    const error = new Error('Batch is already completed')
    error.status = 400
    throw error
  }

  if (batch.status !== 'In Progress' || !batch.isLocked) {
    const error = new Error('Batch is not currently in progress')
    error.status = 400
    throw error
  }

  // Verify ownership: Admin can complete, or the verified user who owns the batch
  const isAdmin = authUser?.role === 'admin'
  let isOwner = false

  if (isAdmin) {
    isOwner = true
  } else if (authUser?.userId) {
    const userIdStr = authUser.userId.toString()
    const lockedByStr = batch.lockedBy ? batch.lockedBy.toString() : null
    const assignedToStr = batch.assignedTo ? batch.assignedTo.toString() : null

    if (lockedByStr === userIdStr || assignedToStr === userIdStr) {
      isOwner = true
    }
  }

  if (!isOwner) {
    const error = new Error('Cannot complete a batch belonging to another user or employee.')
    error.status = 403
    throw error
  }

  // Verify completion requirement: all documents in the batch must have been reviewed
  const batchDocs = await Document.find({ batchId: batch._id }).lean()
  const totalBatchDocs = batchDocs.length
  const reviewedDocs = batchDocs.filter((d) => Boolean(d.flrReviewedBy))
  const reviewedCount = reviewedDocs.length

  if (totalBatchDocs === 0 || reviewedCount < totalBatchDocs) {
    const error = new Error(
      `Cannot complete batch: all ${totalBatchDocs} documents must be reviewed first (${reviewedCount}/${totalBatchDocs} reviewed).`
    )
    error.status = 400
    throw error
  }

  const updatedBatch = await Batch.findOneAndUpdate(
    { _id: batchId },
    {
      $set: {
        status: 'Completed',
        isLocked: false,
        completedAt: new Date(),
        reviewed: totalBatchDocs,
      },
    },
    { returnDocument: 'after', runValidators: true }
  ).lean()

  return updatedBatch
}
