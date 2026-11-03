// Arnés de diagnóstico: ejecuta outputs/game.js en Node con un DOM simulado
// para reproducir errores de arranque y localizar la línea exacta.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const gamePath = path.join(__dirname, '..', 'outputs', 'game.js');
let src = fs.readFileSync(gamePath, 'utf8');
// Exponer estado interno para inspección (los `let` de nivel superior no van a globalThis).
src += '\n;function __peek(){return {state,pl,sessions,saveData,gameMode,en,activeSessionId}}';
src += '\n;function __newGame(r,s){return newGame(r,s)}';
src += '\n;function __setSave(v){saveData=v}';
src += '\n;function __continue(id){return continueSavedGame(id)}';

const args = process.argv.slice(2);
const seed = args.includes('--seed');

function ctxProxy() {
  const t = {};
  return new Proxy(t, {
    get(o, p) {
      if (p in o) return o[p];
      if (p === 'createRadialGradient' || p === 'createLinearGradient') return () => ({ addColorStop() {} });
      if (p === 'createPattern') return () => ({});
      if (p === 'measureText') return () => ({ width: 10 });
      if (p === 'getImageData') return () => ({ data: [] });
      if (typeof p === 'symbol') return undefined;
      return () => {};
    },
    set(o, p, v) { o[p] = v; return true; }
  });
}

function strProxy(extra) {
  const t = Object.assign({}, extra);
  return new Proxy(t, {
    get(o, p) {
      if (p in o) return o[p];
      if (typeof p === 'symbol') return undefined;
      return '';
    },
    set(o, p, v) { o[p] = v; return true; }
  });
}

function styleProxy() {
  const t = {};
  return new Proxy(t, {
    get(o, p) {
      if (p in o) return o[p];
      if (p === 'setProperty' || p === 'getPropertyValue' || p === 'removeProperty') return () => '';
      if (typeof p === 'symbol') return undefined;
      return '';
    },
    set(o, p, v) { o[p] = v; return true; }
  });
}

function classList() {
  return { add() {}, remove() {}, toggle() {}, contains() { return false; } };
}

function makeNode(tag) {
  const store = { tagName: String(tag || 'div').toUpperCase(), children: [], _parent: null };
  store.style = styleProxy();
  store.dataset = strProxy({});
  store._classList = classList();
  const handler = {
    get(t, p) {
      if (p in t) return t[p];
      switch (p) {
        case 'classList': return t._classList;
        case 'children': return t.children;
        case 'firstChild': return t.children[0] || null;
        case 'lastChild': return t.children[t.children.length - 1] || null;
        case 'lastElementChild': return t.children[t.children.length - 1] || null;
        case 'parentElement': case 'parentNode': return t._parent || null;
        case 'width': case 'height': return t['_w'] !== undefined ? t['_w'] : 300;
        case 'value': return t._value !== undefined ? t._value : '';
        case 'disabled': case 'hidden': return !!t['_' + p];
        case 'offsetWidth': return 100;
        case 'textContent': case 'innerHTML': case 'className': case 'id': return t['_' + p] || '';
        case 'getContext': return () => (t._ctx || (t._ctx = ctxProxy()));
        case 'getBoundingClientRect': return () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 });
        case 'querySelector': return () => makeNode('div');
        case 'querySelectorAll': return () => [];
        case 'appendChild': case 'append': return (c) => { if (c && typeof c === 'object') { c._parent = t; t.children.push(c); } return c; };
        case 'removeChild': return (c) => { const i = t.children.indexOf(c); if (i >= 0) t.children.splice(i, 1); return c; };
        case 'replaceWith': case 'remove': case 'focus': case 'blur':
        case 'addEventListener': case 'removeEventListener':
        case 'setAttribute': case 'removeAttribute':
        case 'setPointerCapture': case 'releasePointerCapture':
        case 'preventDefault': case 'stopPropagation': case 'stopImmediatePropagation':
          return () => {};
        case 'closest': return () => null;
        case 'matches': return () => false;
        case 'getAttribute': return () => null;
        case 'requestFullscreen': return () => Promise.resolve();
        case 'scrollTop': return 0;
        case 'scrollIntoView': return () => {};
        default: return () => {};
      }
    },
    set(t, p, v) { t[p] = v; return true; }
  };
  return new Proxy(store, handler);
}

