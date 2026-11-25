#!/usr/bin/env python3
"""Compose 16:9 cards for the MLP France source.

mlp-france.com only ships 1000x200 logo strips. Cropped into a 16:9 card the
two ends disappear and the art is upscaled, which both looks blurry and hides
part of the logo. Here the strip is kept at its native size, centred, on a
gradient sampled from its own colours.

    python3 tools/gen_mlpfrance_covers.py             # every show
    python3 tools/gen_mlpfrance_covers.py saison1 eqg # a few ids

Output: assets/covers/mlpfrance/<show id>.jpg (1280x720) and, in the source
file, MLP_COVERS + id + ".jpg". Needs Pillow (`pip install pillow`).
"""

import colorsys
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request

BASE = "https://mlp-france.com"
SOURCE = "src/watch/fr/mlpfrance.js"
OUT_DIR = "assets/covers/mlpfrance"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0"}
WIDTH, HEIGHT = 1280, 720
SHOW_RE = re.compile(
    r'\{ id: "([^"]+)", group: "[^"]+", kind: "(\w+)", name: "([^"]+)", '
    r'path: "([^"]+)", image: "([^"]+)"'
)


def read_shows():
    with open(SOURCE, encoding="utf-8") as handle:
        text = handle.read()
    return [
        {"id": g[0], "kind": g[1], "name": g[2], "path": g[3], "image": g[4]}
        for g in SHOW_RE.findall(text)
    ]


def fetch(url, timeout=30):
    request = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(request, timeout=timeout).read()


def banner_url(show):
    """Wide banner of the page (ratio >= 3); episode stills are skipped."""
    from PIL import Image

    page = BASE + show["path"]
    try:
        html = fetch(page).decode("utf-8", "replace")
    except Exception:
        return None
    for src in re.findall(r'<img[^>]+src="([^"]+)"', html):
        if "/source/" not in src:
            continue
        url = urllib.parse.urljoin(page, src)
        try:
            data = fetch(url)
            image = Image.open(io.BytesIO(data))
            if image.width < 3 * image.height:
                break  # les vignettes d'épisode (260x146) ne sont pas des bannières
            return data
        except Exception:
            continue
    return None


def dominant_color(image):
    """Average hue of the non-white pixels, pushed to a usable saturation."""
    from PIL import Image

    small = image.resize((60, 12), Image.LANCZOS).convert("RGB")
    pixels = [p for p in small.getdata() if not (p[0] > 232 and p[1] > 232 and p[2] > 232)]
    if not pixels:
        return (52, 40, 96)
    red = sum(p[0] for p in pixels) // len(pixels)
    green = sum(p[1] for p in pixels) // len(pixels)
    blue = sum(p[2] for p in pixels) // len(pixels)
    # Le pastel donne un gris : on garde la teinte, on remonte saturation et
    # luminosité pour que la carte reste lisible derrière le bandeau blanc.
    hue, saturation, value = colorsys.rgb_to_hsv(red / 255, green / 255, blue / 255)
    saturation = max(saturation, 0.55)
    value = max(value, 0.62)
    red, green, blue = colorsys.hsv_to_rgb(hue, saturation, value)
    return (int(red * 255), int(green * 255), int(blue * 255))


def gradient(color):
    from PIL import Image, ImageDraw

    top = (int(color[0] * 0.95), int(color[1] * 0.95), int(color[2] * 0.95))
    bottom = (int(color[0] * 0.22) + 6, int(color[1] * 0.22) + 6, int(color[2] * 0.26) + 10)
    canvas = Image.new("RGB", (WIDTH, HEIGHT), bottom)
    draw = ImageDraw.Draw(canvas)
    for y in range(HEIGHT):
        ratio = y / (HEIGHT - 1)
        draw.line(
            [(0, y), (WIDTH, y)],
            fill=(
                int(top[0] + (bottom[0] - top[0]) * ratio),
                int(top[1] + (bottom[1] - top[1]) * ratio),
                int(top[2] + (bottom[2] - top[2]) * ratio),
            ),
        )
    return canvas


def glow(canvas, color, width, height):
    from PIL import Image, ImageDraw, ImageFilter

    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    left = (WIDTH - width) // 2 - 60
    top = (HEIGHT - height) // 2 - 60
    draw.ellipse(
        [left, top, left + width + 120, top + height + 120],
        fill=(min(color[0] + 90, 255), min(color[1] + 90, 255), min(color[2] + 90, 255), 60),
    )
    layer = layer.filter(ImageFilter.GaussianBlur(90))
    canvas.paste(Image.alpha_composite(canvas.convert("RGBA"), layer).convert("RGB"), (0, 0))
    return canvas


def rounded(image, radius):
    from PIL import Image, ImageDraw

    mask = Image.new("L", image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, image.width - 1, image.height - 1], radius, fill=255)
    out = image.convert("RGBA")
    out.putalpha(mask)
    return out


