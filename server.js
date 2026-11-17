// MUSIC WORLD - servidor. Bandcamp NO tiene API pública de búsqueda:
// leemos su página pública de resultados y reproducimos con su reproductor oficial (iframe).
const express = require('express');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const cache = new Map();
const TTL = 10 * 60 * 1000;

async function getHtml(url) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.t < TTL) return hit.html;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MusicWorld/1.0)', 'Accept-Language': 'en' },
      signal: ctrl.signal
    });
    if (!r.ok) throw new Error('Bandcamp respondió con estado ' + r.status);
    const html = await r.text();
    if (cache.size > 200) cache.clear();
    cache.set(url, { html, t: Date.now() });
    return html;
  } finally { clearTimeout(timer); }
}

function parseResults(html) {
  const $ = cheerio.load(html);
  const items = [];
  $('li.searchresult').each((_, el) => {
    const $el = $(el);
    let meta = {};
    try { meta = JSON.parse($el.attr('data-search') || '{}'); } catch (e) {}
    const kind = $el.find('.itemtype').text().trim().toUpperCase();
    const type = meta.type || { ALBUM: 'a', TRACK: 't', ARTIST: 'b' }[kind];
    if (!['a', 't', 'b'].includes(type)) return;
    const title = $el.find('.heading').text().replace(/\s+/g, ' ').trim();
    const sub = $el.find('.subhead').text().replace(/\s+/g, ' ').trim();
    const url = ($el.find('.itemurl').text().trim() || $el.find('.heading a').attr('href') || '').split('?')[0];
    if (!title || !url) return;
    const by = sub.match(/\bby\s+(.+)$/i);
    items.push({
      type, id: meta.id || null, title, url,
      artist: type === 'b' ? title : (by ? by[1] : sub),
      sub, cover: $el.find('.art img').attr('src') || ''
    });
  });
  return items;
}

app.get('/api/search', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 100);
  const type = ['a', 't', 'b'].includes(req.query.type) ? req.query.type : '';
  const page = Math.min(Math.max(parseInt(req.query.page, 10) || 1, 1), 20);
  if (!q) return res.status(400).json({ error: 'Escribe algo para buscar.' });
  const url = 'https://bandcamp.com/search?q=' + encodeURIComponent(q) +
    (type ? '&item_type=' + type : '') + '&page=' + page;
  try {
    const items = parseResults(await getHtml(url)).filter(i => i.type === 'b' || i.id);
    res.json({ items, page });
  } catch (e) {
    res.status(502).json({ error: 'No se pudo conectar con Bandcamp (' + (e.name === 'AbortError' ? 'tiempo agotado' : e.message) + '). Inténtalo de nuevo.' });
  }
});

app.get('/health', (_, res) => res.send('ok'));
app.use(express.static(path.join(__dirname, 'public')));
app.listen(PORT, () => console.log('MUSIC WORLD en http://localhost:' + PORT));
