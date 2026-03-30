# renter 버그 수정 현황

> 기준일: 2026-03-27
> 상태 범례: ✅ 수정완료 | 🔧 수정필요 | 🔍 분석완료(미수정)

---

## ✅ 수정완료

### [BUG-1] 얼굴 인증 무조건 통과
- **파일:** `src/pages/car-faceauth/CarFaceAuthPage.jsx`
- **내용:** `verifyFace()` 중복 호출 + 결과 기다리지 않고 `setStep('success')` 즉시 실행
- **수정:** 중복 호출 및 `setStep('success')` 제거 → 첫 번째 `.then()` 결과에 따라 분기

### [BUG-2] DIDCardPage ReferenceError
- **파일:** `src/pages/did-auth/DIDCardPage.jsx`
- **내용:** `copyDID()` 함수에서 미선언 변수 `docId`, `setCopied` 사용
- **수정:** `copyDID` 함수 및 관련 state 전체 제거

### [UI-1] 반납완료 화면 차량 이미지 기본 이미지 적용
- **파일:** `src/pages/reservations/ReservationDetailPage.jsx`
- **내용:** `🚗` 이모지 하드코딩, thumbnailUrl 미사용
- **수정:** `thumbnailUrl` 있으면 API 이미지, 없으면 `car_icon_cute.png` fallback

### [UI-2] ReservationDetailPage 레이아웃 개선
- 번호판·보험사를 차량명 아래로 이동
- NFT 배지 (nftTokenId 있을 때만, 다크 배경 + 주황 텍스트)
- 스케줄 카드 내 중복 위치 정보 제거
- 반납완료 시 시간 바 제거 → 초록 배너로 교체

### [UI-3] MyCarPage 동일 레이아웃 적용
- ReservationDetailPage와 동일하게 헤더 구조 통일
- `🚗` 이모지 → `car_icon_cute.png` 교체
- 스케줄 카드 내 중복 위치 정보 제거

---

### [I18N-1~4] 언어 혼용 문제 전체 수정 완료 (2026-03-27)
- `i18n.js` 기본 언어 `'en'` → `'ko'`
- `DIDCardPage.jsx` `useTranslation` 적용, 하드코딩 텍스트 전부 `t()` 교체
- `TokenHistoryPage.jsx` `useTranslation` 적용, 하드코딩 텍스트 전부 `t()` 교체
- 5개 locale 파일(ko/en/zh/ja/fr)에 `didCard`, `tokenHistory` 키 추가

---

## 🔧 수정필요

### [I18N-1] 기본 언어가 English로 설정됨 (언어 혼용 현상 원인)

- **파일:** `src/i18n.js:10`
- **코드:**
  ```js
  const savedLang = localStorage.getItem('language') || 'en'  // ← 'en'이 default
  ```
- **원인:** localStorage에 언어 설정이 없는 신규 유저는 무조건 영어로 시작.
  `fallbackLng: 'ko'`는 번역 키가 없을 때만 쓰이는 fallback이고 초기 언어 설정이 아님.
- **결과:** `t()` 사용하는 텍스트는 영어, 하드코딩된 텍스트는 한국어 → 화면 전체 언어 혼용
- **수정방법:**
  ```js
  const savedLang = localStorage.getItem('language') || 'ko'  // 'en' → 'ko'
  ```

### [I18N-2] 신원인증 알림이 프랑스어로 표시

- **파일:** `src/pages/home/HomePage.jsx:191`
- **원인:** 이전 테스트에서 프랑스어(`fr`)를 선택해 localStorage에 저장된 상태.
  `i18n.js`가 `localStorage.getItem('language')`를 그대로 읽으므로 `fr` 유지됨.
  [I18N-1]과 동일 원인 — 기본값이 `ko`였다면 처음부터 이 문제가 없었음.
- **수정방법:** [I18N-1] 수정 후, 테스트 환경에서는 `localStorage.removeItem('language')` 후 재확인.

