import { useNavigate } from 'react-router-dom'
import passportIcon from '../../assets/passport_icon.png'
import './DIDPassportGuidePage.css'

export default function DIDPassportGuidePage() {
  const navigate = useNavigate()

  return (
    <div className="did-guide-page">
      {/* Back button */}
      <button className="did-guide-back" onClick={() => navigate(-1)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="#222" />
        </svg>
      </button>

      {/* Center content */}
      <div className="did-guide-center">
        <div className="did-guide-frame">
          <div className="did-guide-image-box">
            <img src={passportIcon} alt="passport" className="did-guide-passport-img" />
          </div>
          <div className="did-guide-corner corner-tl" />
          <div className="did-guide-corner corner-tr" />
          <div className="did-guide-corner corner-bl" />
          <div className="did-guide-corner corner-br" />
        </div>

        <div className="did-guide-text">
          <p>유효기간이 남은</p>
          <p>실제 여권을 촬영해 주세요</p>
        </div>
      </div>

      {/* Bottom button */}
      <div className="did-guide-footer">
        <button className="did-guide-btn" onClick={() => navigate('/did-camera', { state: { docType: 'passport' } })}>
          촬영하러 가기
        </button>
      </div>
    </div>
  )
}
