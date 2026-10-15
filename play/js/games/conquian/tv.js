// Conquián on the TV (#/games/tv/:id): the table only, never a hand. The TV is everyone's screen, so it stays
// the pile and the dead pile, then one panel per player (cards in hand as a count, their melds face up), whose
// move it is, the join code, and the latest event. Readable from the couch at 1280x720 and 1920x1080.
import { h } from '../../dom.js?v=18426296defe';
import { t } from '../../i18n.js?v=18426296defe';
import { backPile, cardName, cardNode, hasArt, logo, meldNode, probeArt } from './cards.js?v=18426296defe';
import { cardSound } from './sound.js?v=18426296defe';
import { newsLine } from './text.js?v=18426296defe';
import { phaseOf } from './view.js?v=18426296defe';
import { cardBurst, stamp } from './fx.js?v=18426296defe';

function nameOf(v, s) { const st = (v.seats || []).find((x) => x.seat === s); return st ? st.name : '?'; }

export function turnLine(v) {
  const ph = phaseOf(v);
  if (!v.turn) return '';
  if (ph === 'over') return t('games.cq.turn.over');
  if (ph === 'between') return t('games.cq.turn.between');
  if (ph === 'cambio') return t('games.cq.tv.cambio');
  if (ph === 'offer' && v.center) return v.center.forced ? t('games.cq.tv.forced', { name: nameOf(v, v.center.to) }) : t('games.cq.turn.offer_other', { name: nameOf(v, v.center.to) });
  if (ph === 'discard') return t('games.cq.turn.discard_other', { name: nameOf(v, v.turn.seat) });
  return '';
}

function codeTiles(code) {
  return h('div', { class: 'gcode gcode-s', role: 'img', 'aria-label': t('games.common.code_aria', { code: (code || '').split('').join(' ') }) },
    (code || '????').split('').map((ch) => h('span', { class: 'gcode-ch', text: ch })));
}

