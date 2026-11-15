// =====================================================================
// Jeu « Trouve le Sabbat » — page /utils/sabbat
//   Un « GeoGuessr » limité à la commune de Grenoble : une photo de rue
//   (Mapillary) montre l'entrée d'un repaire du Sabbat ; le joueur place
//   son repère sur la carte. 5 repaires par traque, 5 000 points au plus
//   chacun selon la distance (débusqué à moins de 150 m).
//
// Photos : API Mapillary v4 (gratuite, jeton dans mapillary-config.js) et
//   visionneuse MapillaryJS. Les photos sont sous licence CC BY-SA : le
//   crédit (auteur, date, lien) s'affiche à chaque résultat, et la mention
//   Mapillary en permanence en bas de page. Pendant la manche, le crédit
//   intégré de la visionneuse est masqué (son lien donnerait le lieu).
// Carte : MapLibre + OpenFreeMap (comme la carte de Grenoble du site).
//
// Classement : Firestore classement/{uid}, un document par compte (les
//   points vont au joueur, pas à un personnage) :
//     { nom, total, parties, meilleure, derniere, debusques, majLe }
//   Les règles n'acceptent qu'une traque à la fois (+25 000 points au plus,
//   +5 débusqués au plus), au plus une toutes les 30 secondes.
//   Tout le monde peut jouer ; seuls les membres actifs inscrivent leurs
//   points et voient le classement. Un admin peut remettre un joueur à zéro.
// =====================================================================
import { h, db, fs, surSession, estActif, estAdmin, messageErreur, millis } from '../core.js';
import { FONDS, ATTRIBUTION, chargerMapLibre, dansPolygone } from '../carte-base.js';
import { MAPILLARY_JETON } from '../mapillary-config.js';

const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------------
// Réglages du jeu
// ---------------------------------------------------------------------
const MANCHES = 5;
const MAX_MANCHE = 5000;
const ECHELLE_KM = 1.2;        // décroissance des points avec la distance
const TOLERANCE_KM = 0.05;     // en dessous : points pleins
const DEBUSQUE_KM = 0.15;      // « repaire débusqué »
const ECART_MIN_KM = 0.6;      // écart souhaité entre deux repaires d'une traque
const ATTENTE_MS = 32000;      // entre deux enregistrements (règles : 30 s)
const MAPILLARY_JS = 'https://unpkg.com/mapillary-js@4.1.2/dist/';
const API_IMAGES = 'https://graph.mapillary.com/images';
const jetonManquant = !MAPILLARY_JETON || MAPILLARY_JETON.includes('A_REMPLACER');

// Contour de la commune de Grenoble (INSEE 38185), [lng, lat].
const CONTOUR = [[5.69965,45.16045],[5.70075,45.16507],[5.70047,45.16796],[5.70075,45.17262],[5.70078,45.17994],[5.70136,45.18796],[5.70159,45.19286],[5.70112,45.19566],[5.69988,45.19741],[5.68818,45.20562],[5.68084,45.21088],[5.67806,45.21317],[5.67932,45.21426],[5.68106,45.2134],[5.68466,45.21185],[5.68875,45.21096],[5.69374,45.21037],[5.69583,45.20982],[5.70775,45.20569],[5.71044,45.20494],[5.71392,45.20236],[5.71518,45.19989],[5.71988,45.19971],[5.72292,45.19849],[5.72545,45.19905],[5.7245,45.20125],[5.72483,45.20419],[5.72583,45.20496],[5.73036,45.20265],[5.73468,45.20117],[5.73697,45.20228],[5.73932,45.20203],[5.7423,45.19973],[5.74327,45.19652],[5.74221,45.19392],[5.7419,45.19187],[5.74336,45.1897],[5.74734,45.18891],[5.74893,45.18895],[5.74664,45.18682],[5.74749,45.18517],[5.74797,45.18241],[5.75048,45.18076],[5.75066,45.17918],[5.75304,45.17528],[5.75181,45.17194],[5.74973,45.1689],[5.74709,45.1698],[5.74539,45.17154],[5.74478,45.16931],[5.74302,45.16638],[5.74113,45.16684],[5.74126,45.16419],[5.7404,45.16327],[5.73973,45.15989],[5.73752,45.15937],[5.73721,45.15592],[5.73779,45.1543],[5.73472,45.15417],[5.73176,45.1548],[5.73166,45.15729],[5.73034,45.15889],[5.72618,45.1591],[5.7202,45.16008],[5.72008,45.15918],[5.70902,45.15842],[5.70355,45.15854]];
const BORNES = CONTOUR.reduce(([x0, y0, x1, y1], [x, y]) => [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)], [180, 90, -180, -90]);
const VUE_DEPART = { center: [5.7175, 45.1842], zoom: 12 };   // toute la commune dans la mini-carte

