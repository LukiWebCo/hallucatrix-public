// The New game flow (#/games/new[?game=dots|conquian]), Join with a code (#/games/join), and the room's waiting
// room (a room in status "lobby", mounted by index.js inside #/games/r/:id). The hub and each game's home: home.js.
import { avatar, h, icon } from '../dom.js?v=18426296defe';
import { t } from '../i18n.js?v=18426296defe';
import { errText, go, state, toast } from '../ui.js?v=18426296defe';
import { games } from './net.js?v=18426296defe';
import { dotArt, seatAvatar } from './market.js?v=18426296defe';
import { openRules, rulesButton } from './rules_card.js?v=18426296defe';
import { modeLabel } from './tv.js?v=18426296defe';

const CODE_CHARS = 'BCDFGHJKLMNPQRSTVWXZ23456789';
const DOTS_MAX_PLAYERS = 8;

function head(title, lede, withRules = true) {
  return h('header', { class: 'ghead' },
    h('div', { class: 'ghead-row' },
      h('div', { class: 'grow' },
        h('p', { class: 'eyebrow', text: t('games.lobby.eyebrow') }),
        h('h1', { class: 'ghead-title', text: title })),
      withRules ? rulesButton() : null),
    lede ? h('p', { class: 'lede ghead-lede', text: lede }) : null);
}

function back(hash, label, cls = '') {
  return h('a', { class: 'back gback ' + cls, href: hash }, icon('back'), h('span', null, label));
}

export const gameName = (g) => (g === 'conquian' ? t('games.cq.name') : t('games.common.game_name'));
// The page a game's screens go back to: its own home (#/games/dots, #/games/conquian), or the hub.
export const gameHome = (g) => (g === 'conquian' || g === 'dots' ? '#/games/' + g : '#/games');
// ?game= on the hash (#/games/new?game=conquian, #/games/join?game=dots), or null.
export function hashGame() {
  const m = /[?&]game=(dots|conquian)\b/.exec(location.hash);
  return m ? m[1] : null;
}

// ---- room options, said plainly (room cards, the waiting room) ----------------------------------------
export function optionTags(st, game = 'dots') {
  st = st || {};
  const tags = [];
  if (st.practice) tags.push(t('games.lobby.tag_practice'));
  else if (game === 'conquian') {
    // no variant yet: it follows the number of players when the game starts
    tags.push(st.variant === 'familia' ? t('games.cq.variant.familia') : st.variant === 'classic' ? t('games.cq.variant.classic') : t('games.cq.lobby.tag_auto'));
    tags.push(st.match_to ? t('games.cq.lobby.tag_to', { n: st.match_to }) : t('games.cq.lobby.tag_one'));
    if (st.forcing === false) tags.push(t('games.cq.lobby.tag_noforce'));
    if (st.variant === 'familia' && st.cambio === false) tags.push(t('games.cq.lobby.tag_nocambio'));
    tags.push(st.hints === false ? t('games.lobby.tag_nohints') : t('games.lobby.tag_hints'));
    if (st.turn_seconds) tags.push(t('games.lobby.tag_timer', { s: st.turn_seconds }));
  } else {
    tags.push(st.simple_table ? t('games.lobby.tag_simple') : t('games.lobby.tag_free'));
    tags.push(st.hints === false ? t('games.lobby.tag_nohints') : t('games.lobby.tag_hints'));
    if (st.turn_seconds) tags.push(t('games.lobby.tag_timer', { s: st.turn_seconds }));
    if (st.stack_adj < 0) tags.push(t('games.lobby.tag_short'));
    if (st.stack_adj > 0) tags.push(t('games.lobby.tag_long'));
    if (st.match_to) tags.push(t('games.lobby.tag_match', { n: st.match_to }));
  }
  return h('span', { class: 'gopt-tags' }, tags.map((x) => h('span', { class: 'gtag gtag-opt', text: x })));
}

// ---- New game -----------------------------------------------------------------------------------
function stepper(i, n) {
  const kids = [];
  for (let k = 0; k < n; k++) {
    if (k) kids.push(h('i', { class: 'gstep-line' + (k <= i ? ' is-on' : '') }));
    kids.push(h('span', { class: 'gstep-dot' + (k < i ? ' is-done' : k === i ? ' is-on' : '') }, String(k + 1)));
  }
  return h('div', { class: 'gstep', role: 'img', 'aria-label': t('games.lobby.step_of', { n: i + 1, total: n }) }, kids);
}

