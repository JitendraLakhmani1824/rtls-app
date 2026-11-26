import sys
sys.path.insert(0, sys.argv[1])
from common import box, arrow, DEFS, CSS, esc

W = 1880
BANDS = [
    ('app/ — composition root', '#334155', '#f8fafc', 108, [
        ('container.ts', ['managers created here only;', 'one engine per opened session']),
        ('Root', ['tabs app · scenario links', '(measurement) open a map']),
        ('navigation · linking', ['2 tabs + native stack', 'rtls://join/… · session/…']),
    ]),
    ('features/ — screens · see only { sessions, live, photos }', '#db2777', '#fdf2f8', 95, [
        ('Onboarding · Profile', ['name · photo']),
        ('Sessions · Friends', ['the two tabs']),
        ('New session · Join', ['pick people · link']),
        ('Session map', ['map · Invite · friends']),
        ('Detail · Person', ['sheet → full page']),
    ]),
    ('common/ — shared by screens', '#7c3aed', '#f5f3ff', 108, [
        ('di', ['useLive · useRows · useSelected', 'useSessionList · usePeople']),
        ('ui', ['palette tokens · TabBar', 'Avatar (photos) · header']),
        ('utils', ['"350 m NE" · "2 min ago"']),
    ]),
    ('core/ — pure TypeScript, no React · time from Clock, randomness from seeded Rng', '#059669', '#ecfdf5', 118, [
        ('models', ['FixBatch · PinFrame', 'MotionFrame · TrailFrame']),
        ('protocols', ['Feed · Map · Device', 'Sessions · Storage · Photos']),
        ('engine', ['LiveSession · stores', 'Presenter · Camera']),
        ('sessions', ['SessionBook: profile,', 'people, sessions · invites']),
        ('sharing', ['GPS + send rate', 'by speed + watchers']),
    ]),
    ('managers/ — talk to the outside world, behind protocols', '#2563eb', '#eff6ff', 108, [
        ('map', ['MapLibre + Reanimated worklet']),
        ('feed', ['synthetic friends + faults']),
        ('device', ['clock · AppState · battery', 'Reduce Motion']),
        ('storage · photos', ['AsyncStorage', 'image picker → app files']),
    ]),
]

layers = ['<svg width="900" height="632" viewBox="0 0 900 632" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, Helvetica, Arial, sans-serif">', DEFS,
          '<text x="10" y="18" font-size="14" font-weight="700" fill="#64748b" letter-spacing="0.6">APP LAYERS</text>']
y = 30
for title, stroke, fill, h, mods in BANDS:
    layers.append(f'<rect x="10" y="{y}" width="840" height="{h}" rx="14" fill="{fill}" stroke="{stroke}" stroke-width="2"/>')
    layers.append(f'<text x="24" y="{y + 21}" font-size="13.5" font-weight="800" fill="{stroke}">{esc(title)}</text>')
    n = len(mods)
    gap = 10
    bw = (840 - 28 - gap * (n - 1)) / n
    for i, (name, lines) in enumerate(mods):
        bx = 24 + i * (bw + gap)
        by = y + 30
        bh = h - 40
        layers.append(f'<rect x="{bx:.0f}" y="{by}" width="{bw:.0f}" height="{bh}" rx="10" fill="#ffffff" stroke="{stroke}" stroke-opacity="0.45" stroke-width="1.5"/>')
        layers.append(f'<text x="{bx + 10:.0f}" y="{by + 21}" font-size="14.5" font-weight="700" fill="#0f172a">{esc(name)}</text>')
        for k, line in enumerate(lines):
            layers.append(f'<text x="{bx + 10:.0f}" y="{by + 39 + k * 17}" font-size="12.5" fill="#475569">{esc(line)}</text>')
    y += h + 12
layers.append(arrow([(872, 40), (872, 612)], color='#94a3b8'))
layers.append('<text x="890" y="326" font-size="12.5" font-weight="700" fill="#64748b" text-anchor="middle" transform="rotate(90 890 326)">imports point down only · checked by dependency-cruiser + ESLint</text>')
layers.append('</svg>')

