import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import careLogo from '../../assets/care_logo.png'
import { getDisputeDetail, settleDispute } from '../../api/reservation'
import './DisputePage.css'

const LOCATION_LABELS = {
  FRONT: '전면부', front: '전면부',
  REAR: '후면부',  rear: '후면부',
  LEFT: '좌측',   left: '좌측',
  RIGHT: '우측',  right: '우측',
  ROOF: '루프',
  HOOD: '보닛',
}

const STATUS_LABELS = {
  OPEN: '분쟁 신청됨',
  COMPLETED: '완료됨',
  REJECTED: '기각됨',
}

function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function DisputePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { state } = useLocation()
  const reservation = state?.reservation
  const disputeId = state?.disputeId

  const [dispute, setDispute] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [settling, setSettling] = useState(false)
  const [settledResult, setSettledResult] = useState(null) // 정산 완료 결과

  useEffect(() => {
    const reservationId = reservation?.reservationId
    if (!reservationId || !disputeId) return

    setLoading(true)
    getDisputeDetail(reservationId, disputeId)
      .then((data) => {
        setDispute(data)
        setError(null)
      })
      .catch((err) => {
        console.error('분쟁 상세 조회 실패:', err)
        setError('분쟁 정보를 불러오지 못했어요.')
      })
      .finally(() => setLoading(false))
  }, [reservation?.reservationId, disputeId])

  // scratchZone은 dispute.targetCarPart에서 직접 가져옴 (별도 API 불필요)
  const scratchZone = dispute?.targetCarPart || null

  const handleSettle = async () => {
    if (!dispute?.disputeId) {
      alert('분쟁 정보가 없어서 정산 동의를 진행할 수 없어요.')
      return
    }

    const finalAmount = dispute.settlementFinalAmount ?? dispute.claimAmount ?? 0
    const settlementStatus = dispute.settlementStatus ?? 'COMPLETED'

    setSettling(true)
    try {
      const result = await settleDispute(dispute.disputeId, finalAmount, settlementStatus)

      if (reservation?.reservationId) {
        localStorage.removeItem(`disputePending_${reservation.reservationId}`)
        localStorage.removeItem(`disputeDate_${reservation.reservationId}`)
      }

      setSettledResult({
        status: result?.status,
        finalAmount,
        isRefunded: result?.status === 'REFUNDED' || settlementStatus === 'REFUNDED',
      })
    } catch (settleError) {
      console.error('분쟁 정산 동의 실패:', settleError)
      alert(settleError?.response?.data?.message || '정산 동의 처리에 실패했어요.')
    } finally {
      setSettling(false)
    }
  }

  const handleDispute = () => {
    navigate('/dispute-scratch-logs', { state: { reservation, disputeId } })
  }

  // 업체가 무과실 인정 제안한 상태 (아직 renter가 동의 안 한 경우)
  const isNoFaultOffered = !!(
    dispute?.companySettlementAgreed &&
    !dispute?.renterSettlementAgreed &&
    (dispute?.settlementStatus === 'REFUNDED' || dispute?.settlementFinalAmount === 0)
  )

  // 이미 완료된 분쟁이거나 방금 정산 동의한 경우 → 완료 화면
  const isSettled = settledResult || ['COMPLETED', 'RESOLVED', 'REFUNDED'].includes(dispute?.status)
  const isRefunded = settledResult?.isRefunded || dispute?.settlementStatus === 'REFUNDED'
  const resolvedAmount = settledResult?.finalAmount ?? dispute?.settlementFinalAmount ?? dispute?.claimAmount ?? 0

  if (isSettled) {
    return (
      <div className="dp-page">
        <header className="dp-header">
          <button className="dp-back" onClick={() => navigate(-1)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <img src={careLogo} alt="CARe" className="dp-logo" />
          <div style={{ width: 38 }} />
        </header>

        <div className="dp-settled-wrap">
          <div className="dp-settled-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" fill="#4CAF50"/>
              <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="dp-settled-title">정산이 완료되었습니다</h2>
          <p className="dp-settled-sub">
            {isRefunded ? '업체에서 무과실을 인정하였습니다.' : '분쟁이 정산 처리되었습니다.'}
          </p>

          <div className="dp-settled-card">
            <div className="dp-settled-row">
              <span className="dp-settled-label">최종 정산 금액</span>
              <span className="dp-settled-amount" style={{ color: isRefunded ? '#4CAF50' : '#E84040' }}>
                {isRefunded ? '0 CARE' : `${resolvedAmount?.toLocaleString() ?? '--'} CARE`}
              </span>
            </div>
            {dispute?.reason && (
              <div className="dp-settled-row">
                <span className="dp-settled-label">분쟁 사유</span>
                <span className="dp-settled-val">{dispute.reason}</span>
              </div>
            )}
          </div>

          <p className="dp-settled-notice">
            {isRefunded
              ? '보증금이 전액 환급됩니다.'
              : '정산 금액이 보증금에서 차감됩니다.'}
          </p>

          <div className="dp-settled-btns">
            <button className="dp-settled-btn-primary" onClick={() => navigate('/my-car')}>
              내 예약 보기
            </button>
            <button className="dp-settled-btn-secondary" onClick={() => navigate('/home')}>
              홈으로
            </button>
          </div>
        </div>
      </div>
    )
  }

  const locationLabel = scratchZone ? (LOCATION_LABELS[scratchZone] || scratchZone) : null

  return (
    <div className="dp-page">
      {/* 헤더 */}
      <header className="dp-header">
        <button className="dp-back" onClick={() => navigate(-1)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#111" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <img src={careLogo} alt="CARe" className="dp-logo" />
        <div style={{ width: 38 }} />
      </header>

      <div className="dp-scroll">
        {/* ① 이미지 섹션 — 최상단 */}
        <div className="dp-section">
          {dispute?.snapshotBeforeCropS3Url ? (
            <>
              <p className="dp-section-title">사진 비교</p>
              <div className="dp-compare-row">
                <div className="dp-compare-card">
                  <div className="dp-compare-img before">
                    <img src={dispute.snapshotBeforeCropS3Url} alt="픽업 전" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                  </div>
                  <p className="dp-compare-label">픽업 전</p>
                  {dispute?.snapshotCapturedAt && (
                    <p className="dp-compare-date">{formatDateTime(dispute.snapshotCapturedAt)}</p>
                  )}
                  <span className="dp-compare-tag normal">픽업 전 상태</span>
                </div>
                <div className="dp-compare-card">
                  <div className="dp-compare-img after">
                    {dispute?.snapshotAfterCropS3Url
                      ? <img src={dispute.snapshotAfterCropS3Url} alt="반납 후" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                      : <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="5" width="18" height="14" rx="2" stroke="#ccc" strokeWidth="1.5"/>
                          <circle cx="12" cy="12" r="3" stroke="#ccc" strokeWidth="1.5"/>
                          <circle cx="17.5" cy="7.5" r="1" fill="#ccc"/>
                        </svg>
                    }
                  </div>
                  <p className="dp-compare-label">반납 후</p>
                  {dispute?.createdAt && (
                    <p className="dp-compare-date">{formatDateTime(dispute.createdAt)}</p>
                  )}
                  <span className={`dp-compare-tag${dispute?.snapshotWarning ? ' attention' : ' normal'}`}>
                    {dispute?.snapshotWarning ? '주의 필요' : '유사도 정상'}
                  </span>
                </div>
              </div>
            </>
          ) : dispute?.snapshotAfterCropS3Url ? (
            <>
              <p className="dp-section-title">새 흠집 감지</p>
              <div className="dp-compare-img after" style={{ width: '100%', borderRadius: 12, overflow: 'hidden', aspectRatio: '4/3' }}>
                <img src={dispute.snapshotAfterCropS3Url} alt="반납 후" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </>
          ) : null}

          {/* 부위 표시 + 이력 딥링크 */}
          {locationLabel && (
            <div className="dp-zone-row">
              <span className="dp-zone-label">📍 {locationLabel}</span>
              <button
                className="dp-zone-btn"
                onClick={() => navigate('/damage-history', { state: { reservation, filterZone: scratchZone } })}
              >
                해당 부위 이력 보기 →
              </button>
            </div>
          )}
        </div>

        {/* ② 상태 배너 */}
        {isNoFaultOffered ? (
          <div className="dp-nofault-banner">
            <div className="dp-nofault-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.25)"/>
                <path d="M7 12.5l3.5 3.5 6.5-7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="dp-banner-text">
              <p className="dp-banner-title">업체에서 무과실을 인정했습니다</p>
              <p className="dp-banner-sub">아래 정산 동의 버튼으로 확인해주세요</p>
            </div>
          </div>
        ) : (!dispute || dispute.status === 'OPEN') && (
          <button className="dp-dispute-banner" onClick={handleDispute}>
            <div className="dp-banner-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4M12 17h.01" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                <path d="M12 2L2 20h20L12 2z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="dp-banner-text">
              <p className="dp-banner-title">{t('dispute.bannerTitle')}</p>
              <p className="dp-banner-sub">{t('dispute.bannerSub')}</p>
            </div>
          </button>
        )}

        {/* ③ 로딩 / 에러 */}
        {loading && (
          <div className="dp-desc-box">
            <p className="dp-desc-text">{t('dispute.loading')}</p>
          </div>
        )}
        {error && (
          <div className="dp-desc-box">
            <p className="dp-desc-text" style={{ color: '#FF4D4F' }}>{error}</p>
          </div>
        )}

        {/* ④ 분쟁 상세 정보 */}
        {dispute && !loading && (
          <div className="dp-section">
            <p className="dp-section-title">{t('dispute.sectionTitle')}</p>
            <div className="dp-info-list">
              <div className="dp-info-row">
                <span className="dp-info-label">{t('dispute.status')}</span>
                <span className="dp-info-value">{t(`dispute.status${dispute.status.charAt(0)+dispute.status.slice(1).toLowerCase()}`) || dispute.status}</span>
              </div>
              {locationLabel && (
                <div className="dp-info-row">
                  <span className="dp-info-label">손상 부위</span>
                  <span className="dp-info-value" style={{ color: '#E84040' }}>{locationLabel}</span>
                </div>
              )}
              {dispute.reason && (
                <div className="dp-info-row">
                  <span className="dp-info-label">{t('dispute.reason')}</span>
                  <span className="dp-info-value">{dispute.reason}</span>
                </div>
              )}
              {dispute.claimAmount != null && (
                <div className="dp-info-row">
                  <span className="dp-info-label">{t('dispute.claimAmount')}</span>
                  <span className="dp-info-value">{dispute.claimAmount.toLocaleString('ko-KR')} CARE</span>
                </div>
              )}
              {dispute.companySettlementAgreed && dispute.settlementFinalAmount != null && (
                <div className="dp-info-row">
                  <span className="dp-info-label">업체 제안 금액</span>
                  <span className="dp-info-value" style={{ color: '#1a7a45', fontWeight: 800 }}>
                    {isNoFaultOffered ? '무과실 인정 (0 CARE)' : `${dispute.settlementFinalAmount.toLocaleString('ko-KR')} CARE`}
                  </span>
                </div>
              )}
              {dispute.createdAt && (
                <div className="dp-info-row">
                  <span className="dp-info-label">{t('dispute.appliedAt')}</span>
                  <span className="dp-info-value">{formatDateTime(dispute.createdAt)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ⑤ 설명 텍스트 (무과실 인정 시 숨김) */}
        {dispute && !isNoFaultOffered && (
          <div className="dp-desc-box">
            <p className="dp-desc-text">
              새로운 흠집이 발견되었습니다.
              {dispute.status === 'OPEN' && (
                <><br/>소명하시려면 이의 신청 버튼을 눌러주세요.</>
              )}
            </p>
          </div>
        )}

        <div style={{ height: 160 }} />
      </div>

      {/* 하단 버튼 */}
      {isNoFaultOffered ? (
        <div className="dp-footer">
          <button className="dp-settle-btn dp-settle-btn--nofault" onClick={handleSettle} disabled={settling}>
            {settling ? (
              <span className="dp-settle-btn-inner"><span className="dp-spinner" />처리 중...</span>
            ) : '무과실 확인 및 정산 동의'}
          </button>
        </div>
      ) : (!dispute || dispute.status === 'OPEN') ? (
        <div className="dp-footer">
          <button className="dp-dispute-btn" onClick={handleDispute}>
            이의 신청하기
          </button>
          <button className="dp-settle-btn" onClick={handleSettle} disabled={settling}>
            {settling ? (
              <span className="dp-settle-btn-inner"><span className="dp-spinner" />처리 중...</span>
            ) : (
              dispute?.settlementFinalAmount != null ? '정산 동의' : '이의 없음'
            )}
          </button>
        </div>
      ) : (
        <div className="dp-footer dp-footer-resolved">
          <p className="dp-resolved-text">
            {['RESOLVED', 'COMPLETED'].includes(dispute.status) ? '완료된 분쟁입니다.' : '이의 신청이 접수되어 검토 중입니다.'}
          </p>
        </div>
      )}
    </div>
  )
}
