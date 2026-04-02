import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import DisputeService from '../../services/DisputeService'
import ReservationService from '../../services/ReservationService'
import { carPartLabel } from '../../utils/formatId'
import carIconTop from '../../assets/car_icon_top.png'
import './AIReportPage.css'

const DEFAULT_THRESHOLD = 60

// 고정 6구역
const FIXED_ZONES = [
  { id: 'front',       left: '50%', top: '14%' },
  { id: 'rear',        left: '50%', top: '82%' },
  { id: 'front-left',  left: '22%', top: '28%' },
  { id: 'front-right', left: '78%', top: '28%' },
  { id: 'rear-left',   left: '22%', top: '70%' },
  { id: 'rear-right',  left: '78%', top: '70%' },
]

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

const getZoneForCarPart = (carPart) => {
  if (!carPart) return null
  const lower = carPart.toLowerCase()
  if (CAR_PART_TO_ZONE[lower]) return CAR_PART_TO_ZONE[lower]
  const underscored = lower.replace(/-/g, '_')
  if (CAR_PART_TO_ZONE[underscored]) return CAR_PART_TO_ZONE[underscored]
  if (ZONE_IDS.has(lower)) return lower
  return null
}

const WARNING_THRESHOLD = 80

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
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reportData, setReportData] = useState(null)
  const [selectedAfterLogId, setSelectedAfterLogId] = useState(null)
  const [selectedReasonType, setSelectedReasonType] = useState('NEW_SCRATCH')
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
      setError(reservationResult.message || t('aiReport.errorNoReservation'))
      setLoading(false)
      return
    }

    const reservation = reservationResult.data
    const carId = reservation?.car?.carId
    if (!carId) {
      setError(t('aiReport.errorNoCarInfo'))
      setLoading(false)
      return
    }

    const returnReportResult = await ReservationService.getReturnReport(carId, reservationId)
    if (!returnReportResult.success || !returnReportResult.data) {
      setError(returnReportResult.message || t('aiReport.errorNoReport'))
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

  useEffect(() => {
    if (selectedComparison) {
      if (selectedComparison.isNewScratch) {
        setSelectedReasonType('NEW_SCRATCH')
      } else {
        setSelectedReasonType('LOW_SIMILARITY')
      }
    }
  }, [selectedComparison])

  const handleDispute = () => {
    if (reportData?.mode === 'dispute') {
      navigate(`/disputes/${id}`)
      return
    }
    const targetLogId = selectedComparison?.afterLogId
    if (!targetLogId) {
      alert(t('aiReport.alertNoLogs'))
      return
    }

    let finalReason = ''
    if (selectedReasonType === 'NEW_SCRATCH') {
      finalReason = 'SYS_REASON:NEW_SCRATCH'
    } else if (selectedReasonType === 'LOW_SIMILARITY') {
      const percent = toPercent(selectedComparison?.similarity).toFixed(1)
      finalReason = `SYS_REASON:LOW_SIMILARITY:${percent}`
    } else {
      finalReason = createReason.trim()
    }

    if (!finalReason) {
      alert(t('aiReport.alertNoReason'))
      return
    }
    const claimAmount = Number(createAmount)
    if (!Number.isFinite(claimAmount) || claimAmount <= 0) {
      alert(t('aiReport.alertNoAmount'))
      return
    }

    createDisputeFn(targetLogId, finalReason, claimAmount)
  }

  const createDisputeFn = async (targetLogId, finalReason, claimAmount) => {
    setCreateLoading(true)
    setCreateError('')

    const result = await DisputeService.createDispute(reportData.reservationId, {
      targetLogId,
      reason: finalReason,
      claimAmount
    })

    setCreateLoading(false)

    if (!result.success || !result.data) {
      setCreateError(result.message || t('aiReport.errorCreate'))
      return
    }

    alert(t('aiReport.alertCreated'))
    navigate(`/disputes/${result.data.disputeId}`)
  }

  if (loading) {
    return (
      <div className="ai-report-page">
        <div className="page-header">
          <button className="back-button" onClick={() => navigate(-1)}>{'\u2190'}</button>
          <h1 className="page-title">{t('aiReport.title')}</h1>
        </div>
        <div className="loading-card">{t('aiReport.loading')}</div>
      </div>
    )
  }

  if (error || !reportData) {
    return (
      <div className="ai-report-page">
        <div className="page-header">
          <button className="back-button" onClick={() => navigate(-1)}>{'\u2190'}</button>
          <h1 className="page-title">{t('aiReport.title')}</h1>
        </div>
        <div className="error-card">{error || t('aiReport.noReport')}</div>
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
  const depositAmount = reportData.reservation?.deposit || 10000

  return (
    <div className="ai-report-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          {'\u2190'}
        </button>
        <h1 className="page-title">{t('aiReport.title')}</h1>
        <div className="user-info">
          <span>{t('aiReport.welcomeText')}</span>
          <span className="user-icon">{'\ud83d\udc64'}</span>
        </div>
      </div>

      <div className="report-header">
        <div className="car-info">
          <div className="car-details">
            <div className="car-plate-row">
              <h2 className="car-plate">#{reservationId.slice(-8).toUpperCase()}</h2>
              {warningCount > 0 && (
                <span className="damage-badge">{t('aiReport.warningCount', { n: warningCount })}</span>
              )}
            </div>
            <p className="car-meta">
              {carModel} {t('aiReport.returnDate')} {formatDateTime(reportData.reservation?.returnDate)}
            </p>
          </div>
        </div>
        <div className="deposit-status">
          <p className="status-label">{t('aiReport.warningThreshold')}</p>
          <p className="status-value">
            <span className="status-icon">{hasWarning ? '\u26a0\ufe0f' : '\u2705'}</span>
            {t('aiReport.warningThresholdValue', { n: WARNING_THRESHOLD })}
          </p>
        </div>
      </div>

      {hasWarning && (
        <div className="warning-panel">
          {t('aiReport.warningPanel', { n: warningCount })}
        </div>
      )}

      <div className="report-content">
        <div className="left-section">
          <div className="damage-map-card">
            <h3 className="section-title">{t('aiReport.compareTitle')}</h3>

            <div className="car-diagram">
              <div className="car-map-wrap">
                <img src={carIconTop} alt="car top view" className="car-map-img" />
                {FIXED_ZONES.map((zone) => {
                  const zoneItems = reportData.comparisons
                    .map((item, index) => ({ item, index }))
                    .filter(({ item }) => {
                      const scratch = reportData.afterScratchMap.get(item.afterLogId)
                      return getZoneForCarPart(scratch?.carPart) === zone.id
                    })
                  const hasZoneWarning = zoneItems.some(({ item }) => isWarning(item))
                  const hasDamage = zoneItems.length > 0
                  const isSelected = zoneItems.some(
                    ({ item }) => item.afterLogId === selectedComparison?.afterLogId
                  )
                  const markerCls = hasDamage
                    ? (hasZoneWarning ? 'zone-warning' : 'zone-safe')
                    : 'zone-empty'
                  return (
                    <div
                      key={zone.id}
                      className={`zone-marker ${markerCls}${isSelected ? ' marker-selected' : ''}`}
                      style={{ left: zone.left, top: zone.top }}
                      onClick={() => hasDamage && setSelectedAfterLogId(zoneItems[0].item.afterLogId)}
                      title={zone.id}
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
                        {index + 1}. {carPartLabel(afterScratch?.carPart) || t('aiReport.zoneUnknown')}
                      </span>
                      <span className={`comparison-item-badge ${item.isNewScratch ? 'new-scratch' : isWarning(item) ? 'warn' : 'safe'}`}>
                        {item.isNewScratch ? t('aiReport.zoneNewScratch') : isWarning(item) ? t('aiReport.zoneWarning') : t('aiReport.zoneNormal')}
                      </span>
                    </div>
                  </button>
                )
              })}
              {reportData.comparisons.length === 0 && (
                <p className="empty-message">{t('aiReport.noData')}</p>
              )}
            </div>

            <div className="legend">
              <div className="legend-item">
                <span className="legend-dot new"></span>
                <span className="legend-text">{t('aiReport.legendWarning')}</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot existing"></span>
                <span className="legend-text">{t('aiReport.legendOk')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="right-section">
          <div className="damage-detail-card">
            <div className="detail-header">
              <h3 className="section-title">
                <span className="warning-icon">{selectedComparison && isWarning(selectedComparison) ? '\u26a0\ufe0f' : '\u2705'}</span>
                {carPartLabel(selectedAfterScratch?.carPart) || t('aiReport.noSelection')}{t('aiReport.detailSuffix')}
              </h3>
            </div>

            <div className="comparison-images">
              <div className="image-container">
                <p className="image-label">{t('aiReport.imageLabel')}</p>
                {selectedComparison?.isNewScratch || !selectedComparison?.beforeCropS3Url ? (
                  <div className="no-before-placeholder">
                    <span className="no-before-icon">{'\ud83d\udeab'}</span>
                    <p>{t('aiReport.noBeforeTitle')}</p>
                    <p className="no-before-sub">{t('aiReport.noBeforeDesc')}</p>
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
                <p className="image-label">{t('aiReport.imageAfterLabel')}</p>
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
                  <p className="new-scratch-title">{t('aiReport.newScratchTitle')}</p>
                  <p className="new-scratch-desc">
                    {t('aiReport.newScratchDesc')}
                  </p>
                </div>
              ) : (
                <>
                  <div className="similarity-header">
                    <span className="similarity-label">{t('aiReport.similarityLabel')}</span>
                    <span className="similarity-value">{toPercent(selectedComparison?.similarity).toFixed(1)}%</span>
                  </div>
                  <div className="similarity-bar">
                    <div
                      className="similarity-fill"
                      style={{ width: `${Math.min(100, toPercent(selectedComparison?.similarity))}%` }}
                    ></div>
                  </div>
                  <p className="similarity-description">
                    <span className="info-icon">{'\u2139\ufe0f'}</span>
                    {selectedComparison && isWarning(selectedComparison)
                      ? t('aiReport.similarityWarn', { n: WARNING_THRESHOLD })
                      : t('aiReport.similarityOk', { n: WARNING_THRESHOLD })}
                  </p>
                </>
              )}
            </div>

            {isReservationMode && !existingDisputeId ? (
              <div className="dispute-create-box">
                <p className="dispute-create-title">{t('aiReport.disputeInfoTitle')}</p>
                <div className="reason-toggle-group">
                  <button
                    className={`reason-toggle-btn ${selectedReasonType === 'NEW_SCRATCH' ? 'active' : ''}`}
                    onClick={() => setSelectedReasonType('NEW_SCRATCH')}
                  >
                    {t('dispute.presetNewScratch')}
                  </button>
                  <button
                    className={`reason-toggle-btn ${selectedReasonType === 'LOW_SIMILARITY' ? 'active' : ''}`}
                    onClick={() => setSelectedReasonType('LOW_SIMILARITY')}
                  >
                    {t('dispute.presetLowSimilarity', { percent: toPercent(selectedComparison?.similarity).toFixed(1) })}
                  </button>
                  <button
                    className={`reason-toggle-btn ${selectedReasonType === 'DIRECT' ? 'active' : ''}`}
                    onClick={() => setSelectedReasonType('DIRECT')}
                  >
                    {t('dispute.presetDirect')}
                  </button>
                </div>
                {selectedReasonType === 'DIRECT' && (
                  <textarea
                    className="dispute-input dispute-reason"
                    placeholder={t('aiReport.disputeReasonPlaceholder')}
                    value={createReason}
                    onChange={(e) => setCreateReason(e.target.value)}
                  />
                )}
                <div className="deposit-highlight">
                  <span className="deposit-label">{t('aiReport.currentDepositLabel')}</span>
                  <span className="deposit-value">{depositAmount.toLocaleString()} CARE</span>
                </div>
                
                <div className="amount-input-group">
                  <label className="amount-label">{t('aiReport.disputeAmountLabel')}</label>
                  <div className="amount-input-wrapper">
                    <input
                      className="dispute-input amount-input"
                      type="number"
                      min="1"
                      placeholder="0"
                      value={createAmount}
                      onChange={(e) => {
                        let val = parseInt(e.target.value, 10);
                        if (isNaN(val)) setCreateAmount('');
                        else {
                          if (val > depositAmount) val = depositAmount;
                          setCreateAmount(val);
                        }
                      }}
                    />
                    <span className="amount-unit">CARE</span>
                  </div>
                  <p className="amount-helper">
                    {t('aiReport.disputeAmountHelper', { deposit: depositAmount.toLocaleString() })}
                  </p>
                </div>
                {createError && <p className="create-error">{createError}</p>}
                {createLoading && <p className="create-loading">{t('aiReport.disputeCreating')}</p>}

                <div className="action-buttons" style={{ marginTop: '16px', marginBottom: 0 }}>
                  <button className="dispute-btn" onClick={handleDispute}>
                    {t('aiReport.createDisputeBtn')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="action-buttons">
                {existingDisputeId ? (
                  <button className="dispute-btn" style={{ backgroundColor: '#6c757d' }}
                    onClick={() => navigate(`/disputes/${existingDisputeId}`)}>
                    {t('aiReport.checkDisputeBtn')}
                  </button>
                ) : (
                  <button className="dispute-btn" onClick={handleDispute}>
                    {t('aiReport.goDisputeBtn')}
                  </button>
                )}
              </div>
            )}
            <p className="action-note">
              {t('aiReport.footerStats', { before: reportData.beforeCount, after: reportData.afterCount })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
