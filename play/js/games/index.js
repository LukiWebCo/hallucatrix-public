// Routes: #/ home, #/puntos, #/puntos/mesa, #/puntos/practicar, #/j/:code, #/codigo,
// #/room/:id, #/tv/:id?k=…, and #/t/:transfer_token. Conquián uses the same room screens.
// The room and TV screens own a poller (net.js) that long-polls /wait, falls back to 3 s polling, refetches
// when the tab comes back, and stops itself once its root leaves the page.
import { h, icon } from '../dom.js?v=1bb003a1a4fc';
import { t } from '../i18n.js?v=1bb003a1a4fc';
import { errorBox, state, toast } from '../ui.js?v=1bb003a1a4fc';
import { createPoller, games } from './net.js?v=1bb003a1a4fc';
import { cqView, dotsView, hubView, puntosView } from './home.js?v=1bb003a1a4fc';
import { copyLink, gameHome, gameName, joinView, newGameView, roomLobbyView, startPracticeRoom, transferView } from './lobby.js?v=1bb003a1a4fc';
import { bellMoment, loadArt, marketCard, marketSheet } from './market.js?v=1bb003a1a4fc';
import { openRules, rulesButton, rulesSeen } from './rules_card.js?v=1bb003a1a4fc';
import { tvScreen } from './tv.js?v=1bb003a1a4fc';
import { removeTable, table, updateTable } from '../tables.js?v=1bb003a1a4fc';
import { enableRoomPush, pushSupported } from '../push.js?v=1bb003a1a4fc';

// ---- styles (CSP style-src 'self': same-origin <link>s only) ---------------------------------------
export function ensureCss(game = null) {
  const files = ['games-theme.css', 'games.css', 'games-play.css'];
  if (game === 'conquian') files.push('games-conquian.css');
  for (const href of files) {
    if (![...document.querySelectorAll('link[rel=stylesheet]')].some(link => new URL(link.href).pathname.endsWith('/' + href))) {
      document.head.append(h('link', { rel: 'stylesheet', href, 'data-games-css': href }));
    }
  }
}

// ---- sound (W5's sfx.js: phones quiet by default except "your turn", the TV on) ---------------------------
// One instance per screen kind, made lazily; a stub until sfx.js loads, and if it never does.
const sfxReal = { phone: null, tv: null };
let sfxMod = null;
function loadSfx() {
  if (!sfxMod) sfxMod = import('./sfx.js?v=1bb003a1a4fc').catch(() => null);
  return sfxMod;
}
function sfxFor(screen) {
  const get = () => sfxReal[screen];
  loadSfx().then((m) => { if (m && !sfxReal[screen]) { try { sfxReal[screen] = m.createSfx({ screen }); } catch { /* no sound */ } } });
  return {
    play(name) { try { get() && get().play(name); } catch { /* never let sound break the game */ } },
    unlock() { try { get() && get().unlock(); } catch { /* ignore */ } },
    music(on) { try { get() && get().music(on); } catch { /* ignore */ } },
    get muted() { return get() ? get().muted : true; },
    get mode() { return get() ? get().mode : (screen === 'tv' ? 'on' : 'quiet'); },
    setMuted(m) { try { get() && get().setMuted(m); } catch { /* ignore */ } },
  };
}
export const sfx = sfxFor('phone');
const sfxTv = sfxFor('tv');

// ---- router ---------------------------------------------------------------------------------------
const ID = /^\d{1,12}$/;
const practiceFlights = new Map();

async function practiceRoute(game) {
  if (!practiceFlights.has(game)) {
    practiceFlights.set(game, startPracticeRoom(game).finally(() => practiceFlights.delete(game)));
  }
  try {
    await practiceFlights.get(game);
  } catch (error) {
    return errorBox(error, () => { practiceFlights.delete(game); state.rerender?.(); });
  }
  return h('p', { class: 'loading', role: 'status', text: t('games.common.loading') });
}

export async function gamesView(parts = []) {
  const [a0, b0, c0] = parts;
  const [a, query = ''] = (a0 || '').split('?');
  const [b, queryB = ''] = (b0 || '').split('?');
  const [c] = (c0 || '').split('?');
  ensureCss(a === 'conquian' ? 'conquian' : null);
  loadSfx();
  await loadArt();
  if (a !== 'tv') document.body.classList.remove('games-tv');
  switch (a) {
    case undefined: return hubView();
    case 'puntos':
      if (b === 'mesa') return newGameView('dots');
      if (b === 'practicar') return practiceRoute('dots');
      return puntosView();
    case 'conquian':
      if (b === 'mesa') return newGameView('conquian');
      if (b === 'practicar') return practiceRoute('conquian');
      if (b === 'codigo') return joinView('', 'conquian');
      if (b === 'j') return joinView(c || queryB, 'conquian');
      return cqView();
    case 'j': return joinView(a0.includes('?') ? query.slice(5) : b);
    case 'codigo': return joinView('');
    case 'room': return ID.test(b || '') ? roomView(b) : errorBox({ key: 'games.errors.not_found' });
    case 'tv': return ID.test(b || '') ? tvView(b, new URLSearchParams(queryB ? '?' + queryB : '?' + query).get('k')) : errorBox({ key: 'games.errors.not_found' });
    case 't': return b0 ? transferView(b0) : errorBox({ key: 'games.errors.not_found' });
    case 'dots': return dotsView();
    default: return errorBox({ key: 'games.errors.not_found' });
  }
}

