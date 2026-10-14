# URITP

URITP is a small, safe language for telling robots what to do, plus a compiler
that checks every program before anything moves. It sits between people and
robots like an adapter:

1. Someone speaks or types a request in their own language.
2. An AI (or an offline rule-based translator) turns it into a URITP program.
3. The compiler checks the program: grammar, names, types, units, the robot's
   capabilities and its safety limits. Anything wrong is rejected with a plain
   explanation and a suggested fix.
4. A robot driver carries out the checked instructions.

> **Status:** early setup (Phase 0). The language and compiler are not built yet.

## Quick start

You need Node.js 20 or newer.

```bash
npm install
```

```bash
npm test
```

## Project layout

| Folder | What goes there |
|---|---|
| `spec-source/` | The original project documents. The URITP Guidebook is the source of truth. |
| `spec/` | The formal grammar, the types and units table, and design decisions. |
| `src/` | The compiler: `lexer`, `parser`, `checker`, `stdlib`, `codegen`, `runtime`, `nl` (voice and text layer), `cli`. |
| `drivers/` | `shared/` driver interface, plus one folder per company. |
| `manifests/` | Robot manifests (capabilities and safety limits), one folder per company. |
| `examples/` | Example URITP programs. |
| `conformance/` | Conformance tests from Guidebook section 9.3. |
| `tests/` | Unit tests (Vitest). |
| `docs/` | Plain-language guides. |

## Supported hardware

Reference drivers for Universal Robots arms, Raspberry Pi rovers and Arduino
rovers. They run in simulator mode only and have **not been tested on real
hardware**. This project is not affiliated with, certified by or endorsed by
any of these companies. See [docs/COMPANIES.md](docs/COMPANIES.md).

## Roadmap

| Phase | What it builds | Status |
|---|---|---|
| 0 | Repo, TypeScript, Vitest, docs folder, source documents | Done |
| 1 | Language definition: grammar, types and units, decisions | Next |
| 2 | Lexer and parser with E1xx errors | |
| 3 | Names, types and units (E2xx, E3xx) | |
| 4 | Manifests, capabilities and safety (E4xx, E5xx, W6xx) | |
| 5 | Code generation and runner | |
| 6 | Drivers for the three companies | |
| 7 | Voice and text layer | |
| 8 | Command line, conformance tests, Hindi messages, v0.1.0 | |

## License

Not decided yet.
