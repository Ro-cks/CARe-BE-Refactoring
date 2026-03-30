import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DisputeService from '../../services/DisputeService'
import ReservationService from '../../services/ReservationService'
import { carPartLabel } from '../../utils/formatId'
import carIconTop from '../../assets/car_icon_top.png'
import './AIReportPage.css'

const DEFAULT_THRESHOLD = 60

// 고정 6구역 (좌측/우측 제거) — 200×280 컨테이너 기준
const FIXED_ZONES = [
  { id: 'front',       label: '전면',   left: '50%', top: '14%' },
  { id: 'rear',        label: '후면',   left: '50%', top: '82%' },
  { id: 'front-left',  label: '좌전방', left: '22%', top: '28%' },
  { id: 'front-right', label: '우전방', left: '78%', top: '28%' },
  { id: 'rear-left',   label: '좌후방', left: '22%', top: '70%' },
  { id: 'rear-right',  label: '우후방', left: '78%', top: '70%' },
]

// carPart → 구역 매핑 (underscore 기준)
const CAR_PART_TO_ZONE = {
  front: 'front', front_bumper: 'front', hood: 'front',
  windshield: 'front', front_windshield: 'front', roof: 'front',
  rear: 'rear', rear_bumper: 'rear', trunk: 'rear',
  rear_windshield: 'rear', bottom: 'rear',
  left_side: 'front-left', left_door: 'front-left', left_mirror: 'front-left',
  right_side: 'front-right', right_door: 'front-right', right_mirror: 'front-right',
  front_left_fender: 'front-left', left_front_fender: 'front-left',
  front_left_door: 'front-left', front_left_wheel: 'front-left',
  front_right_fender: 'front-right', right_front_fender: 'front-right',
  front_right_door: 'front-right', front_right_wheel: 'front-right',
  rear_left_fender: 'rear-left', left_rear_fender: 'rear-left',
  rear_left_door: 'rear-left', rear_left_wheel: 'rear-left',
  rear_right_fender: 'rear-right', right_rear_fender: 'rear-right',
  rear_right_door: 'rear-right', rear_right_wheel: 'rear-right',
}

const ZONE_IDS = new Set(FIXED_ZONES.map((z) => z.id))

// carPart 문자열 → zone ID 변환 (hyphen/underscore 모두 지원)
const getZoneForCarPart = (carPart) => {
  if (!carPart) return null
  const lower = carPart.toLowerCase()
  if (CAR_PART_TO_ZONE[lower]) return CAR_PART_TO_ZONE[lower]
  // hyphen → underscore 정규화 후 재시도
  const underscored = lower.replace(/-/g, '_')
  if (CAR_PART_TO_ZONE[underscored]) return CAR_PART_TO_ZONE[underscored]
  // carPart 자체가 zone ID인 경우 (예: 'front-left')
  if (ZONE_IDS.has(lower)) return lower
  return null
}

const WARNING_THRESHOLD = 80

// 프론트엔드 기준 warning 판단 (유사도 80% 미만 또는 신규 흠집)
const isWarning = (item) =>
  item.isNewScratch || toPercent(item.similarity) < WARNING_THRESHOLD

const toPercent = (value) => {
  if (value == null) return 0
  return value <= 1 ? value * 100 : value
}

const formatDateTime = (value) => {
  if (!value) return '-'
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return value
  }
}

