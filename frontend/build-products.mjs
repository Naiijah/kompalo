// Programmatic SEO: one static, crawlable page per product × language,
// generated from the live API. Each page ships a translated <head>,
// hreflang alternates, Product/Offer JSON-LD, a static price table with
// affiliate links (rel="sponsored nofollow"), and a CTA to the live app.
//
// Run AFTER build-i18n.mjs (it appends product URLs to the sitemap it wrote):
//   node frontend/build-products.mjs
//
// Env:
//   SITE_BASE  absolute site origin (default https://kompalo.com)
//   OUT_DIR    output directory (default: alongside this script)
//   API_BASE   backend API (default: live Railway URL)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const DIR = dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.SITE_BASE || 'https://kompalo.com').replace(/\/+$/, '');
const OUT = resolve(process.env.OUT_DIR || DIR);
const API = (process.env.API_BASE || 'https://europrice-backend-production.up.railway.app').replace(/\/+$/, '');
// Demo prices must NOT be indexed by Google (misleading + thin content that would
// hurt the domain's trust). Default noindex ON; set NOINDEX=false once the site
// serves real Amazon PA-API prices, then rebuild.
const NOINDEX = process.env.NOINDEX !== 'false';

const LANGS = ['fr', 'en', 'de', 'it', 'es', 'nl', 'sv', 'pl'];
const LANG_PATH = (l) => (l === 'fr' ? '' : l + '/');
const LOCALE = { fr: 'fr-FR', en: 'en-GB', de: 'de-DE', it: 'it-IT', es: 'es-ES', nl: 'nl-NL', sv: 'sv-SE', pl: 'pl-PL' };
const FLAG_ISO = { DE: 'de', FR: 'fr', IT: 'it', ES: 'es', NL: 'nl', SE: 'se', PL: 'pl', UK: 'gb' };

const CO = {
  fr: { DE: 'Allemagne', UK: 'Royaume-Uni', FR: 'France', ES: 'Espagne', IT: 'Italie', SE: 'Suède', NL: 'Pays-Bas', PL: 'Pologne' },
  en: { DE: 'Germany', UK: 'United Kingdom', FR: 'France', ES: 'Spain', IT: 'Italy', SE: 'Sweden', NL: 'Netherlands', PL: 'Poland' },
  de: { DE: 'Deutschland', UK: 'Vereinigtes Königreich', FR: 'Frankreich', ES: 'Spanien', IT: 'Italien', SE: 'Schweden', NL: 'Niederlande', PL: 'Polen' },
  it: { DE: 'Germania', UK: 'Regno Unito', FR: 'Francia', ES: 'Spagna', IT: 'Italia', SE: 'Svezia', NL: 'Paesi Bassi', PL: 'Polonia' },
  es: { DE: 'Alemania', UK: 'Reino Unido', FR: 'Francia', ES: 'España', IT: 'Italia', SE: 'Suecia', NL: 'Países Bajos', PL: 'Polonia' },
  nl: { DE: 'Duitsland', UK: 'Verenigd Koninkrijk', FR: 'Frankrijk', ES: 'Spanje', IT: 'Italië', SE: 'Zweden', NL: 'Nederland', PL: 'Polen' },
  sv: { DE: 'Tyskland', UK: 'Storbritannien', FR: 'Frankrike', ES: 'Spanien', IT: 'Italien', SE: 'Sverige', NL: 'Nederländerna', PL: 'Polen' },
  pl: { DE: 'Niemcy', UK: 'Wielka Brytania', FR: 'Francja', ES: 'Hiszpania', IT: 'Włochy', SE: 'Szwecja', NL: 'Holandia', PL: 'Polska' },
};

