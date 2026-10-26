import {
  DIFFICULTIES, localDate, isDate, puzzleForDate, createState, restoreState,
  submitGuess, reveal, currentStreak, recordCompletion, shareText, shuffle,
} from './logic.js';

const TEXT = {
  es: {
    tagline: 'Un juego diario entre dos idiomas.',
    intro: 'Encuentra cuatro grupos de cuatro palabras. Las palabras no cambian de idioma.',
    rules: 'Selecciona cuatro fichas y comprueba el grupo. Intentos ilimitados; contamos los errores. Nuevo juego a tu medianoche local.',
    privacy: 'El progreso y la racha solo se guardan en este navegador. Si borras sus datos, los pierdes.',
    draft: 'Vista previa: calendario y acertijos de muestra, pendientes de revisión editorial.',
    loading: 'Cargando…', noPuzzle: 'Hoy no hay un juego programado. ¡Vuelve otro día!',
    loadError: 'No se pudo cargar el juego. Comprueba que el sitio esté disponible y recarga la página.',
    storageError: 'No se pudo leer o guardar parte del progreso o el idioma. Puede perderse al recargar.',
    corrupt: 'El progreso guardado no es válido. Esta partida se ha reiniciado.',
    board: 'Tablero', shuffle: 'Mezclar', deselect: 'Deseleccionar', submit: 'Comprobar',
    reveal: 'Revelar y terminar', confirmText: 'Se mostrarán todas las respuestas y se terminará la partida.',
    confirmReveal: 'Sí, revelar y terminar', cancel: 'Seguir jugando',
    selected: count => `Seleccionadas: ${count}/4`,
    counters: (mistakes, groups) => `Errores: ${mistakes} · Grupos: ${groups}/4`,
    oneAway: '¡Te falta una! Tres palabras pertenecen al mismo grupo.',
    incorrect: 'Todavía no. Prueba otro grupo.', correct: '¡Grupo encontrado!',
    choose: 'Selecciona exactamente cuatro palabras.', max: 'Ya elegiste cuatro. Deselecciona una para cambiarla.',
    complete: '¡Terminaste!', revealed: 'Respuestas reveladas.',
    newDay: 'Ya es un nuevo día local. Aquí está el juego de hoy.',
    resultsTitle: 'Tu resultado', learnTitle: 'Descubre los cruces',
    streak: count => `Racha actual: ${count} ${count === 1 ? 'día' : 'días'}.`,
    share: 'Copiar resultado', copied: 'Resultado copiado, sin palabras ni títulos.',
    fallback: 'No se pudo copiar automáticamente. Selecciona y copia este texto:',
    shareLabel: 'Resultado sin pistas (puedes copiarlo a mano)',
    region: code => `Región: ${code}`,
  },
  en: {
    tagline: 'A daily game between two languages.',
    intro: 'Find four groups of four words. Tile words stay in their original language.',
    rules: 'Select four tiles and check the group. Unlimited tries; mistakes are counted. A new game arrives at your local midnight.',
    privacy: 'Progress and streaks stay in this browser only. Clearing its data loses them.',
    draft: 'Preview: sample puzzles and draft schedule, awaiting editorial review.',
    loading: 'Loading…', noPuzzle: 'No puzzle is scheduled for today. Come back another day!',
    loadError: 'The game could not load. Check that the site is available and reload the page.',
    storageError: 'Some progress or language settings could not be read or saved. They may be lost on reload.',
    corrupt: 'Saved progress is invalid. This game has been restarted.',
    board: 'Puzzle board', shuffle: 'Shuffle', deselect: 'Deselect', submit: 'Check group',
    reveal: 'Reveal and finish', confirmText: 'This will show every answer and finish the game.',
    confirmReveal: 'Yes, reveal and finish', cancel: 'Keep playing',
    selected: count => `Selected: ${count}/4`,
    counters: (mistakes, groups) => `Mistakes: ${mistakes} · Groups: ${groups}/4`,
    oneAway: 'One away! Three words belong to the same group.',
    incorrect: 'Not yet. Try another group.', correct: 'Group found!',
    choose: 'Select exactly four words.', max: 'Four are already selected. Deselect one to change it.',
    complete: 'You finished!', revealed: 'Answers revealed.',
    newDay: 'A new local day has started. Here is today’s puzzle.',
    resultsTitle: 'Your result', learnTitle: 'Explore the crossovers',
    streak: count => `Current streak: ${count} ${count === 1 ? 'day' : 'days'}.`,
    share: 'Copy result', copied: 'Result copied, without words or titles.',
    fallback: 'Automatic copying was unavailable. Select and copy this text:',
    shareLabel: 'Spoiler-free result (copy manually if needed)',
    region: code => `Region: ${code}`,
  },
};