// ---- the live room controller (shared by the phone room and the TV) ------------------------------------
function liveRoom(root, id, first, onStop, spectator = false, token = null) {
  let view = first;
  const listeners = new Set();
  const waiters = [];
  let seen = false;
  const t0 = Date.now();
  const alive = () => {
    if (root.isConnected) { seen = true; return true; }
    return !seen && Date.now() - t0 < 15000; // not mounted yet: main.js attaches the node after we return
  };

  function apply(v) {
    view = v;
    for (const cb of [...listeners]) { try { cb(v); } catch (e) { console.error(e); } }
    for (let i = waiters.length - 1; i >= 0; i--) if (v.v >= waiters[i].v) { waiters[i].res(); waiters.splice(i, 1); }
  }

  const poller = createPoller({
    wait: (v, signal, seq) => games.wait(id, v, signal, seq >= 0 ? seq : view.draft_seq, spectator, token),
    view: (signal) => games.room(id, signal, spectator, token),
    onView: apply,
    alive,
    onStop: (out) => { cleanup(); onStop && onStop(out); },
  }, first.v);

  const onVis = () => { if (!document.hidden) poller.kick(); };
  const onHash = () => setTimeout(() => { if (!root.isConnected) { poller.stop(); cleanup(); } }, 0);
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('hashchange', onHash);
  function cleanup() {
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('hashchange', onHash);
  }
  poller.done.then(cleanup);

  return {
    getView: () => view,
    onView(cb) { listeners.add(cb); return () => listeners.delete(cb); },
    refresh: () => poller.kick(),
    poller,
    // Post an action; resolves once the new view has arrived (or after 4 s).
    async act(action) {
      const r = await games.act(id, action);
      if (r && typeof r.v === 'number' && r.v > view.v) {
        const got = new Promise((res) => waiters.push({ v: r.v, res }));
        poller.kick();
        await Promise.race([got, new Promise((res) => setTimeout(res, 4000))]);
      }
      return r;
    },
  };
}

