// Multilingual SEO build: from the single source `index.html` (French root),
// generate one pre-rendered page per language under /<lang>/index.html, each
// with a translated <head> (title, description, OG/Twitter), self-canonical,
// the injected window.__LANG__, plus a sitemap.xml and robots.txt.
//
// You keep maintaining ONE file (index.html). Re-run after any change:
//   node frontend/build-i18n.mjs
//
// Env:
//   SITE_BASE  absolute site origin for canonical/hreflang/sitemap
//              (default https://kompalo.com; e.g. https://naiijah.github.io/kompalo)
//   OUT_DIR    output directory (default: alongside the source). When set to a
//              different folder, the processed FRENCH root page is emitted too,
//              so OUT_DIR is a complete deployable site.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_BASE = 'https://kompalo.com';
const BASE = (process.env.SITE_BASE || DEFAULT_BASE).replace(/\/+$/, '');
const OUT = resolve(process.env.OUT_DIR || DIR);
const SRC = join(DIR, 'index.html');

// fr is the source/root (path ''); the rest are generated subfolders.
export const LANGS = [
  { code: 'fr', path: '' },
  { code: 'en', path: 'en/' },
  { code: 'de', path: 'de/' },
  { code: 'it', path: 'it/' },
  { code: 'es', path: 'es/' },
  { code: 'nl', path: 'nl/' },
  { code: 'sv', path: 'sv/' },
  { code: 'pl', path: 'pl/' },
];

const META = {
  fr: { locale: 'fr_FR',
    title: 'Kompalo — Comparateur de prix Amazon dans 8 pays européens',
    desc: 'Comparez les prix Amazon dans 8 pays européens (Allemagne, France, Italie, Espagne, Pays-Bas, Suède, Pologne, Royaume-Uni) et trouvez le meilleur prix en une recherche. Gratuit, sans inscription, prix actualisés chaque heure.',
    ogTitle: 'Kompalo — le meilleur prix Amazon, partout en Europe',
    ogDesc: 'Un produit, huit marketplaces Amazon européennes, le meilleur prix. Gratuit et sans inscription.' },
  en: { locale: 'en_GB',
    title: 'Kompalo — Compare Amazon prices across 8 European countries',
    desc: 'Compare Amazon prices across 8 European countries (Germany, France, Italy, Spain, Netherlands, Sweden, Poland, UK) and find the best price in one search. Free, no sign-up, prices updated hourly.',
    ogTitle: 'Kompalo — the best Amazon price, all across Europe',
    ogDesc: 'One product, eight European Amazon marketplaces, the best price. Free and no sign-up.' },
  de: { locale: 'de_DE',
    title: 'Kompalo — Amazon-Preise in 8 europäischen Ländern vergleichen',
    desc: 'Vergleiche Amazon-Preise in 8 europäischen Ländern (Deutschland, Frankreich, Italien, Spanien, Niederlande, Schweden, Polen, Großbritannien) und finde mit einer Suche den besten Preis. Kostenlos, ohne Anmeldung, stündlich aktualisiert.',
    ogTitle: 'Kompalo — der beste Amazon-Preis, überall in Europa',
    ogDesc: 'Ein Produkt, acht europäische Amazon-Marktplätze, der beste Preis. Kostenlos und ohne Anmeldung.' },
  it: { locale: 'it_IT',
    title: 'Kompalo — Confronta i prezzi Amazon in 8 paesi europei',
    desc: 'Confronta i prezzi Amazon in 8 paesi europei (Germania, Francia, Italia, Spagna, Paesi Bassi, Svezia, Polonia, Regno Unito) e trova il prezzo migliore con una ricerca. Gratis, senza registrazione, prezzi aggiornati ogni ora.',
    ogTitle: 'Kompalo — il miglior prezzo Amazon, in tutta Europa',
    ogDesc: 'Un prodotto, otto marketplace Amazon europei, il prezzo migliore. Gratis e senza registrazione.' },
  es: { locale: 'es_ES',
    title: 'Kompalo — Compara precios de Amazon en 8 países europeos',
    desc: 'Compara los precios de Amazon en 8 países europeos (Alemania, Francia, Italia, España, Países Bajos, Suecia, Polonia, Reino Unido) y encuentra el mejor precio en una búsqueda. Gratis, sin registro, precios actualizados cada hora.',
    ogTitle: 'Kompalo — el mejor precio de Amazon, en toda Europa',
    ogDesc: 'Un producto, ocho marketplaces de Amazon europeos, el mejor precio. Gratis y sin registro.' },
  nl: { locale: 'nl_NL',
    title: 'Kompalo — Vergelijk Amazon-prijzen in 8 Europese landen',
    desc: 'Vergelijk Amazon-prijzen in 8 Europese landen (Duitsland, Frankrijk, Italië, Spanje, Nederland, Zweden, Polen, VK) en vind de beste prijs met één zoekopdracht. Gratis, geen registratie, prijzen elk uur bijgewerkt.',
    ogTitle: 'Kompalo — de beste Amazon-prijs, overal in Europa',
    ogDesc: 'Eén product, acht Europese Amazon-marktplaatsen, de beste prijs. Gratis en zonder registratie.' },
  sv: { locale: 'sv_SE',
    title: 'Kompalo — Jämför Amazon-priser i 8 europeiska länder',
    desc: 'Jämför Amazon-priser i 8 europeiska länder (Tyskland, Frankrike, Italien, Spanien, Nederländerna, Sverige, Polen, Storbritannien) och hitta det bästa priset med en sökning. Gratis, ingen registrering, priser uppdateras varje timme.',
    ogTitle: 'Kompalo — det bästa Amazon-priset, i hela Europa',
    ogDesc: 'En produkt, åtta europeiska Amazon-marknadsplatser, det bästa priset. Gratis och utan registrering.' },
  pl: { locale: 'pl_PL',
    title: 'Kompalo — Porównaj ceny Amazon w 8 krajach europejskich',
    desc: 'Porównaj ceny Amazon w 8 krajach europejskich (Niemcy, Francja, Włochy, Hiszpania, Holandia, Szwecja, Polska, Wielka Brytania) i znajdź najlepszą cenę w jednym wyszukiwaniu. Za darmo, bez rejestracji, ceny aktualizowane co godzinę.',
    ogTitle: 'Kompalo — najlepsza cena Amazon w całej Europie',
    ogDesc: 'Jeden produkt, osiem europejskich platform Amazon, najlepsza cena. Za darmo i bez rejestracji.' },
};

