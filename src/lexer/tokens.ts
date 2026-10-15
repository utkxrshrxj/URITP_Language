// Defines the tokens: the small pieces (words, numbers, symbols) a program is cut into.
// The lexer makes tokens from text; the parser reads tokens to understand statements.

export type TokenKind =
  | "name" // a name the program chooses: rover, pick_and_place
  | "keyword" // a reserved word: move, if, speed
  | "number" // a plain number: 3, 0.5
  | "quantity" // a number with a unit: 10cm, 0.2m/s
  | "percent" // a percentage: 25%
  | "text" // text in double quotes: "Parcel for you"
  | "symbol" // punctuation and operators: ( ) [ ] , : . = + - == != < <= > >=
  | "newline" // a statement has ended
  | "indent" // a block has started
  | "dedent" // a block has ended
  | "eof"; // the end of the file

/** A piece of text: either plain characters or a {name} to insert. */
export type TextPart =
  | { readonly kind: "literal"; readonly text: string }
  | { readonly kind: "insert"; readonly path: readonly string[]; readonly column: number };

interface TokenBase {
  /** The exact characters from the source, for error messages. */
  readonly text: string;
  /** 1-based position of the first character. */
  readonly line: number;
  readonly column: number;
}

export interface NumberToken extends TokenBase {
  readonly kind: "number";
  readonly value: number;
}

export interface QuantityToken extends TokenBase {
  readonly kind: "quantity";
  readonly value: number;
  readonly unit: string;
}

export interface PercentToken extends TokenBase {
  readonly kind: "percent";
  readonly value: number;
}

export interface TextToken extends TokenBase {
  readonly kind: "text";
  readonly parts: readonly TextPart[];
}

export interface PlainToken extends TokenBase {
  readonly kind: "name" | "keyword" | "symbol" | "newline" | "indent" | "dedent" | "eof";
}

export type Token = NumberToken | QuantityToken | PercentToken | TextToken | PlainToken;

/** Describes a token for an error message: 'move', the end of the line, and so on. */
export function describeToken(token: Token): string {
  switch (token.kind) {
    case "newline":
      return "the end of the line";
    case "eof":
      return "the end of the file";
    case "indent":
      return "an indented line";
    case "dedent":
      return "the end of the block";
    case "text":
      return `text ${token.text}`;
    default:
      return `'${token.text}'`;
  }
}
