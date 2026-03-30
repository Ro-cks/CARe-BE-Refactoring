import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import careLogo from '../../assets/care_logo.png'
import { getCarScratches, submitDefense } from '../../api/reservation'
import './DisputeHistoryPage.css'

const PARTS = [
  { id: 'all',         label: '전체' },
  { id: 'front',       label: '전면' },
  { id: 'rear',        label: '후면' },
  { id: 'front-left',  label: '좌측 앞' },
  { id: 'rear-left',   label: '좌측 뒤' },
  { id: 'front-right', label: '우측 앞' },
  { id: 'rear-right',  label: '우측 뒤' },
]

const CAR_PART_LABELS = {
  'front':       '전면 (보닛)',
  'rear':        '후면 (범퍼)',
  'front-left':  '좌측 앞바퀴',
  'rear-left':   '좌측 뒷바퀴',
  'front-right': '우측 앞바퀴',
  'rear-right':  '우측 뒷바퀴',
}

function getPartLabel(carPart) {
  if (!carPart) return '위치 미상'
  return CAR_PART_LABELS[carPart.toLowerCase()] || carPart
}

// carPart 값을 PARTS id로 정규화
function getPartKey(carPart) {
  if (!carPart) return 'front'
  return carPart.toLowerCase()
}

const LOG_TYPE_LABEL = { BEFORE: '탑승 전 스캔', AFTER: '반납 후 스캔' }