p = ['<svg width="930" height="605" viewBox="0 0 930 605" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, Helvetica, Arial, sans-serif">', DEFS,
     '<text x="10" y="18" font-size="14" font-weight="700" fill="#64748b" letter-spacing="0.6">THE HOT PATH — ONE LOCATION FIX, FEED TO PIXELS</text>']
p.append(box(10, 40, 170, 115, 'Feed', ['server or synthetic', 'FixBatch / 250 ms', '+ heartbeats'], 'mgr', tag='MANAGER'))
p.append(box(225, 40, 195, 115, 'LiveSession', ['the one controller:', 'Running = foreground', '∧ map ready'], 'core', tag='CORE'))
p.append(box(470, 30, 205, 125, 'LocationStore', ['drop dup / late fixes (seq)', 'hold GPS jumps until', 'confirmed, then snap', 'last heard → presence'], 'core'))
p.append(box(470, 170, 205, 100, 'TrailStore', ['ring buffer per friend', 'min step · time window', 'breaks at jumps, gaps'], 'core'))
p.append(box(725, 40, 195, 160, 'Presenter', ['on screen: 1.5× / 1.8×', 'who glides: selected +', 'fastest ≥ 2 px/s, within', 'the power budget', 'builds 3 frames'], 'core', tag='PURE'))
p.append(box(10, 185, 205, 85, 'Screens (React)', ['rows ≤ 1×/s, only when read', 'never a render per fix'], 'ui'))
p.append(arrow([(180, 97), (225, 97)]))
p.append(arrow([(420, 80), (470, 80)]))
p.append(arrow([(420, 130), (445, 130), (445, 215), (470, 215)]))
p.append(arrow([(675, 92), (725, 92)]))
p.append(arrow([(675, 215), (700, 215), (700, 170), (725, 170)]))
p.append(arrow([(300, 155), (300, 228), (215, 228)], 'snapshot', (262, 248), dashed=True, color='#db2777', label_size=11.5))
# frames down to the map
p.append(arrow([(822, 200), (822, 300), (170, 300), (170, 335)]))
p.append('<text x="178" y="322" font-size="12" font-weight="600" fill="#0f172a">PinFrame · 1 Hz tick, if changed</text>')
p.append(arrow([(822, 300), (475, 300), (475, 335)]))
p.append(arrow([(822, 300), (782, 300), (782, 335)]))
p.append('<text x="483" y="322" font-size="12" font-weight="600" fill="#0f172a">MotionFrame · on each fix</text>')
p.append('<text x="790" y="322" font-size="12" font-weight="600" fill="#0f172a">TrailFrame · ≤ 1 Hz</text>')
p.append(box(40, 335, 265, 150, 'Still pins', ['cached per-pin JSON', '→ pins-still source', 'grouped only above 30', 'friends; selection by', 'feature state (no re-send)'], 'mgr', tag='JS THREAD'))
p.append(box(330, 335, 290, 150, 'Gliding pins', ['target + duration →', 'Reanimated shared value', 'worklet interpolates ≤ 33×/s', '0 JavaScript per frame;', 'stops when nothing glides'], 'ext', tag='UI THREAD'))
p.append(box(645, 335, 275, 150, 'Trails · halo · me', ['one line per age bucket', 'opacity fades with age', 'trail tip joins the pin', 'me: own source, never', 'grouped'], 'mgr', tag='JS THREAD'))
p.append(box(40, 525, 880, 70, 'MapLibre (native GL)', ['draws on its own thread · renders only when a source changes · no label fade, so updates don’t keep it redrawing'], 'svc'))
for x in (172, 475, 782):
    p.append(arrow([(x, 485), (x, 525)]))
p.append('</svg>')

