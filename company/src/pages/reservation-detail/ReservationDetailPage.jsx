import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReservationService from '../../services/ReservationService'
import { shortId } from '../../utils/formatId'
import './ReservationDetailPage.css'

const STATUS_MAP = {
  RESERVED:   { label: '예약완료', cls: 'reserved' },
  IN_USE:     { label: '이용중',   cls: 'in-use'   },
  AFTER_SCAN: { label: '반납대기', cls: 'after-scan'},
  COMPLETED:  { label: '반납완료', cls: 'completed' },
  DISPUTE:    { label: '분쟁중',   cls: 'dispute'  },
}

const formatDate = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default function ReservationDetailPage() {
  const navigate  = useNavigate()
  const { id }    = useParams()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => { fetchDetail() }, [id])

  const fetchDetail = async () => {
    setLoading(true)
    setError('')
    const result = await ReservationService.getReservationDetail(id)
    if (!result.success) {
      setError(result.message)
      setLoading(false)
      return
    }
    const r = result.data
    const isDispute  = r.depositStatus === 'LOCKED'
    const pickupDone = ['IN_USE', 'AFTER_SCAN', 'COMPLETED'].includes(r.status) || isDispute
    const returnDone = r.status === 'COMPLETED' || isDispute
    setData({
      reservationId: r.reservationId,
      status:        r.status,
      depositStatus: r.depositStatus,
      disputeId:     r.disputeId || null,
      carName:       `${r.car?.brand || ''} ${r.car?.modelName || ''}`.trim() || '-',
      plateNumber:   r.car?.plateNumber || '-',
      pickupDate:    formatDate(r.pickupDate),
      returnDate:    formatDate(r.returnDate),
      pickupDone,
      returnDone,
      renterName:    r.renter?.name  || '-',
      renterEmail:   r.renter?.email || '-',
      insurancePrice: r.insurance?.price ?? null,
      insuranceName:  r.insurance?.name  || '-',
      totalPrice:     r.totalPrice ?? null,
      isDispute,
    })
    setLoading(false)
  }

  if (loading) return (
    <div className="rdp-page">
      <div className="rdp-center">
        <div className="rdp-spinner" />
        <span>예약 정보를 불러오는 중...</span>
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="rdp-page">
      <div className="rdp-center">
        <span className="rdp-error-icon">⚠️</span>
        <span>{error || '예약 정보를 불러오지 못했습니다.'}</span>
      </div>
    </div>
  )

  const statusInfo = STATUS_MAP[data.status] || { label: data.status, cls: '' }

  return (
    <div className="rdp-page">

      {/* ── 헤더 카드 ── */}
      <div className="rdp-header-card">
        <button className="rdp-back-btn" onClick={() => navigate(-1)}>← 뒤로</button>
        <div className="rdp-header-info">
          <div className="rdp-header-meta">예약 관리 · {shortId(data.reservationId)}</div>
          <h1 className="rdp-car-title">{data.carName}</h1>
        </div>
        <span className={`rdp-status-badge ${statusInfo.cls}`}>{statusInfo.label}</span>
      </div>

      {/* ── 본문 그리드 ── */}
      <div className="rdp-grid">

        {/* ── 왼쪽 컬럼 ── */}
        <div className="rdp-main-col">

          {/* 차량 정보 */}
          <div className="rdp-card">
            <h2 className="rdp-card-title">🚗 차량 정보</h2>
            <div className="rdp-info-list">
              <div className="rdp-info-row">
                <span className="rdp-info-label">차량명</span>
                <span className="rdp-info-value">{data.carName}</span>
              </div>
              <div className="rdp-info-row">
                <span className="rdp-info-label">차량번호</span>
                <span className="rdp-info-value rdp-mono">{data.plateNumber}</span>
              </div>
            </div>
          </div>

          {/* 대여 일정 */}
          <div className="rdp-card">
            <h2 className="rdp-card-title">📅 대여 일정</h2>
            <div className="rdp-schedule-row">
              <div className="rdp-schedule-item rdp-pickup">
                <div className="rdp-schedule-dot" />
                <div>
                  <div className="rdp-schedule-label">픽업</div>
                  <div className="rdp-schedule-date">{data.pickupDate}</div>
                </div>
              </div>
              <div className="rdp-schedule-arrow">→</div>
              <div className="rdp-schedule-item rdp-return">
                <div className="rdp-schedule-dot" />
                <div>
                  <div className="rdp-schedule-label">반납</div>
                  <div className="rdp-schedule-date">{data.returnDate}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 이용 상태 */}
          <div className="rdp-card">
            <h2 className="rdp-card-title">📋 이용 상태</h2>
            <div className="rdp-status-boxes">
              <div className={`rdp-status-box ${data.pickupDone ? 'done' : 'pending'}`}>
                <div className="rdp-status-box-top">
                  <span className="rdp-check-icon">{data.pickupDone ? '✓' : '○'}</span>
                  <span className="rdp-status-box-label">픽업 확인</span>
                </div>
                <div className="rdp-status-box-date">
                  {data.pickupDone ? data.pickupDate : '미완료'}
                </div>
              </div>
              <div className={`rdp-status-box ${data.returnDone ? 'done' : 'pending'}`}>
                <div className="rdp-status-box-top">
                  <span className="rdp-check-icon">{data.returnDone ? '✓' : '○'}</span>
                  <span className="rdp-status-box-label">반납 확인</span>
                </div>
                <div className="rdp-status-box-date">
                  {data.returnDone ? data.returnDate : '미완료'}
                </div>
              </div>
            </div>

            {data.isDispute && (
              <div className="rdp-dispute-alert">
                ⚠️ 이 예약은 현재 분쟁이 접수된 상태입니다.
              </div>
            )}

            <div className="rdp-action-row">
              {data.isDispute && (
                <button className="rdp-btn-dispute" onClick={() => navigate(`/disputes/${data.disputeId}`)}>
                  분쟁 정보 확인하기
                </button>
              )}
              <button
                className="rdp-btn-ai"
                onClick={() => navigate(`/ai-report/${id}`)}
              >
                AI 반납 리포트
              </button>
            </div>
          </div>
        </div>

        {/* ── 오른쪽 컬럼 ── */}
        <div className="rdp-side-col">

          {/* 대여자 정보 */}
          <div className="rdp-card">
            <h2 className="rdp-card-title">👤 대여자 정보</h2>
            <div className="rdp-info-list">
              <div className="rdp-info-row">
                <span className="rdp-info-label">이름</span>
                <span className="rdp-info-value">{data.renterName}</span>
              </div>
              <div className="rdp-info-row">
                <span className="rdp-info-label">이메일</span>
                <span className="rdp-info-value rdp-email">{data.renterEmail}</span>
              </div>
              <div className="rdp-info-row">
                <span className="rdp-info-label">보험</span>
                <span className="rdp-info-value">{data.insuranceName}</span>
              </div>
            </div>
          </div>

          {/* 결제 정보 */}
          <div className="rdp-card">
            <h2 className="rdp-card-title">💳 결제 정보</h2>
            <div className="rdp-payment-list">
              <div className="rdp-payment-row">
                <span className="rdp-payment-label">보험료</span>
                <span className="rdp-payment-value">
                  {data.insurancePrice !== null ? `${data.insurancePrice.toLocaleString()} CARE` : '-'}
                </span>
              </div>
              <div className="rdp-payment-divider" />
              <div className="rdp-payment-row rdp-total-row">
                <span className="rdp-payment-label">총 결제 금액</span>
                <span className="rdp-payment-total">
                  {data.totalPrice !== null ? `${data.totalPrice.toLocaleString()} CARE` : '-'}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
