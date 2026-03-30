import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import carIcon from '../../assets/car_icon.png'
import carIconCute from '../../assets/car_icon_cute.png'
import BottomNav from '../../components/BottomNav'
import {
  getMyReservations,
} from '../../api/reservation'
import './MyCarPage.css'

const MOCK_RESERVATION = {
  reservationId: 1,
  carId: 101,
  carName: 'GENESIS GV70',
  plateNumber: '123가4567',
  nftTokenId: 231,
  carImageUrl: null,
  batteryLevel: 100,
  drivingRange: 78,
  status: 'ACTIVE',
  startDate: '2026-03-15',
  startTime: '09:00',
  endDate: '2026-03-20',
  endTime: '18:00',
  pickupLocation: '인천국제공항',
}

function parseDate(val) {
  if (!val) return null
  // 배열 형태 [2026, 3, 15] 처리
  if (Array.isArray(val)) return new Date(val[0], val[1] - 1, val[2])
  // 문자열 "2026-03-15" 처리
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
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = parseDate(reservation.startDate)
  if (!start) return null
  start.setHours(0, 0, 0, 0)
  const end = parseDate(reservation.endDate)
  if (!end) return null
  end.setHours(0, 0, 0, 0)

  const msPerDay = 1000 * 60 * 60 * 24
  const daysToStart = Math.round((start - today) / msPerDay)
  const daysToEnd   = Math.round((end - today) / msPerDay)
  const totalRental = Math.round((end - start) / msPerDay)
  const elapsedRental = Math.round((today - start) / msPerDay)

  if (daysToStart > 0) {
    return { type: 'before', label: t('myCar.pickupDday', { n: daysToStart }), color: '#F7A633', progress: 0 }
  } else if (daysToStart === 0) {
    return { type: 'today', label: t('myCar.pickupToday'), color: '#4CAF50', progress: 0 }
  } else if (daysToEnd > 0) {
    const progress = totalRental > 0 ? Math.min(elapsedRental / totalRental, 1) : 0
    return { type: 'active', label: t('myCar.returnDday', { n: daysToEnd }), color: '#5B8DEF', progress }
  } else {
    return { type: 'return', label: t('myCar.returnDue'), color: '#FF4D4F', progress: 1 }
  }
}

const ACTIVE_STATUSES = new Set(['RESERVED', 'IN_USE', 'AFTER_SCAN'])

