import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthService from '../services/AuthService'
import CompanyNotificationService from '../services/CompanyNotificationService'
import careLogoSrc from '../assets/care-logo.png'
import './Sidebar.css'

export default function Sidebar() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate  = useNavigate()
  const [notifications,    setNotifications]    = useState([])
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [company, setCompany] = useState({
    name:  localStorage.getItem('companyName')  || '',
    email: localStorage.getItem('companyEmail') || '',
  })

  const menuItems = [
    { id: 'dashboard',    label: t('sidebar.dashboard'),              icon: '🏠', path: '/dashboard'    },
    { id: 'cars',         label: t('sidebar.carManagement'),          icon: '🚙', path: '/cars'         },
    { id: 'reservations', label: t('sidebar.reservationManagement'),  icon: '📅', path: '/reservations' },
    { id: 'disputes',     label: t('sidebar.disputeManagement'),      icon: '⚖️', path: '/disputes'     },
  ]

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('companyLanguage', lang)
  }

  /* localStorage 변경 감지 */
  useEffect(() => {
    const sync = () => setCompany({
      name:  localStorage.getItem('companyName')  || '',
      email: localStorage.getItem('companyEmail') || '',
    })
    window.addEventListener('storage', sync)
    const id = setInterval(sync, 1000)
    return () => { window.removeEventListener('storage', sync); clearInterval(id) }
  }, [])

  /* 알림 패널 외부 클릭 시 닫기 */
  useEffect(() => {
    if (!notificationOpen) return
    const close = (e) => {
      if (!e.target.closest('.sidebar-notification-wrap')) setNotificationOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [notificationOpen])

  /* 알림 로드 + SSE */
  useEffect(() => {
    let mounted = true
    const load = async () => {
      const result = await CompanyNotificationService.getNotifications()
      if (!mounted) return
      if (result.success) setNotifications(result.data)
      else { console.warn('Notification load failed:', result.message); setNotifications([]) }
    }
    load()

    const token = localStorage.getItem('token')
    if (!token) return () => { mounted = false }

    const ac = new AbortController()
    CompanyNotificationService.subscribeNotifications({
      token,
      signal: ac.signal,
      onNotification: (n) => setNotifications((prev) => [n, ...prev]),
      onError: (e)        => console.error('SSE error:', e),
    }).catch((e) => { if (!ac.signal.aborted) console.error('SSE subscribe failed:', e) })

    return () => { mounted = false; ac.abort() }
  }, [])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  )

  const handleNotificationClick = async (notification) => {
    if (!notification.read && notification.notificationId) {
      const result = await CompanyNotificationService.markAsRead(notification.notificationId)
      if (result.success) {
        setNotifications((prev) => prev.map((item) =>
          item.notificationId === notification.notificationId
            ? { ...item, read: true, readAt: result.data?.readAt || item.readAt }
            : item,
        ))
      }
    }
    if (notification.disputeId) {
      navigate(`/disputes/${notification.disputeId}`)
      setNotificationOpen(false)
    }
  }

  const handleLogout = async () => {
    if (!window.confirm(t('sidebar.logoutConfirm'))) return
    await AuthService.logout()
    navigate('/company/login', { replace: true })
  }

  return (
    <header className="sidebar">

      {/* -- 로고 -- */}
      <div className="sidebar-header">
        <div className="sidebar-header-row">
          <div className="sidebar-logo">
            <img src={careLogoSrc} alt="CARe" className="logo-img" />
            <span className="logo-badge">{t('sidebar.badge')}</span>
          </div>
        </div>
      </div>

      {/* -- 메뉴 -- */}
      <nav className="sidebar-nav">
        <div className="sidebar-menu">
          {menuItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* -- 언어 선택 -- */}
      <div className="sidebar-lang-switcher" style={{ display: 'flex', gap: '6px', padding: '0 16px', marginTop: '8px' }}>
        <button
          type="button"
          onClick={() => handleLanguageChange('ko')}
          style={{
            flex: 1, padding: '6px 0', borderRadius: '6px', border: 'none', cursor: 'pointer',
            fontSize: '12px', fontWeight: i18n.language === 'ko' ? 700 : 400,
            background: i18n.language === 'ko' ? '#F5A623' : '#f0ece6',
            color: i18n.language === 'ko' ? '#fff' : '#6b6b7a',
          }}
        >
          {t('sidebar.languageKo')}
        </button>
        <button
          type="button"
          onClick={() => handleLanguageChange('ja')}
          style={{
            flex: 1, padding: '6px 0', borderRadius: '6px', border: 'none', cursor: 'pointer',
            fontSize: '12px', fontWeight: i18n.language === 'ja' ? 700 : 400,
            background: i18n.language === 'ja' ? '#F5A623' : '#f0ece6',
            color: i18n.language === 'ja' ? '#fff' : '#6b6b7a',
          }}
        >
          {t('sidebar.languageJa')}
        </button>
      </div>

      {/* -- 오른쪽 영역 -- */}
      <div className="sidebar-spacer" />

      {/* 알림 */}
      <div className="sidebar-notification-wrap">
        <button
          type="button"
          className="sidebar-notification-btn"
          onClick={() => setNotificationOpen((v) => !v)}
          aria-label={t('sidebar.notifications')}
        >
          🔔 {t('sidebar.notifications')}
          {unreadCount > 0 && (
            <span className="sidebar-notification-badge">{unreadCount}</span>
          )}
        </button>

        {notificationOpen && (
          <div className="sidebar-notification-panel">
            <div className="sidebar-notification-title">{t('sidebar.notificationTitle')}</div>
            <div className="sidebar-notification-list">
              {notifications.length === 0 ? (
                <div className="sidebar-notification-empty">{t('sidebar.notificationEmpty')}</div>
              ) : (
                notifications.slice(0, 10).map((n) => (
                  <button
                    key={n.notificationId}
                    type="button"
                    className={`sidebar-notification-item ${n.read ? '' : 'unread'}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className="sidebar-notification-item-title">{n.title}</div>
                    <div className="sidebar-notification-item-message">{n.message}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 회사 정보 + 로그아웃 */}
      <div className="sidebar-bottom">
        <div className="sidebar-company-info">
          <div className="sidebar-company-top">
            <div className="company-name">{company.name || t('sidebar.noCompanyName')}</div>
            <div className="company-email">{company.email || ''}</div>
          </div>
        </div>
        <button
          type="button"
          className="sidebar-inline-logout-btn"
          onClick={handleLogout}
        >
          {t('sidebar.logout')}
        </button>
      </div>

    </header>
  )
}