function bigChoice({ title, desc, art, onclick, cls = '', badge = null }) {
  return h('button', { class: 'gchoice ' + cls, type: 'button', onclick },
    art ? h('span', { class: 'gchoice-art', 'aria-hidden': 'true' }, art) : null,
    h('span', { class: 'gchoice-text' },
      badge ? h('span', { class: 'gtag gtag-best', text: badge }) : null,
      h('span', { class: 'gchoice-title', text: title }), desc ? h('span', { class: 'gchoice-desc', text: desc }) : null),
    icon('next', 'icon gchoice-go'));
}

function modeArt(mode) {
  if (mode === 'together') return [dotArt({ c: 'r', n: 1 }, 's'), dotArt({ c: 'b', n: 2 }, 's'), dotArt({ c: 'g', n: 3 }, 's')];
  if (mode === 'live') return [dotArt({ c: 'p', n: 7 }, 's'), h('i', { class: 'gchoice-zap' }), dotArt({ c: 'r', n: 7 }, 's')];
  return [dotArt({ c: 'g', n: 9 }, 's'), h('i', { class: 'gchoice-moon' })];
}

function seg(label, options, value, onChange) {
  const wrap = h('div', { class: 'gopt' }, h('span', { class: 'gopt-label', text: label }));
  const row = h('div', { class: 'gseg', role: 'group', 'aria-label': label });
  for (const [v, text] of options) {
    row.append(h('button', { type: 'button', class: 'gseg-btn' + (v === value ? ' on' : ''), 'aria-pressed': String(v === value),
      onclick: () => { onChange(v); row.querySelectorAll('.gseg-btn').forEach((b, i) => { const on = options[i][0] === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }); } }, text));
  }
  wrap.append(row);
  return wrap;
}

// Which game: two big tiles above the mode choice (Dots & Lines stays the default).
function gamePicker(game, onPick) {
  const tile = (g, title, desc, art) => h('button', { type: 'button', class: 'ggame ggame-' + g + (game === g ? ' on' : ''), 'aria-pressed': String(game === g), onclick: () => onPick(g) },
    h('span', { class: 'ggame-art', 'aria-hidden': 'true' }, art),
    h('span', { class: 'ggame-title', text: title }),
    h('span', { class: 'ggame-desc', text: desc }));
  return h('div', { class: 'ggames', role: 'group', 'aria-label': t('games.cq.lobby.pick_game') },
    h('p', { class: 'gopt-label ggames-k', text: t('games.cq.lobby.pick_game') }),
    h('div', { class: 'ggames-row' },
      tile('dots', t('games.common.game_name'), game === 'conquian' ? t('games.cq.lobby.dots_desc') : t('games.lobby.dots_desc'), [dotArt({ c: 'r', n: 1 }, 's'), dotArt({ c: 'b', n: 2 }, 's')]),
      tile('conquian', t('games.cq.name'), t('games.cq.lobby.cq_desc'), [h('span', { class: 'ggame-card ggame-card-1' }), h('span', { class: 'ggame-card ggame-card-2' })])));
}

