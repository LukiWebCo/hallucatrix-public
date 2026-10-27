import { h, icon } from '../dom.js?v=1bb003a1a4fc';
import { t } from '../i18n.js?v=1bb003a1a4fc';
import { errText, go, toast } from '../ui.js?v=1bb003a1a4fc';
import { saveTable } from '../tables.js?v=1bb003a1a4fc';
import { games } from './net.js?v=1bb003a1a4fc';
import { dotArt, seatAvatar } from './market.js?v=1bb003a1a4fc';
import { modeLabel } from './tv.js?v=1bb003a1a4fc';

const CODE_CHARS = 'BCDFGHJKLMNPQRSTVWXZ23456789';

function head(title, lede) {
  return h('header', { class: 'ghead' },
    h('div', { class: 'ghead-row' }, h('h1', { class: 'ghead-title', text: title })),
    lede ? h('p', { class: 'lede ghead-lede', text: lede }) : null);
}

function back(hash, label) {
  return h('a', { class: 'back gback', href: hash }, icon('back'), h('span', null, label));
}

export const gameName = (game) => (game === 'conquian' ? t('games.cq.name') : t('games.common.game_name'));
export const gameHome = (game) => game === 'conquian' ? '#/conquian' : '#/puntos';
export const hashGame = () => location.hash.startsWith('#/conquian') ? 'conquian' : 'dots';

export function optionTags(settings, game = 'dots') {
  settings = settings || {};
  const tags = [];
  if (settings.practice) tags.push(t('games.lobby.tag_practice'));
  else if (game === 'conquian') {
    tags.push(settings.variant === 'familia' ? t('games.cq.variant.familia') : settings.variant === 'classic' ? t('games.cq.variant.classic') : t('games.cq.lobby.tag_auto'));
    tags.push(settings.match_to ? t('games.cq.lobby.tag_to', { n: settings.match_to }) : t('games.cq.lobby.tag_one'));
    if (settings.forcing === false) tags.push(t('games.cq.lobby.tag_noforce'));
    if (settings.variant === 'familia' && settings.cambio === false) tags.push(t('games.cq.lobby.tag_nocambio'));
    tags.push(settings.hints === false ? t('games.lobby.tag_nohints') : t('games.lobby.tag_hints'));
    if (settings.turn_seconds) tags.push(t('games.lobby.tag_timer', { s: settings.turn_seconds }));
  } else {
    tags.push(settings.simple_table ? t('games.lobby.tag_simple') : t('games.lobby.tag_free'));
    tags.push(settings.hints === false ? t('games.lobby.tag_nohints') : t('games.lobby.tag_hints'));
    if (settings.turn_seconds) tags.push(t('games.lobby.tag_timer', { s: settings.turn_seconds }));
    if (settings.stack_adj < 0) tags.push(t('games.lobby.tag_short'));
    if (settings.stack_adj > 0) tags.push(t('games.lobby.tag_long'));
    if (settings.match_to) tags.push(t('games.lobby.tag_match', { n: settings.match_to }));
  }
  return h('span', { class: 'gopt-tags' }, tags.map((label) => h('span', { class: 'gtag gtag-opt', text: label })));
}

function stepper(index, count) {
  const children = [];
  for (let i = 0; i < count; i++) {
    if (i) children.push(h('i', { class: 'gstep-line' + (i <= index ? ' is-on' : '') }));
    children.push(h('span', { class: 'gstep-dot' + (i < index ? ' is-done' : i === index ? ' is-on' : '') }, String(i + 1)));
  }
  return h('div', { class: 'gstep', role: 'img', 'aria-label': t('games.lobby.step_of', { n: index + 1, total: count }) }, children);
}

