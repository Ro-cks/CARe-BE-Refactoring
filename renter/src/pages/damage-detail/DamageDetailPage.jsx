import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import BottomNav from '../../components/BottomNav'
import './DamageDetailPage.css'

const LOCATION_LABELS = {
  FRONT: '전면부',
  REAR: '후면부',
  LEFT: '좌측',
  RIGHT: '우측',
  ROOF: '루프',
  HOOD: '보닛',
}

const STATUS_LABELS = {
  PENDING: '미처리',
  RESOLVED: '처리완료',
  IN_PROGRESS: '처리중',
}

export default function DamageDetailPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const location = state?.location || 'FRONT'
  const scratches = state?.scratches || []
  const focusId = state?.focusId

  const [expanded, setExpanded] = useState(focusId || null)

  const locationLabel = LOCATION_LABELS[location] || location

  return (
    <div className="dd-page">
      {/* 헤더 */}
      <header className="dd-header">
        <button className="dd-back" onClick={() => navigate(-1)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#111" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="dd-title">{locationLabel} 흠집 상세 내역</h1>
      </header>

      <div className="dd-scroll">
        {/* 안내 문구 */}
        <div className="dd-info-box">
          <p className="dd-info-text">
            최신 제보 내역부터 타임라인 형태로 표시됩니다. 항목을 눌러 상세 정보를 확인하세요.
          </p>
        </div>

        {/* 타임라인 */}
        {scratches.length === 0 ? (
          <div className="dd-empty">흠집 내역이 없습니다.</div>
        ) : (
          <div className="dd-timeline">
            {scratches.map((s, idx) => {
              const isExpanded = expanded === s.scratchId
              const isLast = idx === scratches.length - 1
              return (
                <div key={s.scratchId} className={`dd-timeline-item${isLast ? ' last' : ''}`}>
                  {/* 타임라인 라인 */}
                  <div className="dd-tl-line-wrap">
                    <div className={`dd-tl-dot ${s.status === 'PENDING' ? 'dot-pending' : s.status === 'IN_PROGRESS' ? 'dot-progress' : 'dot-resolved'}`}/>
                    {!isLast && <div className="dd-tl-line"/>}
                  </div>

                  {/* 카드 */}
                  <div className={`dd-card${isExpanded ? ' expanded' : ''}`}>
                    <button
                      className="dd-card-header"
                      onClick={() => setExpanded(isExpanded ? null : s.scratchId)}
                    >
                      <div className="dd-card-title-row">
                        <span className="dd-reporter">{s.reporterName || '작성자 미상'}</span>
                        <span className={`dd-status-badge ${s.status === 'PENDING' ? 'badge-pending' : s.status === 'IN_PROGRESS' ? 'badge-progress' : 'badge-resolved'}`}>
                          {STATUS_LABELS[s.status] || s.status}
                        </span>
                      </div>
                      <div className="dd-card-meta-row">
                        <span className="dd-date">{s.reportedAt}</span>
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none"
                          className={`dd-chevron${isExpanded ? ' open' : ''}`}
                        >
                          <path d="M6 9l6 6 6-6" stroke="#ccc" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="dd-card-body">
                        {/* 사진 */}
                        {s.imageUrl ? (
                          <img src={s.imageUrl} alt="흠집 사진" className="dd-scratch-img"/>
                        ) : (
                          <div className="dd-scratch-img-placeholder">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"
                                fill="#ccc"/>
                            </svg>
                            <span>사진 없음</span>
                          </div>
                        )}

                        {/* 설명 */}
                        <p className="dd-scratch-desc">
                          {s.description || '상세 설명이 없습니다.'}
                        </p>

                        {/* 크기/위치 정보 */}
                        {(s.size || s.exactLocation) && (
                          <div className="dd-scratch-meta">
                            {s.exactLocation && (
                              <div className="dd-meta-item">
                                <span className="dd-meta-label">위치</span>
                                <span className="dd-meta-value">{s.exactLocation}</span>
                              </div>
                            )}
                            {s.size && (
                              <div className="dd-meta-item">
                                <span className="dd-meta-label">크기</span>
                                <span className="dd-meta-value">{s.size}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ height: 40 }} />
      </div>

      <BottomNav />
    </div>
  )
}
