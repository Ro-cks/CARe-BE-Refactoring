from fastapi import APIRouter

from app.schemas.scratch import ScratchComparisonByUrlRequest, ScratchComparisonResponse
from app.services.scratch_comparison_service import compare_scratches_from_urls

router = APIRouter(prefix="/scratches", tags=["scratches"])


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
