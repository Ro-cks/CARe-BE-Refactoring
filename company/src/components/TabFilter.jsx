import React from 'react'
import './TabFilter.css'

export default function TabFilter({ tabs, activeTab, onTabChange }) {
  return (
    <div className="tab-filter">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="tab-count">({tab.count})</span>
          )}
        </button>
      ))}
    </div>
  )
}
