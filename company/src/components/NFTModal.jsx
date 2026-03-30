import React, { useEffect } from 'react'
import './NFTModal.css'

export default function NFTModal({ isOpen, onClose, nftData }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="nft-modal-overlay" onClick={onClose}>
      <div className="nft-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="nft-modal-header">
          <h2 className="nft-modal-title">NFT 정보</h2>
          <button className="nft-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="nft-modal-body">
          <div className="nft-info-section">
            <div className="nft-info-item">
              <label>Token ID</label>
              <div className="nft-token-id">
                <span>{nftData.tokenId}</span>
                <button className="copy-button" onClick={() => navigator.clipboard.writeText(nftData.tokenId)}>
                  📋 복사
                </button>
              </div>
            </div>

            <div className="nft-info-item">
              <label>발행일</label>
              <span>{nftData.issueDate}</span>
            </div>

            <div className="nft-info-item">
              <label>블록체인</label>
              <span>Ethereum</span>
            </div>

            <div className="nft-info-item">
              <label>컨트랙트 주소</label>
              <div className="nft-contract-address">
                <span className="address-text">0xAbCd...1234</span>
                <button className="copy-button" onClick={() => navigator.clipboard.writeText('0xAbCdEf123456789')}>
                  📋 복사
                </button>
              </div>
            </div>

            <div className="nft-info-item">
              <label>상태</label>
              <span className="nft-status-active">활성화</span>
            </div>
          </div>

          <div className="nft-actions">
            <button className="nft-action-button secondary" onClick={onClose}>
              닫기
            </button>
            <button className="nft-action-button primary">
              블록체인 탐색기에서 보기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
