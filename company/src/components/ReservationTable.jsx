import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { shortId } from '../utils/formatId'
import './ReservationTable.css'

const RAW_STATUS_MAP = {
  IN_USE: 'ongoing',
  AFTER_SCAN: 'waiting',
  COMPLETED: 'completed',
  RESERVED: 'reserved',
  DISPUTE: 'dispute'
}

function StatusBadge({ rawStatus, label }) {
  const cls = RAW_STATUS_MAP[rawStatus] ?? 'reserved'
  return <span className={`res-status-badge ${cls}`}>{label}</span>
}

export default function ReservationTable({ reservations = [], sortOrder = 'desc', onSortToggle }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  /* 빈 상태 */
  if (reservations.length === 0) {
    return (
      <div className="res-empty">
        <div className="res-empty-icon">📋</div>
        <p className="res-empty-text">{t('reservationTable.emptyTitle')}</p>
        <p className="res-empty-sub">{t('reservationTable.emptySub')}</p>
      </div>
    )
  }

  return (
    <table className="res-table">
      <thead>
        <tr>
          <th>{t('reservationTable.colReservationNo')}</th>
          <th>{t('reservationTable.colCar')}</th>
          <th>{t('reservationTable.colRenter')}</th>
          <th className="res-th-sortable" onClick={onSortToggle}>
              {t('reservationTable.colPeriod')} {sortOrder === 'desc' ? '↓' : '↑'}
            </th>
          <th>{t('reservationTable.colAmount')}</th>
          <th>{t('reservationTable.colStatus')}</th>
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
              <StatusBadge rawStatus={r.rawStatus || r.status} label={r.status} />
              {r.disputeStatus === 'COMPLETED' && (
                <span className="res-status-badge dispute-done" style={{ marginTop: 4, display: 'block' }}>{t('reservationTable.statusDisputeDone')}</span>
              )}
            </td>


          </tr>
        ))}
      </tbody>
    </table>
  )
}