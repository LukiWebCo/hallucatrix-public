// Conquián words that come from the server as codes: events (contracts/conquian.md §7), errors (§8), and the
// reasons a meld you're building isn't one yet. Every key is written out literally so
// tests/test_i18n.py can see it.
import { t } from '../../i18n.js?v=18426296defe';
import { faceName } from './cards.js?v=18426296defe';

// One event as a plain sentence ('' if we don't know it).
export function evText(ev) {
  if (!ev || !ev.key) return '';
  const v = { ...(ev.vars || {}) };
  if (typeof v.card === 'string') v.card = faceName(v.card);
  switch (ev.key) {
    case 'games.ev.cq_dealt': return t('games.ev.cq_dealt', v);
    case 'games.ev.cq_cambio': return t('games.ev.cq_cambio', v);
    case 'games.ev.cq_cambio_done': return t('games.ev.cq_cambio_done', v);
    case 'games.ev.cq_turned': return t('games.ev.cq_turned', v);
    case 'games.ev.cq_took': return t('games.ev.cq_took', v);
    case 'games.ev.cq_passed': return v.card ? t('games.ev.cq_passed', v) : t('games.cq.ev_passed_plain', v);   // (older rooms: no card)
    case 'games.ev.cq_forced': return t('games.ev.cq_forced', v);
    case 'games.ev.cq_discarded': return t('games.ev.cq_discarded', v);
    case 'games.ev.cq_dead': return t('games.ev.cq_dead', v);
    case 'games.ev.cq_out': return t('games.ev.cq_out', v);
    case 'games.ev.cq_draw': return t('games.ev.cq_draw', v);
    case 'games.ev.cq_match': return t('games.ev.cq_match', v);
    case 'games.ev.cq_next_hand': return t('games.ev.cq_next_hand', v);
    default: {
      const s = t(ev.key, v);   // the room layer's own events (timed out, started, …)
      return s === ev.key ? '' : s;
    }
  }
}

// The news line: what the last move did, all of it. One move can say several things ("Claude passed on the 7 of
// Cups · Claude turned up the 5 of Clubs"); "Dead" goes without saying after a pass. Returns {text, n} (n = how
// many events it used, so the history list can skip them).
export function newsLine(events) {
  const evs = (events || []).filter((e) => evText(e));
  if (!evs.length) return { text: '', n: 0 };
  const last = evs[evs.length - 1];
  let group = last.v == null ? [last] : evs.filter((e) => e.v === last.v);
  const n = group.length;
  if (group.some((e) => e.key === 'games.ev.cq_passed')) group = group.filter((e) => e.key !== 'games.ev.cq_dead');
  return { text: group.slice(-3).map(evText).join(' · '), n };
}

// A refusal from the server, in plain words.
export function errMsg(e) {
  const code = e && (e.code || (e.key || '').split('.').pop());
  switch (code) {
    case 'variant_players': return t('games.err.variant_players');
    case 'not_center': return t('games.err.not_center');
    case 'bad_meld': {
      // the server says which rule the layout broke (vars.why: kind|center_missing|table_missing|not_mine|dup)
      const w = e.vars && e.vars.why;
      return (w && w !== 'kind' && w !== 'not_mine' && takeWhy(w)) || t('games.err.bad_meld');
    }
    case 'must_take': return t('games.err.must_take');
    case 'cant_force': return t('games.err.cant_force');
    case 'not_discard': return t('games.err.not_discard');
    case 'cambio_done': return t('games.err.cambio_done');
    case 'no_cambio': return t('games.err.no_cambio');
    case 'not_between': return t('games.err.not_between');
    case 'not_in_hand': return t('games.cq.err.not_in_hand');   // the Dots words say "dot"
    case 'dup_dot': return t('games.cq.err.dup_dot');
    default: {
      if (e && e.key) { const s = t(e.key); if (s !== e.key) return s; }
      return t('games.cq.msg.refused');
    }
  }
}

// Why the group you're building isn't a meld yet (melds.js why()).
export function whyText(w) {
  switch (w) {
    case 'short': return t('games.cq.why.short');
    case 'mixed': return t('games.cq.why.mixed');
    case 'suit_twice': return t('games.cq.why.suit_twice');
    case 'too_many': return t('games.cq.why.too_many');
    case 'gap': return t('games.cq.why.gap');
    case 'dup': return t('games.cq.why.dup');
    case 'empty': return t('games.cq.why.empty');
    default: return '';
  }
}

// What's stopping ¡Me sirve! (Take.status().why).
export function takeWhy(w) {
  switch (w) {
    case 'center_missing': return t('games.cq.take.center_missing');
    case 'table_missing': return t('games.cq.take.table_missing');
    case 'dup': return t('games.cq.take.dup');
    case 'holding': return t('games.cq.take.holding');
    case 'bad': return t('games.cq.take.bad');
    default: return '';
  }
}
