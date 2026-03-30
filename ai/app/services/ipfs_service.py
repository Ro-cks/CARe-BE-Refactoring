import requests
import io
import os
from PIL import Image

PINATA_JWT = os.getenv("PINATA_JWT")


def upload_to_ipfs(image: Image.Image) -> str | None:
    """PIL 이미지 → IPFS(Pinata) 업로드 → CID 반환"""
    try:
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=85)
        buffer.seek(0)

        res = requests.post(
            "https://api.pinata.cloud/pinning/pinFileToIPFS",
            headers={"Authorization": f"Bearer {PINATA_JWT}"},
            files={"file": ("scratch.jpg", buffer, "image/jpeg")},
            timeout=30,
        )
        res.raise_for_status()
        cid = res.json()["IpfsHash"]
        print(f"[IPFS] 업로드 성공: {cid}")
        return cid
    except Exception as e:
        print(f"[IPFS] 업로드 실패 → None으로 처리: {e}")
        return None