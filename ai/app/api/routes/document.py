import tempfile
from pathlib import Path

import pillow_avif  # noqa: F401  — AVIF 이미지 지원
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.document import LicenseOCRResponse, PassportOCRResponse
from app.services.ocr_service import ocr_license, ocr_passport

router = APIRouter(prefix="/ocr", tags=["ocr"])


@router.post("/passport", response_model=PassportOCRResponse)
async def extract_passport(
    image: UploadFile = File(..., description="여권 이미지"),
) -> PassportOCRResponse:
    suffix = Path(image.filename or "passport.jpg").suffix or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
        f.write(await image.read())
        tmp_path = Path(f.name)

    try:
        return ocr_passport(tmp_path)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if tmp_path.exists():
            tmp_path.unlink()


@router.post("/license", response_model=LicenseOCRResponse)
async def extract_license(
    image: UploadFile = File(..., description="국제운전면허증 이미지"),
) -> LicenseOCRResponse:
    suffix = Path(image.filename or "license.jpg").suffix or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
        f.write(await image.read())
        tmp_path = Path(f.name)

    try:
        return ocr_license(tmp_path)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if tmp_path.exists():
            tmp_path.unlink()
