import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ReservationService from '../../services/ReservationService'
import { shortId } from '../../utils/formatId'
import './ReservationDetailPage.css'

const formatDate = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default function ReservationDetailPage() {
  const { t } = useTranslation()
  const navigate  = useNavigate()
  const { id }    = useParams()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const STATUS_MAP = {
    RESERVED:   { label: t('reservationDetail.statusReserved'),       cls: 'reserved' },
    IN_USE:     { label: t('reservationDetail.statusInUse'),          cls: 'in-use'   },
    AFTER_SCAN: { label: t('reservationDetail.statusReturnPending'),  cls: 'after-scan'},
    COMPLETED:  { label: t('reservationDetail.statusReturned'),       cls: 'completed' },
    DISPUTE:    { label: t('reservationDetail.statusDispute'),        cls: 'dispute'  },
  }

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
        <span>{t('reservationDetail.loading')}</span>
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="rdp-page">
      <div className="rdp-center">
        <span className="rdp-error-icon">{'\u26a0\ufe0f'}</span>
        <span>{error || t('reservationDetail.errorLoad')}</span>
      </div>
    </div>
  )

  const statusInfo = STATUS_MAP[data.status] || { label: data.status, cls: '' }

  return (
    <div className="rdp-page">

      {/* 헤더 카드 */}
      <div className="rdp-header-card">
        <button className="rdp-back-btn" onClick={() => navigate(-1)}>{t('reservationDetail.back')}</button>
        <div className="rdp-header-info">
          <div className="rdp-header-meta">{t('reservationDetail.breadcrumb')} {shortId(data.reservationId)}</div>
          <h1 className="rdp-car-title">{data.carName}</h1>
        </div>
        <span className={`rdp-status-badge ${statusInfo.cls}`}>{statusInfo.label}</span>
      </div>

      {/* 본문 그리드 */}
      <div className="rdp-grid">

        {/* 왼쪽 컬럼 */}
        <div className="rdp-main-col">

          {/* 차량 정보 */}
          <div className="rdp-card">
            <h2 className="rdp-card-title">{t('reservationDetail.carInfoTitle')}</h2>
            <div className="rdp-info-list">
              <div className="rdp-info-row">
                <span className="rdp-info-label">{t('reservationDetail.carNameLabel')}</span>
                <span className="rdp-info-value">{data.carName}</span>
              </div>
              <div className="rdp-info-row">
                <span className="rdp-info-label">{t('reservationDetail.carPlateLabel')}</span>
                <span className="rdp-info-value rdp-mono">{data.plateNumber}</span>
              </div>
            </div>
          </div>

          {/* 대여 일정 */}
          <div className="rdp-card">
            <h2 className="rdp-card-title">{t('reservationDetail.scheduleTitle')}</h2>
            <div className="rdp-schedule-row">
              <div className="rdp-schedule-item rdp-pickup">
                <div className="rdp-schedule-dot" />
                <div>
                  <div className="rdp-schedule-label">{t('reservationDetail.schedulePickup')}</div>
                  <div className="rdp-schedule-date">{data.pickupDate}</div>
                </div>
              </div>
              <div className="rdp-schedule-arrow">{'\u2192'}</div>
              <div className="rdp-schedule-item rdp-return">
                <div className="rdp-schedule-dot" />
                <div>
                  <div className="rdp-schedule-label">{t('reservationDetail.scheduleReturn')}</div>
                  <div className="rdp-schedule-date">{data.returnDate}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 이용 상태 */}
          <div className="rdp-card">
            <h2 className="rdp-card-title">{t('reservationDetail.statusTitle')}</h2>
            <div className="rdp-status-boxes">
              <div className={`rdp-status-box ${data.pickupDone ? 'done' : 'pending'}`}>
                <div className="rdp-status-box-top">
                  <span className="rdp-check-icon">{data.pickupDone ? '\u2713' : '\u25cb'}</span>
                  <span className="rdp-status-box-label">{t('reservationDetail.pickupConfirm')}</span>
                </div>
                <div className="rdp-status-box-date">
                  {data.pickupDone ? data.pickupDate : t('reservationDetail.incomplete')}
                </div>
              </div>
              <div className={`rdp-status-box ${data.returnDone ? 'done' : 'pending'}`}>
                <div className="rdp-status-box-top">
                  <span className="rdp-check-icon">{data.returnDone ? '\u2713' : '\u25cb'}</span>
                  <span className="rdp-status-box-label">{t('reservationDetail.returnConfirm')}</span>
                </div>
                <div className="rdp-status-box-date">
                  {data.returnDone ? data.returnDate : t('reservationDetail.incomplete')}
                </div>
              </div>
            </div>

            {data.isDispute && (
              <div className="rdp-dispute-alert">
                {t('reservationDetail.disputeAlert')}
              </div>
            )}

            <div className="rdp-action-row">
              {data.isDispute && (
                <button className="rdp-btn-dispute" onClick={() => navigate(`/disputes/${data.disputeId}`)}>
                  {t('reservationDetail.disputeBtn')}
                </button>
              )}
              <button
                className="rdp-btn-ai"
                onClick={() => navigate(`/ai-report/${id}`)}
              >
                {t('reservationDetail.aiReportBtn')}
              </button>
            </div>
          </div>
        </div>

        {/* 오른쪽 컬럼 */}
        <div className="rdp-side-col">

          {/* 대여자 정보 */}
          <div className="rdp-card">
            <h2 className="rdp-card-title">{t('reservationDetail.renterInfoTitle')}</h2>
            <div className="rdp-info-list">
              <div className="rdp-info-row">
                <span className="rdp-info-label">{t('reservationDetail.renterNameLabel')}</span>
                <span className="rdp-info-value">{data.renterName}</span>
              </div>
              <div className="rdp-info-row">
                <span className="rdp-info-label">{t('reservationDetail.renterEmailLabel')}</span>
                <span className="rdp-info-value rdp-email">{data.renterEmail}</span>
              </div>
              <div className="rdp-info-row">
                <span className="rdp-info-label">{t('reservationDetail.renterInsuranceLabel')}</span>
                <span className="rdp-info-value">{data.insuranceName}</span>
              </div>
            </div>
          </div>

          {/* 결제 정보 */}
          <div className="rdp-card">
            <h2 className="rdp-card-title">{t('reservationDetail.paymentTitle')}</h2>
            <div className="rdp-payment-list">
              <div className="rdp-payment-row">
                <span className="rdp-payment-label">{t('reservationDetail.insuranceFee')}</span>
                <span className="rdp-payment-value">
                  {data.insurancePrice !== null ? `${data.insurancePrice.toLocaleString()} CARE` : '-'}
                </span>
              </div>
              <div className="rdp-payment-divider" />
              <div className="rdp-payment-row rdp-total-row">
                <span className="rdp-payment-label">{t('reservationDetail.totalPayment')}</span>
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
