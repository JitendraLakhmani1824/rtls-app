# M4 results — battery

Battery has two sides: the phone **sharing** its location (GPS + radio), and the phone **viewing** the map (screen, GPU, JS).

## Sharing phone — `core/sharing` policy, modelled

`sharingDecision()` picks GPS accuracy and how often to send, from speed (still / walk / run / drive), whether anyone is watching, battery and Low Power Mode (design §2.7). `lab/battery` runs it over one hour of each scenario (20 people, 1 s steps) against a naive app (high-accuracy GPS every second, every fix sent).

| Scenario | Sharing | Fixes/h | Sends/h | Radio awake (min/h) | mAh/h | Battery %/h |
| --- | --- | --- | --- | --- | --- | --- |
| concert | naive | 3600 | 3600 | 60 | 165 | 3.4 |
| concert | live | 150 | 93 | 12 | 30 | 0.6 |
| concert | idle | 69 | 32 | 5 | 14 | 0.3 |
| marathon | naive | 3600 | 3600 | 60 | 165 | 3.4 |
| marathon | live | 600 | 588 | 50 | 137 | 2.8 |
| marathon | idle | 204 | 54 | 9 | 28 | 0.6 |
| trip | naive | 3600 | 3600 | 60 | 165 | 3.4 |
| trip | live | 543 | 525 | 46 | 101 | 2.1 |
| trip | idle | 182 | 55 | 9 | 28 | 0.6 |

*live* = someone has the map open on this session; *idle* = nobody does (the server's `watchers` hint).

**Reading:**
- **Standing still is nearly free:** low-accuracy location and a heartbeat a minute (concert: 0.6%/h vs 3.4%/h).
- **Nobody watching → 0.6%/h** in every scenario: fixes batched and sent once a minute.
- **Live updates for a moving friend cost almost as much as the naive app** (marathon 2.8%/h). Sending every 4–5 s keeps the radio awake all the time, since it stays up ~10 s after each send. That is the price of "pin moves within 5 s", so the app pays it only while someone is actually watching.

**Assumptions** (`src/lab/battery/batteryModel.ts`): GPS 45 / 12 / 3 mA (high / balanced / low), radio 120 mA while awake, 10 s radio tail, 4,800 mAh battery. A model, not a measurement.

## Viewing phone — built

- **Background → paused:** no feed, no timers, no frames.
- **Draws only what changes:** still pins at most once a second; nothing gliding → the gliding worklet does no work. At 200 friends the map draws 19 frames/s vs ~48 for the simple approaches (`m3-map.md`).
- **No label fade:** a fade would keep the map redrawing after every update.
- **Budget:** fewer gliding pins and a lower frame cap in Low Power Mode or when the phone is hot (`budgetFor`). The real Low Power and heat signals need `expo-battery` and a small native module. They sit behind `DeviceManager.power` and are not wired yet.

## Not done (trimmed)

- Measured viewer energy (power rails need a Pixel; Android battery stats are too coarse for a short run).
- Wiring the real Low Power Mode and heat signals, and a real sharing phone. The policy is tested and modelled, not run on a device.
