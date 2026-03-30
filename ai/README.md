# AI 서비스 실행 가이드

이 디렉터리는 다중 AI 모델을 수용할 수 있도록 구조화된 FastAPI 서비스입니다.

## 1) 폴더 구조

- app/main.py: FastAPI 앱 진입점
- app/api/routes: API 라우터
  - app/api/routes/scratches.py: 스크래치 비교 API
  - app/api/routes/face.py: 얼굴 인증 API (DeepFace)
  - app/api/routes/document.py: 신분증 OCR API (여권 / 국제운전면허증)
- app/schemas: 요청/응답 스키마
  - app/schemas/scratch.py
  - app/schemas/face.py
  - app/schemas/document.py
- app/services: 유즈케이스(비즈니스 로직) 계층
  - app/services/scratch_comparison_service.py: 스크래치 비교 서비스
  - app/services/face_service.py: 얼굴 인증 서비스
  - app/services/ocr_service.py: 신분증 OCR 서비스
- app/models: 모델 구현체 모음
  - app/models/resnet50_v3: 스크래치 비교 모델 (ResNet50)
  - app/models/deepface: 얼굴 인증 모델 (DeepFace/VGG-Face)
  - app/models/ocr: 신분증 OCR 모델 (Claude Vision via GMS)
- app/cli: 로컬 실행용 스크립트

새 모델이 추가되면 app/models 아래에 모델별 폴더를 추가하고,
해당 모델을 호출하는 서비스 함수를 app/services에 추가하면 됩니다.

## 2) 환경변수 설정

`.env` 파일을 ai/ 루트에 생성하고 GMS 키를 입력하세요.

```
GMS_KEY=your_gms_key_here
```

> `.env`는 `.gitignore`에 등록되어 있어 커밋되지 않습니다.

## 3) 개발 환경 설정

### Windows Git Bash (MINGW64)

```bash
  cd ai
  python -m venv .venv
  source .venv/Scripts/activate
  python -m pip install --upgrade pip
  pip install -r requirements.txt
```

### macOS/Linux (bash/zsh)

```bash
    cd ai
    python3.11 -m venv .venv
    source .venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
```

## 4) 서버 실행

```
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Swagger UI:
- http://localhost:8000/docs

헬스체크:
- GET http://localhost:8000/api/v1/health

## 5) API 엔드포인트 목록

| 엔드포인트 | 메서드 | 설명 |
|---|---|---|
| /api/v1/scratches/compare | POST | 차량 스크래치 비교 |
| /api/v1/face/verify | POST | 얼굴 동일인 인증 |
| /api/v1/ocr/passport | POST | 여권 OCR 추출 |
| /api/v1/ocr/license | POST | 국제운전면허증 OCR 추출 |

---

## 6) 스크래치 비교 API

- POST /api/v1/scratches/compare
- Content-Type: multipart/form-data
- 필수 form-data 필드:
  - reference_image (파일)
  - target_image (파일)

응답 예시:

    {
      "similarity": 0.9132,
      "diff_score": 0.0215
    }

### curl 테스트

    curl -X POST "http://localhost:8000/api/v1/scratches/compare" \
      -F "reference_image=@after.png" \
      -F "target_image=@before.png"

### 설명

- 전처리: Resize(640), CenterCrop(640), Normalize
- 밝기 보정: target 이미지를 reference 밝기에 맞춤
- 특징 추출: ResNet50 마지막 FC 이전 feature map 사용
- 지표 계산:
  - 코사인 유사도 평균
  - feature map L1 평균(diff_score)

로컬 파일로 바로 실행하려면 아래 명령을 사용하세요.

    python -m app.cli.run_resnet50v3_legacy

위 스크립트는 아래 순서로 실행됩니다.

1. after.png를 기준 이미지로 로드
2. before.png를 대상 이미지로 로드
3. 유사도/변화량 출력

---

## 7) DeepFace 얼굴 인증 API

국제운전면허증 사진과 셀카를 비교하여 동일인 여부를 판단합니다.

### 관련 파일

- `app/api/routes/face.py`
- `app/services/face_service.py`
- `app/schemas/face.py`

> 최초 실행 시 DeepFace 모델 가중치 자동 다운로드 (~500MB, `~/.deepface/weights/`에 캐싱)

### API 엔드포인트

- POST /api/v1/face/verify
- Content-Type: multipart/form-data
- 필수 form-data 필드:
  - id_photo (파일) - 국제운전면허증 사진
  - selfie (파일) - 본인 셀카

응답 예시:

    {
      "verified": true,
      "distance": 0.3241,
      "threshold": 0.4000,
      "model": "VGG-Face"
    }

### curl 테스트

    curl -X POST "http://localhost:8000/api/v1/face/verify" \
      -F "id_photo=@license.jpg" \
      -F "selfie=@selfie.jpg"

### 참고

- `verified: true` → 동일인, `false` → 불일치
- `distance`가 낮을수록 유사도 높음
- `enforce_detection=False` 설정으로 얼굴 감지 실패 시에도 에러 없이 동작

---

## 8) 신분증 OCR API

여권 및 국제운전면허증 이미지를 Claude Vision (GMS 프록시)으로 분석해 구조화된 텍스트를 추출합니다.
renter 앱의 DID 인증 플로우(`/did-camera` → `/did-confirm`)에서 자동입력 용도로 사용됩니다.

### 관련 파일

- `app/api/routes/document.py`
- `app/services/ocr_service.py`
- `app/models/ocr/extractor.py`
- `app/schemas/document.py`

### 필수 환경변수

```
GMS_KEY=your_gms_key_here
```

### 여권 OCR

- POST /api/v1/ocr/passport
- Content-Type: multipart/form-data
- 필드: image (파일)

응답 예시:

    {
      "passport_no": "M12345678",
      "surname": "HONG",
      "given_names": "GIL DONG",
      "nationality": "KOR",
      "date_of_birth": "900101",
      "sex": "M",
      "place_of_birth": "SEOUL",
      "date_of_issue": "200101",
      "date_of_expiry": "300101",
      "mrz": "P<KORHONG<<GIL<DONG<<<..."
    }

### 국제운전면허증 OCR

- POST /api/v1/ocr/license
- Content-Type: multipart/form-data
- 필드: image (파일)

응답 예시:

    {
      "license_number": "11-22-123456-78",
      "name": "HONG GIL DONG",
      "date_of_birth": "1990-01-01",
      "address": "SEOUL, KOREA",
      "date_of_expiry": "2030-01-01",
      "date_of_issue": "2020-01-01",
      "sex": "M"
    }

### curl 테스트

    curl -X POST "http://localhost:8000/api/v1/ocr/passport" \
      -F "image=@passport.jpg"

    curl -X POST "http://localhost:8000/api/v1/ocr/license" \
      -F "image=@license.jpg"

---

## 9) 팀 공통 참고 사항

- 최초 실행 시 torchvision이 ResNet50 가중치를 다운로드할 수 있어 초기 응답이 느릴 수 있습니다.
- GPU가 없어도 CPU로 자동 동작합니다.
- Windows Git Bash에서는 `source .venv/bin/activate`가 아니라 `source .venv/Scripts/activate`를 사용해야 합니다.
- `.env` 파일은 팀원 각자 직접 생성해야 합니다 (git에 포함되지 않음).
