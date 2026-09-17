import api from './api'

export async function getBatches(projectId, params = {}) {
  const { data } = await api.get(`/projects/${projectId}/batches`, { params })
  return data
}

export async function getBatch(projectId, batchId) {
  const { data } = await api.get(`/projects/${projectId}/batches/${batchId}`)
  return data
}

export async function createBatch(projectId, payload) {
  const { data } = await api.post(`/projects/${projectId}/batches`, payload)
  return data
}

export async function updateBatch(projectId, batchId, payload) {
  const { data } = await api.put(`/projects/${projectId}/batches/${batchId}`, payload)
  return data
}

export async function deleteBatch(projectId, batchId) {
  const { data } = await api.delete(`/projects/${projectId}/batches/${batchId}`)
  return data
}