function formatDate(val) {
  if (!val) return ''
  if (Array.isArray(val)) {
    const [y, mo, d] = val
    return `${y}년 ${mo}월 ${d}일`
  }
  const d = new Date(val)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

export default function DisputeHistoryPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { state } = useLocation()
  const reservation = state?.reservation
  const disputeId = state?.disputeId

  const [scratches, setScratches] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [activePart, setActivePart] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [selectedLogId, setSelectedLogId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    const reservationId = reservation?.reservationId
    if (!reservationId) { setLoading(false); return }
    getCarScratches(reservationId)
      .then((data) => setScratches(Array.isArray(data) ? data : []))
      .catch(() => setScratches([]))
      .finally(() => setLoading(false))
  }, [reservation?.reservationId])

  const filtered = useMemo(() => {
    return scratches.filter(item => {
      const partKey = getPartKey(item.carPart)
      const matchPart = activePart === 'all' || partKey === activePart
      const matchQuery = !query || getPartLabel(item.carPart).includes(query)
      return matchPart && matchQuery
    })
  }, [scratches, activePart, query])

  const handleSubmit = async () => {
    if (!selectedLogId) return
    setSubmitting(true)
    setSubmitError('')
    try {
      await submitDefense(reservation.reservationId, disputeId, selectedLogId)
      setSubmitted(true)
      setTimeout(() => {
        if (reservation?.reservationId) {
          localStorage.removeItem(`disputePending_${reservation.reservationId}`)
          localStorage.removeItem(`disputeDate_${reservation.reservationId}`)
        }
        navigate('/my-car')
      }, 2200)
    } catch (err) {
      setSubmitError(err.response?.data?.message || '제출에 실패했어요. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) return (
    <div className="dh-submit-page">
      <div className="dh-submit-icon">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h2 className="dh-submit-title">{t('dispute.submittedTitle')}</h2>
      <p className="dh-submit-desc">
        선택한 흠집 기록을<br/>
        임대인에게 전송했어요.<br/>
        검토 후 분쟁 결과를 알려드려요.
      </p>
    </div>
  )

  return (
    <div className="dh-page">
      <header className="dh-header">
        <button className="dh-back" onClick={() => navigate(-1)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#111" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <img src={careLogo} alt="CARe" className="dh-logo" />
        <div style={{ width: 38 }} />
      </header>

      <div className="dh-scroll">
        <div className="dh-title-area">
          <h1 className="dh-title">이전 흠집 기록</h1>
          <p className="dh-subtitle">
            반납 전부터 있던 흠집을 선택해<br/>임대인에게 증거로 제출하세요.
          </p>
        </div>

        <div className="dh-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="#bbb" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke="#bbb" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            className="dh-search-input"
            placeholder={t('dispute.searchPlaceholder')}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button className="dh-search-clear" onClick={() => setQuery('')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="#bbb" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        <div className="dh-filter-row">
          {PARTS.map(part => (
            <button
              key={part.id}
              className={`dh-filter-tab${activePart === part.id ? ' active' : ''}`}
              onClick={() => setActivePart(part.id)}
            >
              {part.label}
            </button>
          ))}
        </div>

        {loading && <div className="dh-empty"><p>흠집 기록을 불러오는 중...</p></div>}

        {!loading && filtered.length === 0 && (
          <div className="dh-empty"><p>흠집 기록이 없어요</p></div>
        )}

        <div className="dh-list">
          {filtered.map((item, idx) => (
            <div
              key={item.logId}
              className={`dh-item${selectedLogId === item.logId ? ' dh-item-selected' : ''}`}
            >
              <div className="dh-item-header">
                <button
                  className={`dh-checkbox${selectedLogId === item.logId ? ' checked' : ''}`}
                  onClick={() => setSelectedLogId(prev => prev === item.logId ? null : item.logId)}
                >
                  {selectedLogId === item.logId && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3"
                        strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>

                <button
                  className="dh-item-info"
                  onClick={() => setExpanded(expanded === item.logId ? null : item.logId)}
                >
                  <div className="dh-item-top">
                    <span className="dh-item-num">{getPartLabel(item.carPart)}</span>
                    <span className={`dh-location-badge loc-${getPartKey(item.carPart).toLowerCase()}`}>
                      {PARTS.find(p => p.id === getPartKey(item.carPart))?.label}
                    </span>
                  </div>
                  <div className="dh-item-bottom">
                    <span className="dh-item-desc">{LOG_TYPE_LABEL[item.logType] || item.logType}</span>
                    <span className="dh-item-date">{formatDate(item.createdAt)}</span>
                  </div>
                </button>

                <svg
                  width="18" height="18" viewBox="0 0 24 24" fill="none"
                  className={`dh-chevron${expanded === item.logId ? ' open' : ''}`}
                  style={{ flexShrink: 0, cursor: 'pointer' }}
                  onClick={() => setExpanded(expanded === item.logId ? null : item.logId)}
                >
                  <path d="M6 9l6 6 6-6" stroke="#ccc" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {expanded === item.logId && (
                <div className="dh-item-body">
                  {item.cropS3Url ? (
                    <>
                      {/* 수정된 부분: 불필요한 플레이스홀더 제거, 실제 이미지와 검증 뱃지만 노출 */}
                      <img
                        src={item.cropS3Url}
                        alt="흠집 사진"
                        style={{ width: '100%', borderRadius: 8, marginBottom: 8 }}
                      />
                      {item.proofIpfsCid && (
                        <div className="dh-blockchain-row">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L3 7L12 12L21 7L12 2Z" stroke="#F7A633"
                              strokeWidth="2" strokeLinejoin="round"/>
                            <path d="M3 17L12 22L21 17M3 12L12 17L21 12"
                              stroke="#F7A633" strokeWidth="2" strokeLinejoin="round"/>
                          </svg>
                          <span className="dh-blockchain-text">
                            검증 완료 · {item.proofIpfsCid.slice(0, 10)}...
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="dh-no-photo">사진 기록 없음</p>
                  )}
                  <button
                    className={`dh-select-btn${selectedLogId === item.logId ? ' selected' : ''}`}
                    onClick={() => setSelectedLogId(prev => prev === item.logId ? null : item.logId)}
                  >
                    {selectedLogId === item.logId ? t('dispute.selected') : t('dispute.select')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {submitError && (
          <p style={{ color: '#FF4D4F', textAlign: 'center', padding: '8px 16px' }}>{submitError}</p>
        )}

        <div style={{ height: 140 }} />
      </div>

      <div className="dh-footer">
        {selectedLogId ? (
          <button className="dh-submit-btn" onClick={handleSubmit} disabled={submitting}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {submitting ? t('dispute.submitting') : t('dispute.submitBtn')}
          </button>
        ) : (
          <button className="dh-main-btn" onClick={() => {
            if (reservation?.reservationId) {
              localStorage.removeItem(`disputePending_${reservation.reservationId}`)
              localStorage.removeItem(`disputeDate_${reservation.reservationId}`)
            }
            navigate('/my-car')
          }}>
            {t('dispute.goMain')}
          </button>
        )}
      </div>
    </div>
  )
}