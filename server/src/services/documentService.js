import path from 'path'
import mongoose from 'mongoose'
import Document from '../models/Document.js'
import Batch from '../models/Batch.js'
import Coding from '../models/Coding.js'
import * as projectService from './projectService.js'
import {
  uploadBufferToCloudinary,
  deleteAssetFromCloudinary,
  sanitizeSlug,
  sanitizeFileName,
} from './cloudinaryService.js'

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export async function getDocumentsByProjectId(projectIdOrSlug, options = {}) {
  const project = await projectService.getProjectByIdOrSlug(projectIdOrSlug)
  if (!project) return null

  const {
    view = 'My Batched Out Docs',
    reviewerName = 'Current Reviewer',
    batchId,
    folder,
    extractionStatus,
    reportableData,
  } = options

  const query = { projectId: project._id }

  if (batchId) {
    query.batchId = batchId
  } else if (view === 'My Batched Out Docs' || options.scope === 'my-batched-out') {
    // Current reviewer can only have ONE active in-progress batch
    const activeBatchQuery = {
      projectId: project._id,
      isLocked: true,
      status: 'In Progress',
    }

    if (options.userId) {
      const isObjectId = mongoose.Types.ObjectId.isValid(options.userId)
      if (isObjectId) {
        const uId = new mongoose.Types.ObjectId(options.userId)
        activeBatchQuery.$or = [
          { lockedBy: uId },
          { assignedTo: uId },
        ]
      } else {
        activeBatchQuery.assignedToName = reviewerName
      }
    } else {
      activeBatchQuery.assignedToName = reviewerName
    }

    const activeBatch = await Batch.findOne(activeBatchQuery).select('_id')

    if (!activeBatch) {
      return []
    }

    query.batchId = activeBatch._id
  }

  if (folder && folder !== 'All') {
    query.folder = folder
  }
  if (extractionStatus && extractionStatus !== 'All') {
    query.extractionStatus = extractionStatus
  }
  if (reportableData && reportableData !== 'All') {
    query.reportableData = reportableData
  }

  const documents = await Document.find(query)
    .populate('batchId', 'name batchSet status isLocked assignedToName lockedBy assignedTo')
    .sort({ controlNumber: 1 })
    .lean()

  return documents
}

export async function getDocumentById(projectIdOrSlug, documentId) {
  const project = await projectService.getProjectByIdOrSlug(projectIdOrSlug)
  if (!project) return null

  const isObjectId = mongoose.Types.ObjectId.isValid(documentId)
  const query = {
    projectId: project._id,
    ...(isObjectId ? { $or: [{ _id: documentId }, { controlNumber: documentId }] } : { controlNumber: documentId }),
  }

  const document = await Document.findOne(query)
    .populate('batchId', 'name batchSet status isLocked assignedToName lockedBy assignedTo')
    .lean()

  return document
}

export async function createDocument(projectIdOrSlug, data) {
  const project = await projectService.getProjectByIdOrSlug(projectIdOrSlug)
  if (!project) {
    const error = new Error('Project not found')
    error.status = 404
    throw error
  }

  const { batchId, controlNumber, fileName, fileSize, folder, reportableData, extractionStatus } = data

  if (!batchId) {
    const error = new Error('Batch ID is required')
    error.status = 400
    throw error
  }

  if (!mongoose.Types.ObjectId.isValid(batchId)) {
    const error = new Error('Invalid Batch ID format')
    error.status = 400
    throw error
  }

  const batch = await Batch.findOne({ _id: batchId, projectId: project._id })
  if (!batch) {
    const error = new Error('Batch not found or does not belong to this project')
    error.status = 400
    throw error
  }

  if (!controlNumber || typeof controlNumber !== 'string' || !controlNumber.trim()) {
    const error = new Error('Control number is required')
    error.status = 400
    throw error
  }

  const trimmedControlNumber = controlNumber.trim()

  const existingDoc = await Document.findOne({
    projectId: project._id,
    controlNumber: trimmedControlNumber,
  })

  if (existingDoc) {
    const error = new Error(`A document with control number "${trimmedControlNumber}" already exists in this project`)
    error.status = 409
    throw error
  }

  if (!fileName || typeof fileName !== 'string' || !fileName.trim()) {
    const error = new Error('File name is required')
    error.status = 400
    throw error
  }

  const document = new Document({
    projectId: project._id,
    batchId: batch._id,
    controlNumber: trimmedControlNumber,
    fileName: fileName.trim(),
    fileSize: fileSize?.trim() || '1.5 MB',
    folder: folder?.trim() || 'Set 6',
    reportableData: reportableData || 'Pending',
    flrReviewedBy: '',
    flrReviewedOn: '',
    extractionStatus: extractionStatus || 'Pending',
    extractedBy: '',
    extractedOn: '',
  })

  const saved = await document.save()
  return Document.findById(saved._id).populate('batchId', 'name batchSet status isLocked assignedToName lockedBy assignedTo').lean()
}

