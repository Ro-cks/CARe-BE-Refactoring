// ─────────────────────────────────────────────────────────────
//  scanner.js  —  WebSocket 실시간 탐지 + 촬영 버튼 클릭 시 저장
// ─────────────────────────────────────────────────────────────

import { scanBefore, scanAfter } from '../../api/scan'  // ← 경로는 맞게 수정

const WHEEL_MATCH_TIME = 2500

export class Scanner {
  constructor(videoEl, reservationId, logType = 'BEFORE') {
    this.video         = videoEl
    this.reservationId = reservationId
    this.logType       = logType
    this.zone          = null
    this.captures      = {}
    this._matchTimer   = null
    this._matchValue   = 0
    this._isMatching   = false

    this.onMatching      = null
    this.onMatched       = null
    this.onCapture       = null
  }
  setZone(zone) {
    this.zone        = zone
    this._matchValue = 0
    this._isMatching = false
    this._clearTimers()
  }

  // ── 매칭 시작 (번호판/바퀴 모두 타이머)
  startMatching() {
    if (!this.zone) return
    this._clearTimers()
    this._matchValue = 0
    this._isMatching = true
    this._startTimerMatching()
  }

  _startTimerMatching() {
    const interval = 50
    const steps    = WHEEL_MATCH_TIME / interval
    let   step     = 0

    this._matchTimer = setInterval(() => {
      if (!this._isMatching) { clearInterval(this._matchTimer); return }
      step++
      this._matchValue = (step / steps) * 100
      if (this.onMatching) this.onMatching(this._matchValue)

      if (step >= steps) {
        clearInterval(this._matchTimer)
        this._isMatching = false
        // 자동 캡처 안 함 → 매칭 완료 알림만
        if (this.onMatched) this.onMatched()
      }
    }, interval)
  }

  // ── 촬영 버튼 클릭 시 호출
  async capture() {
    if (!this.video || !this.zone) return

    const snap = document.createElement('canvas')
    snap.width  = this.video.videoWidth  || 1280
    snap.height = this.video.videoHeight || 720
    snap.getContext('2d').drawImage(this.video, 0, 0)

    const dataUrl = snap.toDataURL('image/jpeg', 0.88)
    const base64  = dataUrl.split(',')[1]

    let boxes = []
    let saveError = null
    try {
      boxes = await this._saveToSpringBoot(base64)
    } catch (err) {
      console.warn('[Scanner] 저장 실패:', err)
      saveError = err
    }
    this.captures[this.zone.id] = { base64, dataUrl, boxes }
    if (this.onCapture) this.onCapture(this.zone.id, dataUrl, boxes, saveError)
  }

  // ── Spring Boot API 호출 → DB 저장
    async _saveToSpringBoot(base64) {
      const binary = atob(base64)
      const arr    = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
      const blob = new Blob([arr], { type: 'image/jpeg' })

      const scratches = this.logType === 'AFTER'
        ? await scanAfter(this.reservationId, this.zone.id, blob)
        : await scanBefore(this.reservationId, this.zone.id, blob)

      return scratches.map(s => ({
        x:     s.coordX,
        y:     s.coordY,
        w:     80,
        h:     60,
        label: '흠집',
        score: 1.0,
        cropS3Url:     s.cropS3Url,
        originalS3Url: s.originalS3Url,
      }))
    }
  stopMatching() {
      this._isMatching = false
      this._clearTimers()
    }

    unlock() {
      this._isMatching = false
      this._matchValue = 0
      this._clearTimers()
      if (this.onMatching) this.onMatching(0)
    }

    _clearTimers() {
      if (this._matchTimer) {
        clearInterval(this._matchTimer)
        this._matchTimer = null
      }
    }

    getCapture(zoneId)  { return this.captures[zoneId] }
    isDone(zoneId)      { return !!this.captures[zoneId] }
    isAllDone(zones)    { return zones.every(z => this.captures[z.id]) }

    reset() {
      this._isMatching = false
      this._matchValue = 0
      this.captures    = {}
      this._clearTimers()
    }
  }