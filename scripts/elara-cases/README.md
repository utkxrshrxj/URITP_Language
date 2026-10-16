# Elara translation cases

These scripts make [sandboxes/ELARA_TRANSLATION_CASES.md](../../sandboxes/ELARA_TRANSLATION_CASES.md)
and its PDF. They test the URITP playground's built-in translator: for each request in `cases.mjs`
they translate it, run the program on the playground's own engine and scene, and check whether it
does what was asked. Each case's corrected program is checked the same way.

You need Node.js, Python 3 and Google Chrome, plus a clone of the playground
(github.com/senthuran2107/URITP):

```bash
scripts/elara-cases/run.sh ../URITP
```

After a change to the playground's translator, run it again. `judge.mjs` prints a line for every
case where Elara's program now does what was asked, so the case can be moved to the list of
requests Elara gets right.

| File | What it does |
|---|---|
| `cases.mjs` | The requests, what each asks for, its check, and its corrected program |
| `prepare.mjs` | Translates each request with the playground's `translate.js` |
| `run_sources.py` | Checks and runs each program on the playground's `bridge.py` |
| `judge.mjs` | Plays each run on the playground's scene and applies the checks |
| `publish.mjs` | Writes the `request-*` programs, the Markdown report and the HTML for the PDF |
| `run.sh` | Runs all of the above and prints the PDF |
