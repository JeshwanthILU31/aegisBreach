import { Router } from 'express'
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController.js'
import { validateIdOrSlug } from '../middleware/validateObjectId.js'

const projectRouter = Router()

projectRouter.get('/', getProjects)
projectRouter.post('/', createProject)
projectRouter.get('/:id', validateIdOrSlug('id'), getProject)
projectRouter.put('/:id', validateIdOrSlug('id'), updateProject)
projectRouter.delete('/:id', validateIdOrSlug('id'), deleteProject)

export default projectRouter
