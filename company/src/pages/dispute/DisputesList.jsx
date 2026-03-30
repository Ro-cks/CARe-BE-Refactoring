import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DisputeService from '../../services/DisputeService'
import { shortId } from '../../utils/formatId'
import './DisputesList.css'

// API 실패 또는 데이터 없을 때 사용하는 폴백
const MOCK_DISPUTES = [
  { id: '1', disputeId: 'DSP-2603-01', reservationId: 'RES-2603-05', carName: 'Polestar 2', carNumber: '333마 4444', renterName: '정민수', issueType: '차량 파손', status: 'open', createdDate: '2026-03-26', amount: 350000 },
  { id: '2', disputeId: 'DSP-2603-02', reservationId: 'RES-2603-12', carName: 'Tesla Model 3', carNumber: '123가 4567', renterName: '이서연', issueType: '차량 파손', status: 'completed', createdDate: '2026-03-24', amount: 150000 },
  { id: '3', disputeId: 'DSP-2603-03', reservationId: 'RES-2603-18', carName: 'Kia EV6', carNumber: '456다 7890', renterName: '박지훈', issueType: '차량 파손', status: 'open', createdDate: '2026-03-27', amount: 800000 },
  { id: '4', disputeId: 'DSP-2603-04', reservationId: 'RES-2603-22', carName: 'Genesis GV60', carNumber: '111라 2222', renterName: '최유진', issueType: '차량 파손', status: 'completed', createdDate: '2026-03-15', amount: 220000 },
]

