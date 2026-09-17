import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  // 1. Unauthenticated visitor: redirect to /login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 2. Authenticated normal user (role !== 'admin'): redirect to /projects
  if (user.role !== 'admin') {
    return <Navigate to="/projects" replace />
  }

  // 3. Authenticated admin: render children
  return children
}
