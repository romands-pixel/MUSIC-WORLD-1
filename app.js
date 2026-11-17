const $ = s => document.querySelector(s);
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const K = i => i.type + ':' + i.id;

const CATS = { 'Reguetón': 'reggaeton', 'Trap': 'trap', 'Rap': 'rap', 'Hip-hop': 'hip hop', 'Pop': 'pop', 'Rock': 'rock',
  'Electrónica': 'electronic', 'Música latina': 'latin', 'Música romántica': 'romantic', 'Música cristiana': 'christian worship',
  'Música instrumental': 'instrumental', 'Música clásica': 'classical', 'Música urbana': 'urban latino', 'Música internacional': 'world music' };

let fav = load('mw_fav', []), lib = load('mw_lib', []), hist = load('mw_hist', []), lists = load('mw_lists', {});
let reg = new Map(), sections = {}, queue = [], qi = -1, shuffle = false, repeat = false, current = null;
const persist = () => { save('mw_fav', fav); save('mw_lib', lib); save('mw_hist', hist); save('mw_lists', lists); };
const has = (arr, i) => arr.some(x => K(x) === K(i));

function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2500); }

async function api(path) {
  let r;
  try { r = await fetch(path); } catch (e) { throw new Error('Sin conexión con el servidor. Revisa tu internet.'); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Error ' + r.status);
  return d;
}
const search = (q, type = '', page = 1) => api(`/api/search?q=${encodeURIComponent(q)}&type=${type}&page=${page}`).then(d => d.items);

function card(i, sid) {
  reg.set(K(i), i);
  const k = esc(K(i)), art = i.type === 'b', label = { a: 'Álbum', t: 'Canción', b: 'Artista' }[i.type];
  const inList = sid.startsWith('pl:');
  return `<article class="card"><div class="cv">${i.cover ? `<img loading="lazy" src="${esc(i.cover)}" alt="" onerror="this.remove()">` : ''}
    ${art ? '' : `<button class="pl" data-a="play" data-k="${k}" data-s="${esc(sid)}" title="Reproducir">▶</button>`}</div>
    <h4 title="${esc(i.title)}">${esc(i.title)}</h4><p>${label} · ${esc(i.artist)}</p>
    <div class="ac">${art ? `<button data-a="disc" data-k="${k}">Discografía</button>` :
      `<button data-a="fav" data-k="${k}" class="${has(fav, i) ? 'on' : ''}" title="Favorito">♥</button>
       <button data-a="add" data-k="${k}" title="Añadir a…">＋</button>${inList ? `<button data-a="rm" data-k="${k}" data-s="${esc(sid)}" title="Quitar">✕</button>` : ''}`}
      <a href="${esc(i.url)}" target="_blank" rel="noopener noreferrer">Bandcamp ↗</a></div></article>`;
}
function grid(items, sid) {
  sections[sid] = items;
  return items.length ? `<div class="grid">${items.map(i => card(i, sid)).join('')}</div>` : '<div class="msg">No hay resultados.</div>';
}
const fail = e => `<div class="msg err">${esc(e.message)}<br><br><button onclick="route()">Reintentar</button></div>`;

/* ---------- navegación ---------- */
let cur = ['home'];
function buildNav() {
  const b = (v, a, t) => `<button data-v="${v}" data-arg="${esc(a || '')}" class="${cur[0] === v && (cur[1] || '') === (a || '') ? 'on' : ''}">${t}</button>`;
  $('#nav').innerHTML = b('home', '', '🏠 Inicio') + '<h5>Tu música</h5>' + b('favs', '', '♥ Favoritos') + b('lib', '', '📚 Biblioteca') +
    b('lists', '', '🎵 Listas') + b('hist', '', '🕘 Historial') + '<h5>Categorías</h5>' + Object.keys(CATS).map(c => b('cat', c, c)).join('');
}
async function route() {
  const [v, arg, type] = cur; buildNav(); const el = $('#view'); window.scrollTo(0, 0);
  const user = { favs: ['♥ Favoritos', fav], lib: ['📚 Biblioteca', lib], hist: ['🕘 Historial de reproducción', hist] };
  if (user[v]) {
    el.innerHTML = `<h2>${user[v][0]}</h2>` + (v === 'hist' && hist.length ? '<button data-a="clh">Borrar historial</button>' : '') +
      (user[v][1].length ? grid(user[v][1], v) : '<div class="msg">Aún no hay nada aquí. Usa ▶, ♥ y ＋ en cualquier portada.</div>');
  } else if (v === 'lists') {
    const names = Object.keys(lists);
    el.innerHTML = '<h2>🎵 Listas de reproducción</h2><button data-a="newl">Nueva lista</button>' +
      (names.map(n => `<h3>${esc(n)} <button data-a="dell" data-n="${esc(n)}">Eliminar</button></h3>${grid(lists[n], 'pl:' + n)}`).join('') ||
       '<div class="msg">Crea tu primera lista y añade canciones con ＋.</div>');
  } else if (v === 'home') {
    el.innerHTML = '<div class="msg">Cargando música de Bandcamp…</div>';
    const pick = Object.values(CATS).sort(() => Math.random() - .5), rec = hist[0] ? hist[0].artist : pick[3];
    const jobs = [['Canciones populares', pick[0], 't', 'h1'], ['Álbumes destacados', pick[1], 'a', 'h2'], ['Artistas recomendados', pick[2], 'b', 'h3'],
      ['Recomendaciones musicales', rec, 'a', 'h4']];
    const res = await Promise.allSettled(jobs.map(j => search(j[1], j[2])));
    const last = hist.length ? `<h3>Últimas reproducciones</h3>${grid(hist.slice(0, 6), 'hl')}` : '';
    el.innerHTML = '<h2>Bienvenido a MUSIC WORLD</h2>' + last + jobs.map((j, n) => `<h3>${j[0]}</h3>` + (res[n].status === 'fulfilled' ? grid(res[n].value.slice(0, 12), j[3]) : fail(res[n].reason))).join('');
  } else {
    const q = v === 'cat' ? CATS[arg] : arg, t = v === 'cat' ? 't' : type || '';
    el.innerHTML = `<h2>${v === 'cat' ? esc(arg) : 'Resultados para “' + esc(arg) + '”'}</h2><div class="msg">Buscando…</div>`;
    try {
      let items = await search(q, t), body = v === 'cat' ? '<h3>Canciones</h3>' + grid(items, 's1') : grid(items, 's1');
      if (v === 'cat') body += '<h3>Álbumes</h3>' + grid(await search(q, 'a'), 's2') + '<h3>Artistas</h3>' + grid(await search(q, 'b'), 's3');
      el.innerHTML = el.querySelector('h2').outerHTML + body;
    } catch (e) { el.innerHTML = el.querySelector('h2').outerHTML + fail(e); }
  }
}
const go = (...a) => { cur = a; route(); };

/* ---------- reproductor (embed oficial de Bandcamp) ---------- */
function playItem(i) {
  current = i; reg.set(K(i), i);
  $('#pc').src = i.cover || ''; $('#pt').textContent = i.title; $('#pa').textContent = i.artist;
  const kind = i.type === 'a' ? 'album' : 'track';
  $('#embed').innerHTML = `<iframe title="Reproductor Bandcamp" src="https://bandcamp.com/EmbeddedPlayer/${kind}=${encodeURIComponent(i.id)}/size=small/bgcol=0b0614/linkcol=8b5cf6/transparent=true/" seamless></iframe>`;
  hist = [i, ...hist.filter(x => K(x) !== K(i))].slice(0, 50); persist(); favBtn();
  toast('Pulsa play en el reproductor de Bandcamp para escuchar.');
}
function start(sid, k) {
  queue = (sections[sid] || []).filter(x => x.type !== 'b'); qi = queue.findIndex(x => K(x) === k);
  if (qi < 0) { queue = [reg.get(k)]; qi = 0; }
  playItem(queue[qi]);
}
function step(dir) {
  if (!queue.length) return toast('Primero elige una canción o álbum.');
  if (shuffle && queue.length > 1) { let n; do n = Math.floor(Math.random() * queue.length); while (n === qi); qi = n; }
  else { qi += dir; if (qi >= queue.length) { if (!repeat) return toast('Fin de la lista.'); qi = 0; } if (qi < 0) qi = 0; }
  playItem(queue[qi]);
}
function favBtn() { $('#bfav').classList.toggle('on', !!current && has(fav, current)); }
function toggleFav(i) { fav = has(fav, i) ? fav.filter(x => K(x) !== K(i)) : [i, ...fav]; persist(); favBtn(); }

/* ---------- diálogo "añadir a" ---------- */
function openAdd(i) {
  const d = $('#dlg');
  d.innerHTML = `<h3>Añadir “${esc(i.title)}”</h3><button data-d="lib">${has(lib, i) ? '✓ En' : 'Añadir a'} la biblioteca</button>` +
    Object.keys(lists).map(n => `<button data-d="l" data-n="${esc(n)}">${has(lists[n], i) ? '✓ ' : ''}${esc(n)}</button>`).join('') +
    '<button data-d="new">＋ Nueva lista…</button><button data-d="x">Cerrar</button>';
  d.dataset.k = K(i); d.showModal();
}
$('#dlg').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; const d = $('#dlg'), i = reg.get(d.dataset.k), a = b.dataset.d;
  if (a === 'lib') lib = has(lib, i) ? lib.filter(x => K(x) !== K(i)) : [i, ...lib];
  else if (a === 'l') lists[b.dataset.n] = has(lists[b.dataset.n], i) ? lists[b.dataset.n].filter(x => K(x) !== K(i)) : [...lists[b.dataset.n], i];
  else if (a === 'new') { const n = (prompt('Nombre de la lista:') || '').trim(); if (n) { lists[n] = lists[n] || []; lists[n].push(i); } }
  persist(); d.close(); if (a !== 'x') toast('Guardado'); if (['favs', 'lib', 'lists'].includes(cur[0])) route();
});

