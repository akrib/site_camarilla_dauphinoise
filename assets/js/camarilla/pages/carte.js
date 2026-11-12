// =====================================================================
// Carte de Grenoble — page /utils/carte (outil de jeu, personnage incarné)
//
// Carte : MapLibre GL JS (libre) + tuiles vectorielles OpenFreeMap, faites à
// partir des données OpenStreetMap (gratuites, sans clé ni inscription).
//   - vue « Plan » : carte routière à plat ;
//   - vue « 3D »   : même carte inclinée, bâtiments extrudés à leur hauteur
//                    (données OSM : render_height). Le passage d'une vue à
//                    l'autre garde le centre, le zoom et tous les tracés.
// Éléments de jeu :
//   - territoires (polygones : dessin, points déplaçables, agrandir/réduire,
//     déplacer, couleur, transparence, nom, description) ;
//   - havres (marqueurs déplaçables, icône, couleur, nom, description) ;
//   - zones de chasse : un cercle autour du marqueur, rayon réglable (curseur
//     ou poignée sur le bord du cercle) ;
//   - parcours de ronde (lignes reliant plusieurs points) ;
//   - actions d'influence du personnage (Firestore), par mois / partie :
//     affichées, placées et déplacées tant que la fenêtre d'influences de la
//     partie est ouverte ; outil « Influence » = nouvelle action à cet endroit.
//     Un conteur voit toutes les actions du mois choisi (lecture seule).
// Sauvegarde : dans le navigateur, une carte par personnage, + export /
// import JSON pour passer d'un appareil à l'autre. Les actions d'influence,
// elles, sont dans Firestore (collection influences, champ lieu).
// =====================================================================
import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.18.0/dist/maplibre-gl.mjs';
import { h, db, fs, surSession, estActif, messageErreur, dateFr, millis } from '../core.js';
import { exigerPersonnage, fenetreChoixPersonnage } from '../incarnation.js';
import { GRENOBLE, FONDS, ATTRIBUTION, couleurInfluence, versPoint, versLieu } from '../carte-base.js';
import { donneesDoc } from '../compression.js';
import { chargerCalendrier, modifiable, moisParDefaut, partie, etat, libelleMois, libellePartie, resumeEtat, LIBELLES_ETAT } from '../calendrier.js';
import { TYPES_ACTION } from '../donnees.js';

// ---------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------
const PALETTE = ['#9b1c2c', '#c4283d', '#c9a227', '#7d5ba6', '#3d6fa5', '#2f8f83', '#4f8a5b', '#b5652b', '#8a8f99', '#e6e1d6'];
const DEFAUTS = {
  territoire: { couleur: '#7d5ba6', opacite: 0.28 },
  havre: { couleur: '#9b1c2c', icone: 'crypte' },
  chasse: { couleur: '#b5652b', icone: 'croc', rayon: 300 },
  ronde: { couleur: '#c9a227' }
};
const RAYON = { min: 50, max: 3000, pas: 10 };   // zone de chasse, en mètres
const NOMS = { territoire: 'Territoire', havre: 'Havre', chasse: 'Zone de chasse', ronde: 'Ronde', influence: 'Action d\'influence' };
const ONGLET_DE = { territoire: 'territoires', havre: 'havres', chasse: 'chasses', ronde: 'rondes', influence: 'influences' };

// Zones de jeu de la Camarilla dauphinoise (cartes de référence)
const ZONES = [
  ['1', 'Grenoble centre'], ['2', 'La Tronche · Corenc · Meylan'], ['3', 'Seyssinet-Pariset · Seyssins'],
  ['4', 'Grenoble sud · Échirolles'], ['5', 'Saint-Martin-d\'Hères'], ['6', 'Eybens · Poisat'], ['7', 'Fontaine · Sassenage'],
  ['8', 'Voironnais – Chartreuse'], ['9', 'Sud Grésivaudan'], ['10', 'Vals du Dauphiné'], ['11', 'Le Pont-de-Beauvoisin'],
  ['12', 'Bièvre Valloire'], ['13', 'La Côte-Saint-André'], ['14', 'La Porte des Alpes'], ['15', 'Crémieu'],
  ['16', 'Haut Rhône Dauphinois'], ['17', 'Grésivaudan'], ['18', 'Oisans'], ['19', 'Matheysine'], ['20', 'Trièves'],
  ['21', 'Vallée des Écrins'], ['22', 'Vercors'], ['23', 'Belledonne'], ['24', 'Chartreuse']
];
const DOMAINES = ['Domaine de Lyon', 'Domaine de Vienne', 'Domaine de Valence', 'Domaine des 2 Savoies', 'Domaine de Marseille'];

// Icônes (SVG, couleur = currentColor)
const SVG = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
const ICONES = {
  main: SVG('<path d="M7 11V6.5a1.5 1.5 0 0 1 3 0V11m0-5V4.5a1.5 1.5 0 0 1 3 0V11m0-5.5a1.5 1.5 0 0 1 3 0V12m0-4.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.5a6 6 0 0 1-4.7-2.3L4.4 15.5a1.6 1.6 0 0 1 2.5-2L7 13.6"/>'),
  havre: SVG('<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>'),
  chasse: SVG('<path d="M12 3c3 4.5 5 7.4 5 10a5 5 0 0 1-10 0c0-2.6 2-5.5 5-10z"/>'),
  ronde: SVG('<circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M7 18h6a3 3 0 0 0 0-6h-2a3 3 0 0 1 0-6h6" stroke-dasharray="2 2.4"/>'),
  territoire: SVG('<path d="M4 7 10 3l8 3 2 8-6 7-9-3z"/>'),
  cible: SVG('<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>'),
  carte: SVG('<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>'),
  export: SVG('<path d="M12 3v12M7 8l5-5 5 5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>'),
  import: SVG('<path d="M12 15V3M7 10l5 5 5-5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>'),
  influence: SVG('<path d="M12 3l8 9-8 9-8-9z"/><path d="M12 8v5M12 16v.5"/>')
};
const ICONES_LIEUX = {
  havre: {
    crypte: ['Crypte', SVG('<path d="M8 3h8l2 6-2 12H8L6 9z"/><path d="M12 8v6M9.5 10.5h5"/>')],
    manoir: ['Manoir', SVG('<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>')],
    eglise: ['Église', SVG('<path d="M12 2v5M10 4h4"/><path d="M6 21V11l6-4 6 4v10z"/><path d="M10 21v-4a2 2 0 0 1 4 0v4"/>')],
    tour: ['Immeuble', SVG('<rect x="6" y="3" width="12" height="18"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>')]
  },
  chasse: {
    croc: ['Crocs', SVG('<path d="M4 6h16"/><path d="M7 6l2 9 2-9M13 6l2 9 2-9"/>')],
    goutte: ['Sang', SVG('<path d="M12 3c3 4.5 5 7.4 5 10a5 5 0 0 1-10 0c0-2.6 2-5.5 5-10z"/>')],
    cible: ['Cible', SVG('<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>')],
    oeil: ['Guet', SVG('<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>')]
  }
};

// ---------------------------------------------------------------------
// État
// ---------------------------------------------------------------------
let session = null;
let perso = null;              // personnage incarné (null : conteur sans personnage)
let cle = null;                // clé de sauvegarde (une carte par personnage)
let donnees = vide();
let map = null;
let outil = 'naviguer';
let brouillon = [];            // points du tracé en cours (ronde ou territoire)
let curseur = null;            // position de la souris (aperçu du tracé)
let selection = null;          // { type, id }
let edition = false;           // poignées de modification du tracé affichées
let glisse = null;             // poignée en cours de déplacement
let sommetChoisi = null;       // sommet touché / cliqué (pour « Retirer ce point »)
let ongletActif = 'territoires';
let police = ['Noto Sans Regular'];
const marqueurs = new Map();   // id -> maplibregl.Marker
// Actions d'influence (Firestore)
let cal = { existe: false, parties: [], anticipation: false };
let enJeu = false;             // le personnage incarné est « en jeu » (statut active)
let mesActions = null;         // joueur : toutes les actions du personnage
const parMois = new Map();     // conteur : actions déjà chargées, par mois
let influences = [];           // actions du mois affiché
let moisInfl = '';             // mois affiché ('' : couche masquée)
let placement = null;          // id de l'action à placer au prochain clic
const marqueursInfl = new Map();

function vide() {
  return { version: 1, vue: { centre: GRENOBLE.centre, zoom: GRENOBLE.zoom, mode: 'plan', fond: 'nuit' }, territoires: [], havres: [], chasses: [], rondes: [] };
}
const nouvelId = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const $ = (id) => document.getElementById(id);
const liste = (type) => (type === 'influence' ? influences : donnees[ONGLET_DE[type]]);
const trouver = (type, id) => liste(type).find((x) => x.id === id);

