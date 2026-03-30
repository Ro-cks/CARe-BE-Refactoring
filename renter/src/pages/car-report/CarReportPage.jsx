import { useNavigate, useLocation } from 'react-router-dom'
import carIconTop from '../../assets/car_icon_top.png'
import { completeReservation } from '../../api/reservation'
import './CarReportPage.css'

const CRACK_POSITIONS = {
  'front':       { top: '14%',  left: '50%' },
  'rear':        { top: '86%',  left: '50%' },
  'left':        { top: '50%',  left: '18%' },
  'right':       { top: '50%',  left: '82%' },
  'front-left':  { top: '30%',  left: '18%' },
  'front-right': { top: '30%',  left: '82%' },
  'rear-left':   { top: '70%',  left: '18%' },
  'rear-right':  { top: '70%',  left: '82%' },
}

export default function CarReportPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const reservation = state?.reservation
  const scanResult = state?.scanResult
  const logType = state?.logType || 'BEFORE'

  if (!scanResult) {
    navigate(-1)
    return null
  }

  const { cracks, totalDefects } = scanResult

  const handleNext = async () => {
    if (logType === 'AFTER') {
      try {
        await completeReservation(reservation?.reservationId)
        navigate('/car-return', { state: { reservation, done: true } })
      } catch {
        alert('반납 처리 중 오류가 발생했습니다.')
      }
    } else {
      if (reservation?.reservationId) {
        localStorage.setItem(`crackDone_${reservation.reservationId}`, 'true')
      }
      navigate('/car-smartkey', { state: { reservation } })
    }
  }

  return (
    <div className="cp-page cp-result-page">
      {/* 헤더 */}
      <div className="cp-result-header">
        <div>
          <p className="cp-result-label">발견된 흠집</p>
          <p className="cp-result-count">총 <span>{totalDefects}</span>건</p>
        </div>
        <div className="cp-blockchain-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 7L12 12L21 7L12 2Z" stroke="#F7A633" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M3 17L12 22L21 17" stroke="#F7A633" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M3 12L12 17L21 12" stroke="#F7A633" strokeWidth="2" strokeLinejoin="round"/>
          </svg>
          <div>
            <p className="cp-blockchain-label">blockchain verified</p>
          </div>
        </div>
      </div>

      {/* 탑뷰 차량 + 크랙 마커 */}
      <div className="cp-car-map-wrap">
        <div className="cp-car-map-ring">
          <div className="cp-car-map-inner">
            <img src={carIconTop} alt="차량 탑뷰" className="cp-car-map-img" />
            {cracks.map(crack => {
              const pos = CRACK_POSITIONS[crack.side]
              return pos ? (
                <div key={crack.side} className="cp-crack-marker" style={pos}>
                  <div className="cp-crack-dot" />
                  <div className="cp-crack-pulse" />
                </div>
              ) : null
            })}
          </div>
        </div>
      </div>

      {/* AI 진단 카드 */}
      <div className="cp-ai-card">
        <div className="cp-ai-card-title">
          <span className="cp-ai-icon">✦</span>
          <span>AI 차량 진단</span>
        </div>
        {totalDefects > 0 ? (
          <>
            <p className="cp-ai-card-body">
              분석 결과, 현재{' '}
              <span className="cp-ai-highlight">{totalDefects}건의 흠집이 존재</span>합니다.
            </p>
            {cracks.map(c => (
              <div key={c.side} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
                <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600, minWidth: 80 }}>{c.label}</span>
                <span style={{ fontSize: 13, color: '#666' }}>흠집 {c.count}건</span>
                <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                  {c.crops?.slice(0, 3).map((url, i) => (
                    <img key={i} src={url} alt="흠집" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : (
          <p className="cp-ai-card-body">
            <span className="cp-ai-highlight" style={{ color: '#10b981' }}>흠집이 발견되지 않았습니다.</span>
            <br/>깨끗한 상태입니다.
          </p>
        )}
      </div>

      <div className="cp-blockchain-notice">
        <p>걱정 마세요!</p>
        <p>CARe가 자체 블록체인에 안전하게 기록해뒀어요</p>
      </div>

      <div className="cp-footer">
        <button className="cp-primary-btn cp-smartkey-btn" onClick={handleNext}>
          {logType === 'AFTER' ? '반납하기' : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" style={{ flexShrink: 0 }}>
                <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
              </svg>
              스마트키 열기
            </>
          )}
        </button>
        <div className="cp-result-sub-row">
          <button className="cp-sub-btn" onClick={() => navigate('/damage-history', { state: { reservation } })}>
            흠집 내역 확인
          </button>
          <button className="cp-sub-btn" onClick={() => navigate('/my-car')}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
