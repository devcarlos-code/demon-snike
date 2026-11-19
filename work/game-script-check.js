'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) throw new Error('Falta el archivo: ' + relativePath);
  return fs.readFileSync(absolutePath, 'utf8');
}

function checkJavaScript(relativePath) {
  new Function(read(relativePath));
  console.log('OK JavaScript: ' + relativePath);
}

function checkHtml() {
  const html = read('outputs/index.html');
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) throw new Error('IDs HTML duplicados: ' + [...new Set(duplicates)].join(', '));

  const localAssets = [...html.matchAll(/(?:src|href)=["'](\.\/[^"'#?]+)["']/g)].map(match => match[1]);
  for (const asset of localAssets) read(path.posix.join('outputs', asset.slice(2)));
  if (!(html.indexOf('src="./auth.js"') < html.indexOf('src="./game.js"'))) {
    throw new Error('auth.js debe cargarse antes de game.js');
  }
  console.log('OK HTML: ' + ids.length + ' IDs únicos; ' + localAssets.length + ' referencias locales válidas');
}

function checkGameDomReferences() {
  const html = read('outputs/index.html');
  const game = read('outputs/game.js');
  const htmlIds = new Set([...html.matchAll(/\\bid=["']([^"']+)["']/g)].map(match => match[1]));
  const referencedIds = new Set([...game.matchAll(/\\$\\(['"]([^'"]+)['"]\\)/g)].map(match => match[1]));
  // Estos IDs se crean al abrir una vista o son opcionales por diseño.
  const dynamicOrOptionalIds = new Set(['skinPreviewCanvas', 'runtimeError', 'tbest']);
  const missing = [...referencedIds].filter(id => !htmlIds.has(id) && !dynamicOrOptionalIds.has(id));
  if (missing.length) throw new Error('El juego referencia IDs que no existen en el HTML: ' + missing.join(', '));
  console.log('OK DOM: ' + referencedIds.size + ' referencias; sin IDs obligatorios ausentes');
}

function checkServiceWorker() {
  const worker = read('outputs/service-worker.js');
  const match = worker.match(/const CACHE\s*=\s*'([^']+)'/);
  if (!match || !/^arena-serpientes-v\d+$/.test(match[1])) {
    throw new Error('Versión de caché del Service Worker inválida');
  }
  const filesMatch = worker.match(/const FILES\s*=\s*(\[[\s\S]*?\]);/);
  if (!filesMatch) throw new Error('No se encontró la lista FILES del Service Worker');
  const files = [...filesMatch[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
  for (const file of files) {
    if (file === './') continue;
    read(path.posix.join('outputs', file.replace(/^\.\//, '')));
  }
  console.log('OK Service Worker: ' + match[1] + '; ' + files.length + ' recursos existentes');
}

function checkCss() {
  const css = read('outputs/styles.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const opens = (css.match(/{/g) || []).length;
  const closes = (css.match(/}/g) || []).length;
  if (opens !== closes) throw new Error('Llaves CSS desbalanceadas: ' + opens + ' abiertas / ' + closes + ' cerradas');
  console.log('OK CSS: llaves balanceadas (' + opens + ' bloques)');
}

function checkManifest() {
  JSON.parse(read('outputs/manifest.webmanifest'));
  console.log('OK Manifest: JSON válido');
}

try {
  checkJavaScript('outputs/game.js');
  checkJavaScript('outputs/auth.js');
  checkJavaScript('outputs/service-worker.js');
  checkHtml();
  checkGameDomReferences();
  checkServiceWorker();
  checkCss();
  checkManifest();
  console.log('VALIDACIÓN COMPLETA: sin errores estáticos detectados.');
} catch (error) {
  console.error('VALIDACIÓN FALLIDA: ' + error.message);
  process.exitCode = 1;
}
