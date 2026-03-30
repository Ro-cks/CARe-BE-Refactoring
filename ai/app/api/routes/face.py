from pathlib import Path
import tempfile

import pillow_avif  # noqa: F401  — AVIF 이미지 지원
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.face import FaceVerifyResponse
from app.services.face_service import verify_faces

router = APIRouter(prefix="/face", tags=["face"])


@router.post("/verify", response_model=FaceVerifyResponse)
async def verify_face(
    id_photo: UploadFile = File(..., description="국제운전면허증 사진"),
    selfie: UploadFile = File(..., description="본인 셀카"),
) -> FaceVerifyResponse:
    id_suffix = Path(id_photo.filename or "id.jpg").suffix or ".jpg"
    selfie_suffix = Path(selfie.filename or "selfie.jpg").suffix or ".jpg"

    with tempfile.NamedTemporaryFile(delete=False, suffix=id_suffix) as f:
        f.write(await id_photo.read())
        id_path = Path(f.name)

    with tempfile.NamedTemporaryFile(delete=False, suffix=selfie_suffix) as f:
        f.write(await selfie.read())
        selfie_path = Path(f.name)

    try:
        verified, distance, threshold = verify_faces(id_path, selfie_path)
        print(f"[FaceVerify] verified={verified}, distance={distance:.4f}, threshold={threshold:.4f}")
        return FaceVerifyResponse(verified=verified, distance=distance, threshold=threshold)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        for p in (id_path, selfie_path):
            if p.exists():
                p.unlink()
