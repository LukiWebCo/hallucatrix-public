export const DIFFICULTIES = {
  accessible: { es: 'Accesible', en: 'Accessible' },
  tricky: { es: 'Con truco', en: 'Tricky' },
  expert: { es: 'Experto', en: 'Expert' },
};

export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function puzzleForDate(puzzles, schedule, now = new Date()) {
  const id = schedule.dates[localDate(now)];
  return puzzles.find(puzzle => puzzle.id === id) ?? null;
}

export function createState(puzzle, date) {
  return { puzzleId: puzzle.id, date, guesses: [], solved: [], mistakes: 0, finished: false, revealed: false };
}

export function checkGroup(puzzle, selection, solved = []) {
  if (!Array.isArray(selection) || selection.length !== 4 || new Set(selection).size !== 4 ||
      selection.some(tile => !Number.isInteger(tile) || tile < 0 || tile >= 16 || solved.includes(Math.floor(tile / 4)))) {
    return { kind: 'invalid' };
  }
  const counts = puzzle.groups.map((_, group) => selection.filter(tile => Math.floor(tile / 4) === group).length);
  const group = counts.indexOf(4);
  if (group !== -1) return { kind: 'correct', group };
  return { kind: counts.includes(3) ? 'one-away' : 'incorrect' };
}

export function submitGuess(puzzle, state, selection) {
  if (state.finished) return { state, kind: 'finished' };
  const result = checkGroup(puzzle, selection, state.solved);
  if (result.kind === 'invalid') return { state, ...result };
  const solved = result.kind === 'correct' ? [...state.solved, result.group] : state.solved;
  return {
    ...result,
    state: {
      ...state,
      guesses: [...state.guesses, [...selection]],
      solved,
      mistakes: state.mistakes + (result.kind === 'correct' ? 0 : 1),
      finished: solved.length === 4,
    },
  };
}

export function reveal(state) {
  return state.finished ? state : { ...state, finished: true, revealed: true };
}

// Replaying guesses keeps derived counters and locked groups out of trusted storage.
export function restoreState(puzzle, date, saved) {
  if (!saved || saved.puzzleId !== puzzle.id || saved.date !== date ||
      !Array.isArray(saved.guesses) || typeof saved.revealed !== 'boolean') {
    throw new Error('Invalid saved game');
  }
  let state = createState(puzzle, date);
  for (const guess of saved.guesses) {
    const result = submitGuess(puzzle, state, guess);
    if (result.kind === 'invalid' || result.kind === 'finished') throw new Error('Invalid saved guess');
    state = result.state;
  }
  if (saved.revealed) {
    if (state.finished) throw new Error('Invalid saved reveal');
    state = reveal(state);
  }
  return state;
}

export function previousDate(date) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

export function recordCompletion(dates, puzzleDate, today) {
  return puzzleDate === today && isDate(today) ? [...new Set([...dates, today])].sort() : [...dates];
}

export function currentStreak(dates, today) {
  const completed = new Set(dates);
  let cursor = completed.has(today) ? today : previousDate(today);
  let streak = 0;
  while (completed.has(cursor)) {
    streak++;
    cursor = previousDate(cursor);
  }
  return streak;
}

const SQUARES = ['🟨', '🟩', '🟦', '🟪'];

export function shareText(puzzle, state, lang = 'es') {
  const labels = lang === 'en'
    ? { mistakes: 'Mistakes', revealed: 'Revealed' }
    : { mistakes: 'Errores', revealed: 'Revelado' };
  return [
    `Cruces · ${state.date}`,
    DIFFICULTIES[puzzle.difficulty][lang],
    ...state.guesses.map(guess => guess.map(tile => SQUARES[Math.floor(tile / 4)]).join('')),
    `${labels.mistakes}: ${state.mistakes}`,
    ...(state.revealed ? [labels.revealed] : []),
  ].join('\n');
}

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
