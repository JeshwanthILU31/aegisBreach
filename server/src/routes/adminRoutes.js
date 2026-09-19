import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import { requireAdmin } from '../middleware/roleMiddleware.js'
import { getAdminPersonTracker } from '../controllers/adminController.js'

const adminRouter = Router()

// All admin routes strictly enforce authenticated admin JWT
adminRouter.use(authenticate)
adminRouter.use(requireAdmin)

adminRouter.get('/person-tracker', getAdminPersonTracker)

export default adminRouter
