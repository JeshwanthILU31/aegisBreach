import jwt from 'jsonwebtoken'

/**
 * JWT Authentication Middleware
 * Validates the Bearer token in the Authorization header and attaches
 * authenticated user details (userId, role) to `req.user`.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization

  if (!authHeader || typeof authHeader !== 'string') {
    return res.status(401).json({ error: 'Authentication required. Authorization header missing.' })
  }

  const parts = authHeader.trim().split(/\s+/)
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1]) {
    return res.status(401).json({ error: 'Invalid or malformed authorization header format. Expected "Bearer <token>"' })
  }

  const token = parts[1]
  const secret = process.env.JWT_SECRET
  if (!secret) {
    return res.status(500).json({ error: 'JWT_SECRET is not configured on the server' })
  }

  try {
    const decoded = jwt.verify(token, secret)
    if (!decoded || !decoded.userId || !decoded.role) {
      return res.status(401).json({ error: 'Invalid token payload' })
    }

    // Attach strictly minimal, safe authenticated properties from verified JWT
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    }

    next()
  } catch {
    // Return safe generic 401 error without exposing internal details or secret
    return res.status(401).json({ error: 'Invalid or expired authentication token' })
  }
}

export const requireAuth = authenticate
export const authenticateToken = authenticate
export { requireRole, requireAdmin } from './roleMiddleware.js'
export default authenticate