export async function newGameView() {
  const s = { step: 0, game: 'dots', mode: null, invite: new Set(), claude: null, simple_table: null, hints: true, turn_seconds: 0, leisure_hours: 24, stack_adj: 0, match_to: 0,
    variant: null, cq_match: 0, forcing: false, cambio: false };   // Conquián: no forcing, no Cambio unless chosen
  // From a game's home the game is already chosen (?game=…): no picker. Without it, the picker (Dots by default).
  const fixed = hashGame();
  if (fixed) s.game = fixed;
  // Conquián: Classic is for two; with more people at the table, Familia (2–4).
  const seatCount = () => 1 + s.invite.size + (s.claude ? 1 : 0);
  const variant = () => s.variant || (seatCount() > 2 ? 'familia' : 'classic');
  let people = null;
  let meNew = true;
  games.rooms().then((d) => { meNew = !!(d && d.me_new); }).catch(() => {});
  // Simple table is preselected while anyone in the room (you, or someone you invite) hasn't finished a game.
  const firstTimers = () => meNew || [...s.invite].some((id) => (people || []).some((p) => p.id === id && p.new));
  const simple = () => (s.simple_table === null ? firstTimers() : s.simple_table);
  const root = h('section', { class: 'page gnew' });
  const N = 4;

  const nav = (title) => [
    h('div', { class: 'gnew-top' },
      s.step ? h('button', { class: 'back gback', type: 'button', onclick: () => { s.step -= 1; draw(); } }, icon('back'), h('span', { text: t('games.common.back') }))
        : back(gameHome(fixed), fixed ? gameName(fixed) : t('games.common.games'), fixed ? 'gnew-game gnew-game-' + fixed : ''),
      stepper(s.step, N)),
    h('h1', { class: 'gnew-title', text: title }),
  ];

  async function create(btn) {
    btn.disabled = true;
    btn.classList.add('is-busy');
    try {
      const settings = s.game === 'conquian'
        ? { variant: s.variant, match_to: s.cq_match, forcing: s.forcing, cambio: s.cambio, hints: s.hints }   // null: by players at the start
        : { simple_table: simple(), hints: s.hints, stack_adj: s.stack_adj, match_to: s.match_to };
      if (s.mode === 'leisure') settings.leisure_hours = s.leisure_hours;
      else settings.turn_seconds = s.turn_seconds;
      const card = s.game === 'conquian' ? await games.create(s.mode, settings, 'conquian') : await games.create(s.mode, settings);
      if (s.invite.size) await games.invite(card.id, [...s.invite]).catch((e) => toast(errText(e), 'error'));
      if (s.claude) await games.seats(card.id, { op: 'add_bot', level: s.claude }).catch((e) => toast(errText(e), 'error'));
      go('#/games/r/' + card.id);
    } catch (e) {
      toast(errText(e), 'error');
      btn.disabled = false;
      btn.classList.remove('is-busy');
    }
  }

  function draw() {
    if (s.step === 0) {
      root.replaceChildren(...nav(t('games.lobby.new_mode')),
        ...(fixed ? [] : [gamePicker(s.game, (g) => { s.game = g; draw(); })]),
        h('div', { class: 'gchoices' },
          ['together', 'live', 'leisure'].map((m) => bigChoice({
            cls: 'gchoice-' + m, art: modeArt(m),
            title: modeLabel(m),
            desc: { together: t('games.lobby.mode_together_desc'), live: t('games.lobby.mode_live_desc'), leisure: t('games.lobby.mode_leisure_desc') }[m],
            onclick: () => { s.mode = m; s.step = 1; draw(); },
          }))));
    } else if (s.step === 1) {
      const list = h('div', { class: 'gpeople' });
      const fill = () => {
        if (!people) { list.replaceChildren(h('p', { class: 'gcard-empty', text: t('games.common.loading') })); return; }
        const me = state.me && state.me.id;
        const folks = people.filter((p) => p.id !== me && !/^claude$/i.test(p.display_name || ''));
        if (!folks.length) { list.replaceChildren(h('p', { class: 'gcard-empty', text: t('games.lobby.people_none') })); return; }
        list.replaceChildren(...folks.map((p) => {
          const on = s.invite.has(p.id);
          return h('button', { type: 'button', class: 'gperson' + (on ? ' on' : ''), 'aria-pressed': String(on),
            disabled: s.game === 'dots' && !on && seatCount() >= DOTS_MAX_PLAYERS,
            onclick: () => { if (s.invite.has(p.id)) s.invite.delete(p.id); else s.invite.add(p.id); draw(); } },
          avatar(p, 'm'), h('span', { class: 'grow gperson-name', text: p.display_name }),
          h('span', { class: 'gcheck', 'aria-hidden': 'true' }, on ? '✓' : ''));
        }));
      };
      fill();
      if (!people) games.people().then((p) => { people = p || []; if (s.step === 1) draw(); }).catch(() => { people = []; if (s.step === 1) draw(); });
      const n = s.invite.size;
      root.replaceChildren(...nav(t('games.lobby.new_invite')),
        h('p', { class: 'lede', text: s.mode === 'together' ? t('games.lobby.invite_hint_together') : t('games.lobby.invite_hint') }),
        list,
        h('div', { class: 'gnew-foot' },
          h('button', { class: 'btn btn-primary btn-big', type: 'button', onclick: () => { s.step = 2; draw(); } },
            n ? (n === 1 ? t('games.lobby.next_invite.one') : t('games.lobby.next_invite.other', { n })) : t('games.lobby.next_skip'))));
    } else if (s.step === 2) {
      const claudeArt = () => h('img', { class: 'avatar avatar-m avatar-claude', src: 'games-assets/logo-mark.svg', alt: '' });
      root.replaceChildren(...nav(t('games.lobby.new_claude')),
        h('div', { class: 'gchoices' },
          ...(s.game === 'dots' && 1 + s.invite.size >= DOTS_MAX_PLAYERS ? [] : [
            bigChoice({ cls: 'gchoice-claude gchoice-best', art: claudeArt(), title: t('games.common.claude_easy'), badge: t('games.lobby.recommended'), desc: t('games.lobby.claude_easy_desc'), onclick: () => { s.claude = 'easy'; s.step = 3; draw(); } }),
            bigChoice({ cls: 'gchoice-claude', art: claudeArt(), title: t('games.common.claude_sharp'), desc: t('games.lobby.claude_sharp_desc'), onclick: () => { s.claude = 'sharp'; s.step = 3; draw(); } })]),
          bigChoice({ cls: 'gchoice-none', title: t('games.lobby.claude_none'), desc: t('games.lobby.claude_none_desc'), onclick: () => { s.claude = null; s.step = 3; draw(); } })));
    } else {
      const cq = s.game === 'conquian';
      const timer = s.mode === 'leisure'
        ? seg(t('games.lobby.opt_leisure'), [[4, t('games.lobby.hours_4')], [12, t('games.lobby.hours_12')], [24, t('games.lobby.hours_24')], [48, t('games.lobby.hours_48')]], s.leisure_hours, (v) => { s.leisure_hours = v; })
        : seg(t('games.lobby.opt_timer'), [[0, t('games.lobby.timer_off')], [60, t('games.lobby.timer_60')], [90, t('games.lobby.timer_90')]], s.turn_seconds, (v) => { s.turn_seconds = v; });
      const opts = cq ? h('details', { class: 'gopts', open: s.optsOpen || null, ontoggle: (e) => { s.optsOpen = e.target.open; } },
        h('summary', { class: 'gopts-sum' }, h('span', { text: t('games.lobby.options') }), h('span', { class: 'gopts-hint', text: t('games.lobby.options_hint') })),
        h('div', { class: 'gopts-body' },
          seg(t('games.cq.lobby.opt_variant'), [['classic', t('games.cq.lobby.variant_classic')], ['familia', t('games.cq.lobby.variant_familia')]], variant(), (v) => { s.variant = v; draw(); }),
          seatCount() > 2 && variant() === 'classic' ? h('p', { class: 'gwait-hint', text: t('games.cq.lobby.classic_two') }) : null,
          seg(t('games.cq.lobby.opt_match'), [[0, t('games.cq.lobby.match_one')], [3, t('games.cq.lobby.match_3')], [5, t('games.cq.lobby.match_5')]], s.cq_match, (v) => { s.cq_match = v; }),
          seg(t('games.cq.lobby.opt_force'), [[true, t('games.cq.lobby.on')], [false, t('games.cq.lobby.off')]], s.forcing, (v) => { s.forcing = v; }),
          variant() === 'familia' ? seg(t('games.cq.lobby.opt_cambio'), [[true, t('games.cq.lobby.on')], [false, t('games.cq.lobby.off')]], s.cambio, (v) => { s.cambio = v; }) : null,
          seg(t('games.lobby.opt_hints'), [[true, t('games.lobby.hints_on')], [false, t('games.lobby.hints_off')]], s.hints, (v) => { s.hints = v; draw(); }),
          timer)) : h('details', { class: 'gopts', open: s.optsOpen || null, ontoggle: (e) => { s.optsOpen = e.target.open; } },
        h('summary', { class: 'gopts-sum' }, h('span', { text: t('games.lobby.options') }), h('span', { class: 'gopts-hint', text: t('games.lobby.options_hint') })),
        h('div', { class: 'gopts-body' },
          seg(t('games.lobby.opt_table'), [[true, t('games.lobby.opt_table_simple')], [false, t('games.lobby.opt_table_free')]], simple(), (v) => { s.simple_table = v; draw(); }),
          seg(t('games.lobby.opt_hints'), [[true, t('games.lobby.hints_on')], [false, t('games.lobby.hints_off')]], s.hints, (v) => { s.hints = v; draw(); }),
          s.mode === 'leisure'
            ? seg(t('games.lobby.opt_leisure'), [[4, t('games.lobby.hours_4')], [12, t('games.lobby.hours_12')], [24, t('games.lobby.hours_24')], [48, t('games.lobby.hours_48')]], s.leisure_hours, (v) => { s.leisure_hours = v; })
            : seg(t('games.lobby.opt_timer'), [[0, t('games.lobby.timer_off')], [60, t('games.lobby.timer_60')], [90, t('games.lobby.timer_90')]], s.turn_seconds, (v) => { s.turn_seconds = v; }),
          seg(t('games.lobby.opt_stack'), [[-2, t('games.lobby.stack_short')], [0, t('games.lobby.stack_normal')], [2, t('games.lobby.stack_long')]], s.stack_adj, (v) => { s.stack_adj = v; }),
          seg(t('games.lobby.opt_length'), [[0, t('games.lobby.length_one')], [100, t('games.lobby.length_match')]], s.match_to, (v) => { s.match_to = v; })));
      const go3 = h('button', { class: 'btn btn-primary btn-big gnew-create', type: 'button' }, t('games.lobby.create'));
      go3.addEventListener('click', () => create(go3));
      const n = s.invite.size;
      root.replaceChildren(...nav(t('games.lobby.new_ready')),
        h('ul', { class: 'gsummary' },
          cq ? h('li', null, h('span', { class: 'gsummary-k', text: t('games.cq.lobby.sum_game') }), h('span', { text: t('games.cq.name') })) : null,
          cq ? h('li', null, h('span', { class: 'gsummary-k', text: t('games.cq.lobby.opt_variant') }), h('span', { text: variant() === 'familia' ? t('games.cq.lobby.variant_familia') : t('games.cq.lobby.variant_classic') })) : null,
          h('li', null, h('span', { class: 'gsummary-k', text: t('games.lobby.sum_mode') }), h('span', { text: modeLabel(s.mode) })),
          h('li', null, h('span', { class: 'gsummary-k', text: t('games.lobby.sum_invited') }),
            h('span', { text: n ? (n === 1 ? t('games.lobby.sum_people.one') : t('games.lobby.sum_people.other', { n })) : t('games.lobby.sum_nobody') })),
          h('li', null, h('span', { class: 'gsummary-k', text: t('games.lobby.sum_claude') }),
            h('span', { text: s.claude === 'easy' ? t('games.common.claude_easy') : s.claude === 'sharp' ? t('games.common.claude_sharp') : t('games.lobby.claude_none') })),
          cq ? null : h('li', null, h('span', { class: 'gsummary-k', text: t('games.lobby.opt_table') }),
            h('span', { text: simple() ? t('games.lobby.opt_table_simple') : t('games.lobby.opt_table_free') })),
          h('li', null, h('span', { class: 'gsummary-k', text: t('games.lobby.opt_hints') }),
            h('span', { text: s.hints ? t('games.lobby.hints_on') : t('games.lobby.hints_off') }))),
        opts,
        h('div', { class: 'gnew-foot' }, go3));
    }
    if (!s.optsOpen) window.scrollTo(0, 0);
  }
  draw();
  return root;
}