const T = {
  fr: { t: (n) => `prix Amazon dans ${n} pays`, d: (t, p, c) => `Meilleur prix pour ${t} : ${p} en ${c}. Comparez les prix Amazon de plusieurs pays européens et économisez.`,
    h2: 'Prix Amazon par pays', best: 'Meilleur prix', view: 'Voir sur Amazon', save: (a, p) => `Économisez ${a} (${p} %)`, vs: (c, d) => `${c} vs ${d}`,
    cta: 'Comparer en temps réel sur Kompalo →', upd: (d) => `Prix relevés le ${d}. Prix indicatifs, vérifiez le prix final sur Amazon.`,
    oos: 'rupture de stock', disc: 'En tant que Partenaire Amazon, Kompalo perçoit une commission sur les achats remplissant les conditions requises.' },
  en: { t: (n) => `Amazon prices in ${n} countries`, d: (t, p, c) => `Best price for ${t}: ${p} in ${c}. Compare Amazon prices across European countries and save.`,
    h2: 'Amazon prices by country', best: 'Best price', view: 'View on Amazon', save: (a, p) => `Save ${a} (${p}%)`, vs: (c, d) => `${c} vs ${d}`,
    cta: 'Compare in real time on Kompalo →', upd: (d) => `Prices captured on ${d}. Indicative, check the final price on Amazon.`,
    oos: 'out of stock', disc: 'As an Amazon Associate, Kompalo earns a commission on qualifying purchases.' },
  de: { t: (n) => `Amazon-Preise in ${n} Ländern`, d: (t, p, c) => `Bester Preis für ${t}: ${p} in ${c}. Vergleiche Amazon-Preise in mehreren europäischen Ländern und spare.`,
    h2: 'Amazon-Preise nach Land', best: 'Bestpreis', view: 'Bei Amazon ansehen', save: (a, p) => `Spare ${a} (${p} %)`, vs: (c, d) => `${c} vs. ${d}`,
    cta: 'In Echtzeit auf Kompalo vergleichen →', upd: (d) => `Preise erfasst am ${d}. Richtwerte, endgültigen Preis bei Amazon prüfen.`,
    oos: 'nicht verfügbar', disc: 'Als Amazon-Partner verdient Kompalo an qualifizierten Käufen eine Provision.' },
  it: { t: (n) => `prezzi Amazon in ${n} paesi`, d: (t, p, c) => `Miglior prezzo per ${t}: ${p} in ${c}. Confronta i prezzi Amazon di più paesi europei e risparmia.`,
    h2: 'Prezzi Amazon per paese', best: 'Miglior prezzo', view: 'Vedi su Amazon', save: (a, p) => `Risparmia ${a} (${p}%)`, vs: (c, d) => `${c} vs ${d}`,
    cta: 'Confronta in tempo reale su Kompalo →', upd: (d) => `Prezzi rilevati il ${d}. Indicativi, verifica il prezzo finale su Amazon.`,
    oos: 'esaurito', disc: 'In qualità di Affiliato Amazon, Kompalo riceve una commissione sugli acquisti idonei.' },
  es: { t: (n) => `precios de Amazon en ${n} países`, d: (t, p, c) => `Mejor precio de ${t}: ${p} en ${c}. Compara los precios de Amazon en varios países europeos y ahorra.`,
    h2: 'Precios de Amazon por país', best: 'Mejor precio', view: 'Ver en Amazon', save: (a, p) => `Ahorra ${a} (${p} %)`, vs: (c, d) => `${c} vs ${d}`,
    cta: 'Compara en tiempo real en Kompalo →', upd: (d) => `Precios registrados el ${d}. Orientativos, comprueba el precio final en Amazon.`,
    oos: 'agotado', disc: 'Como Afiliado de Amazon, Kompalo obtiene una comisión por las compras que cumplan los requisitos.' },
  nl: { t: (n) => `Amazon-prijzen in ${n} landen`, d: (t, p, c) => `Beste prijs voor ${t}: ${p} in ${c}. Vergelijk Amazon-prijzen in meerdere Europese landen en bespaar.`,
    h2: 'Amazon-prijzen per land', best: 'Beste prijs', view: 'Bekijk op Amazon', save: (a, p) => `Bespaar ${a} (${p}%)`, vs: (c, d) => `${c} vs ${d}`,
    cta: 'Vergelijk in realtime op Kompalo →', upd: (d) => `Prijzen vastgelegd op ${d}. Indicatief, controleer de definitieve prijs op Amazon.`,
    oos: 'niet op voorraad', disc: 'Als Amazon-partner verdient Kompalo een commissie op kwalificerende aankopen.' },
  sv: { t: (n) => `Amazon-priser i ${n} länder`, d: (t, p, c) => `Bästa priset för ${t}: ${p} i ${c}. Jämför Amazon-priser i flera europeiska länder och spara.`,
    h2: 'Amazon-priser per land', best: 'Bästa pris', view: 'Visa på Amazon', save: (a, p) => `Spara ${a} (${p} %)`, vs: (c, d) => `${c} mot ${d}`,
    cta: 'Jämför i realtid på Kompalo →', upd: (d) => `Priser hämtade ${d}. Ungefärliga, kontrollera slutpriset på Amazon.`,
    oos: 'slut i lager', disc: 'Som Amazon-partner tjänar Kompalo en provision på kvalificerande köp.' },
  pl: { t: (n) => `ceny Amazon w ${n} krajach`, d: (t, p, c) => `Najlepsza cena ${t}: ${p} w ${c}. Porównaj ceny Amazon w kilku krajach europejskich i oszczędzaj.`,
    h2: 'Ceny Amazon według kraju', best: 'Najlepsza cena', view: 'Zobacz na Amazon', save: (a, p) => `Oszczędź ${a} (${p}%)`, vs: (c, d) => `${c} vs ${d}`,
    cta: 'Porównaj na żywo na Kompalo →', upd: (d) => `Ceny pobrane ${d}. Orientacyjne, sprawdź ostateczną cenę na Amazon.`,
    oos: 'brak w magazynie', disc: 'Jako Partner Amazon, Kompalo otrzymuje prowizję od kwalifikujących się zakupów.' },
};

