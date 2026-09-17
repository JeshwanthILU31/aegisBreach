import multer from 'multer'
import path from 'path'

// Allowed file extensions
const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.tiff',
  '.tif',
  '.bmp',
  '.txt',
  '.csv',
  '.docx',
  '.xlsx',
  '.pptx',
  '.doc',
  '.xls',
])

// Explicitly blocked unsafe file extensions
const BLOCKED_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.sh',
  '.js',
  '.html',
  '.htm',
  '.php',
  '.zip',
  '.tar',
  '.gz',
  '.rar',
  '.7z',
  '.vbs',
  '.cmd',
  '.dll',
])

const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase()

  if (BLOCKED_EXTENSIONS.has(ext)) {
    const error = new Error(`File type "${ext}" is blocked for security reasons.`)
    error.status = 400
    return cb(error, false)
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    const error = new Error(`File type "${ext}" is not supported. Please upload a PDF, image, text, or office document.`)
    error.status = 400
    return cb(error, false)
  }

  cb(null, true)
}

export const upload = multer({
  storage,
  limits: {
    fileSize: 30 * 1024 * 1024, // 30 MB
  },
  fileFilter,
})