// ---- #/room/:id -------------------------------------------------------------------------------------
async function roomView(id) {
  const saved = table(id);
  const token = saved?.token || null;
  const spectator = saved?.role === 'watch';
  const first = await games.room(id, null, spectator, token);
  ensureCss(first.room.game);
  let savedStatus = saved?.status;
  if (saved && savedStatus !== first.room.status) {
    updateTable(id, { status: first.room.status });
    savedStatus = first.room.status;
  }
  const root = h('section', { class: 'groomv', 'data-game': first.room.game });
  const bar = h('div', { class: 'groomv-bar' });
  const extras = h('div', { class: 'groomv-extras' });
  const lane = h('div', { class: 'groomv-lane' });   // the leisure Market card
  const main = h('div', { class: 'groomv-main' });
  const banner = h('div', { class: 'groomv-banner', role: 'status', hidden: true });
  const leave = h('div', { class: 'groomv-leave' },
    h('button', { class: 'btn btn-quiet', type: 'button', onclick: async () => {
      try { await ctx.leave(); } catch (e) { toast(t(e.key || 'games.errors.server'), 'error'); }
    } }, t('games.lobby.leave')));
  root.append(bar, banner, extras, lane, main, leave);

  const live = liveRoom(root, id, first, () => {
    banner.hidden = false;
    banner.textContent = t('games.common.lost');
  }, spectator, token);
  const ctx = {
    roomId: Number(id),
    getView: live.getView,
    act: live.act,
    onView: live.onView,
    refresh: live.refresh,
    sfx,
    me: null,
    bell: (el) => bellMoment(sfx, el),
    hideBack: true,   // the room bar above already has the back link and the "?"
    backHash: gameHome(first.room.game || 'dots'),
    reclaim: ['player', 'host'].includes(saved?.role) ? async () => { await games.seats(id, { op: 'reclaim' }); live.refresh(); } : null,
    hint: saved?.role === 'practice' || first.room.settings.hints !== false ? () => games.hint(id) : null,
    scoped: true,
    table: saved,
    leave: async () => {
      if (saved?.role !== 'watch') await games.seats(id, { op: 'leave' });
      removeTable(id);
      location.hash = gameHome(first.room.game || 'dots');
    },
    // The leisure Market: play.js shows the strip with this button (the live Market opens by itself).
    openMarket: () => { const m = live.getView().market; if (m && m.open) openSheet(!m.live); },
  };

  let mode = null;        // 'lobby' | 'play'
  let playMounted = false; // play.js is up (it draws the leisure Market strip itself)
  let lobbyUi = null;
  let sheet = null;
  let sheetLeisure = false;
  let marketWasOpen = !!(first.market && first.market.open && first.market.live);

  function drawBar(view) {
    bar.replaceChildren(
      h('a', { class: 'back gback', href: gameHome(view.room.game || 'dots'), 'aria-label': gameName(view.room.game || 'dots') }, icon('back'), h('span', { class: 'gback-l', text: gameName(view.room.game || 'dots') })),
      view.room.code ? h('span', { class: 'groomv-code', 'aria-label': t('games.common.code_aria', { code: view.room.code.split('').join(' ') }) },
        h('span', { class: 'groomv-code-k', 'aria-hidden': 'true', text: t('games.common.code_short') }), h('span', { 'aria-hidden': 'true', text: view.room.code })) : h('span', { class: 'grow' }),
      soundButton(),
      rulesButton('grules-btn-s', view.room.game));
  }

  async function mountPlay() {
    let mod = null;
    const game = live.getView().room.game;
    try { mod = await (game === 'conquian' ? import('./conquian/play.js?v=1bb003a1a4fc') : import('./play.js?v=1bb003a1a4fc')); } catch (e) {
      console.error(e);
      main.replaceChildren(errorBox(e));
      return;
    }
    if (mod && typeof mod.playView === 'function') {
      playMounted = true;
      try { await mod.playView(main, ctx); } catch (e) { console.error(e); playMounted = false; main.replaceChildren(errorBox(e)); }
    } else {
      main.replaceChildren(errorBox({ key: 'games.errors.server' }));
    }
  }

  function closeSheet() { if (sheet) { sheet.destroy(); sheet = null; document.body.classList.remove('games-sheet-open'); } }
  function openSheet(leisure) {
    if (sheet && sheetLeisure === leisure) return;
    closeSheet();
    sheetLeisure = leisure;
    sheet = marketSheet(ctx, { leisure, onClose: closeSheet });
    document.body.append(sheet.el);
    document.body.classList.add('games-sheet-open');
  }

  function render(view) {
    drawBar(view);
    if (saved && savedStatus !== view.room.status) {
      updateTable(id, { status: view.room.status });
      savedStatus = view.room.status;
    }
    extras.replaceChildren(...(view.room.mode === 'leisure' ? [leisureTools(id, saved, view.room)] : []));
    const want = view.room.status === 'lobby' ? 'lobby' : 'play';
    if (want !== mode) {
      mode = want;
      root.classList.toggle('is-play', want === 'play');   // one slim bar above the play screen
      if (want === 'lobby') { lobbyUi = roomLobbyView(ctx); main.replaceChildren(lobbyUi.el); }
      else { lobbyUi = null; main.replaceChildren(); mountPlay(); }
    } else if (lobbyUi) lobbyUi.update();

    // The Market: live = the full sheet for everyone; leisure = a card that opens the sheet.
    const m = view.market;
    const liveOpen = !!(m && m.open && m.live);
    const leisureOpen = !!(m && m.open && !m.live);
    if (liveOpen) {
      openSheet(false);
      sheet.update(view);
      if (!marketWasOpen) ctx.bell(sheet.el);
    } else if (sheet && !sheetLeisure) {
      closeSheet();
    }
    if (leisureOpen && view.me) {
      // The play screen has its own Market strip + button; the card is for the read-only fallback.
      if (playMounted) lane.replaceChildren(); else lane.replaceChildren(marketCard(view, () => { openSheet(true); }));
      if (sheet && sheetLeisure) sheet.update(view);
    } else {
      lane.replaceChildren();
      if (sheet && sheetLeisure) closeSheet();
    }
    marketWasOpen = liveOpen;
  }

  live.onView(render);
  render(first);
  // Someone who came in by a code (never saw the lobby) gets the one-screen rules before their first game.
  if (first.room.game !== 'conquian' && !rulesSeen() && first.me) setTimeout(() => { if (root.isConnected && !document.querySelector('dialog.grules-sheet')) openRules(); }, 400);
  // the sheet lives on <body>; take it down when the room leaves the page
  live.poller.done.then(() => {
    closeSheet();
    if (live.getView().room.status === 'finished') updateTable(id, { status: 'finished' });
  });
  window.addEventListener('hashchange', function off() {
    setTimeout(() => { if (!root.isConnected) { closeSheet(); window.removeEventListener('hashchange', off); } }, 0);
  });
  return root;
}

