import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CarService from '../../services/CarService'
import './CarManagementPage.css'

/* ── 매핑 ── */
const STATUS_META = {
  ACTIVE:      { label: '대여가능', cls: 'available',   dot: '#1a7a45' },
  RENTED:      { label: '대여중',   cls: 'rented',      dot: '#3d4ecf' },
  MAINTENANCE: { label: '정비중',   cls: 'maintenance', dot: '#b45309' },
  INACTIVE:    { label: '대여불가', cls: 'inactive',     dot: '#52525e' },
}
const FUEL_MAP = {
  GASOLINE: '가솔린', DIESEL: '디젤', ELECTRIC: '전기', HYBRID: '하이브리드',
}
const CAT_MAP = {
  ACTIVE: 'available', RENTED: 'rented', MAINTENANCE: 'maintenance', INACTIVE: 'inactive',
}
const CAR_ICONS = ['🚗','🚙','🚕','🏎️','🚐']

/* API 실패 또는 데이터 없을 때 사용하는 폴백 */
const MOCK_CARS = [
  { carId: 1, brand: '현대', modelName: '아반떼', fuelType: 'GASOLINE', status: 'ACTIVE',      dailyPrice: 65000,  reservationCount: 12 },
  { carId: 2, brand: '기아',  modelName: 'K5',    fuelType: 'HYBRID',   status: 'RENTED',      dailyPrice: 80000,  reservationCount: 8  },
  { carId: 3, brand: 'BMW',  modelName: '320i',  fuelType: 'GASOLINE', status: 'RENTED',      dailyPrice: 150000, reservationCount: 5  },
  { carId: 4, brand: '현대', modelName: '싼타페', fuelType: 'DIESEL',   status: 'MAINTENANCE', dailyPrice: 110000, reservationCount: 20 },
  { carId: 5, brand: '테슬라',modelName: 'Model3',fuelType: 'ELECTRIC', status: 'ACTIVE',      dailyPrice: 130000, reservationCount: 15 },
]

/* ── 스켈레톤 로딩 ── */
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
  const [activeTab, setActiveTab] = useState('all')
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

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
    { id: 'all',         label: '전체',    count: counts.all,         dot: '#F5A623' },
    { id: 'available',   label: '대여가능', count: counts.available,   dot: '#1a7a45' },
    { id: 'rented',      label: '대여중',   count: counts.rented,      dot: '#3d4ecf' },
    { id: 'maintenance', label: '정비중',   count: counts.maintenance, dot: '#b45309' },
  ]

  const filtered = activeTab === 'all'
    ? cars
    : cars.filter(c => CAT_MAP[c.status] === activeTab)

  const maxReservations = Math.max(...cars.map(c => c.reservationCount ?? 0), 1)

  return (
    <div className="car-management-page">

      {/* ── 헤더 ── */}
      <div className="page-header-with-button">
        <div>
          <h1 className="page-title">차량 관리</h1>
          <p className="page-subtitle">등록된 차량을 관리하고 새 차량을 등록하세요</p>
        </div>
        <button className="btn-register" onClick={() => navigate('/cars/register')}>
          + 차량 등록
        </button>
      </div>

      {/* ── 요약 칩 ── */}
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

      {/* ── 테이블 ── */}
      <div className="car-table-container">
        <table className="car-table">
          <thead>
            <tr>
              <th>차량</th>
              <th>연료</th>
              <th>일일 대여료</th>
              <th>예약 수</th>
              <th>상태</th>
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
                    <div className="car-empty-icon">🚗</div>
                    <div className="car-empty-text">해당 조건의 차량이 없습니다</div>
                    <div className="car-empty-sub">다른 필터를 선택해보세요</div>
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
                      >⋮</button>
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