// ---------------------------------------------------------------------
// Validation des données (sauvegarde locale ou JSON importé)
// ---------------------------------------------------------------------
function normaliser(d) {
  const couleur = (c, def) => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : def);
  const point = (p) => (Array.isArray(p) && p.length >= 2 && Number.isFinite(+p[0]) && Number.isFinite(+p[1])
    && Math.abs(+p[0]) <= 180 && Math.abs(+p[1]) <= 90 ? [+(+p[0]).toFixed(7), +(+p[1]).toFixed(7)] : null);
  const points = (l) => (Array.isArray(l) ? l.map(point).filter(Boolean).slice(0, 500) : []);
  const texte = (t, max) => String(t || '').slice(0, max);
  const base = (x, type) => ({ id: typeof x.id === 'string' && x.id ? x.id.slice(0, 40) : nouvelId(), nom: texte(x.nom, 120) || NOMS[type], description: texte(x.description, 4000) });
  const r = vide();
  if (!d || typeof d !== 'object') return r;
  if (d.vue && typeof d.vue === 'object') {
    r.vue = {
      centre: point(d.vue.centre) || GRENOBLE.centre,
      zoom: Number.isFinite(+d.vue.zoom) ? Math.min(20, Math.max(3, +d.vue.zoom)) : GRENOBLE.zoom,
      mode: d.vue.mode === '3d' ? '3d' : 'plan',
      fond: FONDS[d.vue.fond] ? d.vue.fond : 'nuit'
    };
  }
  r.territoires = (Array.isArray(d.territoires) ? d.territoires : []).map((x) => ({
    ...base(x, 'territoire'), couleur: couleur(x.couleur, DEFAUTS.territoire.couleur),
    opacite: Number.isFinite(+x.opacite) ? Math.min(0.9, Math.max(0, +x.opacite)) : DEFAUTS.territoire.opacite,
    coords: points(x.coords)
  })).filter((x) => x.coords.length >= 3);
  r.havres = (Array.isArray(d.havres) ? d.havres : []).map((x) => ({
    ...base(x, 'havre'), couleur: couleur(x.couleur, DEFAUTS.havre.couleur),
    icone: ICONES_LIEUX.havre[x.icone] ? x.icone : DEFAUTS.havre.icone, position: point(x.position)
  })).filter((x) => x.position);
  r.chasses = (Array.isArray(d.chasses) ? d.chasses : []).map((x) => ({
    ...base(x, 'chasse'), couleur: couleur(x.couleur, DEFAUTS.chasse.couleur),
    icone: ICONES_LIEUX.chasse[x.icone] ? x.icone : DEFAUTS.chasse.icone, position: point(x.position),
    // Toujours un cercle : un ancien rayon nul (ou absent) reprend la valeur par défaut.
    rayon: Number.isFinite(+x.rayon) && +x.rayon > 0 ? bornerRayon(+x.rayon) : DEFAUTS.chasse.rayon
  })).filter((x) => x.position);
  r.rondes = (Array.isArray(d.rondes) ? d.rondes : []).map((x) => ({
    ...base(x, 'ronde'), couleur: couleur(x.couleur, DEFAUTS.ronde.couleur), coords: points(x.coords)
  })).filter((x) => x.coords.length >= 2);
  return r;
}

// ---------------------------------------------------------------------
// Sauvegarde locale (une carte par personnage)
// ---------------------------------------------------------------------
let attenteSauvegarde = null;
function sauvegarder() {
  clearTimeout(attenteSauvegarde);
  attenteSauvegarde = setTimeout(() => {
    try { localStorage.setItem(cle, JSON.stringify(donnees)); }
    catch (e) { aide('Sauvegarde impossible dans ce navigateur (' + e.name + '). Exportez votre carte en JSON.', 6000); }
  }, 250);
}
function charger() {
  try { donnees = normaliser(JSON.parse(localStorage.getItem(cle) || 'null')); } catch (e) { donnees = vide(); }
}

// ---------------------------------------------------------------------
// Géométrie
// ---------------------------------------------------------------------
function cercle([lng, lat], rayon, n = 64) {
  const dx = rayon / (111320 * Math.cos(lat * Math.PI / 180));
  const dy = rayon / 110540;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([lng + dx * Math.cos(a), lat + dy * Math.sin(a)]);
  }
  return pts;
}
const bornerRayon = (r) => Math.min(RAYON.max, Math.max(RAYON.min, Math.round(r / RAYON.pas) * RAYON.pas));
// Distance approchée en mètres (suffisante à l'échelle d'une ville)
function distance([lng1, lat1], [lng2, lat2]) {
  const kx = 111320 * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180);
  return Math.hypot((lng2 - lng1) * kx, (lat2 - lat1) * 110540);
}
// Point du bord est d'un cercle (poignée de rayon)
const bordEst = ([lng, lat], rayon) => [lng + rayon / (111320 * Math.cos(lat * Math.PI / 180)), lat];
const centre = (pts) => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
const anneau = (pts) => [...pts, pts[0]];
function emprise(pts) {
  const b = new maplibregl.LngLatBounds(pts[0], pts[0]);
  pts.forEach((p) => b.extend(p));
  return b;
}

// ---------------------------------------------------------------------
// Couches de la carte (ré-ajoutées après chaque changement de fond)
// ---------------------------------------------------------------------
const FC = (features) => ({ type: 'FeatureCollection', features });
const SOURCES = ['cam-territoires', 'cam-etiquettes', 'cam-rondes', 'cam-rayons', 'cam-brouillon', 'cam-poignees'];

function sourceBatiments() {
  const style = map.getStyle();
  const couche = (style.layers || []).find((l) => l['source-layer'] === 'building' && l.source);
  if (couche) return couche.source;
  const vect = Object.entries(style.sources || {}).find(([, s]) => s.type === 'vector');
  return vect ? vect[0] : null;
}

function ajouterCouches() {
  const style = map.getStyle();
  // Police des étiquettes : celle du fond de carte (les glyphes sont servis avec).
  const symbole = (style.layers || []).find((l) => l.type === 'symbol' && l.layout && Array.isArray(l.layout['text-font']));
  if (symbole) police = symbole.layout['text-font'];

  SOURCES.forEach((id) => { if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: FC([]) }); });

  // Bâtiments en volume (vue 3D) : hauteur réelle des bâtiments OSM.
  const src = sourceBatiments();
  if (src && !map.getLayer('cam-batiments-3d')) {
    const premierSymbole = (style.layers || []).find((l) => l.type === 'symbol');
    map.addLayer({
      id: 'cam-batiments-3d', type: 'fill-extrusion', source: src, 'source-layer': 'building', minzoom: 13,
      layout: { visibility: 'none' },
      paint: {
        'fill-extrusion-color': donnees.vue.fond === 'jour'
          ? ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 8], 0, '#e4ddd1', 40, '#cfc6b6', 120, '#b7ad9b']
          : ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 8], 0, '#1f2430', 25, '#2b3242', 80, '#41495d', 160, '#5c6578'],
        'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, 0, 14, ['coalesce', ['get', 'render_height'], 8]],
        'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 13, 0, 14, ['coalesce', ['get', 'render_min_height'], 0]],
        'fill-extrusion-opacity': 0.88,
        'fill-extrusion-vertical-gradient': true
      }
    }, premierSymbole ? premierSymbole.id : undefined);
  }

  const ajout = (couche) => { if (!map.getLayer(couche.id)) map.addLayer(couche); };
  ajout({ id: 'cam-territoires-fond', type: 'fill', source: 'cam-territoires', paint: { 'fill-color': ['get', 'couleur'], 'fill-opacity': ['get', 'opacite'] } });
  ajout({
    id: 'cam-territoires-bord', type: 'line', source: 'cam-territoires',
    paint: { 'line-color': ['get', 'couleur'], 'line-width': ['case', ['get', 'sel'], 3.5, 2], 'line-opacity': 0.95 }
  });
  ajout({ id: 'cam-rayons-fond', type: 'fill', source: 'cam-rayons', paint: { 'fill-color': ['get', 'couleur'], 'fill-opacity': ['case', ['get', 'sel'], 0.22, 0.14] } });
  ajout({ id: 'cam-rayons-bord', type: 'line', source: 'cam-rayons', paint: { 'line-color': ['get', 'couleur'], 'line-width': ['case', ['get', 'sel'], 2.5, 1.5], 'line-dasharray': [2, 2] } });
  ajout({
    id: 'cam-rondes-halo', type: 'line', source: 'cam-rondes', layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#000', 'line-width': ['case', ['get', 'sel'], 8, 6], 'line-opacity': 0.45 }
  });
  ajout({
    id: 'cam-rondes', type: 'line', source: 'cam-rondes', layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ['get', 'couleur'], 'line-width': ['case', ['get', 'sel'], 4.5, 3], 'line-dasharray': [2, 1.4] }
  });
  ajout({
    id: 'cam-rondes-sens', type: 'symbol', source: 'cam-rondes',
    layout: { 'symbol-placement': 'line', 'symbol-spacing': 90, 'text-field': '›', 'text-font': police, 'text-size': 20, 'text-keep-upright': false, 'text-allow-overlap': true },
    paint: { 'text-color': ['get', 'couleur'], 'text-halo-color': '#000', 'text-halo-width': 1.2 }
  });
  ajout({
    id: 'cam-etiquettes', type: 'symbol', source: 'cam-etiquettes',
    layout: { 'text-field': ['get', 'nom'], 'text-font': police, 'text-size': 13, 'text-letter-spacing': 0.08, 'text-transform': 'uppercase', 'text-max-width': 10 },
    paint: { 'text-color': '#f1ece2', 'text-halo-color': 'rgba(0,0,0,.85)', 'text-halo-width': 1.6 }
  });
  ajout({
    id: 'cam-brouillon-ligne', type: 'line', source: 'cam-brouillon', filter: ['==', ['geometry-type'], 'LineString'],
    paint: { 'line-color': '#f1ece2', 'line-width': 2, 'line-dasharray': [1.5, 1.5] }
  });
  ajout({
    id: 'cam-brouillon-points', type: 'circle', source: 'cam-brouillon', filter: ['==', ['geometry-type'], 'Point'],
    paint: { 'circle-radius': 5, 'circle-color': '#c4283d', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 }
  });
  ajout({
    id: 'cam-poignees', type: 'circle', source: 'cam-poignees',
    paint: {
      'circle-radius': ['match', ['get', 'role'], 'sommet', 6.5, 'choisi', 8, 'centre', 8, 'rayon', 7, 4.5],
      'circle-color': ['match', ['get', 'role'], 'sommet', '#ffffff', 'choisi', '#c4283d', 'centre', '#c9a227', 'rayon', '#ffffff', 'rgba(255,255,255,0.45)'],
      'circle-stroke-color': '#111', 'circle-stroke-width': 1.5
    }
  });
  appliquerMode(false);
  dessinerCouches();
}

