#!/usr/bin/env python3
"""Builds the dark theme for a page from its own styles.

Every CSS rule in the page's <style> blocks that uses a light background, a dark text colour or a light border
gets a twin rule under html[data-theme=dark] with the colour turned to its dark-theme match (same hue).
Coloured buttons and chips keep their colours. Inline styles in the page's templates get attribute rules.
Run: python3 scripts/gen-dark.py index.html theme-dark.css   (the build runs it again on every deploy)
"""
import re, sys, colorsys

SRC, OUT = sys.argv[1], sys.argv[2]
P = "html[data-theme=dark]"

def hex2rgb(h):
    h = h.lstrip('#')
    if len(h) in (3, 4): h = ''.join(c * 2 for c in h[:3])
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))

def rgb2hex(r, g, b): return '#%02x%02x%02x' % tuple(max(0, min(255, round(v * 255))) for v in (r, g, b))

def lum(rgb): r, g, b = rgb; return 0.2126 * r + 0.7152 * g + 0.0722 * b

def dark_bg(rgb):
    h, l, s = colorsys.rgb_to_hls(*rgb)
    # white → #141a2c (navy-tinted night), light tints keep their hue, faintly
    L = 0.095 + (1 - l) * 0.55
    S = min(s, 0.45) * (0.55 if s > 0.05 else 1)
    if s < 0.08: h, S = 0.63, 0.32          # greys become navy-greys
    return colorsys.hls_to_rgb(h, L, S)

def light_fg(rgb):
    h, l, s = colorsys.rgb_to_hls(*rgb)
    L = 0.93 - l * 0.55
    if s > 0.35: L = max(L, 0.72)            # navy/brand text becomes a readable light blue
    return colorsys.hls_to_rgb(h, L, min(s, 0.85))

def dark_line(rgb):
    h, l, s = colorsys.rgb_to_hls(*rgb)
    return colorsys.hls_to_rgb(0.63 if s < 0.08 else h, 0.2 + (1 - l) * 0.35, 0.22 if s < 0.08 else min(s, 0.4))

HEX = re.compile(r'#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b')
RGBA = re.compile(r'rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)')

def conv_value(prop, val):
    """Return the dark value, or None when nothing should change."""
    kind = 'bg' if prop.startswith('background') else 'fg' if prop in ('color', 'caret-color', '-webkit-text-fill-color', 'stroke') else \
           'line' if prop.startswith('border') or prop.startswith('outline') or prop == 'box-shadow' else None
    if not kind: return None
    changed = False
    def f_hex(m):
        nonlocal changed
        rgb = hex2rgb(m.group(0)); L = lum(rgb)
        if kind == 'bg' and L > 0.62: changed = True; return rgb2hex(*dark_bg(rgb))
        if kind == 'fg' and L < 0.55: changed = True; return rgb2hex(*light_fg(rgb))
        if kind == 'line' and L > 0.7 and prop != 'box-shadow': changed = True; return rgb2hex(*dark_line(rgb))
        return m.group(0)
    def f_rgba(m):
        nonlocal changed
        r, g, b = (int(m.group(i)) / 255 for i in (1, 2, 3)); a = m.group(4); L = lum((r, g, b))
        if kind == 'bg' and L > 0.62:
            changed = True; x = dark_bg((r, g, b)); return 'rgba(%d,%d,%d,%s)' % (*(round(v * 255) for v in x), a or '1')
        if kind == 'fg' and L < 0.55:
            changed = True; x = light_fg((r, g, b)); return 'rgba(%d,%d,%d,%s)' % (*(round(v * 255) for v in x), a or '1')
        if kind == 'line' and prop == 'box-shadow' and L < 0.3 and a:   # shadows: a little stronger on dark
            changed = True; return 'rgba(0,0,0,%s)' % min(0.6, float(a) * 2.2)
        if kind == 'line' and L > 0.7 and prop != 'box-shadow':
            changed = True; x = dark_line((r, g, b)); return 'rgba(%d,%d,%d,%s)' % (*(round(v * 255) for v in x), a or '1')
        return m.group(0)
    if 'url(' in val and kind == 'bg' and not HEX.search(val.split('url(')[0]): return None
    v2 = HEX.sub(f_hex, val); v2 = RGBA.sub(f_rgba, v2)
    if kind == 'bg' and re.search(r'(^|[\s,])white\b', v2):
        v2 = re.sub(r'(^|[\s,])white\b', lambda m: m.group(1) + '#141a2c', v2); changed = True
    if kind == 'fg' and re.search(r'(^|\s)black\b', v2):
        v2 = re.sub(r'(^|\s)black\b', lambda m: m.group(1) + '#e7e9f2', v2); changed = True
    return v2 if changed else None

def prefix_sel(sel):
    out = []
    for s in sel.split(','):
        s = s.strip()
        if not s: continue
        if s.startswith(':root'): s = P + s[5:]
        elif s == 'html' or s.startswith('html ') or s.startswith('html.') or s.startswith('html['): s = P + s[4:]
        elif s.startswith('@'): return None
        else: s = P + ' ' + s
        out.append(s)
    return ', '.join(out) if out else None

def strip_comments(css): return re.sub(r'/\*.*?\*/', '', css, flags=re.S)

def rules(css):
    """Yields (media or None, selector, body) for plain rules, one level of @media/@supports."""
    i, n = 0, len(css)
    while i < n:
        j = css.find('{', i)
        if j < 0: break
        head = css[i:j].strip()
        depth, k = 1, j + 1
        while k < n and depth:
            if css[k] == '{': depth += 1
            elif css[k] == '}': depth -= 1
            k += 1
        body = css[j + 1:k - 1]
        if head.startswith('@media') or head.startswith('@supports'):
            for _, s, b in rules(body): yield head, s, b
        elif head.startswith('@'): pass
        else: yield None, head, body
        i = k

def decls(body):
    for d in re.split(r';(?![^(]*\))', body):
        if ':' not in d: continue
        p, v = d.split(':', 1); p = p.strip().lower(); v = v.strip()
        if p and v: yield p, v

page = open(SRC, encoding='utf-8').read()
css = strip_comments(''.join(re.findall(r'<style[^>]*>(.*?)</style>', page, re.S)))
out = {}
for media, sel, body in rules(css):
    ds = []
    for p, v in decls(body):
        if p.startswith('--'): continue
        nv = conv_value(p, v)
        if nv is not None: ds.append(f'{p}:{nv}')
    if not ds: continue
    ps = prefix_sel(sel)
    if not ps: continue
    out.setdefault(media, []).append(f'{ps}{{{";".join(ds)}}}')

# inline styles written in the page's templates: style="…background:#fff…"
tmpl = page
inline = []
for m in sorted(set(re.findall(r'(background|color|border(?:-[a-z]+)?):\s*(#[0-9a-fA-F]{3,6})\b', tmpl))):
    prop, col = m; nv = conv_value(prop, col)
    if nv and nv != col: inline.append(f'{P} [style*="{prop}:{col}"]{{{prop}:{nv}!important}}')

hdr = "/* Generated by scripts/gen-dark.py from " + SRC + " — do not edit by hand; edit theme-dark-base.css instead. */\n"
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(hdr)
    for media, rs in out.items():
        if media: f.write(media + '{\n' + '\n'.join(rs) + '\n}\n')
        else: f.write('\n'.join(rs) + '\n')
    f.write('\n'.join(inline) + '\n')
print(OUT, sum(len(v) for v in out.values()), 'rules,', len(inline), 'inline')
