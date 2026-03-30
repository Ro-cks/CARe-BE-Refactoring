import { useState, useReducer, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useNotification } from '../../context/NotificationContext'
import careLogo from '../../assets/care_logo.png'
import mapIcon from '../../assets/map_icon.png'
import carIcon from '../../assets/car_icon.png'
import companyIcon from '../../assets/company_icon.png'
import BottomNav from '../../components/BottomNav'
import BottomSheet from '../../components/BottomSheet'
import DatePickerModal from '../../components/DatePickerModal'
import './HomePage.css'

// 이 파일 내에서는 키만 정의해두고 렌더링 시 t()로 다국어 처리
const COUNTRIES = [
  { key: 'KR' }, { key: 'JP' }, { key: 'US' }, { key: 'FR' },
  { key: 'DE' }, { key: 'IT' }, { key: 'ES' }, { key: 'TH' }
]

const AIRPORTS = {
  KR: [{ key: 'ICN' }, { key: 'GMP' }],
  JP: [{ key: 'NRT' }, { key: 'HND' }, { key: 'KIX' }],
  DEFAULT: [{ key: 'DEFAULT1' }, { key: 'DEFAULT2' }]
}

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
const MINUTES = ['00', '10', '20', '30', '40', '50']

const initialFormState = {
  country: '',
  countryCode: '',
  location: '',
  pickupDate: '',
  pickupTime: '10:00',
  returnDate: '',
  returnTime: '10:00',
  carType: '',
  showAll: true,
}

const formReducer = (state, action) => {
  switch (action.type) {
    case 'SET_FIELDS':
      return { ...state, ...action.fields }
    case 'RESET':
      return initialFormState
    default:
      return state
  }
}

