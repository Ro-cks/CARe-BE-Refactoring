import React from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'

import Sidebar from './components/Sidebar'
import ProtectedRoute from './components/ProtectedRoute'

import LoginPage from './pages/login/LoginPage'
import SignUpPage from './pages/signup/SignUpPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import ReservationPage from './pages/reservation/ReservationPage'
import ReservationDetailPage from './pages/reservation-detail/ReservationDetailPage'
import AIReportPage from './pages/ai-report/AIReportPage'
import CarManagementPage from './pages/car-management/CarManagementPage'
import CarDetailPage from './pages/car-detail/CarDetailPage'
import CarRegisterPage from './pages/car-register/CarRegisterPage'
import DisputesList from './pages/dispute/DisputesList'
import DisputePage from './pages/dispute/DisputePage'

import './App.css'

/**
 * 보호된 레이아웃 (Sidebar + Main)
 */
function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <Routes>
      {/* 공개 페이지 */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<SignUpPage />} />

      {/* 보호된 페이지 */}
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        <Route path="/cars" element={<CarManagementPage />} />
        <Route path="/cars/register" element={<CarRegisterPage />} />
        <Route path="/cars/:id" element={<CarDetailPage />} />

        <Route path="/reservations" element={<ReservationPage />} />
        <Route path="/reservations/:id" element={<ReservationDetailPage />} />

        <Route path="/ai-report/:id" element={<AIReportPage />} />

        <Route path="/disputes" element={<DisputesList />} />
        <Route path="/disputes/:id" element={<DisputePage />} />

        <Route path="/logout" element={<div>로그아웃</div>} />
      </Route>

      {/* 없는 경로 처리 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
