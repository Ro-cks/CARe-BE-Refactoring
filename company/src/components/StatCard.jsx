import React from 'react'
import './StatCard.css'

export default function StatCard({ title, value, subtitle, icon, trend }) {
  return (
    <div className="stat-card card">
      <div className="stat-header">
        <span className="stat-title">{title}</span>
        <span className="stat-icon">{icon}</span>
      </div>

      <div className="stat-value">{value}</div>

      {subtitle && (
        <div className="stat-subtitle">{subtitle}</div>
      )}

      {trend && (
        <div className={`stat-trend ${trend.type}`}>
          <span className="trend-icon">{trend.type === 'up' ? '📈' : '📊'}</span>
          <span className="trend-text">{trend.text}</span>
        </div>
      )}
    </div>
  )
}
