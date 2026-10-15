import { styles } from '../../styles.js?v=18426296defe';
import { h } from '../../dom.js?v=18426296defe';
import { t } from '../../i18n.js?v=18426296defe';
import { artUrl, hasArt, suitIcon } from './cards.js?v=18426296defe';

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, reduced() ? 0 : ms));

function artOr(name, cls, fallback) {
  if (!hasArt()) return fallback();
  const im = h('img', { class: cls, src: artUrl(name), alt: '', draggable: 'false' });
  im.addEventListener('error', () => im.replaceWith(fallback()));
  return im;
}

// Slam the stamp onto a card (or any box). Resolves when it has landed; `stay` leaves it there.
export async function stamp(el, { sound, stay = false } = {}) {
  if (!el || !el.isConnected) return;
  const mark = h('span', { class: 'cq-stamp' + (hasArt() ? ' has-art' : ''), 'aria-hidden': 'true' },
    artOr('stamp-obligo.svg', 'cq-stamp-img', () => h('span', { class: 'cq-stamp-fb' }, t('games.cq.btn.force'))));
  el.classList.add('cq-stamped');
  el.append(mark);
  await sleep(180);
  try { sound && sound(); } catch { /* fine */ }
  try { if (navigator.vibrate) navigator.vibrate([40]); } catch { /* fine */ }
  await sleep(420);
  if (!stay) { mark.classList.add('is-gone'); await sleep(250); mark.remove(); el.classList.remove('cq-stamped'); }
}

export function celebrate(card) { if (card) card.classList.add('is-pop'); }

// Behind a win card: a fan of little cards in the four suit colours bursting out from the middle (Conquián's own,
// not the Dots chalk burst). Still and faint under reduced motion; the burst lives in games-conquian.css.
export function cardBurst() {
  const suits = ['o', 'c', 'e', 'b'];
  const n = 16;
  return h('span', { class: 'cq-burst', 'aria-hidden': 'true' }, Array.from({ length: n }, (_, i) => {
    const r = (k) => ((Math.sin((i + 1) * 7919 + k * 104729) + 1) / 2);   // steady "random"
    const s = suits[i % 4];
    const el = h('span', { class: 'cq-bcard cq-bcard-' + s }, suitIcon(s, 'cq-suit cq-bsuit'));
    styles(el).setProperty('--a', (i * 360 / n + (r(1) - 0.5) * 14).toFixed(1) + 'deg');
    styles(el).setProperty('--r', (0.36 + r(2) * 0.14).toFixed(3));
    styles(el).setProperty('--t', ((r(3) - 0.5) * 70).toFixed(0) + 'deg');
    styles(el).setProperty('--i', String(i));
    return el;
  }));
}