export default function MyCarPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { state } = useLocation()
  const [reservations, setReservations] = useState(state?.reservation ? [state.reservation] : [])
  const [selectedIdx, setSelectedIdx] = useState(state?.reservation ? 0 : null)
  const [loading, setLoading] = useState(!state?.reservation)
  const reservation = reservations[selectedIdx] || null

  useEffect(() => {
    if (state?.reservation) return
    const fetchData = async () => {
      try {
        const reservationData = await getMyReservations()
        const list = Array.isArray(reservationData) ? reservationData : (reservationData?.data ?? [])
        const activeList = list
            .filter(r => ACTIVE_STATUSES.has(r.status))
            .sort((a, b) => new Date(b.pickupDate || 0) - new Date(a.pickupDate || 0))
        setReservations(activeList)
        if (activeList.length === 1) setSelectedIdx(0)
        // 2개 이상이면 null 유지 → 선택 화면 표시

      } catch {
        setReservations([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
        <div className="mc-page">
          <div className="mc-loading">
            <div className="mc-spinner" />
            <p>{t('myCar.loading')}</p>
          </div>
          <BottomNav />
        </div>
    )
  }

  if (reservations.length === 0) {
    return (
        <div className="mc-page">
          <div className="mc-empty">
            <img src={carIcon} alt="차량 없음" className="mc-empty-icon" />
            <p className="mc-empty-title">{t('myCar.noReservation')}</p>
            <p className="mc-empty-desc">{t('myCar.noReservationDesc')}</p>
            <button className="mc-empty-btn" onClick={() => navigate('/home')}>
              {t('myCar.searchCar')}
            </button>
          </div>
          <BottomNav />
        </div>
    )
  }

  // 예약 여러개이고 아직 선택 안 한 경우 → 선택 화면
  if (reservations.length > 1 && selectedIdx === null) {
    const parseDT = (v) => {
      if (!v) return null
      if (Array.isArray(v)) return new Date(v[0], v[1]-1, v[2], v[3]||0, v[4]||0)
      return new Date(v)
    }
    const fmtDate = (v) => {
      const d = parseDT(v)
      if (!d || isNaN(d)) return ''
      const wd = ['일','월','화','수','목','금','토'][d.getDay()]
      return `${d.getMonth()+1}.${d.getDate()}(${wd}) ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    }
    const fmtCreatedAt = (v) => {
      const d = parseDT(v)
      if (!d || isNaN(d)) return null
      return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} 예약`
    }
    const STATUS_CLS = { RESERVED: 'reserved', IN_USE: 'inuse', AFTER_SCAN: 'afterscan' }
    const STATUS_KO  = { RESERVED: '예약 확정', IN_USE: '이용 중', AFTER_SCAN: '반납 대기' }
    return (
        <div className="mc-page">
          <div className="mc-scroll">
            <div className="mc-sel-top">
              <p className="mc-sel-title">이용 중인 예약</p>
            </div>
            <div className="mc-sel-list">
              {reservations.map((r, i) => {
                const carLabel = r.brand && r.modelName
                    ? `${r.brand} ${r.modelName}`
                    : r.carName || '차량 정보 없음'
                const statusCls = STATUS_CLS[r.status] || 'reserved'
                const statusKo  = STATUS_KO[r.status]  || r.status
                const pickup    = fmtDate(r.pickupDate || r.startDate)
                const ret       = fmtDate(r.returnDate || r.endDate)
                const createdAt = fmtCreatedAt(r.createdAt)
                const country   = r.airportCode || r.countryCode || null
                return (
                    <button key={r.reservationId} className="mc-sel-item" onClick={() => setSelectedIdx(i)}>
                      <div className="mc-sel-icon">
                        {r.thumbnailUrl
                          ? <img src={r.thumbnailUrl} alt={carLabel} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                          : '🚗'}
                      </div>
                      <div className="mc-sel-info">
                        <div className="mc-sel-car-row">
                          <p className="mc-sel-car">{carLabel}</p>
                          {country && <span className="mc-sel-country">{country}</span>}
                        </div>
                        {pickup && <p className="mc-sel-date"><span className="mc-sel-dt-label">픽업</span>{pickup}</p>}
                        {ret    && <p className="mc-sel-date"><span className="mc-sel-dt-label">반납</span>{ret}</p>}
                        <div className="mc-sel-meta-row">
                          {r.plateNumber && <span className="mc-sel-plate">{r.plateNumber}</span>}
                          {createdAt && <span className="mc-sel-created">{createdAt}</span>}
                        </div>
                      </div>
                      <div className="mc-sel-right">
                        <span className={`mc-sel-badge ${statusCls}`}>{statusKo}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mc-sel-chevron">
                          <path d="M9 18l6-6-6-6" stroke="#ccc" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </button>
                )
              })}
            </div>
          </div>
          <BottomNav />
        </div>
    )
  }

  const isCompleted = reservation.status === 'COMPLETED'

  const crackDone    = reservation
      ? localStorage.getItem(`crackDone_${reservation.reservationId}`) === 'true'
      : false
  const faceAuthDone = reservation
      ? localStorage.getItem(`faceAuthDone_${reservation.reservationId}`) === 'true'
      : false
  const pickupReady  = faceAuthDone && crackDone

  const rawPickup = reservation.pickupDate || reservation.startDate || null
  const rawReturn = reservation.returnDate || reservation.endDate   || null

  // "2026-03-15T10:00:00" → 날짜/시간 분리
  const splitDT = (val) => {
    if (!val) return { date: null, time: null }
    if (Array.isArray(val)) {
      const [y, mo, d, h = 0, m = 0] = val
      const hh = String(h).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      return { date: `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`, time: `${hh}:${mm}` }
    }
    const [date, timePart] = String(val).split('T')
    const time = timePart ? timePart.slice(0, 5) : null
    return { date, time }
  }

  const { date: startDate, time: startTime } = splitDT(rawPickup)
  const { date: endDate,   time: endTime   } = splitDT(rawReturn)

  const pickupStatus = getPickupStatus({ ...reservation, startDate, endDate }, t)
  const startLabel = formatDateLabel(startDate)
  const endLabel   = formatDateLabel(endDate)
  const fmtWeekday = (date) => new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }).format(date)
  const statusLabel = {
    RESERVED: t('myCar.statusReserved'),
    IN_USE: t('myCar.statusInUse'),
    COMPLETED: t('myCar.statusCompleted'),
    CANCELLED: t('myCar.statusCancelled'),
    AFTER_SCAN: t('myCar.statusAfterScan'),
  }

  // 반납 버튼: 픽업일 당일 이후부터 활성화
  const today = new Date(); today.setHours(0,0,0,0)
  const returnActive = startDate ? new Date(startDate) <= today : false
  const carName    = reservation.brand && reservation.modelName
      ? `${reservation.brand} ${reservation.modelName}`
      : reservation.carName || t('myCar.noCarInfo')

  return (
      <div className="mc-page">
        <div className="mc-scroll">
          {/* 뒤로가기 + 예약 전환 pill 탭 — 여러 예약 시 상단 고정 */}
          {reservations.length > 1 && (
              <div className="mc-res-tabs">
                <button className="mc-res-tab-back" onClick={() => setSelectedIdx(null)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M15 18l-6-6 6-6" stroke="#888" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {reservations.map((r, i) => {
                  const raw = r.pickupDate || r.startDate
                  const d = raw ? (Array.isArray(raw) ? new Date(raw[0], raw[1]-1, raw[2]) : new Date(raw)) : null
                  const dateStr = d && !isNaN(d) ? `${d.getMonth()+1}/${d.getDate()}` : '-'
                  const carShort = r.brand && r.modelName
                      ? r.modelName
                      : (r.carName || '---').split(' ').slice(-1)[0]
                  return (
                      <button
                          key={r.reservationId}
                          className={`mc-res-tab${i === selectedIdx ? ' active' : ''}`}
                          onClick={() => setSelectedIdx(i)}
                      >
                        {carShort} · {dateStr}
                      </button>
                  )
                })}
              </div>
          )}

          {/* 차량 헤더 */}
          <div className="mc-car-header">
            <div className="mc-plate-row">
            <span className={`mc-nft-badge${reservation.status === 'COMPLETED' ? ' completed' : ''}`}>
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

          {/* 배터리 & 주행거리 */}
          {(reservation.batteryLevel != null || reservation.drivingRange != null) && (
              <div className="mc-stats-card">
                <div className="mc-stat">
                  <p className="mc-stat-label">{t('myCar.battery')}</p>
                  <p className="mc-stat-value">{reservation.batteryLevel ?? '-'}%</p>
                </div>
                <div className="mc-stat-divider" />
                <div className="mc-stat">
                  <p className="mc-stat-label">{t('myCar.drivingRange')}</p>
                  <p className="mc-stat-value">{reservation.drivingRange ?? '-'}km</p>
                </div>
              </div>
          )}

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

            {pickupStatus && (
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

          {/* 차량 외관 촬영 카드 */}
          {isCompleted ? (
              <div className="mc-action-card mc-completed-card">
                <p className="mc-action-card-title">{t('myCar.returnCompleted')}</p>
              </div>
          ) : (
              <div className="mc-action-card">
                <p className="mc-action-card-title">{t('myCar.exterior')}</p>
                <div className="mc-action-row">
                  <button
                      className={`mc-action-btn mc-shoot-btn${crackDone ? ' mc-shoot-btn--done' : ''}`}
                      disabled={crackDone}
                      onClick={() => !crackDone && navigate('/return-guide', { state: { reservation, logType: 'BEFORE' } })}
                  >
                    <div className="mc-action-btn-icon">
                      {crackDone ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5"
                                  strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                      ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
                                  stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                            <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                      )}
                    </div>
                    <span className="mc-action-btn-label">{crackDone ? t('myCar.shootDone') : t('myCar.beforeShoot')}</span>
                    <span className="mc-action-btn-sub">{crackDone ? t('myCar.shootDoneSub') : t('myCar.beforeShootSub')}</span>
                  </button>
                  <button
                      className="mc-action-btn mc-return-btn"
                      onClick={() => navigate('/return-guide', { state: { reservation, logType: 'AFTER' } })}
                  >
                    <div className="mc-action-btn-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M9 14l-4-4 4-4" stroke="currentColor" strokeWidth="2"
                              strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M5 10h11a4 4 0 010 8h-1" stroke="currentColor" strokeWidth="2"
                              strokeLinecap="round"/>
                      </svg>
                    </div>
                    <span className="mc-action-btn-label">{t('myCar.returnBtn')}</span>
                    <span className="mc-action-btn-sub">{t('myCar.returnBtnSub')}</span>
                  </button>
                </div>
              </div>
          )}

          <div style={{ height: 130 }} />
        </div>

        {/* 하단 고정 - Smart Key + 반납 */}
        {!isCompleted && (
            <div className="mc-action-bar">
              <button
                  className={`mc-smartkey-inner${pickupReady ? '' : ' locked'}`}
                  onClick={() => {
                    if (pickupReady) {
                      // 예약 시간 전이면 스마트키 페이지 진입 차단
                      const rawPickup = reservation?.pickupDate || reservation?.startDate
                      if (rawPickup) {
                        const pickupDt = Array.isArray(rawPickup)
                            ? new Date(rawPickup[0], rawPickup[1]-1, rawPickup[2], rawPickup[3]||0, rawPickup[4]||0)
                            : new Date(rawPickup)
                        if (new Date() < pickupDt) {
                          const timeStr = (d) =>
                              alert()
                          return
                        }
                      }
                      navigate('/car-smartkey', { state: { reservation } })
                    } else if (!faceAuthDone) {
                      navigate('/car-faceauth', { state: { reservation } })
                    } else {
                      navigate('/return-guide', { state: { reservation, logType: 'BEFORE' } })
                    }
                  }}
              >
                <div className="mc-smartkey-icon-wrap">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                  </svg>
                </div>
                <span className="mc-smartkey-label">Smart Key</span>
                {pickupReady
                    ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    ) : (
                        <span className="mc-smartkey-lock-badge">
                {faceAuthDone ? t('myCar.smartKeyNeedShoot') : t('myCar.smartKeyNeedFace')}
              </span>
                    )
                }
              </button>
            </div>
        )}


        <BottomNav />
      </div>
  )
}
