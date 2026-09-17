import { Router } from 'express'
import {
  getDocuments,
  getDocument,
  createDocument,
  createBulkDocuments,
  deleteDocument,
} from '../controllers/documentController.js'
import { validateIdOrSlug } from '../middleware/validateObjectId.js'
import { authenticate } from '../middleware/authMiddleware.js'
import { requireAdmin } from '../middleware/roleMiddleware.js'

const documentRouter = Router({ mergeParams: true })

documentRouter.use(validateIdOrSlug('projectId'))
documentRouter.use(authenticate)

// Reviewer/user read access
documentRouter.get('/', getDocuments)
documentRouter.get('/:documentId', getDocument)

// Admin-only document management & creation
documentRouter.post('/', requireAdmin, createDocument)
documentRouter.post('/bulk', requireAdmin, createBulkDocuments)
documentRouter.delete('/:documentId', requireAdmin, deleteDocument)
export default documentRouter
