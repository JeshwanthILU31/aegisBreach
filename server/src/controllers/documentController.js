import * as documentService from '../services/documentService.js'

export async function getDocuments(request, response) {
  try {
    const { projectId } = request.params
    const options = {
      ...request.query,
      userId: request.user?.userId,
      role: request.user?.role,
    }
    const documents = await documentService.getDocumentsByProjectId(projectId, options)
    if (!documents) {
      return response.status(404).json({ error: 'Project not found' })
    }
    response.json(documents)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
}

export async function getDocument(request, response) {
  try {
    const { projectId, documentId } = request.params
    const document = await documentService.getDocumentById(projectId, documentId)
    if (!document) {
      return response.status(404).json({ error: 'Document not found' })
    }
    response.json(document)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
}
export async function createDocument(request, response) {
  try {
    const { projectId } = request.params
    // Support either single object or array in body
    if (Array.isArray(request.body.documents) && request.body.batchId) {
      const documents = await documentService.createDocumentsBulk(
        projectId,
        request.body.batchId,
        request.body.documents
      )
      return response.status(201).json(documents)
    }

    if (Array.isArray(request.body) && request.query?.batchId) {
      const documents = await documentService.createDocumentsBulk(
        projectId,
        request.query.batchId,
        request.body
      )
      return response.status(201).json(documents)
    }

    const document = await documentService.createDocument(projectId, request.body)
    response.status(201).json(document)
  } catch (error) {
    if (error.status) {
      return response.status(error.status).json({ error: error.message })
    }
    if (error.code === 11000) {
      return response.status(409).json({ error: 'A document with that control number already exists in this project' })
    }
    if (error.name === 'ValidationError') {
      return response.status(400).json({ error: error.message })
    }
    response.status(500).json({ error: error.message })
  }
}

export async function createBulkDocuments(request, response) {
  try {
    const { projectId } = request.params
    const { batchId, documents } = request.body

    const createdDocs = await documentService.createDocumentsBulk(projectId, batchId, documents)
    response.status(201).json(createdDocs)
  } catch (error) {
    if (error.status) {
      return response.status(error.status).json({ error: error.message })
    }
    if (error.code === 11000) {
      return response.status(409).json({ error: 'Duplicate document control number in this project' })
    }
    if (error.name === 'ValidationError') {
      return response.status(400).json({ error: error.message })
    }
    response.status(500).json({ error: error.message })
  }
}

export async function deleteDocument(request, response) {
  try {
    const { projectId, documentId } = request.params
    const result = await documentService.deleteDocument(projectId, documentId)
    response.json(result)
  } catch (error) {
    if (error.status) {
      return response.status(error.status).json({ error: error.message })
    }
    response.status(500).json({ error: error.message })
  }
}

export async function uploadDocumentFile(request, response) {
  try {
    const { projectId, batchId, documentId } = request.params
    if (!request.file) {
      return response.status(400).json({ error: 'No file provided for upload' })
    }

    const updated = await documentService.uploadDocumentFile(
      projectId,
      batchId,
      documentId,
      request.file
    )
    response.status(200).json(updated)
  } catch (error) {
    if (error.status) {
      return response.status(error.status).json({ error: error.message })
    }
    response.status(500).json({ error: error.message })
  }
}
