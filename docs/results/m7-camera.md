# M7 results — camera follow

**Question:** does the camera following a moving friend (a native `easeTo` per fix, tilted 45° and turned to their direction) cost map frames?

**Run:** OnePlus 10T, release, Sunday marathon (5 runners), a runner selected at street zoom, map tilted. `scripts/map-frames-android.sh`, 5 s each, back to back.

| Camera | Map frames/s | Gap p50 | Gap p95 | Gap max | Frames late by one refresh |
| --- | --- | --- | --- | --- | --- |
| Following the runner | 49 | 16.7 ms | 33.4 ms | 33.5 ms | 21% |
| Still (after a pan), pin gliding | 48 | 16.7 ms | 33.4 ms | 33.5 ms | 22% |

**Reading:** following costs nothing measurable: the late frames come from the gliding pin on a tilted map, with or without the camera moving, and no frame is ever more than one refresh late. One run each; a mid-range phone would be the stronger test.
