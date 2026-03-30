import React from 'react'
import { useNavigate } from 'react-router-dom'
import './ReservationList.css'

export default function ReservationList({ reservations }) {
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
            <th>차량</th>
            <th>대여자</th>
            <th>예약일</th>
            <th>금액</th>
            <th>상태</th>
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
                  {reservation.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
