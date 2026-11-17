#!/usr/bin/env python3
"""Compile a Hetu plugin source tree into a distributable `.smplug` archive.

A `.smplug` is a plain ZIP holding `plugin.json`, `plugin.out` (compiled Hetu
bytecode) and the plugin logo. The per-plugin Makefiles used to shell out to the
`zip` binary, which is not installed everywhere (notably minimal CI/container
images), so the archive step failed with `zip: not found`. This script uses
Python's stdlib `zipfile` instead, so `make archive` works with only the `hetu`
CLI and Python 3 on PATH.

Usage:
    python3 tools/build_smplug.py plugin-sources/<name>
"""
import json
import os
import shutil
import subprocess
import sys
import zipfile


def fail(message: str) -> "None":
    print(f"error: {message}", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    if len(sys.argv) != 2:
        fail("usage: build_smplug.py <plugin-source-dir>")

    root = os.path.abspath(sys.argv[1])
    src = os.path.join(root, "src", "plugin.ht")
    if not os.path.isfile(src):
        fail(f"missing {src}")

    build_dir = os.path.join(root, "build")
    archive_dir = os.path.join(build_dir, "archive")
    os.makedirs(archive_dir, exist_ok=True)

    plugin_out = os.path.join(build_dir, "plugin.out")
    try:
        subprocess.run(
            ["hetu", "compile", "src/plugin.ht", "build/plugin.out"],
            cwd=root,
            check=True,
        )
    except FileNotFoundError:
        fail("the `hetu` CLI is not on PATH (dart pub global activate hetu_script)")
    except subprocess.CalledProcessError as exc:
        fail(f"hetu compile failed with exit code {exc.returncode}")

    manifest_path = os.path.join(root, "plugin.json")
    if not os.path.isfile(manifest_path):
        fail(f"missing {manifest_path}")
    with open(manifest_path, encoding="utf-8") as handle:
        manifest = json.load(handle)

    shutil.copy(manifest_path, os.path.join(archive_dir, "plugin.json"))
    shutil.copy(plugin_out, os.path.join(archive_dir, "plugin.out"))
    logo = os.path.join(root, "assets", "logo.png")
    if os.path.isfile(logo):
        shutil.copy(logo, os.path.join(archive_dir, "logo.png"))

    # Zip layout matters: the app resolves `plugin.json` by its bare name.
    archive_path = os.path.join(build_dir, "plugin.smplug")
    if os.path.exists(archive_path):
        os.remove(archive_path)
    with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for name in sorted(os.listdir(archive_dir)):
            archive.write(os.path.join(archive_dir, name), name)

    published = os.path.join(root, "plugin.smplug")
    shutil.copy(archive_path, published)
    print(f"built {published} ({manifest.get('name')} {manifest.get('version')})")


if __name__ == "__main__":
    main()