export async function cqTvScreen(root, ctx) {
  await probeArt();
  let view = ctx.getView();
  const snd = cardSound(ctx.sfx);
  const head = h('header', { class: 'gtv-head cq-tv-head' });
  const body = h('div', { class: 'cq-tv-body' });
  const foot = h('footer', { class: 'gtv-foot cq-tv-foot', 'aria-live': 'polite' });
  const layer = h('div', { class: 'gtv-layer' });
  const screen = h('div', { class: 'gtv gm-tv cq-felt cq-tv' + (hasArt() ? ' cq-art-on' : '') }, head, body, foot, layer);
  root.replaceChildren(screen);
  let prev = null;
  let resultFor = null;

  function seatPanel(v, s) {
    const ph = phaseOf(v);
    const on = (ph === 'offer' && v.center && v.center.to === s.seat) || (ph === 'discard' && v.turn && v.turn.seat === s.seat);
    return h('div', { class: 'cq-tv-seat' + (on ? ' is-on' : '') + (s.away ? ' is-away' : '') },
      h('div', { class: 'cq-tv-seat-head' },
        h('span', { class: 'cq-tv-name', text: s.name }),
        v.dealer === s.seat ? h('span', { class: 'cq-chip cq-chip-dealer', text: t('games.cq.dealer') }) : null,
        h('span', { class: 'grow' }),
        backPile(s.hand_count || 0, { size: 's', label: t('games.cq.tv.in_hand', { n: s.hand_count || 0 }) }),
        h('span', { class: 'cq-chip cq-chip-melded', text: `${s.melded || 0}/${v.target}` }),
        v.room.settings.match_to ? h('span', { class: 'cq-chip cq-chip-pts', text: t('games.cq.pts', { n: s.points || 0 }) }) : null),
      h('div', { class: 'cq-tv-melds' }, (s.melds || []).length ? s.melds.map((m) => meldNode(m, { size: 'tvm' })) : h('span', { class: 'cq-empty-note', text: t('games.cq.tv.no_melds') })));
  }

  function middle(v) {
    const c = v.center;
    const ph = phaseOf(v);
    const flip = c && c.card && (!prev || !prev.center || prev.center.card.id !== c.card.id);
    let cardEl;
    let caption = null;
    if (c && c.card && ph === 'offer') {
      cardEl = cardNode(c.card, { size: 'xl', cls: 'cq-center-card' + (flip ? ' is-flip' : '') });
      caption = h('div', { class: 'cq-tv-cap' },
        h('span', { text: c.from === 'stock' ? t('games.cq.center.turned', { name: nameOf(v, c.by) }) : t('games.cq.center.thrown', { name: nameOf(v, c.by) }) }),
        h('b', { text: t('games.cq.center.for', { name: nameOf(v, c.to) }) }));
    } else cardEl = h('span', { class: 'cq-card cq-xl cq-slot cq-center-card' });
    return h('section', { class: 'cq-tv-mid' },
      h('div', { class: 'cq-tv-piles' },
        h('div', { class: 'cq-pilebox' }, backPile(v.stock_left || 0, { size: 'l', label: t('games.cq.stock_aria', { n: v.stock_left || 0 }) }), h('span', { class: 'cq-pile-l', text: t('games.cq.stock') })),
        h('div', { class: 'cq-tv-center' }, cardEl, caption),
        h('div', { class: 'cq-pilebox' },
          h('span', { class: 'cq-dead', role: 'img', 'aria-label': v.dead_top ? t('games.cq.dead_aria', { n: v.dead_count || 0, card: cardName(v.dead_top) }) : t('games.cq.dead_none') },
            v.dead_top ? cardNode(v.dead_top, { size: 'l', label: '' }) : h('span', { class: 'cq-card cq-l cq-empty' }),
            v.dead_count ? h('b', { class: 'cq-pile-n', text: String(v.dead_count) }) : null),
          h('span', { class: 'cq-pile-l', text: t('games.cq.dead') }))),
      c && c.forced && ph === 'offer' ? h('p', { class: 'cq-forced' }, h('b', { text: t('games.cq.btn.force') }), ' ', t('games.cq.forced.other', { a: nameOf(v, c.by), b: nameOf(v, c.to) })) : null);
  }

  function result(v) {
    const r = v.result;
    const title = r.reason === 'draw' ? t('games.cq.result.draw') : t('games.cq.result.out', { name: nameOf(v, r.winner) });
    return h('div', { class: 'gtv-over' },
      h('div', { class: 'gm-win gresult cq-win is-pop' },
        cardBurst(),
        h('p', { class: 'gm-win-kicker', text: t('games.cq.hand_no', { n: v.hand_no || 1 }) }),
        h('h2', { class: 'gm-win-title', text: title }),
        h('p', { class: 'cq-win-sub', text: r.reason === 'draw' ? t('games.cq.result.draw_sub', { n: (r.stake || 1) * 2 }) : t('games.cq.result.out_sub') }),
        v.room.settings.match_to ? h('ol', { class: 'gresult-rows' }, (v.seats || []).slice().sort((a, b) => (r.points[b.seat] || 0) - (r.points[a.seat] || 0)).map((s) => h('li', { class: r.winner === s.seat ? 'is-win' : '' },
          h('span', { class: 'grow', text: s.name }), h('span', { class: 'gresult-pts', text: t('games.cq.pts_of', { n: r.points[s.seat] || 0, m: v.room.settings.match_to }) })))) : null));
  }

  function render() {
    const v = view;
    const lobby = v.room.status === 'lobby';
    head.replaceChildren(
      h('div', { class: 'gtv-brand' }, logo('cq-tv-logo'), h('span', { class: 'gtv-mode', text: v.variant === 'familia' ? t('games.cq.variant.familia') : t('games.cq.variant.classic') })),
      lobby ? h('span') : h('h1', { class: 'gtv-turn', text: turnLine(v) }),
      v.room.code ? h('div', { class: 'gtv-corner' }, h('span', { class: 'gtv-corner-k', text: t('games.tv.join_code') }), codeTiles(v.room.code)) : h('span'));
    if (lobby) {
      body.replaceChildren(h('div', { class: 'gtv-lobby' },
        h('p', { class: 'gtv-lobby-k', text: t('games.tv.join_how') }),
        h('div', { class: 'gtv-lobby-seats' }, (v.seats || []).map((s) => h('span', { class: 'gtv-lobby-seat' }, h('span', { text: s.name })))),
        h('p', { class: 'gtv-lobby-wait', text: t('games.tv.waiting_start') })));
      foot.replaceChildren();
      layer.replaceChildren();
      prev = v;
      return;
    }
    body.replaceChildren(middle(v), h('aside', { class: 'cq-tv-seats' }, (v.seats || []).map((s) => seatPanel(v, s))));

    foot.replaceChildren(
      h('span', { class: 'gtv-bag' }, h('span', { class: 'gtv-bag-n', text: String(v.stock_left ?? '') }), h('span', { text: t('games.cq.tv.stock_left') })),
      h('span', { class: 'gtv-ev', text: newsLine(v.events).text }));
    if (prev && v.center && v.center.card && (!prev.center || prev.center.card.id !== v.center.card.id)) snd.play('flip');
    if (v.center && v.center.forced && !(prev && prev.center && prev.center.forced && prev.center.card.id === v.center.card.id)) {
      const el = body.querySelector('.cq-center-card');
      if (el) stamp(el, { stay: true, sound: () => snd.play('stamp') });
    }
    const key = v.result ? `${v.hand_no}:${v.result.reason}` : null;
    if (v.result && (phaseOf(v) === 'between' || phaseOf(v) === 'over')) {
      layer.replaceChildren(result(v));
      if (resultFor !== key) { try { ctx.sfx && ctx.sfx.play('win'); } catch { /* quiet */ } snd.play('win'); }
    } else layer.replaceChildren();
    resultFor = key;
    prev = v;
  }

  render();
  return { update(v) { view = v; render(); } };
}
