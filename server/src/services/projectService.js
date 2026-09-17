import mongoose from 'mongoose'
import Project from '../models/Project.js'
import Batch from '../models/Batch.js'
import Document from '../models/Document.js'
import Coding from '../models/Coding.js'
import { deleteAssetFromCloudinary } from './cloudinaryService.js'

export async function getAllProjects() {
  return Project.find().sort({ createdAt: -1 }).lean()
}

export async function getProjectById(id) {
  return Project.findById(id).lean()
}

export async function getProjectByIdOrSlug(idOrSlug) {
  if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
    const project = await Project.findById(idOrSlug).lean()
    if (project) return project
  }
  return Project.findOne({
    $or: [{ slug: idOrSlug }, { name: idOrSlug }],
  }).lean()
}

export async function createProject(data) {
  const project = new Project(data)
  return project.save()
}

export async function updateProject(id, data) {
  return Project.findByIdAndUpdate(id, data, {
    returnDocument: 'after',
    runValidators: true,
  }).lean()
}

export async function deleteProject(id) {
  const project = await getProjectByIdOrSlug(id)
  if (!project) return null

  // Clean up any Cloudinary assets associated with documents in this project
  const docs = await Document.find({ projectId: project._id }).select('cloudinaryPublicId resourceType').lean()
  for (const doc of docs) {
    if (doc.cloudinaryPublicId) {
      deleteAssetFromCloudinary(doc.cloudinaryPublicId, doc.resourceType).catch(() => {})
    }
  }

  // Cascade delete Coding, Documents, and Batches belonging strictly to this project
  await Coding.deleteMany({ projectId: project._id.toString() })
  await Document.deleteMany({ projectId: project._id })
  await Batch.deleteMany({ projectId: project._id })

  return Project.findByIdAndDelete(project._id).lean()
}

