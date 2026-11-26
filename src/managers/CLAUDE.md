# managers — the outside world, behind protocols

One folder per outside thing; each implements a protocol from `core/protocols`, has a fake in `testing/fakes`, and is created only in `app/container.ts`. Only its own folder may import its library (import rules).

- `map/` — MapLibre + the UI-thread glide worklet. Its own card.
- `feed/` — the synthetic friends standing in for the server. Its own card.
- `device/` — clock, app state, frames, Low Power Mode and battery (expo-battery), Reduce Motion.
- `storage/` — `AsyncStorageManager` (`Storage`): never throws.
- `photos/` — `ExpoPhotoManager` (`Photos`): image picker, cropped square, copied into the app's documents; never throws.

**Add one:** the `new-manager` skill.
