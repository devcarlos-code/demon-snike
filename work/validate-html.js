const fs = require('fs');
const p = 'C:/Users/Corel/OneDrive/Desktop/html/demon-snike/outputs/index.html';
const h = fs.readFileSync(p, 'utf8');

// 1) IDs duplicados
const ids = {};
let m;
const idRe = / id="([^"]+)"/g;
while ((m = idRe.exec(h))) ids[m[1]] = (ids[m[1]] || 0) + 1;
const dup = Object.keys(ids).filter(k => ids[k] > 1);
console.log('IDs duplicados: ' + (dup.length ? dup.join(', ') : 'ninguno'));

// 2) Botones sin type
const btnAll = h.match(/<button[^>]*>/g) || [];
const btnNoType = btnAll.filter(b => !/ type=/.test(b));
console.log('Botones totales: ' + btnAll.length + ' · sin type: ' + btnNoType.length);
btnNoType.forEach(b => {
  const line = h.slice(0, h.indexOf(b)).split('\n').length;
  console.log('  L' + line + ': ' + b.slice(0, 90));
});

// 3) Imágenes sin alt
const imgs = h.match(/<img[^>]*>/g) || [];
console.log('imgs: ' + imgs.length + ' · sin alt: ' + imgs.filter(i => !/ alt=/.test(i)).length);

// 4) Balance de etiquetas de bloque (ignora void y el contenido <script>/<style>)
const body = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
const tags = ['div', 'section', 'article', 'header', 'footer', 'nav', 'main', 'span', 'p', 'button', 'label', 'form', 'ul', 'li', 'h1', 'h2', 'h3', 'b', 'small', 'strong', 'em', 'i', 'select', 'option', 'output'];
tags.forEach(t => {
  const open = (body.match(new RegExp('<' + t + '(\\s|>)', 'g')) || []).length;
  const close = (body.match(new RegExp('</' + t + '>', 'g')) || []).length;
  if (open !== close) console.log('DESBALANCE <' + t + '>: abre ' + open + ' / cierra ' + close);
});
console.log('Balance de etiquetas: revisado');

// 5) Atributos HTML repetidos en la misma etiqueta
const attrDup = [];
(body.match(/<[a-zA-Z][^>]*>/g) || []).forEach(tag => {
  const attrs = (tag.match(/\s([a-zA-Z-]+)=/g) || []).map(a => a.trim().replace('=', ''));
  const seen = {};
  attrs.forEach(a => { if (seen[a]) attrDup.push(tag.slice(0, 60) + ' -> ' + a); seen[a] = 1; });
});
console.log('Atributos repetidos: ' + (attrDup.length ? attrDup.length : 'ninguno'));

// 6) Accesibilidad básica
const ariaLabelledby = h.match(/aria-labelledby="([^"]+)"/g) || [];
const missing = [];
ariaLabelledby.forEach(a => {
  const id = a.replace(/aria-labelledby="|"/g, '');
  if (!new RegExp(' id="' + id + '"').test(h)) missing.push(id);
});
console.log('aria-labelledby sin destino: ' + (missing.length ? missing.join(', ') : 'ninguno'));

// 7) Recursos externos y sintaxis del JavaScript
['./styles.css', './game.js'].forEach(ref => {
  console.log(ref + ' referenciado en el HTML: ' + (h.includes(ref) ? 'sí' : 'NO'));
});
try {
  const js = fs.readFileSync('C:/Users/Corel/OneDrive/Desktop/html/demon-snike/outputs/game.js', 'utf8');
  try {
    new Function(js);
    console.log('game.js sintaxis: OK (' + js.split('\n').length + ' líneas)');
  } catch (e) {
    console.log('game.js SINTAXIS ERROR: ' + e.message);
  }
} catch (e) {
  console.log('game.js no encontrado: ' + e.message);
}