function dessinerCouches() {
  if (!map || !map.getSource('cam-territoires')) return;
  const sel = (type, id) => !!selection && selection.type === type && selection.id === id;
  map.getSource('cam-territoires').setData(FC(donnees.territoires.map((t) => ({
    type: 'Feature', id: undefined,
    properties: { id: t.id, couleur: t.couleur, opacite: t.opacite, sel: sel('territoire', t.id) },
    geometry: { type: 'Polygon', coordinates: [anneau(t.coords)] }
  }))));
  map.getSource('cam-etiquettes').setData(FC(donnees.territoires.map((t) => ({
    type: 'Feature', properties: { nom: t.nom }, geometry: { type: 'Point', coordinates: centre(t.coords) }
  }))));
  map.getSource('cam-rondes').setData(FC(donnees.rondes.map((r) => ({
    type: 'Feature', properties: { id: r.id, couleur: r.couleur, sel: sel('ronde', r.id) },
    geometry: { type: 'LineString', coordinates: r.coords }
  }))));
  map.getSource('cam-rayons').setData(FC(donnees.chasses.map((c) => ({
    type: 'Feature', properties: { id: c.id, couleur: c.couleur, sel: sel('chasse', c.id) }, geometry: { type: 'Polygon', coordinates: [cercle(c.position, c.rayon)] }
  }))));
  // Tracé en cours
  const pts = curseur && brouillon.length ? [...brouillon, curseur] : brouillon;
  const lignes = pts.length >= 2 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: outil === 'territoire' && pts.length >= 3 ? anneau(pts) : pts } }] : [];
  map.getSource('cam-brouillon').setData(FC([...lignes, ...brouillon.map((p) => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: p } }))]));
  // Poignées de modification
  const poignees = [];
  if (edition && selection && (selection.type === 'territoire' || selection.type === 'ronde')) {
    const el = trouver(selection.type, selection.id);
    if (el) {
      const ferme = selection.type === 'territoire';
      el.coords.forEach((p, i) => {
        poignees.push({ type: 'Feature', properties: { role: i === sommetChoisi ? 'choisi' : 'sommet', i }, geometry: { type: 'Point', coordinates: p } });
        const suivant = el.coords[i + 1] || (ferme ? el.coords[0] : null);
        if (suivant) poignees.push({ type: 'Feature', properties: { role: 'milieu', i }, geometry: { type: 'Point', coordinates: [(p[0] + suivant[0]) / 2, (p[1] + suivant[1]) / 2] } });
      });
      if (ferme) poignees.push({ type: 'Feature', properties: { role: 'centre', i: -1 }, geometry: { type: 'Point', coordinates: centre(el.coords) } });
    }
  }
  // Zone de chasse choisie : poignée sur le bord du cercle pour régler le rayon
  if (selection && selection.type === 'chasse' && outil === 'naviguer') {
    const c = trouver('chasse', selection.id);
    if (c) poignees.push({ type: 'Feature', properties: { role: 'rayon', i: -1 }, geometry: { type: 'Point', coordinates: bordEst(c.position, c.rayon) } });
  }
  map.getSource('cam-poignees').setData(FC(poignees));
}

// ---------------------------------------------------------------------
// Marqueurs (havres, zones de chasse)
// ---------------------------------------------------------------------
function elementMarqueur(type, x) {
  const el = h('div', { class: 'carte-marqueur ' + type, title: x.nom });
  const epingle = h('div', { class: 'epingle' });
  epingle.style.background = x.couleur;
  epingle.innerHTML = ICONES_LIEUX[type][x.icone][1];
  el.append(epingle, h('div', { class: 'etiquette' }, x.nom));
  return el;
}

// Remplace nos classes sur l'élément d'un marqueur en gardant celles de
// MapLibre (maplibregl-marker… : positionnement absolu, glissement).
function classesMarqueur(el, classes) {
  el.className = [...[...el.classList].filter((c) => c.startsWith('maplibregl-')), classes].join(' ');
}

function dessinerMarqueurs() {
  const presents = new Set();
  ['havre', 'chasse'].forEach((type) => liste(type).forEach((x) => {
    presents.add(x.id);
    const el = elementMarqueur(type, x);
    el.classList.toggle('sel', !!selection && selection.id === x.id);
    let m = marqueurs.get(x.id);
    if (m) {
      const actuel = m.getElement();
      classesMarqueur(actuel, el.className);
      actuel.title = el.title;
      actuel.replaceChildren(...el.childNodes);
      m.setLngLat(x.position);
      return;
    }
    m = new maplibregl.Marker({ element: el, draggable: true, anchor: 'bottom' }).setLngLat(x.position).addTo(map);
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const cible = trouver(type, x.id);
      if (!cible) return;
      if (outil === 'naviguer') selectionner(type, x.id);
      // En plein tracé, cliquer sur un lieu y pose un point (une ronde qui passe par un havre…)
      else if (outil === 'ronde' || outil === 'territoire') { brouillon.push(cible.position.slice()); dessinerCouches(); }
    });
    if (type === 'chasse') {
      m.on('drag', () => {
        const ll = m.getLngLat();
        const cible = trouver(type, x.id);
        if (cible) { cible.position = [+ll.lng.toFixed(7), +ll.lat.toFixed(7)]; dessinerCouches(); }
      });
    }
    m.on('dragend', () => {
      const ll = m.getLngLat();
      const cible = trouver(type, x.id);
      if (!cible) return;
      cible.position = [+ll.lng.toFixed(7), +ll.lat.toFixed(7)];
      sauvegarder(); dessinerCouches();
      if (selection && selection.id === x.id) majEditeur();
    });
    marqueurs.set(x.id, m);
  }));
  for (const [id, m] of marqueurs) if (!presents.has(id)) { m.remove(); marqueurs.delete(id); }
}

function toutRedessiner() {
  dessinerCouches();
  dessinerMarqueurs();
  dessinerMarqueursInfluences();
  dessinerListe();
}