// ---- Join with a code ---------------------------------------------------------------------------
export async function joinView(prefill) {
  const boxes = [];
  const msg = h('p', { class: 'form-msg', role: 'alert' });
  const joinBtn = h('button', { class: 'btn btn-primary btn-big', type: 'button', disabled: true }, t('games.lobby.join_play'));
  const watchBtn = h('button', { class: 'btn btn-quiet btn-big', type: 'button', disabled: true }, t('games.lobby.join_watch'));
  const code = () => boxes.map((b) => b.value).join('');
  const sync = () => { const ok = code().length === 4; joinBtn.disabled = !ok; watchBtn.disabled = !ok; };
  const clean = (v) => v.toUpperCase().split('').filter((c) => CODE_CHARS.includes(c)).join('');

  for (let i = 0; i < 4; i++) {
    const b = h('input', { class: 'gbox', type: 'text', inputmode: 'text', maxlength: 4, autocomplete: 'off', autocapitalize: 'characters', autocorrect: 'off', spellcheck: 'false', enterkeyhint: i === 3 ? 'go' : 'next', 'aria-label': t('games.lobby.box_n', { n: i + 1 }) });
    b.addEventListener('input', () => {
      const raw = b.value;
      const v = clean(raw);
      msg.textContent = raw && !v ? t('games.lobby.code_chars') : '';
      if (v.length > 1) { // pasted or typed fast: spread across the boxes
        for (let k = 0; k < v.length && i + k < 4; k++) boxes[i + k].value = v[k];
        boxes[Math.min(3, i + v.length)].focus();
      } else {
        b.value = v;
        if (v && i < 3) boxes[i + 1].focus();
      }
      b.classList.toggle('filled', !!b.value);
      boxes.forEach((x) => x.classList.toggle('filled', !!x.value));
      sync();
    });
    b.addEventListener('keydown', (ev) => {
      if (ev.key === 'Backspace' && !b.value && i > 0) { boxes[i - 1].value = ''; boxes[i - 1].classList.remove('filled'); boxes[i - 1].focus(); sync(); ev.preventDefault(); }
      if (ev.key === 'Enter' && code().length === 4) join('player');
    });
    b.addEventListener('focus', () => b.select());
    boxes.push(b);
  }
  if (prefill) { clean(prefill).slice(0, 4).split('').forEach((c, k) => { boxes[k].value = c; boxes[k].classList.add('filled'); }); sync(); }

  async function join(as) {
    if (code().length !== 4) return;
    joinBtn.disabled = true; watchBtn.disabled = true;
    msg.textContent = '';
    try {
      const r = await games.join(code(), as);
      go('#/games/r/' + r.room_id);
    } catch (e) {
      msg.textContent = e && e.code === 'not_found' ? t('games.lobby.code_unknown') : errText(e);
      boxRow.classList.remove('is-wrong'); void boxRow.offsetWidth; boxRow.classList.add('is-wrong');
      sync();
    }
  }
  joinBtn.addEventListener('click', () => join('player'));
  watchBtn.addEventListener('click', () => join('spectator'));
  const boxRow = h('div', { class: 'gboxes' }, boxes);
  const root = h('section', { class: 'page gjoin' },
    back(gameHome(hashGame()), hashGame() ? gameName(hashGame()) : t('games.common.games')),
    head(t('games.lobby.join_title'), t('games.lobby.join_lede'), false),
    boxRow, msg,
    h('div', { class: 'gjoin-actions' }, joinBtn, watchBtn));
  setTimeout(() => { const first = boxes.find((b) => !b.value) || boxes[3]; first.focus({ preventScroll: true }); }, 60);
  return root;
}

