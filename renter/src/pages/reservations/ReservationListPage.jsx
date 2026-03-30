import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BottomNav from '../../components/BottomNav'
import { getMyReservations } from '../../api/reservation'
import './ReservationListPage.css'

const STATUS_COLOR = {
  RESERVED:   '#5B8DEF',
  IN_USE:     '#4CAF50',
  AFTER_SCAN: '#F7A633',
  COMPLETED:  '#888',
  CANCELLED:  '#FF4D4F',
}

const ACTIVE_STATUSES = new Set(['RESERVED', 'IN_USE', 'AFTER_SCAN'])

function filterReservations(list, tab) {
  if (tab === 'ALL')     return list
  if (tab === 'ACTIVE')  return list.filter(r => ACTIVE_STATUSES.has(r.status))
  if (tab === 'DONE')    return list.filter(r => r.status === 'COMPLETED')
  if (tab === 'DISPUTE') return list.filter(r => r.depositStatus === 'LOCKED')
  return list
}

function formatDate(dateStr) {
  if (!dateStr) return '--'
  if (Array.isArray(dateStr)) {
    const [y, mo, d] = dateStr
    return `${y}.${String(mo).padStart(2,'0')}.${String(d).padStart(2,'0')}`
  }
  const d = dateStr.split('T')[0]
  return d.replace(/-/g, '.')
}

function pickupMs(r) {
  const p = r.pickupDate
  if (!p) return 0
  if (Array.isArray(p)) return new Date(p[0], p[1]-1, p[2]).getTime()
  return new Date(p).getTime() || 0
}

export default function ReservationListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ALL')

  const TABS = [
    { key: 'ALL',     label: t('reservationList.tabAll') },
    { key: 'ACTIVE',  label: t('reservationList.tabActive') },
    { key: 'DONE',    label: t('reservationList.tabDone') },
    { key: 'DISPUTE', label: t('reservationList.tabDispute') },
  ]

  const STATUS_LABEL = {
    RESERVED:   { text: t('myCar.statusReserved'),   color: STATUS_COLOR.RESERVED   },
    IN_USE:     { text: t('myCar.statusInUse'),      color: STATUS_COLOR.IN_USE     },
    AFTER_SCAN: { text: t('myCar.statusAfterScan'),  color: STATUS_COLOR.AFTER_SCAN },
    COMPLETED:  { text: t('myCar.statusCompleted'),  color: STATUS_COLOR.COMPLETED  },
    CANCELLED:  { text: t('myCar.statusCancelled'),  color: STATUS_COLOR.CANCELLED  },
  }

  const DEPOSIT_BADGE = {
    LOCKED:   { text: t('reservationList.depositLocked'),   color: '#FF4D4F', bg: '#FFF0F0' },
    DEDUCTED: { text: t('reservationList.depositDeducted'), color: '#fff',    bg: '#888'    },
  }

  useEffect(() => {
    getMyReservations()
      .then(data => setReservations(Array.isArray(data) ? data : []))
      .catch(() => setReservations([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filterReservations(reservations, activeTab)
    .slice()
    .sort((a, b) => pickupMs(b) - pickupMs(a))

  return (
    <div className="rl-page">
      <div className="rl-header">
        <button className="rl-back" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="#111" />
          </svg>
        </button>
        <h1 className="rl-title">{t('reservationList.title')}</h1>
      </div>

      <div className="rl-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`rl-tab ${activeTab === tab.key ? 'rl-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rl-body">
        {loading && <p className="rl-empty">{t('reservationList.loading')}</p>}
        {!loading && filtered.length === 0 && (
          <p className="rl-empty">{t('reservationList.empty')}</p>
        )}
        {filtered.map((r) => {
          const status = STATUS_LABEL[r.status] || { text: r.status, color: '#888' }
          const depositBadge = DEPOSIT_BADGE[r.depositStatus]
          const isDispute = r.depositStatus === 'LOCKED'
          return (
            <div
              key={r.reservationId}
              className="rl-card"
              onClick={() => {
                if (ACTIVE_STATUSES.has(r.status)) {
                  navigate('/my-car', { state: { reservation: r } })
                } else {
                  navigate(`/reservations/${r.reservationId}`, { state: { reservation: r, disputeId: r.disputeId } })
                }
              }}
            >
              <div className="rl-card-top">
                <span className="rl-car-name">{r.brand} {r.modelName}</span>
                <div className="rl-card-badges">
                  {depositBadge && (
                    <span className="rl-badge-deposit" style={{ background: depositBadge.bg, color: depositBadge.color }}>
                      {depositBadge.text}
                    </span>
                  )}
                  <span className="rl-status" style={{ color: status.color }}>{status.text}</span>
                </div>
              </div>
              <p className="rl-plate">
                {r.plateNumber}
                {r.reservationId && (
                  <span className="rl-reservation-id"> · {String(r.reservationId).slice(0, 8).toUpperCase()}</span>
                )}
              </p>
              <div className="rl-dates">
                <span>{formatDate(r.pickupDate)}</span>
                <span className="rl-arrow">→</span>
                <span>{formatDate(r.returnDate)}</span>
              </div>
              <p className="rl-insurance">{r.insuranceName}</p>
              {isDispute && (
                <button
                  className="rl-dispute-btn"
                  onClick={e => {
                    e.stopPropagation()
                    navigate('/dispute', { state: { reservation: r, disputeId: r.disputeId } })
                  }}
                >
                  {t('reservationList.disputeBtn')}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <BottomNav />
    </div>
  )
}
