import { get, post } from './api.js?v=1bb003a1a4fc';
import { currentLang } from './i18n.js?v=1bb003a1a4fc';

export function pushSupported() {
  return typeof navigator !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
    && Notification.permission !== 'denied';
}

function keyBytes(b64u) {
  const s = atob(b64u.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - b64u.length % 4) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

export async function enableRoomPush(roomId) {
  if (!pushSupported()) return false;
  if (await Notification.requestPermission() !== 'granted') return false;
  const reg = await navigator.serviceWorker.register('sw-push.js', { scope: './' });
  await navigator.serviceWorker.ready;
  const { key } = await get('/api/push/key', { auth: false });
  const subscription = await reg.pushManager.getSubscription()
    || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
  await post(`/api/games/rooms/${roomId}/push`, {
    subscription: subscription.toJSON(),
    lang: currentLang(),
  });
  return true;
}
