import { Router } from 'express'
import { register, login, changePassword } from '../controllers/authController.js'
import { authenticate } from '../middleware/authMiddleware.js'

const authRouter = Router()

authRouter.post('/register', register)
authRouter.post('/login', login)
authRouter.put('/change-password', authenticate, changePassword)

export default authRouter

