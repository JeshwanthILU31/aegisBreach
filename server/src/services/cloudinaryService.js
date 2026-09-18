import 'dotenv/config'
import { v2 as cloudinary } from 'cloudinary'

/**
 * Configure Cloudinary dynamically from environment variables
 */
export function ensureCloudinaryConfigured() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME
  const api_key = process.env.CLOUDINARY_API_KEY
  const api_secret = process.env.CLOUDINARY_API_SECRET

  if (cloud_name && api_key && api_secret) {
    cloudinary.config({
      cloud_name,
      api_key,
      api_secret,
      secure: true,
    })
    return true
  }
  return false
}

// Initial configuration attempt
ensureCloudinaryConfigured()

/**
 * Check if Cloudinary credentials are configured
 */
export function isCloudinaryConfigured() {
  return ensureCloudinaryConfigured()
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
 * Helper to determine concrete resource type for delivery / mock
 */
export function getConcreteResourceType(formatOrExt, requestedType = 'auto') {
  if (requestedType && requestedType !== 'auto') return requestedType
  const clean = String(formatOrExt || '').replace('.', '').toLowerCase()
  if (['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'tiff'].includes(clean)) {
    return 'image'
  }
  return 'raw'
}

/**
 * Upload a memory buffer to Cloudinary using upload_stream
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {Object} options - Upload options (folder, publicId, resourceType, format)
 * @returns {Promise<Object>} Cloudinary upload response object
 */
export function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    ensureCloudinaryConfigured()

    const isExplicitMock = process.env.CLOUDINARY_MOCK === 'true'
    const isConfigured = isCloudinaryConfigured()

    // Mock simulator ONLY when explicitly requested via CLOUDINARY_MOCK === 'true' (for isolated unit testing)
    if (isExplicitMock) {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'aegisbreach-test'
      const folder = options.folder || 'aegisbreach'
      const publicId = options.publicId || `doc_${Date.now()}`
      const concreteType = getConcreteResourceType(options.format, options.resourceType)
      const fullPublicId = `${folder}/${publicId}`
      const fileFormat = options.format || 'pdf'

      return resolve({
        asset_id: `mock_asset_${Date.now()}`,
        public_id: fullPublicId,
        version: Date.now(),
        version_id: `v_${Date.now()}`,
        signature: 'mock_signature',
        width: 1200,
        height: 1600,
        format: fileFormat,
        resource_type: concreteType,
        created_at: new Date().toISOString(),
        tags: [],
        bytes: buffer ? buffer.length : 1024,
        type: 'upload',
        etag: 'mock_etag',
        placeholder: false,
        url: `http://res.cloudinary.com/${cloudName}/${concreteType}/upload/${fullPublicId}.${fileFormat}`,
        secure_url: `https://res.cloudinary.com/${cloudName}/${concreteType}/upload/${fullPublicId}.${fileFormat}`,
        access_mode: 'public',
        original_filename: publicId,
      })
    }

    // In real environment, if Cloudinary is not configured, FAIL explicitly — NEVER generate fake URLs
    if (!isConfigured) {
      return reject(new Error('Cloudinary credentials are not configured on the server. Please check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'))
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
