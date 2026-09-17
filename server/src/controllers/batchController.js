import * as batchService from '../services/batchService.js'
import * as projectService from '../services/projectService.js'

export async function getBatches(request, response) {
  try {
    const { projectId } = request.params
    const project = await projectService.getProjectByIdOrSlug(projectId)
    if (!project) {
      return response.status(404).json({ error: 'Project not found' })
    }

    const { batchSet, status } = request.query
    const batches = await batchService.getBatchesByProjectId(project._id, { batchSet, status })
    response.json(batches)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
}

export async function getBatch(request, response) {
  try {
    const { projectId, batchId } = request.params
    const project = await projectService.getProjectByIdOrSlug(projectId)
    const pId = project ? project._id : projectId
    const batch = await batchService.getBatchById(pId, batchId)
    if (!batch) {
      return response.status(404).json({ error: 'Batch not found' })
    }
    response.json(batch)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
}

export async function createBatch(request, response) {
  try {
    const { projectId } = request.params
    const project = await projectService.getProjectByIdOrSlug(projectId)
    if (!project) {
      return response.status(404).json({ error: 'Project not found' })
    }

    const { name } = request.body
    if (!name || typeof name !== 'string' || !name.trim()) {
      return response.status(400).json({ error: 'Batch name is required' })
    }

    const batch = await batchService.createBatch(project._id, request.body)
    response.status(201).json(batch)
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({ error: 'A batch with that name already exists in this project' })
    }
    if (error.name === 'ValidationError') {
      return response.status(400).json({ error: error.message })
    }
    response.status(500).json({ error: error.message })
  }
}

export async function updateBatch(request, response) {
  try {
    const { projectId, batchId } = request.params
    const project = await projectService.getProjectByIdOrSlug(projectId)
    const pId = project ? project._id : projectId
    const updated = await batchService.updateBatch(pId, batchId, request.body)
    if (!updated) {
      return response.status(404).json({ error: 'Batch not found' })
    }
    response.json(updated)
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({ error: 'A batch with that name already exists in this project' })
    }
    if (error.name === 'ValidationError') {
      return response.status(400).json({ error: error.message })
    }
    response.status(500).json({ error: error.message })
  }
}

export async function deleteBatch(request, response) {
  try {
    const { projectId, batchId } = request.params
    const project = await projectService.getProjectByIdOrSlug(projectId)
    const pId = project ? project._id : projectId
    const deleted = await batchService.deleteBatch(pId, batchId)
    if (!deleted) {
      return response.status(404).json({ error: 'Batch not found' })
    }
    response.json({ message: 'Batch deleted successfully' })
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
}

export async function acquireBatch(request, response) {
  try {
    const { batchId } = request.params
    const updated = await batchService.acquireBatch(batchId, request.user)
    response.json(updated)
  } catch (error) {
    if (error.status === 404) {
      return response.status(404).json({ error: error.message })
    }
    if (error.status === 409) {
      return response.status(409).json({ error: error.message, batch: error.batch, activeBatch: error.activeBatch })
    }
    if (error.status === 403) {
      return response.status(403).json({ error: error.message })
    }
    response.status(500).json({ error: error.message })
  }
}

export async function completeBatch(request, response) {
  try {
    const { batchId } = request.params
    const updated = await batchService.completeBatch(batchId, request.user)
    response.json(updated)
  } catch (error) {
    if (error.status === 404) {
      return response.status(404).json({ error: error.message })
    }
    if (error.status === 403) {
      return response.status(403).json({ error: error.message })
    }
    if (error.status === 400) {
      return response.status(400).json({ error: error.message })
    }
    response.status(500).json({ error: error.message })
  }
}
