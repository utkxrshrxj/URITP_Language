# Conformance test set

The rules a robot driver must meet to be called URITP-compatible
(Guidebook §9.3), written as tests that work with any driver.

| Rule | What the test does |
|---|---|
| 1. Manifest | checks the robot's manifest has no problems |
| 2. Core | sends one instruction for core and for each declared profile; each must succeed |
| 3. Task lifecycle | every task must report `accepted`, `running`, then exactly one final state (or a straight refusal) |
| 4. No silent approximation | instructions the robot cannot do (a missing frame, an unlisted extension, a profile it lacks) must be refused at once with an E4xx reason |
| 5. Stop | STOP must work with nothing running, and must cancel a running task within the driver's stated stopping time |
| 6. Safety envelope | a move at twice the safety speed, or into a forbidden zone, must be refused with an E5xx reason |
| 7. Units | after a move to a pose given in metres, the robot must report exactly that pose |
| 8. Extensions | every listed extension is named `vendor.feature` in lower case and is accepted |
| 9. Native code | a robot that states no native languages must refuse NATIVE with E405 (spec/DECISIONS.md D20) |
| 10. Conformance tests | the robot passes all of the above |

`suite.ts` holds the rules and names no company. `conformance.test.ts` finds
every driver in `drivers/` by its folder, with the manifest in the matching
`manifests/` folder, and runs the set against each one. It also runs the set
against a deliberately careless driver, to show the set catches real
problems.

Passing this set in simulator mode says nothing about real hardware. No
driver here has been tested on a real robot.
