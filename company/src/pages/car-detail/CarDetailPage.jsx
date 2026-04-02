import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NFTModal from '../../components/NFTModal'
import CarService from '../../services/CarService'
import './CarDetailPage.css'

export default function CarDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const [isNFTModalOpen, setIsNFTModalOpen] = useState(false)
  const [carData, setCarData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchCarDetail()
  }, [id])

  const fetchCarDetail = async () => {
    setLoading(true)
    setError(null)
    const result = await CarService.getCarDetail(id)
    if (result.success) {
      setCarData(result.data)
    } else {
      setError(result.message)
    }
    setLoading(false)
  }

  const getStatusText = (status) => {
    const statusMap = {
      ACTIVE: t('carDetail.statusAvailable'),
      RENTED: t('carDetail.statusRented'),
      MAINTENANCE: t('carDetail.statusMaintenance'),
      INACTIVE: t('carDetail.statusInactive')
    }
    return statusMap[status] || status
  }

  const getFuelTypeText = (fuelType) => {
    const fuelMap = {
      GASOLINE: t('carManagement.fuelGasoline'),
      DIESEL: t('carManagement.fuelDiesel'),
      ELECTRIC: t('carManagement.fuelElectric'),
      HYBRID: t('carManagement.fuelHybrid'),
      LPG: 'LPG'
    }
    return fuelMap[fuelType] || fuelType
  }

  const handleDelete = () => {
    if (window.confirm(t('carDetail.deleteConfirm'))) {
      console.log('Delete car:', id)
    }
  }

  const nftInfo = {
    tokenId: carData?.nftTokenId || '-',
    issueDate: carData?.createdAt ? carData.createdAt.slice(0, 10) : '2025-01-08',
  }

  const defectLogs = [
    { id: 1, location: '\u524d\u9762 \u30d0\u30f3\u30d1\u30fc', type: '\u8efd\u5fae\u306a\u30b9\u30af\u30e9\u30c3\u30c1', date: '2025-01-08' },
    { id: 2, location: '\u53f3\u5074\u30c9\u30a2', type: '\u5857\u88c5\u5265\u304c\u308c', date: '2025-01-08' },
  ]

  const operationStats = {
    totalReservations: '37',
    totalRevenue: '5,550,000 CARE',
    avgRating: '4.6',
  }

  const recentReservations = [
    { id: 1, name: 'Kim', period: '2026.03.20 ~ 2026.03.22', amount: '150,000 CARE', status: 'returned' },
    { id: 2, name: 'Lee', period: '2026.03.25 ~ 2026.03.27', amount: '150,000 CARE', status: 'active' },
  ]

  if (loading) {
    return (
      <div className="reservation-detail-page">
        <div className="page-header-bar">
          <button className="back-button" onClick={() => navigate(-1)}>{'\u2190'}</button>
          <h1 className="page-title">{t('carDetail.title')}</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '50px' }}>{t('carDetail.loading')}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="reservation-detail-page">
        <div className="page-header-bar">
          <button className="back-button" onClick={() => navigate(-1)}>{'\u2190'}</button>
          <h1 className="page-title">{t('carDetail.title')}</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>{error}</div>
      </div>
    )
  }

  if (!carData) {
    return (
      <div className="reservation-detail-page">
        <div className="page-header-bar">
          <button className="back-button" onClick={() => navigate(-1)}>{'\u2190'}</button>
          <h1 className="page-title">{t('carDetail.title')}</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '50px' }}>{t('carDetail.notFound')}</div>
      </div>
    )
  }

  return (
    <div className="reservation-detail-page">
      <div className="page-header-bar">
        <button className="back-button" onClick={() => navigate(-1)}>{'\u2190'}</button>
        <h1 className="page-title">{t('carDetail.title')}</h1>
        <div className="header-actions">
          <button className="btn-secondary">{t('carDetail.editBtn')}</button>
          <button className="btn-danger" onClick={handleDelete}>{t('carDetail.deleteBtn')}</button>
        </div>
      </div>

      <div className="detail-content">
        <div className="main-column">
          <div className="card car-info-card">
            <div className="car-header">
              <div className="car-image">
                <img
                  src={carData.frontImageUrl || carData.thumbnailUrl || 'https://via.placeholder.com/300x200'}
                  alt={`${carData.brand} ${carData.modelName}`}
                />
              </div>
              <div className="car-basic-info">
                <div className="car-title-row">
                  <h2 className="car-name">{carData.brand} {carData.modelName}</h2>
                  <div className="badge-group">
                    <span className="status-badge">{getStatusText(carData.status)}</span>
                    <button
                      className="nft-badge"
                      onClick={() => setIsNFTModalOpen(true)}
                      title={t('carDetail.nftBadge')}
                    >
                      NFT
                    </button>
                  </div>
                </div>
                <p className="car-plate">{carData.plateNumber}</p>
                <div className="car-specs">
                  <div className="spec-item">
                    <span className="spec-label">{t('carDetail.fuelLabel')}</span>
                    <span className="spec-value">{getFuelTypeText(carData.fuelType)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="description-section">
              <h3 className="section-subtitle">{t('carDetail.descSection')}</h3>
              <p className="description-text">{carData.description}</p>
            </div>
          </div>

          <div className="card defect-log-card">
            <h3 className="card-title">{t('carDetail.defectLogTitle')}</h3>
            <div className="defect-list">
              {defectLogs.map((log) => (
                <div key={log.id} className="defect-item">
                  <div className="defect-info">
                    <span className="defect-location">{log.location}</span>
                    {log.type && <span className="defect-type">{log.type}</span>}
                    {log.date && <span className="defect-date">{t('carDetail.defectDate')} {log.date}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sidebar-column">
          <div className="card stats-card">
            <h3 className="card-title">{t('carDetail.statsTitle')}</h3>
            <div className="stat-row">
              <span className="stat-label">{t('carDetail.statTotalReservations')}</span>
              <span className="stat-value">{operationStats.totalReservations}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">{t('carDetail.statTotalRevenue')}</span>
              <span className="stat-value">{operationStats.totalRevenue}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">{t('carDetail.statAvgRating')}</span>
              <span className="stat-value">{operationStats.avgRating}</span>
            </div>
          </div>

          <div className="card recent-reservations-card">
            <div className="card-header-row">
              <h3 className="card-title">{t('carDetail.recentReservationsTitle')}</h3>
              <button className="view-all-btn" onClick={() => navigate('/reservations')}>
                {t('carDetail.viewAllBtn')}
              </button>
            </div>
            <div className="reservations-list">
              {recentReservations.map((reservation) => (
                <div key={reservation.id} className="reservation-item">
                  <div className="reservation-header">
                    <span className="renter-name">{reservation.name}</span>
                    <span className={`status-tag ${reservation.status === 'active' ? 'ongoing' : 'completed'}`}>
                      {reservation.status === 'active' ? t('carDetail.statusActive') : t('carDetail.statusReturned')}
                    </span>
                  </div>
                  <div className="reservation-period">{reservation.period}</div>
                  <div className="reservation-amount">{reservation.amount}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <NFTModal
        isOpen={isNFTModalOpen}
        onClose={() => setIsNFTModalOpen(false)}
        nftData={nftInfo}
      />
    </div>
  )
}
