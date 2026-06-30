export type FeedbackState = 'absent' | 'present' | 'correct';
export type PatternState = FeedbackState | 'any';

export function computeFeedback(guess: string, solution: string): FeedbackState[] {
  const n = solution.length;
  const result: FeedbackState[] = Array.from({ length: n }, () => 'absent');
  const remaining = solution.split('');

  for (let i = 0; i < n; i++) {
    if (guess[i] === solution[i]) {
      result[i] = 'correct';
      remaining[i] = '\0';
    }
  }

  for (let i = 0; i < n; i++) {
    if (result[i] === 'correct') continue;
    const letter = guess[i];
    const idx = remaining.indexOf(letter);
    if (idx !== -1) {
      result[i] = 'present';
      remaining[idx] = '\0';
    }
  }

  return result;
}

function patternMatches(feedback: FeedbackState[], pattern: PatternState[]): boolean {
  return feedback.every((state, i) => {
    const expected = pattern[i];
    if (expected === 'any') return state === 'correct' || state === 'present';
    return state === expected;
  });
}

export function findWordsForPattern(
  pattern: PatternState[],
  solution: string,
  dictionary: string[]
): string[] {
  const target = solution.toUpperCase();
  return dictionary.filter((word) => {
    if (word.length !== target.length) return false;
    return patternMatches(computeFeedback(word, target), pattern);
  });
}