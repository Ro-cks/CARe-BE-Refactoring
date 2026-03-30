import { useNavigate, useLocation } from 'react-router-dom'
import careLogo from '../../assets/care_logo.png'
import BottomNav from '../../components/BottomNav'
import './BookingCompletePage.css'

export default function BookingCompletePage() {
  const navigate = useNavigate()
  const { state } = useLocation()

  const car        = state?.car        || {}
  const searchInfo = state?.searchInfo || {}
  const total      = state?.total      || 1378

  const pickupLabel = searchInfo.pickupDate
    ? `${searchInfo.pickupDate}(${dow(searchInfo.pickupDate)}) 오전 ${searchInfo.pickupTime || '10:00'}`
    : '2026.3.13(금) 오전 10:00'

  const returnLabel = searchInfo.returnDate
    ? `${searchInfo.returnDate}(${dow(searchInfo.returnDate)}) 오전 ${searchInfo.returnTime || '10:00'}`
    : '2026.3.15(일) 오전 10:00'

  const modelName = car.name
    ? car.name.split(' ').slice(-2).join(' ')
    : 'SL65 AMG'

  return (
    <div className="bc-wrap">
      {/* 헤더 */}
      <header className="bc-header">
        <img src={careLogo} alt="CARe" className="bc-logo" />
        <button className="bc-back" onClick={() => navigate('/home')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#111" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="bc-title">예약 완료</h1>
        <div style={{ width: 30 }} />
      </header>

      <div className="bc-scroll">
        {/* 체크 아이콘 */}
        <div className="bc-check-area">
          <div className="bc-circle">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.6"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="bc-msg">예약을 완료했어요</p>
          <p className="bc-amount">{total.toLocaleString()} CARE</p>
        </div>

        {/* 차량 이미지 */}
        <div className="bc-car-area">
          <div className="bc-car-img" style={{ background: '#f4f4f4', overflow: 'hidden' }}>
            {car.thumbnailUrl
              ? <img src={car.thumbnailUrl} alt={car.modelName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span className="bc-car-emoji">🚗</span>
            }
          </div>
          <p className="bc-car-name">{car.brand && car.modelName ? `${car.brand} ${car.modelName}` : car.name || '차량'}</p>
        </div>

        {/* 예약 상세 카드 */}
        <div className="bc-info-card">
          <p className="bc-card-title">예약 상세</p>
          <div className="bc-row">
            <span className="bc-row-lbl">차량 모델</span>
            <span className="bc-row-val">{modelName}</span>
          </div>
          <div className="bc-row">
            <span className="bc-row-lbl">픽업 공항</span>
            <span className="bc-row-val">{searchInfo.location || '나리타 공항, 도쿄'}</span>
          </div>
          <div className="bc-row">
            <span className="bc-row-lbl">픽업일</span>
            <span className="bc-row-val">{pickupLabel}</span>
          </div>
          <div className="bc-row bc-row-last">
            <span className="bc-row-lbl">반납일</span>
            <span className="bc-row-val">{returnLabel}</span>
          </div>
        </div>

        <div style={{ height: 120 }} />
      </div>

      {/* 하단 버튼 */}
      <div className="bc-btn-area">
        <button className="bc-btn-ghost" onClick={() => navigate('/home')}>홈으로</button>
        <button className="bc-btn" onClick={() => navigate('/my-car')}>내 차량 확인하기 →</button>
      </div>

      <BottomNav />
    </div>
  )
}

function dow(dateStr) {
  if (!dateStr) return ''
  try {
    return ['일','월','화','수','목','금','토'][new Date(dateStr).getDay()]
  } catch { return '' }
}
