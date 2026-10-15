// Game notifications: opt in on this device (service worker sw-push.js, scope /play/). Account players only.
import { get, post } from './api.js?v=18426296defe';

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && Notification.permission !== 'denied';
}

function keyBytes(b64u) {
  const s = atob(b64u.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - b64u.length % 4) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

export async function pushIsOn() {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration('./');
  return !!(reg && await reg.pushManager.getSubscription());
}

export async function enablePush() {
  if (await Notification.requestPermission() !== 'granted') return false;
  const reg = await navigator.serviceWorker.register('sw-push.js', { scope: './' });
  await navigator.serviceWorker.ready;
  const { key } = await get('/api/push/key');
  const sub = await reg.pushManager.getSubscription()
    || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
  const json = sub.toJSON();
  await post('/api/push/subscribe', { endpoint: json.endpoint, keys: json.keys });
  return true;
}
