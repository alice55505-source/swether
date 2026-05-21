#!/usr/bin/env python3
"""Generate PNG icons for Swether PWA - nutrition cutting game"""

import struct, zlib, math, os

def make_png(w, h, pixels):
    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
    raw = b''.join(
        b'\x00' + b''.join(bytes(pixels[y * w + x]) for x in range(w))
        for y in range(h)
    )
    idat = chunk(b'IDAT', zlib.compress(raw, 9))
    iend = chunk(b'IEND', b'')
    return sig + ihdr + idat + iend

def d2(x1, y1, x2, y2):
    return (x1-x2)**2 + (y1-y2)**2

def in_circle(x, y, cx, cy, r):
    return d2(x, y, cx, cy) <= r * r

def line_dist(x, y, x1, y1, x2, y2):
    dx, dy = x2 - x1, y2 - y1
    lenSq = dx*dx + dy*dy
    t = max(0.0, min(1.0, ((x-x1)*dx + (y-y1)*dy) / lenSq)) if lenSq > 0 else 0
    return math.sqrt(d2(x, y, x1 + t*dx, y1 + t*dy))

def lerp(c1, c2, t):
    t = max(0.0, min(1.0, t))
    return [int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3)]

def render(size):
    cx = cy = size / 2.0
    s = size
    pix = []

    # colours
    BG1  = [76, 175, 80]    # #4CAF50 centre
    BG2  = [27, 94, 32]     # #1B5E20 edge
    RED  = [229, 57, 53]    # tomato
    ORA  = [251, 140, 0]    # carrot / orange
    GRN  = [124, 179, 66]   # broccoli
    WHT  = [255, 255, 255]
    HILIT= [255, 255, 220]  # highlight tint

    r_food = s * 0.155
    knife_w = s * 0.038

    # food centres  (slight triangle arrangement)
    foods = [
        (cx - s*0.135, cy - s*0.09, RED),
        (cx + s*0.135, cy - s*0.09, ORA),
        (cx,           cy + s*0.13, GRN),
    ]

    # knife endpoints (top-right → bottom-left diagonal)
    kx1, ky1 = cx + s*0.30, cy - s*0.30
    kx2, ky2 = cx - s*0.30, cy + s*0.30

    for y in range(size):
        for x in range(size):
            # ── background: radial gradient ──
            r_bg = math.sqrt(d2(x, y, cx, cy)) / (s * 0.5)
            color = lerp(BG1, BG2, min(1.0, r_bg * 1.2))

            # ── knife shadow (dark, slightly offset) ──
            d_knife = line_dist(x, y, kx1+knife_w*0.7, ky1+knife_w*0.7,
                                       kx2+knife_w*0.7, ky2+knife_w*0.7)
            if d_knife < knife_w * 0.9:
                color = lerp(color, [0, 0, 0], 0.3 * max(0, 1 - d_knife / (knife_w * 0.9)))

            # ── food circles ──
            for fcx, fcy, fc in foods:
                d = math.sqrt(d2(x, y, fcx, fcy))
                if d < r_food:
                    # soft edge
                    edge_t = min(1.0, (r_food - d) / (r_food * 0.12))
                    base = fc
                    # radial highlight (top-left)
                    hl_t = max(0.0, 1.0 - math.sqrt(d2(x, y, fcx - r_food*0.3, fcy - r_food*0.3)) / (r_food * 0.6))
                    lit = lerp(base, HILIT, hl_t * 0.45)
                    color = lerp(color, lit, edge_t)

            # ── knife blade (bright white) ──
            d_k = line_dist(x, y, kx1, ky1, kx2, ky2)
            if d_k < knife_w:
                edge_t = max(0.0, 1.0 - d_k / knife_w)
                # bevel: bright centre, slightly grey edge
                bevel = lerp([210, 230, 255], WHT, max(0, 1 - d_k/(knife_w*0.45)))
                color = lerp(color, bevel, edge_t ** 0.5)

            pix.append(color)

    return pix

os.makedirs('icons', exist_ok=True)
for size, name in [(512, 'icon-512.png'), (192, 'icon-192.png'), (180, 'apple-touch-icon.png')]:
    print(f'Rendering {size}x{size}…', flush=True)
    p = render(size)
    data = make_png(size, size, p)
    path = f'icons/{name}'
    with open(path, 'wb') as f:
        f.write(data)
    print(f'  → {path} ({len(data)//1024} KB)')
print('Done.')
