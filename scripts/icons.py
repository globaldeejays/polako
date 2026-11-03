# Draws the app icons: cobalt tile, white "P" over a yellow highlighter stroke.
from PIL import Image, ImageDraw, ImageFont
import sys, os

out = sys.argv[1] if len(sys.argv) > 1 else 'site'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
BLUE, YELLOW, WHITE = (35, 64, 200), (255, 216, 77), (255, 255, 255)

def icon(size, scale, name):
    s = size * 4
    img = Image.new('RGB', (s, s), BLUE)
    d = ImageDraw.Draw(img)
    c = s / 2
    bw, bh = s * 0.52 * scale, s * 0.17 * scale
    d.rounded_rectangle([c - bw / 2, c + s * 0.02 * scale, c + bw / 2, c + s * 0.02 * scale + bh], radius=bh * 0.25, fill=YELLOW)
    f = ImageFont.truetype(FONT, int(s * 0.62 * scale))
    box = d.textbbox((0, 0), 'P', font=f)
    w, h = box[2] - box[0], box[3] - box[1]
    d.text((c - w / 2 - box[0], c - h / 2 - box[1] - s * 0.02 * scale), 'P', font=f, fill=WHITE)
    img.resize((size, size), Image.LANCZOS).save(os.path.join(out, name))

icon(192, 1.0, 'icon-192.png')
icon(512, 1.0, 'icon-512.png')
icon(512, 0.72, 'icon-maskable-512.png')
print('icons written to', out)
