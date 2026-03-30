import React, { useEffect } from 'react'
import './ConfirmModal.css'

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '요청하기',
  cancelText = '취소하기',
  confirmButtonStyle = 'danger' // 'danger' | 'primary'
}) {
  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // 모달이 열리면 body 스크롤 방지
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <div className="confirm-modal-backdrop" onClick={handleBackdropClick}>
      <div className="confirm-modal-container">
        <button className="confirm-modal-close" onClick={onClose} aria-label="닫기">
          ×
        </button>

        <div className="confirm-modal-content">
          {/* Icon */}
          <div className="confirm-modal-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="24" fill="#FEE2E2"/>
              <path d="M24 14V26M24 30H24.02" stroke="#EF4444" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>

          {/* Title */}
          <h2 className="confirm-modal-title">{title}</h2>

          {/* Message */}
          <p className="confirm-modal-message">{message}</p>

          {/* Buttons */}
          <div className="confirm-modal-buttons">
            <button
              className="confirm-modal-button cancel"
              onClick={onClose}
            >
              {cancelText}
            </button>
            <button
              className={`confirm-modal-button confirm ${confirmButtonStyle}`}
              onClick={handleConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