// Titres de fin de traque, selon le total
const TITRES = [
  [23000, 'Justicar', 'Rien n\'échappe à votre regard. Le Sabbat ne dormira plus tranquille à Grenoble.'],
  [19000, 'Archonte', 'Une traque implacable : la meute n\'a trouvé aucun refuge.'],
  [15000, 'Fléau', 'Le Prince peut compter sur vous pour nettoyer ses rues.'],
  [10000, 'Shérif', 'Vous connaissez la ville. Quelques repaires vous ont pourtant filé entre les doigts.'],
  [5000, 'Limier', 'Des pistes prometteuses, mais la meute a eu le temps de fuir.'],
  [0, 'Néonate égaré', 'Grenoble est vaste la nuit… Le Sabbat vous remercie de votre visite.']
];

// ---------------------------------------------------------------------
// Calculs
// ---------------------------------------------------------------------
function distanceKm([lng1, lat1], [lng2, lat2]) {
  const r = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * r / 2) ** 2
    + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lng2 - lng1) * r / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.min(1, Math.sqrt(a)));
}
const pointsPour = (km) => Math.round(MAX_MANCHE * Math.exp(-Math.max(0, km - TOLERANCE_KM) / ECHELLE_KM));
const nombre = (n) => Math.round(n).toLocaleString('fr-FR');
const texteDistance = (km) => (km < 1 ? Math.round(km * 1000) + ' m' : km.toLocaleString('fr-FR', { maximumFractionDigits: km < 10 ? 1 : 0 }) + ' km');
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const hasard = (a, b) => a + Math.random() * (b - a);
const auHasard = (liste) => liste[Math.floor(Math.random() * liste.length)];
function pointAuHasard() {
  for (;;) {
    const p = [hasard(BORNES[0], BORNES[2]), hasard(BORNES[1], BORNES[3])];
    if (dansPolygone(p, CONTOUR)) return p;
  }
}
function commentaire(km) {
  if (km <= DEBUSQUE_KM) return 'Repaire débusqué ! Les chasseurs du Prince sont sur place avant l\'aube.';
  if (km <= 0.5) return 'Tout près : le quartier est bouclé, la meute est aux abois.';
  if (km <= 1.5) return 'Bonne piste, mais le Sabbat a eu le temps de déménager.';
  if (km <= 3) return 'Mauvais quartier : la meute vous regarde passer en riant.';
  return 'Fausse piste. L\'informateur ne vous fera plus confiance.';
}

