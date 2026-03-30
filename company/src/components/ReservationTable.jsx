import { useNavigate } from 'react-router-dom'
import { shortId } from '../utils/formatId'
import './ReservationTable.css'

/* 상태 문자열 → badge 클래스명 + 표시 텍스트 */
const STATUS_MAP = {
  '이용중':   { cls: 'ongoing',   label: '이용중'   },
  '반납대기': { cls: 'waiting',   label: '반납대기' },
  '반납완료': { cls: 'completed', label: '반납완료' },
  '예약완료': { cls: 'reserved',  label: '예약완료' },
  '분쟁중':   { cls: 'dispute',   label: '분쟁중'   },
}

function StatusBadge({ status }) {
  const { cls, label } = STATUS_MAP[status] ?? { cls: 'reserved', label: status }
  return <span className={`res-status-badge ${cls}`}>{label}</span>
}

export default function ReservationTable({ reservations = [], sortOrder = 'desc', onSortToggle }) {
  const navigate = useNavigate()

  /* 빈 상태 */
  if (reservations.length === 0) {
    return (
      <div className="res-empty">
        <div className="res-empty-icon">📋</div>
        <p className="res-empty-text">예약 내역이 없습니다.</p>
        <p className="res-empty-sub">해당 카테고리에 예약이 존재하지 않아요.</p>
      </div>
    )
  }

  return (
    <table className="res-table">
      <thead>
        <tr>
          <th>예약번호</th>
          <th>차량</th>
          <th>임차인</th>
          <th className="res-th-sortable" onClick={onSortToggle}>
              대여 기간 {sortOrder === 'desc' ? '↓' : '↑'}
            </th>
          <th>금액</th>
          <th>상태</th>
        </tr>
      </thead>
      <tbody>
        {reservations.map((r) => (
          <tr key={r.id} className="res-table-row" onClick={() => navigate(`/reservations/${r.id}`)}>

            {/* 예약번호 */}
            <td>
              <span className="res-id-text">{shortId(r.id)}</span>
            </td>

            {/* 차량 */}
            <td>
              <div className="res-car-cell">
                <div className="res-car-icon-wrap">
                    {r.thumbnailUrl
                      ? <img src={r.thumbnailUrl} alt={r.carName} className="res-car-thumbnail" />
                      : '🚗'}
                  </div>
                <div>
                  <div className="res-car-name">{r.carName}</div>
                  <div className="res-car-plate">{r.carType}</div>
                </div>
              </div>
            </td>

            {/* 임차인 */}
            <td>
              <div className="res-renter-name">{r.renterName}</div>
              <div className="res-renter-country">{r.renterCountry}</div>
            </td>

            {/* 기간 */}
            <td>
              <div className="res-date-range">
                <span className="res-date-start">{r.startDate}</span>
                <span className="res-date-end">~ {r.endDate}</span>
              </div>
            </td>

            {/* 금액 */}
            <td>
              <span className="res-amount">{r.amount}</span>
            </td>

            {/* 상태 */}
            <td>
              <StatusBadge status={r.status} />
              {r.disputeStatus === 'COMPLETED' && (
                <span className="res-status-badge dispute-done" style={{ marginTop: 4, display: 'block' }}>분쟁완료</span>
              )}
            </td>


          </tr>
        ))}
      </tbody>
    </table>
  )
}