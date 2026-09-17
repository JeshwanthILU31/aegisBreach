import { Router } from 'express'
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController.js'
import { validateIdOrSlug } from '../middleware/validateObjectId.js'
import { authenticate } from '../middleware/authMiddleware.js'
import { requireAdmin } from '../middleware/roleMiddleware.js'

const projectRouter = Router()

// All project routes require authentication
projectRouter.use(authenticate)

// Reviewer/user read access
projectRouter.get('/', getProjects)
projectRouter.get('/:id', validateIdOrSlug('id'), getProject)

// Admin-only mutation access
projectRouter.post('/', requireAdmin, createProject)
projectRouter.put('/:id', validateIdOrSlug('id'), requireAdmin, updateProject)
projectRouter.delete('/:id', validateIdOrSlug('id'), requireAdmin, deleteProject)
export default projectRouter