// ---------------------------------------------------------------------
// Mapillary : recherche d'une photo au hasard dans Grenoble
// ---------------------------------------------------------------------
// fatale : inutile de réessayer avec une autre photo (jeton refusé, réseau,
// visionneuse impossible à charger…).
class ErreurJeu extends Error { constructor(message, fatale = false) { super(message); this.fatale = fatale; } }
async function appelMapillary(params) {
  const url = API_IMAGES + '?' + new URLSearchParams({ access_token: MAPILLARY_JETON, ...params });
  let r;
  try { r = await fetch(url); } catch (e) { throw new ErreurJeu('Mapillary ne répond pas (connexion ?).', true); }
  if (!r.ok) {
    let detail = '';
    try { const err = (await r.json()).error || {}; detail = [err.type, err.message].filter(Boolean).join(' '); } catch (e) { /* réponse non JSON */ }
    if (r.status === 401 || r.status === 403 || /token|OAuth/i.test(detail)) {
      throw new ErreurJeu('Jeton Mapillary refusé : vérifiez assets/js/camarilla/mapillary-config.js.', true);
    }
    const erreur = new ErreurJeu('Mapillary a renvoyé une erreur (' + r.status + ')' + (detail ? ' : ' + detail : '') + '.', r.status === 429);
    erreur.champInvalide = r.status === 400 && /field/i.test(detail);
    throw erreur;
  }
  return r.json();
}
// Le champ « creator » (nom du photographe, pour le crédit) n'est pas
// accepté partout : s'il est refusé, on s'en passe (le lien vers la photo
// sur Mapillary reste affiché).
let champsPhoto = 'id,computed_geometry,geometry,is_pano,captured_at,creator';
async function photosDans(bbox) {
  try {
    return await appelMapillary({ fields: champsPhoto, bbox, limit: '80' });
  } catch (e) {
    if (!e.champInvalide || !champsPhoto.includes(',creator')) throw e;
    champsPhoto = champsPhoto.replace(',creator', '');
    return appelMapillary({ fields: champsPhoto, bbox, limit: '80' });
  }
}
function versCandidat(img) {
  const g = img && (img.computed_geometry || img.geometry);
  if (!g || !Array.isArray(g.coordinates)) return null;
  const point = [+g.coordinates[0], +g.coordinates[1]];
  if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) return null;
  return {
    id: String(img.id), point, pano: !!img.is_pano,
    date: img.captured_at ? new Date(img.captured_at) : null,
    auteur: (img.creator && img.creator.username) || ''
  };
}
/** Photo au hasard dans la commune, loin des repaires déjà joués (`exclus`). */
async function chercherPhoto(exclus) {
  for (let essai = 0; essai < 18; essai++) {
    const demi = essai < 8 ? 0.0022 : 0.0045;   // ± 170 à 500 m environ
    const [x, y] = pointAuHasard();
    const json = await photosDans([x - demi, y - demi, x + demi, y + demi].map((v) => v.toFixed(6)).join(','));
    const candidats = (json.data || []).map(versCandidat)
      .filter((c) => c && dansPolygone(c.point, CONTOUR) && !exclus.some((e) => e.id === c.id));
    if (!candidats.length) continue;
    const loin = candidats.filter((c) => exclus.every((e) => distanceKm(e.point, c.point) >= ECART_MIN_KM));
    const liste = loin.length ? loin : (essai >= 12 ? candidats : []);
    if (!liste.length) continue;
    // Les vues à 360° sont plus jouables : on les préfère quand il y en a.
    const panos = liste.filter((c) => c.pano);
    return auHasard(panos.length && Math.random() < 0.8 ? panos : liste);
  }
  throw new ErreurJeu('Aucune photo trouvée dans Grenoble pour le moment. Réessayez.', true);
}

// ---------------------------------------------------------------------
// Visionneuse MapillaryJS (chargée à la demande)
// ---------------------------------------------------------------------
let visionneuse = null;
let chargementMly = null;
function chargerMapillaryJs() {
  if (window.mapillary) return Promise.resolve(window.mapillary);
  if (!chargementMly) {
    document.head.append(h('link', { rel: 'stylesheet', href: MAPILLARY_JS + 'mapillary.css' }));
    chargementMly = new Promise((ok, ko) => {
      document.head.append(h('script', {
        src: MAPILLARY_JS + 'mapillary.js',
        onload: () => (window.mapillary ? ok(window.mapillary) : ko(new ErreurJeu('MapillaryJS introuvable.', true))),
        onerror: () => { chargementMly = null; ko(new ErreurJeu('La visionneuse Mapillary n\'a pas pu être chargée.', true)); }
      }));
    });
  }
  return chargementMly;
}
async function montrerPhoto(id) {
  const mly = await chargerMapillaryJs();
  if (!visionneuse) {
    if (typeof mly.isSupported === 'function' && !mly.isSupported()) {
      throw new ErreurJeu('Votre navigateur ne peut pas afficher les photos à 360° (WebGL désactivé ?).', true);
    }
    visionneuse = new mly.Viewer({
      accessToken: MAPILLARY_JETON,
      container: $('vue'),
      component: { cover: false, attribution: false, sequence: false }
    });
  }
  await visionneuse.moveTo(id);
}

// ---------------------------------------------------------------------
// Carte (MapLibre)
// ---------------------------------------------------------------------
let maplibregl = null;
let carte = null;
let repere = null;            // marqueur du joueur pendant la manche
let marqueursResultat = [];   // marqueurs du résultat / du bilan
let fond = 'nuit';
const FC = (features) => ({ type: 'FeatureCollection', features });
const ligne = (a, b) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [a, b] } });