function bigChoice({ title, desc, art, onclick, cls = '', badge = null }) {
  return h('button', { class: 'gchoice ' + cls, type: 'button', onclick },
    art ? h('span', { class: 'gchoice-art', 'aria-hidden': 'true' }, art) : null,
    h('span', { class: 'gchoice-text' },
      badge ? h('span', { class: 'gtag gtag-best', text: badge }) : null,
      h('span', { class: 'gchoice-title', text: title }),
      desc ? h('span', { class: 'gchoice-desc', text: desc }) : null),
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
  for (const [option, text] of options) {
    row.append(h('button', {
      type: 'button',
      class: 'gseg-btn' + (option === value ? ' on' : ''),
      'aria-pressed': String(option === value),
      onclick: () => {
        onChange(option);
        row.querySelectorAll('.gseg-btn').forEach((button, index) => {
          const on = options[index][0] === option;
          button.classList.toggle('on', on);
          button.setAttribute('aria-pressed', String(on));
        });
      },
    }, text));
  }
  wrap.append(row);
  return wrap;
}

function saveOpened(result, game, mode, nickname, role) {
  saveTable({
    room_id: result.room_id,
    code: result.code || result.room?.code || '',
    game,
    mode,
    token: result.token,
    nickname,
    role,
    status: result.room?.status || 'lobby',
    saved_at: Date.now(),
  });
}

export async function startPracticeRoom(game = 'dots') {
  const result = await games.practice(game);
  saveOpened(result, game, 'practice', '', 'practice');
  go('#/room/' + result.room_id);
  return result;
}

export function newGameView(game = hashGame()) {
  const state = {
    step: 0, mode: 'live', claude: 'easy', nickname: '',
    simple_table: true, hints: true, turn_seconds: 0, leisure_hours: 24,
    stack_adj: 0, match_to: 0,
  };
  const root = h('section', { class: 'page gnew' });
  const nickname = h('input', {
    class: 'ginput', type: 'text', maxlength: 24, autocomplete: 'nickname',
    required: true, placeholder: t('games.app.nickname'),
    oninput: (ev) => { state.nickname = ev.target.value; },
  });

  function nav(title) {
    return [
      h('div', { class: 'gnew-top' },
        state.step
          ? h('button', { class: 'back gback', type: 'button', onclick: () => { state.step--; draw(); } }, icon('back'), h('span', { text: t('games.common.back') }))
          : back(gameHome(game), gameName(game)),
        stepper(state.step, 4)),
      h('h1', { class: 'gnew-title', text: title }),
    ];
  }

  async function create(button) {
    if (!state.nickname.trim()) return;
    button.disabled = true;
    button.classList.add('is-busy');
    try {
      const settings = game === 'conquian'
        ? { variant: null, match_to: 0, forcing: false, cambio: false, hints: state.hints }
        : { simple_table: state.simple_table, hints: state.hints, stack_adj: state.stack_adj, match_to: state.match_to };
      if (state.mode === 'leisure') settings.leisure_hours = state.leisure_hours;
      else settings.turn_seconds = state.turn_seconds;
      const result = await games.tableOpen(state.mode, game, state.nickname.trim(), state.claude ? [state.claude] : [], settings);
      saveOpened(result, game, state.mode, state.nickname.trim(), 'host');
      go('#/room/' + result.room_id);
    } catch (error) {
      toast(errText(error), 'error');
      button.disabled = false;
      button.classList.remove('is-busy');
    }
  }

  function draw() {
    if (state.step === 0) {
      root.replaceChildren(...nav(t('games.flow.mode_question')),
        h('div', { class: 'gchoices' },
          ['live', 'leisure', 'together'].map((mode) => bigChoice({
            cls: 'gchoice-' + mode,
            art: modeArt(mode),
            title: mode === 'live' ? t('games.flow.mode_now') : modeLabel(mode),
            desc: {
              live: t('games.lobby.mode_live_desc'),
              leisure: t('games.lobby.mode_leisure_desc'),
              together: t('games.lobby.mode_together_desc'),
            }[mode],
            onclick: () => { state.mode = mode; state.step = 1; draw(); },
          }))));
    } else if (state.step === 1) {
      const choices = [
        ['easy', t('games.common.claude_easy'), t('games.lobby.claude_easy_desc')],
        ['sharp', t('games.common.claude_sharp'), t('games.lobby.claude_sharp_desc')],
        [null, t('games.lobby.claude_none'), t('games.lobby.claude_none_desc')],
      ];
      root.replaceChildren(...nav(t('games.flow.claude_question')),
        h('div', { class: 'gchoices' }, choices.map(([level, title, desc]) => bigChoice({
          cls: 'gchoice-claude' + (level === 'easy' ? ' gchoice-best' : ''),
          title, desc,
          badge: level === 'easy' ? t('games.lobby.recommended') : null,
          onclick: () => { state.claude = level; state.step = 2; draw(); },
        }))));
    } else if (state.step === 2) {
      nickname.value = state.nickname;
      nickname.id = 'table-nickname';
      root.replaceChildren(...nav(t('games.flow.nickname_question')),
        h('label', { class: 'gopt-label', for: nickname.id }, t('games.app.nickname'), nickname),
        h('div', { class: 'gnew-foot' },
          h('button', { class: 'btn btn-primary btn-big', type: 'button', onclick: () => {
            state.nickname = nickname.value;
            if (!state.nickname.trim()) { nickname.focus(); return; }
            state.step = 3;
            draw();
          } }, t('games.flow.continue'))));
    } else {
      const timer = state.mode === 'leisure'
        ? seg(t('games.lobby.opt_leisure'), [[4, t('games.lobby.hours_4')], [12, t('games.lobby.hours_12')], [24, t('games.lobby.hours_24')], [48, t('games.lobby.hours_48')]], state.leisure_hours, (value) => { state.leisure_hours = value; })
        : seg(t('games.lobby.opt_timer'), [[0, t('games.lobby.timer_off')], [60, t('games.lobby.timer_60')], [90, t('games.lobby.timer_90')]], state.turn_seconds, (value) => { state.turn_seconds = value; });
      const more = h('details', { class: 'gopts' },
        h('summary', { class: 'gopts-sum' },
          h('span', { text: t('games.flow.more_options') }),
          h('span', { class: 'gopts-hint', text: t('games.lobby.options_hint') })),
        h('div', { class: 'gopts-body' },
          game === 'dots' ? seg(t('games.lobby.opt_table'), [[true, t('games.lobby.opt_table_simple')], [false, t('games.lobby.opt_table_free')]], state.simple_table, (value) => { state.simple_table = value; }) : null,
          seg(t('games.lobby.opt_hints'), [[true, t('games.lobby.hints_on')], [false, t('games.lobby.hints_off')]], state.hints, (value) => { state.hints = value; }),
          timer,
          game === 'dots' ? seg(t('games.lobby.opt_stack'), [[-2, t('games.lobby.stack_short')], [0, t('games.lobby.stack_normal')], [2, t('games.lobby.stack_long')]], state.stack_adj, (value) => { state.stack_adj = value; }) : null,
          game === 'dots' ? seg(t('games.lobby.opt_length'), [[0, t('games.lobby.length_one')], [100, t('games.lobby.length_match')]], state.match_to, (value) => { state.match_to = value; }) : null));
      const ready = h('button', { class: 'btn btn-primary btn-big gnew-create', type: 'button', onclick: (ev) => create(ev.currentTarget) }, t('games.flow.ready'));
      root.replaceChildren(...nav(t('games.flow.ready')),
        h('ul', { class: 'gsummary' },
          h('li', null, h('span', { class: 'gsummary-k', text: t('games.lobby.sum_mode') }), h('span', { text: modeLabel(state.mode) })),
          h('li', null, h('span', { class: 'gsummary-k', text: t('games.app.nickname') }), h('span', { text: state.nickname })),
          h('li', null, h('span', { class: 'gsummary-k', text: t('games.lobby.sum_claude') }),
            h('span', { text: state.claude === 'easy' ? t('games.common.claude_easy') : state.claude === 'sharp' ? t('games.common.claude_sharp') : t('games.lobby.claude_none') }))),
        more, h('div', { class: 'gnew-foot' }, ready));
    }
    window.scrollTo(0, 0);
  }
  draw();
  return root;
}

export async function joinView(prefill = '', game = 'dots') {
  const boxes = [];
  const message = h('p', { class: 'form-msg', role: 'alert' });
  const preview = h('section', { class: 'gcard gjoin-preview', hidden: true });
  const backNode = back(gameHome(game), gameName(game));
  const nickname = h('input', { class: 'ginput', type: 'text', maxlength: 24, autocomplete: 'nickname', placeholder: t('games.app.nickname') });
  const joinButton = h('button', { class: 'btn btn-primary btn-big', type: 'button', disabled: true }, t('games.flow.enter'));
  const watchButton = h('button', { class: 'btn btn-quiet btn-big', type: 'button', disabled: true }, t('games.flow.watch'));
  const code = () => boxes.map((box) => box.value).join('');
  const clean = (value) => value.toUpperCase().split('').filter((char) => CODE_CHARS.includes(char)).join('');
  let request = 0;
  let previewInfo = null;

  function sync() {
    const ready = code().length === 4 && nickname.value.trim().length > 0;
    joinButton.disabled = !ready;
    watchButton.disabled = !ready;
  }

  async function loadPreview() {
    if (code().length !== 4) { preview.hidden = true; sync(); return; }
    const version = ++request;
    previewInfo = null;
    preview.hidden = false;
    preview.replaceChildren(h('p', { text: t('games.common.loading') }));
    try {
      const info = await games.code(code());
      if (version !== request) return;
      previewInfo = info;
      backNode.href = gameHome(info.game);
      backNode.querySelector('span').textContent = gameName(info.game);
      preview.replaceChildren(
        h('h2', { text: t('games.flow.preview') }),
        h('p', { text: gameName(info.game) + ' · ' + modeLabel(info.mode) }),
        h('p', { text: (info.players || []).join(', ') }),
      );
    } catch (error) {
      if (version !== request) return;
      preview.replaceChildren(h('p', { role: 'alert', text: errText(error) }));
    }
    sync();
  }

  async function join(as) {
    if (code().length !== 4 || !nickname.value.trim()) return;
    joinButton.disabled = true;
    watchButton.disabled = true;
    message.textContent = '';
    try {
      const result = await games.guest(code(), nickname.value.trim(), as);
      const info = previewInfo || await games.code(code()).catch(() => ({}));
      saveOpened({
        ...result,
        room: { code: code(), status: info.status || 'lobby' },
      }, info.game || 'dots', info.mode || 'live', nickname.value.trim(), as === 'spectator' ? 'watch' : 'player');
      go('#/room/' + result.room_id);
    } catch (error) {
      message.textContent = errText(error);
      sync();
    }
  }

  for (let i = 0; i < 4; i++) {
    const box = h('input', {
      class: 'gbox', type: 'text', inputmode: 'text', maxlength: 4, autocomplete: 'off',
      autocapitalize: 'characters', autocorrect: 'off', spellcheck: 'false',
      'aria-label': t('games.lobby.box_n', { n: i + 1 }),
    });
    box.addEventListener('input', () => {
      const value = clean(box.value);
      if (value.length > 1) {
        for (let k = 0; k < value.length && i + k < 4; k++) boxes[i + k].value = value[k];
        boxes[Math.min(3, i + value.length)].focus();
      } else {
        box.value = value;
        if (value && i < 3) boxes[i + 1].focus();
      }
      boxes.forEach((item) => item.classList.toggle('filled', !!item.value));
      loadPreview();
    });
    box.addEventListener('keydown', (ev) => {
      if (ev.key === 'Backspace' && !box.value && i > 0) {
        boxes[i - 1].value = '';
        boxes[i - 1].classList.remove('filled');
        boxes[i - 1].focus();
        loadPreview();
        ev.preventDefault();
      }
      if (ev.key === 'Enter' && code().length === 4) join('player');
    });
    boxes.push(box);
  }

  if (prefill) clean(prefill).slice(0, 4).split('').forEach((char, index) => {
    boxes[index].value = char;
    boxes[index].classList.add('filled');
  });
  nickname.addEventListener('input', sync);
  joinButton.addEventListener('click', () => join('player'));
  watchButton.addEventListener('click', () => join('spectator'));
  const root = h('section', { class: 'page gjoin' },
    backNode,
    head(t('games.lobby.join_title'), t('games.lobby.join_lede')),
    h('div', { class: 'gboxes' }, boxes),
    h('label', { class: 'gopt-label' }, t('games.app.nickname'), nickname),
    preview, message, h('div', { class: 'gjoin-actions' }, joinButton, watchButton));
  sync();
  if (prefill) loadPreview();
  setTimeout(() => { const first = boxes.find((box) => !box.value) || boxes[3]; first.focus({ preventScroll: true }); }, 60);
  return root;
}

export async function copyLink(url) {
  try {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        await fallbackCopy(url);
      }
    } else await fallbackCopy(url);
    toast(t('games.flow.copied'));
  } catch {
    toast(t('games.errors.server'), 'error');
  }
}

