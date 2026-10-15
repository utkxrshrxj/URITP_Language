# Examples

The six example programs from `spec-source/URITP - Google Docs.pdf`, cleaned up
so they follow the Guidebook. Each folder holds one program and, where it uses
places or routes, a `site.uritp` site map that is loaded automatically
(DECISIONS.md D16). The positions in the site maps are illustrative only.

| Folder | Robot | What changed from the original |
|---|---|---|
| `01-pick-and-place` | arm | `disp` -> `say`; `on fail` lined up (A1, A8) |
| `02-office-delivery-rover` | wheeled rover | `disp` -> `say`; no comma before `speed` (A1, A7) |
| `03-roof-inspection-drone` | drone | `return_home`; `launch_pad`; `takeoff ... to`; safety rule form; one-line `capture` (A3, A5, A6, A9, A10) |
| `04-night-patrol-quadruped` | quadruped | `deg_c`; one-line `capture`; `repeat for` rewritten (A4, A10, A11) |
| `05-kitchen-humanoid` | humanoid | `counter.spot_a` -> `places.counter_spot_a` (A13) |
| `06-welding-arm-extension` | welding arm | `5mm/s`; `route.seam` and `places.seam_start` (A2, A12) |

The letters and numbers refer to entries in [spec/DECISIONS.md](../spec/DECISIONS.md).

## Ready-to-run programs

Three more programs are written to run as they are on the simulated robots,
with `uritp run` (see docs/HOW_IT_WORKS.md):

| Folder | Robot | What it does |
|---|---|---|
| `try-arm` | an industrial arm | picks up at one spot and puts down at another |
| `try-camera-rover` | a rover with a camera | does its rounds, keeps away from the stairs, takes photos |
| `try-small-rover` | a small rover with a distance sensor | drives forward until something is close, then turns round |

The tests check every program with small made-up robot models
(`tests/checker/models.ts`), then run it against simulated test robots and
check the instructions each robot receives (`tests/runtime/examples-run.test.ts`).