function ajouterCouches() {
  if (!carte.getSource('grenoble')) {
    carte.addSource('grenoble', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[...CONTOUR, CONTOUR[0]]] } } });
  }
  if (!carte.getLayer('grenoble-bord')) {
    carte.addLayer({ id: 'grenoble-bord', type: 'line', source: 'grenoble', paint: { 'line-color': '#c4283d', 'line-width': 1.6, 'line-dasharray': [2, 1.5], 'line-opacity': 0.85 } });
  }
  if (!carte.getSource('traits')) carte.addSource('traits', { type: 'geojson', data: FC(traits) });
  if (!carte.getLayer('traits')) {
    carte.addLayer({ id: 'traits', type: 'line', source: 'traits', paint: { 'line-color': '#e6e1d6', 'line-width': 2.2, 'line-dasharray': [1.2, 1.2] } });
  }
}
let traits = [];
function dessinerTraits(liste) {
  traits = liste;
  const src = carte && carte.getSource('traits');
  if (src) src.setData(FC(traits));
}
async function preparerCarte() {
  if (carte) return;
  maplibregl = await chargerMapLibre();
  carte = new maplibregl.Map({
    container: $('carte'), style: FONDS[fond], ...VUE_DEPART, minZoom: 11, maxZoom: 19,
    maxBounds: [[BORNES[0] - 0.08, BORNES[1] - 0.06], [BORNES[2] + 0.08, BORNES[3] + 0.06]],
    dragRotate: false, pitchWithRotate: false,
    attributionControl: { compact: true, customAttribution: ATTRIBUTION }
  });
  carte.touchZoomRotate.disableRotation();
  carte.on('style.load', ajouterCouches);
  carte.on('click', (e) => { if (etape === 'manche') poserRepere([e.lngLat.lng, e.lngLat.lat]); });
}
function poserRepere(point) {
  if (!repere) {
    repere = new maplibregl.Marker({ color: '#c4283d', draggable: true }).setLngLat(point).addTo(carte);
    repere.getElement().classList.add('sabbat-repere');
  } else repere.setLngLat(point);
  const b = $('btnDeviner');
  b.disabled = false;
  b.textContent = 'Deviner ici';
}
function retirerRepere() { if (repere) { repere.remove(); repere = null; } }
function viderResultat() {
  marqueursResultat.forEach((m) => m.remove());
  marqueursResultat = [];
  dessinerTraits([]);
}
function marqueur(point, classe, texte, titre) {
  const el = h('div', { class: classe, title: titre || '' }, texte || '');
  const m = new maplibregl.Marker({ element: el }).setLngLat(point).addTo(carte);
  marqueursResultat.push(m);
  return m;
}
// Cadre la carte sur les points, en laissant la place du panneau de résultat.
function cadrer(points, panneau) {
  if (!points.length) return;
  const b = points.reduce((acc, p) => acc.extend(p), new maplibregl.LngLatBounds(points[0], points[0]));
  const r = panneau && panneau.getBoundingClientRect();
  const zone = $('carte').getBoundingClientRect();
  const pad = { top: 60, bottom: 60, left: 50, right: 50 };
  if (r && r.width) {
    if (r.top - zone.top > zone.height * 0.25) pad.bottom += Math.max(0, zone.bottom - r.top);   // panneau en bas
    else pad.left += Math.max(0, r.right - zone.left);                                           // panneau à gauche
  }
  if (pad.top + pad.bottom > zone.height - 80) pad.bottom = Math.max(20, zone.height - pad.top - 80);
  if (pad.left + pad.right > zone.width - 80) pad.left = Math.max(20, zone.width - pad.right - 80);
  carte.fitBounds(b, { padding: pad, maxZoom: 16, duration: 700 });
}

// ---------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------
let session = { user: null, profil: null, pret: false };
const peutEnregistrer = () => !!session.user && estActif(session.profil);
const lienConnexion = () => h('a', { href: '/connexion/?retour=' + encodeURIComponent(location.pathname) }, 'Se connecter');
function afficherJoueur() {
  const zone = $('joueur');
  const statut = $('statutAccueil');
  zone.replaceChildren(!session.pret ? '' : session.user
    ? h('span', {}, '☺ ', h('b', {}, session.profil ? session.profil.nom : session.user.email))
    : lienConnexion());
  if (jetonManquant) {
    statut.replaceChildren(h('div', { class: 'cam-msg err' }, 'Le jeu n\'est pas encore configuré : il manque le jeton Mapillary (assets/js/camarilla/mapillary-config.js, voir docs/FIREBASE.md).'));
    $('btnCommencer').disabled = true;
  } else if (!session.pret) {
    statut.replaceChildren();
  } else if (peutEnregistrer()) {
    statut.replaceChildren(h('p', {}, 'Vos points seront inscrits au classement au nom de ', h('b', {}, session.profil.nom), '.'));
  } else if (session.user) {
    statut.replaceChildren(h('p', {}, 'Votre compte n\'est pas encore actif : vous pouvez jouer, mais vos points ne seront pas inscrits au classement.'));
  } else {
    statut.replaceChildren(h('p', {}, 'Vous pouvez jouer sans être connecté, mais seuls les membres de l\'association inscrivent leurs points au classement. ', lienConnexion(), '.'));
  }
}