const src = readFileSync(SRC, 'utf8');

function setAttrMeta(html, attr, key, value) {
  const re = new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`);
  return html.replace(re, `$1${value}$2`);
}

function buildPage(code) {
  const m = META[code];
  const url = `${BASE}/${LANGS.find((l) => l.code === code).path}`;
  let h = src;
  h = h.replace(/<html lang="[^"]*">/, `<html lang="${code}">`);
  h = h.replace(/<title>[^<]*<\/title>/, `<title>${m.title}</title>`);
  h = setAttrMeta(h, 'name', 'description', m.desc);
  h = setAttrMeta(h, 'property', 'og:title', m.ogTitle);
  h = setAttrMeta(h, 'property', 'og:description', m.ogDesc);
  h = setAttrMeta(h, 'property', 'og:locale', m.locale);
  h = setAttrMeta(h, 'property', 'og:url', url);
  h = setAttrMeta(h, 'name', 'twitter:title', m.ogTitle);
  h = setAttrMeta(h, 'name', 'twitter:description', m.ogDesc);
  h = h.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);
  h = h.replace('<!--LANGINJECT-->', `<script>window.__LANG__='${code}';</script>`);
  // Point every hardcoded absolute URL (hreflang block, JSON-LD fallback) at BASE.
  if (BASE !== DEFAULT_BASE) h = h.replaceAll(`${DEFAULT_BASE}/`, `${BASE}/`);
  return h;
}

let count = 0;
for (const { code, path } of LANGS) {
  // fr root: only emitted when building into a separate OUT_DIR (deploy build);
  // in-place builds keep the source file as the root page.
  if (code === 'fr' && OUT === resolve(DIR)) continue;
  const outDir = join(OUT, path);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), buildPage(code), 'utf8');
  count++;
}

// sitemap.xml with hreflang alternates
const alternates = LANGS.map((l) => {
  return `    <xhtml:link rel="alternate" hreflang="${l.code}" href="${BASE}/${l.path}"/>`;
}).join('\n') + `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE}/"/>`;
const urls = LANGS.map((l) => `  <url>\n    <loc>${BASE}/${l.path}</loc>\n${alternates}\n  </url>`).join('\n');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'sitemap.xml'), sitemap, 'utf8');
writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${BASE}/sitemap.xml\n`, 'utf8');

console.log(`i18n: built ${count} language pages + sitemap.xml + robots.txt (BASE=${BASE}, OUT=${OUT})`);
