import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import careLogo from '../../assets/care_logo.png'
import BottomNav from '../../components/BottomNav'
import api from '../../api/auth'
import './CarDetailPage.css'

const TERMS = [
  { id: 'service',   label: '렌터카 서비스 이용 약관', required: true },
  { id: 'insurance', label: '보험 및 보장 약관',        required: true },
  { id: 'cancel',    label: '취소 및 환불 정책',         required: true },
  { id: 'privacy',   label: '개인정보 처리 방침',        required: true },
]

const AI_SUMMARY = {
  service: [
    { icon: '📋', title: '서비스 범위', desc: '렌터카 이용 시간, 반납 조건, 추가 운전자 등록 등이 포함됩니다.' },
    { icon: '⚠️', title: '위반 시 불이익', desc: '약관 위반 시 보증금 차감 또는 추가 비용이 청구될 수 있습니다.' },
    { icon: '📌', title: '긴급 상황 대응', desc: '사고·고장 시 24시간 긴급 출동 서비스가 제공됩니다.' },
  ],
  insurance: [
    { icon: '🛡', title: '고가 차량 보호', desc: '고가 차량의 경우 사고 시 수리비가 높으므로 종합 보험을 권장합니다.' },
    { icon: '⚠️', title: '해외 운전 보장', desc: '해외 운전 경험이 적은 고객에게 종합 보험을 권장합니다.' },
    { icon: '📈', title: '85%의 고객 선택', desc: '유사 조건의 고객 중 대다수가 이 플랜을 선택했습니다.' },
  ],
  cancel: [
    { icon: '🔄', title: '무료 취소 기간', desc: '픽업 24시간 전까지 무료 취소가 가능합니다.' },
    { icon: '💸', title: '취소 수수료', desc: '픽업 24시간 이내 취소 시 대여료의 10%가 수수료로 부과됩니다.' },
    { icon: '📅', title: '노쇼(No-show)', desc: '사전 연락 없이 미픽업 시 전액 환불이 불가합니다.' },
  ],
  privacy: [
    { icon: '🔒', title: '개인정보 수집', desc: '이름, 연락처, 면허정보 등 렌탈에 필요한 최소 정보만 수집합니다.' },
    { icon: '🗑', title: '보관 기간', desc: '이용 종료 후 6개월 이내 개인정보가 파기됩니다.' },
    { icon: '🌐', title: '제3자 제공', desc: '보험사·결제사에 한해 최소 정보가 공유될 수 있습니다.' },
  ],
}

const TERM_TRANSLATIONS = {
  service: '렌터카 서비스 이용 시 차량 인수·반납 절차, 추가 운전자 등록 요건, 연료 정책, 주행거리 제한 및 위반 시 추가 요금에 관한 사항이 포함되어 있습니다.',
  insurance: '보험 약관의 주요 내용입니다. 차량 손해, 대인·대물 배상 및 자기 신체 손해에 관한 보상 범위와 자기부담금이 명시되어 있습니다.',
  cancel: '픽업 24시간 전 무료 취소, 24시간 이내 취소 시 대여료 10% 수수료 부과, 노쇼 시 전액 환불 불가 등 취소·환불 조건이 명시되어 있습니다.',
  privacy: '렌탈 서비스 제공을 위해 수집되는 개인정보 항목, 이용 목적, 보관 기간 및 제3자 제공 범위에 관한 내용이 포함되어 있습니다.',
}

const TERM_ORIGINALS = {
  service: 'This agreement sets forth the terms and conditions for the rental of vehicles, including vehicle pick-up and return procedures, additional driver registration requirements, fuel policies, mileage limitations, and any surcharges for violations thereof.',
  insurance: 'This policy covers vehicle damage, third-party liability for personal injury and property damage, and personal accident protection. Deductible amounts and coverage limits are specified herein.',
  cancel: 'Free cancellation is available up to 24 hours before the scheduled pick-up time. Cancellations within 24 hours will incur a fee of 10% of the rental charge. No-shows are non-refundable.',
  privacy: 'We collect personal information including name, contact details, and license information solely for the purpose of providing rental services. Data is retained for up to 6 months after service completion and may be shared with insurance and payment partners as required.',
}

