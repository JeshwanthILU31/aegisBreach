import api from './api'

export async function getDocuments(projectId, params = {}) {
  const { data } = await api.get(`/projects/${projectId}/documents`, { params })
  return data
}

export async function getDocument(projectId, documentId) {
  const { data } = await api.get(`/projects/${projectId}/documents/${documentId}`)
  return data
}

export async function createDocument(projectId, payload) {
  const { data } = await api.post(`/projects/${projectId}/documents`, payload)
  return data
}

export async function createBulkDocuments(projectId, payload) {
  const { data } = await api.post(`/projects/${projectId}/documents/bulk`, payload)
  return data
}

export async function deleteDocument(projectId, documentId) {
  const { data } = await api.delete(`/projects/${projectId}/documents/${documentId}`)
  return data
}

export async function uploadDocumentFile(projectId, batchId, documentId, file, onUploadProgress) {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await api.post(
    `/projects/${projectId}/batches/${batchId}/documents/${documentId}/file`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    }
  )
  return data
}