export default function AIReportPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reportData, setReportData] = useState(null)
  const [selectedAfterLogId, setSelectedAfterLogId] = useState(null)
  const [createReason, setCreateReason] = useState('')
  const [createAmount, setCreateAmount] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    fetchAiReport()
  }, [id])

  const fetchAiReport = async () => {
    setLoading(true)
    setError('')
    setCreateError('')

    const mode = 'reservation'
    const dispute = null
    const reservationId = id

    const reservationResult = await ReservationService.getReservationDetail(reservationId)

    if (!reservationResult.success || !reservationResult.data) {
      setError(reservationResult.message || '예약 정보를 불러오지 못했습니다.')
      setLoading(false)
      return
    }

    const reservation = reservationResult.data
    const carId = reservation?.car?.carId
    if (!carId) {
      setError('차량 식별 정보가 없어 AI 리포트를 생성할 수 없습니다.')
      setLoading(false)
      return
    }

    const returnReportResult = await ReservationService.getReturnReport(carId, reservationId)
    if (!returnReportResult.success || !returnReportResult.data) {
      setError(returnReportResult.message || '반납 리포트를 불러오지 못했습니다.')
      setLoading(false)
      return
    }

    const returnReport = returnReportResult.data
    const threshold = returnReport.similarityThreshold ?? DEFAULT_THRESHOLD

    const comparisons = Array.isArray(returnReport.comparisons) ? returnReport.comparisons : []

    const scratches = Array.isArray(returnReport.scratches) ? returnReport.scratches : []
    const afterScratchMap = new Map(
      scratches
        .filter((scratch) => scratch.logType === 'AFTER')
        .map((scratch) => [scratch.logId, scratch])
    )

    const warningCount = comparisons.filter(isWarning).length

    setReportData({
      dispute,
      mode,
      reservationId,
      reservation,
      threshold,
      scratches,
      comparisons,
      warningCount,
      beforeCount: 0,
      afterCount: 0,
      afterScratchMap
    })

    setSelectedAfterLogId(dispute?.targetLogId || comparisons[0]?.afterLogId || null)
    setLoading(false)
  }

  const selectedComparison = useMemo(() => {
    if (!reportData) return null
    const matched = reportData.comparisons.find((item) => item.afterLogId === selectedAfterLogId)
    return matched || reportData.comparisons[0] || null
  }, [reportData, selectedAfterLogId])

  const selectedAfterScratch = useMemo(() => {
    if (!reportData || !selectedComparison) return null
    return reportData.afterScratchMap.get(selectedComparison.afterLogId) || null
  }, [reportData, selectedComparison])

  const handleDispute = () => {
    if (reportData?.mode === 'dispute') {
      navigate(`/disputes/${id}`)
      return
    }
    const targetLogId = selectedComparison?.afterLogId
    if (!targetLogId) {
      alert('분쟁 생성 대상 로그가 없습니다.')
      return
    }
    if (!createReason.trim()) {
      alert('분쟁 사유를 입력해 주세요.')
      return
    }
    const claimAmount = Number(createAmount)
    if (!Number.isFinite(claimAmount) || claimAmount <= 0) {
      alert('청구 금액을 1 CARE 이상 입력해 주세요.')
      return
    }

    createDispute(targetLogId, claimAmount)
  }

  const createDispute = async (targetLogId, claimAmount) => {
    setCreateLoading(true)
    setCreateError('')

    const result = await DisputeService.createDispute(reportData.reservationId, {
      targetLogId,
      reason: createReason.trim(),
      claimAmount
    })

    setCreateLoading(false)

    if (!result.success || !result.data) {
      setCreateError(result.message || '분쟁 생성에 실패했습니다.')
      return
    }

    alert('분쟁이 생성되었습니다.')
    navigate(`/disputes/${result.data.disputeId}`)
  }

  if (loading) {
    return (
      <div className="ai-report-page">
        <div className="page-header">
          <button className="back-button" onClick={() => navigate(-1)}>←</button>
          <h1 className="page-title">AI 반납 리포트 검토</h1>
        </div>
        <div className="loading-card">AI 리포트를 불러오는 중...</div>
      </div>
    )
  }

  if (error || !reportData) {
    return (
      <div className="ai-report-page">
        <div className="page-header">
          <button className="back-button" onClick={() => navigate(-1)}>←</button>
          <h1 className="page-title">AI 반납 리포트 검토</h1>
        </div>
        <div className="error-card">{error || '리포트 데이터가 없습니다.'}</div>
      </div>
    )
  }

  const carInfo = reportData.reservation?.car
  const carModel = [carInfo?.brand, carInfo?.modelName].filter(Boolean).join(' ') || '-'
  const reservationId = reportData.reservationId || '-'
  const warningCount = reportData.warningCount || 0
  const threshold = reportData.threshold
  const hasWarning = warningCount > 0
  const isReservationMode = reportData.mode === 'reservation'
  const existingDisputeId = reportData.reservation?.disputeId || null

  return (
    <div className="ai-report-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ←
        </button>
        <h1 className="page-title">AI 반납 리포트 검토</h1>
        <div className="user-info">
          <span>관리자님, 환영합니다</span>
          <span className="user-icon">👤</span>
        </div>
      </div>

      <div className="report-header">
        <div className="car-info">
          <div className="car-details">
            <div className="car-plate-row">
              <h2 className="car-plate">#{reservationId.slice(-8).toUpperCase()}</h2>
              {warningCount > 0 && (
                <span className="damage-badge">주의 필요 {warningCount}건</span>
              )}
            </div>
            <p className="car-meta">
              {carModel} | 반납일시: {formatDateTime(reportData.reservation?.returnDate)}
            </p>
          </div>
        </div>
        <div className="deposit-status">
          <p className="status-label">AI 경고 기준</p>
          <p className="status-value">
            <span className="status-icon">{hasWarning ? '⚠️' : '✅'}</span>
            유사도 {WARNING_THRESHOLD}% 미만 주의
          </p>
        </div>
      </div>

      {hasWarning && (
        <div className="warning-panel">
          유사도가 기준치보다 낮은 비교가 {warningCount}건 감지되었습니다. 반납 전/후 이미지와 분쟁 대상 로그를 확인하세요.
        </div>
      )}

      <div className="report-content">
        <div className="left-section">
          <div className="damage-map-card">
            <h3 className="section-title">AI 비교 결과</h3>

            {/* 차량 탑뷰 도식 — 고정 6구역, 비교 항목 번호·색 매핑 */}
            <div className="car-diagram">
              <div className="car-map-wrap">
                <img src={carIconTop} alt="차량 탑뷰" className="car-map-img" />
                {FIXED_ZONES.map((zone) => {
                  const zoneItems = reportData.comparisons
                    .map((item, index) => ({ item, index }))
                    .filter(({ item }) => {
                      const scratch = reportData.afterScratchMap.get(item.afterLogId)
                      return getZoneForCarPart(scratch?.carPart) === zone.id
                    })
                  const hasWarning = zoneItems.some(({ item }) => isWarning(item))
                  const hasDamage = zoneItems.length > 0
                  const isSelected = zoneItems.some(
                    ({ item }) => item.afterLogId === selectedComparison?.afterLogId
                  )
                  const markerCls = hasDamage
                    ? (hasWarning ? 'zone-warning' : 'zone-safe')
                    : 'zone-empty'
                  return (
                    <div
                      key={zone.id}
                      className={`zone-marker ${markerCls}${isSelected ? ' marker-selected' : ''}`}
                      style={{ left: zone.left, top: zone.top }}
                      onClick={() => hasDamage && setSelectedAfterLogId(zoneItems[0].item.afterLogId)}
                      title={zone.label}
                    >
                      {hasDamage && (
                        <span className="zone-count">
                          {zoneItems.map(({ index }) => index + 1).join(',')}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 비교 목록 */}
            <div className="comparison-list">
              {reportData.comparisons.map((item, index) => {
                const afterScratch = reportData.afterScratchMap.get(item.afterLogId)
                const isSelected = selectedComparison?.afterLogId === item.afterLogId
                return (
                  <button
                    key={`${item.afterLogId}-${item.beforeLogId || index}`}
                    className={`comparison-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedAfterLogId(item.afterLogId)}
                  >
                    <div className="comparison-item-title-row">
                      <span className="comparison-item-title">
                        {index + 1}. {carPartLabel(afterScratch?.carPart) || '위치 미상'}
                      </span>
                      <span className={`comparison-item-badge ${item.isNewScratch ? 'new-scratch' : isWarning(item) ? 'warn' : 'safe'}`}>
                        {item.isNewScratch ? '신규 흠집' : isWarning(item) ? '주의' : '정상'}
                      </span>
                    </div>
                  </button>
                )
              })}
              {reportData.comparisons.length === 0 && (
                <p className="empty-message">AI 비교 데이터가 없습니다.</p>
              )}
            </div>

            <div className="legend">
              <div className="legend-item">
                <span className="legend-dot new"></span>
                <span className="legend-text">주의 필요</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot existing"></span>
                <span className="legend-text">기준 이상</span>
              </div>
            </div>
          </div>
        </div>

        <div className="right-section">
          <div className="damage-detail-card">
            <div className="detail-header">
              <h3 className="section-title">
                <span className="warning-icon">{selectedComparison && isWarning(selectedComparison) ? '⚠️' : '✅'}</span>
                {carPartLabel(selectedAfterScratch?.carPart) || '선택된 비교 없음'} 상세
              </h3>
            </div>

            <div className="comparison-images">
              <div className="image-container">
                <p className="image-label">BEFORE</p>
                {selectedComparison?.isNewScratch || !selectedComparison?.beforeCropS3Url ? (
                  <div className="no-before-placeholder">
                    <span className="no-before-icon">🚫</span>
                    <p>사전 이미지 없음</p>
                    <p className="no-before-sub">해당 부위의 사전 스캔 이미지가 존재하지 않습니다.</p>
                  </div>
                ) : (
                  <img
                    src={selectedComparison.beforeCropS3Url}
                    alt="Before"
                    className="damage-image"
                  />
                )}
              </div>
              <div className="image-container highlighted">
                <p className="image-label">AFTER</p>
                <img
                  src={selectedComparison?.afterCropS3Url || 'https://via.placeholder.com/400x300?text=No+After'}
                  alt="After"
                  className="damage-image"
                />
              </div>
            </div>

            <div className="similarity-section">
              {selectedComparison?.isNewScratch ? (
                <div className="new-scratch-notice">
                  <p className="new-scratch-title">새로운 흠집으로 분류됨</p>
                  <p className="new-scratch-desc">
                    반납 후 발견된 신규 손상입니다.
                  </p>
                </div>
              ) : (
                <>
                  <div className="similarity-header">
                    <span className="similarity-label">AI 이미지 유사도 (Similarity)</span>
                    <span className="similarity-value">{toPercent(selectedComparison?.similarity).toFixed(1)}%</span>
                  </div>
                  <div className="similarity-bar">
                    <div
                      className="similarity-fill"
                      style={{ width: `${Math.min(100, toPercent(selectedComparison?.similarity))}%` }}
                    ></div>
                  </div>
                  <p className="similarity-description">
                    <span className="info-icon">ℹ️</span>
                    {selectedComparison && isWarning(selectedComparison)
                      ? `유사도가 기준치(${WARNING_THRESHOLD}%) 미만입니다. 추가 확인이 필요합니다.`
                      : `유사도가 기준치(${WARNING_THRESHOLD}%) 이상입니다.`}
                  </p>
                </>
              )}
            </div>

            <div className="action-buttons">
              {existingDisputeId ? (
                <button className="dispute-btn" style={{ backgroundColor: '#6c757d' }}
                  onClick={() => navigate(`/disputes/${existingDisputeId}`)}>
                  📋 기존 분쟁 확인하기
                </button>
              ) : (
                <button className="dispute-btn" onClick={handleDispute}>
                  {isReservationMode ? '🛠️ 선택 항목으로 분쟁 생성' : '🛠️ 수리비 청구 (분쟁 상세 이동)'}
                </button>
              )}
            </div>
            {isReservationMode && !existingDisputeId && (
              <div className="dispute-create-box">
                <p className="dispute-create-title">분쟁 생성 정보</p>
                <textarea
                  className="dispute-input dispute-reason"
                  placeholder="분쟁 사유를 입력해 주세요."
                  value={createReason}
                  onChange={(e) => setCreateReason(e.target.value)}
                />
                <input
                  className="dispute-input"
                  type="number"
                  min="1"
                  placeholder="청구 금액(CARE)"
                  value={createAmount}
                  onChange={(e) => setCreateAmount(e.target.value)}
                />
                {createError && <p className="create-error">{createError}</p>}
                {createLoading && <p className="create-loading">분쟁 생성 중...</p>}
              </div>
            )}
            <p className="action-note">
              BEFORE {reportData.beforeCount}건 / AFTER {reportData.afterCount}건 분석 완료
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}