import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import NotificationToast from './components/NotificationToast'
import SplashPage from './pages/splash/SplashPage'
import LandingPage from './pages/landing/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import SignUpPage from './pages/auth/SignUpPage'
import SignUpLanguagePage from './pages/auth/SignUpLanguagePage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import LanguageSelectPage from './pages/language/LanguageSelectPage'
import HomePage from './pages/home/HomePage'
import MyCarPage from './pages/my-car/MyCarPage'
import ProfilePage from './pages/profile/ProfilePage'
import CarListPage from './pages/car-list/CarListPage'
import CarDetailPage from './pages/car-detail/CarDetailPage'
import PaymentPage from './pages/payment/PaymentPage'
import BookingCompletePage from './pages/booking-complete/BookingCompletePage'
import WalletPage from './pages/wallet/WalletPage'
import ChargePage from './pages/wallet/ChargePage'
import ExchangePage from './pages/wallet/ExchangePage'
import TokenHistoryPage from './pages/wallet/TokenHistoryPage'
import DIDAuthPage from './pages/did-auth/DIDAuthPage'
import DIDPassportGuidePage from './pages/did-auth/DIDPassportGuidePage'
import DIDCameraPage from './pages/did-auth/DIDCameraPage'
import DIDConfirmPage from './pages/did-auth/DIDConfirmPage'
import DIDCardPage from './pages/did-auth/DIDCardPage'
import ScanPage from './pages/scan/ScanPage'
import CarFaceAuthPage from './pages/car-faceauth/CarFaceAuthPage'
import CarSmartKeyPage from './pages/car-smartkey/CarSmartKeyPage'
import DamageHistoryPage from './pages/damage-history/DamageHistoryPage'
import DamageDetailPage from './pages/damage-detail/DamageDetailPage'
import DisputePage from './pages/dispute/DisputePage'
import DisputeHistoryPage from './pages/dispute/DisputeHistoryPage'
import MyDisputesPage from './pages/dispute/MyDisputesPage'
import NotificationsPage from './pages/notifications/NotificationsPage'
import ReservationListPage from './pages/reservations/ReservationListPage'
import ReservationDetailPage from './pages/reservations/ReservationDetailPage'
import ReturnGuidePage from './pages/car-return/ReturnGuidePage'
import CarReturnPage from './pages/car-return/CarReturnPage'
import CarReportPage from './pages/car-report/CarReportPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NotificationProvider>
          <NotificationToast />
          <Routes>
          <Route path="/" element={<SplashPage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/scan/:reservationId" element={<ScanPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/signup/language" element={<SignUpLanguagePage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/language" element={<LanguageSelectPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/my-car" element={<MyCarPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/car-list" element={<CarListPage />} />
          <Route path="/car-detail" element={<CarDetailPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/booking-complete" element={<BookingCompletePage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/wallet/token" element={<TokenHistoryPage />} />
          <Route path="/wallet/charge" element={<ChargePage />} />
          <Route path="/wallet/exchange" element={<ExchangePage />} />
          <Route path="/did-auth" element={<DIDAuthPage />} />
          <Route path="/did-guide" element={<DIDPassportGuidePage />} />
          <Route path="/did-camera" element={<DIDCameraPage />} />
          <Route path="/did-confirm" element={<DIDConfirmPage />} />
          <Route path="/did-card" element={<DIDCardPage />} />
          <Route path="/car-faceauth" element={<CarFaceAuthPage />} />
          <Route path="/car-smartkey" element={<CarSmartKeyPage />} />
          <Route path="/damage-history" element={<DamageHistoryPage />} />
          <Route path="/damage-detail" element={<DamageDetailPage />} />
          <Route path="/dispute" element={<DisputePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/dispute-history" element={<MyDisputesPage />} />
          <Route path="/dispute-scratch-logs" element={<DisputeHistoryPage />} />
          <Route path="/reservations" element={<ReservationListPage />} />
          <Route path="/reservations/:reservationId" element={<ReservationDetailPage />} />
          <Route path="/return-guide" element={<ReturnGuidePage />} />
          <Route path="/car-return" element={<CarReturnPage />} />
          <Route path="/car-report" element={<CarReportPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </NotificationProvider>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
