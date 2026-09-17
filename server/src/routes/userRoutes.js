import { Router } from 'express'
import {
  getUsers,
  getUser,
  createUser,
} from '../controllers/userController.js'
import { validateObjectId } from '../middleware/validateObjectId.js'

const userRouter = Router()

userRouter.get('/', getUsers)
userRouter.post('/', createUser)
userRouter.get('/:id', validateObjectId('id'), getUser)

export default userRouter
