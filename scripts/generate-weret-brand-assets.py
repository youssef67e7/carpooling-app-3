"""Generate WERET logo + platform icons from source brand image."""
from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "branding" / "weret_logo_source.png"
# Fallback: latest uploaded logo in cursor assets
CURSOR_ASSETS = Path(r"C:\Users\arwam\.cursor\projects\d-Games-ReachNative-Car\assets")
FALLBACK = next(CURSOR_ASSETS.glob("*image-fec0cb45*.png"), None)

OUT_BRAND = ROOT / "assets" / "branding"
OUT_FLUTTER = ROOT / "apps" / "mobile-flutter" / "assets" / "branding"
OUT_WEB_FLUTTER = ROOT / "apps" / "mobile-flutter" / "web"
OUT_WEB_ADMIN = ROOT / "apps" / "web"
BG = (18, 18, 20, 255)


def ensure_source() -> Path:
    OUT_BRAND.mkdir(parents=True, exist_ok=True)
    OUT_FLUTTER.mkdir(parents=True, exist_ok=True)
    if SRC.exists():
        return SRC
    if FALLBACK and FALLBACK.exists():
        shutil.copy2(FALLBACK, SRC)
        return SRC
    raise SystemExit(f"Source logo not found: {SRC}")


def save_logo_variants(src: Path) -> None:
    img = Image.open(src).convert("RGBA")
    for dest in [OUT_BRAND / "weret_logo.png", OUT_FLUTTER / "weret_logo.png"]:
        img.save(dest, optimize=True)
    # Wide header variant (max width 640)
    w, h = img.size
    max_w = 640
    if w > max_w:
        nh = int(h * (max_w / w))
        header = img.resize((max_w, nh), Image.Resampling.LANCZOS)
    else:
        header = img
    header.save(OUT_BRAND / "weret_logo_header.png", optimize=True)
    header.save(OUT_FLUTTER / "weret_logo_header.png", optimize=True)


def make_square_icon(src: Path, size: int) -> Image.Image:
    img = Image.open(src).convert("RGBA")
    w, h = img.size
    side = max(w, h)
    canvas = Image.new("RGBA", (side, side), BG)
    canvas.paste(img, ((side - w) // 2, (side - h) // 2), img)
    square = canvas.resize((size, size), Image.Resampling.LANCZOS)
    return square


def save_png(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, optimize=True)


def generate_platform_icons(src: Path) -> None:
    sizes = {
        "icon.png": 1024,
        "adaptive-icon.png": 1024,
        "splash.png": 1284,
    }
    for name, size in sizes.items():
        save_png(make_square_icon(src, size), ROOT / "assets" / name)

    web_icons = OUT_WEB_FLUTTER / "icons"
    web_icons.mkdir(parents=True, exist_ok=True)
    for size in (192, 512):
        save_png(make_square_icon(src, size), web_icons / f"Icon-{size}.png")
        save_png(make_square_icon(src, size), web_icons / f"Icon-maskable-{size}.png")
    save_png(make_square_icon(src, 32), OUT_WEB_FLUTTER / "favicon.png")
    save_png(make_square_icon(src, 180), OUT_WEB_FLUTTER / "apple-touch-icon.png")

    admin_sizes = [16, 32, 48, 64, 128, 192, 512]
    for size in admin_sizes:
        save_png(make_square_icon(src, size), OUT_WEB_ADMIN / f"favicon-{size}.png")
    save_png(make_square_icon(src, 32), OUT_WEB_ADMIN / "favicon.png")
    save_png(make_square_icon(src, 192), OUT_WEB_ADMIN / "apple-touch-icon.png")
    save_png(make_square_icon(src, 512), OUT_WEB_ADMIN / "weret-logo.png")
    shutil.copy2(OUT_BRAND / "weret_logo_header.png", OUT_WEB_ADMIN / "weret-logo-header.png")


def main() -> None:
    src = ensure_source()
    save_logo_variants(src)
    generate_platform_icons(src)
    print("WERET brand assets generated.")


if __name__ == "__main__":
    main()