// ---------------------------------------------------------------------
// Déroulement d'une traque
// ---------------------------------------------------------------------
let etape = 'accueil';        // accueil | manche | revele | bilan
let traque = null;            // { manches: [{ photo, devine, km, points }], index }
let prochaine = null;         // recherche anticipée de la photo suivante

function changerEtape(e) {
  etape = e;
  document.body.dataset.etape = e;
  document.body.classList.remove('carte-ouverte');
  $('compteurs').hidden = e === 'accueil';
  $('btnAbandon').hidden = !(e === 'manche' || e === 'revele');
  $('accueil').hidden = e !== 'accueil';
  $('resultat').hidden = e !== 'revele';
  $('bilan').hidden = e !== 'bilan';
  if (carte) requestAnimationFrame(() => carte.resize());
}
function majCompteurs() {
  $('numManche').textContent = String(Math.min(traque.index + 1, MANCHES));
  $('nbManches').textContent = String(MANCHES);
  $('score').textContent = nombre(traque.manches.reduce((s, m) => s + (m.points || 0), 0));
}
function chargement(texte) {
  $('chargement').hidden = !texte;
  if (texte) $('chargementTexte').textContent = texte;
}
const dejaJoues = () => traque.manches.filter((m) => m.photo).map((m) => m.photo);
function anticiper() {
  if (traque.index + 1 >= MANCHES) { prochaine = null; return; }
  prochaine = chercherPhoto(dejaJoues());
  prochaine.catch(() => {});   // l'erreur sera traitée au moment voulu
}

async function commencerTraque() {
  if (jetonManquant) return;
  traque = { manches: [], index: 0 };
  prochaine = null;
  changerEtape('manche');
  try { await preparerCarte(); } catch (e) { erreurTraque(e); return; }
  await lancerManche();
}

async function lancerManche() {
  const t = traque;
  const n = t.index;
  traque.manches[n] = { photo: null, devine: null, km: null, points: null };
  majCompteurs();
  viderResultat();
  retirerRepere();
  $('btnDeviner').disabled = true;
  $('btnDeviner').textContent = 'Placez votre repère sur la carte';
  carte.jumpTo(VUE_DEPART);
  changerEtape('manche');
  chargement('Un informateur vous transmet la photo…');
  let derniereErreur = null;
  const exclus = [];   // photos que la visionneuse n'a pas pu afficher
  for (let essai = 0; essai < 4 && !t.manches[n].photo; essai++) {
    let photo = null;
    try {
      photo = await (prochaine || chercherPhoto([...dejaJoues(), ...exclus]));
      prochaine = null;
      if (traque !== t) return;   // traque abandonnée entre-temps
      await montrerPhoto(photo.id);
      if (traque !== t) return;
      t.manches[n].photo = photo;
    } catch (e) {
      prochaine = null;
      derniereErreur = e;
      if (photo) exclus.push(photo);
      console.warn('Photo écartée', photo && photo.id, e);
      if (e && e.fatale) break;
    }
  }
  if (traque !== t) return;
  chargement('');
  if (!t.manches[n].photo) { erreurTraque(derniereErreur || new Error('Photo introuvable.')); return; }
  anticiper();
}

function deviner() {
  if (etape !== 'manche' || !repere) return;
  const m = traque.manches[traque.index];
  if (!m.photo) return;
  const p = repere.getLngLat();
  m.devine = [p.lng, p.lat];
  m.km = distanceKm(m.devine, m.photo.point);
  m.points = pointsPour(m.km);
  retirerRepere();
  changerEtape('revele');
  majCompteurs();
  marqueur(m.devine, 'sabbat-pion joueur', '', 'Votre repère');
  marqueur(m.photo.point, 'sabbat-pion repaire', '✠', 'Le repaire');
  dessinerTraits([ligne(m.devine, m.photo.point)]);
  requestAnimationFrame(() => cadrer([m.devine, m.photo.point], $('resultat')));
  afficherResultat(m);
}

