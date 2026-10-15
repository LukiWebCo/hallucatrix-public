// The one-screen rules (contracts/games.md §1), behind every "?" and before the first game.
import { h, icon } from '../dom.js?v=18426296defe';
import { currentLang, t } from '../i18n.js?v=18426296defe';
import { inline, render } from '../md.js?v=18426296defe';
import { bellIcon, dotArt } from './market.js?v=18426296defe';

const SEEN = 'eai.games.rules_seen';
// howto-dots-v1 teaches the retired rules. Enable only after a table-edition film replaces it.
const TABLE_EDITION_FILM_READY = false;

export function rulesSeen() {
  try { return localStorage.getItem(SEEN) === '1'; } catch { return true; }
}

function markSeen() {
  try { localStorage.setItem(SEEN, '1'); } catch { /* private mode */ }
}

function example(dots, caption) {
  return h('figure', { class: 'gx' },
    h('div', { class: 'gx-line' }, dots.map((d) => dotArt(d, 's'))),
    h('figcaption', { text: caption }));
}

// The rules as a block (also used inline by the TV lobby).
export function rulesBody() {
  const steps = [
    t('games.rules.step_1'),
    t('games.rules.step_2'),
    t('games.rules.step_3'),
    t('games.rules.step_4'),
    t('games.rules.step_5'),
  ];
  return h('div', { class: 'grules' },
    h('p', { class: 'grules-goal' }, inline(t('games.rules.goal'))),
    h('p', { class: 'grules-turn', text: t('games.rules.on_your_turn') }),
    h('ol', { class: 'grules-steps' }, steps.map((s, i) => h('li', null,
      h('span', { class: 'grules-n', 'aria-hidden': 'true', text: String(i + 1) }),
      h('span', null, inline(s)),
      i === 1 ? h('div', { class: 'gx-row' },
        example([{ c: 'b', n: 4 }, { c: 'b', n: 5 }, { c: 'b', n: 6 }], t('games.rules.ex_run')),
        example([{ c: 'r', n: 8 }, { c: 'b', n: 8 }, { c: 'g', n: 8 }], t('games.rules.ex_group'))) : null))),
    h('div', { class: 'grules-extra' },
      h('p', { class: 'grules-spark' }, dotArt({ s: true }, 's'), h('span', null, inline(t('games.rules.spark')))),
      h('p', { class: 'grules-market' }, h('span', { class: 'grules-bell' }, bellIcon()), h('span', null, inline(t('games.rules.market')))),
      h('p', { class: 'grules-stuck' }, inline(t('games.rules.stuck')))));
}

export function gameHowtoSource() { return null; }
export function openGameHowto() { return null; }
export function watchButton() { return null; }

async function openFullRules() {
  const lang = currentLang();
  const dialog = h('dialog', { class: 'sheet grules-full', 'aria-labelledby': 'grules-full-title' });
  const body = h('div', { class: 'grules-full-body', 'aria-live': 'polite' },
    h('p', { class: 'muted', text: t('games.rules.full_loading') }));
  const close = () => dialog.close();
  dialog.append(
    h('div', { class: 'grules-full-top' },
      h('h2', { id: 'grules-full-title', text: t('games.rules.full_title') }),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('games.common.close'), onclick: close }, icon('x'))),
    body);
  dialog.addEventListener('close', () => dialog.remove());
  dialog.addEventListener('cancel', (ev) => { ev.preventDefault(); close(); });
  document.body.append(dialog);
  dialog.showModal();
  try {
    let response = await fetch(new URL(`../../games-assets/rules/puntos-y-rayas.${lang}.md`, import.meta.url));
    let note = false;
    if (lang === 'en' && response.status === 404) {
      response = await fetch(new URL('../../games-assets/rules/puntos-y-rayas.es.md', import.meta.url));
      note = true;
    }
    if (!response.ok) throw new Error(`Rules request failed (${response.status})`);
    const markdown = await response.text();
    if (!dialog.isConnected) return dialog;
    body.replaceChildren(...(note ? [h('p', { class: 'card note', text: t('games.rules.full_note') })] : []), render(markdown));
  } catch {
    if (!dialog.isConnected) return dialog;
    body.replaceChildren(h('p', { role: 'alert', text: t('games.rules.full_error') }));
  }
  return dialog;
}

// Opens the rules sheet (Dots, or Conquián's own card). Resolves when closed.
export function openRules(game) {
  if (game === 'conquian') return import('./conquian/rules.js?v=18426296defe').then((m) => m.openCqRules());
  return new Promise((resolve) => {
    const dlg = h('dialog', { class: 'sheet grules-sheet', 'aria-labelledby': 'grules-title' });
    const done = () => { markSeen(); dlg.close(); dlg.remove(); resolve(); };
    dlg.append(...[   // (append would print a null — no how-to film yet — as the text "null")
      h('div', { class: 'grules-top' },
        h('div', null,
          h('p', { class: 'eyebrow', text: t('games.rules.eyebrow') }),
          h('h2', { id: 'grules-title', class: 'grules-title', text: t('games.common.game_name') })),
        h('button', { class: 'icon-btn grules-x', type: 'button', 'aria-label': t('games.common.close'), onclick: done }, '×')),
      rulesBody(),
      watchButton(),
      h('div', { class: 'grules-actions' },
        h('button', { class: 'btn btn-quiet btn-big', type: 'button', 'data-test': 'full-rules', onclick: () => openFullRules() }, t('games.rules.full')),
        h('button', { class: 'btn btn-primary btn-big grules-ok', type: 'button', onclick: done }, t('games.rules.got_it')))].filter(Boolean));
    dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); done(); });
    dlg.addEventListener('click', (ev) => { if (ev.target === dlg) done(); });
    document.body.append(dlg);
    dlg.showModal();
    dlg.querySelector('.grules-ok').focus({ preventScroll: true });
  });
}

// The round "?" button that opens the rules.
export function rulesButton(cls = '', game = 'dots') {
  return h('button', { class: 'grules-btn ' + cls, type: 'button', onclick: () => openRules(game) },
    h('span', { class: 'grules-q', 'aria-hidden': 'true' }, '?'), h('span', { class: 'grules-l', text: t('games.rules.open') }));
}
