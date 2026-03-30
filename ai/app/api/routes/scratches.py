import time
import cv2
import numpy as np
import torch
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, File, UploadFile, Form
from ultralytics import YOLO
from PIL import Image
from app.services.s3_service import upload_file_to_s3, upload_image_to_s3
from app.services.ipfs_service import upload_to_ipfs
from app.services.scratch_comparison_service import compare_scratches_from_urls
from app.schemas.scratch import ScratchComparisonByUrlRequest, ScratchComparisonResponse

router = APIRouter(prefix="/scratches")

# ✅ GPU/CPU 자동 선택
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
print(f"🖥️  추론 디바이스: {DEVICE.upper()}" + (f" ({torch.cuda.get_device_name(0)})" if DEVICE == "cuda" else " (GPU 없음)"))

MODEL_PATH = "app/models/scratches/best.pt"
try:
    model = YOLO(MODEL_PATH)
    model.to(DEVICE)  # ✅ GPU로 이동

    # ✅ 워밍업 — 첫 추론 느린 것 방지
    dummy = np.zeros((320, 320, 3), dtype=np.uint8)
    model.predict(source=dummy, imgsz=320, conf=0.1, verbose=False)
    print("🟢 AI 모델 로딩 + 워밍업 완료!")
except Exception as e:
    print(f"🔴 AI 모델 로딩 실패: {e}")


@router.websocket("/ws/detect")
async def websocket_detect(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            frame_bytes = await websocket.receive_bytes()

            nparr = np.frombuffer(frame_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is not None:
                start = time.time()

                # ✅ 실시간 WS — imgsz=320 (빠른 것 우선)
                results = model.predict(
                    source=img,
                    conf=0.1,
                    iou=0.4,
                    imgsz=320,   # ✅ 640 → 320 (2~3배 빠름)
                    device=DEVICE,
                    verbose=False,
                )
                print(f"[YOLO-WS] 추론 시간: {(time.time() - start)*1000:.1f}ms | 탐지 수: {sum(len(r.boxes) for r in results)}")

                real_boxes = []
                for r in results:
                    for box in r.boxes:
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        label_idx  = int(box.cls[0])
                        label_name = model.names[label_idx]
                        real_boxes.append({
                            "x": int(x1),
                            "y": int(y1),
                            "w": int(x2 - x1),
                            "h": int(y2 - y1),
                            "label": label_name,
                        })

                await websocket.send_json({"boxes": real_boxes})
            else:
                await websocket.send_json({"boxes": []})

    except WebSocketDisconnect as e:
        print(f"🟡 연결 끊김 - code: {e.code}, reason: {e.reason}")
    except Exception as e:
        print(f"🔴 통신 중 에러: {type(e).__name__}: {e}")


@router.post("/detect")
async def detect_and_save(
        image:    UploadFile = File(...),
        zone:     str        = Form("front"),
        log_type: str        = Form("BEFORE"),
):
    import tempfile
    from pathlib import Path

    contents = await image.read()
    nparr    = np.frombuffer(contents, np.uint8)
    img_cv   = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img_cv is None:
        return {"defects": [], "zone": zone, "log_type": log_type}

    # ✅ 촬영 — imgsz=640 (정확한 것 우선)
    results = model.predict(
        source=img_cv,
        conf=0.1,
        iou=0.4,
        imgsz=640,
        device=DEVICE,
        verbose=False,
    )
    img_pil = Image.fromarray(cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB))

    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        tmp.write(contents)
        tmp_path = Path(tmp.name)
    original_s3_url = upload_file_to_s3(tmp_path, prefix="originals")
    tmp_path.unlink()

    defects = []
    for r in results:
        for box in r.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            label = model.names[int(box.cls[0])]
            conf  = float(box.conf[0])

            cropped     = img_pil.crop((int(x1), int(y1), int(x2), int(y2)))
            crop_s3_url = upload_image_to_s3(cropped, prefix="crops")
            ipfs_cid    = upload_to_ipfs(cropped)

            defects.append({
                "label":           label,
                "confidence":      round(conf, 4),
                "bbox":            {"x": int(x1), "y": int(y1), "w": int(x2-x1), "h": int(y2-y1)},
                "crop_s3_url":     crop_s3_url,
                "original_s3_url": original_s3_url,
                "proof_ipfs_cid":  ipfs_cid,
            })

    return {"defects": defects, "zone": zone, "log_type": log_type}


@router.post("/compare", response_model=ScratchComparisonResponse)
async def compare_by_urls(request: ScratchComparisonByUrlRequest):
    similarity, diff_score = compare_scratches_from_urls(
        request.ref_crop_s3_url,
        request.target_crop_s3_url,
    )
    return {
        "similarity": similarity,
        "diff_score": diff_score,
    }