# RTLS — PRD

Real-time location sharing for events · Principal Engineer (Mobile) case study · Draft v0.3, 2026-11-25

## 1. Problem

At concerts, marathons and on trips, groups lose each other. Networks are congested, batteries are low, and a dot on a map doesn't tell you which way someone is heading.

**Goal:** show friends' live locations on one map, with a short trail of recent movement — smooth with many people on screen, cheap on battery.

## 2. Scope

| | |
| --- | --- |
| **Build** (coding exercise) | Live map: friends' pins updating in real time, trails, presence states, friend card and list. Portrait phone app. Fed by a seeded synthetic feed behind the same interface a real server feed would use. A battery model of the sharing rules, run in code. |
| **Design only** (HLD/LLD) | Publishing my own location (background, battery policy), sessions and invites, backend, auth, notifications. |
| **Out** | Chat, navigation, indoor positioning, permanent always-on sharing, web, wearables. |

## 3. Core concepts

- **Session** — a time-boxed group share (e.g. "Festival crew", ends 23:30). Sharing stops automatically at the end.
- **Member** — sharer or viewer (e.g. marathon spectators who only watch).
- **Presence** — what others see, driven by when the friend was last heard from (a location or a **heartbeat**, a small "I'm still here" signal every 60 s while still), so someone standing still at a concert stays Live:
  `Live` (heard within 2.5× the expected interval), `Recent` (≤ 5 min), `Stale` (> 5 min, "last seen"), `Paused`.
- **Trail** — a member's recent path: 15 min for events. Races: the route so far, thinned out as it grows.

## 4. Requirements — what we build

P0 = must ship · P1 = should ship · P2 = only if time allows.