const $ = id => document.getElementById(id);
let storageIssue = false;
function read(key) {
  try { return localStorage.getItem(key); }
  catch { storageIssue = true; return null; }
}
function write(key, value) {
  try { localStorage.setItem(key, value); }
  catch { storageIssue = true; }
}
const storedLanguage = read('hx-lang');
let lang = ['es', 'en'].includes(storedLanguage)
  ? storedLanguage : (navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en');
let puzzles = [];
let schedule = { draft: false, dates: {} };
let puzzle = null;
let state = null;
let date = localDate();
let selected = [];
let order = [];
let completions = [];
let message = 'loading';
let confirming = false;
let fallback = false;
let ready = false;

function readJSON(key) {
  const raw = read(key);
  if (raw === null) return null;
  try { return JSON.parse(raw); }
  catch { storageIssue = true; return null; }
}
const storedCompletions = readJSON('hx-cruces-completions');
if (storedCompletions !== null) {
  if (Array.isArray(storedCompletions) && storedCompletions.every(isDate)) completions = storedCompletions;
  else storageIssue = true;
}

function creditFinish() {
  if (!state.finished || state.date !== localDate()) return;
  const saved = readJSON('hx-cruces-completions');
  if (saved !== null && (!Array.isArray(saved) || !saved.every(isDate))) storageIssue = true;
  const otherDates = Array.isArray(saved) && saved.every(isDate) ? saved : [];
  completions = recordCompletion([...completions, ...otherDates], state.date, localDate());
  write('hx-cruces-completions', JSON.stringify(completions));
}

function persist() {
  write(`hx-cruces-${date}`, JSON.stringify(state));
  creditFinish();
}

function loadToday(rollover = false) {
  date = localDate();
  puzzle = puzzleForDate(puzzles, schedule);
  selected = [];
  confirming = false;
  fallback = false;
  message = rollover ? 'newDay' : '';
  if (!puzzle) {
    state = null;
    message = 'noPuzzle';
    render();
    return;
  }
  state = createState(puzzle, date);
  const saved = readJSON(`hx-cruces-${date}`);
  if (saved !== null) {
    try { state = restoreState(puzzle, date, saved); }
    catch { message = 'corrupt'; storageIssue = true; }
  }
  order = shuffle(Array.from({ length: 16 }, (_, i) => i));
  // Repair a completion write interrupted after saving the finished game.
  if (state.finished) creditFinish();
  render();
}

function checkDay() {
  if (!ready || localDate() === date) return false;
  loadToday(true);
  return true;
}

function region(parent, code) {
  if (!code) return;
  const tag = document.createElement('span');
  tag.className = 'region';
  tag.textContent = TEXT[lang].region(code);
  parent.append(tag);
}

function groupCard(groupIndex, explanation = false) {
  const group = puzzle.groups[groupIndex];
  const card = document.createElement('article');
  card.className = `group color-${groupIndex}`;
  const title = document.createElement('h3');
  title.textContent = group.title[lang];
  card.append(title);
  const words = document.createElement('p');
  words.textContent = group.words.join(' · ');
  card.append(words);
  region(card, group.region);
  if (explanation) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = TEXT[lang].learnTitle;
    const text = document.createElement('p');
    text.textContent = group.explain[lang];
    details.append(summary, text);
    card.append(details);
  }
  return card;
}