function keyButton(k) {
  const b = makeNode('button');
  b.dataset.k = k;
  b.append(makeNode('b'), makeNode('span'), makeNode('small'));
  return b;
}
function comboNode(pair) {
  const s = makeNode('span');
  s.dataset.pair = pair;
  return s;
}
const selectors = {
  '.k': () => ['a', 's', 'd', 'f'].map(keyButton),
  '#combos span': () => ['as', 'ad', 'af', 'ds', 'fs', 'df'].map(comboNode)
};

const idCache = new Map();
const documentStub = {
  createElement: (tag) => makeNode(tag),
  getElementById: (id) => { if (!idCache.has(id)) idCache.set(id, makeNode('div')); return idCache.get(id); },
  querySelector: () => makeNode('div'),
  querySelectorAll: (sel) => (selectors[sel] ? selectors[sel]() : []),
  addEventListener: () => {},
  removeEventListener: () => {},
  hidden: false,
  visibilityState: 'visible',
  fullscreenElement: null
};
documentStub.body = makeNode('body');
documentStub.documentElement = makeNode('html');
documentStub.head = makeNode('head');

const LS = {
  _d: {},
  getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; },
  clear() { this._d = {}; }
};

if (seed) {
  // Simula un guardado antiguo: checkpoint con player sin arreglo P.
  LS.setItem('arena_serpientes_save_v2', JSON.stringify({
    version: 2, best: 100, coins: 500, ownedSkills: ['dash'], skillLoadout: ['dash', '', '', ''],
    stats: {}, sessions: [{ id: 'survival-x', name: 'Supervivencia', mode: 'survival', createdAt: 1, updatedAt: 2, level: 3, score: 50, ended: false, checkpoint: { mode: 'survival', level: 3, score: 50, player: { n: 30, max: 100, hp: 100, sc: 1.2, h: 0, col: '#fff' }, enemies: [], spawnQ: [], U: {} } }],
    activeSessionId: 'survival-x', achievements: [], skillFragments: 0, skillMasteries: {}, campaignResults: {}
  }));
}

let now = 1000;
const rafQueue = [];
const sandbox = {
  console,
  Math, Date, JSON, Object, Array, Number, String, Boolean, Set, Map, Promise, Error, TypeError, isNaN, parseInt, parseFloat, Infinity, NaN, undefined,
  setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: (h) => clearTimeout(h),
  setInterval: (fn, ms) => setInterval(fn, ms), clearInterval: (h) => clearInterval(h),
  performance: { now: () => now },
  requestAnimationFrame: (cb) => { rafQueue.push(cb); return rafQueue.length; },
  cancelAnimationFrame: () => {},
  devicePixelRatio: 1,
  document: documentStub,
  localStorage: LS,
  navigator: { maxTouchPoints: 0, deviceMemory: 8, hardwareConcurrency: 8, userAgent: 'node-harness' },
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {}, removeEventListener() {}, removeListener() {} }),
  location: { href: 'http://localhost/', replace() {}, origin: 'http://localhost' },
  confirm: () => false,
  alert: () => {},
  getComputedStyle: () => strProxy({}),
  AudioContext: function () { return { createGain: () => ({ gain: { value: 1 }, connect() {}, disconnect() {} }), destination: {}, currentTime: 0, state: 'running', resume() {}, suspend() {} }; }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.addEventListener = () => {};
sandbox.removeEventListener = () => {};

const context = vm.createContext(sandbox);
const script = new vm.Script(src, { filename: 'game.js' });

function runFrame(label) {
  now += 16.7;
  const q = rafQueue.splice(0, rafQueue.length);
  for (const cb of q) {
    try { cb(now); } catch (e) { console.log('[' + label + '] ERROR en rAF:', e && e.stack ? e.stack : e); return e; }
  }
  return null;
}

try {
  script.runInContext(context, { filename: 'game.js' });
  console.log('BOOT OK (sin excepción sincrona)');
} catch (e) {
  console.log('ERROR en arranque sincrono:', e && e.stack ? e.stack : e);
  process.exit(0);
}

// Simular 5 fotogramas (el loader y el bucle principal).
for (let i = 0; i < 5; i++) { const e = runFrame('frame' + i); if (e) break; }

const peek = sandbox.__peek;
if (typeof peek === 'function') console.log('estado:', JSON.stringify(peek().state));

if (seed) {
  console.log('--- probando continueSavedGame con checkpoint parcial ---');
  try { sandbox.__continue('survival-x'); console.log('continue OK'); }
  catch (e) { console.log('ERROR en continueSavedGame:', e && e.stack ? e.stack : e); }
}
