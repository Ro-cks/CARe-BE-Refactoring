import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BottomNav from '../../components/BottomNav'
import { getMyReservations } from '../../api/reservation'
import carIconCute from '../../assets/car_icon_cute.png'
import '../my-car/MyCarPage.css'
import './ReservationDetailPage.css'

function parseDate(val) {
  if (!val) return null
  if (Array.isArray(val)) return new Date(val[0], val[1] - 1, val[2])
  const d = new Date(val)
  return isNaN(d) ? null : d
}

function formatDateLabel(dateStr) {
  if (!dateStr) return null
  const d = parseDate(dateStr)
  if (!d) return null
  return { month: d.getMonth() + 1, day: d.getDate(), date: d }
}

function getPickupStatus(reservation, t) {
  if (!reservation?.startDate || !reservation?.endDate) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const start = parseDate(reservation.startDate); if (!start) return null; start.setHours(0,0,0,0)
  const end   = parseDate(reservation.endDate);   if (!end)   return null; end.setHours(0,0,0,0)

  const msPerDay = 1000 * 60 * 60 * 24
  const daysToStart   = Math.round((start - today) / msPerDay)
  const daysToEnd     = Math.round((end - today) / msPerDay)
  const totalRental   = Math.round((end - start) / msPerDay)
  const elapsedRental = Math.round((today - start) / msPerDay)

  if (daysToStart > 0)  return { type: 'before', label: t('myCar.pickupDday', { n: daysToStart }), color: '#F7A633', progress: 0 }
  if (daysToStart === 0) return { type: 'today',  label: t('myCar.pickupToday'),                    color: '#4CAF50', progress: 0 }
  if (daysToEnd > 0) {
    const progress = totalRental > 0 ? Math.min(elapsedRental / totalRental, 1) : 0
    return { type: 'active', label: t('myCar.returnDday', { n: daysToEnd }), color: '#5B8DEF', progress }
  }
  return { type: 'return', label: t('myCar.returnDue'), color: '#FF4D4F', progress: 1 }
}

