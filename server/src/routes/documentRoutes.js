import { Router } from 'express'
import {
  getDocuments,
  getDocument,
  createDocument,
  createBulkDocuments,
  deleteDocument,
} from '../controllers/documentController.js'
import { validateIdOrSlug } from '../middleware/validateObjectId.js'

const documentRouter = Router({ mergeParams: true })

documentRouter.use(validateIdOrSlug('projectId'))

documentRouter.get('/', getDocuments)
documentRouter.post('/', createDocument)
documentRouter.post('/bulk', createBulkDocuments)
documentRouter.get('/:documentId', getDocument)
documentRouter.delete('/:documentId', deleteDocument)

export default documentRouter
