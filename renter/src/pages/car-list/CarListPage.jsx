import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import careLogo from '../../assets/care_logo.png'
import BottomNav from '../../components/BottomNav'
import { getCarList } from '../../api/reservation'
import './CarListPage.css'


const FILTER_KEYS = ['filterAll', 'filterSmall', 'filterMedium', 'filterLarge', 'filterSuv', 'filterVan', 'filterLuxury']
const SORT_KEYS   = ['sortRecommend', 'sortPriceLow', 'sortPriceHigh', 'sortRating']
const PAGE_SIZE = 5

export default function CarListPage() {
  const { t } = useTranslation()
  const navigate   = useNavigate()
  const { state }  = useLocation()
  const searchInfo = state?.searchInfo || state || {}

  const carTypeMap = { 'filterSmall': 1, 'filterMedium': 2, 'filterLarge': 3, 'filterSuv': 4, 'filterVan': 5, 'filterLuxury': 6 }
  const [fi, setFi]     = useState(carTypeMap[searchInfo.carType] || 0)
  const [si, setSi]     = useState(0)
  const [page, setPage] = useState(1)
  const [favs, setFavs] = useState(new Set())
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const carSizeMap = ['', 'SMALL', 'MEDIUM', 'LARGE', 'SUV', 'VAN', 'LUXURY']
    const carSize = fi > 0 ? carSizeMap[fi] : undefined
    setLoading(true)
    getCarList({ carSize })
      .then(data => setCars(data))
      .catch(() => setCars([]))
      .finally(() => setLoading(false))
  }, [fi])

  const sorted = [...cars].sort((a, b) => {
    if (si === 1) return (a.dailyPrice || 0) - (b.dailyPrice || 0)
    if (si === 2) return (b.dailyPrice || 0) - (a.dailyPrice || 0)
    return 0
  })

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const paged      = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleFav = (id, e) => {
    e.stopPropagation()
    setFavs(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const handleFilter = (i) => { setFi(i); setPage(1) }
  const handleSort   = (i) => { setSi(i); setPage(1) }

  const locationLabel = searchInfo.location || t('carList.selectPickup')
  const dateLabel     = searchInfo.pickupDate && searchInfo.returnDate
    ? `${searchInfo.pickupDate} ~ ${searchInfo.returnDate}`
    : t('carList.selectDate')

  return (
    <div className="cl-wrap">
      {/* 헤더 */}
      <header className="cl-header">
        <button className="cl-back" onClick={() => navigate(-1)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#111" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="cl-header-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="#aaa" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke="#aaa" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <div className="cl-header-info">
            <p className="cl-loc">{locationLabel}</p>
            <p className="cl-date">{dateLabel}</p>
          </div>
        </div>
        <img src={careLogo} alt="CARe" className="cl-logo" />
      </header>

      {/* 필터 칩 */}
      <div className="cl-filter-row">
        {FILTER_KEYS.map((key, i) => (
          <button key={key}
            className={"cl-chip" + (fi === i ? ' on' : '')}
            onClick={() => handleFilter(i)}>
            {t(`carList.${key}`)}
          </button>
        ))}
      </div>

      {/* 정렬 + 결과 수 */}
      <div className="cl-sort-bar">
        <span className="cl-count">{t('carList.resultCount', { n: cars.length })}</span>
        <div className="cl-sorts">
          {SORT_KEYS.map((key, i) => (
            <button key={key}
              className={"cl-sort" + (si === i ? ' on' : '')}
              onClick={() => handleSort(i)}>
              {t(`carList.${key}`)}
            </button>
          ))}
        </div>
      </div>

      {/* 차량 목록 */}
      <div className="cl-list">
        {loading && <p style={{ textAlign: 'center', padding: '2rem', color: '#aaa' }}>{t('carList.loading')}</p>}
        {!loading && paged.length === 0 && <p style={{ textAlign: 'center', padding: '2rem', color: '#aaa' }}>{t('carList.noCars')}</p>}
        {paged.map(car => (
          <div key={car.carId} className="cl-card"
            onClick={() => navigate('/car-detail', { state: { car, searchInfo } })}>

            {/* 왼쪽: 차량 이미지 */}
            <div className="cl-img-wrap">
              {car.thumbnailUrl
                ? <img src={car.thumbnailUrl} alt={car.modelName} className="cl-car-img" />
                : <span className="cl-emoji">🚗</span>
              }
              <button className="cl-heart" onClick={e => toggleFav(car.carId, e)}>
                {favs.has(car.carId)
                  ? <svg width="17" height="17" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#F7A633"/></svg>
                  : <svg width="17" height="17" viewBox="0 0 24 24"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z" fill="#ccc"/></svg>
                }
              </button>
            </div>

            {/* 오른쪽: 차량 정보 */}
            <div className="cl-info">
              <p className="cl-name">{car.brand} {car.modelName}</p>
              <div className="cl-meta">
                <span>{car.fuelType}</span>
                <span>{car.carSize}</span>
              </div>

              {/* 회사 + 가격 */}
              <div className="cl-bottom-row">
                <span className="cl-company">{car.companyName}</span>
                {car.dailyPrice && (
                  <span className="cl-price-pill">
                    {Number(car.dailyPrice).toLocaleString()} CARE
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="cl-pagination">
          <button
            className="cl-page-btn"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="#555" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              className={"cl-page-num" + (page === p ? ' active' : '')}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          <button
            className="cl-page-btn"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="#555" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
