# Changelog

What changed in each version of URITP, in plain words.

## 0.1.0

The first complete version. It implements URITP 0.1 as described in the URITP
Guidebook, from a spoken request all the way to a simulated robot moving.

### What it does

- **The language.** A formal grammar, a types and units table, and a record
  of every decision taken where the examples and the Guidebook needed one
  (`spec/`). The six Guidebook examples are cleaned up so they parse.
- **Reading programs.** A hand-written lexer and parser, with clear E1xx
  messages and suggested fixes for programs written wrongly.
- **Checking programs.** Names, types and units (E2xx, E3xx), the robot's
  capabilities from its manifest (E4xx), safety limits and forbidden zones
  (E5xx), and portability warnings (W6xx). A program that fails a check never
  reaches a robot.
- **Running programs.** Checked programs become instructions in SI units.
  A runner sends them one at a time, follows each through accepted, running
  and exactly one of succeeded, failed or cancelled, runs `on fail` handlers,
  watches safety rules the whole time, and stops every robot on STOP or
  Ctrl+C. Problems while running have R7xx codes.
- **Drivers.** Simulated drivers for a Universal Robots arm (URScript-style
  text), a Raspberry Pi rover (JSON command messages) and an Arduino rover
  (serial text lines). Each one checks every instruction against its own
  limits as well.
- **Conformance tests.** The ten rules of Guidebook section 9.3, run against
  all three drivers and against a deliberately careless driver, to show the
  tests catch problems.
- **Requests in people's words.** An offline translator for a few dozen
  phrases in English, Hindi and Hinglish, and an AI translator using Claude
  when an API key is set. Whatever either one writes is checked like any
  other program.
- **Browser demo.** `npm run demo`: type or speak a request to a simulated
  rover. It uses only the offline translator.
- **Command line.** `uritp check`, `uritp compile` and `uritp run`, with
  messages in English or Hindi.
- **Hindi messages.** All 97 error and warning codes have English and Hindi
  messages and fixes, with the same codes in both.
- **Guides.** `docs/HOW_IT_WORKS.md` for a reader who does not program,
  `docs/COMPANIES.md` for what each company's code is and is not.

### Known limitations

- **Simulator only.** No driver has been tested on real hardware, and none
  sends anything to a real robot. Passing the conformance tests in simulator
  mode says nothing about how a real robot would behave.
- **Illustrative manifests.** The numbers in the three manifests (speeds,
  reach, payloads, gripping force) are placeholders, marked "replace with
  datasheet values". They are not the companies' real figures.
- **No partnership.** This project is not affiliated with, certified by or
  endorsed by Universal Robots, Raspberry Pi or Arduino.
- **Simple simulation.** Simulated robots move in straight lines and read
  fixed default values from their sensors unless a test sets them: a distance
  sensor reads 2 m (nothing nearby), others read 0. Objects exist only when a
  test places them, so programs that find objects by name only run in tests.
- **Small offline vocabulary.** The offline translator knows a few dozen
  phrases. Anything else needs the AI translator, which needs an API key and
  an internet connection. The AI translator's tests use a stand-in for the
  AI service; it has not been checked against the live service in this
  version.
- **Hindi messages keep some English.** Details filled in by the checker or
  reported by a robot, such as names and reasons, stay in English
  (spec/DECISIONS.md D41).
- **Not in the language yet.** Ideas such as `repeat for DURATION:`,
  `*` and `/` arithmetic, Unicode names and a manifest limit for turning
  speed are listed under "Proposed, not adopted" in spec/DECISIONS.md. The
  compiler rejects programs that use them.
- **No license yet.** The project's license has not been decided.
