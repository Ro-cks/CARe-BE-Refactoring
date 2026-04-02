import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import CompanyService from '../../services/CompanyService'
import './DashboardPage.css'

/* 월별 수익 폴백 데이터 (API 없음) */
const MONTHLY = [
  { month: '10월', value: 6800000  },
  { month: '11월', value: 4200000  },
  { month: '12월', value: 9100000  },
  { month: '1월',  value: 5500000  },
  { month: '2월',  value: 7800000  },
  { month: '3월',  value: 12500000 },
]

const W = 600, H = 220, PAD = 40

function SplineChart({ data }) {
  const [hovered, setHovered] = useState(null)

  const max = Math.max(...data.map(d => d.value))
  const min = Math.min(...data.map(d => d.value))
  const range = max - min || 1

  const pts = data.map((d, i) => ({
    x: PAD + (i / (data.length - 1)) * (W - PAD * 2),
    y: PAD + (1 - (d.value - min) / range) * (H - PAD * 2),
    ...d,
  }))

  const toPath = (points) => {
    let d = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[Math.min(i + 2, points.length - 1)]
      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
    }
    return d
  }

  const linePath = toPath(pts)
  const areaPath = linePath + ` L ${pts[pts.length-1].x} ${H} L ${pts[0].x} ${H} Z`
  const hiPt     = pts[pts.length - 1]
  const tip      = hovered ?? null

  const tipX = tip ? Math.min(Math.max(tip.x - 52, 4), W - 108) : 0
  const tipY = tip ? tip.y - 48 : 0

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="spline-svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#F5A623" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#F5A623" stopOpacity="0" />
        </linearGradient>
        <filter id="glowF">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {[0.25, 0.5, 0.75, 1].map(t => (
        <line key={t}
          x1={PAD} x2={W - PAD}
          y1={PAD + (1-t)*(H-PAD*2)} y2={PAD + (1-t)*(H-PAD*2)}
          stroke="#ede8e0" strokeWidth="1" strokeDasharray="4 4"
        />
      ))}

      <path d={areaPath} fill="url(#areaGrad)" />
      <path d={linePath} fill="none" stroke="#F5A623" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" className="chart-line-path" />

      {pts.map((pt, i) => (
        <g key={i}
          onMouseEnter={() => setHovered(pt)}
          onMouseLeave={() => setHovered(null)}
          style={{ cursor: 'pointer' }}
        >
          <circle cx={pt.x} cy={pt.y} r="16" fill="transparent" />
          <circle cx={pt.x} cy={pt.y} r={hovered?.month === pt.month ? 6 : 4.5}
            fill="#fff" stroke="#F5A623"
            strokeWidth={hovered?.month === pt.month ? 3 : 2}
            style={{ transition: 'r 0.15s' }}
          />
          {pt.month === hiPt.month && (
            <circle cx={pt.x} cy={pt.y} r="9" fill="#F5A623" opacity="0.18"
              className="chart-pulse-ring" />
          )}
        </g>
      ))}

      {tip && (
        <g transform={`translate(${tipX}, ${tipY})`} className="chart-tooltip-g">
          <rect rx="8" ry="8" width="104" height="32" fill="#2d2d2d" opacity="0.9" />
          <text x="52" y="21" textAnchor="middle"
            fill="#fff" fontSize="12" fontWeight="700"
            fontFamily="-apple-system, sans-serif">
            {(tip.value / 1000000).toFixed(1)}M CARE
          </text>
        </g>
      )}
    </svg>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const [chartPeriod, setChartPeriod] = useState('monthly')
  const [companyName, setCompanyName] = useState('')

  useEffect(() => {
    CompanyService.getCompanyInfo().then(result => {
      if (result.success && result.data?.name) {
        setCompanyName(result.data.name)
      } else {
        setCompanyName(localStorage.getItem('companyName') || '')
      }
    })
  }, [])

  const rightCards = [
    { label: t('dashboard.kpiCars'),        value: '8',          sub: t('dashboard.kpiCarsSub'),        icon: '\ud83d\ude97', accent: '#F5A623' },
    { label: t('dashboard.kpiSettlement'),   value: '850,000 CARE', sub: t('dashboard.kpiSettlementSub'),  icon: '\u23f3', accent: '#fb923c' },
    { label: t('dashboard.kpiReservation'),  value: '45',         sub: t('dashboard.kpiReservationSub'),  icon: '\ud83d\udcc5', accent: '#818cf8' },
    { label: t('dashboard.kpiDispute'),      value: '1',          sub: t('dashboard.kpiDisputeSub'),      icon: '\u2696\ufe0f', accent: '#ef4444' },
  ]

  const periodOptions = [
    { id: 'monthly',   label: t('dashboard.periodMonthly') },
    { id: 'quarterly', label: t('dashboard.periodQuarterly') },
  ]

  return (
    <div className="dashboard-page">

      {/* 1. 환영 배너 */}
      <div className="dash-welcome-card">
        <div className="dash-welcome-text">
          <p className="dash-welcome-sub">{t('dashboard.greeting')}</p>
          <h2 className="dash-welcome-name">{companyName || '...'}</h2>
          <p className="dash-welcome-desc">{t('dashboard.desc')}</p>
        </div>
        <div className="dash-welcome-illo" aria-hidden>
          <span className="illo-car">{'\ud83d\ude97'}</span>
          <span className="illo-road" />
        </div>
      </div>

      {/* 2. 핵심 지표 4개 */}
      <div className="dash-kpi-grid">
        {rightCards.map((c, i) => (
          <div key={i} className="dash-kpi-card" style={{ '--ka': c.accent }}
            data-delay={i}>
            <div className="dash-kpi-icon">{c.icon}</div>
            <div>
              <div className="dash-kpi-value">{c.value}</div>
              <div className="dash-kpi-label">{c.label}</div>
              <div className="dash-kpi-sub">{c.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. 수익 추이 그래프 */}
      <div className="dash-chart-card">
        <div className="dash-chart-header">
          <div>
            <div className="dash-chart-title">{t('dashboard.chartTitle')}</div>
            <div className="dash-chart-sub">{t('dashboard.chartSubtitle')}</div>
          </div>
          <div className="dash-period-tabs">
            {periodOptions.map(p => (
              <button key={p.id}
                className={`dash-period-btn${chartPeriod === p.id ? ' active' : ''}`}
                onClick={() => setChartPeriod(p.id)}
              >{p.label}</button>
            ))}
          </div>
        </div>

        <div className="dash-chart-labels">
          {MONTHLY.map(d => (
            <span key={d.month} className="dash-chart-month">{d.month}</span>
          ))}
        </div>

        <SplineChart data={MONTHLY} />

        <div className="dash-chart-footer">
          <div className="dash-chart-stat">
            <span className="dash-chart-stat-value">12.5M</span>
            <span className="dash-chart-stat-label">{t('dashboard.statThisMonth')}</span>
          </div>
          <div className="dash-chart-divider" />
          <div className="dash-chart-stat">
            <span className="dash-chart-stat-value">+60%</span>
            <span className="dash-chart-stat-label">{t('dashboard.statVsPrev')}</span>
          </div>
          <div className="dash-chart-divider" />
          <div className="dash-chart-stat">
            <span className="dash-chart-stat-value">45.9M</span>
            <span className="dash-chart-stat-label">{t('dashboard.statSixMonth')}</span>
          </div>
        </div>
      </div>

    </div>
  )
}
