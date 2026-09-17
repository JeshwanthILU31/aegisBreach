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

const batchRouter = Router({ mergeParams: true })

batchRouter.use(validateIdOrSlug('projectId'))

batchRouter.get('/', getBatches)
batchRouter.post('/', createBatch)
batchRouter.get('/:batchId', validateObjectId('batchId'), getBatch)
batchRouter.put('/:batchId', validateObjectId('batchId'), updateBatch)
batchRouter.delete('/:batchId', validateObjectId('batchId'), deleteBatch)
batchRouter.post('/:batchId/acquire', validateObjectId('batchId'), acquireBatch)
batchRouter.post('/:batchId/complete', validateObjectId('batchId'), completeBatch)

export default batchRouter

