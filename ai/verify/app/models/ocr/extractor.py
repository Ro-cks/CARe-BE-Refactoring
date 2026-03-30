"""
신분증 OCR 추출기 (여권 / 국제운전면허증)
GMS 프록시를 통해 Claude Vision API로 문서 정보를 구조화된 데이터로 추출
"""

import base64
import io
import json
import os
import re

import httpx
from PIL import Image

GMS_URL = "https://gms.ssafy.io/gmsapi/api.anthropic.com/v1/messages"
GMS_MODEL = "claude-sonnet-4-20250514"


def _encode_image(image_path: str) -> tuple[str, str]:
    """이미지를 압축 후 base64로 인코딩 (GMS ~20KB 제한 대응)"""
    img = Image.open(image_path)
    img.thumbnail((600, 600), Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=70)
    image_data = base64.standard_b64encode(buf.getvalue()).decode("utf-8")

    return image_data, "image/jpeg"


def _call_gms(image_path: str, prompt: str) -> dict:
    """GMS API 호출 공통 로직"""
    gms_key = os.environ.get("GMS_KEY")
    if not gms_key:
        raise ValueError("GMS_KEY 환경변수가 설정되지 않았습니다.")

    image_data, media_type = _encode_image(image_path)

    payload = {
        "model": GMS_MODEL,
        "max_tokens": 1024,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_data,
                        },
                    },
                    {
                        "type": "text",
                        "text": prompt,
                    },
                ],
            }
        ],
    }

    headers = {
        "Content-Type": "application/json",
        "x-api-key": gms_key,
        "anthropic-version": "2023-06-01",
    }

    response = httpx.post(GMS_URL, json=payload, headers=headers, timeout=60)
    if response.status_code != 200:
        raise ValueError(f"GMS 오류 {response.status_code}: {response.text}")

    response_text = response.json()["content"][0]["text"].strip()

    try:
        if "```" in response_text:
            response_text = re.sub(r"```(?:json)?\n?", "", response_text).strip()
        return json.loads(response_text)
    except json.JSONDecodeError:
        return {"raw_text": response_text, "parse_error": "JSON 파싱 실패"}


def extract_passport_fields(image_path: str) -> dict:
    """
    여권에서 핵심 필드 추출

    Returns:
        {
            "passport_no": str,
            "surname": str,
            "given_names": str,
            "nationality": str,
            "date_of_birth": str,
            "sex": str,
            "place_of_birth": str,
            "date_of_issue": str,
            "date_of_expiry": str,
            "mrz": str
        }
    """
    prompt = """This is an OCR text extraction task for a document processing system.
Read all visible text in this passport image and extract the following fields exactly as they appear.

Fields to extract:
- passport_no: passport number (여권번호)
- surname: family name / 성
- given_names: given names / 이름
- nationality: nationality code (e.g. KOR)
- date_of_birth: date of birth
- sex: M or F
- place_of_birth: place of birth
- date_of_issue: date of issue
- date_of_expiry: date of expiry
- mrz: the two lines of machine readable zone at the bottom (MRZ)

Respond with JSON only, no other text:
{
  "passport_no": "...",
  "surname": "...",
  "given_names": "...",
  "nationality": "...",
  "date_of_birth": "...",
  "sex": "...",
  "place_of_birth": "...",
  "date_of_issue": "...",
  "date_of_expiry": "...",
  "mrz": "..."
}"""
    return _call_gms(image_path, prompt)


def extract_license_fields(image_path: str) -> dict:
    """
    국제면허증에서 핵심 필드 추출

    Returns:
        {
            "license_number": str,
            "name": str,
            "date_of_birth": str,
            "address": str,
            "date_of_expiry": str,
            "date_of_issue": str,
            "sex": str,
        }
    """
    prompt = """This is an OCR text extraction task for a document processing system.
Read all visible text in this image and extract the following fields exactly as they appear.

Fields to extract:
- license_number: the number after "No."
- name: text after "Surname/Given names"
- date_of_birth: text after "Date of birth"
- address: text after "Address"
- date_of_expiry: text after "Date of expiry"
- date_of_issue: text after "Date of issue"
- sex: text after "Sex"

Respond with JSON only, no other text:
{
  "license_number": "...",
  "name": "...",
  "date_of_birth": "...",
  "address": "...",
  "date_of_expiry": "...",
  "date_of_issue": "...",
  "sex": "..."
}"""
    return _call_gms(image_path, prompt)
