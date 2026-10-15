// The words the offline translator knows in English, Hindi (Devanagari) and Hinglish (Hindi in
// Latin letters). Kept as plain data so new words can be added without touching any logic.

/** Nouns for objects and places, translated to the English name used in programs. */
export const NOUNS: Readonly<Record<string, string>> = {
  // Hinglish
  gend: "ball",
  tokri: "basket",
  kap: "cup",
  cup: "cup",
  dabba: "box",
  dibba: "box",
  botal: "bottle",
  rasoi: "kitchen",
  darwaza: "door",
  darwaja: "door",
  kamra: "room",
  // Hindi
  गेंद: "ball",
  टोकरी: "basket",
  कप: "cup",
  डिब्बा: "box",
  बोतल: "bottle",
  रसोई: "kitchen",
  दरवाज़ा: "door",
  दरवाजा: "door",
  कमरा: "room",
  डॉक: "dock",
};

/** Colours, which come before a noun: laal gend becomes red_ball. */
export const COLOURS: Readonly<Record<string, string>> = {
  laal: "red",
  lal: "red",
  neela: "blue",
  nila: "blue",
  hara: "green",
  peela: "yellow",
  pila: "yellow",
  kala: "black",
  safed: "white",
  लाल: "red",
  नीला: "blue",
  हरा: "green",
  पीला: "yellow",
  काला: "black",
  सफ़ेद: "white",
  सफेद: "white",
};

/** Units as people say them, mapped to URITP units. */
export const UNIT_WORDS: Readonly<Record<string, string>> = {
  cm: "cm",
  centimetre: "cm",
  centimetres: "cm",
  centimeter: "cm",
  centimeters: "cm",
  सेंटीमीटर: "cm",
  सेमी: "cm",
  m: "m",
  metre: "m",
  metres: "m",
  meter: "m",
  meters: "m",
  मीटर: "m",
  mm: "mm",
  degree: "deg",
  degrees: "deg",
  deg: "deg",
  डिग्री: "deg",
  s: "s",
  sec: "s",
  second: "s",
  seconds: "s",
  सेकंड: "s",
  min: "min",
  minute: "min",
  minutes: "min",
  मिनट: "min",
};

/** Words that join two requests: and, then. */
export const JOINERS = ["and then", "and", "then", "aur phir", "aur", "phir", "और फिर", "और", "फिर"];

/** Small words before a noun that carry no meaning in a program. */
export const FILLER = new Set(["the", "a", "an", "to", "it", "ise", "use", "usse", "इसे", "उसे"]);