// ---------------------------------------------------------------------
// Outils et modes
// ---------------------------------------------------------------------
const AIDES = {
  havre: 'Cliquez sur la carte pour placer un <b>havre</b>. <b>Échap</b> pour annuler.',
  chasse: 'Cliquez sur la carte pour placer une <b>zone de chasse</b> (cercle de 300 m autour du marqueur, réglable ensuite). <b>Échap</b> pour annuler.',
  influence: 'Cliquez sur la carte à l\'endroit de la <b>nouvelle action d\'influence</b>. <b>Échap</b> pour annuler.',
  ronde: 'Cliquez pour poser les points de la <b>ronde</b>. <b>Double-clic</b> ou <b>Entrée</b> pour terminer, <b>Retour arrière</b> pour enlever le dernier point, <b>Échap</b> pour annuler.',
  territoire: 'Cliquez pour poser les sommets du <b>territoire</b>. <b>Double-clic</b> ou <b>Entrée</b> pour fermer la zone (3 points au moins), <b>Échap</b> pour annuler.'
};
let aideMinuteur = null;
function aide(html, duree) {
  const zone = $('aide');
  clearTimeout(aideMinuteur);
  if (!html) { zone.hidden = true; return; }
  zone.innerHTML = html;
  zone.hidden = false;
  if (duree) aideMinuteur = setTimeout(() => { zone.hidden = true; afficherAideOutil(); }, duree);
}
function afficherAideOutil() {
  if (placement) { const a = trouver('influence', placement); aide('Cliquez sur la carte pour placer <b>' + echapper(a ? a.nomAction : 'l\'action') + '</b>. <b>Échap</b> pour annuler.'); return; }
  if (AIDES[outil]) aide(AIDES[outil]);
  else if (selection && selection.type === 'chasse') aide('Glissez le <b>point blanc</b> sur le bord du cercle pour régler le rayon de la zone de chasse, ou le marqueur pour la déplacer.', 5000);
  else if (edition) aide('Glissez les <b>points blancs</b> pour modifier le tracé, cliquez sur un <b>point gris</b> pour en ajouter un ; pour supprimer un point, <b>clic droit</b> dessus (ou touchez-le puis « Retirer ce point »)' + (selection && selection.type === 'territoire' ? ', glissez le <b>point doré</b> pour déplacer tout le territoire' : '') + '.');
  else aide('');
}

function choisirOutil(o) {
  if (o === 'influence') {
    const refus = refusInfluence();
    if (refus) { aide(refus, 4500); o = 'naviguer'; }
  }
  placement = null;
  if (brouillon.length && o !== outil) brouillon = [];
  outil = o;
  curseur = null;
  document.querySelectorAll('#outils [data-outil]').forEach((b) => b.classList.toggle('actif', b.dataset.outil === o));
  $('carte').classList.toggle('mode-dessin', o !== 'naviguer');
  if (o !== 'naviguer') { edition = false; }
  if (map) {
    if (o === 'ronde' || o === 'territoire') map.doubleClickZoom.disable(); else map.doubleClickZoom.enable();
  }
  dessinerCouches();
  afficherAideOutil();
}

function terminerTrace() {
  if (outil === 'ronde' && brouillon.length >= 2) {
    const r = { id: nouvelId(), nom: 'Ronde ' + (donnees.rondes.length + 1), description: '', couleur: DEFAUTS.ronde.couleur, coords: brouillon.slice() };
    donnees.rondes.push(r);
    brouillon = [];
    sauvegarder(); choisirOutil('naviguer'); selectionner('ronde', r.id);
  } else if (outil === 'territoire' && brouillon.length >= 3) {
    const t = {
      id: nouvelId(), nom: 'Territoire ' + (donnees.territoires.length + 1), description: '',
      couleur: PALETTE[donnees.territoires.length % PALETTE.length], opacite: DEFAUTS.territoire.opacite, coords: brouillon.slice()
    };
    donnees.territoires.push(t);
    brouillon = [];
    sauvegarder(); choisirOutil('naviguer'); selectionner('territoire', t.id);
  } else {
    aide(outil === 'territoire' ? 'Il faut au moins <b>3 points</b> pour fermer un territoire.' : 'Il faut au moins <b>2 points</b> pour une ronde.', 2500);
  }
}

function placerLieu(type, lngLat) {
  const x = {
    id: nouvelId(), nom: NOMS[type] + ' ' + (liste(type).length + 1), description: '',
    couleur: DEFAUTS[type].couleur, icone: DEFAUTS[type].icone, position: [+lngLat.lng.toFixed(7), +lngLat.lat.toFixed(7)]
  };
  if (type === 'chasse') x.rayon = DEFAUTS.chasse.rayon;
  liste(type).push(x);
  sauvegarder(); choisirOutil('naviguer'); selectionner(type, x.id);
}

// ---------------------------------------------------------------------
// Vue Plan / 3D et fond de carte
// ---------------------------------------------------------------------
function appliquerMode(anime = true) {
  const en3d = donnees.vue.mode === '3d';
  $('vuePlan').classList.toggle('actif', !en3d);
  $('vue3d').classList.toggle('actif', en3d);
  if (!map) return;
  const style = map.isStyleLoaded() ? map.getStyle() : null;
  if (style) {
    if (map.getLayer('cam-batiments-3d')) map.setLayoutProperty('cam-batiments-3d', 'visibility', en3d ? 'visible' : 'none');
    // En 3D, les bâtiments à plat du fond (et ses propres volumes) laissent la place aux nôtres.
    (style.layers || []).forEach((l) => {
      if (l['source-layer'] === 'building' && !l.id.startsWith('cam-')) map.setLayoutProperty(l.id, 'visibility', en3d ? 'none' : 'visible');
    });
  }
  // Même centre, même zoom : seule l'inclinaison change.
  const cible = en3d ? { pitch: 60, bearing: map.getBearing() || -17 } : { pitch: 0, bearing: 0 };
  if (anime) map.easeTo({ ...cible, duration: 900 }); else map.jumpTo(cible);
  if (en3d && anime && map.getZoom() < 14) aide('Zoomez sur un quartier pour voir les <b>bâtiments en volume</b>.', 3500);
}

function changerFond(fond) {
  donnees.vue.fond = fond;
  sauvegarder();
  map.setStyle(FONDS[fond]);   // les couches de jeu sont ré-ajoutées à « style.load »
}

// ---------------------------------------------------------------------
// Sélection et panneau latéral
// ---------------------------------------------------------------------
function selectionner(type, id, { centrer = false } = {}) {
  selection = type ? { type, id } : null;
  edition = false;
  sommetChoisi = null;
  if (type) ouvrirOnglet(ONGLET_DE[type], false);
  toutRedessiner();
  majEditeur();
  afficherAideOutil();
  if (centrer && type) localiser(type, id);
}

function localiser(type, id) {
  const x = trouver(type, id);
  if (!x) return;
  if (type === 'influence' && !x.position) { aide('Cette action n\'est pas encore placée sur la carte.', 2500); return; }
  if (x.position) map.easeTo({ center: x.position, zoom: Math.max(map.getZoom(), 15) });
  else map.fitBounds(emprise(x.coords), { padding: 80, maxZoom: 16, duration: 800 });
}

function ouvrirOnglet(nom, redessiner = true) {
  ongletActif = nom;
  document.querySelectorAll('#onglets [data-onglet]').forEach((b) => b.classList.toggle('actif', b.dataset.onglet === nom));
  if (redessiner) dessinerListe();
}

function dessinerListe() {
  ['territoires', 'havres', 'chasses', 'rondes'].forEach((k) => { document.querySelector(`[data-n="${k}"]`).textContent = donnees[k].length; });
  document.querySelector('[data-n="influences"]').textContent = influences.length;
  if (ongletActif === 'influences') { dessinerListeInfluences(); return; }
  const type = Object.keys(ONGLET_DE).find((t) => ONGLET_DE[t] === ongletActif);
  const elements = donnees[ongletActif];
  const zone = $('liste');
  if (!elements.length) {
    const outilBouton = { territoires: 'Territoire', havres: 'Havre', chasses: 'Chasse', rondes: 'Ronde' }[ongletActif];
    zone.replaceChildren(h('div', { class: 'carte-vide' }, 'Rien pour le moment. Choisissez l\'outil « ' + outilBouton + ' » dans la barre du haut, puis cliquez sur la carte.'));
    return;
  }
  zone.replaceChildren(...elements.map((x) => {
    const info = type === 'territoire' ? x.coords.length + ' sommets'
      : type === 'ronde' ? x.coords.length + ' points'
        : type === 'chasse' && x.rayon ? 'rayon ' + x.rayon + ' m' : '';
    const item = h('div', { class: 'carte-item' + (selection && selection.id === x.id ? ' sel' : ''), title: x.description || x.nom },
      h('span', { class: 'pastille', style: 'background:' + x.couleur }),
      h('span', { class: 'nom' }, x.nom),
      info ? h('span', { class: 'info' }, info) : '',
      h('button', { type: 'button', title: 'Localiser', onclick: (e) => { e.stopPropagation(); localiser(type, x.id); } }, '◎'),
      h('button', { type: 'button', title: 'Supprimer', onclick: (e) => { e.stopPropagation(); supprimer(type, x.id); } }, '×'));
    item.addEventListener('click', () => selectionner(type, x.id, { centrer: true }));
    return item;
  }));
}

