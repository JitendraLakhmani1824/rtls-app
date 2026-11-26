import sys
sys.path.insert(0, sys.argv[1])
from common import box, arrow, DEFS, CSS

W = 1880
svg = [f'<svg width="1360" height="760" viewBox="0 0 1360 760" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, Helvetica, Arial, sans-serif">', DEFS]
# Row A
svg.append(box(20, 50, 200, 190, 'Sharer phone', ['Sharing policy: GPS and', 'send rate follow speed', 'and whether anyone', 'watches. Live: 3–5 s.', 'Idle: batch every 60 s.'], 'phone', tag='APP'))
svg.append(box(310, 50, 200, 190, 'Ingest API', ['auth · session membership', 'order by per-member seq', 'drop impossible jumps', 'write hot store, publish', 'reply: ServerHint'], 'svc', tag='STATELESS'))
svg.append(box(600, 50, 200, 150, 'Pub/sub', ['one topic per session', 'keeps ~2 min so a viewer', 'resumes from its cursor'], 'store', tag='NATS / REDIS'))
svg.append(box(890, 50, 210, 190, 'Realtime gateway', ['one socket per viewer', 'latest-wins per friend,', '≤ 1 msg / friend / s', 'viewport-aware fan-out', 'counts who watches whom'], 'svc', tag='WS'))
svg.append(box(1180, 50, 170, 190, 'Viewer phone', ['map open: snapshot,', 'then live changes', 'pins + trails, 60 fps', 'unsubscribes the', 'moment it is hidden'], 'phone', tag='APP', line_size=13))
# Row B
svg.append(box(600, 370, 200, 160, 'Hot store', ['latest fix per member', 'recent trail (capped)', 'watcher sets', 'every key expires with', 'the session (privacy)'], 'store', tag='REDIS'))
svg.append(box(1180, 370, 170, 150, 'Session API', ['users · friends', 'sessions · invites', 'map-open snapshot'], 'svc', line_size=13))
svg.append(box(1180, 590, 170, 110, 'Postgres', ['slow-changing data', 'never written per fix'], 'store', tag='SQL', line_size=13))
svg.append(box(310, 600, 200, 120, 'Push', ['only to wake an Idle', 'sharer — never carries', 'location data'], 'ext', tag='APNs / FCM'))
# Arrows
svg.append(arrow([(220, 105), (310, 105)], 'POST fixes', (265, 92)))
svg.append(arrow([(310, 195), (220, 195)], 'ServerHint', (265, 220)))
svg.append(arrow([(510, 105), (600, 105)], 'publish', (555, 92)))
svg.append(arrow([(800, 105), (890, 105)], 'session topic', (845, 92)))
svg.append(arrow([(1100, 100), (1180, 100)], 'WebSocket', (1140, 86)))
svg.append(arrow([(1180, 200), (1100, 200)], 'subscribe ·\nviewport', (1140, 222)))
svg.append(arrow([(410, 240), (410, 450), (600, 450)], 'latest fix + trail', (500, 440)))
svg.append(arrow([(995, 240), (995, 420), (800, 420)], 'watchers', (900, 410), both=True))
svg.append(arrow([(1265, 240), (1265, 370)], 'HTTPS\nsnapshot', (1255, 296), label_anchor='end'))
svg.append(arrow([(1265, 520), (1265, 590)]))
svg.append(arrow([(1180, 480), (800, 480)], 'latest fixes + trails', (990, 500)))
svg.append(arrow([(1050, 240), (1050, 690), (510, 690)], 'watcher 0 → 1: wake the sharer', (780, 680), dashed=True, color='#7c3aed'))
svg.append(arrow([(310, 660), (120, 660), (120, 240)], 'background push', (215, 650), dashed=True, color='#7c3aed'))
svg.append('<text x="20" y="28" font-size="14" font-weight="700" fill="#64748b" letter-spacing="0.6">SYSTEM ARCHITECTURE</text>')
svg.append('</svg>')

