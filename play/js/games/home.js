import { styles } from '../styles.js?v=1bb003a1a4fc';
import { h, icon } from '../dom.js?v=1bb003a1a4fc';
import { t } from '../i18n.js?v=1bb003a1a4fc';
import { backLink, errText, go, toast } from '../ui.js?v=1bb003a1a4fc';
import { tables, removeTable } from '../tables.js?v=1bb003a1a4fc';
import { startPracticeRoom, gameName } from './lobby.js?v=1bb003a1a4fc';
import { openRules, rulesButton, rulesSeen } from './rules_card.js?v=1bb003a1a4fc';
import { modeLabel, wordmark } from './tv.js?v=1bb003a1a4fc';

async function cqCards() {
  const cards = await import('./conquian/cards.js?v=1bb003a1a4fc');
  await cards.probeArt();
  return cards;
}

function cardFan(cards, faces, size, cls) {
  return h('span', { class: 'gfan ' + cls, 'aria-hidden': 'true' },
    faces.map((face, index) => {
      const node = cards.cardNode({ s: face[0], r: Number(face.slice(1)) }, { size, label: '' });
      styles(node).setProperty('--i', String(index - (faces.length - 1) / 2));
      return node;
    }));
}

function backToHub() {
  return h('a', { class: 'back gback ghome-back', href: '#/' }, icon('back'), h('span', { text: t('games.common.games') }));
}

export async function hubView() {
  const cards = await cqCards();
  return h('section', { class: 'page ghub' },
    h('header', { class: 'ghead ghub-head' },
      h('h1', { class: 'ghead-title ghub-title', text: t('games.lobby.eyebrow') }),
      h('p', { class: 'lede ghead-lede', text: t('games.hub.lede') })),
    h('nav', { class: 'ghub-tiles', 'aria-label': t('games.hub.pick') },
      h('a', { class: 'ghub-tile ghub-tile-dots', href: '#/puntos' },
        h('span', { class: 'ghub-tile-name ghub-tile-name-dots' },
          h('span', { class: 'sr-only', text: t('games.common.game_name') }),
          wordmark('ghub-wm')),
        h('span', { class: 'ghub-tile-art', 'aria-hidden': 'true' }, h('img', { class: 'ghub-dots-art', src: 'games-assets/logo-mark.svg', alt: '' }))),
      h('a', { class: 'ghub-tile ghub-tile-conquian', href: '#/conquian' },
        h('span', { class: 'ghub-tile-name ghub-tile-name-cq' }, cards.logo('ghub-cq-logo')),
        h('span', { class: 'ghub-tile-art', 'aria-hidden': 'true' }, cardFan(cards, ['o1', 'c12', 'e7'], 's', 'ghub-fan')))));
}

export async function dotsView() {
  return puntosView();
}

