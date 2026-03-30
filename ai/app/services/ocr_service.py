from pathlib import Path

from app.models.ocr.extractor import extract_license_fields, extract_passport_fields
from app.schemas.document import LicenseOCRResponse, PassportOCRResponse


def ocr_passport(image_path: Path) -> PassportOCRResponse:
    result = extract_passport_fields(str(image_path))
    return PassportOCRResponse(**{k: str(v) for k, v in result.items() if k in PassportOCRResponse.model_fields})


def ocr_license(image_path: Path) -> LicenseOCRResponse:
    result = extract_license_fields(str(image_path))
    return LicenseOCRResponse(**{k: str(v) for k, v in result.items() if k in LicenseOCRResponse.model_fields})
