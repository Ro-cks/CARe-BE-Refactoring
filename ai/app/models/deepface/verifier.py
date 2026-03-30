from pathlib import Path

from deepface import DeepFace


def verify(
    img1_path: Path | str,
    img2_path: Path | str,
    model_name: str = "Facenet512",
    detector_backend: str = "opencv",
    enforce_detection: bool = False,
) -> dict:
    """
    두 이미지를 비교하여 동일인 여부를 반환합니다.

    Returns:
        verified, distance, threshold, model
    """
    result = DeepFace.verify(
        img1_path=str(img1_path),
        img2_path=str(img2_path),
        model_name=model_name,
        detector_backend=detector_backend,
        enforce_detection=enforce_detection,
        threshold=0.9,
    )
    
    return {
        "verified": result["verified"],
        "distance": result["distance"],
        "threshold": result["threshold"],
        "model": model_name,
    }