const fmt = (n, cur, lang) => new Intl.NumberFormat(LOCALE[lang], { style: 'currency', currency: cur }).format(n);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function slugify(title) {
  return title.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/g, '');
}

async function getJson(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}

// Demo catalogue baked into index.html (the app's own offline-sample fallback).
// Lets the product pages build with NO backend at all, so the whole site runs
// free and static until real Amazon prices are wired in. Single source of truth:
// the SAMPLE object in index.html.
function bakedSample() {
  try {
    const html = readFileSync(join(DIR, 'index.html'), 'utf8');
    const m = html.match(/const SAMPLE\s*=\s*(\{[\s\S]*?\n\})\s*;/);
    if (!m) return [];
    const S = new Function('return ' + m[1])();
    return Object.entries(S).map(([k, s]) => ({
      productId: 'demo-' + k, title: s.title, brand: s.brand, imageUrl: s.img,
      listings: s.prices.map(([marketplace, amount]) => ({ marketplace, amount, currency: 'EUR', inStock: true, url: '#' })),
    }));
  } catch { return []; }
}

// ---- fetch data ----
// Resilient in CI: if the API is momentarily unreachable, don't fail the whole
// deploy, skip product pages so the language site still ships. A prior run's
// product URLs get stripped from the sitemap so we never advertise stale pages.
let products;
try {
  ({ products } = await getJson(`${API}/api/popular?limit=24`));
} catch (e) {
  console.warn(`products: API unreachable (${e.message}), using the baked demo catalogue`);
  products = [];
}
// No live API (the mock backend is offline): fall back to the demo catalogue
// baked into index.html so the whole site still builds fully static and free.
if (!products || !products.length) {
  products = bakedSample();
  if (products.length) console.warn(`products: built ${products.length} products from baked sample (no backend needed)`);
}
if (!products || !products.length) {
  const smPath0 = join(OUT, 'sitemap.xml');
  if (existsSync(smPath0)) {
    writeFileSync(smPath0, readFileSync(smPath0, 'utf8').replace(/<!--products-->[\s\S]*?(?=<\/urlset>)/, ''), 'utf8');
  }
  console.warn('products: no data available at all, language pages only.');
  process.exit(0);
}

