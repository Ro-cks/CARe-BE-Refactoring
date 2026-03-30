import { useNavigate, useLocation } from 'react-router-dom'
import carIconCute from '../../assets/car_icon_cute.png'
import './ReturnGuidePage.css'

const CHECKLIST = [
  { icon: '📸', text: '총 6방향을 촬영해요' },
  { icon: '🔒', text: '촬영 기록은 블록체인에 안전하게 저장돼요' },
  { icon: '⚡', text: '분쟁 발생 시 근거 자료로 활용돼요' },
]

const CONTENT = {
  BEFORE: {
    title: '픽업 전 차량 외관을\n촬영해주세요',
    sub: '탑승 전 차량 상태를 기록하고 블록체인에 저장해요',
    logType: 'BEFORE',
  },
  AFTER: {
    title: '반납 전 차량 외관을\n촬영해주세요',
    sub: '반납 전 차량 상태를 기록하고 블록체인에 저장해요',
    logType: 'AFTER',
  },
}

export default function ReturnGuidePage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const reservation = state?.reservation
  const logType = state?.logType || 'AFTER'
  const content = CONTENT[logType] ?? CONTENT.AFTER

  const handleStart = () => {
    if (!reservation) return
    navigate(`/scan/${reservation.reservationId}`, {
      state: { logType: content.logType, reservation },
    })
  }

  return (
    <div className="rg-page">
      <button className="rg-back-btn" onClick={() => navigate(-1)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18L9 12L15 6" stroke="#222" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="rg-body">
        <div className="rg-car-ring">
          <img src={carIconCute} alt="차량" className="rg-car-icon" />
        </div>

        <h1 className="rg-title">
          {content.title.split('\n').map((line, i) => (
            <span key={i}>{line}{i === 0 && <br/>}</span>
          ))}
        </h1>
        <p className="rg-sub">{content.sub}</p>

        <div className="rg-checklist">
          {CHECKLIST.map((item, i) => (
            <div key={i} className="rg-check-item">
              <span className="rg-check-icon">{item.icon}</span>
              <span className="rg-check-text">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rg-footer">
        <button className="rg-primary-btn" onClick={handleStart}>
          촬영 시작하기
        </button>
      </div>
    </div>
  )
}