| # | Requirement | P |
| --- | --- | --- |
| M1 | Friend pins: initials in a per-friend colour; name label when zoomed in or selected. (Photo avatars: P2) | P0 |
| M2 | Pins **glide** between updates. Implausible GPS jumps snap instead of sweeping across the map. | P0 |
| M3 | Trails in the friend's colour, fading with age. Data gaps show as breaks, not straight lines. | P0 |
| M4 | Presence styling: Recent faded, Stale greyed with "last seen", Paused hidden. Never colour alone. | P0 |
| M5 | Grouping (clustering) when pins overlap at low zoom; tap to zoom in. | P0 |
| M6 | Camera: fit all (default), follow a friend, recentre on "me" (the scenario's me). Panning exits follow. | P0 |
| M7 | Tap a pin or a list row → friend detail sheet over the map (map stays visible): name, status, "updated 10 s ago", distance + direction from me, Follow. | P0 |
| M8 | Friends list in a simple bottom panel, sorted by distance; tap to focus. Doubles as the accessible view of the map. | P0 |
| M9 | Connection state: Live / Reconnecting / Offline (positions as of HH:MM). Map never blocks on network. | P1 |
| M10 | Map receives and renders nothing while not visible (background, locked, other screen). | P0 |
| M11 | Dev scenario picker and deep links: concert / marathon / trip × 10–1,000 friends × update rate × faults (drops, duplicates, reordering, GPS jumps). | P0 |
| M12 | The viewing phone lowers its animation budget in Low Power Mode (P1) and when the phone runs hot (P2, needs a small native module). | P1 |
| M13 | Real "my location" from the phone's GPS, behind a toggle. | P2 |

## 5. Smooth, battery-light, many users

The brief's emphasis. Everything here is measured (§8, §9); how it works is in `docs/design.md`.

### Many users on the map

| Instead of | We | Effect |
| --- | --- | --- |
| One marker element per friend | Draw pins with **GPU map layers** (MapLibre) | Drawing cost stays flat as friends grow. Data work still grows with friends, so we keep it small (next rows) |
| One map list re-sent for every change | **Split map data by how often it changes:** still pins (grouped, ≤ 1×/s) · gliding pins (≤ ~30, every frame) · trails (when a new location arrives) · the selected friend's trail tip (every frame) | Each update re-sends only the small part that changed. Also required: grouping only works on pins, not trail lines |
| A React re-render per update | Keep location data **outside React**; only the map layers get new data | 0 screen re-renders per update |
| Applying each update as it arrives | **Collect updates, apply at most once per frame** | One map update, not hundreds |
| Processing every friend | Process **only friends on screen** (with a margin); group overlapping pins | Work scales with what's visible |
| Re-sending data to highlight a pin | Selection via **feature state** (a per-pin style flag on the map) | Highlighting costs no data re-send |
| Trail arrays that keep growing | **Fixed memory per friend**, oldest points overwritten; fewer points when zoomed out | Memory stays flat; memory clean-up is measured, not assumed |

### Smooth experience

| Instead of | We | Effect |
| --- | --- | --- |
| Pins jumping every few seconds | **Glide** between the two latest positions, shown slightly in the past (as multiplayer games do) | Continuous motion |
| Animating every pin at a fixed rate | **Animate only pins that visibly move:** the selected friend and the fastest movers glide smoothly; the rest step once a second; anything moving < 1 pixel isn't redrawn | Smooth where you look, no wasted frames |
| Updating the map while you pan or zoom | Slow map data updates to 2–4×/s during gestures | Panning stays smooth |
| GPS glitches flinging pins around | Drop impossible jumps; snap confirmed big moves | No phantom movement |
| Late or duplicate updates | Drop them by per-friend sequence number | Pins never move backwards |
| Spinners on a bad network | Show last known positions "as of HH:MM"; reconnect quietly | Map never blank or frozen |

### Battery

**Viewing phone (built and measured):**
- Map hidden → stop receiving and stop drawing.
- Nothing moving → no frames drawn. No endless animations (no pulsing rings); follow mode and fit-all don't chase every tiny move.
- Animation budget set by how fast pins move on screen, not by how many there are; frame rate capped.
- Low Power Mode or a hot phone → smaller animation budget (M12).

**Sharing phone (design, plus a battery model run in code):**
- **Two modes.** *Live* (someone is watching): send each location every 3–5 s and accept the radio cost. *Idle* (nobody watching, or standing still): send in batches of ≥ 60 s. Why: the phone's radio stays awake ~10 s after every send, so batching every 15–30 s saves little and makes updates late.
- **How a phone learns someone started watching:** background phones send with ordinary web requests; each server reply says how many are watching, when to send next, and when the session ends. A push notification only speeds up the switch to Live. WebSocket is used only by phones with the map open.
- **GPS follows movement,** judged from GPS speed (no extra permission needed for motion sensors).
- **Platform limits:** with "While Using" permission, iOS can't stop GPS while you stand still and restart it later, so GPS stays on at low accuracy. Android sharing runs as a foreground service; phone makers' battery managers may kill it, so the server notices a missing heartbeat and tells the friend "sharing stopped".
- **Native code:** v1 uses `expo-location`'s background task, which already collects GPS natively. Custom native code comes once the sharing rules must run while JavaScript isn't running.
- **Proof:** the sharing rules are a small piece of plain TypeScript, run over the concert / marathon / trip scenarios. They produce a table of GPS readings, sends and radio-awake seconds per hour, and estimated battery use per mode. It is labelled as a model, with its constants cited.

### Proof

- **A comparison ladder, same scenario and device:** (A) one marker per friend → (B) one map list, updates applied as they arrive → (C) + batching and on-screen-only → (D) + the still/gliding split and speed-based animation. It shows the crossover point ("below N friends, markers are fine") and includes one step that didn't help.
- **Honest metrics:** map frame times and stutter rate from Android's system profiler (a JavaScript fps counter can read 60 while the map stutters), JavaScript thread busy time, time per map update, memory clean-up count.
- **Battery:** the sharing-rules model table, plus measured power on the viewing phone where the device supports it.
- **Native code table:** for each hot spot — what we do now, the native iOS/Android version, the trigger to switch, and the cost. Each trigger is a measured threshold on the test phone for built parts, or a stated assumption for design-only parts.

## 6. Orientation and screen size

**Portrait only, phones first.** One layout: full map + friend list panel; friend detail opens as a sheet over the map. Checking split screen and tablets is P2 — the rules below make the app hold up there anyway.

- **iOS:** iPhone app, portrait. On iPad it runs as the iPhone version.
- **Android:** portrait requested. Android ignores the lock in split screen and, from Android 16, on tablets and foldables, so the app must still hold up there:
  - layouts follow the window size, never hard-coded screen dimensions;
  - a resize never reloads the map or loses camera, selection or panel position.
- **Visible ≠ focused:** in Android split screen the map keeps updating while visible and stops only when hidden.

No landscape layout, no tablet layout, no foldable-specific behaviour.

## 7. Key edge cases

| Area | Case → behaviour |
| --- | --- |
| GPS | Poor accuracy (> 50 m) → accuracy halo, not added to trail · jump faster than plausible → drop, snap if confirmed |
| Presence | Standing still but connected → stays Live (heartbeat) · no heartbeat → Recent → Stale |
| Ordering | Duplicate or out-of-order updates → ignored by per-friend sequence number; no backwards motion |
| Density | Many friends at one spot → grouped, tap to zoom · group spread across cities → fit the group I'm in |
| Network | Offline → last known positions with time · flaky → backoff with jitter, resume from last sequence · long gap → full refresh |
| Lifecycle | Background / locked → unsubscribe, stop rendering · call / Control Center (`inactive`) → keep everything running |
| Session | Session ends while viewing → "Session ended", pins fade, sharing stops on the device even if offline |
| Selection | Selected friend goes stale or leaves → detail sheet updates or closes; follow exits |
| Geometry (P2) | Crossing ±180° → trail split, not drawn across the globe |

## 8. Non-functional targets

Measured on the reference Android phone, release build (model named in the README; a Pixel is preferred because it can report real power use). One real-iPhone run if available; otherwise the gap is stated.

| | Target |
| --- | --- |
| Map smoothness | Map frame time p95 ≤ 16.7 ms, < 1% stuttering frames, while panning with 500 friends, ~50 visible |
| JavaScript work | p95 ≤ 4 ms per frame |
| React work | 0 re-renders of the map screen per location update |
| Idle cost | Nothing moving → no frames drawn |
| Memory | Flat over a 30-min session; memory clean-up count and time reported |
| Latency (design) | Publish → pin starts moving, p95 ≤ 5 s in Live mode |
| Battery (design) | Budgets derived from the sharing-rules model, per mode — not a single guessed %/hour |
| Privacy | No coordinates in logs, analytics or crash reports |

## 9. Done when

- Pins and trails update smoothly across all scenarios and fault modes.
- Works in portrait on the iOS simulator and the Android phone.
- The comparison ladder (§5) and the targets (§8) are measured and in the README, with trade-offs explained.
- The sharing-rules battery table is generated by code and in the design doc.
- HLD + LLD cover the design-only parts, including the native code table.

## 10. Open questions

1. Keep trails after a session ends? *Default: delete.*
2. When someone stops sharing, show "Paused" or "Stopped"? *Default: neutral "Paused" (safety).*
3. Request background-location permission in v1 (resume after reboot) or avoid Play's review? *Default: avoid; While-Using is enough for sharing started in the foreground.*
