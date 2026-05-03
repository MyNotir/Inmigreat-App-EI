#!/usr/bin/env python3

"""Generate Inmigreat brand shell assets from the reused statue illustration.

This script keeps the new app shell aligned with the in-app legacy brand:
- airy lavender and powder-blue backgrounds
- glass-like white surfaces
- deep indigo statue mark inspired by the previous app
- soft violet sparkles for splash-forward compositions
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Iterable

try:
    from PIL import Image, ImageDraw, ImageFilter
except ImportError as exc:
    raise SystemExit(
        "Missing Pillow. Install it with: python3 -m pip install -r ./scripts/requirements-brand-assets.txt"
    ) from exc


ROOT = Path(__file__).resolve().parents[1]
ASSETS_DIR = ROOT / "assets"

# Synced with src/styles/theme.ts
TEXT_DARK = "#0D1F4D"
GRADIENT = ["#F4F5F9", "#F3F8FC", "#FFFFFF", "#F4F5F9"]
SPLASH_BG = "#F4F5F9"
LOGO_PRIMARY = "#153480"
LOGO_SHADOW = "#0D1F4D"
SPARKLE = "#9581FF"
BRAND_MARK_SOURCE = ASSETS_DIR / "illustrations" / "add-case-statue.png"


def hex_to_rgba(value: str, alpha: int = 255) -> tuple[int, int, int, int]:
    value = value.lstrip("#")
    return (
        int(value[0:2], 16),
        int(value[2:4], 16),
        int(value[4:6], 16),
        alpha,
    )


def mix(a: tuple[int, int, int, int], b: tuple[int, int, int, int], t: float) -> tuple[int, int, int, int]:
    return tuple(int(x + (y - x) * t) for x, y in zip(a, b))


def vertical_multistop_gradient(size: int, colors: Iterable[str]) -> Image.Image:
    rgba = [hex_to_rgba(color) for color in colors]
    segments = len(rgba) - 1
    image = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(image)

    for y in range(size):
        t = y / max(size - 1, 1)
        scaled = t * segments
        index = min(int(scaled), segments - 1)
        local_t = scaled - index
        color = mix(rgba[index], rgba[index + 1], local_t)
        draw.line((0, y, size, y), fill=color)

    return image


def add_soft_glows(image: Image.Image) -> Image.Image:
    size = image.size[0]
    glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    draw.ellipse((-int(size * 0.22), -int(size * 0.18), int(size * 0.62), int(size * 0.62)), fill=(255, 255, 255, 128))
    draw.ellipse((int(size * 0.42), int(size * 0.34), int(size * 1.06), int(size * 0.98)), fill=(255, 255, 255, 70))
    draw.ellipse((int(size * 0.12), int(size * 0.68), int(size * 0.72), int(size * 1.18)), fill=(255, 255, 255, 42))
    glow = glow.filter(ImageFilter.GaussianBlur(int(size * 0.06)))
    return Image.alpha_composite(image, glow)


def add_orbits(image: Image.Image) -> Image.Image:
    size = image.size[0]
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    ring = (108, 149, 255, 56)
    draw.ellipse((int(size * 0.12), int(size * 0.12), int(size * 0.88), int(size * 0.88)), outline=ring, width=max(1, int(size * 0.01)))
    draw.ellipse((int(size * 0.28), int(size * 0.28), int(size * 0.72), int(size * 0.72)), outline=(108, 149, 255, 42), width=max(1, int(size * 0.007)))
    draw.line((size // 2, 0, size // 2, size), fill=(108, 149, 255, 34), width=max(1, int(size * 0.005)))
    draw.line((0, int(size * 0.77), size, int(size * 0.77)), fill=(108, 149, 255, 26), width=max(1, int(size * 0.005)))
    return Image.alpha_composite(image, overlay)


@lru_cache(maxsize=1)
def load_brand_mark() -> Image.Image:
    if not BRAND_MARK_SOURCE.exists():
        raise SystemExit(f"Missing source illustration: {BRAND_MARK_SOURCE}")
    return Image.open(BRAND_MARK_SOURCE).convert("RGBA")


def resize_to_fit(image: Image.Image, max_box: tuple[int, int]) -> Image.Image:
    ratio = min(max_box[0] / image.size[0], max_box[1] / image.size[1])
    width = max(1, int(image.size[0] * ratio))
    height = max(1, int(image.size[1] * ratio))
    return image.resize((width, height), Image.Resampling.LANCZOS)


def tint_from_alpha(image: Image.Image, color: tuple[int, int, int, int]) -> Image.Image:
    tinted = Image.new("RGBA", image.size, color)
    tinted.putalpha(image.getchannel("A"))
    return tinted


def alpha_composite_center(base: Image.Image, overlay: Image.Image, center: tuple[int, int]) -> Image.Image:
    result = base.copy()
    x = int(center[0] - overlay.size[0] / 2)
    y = int(center[1] - overlay.size[1] / 2)
    result.alpha_composite(overlay, (x, y))
    return result


def add_brand_mark(
    image: Image.Image,
    center: tuple[int, int],
    box_size: int,
    color: tuple[int, int, int, int],
) -> Image.Image:
    source = resize_to_fit(load_brand_mark(), (box_size, box_size))
    shadow = tint_from_alpha(source, hex_to_rgba(LOGO_SHADOW, 88)).filter(
        ImageFilter.GaussianBlur(max(2, box_size // 36))
    )
    mark = tint_from_alpha(source, color)

    result = alpha_composite_center(image, shadow, (center[0] + max(1, box_size // 40), center[1] + max(1, box_size // 34)))
    return alpha_composite_center(result, mark, center)


def draw_sparkle(draw: ImageDraw.ImageDraw, center: tuple[int, int], radius: int, color: tuple[int, int, int, int]) -> None:
    cx, cy = center
    draw.line((cx, cy - radius, cx, cy + radius), fill=color, width=max(1, radius // 3))
    draw.line((cx - radius, cy, cx + radius, cy), fill=color, width=max(1, radius // 3))
    draw.line((cx - radius * 0.7, cy - radius * 0.7, cx + radius * 0.7, cy + radius * 0.7), fill=color, width=max(1, radius // 4))
    draw.line((cx - radius * 0.7, cy + radius * 0.7, cx + radius * 0.7, cy - radius * 0.7), fill=color, width=max(1, radius // 4))


def add_sparkles(image: Image.Image, size: int) -> Image.Image:
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    sparkle_color = hex_to_rgba(SPARKLE, 220)
    draw_sparkle(draw, (int(size * 0.2), int(size * 0.68)), max(8, size // 24), sparkle_color)
    draw_sparkle(draw, (int(size * 0.78), int(size * 0.56)), max(7, size // 28), sparkle_color)
    draw_sparkle(draw, (int(size * 0.84), int(size * 0.74)), max(9, size // 22), sparkle_color)
    return Image.alpha_composite(image, overlay)


def add_glass_medallion(image: Image.Image, center: tuple[int, int], diameter: int) -> Image.Image:
    shadow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    offset = int(diameter * 0.035)
    cx, cy = center
    shadow_draw.ellipse(
        (cx - diameter // 2, cy - diameter // 2 + offset, cx + diameter // 2, cy + diameter // 2 + offset),
        fill=(58, 76, 122, 44),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(int(diameter * 0.08)))
    result = Image.alpha_composite(image, shadow)

    disc = Image.new("RGBA", image.size, (0, 0, 0, 0))
    disc_draw = ImageDraw.Draw(disc)
    disc_draw.ellipse(
        (cx - diameter // 2, cy - diameter // 2, cx + diameter // 2, cy + diameter // 2),
        fill=(255, 255, 255, 232),
        outline=(255, 255, 255, 255),
        width=max(2, diameter // 56),
    )
    disc_draw.ellipse(
        (cx - diameter // 2 + int(diameter * 0.1), cy - diameter // 2 + int(diameter * 0.08), cx + int(diameter * 0.08), cy + int(diameter * 0.02)),
        fill=(255, 255, 255, 44),
    )
    disc = disc.filter(ImageFilter.GaussianBlur(max(1, diameter // 120)))
    return Image.alpha_composite(result, disc)


def create_icon_asset(size: int) -> Image.Image:
    image = vertical_multistop_gradient(size, GRADIENT)
    image = add_soft_glows(image)
    image = add_orbits(image)
    image = add_glass_medallion(image, (size // 2, size // 2), int(size * 0.56))
    image = add_brand_mark(image, (size // 2, size // 2), int(size * 0.36), hex_to_rgba(LOGO_PRIMARY))
    return image


def create_favicon_asset(size: int) -> Image.Image:
    return create_icon_asset(size)


def create_splash_asset(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    image = add_brand_mark(image, (size // 2, size // 2), int(size * 0.44), hex_to_rgba(LOGO_PRIMARY))
    image = add_sparkles(image, size)
    return image


def create_android_background(size: int) -> Image.Image:
    image = vertical_multistop_gradient(size, GRADIENT)
    image = add_soft_glows(image)
    image = add_orbits(image)
    return image


def create_android_foreground(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    image = add_glass_medallion(image, (size // 2, size // 2), int(size * 0.62))
    image = add_brand_mark(image, (size // 2, size // 2), int(size * 0.42), hex_to_rgba(LOGO_PRIMARY))
    return image


def create_monochrome(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    return add_brand_mark(image, (size // 2, size // 2), int(size * 0.68), hex_to_rgba(TEXT_DARK))


def create_notification_icon(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    color = (255, 255, 255, 255)
    cx = size / 2
    cy = size / 2
    stem_width = max(8, int(size * 0.13))
    stem_height = int(size * 0.46)
    serif_width = int(size * 0.34)
    serif_height = max(8, int(size * 0.1))
    radius = stem_width // 2

    draw.rounded_rectangle(
        (cx - stem_width / 2, cy - stem_height / 2, cx + stem_width / 2, cy + stem_height / 2),
        radius=radius,
        fill=color,
    )
    draw.rounded_rectangle(
        (cx - serif_width / 2, cy - stem_height / 2 - serif_height / 5, cx + serif_width / 2, cy - stem_height / 2 + serif_height),
        radius=serif_height / 2,
        fill=color,
    )
    draw.rounded_rectangle(
        (cx - serif_width / 2, cy + stem_height / 2 - serif_height, cx + serif_width / 2, cy + stem_height / 2 + serif_height / 5),
        radius=serif_height / 2,
        fill=color,
    )
    draw.polygon(
        [
            (cx + stem_width * 0.55, cy - size * 0.16),
            (cx + size * 0.26, cy),
            (cx + stem_width * 0.55, cy + size * 0.16),
        ],
        fill=color,
    )
    return image


def save(image: Image.Image, name: str) -> None:
    image.save(ASSETS_DIR / name)
    print(f"generated {name}")


def main() -> None:
    ASSETS_DIR.mkdir(exist_ok=True)
    save(create_icon_asset(1024), "icon.png")
    save(create_splash_asset(1024), "splash-icon.png")
    save(create_android_background(512), "android-icon-background.png")
    save(create_android_foreground(512), "android-icon-foreground.png")
    save(create_monochrome(432), "android-icon-monochrome.png")
    save(create_favicon_asset(256), "favicon.png")
    save(create_notification_icon(96), "notification-icon.png")
    print(f"splash background color: {SPLASH_BG}")


if __name__ == "__main__":
    main()