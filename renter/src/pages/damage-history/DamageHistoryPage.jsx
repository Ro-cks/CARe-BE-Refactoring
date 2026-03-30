import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import BottomNav from '../../components/BottomNav'
import { getCarScratches, getCarScratchHistory } from '../../api/reservation'
import carIconTop from '../../assets/car_icon_top.png'
import './DamageHistoryPage.css'

const LOCATION_LABELS = {
  FRONT: '전면부', front: '전면부',
  REAR: '후면부',  rear: '후면부',
  LEFT: '좌측',   left: '좌측',
  RIGHT: '우측',  right: '우측',
  ROOF: '루프',
  HOOD: '보닛',
}

const LOCATION_MARKERS = {
  FRONT: { top: 14, left: 50 }, front: { top: 14, left: 50 },
  REAR:  { top: 82, left: 50 }, rear:  { top: 82, left: 50 },
  LEFT:  { top: 50, left: 20 }, left:  { top: 50, left: 20 },
  RIGHT: { top: 50, left: 80 }, right: { top: 50, left: 80 },
  ROOF:  { top: 50, left: 50 },
  HOOD:  { top: 24, left: 50 },
}

const MOCK_HISTORY = [
  {
    reservationId: 'R001',
    renterName: '김*영',
    period: '2025.10.12 ~ 2025.10.15',
    isCurrent: false,
    scratches: [
      { scratchId: 101, description: '앞 범퍼 긁힘', location: 'FRONT', status: 'RESOLVED', reportedAt: '2025.10.12', blockchainHash: '0xabc...f1e2' },
    ],
  },
  {
    reservationId: 'R002',
    renterName: '이*준',
    period: '2025.11.03 ~ 2025.11.06',
    isCurrent: false,
    scratches: [
      { scratchId: 201, description: '좌측 문짝 스크래치', location: 'LEFT', status: 'RESOLVED', reportedAt: '2025.11.03', blockchainHash: '0xdef...a3b4' },
      { scratchId: 202, description: '후면 범퍼 흠집', location: 'REAR', status: 'PENDING', reportedAt: '2025.11.03', blockchainHash: '0xdef...c5d6' },
    ],
  },
]

