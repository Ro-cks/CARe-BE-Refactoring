import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyReservations, getDisputeDetail } from '../../api/reservation'
import BottomNav from '../../components/BottomNav'
import './MyDisputesPage.css'

const STATUS_META = {
  OPEN:      { label: '분쟁 진행 중', color: '#F7A633' },
  PENDING:   { label: '처리 중',     color: '#5B8DEF' },
  DEFENDED:  { label: '이의 신청됨', color: '#5B8DEF' },
  RESOLVED:  { label: '해결됨',      color: '#4CAF50' },
  COMPLETED: { label: '분쟁 완료',   color: '#888'    },
  REJECTED:  { label: '기각됨',      color: '#888'    },
}

const PART_LABELS = {
  front: '전면부', FRONT: '전면부',
  rear:  '후면부', REAR:  '후면부',
  left:  '좌측',  LEFT:  '좌측',
  right: '우측',  RIGHT: '우측',
  roof:  '루프',  ROOF:  '루프',
  hood:  '보닛',  HOOD:  '보닛',
}

function fmtDate(val) {
  if (!val) return '--'
  const d = new Date(val)
  if (isNaN(d.getTime())) return '--'
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
}

export default function MyDisputesPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getMyReservations()
      .then(async (reservations) => {
        const withDispute = (Array.isArray(reservations) ? reservations : []).filter(r => r.disputeId)
        const results = await Promise.all(
          withDispute.map(r =>
            getDisputeDetail(r.reservationId, r.disputeId)
              .then(dispute => ({ reservation: r, dispute }))
              .catch(() => null)
          )
        )
        if (!cancelled) {
          setItems(results.filter(Boolean).sort((a, b) => {
            const ta = a.dispute.createdAt ? new Date(a.dispute.createdAt).getTime() : 0
            const tb = b.dispute.createdAt ? new Date(b.dispute.createdAt).getTime() : 0
            return tb - ta
          }))
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="myd-page">
      <div className="myd-header">
        <button className="myd-back" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="#111" />
          </svg>
        </button>
        <h1 className="myd-title">분쟁 내역</h1>
      </div>

      <div className="myd-body">
        {loading && <p className="myd-empty">불러오는 중...</p>}

        {!loading && items.length === 0 && (
          <p className="myd-empty">분쟁 내역이 없어요.</p>
        )}

        {items.map(({ reservation: r, dispute: d }) => {
          const meta = STATUS_META[d.status] || STATUS_META.OPEN
          const part = PART_LABELS[d.targetCarPart] || d.targetCarPart || '위치 미상'
          return (
            <div
              key={d.disputeId}
              className="myd-card"
              onClick={() => navigate('/dispute', { state: { reservation: r, disputeId: d.disputeId } })}
            >
              <div className="myd-card-top">
                <span className="myd-car-name">{r.brand} {r.modelName}</span>
                <span className="myd-status" style={{ color: meta.color }}>{meta.label}</span>
              </div>

              <p className="myd-plate">
                {r.plateNumber}
                {r.reservationId && (
                  <span className="myd-res-id"> · {String(r.reservationId).slice(0, 8).toUpperCase()}</span>
                )}
              </p>

              <div className="myd-info-row">
                <span className="myd-info-label">부위</span>
                <span className="myd-part">{part}</span>
              </div>

              {d.reason && (
                <div className="myd-info-row">
                  <span className="myd-info-label">사유</span>
                  <span className="myd-reason">{d.reason}</span>
                </div>
              )}

              <div className="myd-info-row">
                <span className="myd-info-label">청구 금액</span>
                <span className="myd-amount">{d.claimAmount?.toLocaleString()} CARE</span>
              </div>

              <p className="myd-date">신청일 {fmtDate(d.createdAt)}</p>

              <button
                className="myd-detail-btn"
                onClick={e => {
                  e.stopPropagation()
                  navigate('/dispute', { state: { reservation: r, disputeId: d.disputeId } })
                }}
              >
                분쟁 상세 보기 →
              </button>
            </div>
          )
        })}
      </div>

      <BottomNav />
    </div>
  )
}