function credit(photo) {
  const date = photo.date && !isNaN(photo.date) ? photo.date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '';
  return h('p', { class: 'sabbat-credit' }, 'Photo : ', photo.auteur ? h('b', {}, photo.auteur) : 'contributeur Mapillary',
    date ? ', ' + date : '', ' · Mapillary, CC BY-SA 4.0 · ',
    h('a', { href: 'https://www.mapillary.com/app/?pKey=' + encodeURIComponent(photo.id) + '&focus=photo', target: '_blank', rel: 'noopener' }, 'voir sur Mapillary'));
}

function afficherResultat(m) {
  const dernier = traque.index + 1 >= MANCHES;
  const suivant = h('button', { class: 'sabbat-btn principal grand', id: 'btnSuivant', onclick: suite },
    dernier ? 'Voir le bilan de la traque' : 'Repaire suivant');
  $('resultat').replaceChildren(
    h('div', { class: 'sabbat-res-tete' },
      h('span', { class: 'sabbat-res-num' }, 'Repaire ' + (traque.index + 1) + ' / ' + MANCHES),
      m.km <= DEBUSQUE_KM ? h('span', { class: 'sabbat-badge' }, 'Débusqué') : ''),
    h('div', { class: 'sabbat-res-chiffres' },
      h('div', {}, h('small', {}, 'Distance'), h('strong', { id: 'resDistance' }, texteDistance(m.km))),
      h('div', {}, h('small', {}, 'Points'), h('strong', { id: 'resPoints' }, nombre(m.points)), h('small', {}, ' / ' + nombre(MAX_MANCHE)))),
    h('div', { class: 'sabbat-jauge' }, h('span', { style: 'width:' + (100 * m.points / MAX_MANCHE).toFixed(1) + '%' })),
    h('p', { class: 'sabbat-commentaire' }, commentaire(m.km)),
    credit(m.photo),
    h('div', { class: 'sabbat-actions' }, suivant));
  suivant.focus({ preventScroll: true });
}

function suite() {
  if (etape !== 'revele') return;
  traque.index += 1;
  if (traque.index >= MANCHES) { terminerTraque(); return; }
  lancerManche();
}

function terminerTraque() {
  const total = traque.manches.reduce((s, m) => s + m.points, 0);
  const debusques = traque.manches.filter((m) => m.km <= DEBUSQUE_KM).length;
  const [, titre, phrase] = TITRES.find(([seuil]) => total >= seuil);
  changerEtape('bilan');
  $('numManche').textContent = String(MANCHES);
  viderResultat();
  const tous = [];
  traque.manches.forEach((m, i) => {
    marqueur(m.devine, 'sabbat-pion joueur petit', String(i + 1), 'Votre repère n° ' + (i + 1));
    marqueur(m.photo.point, 'sabbat-pion repaire petit', '✠', 'Repaire n° ' + (i + 1));
    tous.push(m.devine, m.photo.point);
  });
  dessinerTraits(traque.manches.map((m) => ligne(m.devine, m.photo.point)));
  const statut = h('div', { class: 'sabbat-statut', id: 'statutEnregistrement' });
  $('bilan').replaceChildren(
    h('div', { class: 'sabbat-res-tete' }, h('span', { class: 'sabbat-res-num' }, 'Fin de la traque')),
    h('div', { class: 'sabbat-total' }, h('strong', { id: 'bilanTotal' }, nombre(total)), h('small', {}, ' / ' + nombre(MANCHES * MAX_MANCHE) + ' points')),
    h('p', { class: 'sabbat-titre' }, titre),
    h('p', { class: 'sabbat-commentaire' }, phrase),
    h('ol', { class: 'sabbat-liste' }, traque.manches.map((m) => h('li', {},
      h('span', {}, texteDistance(m.km)), m.km <= DEBUSQUE_KM ? h('span', { class: 'sabbat-badge petit' }, 'Débusqué') : '',
      h('b', {}, nombre(m.points))))),
    h('p', { class: 'sabbat-credit' }, 'Photos : ', traque.manches.map((m, i) => [i ? ', ' : '',
      h('a', { href: 'https://www.mapillary.com/app/?pKey=' + encodeURIComponent(m.photo.id) + '&focus=photo', target: '_blank', rel: 'noopener' },
        (i + 1) + (m.photo.auteur ? ' (' + m.photo.auteur + ')' : ''))]), ' · Mapillary, CC BY-SA 4.0'),
    statut,
    h('div', { class: 'sabbat-actions' },
      h('button', { class: 'sabbat-btn principal grand', id: 'btnRejouer', onclick: commencerTraque }, 'Nouvelle traque'),
      h('button', { class: 'sabbat-btn grand', onclick: () => ouvrirClassement() }, 'Classement')));
  requestAnimationFrame(() => cadrer(tous, $('bilan')));
  enregistrer(total, debusques, statut);
}

