from pydantic import BaseModel, Field


class FaceVerifyResponse(BaseModel):
    verified: bool = Field(..., description="동일인 여부")
    distance: float = Field(..., description="얼굴 유사도 거리 (낮을수록 유사)")
    threshold: float = Field(..., description="판정 기준 임계값")
    model: str = Field(default="VGG-Face", description="사용된 얼굴 인식 모델")
