import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './ReservationList.css'

export default function ReservationList({ reservations }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const getStatusBadge = (status) => {
    const statusMap = {
      '이용중': 'badge-blue',
      '예약완료': 'badge-green',
      '반납완료': 'badge-gray',
      '분쟁중': 'badge-red',
    }
    return statusMap[status] || 'badge-gray'
  }

  const handleRowClick = (reservationId) => {
    navigate(`/reservations/${reservationId}`)
  }

  return (
    <div className="reservation-table-container">
      <table className="reservation-table">
        <thead>
          <tr>
            <th>{t('reservationList.colCar')}</th>
            <th>{t('reservationList.colRenter')}</th>
            <th>{t('reservationList.colDate')}</th>
            <th>{t('reservationList.colAmount')}</th>
            <th>{t('reservationList.colStatus')}</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((reservation) => (
            <tr key={reservation.id} onClick={() => handleRowClick(reservation.id)}>
              <td>
                <div className="cell-primary">{reservation.carName}</div>
              </td>
              <td>
                <div className="cell-text">{reservation.customerName}</div>
              </td>
              <td>
                <div className="cell-text">{reservation.date}</div>
              </td>
              <td>
                <div className="cell-amount">{reservation.amount}</div>
              </td>
              <td>
                <span className={`badge ${getStatusBadge(reservation.status)}`}>
                  {reservation.status === '이용중' ? t('reservationList.statusInUse') :
                   reservation.status === '예약완료' ? t('reservationList.statusReserved') :
                   reservation.status === '반납완료' ? t('reservationList.statusReturned') :
                   reservation.status === '분쟁중' ? t('reservationList.statusDispute') : reservation.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
