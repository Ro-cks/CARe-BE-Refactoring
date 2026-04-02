import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ConfirmModal from '../../components/ConfirmModal'
import DisputeService from '../../services/DisputeService'
import { shortId } from '../../utils/formatId'
import { parseReason } from '../../utils/parseReason'
import './DisputePage.css'

const formatDate = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default function DisputePage() {
  const { t } = useTranslation()
  const { id }      = useParams()
  const navigate    = useNavigate()
  const [dispute,        setDispute]        = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [actionLoading,  setActionLoading]  = useState(false)
  const [isResolveModal, setIsResolveModal] = useState(false)
  const [isRejectModal,  setIsRejectModal]  = useState(false)

  const CAR_PART_LABEL = {
    front:    t('dispute.partFront'),
    rear:     t('dispute.partRear'),
    back:     t('dispute.partRear'),
    left:     t('dispute.partLeft'),
    right:    t('dispute.partRight'),
    roof:     t('dispute.partRoof'),
    interior: t('dispute.partInterior'),
  }
  const carPartLabel = (part) => CAR_PART_LABEL[part?.toLowerCase()] ?? part ?? '-'

  // API 실패 시 폴백
  const MOCK = {
    disputeId:            id,
    reservationId:        '-',
    claimAmount:          350000,
    status:               'OPEN',
    createdAt:            '2026-03-26T10:30:00Z',
    reason:               '',
    defenseLogId:         null,
    defenseOriginalS3Url: null,
    defenseCropS3Url:     null,
  }

  useEffect(() => { fetchDetail() }, [id])

  const fetchDetail = async () => {
    setLoading(true)
    try {
      const result = await DisputeService.getDisputeDetail(id)
      setDispute(result.success && result.data ? result.data : MOCK)
    } catch {
      setDispute(MOCK)
    } finally {
      setLoading(false)
    }
  }

  /* 불인정 - 전액 청구 */
  const handleResolve = async () => {
    setActionLoading(true)
    try {
      const result = await DisputeService.resolveDispute(id, {
        finalAmount: dispute.claimAmount,
        status: 'COMPLETED',
      })
      if (result.success) navigate('/disputes')
      else alert(result.message || t('dispute.errorSettlement'))
    } catch {
      alert(t('dispute.errorSettlementGeneral'))
    } finally {
      setActionLoading(false)
      setIsResolveModal(false)
    }
  }

  /* 무과실 인정 - 청구 취소 */
  const handleReject = async () => {
    setActionLoading(true)
    try {
      const result = await DisputeService.rejectDispute(id, '')
      if (result.success) navigate('/disputes')
      else alert(result.message || t('dispute.errorProcess'))
    } catch {
      alert(t('dispute.errorProcessGeneral'))
    } finally {
      setActionLoading(false)
      setIsRejectModal(false)
    }
  }

  if (loading || !dispute) return (
    <div className="dp-page">
      <div className="dp-center">
        <div className="dp-spinner" />
        <span>{t('dispute.loading')}</span>
      </div>
    </div>
  )

  const isCompleted    = dispute.status === 'COMPLETED' || dispute.status === 'RESOLVED'
  const hasDefense     = !!dispute.defenseLogId

  const timeline = [
    { date: formatDate(dispute.createdAt), action: t('dispute.timelineReceived'), user: t('dispute.timelineCompany') },
    ...(hasDefense
      ? [{ date: formatDate(dispute.createdAt), action: t('dispute.timelineDefense'), user: t('dispute.timelineRenter') }]
      : []),
    isCompleted
      ? { date: '-', action: t('dispute.timelineCompleted'), user: t('dispute.timelineCompany') }
      : { date: t('dispute.timelineInProgress'), action: t('dispute.timelinePending'), user: '-' },
  ]

  return (
    <div className="dp-page">

      {/* 헤더 카드 */}
      <div className="dp-header-card">
        <button className="dp-back-btn" onClick={() => navigate(-1)}>{t('dispute.back')}</button>
        <div className="dp-header-info">
          <div className="dp-header-meta">{t('dispute.breadcrumb')} {shortId(dispute.reservationId)}</div>
          <h1 className="dp-title">{shortId(dispute.disputeId)}</h1>
          {dispute.targetCarPart && (
            <div className="dp-part-row">
              <span className="dp-part-badge">{t('dispute.damagePartBadge')}</span>
              <span className="dp-part-value">{carPartLabel(dispute.targetCarPart)}</span>
            </div>
          )}
        </div>
        <span className={`dp-status-mega ${isCompleted ? 'completed' : 'open'}`}>
          {isCompleted ? t('dispute.statusCompleted') : t('dispute.statusPending')}
        </span>
      </div>

      {/* 본문 그리드 */}
      <div className="dp-grid">

        {/* 왼쪽 */}
        <div className="dp-main-col">

          {/* 손상 부위 이미지 / 이미지 비교 */}
          {(dispute.targetCropS3Url || dispute.targetOriginalS3Url || hasDefense) && (
            <div className="dp-card dp-scratch-card">
              <h2 className="dp-card-title">{t('dispute.imageCompareTitle')}</h2>
              <div className="dp-compare-grid">

                {/* AFTER: 업체 신고 */}
                <div className="dp-compare-col">
                  <div className="dp-compare-col-header after">
                    <span className="dp-compare-badge after">{t('dispute.after')}</span>
                    <div className="dp-compare-meta">
                      <span className="dp-compare-who company">{t('dispute.companyReport')}</span>
                      <span className="dp-compare-date">{formatDate(dispute.createdAt)}</span>
                    </div>
                  </div>
                  <div className="dp-compare-imgs">
                    {dispute.targetCropS3Url && (
                      <div className="dp-scratch-img-wrap">
                        <div className="dp-scratch-img-label">{t('dispute.closeUp')}</div>
                        <img src={dispute.targetCropS3Url} alt={t('dispute.closeUp')} className="dp-scratch-img" />
                      </div>
                    )}
                    {dispute.targetOriginalS3Url && (
                      <div className="dp-scratch-img-wrap">
                        <div className="dp-scratch-img-label">{t('dispute.fullPhoto')}</div>
                        <img src={dispute.targetOriginalS3Url} alt={t('dispute.fullPhoto')} className="dp-scratch-img" />
                      </div>
                    )}
                  </div>
                </div>

                {/* 중간 화살표 */}
                <div className="dp-compare-arrow">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="#b0a898" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                {/* BEFORE: 렌터 제출 */}
                <div className="dp-compare-col">
                  <div className="dp-compare-col-header before">
                    <span className="dp-compare-badge before">{t('dispute.before')}</span>
                    <div className="dp-compare-meta">
                      <span className="dp-compare-who renter">{t('dispute.renterSubmit')}</span>
                      {hasDefense && <span className="dp-compare-date">{formatDate(dispute.updatedAt)}</span>}
                    </div>
                  </div>
                  <div className="dp-compare-imgs">
                    {hasDefense && dispute.defenseCropS3Url && (
                      <div className="dp-scratch-img-wrap">
                        <div className="dp-scratch-img-label">{t('dispute.closeUp')}</div>
                        <img src={dispute.defenseCropS3Url} alt={t('dispute.closeUp')} className="dp-scratch-img" />
                      </div>
                    )}
                    {hasDefense && dispute.defenseOriginalS3Url && (
                      <div className="dp-scratch-img-wrap">
                        <div className="dp-scratch-img-label">{t('dispute.fullPhoto')}</div>
                        <img src={dispute.defenseOriginalS3Url} alt={t('dispute.fullPhoto')} className="dp-scratch-img" />
                      </div>
                    )}
                    {!hasDefense && (
                      <div className="dp-compare-empty">
                        <span>{'\ud83d\udced'}</span>
                        <p>{t('dispute.noImages')}</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* 분쟁 상세 */}
          <div className="dp-card">
            <div className="dp-card-header">
              <h2 className="dp-card-title">{t('dispute.detailTitle')}</h2>
              <button
                className="dp-btn-outline"
                onClick={() => navigate(`/ai-report/${dispute.reservationId}`)}
              >
                {t('dispute.aiReportBtn')}
              </button>
            </div>
            <div className="dp-reason-box">
              {parseReason(dispute.reason, t) || t('dispute.noContent')}
            </div>
          </div>

          {/* 렌터 이의 제기 */}
          {hasDefense && (
            <div className="dp-card dp-action-card">
              <h2 className="dp-card-title dp-text-red">{t('dispute.defenseTitle')}</h2>
              <p className="dp-desc">
                {t('dispute.defenseDesc')}
              </p>
              {!isCompleted && (
                <div className="dp-action-row">
                  <button
                    className="dp-btn-danger"
                    onClick={() => setIsRejectModal(true)}
                    disabled={actionLoading}
                  >
                    {t('dispute.acceptDefenseBtn')}
                  </button>
                  <button
                    className="dp-btn-primary"
                    onClick={() => setIsResolveModal(true)}
                    disabled={actionLoading}
                  >
                    {t('dispute.rejectDefenseBtn')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 이의 없는 경우 처리 버튼 */}
          {!hasDefense && !isCompleted && (
            <div className="dp-card">
              <h2 className="dp-card-title">{t('dispute.processTitle')}</h2>
              <p className="dp-desc">{t('dispute.processDesc')}</p>
              <div className="dp-action-row">
                <button
                  className="dp-btn-danger"
                  onClick={() => setIsRejectModal(true)}
                  disabled={actionLoading}
                >
                  {t('dispute.cancelChargeBtn')}
                </button>
                <button
                  className="dp-btn-primary"
                  onClick={() => setIsResolveModal(true)}
                  disabled={actionLoading}
                >
                  {t('dispute.proceedChargeBtn')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 오른쪽 */}
        <div className="dp-side-col">

          {/* 타임라인 */}
          <div className="dp-card">
            <h2 className="dp-card-title">{t('dispute.timelineTitle')}</h2>
            <div className="dp-timeline">
              {timeline.map((item, idx) => (
                <div key={idx} className="dp-tl-item">
                  <div className="dp-tl-track">
                    <div className={`dp-tl-dot ${idx === 0 ? 'first' : ''}`} />
                    {idx < timeline.length - 1 && <div className="dp-tl-line" />}
                  </div>
                  <div className="dp-tl-content">
                    <div className="dp-tl-action">{item.action}</div>
                    <div className="dp-tl-meta">{item.date} · {item.user}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 분쟁 정보 요약 */}
          <div className="dp-card">
            <h2 className="dp-card-title">{t('dispute.infoTitle')}</h2>
            <div className="dp-info-list">
              <div className="dp-info-row">
                <span className="dp-info-label">{t('dispute.infoDisputeId')}</span>
                <span className="dp-info-value dp-mono">{shortId(dispute.disputeId)}</span>
              </div>
              <div className="dp-info-row">
                <span className="dp-info-label">{t('dispute.infoReservationId')}</span>
                <span className="dp-info-value dp-mono">{shortId(dispute.reservationId)}</span>
              </div>
              <div className="dp-info-row">
                <span className="dp-info-label">{t('dispute.infoAmount')}</span>
                <span className="dp-info-value" style={{ color: '#D0021B', fontWeight: 800 }}>
                  {(dispute.claimAmount || 0).toLocaleString()} CARE
                </span>
              </div>
              <div className="dp-info-row">
                <span className="dp-info-label">{t('dispute.infoDate')}</span>
                <span className="dp-info-value">{formatDate(dispute.createdAt)}</span>
              </div>
              <div className="dp-info-row">
                <span className="dp-info-label">{t('dispute.infoStatus')}</span>
                <span className={`dp-inline-badge ${isCompleted ? 'completed' : 'open'}`}>
                  {isCompleted ? t('dispute.statusDone') : t('dispute.statusWaiting')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isResolveModal}
        onClose={() => setIsResolveModal(false)}
        onConfirm={handleResolve}
        title={t('dispute.forceChargeTitle')}
        message={`${(dispute.claimAmount || 0).toLocaleString()} CARE`}
        confirmText={actionLoading ? t('dispute.forceChargeLoading') : t('dispute.forceChargeConfirm')}
      />

      <ConfirmModal
        isOpen={isRejectModal}
        onClose={() => setIsRejectModal(false)}
        onConfirm={handleReject}
        title={t('dispute.cancelChargeTitle')}
        message={t('dispute.cancelChargeMsg')}
        confirmText={actionLoading ? t('dispute.forceChargeLoading') : t('dispute.forceChargeConfirm')}
        confirmButtonStyle="danger"
      />
    </div>
  )
}
