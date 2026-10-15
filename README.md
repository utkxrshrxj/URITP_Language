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

> **Status:** a program is fully checked against its robots' manifests before
> anything moves: syntax, names, types, units, capabilities and safety
> (Phases 2 to 4). Code generation and the runner come next.

## Quick start

You need Node.js 20 or newer.

```bash
npm install
```

```bash
npm test
```

## The language

- [spec/GRAMMAR.md](spec/GRAMMAR.md): the formal grammar (tokens,
  indentation, every statement, site maps and manifests).
- [spec/TYPES_AND_UNITS.md](spec/TYPES_AND_UNITS.md): units, types,
  operators and what each statement expects.
- [spec/DECISIONS.md](spec/DECISIONS.md): every place where the examples or
  the Guidebook needed a decision, and ideas that were not adopted.
- [spec/ERRORS.md](spec/ERRORS.md): every error code and what triggers it.
- [examples/](examples/): the six example programs, cleaned up so they parse.

## Project layout

| Folder | What goes there |
|---|---|
| `spec-source/` | The original project documents. The URITP Guidebook is the source of truth. |
| `spec/` | The formal grammar, the types and units table, and design decisions. |
| `src/` | The compiler: `lexer`, `parser`, `diagnostics` (error messages), `checker`, `stdlib`, `codegen`, `runtime`, `nl` (voice and text layer), `cli`. |
| `drivers/` | `shared/` driver interface, plus one folder per company. |
| `manifests/` | Robot manifests (capabilities and safety limits), one folder per company, each with its own tests. |
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
| 1 | Language definition: grammar, types and units, decisions | Done |
| 2 | Lexer and parser with E1xx errors | Done |
| 3 | Names, types and units (E2xx, E3xx) | Done |
| 4 | Manifests, capabilities and safety (E4xx, E5xx, W6xx) | Done |
| 5 | Code generation and runner | Next |
| 6 | Drivers for the three companies | |
| 7 | Voice and text layer | |
| 8 | Command line, conformance tests, Hindi messages, v0.1.0 | |

## License

Not decided yet.
