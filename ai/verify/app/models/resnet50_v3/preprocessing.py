from PIL import Image, ImageEnhance, ImageStat
import torchvision.transforms as transforms


preprocess = transforms.Compose(
    [
        transforms.Resize(640),
        transforms.CenterCrop(640),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ]
)


def match_brightness(source_img: Image.Image, reference_img: Image.Image) -> Image.Image:
    stat_source = ImageStat.Stat(source_img.convert("L"))
    stat_ref = ImageStat.Stat(reference_img.convert("L"))

    mean_source = stat_source.mean[0]
    mean_ref = stat_ref.mean[0]

    brightness_factor = mean_ref / (mean_source + 1e-6)
    enhancer = ImageEnhance.Brightness(source_img)
    return enhancer.enhance(brightness_factor)