// ---- the waiting room -----------------------------------------------------------------------------
export function mySeat(view) {
  if (view.me && typeof view.me.seat === 'number') return view.me.seat;
  const me = state.me;
  if (!me) return null;
  const st = (view.seats || []).find((s) => !s.bot && (s.player_id === me.id || (s.player_id === undefined && s.name === me.display_name)));
  return st ? st.seat : null;
}

export function roomLobbyView(ctx) {
  const el = h('section', { class: 'page gwait' });
  let busy = false;
  let picking = false;
  let inviting = false;      // the host's "Invite players" list is open
  let people = null;         // GET /games/people, once
  const invited = new Set(); // invites sent from this screen
  let seatsSeen = (ctx.getView().seats || []).length;
  const popped = new Set();   // seats already drawn: only a newcomer pops in, not every row on every update

  async function op(fn, after) {
    if (busy) return;
    busy = true; draw();
    try { await fn(); ctx.refresh && ctx.refresh(); if (after) after(); } catch (e) { toast(errText(e), 'error'); }
    busy = false; draw();
  }

  function draw() {
    const view = ctx.getView();
    const room = view.room;
    const seats = view.seats || [];
    const me = state.me || {};
    const isHost = !ctx.scoped && room.host === me.id;
    const mine = mySeat(view);
    const hostSeat = seats.find((s) => s.seat === room.host_seat);
    const humans = seats.filter((s) => !s.bot).length;
    const canStart = seats.length >= 2;
    const full = room.game !== 'conquian' && seats.length >= DOTS_MAX_PLAYERS;
    if (seats.length > seatsSeen) { try { ctx.sfx && ctx.sfx.play('join'); } catch { /* no sound */ } }
    seatsSeen = seats.length;

    const seatRows = seats.map((st) => h('li', { class: 'gwait-seat' + (st.seat === mine ? ' is-me' : '') + (popped.has(st.seat + ':' + st.name) ? '' : ' is-new') },
      seatAvatar(st, 'l'),
      h('span', { class: 'grow gwait-name' },
        h('span', { text: st.seat === mine ? t('games.lobby.you_name', { name: st.name }) : st.name }),
        h('span', { class: 'gwait-badges' },
          st.seat === room.host_seat ? h('span', { class: 'gtag gtag-host', text: t('games.lobby.host') }) : null,
          st.bot ? h('span', { class: 'gtag gtag-bot', text: st.bot_level === 'easy' ? t('games.common.claude_easy') : t('games.common.claude_sharp') }) : null)),
      isHost && st.seat !== mine ? h('button', { class: 'gwait-x', type: 'button', disabled: busy, 'aria-label': t('games.lobby.remove', { name: st.name }),
        onclick: () => op(() => games.seats(room.id, st.bot ? { op: 'remove_bot', seat: st.seat } : { op: 'kick', seat: st.seat })) }, '×') : null));

    // Add Claude: an extra "seat" row under the players (host only).
    let adder = null;
    if (isHost && !full) {
      adder = picking
        ? h('div', { class: 'gwait-pick' },
          h('p', { class: 'gwait-pick-q', text: t('games.lobby.which_claude') }),
          h('div', { class: 'gwait-pick-row' },
            h('button', { class: 'btn btn-primary btn-big', type: 'button', disabled: busy, onclick: () => op(() => games.seats(room.id, { op: 'add_bot', level: 'easy' }), () => { picking = false; }) }, t('games.common.claude_easy')),
            h('button', { class: 'btn btn-quiet btn-big', type: 'button', disabled: busy, onclick: () => op(() => games.seats(room.id, { op: 'add_bot', level: 'sharp' }), () => { picking = false; }) }, t('games.common.claude_sharp'))))
        : h('button', { class: 'gwait-claude', type: 'button', disabled: busy, onclick: () => { picking = true; draw(); } },
          h('img', { class: 'avatar avatar-l avatar-claude', src: 'games-assets/logo-mark.svg', alt: '' }), h('span', { class: 'grow', text: t('games.lobby.add_claude') }), h('span', { class: 'gwait-plus', 'aria-hidden': 'true', text: '+' }));
    }

    // Invite players (host): tap a name and the invite goes out (it shows up in their Games).
    let inviter = null;
    if (isHost && !full) {
      if (!inviting) {
        inviter = h('button', { class: 'gwait-invite', type: 'button', disabled: busy, onclick: () => {
          inviting = true; draw();
          if (!people) games.people().then((p) => { people = p || []; draw(); }).catch(() => { people = []; draw(); });
        } }, h('span', { class: 'gwait-invite-ic', 'aria-hidden': 'true' }, icon('user')), h('span', { class: 'grow', text: t('games.lobby.invite_more') }), h('span', { class: 'gwait-plus', 'aria-hidden': 'true', text: '+' }));
      } else {
        const seated = new Set(seats.filter((x) => !x.bot).map((x) => x.name));
        const folks = (people || []).filter((p) => p.id !== me.id && !/^claude$/i.test(p.display_name || '') && !seated.has(p.display_name));
        inviter = h('section', { class: 'gwait-people' },
          h('h2', { class: 'gwait-h2' }, h('span', { text: t('games.lobby.invite_more') })),
          !people ? h('p', { class: 'gcard-empty', text: t('games.common.loading') })
            : !folks.length ? h('p', { class: 'gcard-empty', text: t('games.lobby.people_none') })
              : h('div', { class: 'gpeople' }, folks.map((p) => {
                const on = invited.has(p.id);
                return h('button', { type: 'button', class: 'gperson' + (on ? ' on' : ''), 'aria-pressed': String(on), disabled: on || busy,
                  onclick: () => op(() => games.invite(room.id, [p.id]), () => { invited.add(p.id); toast(t('games.lobby.invite_sent')); }) },
                avatar(p, 'm'), h('span', { class: 'grow gperson-name', text: p.display_name }),
                h('span', { class: 'gcheck', 'aria-hidden': 'true' }, on ? '✓' : ''));
              })));
      }
    }

    // The room's options in plain words; the host can still flip Simple table and Hints here.
    const st0 = room.settings || {};
    const newbies = seats.filter((x) => !x.bot && x.first_game).map((x) => (x.seat === mine ? t('games.lobby.you') : x.name));
    const setOpt = (k, v) => op(() => games.options(room.id, { [k]: v }));
    const cqRoom = room.game === 'conquian';
    const options = cqRoom ? h('section', { class: 'gwait-opts' },
      h('h2', { class: 'gwait-h2' }, h('span', { text: t('games.lobby.options_on') })),
      optionTags(st0, 'conquian'),
      isHost ? h('div', { class: 'gwait-opts-edit' },
        seg(t('games.cq.lobby.opt_variant'), [['classic', t('games.cq.lobby.variant_classic')], ['familia', t('games.cq.lobby.variant_familia')]], st0.variant || (seats.length > 2 ? 'familia' : 'classic'), (v) => setOpt('variant', v)),
        seg(t('games.lobby.opt_hints'), [[true, t('games.lobby.hints_on')], [false, t('games.lobby.hints_off')]], st0.hints !== false, (v) => setOpt('hints', v))) : null,
      st0.variant === 'classic' && seats.length > 2 ? h('p', { class: 'gwait-hint gwait-newbie', text: t('games.cq.lobby.classic_two') }) : null,
      h('button', { class: 'btn btn-quiet gpractice-rules', type: 'button', onclick: () => openRules('conquian') }, t('games.cq.lobby.how'))) : h('section', { class: 'gwait-opts' },
      h('h2', { class: 'gwait-h2' }, h('span', { text: t('games.lobby.options_on') })),
      optionTags(st0),
      isHost ? h('div', { class: 'gwait-opts-edit' },
        seg(t('games.lobby.opt_table'), [[true, t('games.lobby.opt_table_simple')], [false, t('games.lobby.opt_table_free')]], !!st0.simple_table, (v) => setOpt('simple_table', v)),
        seg(t('games.lobby.opt_hints'), [[true, t('games.lobby.hints_on')], [false, t('games.lobby.hints_off')]], st0.hints !== false, (v) => setOpt('hints', v))) : null,
      newbies.length && !st0.simple_table ? h('p', { class: 'gwait-hint gwait-newbie', text: t('games.lobby.first_game_note', { names: newbies.join(', ') }) }) : null);

    // The sticky footer: Start (host), Sit down (watcher), or "waiting for the host".
    const foot = [];
    if (isHost) {
      foot.push(h('button', { class: 'btn btn-primary btn-big gwait-start', type: 'button', disabled: busy || !canStart,
        onclick: () => op(() => games.start(room.id)) }, t('games.lobby.start')));
      if (!canStart) foot.push(h('p', { class: 'gwait-hint', text: t('games.lobby.need_two') }));
    } else if (mine == null) {
      foot.push(h('button', { class: 'btn btn-primary btn-big', type: 'button', disabled: busy || full, onclick: () => op(() => games.seats(room.id, { op: 'sit' })) }, t('games.lobby.sit')));
      if (full) foot.push(h('p', { class: 'gwait-hint', text: t('games.api.room_full') }));
      foot.push(h('p', { class: 'gwait-hint', text: t('games.lobby.watching') }));
    } else {
      foot.push(h('p', { class: 'gwait-waiting' }, h('span', { text: t('games.lobby.waiting_host', { name: hostSeat ? hostSeat.name : '' }) }),
        h('span', { class: 'dots', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'))));
    }

    el.replaceChildren(...[   // (replaceChildren would print a null as the text "null")
      h('div', { class: 'gwait-top' },
        room.game === 'conquian' ? h('span', { class: 'gtag gtag-game', text: t('games.cq.name') }) : null,
        h('span', { class: 'gtag gtag-mode gtag-' + room.mode, text: modeLabel(room.mode) }),
        h('a', { class: 'gwait-tv', href: '#/games/tv/' + room.id }, t('games.lobby.show_tv'))),
      isHost ? h('div', {class:'row'},
        seg(t('games.app.guests'), [[true,t('games.app.on')],[false,t('games.app.off')]], room.settings.guests !== false, v => op(()=>games.options(room.id,{guests:v}))),
        h('button',{type:'button',class:'btn',onclick:async()=>{
          const text=t('games.app.share_text',{code:room.code});
          try { if(navigator.share) await navigator.share({text}); else {await navigator.clipboard.writeText(text);toast(t('games.app.copied'));} } catch(e) { if(e.name!=='AbortError') toast(t('games.errors.server'),'error'); }
        }},t('games.app.share'))) : null,
      h('h1', { class: 'gwait-title', text: t('games.lobby.wait_title') }),
      h('div', { class: 'gwait-code' },
        h('p', { class: 'gwait-code-k', text: t('games.lobby.code_label') }),
        h('div', { class: 'gcode gcode-xl', role: 'img', 'aria-label': t('games.common.code_aria', { code: room.code.split('').join(' ') }) },
          room.code.split('').map((c) => h('span', { class: 'gcode-ch', text: c }))),
        h('p', { class: 'gwait-code-hint', text: t('games.lobby.code_hint') })),
      h('h2', { class: 'gwait-h2' }, h('span', { text: t('games.lobby.players') }), h('span', { class: 'gcount', text: String(seats.length) })),
      h('ul', { class: 'gwait-seats' }, seatRows),
      adder,
      inviter,
      options,
      humans < 2 && !seats.some((s) => s.bot) ? h('p', { class: 'gwait-hint gwait-alone', text: t('games.lobby.alone') }) : null,
      mine != null && !isHost ? h('button', { class: 'btn btn-quiet gwait-leave', type: 'button', disabled: busy, onclick: () => op(() => games.seats(room.id, { op: 'leave' })) }, t('games.lobby.leave')) : null,
      h('div', { class: 'gwait-foot' }, foot)].filter(Boolean));
    for (const st of seats) popped.add(st.seat + ':' + st.name);
  }
  draw();
  return { el, update: draw };
}
