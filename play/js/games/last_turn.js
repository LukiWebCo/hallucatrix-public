import { h, icon } from '../dom.js?v=1bb003a1a4fc';
import { t } from '../i18n.js?v=1bb003a1a4fc';
import { dotNode } from './dots.js?v=1bb003a1a4fc';

export function openLastTurn(view, seat, tableRoot) {
  const player = (view.seats || []).find((s) => s.seat === seat);
  if (!player) return null;
  const mine = view.me && view.me.seat === seat;
  const title = mine ? t('games.last_turn.self') : t('games.last_turn.named', { name: player.name });
  const dialog = h('dialog', { class: 'sheet glast-sheet', 'aria-labelledby': 'glast-title' });
  const marked = [];
  for (const line of player.last ? player.last.lines : []) {
    const el = tableRoot.querySelector(`[data-key="${CSS.escape(line)}"]`);
    if (el) {
      el.classList.add('is-last');
      marked.push(el);
    }
  }
  const unmark = () => { marked.forEach((el) => el.classList.remove('is-last')); };
  const close = () => { unmark(); dialog.close(); };
  const summary = player.last;
  const items = [];
  if (!summary) {
    items.push(h('li', { text: t('games.last_turn.no_turn') }));
  } else {
    if (summary.placed.length) {
      items.push(h('li', { class: 'glast-placed' },
        h('span', { text: (summary.placed.length === 1 ? t('games.last_turn.placed.one') : t('games.last_turn.placed.other', { n: summary.placed.length })) }),
        h('div', { class: 'glast-cards', role: 'group', 'aria-label': (summary.placed.length === 1 ? t('games.last_turn.placed.one') : t('games.last_turn.placed.other', { n: summary.placed.length })) },
          summary.placed.map((dot) => dotNode(dot, { cls: 'glast-dot' })))));
    }
    if (summary.stack) items.push(h('li', { text: (summary.stack === 1 ? t('games.last_turn.stack.one') : t('games.last_turn.stack.other', { n: summary.stack })) }));
    if (summary.cleared) items.push(h('li', { text: (summary.cleared === 1 ? t('games.last_turn.cleared.one') : t('games.last_turn.cleared.other', { n: summary.cleared })) }));
    if (summary.lines.length) items.push(h('li', { text: (summary.lines.length === 1 ? t('games.last_turn.lines.one') : t('games.last_turn.lines.other', { n: summary.lines.length })) }));
    if (summary.swapped) items.push(h('li', { text: t('games.last_turn.swapped') }));
    if (summary.passed) items.push(h('li', { text: summary.drew
      ? (summary.drew === 1 ? t('games.last_turn.passed_draw.one') : t('games.last_turn.passed_draw.other', { n: summary.drew }))
      : t('games.last_turn.passed') }));
    for (const n of summary.traded) items.push(h('li', { text: (n === 1 ? t('games.last_turn.traded.one') : t('games.last_turn.traded.other', { n })) }));
  }
  dialog.append(
    h('div', { class: 'glast-head' },
      h('h2', { id: 'glast-title', text: title }),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('games.common.close'), onclick: close }, icon('x'))),
    h('ul', { class: 'glast-items' }, items),
    h('button', { class: 'btn btn-primary btn-big', type: 'button', onclick: close }, t('games.common.close')));
  dialog.addEventListener('close', () => {
    unmark();
    dialog.remove();
  });
  dialog.addEventListener('cancel', (ev) => { ev.preventDefault(); close(); });
  dialog.addEventListener('click', (ev) => { if (ev.target === dialog) close(); });
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}
