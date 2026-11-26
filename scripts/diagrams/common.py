"""Tiny SVG helpers for the HLD/LLD diagrams (boxes, arrows, labels)."""
import html

C = {
    'ink': '#0f172a', 'muted': '#475569', 'faint': '#94a3b8', 'line': '#cbd5e1',
    'phone': ('#eff6ff', '#2563eb'), 'svc': ('#f8fafc', '#334155'), 'store': ('#fffbeb', '#d97706'),
    'ext': ('#f5f3ff', '#7c3aed'), 'core': ('#ecfdf5', '#059669'), 'ui': ('#fdf2f8', '#db2777'),
    'mgr': ('#eff6ff', '#2563eb'),
}

def esc(s):
    return html.escape(s)

def box(x, y, w, h, title, lines=(), kind='svc', title_size=17, line_size=13.5, tag=None):
    fill, stroke = C[kind]
    out = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="{fill}" stroke="{stroke}" stroke-width="2"/>']
    ty = y + 28
    out.append(f'<text x="{x + 14}" y="{ty}" font-size="{title_size}" font-weight="700" fill="{C["ink"]}">{esc(title)}</text>')
    if tag:
        out.append(f'<text x="{x + w - 12}" y="{ty}" font-size="11.5" font-weight="700" fill="{stroke}" text-anchor="end">{esc(tag)}</text>')
    ly = ty + 22
    for line in lines:
        out.append(f'<text x="{x + 14}" y="{ly}" font-size="{line_size}" fill="{C["muted"]}">{esc(line)}</text>')
        ly += line_size + 6
    return '\n'.join(out)

def arrow(points, label=None, label_at=None, dashed=False, color=None, both=False, label_anchor='middle', label_size=12.5):
    color = color or C['muted']
    pts = ' '.join(f'{x},{y}' for x, y in points)
    dash = ' stroke-dasharray="7 6"' if dashed else ''
    start = ' marker-start="url(#arrowStart)"' if both else ''
    out = [f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="2"{dash} marker-end="url(#arrow)"{start}/>']
    if label:
        lx, ly = label_at
        for i, part in enumerate(label.split('\n')):
            out.append(f'<text x="{lx}" y="{ly + i * (label_size + 4)}" font-size="{label_size}" fill="{C["ink"]}" text-anchor="{label_anchor}" font-weight="600">{esc(part)}</text>')
    return '\n'.join(out)

DEFS = '''<defs>
<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#475569"/></marker>
<marker id="arrowStart" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#475569"/></marker>
</defs>'''

CSS = '''
* { box-sizing: border-box; }
body { margin: 0; background: #ffffff; font-family: -apple-system, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif; color: #0f172a; }
.page { width: WIDTHpx; padding: 36px 40px 32px; }
h1 { font-size: 30px; margin: 0; letter-spacing: -0.4px; }
.sub { color: #475569; font-size: 16px; margin-top: 6px; }
.grid { display: grid; gap: 18px; }
.card { border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px 16px; background: #ffffff; }
.card h3 { margin: 0 0 8px; font-size: 15px; text-transform: uppercase; letter-spacing: 0.6px; color: #334155; }
.card p, .card li { font-size: 13.5px; line-height: 1.45; color: #334155; margin: 0; }
.card ul { margin: 0; padding-left: 18px; }
.card li { margin-bottom: 3px; }
table { border-collapse: collapse; width: 100%; font-size: 13px; }
td, th { border-bottom: 1px solid #e2e8f0; padding: 5px 6px; text-align: left; vertical-align: top; color: #334155; }
th { color: #0f172a; font-weight: 700; }
b { color: #0f172a; }
.legend { display: flex; gap: 18px; font-size: 13px; color: #475569; margin-top: 10px; }
.legend span::before { content: ""; display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; border: 2px solid var(--c); background: var(--f); }
.footer { margin-top: 14px; font-size: 12.5px; color: #64748b; }
'''
