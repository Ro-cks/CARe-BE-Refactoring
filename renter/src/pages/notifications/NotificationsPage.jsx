import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotification } from '../../context/NotificationContext'
import { getMyReservations } from '../../api/reservation'
import './NotificationsPage.css'

const TYPE_META = {
  RESERVATION_CREATED:  { label: '예약 완료',   color: '#5B8DEF', bg: '#EEF3FF' },
  RESERVATION_COMPLETED:{ label: '반납 완료',   color: '#4CAF50', bg: '#F0FAF0' },
  DISPUTE_CREATED:      { label: '분쟁 접수',   color: '#E84040', bg: '#FFF0F0' },
  SETTLEMENT_REQUESTED: { label: '정산 요청',   color: '#F7A633', bg: '#FFF7EC' },
  SETTLEMENT_COMPLETED: { label: '정산 완료',   color: '#4CAF50', bg: '#F0FAF0' },
}

function fmtTime(val) {
  if (!val) return ''
  const d = new Date(val)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '방금'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { notifications, markAsRead } = useNotification()
  const [reservations, setReservations] = useState([])

  useEffect(() => {
    getMyReservations()
      .then(data => setReservations(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  // 페이지 열릴 때 읽지 않은 알림 전부 읽음 처리 → 배지 사라짐
  useEffect(() => {
    notifications
      .filter(n => !n.read)
      .forEach(n => markAsRead(n.notificationId))
  }, [])

  const handleClick = async (n) => {
    if (!n.read) markAsRead(n.notificationId)

    if (n.disputeId && n.reservationId) {
      const r = reservations.find(r => r.reservationId === n.reservationId)
      const reservation = r || { reservationId: n.reservationId }
      navigate('/dispute', { state: { reservation, disputeId: n.disputeId } })
    }
  }

  const sorted = [...notifications].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return tb - ta
  })

  return (
    <div className="noti-page">
      <div className="noti-header">
        <button className="noti-back" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="#111" />
          </svg>
        </button>
        <h1 className="noti-title">알림</h1>
      </div>

      <div className="noti-scroll">

        {sorted.length === 0 && (
          <div className="noti-empty">
            <div className="noti-empty-icon">🔔</div>
            <p className="noti-empty-text">알림이 없어요</p>
          </div>
        )}

        <div className="noti-list">
          {sorted.map(n => {
            const meta = TYPE_META[n.notificationType] || { label: '알림', color: '#888', bg: '#f5f5f5' }
            const isClickable = !!(n.disputeId && n.reservationId)
            return (
              <div
                key={n.notificationId}
                className={`noti-item${n.read ? '' : ' noti-item--unread'}${isClickable ? ' noti-item--clickable' : ''}`}
                onClick={() => isClickable && handleClick(n)}
              >
                {!n.read && <div className="noti-dot" />}
                <div className="noti-item-body">
                  <div className="noti-item-top">
                    <span className="noti-type-badge" style={{ color: meta.color, background: meta.bg }}>
                      {meta.label}
                    </span>
                    <span className="noti-time">{fmtTime(n.createdAt)}</span>
                  </div>
                  <p className="noti-item-title">{n.title}</p>
                  <p className="noti-item-message">{n.message}</p>
                </div>
                {isClickable && (
                  <svg className="noti-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18l6-6-6-6" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
