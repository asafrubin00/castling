# Visual asset credits

## Landing photograph

- File: `public/turnover/chess-hero.jpg` (2972 x 1760 pixels, JPEG)
- Source: `chess-banner.jpg` from the original CEO Turnover Index project
  (https://github.com/asafrubin00/ceo-turnover-index), the same image used as its header banner.
- Processing: the 743 x 232 original was enlarged 4x with Real-ESRGAN (`RealESRGAN_x4plus`,
  https://github.com/xinntao/Real-ESRGAN, BSD-3-Clause), then placed on a black canvas with the
  lower edge feathered into black so it can fill a full screen. No other retouching.
- Served locally; cropping and a light vignette are applied in CSS. No external image service.
- Fallback: `public/turnover/chess-banner.jpg` (the original small banner) loads if the hero fails.

The previous Unsplash photograph (John Adeoye) is no longer used and has been removed.
