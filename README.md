# Kompalo — site web

Comparateur de prix Amazon dans 8 pays européens. Ce dépôt **se construit et se
publie tout seul** : à chaque modification, GitHub reconstruit le site et le met
en ligne sur https://naiijah.github.io/kompalo/ — aucune commande à lancer sur ton
ordinateur.

## Comment modifier le site

1. Ouvre `frontend/index.html` sur GitHub (bouton crayon ✏️ pour éditer).
2. Fais ta modification, puis « Commit changes ».
3. C'est tout. L'onglet **Actions** montre la reconstruction ; ~2 min plus tard,
   le site en ligne est à jour.

Tu peux aussi relancer une publication à la main : onglet **Actions** →
« Build & deploy Kompalo » → **Run workflow**.

## Ce qu'il y a dans le dépôt

| Fichier | Rôle |
|---|---|
| `frontend/index.html` | L'application (une seule page, tout est dedans) |
| `frontend/build-i18n.mjs` | Génère les 8 pages par langue + `sitemap.xml` + `robots.txt` |
| `frontend/build-products.mjs` | Génère les pages produit (SEO) depuis l'API en direct |
| `frontend/build-all.mjs` | Lance les deux scripts ci-dessus |
| `.github/workflows/deploy.yml` | La recette de reconstruction + publication automatique |

## Réglages (onglet Settings → Secrets and variables → Actions → Variables)

- **NOINDEX** = `true` par défaut : les pages produit affichent des **prix de
  démonstration**, donc on demande à Google de **ne pas les indexer** (sinon
  Google référencerait de faux prix, ce qui nuirait au site). La page d'accueil
  et les pages par langue, elles, restent indexables.
  Quand les **vrais prix Amazon** seront branchés, mets `NOINDEX` = `false` et
  relance le workflow : les pages produit deviendront indexables et
  réapparaîtront dans le `sitemap.xml`.

## Quand le domaine kompalo.com sera acheté

Dans `.github/workflows/deploy.yml`, remplace la ligne
`SITE_BASE: https://naiijah.github.io/kompalo` par `SITE_BASE: https://kompalo.com`,
ajoute un fichier `CNAME` contenant `kompalo.com`, et configure le domaine dans
Settings → Pages. Rien d'autre à changer.

---

Le code source complet (API backend, etc.) vit dans un dépôt privé séparé.
