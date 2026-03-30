import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import cuteIcon from '../../assets/cute_icon.png'
import './DIDAuthPage.css'

export default function DIDAuthPage() {
  const navigate = useNavigate()
  const [verified, setVerified] = useState({ passport: false, license: false })

  useEffect(() => {
    const passport = localStorage.getItem('passport_verified') === 'true'
    const license  = localStorage.getItem('license_verified') === 'true'

    // 둘 다 인증 완료면 바로 DID 카드로
    if (passport && license) {
      navigate('/did-card', {
        replace: true,
        state: {
          name:       localStorage.getItem('did_name')   || '',
          docId:      localStorage.getItem('did_docId')  || 'did:care:renter:verified',
          expiryDate: localStorage.getItem('did_expiry') || '',
        },
      })
      return
    }

    setVerified({ passport, license })
  }, [])

  const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 7L5.5 10.5L12 3.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  return (
    <div className="did-auth-page">
      <div className="did-auth-header">
        <p className="did-auth-title">
          이제 인증 <span className="highlight">한 번</span>으로<br />
          <span className="highlight">3분 안에</span> 해결하세요
        </p>
      </div>

      <div className="did-info-card cream-card">
        <p className="did-info-card-text">
          낯선 직원과 대화하지 않아도<br />해결할 수 있어요
        </p>
        <div className="did-smiley">
          <img src={cuteIcon} alt="smile" className="did-cute-icon" />
        </div>
      </div>

      <div className="did-info-card gray-card">
        <p className="did-docs-title">어떤 서류가 필요한가요?</p>
        <ul className="did-docs-list">
          <li
            className={`did-docs-item ${verified.passport ? 'verified' : 'clickable'}`}
            onClick={() => !verified.passport && navigate('/did-guide')}
          >
            <span className={`did-docs-num ${verified.passport ? 'verified-num' : ''}`}>
              {verified.passport ? <CheckIcon /> : '1'}
            </span>
            <span className="did-docs-name">여권</span>
            {verified.passport
              ? <span className="verified-badge">인증완료</span>
              : <span className="did-docs-chevron">›</span>
            }
          </li>
          <li
            className={`did-docs-item ${verified.license ? 'verified' : 'clickable'}`}
            onClick={() => !verified.license && navigate('/did-camera', { state: { docType: 'license' } })}
          >
            <span className={`did-docs-num ${verified.license ? 'verified-num' : ''}`}>
              {verified.license ? <CheckIcon /> : '2'}
            </span>
            <span className="did-docs-name">국제운전면허증</span>
            {verified.license
              ? <span className="verified-badge">인증완료</span>
              : <span className="did-docs-chevron">›</span>
            }
          </li>
        </ul>
      </div>

      <div className="did-auth-footer">
        <button
          className="did-primary-btn"
          onClick={() => navigate('/did-guide')}
        >
          인증하러 가기
        </button>
      </div>
    </div>
  )
}
