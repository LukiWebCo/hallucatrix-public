import { h } from './dom.js?v=18426296defe';
import { get, post, patch, getToken, setToken, setSignedOutHandler } from './api.js?v=18426296defe';
import { setLang, guessLang, currentLang, t } from './i18n.js?v=18426296defe';
import { state, go, errorBox, toast } from './ui.js?v=18426296defe';
import * as passkey from './passkey.js?v=18426296defe';
import { pushSupported, pushIsOn, enablePush } from './push.js?v=18426296defe';
import { gamesView } from './games/index.js?v=18426296defe';
const view = document.getElementById('view');
let serial = 0;
const label = (key) => t('games.app.' + key);
const button = (key, fn) => h('button', {type:'button', class:'btn', onclick: async (ev) => {
  ev.currentTarget.disabled = true;
  try { await fn(); } catch(e) { toast(t(e.key || 'games.errors.server'), 'error'); }
  finally { ev.target.closest('button')?.removeAttribute('disabled'); }
}}, label(key));
const input = (key, attrs = {}) => { const el = h('input', {required:true, ...attrs}); return {el, node:h('label', null, label(key), el)}; };
function form(title, fields, submit) {
  const root = h('form', {class:'auth-card'}, h('h1', null, label(title)), fields.map(f=>f.node));
  const btn = h('button',{type:'submit',class:'btn btn-primary'},label('continue'));
  root.append(btn);
  root.addEventListener('submit',async ev=>{ ev.preventDefault(); btn.disabled=true; try { await submit(); } catch(e) { toast(t(e.key || 'games.errors.server'),'error'); } finally {btn.disabled=false;} });
  return root;
}
async function signed(result) { setToken(result.token); state.me=result.player; go('#/'); }
function publicHome() {
  return h('section',{class:'public-cards'}, ['dots','conquian'].map(game=>h('article',{class:'card public-card'},
    h('h2',null,t(game==='dots'?'games.common.game_name':'games.cq.name')),
    button('practice',async()=>{ const r=await post('/api/games/practice/open',{game},{auth:false}); localStorage.setItem('hxg.room.'+r.room_id,r.token); go('#/room/'+r.room_id); }),
    button('join',()=>go('#/guest')), button('signin',()=>go('#/signin')))));
}
function guestForm() {
  const code=input('code',{maxlength:4,autocapitalize:'characters'}), name=input('nickname',{maxlength:24,autocomplete:'nickname'});
  return form('join',[code,name],async()=>{const r=await post('/api/games/guest',{code:code.el.value.toUpperCase().trim(),nickname:name.el.value},{auth:false});localStorage.setItem('hxg.room.'+r.room_id,r.token);go('#/room/'+r.room_id);});
}
function signin() {
  const root=h('section',{class:'auth-card'},h('h1',null,label('signin')));
  root.append(button('passkey',async()=>{const o=await post('/api/login/options',{}, {auth:false}); const credential=await passkey.get(o.options); await signed(await post('/api/login/verify',{challenge_id:o.challenge_id,credential},{auth:false}));}),button('use_pin',()=>go('#/pin')));
  return root;
}
function pinForm(setting=false) {
  const number=input('number',{inputmode:'numeric',pattern:'[0-9]+'}),pin=input('pin',{type:'password',inputmode:'numeric',pattern:'[0-9]{6}',maxlength:6,autocomplete:setting?'new-password':'current-password'});
  return form(setting?'set_pin':'use_pin',setting?[pin]:[number,pin],async()=>{if(setting){await post('/api/me/pin',{pin:pin.el.value});go('#/');}else await signed(await post('/api/login/pin',{player_id:number.el.value,pin:pin.el.value},{auth:false}));});
}
function nameForm() {const name=input('name',{maxlength:24,autocomplete:'nickname'});return form('name',[name],async()=>{state.me=await patch('/api/me',{display_name:name.el.value});go('#/');});}
function accountTools(root) {
  const tools=h('div',{class:'row'},h('span',null,label('number')+': '+state.me.id),button('set_pin',()=>go('#/set-pin')),button('signout',async()=>{await post('/api/logout');setToken(null);state.me=null;go('#/');}));
  root.prepend(tools);
  if(pushSupported()) pushIsOn().then(on=>{ if(on) return;
    const notify=button('notify',async()=>{ if(await enablePush()) { notify.remove(); toast(label('notify_on')); } });
    tools.append(notify);
  }).catch(()=>{});
  const offer='hxg.passkey.offered.'+state.me.id;
  if(!state.me.has_passkey && !localStorage.getItem(offer)) {
    localStorage.setItem(offer,'1');
    const box=h('div',{class:'card'},h('p',null,label('offer_passkey')),
      button('add_passkey',async()=>{const o=await post('/api/me/webauthn/register/options');await post('/api/me/webauthn/register/verify',{credential:await passkey.create(o)});box.remove();}),button('later',()=>box.remove()));
    root.prepend(box);
  }
}
async function render() {
  const run=++serial;
  document.body.classList.remove('games-tv');
  try {
    if(location.hash.startsWith('#handoff=')) {
      const token=location.hash.slice(9);history.replaceState(null,'',location.pathname+location.search+'#/');
      const r=await post('/api/handoff',{token},{auth:false});setToken(r.token);state.me=r.player;
    }
    if(getToken() && !state.me) state.me=await get('/api/me');
    const path=location.hash.replace(/^#\/?/,'').split('/');
    let node;
    if(state.me && !state.me.display_name) node=nameForm();
    else if(path[0]==='room') node=await gamesView(['r',path[1]]);
    else if(path[0]==='tv') node=await gamesView(path);
    else if(!state.me) node=path[0]==='guest'?guestForm():path[0]==='signin'?signin():path[0]==='pin'?pinForm():publicHome();
    else if(path[0]==='set-pin') node=pinForm(true);
    else {node=await gamesView(path[0]==='games'?path.slice(1):path.filter(Boolean)); if(!path[0] || location.hash==='#/games') accountTools(node);}
    if(run===serial) view.replaceChildren(node);
    document.getElementById('game-name').textContent=(node.dataset.game || (path.includes('conquian')?'conquian':path.includes('dots')?'dots':null)) === 'conquian' ? 'Conquián' : node.dataset.game === 'dots' || path.includes('dots') ? t('games.common.game_name') : label('games');
  } catch(e) { if(run===serial)view.replaceChildren(errorBox(e,render)); }
}
state.rerender=render;
setSignedOutHandler(()=>{state.me=null;go('#/');});
document.getElementById('language').addEventListener('click',async()=>{await setLang(currentLang()==='es'?'en':'es');render();});
window.addEventListener('hashchange',render);
await setLang(guessLang());
await render();