export default function CarDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { state } = useLocation()
  const car        = state?.car        || {}
  const searchInfo = state?.searchInfo || {}

  const [imgIdx, setImgIdx]               = useState(0)
  const [insurance, setInsurance]         = useState(null)
  const [insurancePlans, setInsurancePlans] = useState([])
  const [favorite, setFavorite]           = useState(false)
  const [allChecked, setAllChecked]       = useState(false)
  const [termChecks, setTermChecks]       = useState(
    Object.fromEntries(TERMS.map((t) => [t.id, false]))
  )
  const [expandedTerm, setExpandedTerm]   = useState(null)
  const [showTranslation, setShowTranslation] = useState(false)

  useEffect(() => {
    const companyId = car.companyId
    if (!companyId) return
    api.get(`/api/insurances?companyId=${companyId}`)
      .then(res => {
        const plans = res.data
        setInsurancePlans(plans)
        if (plans.length > 0) setInsurance(plans[0].insuranceId)
      })
      .catch(() => {})
  }, [car.companyId])

  const selectedPlan = insurancePlans.find((p) => p.insuranceId === insurance) || insurancePlans[0]
  const basePrice    = car.dailyPrice || 0

  const rentalDays = (() => {
    const p = searchInfo.pickupDate
    const r = searchInfo.returnDate
    if (!p || !r) return 1
    const diff = (new Date(r) - new Date(p)) / (1000 * 60 * 60 * 24)
    return diff > 0 ? diff : 1
  })()

  const rentalPrice  = basePrice * rentalDays
  const totalPrice   = rentalPrice + (selectedPlan?.price || 0)

  const toggleAll = () => {
    const next = !allChecked
    setAllChecked(next)
    setTermChecks(Object.fromEntries(TERMS.map((t) => [t.id, next])))
  }

  const toggleTerm = (id) => {
    const next = { ...termChecks, [id]: !termChecks[id] }
    setTermChecks(next)
    setAllChecked(TERMS.every((t) => next[t.id]))
  }

  const allRequired = TERMS.filter((t) => t.required).every((t) => termChecks[t.id])

  const handleReserve = () => {
    if (!allRequired) {
      alert(t('carDetail.termsRequired'))
      return
    }
    navigate('/payment', {
      state: {
        car,
        carId: car.carId,
        insuranceId: selectedPlan?.insuranceId,
        searchInfo,
        insurance: selectedPlan,
        rentalPrice,
      },
    })
  }

  const services = car.services || {
    included: ['무료 GPS', '스노우 체인', '무제한 주행거리', '네비게이션'],
    excluded: ['스노우 체인', '유아용 카시트'],
  }

  return (
    <div className="cd-wrap">
      {/* 헤더 */}
      <header className="cd-header">
        <img src={careLogo} alt="CARe" className="cd-logo" />
        <button className="cd-back" onClick={() => navigate(-1)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#111" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="cd-header-title">{car.brand && car.modelName ? `${car.brand} ${car.modelName}` : car.name || '차량 상세'}</h1>
        <button className="cd-fav" onClick={() => setFavorite(!favorite)}>
          {favorite
            ? <svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#F7A633"/></svg>
            : <svg width="22" height="22" viewBox="0 0 24 24"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z" fill="#bbb"/></svg>
          }
        </button>
      </header>

      <div className="cd-scroll">
        {/* 차량 이미지 슬라이더 */}
        <div className="cd-img-area">
          {car.thumbnailUrl
            ? <img src={car.thumbnailUrl} alt={car.modelName} className="cd-car-img-photo" />
            : <span className="cd-car-img">{car.emoji || '🚗'}</span>
          }
        </div>

        {/* 평점 */}
        <div className="cd-rating">
          <span className="cd-star">★</span>
          <span className="cd-rv">{car.rating || 4.9}</span>
          <span className="cd-rcnt">({car.reviews || 230} Reviews)</span>
        </div>

        {/* 차량 상세 사양 */}
        <div className="cd-section">
          <p className="cd-sec-title">{t('carDetail.specTitle')}</p>
          <div className="cd-spec-grid">
            <div className="cd-spec-cell">
              <p className="cd-spec-lbl">{t('carDetail.brand')}</p>
              <p className="cd-spec-val">{car.brand || '-'}</p>
            </div>
            <div className="cd-spec-cell cd-spec-mid">
              <p className="cd-spec-lbl">{t('carDetail.size')}</p>
              <p className="cd-spec-val">{car.carSize ? t(`carDetail.size${car.carSize.charAt(0) + car.carSize.slice(1).toLowerCase()}`) : '-'}</p>
            </div>
            <div className="cd-spec-cell">
              <p className="cd-spec-lbl">{t('carDetail.fuel')}</p>
              <p className="cd-spec-val">{car.fuelType ? t(`carDetail.fuel${car.fuelType.charAt(0) + car.fuelType.slice(1).toLowerCase()}`) : '-'}</p>
            </div>
          </div>
        </div>

        {/* 보험 */}
        <div className="cd-section">
          <p className="cd-sec-title">{t('carDetail.insurance')}</p>
          <div className="cd-ins-row">
            {insurancePlans.map(plan => (
              <button
                key={plan.insuranceId}
                className={`cd-ins-card${insurance === plan.insuranceId ? ' sel' : ''}`}
                onClick={() => setInsurance(plan.insuranceId)}
              >
                <p className="cd-ins-lbl">{plan.name}</p>
                <p className="cd-ins-price">{Number(plan.price).toLocaleString()} CARE</p>
                <p className="cd-ins-cov">{plan.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 포함 서비스 */}
        <div className="cd-section">
          <p className="cd-sec-title">{t('carDetail.includedServices')}</p>
          <div className="cd-svc-box">
            <div className="cd-svc-grid">
              {services.included.map(s => (
                <div key={s} className="cd-svc-item">
                  <span className="cd-svc-chk">✓</span>
                  <span className="cd-svc-name">{s}</span>
                </div>
              ))}
              {services.excluded.map(s => (
                <div key={s} className="cd-svc-item">
                  <span className="cd-svc-x">✕</span>
                  <span className="cd-svc-name cd-svc-off">{s}</span>
                </div>
              ))}
            </div>
            <div className="cd-company">
              <div className="cd-co-logo">O</div>
              <span className="cd-co-name">{car.companyName || '-'}</span>
              <button className="cd-co-link">{t('carDetail.companyInfo')}</button>
            </div>
          </div>
        </div>

        {/* 약관 동의 */}
        <div className="cd-section cd-section-last">
          <p className="cd-sec-title">{t('carDetail.termsTitle')}</p>

          {/* 전체 동의 */}
          <div className="cd-term-all" onClick={toggleAll}>
            <span className={`cd-chk${allChecked ? ' chk-on' : ''}`}>{allChecked && '✓'}</span>
            <span className="cd-term-all-txt">{t('carDetail.agreeAll')}</span>
          </div>

          {/* 개별 약관 */}
          {TERMS.map(term => (
            <div key={term.id} className="cd-term-wrap">
              <div className="cd-term-row">
                <span
                  className={`cd-chk${termChecks[term.id] ? ' chk-on' : ''}`}
                  onClick={() => toggleTerm(term.id)}
                >{termChecks[term.id] && '✓'}</span>
                <span className="cd-term-txt">{term.label}</span>
                <span className="cd-term-req">{t('carDetail.required')}</span>
                <button
                  className="cd-chev"
                  onClick={() => setExpandedTerm(expandedTerm === term.id ? null : term.id)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    style={{ transform: expandedTerm === term.id ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>
                    <path d="M6 9l6 6 6-6" stroke="#aaa" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              {expandedTerm === term.id && (
                <div className="cd-ai-box">
                  <button className="cd-ai-btn">⭐ AI 요약</button>
                  <div className="cd-ai-list">
                    {(AI_SUMMARY[term.id] || []).map(pt => (
                      <div key={pt.title} className="cd-ai-item">
                        <span className="cd-ai-ico">{pt.icon}</span>
                        <div>
                          <p className="cd-ai-ttl">{pt.title}</p>
                          <p className="cd-ai-dsc">{pt.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="cd-trans-row">
                    <button className={`cd-trans${!showTranslation ? ' trans-on' : ''}`} onClick={() => setShowTranslation(false)}>{t('carDetail.seeTranslation')}</button>
                    <button className={`cd-trans${showTranslation ? ' trans-on' : ''}`}  onClick={() => setShowTranslation(true)}>{t('carDetail.seeOriginal')}</button>
                  </div>
                  <p className="cd-term-body">
                    {showTranslation
                      ? TERM_ORIGINALS[term.id]
                      : TERM_TRANSLATIONS[term.id]}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ height: 130 }} />
      </div>

      {/* 하단 고정 바 */}
      <div className="cd-bar">
        <div className="cd-bar-price">
          <p className="cd-bar-lbl">{t('carDetail.totalAmount')}</p>
          <p className="cd-bar-amt">{totalPrice.toLocaleString()} <span className="cd-bar-unit">CARE</span></p>
        </div>
        <button className="cd-bar-btn" onClick={handleReserve}>{t('carDetail.reserve')}</button>
      </div>

      <BottomNav />
    </div>
  )
}