html = f'''<!doctype html><html><head><meta charset="utf-8"><style>{CSS.replace("WIDTH", str(W))}
.top {{ display: grid; grid-template-columns: 900fr 930fr; gap: 24px; margin-top: 22px; align-items: start; }}
.top svg {{ width: 100%; height: auto; }}
.bottom {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 16px; }}
</style></head><body><div class="page">
<h1>RTLS — Low-level design: the mobile app</h1>
<div class="sub">Expo SDK 58 · React Native 0.88 (New Architecture) · TypeScript · MapLibre · Reanimated. Location data never enters React state; screens read a once-a-second snapshot.</div>
<div class="top"><div>{''.join(layers)}</div><div>{''.join(p)}</div></div>
<div class="bottom">
<div class="card"><h3>LiveSession — lifecycle and tick</h3><ul>
<li><b>Running</b> = app in the foreground <b>and</b> map ready. Otherwise <b>Paused</b>: feed stopped (cursor kept), no timers, nothing drawn</li>
<li>Per batch: ingest → trails → visibility → motion for gliding friends</li>
<li><b>1 Hz tick:</b> presence · who glides · trails · still pins · camera · friend rows</li>
<li>start() returns stop(), safe to run again; navigation focus ignored, so the sheet never pauses the map</li>
<li>Only the session whose map is open runs; the others cost nothing</li></ul></div>
<div class="card"><h3>Camera (native animations, no JS per frame)</h3><ul>
<li><b>Fit:</b> a new map flies in from the city and frames everyone; re-fits when someone leaves the view</li>
<li><b>Follow:</b> selecting flies to the friend (zoom ≥ 16), then each fix sends a linear move with the pin's own target and duration; faster than 2 m/s it tilts 45° and turns to their heading</li>
<li><b>Free:</b> any gesture — the camera is the user's · <b>Calm</b> under Low Power Mode or Reduce Motion</li>
<li>Following costs no extra map frames (OnePlus 10T: 49 vs 48 frames/s)</li></ul></div>
<div class="card"><h3>Animation budget (viewing phone)</h3>
<table><tr><th>Condition</th><th>Gliding pins</th><th>Frame cap</th></tr>
<tr><td>Normal</td><td>30</td><td>60 fps</td></tr>
<tr><td>Low Power Mode (expo-battery)</td><td>10</td><td>30 fps</td></tr>
<tr><td>Heat: serious</td><td>15</td><td>15 fps</td></tr>
<tr><td>Heat: critical</td><td>0 (pins step)</td><td>—</td></tr></table>
<p style="margin-top:6px">Background → paused · nothing gliding → no frame work · no endless animations</p></div>
<div class="card"><h3>Sharing policy (sharing phone)</h3>
<table><tr><th>Situation</th><th>GPS</th><th>Sends</th></tr>
<tr><td>Watched, walking/running</td><td>high, 5 s / 5 m</td><td>each fix, ≤ 4 s</td></tr>
<tr><td>Watched, driving</td><td>balanced, 25 m</td><td>every 5 s</td></tr>
<tr><td>Still</td><td>low</td><td>heartbeat 60 s</td></tr>
<tr><td>Nobody watching</td><td>balanced / low</td><td>batch 60–120 s</td></tr></table>
<p style="margin-top:6px">Battery model: <b>0.3–0.6 %/h</b> still or unwatched vs <b>3.4 %/h</b> for GPS-every-second</p></div>
<div class="card"><h3>When native code would help</h3><ul>
<li>Today the per-frame pin animation runs as a <b>UI-thread worklet</b>: zero JS per frame</li>
<li>Next step if JS glide &gt; 4 ms/frame p95 or &gt; 1% late frames: a native animator (CADisplayLink / Choreographer) behind the same <b>MapManager</b> protocol</li>
<li>Heat signal: a small native module behind <b>DeviceManager.power</b></li></ul></div>
<div class="card"><h3>Quality gates and numbers</h3><ul>
<li><b>229 tests:</b> unit, feed + clock + storage contracts, replay fingerprint, golden encoders, screen hooks, deep links; <b>pnpm verify</b> on every change</li>
<li>Fakes + virtual time: no real timers or network in tests</li>
<li>OnePlus 10T, 200 friends: marker-per-friend app UI ~5 fps; ours draws the map 2.5× less often; glide gaps ≤ 33.5 ms; JS 58–60 fps</li></ul></div>
</div>
<div class="footer">Full detail: docs/design.md §2 (LLD). Results: docs/results/. Case study for Principal Engineer, Mobile.</div>
</div></body></html>'''
open(sys.argv[2], 'w').write(html)