def paste_strip(canvas, strip):
    from PIL import Image, ImageFilter

    x = (WIDTH - strip.width) // 2
    y = (HEIGHT - strip.height) // 2
    pad = 26
    shadow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    block = Image.new("RGBA", (strip.width + pad * 2, strip.height + pad * 2), (0, 0, 0, 170))
    shadow.paste(block, (x - pad, y - pad + 10))
    shadow = shadow.filter(ImageFilter.GaussianBlur(22))
    out = Image.alpha_composite(canvas.convert("RGBA"), shadow)
    out.alpha_composite(rounded(strip, 16), (x, y))
    return out.convert("RGB")


def subtitle(name):
    """« Star VS — Saison 2 » -> « Saison 2 » ; les films n'ont pas d'étiquette."""
    parts = name.split(" — ")
    return parts[1] if len(parts) > 1 else ""


def badge(canvas, label):
    """Petite étiquette : les saisons d'une même série partagent la bannière."""
    from PIL import Image, ImageDraw, ImageFont

    text = label.upper().strip()
    if not text:
        return canvas
    if len(text) > 22:
        text = text[:21].rstrip() + "…"
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 26)
    except OSError:
        font = ImageFont.load_default()

    draw = ImageDraw.Draw(canvas)
    width = draw.textlength(text, font=font)
    pad_x, pad_y = 22, 12
    box_w = int(width) + pad_x * 2
    box_h = 26 + pad_y * 2
    x = WIDTH - 44 - box_w
    y = HEIGHT - 44 - box_h

    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(
        [x, y, x + box_w, y + box_h], radius=box_h // 2, fill=(0, 0, 0, 120)
    )
    out = Image.alpha_composite(canvas.convert("RGBA"), layer)
    ImageDraw.Draw(out).text((x + pad_x, y + pad_y - 2), text, font=font, fill=(255, 255, 255, 235))
    return out.convert("RGB")


def title_card(show, color):
    """Fallback when the page banner is gone: name on the same gradient."""
    from PIL import Image, ImageDraw, ImageFont

    canvas = gradient(color)
    canvas = glow(canvas, color, 900, 200)
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 76)
        small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 30)
    except OSError:
        font = small = ImageFont.load_default()

    lines, current = [], ""
    for word in show["name"].split(" "):
        candidate = (current + " " + word).strip()
        if draw.textlength(candidate, font=font) <= WIDTH - 220:
            current = candidate
        else:
            lines.append(current)
            current = word
    lines.append(current)

    total = len(lines) * 96
    y = (HEIGHT - total) // 2
    for line in lines:
        width = draw.textlength(line, font=font)
        draw.text(((WIDTH - width) / 2 + 3, y + 3), line, font=font, fill=(0, 0, 0))
        draw.text(((WIDTH - width) / 2, y), line, font=font, fill=(255, 255, 255))
        y += 96
    label = "MLP France"
    width = draw.textlength(label, font=small)
    draw.text(((WIDTH - width) / 2, y + 8), label, font=small, fill=(235, 235, 245))
    return canvas


def build(show):
    from PIL import Image

    data = banner_url(show)
    if data:
        # Plusieurs bannières sont des PNG transparents : le site les affiche
        # sur blanc, on fait pareil (sinon les zones vides sortent cyan/noir).
        strip = Image.open(io.BytesIO(data))
        if strip.mode in ("RGBA", "LA", "P"):
            strip = strip.convert("RGBA")
            canvas_white = Image.new("RGB", strip.size, (255, 255, 255))
            canvas_white.paste(strip, mask=strip.split()[-1])
            strip = canvas_white
        else:
            strip = strip.convert("RGB")
        if strip.width > WIDTH - 120:
            strip = strip.resize((WIDTH - 120, int(strip.height * (WIDTH - 120) / strip.width)), Image.LANCZOS)
        color = dominant_color(strip)
        canvas = glow(gradient(color), color, strip.width, strip.height)
        return badge(paste_strip(canvas, strip), subtitle(show["name"]))
    return title_card(show, (58, 46, 96))


def main(ids):
    shows = read_shows()
    if ids:
        shows = [s for s in shows if s["id"] in ids]
    os.makedirs(OUT_DIR, exist_ok=True)
    manifest = {}
    for show in shows:
        try:
            cover = build(show)
        except Exception as error:  # noqa: BLE001 — report and keep going
            print(f"✗ {show['id']}: {error}")
            continue
        target = os.path.join(OUT_DIR, show["id"] + ".jpg")
        cover.save(target, quality=86, optimize=True, progressive=True)
        manifest[show["id"]] = True
        print(f"✓ {show['id']:9} {os.path.getsize(target) // 1024:4} KB  {show['name']}")
    print(f"\n{len(manifest)} cover(s) → {OUT_DIR}")


if __name__ == "__main__":
    try:
        import PIL  # noqa: F401
    except ImportError:
        sys.exit("Pillow is required: pip install pillow")
    main(sys.argv[1:])
