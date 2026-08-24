# Layout evidence — 1920×1080

Captured in-browser at the requested desktop size. `sidewaysScroll` is the
check that matters: a page whose content is wider than the viewport forces
horizontal scrolling, which design.md treats as a defect.

| Page | Viewport | scrollWidth | Sideways scroll | Controls < 44px |
|---|---|---|---|---|
| `/` | 1920×1080 | 1905 | no | — |
| `/pricing` | 1920×1080 | 1920 | no | — |
| `/register/patient` | 1920×1080 | 1920 | no | 0 of 10 |

All clean at desktop size. Mobile (375×812) was verified separately during the
checkout build: plan cards stack, no sideways scroll, all 7 inputs >= 44px.
