import { h } from './dom.js?v=1bb003a1a4fc';
import { setLang, guessLang, currentLang, t } from './i18n.js?v=1bb003a1a4fc';
import { state, errorBox } from './ui.js?v=1bb003a1a4fc';
import { gamesView } from './games/index.js?v=1bb003a1a4fc';

const view = document.getElementById('view');
let serial = 0;

function canonicalHash(hash) {
  if (hash.startsWith('#handoff=') || hash === '#/guest' || hash === '#/signin' || hash === '#/pin' || hash === '#/set-pin') return '#/puntos';
  if (hash === '#/games' || hash === '#/games/dots') return '#/puntos';
  if (hash === '#/games/conquian') return '#/conquian';
  if (hash === '#/games/new') return '#/puntos/mesa';
  if (hash.startsWith('#/games/new?game=conquian')) return '#/conquian/mesa';
  if (hash.startsWith('#/games/join/')) return '#/j/' + hash.slice('#/games/join/'.length);
  if (hash.startsWith('#/games/join')) return '#/codigo';
  if (hash.startsWith('#/games/r/')) return '#/room/' + hash.slice('#/games/r/'.length);
  if (hash.startsWith('#/games/tv/')) return '#/tv/' + hash.slice('#/games/tv/'.length);
  if (hash.startsWith('#/games/')) return '#/puntos';
  if (hash === '#/' || hash === '#') return '#/';
  return hash;
}

async function render() {
  const run = ++serial;
  let hash = canonicalHash(location.hash);
  if (hash !== location.hash) {
    history.replaceState(null, '', location.pathname + location.search + hash);
  }
  document.body.classList.remove('games-tv');
  try {
    const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    const node = await gamesView(parts);
    if (run !== serial) return;
    view.replaceChildren(node);
    const route = parts[0];
    document.getElementById('game-name').textContent =
      route === 'conquian' || (route === 'room' && node.dataset.game === 'conquian') || (route === 'tv' && node.dataset.game === 'conquian')
        ? t('games.cq.name')
        : route === 'puntos' || (route === 'room' && node.dataset.game === 'dots') || (route === 'tv' && node.dataset.game === 'dots')
          ? t('games.common.game_name')
          : t('games.app.games');
  } catch (e) {
    if (run === serial) view.replaceChildren(errorBox(e, render));
  }
}

state.rerender = render;
document.getElementById('language').addEventListener('click', async () => {
  await setLang(currentLang() === 'es' ? 'en' : 'es');
  render();
});
window.addEventListener('hashchange', render);
await setLang(guessLang());
await render();
