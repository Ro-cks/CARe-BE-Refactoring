import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import BottomNav from '../../components/BottomNav'
import { createReservation } from '../../api/reservation'
import { getTokenBalance } from '../../api/auth'
import { addTokenHistory } from '../../utils/careToken'
import './PaymentPage.css'

export default function PaymentPage() {
  const navigate = useNavigate()
  const { state } = useLocation()

  const DEPOSIT = 10000

  const car         = state?.car         || {}
  const carId       = state?.carId       || car.id || car.carId || ''
  const insuranceId = state?.insuranceId || ''
  const searchInfo  = state?.searchInfo  || {}
  const insurance   = state?.insurance   || { name: '스탠다드', price: 80 }
  const rentalPrice = state?.rentalPrice || 0
  const total       = rentalPrice + (insurance.price || 0) + DEPOSIT

  const [walletBalance, setWalletBalance] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showChargeModal, setShowChargeModal] = useState(false)

  useEffect(() => {
    getTokenBalance().then((data) => setWalletBalance(parseFloat(data.balance))).catch(() => {})
  }, [])

  const handlePay = async () => {
    if (walletBalance !== null && walletBalance < total && total > 0) {
      setShowChargeModal(true)
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await createReservation(carId, insuranceId, searchInfo.pickupDate, searchInfo.pickupTime, searchInfo.returnDate, searchInfo.returnTime, total)
      const modelName = car.name ? car.name.split(' ').slice(-2).join(' ') : '차량'
      addTokenHistory({ type: 'payment', amount: total, desc: `${modelName} 렌탈 결제`, txHash: result.paymentTxHash || result.data?.paymentTxHash })
      navigate('/booking-complete', {
        state: {
          car,
          searchInfo,
          total,
          rentalPrice,
          insurance,
          deposit: DEPOSIT,
          reservationId: result.reservationId || result.data?.reservationId,
          paymentTxHash: result.paymentTxHash || result.data?.paymentTxHash,
        },
      })
    } catch (err) {
      const msg = err.response?.data?.message || '결제에 실패했습니다. 다시 시도해주세요.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

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
    <div className="pay-wrap">
      {/* 헤더 */}
      <header className="pay-header">
        <button className="pay-back" onClick={() => navigate(-1)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#111" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="pay-title">결제하기</h1>
        <div style={{ width: 30 }} />
      </header>

      <div className="pay-scroll">

        <p className="pay-sec-title">토큰 결제</p>

        <div className="pay-wallet-card">
          <div className="pay-wallet-head">
            <span className="pay-wallet-ico">🗂</span>
            <span className="pay-wallet-lbl">내 지갑</span>
          </div>
          <div className="pay-divider" />
          <div className="pay-row">
            <span className="pay-row-lbl">보유 토큰</span>
            <span className="pay-row-val pay-row-bold">{walletBalance != null ? walletBalance.toLocaleString() : '...'} CARE</span>
          </div>
          <div className="pay-row">
            <span className="pay-row-lbl">결제 금액</span>
            <span className="pay-row-val">{total.toLocaleString()} CARE</span>
          </div>
        </div>

        <div className="pay-info-card">
          <p className="pay-card-title">예약 상세</p>
          <div className="pay-row">
            <span className="pay-row-lbl">차량 모델</span>
            <span className="pay-row-val">{modelName}</span>
          </div>
          <div className="pay-row">
            <span className="pay-row-lbl">픽업 공항</span>
            <span className="pay-row-val">{searchInfo.location || '나리타 공항, 도쿄'}</span>
          </div>
          <div className="pay-row">
            <span className="pay-row-lbl">픽업일</span>
            <span className="pay-row-val">{pickupLabel}</span>
          </div>
          <div className="pay-row pay-row-last">
            <span className="pay-row-lbl">반납일</span>
            <span className="pay-row-val">{returnLabel}</span>
          </div>
        </div>

        <div className="pay-info-card">
          <p className="pay-card-title">결제 상세</p>
          <div className="pay-row">
            <span className="pay-row-lbl">차량 대여료</span>
            <span className="pay-row-val">{rentalPrice.toLocaleString()} CARE</span>
          </div>
          <div className="pay-row">
            <span className="pay-row-lbl">{insurance.name} 보험료</span>
            <span className="pay-row-val">{insurance.price.toLocaleString()} CARE</span>
          </div>
          <div className="pay-row">
            <span className="pay-row-lbl">예치 보증금</span>
            <span className="pay-row-val">{DEPOSIT.toLocaleString()} CARE</span>
          </div>
          <div className="pay-total-line" />
          <div className="pay-row pay-row-last pay-row-total">
            <span className="pay-total-lbl">총 결제</span>
            <span className="pay-total-val">{total.toLocaleString()} CARE</span>
          </div>
        </div>

        {/* 정산 안내 */}
        <div className="pay-notice-card">
          {/* <div className="pay-notice-row">
            <span className="pay-notice-dot pay-notice-dot--out" />
            <span className="pay-notice-text">
              <strong>대여료 · 보험료</strong>는 결제 즉시 차감됩니다.
            </span>
          </div> */}
          <div className="pay-notice-row">
            <span className="pay-notice-dot pay-notice-dot--refund" />
            <span className="pay-notice-text">
              <strong>예치 보증금</strong>은 반납 후 차량 상태에 따라 전액 또는 일부 환불될 수 있습니다.
            </span>
          </div>
          <div className="pay-notice-divider" />
          <p className="pay-notice-summary">
            💡 반납 후 모든 과정이 완료되면 최종 정산됩니다.
          </p>
        </div>

        <div style={{ height: 160 }} />
      </div>

      <div className="pay-btn-area">
        {error && <p className="pay-error" style={{ margin: '0 0 10px', textAlign: 'center' }}>{error}</p>}
        <button className="pay-btn" onClick={handlePay} disabled={loading}>
          {`${total.toLocaleString()} CARE 결제하기`}
        </button>
      </div>

      {loading && (
        <div className="pay-loading-overlay">
          <div className="pay-loading-spinner" />
          <p className="pay-loading-text">결제 중입니다...</p>
          <p className="pay-loading-sub">잠시만 기다려주세요</p>
        </div>
      )}

      <BottomNav />

      {showChargeModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}
          onClick={() => setShowChargeModal(false)}
        >
          <div
            style={{ background: 'white', borderRadius: 20, padding: '32px 24px', width: '100%', maxWidth: 360, textAlign: 'center' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>💰</div>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px', color: '#111' }}>보유 토큰이 부족합니다</h2>
            <p style={{ fontSize: 14, color: '#888', margin: '0 0 24px', lineHeight: 1.6 }}>
              결제에 필요한 토큰이 부족해요.<br/>충전 후 다시 시도해주세요.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowChargeModal(false)}
                style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: '1.5px solid #eee', background: 'white', color: '#888', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={() => navigate('/wallet/charge', { state: { returnTo: '/payment', returnState: state } })}
                style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', background: '#F7A633', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              >
                충전하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function dow(dateStr) {
  if (!dateStr) return ''
  try {
    return ['일','월','화','수','목','금','토'][new Date(dateStr).getDay()]
  } catch { return '' }
}
