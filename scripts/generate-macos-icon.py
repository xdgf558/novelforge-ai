#!/usr/bin/env python3
from pathlib import Path
import shutil
import subprocess

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
BUILD_DIR = ROOT / "build"
ICONSET_DIR = BUILD_DIR / "icon.iconset"
SVG_PATH = BUILD_DIR / "icon.svg"
PNG_PATH = BUILD_DIR / "icon.png"
ICNS_PATH = BUILD_DIR / "icon.icns"


def rounded_rectangle(draw, box, radius, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def load_font(size):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica Bold.ttf",
        "/System/Library/Fonts/SFNS.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def create_icon(size=1024):
    scale = size / 1024
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    rounded_rectangle(
        shadow_draw,
        tuple(int(v * scale) for v in (92, 84, 932, 948)),
        int(210 * scale),
        (17, 24, 39, 125),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(int(28 * scale)))
    image.alpha_composite(shadow)

    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg)
    rounded_rectangle(
        bg_draw,
        tuple(int(v * scale) for v in (104, 92, 920, 920)),
        int(188 * scale),
        (24, 54, 72, 255),
    )
    for y in range(size):
        ratio = y / max(size - 1, 1)
        r = int(28 + 28 * ratio)
        g = int(76 + 20 * ratio)
        b = int(91 + 24 * ratio)
        ImageDraw.Draw(bg).line([(0, y), (size, y)], fill=(r, g, b, 255))
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    rounded_rectangle(
        mask_draw,
        tuple(int(v * scale) for v in (104, 92, 920, 920)),
        int(188 * scale),
        255,
    )
    image.alpha_composite(Image.composite(bg, Image.new("RGBA", (size, size)), mask))

    draw = ImageDraw.Draw(image)

    # Warm manuscript page.
    page = tuple(int(v * scale) for v in (254, 228, 760, 820))
    rounded_rectangle(draw, page, int(48 * scale), (244, 238, 220, 255))
    draw.polygon(
        [
            (int(704 * scale), int(228 * scale)),
            (int(760 * scale), int(286 * scale)),
            (int(704 * scale), int(292 * scale)),
        ],
        fill=(219, 205, 176, 255),
    )

    # Continuity lines.
    line_color = (42, 82, 97, 210)
    for y in [356, 426, 496, 566, 636]:
        draw.rounded_rectangle(
            tuple(int(v * scale) for v in (334, y, 686, y + 18)),
            radius=int(9 * scale),
            fill=line_color,
        )
    draw.rounded_rectangle(
        tuple(int(v * scale) for v in (334, 706, 592, 724)),
        radius=int(9 * scale),
        fill=(224, 99, 82, 220),
    )

    # Spark / AI mark.
    center = (int(716 * scale), int(352 * scale))
    accent = (57, 188, 172, 255)
    draw.polygon(
        [
            (center[0], int(252 * scale)),
            (int(742 * scale), int(326 * scale)),
            (int(822 * scale), center[1]),
            (int(742 * scale), int(378 * scale)),
            (center[0], int(456 * scale)),
            (int(690 * scale), int(378 * scale)),
            (int(610 * scale), center[1]),
            (int(690 * scale), int(326 * scale)),
        ],
        fill=accent,
    )
    draw.ellipse(
        tuple(int(v * scale) for v in (684, 320, 748, 384)),
        fill=(249, 246, 236, 255),
    )

    # NF monogram.
    font = load_font(int(150 * scale))
    draw.text(
        (int(278 * scale), int(198 * scale)),
        "N",
        font=font,
        fill=(224, 99, 82, 255),
    )
    draw.text(
        (int(390 * scale), int(198 * scale)),
        "F",
        font=font,
        fill=(42, 82, 97, 255),
    )

    return image


def write_svg():
    SVG_PATH.write_text(
        """<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1024 1024\" role=\"img\" aria-label=\"NovelForge AI app icon\">
  <defs>
    <linearGradient id=\"bg\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">
      <stop offset=\"0\" stop-color=\"#1c4c5b\"/>
      <stop offset=\"1\" stop-color=\"#385f73\"/>
    </linearGradient>
  </defs>
  <rect x=\"104\" y=\"92\" width=\"816\" height=\"828\" rx=\"188\" fill=\"url(#bg)\"/>
  <rect x=\"254\" y=\"228\" width=\"506\" height=\"592\" rx=\"48\" fill=\"#f4eedc\"/>
  <path d=\"M704 228l56 58-56 6z\" fill=\"#dbcdb0\"/>
  <path d=\"M716 252l26 74 80 26-80 26-26 78-26-78-80-26 80-26z\" fill=\"#39bcac\"/>
  <circle cx=\"716\" cy=\"352\" r=\"32\" fill=\"#f9f6ec\"/>
  <text x=\"278\" y=\"342\" font-size=\"150\" font-weight=\"700\" font-family=\"Arial, Helvetica, sans-serif\" fill=\"#e06352\">N</text>
  <text x=\"390\" y=\"342\" font-size=\"150\" font-weight=\"700\" font-family=\"Arial, Helvetica, sans-serif\" fill=\"#2a5261\">F</text>
  <g fill=\"#2a5261\" opacity=\".82\">
    <rect x=\"334\" y=\"356\" width=\"352\" height=\"18\" rx=\"9\"/>
    <rect x=\"334\" y=\"426\" width=\"352\" height=\"18\" rx=\"9\"/>
    <rect x=\"334\" y=\"496\" width=\"352\" height=\"18\" rx=\"9\"/>
    <rect x=\"334\" y=\"566\" width=\"352\" height=\"18\" rx=\"9\"/>
    <rect x=\"334\" y=\"636\" width=\"352\" height=\"18\" rx=\"9\"/>
  </g>
  <rect x=\"334\" y=\"706\" width=\"258\" height=\"18\" rx=\"9\" fill=\"#e06352\" opacity=\".9\"/>
</svg>
""",
        encoding="utf-8",
    )


def save_iconset(source):
    if ICONSET_DIR.exists():
        shutil.rmtree(ICONSET_DIR)
    ICONSET_DIR.mkdir(parents=True)

    specs = [
        (16, "icon_16x16.png"),
        (32, "icon_16x16@2x.png"),
        (32, "icon_32x32.png"),
        (64, "icon_32x32@2x.png"),
        (128, "icon_128x128.png"),
        (256, "icon_128x128@2x.png"),
        (256, "icon_256x256.png"),
        (512, "icon_256x256@2x.png"),
        (512, "icon_512x512.png"),
        (1024, "icon_512x512@2x.png"),
    ]

    for size, name in specs:
        resized = source.resize((size, size), Image.Resampling.LANCZOS)
        resized.convert("RGB").save(ICONSET_DIR / name, dpi=(72, 72))


def main():
    BUILD_DIR.mkdir(exist_ok=True)
    icon = create_icon()
    icon.convert("RGB").save(PNG_PATH, dpi=(72, 72))
    write_svg()
    save_iconset(icon)
    subprocess.run(
        ["iconutil", "--convert", "icns", "--output", str(ICNS_PATH), str(ICONSET_DIR)],
        check=True,
    )
    shutil.rmtree(ICONSET_DIR)
    print(f"Generated {ICNS_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
