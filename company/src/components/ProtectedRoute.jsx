import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import AuthService from '../services/AuthService'

export default function ProtectedRoute({ children }) {
  const location = useLocation()

  if (!AuthService.isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