// FX for EUR-equivalent sorting (same ECB source as the app). Fallback: static.
let FX = { EUR: 1, GBP: 0.86, USD: 1.16, SEK: 11, PLN: 4.3, CHF: 0.93 };
try { const d = await getJson('https://api.frankfurter.app/latest?from=EUR&to=GBP,USD,SEK,PLN,CHF'); FX = { EUR: 1, ...d.rates }; }
catch { console.warn('products: FX fetch failed, using fallback rates'); }
const toEur = (amount, cur) => (cur === 'EUR' ? amount : amount / (FX[cur] || 1));

const buildDate = new Date();

function pageHtml(p, lang, slug, allSlugsAlternates) {
  const t = T[lang]; const co = CO[lang];
  const rows = p.listings
    .map((l) => ({ ...l, eur: toEur(l.amount, l.currency) }))
    .sort((a, b) => a.eur - b.eur);
  if (!rows.length) return null;
  const cheap = rows[0], dear = rows[rows.length - 1];
  const savEur = dear.eur - cheap.eur;
  const savPct = dear.eur > 0 ? Math.round((1 - cheap.eur / dear.eur) * 100) : 0;
  const n = rows.length;
  const langRoot = `${BASE}/${LANG_PATH(lang)}`;
  const pageUrl = `${langRoot}p/${slug}/`;
  const title = `${p.title} : ${t.t(n)} | Kompalo`;
  const desc = t.d(p.title, fmt(cheap.amount, cheap.currency, lang), co[cheap.marketplace] || cheap.marketplace);
  const dateStr = new Intl.DateTimeFormat(LOCALE[lang], { dateStyle: 'long' }).format(buildDate);

  const jsonld = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: p.title, image: p.imageUrl || undefined,
    brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
    offers: rows.map((r) => ({
      '@type': 'Offer', price: r.amount.toFixed(2), priceCurrency: r.currency,
      availability: r.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: r.url && r.url !== '#' ? r.url : pageUrl,
    })),
  };

  const tableRows = rows.map((r, i) => {
    const approx = r.currency !== 'EUR' ? ` <span class="ax">≈ ${fmt(r.eur, 'EUR', lang)}</span>` : '';
    const link = r.url && r.url !== '#'
      ? `<a href="${esc(r.url)}" target="_blank" rel="sponsored nofollow noopener">${t.view} ↗</a>` : '';
    return `<tr class="${i === 0 ? 'best' : ''}"><td class="rk">${String(i + 1).padStart(2, '0')}</td>` +
      `<td><span class="fi fi-${FLAG_ISO[r.marketplace] || ''}"></span> ${co[r.marketplace] || r.marketplace}` +
      `${i === 0 ? `<span class="chip">${t.best}</span>` : ''}${!r.inStock ? `<span class="oos">${t.oos}</span>` : ''}</td>` +
      `<td class="pa">${fmt(r.amount, r.currency, lang)}${approx}</td><td class="go">${link}</td></tr>`;
  }).join('\n');

  const hreflangs = allSlugsAlternates.map(({ l, href }) => `<link rel="alternate" hreflang="${l}" href="${href}" />`).join('\n');

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='24' fill='%23df4324'/%3E%3Ctext x='50' y='52' dy='.35em' text-anchor='middle' font-family='Georgia,serif' font-weight='700' font-size='66' fill='%23fff'%3EK%3C/text%3E%3C/svg%3E" />
<meta name="theme-color" content="#df4324" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<meta name="robots" content="${NOINDEX ? 'noindex,follow' : 'index,follow'}" />
<link rel="canonical" href="${pageUrl}" />
${hreflangs}
<link rel="alternate" hreflang="x-default" href="${BASE}/p/${slug}/" />
<meta property="og:type" content="product" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:url" content="${pageUrl}" />
${p.imageUrl ? `<meta property="og:image" content="${esc(p.imageUrl)}" />` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,900&family=Hanken+Grotesk:wght@400;600&family=Spline+Sans+Mono:wght@500;600&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flag-icons@7.2.3/css/flag-icons.min.css" />
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<style>
:root{--paper:#f3eee3;--panel:#fbf8f1;--ink:#1b1714;--soft:#6a5f54;--line:#d9cfbd;--verm:#df4324;--em:#1d7355;--tint:#fbe9e2}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Hanken Grotesk',system-ui,sans-serif;background:var(--paper);color:var(--ink);line-height:1.5;padding:24px 18px 60px}
.wrap{max-width:860px;margin:0 auto}
.logo{display:inline-flex;align-items:center;gap:9px;text-decoration:none;color:var(--ink);margin-bottom:26px}
.logo .mk{width:30px;height:30px;border-radius:8px;background:var(--verm);color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-weight:900;font-style:italic;font-size:17px;box-shadow:2.5px 2.5px 0 var(--ink)}
.logo .w{font-family:'Fraunces',serif;font-weight:900;font-size:20px}.logo .w i{color:var(--verm);font-weight:500}
.head{display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;margin-bottom:22px}
.img{width:132px;height:132px;background:#fff;border:1.5px solid var(--line);border-radius:12px;padding:12px;display:flex;align-items:center;justify-content:center;flex:none}
.img img{max-width:100%;max-height:100%;object-fit:contain;mix-blend-mode:multiply}
.brand{font-family:'Spline Sans Mono',monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--verm)}
h1{font-family:'Fraunces',serif;font-weight:900;font-size:clamp(24px,4.5vw,38px);line-height:1.05;letter-spacing:-.02em;margin:4px 0 8px}
.save{display:inline-block;background:var(--em);color:#f3eee3;border-radius:9px;padding:8px 14px;font-family:'Spline Sans Mono',monospace;font-size:13px;font-weight:600}
h2{font-family:'Fraunces',serif;font-weight:500;font-size:19px;margin:26px 0 10px}
table{width:100%;border-collapse:collapse;background:var(--panel);border:1.5px solid var(--ink);border-radius:12px;overflow:hidden}
td{padding:12px 12px;border-bottom:1px solid var(--line);font-size:15px;vertical-align:middle}
tr:last-child td{border-bottom:0}
tr.best{background:var(--tint)}
.rk{font-family:'Spline Sans Mono',monospace;color:var(--soft);width:36px}
tr.best .rk{color:var(--verm);font-weight:600}
.fi{border-radius:2px;box-shadow:0 0 0 .5px rgba(27,23,20,.15);margin-right:6px}
.chip{background:var(--verm);color:#fff;font-family:'Spline Sans Mono',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;padding:2px 7px;border-radius:5px;margin-left:8px}
.oos{color:var(--verm);font-family:'Spline Sans Mono',monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;margin-left:8px}
.pa{font-family:'Spline Sans Mono',monospace;font-weight:600;white-space:nowrap}
tr.best .pa{color:var(--verm)}
.ax{color:var(--soft);font-weight:500;font-size:12px}
.go a{color:var(--ink);font-size:13.5px;font-weight:600}
.upd{font-family:'Spline Sans Mono',monospace;font-size:11px;color:var(--soft);margin-top:10px}
.cta{display:block;text-align:center;margin:26px 0 0;background:var(--verm);color:#fff;text-decoration:none;font-family:'Spline Sans Mono',monospace;font-weight:600;font-size:13px;letter-spacing:.09em;text-transform:uppercase;padding:15px;border-radius:11px}
.cta:hover{background:#b8331a}
footer{margin-top:34px;border-top:1.5px solid var(--line);padding-top:14px;font-family:'Spline Sans Mono',monospace;font-size:10.5px;color:var(--soft);line-height:1.7}
@media(max-width:560px){.go a{font-size:12px}td{padding:10px 8px}}
</style>
</head>
<body>
<div class="wrap">
  <a class="logo" href="${langRoot}"><span class="mk">K</span><span class="w">Kompa<i>lo</i></span></a>
  <div class="head">
    ${p.imageUrl ? `<div class="img"><img src="${esc(p.imageUrl)}" alt="${esc((p.brand ? p.brand + ' ' : '') + p.title)}" /></div>` : ''}
    <div>
      ${p.brand ? `<div class="brand">${esc(p.brand)}</div>` : ''}
      <h1>${esc(p.title)}</h1>
      ${savEur > 0.5 ? `<span class="save">${t.save(fmt(savEur, 'EUR', lang), savPct)}, ${t.vs(co[cheap.marketplace] || cheap.marketplace, co[dear.marketplace] || dear.marketplace)}</span>` : ''}
    </div>
  </div>
  <h2>${t.h2}</h2>
  <table>${tableRows}</table>
  <p class="upd">${t.upd(dateStr)}</p>
  <a class="cta" href="${langRoot}?q=${encodeURIComponent(p.title.split(' ').slice(0, 3).join(' '))}">${t.cta}</a>
  <footer>${t.disc}<br>© Kompalo ${buildDate.getFullYear()}</footer>
</div>
</body>
</html>`;
}

// ---- generate ----
const seen = new Map();
const generated = []; // { slug, paths: Map(lang -> url) }
let pages = 0;
for (const p of products) {
  if (!p.listings || !p.listings.length) continue;
  let slug = slugify(p.title) || `product-${pages}`;
  if (seen.has(slug)) { let i = 2; while (seen.has(`${slug}-${i}`)) i++; slug = `${slug}-${i}`; }
  seen.set(slug, true);

  const alternates = LANGS.map((l) => ({ l, href: `${BASE}/${LANG_PATH(l)}p/${slug}/` }));
  for (const lang of LANGS) {
    const html = pageHtml(p, lang, slug, alternates);
    if (!html) continue;
    const dir = join(OUT, LANG_PATH(lang), 'p', slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), html, 'utf8');
    pages++;
  }
  generated.push({ slug, alternates });
}

// ---- append product URLs to the sitemap build-i18n wrote ----
// Skip while demo prices are noindexed, don't advertise pages we tell Google
// not to index. (Re-run with NOINDEX=false once real prices are live.)
const smPath = join(OUT, 'sitemap.xml');
if (NOINDEX) {
  if (existsSync(smPath)) {
    let sm = readFileSync(smPath, 'utf8');
    sm = sm.replace(/<!--products-->[\s\S]*?(?=<\/urlset>)/, '');
    writeFileSync(smPath, sm, 'utf8');
  }
  console.log(`products: ${generated.length} products × ${LANGS.length} langs = ${pages} pages (NOINDEX, excluded from sitemap; BASE=${BASE}, OUT=${OUT})`);
} else if (existsSync(smPath)) {
  let sm = readFileSync(smPath, 'utf8');
  // idempotence: drop a previous products block if present
  sm = sm.replace(/<!--products-->[\s\S]*?(?=<\/urlset>)/, '');
  const block = generated.map(({ alternates }) => {
    const alts = alternates.map(({ l, href }) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${href}"/>`).join('\n');
    return alternates.map(({ href }) => `  <url>\n    <loc>${href}</loc>\n${alts}\n  </url>`).join('\n');
  }).join('\n');
  sm = sm.replace('</urlset>', `<!--products-->\n${block}\n</urlset>`);
  writeFileSync(smPath, sm, 'utf8');
} else {
  console.warn('products: sitemap.xml not found in OUT, run build-i18n.mjs first');
}

console.log(`products: ${generated.length} products × ${LANGS.length} langs = ${pages} pages (BASE=${BASE}, OUT=${OUT})`);