export async function createDocumentsBulk(projectIdOrSlug, batchId, documentsArray) {
  const project = await projectService.getProjectByIdOrSlug(projectIdOrSlug)
  if (!project) {
    const error = new Error('Project not found')
    error.status = 404
    throw error
  }

  if (!batchId || !mongoose.Types.ObjectId.isValid(batchId)) {
    const error = new Error('Valid Batch ID is required')
    error.status = 400
    throw error
  }

  const batch = await Batch.findOne({ _id: batchId, projectId: project._id })
  if (!batch) {
    const error = new Error('Batch not found or does not belong to this project')
    error.status = 400
    throw error
  }

  if (!Array.isArray(documentsArray) || documentsArray.length === 0) {
    const error = new Error('documents array must contain at least one document')
    error.status = 400
    throw error
  }

  // Pre-validate all documents before writing anything
  const controlNumberSet = new Set()
  for (let i = 0; i < documentsArray.length; i++) {
    const item = documentsArray[i]
    if (!item.controlNumber || typeof item.controlNumber !== 'string' || !item.controlNumber.trim()) {
      const error = new Error(`Document at index ${i} is missing a valid controlNumber`)
      error.status = 400
      throw error
    }
    if (!item.fileName || typeof item.fileName !== 'string' || !item.fileName.trim()) {
      const error = new Error(`Document at index ${i} is missing a valid fileName`)
      error.status = 400
      throw error
    }

    const trimmedCN = item.controlNumber.trim()
    if (controlNumberSet.has(trimmedCN)) {
      const error = new Error(`Duplicate control number "${trimmedCN}" found in submitted documents`)
      error.status = 400
      throw error
    }
    controlNumberSet.add(trimmedCN)
  }

  // Check for conflicts with existing documents in DB
  const conflict = await Document.findOne({
    projectId: project._id,
    controlNumber: { $in: Array.from(controlNumberSet) },
  }).lean()

  if (conflict) {
    const error = new Error(`A document with control number "${conflict.controlNumber}" already exists in this project`)
    error.status = 409
    throw error
  }

  const docsToInsert = documentsArray.map((item) => ({
    projectId: project._id,
    batchId: batch._id,
    controlNumber: item.controlNumber.trim(),
    fileName: item.fileName.trim(),
    fileSize: item.fileSize?.trim() || '1.5 MB',
    folder: item.folder?.trim() || 'Set 6',
    reportableData: item.reportableData || 'Pending',
    flrReviewedBy: '',
    flrReviewedOn: '',
    extractionStatus: item.extractionStatus || 'Pending',
    extractedBy: '',
    extractedOn: '',
  }))

  const inserted = await Document.insertMany(docsToInsert)
  return inserted
}

export async function deleteDocument(projectIdOrSlug, documentId) {
  const project = await projectService.getProjectByIdOrSlug(projectIdOrSlug)
  if (!project) {
    const error = new Error('Project not found')
    error.status = 404
    throw error
  }

  const isObjectId = mongoose.Types.ObjectId.isValid(documentId)
  const query = {
    projectId: project._id,
    ...(isObjectId ? { $or: [{ _id: documentId }, { controlNumber: documentId }] } : { controlNumber: documentId }),
  }

  const document = await Document.findOne(query)
  if (!document) {
    const error = new Error('Document not found')
    error.status = 404
    throw error
  }

  // Clean up associated Cloudinary asset if present
  if (document.cloudinaryPublicId) {
    deleteAssetFromCloudinary(document.cloudinaryPublicId, document.resourceType).catch(() => {})
  }

  // Delete associated Coding record
  await Coding.deleteMany({
    projectId: project._id.toString(),
    documentId: document.controlNumber,
  })

  // Delete the document itself
  await Document.findByIdAndDelete(document._id)

  // Recalculate batch reviewed count and status
  const remainingBatchDocs = await Document.find({ batchId: document.batchId }).lean()
  const totalBatchDocs = remainingBatchDocs.length
  const reviewedCount = remainingBatchDocs.filter((d) => Boolean(d.flrReviewedBy)).length
  const allCompleted = totalBatchDocs > 0 && remainingBatchDocs.every((d) => Boolean(d.flrReviewedBy))

  if (allCompleted && totalBatchDocs > 0) {
    await Batch.findByIdAndUpdate(document.batchId, {
      $set: {
        reviewed: reviewedCount,
        status: 'Completed',
        isLocked: false,
        completedAt: new Date(),
      },
    })
  } else {
    await Batch.findByIdAndUpdate(document.batchId, {
      $set: {
        reviewed: reviewedCount,
      },
    })
  }

  return { message: 'Document deleted successfully', documentId: document._id }
}

