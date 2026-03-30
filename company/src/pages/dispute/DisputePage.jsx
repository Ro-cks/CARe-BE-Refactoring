import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ConfirmModal from '../../components/ConfirmModal'
import DisputeService from '../../services/DisputeService'
import { shortId } from '../../utils/formatId'
import './DisputePage.css'

const CAR_PART_LABEL = {
  front:    '전면',
  rear:     '후면',
  back:     '후면',
  left:     '좌측',
  right:    '우측',
  roof:     '지붕',
  interior: '내부',
}
const carPartLabel = (part) => CAR_PART_LABEL[part?.toLowerCase()] ?? part ?? '-'

const formatDate = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default function DisputePage() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const [dispute,        setDispute]        = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [actionLoading,  setActionLoading]  = useState(false)
  const [isResolveModal, setIsResolveModal] = useState(false)
  const [isRejectModal,  setIsRejectModal]  = useState(false)

  // API 실패 시 폴백
  const MOCK = {
    disputeId:            id,
    reservationId:        '-',
    claimAmount:          350000,
    status:               'OPEN',
    createdAt:            '2026-03-26T10:30:00Z',
    reason:               '고객 반납 후 차량 우측 범퍼 하단에 심각한 긁힘 및 도장 벗겨짐이 발견되었습니다.',
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

  /* 불인정 — 전액 청구 */
  const handleResolve = async () => {
    setActionLoading(true)
    try {
      const result = await DisputeService.resolveDispute(id, {
        finalAmount: dispute.claimAmount,
        status: 'COMPLETED',
      })
      if (result.success) navigate('/disputes')
      else alert(result.message || '정산 처리에 실패했습니다.')
    } catch {
      alert('정산 처리 중 오류가 발생했습니다.')
    } finally {
      setActionLoading(false)
      setIsResolveModal(false)
    }
  }

  /* 무과실 인정 — 청구 취소 */
  const handleReject = async () => {
    setActionLoading(true)
    try {
      const result = await DisputeService.rejectDispute(id, '')
      if (result.success) navigate('/disputes')
      else alert(result.message || '처리에 실패했습니다.')
    } catch {
      alert('처리 중 오류가 발생했습니다.')
    } finally {
      setActionLoading(false)
      setIsRejectModal(false)
    }
  }

  if (loading || !dispute) return (
    <div className="dp-page">
      <div className="dp-center">
        <div className="dp-spinner" />
        <span>분쟁 정보를 불러오는 중...</span>
      </div>
    </div>
  )

  const isCompleted    = dispute.status === 'COMPLETED' || dispute.status === 'RESOLVED'
  const hasDefense     = !!dispute.defenseLogId
  const defenseImages  = [dispute.defenseOriginalS3Url, dispute.defenseCropS3Url].filter(Boolean)

  const timeline = [
    { date: formatDate(dispute.createdAt), action: '분쟁 접수', user: '업체' },
    ...(hasDefense
      ? [{ date: formatDate(dispute.createdAt), action: '렌터 이의 제기 수신', user: '렌터' }]
      : []),
    isCompleted
      ? { date: '-', action: '분쟁 처리 완료', user: '업체' }
      : { date: '진행 중', action: '업체 확인 대기', user: '-' },
  ]

  return (
    <div className="dp-page">

      {/* ── 헤더 카드 ── */}
      <div className="dp-header-card">
        <button className="dp-back-btn" onClick={() => navigate(-1)}>← 뒤로</button>
        <div className="dp-header-info">
          <div className="dp-header-meta">분쟁 관리 · 예약 {shortId(dispute.reservationId)}</div>
          <h1 className="dp-title">분쟁 {shortId(dispute.disputeId)}</h1>
          {dispute.targetCarPart && (
            <div className="dp-part-row">
              <span className="dp-part-badge">📍 손상 부위</span>
              <span className="dp-part-value">{carPartLabel(dispute.targetCarPart)}</span>
            </div>
          )}
        </div>
        <span className={`dp-status-mega ${isCompleted ? 'completed' : 'open'}`}>
          {isCompleted ? '✓ 처리 완료' : '⏳ 처리 대기중'}
        </span>
      </div>

      {/* ── 본문 그리드 ── */}
      <div className="dp-grid">

        {/* ── 왼쪽 ── */}
        <div className="dp-main-col">

          {/* 손상 부위 이미지 / 이미지 비교 */}
          {(dispute.targetCropS3Url || dispute.targetOriginalS3Url || hasDefense) && (
            <div className="dp-card dp-scratch-card">
              <h2 className="dp-card-title">이미지 비교</h2>
              <div className="dp-compare-grid">

                {/* 왼쪽: 업체 신고 이미지 */}
                <div className="dp-compare-col">
                  <div className="dp-compare-header">
                    <span className="dp-compare-who company">업체 신고</span>
                    <span className="dp-compare-date">{formatDate(dispute.createdAt)}</span>
                  </div>
                  {dispute.targetCropS3Url && (
                    <div className="dp-scratch-img-wrap">
                      <div className="dp-scratch-img-label">클로즈업</div>
                      <img src={dispute.targetCropS3Url} alt="손상 클로즈업" className="dp-scratch-img" />
                    </div>
                  )}
                  {dispute.targetOriginalS3Url && (
                    <div className="dp-scratch-img-wrap">
                      <div className="dp-scratch-img-label">전체화면</div>
                      <img src={dispute.targetOriginalS3Url} alt="손상 전체 사진" className="dp-scratch-img" />
                    </div>
                  )}
                </div>

                {/* 오른쪽: 렌터 제출 증거 */}
                <div className="dp-compare-col">
                  <div className="dp-compare-header">
                    <span className="dp-compare-who renter">렌터 제출</span>
                    {hasDefense && <span className="dp-compare-date">{formatDate(dispute.updatedAt)}</span>}
                  </div>
                  {hasDefense && dispute.defenseCropS3Url && (
                    <div className="dp-scratch-img-wrap">
                      <div className="dp-scratch-img-label">클로즈업</div>
                      <img src={dispute.defenseCropS3Url} alt="증거 클로즈업" className="dp-scratch-img" />
                    </div>
                  )}
                  {hasDefense && dispute.defenseOriginalS3Url && (
                    <div className="dp-scratch-img-wrap">
                      <div className="dp-scratch-img-label">전체화면</div>
                      <img src={dispute.defenseOriginalS3Url} alt="증거 전체 사진" className="dp-scratch-img" />
                    </div>
                  )}
                  {!hasDefense && (
                    <div className="dp-compare-empty">
                      <span>📭</span>
                      <p>현재는 제출한 이미지가 없습니다.</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* 분쟁 상세 */}
          <div className="dp-card">
            <div className="dp-card-header">
              <h2 className="dp-card-title">분쟁 상세 내용</h2>
              <button
                className="dp-btn-outline"
                onClick={() => navigate(`/ai-report/${dispute.reservationId}`)}
              >
                🤖 AI 리포트 보기
              </button>
            </div>
            <div className="dp-reason-box">
              {dispute.reason || '입력된 상세 내용이 없습니다.'}
            </div>
          </div>

          {/* 렌터 이의 제기 */}
          {hasDefense && (
            <div className="dp-card dp-action-card">
              <h2 className="dp-card-title dp-text-red">🚨 렌터 이의 제기 수신</h2>
              <p className="dp-desc">
                렌터가 본인의 과실이 아님을 증명하는 반납 전 이미지를 제출했습니다.
                위 이미지를 확인하고 정산 진행 여부를 결정하세요.
              </p>
              {!isCompleted && (
                <div className="dp-action-row">
                  <button
                    className="dp-btn-danger"
                    onClick={() => setIsRejectModal(true)}
                    disabled={actionLoading}
                  >
                    렌터 무과실 인정 (청구 취소)
                  </button>
                  <button
                    className="dp-btn-primary"
                    onClick={() => setIsResolveModal(true)}
                    disabled={actionLoading}
                  >
                    불인정 (강제 청구 진행)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 이의 없는 경우 처리 버튼 */}
          {!hasDefense && !isCompleted && (
            <div className="dp-card">
              <h2 className="dp-card-title">분쟁 처리</h2>
              <p className="dp-desc">렌터의 이의 제기가 없습니다. 분쟁 처리 방향을 선택하세요.</p>
              <div className="dp-action-row">
                <button
                  className="dp-btn-danger"
                  onClick={() => setIsRejectModal(true)}
                  disabled={actionLoading}
                >
                  청구 취소
                </button>
                <button
                  className="dp-btn-primary"
                  onClick={() => setIsResolveModal(true)}
                  disabled={actionLoading}
                >
                  청구 진행
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── 오른쪽 ── */}
        <div className="dp-side-col">

          {/* 타임라인 */}
          <div className="dp-card">
            <h2 className="dp-card-title">진행 타임라인</h2>
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
            <h2 className="dp-card-title">분쟁 정보</h2>
            <div className="dp-info-list">
              <div className="dp-info-row">
                <span className="dp-info-label">분쟁 ID</span>
                <span className="dp-info-value dp-mono">{shortId(dispute.disputeId)}</span>
              </div>
              <div className="dp-info-row">
                <span className="dp-info-label">예약 ID</span>
                <span className="dp-info-value dp-mono">{shortId(dispute.reservationId)}</span>
              </div>
              <div className="dp-info-row">
                <span className="dp-info-label">청구 금액</span>
                <span className="dp-info-value" style={{ color: '#D0021B', fontWeight: 800 }}>
                  {(dispute.claimAmount || 0).toLocaleString()} CARE
                </span>
              </div>
              <div className="dp-info-row">
                <span className="dp-info-label">접수일</span>
                <span className="dp-info-value">{formatDate(dispute.createdAt)}</span>
              </div>
              <div className="dp-info-row">
                <span className="dp-info-label">상태</span>
                <span className={`dp-inline-badge ${isCompleted ? 'completed' : 'open'}`}>
                  {isCompleted ? '처리 완료' : '처리 대기'}
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
        title="강제 청구 진행"
        message={`렌터의 이의를 인정하지 않고 청구금액 ${(dispute.claimAmount || 0).toLocaleString()} CARE를 청구합니다.`}
        confirmText={actionLoading ? '처리 중...' : '확인'}
      />

      <ConfirmModal
        isOpen={isRejectModal}
        onClose={() => setIsRejectModal(false)}
        onConfirm={handleReject}
        title="청구 취소"
        message="렌터의 무과실을 인정하고 청구를 취소합니다."
        confirmText={actionLoading ? '처리 중...' : '확인'}
        confirmButtonStyle="danger"
      />
    </div>
  )
}