function erreurTraque(e) {
  console.error(e);
  chargement('');
  traque = null;
  prochaine = null;
  changerEtape('accueil');
  $('statutAccueil').replaceChildren(h('div', { class: 'cam-msg err' }, 'La traque n\'a pas pu continuer : ' + (e && e.message ? e.message : messageErreur(e))));
}

function abandonner() {
  if (!traque || !window.confirm('Abandonner cette traque ? Ses points ne seront pas comptés.')) return;
  traque = null;
  prochaine = null;
  chargement('');
  retirerRepere();
  viderResultat();
  changerEtape('accueil');
  afficherJoueur();
}

// ---------------------------------------------------------------------
// Classement (Firestore)
// ---------------------------------------------------------------------
async function enregistrer(total, debusques, statut) {
  if (!peutEnregistrer()) {
    statut.replaceChildren(h('p', {}, session.user
      ? 'Votre compte n\'est pas encore actif : ces points ne sont pas inscrits au classement.'
      : 'Connectez-vous avec votre compte de membre pour inscrire vos points au classement. ', session.user ? '' : lienConnexion()));
    return;
  }
  const { user, profil } = session;
  const ref = fs.doc(db, 'classement', user.uid);
  statut.replaceChildren(h('p', {}, 'Inscription des points au classement…'));
  try {
    const snap = await fs.getDoc(ref);
    let donnees;
    if (snap.exists()) {
      const a = snap.data();
      const attente = millis(a.majLe) + ATTENTE_MS - Date.now();
      if (attente > 0) {
        statut.replaceChildren(h('p', {}, 'Une traque toutes les 30 secondes au plus : enregistrement dans ', h('b', {}, String(Math.ceil(attente / 1000))), ' s…'));
        await pause(attente);
      }
      donnees = {
        nom: profil.nom, total: (a.total || 0) + total, parties: (a.parties || 0) + 1,
        meilleure: Math.max(a.meilleure || 0, total), derniere: total, debusques: (a.debusques || 0) + debusques,
        majLe: fs.serverTimestamp()
      };
    } else {
      donnees = { nom: profil.nom, total, parties: 1, meilleure: total, derniere: total, debusques, majLe: fs.serverTimestamp() };
    }
    await fs.setDoc(ref, donnees);
    statut.replaceChildren(h('div', { class: 'cam-msg ok' }, 'Points inscrits au classement : ', h('b', {}, nombre(donnees.total)),
      ' au total, en ', String(donnees.parties), ' traque' + (donnees.parties > 1 ? 's' : '') + (total >= donnees.meilleure && donnees.parties > 1 ? ' — nouveau record !' : '.')));
  } catch (e) {
    console.error(e);
    statut.replaceChildren(h('div', { class: 'cam-msg err' }, 'Enregistrement impossible : ' + messageErreur(e) + ' ',
      h('button', { class: 'sabbat-btn', onclick: () => enregistrer(total, debusques, statut) }, 'Réessayer')));
  }
}

