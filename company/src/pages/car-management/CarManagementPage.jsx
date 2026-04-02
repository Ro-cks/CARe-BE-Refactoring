import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CarService from '../../services/CarService'
import './CarManagementPage.css'

const CAT_MAP = {
  ACTIVE: 'available', RENTED: 'rented', MAINTENANCE: 'maintenance', INACTIVE: 'inactive',
}
const CAR_ICONS = ['\ud83d\ude97','\ud83d\ude99','\ud83d\ude95','\ud83c\udfce\ufe0f','\ud83d\ude90']

/* API 실패 또는 데이터 없을 때 사용하는 폴백 */
const MOCK_CARS = [
  { carId: 1, brand: '현대', modelName: '아반떼', fuelType: 'GASOLINE', status: 'ACTIVE',      dailyPrice: 65000,  reservationCount: 12 },
  { carId: 2, brand: '기아',  modelName: 'K5',    fuelType: 'HYBRID',   status: 'RENTED',      dailyPrice: 80000,  reservationCount: 8  },
  { carId: 3, brand: 'BMW',  modelName: '320i',  fuelType: 'GASOLINE', status: 'RENTED',      dailyPrice: 150000, reservationCount: 5  },
  { carId: 4, brand: '현대', modelName: '싼타페', fuelType: 'DIESEL',   status: 'MAINTENANCE', dailyPrice: 110000, reservationCount: 20 },
  { carId: 5, brand: '테슬라',modelName: 'Model3',fuelType: 'ELECTRIC', status: 'ACTIVE',      dailyPrice: 130000, reservationCount: 15 },
]

/* 스켈레톤 로딩 */
function SkeletonRows() {
  return Array.from({ length: 4 }).map((_, i) => (
    <tr key={i} className="skeleton-row">
      <td><div className="skeleton sk-car" /></td>
      <td><div className="skeleton sk-short" /></td>
      <td><div className="skeleton sk-mid" /></td>
      <td><div className="skeleton sk-short" /></td>
      <td><div className="skeleton sk-badge" /></td>
      <td />
    </tr>
  ))
}

export default function CarManagementPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('all')
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const STATUS_META = {
    ACTIVE:      { label: t('carManagement.statusAvailable'),   cls: 'available',   dot: '#1a7a45' },
    RENTED:      { label: t('carManagement.statusRented'),      cls: 'rented',      dot: '#3d4ecf' },
    MAINTENANCE: { label: t('carManagement.statusMaintenance'), cls: 'maintenance', dot: '#b45309' },
    INACTIVE:    { label: t('carManagement.statusInactive'),    cls: 'inactive',     dot: '#52525e' },
  }
  const FUEL_MAP = {
    GASOLINE: t('carManagement.fuelGasoline'),
    DIESEL:   t('carManagement.fuelDiesel'),
    ELECTRIC: t('carManagement.fuelElectric'),
    HYBRID:   t('carManagement.fuelHybrid'),
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const companyId = localStorage.getItem('companyId')
      if (companyId) {
        const result = await CarService.getCompanyCars(companyId)
        setCars(result.success && result.data?.length ? result.data : MOCK_CARS)
      } else {
        setCars(MOCK_CARS)
      }
      setLoading(false)
    }
    load()
  }, [])

  /* 탭 카운트 */
  const counts = {
    all:         cars.length,
    available:   cars.filter(c => c.status === 'ACTIVE').length,
    rented:      cars.filter(c => c.status === 'RENTED').length,
    maintenance: cars.filter(c => c.status === 'MAINTENANCE').length,
  }

  const chips = [
    { id: 'all',         label: t('carManagement.tabAll'),         count: counts.all,         dot: '#F5A623' },
    { id: 'available',   label: t('carManagement.tabAvailable'),   count: counts.available,   dot: '#1a7a45' },
    { id: 'rented',      label: t('carManagement.tabRented'),      count: counts.rented,      dot: '#3d4ecf' },
    { id: 'maintenance', label: t('carManagement.tabMaintenance'), count: counts.maintenance, dot: '#b45309' },
  ]

  const filtered = activeTab === 'all'
    ? cars
    : cars.filter(c => CAT_MAP[c.status] === activeTab)

  const maxReservations = Math.max(...cars.map(c => c.reservationCount ?? 0), 1)

  return (
    <div className="car-management-page">

      {/* 헤더 */}
      <div className="page-header-with-button">
        <div>
          <h1 className="page-title">{t('carManagement.title')}</h1>
          <p className="page-subtitle">{t('carManagement.subtitle')}</p>
        </div>
        <button className="btn-register" onClick={() => navigate('/cars/register')}>
          {t('carManagement.registerBtn')}
        </button>
      </div>

      {/* 요약 칩 */}
      <div className="car-summary-bar">
        {chips.map(chip => (
          <button
            key={chip.id}
            className={`car-summary-chip${activeTab === chip.id ? ' active-chip' : ''}`}
            onClick={() => setActiveTab(chip.id)}
          >
            <span
              className="car-summary-chip-dot"
              style={{ background: activeTab === chip.id ? '#fff' : chip.dot }}
            />
            {chip.label}
            <span className="car-summary-chip-count">{chip.count}</span>
          </button>
        ))}
      </div>

      {/* 테이블 */}
      <div className="car-table-container">
        <table className="car-table">
          <thead>
            <tr>
              <th>{t('carManagement.colCar')}</th>
              <th>{t('carManagement.colFuel')}</th>
              <th>{t('carManagement.colDailyPrice')}</th>
              <th>{t('carManagement.colReservations')}</th>
              <th>{t('carManagement.colStatus')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="car-empty">
                    <div className="car-empty-icon">{'\ud83d\ude97'}</div>
                    <div className="car-empty-text">{t('carManagement.emptyTitle')}</div>
                    <div className="car-empty-sub">{t('carManagement.emptySub')}</div>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((car, idx) => {
                const meta = STATUS_META[car.status] ?? { label: car.status, cls: 'inactive', dot: '#888' }
                const icon = CAR_ICONS[idx % CAR_ICONS.length]
                const resCount = car.reservationCount ?? 0
                const resPct = Math.round((resCount / maxReservations) * 100)
                return (
                  <tr key={car.carId} onClick={() => navigate(`/cars/${car.carId}`)}>
                    <td>
                      <div className="car-cell">
                        <div className="car-icon-wrap">{icon}</div>
                        <div>
                          <div className="car-name">{car.brand} {car.modelName}</div>
                          <div className="car-fuel">{FUEL_MAP[car.fuelType] ?? car.fuelType}</div>
                        </div>
                      </div>
                    </td>
                    <td>{FUEL_MAP[car.fuelType] ?? '-'}</td>
                    <td className="cell-amount">
                      {car.dailyPrice ? `${car.dailyPrice.toLocaleString()} CARE` : '-'}
                    </td>
                    <td>
                      <div className="reservation-bar-wrap">
                        <div className="reservation-bar-track">
                          <div className="reservation-bar-fill" style={{ width: `${resPct}%` }} />
                        </div>
                        <span className="reservation-bar-num">{resCount}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${meta.cls}`}>{meta.label}</span>
                    </td>
                    <td>
                      <button
                        className="menu-button"
                        onClick={e => { e.stopPropagation() }}
                      >{'\u22ee'}</button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