export default function DisputesList() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all')
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDisputes()
  }, [])

  const formatDate = (isoDate) => {
    if (!isoDate) return '-'
    const date = new Date(isoDate)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const toUiStatus = (status, hasDefense) => {
    if (status === 'COMPLETED' || status === 'RESOLVED') return 'completed'
    if (hasDefense) return 'defended'
    return 'open'
  }

  const fetchDisputes = async () => {
    setLoading(true)
    try {
      const result = await DisputeService.getDisputes()

      if (!result.success || !result.data || result.data.length === 0) {
        setDisputes(MOCK_DISPUTES)
      } else {
        const formatted = result.data.map((item) => ({
          id: item.disputeId,
          disputeId: item.disputeId,
          reservationId: item.reservationId,
          carName: `${item.brand || '-'} ${item.modelName || ''}`.trim(),
          carNumber: item.plateNumber || '-',
          renterName: item.renterName || '-',
          issueType: '차량 파손', // 여기는 하드코딩 — 분쟁 유형 API 없음
          status: toUiStatus(item.status, item.hasDefense),
          createdDate: formatDate(item.createdAt),
          amount: item.claimAmount || 0
        }))
        setDisputes(formatted.length > 0 ? formatted : MOCK_DISPUTES)
      }
    } catch (err) {
      setDisputes(MOCK_DISPUTES)
    } finally {
      setLoading(false)
    }
  }

  const filteredDisputes = disputes.filter(dispute => {
    if (activeTab === 'all') return true
    if (activeTab === 'open') return dispute.status === 'open'
    if (activeTab === 'defended') return dispute.status === 'defended'
    if (activeTab === 'completed') return dispute.status === 'completed'
    return true
  })

  const stats = {
    total: disputes.length,
    open: disputes.filter(d => d.status === 'open').length,
    defended: disputes.filter(d => d.status === 'defended').length,
    completed: disputes.filter(d => d.status === 'completed').length,
    totalAmount: disputes.reduce((sum, d) => sum + d.amount, 0)
  }

  return (
    <div className="disp-list-page">
      {/* 1. 타이틀 배너 */}
      <div className="disp-welcome-card">
        <div className="disp-welcome-text">
          <h1 className="disp-title">분쟁 관리 센터</h1>
          <p className="disp-subtitle">차량 파손 등 렌터카 이용 중 발생한 이슈를 투명하게 해결하세요.</p>
        </div>
        <div className="disp-welcome-amount">
          <div className="disp-welcome-amount-label">누적 청구 금액</div>
          <div className="disp-welcome-amount-value">{stats.totalAmount.toLocaleString()}<span className="disp-welcome-amount-unit"> CARE</span></div>
        </div>
      </div>

      {/* 2. KPI 통계 카드 4열 그리드 */}
      <div className="disp-kpi-grid">
        <div className="disp-kpi-card" data-delay="0" style={{ '--ka': '#4A90E2' }}>
          <div className="disp-kpi-icon">📋</div>
          <div>
            <div className="disp-kpi-value">{stats.total}<span className="disp-kpi-unit">건</span></div>
            <div className="disp-kpi-label">전체 분쟁</div>
          </div>
        </div>
        <div className="disp-kpi-card" data-delay="1" style={{ '--ka': '#D0021B' }}>
          <div className="disp-kpi-icon">🚨</div>
          <div>
            <div className="disp-kpi-value">{stats.open}<span className="disp-kpi-unit">건</span></div>
            <div className="disp-kpi-label">처리 대기</div>
          </div>
        </div>
        <div className="disp-kpi-card" data-delay="2" style={{ '--ka': '#F5A623' }}>
          <div className="disp-kpi-icon">✋</div>
          <div>
            <div className="disp-kpi-value">{stats.defended}<span className="disp-kpi-unit">건</span></div>
            <div className="disp-kpi-label">이의신청됨</div>
          </div>
        </div>
        <div className="disp-kpi-card" data-delay="3" style={{ '--ka': '#7ED321' }}>
          <div className="disp-kpi-icon">✅</div>
          <div>
            <div className="disp-kpi-value">{stats.completed}<span className="disp-kpi-unit">건</span></div>
            <div className="disp-kpi-label">해결 완료</div>
          </div>
        </div>
      </div>

      {/* 3. 테이블 콘텐츠 영역 */}
      <div className="disp-content-card">
        <div className="disp-tab-filter">
          {['all', 'open', 'defended', 'completed'].map((tab) => (
            <button
              key={tab}
              className={`disp-tab-button ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'all' ? '전체' : tab === 'open' ? '접수됨' : tab === 'defended' ? '이의신청됨' : '해결완료'}
              <span className="disp-tab-count">
                ({tab === 'all' ? stats.total : tab === 'open' ? stats.open : tab === 'defended' ? stats.defended : stats.completed})
              </span>
            </button>
          ))}
        </div>

        <div className="disp-table-wrapper">
          {loading ? (
            <div className="disp-empty-state"><div className="loading-spinner"></div></div>
          ) : (
            <table className="disp-table">
              <thead>
                <tr>
                  <th>분쟁 ID</th>
                  <th>차량 정보</th>
                  <th>렌터</th>
                  <th>분쟁 유형</th>
                  <th>청구 금액</th>
                  <th>상태</th>
                  <th>요청일</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredDisputes.map((dispute) => (
                  <tr key={dispute.id}>
                    <td className="font-mono text-primary">{shortId(dispute.disputeId)}</td>
                    <td>
                      <div className="disp-car-name">{dispute.carName}</div>
                      <div className="disp-car-num">{dispute.carNumber}</div>
                    </td>
                    <td className="font-bold">{dispute.renterName}</td>
                    <td>
                      <span className="disp-issue-badge damage">{dispute.issueType}</span>
                    </td>
                    <td className="disp-amount">{dispute.amount.toLocaleString()} CARE</td>
                    <td>
                      <span className={`disp-status-badge ${dispute.status}`}>
                        {dispute.status === 'open' ? '접수됨' : dispute.status === 'defended' ? '이의신청됨' : '해결완료'}
                      </span>
                    </td>
                    <td className="text-muted">{dispute.createdDate}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="disp-btn-detail" onClick={() => navigate(`/disputes/${dispute.id}`)}>
                        상세보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}