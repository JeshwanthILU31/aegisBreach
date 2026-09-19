import cloudinary, { isCloudinaryConfigured } from '../services/cloudinaryService.js'

export function getHealth(_request, response) {
  response.json({ message: 'Backend connected' })
}

export function getCloudinaryHealth(_request, response) {
  const configured = isCloudinaryConfigured()
  const cloudNamePresent = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME.trim().length > 0)
  const apiKeyPresent = Boolean(process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_KEY.trim().length > 0)
  const apiSecretPresent = Boolean(process.env.CLOUDINARY_API_SECRET && process.env.CLOUDINARY_API_SECRET.trim().length > 0)
  const cloudinaryUrlPresent = Boolean(process.env.CLOUDINARY_URL && process.env.CLOUDINARY_URL.trim().length > 0)

  const sdkConfig = cloudinary.config()
  const sdkConfigured = Boolean(sdkConfig && sdkConfig.cloud_name && sdkConfig.api_key && sdkConfig.api_secret)

  return response.json({
    configured,
    cloudNamePresent,
    apiKeyPresent,
    apiSecretPresent,
    cloudinaryUrlPresent,
    sdkConfigured,
  })
}

