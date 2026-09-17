import { Router } from 'express'
import {
  getBatches,
  getBatch,
  createBatch,
  updateBatch,
  deleteBatch,
  acquireBatch,
  completeBatch,
} from '../controllers/batchController.js'
import { validateObjectId, validateIdOrSlug } from '../middleware/validateObjectId.js'
import { authenticate } from '../middleware/authMiddleware.js'
import { requireAdmin } from '../middleware/roleMiddleware.js'

const batchRouter = Router({ mergeParams: true })

batchRouter.use(validateIdOrSlug('projectId'))
batchRouter.use(authenticate)

// Reviewer/user read & workflow access
batchRouter.get('/', getBatches)
batchRouter.get('/:batchId', validateObjectId('batchId'), getBatch)
batchRouter.post('/:batchId/acquire', validateObjectId('batchId'), acquireBatch)
batchRouter.post('/:batchId/complete', validateObjectId('batchId'), completeBatch)

// Admin-only mutation access
batchRouter.post('/', requireAdmin, createBatch)
batchRouter.put('/:batchId', validateObjectId('batchId'), requireAdmin, updateBatch)
batchRouter.delete('/:batchId', validateObjectId('batchId'), requireAdmin, deleteBatch)

export default batchRouter
