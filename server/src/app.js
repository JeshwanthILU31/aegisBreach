import cors from 'cors'
import express from 'express'
import batchRoutes from './routes/batchRoutes.js'
import codingRoutes from './routes/codingRoutes.js'
import documentRoutes from './routes/documentRoutes.js'
import healthRoutes from './routes/healthRoutes.js'
import projectRoutes from './routes/projectRoutes.js'
import userRoutes from './routes/userRoutes.js'
import { acquireBatch, completeBatch } from './controllers/batchController.js'
import { uploadDocumentFile } from './controllers/documentController.js'
import { validateObjectId, validateIdOrSlug } from './middleware/validateObjectId.js'
import { upload } from './middleware/uploadMiddleware.js'
import multer from 'multer'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/health', healthRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/projects/:projectId/batches', batchRoutes)
app.post('/api/batches/:batchId/acquire', validateObjectId('batchId'), acquireBatch)
app.post('/api/batches/:batchId/complete', validateObjectId('batchId'), completeBatch)

// Cloudinary File Upload Endpoint
app.post(
  '/api/projects/:projectId/batches/:batchId/documents/:documentId/file',
  validateIdOrSlug('projectId'),
  upload.single('file'),
  uploadDocumentFile
)

app.use('/api/projects/:projectId/documents', documentRoutes)
app.use('/api/projects/:projectId/documents/:documentId/coding', codingRoutes)
app.use('/api/users', userRoutes)

// Global error handler for upload/validation errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds maximum allowed limit of 30 MB' })
    }
    return res.status(400).json({ error: err.message })
  }
  if (err.status) {
    return res.status(err.status).json({ error: err.message })
  }
  if (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
  next()
})

export default app