export default function ReservationDetailPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { state } = useLocation()
  const [reservation, setReservation] = useState(state?.reservation || null)
  const [loading, setLoading] = useState(!state?.reservation)

  useEffect(() => {
    if (state?.reservation) return
    getMyReservations()
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.data ?? [])
        const found = list.find(r => r.reservationId === state?.reservationId) || null
        setReservation(found)
      })
      .catch(() => setReservation(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="mc-page">
        <div className="rd-header">
          <button className="rd-back-btn" onClick={() => navigate('/reservations')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="#222" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className="rd-header-title">{t('reservationDetail.title')}</span>
        </div>
        <div className="mc-loading"><div className="mc-spinner" /></div>
        <BottomNav />
      </div>
    )
  }

  if (!reservation) {
    return (
      <div className="mc-page">
        <div className="rd-header">
          <button className="rd-back-btn" onClick={() => navigate('/reservations')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="#222" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className="rd-header-title">{t('reservationDetail.title')}</span>
        </div>
        <div className="mc-empty">
          <p className="mc-empty-title">{t('reservationDetail.notFound')}</p>
          <button className="mc-empty-btn" onClick={() => navigate('/reservations')}>{t('reservationDetail.backToList')}</button>
        </div>
        <BottomNav />
      </div>
    )
  }

  const isCompleted = reservation.status === 'COMPLETED'
  const carName = reservation.brand && reservation.modelName
    ? `${reservation.brand} ${reservation.modelName}`
    : reservation.carName || t('myCar.noCarInfo')
  const fmtWeekday = (date) => new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }).format(date)
  const statusLabel = {
    RESERVED:  t('myCar.statusReserved'),
    IN_USE:    t('myCar.statusInUse'),
    COMPLETED: t('myCar.statusCompleted'),
    CANCELLED: t('myCar.statusCancelled'),
    AFTER_SCAN: t('myCar.statusAfterScan'),
  }

  const rawPickup = reservation.pickupDate || reservation.startDate || null
  const rawReturn = reservation.returnDate || reservation.endDate   || null

  const splitDT = (val) => {
    if (!val) return { date: null, time: null }
    if (Array.isArray(val)) {
      const [y, mo, d, h = 0, m = 0] = val
      return {
        date: `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
        time: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`,
      }
    }
    const [date, timePart] = String(val).split('T')
    return { date, time: timePart ? timePart.slice(0, 5) : null }
  }

  const { date: startDate, time: startTime } = splitDT(rawPickup)
  const { date: endDate,   time: endTime   } = splitDT(rawReturn)

  const pickupStatus = getPickupStatus({ ...reservation, startDate, endDate }, t)
  const startLabel   = formatDateLabel(startDate)
  const endLabel     = formatDateLabel(endDate)

  return (
    <div className="mc-page">
      {/* 뒤로가기 헤더 */}
      <div className="rd-header">
        <button className="rd-back-btn" onClick={() => navigate('/reservations')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#222" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className="rd-header-title">{t('reservationDetail.title')}</span>
      </div>

      <div className="mc-scroll">
        {/* 차량 헤더 */}
        <div className="mc-car-header">
          <div className="mc-plate-row">
            <span className={`mc-nft-badge${isCompleted ? ' completed' : ''}`}>
              {statusLabel[reservation.status] || reservation.status}
            </span>
          </div>
          <h1 className="mc-car-name">{carName}</h1>
          <div className="rd-car-meta">
            <span className="rd-meta-item">{reservation.plateNumber}</span>
            {reservation.insuranceName && (
              <>
                <span className="rd-meta-dot">·</span>
                <span className="rd-meta-item">{reservation.insuranceName}</span>
              </>
            )}
          </div>
          {reservation.nftTokenId && (
            <div className="rd-nft-row">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 7L12 12L21 7L12 2Z" stroke="#F7A633" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M3 17L12 22L21 17" stroke="#F7A633" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M3 12L12 17L21 12" stroke="#F7A633" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
              <span className="rd-nft-text">NFT #{reservation.nftTokenId}</span>
            </div>
          )}
          {reservation.reservationId && (
            <div className="rd-reservation-id">
              {t('reservationDetail.reservationId', '예약번호')} · {String(reservation.reservationId).slice(0, 8).toUpperCase()}
            </div>
          )}
        </div>

        {/* 차량 이미지 */}
        <div className="mc-car-image-wrap">
          <div className="mc-car-emoji-wrap">
            {reservation.thumbnailUrl
              ? <img src={reservation.thumbnailUrl} alt={carName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }} />
              : <img src={carIconCute} alt={carName} style={{ width: '70%', objectFit: 'contain' }} />
            }
          </div>
        </div>

        {/* 대여 일정 카드 */}
        <div className="mc-schedule-card">
          <p className="mc-schedule-title">{t('myCar.schedule')}</p>
          <div className="mc-schedule-row">
            <div className="mc-schedule-col">
              <span className="mc-schedule-tag pickup">{t('myCar.pickup')}</span>
              <p className="mc-schedule-date">
                {startLabel ? t('myCar.monthDay', { month: startLabel.month, day: startLabel.day }) : '--'}
                {startLabel && <span className="mc-schedule-weekday"> ({fmtWeekday(startLabel.date)})</span>}
              </p>
              {startTime && <p className="mc-schedule-time">{startTime}</p>}
            </div>
            <div className="mc-schedule-arrow">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path d="M5 12H19M13 6L19 12L13 18" stroke="#F7A633" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="mc-schedule-col">
              <span className="mc-schedule-tag return">{t('myCar.return')}</span>
              <p className="mc-schedule-date">
                {endLabel ? t('myCar.monthDay', { month: endLabel.month, day: endLabel.day }) : '--'}
                {endLabel && <span className="mc-schedule-weekday"> ({fmtWeekday(endLabel.date)})</span>}
              </p>
              {endTime && <p className="mc-schedule-time">{endTime}</p>}
            </div>
          </div>

          {isCompleted ? (
            <div className="rd-completed-banner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17L4 12" stroke="#4CAF50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{t('myCar.returnCompleted')}</span>
            </div>
          ) : pickupStatus && (
            <div className="mc-schedule-progress-wrap">
              <div className="mc-schedule-bar-bg">
                <div
                  className="mc-schedule-bar-fill"
                  style={{
                    width: pickupStatus.type === 'active' ? `${pickupStatus.progress * 100}%` :
                           pickupStatus.type === 'return' ? '100%' : '0%',
                    background: pickupStatus.color,
                  }}
                />
              </div>
              <span className="mc-schedule-dday" style={{ color: pickupStatus.color }}>
                {pickupStatus.label}
              </span>
            </div>
          )}

        </div>

        <div style={{ height: 40 }} />
      </div>

      <BottomNav />
    </div>
  )
}
