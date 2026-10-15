# URITP grammar (version 0.1)

This is the formal grammar of URITP, written from the Guidebook (§3 lexical
structure, §5 statements, §6 site maps, §9.1 manifests). Where the Guidebook
left a choice open, the decision is in [DECISIONS.md](DECISIONS.md) and is
referenced by its number, like (B5).

The grammar comes in two levels:

1. **Lexical grammar**: how the characters of a file are cut into *tokens*
   (words, numbers, symbols) and how indentation becomes block markers.
2. **Syntax grammar**: how tokens are put together into statements and
   expressions.

## How to read the rules

The rules use a common notation called EBNF:

| Notation | Meaning |
|---|---|
| `rule = ... ;` | defines `rule` |
| `"move"` | exactly this text |
| `a b` | `a` followed by `b` |
| `a \| b` | `a` or `b` |
| `[ a ]` | `a` is optional |
| `{ a }` | `a` repeated zero or more times |
| `( a b )` | grouping |
| `UPPER_CASE` | a token made by the lexer |
| `(* ... *)` | a comment that explains the rule |

---

# Part 1: Lexical grammar

## 1.1 Files

- Every URITP file (program, site map or manifest) has the extension `.uritp`.
- Files are UTF-8. A byte-order mark at the very start is skipped.
- Lines end with `\n` or `\r\n`.

## 1.2 Comments, blank lines and spaces

- `#` starts a comment that runs to the end of the line, except inside text.
- A blank line, or a line holding only a comment, is ignored entirely,
  including for indentation.
- Spaces between tokens are ignored.
- A tab anywhere outside text and comments is an error (B5).

## 1.3 Indentation

Indentation is how URITP groups lines into blocks. The lexer turns it into
three invisible tokens:

| Token | Meaning |
|---|---|
| `NEWLINE` | one statement has ended |
| `INDENT` | a block has started |
| `DEDENT` | a block has ended |

Indentation is made of spaces only, in steps of exactly 4. The lexer keeps a
stack of open block depths, starting at `[0]`, and handles each
non-ignored line like this (B5):

1. Count the leading spaces. If a tab is found, or the count is not a
   multiple of 4, that is an error.
2. **The previous line ended with `:`.** This line must be exactly 4 spaces
   deeper than the line with the `:`. Push that depth and produce `INDENT`.
   Any other depth is an error ("expected an indented block").
3. **Otherwise, the line is exactly 4 spaces deeper than the first line of
   the current statement.** It is a *continuation line*: it is joined to the
   statement and no token is produced. Further continuation lines must be at
   that same depth.
4. **Otherwise, the depth equals the top of the stack.** Produce `NEWLINE`; a
   new statement starts.
5. **Otherwise, the depth is less than the top of the stack.** Produce
   `NEWLINE`, then pop the stack and produce one `DEDENT` for each level
   until the top equals the depth. If no level matches, that is an error
   ("this line does not line up with any block above it").
6. Any other depth is an error.

A line that ends with `:` must be the first line of its statement. A
continuation line may not end with `:` (B5).

At the end of the file the lexer produces `NEWLINE`, one `DEDENT` for every
open block, and then `EOF`.

**Example.** The `avoid` line is a continuation of `move`; the `say` line is
a new statement:

```
move rover.base to places.ward_3 speed 0.5m/s
    avoid zones.icu
say "I have arrived"
```

## 1.4 Names

```ebnf
NAME   = letter { letter | digit | "_" } ;   (* and not a keyword *)
letter = "a" ... "z" | "A" ... "Z" | "_" ;
digit  = "0" ... "9" ;
```

Names use ASCII letters only (B1). Examples: `arm`, `pick_and_place`,
`box_231`, `_tmp`. Dotted names such as `arm.tool` are not single tokens:
they are a `NAME`, a `.` and another `NAME`, joined by the syntax grammar.

## 1.5 Keywords

Keywords are reserved words. They are lower case and case-sensitive (B2).

**Reserved in every file** (§3):

```
robot connect let task return move to by speed tolerance via avoid drive
turn forward backward grip open close pick place using onto on pour from
into weld along spray amount current takeoff land at capture save as say
lang confirm ask alert log wait until timeout if elif else and or not for
in repeat every times forever break parallel fail safety when stop
return_home native import true false define force
```

**Reserved only in manifest files** (§3, B2):

```
manifest uritp frame actuator sensor profiles extension
```

A file is a manifest file when its first statement starts with `manifest`.

Some keywords may also be used as names in a few exact places (B7): as
named-argument labels (`current=180A`), as extension parameter names in
manifests, and as actuator state names (`states [open, closed]`).

## 1.6 Numbers, quantities and percents

```ebnf
NUMBER   = digits [ "." digits ] ;
digits   = digit { digit } ;
QUANTITY = NUMBER unit ;          (* no space between number and unit *)
PERCENT  = NUMBER "%" ;           (* no space between number and % *)
unit     = "mm" | "cm" | "m" | "km"
         | "deg" | "rad"
         | "ms" | "s" | "min" | "h"
         | "mm/s" | "cm/s" | "m/s" | "km/h"
         | "deg/s" | "rad/s"
         | "g" | "kg"
         | "N"
         | "A"
         | "ml" | "l"
         | "deg_c" ;
```

How the lexer reads a unit (B4):

- After a number, it reads every letter and `_` that follows with no space,
  plus one optional `/` and more letters. That whole piece is the unit.
- The unit must be one of the units above, spelled exactly.
- An unknown unit is an error that suggests the closest real unit, for
  example `5mms` gets "did you mean `5mm/s`?"
- A number followed by a space and a unit (`10 cm`) is an error that
  suggests `10cm`.

There are no negative literals: `-2` is unary minus applied to `2` (B3).
The full unit table, with SI values, is in
[TYPES_AND_UNITS.md](TYPES_AND_UNITS.md).

## 1.7 Text

```ebnf
TEXT       = '"' { text_char | insertion } '"' ;
text_char  = (* any character except  "  {  }  and the end of the line *) ;
insertion  = "{" NAME { "." NAME } "}" ;
```

- Text stays on one line and has no escape sequences (B6).
- `{name}` or `{a.b.c}` inserts a value, for example
  `"Hot spot at {checkpoint.name}"`.
- A `{` always starts an insertion, and a `}` outside an insertion is an
  error.
- **Constant text** is text with no insertions. Some places require it
  (B6): `connect`, `import`, `native`, `.has`, `.sense` and the manifest name.

## 1.8 Symbols

```
(  )  [  ]  ,  :  .  =  +  -  ==  !=  <  <=  >  >=
```

`<` and `>` are also used inside manifest types like `Quantity<Current>`.

## 1.9 Token list

The lexer produces these tokens:

- `NAME`, each keyword, `NUMBER`, `QUANTITY`, `PERCENT`, `TEXT`
- each symbol
- `NEWLINE`, `INDENT`, `DEDENT`, `EOF`

Every token remembers its line and column so error messages can point at it.
