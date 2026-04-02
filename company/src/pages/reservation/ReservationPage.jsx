import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import TabFilter from '../../components/TabFilter'
import ReservationTable from '../../components/ReservationTable'
import ReservationService from '../../services/ReservationService'
import './ReservationPage.css'


export default function ReservationPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('ongoing')
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortOrder, setSortOrder] = useState('desc')

  useEffect(() => {
    fetchReservations()
  }, [])

  const formatDate = (isoDate) => {
    if (!isoDate) return '-'
    const date = new Date(isoDate)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}.${month}.${day} ${hours}:${minutes}`
  }

  const getStatusLabel = (status) => {
    const statusMap = {
      RESERVED: t('reservation.statusReserved'),
      IN_USE: t('reservation.statusInUse'),
      AFTER_SCAN: t('reservation.statusReturnPending'),
      COMPLETED: t('reservation.statusReturned'),
      DISPUTE: t('reservation.statusDispute'),
    }
    return statusMap[status] || status
  }

  const getCategoryFromStatus = (status, depositStatus, disputeId, disputeStatus) => {
    if (disputeId) {
      if (disputeStatus === 'COMPLETED') return 'completed'
      if (disputeStatus === 'OPEN')      return 'dispute'
      if (depositStatus === 'LOCKED')    return 'dispute'
      return 'completed'
    }
    if (status === 'COMPLETED') return 'completed'
    return 'ongoing'
  }

  const fetchReservations = async () => {
    setLoading(true)
    try {
      const result = await ReservationService.getReservations()
      if (result.success && result.data) {
        const formatted = result.data
          .map((reservation) => ({
            id: reservation.reservationId,
            carName: `${reservation.brand || ''} ${reservation.modelName || ''}`.trim() || '-',
            carType: reservation.plateNumber || '-',
            thumbnailUrl: reservation.thumbnailUrl || null,
            renterName: reservation.renterName || '-',
            renterCountry: reservation.insuranceName || '-',
            startDate: formatDate(reservation.pickupDate),
            endDate: formatDate(reservation.returnDate),
            amount: reservation.totalPrice != null ? `${reservation.totalPrice.toLocaleString()} CARE` : '-',
            status: getStatusLabel(reservation.status),
            rawStatus: reservation.status,
            disputeId: reservation.disputeId || null,
            disputeStatus: reservation.disputeStatus || null,
            category: getCategoryFromStatus(reservation.status, reservation.depositStatus, reservation.disputeId, reservation.disputeStatus),
            _pickupDate: reservation.pickupDate,
          }))
        setReservations(formatted)
      }
    } catch {
      setReservations([])
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    total: reservations.length,
    ongoing: reservations.filter((r) => r.category === 'ongoing').length,
    completed: reservations.filter((r) => r.category === 'completed').length,
    dispute: reservations.filter((r) => r.category === 'dispute').length,
  }

  const filteredReservations = reservations
    .filter((r) => r.category === activeTab)
    .sort((a, b) => sortOrder === 'desc'
      ? new Date(b._pickupDate || 0) - new Date(a._pickupDate || 0)
      : new Date(a._pickupDate || 0) - new Date(b._pickupDate || 0)
    )

  const tabs = [
    { id: 'ongoing',   label: t('reservation.tabActive'),  count: stats.ongoing   },
    { id: 'completed', label: t('reservation.tabReturn'),  count: stats.completed },
    { id: 'dispute',   label: t('reservation.tabDispute'), count: stats.dispute   },
  ]

  return (
    <div className="reservation-page">

      {/* 헤더 */}
      <div className="res-header">
        <div>
          <h1 className="res-title">{t('reservation.title')}</h1>
          <p className="res-subtitle">{t('reservation.subtitle')}</p>
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="res-kpi-grid">
        <div className="res-kpi-card" style={{ '--ka': '#4A90E2' }}>
          <div className="res-kpi-icon" style={{ '--ka': '#4A90E2' }}>{'\ud83d\udcca'}</div>
          <div>
            <div className="res-kpi-label">{t('reservation.kpiTotal')}</div>
            <div className="res-kpi-value">{stats.total}<span className="res-kpi-unit">{t('reservation.kpiUnit')}</span></div>
          </div>
        </div>
        <div className="res-kpi-card" style={{ '--ka': '#F5A623' }}>
          <div className="res-kpi-icon" style={{ '--ka': '#F5A623' }}>{'\ud83d\ude97'}</div>
          <div>
            <div className="res-kpi-label">{t('reservation.kpiActive')}</div>
            <div className="res-kpi-value">{stats.ongoing}<span className="res-kpi-unit">{t('reservation.kpiUnit')}</span></div>
          </div>
        </div>
        <div className="res-kpi-card" style={{ '--ka': '#7ED321' }}>
          <div className="res-kpi-icon" style={{ '--ka': '#7ED321' }}>{'\u2705'}</div>
          <div>
            <div className="res-kpi-label">{t('reservation.kpiReturn')}</div>
            <div className="res-kpi-value">{stats.completed}<span className="res-kpi-unit">{t('reservation.kpiUnit')}</span></div>
          </div>
        </div>
        <div className="res-kpi-card" style={{ '--ka': '#D0021B' }}>
          <div className="res-kpi-icon" style={{ '--ka': '#D0021B' }}>{'\u26a0\ufe0f'}</div>
          <div>
            <div className="res-kpi-label">{t('reservation.kpiDispute')}</div>
            <div className="res-kpi-value">{stats.dispute}<span className="res-kpi-unit">{t('reservation.kpiUnit')}</span></div>
          </div>
        </div>
      </div>

      {/* 테이블 카드 */}
      <div className="res-content-card">
        <div className="res-content-inner">
          <TabFilter tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          {loading ? (
            <div className="empty-container">
              <div className="loading-spinner" />
              <p>{t('reservation.loading')}</p>
            </div>
          ) : (
            <div className="res-table-wrapper">
              <ReservationTable
                reservations={filteredReservations}
                sortOrder={sortOrder}
                onSortToggle={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
              />
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