export async function cqView() {
  const cards = await cqCards();
  const root = h('section', { class: 'page ghome ghome-cq' });
  const hero = h('header', { class: 'gcq-hero cq-felt' + (cards.hasArt() ? ' cq-art-on' : '') },
    h('h1', { class: 'sr-only', text: t('games.cq.name') }),
    h('div', { class: 'gcq-hero-logo', 'aria-hidden': 'true' }, cards.logo('gcq-logo')),
    cardFan(cards, ['o1', 'c12', 'e7', 'b5'], 'l', 'gcq-fan'),
    h('p', { class: 'gcq-tagline', text: t('games.cq.lobby.tagline') }));
  const claude = h('button', { class: 'btn btn-primary btn-big gquick-btn gquick-claude', type: 'button', onclick: async (ev) => {
    ev.currentTarget.disabled = true;
    try { await startPracticeRoom('conquian'); }
    catch (error) { toast(errText(error), 'error'); ev.currentTarget.disabled = false; }
  } },
  h('img', { class: 'avatar avatar-m avatar-claude', src: 'games-assets/logo-mark.svg', alt: '' }),
  h('span', { text: t('games.cq.lobby.play_claude') }));
  const friends = h('a', { class: 'btn btn-quiet btn-big gquick-btn gquick-players', href: '#/conquian/mesa' },
    icon('user'), h('span', { text: t('games.cq.lobby.play_players') }));
  root.replaceChildren(
    h('div', { class: 'ghead-row ghome-top' }, h('div', { class: 'grow' }, backToHub())),
    hero,
    h('section', { class: 'gquick' },
      claude, h('p', { class: 'gpractice-sub', text: t('games.cq.lobby.play_claude_sub') }),
      friends, h('p', { class: 'gpractice-sub', text: t('games.cq.lobby.play_players_sub') })),
    h('a', { class: 'btn btn-quiet btn-big ghero-join', href: '#/conquian/codigo' }, h('span', { text: t('games.lobby.join_code') })),
    h('details', { class: 'gopts gcq-more' },
      h('summary', { class: 'gopts-sum' }, h('span', { text: t('games.lobby.options') }), h('span', { class: 'gopts-hint', text: t('games.cq.lobby.more_hint') })),
      h('div', { class: 'gopts-body' },
        h('a', { class: 'btn btn-quiet btn-big gcq-wizard', href: '#/conquian/mesa' }, h('span', { text: t('games.cq.lobby.wizard') })))),
    h('button', { class: 'btn btn-quiet btn-big gpractice-rules', type: 'button', onclick: () => openRules('conquian') },
      h('span', { class: 'grules-q', 'aria-hidden': 'true', text: '?' }), h('span', { text: t('games.cq.lobby.how') })));
  return root;
}

export async function puntosView() {
  const saved = tables();
  const root = h('section', { class: 'page globby ghome ghome-dots' });
  const practice = h('button', { class: 'btn btn-primary btn-big ghero-new', type: 'button', onclick: async (ev) => {
    ev.currentTarget.disabled = true;
    try { await startPracticeRoom('dots'); }
    catch (error) { toast(errText(error), 'error'); ev.currentTarget.disabled = false; }
  } }, t('games.flow.play_claude'));
  const rows = saved.map((row) => h('article', { class: 'groom' },
    h('a', { class: 'groom-text', href: '#/room/' + row.room_id },
      h('span', { class: 'groom-title', text: row.mode === 'practice' || !row.code
        ? t('games.flow.mode_practice')
        : t('games.flow.table_title', { code: row.code }) }),
      h('span', { class: 'groom-sub', text: `${modeLabel(row.mode)} · ${row.status === 'finished'
          ? t('games.flow.status_finished')
          : row.status === 'lobby' ? t('games.flow.status_lobby') : t('games.flow.status_playing')}` }),
      row.nickname ? h('span', { class: 'groom-nick', text: row.nickname }) : null),
    row.status === 'finished' ? h('button', { class: 'btn btn-quiet', type: 'button', 'aria-label': t('games.flow.remove_table'), onclick: () => {
      removeTable(row.room_id);
      go('#/puntos');
    } }, t('games.flow.remove_table')) : null));
  root.replaceChildren(
    h('header', { class: 'ghead globby-head' },
      h('div', { class: 'ghead-row' }, h('div', { class: 'grow' }, backLink('#/', t('games.common.games')))),
      h('h1', { class: 'sr-only', text: t('games.common.game_name') }),
      wordmark('globby-wm'),
      h('p', { class: 'lede ghead-lede', text: t('games.lobby.tagline') })),
    h('div', { class: 'gchoices gflow-start' },
      practice,
      h('a', { class: 'btn btn-quiet btn-big', href: '#/puntos/mesa' }, t('games.flow.make_table')),
      h('a', { class: 'btn btn-quiet btn-big', href: '#/codigo' }, t('games.flow.have_code'))),
    h('section', { class: 'gcard gflow-tables' },
      h('h2', { class: 'gcard-title', text: t('games.flow.my_tables') }),
      saved.length ? h('div', { class: 'groom-list' }, rows) : h('p', { class: 'gcard-empty', text: t('games.flow.no_tables') })),
    h('section', { class: 'gcard gflow-rules' }, rulesButton()));
  if (!rulesSeen()) setTimeout(() => { if (root.isConnected) openRules(); }, 400);
  return root;
}
