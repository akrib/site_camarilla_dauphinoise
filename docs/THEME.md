# Thème du site

Couleurs : **vert « World of Darkness »** (le marbre vert des livres de jeu), **sang**, **noir** et **os**.

- **vert** : la structure (menus, liens, filets, survols) ;
- **sang** : ce qui est actif ou important (page courante, outil sélectionné, action principale) ;
- **os** : le texte ; **noir** : les fonds.

## Fichiers

| Fichier | Rôle |
|---|---|
| `assets/css/theme/palette.css` | **Toutes les couleurs** (`--cd-noir`, `--cd-os`, `--cd-vert-vif`, `--cd-sang`…). Changer une couleur ici la change partout. |
| `assets/css/theme/camarilla.css` | Habillage des pages du thème Minimal Mistakes : en-tête, menu, barres latérales, pied de page, bandeau cookie, barre de l'espace membres, typographie des pages de texte. |
| `assets/css/theme/barre.css` | Barres de menu des outils plein écran (carte, territoires, tableau d'enquête, challenges, Trouve le Sabbat, combat, gazette). |
| `assets/css/module/clan-v3.css` | Pages de clan. |
| `_includes/theme.html` | Charge `palette.css` puis `camarilla.css` (thème choisi dans `_config.yml`, `site_theme: camarilla`). |

Lisibilité sur le noir : pour du texte, utiliser `--cd-os`, `--cd-os-pale`, `--cd-vert-vif` ou `--cd-vert-clair` ;
`--cd-sang-clair` seulement pour des accents ou de gros titres ; jamais `--cd-sang` ni `--cd-sang-vif` pour du texte
(ce sont des fonds et des bordures).

## Barres des outils plein écran

Seule la barre suit le thème : l'intérieur de chaque outil (carte, liège, tableau, jeu, éditeur de la gazette)
garde sa propre feuille de style.

Dans la page de l'outil, charger la palette avant la feuille de l'outil, et `barre.css` après :

```html
<link rel="stylesheet" href="/assets/css/theme/palette.css">
<link rel="stylesheet" href="/assets/css/mon-outil.css">
<link rel="stylesheet" href="/assets/css/theme/barre.css">
```

Puis poser les classes communes (les classes propres à l'outil restent, pour sa mise en page et son JavaScript) :

```html
<header class="mon-outil-barre cd-barre">
  <a class="cd-marque" href="/membres/" title="Espace membres">
    <span class="cd-sceau" aria-hidden="true">✠</span>
    <span><strong>Nom de l'outil</strong><small>Sous-titre</small></span>
  </a>
  <button class="cd-btn actif">Outil choisi</button>
  <button class="cd-btn">Autre outil</button>
  <span class="cd-sep"></span>
  <button class="cd-btn principal">Enregistrer</button>
</header>
```

Variantes : `.principal` (sang), `.actif` ou `aria-pressed="true"` (sélection), `.danger`, `.discret` ;
`.cd-barre--bas` pour une barre en pied de page (combat). Les réglages propres à un outil sont regroupés
à la fin de `barre.css`.

## Pages de clan

Toutes les pages de clan utilisent `layout: clan_v3`. Le modèle commenté est `_pages/clan-ventrue.md`.

- **Images** : une page peut nommer ses images avant qu'elles existent. Tant qu'un fichier manque, la page
  affiche un fond de marbre vert à sa place (bannière, illustration de discipline) et cache la galerie.
  Il suffit de déposer le fichier au chemin indiqué pour qu'il apparaisse. Noms conseillés dans
  `assets/images/clans/` : `<clan>-banner.jpg`, `<clan>_001.png` à `_003.png` (une par discipline, dans
  l'ordre), `<clan>1.jpg` à `3.jpg` (galerie).
- **Disciplines** : celles du référentiel de la Fédération (fiche MET). Icônes : `assets/discipline/*-rombo.png`.
  Les disciplines sans icône propre prennent celle de leur équivalent en 5e édition : Quietus → Thaumaturgy,
  Obténébration et Nécromancie → Oblivion, Vicissitude et Serpentis → Protean, Chimérie → Obfuscate,
  Aliénation → Dominate.
- **Symboles** : `assets/images/icons/clan/` ; pas encore de symbole pour les Assamites (le sceau est alors
  simplement absent). Giovanni utilise le symbole Hecata, les Disciples de Set celui du Ministry.
- **Ordre et liens précédent / suivant** : `_data/clans.yml` (le dernier clan renvoie au premier).
- **Accent** : sang par défaut ; `accent: "#xxxxxx"` dans une page pour le changer.
