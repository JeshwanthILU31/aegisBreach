import { Router } from 'express'
import {
  getUsers,
  getUser,
  createUser,
} from '../controllers/userController.js'
import { validateObjectId } from '../middleware/validateObjectId.js'
import { authenticate } from '../middleware/authMiddleware.js'
import { requireAdmin } from '../middleware/roleMiddleware.js'

const userRouter = Router()

userRouter.use(authenticate)

userRouter.get('/', getUsers)
userRouter.get('/:id', validateObjectId('id'), getUser)
userRouter.post('/', requireAdmin, createUser)
export default userRouter
