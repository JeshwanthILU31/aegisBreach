import mongoose from 'mongoose'

export function validateObjectId(...paramNames) {
  return (request, response, next) => {
    for (const paramName of paramNames) {
      const id = request.params[paramName]
      if (id && !mongoose.Types.ObjectId.isValid(id)) {
        return response.status(400).json({
          error: `Invalid ID format for parameter '${paramName}'`,
        })
      }
    }
    next()
  }
}

export function validateIdOrSlug(...paramNames) {
  return (request, response, next) => {
    for (const paramName of paramNames) {
      const id = request.params[paramName]
      if (id && !mongoose.Types.ObjectId.isValid(id) && !/^[a-zA-Z0-9_-]+$/.test(id)) {
        return response.status(400).json({
          error: `Invalid ID or slug format for parameter '${paramName}'`,
        })
      }
    }
    next()
  }
}