/* ---------- eventos ---------- */
document.addEventListener('click', e => {
  const n = e.target.closest('#nav button'); if (n) return go(n.dataset.v, n.dataset.arg);
  const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, i = reg.get(b.dataset.k);
  if (a === 'play') start(b.dataset.s, b.dataset.k);
  else if (a === 'fav') { toggleFav(i); b.classList.toggle('on'); }
  else if (a === 'add') openAdd(i);
  else if (a === 'disc') go('search', i.title, 'a');
  else if (a === 'rm') { const nm = b.dataset.s.slice(3); lists[nm] = lists[nm].filter(x => K(x) !== K(i)); persist(); route(); }
  else if (a === 'newl') { const nm = (prompt('Nombre de la lista:') || '').trim(); if (nm) { lists[nm] = lists[nm] || []; persist(); route(); } }
  else if (a === 'dell') { if (confirm('¿Eliminar la lista?')) { delete lists[b.dataset.n]; persist(); route(); } }
  else if (a === 'clh') { hist = []; persist(); route(); }
});
$('#sf').addEventListener('submit', e => { e.preventDefault(); const q = $('#q').value.trim(); if (q) go('search', q, $('#qt').value); });
$('#bnext').onclick = () => step(1); $('#bprev').onclick = () => step(-1);
$('#bshuf').onclick = e => { shuffle = !shuffle; e.currentTarget.classList.toggle('on', shuffle); toast(shuffle ? 'Aleatorio activado' : 'Aleatorio desactivado'); };
$('#brep').onclick = e => { repeat = !repeat; e.currentTarget.classList.toggle('on', repeat); toast(repeat ? 'Repetir lista activado' : 'Repetir lista desactivado'); };
$('#bfav').onclick = () => current ? toggleFav(current) : toast('Elige algo para escuchar primero.');
route();