let triClassement = 'total';
async function ouvrirClassement(tri = triClassement) {
  triClassement = tri;
  $('classement').hidden = false;
  document.querySelectorAll('#classement [data-tri]').forEach((b) => b.classList.toggle('actif', b.dataset.tri === tri));
  const zone = $('classementContenu');
  if (!session.pret) { zone.replaceChildren(h('p', {}, 'Chargement…')); return; }
  if (!peutEnregistrer()) {
    zone.replaceChildren(h('p', {}, 'Le classement est réservé aux membres de l\'association. ', session.user ? 'Votre compte doit d\'abord être activé par un conteur.' : lienConnexion()));
    return;
  }
  zone.replaceChildren(h('p', {}, 'Chargement…'));
  try {
    const snap = await fs.getDocs(fs.query(fs.collection(db, 'classement'), fs.orderBy(tri, 'desc'), fs.limit(100)));
    const lignes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (triClassement !== tri) return;
    if (!lignes.length) { zone.replaceChildren(h('p', {}, 'Personne n\'a encore traqué le Sabbat. À vous l\'honneur !')); return; }
    const admin = estAdmin(session.profil);
    let rang = 0;
    const corps = lignes.map((l, i) => {
      if (i === 0 || l[tri] !== lignes[i - 1][tri]) rang = i + 1;
      return h('tr', { class: l.id === session.user.uid ? 'moi' : '', dataset: { uid: l.id } },
        h('td', { class: 'rang' }, rang <= 3 ? ['', '🥇', '🥈', '🥉'][rang] : String(rang)),
        h('td', {}, l.nom || '?'),
        h('td', { class: 'num' + (tri === 'total' ? ' tri' : '') }, nombre(l.total || 0)),
        h('td', { class: 'num' + (tri === 'meilleure' ? ' tri' : '') }, nombre(l.meilleure || 0)),
        h('td', { class: 'num' }, String(l.parties || 0)),
        h('td', { class: 'num' }, String(l.debusques || 0)),
        admin ? h('td', {}, h('button', {
          class: 'sabbat-mini', title: 'Remettre ce joueur à zéro',
          onclick: async () => {
            if (!window.confirm('Remettre ' + (l.nom || 'ce joueur') + ' à zéro dans le classement ?')) return;
            try { await fs.deleteDoc(fs.doc(db, 'classement', l.id)); ouvrirClassement(triClassement); } catch (e) { window.alert(messageErreur(e)); }
          }
        }, '✕')) : '');
    });
    const moi = lignes.find((l) => l.id === session.user.uid);
    zone.replaceChildren(
      h('div', { class: 'sabbat-table-zone' }, h('table', { class: 'sabbat-table' },
        h('thead', {}, h('tr', {}, h('th', {}, '#'), h('th', {}, 'Joueur'), h('th', { class: 'num' }, 'Points'),
          h('th', { class: 'num' }, 'Meilleure'), h('th', { class: 'num' }, 'Traques'), h('th', { class: 'num', title: 'Repaires trouvés à moins de 150 m' }, 'Débusqués'),
          admin ? h('th', {}, '') : '')),
        h('tbody', {}, corps))),
      h('p', { class: 'sabbat-note' }, moi ? '' : 'Vous n\'êtes pas encore classé : terminez une traque pour y figurer. ',
        'Points : total de toutes les traques. Meilleure : meilleure traque (sur ' + nombre(MANCHES * MAX_MANCHE) + ').'));
  } catch (e) {
    console.error(e);
    zone.replaceChildren(h('div', { class: 'cam-msg err' }, 'Classement indisponible : ' + messageErreur(e)));
  }
}

// ---------------------------------------------------------------------
// Commandes
// ---------------------------------------------------------------------
$('btnCommencer').addEventListener('click', commencerTraque);
$('btnClassement').addEventListener('click', () => ouvrirClassement());
$('btnClassement2').addEventListener('click', () => ouvrirClassement());
$('btnFermerClassement').addEventListener('click', () => { $('classement').hidden = true; });
$('classement').addEventListener('click', (e) => { if (e.target === $('classement')) $('classement').hidden = true; });
document.querySelectorAll('#classement [data-tri]').forEach((b) => b.addEventListener('click', () => ouvrirClassement(b.dataset.tri)));
$('btnDeviner').addEventListener('click', deviner);
$('btnAbandon').addEventListener('click', abandonner);
$('btnDepart').addEventListener('click', () => {
  const m = traque && traque.manches[traque.index];
  if (visionneuse && m && m.photo) visionneuse.moveTo(m.photo.id).catch(() => {});
});
$('btnAgrandir').addEventListener('click', () => $('zoneCarte').classList.toggle('grande'));
$('btnOuvrirCarte').addEventListener('click', () => document.body.classList.add('carte-ouverte'));
$('btnFermerCarte').addEventListener('click', () => document.body.classList.remove('carte-ouverte'));
$('btnFond').addEventListener('click', () => {
  fond = fond === 'nuit' ? 'jour' : 'nuit';
  $('btnFond').textContent = fond === 'nuit' ? '☀' : '☾';
  if (carte) carte.setStyle(FONDS[fond]);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('classement').hidden) { $('classement').hidden = true; return; }
  if (e.key !== 'Enter' || e.target.closest('input, textarea, select, a')) return;
  if (etape === 'manche' && repere) { e.preventDefault(); deviner(); } else if (etape === 'revele' && e.target.id !== 'btnSuivant') { e.preventDefault(); suite(); }
});

surSession((s) => {
  session = s;
  afficherJoueur();
  if (!$('classement').hidden) ouvrirClassement();
});
afficherJoueur();
