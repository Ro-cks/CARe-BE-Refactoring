from pydantic import BaseModel, Field
from typing import List, Optional


class ScratchComparisonResponse(BaseModel):
    similarity: float = Field(..., description="Cosine similarity score")
    diff_score: float = Field(..., description="Average feature map L1 difference")


class ScratchComparisonByUrlRequest(BaseModel):
    ref_crop_s3_url: str = Field(..., description="Reference crop image URL (BEFORE)")
    target_crop_s3_url: str = Field(..., description="Target crop image URL (AFTER)")


class BBox(BaseModel):
    x: float
    y: float
    w: float
    h: float


class Defect(BaseModel):
    label:           str           = Field(..., description="scratch / dent / crack")
    confidence:      float         = Field(..., description="신뢰도 0~1")
    bbox:            BBox          = Field(..., description="원본 이미지 기준 좌표")
    crop_s3_url:     str           = Field(..., description="크롭 이미지 S3 URL")
    original_s3_url: str           = Field(..., description="원본 이미지 S3 URL")
    proof_ipfs_cid:  Optional[str] = Field(None, description="IPFS CID")


class DetectResponse(BaseModel):
    defects:  List[Defect] = Field(..., description="탐지된 흠집 목록")
    zone:     str          = Field(..., description="촬영 구역")
    log_type: str          = Field(..., description="BEFORE / AFTER")