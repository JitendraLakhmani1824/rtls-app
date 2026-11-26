---
paths:
  - 'src/common/ui/**'
---

# Rules for shared UI (src/common/ui)

- One palette, as tokens in `theme.ts`: Whiteout `#FBFBFB` (page), Nebulous White `#DDDFDD` (lines), Astroscopus Grey `#AEB4B7` (faint), Indian Dance `#F69175` (accent), Hypnotic `#677782` (muted), Tricon Black `#2F2F2F` (ink). Add a token here rather than a hex in a component.
- Contrast: coral is a fill or highlight, never small text on white (2.3:1). Text on coral is ink (5.9:1). Coral text uses `accentInk` (5.4:1). Body text ≥ 4.5:1.
- My own dot on the map stays blue (`colors.me`): the "you are here" convention.
- A component goes here only when two features use it; otherwise it stays in that feature's `views/`.
- Every pressable has `accessibilityRole` and a label; touch targets ≥ 44 points.
