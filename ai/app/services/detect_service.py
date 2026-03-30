from pathlib import Path
from PIL import Image
import os

from app.services.s3_service   import upload_image_to_s3, upload_file_to_s3
from app.services.ipfs_service import upload_to_ipfs

USE_MOCK_STORAGE = os.getenv("USE_MOCK_STORAGE", "true").lower() == "true"

_model = None

def get_model():
    global _model
    if _model is None:
        try:
            from ultralytics import YOLO
            model_path = Path(__file__).parent.parent / "models" / "scratches" / "best.pt"
            if model_path.exists():
                _model = YOLO(str(model_path))
                print("[detect] YOLO 모델 로드 완료")
            else:
                print("[detect] best.pt 없음 → mock 모드")
        except Exception as e:
            print(f"[detect] 모델 로드 실패 → mock 모드: {e}")
    return _model


def crop_image(image: Image.Image, x, y, w, h) -> Image.Image:
    x1 = max(0, int(x))
    y1 = max(0, int(y))
    x2 = min(image.width,  int(x + w))
    y2 = min(image.height, int(y + h))
    return image.crop((x1, y1, x2, y2))


async def detect_and_upload(image_path: Path, zone: str, log_type: str) -> dict:
    model = get_model()
    image = Image.open(image_path).convert("RGB")
    w_img, h_img = image.size

    if USE_MOCK_STORAGE:
        original_s3_url = "https://mock-s3.amazonaws.com/originals/mock.jpg"
    else:
        original_s3_url = upload_file_to_s3(image_path, prefix="originals")

    raw_boxes = []
    if model is None:
        raw_boxes = [{
            "label":      "scratch",
            "confidence": 0.88,
            "x": w_img * 0.2,
            "y": h_img * 0.3,
            "w": w_img * 0.15,
            "h": h_img * 0.1,
        }]
    else:
        results = model(str(image_path), conf=0.5, iou=0.4)[0]
        for box in results.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            raw_boxes.append({
                "label":      model.names[int(box.cls[0])],
                "confidence": round(float(box.conf[0]), 4),
                "x": x1, "y": y1,
                "w": x2 - x1,
                "h": y2 - y1,
            })

    defects = []
    for b in raw_boxes:
        cropped = crop_image(image, b["x"], b["y"], b["w"], b["h"])

        if USE_MOCK_STORAGE:
            crop_s3_url = "https://mock-s3.amazonaws.com/crops/mock.jpg"
            ipfs_cid    = None
        else:
            crop_s3_url = upload_image_to_s3(cropped, prefix="crops")
            ipfs_cid    = upload_to_ipfs(cropped)

        defects.append({
            "label":           b["label"],
            "confidence":      b["confidence"],
            "bbox":            {"x": b["x"], "y": b["y"], "w": b["w"], "h": b["h"]},
            "crop_s3_url":     crop_s3_url,
            "original_s3_url": original_s3_url,
            "proof_ipfs_cid":  ipfs_cid,
        })

    return {
        "defects":  defects,
        "zone":     zone,
        "log_type": log_type,
    }