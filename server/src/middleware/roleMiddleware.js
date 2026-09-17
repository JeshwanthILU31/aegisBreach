/**
 * Role-Based Authorization Middleware
 * Validates that `req.user.role` (populated by authentication middleware)
 * matches one of the allowed roles.
 *
 * @param  {...string|string[]} roles - One or more allowed roles (e.g. 'admin', 'user')
 * @returns {Function} Express middleware handler
 */
export function requireRole(...roles) {
  // Support both requireRole('admin', 'user') and requireRole(['admin', 'user'])
  const allowedRoles = roles.flat().filter(r => typeof r === 'string' && r.trim().length > 0)

  return (req, res, next) => {
    // 1. Ensure authentication occurred and req.user.role exists
    if (!req.user || typeof req.user.role !== 'string') {
      return res.status(401).json({ error: 'Authentication required' })
    }

    // 2. Strictly check req.user.role against allowed roles
    const userRole = req.user.role

    if (allowedRoles.length === 0 || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Access forbidden: insufficient permissions' })
    }

    // 3. User is authorized
    next()
  }
}

/**
 * Convenience helper for requiring admin role
 */
export const requireAdmin = requireRole('admin')

export default requireRole