export default function DamageHistoryPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const reservation = state?.reservation

  const [activeTab, setActiveTab] = useState('mine')

  // 내 기록
  const [myScratches, setMyScratches] = useState(state?.scratches || [])
  const [myLoading, setMyLoading] = useState(!state?.scratches)

  // 전체 이력
  const [historyGroups, setHistoryGroups] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  useEffect(() => {
    if (state?.scratches) { setMyLoading(false); return }
    if (!reservation?.reservationId) { setMyLoading(false); return }
    const fetch = async () => {
      try {
        const data = await getCarScratches(reservation.reservationId)
        setMyScratches(Array.isArray(data) ? data : data?.data || [])
      } catch {
        setMyScratches([
          { scratchId: 1, description: '앞 범퍼 스크래치', location: 'FRONT', status: 'PENDING', reportedAt: '2025.01.15', blockchainHash: '0x1a2b...3c4d' },
          { scratchId: 2, description: '우측 사이드미러 흠집', location: 'RIGHT', status: 'PENDING', reportedAt: '2025.01.15', blockchainHash: '0x5e6f...7a8b' },
        ])
      } finally {
        setMyLoading(false)
      }
    }
    fetch()
  }, [reservation, state])

  useEffect(() => {
    if (activeTab !== 'history' || historyLoaded) return
    if (!reservation?.carId) {
      setHistoryGroups([
        ...MOCK_HISTORY,
        {
          reservationId: reservation?.reservationId || 'R_CURRENT',
          renterName: '나 (현재 예약)',
          period: '2025.01.15 ~ 2025.01.18',
          isCurrent: true,
          scratches: myScratches,
        },
      ])
      setHistoryLoaded(true)
      return
    }
    setHistoryLoading(true)
    const fetch = async () => {
      try {
        const data = await getCarScratchHistory(reservation.carId)
        const raw = Array.isArray(data) ? data : data?.data || []
        const groups = raw.map(g => ({ ...g, isCurrent: g.reservationId === reservation.reservationId }))
        if (!groups.find(g => g.isCurrent)) {
          groups.push({
            reservationId: reservation.reservationId,
            renterName: '나 (현재 예약)',
            period: '현재 예약',
            isCurrent: true,
            scratches: myScratches,
          })
        }
        setHistoryGroups(groups)
      } catch {
        setHistoryGroups([
          ...MOCK_HISTORY,
          {
            reservationId: reservation?.reservationId || 'R_CURRENT',
            renterName: '나 (현재 예약)',
            period: '2025.01.15 ~ 2025.01.18',
            isCurrent: true,
            scratches: myScratches,
          },
        ])
      } finally {
        setHistoryLoading(false)
        setHistoryLoaded(true)
      }
    }
    fetch()
  }, [activeTab, historyLoaded, reservation, myScratches])

  const myLocationGroups = myScratches.reduce((acc, s) => {
    const loc = s.location
    if (!acc[loc]) acc[loc] = []
    acc[loc].push(s)
    return acc
  }, {})
  const myPendingCount = myScratches.filter(s => s.status === 'PENDING').length
  const myResolvedCount = myScratches.filter(s => s.status === 'RESOLVED').length

  return (
    <div className="dh-page">
      <header className="dh-header">
        <button className="dh-back" onClick={() => navigate(-1)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#111" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="dh-title">차량 흠집 내역</h1>
        <span className="dh-verified-badge">blockchain verified</span>
      </header>

      <div className="dh-tab-bar">
        <button
          className={"dh-tab-btn" + (activeTab === 'mine' ? ' active' : '')}
          onClick={() => setActiveTab('mine')}
        >
          내 기록
        </button>
        <button
          className={"dh-tab-btn" + (activeTab === 'history' ? ' active' : '')}
          onClick={() => setActiveTab('history')}
        >
          전체 히스토리
        </button>
        <div className={"dh-tab-indicator" + (activeTab === 'history' ? ' right' : '')}/>
      </div>

      <div className="dh-scroll">
        {activeTab === 'mine' && (
          <>
            <div className="dh-top-section">
              <h2 className="dh-heading">내 예약 흠집</h2>
              <p className="dh-sub">총 <strong>{myScratches.length}건</strong>의 흠집이 기록되었습니다.</p>
            </div>

            <div className="dh-diagram-section">
              <div className="dh-diagram-wrap">
                <div className="dh-car-diagram">
                  <img src={carIconTop} alt="차량 상단뷰" className="dh-car-img" />
                  {Object.entries(myLocationGroups).map(([loc, items]) => {
                    const pos = LOCATION_MARKERS[loc] || { top: 50, left: 50 }
                    const hasPending = items.some(i => i.status === 'PENDING')
                    return (
                      <button
                        key={loc}
                        className={"dh-marker" + (hasPending ? ' pending' : ' resolved')}
                        style={{ top: pos.top + '%', left: pos.left + '%' }}
                        onClick={() => navigate('/damage-detail', {
                          state: { location: loc, scratches: items, reservation }
                        })}
                      >
                        <span className="dh-marker-count">{items.length}</span>
                      </button>
                    )
                  })}
                  {myScratches.length === 0 && !myLoading && (
                    <div className="dh-no-marker-msg">흠집 없음</div>
                  )}
                </div>
              </div>
            </div>

            <div className="dh-ai-card">
              <div className="dh-ai-title-row">
                <span className="dh-ai-icon">✨</span>
                <span className="dh-ai-title">AI 차량 상태 진단</span>
              </div>
              <p className="dh-ai-desc">
                {myScratches.length === 0
                  ? '이번 예약에서 발견된 흠집이 없습니다.'
                  : <span>데이터 분석 결과, <strong>{myPendingCount}건의 미처리 흠집</strong>이 존재합니다.<br/>상세 내역을 확인하고 수리를 계획해 보세요.</span>
                }
              </p>
              <div className="dh-ai-stats">
                <div className="dh-ai-stat">
                  <span className="dh-ai-stat-dot pending-dot"/>
                  <span className="dh-ai-stat-label">미처리</span>
                  <span className="dh-ai-stat-count">{myPendingCount}건</span>
                </div>
                <div className="dh-ai-stat-divider"/>
                <div className="dh-ai-stat">
                  <span className="dh-ai-stat-dot resolved-dot"/>
                  <span className="dh-ai-stat-label">처리 완료</span>
                  <span className="dh-ai-stat-count">{myResolvedCount}건</span>
                </div>
              </div>
            </div>

            {myLoading ? (
              <div className="dh-list-loading"><div className="dh-spinner"/></div>
            ) : myScratches.length === 0 ? (
              <div className="dh-list-empty">
                <span className="dh-empty-icon">🚗</span>
                <p>이번 예약에서 발견된 흠집이 없어요</p>
              </div>
            ) : (
              <div className="dh-list">
                {myScratches.map(s => (
                  <button
                    key={s.scratchId}
                    className="dh-list-item"
                    onClick={() => navigate('/damage-detail', {
                      state: {
                        location: s.location,
                        scratches: myScratches.filter(x => x.location === s.location),
                        reservation,
                        focusId: s.scratchId,
                      }
                    })}
                  >
                    <div className="dh-item-left">
                      <span className={"dh-status-dot " + (s.status === 'PENDING' ? 'pending-dot' : 'resolved-dot')}/>
                      <div>
                        <p className="dh-item-desc">{s.description}</p>
                        <p className="dh-item-meta">
                          {LOCATION_LABELS[s.location] || s.location} · {s.reportedAt}
                        </p>
                        {s.blockchainHash && (
                          <p className="dh-item-hash">{s.blockchainHash}</p>
                        )}
                      </div>
                    </div>
                    <div className="dh-item-right">
                      <span className={"dh-status-badge " + (s.status === 'PENDING' ? 'badge-pending' : 'badge-resolved')}>
                        {s.status === 'PENDING' ? '미처리' : '처리완료'}
                      </span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M9 18l6-6-6-6" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <>
            <div className="dh-top-section">
              <h2 className="dh-heading">차량 전체 흠집 이력</h2>
              <p className="dh-sub">이전 임차인들의 흠집 기록을 확인하세요.</p>
            </div>

            {historyLoading ? (
              <div className="dh-list-loading"><div className="dh-spinner"/></div>
            ) : historyGroups.length === 0 ? (
              <div className="dh-list-empty">
                <span className="dh-empty-icon">📋</span>
                <p>기록된 흠집 이력이 없어요</p>
              </div>
            ) : (
              <div className="dh-history-groups">
                {historyGroups.map(group => (
                  <div key={group.reservationId} className={"dh-history-group" + (group.isCurrent ? ' current' : '')}>
                    <div className="dh-history-group-header">
                      <div className="dh-history-group-info">
                        <span className="dh-history-renter">{group.renterName}</span>
                        <span className="dh-history-period">{group.period}</span>
                      </div>
                      <div className="dh-history-header-right">
                        {group.isCurrent && (
                          <span className="dh-current-badge">현재 예약</span>
                        )}
                        <span className="dh-history-count">{group.scratches?.length || 0}건</span>
                      </div>
                    </div>

                    {group.scratches?.length > 0 ? (
                      <div className="dh-history-items">
                        {group.scratches.map(s => (
                          <div key={s.scratchId} className="dh-history-item">
                            <div className="dh-history-item-left">
                              <span className={"dh-status-dot " + (s.status === 'PENDING' ? 'pending-dot' : 'resolved-dot')}/>
                              <div>
                                <p className="dh-item-desc">{s.description}</p>
                                <p className="dh-item-meta">
                                  {LOCATION_LABELS[s.location] || s.location} · {s.reportedAt}
                                </p>
                                {s.blockchainHash && (
                                  <p className="dh-item-hash">{s.blockchainHash}</p>
                                )}
                              </div>
                            </div>
                            <span className={"dh-status-badge " + (s.status === 'PENDING' ? 'badge-pending' : 'badge-resolved')}>
                              {s.status === 'PENDING' ? '미처리' : '처리완료'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="dh-history-no-scratch">이 예약에서 발견된 흠집 없음</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div style={{ height: 40 }} />
      </div>

      <BottomNav />
    </div>
  )
}