function supprimer(type, id) {
  if (type === 'influence') return;   // une action se retire depuis la gestion des influences
  const x = trouver(type, id);
  if (!x || !confirm('Supprimer « ' + x.nom + ' » ?')) return;
  donnees[ONGLET_DE[type]] = liste(type).filter((y) => y.id !== id);
  if (selection && selection.id === id) { selection = null; edition = false; }
  sauvegarder(); toutRedessiner(); majEditeur(); afficherAideOutil();
}

function majEditeur() {
  const zone = $('editeur');
  const x = selection && trouver(selection.type, selection.id);
  if (!x) { zone.hidden = true; zone.replaceChildren(); return; }
  const type = selection.type;
  if (type === 'influence') { majEditeurInfluence(zone, x); return; }
  const changer = (champ, valeur, redessin = true) => {
    x[champ] = valeur;
    sauvegarder();
    if (redessin) { dessinerCouches(); dessinerMarqueurs(); }
    dessinerListe();
  };

  const nom = h('input', { type: 'text', value: x.nom, maxlength: 120, list: type === 'territoire' ? 'zonesConnues' : null });
  nom.addEventListener('input', () => changer('nom', nom.value.trim() || NOMS[type]));
  const desc = h('textarea', { maxlength: 4000, placeholder: 'Qui, quoi, depuis quand…' }, x.description);
  desc.addEventListener('input', () => changer('description', desc.value, false));

  // Couleur : palette + sélecteur libre
  const libre = h('input', { type: 'color', value: x.couleur, title: 'Autre couleur' });
  const couleurs = h('div', { class: 'carte-couleurs' }, PALETTE.map((c) => {
    const b = h('button', { type: 'button', class: c === x.couleur ? 'sel' : '', title: c, style: 'background:' + c });
    b.addEventListener('click', () => { changer('couleur', c); libre.value = c; couleurs.querySelectorAll('button').forEach((y) => y.classList.toggle('sel', y === b)); });
    return b;
  }), libre);
  libre.addEventListener('input', () => { changer('couleur', libre.value.toLowerCase()); couleurs.querySelectorAll('button').forEach((y) => y.classList.remove('sel')); });

  const champs = [
    h('label', { class: 'carte-champ' }, h('span', {}, 'Nom'), nom),
    h('label', { class: 'carte-champ' }, h('span', {}, 'Description'), desc),
    h('div', { class: 'carte-champ' }, h('span', {}, 'Couleur'), couleurs)
  ];

  if (type === 'territoire') {
    const sortie = h('output', {}, Math.round(x.opacite * 100) + ' %');
    const opa = h('input', { type: 'range', min: 0, max: 90, step: 1, value: Math.round(x.opacite * 100) });
    opa.addEventListener('input', () => { sortie.textContent = opa.value + ' %'; changer('opacite', +opa.value / 100); });
    champs.push(h('div', { class: 'carte-champ' }, h('span', {}, 'Opacité du remplissage'), h('div', { class: 'carte-ligne' }, opa, sortie)));
  }
  if (type === 'havre' || type === 'chasse') {
    const icones = h('div', { class: 'carte-icones' }, Object.entries(ICONES_LIEUX[type]).map(([k, [libelle, svg]]) => {
      const b = h('button', { type: 'button', class: k === x.icone ? 'sel' : '', title: libelle });
      b.innerHTML = svg;
      b.addEventListener('click', () => { changer('icone', k); icones.querySelectorAll('button').forEach((y) => y.classList.toggle('sel', y === b)); });
      return b;
    }));
    champs.push(h('div', { class: 'carte-champ' }, h('span', {}, 'Icône'), icones));
  }
  if (type === 'chasse') {
    const sortie = h('output', { id: 'sortieRayon' }, x.rayon + ' m');
    const rayon = h('input', { type: 'range', id: 'curseurRayon', min: RAYON.min, max: RAYON.max, step: RAYON.pas, value: x.rayon });
    rayon.addEventListener('input', () => { sortie.textContent = rayon.value + ' m'; changer('rayon', +rayon.value); });
    champs.push(h('div', { class: 'carte-champ' }, h('span', {}, 'Rayon de la zone de chasse'), h('div', { class: 'carte-ligne' }, rayon, sortie)),
      h('p', { class: 'carte-note' }, 'Ou glissez le point blanc sur le bord du cercle.'));
  }
  if (x.position) {
    champs.push(h('p', { class: 'carte-note' }, 'Position : ' + x.position[1].toFixed(5) + ', ' + x.position[0].toFixed(5) + '. Glissez le marqueur sur la carte pour le déplacer.'));
  }

  const btn = (texte, fn, cls = '') => h('button', { type: 'button', class: 'carte-btn ' + cls, onclick: fn }, texte);
  const actions = h('div', { class: 'carte-actions' });
  if (type === 'territoire' || type === 'ronde') {
    actions.append(btn(edition ? '✓ Terminer la modification' : '✎ Modifier le tracé', () => {
      edition = !edition; sommetChoisi = null; dessinerCouches(); majEditeur(); afficherAideOutil();
    }, edition ? 'actif' : ''));
    if (edition && sommetChoisi !== null) actions.append(btn('✕ Retirer ce point', () => retirerSommet(sommetChoisi), 'danger'));
  }
  if (type === 'territoire') {
    const echelle = (k) => {
      const c = centre(x.coords);
      x.coords = x.coords.map((p) => [+(c[0] + (p[0] - c[0]) * k).toFixed(7), +(c[1] + (p[1] - c[1]) * k).toFixed(7)]);
      sauvegarder(); dessinerCouches(); dessinerListe();
    };
    actions.append(btn('＋ Agrandir', () => echelle(1.1)), btn('－ Réduire', () => echelle(1 / 1.1)));
  }
  actions.append(btn('◎ Localiser', () => localiser(type, x.id)), btn('Supprimer', () => supprimer(type, x.id), 'danger'));

  zone.hidden = false;
  zone.replaceChildren(
    h('h2', {}, NOMS[type], h('button', { type: 'button', title: 'Fermer', onclick: () => selectionner(null) }, '×')),
    ...champs, actions);
}

