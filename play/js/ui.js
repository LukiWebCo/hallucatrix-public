// Shared app state and small UI pieces: toasts, confirm dialog, errors, buttons.
import { h, icon } from './dom.js?v=1bb003a1a4fc';
import { t } from './i18n.js?v=1bb003a1a4fc';

export const state = { me: null, rerender: null };

export function go(hash) {
  if (location.hash === hash) state.rerender && state.rerender();
  else location.hash = hash;
}

export function errText(e) {
  if (e && e.code === 'offline') return t('games.errors.offline');
  if (e && e.key) return t(e.key);
  return t('games.errors.server');
}

let toastTimer;
export function toast(msg, kind = 'ok') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.dataset.kind = kind;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 4200);
}

export function confirmBox(message, yesLabel, danger = false) {
  return new Promise((resolve) => {
    const dlg = h('dialog', { class: 'sheet confirm', 'aria-modal': 'true' });
    const done = (v) => { dlg.close(); dlg.remove(); resolve(v); };
    dlg.append(
      h('p', { class: 'confirm-text', text: message }),
      h('div', { class: 'row gap' },
        h('button', { class: 'btn btn-quiet', type: 'button', onclick: () => done(false) }, t('games.common.cancel')),
        h('button', { class: 'btn ' + (danger ? 'btn-danger' : 'btn-primary'), type: 'button', onclick: () => done(true) }, yesLabel)));
    dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); done(false); });
    document.body.append(dlg);
    dlg.showModal();
  });
}

export function backLink(hash, label) {
  return h('a', { class: 'back', href: hash }, icon('back'), h('span', null, label || t('games.common.back')));
}

export function busy(btn, on) {
  if (!btn) return;
  btn.disabled = on;
  btn.classList.toggle('is-busy', on);
}

export function loading() {
  return h('div', { class: 'loading', role: 'status' }, h('span', { class: 'dots', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')), h('span', { class: 'sr-only' }, t('games.common.loading')));
}

export function errorBox(e, retry) {
  return h('div', { class: 'card error-card', role: 'alert' },
    h('p', { text: errText(e) }),
    retry ? h('button', { class: 'btn btn-quiet', type: 'button', onclick: retry }, t('games.common.try_again')) : null);
}
