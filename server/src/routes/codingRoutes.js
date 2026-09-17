import { Router } from 'express'
import { getCoding, saveCoding } from '../controllers/codingController.js'
import { authenticate } from '../middleware/authMiddleware.js'

const codingRouter = Router({ mergeParams: true })

// Coding retrieval and save (including Person Tracker) requires authenticated reviewer/admin
codingRouter.use(authenticate)

codingRouter.get('/', getCoding)
codingRouter.put('/', saveCoding)
export default codingRouter
