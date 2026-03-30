import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import faceIcon from '../../assets/face_icon.png'
import { useAuth } from '../../context/AuthContext'
import { useNotification } from '../../context/NotificationContext'
import BottomNav from '../../components/BottomNav'
import { getRenterProfile } from '../../api/auth'
import './ProfilePage.css'

export default function ProfilePage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { unreadCount } = useNotification()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRenterProfile()
      .then((data) => setProfile(data))
      .catch((err) => console.error('프로필 조회 실패:', err))
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/landing')
  }

  return (
    <div className="profile-page">
      <div className="profile-topbar">
        <button className="profile-bell" onClick={() => navigate('/notifications')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {unreadCount > 0 && (
            <span className="profile-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>
      </div>
      <div className="profile-header">
        <img src={faceIcon} alt="프로필" className="profile-avatar" />
        <p className="profile-name">
          {loading ? '...' : (profile?.name ?? t('profile.name'))}
        </p>
        {!loading && profile?.email && (
          <p className="profile-email">{profile.email}</p>
        )}
      </div>

      <ul className="profile-menu">
        <li className="profile-menu-item" onClick={() => navigate('/wallet')}>
          {t('profile.wallet')}
        </li>
        <li className="profile-menu-item" onClick={() => navigate('/reservations')}>{t('profile.reservations')}</li>
        <li className="profile-menu-item" onClick={() => navigate('/dispute-history')}>{t('profile.disputeHistory')}</li>
        <li
          className="profile-menu-item"
          onClick={() => navigate('/language', { state: { from: 'profile' } })}
        >
          {t('profile.languageSettings')}
        </li>
        <li className="profile-menu-item logout" onClick={handleLogout}>
          {t('profile.logout')}
        </li>
      </ul>

      <BottomNav />
    </div>
  )
}

