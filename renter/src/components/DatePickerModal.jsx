import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import './DatePickerModal.css'

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay()
}

export default function DatePickerModal({ open, label, onClose, onSelect }) {
  const { t } = useTranslation()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const daysLabels = t('home.datePicker.days', { returnObjects: true }) || ['일', '월', '화', '수', '목', '금', '토']

  if (!open) return null

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const isPastDate = (day) => {
    if (!day) return false
    const selected = new Date(year, month, day)
    const todayMidnight = new Date()
    todayMidnight.setHours(0, 0, 0, 0)
    return selected < todayMidnight
  }

  const handleSelect = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onSelect(dateStr)
  }

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="datepicker-overlay" onClick={onClose}>
      <div className="datepicker-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="datepicker-label">{label}</h3>
        <div className="datepicker-nav">
          <button onClick={prevMonth}>&#8592;</button>
          <span>{year}{t('home.datePicker.year')} {month + 1}{t('home.datePicker.month')}</span>
          <button onClick={nextMonth}>&#8594;</button>
        </div>
        <div className="datepicker-days-header">
          {daysLabels.map((d, i) => <span key={d} className={i === 0 ? 'sun' : i === 6 ? 'sat' : ''}>{d}</span>)}
        </div>
        <div className="datepicker-grid">
          {cells.map((day, i) => (
            <button
              key={i}
              className={`day-cell${day === null ? ' empty' : ''}${
                isPastDate(day) ? ' disabled' : ''
              }${
                day && day === today.getDate() && month === today.getMonth() && year === today.getFullYear() ? ' today' : ''
              }`}
              onClick={() => day && !isPastDate(day) && handleSelect(day)}
              disabled={!day || isPastDate(day)}
            >
              {day || ''}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
