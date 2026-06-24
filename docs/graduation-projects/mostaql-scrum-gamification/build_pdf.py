"""Build PDF from IMPROVED_DOCUMENTATION.md using HTML + Edge headless."""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

import markdown
from markdown.extensions.tables import TableExtension
from markdown.extensions.fenced_code import FencedCodeExtension

ROOT = Path(__file__).resolve().parent
MD_FILE = ROOT / "IMPROVED_DOCUMENTATION.md"
HTML_FILE = ROOT / "_build_documentation.html"
PDF_FILE = ROOT / "Mostaql_Scrum_Gamification_v2.1.pdf"
DIAGRAMS_DIR = ROOT / "diagrams"
MANIFEST = DIAGRAMS_DIR / "manifest.json"

EDGE_PATHS = [
    Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
    Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
    Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
]

CSS = """
@page { size: A4; margin: 2cm 2.2cm; }
* { box-sizing: border-box; }
body {
  font-family: "Segoe UI", Calibri, Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.55;
  color: #1a1a1a;
  max-width: 100%;
}
h1 {
  font-size: 22pt;
  color: #0f172a;
  border-bottom: 3px solid #0095ff;
  padding-bottom: 8px;
  margin-top: 28px;
  page-break-after: avoid;
}
h2 {
  font-size: 15pt;
  color: #111;
  margin-top: 22px;
  page-break-after: avoid;
}
h3 { font-size: 12pt; margin-top: 16px; page-break-after: avoid; }
p { margin: 0.6em 0; text-align: justify; }
table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0 16px;
  font-size: 10pt;
  page-break-inside: avoid;
}
th, td {
  border: 1px solid #d4d4d4;
  padding: 8px 10px;
  vertical-align: top;
}
th { background: #f5f5f5; font-weight: 700; text-align: left; }
tr:nth-child(even) td { background: #fafafa; }
blockquote {
  margin: 14px 0;
  padding: 12px 16px;
  border-left: 4px solid #0095ff;
  background: #f8fafc;
  font-style: italic;
  color: #334155;
}
code, pre {
  font-family: Consolas, "Courier New", monospace;
  font-size: 9pt;
}
pre {
  background: #f4f4f5;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  padding: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
  page-break-inside: avoid;
}
hr { border: none; border-top: 1px solid #e5e5e5; margin: 24px 0; }
ul, ol { margin: 8px 0 12px; padding-left: 1.4em; }
li { margin: 4px 0; }
.cover-title {
  text-align: center;
  margin: 40px 0 24px;
  page-break-after: always;
}
.cover-title h1 { border: none; font-size: 26pt; margin-bottom: 8px; }
.cover-meta { font-size: 12pt; color: #525252; line-height: 1.8; }
figure.diagram {
  margin: 18px 0 22px;
  text-align: center;
  page-break-inside: avoid;
}
figure.diagram img {
  max-width: 100%;
  height: auto;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
}
figure.diagram figcaption {
  font-size: 10pt;
  color: #525252;
  margin-top: 10px;
  font-weight: 600;
}
footer.doc-footer {
  margin-top: 40px;
  padding-top: 12px;
  border-top: 1px solid #e5e5e5;
  font-size: 9pt;
  color: #737373;
  text-align: center;
}
@media print {
  a { color: #111; text-decoration: none; }
  h1, h2, h3 { page-break-after: avoid; }
}
"""


def find_browser() -> Path:
    for p in EDGE_PATHS:
        if p.is_file():
            return p
    raise FileNotFoundError("Edge or Chrome not found for PDF export")


def embed_diagram_figures(md: str) -> str:
    if not MANIFEST.is_file():
        return md

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    matches = list(re.finditer(r"```mermaid\n(.*?)```", md, flags=re.DOTALL))
    if not matches:
        return md

    out = md
    for match, entry in zip(reversed(matches), reversed(manifest)):
        png = DIAGRAMS_DIR / entry["png"]
        if not png.is_file():
            continue
        caption = entry.get("caption", "Diagram")
        fig = (
            f'\n\n<figure class="diagram">'
            f'<img src="{png.as_uri()}" alt="{caption}"/>'
            f"<figcaption>{caption}</figcaption>"
            f"</figure>\n\n"
        )
        out = out[: match.start()] + fig + out[match.end() :]
    return out


def md_to_html(md_text: str) -> str:
    md_text = embed_diagram_figures(md_text)
    body = markdown.markdown(
        md_text,
        extensions=[TableExtension(), FencedCodeExtension(), "nl2br"],
    )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Mostaql Scrum Gamification — v2.1</title>
  <style>{CSS}</style>
</head>
<body>
{body}
<footer class="doc-footer">
  © 2026 AASTMT — Youssef Mohamed Salah, Ahmed Yahya, Omar Hamed — Documentation v2.1
</footer>
</body>
</html>"""


def html_to_pdf(html_path: Path, pdf_path: Path) -> None:
    browser = find_browser()
    url = html_path.as_uri()
    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    if pdf_path.exists():
        pdf_path.unlink()
    cmd = [
        str(browser),
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_path}",
        url,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0 or not pdf_path.is_file():
        raise RuntimeError(
            f"PDF export failed (code {result.returncode}):\n{result.stderr or result.stdout}"
        )


def main() -> int:
    if not MD_FILE.is_file():
        print(f"Missing: {MD_FILE}", file=sys.stderr)
        return 1
    if not MANIFEST.is_file():
        print("Running fetch_mermaid_ink.py …")
        import fetch_mermaid_ink

        fetch_mermaid_ink.main()
    md_text = MD_FILE.read_text(encoding="utf-8")
    HTML_FILE.write_text(md_to_html(md_text), encoding="utf-8")
    print(f"HTML: {HTML_FILE}")
    html_to_pdf(HTML_FILE, PDF_FILE)
    size_kb = PDF_FILE.stat().st_size / 1024
    print(f"PDF:  {PDF_FILE} ({size_kb:.1f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
