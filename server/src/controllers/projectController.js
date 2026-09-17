import * as projectService from '../services/projectService.js'

export async function getProjects(_request, response) {
  try {
    const projects = await projectService.getAllProjects()
    response.json(projects)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
}

export async function getProject(request, response) {
  try {
    const { id } = request.params
    const project = await projectService.getProjectByIdOrSlug(id)
    if (!project) {
      return response.status(404).json({ error: 'Project not found' })
    }
    response.json(project)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
}

export async function createProject(request, response) {
  try {
    const { name } = request.body
    if (!name || typeof name !== 'string' || !name.trim()) {
      return response.status(400).json({ error: 'Project name is required' })
    }
    const project = await projectService.createProject(request.body)
    response.status(201).json(project)
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({ error: 'A project with that name already exists' })
    }
    if (error.name === 'ValidationError') {
      return response.status(400).json({ error: error.message })
    }
    response.status(500).json({ error: error.message })
  }
}

export async function updateProject(request, response) {
  try {
    const { id } = request.params
    const updated = await projectService.updateProject(id, request.body)
    if (!updated) {
      return response.status(404).json({ error: 'Project not found' })
    }
    response.json(updated)
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({ error: 'A project with that name already exists' })
    }
    if (error.name === 'ValidationError') {
      return response.status(400).json({ error: error.message })
    }
    response.status(500).json({ error: error.message })
  }
}

export async function deleteProject(request, response) {
  try {
    const { id } = request.params
    const deleted = await projectService.deleteProject(id)
    if (!deleted) {
      return response.status(404).json({ error: 'Project not found' })
    }
    response.json({ message: 'Project deleted successfully' })
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
}
