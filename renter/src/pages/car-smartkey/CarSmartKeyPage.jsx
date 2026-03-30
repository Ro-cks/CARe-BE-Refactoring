import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { issueSmartKey, unlockSmartKey, lockSmartKey } from '../../api/reservation'
import './CarSmartKeyPage.css'

export default function CarSmartKeyPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const reservation = state?.reservation

  const rid = reservation?.reservationId
  const faceAuthDone = rid ? localStorage.getItem(`faceAuthDone_${rid}`) === 'true' : false
  const pickupReady  = faceAuthDone

  const [locked, setLocked] = useState(!pickupReady)
  const [timeBlocked, setTimeBlocked] = useState(false)
  const [pickupDateTime, setPickupDateTime] = useState(null)

  useEffect(() => {
    if (!reservation) return
    const raw = reservation.pickupDate || reservation.startDate
    if (!raw) return
    let dt
    if (Array.isArray(raw)) {
      const [y, mo, d, h = 0, m = 0] = raw
      dt = new Date(y, mo - 1, d, h, m)
    } else {
      dt = new Date(raw)
    }
    if (isNaN(dt.getTime())) return
    setPickupDateTime(dt)
    if (new Date() < dt) {
      setTimeBlocked(true)
    }
  }, [reservation])

  const handleLockToggle = async () => {
    if (!pickupReady) return
    try {
      if (locked) {
        await issueSmartKey(rid)
        await unlockSmartKey(rid)
      } else {
        await lockSmartKey(rid)
      }
      setLocked((v) => !v)
    } catch (e) {
      alert('스마트키 제어에 실패했습니다.')
    }
  }

  const carName = reservation?.brand && reservation?.modelName
    ? `${reservation.brand} ${reservation.modelName}`
    : reservation?.carName || '내 차량'
  const plateNumber = reservation?.plateNumber || '---'
  const batteryLevel = reservation?.batteryLevel ?? null

  const formatPickupTime = (dt) => {
    if (!dt) return ''
    return `${dt.getMonth()+1}월 ${dt.getDate()}일 ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
  }

  if (timeBlocked) {
    return (
      <div className="sk-page sk-blocked-page">
        <div className="sk-blocked-modal">
          <div className="sk-blocked-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
          </div>
          <h2 className="sk-blocked-title">아직 예약 시간이 아니에요</h2>
          <p className="sk-blocked-desc">
            스마트키는 픽업 시작 시간부터<br/>사용할 수 있어요.
          </p>
          {pickupDateTime && (
            <div className="sk-blocked-time">
              <span className="sk-blocked-time-label">픽업 시작 시간</span>
              <span className="sk-blocked-time-value">{formatPickupTime(pickupDateTime)}</span>
            </div>
          )}
          <button className="sk-blocked-btn" onClick={() => navigate('/my-car')}>
            돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="sk-page">
      {/* 헤더 */}
      <div className="sk-header">
        <div className="sk-header-left">
          <div className="sk-header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#F7A633">
              <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
            </svg>
          </div>
          <span className="sk-header-title">Smart Key</span>
        </div>
        <button className="sk-close-btn" onClick={() => navigate('/my-car')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="#444" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* 차량 카드 */}
      <div className="sk-car-card">
        <div className="sk-car-info">
          <p className="sk-car-name">{carName}</p>
          <p className="sk-car-plate">{plateNumber}</p>
        </div>
        {batteryLevel != null && (
          <div className="sk-battery">
            <div className="sk-battery-icon">
              <div className="sk-battery-fill" style={{ width: `${batteryLevel}%` }} />
            </div>
            <span className="sk-battery-text">{batteryLevel}%</span>
          </div>
        )}
      </div>

      {/* 얼굴 인증 필요 안내 */}
      {!pickupReady && (
        <div className="sk-prereq-banner">
          <p className="sk-prereq-desc">얼굴 인증을 완료해주세요</p>
          <button className="sk-prereq-btn" onClick={() => navigate('/car-faceauth', { state: { reservation } })}>
            얼굴 인증하러 가기
          </button>
        </div>
      )}

      {/* 잠금/해제 버튼 */}
      <div className="sk-lock-section">
        <button
          className={`sk-lock-btn${locked ? ' locked' : ''}${!pickupReady ? ' prereq-locked' : ''}`}
          onClick={handleLockToggle}
          disabled={!pickupReady}
        >
          <div className="sk-lock-glow" />
          <div className="sk-lock-inner">
            {locked ? (
              <svg width="52" height="52" viewBox="0 0 24 24" fill="white">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
            ) : (
              <svg width="52" height="52" viewBox="0 0 24 24" fill="white">
                <path d="M12 1C9.24 1 7 3.24 7 6v1H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2h-1V6c0-2.76-2.24-5-5-5zm0 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm4-7H8V6c0-2.21 1.79-4 4-4s4 1.79 4 4v2z"/>
              </svg>
            )}
          </div>
        </button>

        <p className={`sk-lock-status${locked ? ' locked' : ''}`}>
          {locked ? 'LOCKED' : 'UNLOCKED'}
        </p>
        {pickupReady
          ? <p className="sk-lock-hint">탭하여 {locked ? '잠금 해제' : '잠금'}</p>
          : <p className="sk-lock-hint locked">픽업 절차를 완료해야 해제돼요</p>
        }
        {pickupReady && <p className="sk-lock-sub">· 홀드하여 제어</p>}
      </div>

      {/* 기능 버튼 3개 */}
      <div className="sk-actions">
        <button className="sk-action-btn" onClick={() => {}}>
          <div className="sk-action-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="13" width="18" height="8" rx="2" stroke="#555" strokeWidth="2"/>
              <path d="M3 13V10a2 2 0 012-2h14a2 2 0 012 2v3" stroke="#555" strokeWidth="2"/>
              <rect x="7" y="3" width="10" height="5" rx="1" stroke="#555" strokeWidth="1.5"/>
            </svg>
          </div>
          <span className="sk-action-label">트렁크</span>
        </button>

        <button className="sk-action-btn" onClick={() => {}}>
          <div className="sk-action-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <polygon points="11,3 21,12 11,21 11,15 3,15 3,9 11,9" stroke="#555" strokeWidth="2" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          <span className="sk-action-label">경적</span>
        </button>

        <button className="sk-action-btn" onClick={() => {}}>
          <div className="sk-action-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="18" cy="5" r="3" stroke="#555" strokeWidth="2"/>
              <circle cx="6" cy="12" r="3" stroke="#555" strokeWidth="2"/>
              <circle cx="18" cy="19" r="3" stroke="#555" strokeWidth="2"/>
              <path d="M8.59 13.51L15.42 17.49M15.41 6.51L8.59 10.49" stroke="#555" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="sk-action-label">키 공유</span>
        </button>
      </div>

    </div>
  )
}