html = f'''<!doctype html><html><head><meta charset="utf-8"><style>{CSS.replace("WIDTH", str(W))}
.top {{ display: grid; grid-template-columns: 1360px 1fr; gap: 24px; margin-top: 22px; }}
.bottom {{ display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-top: 18px; }}
</style></head><body><div class="page">
<h1>RTLS — High-level design</h1>
<div class="sub">Real-time location sharing for events (concerts, marathons, trips): friends' live pins and a trail of recent movement on one map — smooth with many people on screen, light on battery.</div>
<div class="top"><div>{''.join(svg)}
<div class="legend"><span style="--f:#eff6ff;--c:#2563eb">Phones (the app)</span><span style="--f:#f8fafc;--c:#334155">Stateless services</span><span style="--f:#fffbeb;--c:#d97706">Stores / streams</span><span style="--f:#f5f3ff;--c:#7c3aed">Wake-up only</span></div></div>
<div class="grid">
<div class="card"><h3>Requirements</h3><ul>
<li><b>Latency:</b> a pin starts moving ≤ 5 s (p95) after the friend's phone publishes, while someone watches</li>
<li><b>Battery:</b> sharers spend GPS and radio only when watched; viewers do nothing while the map is hidden</li>
<li><b>Scale:</b> hundreds of friends on one map; events with tens of thousands of sharers</li>
<li><b>Privacy:</b> sharing lives inside a session, stops on its own, deleted at session end</li></ul></div>
<div class="card"><h3>Scale estimate — marathon</h3>
<table><tr><td>40,000 runners, 30% share</td><td><b>12,000 sharers</b></td></tr>
<tr><td>Live: 3,600 × 1 fix / 4 s</td><td>~900 req/s</td></tr>
<tr><td>Idle: 8,400 × 1 batch / 60 s</td><td>~140 req/s</td></tr>
<tr><td>Ingest total</td><td><b>~1,040 req/s · 1,500 fixes/s</b></td></tr>
<tr><td>Fan-out (coalesced)</td><td>~1,800 msg/s · ~110 KB/s</td></tr>
<tr><td>Open WebSockets</td><td>5,000–10,000</td></tr></table>
<p style="margin-top:6px">The gateway is sized by <b>open connections</b>, not messages.</p></div>
<div class="card"><h3>Protocol choices</h3><ul>
<li><b>WebSocket</b> to viewers: two-way (subscribe, viewport), one socket for many sessions</li>
<li><b>HTTPS POST</b> from sharers: fits background limits, batches naturally; the reply carries the watcher hint</li>
<li><b>Push</b> only to speed up Idle → Live; correctness never depends on it</li>
<li>Considered: SSE (one-way), MQTT (still needs custom coalescing and watcher logic)</li></ul></div>
<div class="card"><h3>Battery — the system's part</h3><ul>
<li><b>Watcher-aware:</b> Live (3–5 s) only while someone watches; Idle (≥ 60 s batches) otherwise</li>
<li>No keep-alive for sharers: the upload reply is the signal channel</li>
<li>Gateway coalesces per viewer (latest-wins, ≤ 1/s) and streams by viewport</li></ul></div>
</div></div>
<div class="bottom">
<div class="card"><h3>Flow: open the map</h3><p>1. <b>GET snapshot</b> → members, latest fixes, recent trails, cursor<br>2. <b>subscribe</b> {{session, cursor, viewport}}<br>3. gateway adds the viewer as a watcher<br>4. live fixes / presence, latest-wins<br>5. map hidden → <b>unsubscribe</b></p></div>
<div class="card"><h3>Flow: a watcher appears</h3><p>1. viewer subscribes → watchers 0 → 1<br>2. gateway asks Push to <b>wake</b> the Idle sharer<br>3. sharer uploads now (not in ≤ 60 s)<br>4. reply: <b>{{watchers: 1, nextIntervalMs: 4000}}</b><br>5. sharer goes Live. Lost push → next Idle reply carries the same hint</p></div>
<div class="card"><h3>Flow: reconnect</h3><p>1. socket drops → app shows <b>Reconnecting</b>, keeps last positions<br>2. backoff + jitter, <b>subscribe {{cursor}}</b><br>3. cursor in the 2-min window → missed batches, then live<br>4. too old → <b>resync</b> → fresh snapshot</p></div>
<div class="card"><h3>Wire format</h3><p>JSON, compact arrays, envelope <b>{{"v":1,"t":…}}</b>. Coordinates as integers × 10⁶ (~0.1 m), times relative to a base.<br><b>fixes:</b> [[member, seq, lng6, lat6, dt, acc], …]<br><b>presence:</b> [[member, lastHeard, paused], …]<br>JSON over protobuf: RN delivers binary frames as base64.</p></div>
<div class="card"><h3>Scaling &amp; failures</h3><ul>
<li>Ingest: stateless, scales on CPU. Gateway: on connections, no sticky routing</li>
<li>Slow viewer: drop older fixes per friend, then resync</li>
<li>Sharer offline: Live → Recent → Stale by last-heard time</li>
<li>Hot store failover: rebuilt from the next uploads</li></ul></div>
</div>
<div class="footer">Full detail: docs/design.md §1 (HLD). Case study for Principal Engineer, Mobile.</div>
</div></body></html>'''
open(sys.argv[2], 'w').write(html)
