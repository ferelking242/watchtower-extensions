#!/usr/bin/env python3
"""
build_wext.py – Generate .wext bundles for every locally-hosted JS extension.

A .wext file is a self-contained extension package:
  {
    "format": "wext/1.0",
    "metadata": { ...all Source fields from the index... },
    "source":   "...JS source code as UTF-8 string..."
  }

Users can share .wext files and import them directly into the Watchtower app
without needing to add a repository URL.

Usage:
    python3 tools/build_wext.py
Output: wext/<category>/<lang>/<name>.wext  (mirrors JS file locations)
"""

import json, os, pathlib, re

REPO_RAW = "https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/"
INDEXES  = ["watch/index.json", "manga/index.json", "novel/index.json", "game/index.json"]
ROOT     = pathlib.Path(__file__).parent.parent

generated = 0
for idx_path in INDEXES:
    entries = json.loads((ROOT / idx_path).read_text(encoding="utf-8"))
    for entry in entries:
        url = entry.get("sourceCodeUrl", "")
        if not url.startswith(REPO_RAW):
            continue
        rel = url.replace(REPO_RAW, "")
        js_path = ROOT / rel
        if not js_path.exists():
            print(f"  SKIP (missing): {rel}")
            continue
        source_code = js_path.read_text(encoding="utf-8")
        bundle = {
            "format": "wext/1.0",
            "metadata": {k: v for k, v in entry.items() if k != "sourceCodeUrl"},
            "source": source_code,
        }
        # Mirror path under wext/
        wext_path = ROOT / "wext" / rel.replace(".js", ".wext")
        wext_path.parent.mkdir(parents=True, exist_ok=True)
        wext_path.write_text(
            json.dumps(bundle, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        generated += 1

print(f"Generated {generated} .wext files in wext/")
