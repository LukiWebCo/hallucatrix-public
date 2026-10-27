// Conquián: the one-screen rules (EN/ES), behind the "?" in a Conquián room and before your first hand.
import { h } from '../../dom.js?v=1bb003a1a4fc';
import { t } from '../../i18n.js?v=1bb003a1a4fc';
import { cardNode, probeArt } from './cards.js?v=1bb003a1a4fc';
import { cardSound } from './sound.js?v=1bb003a1a4fc';
import { setViewMode, viewMode } from './view.js?v=1bb003a1a4fc';
import { migrateStorageKey } from '../../storage.js?v=1bb003a1a4fc';

const SEEN = 'hxg.games.rules_seen.conquian';


export function cqRulesSeen() {
  return migrateStorageKey('local', 'eai.games.rules_seen.conquian', SEEN, '1') === '1';
}
function markSeen() { try { localStorage.setItem(SEEN, '1'); } catch { /* private mode */ } }

const ex = (faces) => faces.map((f, i) => ({ id: -1 - i, s: f[0], r: Number(f.slice(1)) }));

export function rulesBody(opts = {}) {
  const kings = h('div', { class: 'cq-rx-cards' },
    cardNode({ s: 'o', r: 12 }, { size: 'm' }),
    cardNode({ s: "c", r: 12 }, { size: "m" }),
    cardNode({ s: 'b', r: 12 }, { size: 'm' }));
  const run = h('div', { class: 'cq-rx-cards' }, ex(['e6', 'e7', 'e10', 'e11']).map((c) => cardNode(c, { size: 'm' })));
  return h('div', { class: 'cq-rules' },
    h('p', { class: 'cq-rules-goal', text: t('games.cq.rules.goal') }),
    h('div', { class: 'cq-rx-row' },
      h('figure', { class: 'cq-rx' }, run, h('figcaption', { text: t('games.cq.rules.ex_run') })),
      h('figure', { class: 'cq-rx' }, kings, h('figcaption', { text: t('games.cq.rules.ex_set') }))),
    h('ol', { class: 'cq-rules-steps' }, [
      t('games.cq.rules.step_1'),
      t('games.cq.rules.step_2'),
      t('games.cq.rules.step_3'),
      t('games.cq.rules.step_4'),
    ].map((s, i) => h('li', null, h('span', { class: 'grules-n', 'aria-hidden': 'true', text: String(i + 1) }), h('span', { text: s })))),
    h('p', { class: 'cq-rules-extra' }, h('b', { text: t('games.cq.btn.force') }), ' ', h('span', { text: t('games.cq.rules.force') })),
    h('p', { class: 'cq-rules-extra', text: t('games.cq.rules.last_one') }),
    h('p', { class: 'cq-rules-extra', text: t('games.cq.rules.draw') }),
    h('p', { class: 'cq-rules-extra', text: t('games.cq.rules.familia') }),
    h('p', { class: 'cq-rules-credit' }, h('span', { text: t('games.cq.rules.credit') }), ' ',
      h('span', { text: t('games.cq.rules.credit_link') })));
}

// "How the table looks: Simple | Full" (per device). In the "?" sheet and at the foot of the play screen.
export function viewSwitch(cls = '') {
  const mode = viewMode();
  const btn = (m, label) => h('button', { class: 'cq-vs-btn' + (mode === m ? ' on' : ''), type: 'button', 'aria-pressed': String(mode === m), 'data-fk': 'view-' + m,
    onclick: (ev) => {
      setViewMode(m);
      const box = ev.currentTarget.closest('.cq-vs');
      if (box) box.querySelectorAll('.cq-vs-btn').forEach((b) => { const on = b.dataset.fk === 'view-' + m; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    } }, label);
  return h('div', { class: 'cq-vs ' + cls, role: 'group', 'aria-label': t('games.cq.view.label') },
    h('span', { class: 'cq-vs-l', text: t('games.cq.view.label') }),
    h('span', { class: 'cq-vs-btns' }, btn('simple', t('games.cq.view.simple')), btn('full', t('games.cq.view.full'))));
}

export async function openCqRules(opts = {}) {
  await probeArt();
  return new Promise((resolve) => {
    const dlg = h('dialog', { class: 'sheet grules-sheet cq-rules-sheet', 'aria-labelledby': 'cq-rules-title' });
    const done = () => { markSeen(); dlg.close(); dlg.remove(); resolve(); };
    dlg.append(
      h('div', { class: 'grules-top' },
        h('div', null,
          h('p', { class: 'eyebrow', text: t('games.cq.rules.eyebrow') }),
          h('h2', { id: 'cq-rules-title', class: 'grules-title', text: t('games.cq.name') })),
        h('button', { class: 'icon-btn grules-x', type: 'button', 'aria-label': t('games.common.close'), onclick: done }, '×')),
      viewSwitch('cq-vs-sheet'),
      rulesBody(opts),
      h('button', { class: 'btn btn-primary btn-big grules-ok', type: 'button', onclick: done }, t('games.cq.rules.got_it')));
    dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); done(); });
    dlg.addEventListener('click', (ev) => { if (ev.target === dlg) done(); });
    document.body.append(dlg);
    dlg.showModal();
    dlg.querySelector('.grules-ok').focus({ preventScroll: true });
  });
}

// Before your first Conquián hand (unless the Practice coach is already teaching it).
export function maybeFirstRules() {
  if (cqRulesSeen()) return;
  setTimeout(() => { if (!document.querySelector('dialog.grules-sheet')) openCqRules(); }, 400);
}