function render() {
  const t = TEXT[lang];
  document.documentElement.lang = lang;
  document.querySelector('meta[name="description"]').content = t.tagline;
  for (const id of ['tagline', 'intro', 'rules', 'privacy', 'draft', 'shuffle', 'deselect', 'submit',
    'reveal', 'share', 'results-title', 'learn-title', 'confirm-text', 'confirm-reveal', 'cancel-reveal', 'share-label']) {
    const key = id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    $(id).textContent = t[key === 'cancelReveal' ? 'cancel' : key];
  }
  $('language').textContent = lang === 'es' ? 'EN' : 'ES';
  $('language').lang = lang === 'es' ? 'en' : 'es';
  $('language').setAttribute('aria-label', lang === 'es' ? 'Switch to English' : 'Cambiar a español');
  $('game').setAttribute('aria-label', t.board);
  $('draft').hidden = !schedule.draft;
  $('message').textContent = message ? t[message] : (state?.finished ? t[state.revealed ? 'revealed' : 'complete'] : '');
  $('storage-warning').hidden = !storageIssue;
  $('storage-warning').textContent = t.storageError;
  $('daily').textContent = `${date}${puzzle ? ` · ${DIFFICULTIES[puzzle.difficulty][lang]}` : ''}`;
  $('game').hidden = !puzzle;
  if (!puzzle) return;
  $('solved').replaceChildren(...state.solved.map(index => groupCard(index)));
  const buttons = order.filter(tile => !state.finished && !state.solved.includes(Math.floor(tile / 4))).map(tile => {
    const group = puzzle.groups[Math.floor(tile / 4)];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tile';
    button.dataset.tile = tile;
    button.setAttribute('aria-pressed', String(selected.includes(tile)));
    button.textContent = group.words[tile % 4];
    region(button, group.region);
    button.addEventListener('click', () => {
      if (checkDay()) return;
      if (selected.includes(tile)) selected = selected.filter(value => value !== tile);
      else if (selected.length < 4) selected.push(tile);
      else { message = 'max'; render(); focusTile(tile); return; }
      message = '';
      render();
      $('message').textContent = t.selected(selected.length);
      focusTile(tile);
    });
    return button;
  });
  $('tiles').replaceChildren(...buttons);
  $('counters').textContent = t.counters(state.mistakes, state.solved.length) +
    (state.finished ? '' : ` · ${t.selected(selected.length)}`);
  $('controls').hidden = state.finished;
  $('submit').disabled = selected.length !== 4;
  $('deselect').disabled = selected.length === 0;
  $('reveal-confirm').hidden = !confirming || state.finished;
  $('results').hidden = !state.finished;
  if (state.finished) {
    $('results-title').textContent = t[state.revealed ? 'revealed' : 'complete'];
    $('streak').textContent = t.streak(currentStreak(completions, date));
    $('explanations').replaceChildren(...puzzle.groups.map((_, index) => groupCard(index, true)));
    $('share-text').value = shareText(puzzle, state, lang);
  }
  $('share-fallback').hidden = !fallback;
}

function focusTile(tile) {
  document.querySelector(`[data-tile="${tile}"]`)?.focus();
}

$('language').addEventListener('click', () => {
  checkDay();
  lang = lang === 'es' ? 'en' : 'es';
  write('hx-lang', lang);
  render();
});
$('shuffle').addEventListener('click', () => {
  if (checkDay()) return;
  order = shuffle(order);
  render();
});
$('deselect').addEventListener('click', () => {
  if (checkDay()) return;
  selected = [];
  message = '';
  render();
});
$('submit').addEventListener('click', () => {
  if (checkDay()) return;
  const result = submitGuess(puzzle, state, selected);
  if (result.kind === 'invalid') message = 'choose';
  else {
    state = result.state;
    message = { correct: 'correct', 'one-away': 'oneAway', incorrect: 'incorrect' }[result.kind];
    if (result.kind === 'correct') selected = [];
    if (state.finished) message = 'complete';
    persist();
  }
  render();
  if (state.finished) $('share').focus();
  else if (result.kind === 'correct') $('tiles').querySelector('button')?.focus();
});
$('reveal').addEventListener('click', () => {
  if (checkDay()) return;
  confirming = true;
  render();
  $('cancel-reveal').focus();
});
$('cancel-reveal').addEventListener('click', () => {
  if (checkDay()) return;
  confirming = false;
  render();
  $('reveal').focus();
});
$('confirm-reveal').addEventListener('click', () => {
  if (checkDay()) return;
  state = reveal(state);
  selected = [];
  confirming = false;
  message = 'revealed';
  persist();
  render();
  $('share').focus();
});
$('share').addEventListener('click', async () => {
  if (checkDay()) return;
  const text = shareText(puzzle, state, lang);
  const sharedState = state;
  try {
    await navigator.clipboard.writeText(text);
    if (state !== sharedState || checkDay()) return;
    message = 'copied';
    fallback = false;
  } catch {
    if (state !== sharedState || checkDay()) return;
    message = 'fallback';
    fallback = true;
  }
  render();
  if (fallback) {
    $('share-text').focus();
    $('share-text').select();
  }
});
window.addEventListener('focus', checkDay);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) checkDay();
});
window.setInterval(checkDay, 1000);

render();
try {
  const responses = await Promise.all(['./data/puzzles.json', './data/schedule.json'].map(path => fetch(path, { cache: 'no-store' })));
  if (responses.some(response => !response.ok)) throw new Error('Puzzle data unavailable');
  [puzzles, schedule] = await Promise.all(responses.map(response => response.json()));
  ready = true;
  loadToday();
} catch (error) {
  ready = false;
  puzzle = null;
  message = 'loadError';
  console.error('Cruces could not load:', error);
  render();
}
