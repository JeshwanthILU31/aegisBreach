import { Router } from 'express'
import { getCoding, saveCoding } from '../controllers/codingController.js'

const codingRouter = Router({ mergeParams: true })

codingRouter.get('/', getCoding)
codingRouter.put('/', saveCoding)

export default codingRouter