async function fallbackCopy(url) {
  const field = h('input', { value: url, readonly: true, class: 'ginput' });
  document.body.append(field);
  try {
    field.select();
    if (!document.execCommand('copy')) throw new Error('copy_failed');
  } finally {
    field.remove();
  }
}

export function roomLobbyView(ctx) {
  const el = h('section', { class: 'page gwait' });
  let busy = false;
  let pickingClaude = false;
  let tvUrl = '';
  const seenSeats = new Set();

  async function op(fn) {
    if (busy) return;
    busy = true;
    draw();
    try { await fn(); ctx.refresh?.(); } catch (error) { toast(errText(error), 'error'); }
    busy = false;
    draw();
  }

  async function share(url, text) {
    try {
      if (navigator.share) { await navigator.share({ url, text }); return; }
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
    await copyLink(url);
  }

  async function showTv(roomId) {
    try {
      const { url_token } = await games.tvLink(roomId);
      tvUrl = `${location.origin}/play/#/tv/${roomId}?k=${encodeURIComponent(url_token)}`;
    } catch (error) {
      toast(errText(error), 'error');
    }
    draw();
  }

  function draw() {
    const view = ctx.getView();
    const room = view.room;
    const seats = view.seats || [];
    const saved = ctx.table;
    const isHost = saved?.role === 'host';
    const mySeat = view.me && typeof view.me.seat === 'number' ? view.me.seat : null;
    const hostSeat = seats.find((seat) => seat.seat === room.host_seat);
    const full = room.game !== 'conquian' && seats.length >= 8;
    const seatRows = seats.map((seat) => {
      const key = seat.seat + ':' + seat.name;
      const fresh = !seenSeats.has(key);
      seenSeats.add(key);
      return h('li', { class: 'gwait-seat' + (seat.seat === mySeat ? ' is-me' : '') + (fresh ? ' is-new' : '') },
        seatAvatar(seat, 'l'),
        h('span', { class: 'grow gwait-name' },
          h('span', { text: seat.seat === mySeat ? t('games.lobby.you_name', { name: seat.name }) : seat.name }),
          h('span', { class: 'gwait-badges' },
            seat.seat === room.host_seat ? h('span', { class: 'gtag gtag-host', text: t('games.lobby.host') }) : null,
            seat.bot ? h('span', { class: 'gtag gtag-bot', text: seat.bot_level === 'easy' ? t('games.common.claude_easy') : t('games.common.claude_sharp') }) : null)),
        isHost && seat.bot ? h('button', {
          class: 'gwait-x', type: 'button', disabled: busy,
          'aria-label': t('games.flow.remove_claude'),
          onclick: () => op(() => games.seats(room.id, { op: 'remove_bot', seat: seat.seat })),
        }, '×') : null);
    });

    const addClaude = isHost && !full
      ? pickingClaude
        ? h('div', { class: 'gwait-pick' },
          h('p', { class: 'gwait-pick-q', text: t('games.lobby.which_claude') }),
          h('div', { class: 'gwait-pick-row' },
            h('button', { class: 'btn btn-primary btn-big', type: 'button', disabled: busy, onclick: () => op(() => games.seats(room.id, { op: 'add_bot', level: 'easy' })) }, t('games.common.claude_easy')),
            h('button', { class: 'btn btn-quiet btn-big', type: 'button', disabled: busy, onclick: () => op(() => games.seats(room.id, { op: 'add_bot', level: 'sharp' })) }, t('games.common.claude_sharp')),
            h('button', { class: 'btn btn-quiet', type: 'button', onclick: () => { pickingClaude = false; draw(); } }, t('games.common.cancel'))))
        : h('button', { class: 'gwait-claude', type: 'button', disabled: busy, onclick: () => { pickingClaude = true; draw(); } },
          h('img', { class: 'avatar avatar-l avatar-claude', src: 'games-assets/logo-mark.svg', alt: '' }),
          h('span', { class: 'grow', text: t('games.lobby.add_claude') }),
          h('span', { class: 'gwait-plus', 'aria-hidden': 'true', text: '+' }))
      : null;
    const settings = room.settings || {};
    const setOption = (key, value) => op(() => games.options(room.id, { [key]: value }));
    const options = h('section', { class: 'gwait-opts' },
      h('h2', { class: 'gwait-h2' }, h('span', { text: t('games.lobby.options_on') })),
      optionTags(settings, room.game),
      isHost ? h('div', { class: 'gwait-opts-edit' },
        room.game === 'dots' ? seg(t('games.lobby.opt_table'), [[true, t('games.lobby.opt_table_simple')], [false, t('games.lobby.opt_table_free')]], !!settings.simple_table, (value) => setOption('simple_table', value)) : null,
        seg(t('games.lobby.opt_hints'), [[true, t('games.lobby.hints_on')], [false, t('games.lobby.hints_off')]], settings.hints !== false, (value) => setOption('hints', value))) : null);
    const tvControls = room.mode === 'together' && isHost
      ? h('section', { class: 'gwait-tv-controls' },
        h('button', { class: 'btn btn-primary btn-big', type: 'button', disabled: busy, onclick: () => showTv(room.id) }, t('games.flow.show_tv')),
        tvUrl ? h('div', { class: 'gflow-link' },
          h('label', { class: 'gopt-label' }, t('games.flow.tv_link'), h('input', { class: 'ginput', value: tvUrl, readonly: true })),
          h('a', { href: tvUrl, target: '_blank', rel: 'noopener noreferrer' }, t('games.flow.open_tv_link')),
          h('button', { class: 'btn btn-quiet', type: 'button', onclick: () => copyLink(tvUrl) }, t('games.flow.copy_link'))) : null)
      : null;
    const shareUrl = `${location.origin}/play/#/j/${room.code}`;
    const hostControls = isHost ? h('section', { class: 'gwait-host-controls' },
      seg(t('games.app.guests'), [[true, t('games.app.on')], [false, t('games.app.off')]], settings.guests !== false, (value) => setOption('guests', value)),
      addClaude,
      h('button', { class: 'btn btn-quiet btn-big', type: 'button', onclick: () => share(shareUrl, t('games.flow.share_text', { code: room.code })) }, t('games.flow.share_link'))) : null;
    const canStart = seats.length >= 2;
    const footer = isHost
      ? h('div', { class: 'gwait-foot' },
        h('button', { class: 'btn btn-primary btn-big gwait-start', type: 'button', disabled: busy || !canStart, onclick: () => op(() => games.start(room.id)) }, t('games.lobby.start')),
        !canStart ? h('p', { class: 'gwait-hint', text: t('games.lobby.need_two') }) : null)
      : h('p', { class: 'gwait-waiting' }, h('span', { text: t('games.lobby.waiting_host', { name: hostSeat?.name || '' }) }));

    el.replaceChildren(
      h('div', { class: 'gwait-top' },
        room.game === 'conquian' ? h('span', { class: 'gtag gtag-game', text: t('games.cq.name') }) : null,
        h('span', { class: 'gtag gtag-mode gtag-' + room.mode, text: modeLabel(room.mode) })),
      ...[tvControls, hostControls].filter(Boolean),
      h('h1', { class: 'gwait-title', text: t('games.lobby.wait_title') }),
      h('div', { class: 'gwait-code' },
        h('p', { class: 'gwait-code-k', text: t('games.lobby.code_label') }),
        h('div', { class: 'gcode gcode-xl', role: 'img', 'aria-label': t('games.common.code_aria', { code: (room.code || '').split('').join(' ') }) },
          (room.code || '').split('').map((char) => h('span', { class: 'gcode-ch', text: char }))),
        h('p', { class: 'gwait-code-hint', text: t('games.lobby.code_hint') })),
      h('h2', { class: 'gwait-h2' }, h('span', { text: t('games.lobby.players') }), h('span', { class: 'gcount', text: String(seats.length) })),
      h('ul', { class: 'gwait-seats' }, seatRows),
      options, footer);
  }
  draw();
  return { el, update: draw };
}

export async function transferView(token) {
  const root = h('section', { class: 'page gjoin' }, h('p', { class: 'gcard-empty', text: t('games.common.loading') }));
  try {
    const result = await games.acceptTransfer(decodeURIComponent(token));
    const view = await games.room(result.room_id, null, false, result.token);
    const nickname = view.me?.seat == null ? '' : view.seats?.find((seat) => seat.seat === view.me.seat)?.name || '';
    saveOpened({ ...result, room: view.room }, view.room.game, view.room.mode, nickname, result.role || 'player');
    go('#/room/' + result.room_id);
  } catch (error) {
    // A used or expired seat link reads as an expired link, not as a missing page.
    const text = error && (error.code === 'not_found' || error.status === 404) ? t('games.errors.unauthorized') : errText(error);
    root.replaceChildren(h('p', { role: 'alert', text }), back('#/puntos', t('games.common.game_name')));
  }
  return root;
}