function leisureTools(id, saved, room) {
  const buttons = [];
  let transferLink = '';
  const transfer = h('button', { class: 'btn btn-quiet', type: 'button', onclick: async (ev) => {
    ev.currentTarget.disabled = true;
    try {
      const result = await games.transfer(id);
      transferLink = `${location.origin}/play/#/t/${encodeURIComponent(result.transfer_token)}`;
      draw();
    } catch (e) { toast(t(e.key || 'games.errors.server'), 'error'); ev.currentTarget.disabled = false; }
  } }, t('games.flow.take_seat'));
  if (saved?.role === 'player' || saved?.role === 'host') buttons.push(transfer);
  if (pushSupported() && (saved?.role === 'player' || saved?.role === 'host')) {
    buttons.push(h('button', { class: 'btn btn-quiet', type: 'button', onclick: async (ev) => {
      ev.currentTarget.disabled = true;
      try {
        const enabled = await enableRoomPush(id);
        if (enabled) ev.currentTarget.textContent = t('games.app.notify_on');
        else ev.currentTarget.disabled = false;
      } catch (e) {
        toast(t(e.key || 'games.errors.server'), 'error');
        ev.currentTarget.disabled = false;
      }
    } }, t('games.app.notify')));
  }
  function draw() {
    root.replaceChildren(h('div', { class: 'gflow-tools' }, buttons),
      transferLink ? h('label', { class: 'gopt-label' }, t('games.flow.transfer_link'), h('input', { class: 'ginput', value: transferLink, readonly: true })) : null,
      transferLink ? h('button', { class: 'btn btn-quiet', type: 'button', onclick: () => copyLink(transferLink) }, t('games.flow.copy_link')) : null);
  }
  const root = h('section', { class: 'gflow-tools-wrap' });
  draw();
  return root;
}

// Sound on/off for this phone (quiet = only the "your turn" chime, the default).
function soundButton() {
  const label = () => (sfx.mode === 'on' ? t('games.common.sound_on') : t('games.common.sound_off'));
  const btn = h('button', { class: 'groomv-sound' + (sfx.mode === 'on' ? ' is-on' : ''), type: 'button', 'aria-pressed': String(sfx.mode === 'on'), 'aria-label': label(), title: label() }, speakerIcon());
  btn.addEventListener('click', () => {
    sfx.setMuted(sfx.mode === 'on');
    sfx.unlock();
    btn.classList.toggle('is-on', sfx.mode === 'on');
    btn.setAttribute('aria-pressed', String(sfx.mode === 'on'));
    btn.setAttribute('aria-label', label());
    btn.title = label();
    toast(label());
  });
  return btn;
}

function speakerIcon() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of ['M4 9h4l5-4v14l-5-4H4z', 'M16.5 8.5a5 5 0 0 1 0 7', 'M19 6a8.5 8.5 0 0 1 0 12']) {
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', d);
    p.setAttribute('class', d.startsWith('M4') ? 'spk-body' : 'spk-wave');
    svg.append(p);
  }
  return svg;
}

// ---- #/tv/:id ---------------------------------------------------------------------------------------
async function tvView(id, token) {
  if (!token) return errorBox({ key: 'games.errors.not_found' });
  const first = await games.room(id, null, true, token);
  ensureCss(first.room.game);
  document.body.classList.add('games-tv');
  const root = h('section', { class: 'gtv-root', 'data-game': first.room.game });
  const live = liveRoom(root, id, first, () => {
    root.append(h('p', { class: 'gtv-lost', role: 'status', text: t('games.common.lost') }));
  }, true, token);
  const screen = first.room.game === 'conquian'
    ? await (await import('./conquian/tv.js?v=1bb003a1a4fc')).cqTvScreen(root, { getView: live.getView, sfx: sfxTv })
    : tvScreen(root, { getView: live.getView, sfx: sfxTv, bell: (el) => bellMoment(sfxTv, el) });
  live.onView((v) => screen.update(v));
  // Leaving the TV restores the chrome (main.js also clears it on every route).
  live.poller.done.then(() => { if (!document.querySelector('.gtv-root')) document.body.classList.remove('games-tv'); });
  window.addEventListener('hashchange', function off() {
    setTimeout(() => { if (!root.isConnected) { if (!document.querySelector('.gtv-root')) document.body.classList.remove('games-tv'); window.removeEventListener('hashchange', off); } }, 0);
  });
  return root;
}