export async function uploadDocumentFile(projectIdOrSlug, batchId, documentId, file) {
  const project = await projectService.getProjectByIdOrSlug(projectIdOrSlug)
  if (!project) {
    const error = new Error('Project not found')
    error.status = 404
    throw error
  }

  if (!batchId) {
    const error = new Error('Batch ID is required')
    error.status = 400
    throw error
  }

  const isBatchObjectId = mongoose.Types.ObjectId.isValid(batchId)
  const batch = await Batch.findOne({
    _id: isBatchObjectId ? batchId : undefined,
    projectId: project._id,
  })
  if (!batch) {
    const error = new Error('Batch not found or does not belong to this project')
    error.status = 404
    throw error
  }

  const isDocObjectId = mongoose.Types.ObjectId.isValid(documentId)
  const query = {
    projectId: project._id,
    ...(isDocObjectId
      ? { $or: [{ _id: documentId }, { controlNumber: documentId }] }
      : { controlNumber: documentId }),
  }

  const document = await Document.findOne(query)
  if (!document) {
    const error = new Error('Document not found')
    error.status = 404
    throw error
  }

  if (document.batchId.toString() !== batch._id.toString()) {
    const error = new Error('Document does not belong to the specified batch')
    error.status = 400
    throw error
  }

  if (!file || !file.buffer) {
    const error = new Error('No file provided for upload')
    error.status = 400
    throw error
  }

  const projectSlug = sanitizeSlug(project.slug || project.name)
  const batchName = sanitizeSlug(batch.name)
  const sanitizedDocName = sanitizeFileName(file.originalname)
  const publicId = `${document.controlNumber}_${sanitizedDocName}`
  const folder = `aegisbreach/${projectSlug}/${batchName}`

  const oldPublicId = document.cloudinaryPublicId
  const oldResourceType = document.resourceType

  // Determine resource type for Cloudinary
  const ext = path.extname(file.originalname || '').toLowerCase()
  let resourceType = 'auto'
  if (['.doc', '.docx', '.xls', '.xlsx', '.pptx', '.csv'].includes(ext)) {
    resourceType = 'raw'
  }

  let uploadResult
  try {
    uploadResult = await uploadBufferToCloudinary(file.buffer, {
      folder,
      publicId,
      resourceType,
    })
  } catch (err) {
    const error = new Error(err.message || 'Failed to upload file to Cloudinary')
    error.status = 502
    throw error
  }

  try {
    const updatedDoc = await Document.findByIdAndUpdate(
      document._id,
      {
        $set: {
          fileUrl: uploadResult.secure_url,
          cloudinaryPublicId: uploadResult.public_id,
          resourceType: uploadResult.resource_type || resourceType,
          format: uploadResult.format || ext.replace('.', ''),
          fileName: file.originalname,
          fileSize: formatFileSize(file.size),
        },
      },
      { returnDocument: 'after', runValidators: true }
    )
      .populate('batchId', 'name batchSet status isLocked assignedToName lockedBy assignedTo')
      .lean()

    // On successful DB update, clean up old Cloudinary asset if replaced
    if (oldPublicId && oldPublicId !== uploadResult.public_id) {
      deleteAssetFromCloudinary(oldPublicId, oldResourceType).catch(() => {})
    }

    return updatedDoc
  } catch (dbError) {
    // If DB update fails, clean up the newly uploaded asset
    if (uploadResult?.public_id) {
      deleteAssetFromCloudinary(uploadResult.public_id, uploadResult.resource_type).catch(() => {})
    }
    throw dbError
  }
}
