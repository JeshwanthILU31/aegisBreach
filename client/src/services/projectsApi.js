import api from './api'

export async function getProjects() {
  const { data } = await api.get('/projects')
  return data
}

export async function getProject(id) {
  const { data } = await api.get(`/projects/${id}`)
  return data
}

export async function createProject(payload) {
  const { data } = await api.post('/projects', payload)
  return data
}

export async function updateProject(id, payload) {
  const { data } = await api.put(`/projects/${id}`, payload)
  return data
}

export async function deleteProject(id) {
  const { data } = await api.delete(`/projects/${id}`)
  return data
}
