from pathlib import Path

from app.models.deepface.verifier import verify


def verify_faces(id_photo_path: Path | str, selfie_path: Path | str) -> tuple[bool, float, float]:
    """
    국제운전면허증 사진과 셀카를 비교하여 동일인 여부를 반환합니다.

    Returns:
        (verified, distance, threshold)
    """
    result = verify(img1_path=id_photo_path, img2_path=selfie_path)
    return result["verified"], result["distance"], result["threshold"]