// ---------------------------------------------------------------------
// Événements de la carte
// ---------------------------------------------------------------------
function brancherCarte() {
  map.on('click', (e) => {
    if (glisse) return;
    if (placement) { placerInfluence(placement, [e.lngLat.lng, e.lngLat.lat]); return; }
    if (outil === 'influence') { proposerNouvelleAction(e.lngLat); return; }
    if (outil === 'havre' || outil === 'chasse') { placerLieu(outil, e.lngLat); return; }
    if (outil === 'ronde' || outil === 'territoire') {
      const p = [+e.lngLat.lng.toFixed(7), +e.lngLat.lat.toFixed(7)];
      const dernier = brouillon[brouillon.length - 1];
      if (!dernier || dernier[0] !== p[0] || dernier[1] !== p[1]) brouillon.push(p);
      dessinerCouches();
      return;
    }
    // Navigation : poignée « milieu » = ajouter un point ; sinon sélection
    const poignee = map.queryRenderedFeatures(e.point, { layers: ['cam-poignees'] })[0];
    if (poignee && poignee.properties.role === 'milieu') {
      const x = trouver(selection.type, selection.id);
      const i = +poignee.properties.i;
      x.coords.splice(i + 1, 0, [+e.lngLat.lng.toFixed(7), +e.lngLat.lat.toFixed(7)]);
      sauvegarder(); dessinerCouches(); dessinerListe();
      return;
    }
    if (poignee) return;
    const ronde = map.queryRenderedFeatures([[e.point.x - 4, e.point.y - 4], [e.point.x + 4, e.point.y + 4]], { layers: ['cam-rondes'] })[0];
    if (ronde) { selectionner('ronde', ronde.properties.id); return; }
    const chasse = map.queryRenderedFeatures(e.point, { layers: ['cam-rayons-fond'] });
    if (chasse.length) { selectionner('chasse', chasse[chasse.length - 1].properties.id); return; }
    const terr = map.queryRenderedFeatures(e.point, { layers: ['cam-territoires-fond'] });
    if (terr.length) { selectionner('territoire', terr[terr.length - 1].properties.id); return; }
    if (selection && !edition) selectionner(null);
  });
  map.on('dblclick', (e) => {
    if (outil === 'ronde' || outil === 'territoire') { e.preventDefault(); terminerTrace(); }
  });
  map.on('mousemove', (e) => {
    $('coords').textContent = e.lngLat.lat.toFixed(5) + ', ' + e.lngLat.lng.toFixed(5);
    if ((outil === 'ronde' || outil === 'territoire') && brouillon.length) {
      curseur = [e.lngLat.lng, e.lngLat.lat];
      dessinerCouches();
    }
    if (glisse) deplacerPoignee(e.lngLat);
  });
  map.on('mouseenter', 'cam-poignees', () => { map.getCanvas().style.cursor = 'grab'; });
  map.on('mouseleave', 'cam-poignees', () => { map.getCanvas().style.cursor = ''; });
  map.on('mouseenter', 'cam-territoires-fond', () => { if (outil === 'naviguer' && !glisse) map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'cam-territoires-fond', () => { if (!glisse) map.getCanvas().style.cursor = ''; });
  map.on('mouseenter', 'cam-rayons-fond', () => { if (outil === 'naviguer' && !glisse) map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'cam-rayons-fond', () => { if (!glisse) map.getCanvas().style.cursor = ''; });

  // Glisser une poignée (souris ou doigt)
  const debut = (e) => {
    const f = e.features && e.features[0];
    if (!f || f.properties.role === 'milieu' || !selection) return;
    if (e.originalEvent && 'button' in e.originalEvent && e.originalEvent.button !== 0) return;   // clic droit : voir plus bas
    e.preventDefault();
    glisse = { role: f.properties.role, i: +f.properties.i, depart: [e.lngLat.lng, e.lngLat.lat], bouge: false };
    map.dragPan.disable();
    map.getCanvas().style.cursor = 'grabbing';
  };
  map.on('mousedown', 'cam-poignees', debut);
  map.on('touchstart', 'cam-poignees', debut);
  map.on('touchmove', (e) => { if (glisse) { e.preventDefault(); deplacerPoignee(e.lngLat); } });
  const fin = () => {
    if (!glisse) return;
    const { bouge, role, i } = glisse;
    setTimeout(() => { glisse = null; }, 0);   // le « click » qui suit ne doit pas désélectionner
    map.dragPan.enable();
    map.getCanvas().style.cursor = '';
    if (bouge) { sauvegarder(); dessinerListe(); }
    // Toucher un sommet sans le bouger le choisit : bouton « Retirer ce point » dans l'éditeur.
    sommetChoisi = !bouge && (role === 'sommet' || role === 'choisi') ? i : null;
    dessinerCouches(); majEditeur();
  };
  map.on('mouseup', fin);
  map.on('touchend', fin);

  // Clic droit sur un sommet : le supprimer (écouté directement sur la carte)
  map.getCanvasContainer().addEventListener('contextmenu', (ev) => {
    if (!edition || !selection) return;
    const r = map.getCanvas().getBoundingClientRect();
    const f = map.queryRenderedFeatures([ev.clientX - r.left, ev.clientY - r.top], { layers: ['cam-poignees'] })
      .find((x) => x.properties.role === 'sommet' || x.properties.role === 'choisi');
    if (!f) return;
    ev.preventDefault();
    retirerSommet(+f.properties.i);
  });

  map.on('moveend', () => {
    const c = map.getCenter();
    donnees.vue.centre = [+c.lng.toFixed(6), +c.lat.toFixed(6)];
    donnees.vue.zoom = +map.getZoom().toFixed(2);
    sauvegarder();
  });
  map.on('style.load', ajouterCouches);
}

function retirerSommet(i) {
  const x = selection && trouver(selection.type, selection.id);
  if (!x || !x.coords[i]) return;
  const min = selection.type === 'territoire' ? 3 : 2;
  if (x.coords.length <= min) { aide('Il faut garder au moins <b>' + min + ' points</b>.', 2500); return; }
  x.coords.splice(i, 1);
  sommetChoisi = null;
  sauvegarder(); dessinerCouches(); dessinerListe(); majEditeur();
}

function deplacerPoignee(lngLat) {
  const x = selection && trouver(selection.type, selection.id);
  if (!x || !glisse) return;
  const p = [+lngLat.lng.toFixed(7), +lngLat.lat.toFixed(7)];
  if (glisse.role === 'rayon') {
    x.rayon = bornerRayon(distance(x.position, p));
    if ($('curseurRayon')) { $('curseurRayon').value = x.rayon; $('sortieRayon').textContent = x.rayon + ' m'; }
  } else if (glisse.role === 'sommet' || glisse.role === 'choisi') {
    x.coords[glisse.i] = p;
  } else if (glisse.role === 'centre') {
    const dx = p[0] - glisse.depart[0], dy = p[1] - glisse.depart[1];
    x.coords = x.coords.map((q) => [+(q[0] + dx).toFixed(7), +(q[1] + dy).toFixed(7)]);
    glisse.depart = p;
  }
  glisse.bouge = true;
  dessinerCouches();
}

// ---------------------------------------------------------------------
// Export / import / références
// ---------------------------------------------------------------------
function exporter() {
  const contenu = JSON.stringify({ app: 'carte-grenoble', version: 1, personnage: perso ? perso.nom : null, exporteLe: new Date().toISOString(), ...donnees }, null, 2);
  const url = URL.createObjectURL(new Blob([contenu], { type: 'application/json' }));
  const a = h('a', { href: url, download: 'carte-grenoble' + (perso ? '-' + perso.nom.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '') + '-' + new Date().toISOString().slice(0, 10) + '.json' });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function importer(fichier) {
  try {
    const brut = JSON.parse(await fichier.text());
    const d = normaliser(brut);
    const total = d.territoires.length + d.havres.length + d.chasses.length + d.rondes.length;
    if (!total && !confirm('Ce fichier ne contient aucun élément. Vider la carte quand même ?')) return;
    if (total && !confirm('Remplacer la carte actuelle par celle du fichier (' + d.territoires.length + ' territoire(s), '
      + d.havres.length + ' havre(s), ' + d.chasses.length + ' zone(s) de chasse, ' + d.rondes.length + ' ronde(s)) ?')) return;
    d.vue.fond = donnees.vue.fond;
    donnees = d;
    selection = null; edition = false;
    sauvegarder();
    toutRedessiner(); majEditeur();
    map.jumpTo({ center: donnees.vue.centre, zoom: donnees.vue.zoom });
    appliquerMode(false);
    aide('Carte importée.', 2500);
  } catch (e) {
    alert('Fichier illisible : ' + e.message);
  }
}

function fenetreReferences() {
  const fond = h('div', { class: 'carte-fond-modal' });
  const fermer = () => { fond.remove(); document.removeEventListener('keydown', echap, true); };
  const echap = (e) => { if (e.key === 'Escape') { e.stopPropagation(); fermer(); } };
  const base = new URL('/assets/images/carte/', location.origin).href;
  const figure = (fichier, legende) => {
    const img = h('img', { src: base + fichier, alt: legende, loading: 'lazy' });
    img.addEventListener('click', () => window.open(img.src, '_blank', 'noopener'));
    return h('figure', {}, img, h('figcaption', {}, legende));
  };
  fond.append(h('div', { class: 'carte-modal', role: 'dialog', 'aria-label': 'Cartes de référence' },
    h('div', { class: 'carte-modal-tete' }, h('h2', {}, 'Zones de la Camarilla dauphinoise'), h('button', { type: 'button', onclick: fermer }, '×')),
    h('div', { class: 'carte-refs' },
      figure('zones-grenoble.webp', 'Grenoble et sa proche banlieue : zones 1 à 7'),
      figure('zones-isere.webp', 'Isère : zones 8 à 24, et les domaines voisins')),
    h('div', { class: 'carte-zones' },
      ZONES.map(([n, nom]) => h('div', {}, h('b', {}, n), nom)),
      h('div', {}, h('b', {}, '→'), DOMAINES.join(' · '))),
    h('p', { class: 'carte-note', style: 'padding:0 16px 16px' }, 'Pour reporter une zone sur la carte : outil « Territoire », puis choisissez son nom dans la liste proposée.')));
  fond.addEventListener('click', (e) => { if (e.target === fond) fermer(); });
  document.addEventListener('keydown', echap, true);
  document.body.append(fond);
}

// ---------------------------------------------------------------------
// Actions d'influence (Firestore) : une couche par mois / partie
// ---------------------------------------------------------------------
const echapper = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const preparer = (a) => ({ ...a, position: versPoint(a.lieu) });
const modifiableAction = (a) => !!perso && enJeu && a.proprietaire === session.user.uid && a.statut === 'attente'
  && !a.reponseConteur && modifiable(cal, a.mois);
const lienGestion = (a) => '/influences/?perso=' + encodeURIComponent(a.personnageId) + '&action=' + encodeURIComponent(a.id) + '#resultats';

function refusInfluence() {
  if (!perso) return 'Les conteurs consultent les actions ; seul un <b>personnage en jeu</b> peut en créer.';
  if (!enJeu) return '<b>' + echapper(perso.nom) + '</b> n\'est pas encore en jeu : pas d\'actions d\'influence.';
  if (!moisInfl) return 'Choisissez d\'abord le <b>mois</b> (la partie) dans la liste « Influences ».';
  if (!modifiable(cal, moisInfl)) return 'Les influences de <b>' + echapper(libelleMois(moisInfl).toLowerCase()) + '</b> ne sont pas ouvertes.';
  return '';
}

async function demarrerInfluences() {
  const select = $('moisInfl');
  enJeu = !!perso && perso.statut === 'active';
  if (perso && !enJeu) {
    select.replaceChildren(h('option', { value: '' }, 'personnage pas en jeu'));
    select.disabled = true;
    return;
  }
  try {
    const [c, actions] = await Promise.all([
      chargerCalendrier().catch(() => cal),
      perso ? fs.getDocs(fs.query(fs.collection(db, 'influences'),
        fs.where('proprietaire', '==', session.user.uid), fs.where('personnageId', '==', perso.id))) : null
    ]);
    cal = c;
    if (actions) mesActions = actions.docs.map((d) => preparer(donneesDoc(d))).sort((a, b) => millis(b.creeLe) - millis(a.creeLe));
  } catch (e) {
    select.replaceChildren(h('option', { value: '' }, 'indisponibles'));
    select.disabled = true;
    aide('Actions d\'influence indisponibles : ' + echapper(messageErreur(e)), 5000);
    return;
  }
  const params = new URLSearchParams(location.search);
  const mois = new Set(cal.parties.map((p) => p.cle));
  mois.add(moisParDefaut(cal));   // sans calendrier : le mois en cours
  (mesActions || []).forEach((a) => mois.add(a.mois));
  const demande = params.get('mois');
  if (demande && /^\d{4}-\d{2}$/.test(demande)) mois.add(demande);
  const triees = [...mois].sort().reverse();
  select.replaceChildren(h('option', { value: '' }, 'masquées'), ...triees.map((m) => {
    const p = partie(cal, m);
    const n = mesActions ? mesActions.filter((a) => a.mois === m).length : null;
    return h('option', { value: m }, libelleMois(m) + (p ? ' — ' + LIBELLES_ETAT[etat(p)].toLowerCase() : '') + (n !== null ? ' (' + n + ')' : ''));
  }));
  const parDefaut = demande && mois.has(demande) ? demande : moisParDefaut(cal);
  select.value = mois.has(parDefaut) ? parDefaut : '';
  await afficherMois(select.value);
  const id = params.get('action');
  if (id && trouver('influence', id)) { selectionner('influence', id, { centrer: true }); $('panneau').classList.add('ouvert'); }
}

async function afficherMois(m) {
  moisInfl = m;
  placement = null;
  if (selection && selection.type === 'influence') { selection = null; majEditeur(); }
  if (!m) influences = [];
  else if (mesActions) influences = mesActions.filter((a) => a.mois === m);
  else {
    if (!parMois.has(m)) {
      try {
        const s = await fs.getDocs(fs.query(fs.collection(db, 'influences'), fs.where('mois', '==', m)));
        parMois.set(m, s.docs.map((d) => preparer(donneesDoc(d))).sort((a, b) => (a.personnageNom || '').localeCompare(b.personnageNom || '')));
      } catch (e) { aide('Lecture des actions impossible : ' + echapper(messageErreur(e)), 5000); parMois.set(m, []); }
    }
    influences = parMois.get(m);
  }
  if (m && influences.length && ongletActif !== 'influences' && new URLSearchParams(location.search).get('mois') === m) ouvrirOnglet('influences', false);
  toutRedessiner();
  afficherAideOutil();
}

function dessinerMarqueursInfluences() {
  const presents = new Set();
  influences.forEach((a) => {
    if (!a.position) return;
    presents.add(a.id);
    const mobile = modifiableAction(a);
    const el = h('div', { class: 'carte-marqueur influence' + (selection && selection.id === a.id ? ' sel' : '') + (mobile ? ' mobile' : ''), title: a.nomAction + (perso ? '' : ' — ' + a.personnageNom) },
      h('div', { class: 'losange', style: 'background:' + couleurInfluence(a.categorie) }),
      h('div', { class: 'etiquette' }, perso ? a.nomAction : a.personnageNom));
    let m = marqueursInfl.get(a.id);
    if (m) {
      const actuel = m.getElement();
      classesMarqueur(actuel, el.className); actuel.title = el.title;
      actuel.replaceChildren(...el.childNodes);
      m.setLngLat(a.position);
      m.setDraggable(mobile);
      return;
    }
    m = new maplibregl.Marker({ element: el, draggable: mobile, anchor: 'center' }).setLngLat(a.position).addTo(map);
    el.addEventListener('click', (e) => { e.stopPropagation(); if (outil === 'naviguer' && !placement) selectionner('influence', a.id); });
    m.on('dragend', () => {
      const ll = m.getLngLat();
      placerInfluence(a.id, [ll.lng, ll.lat]);
    });
    marqueursInfl.set(a.id, m);
  });
  for (const [id, m] of marqueursInfl) if (!presents.has(id)) { m.remove(); marqueursInfl.delete(id); }
}

// Enregistre le lieu d'une action (ou le retire si p est null)
async function placerInfluence(id, p) {
  placement = null;
  afficherAideOutil();
  const a = trouver('influence', id);
  if (!a || !modifiableAction(a)) { toutRedessiner(); return; }
  const avant = a.lieu;
  a.lieu = p ? versLieu(p) : undefined;
  a.position = p ? versPoint(a.lieu) : null;
  toutRedessiner(); majEditeur();
  try {
    await fs.updateDoc(fs.doc(db, 'influences', id), { lieu: p ? a.lieu : fs.deleteField(), majLe: fs.serverTimestamp() });
    aide(p ? 'Lieu de l\'action enregistré.' : 'Action retirée de la carte.', 2000);
  } catch (e) {
    a.lieu = avant; a.position = versPoint(avant);
    toutRedessiner(); majEditeur();
    aide('Enregistrement refusé : ' + echapper(messageErreur(e)), 5000);
  }
}

function proposerNouvelleAction(lngLat) {
  const refus = refusInfluence();
  if (refus) { aide(refus, 4000); choisirOutil('naviguer'); return; }
  const lieu = versLieu([lngLat.lng, lngLat.lat]);
  const url = '/influences/?perso=' + encodeURIComponent(perso.id) + '&mois=' + encodeURIComponent(moisInfl)
    + '&lieu=' + lieu.lng + ',' + lieu.lat + '#actions';
  const contenu = h('div', { class: 'carte-popup' },
    h('strong', {}, 'Nouvelle action d\'influence'),
    h('p', {}, partie(cal, moisInfl) ? libellePartie(partie(cal, moisInfl)) : libelleMois(moisInfl)),
    h('a', { class: 'carte-btn actif', href: url }, 'Rédiger l\'action ici →'));
  new maplibregl.Popup({ closeOnClick: true, maxWidth: '260px' }).setLngLat(lngLat).setDOMContent(contenu).addTo(map);
  choisirOutil('naviguer');
}

function dessinerListeInfluences() {
  const zone = $('liste');
  const tete = [];
  if (moisInfl) {
    const p = partie(cal, moisInfl);
    tete.push(h('div', { class: 'carte-note carte-infl-tete' },
      h('b', {}, p ? libellePartie(p) : libelleMois(moisInfl)), h('br'), p ? resumeEtat(cal, p) : ''));
  }
  if (!moisInfl) { zone.replaceChildren(h('div', { class: 'carte-vide' }, 'Choisissez un mois dans la liste « Influences » de la barre du haut pour afficher les actions.')); return; }
  if (!influences.length) {
    zone.replaceChildren(...tete, h('div', { class: 'carte-vide' }, perso
      ? (modifiable(cal, moisInfl) && enJeu ? 'Aucune action ce mois-ci. Outil « Influence », puis cliquez sur la carte pour en rédiger une à cet endroit.' : 'Aucune action ce mois-ci.')
      : 'Aucune action envoyée pour ce mois.'));
    return;
  }
  zone.replaceChildren(...tete, ...influences.map((a) => {
    const item = h('div', { class: 'carte-item' + (selection && selection.id === a.id ? ' sel' : ''), title: a.descriptif || a.nomAction },
      h('span', { class: 'pastille losange', style: 'background:' + couleurInfluence(a.categorie) }),
      h('span', { class: 'nom' }, perso ? a.nomAction : a.personnageNom + ' — ' + a.nomAction),
      h('span', { class: 'info' }, a.position ? '' : 'non placée'),
      a.position ? h('button', { type: 'button', title: 'Localiser', onclick: (e) => { e.stopPropagation(); localiser('influence', a.id); } }, '◎') : '',
      !a.position && modifiableAction(a) ? h('button', { type: 'button', title: 'Placer sur la carte', onclick: (e) => { e.stopPropagation(); commencerPlacement(a.id); } }, '📍') : '');
    item.addEventListener('click', () => selectionner('influence', a.id, { centrer: !!a.position }));
    return item;
  }));
}

function commencerPlacement(id) {
  choisirOutil('naviguer');
  placement = id;
  selection = { type: 'influence', id };
  majEditeur(); dessinerListe();
  afficherAideOutil();
  $('panneau').classList.remove('ouvert');
}

function majEditeurInfluence(zone, a) {
  const p = partie(cal, a.mois);
  const mobile = modifiableAction(a);
  const ligne = (lib, val) => (val ? h('div', { class: 'carte-infl-ligne' }, h('span', {}, lib), h('b', {}, String(val))) : '');
  const btn = (texte, fn, cls = '') => h('button', { type: 'button', class: 'carte-btn ' + cls, onclick: fn }, texte);
  const actions = h('div', { class: 'carte-actions' });
  if (mobile) {
    actions.append(btn(a.position ? '📍 Déplacer' : '📍 Placer sur la carte', () => commencerPlacement(a.id), 'actif'));
    if (a.position) actions.append(btn('Retirer de la carte', () => placerInfluence(a.id, null)));
  }
  if (a.position) actions.append(btn('◎ Localiser', () => localiser('influence', a.id)));
  if (perso) actions.append(h('a', { class: 'carte-btn', href: lienGestion(a) }, mobile ? '✎ Modifier le texte' : 'Voir dans les influences'));
  zone.hidden = false;
  zone.replaceChildren(
    h('h2', {}, NOMS.influence, h('button', { type: 'button', title: 'Fermer', onclick: () => selectionner(null) }, '×')),
    h('div', { class: 'carte-infl' },
      perso ? '' : ligne('Personnage', a.personnageNom),
      ligne('Partie', p ? libellePartie(p) : libelleMois(a.mois)),
      ligne('Type', TYPES_ACTION[a.type] || a.type), ligne('Catégorie', a.categorie),
      ligne('Action', a.nomAction + ' — ' + a.pointsAction + ' pt(s)'),
      ligne('Raison sociale', a.raisonSociale), ligne('Cible', a.cible),
      ligne('Lieu', a.position ? a.lieu.lat.toFixed(5) + ', ' + a.lieu.lng.toFixed(5) : 'non placée'),
      a.descriptif ? h('p', { class: 'carte-infl-texte' }, a.descriptif) : '',
      h('p', { class: 'carte-infl-reponse' + (a.reponseConteur ? '' : ' vide') }, a.reponseConteur ? 'Résultat : ' + a.reponseConteur : 'En attente du résultat du conteur.'),
      h('p', { class: 'carte-note' }, mobile
        ? 'Modifiable jusqu\'au ' + dateFr(p ? p.limite : '') + ' : glissez le losange pour déplacer l\'action.'
        : (a.statut !== 'attente' || a.reponseConteur ? 'Action traitée par le conteur : lecture seule.'
          : (perso ? 'Influences closes pour cette partie : lecture seule.' : 'Lecture seule (vue conteur).')))),
    actions);
}

// ---------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------
function afficherGarde(...contenu) {
  const garde = $('cam-garde');
  garde.hidden = false;
  garde.replaceChildren(h('div', { class: 'cam-garde-boite' }, ...contenu,
    h('p', { class: 'sous-titre', style: 'margin-top:1rem' }, h('a', { href: '/membres/' }, '← Espace membres'))));
}

let demarre = false;
surSession(async (s) => {
  if (!s.pret || demarre) return;
  demarre = true;
  session = s;
  const retour = encodeURIComponent(location.pathname + location.search);
  if (!s.user) {
    afficherGarde(h('h2', {}, 'Connexion requise'), h('p', {}, 'La carte de Grenoble est réservée aux personnages des membres de l\'association.'),
      h('a', { class: 'cam-btn', href: '/connexion/?retour=' + retour }, 'Se connecter'));
    return;
  }
  if (!estActif(s.profil)) {
    afficherGarde(h('h2', {}, 'Compte pas encore actif'), h('p', {}, 'Un conteur doit activer votre compte avant que vous puissiez utiliser la carte.'));
    return;
  }
  const zone = h('div', {}, h('p', { class: 'sous-titre' }, 'Vérification de votre personnage…'));
  afficherGarde(zone);
  const acces = await exigerPersonnage(zone, s, { outil: 'la carte de Grenoble' });
  if (!acces) return;
  perso = acces.perso;
  $('cam-garde').hidden = true;
  cle = perso ? 'cam-carte-' + perso.id : 'cam-carte-conteur-' + s.user.uid;
  $('btnPerso').textContent = '☺ ' + (perso ? perso.nom : 'Conteur');
  $('btnPerso').title = perso ? 'Carte de ' + perso.nom + ' (cliquer pour changer de personnage)' : 'Carte du conteur (cliquer pour incarner un personnage)';
  charger();
  demarrerCarte();
});

function demarrerCarte() {
  // Icônes de la barre, zones proposées pour nommer les territoires
  document.querySelectorAll('[data-ico]').forEach((el) => { el.innerHTML = ICONES[el.dataset.ico] || ''; });
  $('zonesConnues').replaceChildren(...ZONES.map(([n, nom]) => h('option', { value: 'Zone ' + n + ' — ' + nom })), ...DOMAINES.map((d) => h('option', { value: d })));
  $('fond').value = donnees.vue.fond;

  try {
    map = new maplibregl.Map({
      container: 'carte',
      style: FONDS[donnees.vue.fond],
      center: donnees.vue.centre,
      zoom: donnees.vue.zoom,
      pitch: 0,
      maxPitch: 75,
      attributionControl: { compact: true, customAttribution: ATTRIBUTION }
    });
  } catch (e) {
    console.error(e);
    $('carte').append(h('div', { class: 'carte-erreur' }, 'La carte ne peut pas s\'afficher sur ce navigateur (WebGL indisponible) : ' + messageErreur(e)));
    return;
  }
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-left');
  map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');
  brancherCarte();
  window.CarteGrenoble = { map, donnees: () => donnees, influences: () => influences };   // utile pour déboguer depuis la console

  // Barre d'outils
  document.querySelectorAll('#outils [data-outil]').forEach((b) => b.addEventListener('click', () => { choisirOutil(b.dataset.outil); b.blur(); }));
  $('vuePlan').addEventListener('click', () => { donnees.vue.mode = 'plan'; sauvegarder(); appliquerMode(); });
  $('vue3d').addEventListener('click', () => { donnees.vue.mode = '3d'; sauvegarder(); appliquerMode(); });
  $('fond').addEventListener('change', () => changerFond($('fond').value));
  $('btnCentrer').addEventListener('click', () => map.flyTo({ center: GRENOBLE.centre, zoom: GRENOBLE.zoom, duration: 1200 }));
  $('btnRefs').addEventListener('click', fenetreReferences);
  $('btnExport').addEventListener('click', exporter);
  $('btnImport').addEventListener('click', () => $('fichierImport').click());
  $('fichierImport').addEventListener('change', () => { const f = $('fichierImport').files[0]; $('fichierImport').value = ''; if (f) importer(f); });
  $('btnPerso').addEventListener('click', () => fenetreChoixPersonnage(session.user.uid));
  $('btnPanneau').addEventListener('click', () => $('panneau').classList.toggle('ouvert'));
  $('moisInfl').addEventListener('change', () => afficherMois($('moisInfl').value));
  document.querySelectorAll('#onglets [data-onglet]').forEach((b) => b.addEventListener('click', () => ouvrirOnglet(b.dataset.onglet)));

  document.addEventListener('keydown', (e) => {
    const t = (e.target.tagName || '').toLowerCase();
    if (t === 'input' || t === 'textarea' || t === 'select') return;
    if (e.key === 'Escape') {
      if (placement) { placement = null; afficherAideOutil(); return; }
      if (brouillon.length) { brouillon = []; curseur = null; dessinerCouches(); }
      if (outil !== 'naviguer') choisirOutil('naviguer');
      else if (edition) { edition = false; dessinerCouches(); majEditeur(); afficherAideOutil(); }
      else if (selection) selectionner(null);
    } else if (e.key === 'Enter' && (outil === 'ronde' || outil === 'territoire')) {
      e.preventDefault();   // pas de « clic » sur le bouton qui aurait le focus
      terminerTrace();
    } else if (e.key === 'Backspace' && brouillon.length) {
      e.preventDefault(); brouillon.pop(); dessinerCouches();
    } else if ((e.key === 'Delete') && selection && !edition && selection.type !== 'influence') {
      supprimer(selection.type, selection.id);
    }
  });

  dessinerMarqueurs();
  dessinerListe();
  appliquerMode(false);   // boutons Plan / 3D ; les couches suivent à « style.load »
  demarrerInfluences();
}
