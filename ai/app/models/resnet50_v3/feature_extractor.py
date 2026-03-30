from functools import lru_cache

import torch
import torch.nn as nn
import torchvision.models as models
from torchvision.models import ResNet50_Weights


class PrecisionScratchesNet(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        resnet = models.resnet50(weights=ResNet50_Weights.DEFAULT)
        self.feature_extractor = nn.Sequential(*list(resnet.children())[:-2])

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.feature_extractor(x)


@lru_cache(maxsize=1)
def get_model(device: torch.device) -> nn.Module:
    model = PrecisionScratchesNet().to(device)
    model.eval()
    return model
