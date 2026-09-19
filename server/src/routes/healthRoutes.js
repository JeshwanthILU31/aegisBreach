import { Router } from 'express'
import { getHealth, getCloudinaryHealth } from '../controllers/healthController.js'

const healthRouter = Router()

healthRouter.get('/', getHealth)
healthRouter.get('/cloudinary', getCloudinaryHealth)

export default healthRouter
