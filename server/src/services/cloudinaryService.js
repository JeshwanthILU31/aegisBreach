import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

/**
 * Check if Cloudinary credentials are configured
 */
export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  )
}

/**
 * Sanitize folder and public ID path segments
 */
export function sanitizeSlug(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '_')
    .replace(/_+/g, '_')
}

/**
 * Sanitize original file name for public ID
 */
export function sanitizeFileName(name) {
  const base = String(name || '').replace(/\.[^/.]+$/, '')
  return base
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .replace(/_+/g, '_')
}

/**
 * Upload a memory buffer to Cloudinary using upload_stream
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {Object} options - Upload options (folder, publicId, resourceType)
 * @returns {Promise<Object>} Cloudinary upload response object
 */
export function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const isMock = process.env.CLOUDINARY_MOCK === 'true' || process.env.CLOUDINARY_CLOUD_NAME === 'mock' || !isCloudinaryConfigured()

    if (isMock) {
      // Graceful test/mock upload simulator
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'aegisbreach-demo'
      const folder = options.folder || 'aegisbreach'
      const publicId = options.publicId || `doc_${Date.now()}`
      const resourceType = options.resourceType || 'image'
      const fullPublicId = `${folder}/${publicId}`

      return resolve({
        asset_id: `mock_asset_${Date.now()}`,
        public_id: fullPublicId,
        version: Date.now(),
        version_id: `v_${Date.now()}`,
        signature: 'mock_signature',
        width: 1200,
        height: 1600,
        format: options.format || 'pdf',
        resource_type: resourceType,
        created_at: new Date().toISOString(),
        tags: [],
        bytes: buffer ? buffer.length : 1024,
        type: 'upload',
        etag: 'mock_etag',
        placeholder: false,
        url: `http://res.cloudinary.com/${cloudName}/${resourceType}/upload/${fullPublicId}.${options.format || 'pdf'}`,
        secure_url: `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${fullPublicId}.${options.format || 'pdf'}`,
        access_mode: 'public',
        original_filename: publicId,
      })
    }

    const uploadOptions = {
      folder: options.folder || 'aegisbreach',
      public_id: options.publicId,
      resource_type: options.resourceType || 'auto',
      overwrite: true,
    }

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        // If auto or image mode fails, retry with raw resource type
        if (uploadOptions.resource_type !== 'raw') {
          const rawStream = cloudinary.uploader.upload_stream(
            { ...uploadOptions, resource_type: 'raw' },
            (rawErr, rawResult) => {
              if (rawErr) {
                return reject(new Error(`Cloudinary upload failed: ${rawErr.message || error.message || 'Unknown error'}`))
              }
              resolve(rawResult)
            }
          )
          return rawStream.end(buffer)
        }
        return reject(new Error(`Cloudinary upload failed: ${error.message || 'Unknown error'}`))
      }
      resolve(result)
    })

    stream.end(buffer)
  })
}

/**
 * Delete an asset from Cloudinary
 * @param {string} publicId - Cloudinary asset public ID
 * @param {string} resourceType - 'image' | 'raw' | 'video' | 'auto'
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteAssetFromCloudinary(publicId, resourceType = 'image') {
  if (!publicId || !isCloudinaryConfigured()) return null
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType || 'image',
    })
    return result
  } catch {
    // If destroy failed on image, fallback attempt on raw
    try {
      return await cloudinary.uploader.destroy(publicId, {
        resource_type: 'raw',
      })
    } catch {
      return null
    }
  }
}

export default cloudinary