### [I18N-3] DIDCardPage 텍스트 전체 하드코딩 (한국어 고정)

- **파일:** `src/pages/did-auth/DIDCardPage.jsx`
- **하드코딩된 텍스트 목록:**

  | 위치 | 하드코딩 텍스트 |
  |------|----------------|
  | line 38 | `신원 인증 완료` (헤더 타이틀) |
  | line 76 | `인증 완료` (이름 fallback) |
  | line 89 | `여권 및 면허증 인증 완료` |
  | line 98 | `신원 인증 완료`, `님의 신원이 인증되었습니다.` (share 텍스트) |

- **수정방법:** `useTranslation()` 훅 추가 후 `t()` 키로 교체, 각 locale 파일에 키 추가

### [I18N-4] TokenHistoryPage 텍스트 전체 하드코딩 (한국어 고정)

- **파일:** `src/pages/wallet/TokenHistoryPage.jsx`
- **하드코딩된 텍스트 목록:**

  | 위치 | 하드코딩 텍스트 |
  |------|----------------|
  | line 40 | `토큰 내역` (페이지 타이틀) |
  | line 45 | `보유 CARE` |
  | line 47 | `조회 중...` |
  | line 58 | `충전` |
  | line 63 | `환전`, `환전 기능은 준비 중입니다.` |
  | line 71 | `사용 내역` |
  | line 76 | `아직 사용 내역이 없습니다.` |

- **수정방법:** `useTranslation()` 추가, `t()` 키로 교체, locale 파일에 키 추가

---

## 🔍 분석완료 (미수정)

### [ENV-1] privy-server.mjs .env 경로 오류
- **파일:** `privy-server.mjs:17`
- **내용:** `join(__dirname, '../.env')` → 프로젝트 루트를 가리킴, `renter/.env` 못 읽음
- **결과:** `PRIVY_APP_SECRET` undefined → 지갑 생성 500 오류
- **수정:** `'../.env'` → `'.env'`

### [ENV-2] main.jsx Privy appId 하드코딩
- **파일:** `src/main.jsx:11`
- **내용:** `appId="cmmtxys5k00a50djyxhziw4xs"` 하드코딩
- **수정:** `import.meta.env.VITE_PRIVY_APP_ID` 로 교체

### [API-1] CarCrackPage AI 엔드포인트 불일치 (mock 항상 실행)
- **파일:** `src/pages/car-crack/CarCrackPage.jsx:38`
- **3중 문제:**
  1. URL `/analyze-damage` → 실제 엔드포인트는 `/api/v1/scratches/detect`
  2. `scratches` 라우터가 `ai/app/main.py`에 **아예 등록 안 됨**
  3. 프론트는 4장 한 번에 전송 / 서버는 1장씩 수신 (형식 불일치)
- **결과:** 항상 mock 랜덤 데이터 + 가짜 blockchain hash `0x34e...698d` 기록

### [API-2] auth.js renterLanguage() 파라미터 누락
- **파일:** `src/api/auth.js:100`
- **내용:** `languageCode` body 없이 빈 PUT 전송
- **수정:** `(languageCode) => api.put('/api/renters/me/language', { languageCode })`

### [MISC-1] CARE 토큰 컨트랙트 주소 zero address
- **파일:** `src/utils/careToken.js:4`
- **내용:** `0x000...000` placeholder → 잔액 조회/충전 전부 불능
- **수정:** 실제 배포 주소를 `.env`에 `VITE_CARE_TOKEN_ADDRESS`로 등록

### [BUG-3] ForgotPasswordPage API 미연결
- **파일:** `src/pages/auth/ForgotPasswordPage.jsx:20`
- **내용:** 이메일 입력해도 API 없이 바로 `/reset-password` 이동
- **상태:** 기능 미완성, 백엔드 API 개발 후 연결 필요
