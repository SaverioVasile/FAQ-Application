#!/usr/bin/env python3
from __future__ import annotations

import html
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MARKDOWN = ROOT / "scelte-tecniche.md"
PDF_OUT = ROOT / "scelte-tecniche.pdf"
CHROME_CANDIDATES = [
    Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
    Path("/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"),
    Path("/Applications/Chromium.app/Contents/MacOS/Chromium"),
]

CSS = """<style>
  @page { size: A4; margin: 2.2cm 2.2cm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.65;
    color: #1e293b;
    max-width: none;
    margin: 0;
    padding: 0;
  }
  h1 {
    font-size: 22pt;
    font-weight: 800;
    color: #1e293b;
    border-bottom: 3px solid #4f46e5;
    padding-bottom: 10px;
    margin: 0 0 6px;
  }
  h2 {
    font-size: 14pt;
    font-weight: 700;
    color: #4f46e5;
    margin-top: 32px;
    margin-bottom: 6px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 4px;
  }
  h3 {
    font-size: 12pt;
    font-weight: 600;
    color: #334155;
    margin-top: 20px;
    margin-bottom: 4px;
  }
  p { margin: 8px 0; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10pt;
    margin: 14px 0;
  }
  th {
    background-color: #4f46e5;
    color: #fff;
    padding: 7px 12px;
    text-align: left;
    font-weight: 600;
  }
  td {
    padding: 6px 12px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: top;
  }
  tr:nth-child(even) td { background-color: #f8fafc; }
  code {
    font-family: 'Menlo', 'Courier New', monospace;
    font-size: 9.5pt;
    background-color: #f1f5f9;
    padding: 1px 5px;
    border-radius: 3px;
    color: #7c3aed;
  }
  pre {
    background-color: #0f172a;
    color: #e2e8f0;
    padding: 14px 18px;
    border-radius: 8px;
    font-size: 9pt;
    overflow-x: auto;
    line-height: 1.5;
    margin: 14px 0;
    white-space: pre-wrap;
    word-break: break-word;
  }
  pre code {
    background: none;
    color: #e2e8f0;
    padding: 0;
    font-size: 9pt;
  }
  ul, ol {
    padding-left: 22px;
    margin: 8px 0;
  }
  li { margin: 3px 0; }
  hr {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 28px 0;
  }
  .subtitle {
    font-size: 10pt;
    color: #64748b;
    margin-top: 0;
    margin-bottom: 20px;
  }
</style>"""


def require_binary(name: str) -> str:
    path = shutil.which(name)
    if not path:
        raise SystemExit(f"Missing required binary: {name}")
    return path


def find_browser() -> str:
    for candidate in CHROME_CANDIDATES:
        if candidate.exists():
            return str(candidate)
    raise SystemExit("No Chromium-based browser found (Chrome / Edge / Chromium).")


def extract_metadata(markdown_text: str) -> tuple[str, str]:
    title = "Scelte Tecniche"
    lines = markdown_text.splitlines()
    subtitle_parts: list[str] = []

    for line in lines:
        if line.startswith("# ") and title == "Scelte Tecniche":
            title = line[2:].strip()
            continue
        if line.startswith("**Progetto:**"):
            subtitle_parts.append(line.replace("**Progetto:**", "").strip())
        elif line.startswith("**Versione:**"):
            subtitle_parts.append(line.replace("**Versione:**", "").strip())
        elif subtitle_parts:
            break

    return title, " · ".join(part for part in subtitle_parts if part)


def build_styled_html(markdown_path: Path, output_html: Path) -> str:
    pandoc = require_binary("pandoc")
    markdown_text = markdown_path.read_text(encoding="utf-8")
    title, subtitle = extract_metadata(markdown_text)

    subprocess.run(
        [pandoc, str(markdown_path), "-s", "-o", str(output_html)],
        check=True,
    )

    html_text = output_html.read_text(encoding="utf-8")
    html_text = re.sub(r"<title>.*?</title>", f"<title>{html.escape(title)}</title>", html_text, count=1, flags=re.DOTALL)
    html_text = html_text.replace("</head>", CSS + "\n</head>", 1)
    html_text = re.sub(
        r"<header id=\"title-block-header\">.*?</header>",
        "",
        html_text,
        count=1,
        flags=re.DOTALL,
    )

    subtitle_html = f'\n<p class="subtitle">{html.escape(subtitle)}</p>' if subtitle else ""
    title_pattern = re.compile(r'(<h1[^>]*>.*?</h1>)', re.DOTALL)
    html_text, count = title_pattern.subn(rf'\1{subtitle_html}', html_text, count=1)
    if count == 0:
        raise SystemExit("Unable to find document H1 in generated HTML.")

    html_text = re.sub(
        r"<p><strong>Progetto:</strong>.*?</p>",
        "",
        html_text,
        count=1,
        flags=re.DOTALL,
    )

    output_html.write_text(html_text, encoding="utf-8")
    return title


def render_pdf(html_file: Path, pdf_file: Path) -> None:
    browser = find_browser()
    subprocess.run(
        [
            browser,
            "--headless=new",
            "--disable-gpu",
            "--allow-file-access-from-files",
            "--no-pdf-header-footer",
            f"--print-to-pdf={pdf_file}",
            html_file.resolve().as_uri(),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="scelte-tecniche-") as tmpdir:
        html_path = Path(tmpdir) / "scelte-tecniche.html"
        title = build_styled_html(MARKDOWN, html_path)
        render_pdf(html_path, PDF_OUT)
    print(f"OK - regenerated {PDF_OUT.name} with title: {title}")


if __name__ == "__main__":
    main()