export default function HomePage() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { unreadCount } = useNotification()

  const didVerified =
    localStorage.getItem('passport_verified') === 'true' &&
    localStorage.getItem('license_verified') === 'true'

  const [form, dispatch] = useReducer(formReducer, initialFormState)
  const setForm = (updater) => {
    if (typeof updater === 'function') {
      dispatch({ type: 'SET_FIELDS', fields: updater(form) })
    } else {
      dispatch({ type: 'SET_FIELDS', fields: updater })
    }
  }

  const CAR_TYPES = [
    { key: '', label: t('home.carTypeAll') },
    { key: '소형', label: t('home.carTypeSmall') },
    { key: '중형', label: t('home.carTypeMedium') },
    { key: '대형', label: t('home.carTypeLarge') },
    { key: 'SUV', label: 'SUV' },
    { key: '밴', label: t('home.carTypeVan') },
    { key: '럭셔리', label: t('home.carTypeLuxury') },
  ]

  const [showDidAlert, setShowDidAlert] = useState(false)
  const [countrySheet, setCountrySheet] = useState(false)
  const [airportSheet, setAirportSheet] = useState(false)
  const [carTypeSheet, setCarTypeSheet] = useState(false)
  const [dateModal, setDateModal] = useState(null)
  const [timeSheet, setTimeSheet] = useState(null) // 'pickup' | 'return' | null
  const [tempHour, setTempHour] = useState('10')
  const [tempMin, setTempMin] = useState('00')
  const [countrySearch, setCountrySearch] = useState('')
  const [airportSearch, setAirportSearch] = useState('')

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem('did_alert_shown')
    if (!didVerified && !alreadyShown) {
      const timer = setTimeout(() => {
        setShowDidAlert(true)
        sessionStorage.setItem('did_alert_shown', 'true')
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const filteredCountries = COUNTRIES.filter((c) => {
    const name = t(`home.countries.${c.key}`)
    const sub = t(`home.countries.${c.key}_sub`)
    return name.toLowerCase().includes(countrySearch.toLowerCase()) ||
           sub.toLowerCase().includes(countrySearch.toLowerCase())
  })

  const airportList = AIRPORTS[form.countryCode] || AIRPORTS.DEFAULT
  const filteredAirports = airportList.filter((a) => {
    const name = t(`home.airports.${a.key}`)
    const sub = t(`home.airports.${a.key}_sub`)
    return name.toLowerCase().includes(airportSearch.toLowerCase()) ||
           sub.toLowerCase().includes(airportSearch.toLowerCase())
  })

  const selectCountry = (c) => {
    const name = t(`home.countries.${c.key}`)
    const code = c.key
    setForm((p) => ({ ...p, country: name, countryCode: code, location: '' }))
    setCountrySheet(false)
    setCountrySearch('')
  }

  const selectAirport = (a) => {
    const name = t(`home.airports.${a.key}`)
    setForm((p) => ({ ...p, location: name }))
    setAirportSheet(false)
    setAirportSearch('')
  }

  const selectDate = (dateStr) => {
    if (dateModal === 'pickup') {
      setForm((p) => {
        const updates = { ...p, pickupDate: dateStr }
        // 반납 날짜가 대여 날짜 이전이면 초기화
        if (p.returnDate && p.returnDate < dateStr) updates.returnDate = ''
        // 오늘 날짜 선택 시, 지난 시간이면 다음 정시로 보정
        const today = new Date()
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        if (dateStr === todayStr) {
          const nextHour = today.getHours() + 1
          if (parseInt(p.pickupTime) < nextHour) {
            updates.pickupTime = `${String(Math.min(nextHour, 23)).padStart(2, '0')}:00`
          }
        }
        return updates
      })
    } else {
      setForm((p) => {
        // 반납 날짜가 대여 날짜 이전이면 선택 불가
        if (p.pickupDate && dateStr < p.pickupDate) return p
        const updates = { ...p, returnDate: dateStr }
        // 반납일 = 대여일이면 반납 시간이 대여 시간 이후여야 함
        if (dateStr === p.pickupDate && p.returnTime <= p.pickupTime) {
          const nextHour = parseInt(p.pickupTime) + 1
          updates.returnTime = `${String(Math.min(nextHour, 23)).padStart(2, '0')}:00`
        }
        return updates
      })
    }
    setDateModal(null)
  }

  const handleSearch = () => {
    navigate('/car-list', {
      state: {
        searchInfo: {
          country: form.country,
          countryCode: form.countryCode,
          location: form.location,
          pickupDate: form.pickupDate,
          pickupTime: form.pickupTime,
          returnDate: form.returnDate,
          returnTime: form.returnTime,
          carType: form.carType,
        },
      },
    })
  }

  const carTypeLabel = CAR_TYPES.find((c) => c.key === form.carType)?.label || ''

  return (
    <div className="home-container">
      {/* DID 미인증 알림 */}
      {showDidAlert && (
        <div className="did-alert-overlay" onClick={() => setShowDidAlert(false)}>
          <div className="did-alert-box" onClick={(e) => e.stopPropagation()}>
            <div className="did-alert-icon">🪪</div>
            <p className="did-alert-title">{t('home.didAlert.title')}</p>
            <p className="did-alert-desc">{t('home.didAlert.desc').split('\n').map((line, i) => (
              <span key={i}>{line}{i === 0 && <br />}</span>
            ))}</p>
            <div className="did-alert-btns">
              <button
                className="did-alert-confirm"
                onClick={() => { setShowDidAlert(false); navigate('/did-auth') }}
              >
                {t('home.didAlert.confirm')}
              </button>
              <button
                className="did-alert-cancel"
                onClick={() => setShowDidAlert(false)}
              >
                {t('home.didAlert.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="home-header">
        <img src={careLogo} alt="CARe" className="home-logo" />
        <div className="home-header-right">
          <button className="home-bell-btn" onClick={() => navigate('/notifications')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {unreadCount > 0 && (
              <span className="home-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
          <span
            className={`did-badge ${didVerified ? 'did-badge--verified' : 'did-badge--pending'}`}
            onClick={() => navigate(didVerified ? '/did-card' : '/did-auth', didVerified ? { state: { name: localStorage.getItem('did_name') || '', docId: localStorage.getItem('did_docId') || 'did:care:renter:verified', expiryDate: localStorage.getItem('did_expiry') || '' } } : undefined)}
            style={{ cursor: 'pointer' }}
          >
            {didVerified ? t('home.didAlert.confirm').replace('하러가기', '인증완료').replace('Go Verify', 'Verified').replace('確認する', '認証完了') : t('home.unverified')}
          </span>
        </div>
      </header>

      {/* 카테고리 아이콘 */}
      <div className="category-row">
        <button className="category-item" onClick={() => setCountrySheet(true)}>
          <img src={mapIcon} alt={t('home.country')} />
          <span>{t('home.country')}</span>
        </button>
        <button className="category-item" onClick={() => setCarTypeSheet(true)}>
          <img src={carIcon} alt={t('home.carKind')} />
          <span>{t('home.carKind')}</span>
        </button>
        <button className="category-item">
          <img src={companyIcon} alt={t('home.company')} />
          <span>{t('home.company')}</span>
        </button>
      </div>

      {/* 검색 폼 */}
      <div className="search-card">
        <button className="search-field" onClick={() => setCountrySheet(true)}>
          <span className="field-icon">📍</span>
          <span className={form.country ? 'field-value' : 'field-placeholder'}>
            {form.country || t('home.pickupCountry')}
          </span>
        </button>

        <button
          className="search-field"
          onClick={() => form.country && setAirportSheet(true)}
          style={{ opacity: form.country ? 1 : 0.6 }}
        >
          <span className="field-icon">📍</span>
          <span className={form.location ? 'field-value' : 'field-placeholder'}>
            {form.location || t('home.pickupLocation')}
          </span>
        </button>

        <div className="date-row">
          <button className="search-field date-field" onClick={() => setDateModal('pickup')}>
            <span className="field-icon">📅</span>
            <div className="date-content">
              <span className="date-label">{t('home.pickupDate')}</span>
              <span className={form.pickupDate ? 'field-value' : 'field-placeholder'}>
                {form.pickupDate || t('home.selectDate')}
              </span>
            </div>
          </button>
          <button className="search-field time-field" onClick={() => {
            const [h, m] = form.pickupTime.split(':')
            setTempHour(h); setTempMin(m || '00'); setTimeSheet('pickup')
          }}>
            <span className="field-icon">🕐</span>
            <div className="date-content">
              <span className="date-label">{t('home.time')}</span>
              <span className="field-value">{form.pickupTime}</span>
            </div>
          </button>
        </div>

        <div className="date-row">
          <button className="search-field date-field" onClick={() => setDateModal('return')}>
            <span className="field-icon">📅</span>
            <div className="date-content">
              <span className="date-label">{t('home.returnDate')}</span>
              <span className={form.returnDate ? 'field-value' : 'field-placeholder'}>
                {form.returnDate || t('home.selectDate')}
              </span>
            </div>
          </button>
          <button className="search-field time-field" onClick={() => {
            const [h, m] = form.returnTime.split(':')
            setTempHour(h); setTempMin(m || '00'); setTimeSheet('return')
          }}>
            <span className="field-icon">🕐</span>
            <div className="date-content">
              <span className="date-label">{t('home.time')}</span>
              <span className="field-value">{form.returnTime}</span>
            </div>
          </button>
        </div>

        <button className="search-field" onClick={() => setCarTypeSheet(true)}>
          <span className="field-icon">🚗</span>
          <span className={form.carType ? 'field-value' : 'field-placeholder'}>
            {carTypeLabel || t('home.carType')}
          </span>
        </button>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={form.showAll}
            onChange={(e) => setForm((p) => ({ ...p, showAll: e.target.checked }))}
          />
          <span>{t('home.showAll')}</span>
        </label>

        <button
          className="btn btn-primary search-btn"
          onClick={handleSearch}
          disabled={!form.country || !form.location || !form.pickupDate || !form.returnDate}
        >
          {t('home.search')}
        </button>
      </div>

      {/* 국가 선택 바텀시트 */}
      <BottomSheet open={countrySheet} onClose={() => { setCountrySheet(false); setCountrySearch('') }}>
        <h3 className="sheet-title">{t('home.countrySheet')}</h3>
        <div className="sheet-search">
          <span className="sheet-search-icon">🔍</span>
          <input
            className="sheet-input"
            placeholder={t('home.searchCountry')}
            value={countrySearch}
            onChange={(e) => setCountrySearch(e.target.value)}
            autoFocus
          />
        </div>
        <button className="location-btn">
          <span className="location-icon">🎯</span>
          <span>{t('home.myLocation')}</span>
        </button>
        <hr className="sheet-divider" />
        <ul className="sheet-list">
          {filteredCountries.map((c) => (
            <li key={c.key} className="sheet-list-item" onClick={() => selectCountry(c)}>
              <span className="list-icon">📍</span>
              <div>
                <p className="list-main">{t(`home.countries.${c.key}`)}</p>
                <p className="list-sub">{t(`home.countries.${c.key}_sub`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </BottomSheet>

      {/* 공항 선택 바텀시트 */}
      <BottomSheet open={airportSheet} onClose={() => { setAirportSheet(false); setAirportSearch('') }}>
        <h3 className="sheet-title">{t('home.airportSheet')}</h3>
        <div className="sheet-search">
          <span className="sheet-search-icon">🔍</span>
          <input
            className="sheet-input"
            placeholder={t('home.searchAirport')}
            value={airportSearch}
            onChange={(e) => setAirportSearch(e.target.value)}
            autoFocus
          />
        </div>
        <button className="location-btn">
          <span className="location-icon">🎯</span>
          <span>{t('home.myLocation')}</span>
        </button>
        <hr className="sheet-divider" />
        <ul className="sheet-list">
          {filteredAirports.map((a) => (
            <li key={a.key} className="sheet-list-item" onClick={() => selectAirport(a)}>
              <span className="list-icon">✈️</span>
              <div>
                <p className="list-main">{t(`home.airports.${a.key}`)}</p>
                <p className="list-sub">{t(`home.airports.${a.key}_sub`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </BottomSheet>

      {/* 차종 선택 바텀시트 */}
      <BottomSheet open={carTypeSheet} onClose={() => setCarTypeSheet(false)}>
        <h3 className="sheet-title">{t('home.carTypeSheet')}</h3>
        <ul className="sheet-list">
          {CAR_TYPES.map((item) => (
            <li
              key={item.key}
              className={`sheet-list-item car-type-item${form.carType === item.key ? ' selected' : ''}`}
              onClick={() => { setForm((p) => ({ ...p, carType: item.key })); setCarTypeSheet(false) }}
            >
              <span className="list-icon">🚗</span>
              <p className="list-main">{item.label}</p>
            </li>
          ))}
        </ul>
      </BottomSheet>

      {/* 날짜 선택 모달 */}
      <DatePickerModal
        open={!!dateModal}
        label={dateModal === 'pickup' ? t('home.pickupDate') : t('home.returnDate')}
        onClose={() => setDateModal(null)}
        onSelect={selectDate}
      />

      {/* 시간 선택 모달 */}
      {!!timeSheet && (
        <div className="timepicker-overlay" onClick={() => setTimeSheet(null)}>
          <div className="timepicker-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="timepicker-title">{t('home.time')} 선택</h3>

            <div className="timepicker-cols">
              <div className="timepicker-col">
                <p className="timepicker-col-label">시간</p>
                <div className="timepicker-scroll">
                  {HOURS.map((h) => (
                    <button
                      key={h}
                      className={`timepicker-item${tempHour === h ? ' active' : ''}`}
                      onClick={() => setTempHour(h)}
                    >
                      {h}시
                    </button>
                  ))}
                </div>
              </div>

              <div className="timepicker-divider" />

              <div className="timepicker-col">
                <p className="timepicker-col-label">분</p>
                <div className="timepicker-scroll">
                  {MINUTES.map((m) => (
                    <button
                      key={m}
                      className={`timepicker-item${tempMin === m ? ' active' : ''}`}
                      onClick={() => setTempMin(m)}
                    >
                      {m}분
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              className="timepicker-confirm"
              onClick={() => {
                const val = `${tempHour}:${tempMin}`
                setForm((p) => ({
                  ...p,
                  [timeSheet === 'pickup' ? 'pickupTime' : 'returnTime']: val,
                }))
                setTimeSheet(null)
              }}
            >
              {tempHour}:{tempMin} 확인
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
