// AegisBreach: Cloudinary Real Upload Pipeline & Safety Test Suite
import assert from 'assert'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { v2 as cloudinary } from 'cloudinary'
import {
  ensureCloudinaryConfigured,
  isCloudinaryConfigured,
  uploadBufferToCloudinary,
  deleteAssetFromCloudinary,
  getConcreteResourceType,
  sanitizeSlug,
  sanitizeFileName,
} from './src/services/cloudinaryService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

console.log('================================================================================')
console.log('RUNNING CLOUDINARY UPLOAD PIPELINE VERIFICATION SUITE')
console.log('================================================================================')

let passed = 0
let failed = 0

async function test(name, fn) {
  try {
    await fn()
    console.log(`  [PASS] ${name}`)
    passed++
  } catch (err) {
    console.error(`  [FAIL] ${name} -> ${err.message}`)
    failed++
  }
}

async function runAll() {
  // Test 1: Configuration check
  await test('Cloudinary configuration loads correctly from environment', () => {
    assert(ensureCloudinaryConfigured() === true, 'ensureCloudinaryConfigured should return true')
    assert(isCloudinaryConfigured() === true, 'isCloudinaryConfigured should return true')
    assert(process.env.CLOUDINARY_CLOUD_NAME, 'CLOUDINARY_CLOUD_NAME must be present')
    assert(process.env.CLOUDINARY_API_KEY, 'CLOUDINARY_API_KEY must be present')
    assert(process.env.CLOUDINARY_API_SECRET, 'CLOUDINARY_API_SECRET must be present')
  })

  // Test 2: Concrete resource type helper
  await test('getConcreteResourceType resolves concrete resource types without auto', () => {
    assert.strictEqual(getConcreteResourceType('pdf'), 'image', 'PDF resolves to image')
    assert.strictEqual(getConcreteResourceType('.png'), 'image', 'PNG resolves to image')
    assert.strictEqual(getConcreteResourceType('.jpg'), 'image', 'JPG resolves to image')
    assert.strictEqual(getConcreteResourceType('docx'), 'raw', 'DOCX resolves to raw')
    assert.strictEqual(getConcreteResourceType('xlsx'), 'raw', 'XLSX resolves to raw')
    assert.strictEqual(getConcreteResourceType('txt'), 'raw', 'TXT resolves to raw')
  })

  // Test 3: Unconfigured environment safety check
  await test('Missing configuration fails with descriptive error instead of fake URL', async () => {
    const origCloud = process.env.CLOUDINARY_CLOUD_NAME
    const origKey = process.env.CLOUDINARY_API_KEY
    const origSecret = process.env.CLOUDINARY_API_SECRET
    delete process.env.CLOUDINARY_CLOUD_NAME
    delete process.env.CLOUDINARY_API_KEY
    delete process.env.CLOUDINARY_API_SECRET

    let threw = false
    try {
      await uploadBufferToCloudinary(Buffer.from('test data'), {
        folder: 'test',
        publicId: 'test_fail',
      })
    } catch (err) {
      threw = true
      assert(err.message.includes('not configured'), 'Error must state that credentials are not configured')
    } finally {
      process.env.CLOUDINARY_CLOUD_NAME = origCloud
      process.env.CLOUDINARY_API_KEY = origKey
      process.env.CLOUDINARY_API_SECRET = origSecret
      ensureCloudinaryConfigured()
    }
    assert(threw, 'uploadBufferToCloudinary must throw when unconfigured')
  })

  // Test 4: Real Document buffer upload to Cloudinary
  let realUploadedPublicId = null
  let realUploadedUrl = null
  let realResourceType = null

  await test('Real Cloudinary upload of document buffer produces valid HTTPS URL', async () => {
    const sampleBuffer = Buffer.from('Sample document content for automated upload verification')
    const testPublicId = `test_pipeline_${Date.now()}`

    const result = await uploadBufferToCloudinary(sampleBuffer, {
      folder: 'aegisbreach/test_pipeline',
      publicId: testPublicId,
      resourceType: 'auto',
      format: 'txt',
    })

    assert(result.secure_url, 'Result must contain secure_url')
    assert(result.public_id, 'Result must contain public_id')
    assert(!result.secure_url.includes('aegisbreach-demo'), 'URL must NOT contain aegisbreach-demo')
    assert(!result.secure_url.includes('/auto/upload/'), 'URL must NOT contain /auto/upload/')
    assert(result.secure_url.startsWith('https://res.cloudinary.com/'), 'URL must be a valid Cloudinary HTTPS URL')

    realUploadedPublicId = result.public_id
    realUploadedUrl = result.secure_url
    realResourceType = result.resource_type
  })

  // Test 5: Cloudinary API asset verification
  await test('Uploaded asset actually exists on Cloudinary and metadata matches', async () => {
    assert(realUploadedPublicId, 'Previous test must have uploaded public_id')
    const asset = await cloudinary.api.resource(realUploadedPublicId, {
      resource_type: realResourceType || 'raw',
    })
    assert.strictEqual(asset.public_id, realUploadedPublicId, 'Public ID must match Cloudinary record')
    assert.strictEqual(asset.resource_type, realResourceType, 'Resource type must match Cloudinary record')
  })

  // Test 6: Cloudinary asset deletion cleanup
  await test('deleteAssetFromCloudinary removes asset cleanly from Cloudinary', async () => {
    assert(realUploadedPublicId, 'Must have asset to delete')
    const delResult = await deleteAssetFromCloudinary(realUploadedPublicId, realResourceType)
    assert(delResult.result === 'ok' || delResult.result === 'not found', 'Deletion must succeed')

    // Verify asset is gone
    let notFound = false
    try {
      await cloudinary.api.resource(realUploadedPublicId, { resource_type: realResourceType })
    } catch {
      notFound = true
    }
    assert(notFound, 'Asset must no longer exist after deletion')
  })

  // Test 7: Real PNG image upload
  await test('Real Cloudinary upload of 1x1 transparent PNG image buffer produces valid image URL', async () => {
    const png1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
    const testPublicId = `test_img_${Date.now()}`

    const result = await uploadBufferToCloudinary(png1x1, {
      folder: 'aegisbreach/test_pipeline',
      publicId: testPublicId,
      resourceType: 'image',
      format: 'png',
    })

    assert(result.secure_url, 'Must have secure_url')
    assert(result.secure_url.includes('/image/upload/'), 'Must be /image/upload/')
    assert.strictEqual(result.resource_type, 'image', 'Resource type must be image')

    // Cleanup image asset
    await deleteAssetFromCloudinary(result.public_id, 'image')
  })

  // Test 8: Explicit Mock Simulator isolation test
  await test('Isolated mock mode activates ONLY with explicit CLOUDINARY_MOCK=true and generates concrete URLs', async () => {
    process.env.CLOUDINARY_MOCK = 'true'
    try {
      const mockRes = await uploadBufferToCloudinary(Buffer.from('data'), {
        folder: 'aegisbreach/mock_test',
        publicId: 'mock_doc_01',
        format: 'pdf',
      })
      assert(!mockRes.secure_url.includes('/auto/upload/'), 'Mock URL must never include /auto/upload/')
      assert(mockRes.secure_url.includes('/image/upload/'), 'Mock PDF URL must include /image/upload/')
      assert.strictEqual(mockRes.resource_type, 'image')
    } finally {
      delete process.env.CLOUDINARY_MOCK
      ensureCloudinaryConfigured()
    }
  })

  console.log('================================================================================')
  console.log(`CLOUDINARY PIPELINE TEST SUMMARY: Passed: ${passed}, Failed: ${failed}`)
  console.log('================================================================================')

  if (failed > 0) process.exit(1)
}

runAll().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
