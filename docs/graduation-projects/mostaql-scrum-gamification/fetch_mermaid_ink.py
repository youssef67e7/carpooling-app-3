"""Download diagram PNGs from mermaid.ink (SSL verify disabled for local build)."""
from __future__ import annotations

import base64
import json
import re
import ssl
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MD_FILE = ROOT / "IMPROVED_DOCUMENTATION.md"
DIAGRAMS_DIR = ROOT / "diagrams"
MANIFEST = DIAGRAMS_DIR / "manifest.json"

FIGURE_META = [
    ("fig01_scrum_lifecycle", "Figure 1 — Scrum lifecycle with gamification and risk layers"),
    ("fig02_risk_intervention", "Figure 2 — Risk management intervention flow"),
    ("fig03_architecture", "Figure 3 — Technical architecture"),
]

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE


def extract_mermaid_blocks(md: str) -> list[str]:
    return [m.group(1).strip() for m in re.finditer(r"```mermaid\n(.*?)```", md, re.DOTALL)]


def download_png(code: str, dest: Path) -> None:
    encoded = base64.urlsafe_b64encode(code.encode("utf-8")).decode("ascii").rstrip("=")
    url = f"https://mermaid.ink/img/{encoded}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=90) as resp:
        data = resp.read()
    if len(data) < 2000:
        raise RuntimeError(f"Response too small ({len(data)} bytes) for {dest.name}")
    dest.write_bytes(data)


def main() -> int:
    md = MD_FILE.read_text(encoding="utf-8")
    blocks = extract_mermaid_blocks(md)
    if len(blocks) != len(FIGURE_META):
        raise SystemExit(f"Expected {len(FIGURE_META)} blocks, got {len(blocks)}")

    DIAGRAMS_DIR.mkdir(parents=True, exist_ok=True)
    manifest = []
    for (slug, caption), code in zip(FIGURE_META, blocks):
        # Normalize special dash for mermaid compatibility
        code = code.replace("A–D", "A-D").replace("–", "-")
        png = DIAGRAMS_DIR / f"{slug}.png"
        download_png(code, png)
        manifest.append({"slug": slug, "caption": caption, "png": png.name})
        print(f"OK {png.name} ({png.stat().st_size // 1024} KB)")

    MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
