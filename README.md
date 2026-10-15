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

> **Status:** requests in English, Hindi or Hinglish are translated into
> URITP, fully checked against the robots' manifests, and run on simulated
> drivers for Universal Robots, Raspberry Pi and Arduino robots (Phases 2 to
> 7). The command line and conformance tests come next. No driver has been
> tested on real hardware.

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

## Talking to a robot

A request goes through three steps, and the checker always has the last word
(spec/DECISIONS.md D40):

1. **Translate.** One of two translators turns the request into URITP:
   - The **offline translator** knows a few dozen phrases in English, Hindi
     and Hinglish, such as "rasoi mein jao" or "laal gend uthao aur tokri
     mein rakho". It needs no key, and it says so plainly when it does not
     understand.
   - The **AI translator** uses Claude (`claude-opus-5-5`) through the official
     Anthropic SDK. It is used only when the `ANTHROPIC_API_KEY` environment
     variable is set; `URITP_AI_MODEL` can choose another model.
2. **Check.** The program goes through every check a hand-written program
   does. Anything wrong or unsafe is rejected, with its error codes, before
   any robot moves.
3. **Run.** Only then does the robot receive its instructions.

To try it in a browser, with a simulated rover and speech input where the
browser supports it:

```bash
npm run demo
```

Then open http://localhost:5173/. The demo uses only the offline translator,
since a web page must never hold an API key.

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

| Robot | Profiles | The driver writes |
|---|---|---|
| Universal Robots arm | core, manipulation | URScript-style text, like `movel(p[...], a=1.2, v=0.2)` |
| Raspberry Pi rover | core, navigation, vision | JSON command messages, like `{"service":"motors","command":"go_to",...}` |
| Arduino rover | core, navigation | serial text lines, like `F 500 100` |

## Roadmap

| Phase | What it builds | Status |
|---|---|---|
| 0 | Repo, TypeScript, Vitest, docs folder, source documents | Done |
| 1 | Language definition: grammar, types and units, decisions | Done |
| 2 | Lexer and parser with E1xx errors | Done |
| 3 | Names, types and units (E2xx, E3xx) | Done |
| 4 | Manifests, capabilities and safety (E4xx, E5xx, W6xx) | Done |
| 5 | Code generation and runner | Done |
| 6 | Drivers for the three companies | Done (simulator only) |
| 7 | Voice and text layer | Done |
| 8 | Command line, conformance tests, Hindi messages, v0.1.0 | Next |

## License

Not decided yet.
