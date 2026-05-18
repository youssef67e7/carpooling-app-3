"""Render Mermaid blocks to PNG via local HTML + Edge headless."""
from __future__ import annotations

import json
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MD_FILE = ROOT / "IMPROVED_DOCUMENTATION.md"
DIAGRAMS_DIR = ROOT / "diagrams"
MANIFEST = DIAGRAMS_DIR / "manifest.json"

EDGE_PATHS = [
    Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
    Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
    Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
]

FIGURE_META = [
    ("fig01_scrum_lifecycle", "Figure 1 — Scrum lifecycle with gamification and risk layers"),
    ("fig02_risk_intervention", "Figure 2 — Risk management intervention flow"),
    ("fig03_architecture", "Figure 3 — Technical architecture"),
]

HTML_SHELL = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { margin: 24px; background: #fff; font-family: Segoe UI, sans-serif; }
    .mermaid { max-width: 900px; }
    h2 { font-size: 14px; color: #334155; margin-bottom: 16px; font-weight: 600; }
  </style>
</head>
<body>
  <h2>%%CAPTION%%</h2>
  <pre class="mermaid">%%CODE%%</pre>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: true, theme: 'neutral', securityLevel: 'loose' });
    await mermaid.run();
  </script>
</body>
</html>
"""


def find_browser() -> Path:
    for p in EDGE_PATHS:
        if p.is_file():
            return p
    raise FileNotFoundError("Edge/Chrome not found")


def extract_mermaid_blocks(md: str) -> list[str]:
    return [m.group(1).strip() for m in re.finditer(r"```mermaid\n(.*?)```", md, re.DOTALL)]


def screenshot_html(browser: Path, html_path: Path, png_path: Path) -> None:
    if png_path.exists():
        png_path.unlink()
    cmd = [
        str(browser),
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--window-size=1100,850",
        f"--screenshot={png_path}",
        html_path.as_uri(),
    ]
    subprocess.run(cmd, capture_output=True, timeout=90)
    if not png_path.is_file() or png_path.stat().st_size < 800:
        raise RuntimeError(f"Screenshot failed: {png_path}")


def main() -> int:
    md = MD_FILE.read_text(encoding="utf-8")
    blocks = extract_mermaid_blocks(md)
    if len(blocks) != len(FIGURE_META):
        print(f"Expected {len(FIGURE_META)} mermaid blocks, found {len(blocks)}", file=sys.stderr)
        return 1

    DIAGRAMS_DIR.mkdir(parents=True, exist_ok=True)
    browser = find_browser()
    manifest = []

    for (slug, caption), code in zip(FIGURE_META, blocks):
        html_path = DIAGRAMS_DIR / f"{slug}.html"
        png_path = DIAGRAMS_DIR / f"{slug}.png"
        html_path.write_text(
            HTML_SHELL.replace("%%CAPTION%%", caption).replace("%%CODE%%", code),
            encoding="utf-8",
        )
        time.sleep(0.5)
        screenshot_html(browser, html_path, png_path)
        time.sleep(3)
        screenshot_html(browser, html_path, png_path)
        manifest.append({"slug": slug, "caption": caption, "png": png_path.name})
        print(f"OK {png_path.name} ({png_path.stat().st_size // 1024} KB)")

    MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
