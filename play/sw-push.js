/* Game notifications for /play/: the API sends {kind, room, game, lang}; the text lives here. */
const texts = {
  es: {your_turn: 'Te toca jugar.', invited: 'Tienes una invitación para jugar.', market: 'El mercado está abierto.', game_over: 'La partida ha terminado.'},
  en: {your_turn: 'Your turn to play.', invited: 'You have a game invitation.', market: 'The market is open.', game_over: 'The game has ended.'}
};
self.addEventListener('push', event => {
  let data;
  try { data = event.data.json(); } catch (_) { return; }
  if (!Number.isSafeInteger(data.room) || data.room < 1 || !['dots', 'conquian'].includes(data.game)) return;
  const lang = data.lang === 'en' ? 'en' : 'es';
  if (!Object.prototype.hasOwnProperty.call(texts[lang], data.kind)) return;
  event.waitUntil(self.registration.showNotification(data.game === 'dots' ? 'Puntos y Rayas' : 'Conquián', {
    body: texts[lang][data.kind], tag: `${data.room}:${data.kind}`, data: {room: data.room}
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const room = event.notification.data.room;
  if (!Number.isSafeInteger(room) || room < 1) return;
  const url = `https://hallucatrix.com/play/#/room/${room}`;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
    const existing = windows.find(c => c.url.startsWith('https://hallucatrix.com/play/'));
    if (existing) { await existing.navigate(url); await existing.focus(); }
    else { await self.clients.openWindow(url); }
  })());
});
