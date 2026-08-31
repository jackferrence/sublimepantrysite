#!/usr/bin/env python3
"""Verify every internal href/src resolves to a real file in the repo,
and that every application/ld+json block is valid JSON. No external
network calls, no build step - just a static check on committed HTML."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML_FILES = sorted(ROOT.glob("**/*.html"))

LINK_RE = re.compile(r'(?:href|src)="(/[^"#?]*)')
LDJSON_RE = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.S)

errors = []

for f in HTML_FILES:
    text = f.read_text(encoding="utf-8")
    rel = f.relative_to(ROOT)

    for m in LINK_RE.finditer(text):
        path = m.group(1)
        candidate = ROOT / path.lstrip("/")
        resolved = None
        if candidate.exists() and candidate.is_file():
            resolved = candidate
        elif (candidate / "index.html").exists():
            resolved = candidate / "index.html"
        elif candidate.with_suffix(".html").exists():
            resolved = candidate.with_suffix(".html")
        if resolved is None:
            errors.append(f"{rel}: broken internal link -> {path}")

    for m in LDJSON_RE.finditer(text):
        try:
            json.loads(m.group(1))
        except json.JSONDecodeError as e:
            errors.append(f"{rel}: invalid JSON-LD ({e})")

if errors:
    print(f"FAILED - {len(errors)} issue(s) found:\n")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)

print(f"OK - checked {len(HTML_FILES)} HTML files, no broken internal links or invalid JSON-LD.")
