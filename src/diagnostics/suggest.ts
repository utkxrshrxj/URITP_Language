// Finds the closest correct spelling for a mistyped word, for "did you mean ...?" hints.
// It counts how many single-letter changes turn one word into another (edit distance).

/** Number of single-letter insertions, deletions or swaps that turn `a` into `b`. */
export function editDistance(a: string, b: string): number {
  // previous[j] holds the distance between the first i-1 letters of a and the first j letters of b.
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const swap = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      const remove = (previous[j] ?? 0) + 1;
      const insert = (current[j - 1] ?? 0) + 1;
      current.push(Math.min(swap, remove, insert));
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}

/**
 * Returns the candidate closest to `word`, ignoring upper and lower case,
 * or undefined if nothing is close enough. Short words must be closer:
 * at most 1 change for words of 3 letters or fewer, otherwise at most 2.
 */
export function closestMatch(word: string, candidates: readonly string[]): string | undefined {
  const limit = word.length <= 3 ? 1 : 2;
  const lower = word.toLowerCase();
  let best: string | undefined;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const distance = editDistance(lower, candidate.toLowerCase());
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return bestDistance <= limit ? best : undefined;
}
