// =====================================================================
// Éléments communs aux cartes du site (MapLibre + OpenFreeMap)
//   - constantes (centre de Grenoble, fonds de carte) ;
//   - chargement de MapLibre à la demande (pages qui n'en ont pas toujours
//     besoin, comme la gestion des influences) ;
//   - choisirLieu() : fenêtre où l'on clique sur la carte pour choisir un
//     point (lieu d'une action d'influence) ;
//   - territoires officiels (zones 1 à 24, domaines…) tracés par les
//     conteurs : lecture, et zone qui contient un point.
// =====================================================================
import { h, db, fs } from './core.js';
import { decompresserJson } from './compression.js';

export const GRENOBLE = { centre: [5.7245, 45.1885], zoom: 13 };
export const FONDS = {
  nuit: 'https://tiles.openfreemap.org/styles/dark',
  jour: 'https://tiles.openfreemap.org/styles/liberty'
};
export const MAPLIBRE = 'https://unpkg.com/maplibre-gl@6.18.0/dist/';
export const ATTRIBUTION = 'Tuiles <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a>';

// Couleurs des actions d'influence sur la carte (selon la catégorie)
export function couleurInfluence(categorie) {
  const c = categorie || '';
  if (c.includes('Gotha')) return '#c9a227';
  if (c.includes('Pègre')) return '#9b1c2c';
  return '#3d6fa5';   // AIP
}
// Position enregistrée { lng, lat } <-> [lng, lat]
export const versPoint = (lieu) => (lieu && Number.isFinite(lieu.lng) && Number.isFinite(lieu.lat) ? [lieu.lng, lieu.lat] : null);
export const versLieu = (p) => ({ lng: +(+p[0]).toFixed(6), lat: +(+p[1]).toFixed(6) });
export const texteLieu = (lieu) => (lieu ? lieu.lat.toFixed(5) + ', ' + lieu.lng.toFixed(5) : '');

// ---------------------------------------------------------------------
// Territoires officiels : document territoires/officiels, tenu par les
// conteurs (page /membres/territoires/). donnees = JSON compressé :
// { version, territoires: [{ id, nom, description, couleur, opacite, zone, coords }] }
// ---------------------------------------------------------------------
let territoiresEnCache = null;
export async function chargerTerritoires({ frais = false } = {}) {
  if (territoiresEnCache && !frais) return territoiresEnCache;
  const s = await fs.getDoc(fs.doc(db, 'territoires', 'officiels'));
  const brut = s.exists() ? JSON.parse(await decompresserJson(s.data().donnees) || '{}') : {};
  territoiresEnCache = (Array.isArray(brut.territoires) ? brut.territoires : [])
    .filter((t) => Array.isArray(t.coords) && t.coords.length >= 3);
  return territoiresEnCache;
}

// Point dans un polygone (lancer de rayon), coordonnées [lng, lat].
export function dansPolygone([x, y], pts) {
  let dedans = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}
/** Numéro de la zone officielle qui contient le point, ou '' (aucune). */
export function zoneDuPoint(territoires, point) {
  const t = (territoires || []).find((x) => x.zone && dansPolygone(point, x.coords));
  return t ? String(t.zone) : '';
}
const FC = (features) => ({ type: 'FeatureCollection', features });
/** GeoJSON des territoires (pour une couche MapLibre). */
export function geojsonTerritoires(territoires) {
  return FC((territoires || []).map((t) => ({
    type: 'Feature',
    properties: { id: t.id, nom: t.nom, couleur: t.couleur || '#7d5ba6', opacite: Number.isFinite(t.opacite) ? t.opacite : 0.2 },
    geometry: { type: 'Polygon', coordinates: [[...t.coords, t.coords[0]]] }
  })));
}

let chargement = null;
export function chargerMapLibre() {
  if (!document.querySelector('link[data-maplibre]')) {
    document.head.append(h('link', { rel: 'stylesheet', href: MAPLIBRE + 'maplibre-gl.css', 'data-maplibre': '' }));
  }
  if (!chargement) chargement = import(MAPLIBRE + 'maplibre-gl.mjs').catch((e) => { chargement = null; throw e; });
  return chargement;
}

// Fenêtre de choix d'un point. Résout { lng, lat }, ou null si annulé.
export function choisirLieu({ initial = null, titre = 'Lieu de l\'action', couleur = '#c4283d', territoires = [] } = {}) {
  return new Promise((resoudre) => {
    let choix = initial ? versPoint(initial) : null;
    let carte = null, marqueur = null;
    const info = h('span', { class: 'cam-lieu-info' }, choix ? texteLieu(versLieu(choix)) : 'Cliquez sur la carte pour placer l\'action.');
    const valider = h('button', { type: 'button', disabled: !choix }, 'Valider ce lieu');
    const zone = h('div', { class: 'cam-lieu-carte' });
    const fond = h('div', { class: 'cam-lieu-fond' },
      h('div', { class: 'cam-lieu-boite', role: 'dialog', 'aria-label': titre },
        h('div', { class: 'cam-lieu-tete' }, h('strong', {}, titre), h('button', { type: 'button', class: 'cam-lieu-fermer', title: 'Fermer', onclick: () => fermer(null) }, '×')),
        zone,
        h('div', { class: 'cam-lieu-pied' }, info, h('span', { style: 'flex:1' }),
          h('button', { type: 'button', class: 'secondaire', onclick: () => fermer(null) }, 'Annuler'), valider)));
    const echap = (e) => { if (e.key === 'Escape') { e.stopPropagation(); fermer(null); } };
    function fermer(r) {
      document.removeEventListener('keydown', echap, true);
      if (carte) carte.remove();
      fond.remove();
      resoudre(r);
    }
    valider.addEventListener('click', () => fermer(choix ? versLieu(choix) : null));
    document.addEventListener('keydown', echap, true);
    document.body.append(fond);

    chargerMapLibre().then((maplibregl) => {
      if (!fond.isConnected) return;
      carte = new maplibregl.Map({
        container: zone, style: FONDS.nuit, center: choix || GRENOBLE.centre, zoom: choix ? 15 : GRENOBLE.zoom,
        attributionControl: { compact: true, customAttribution: ATTRIBUTION }
      });
      carte.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
      // Zones officielles en fond, pour situer le lieu
      if (territoires.length) {
        carte.on('load', () => {
          carte.addSource('zones', { type: 'geojson', data: geojsonTerritoires(territoires) });
          carte.addLayer({ id: 'zones-fond', type: 'fill', source: 'zones', paint: { 'fill-color': ['get', 'couleur'], 'fill-opacity': 0.12 } });
          carte.addLayer({ id: 'zones-bord', type: 'line', source: 'zones', paint: { 'line-color': ['get', 'couleur'], 'line-width': 1.5 } });
        });
        carte.on('mousemove', (e) => {
          const z = territoires.find((t) => dansPolygone([e.lngLat.lng, e.lngLat.lat], t.coords));
          zone.title = z ? z.nom : '';
        });
      }
      const poser = (p) => {
        choix = p;
        if (!marqueur) {
          const el = h('div', { class: 'cam-lieu-marqueur', style: 'background:' + couleur });
          marqueur = new maplibregl.Marker({ element: el, draggable: true, anchor: 'bottom' }).setLngLat(p).addTo(carte);
          marqueur.on('dragend', () => { const ll = marqueur.getLngLat(); poser([ll.lng, ll.lat]); });
        } else marqueur.setLngLat(p);
        const z = territoires.find((t) => dansPolygone(p, t.coords));
        info.textContent = texteLieu(versLieu(p)) + (z ? ' — ' + z.nom : '');
        valider.disabled = false;
      };
      if (choix) poser(choix);
      carte.on('click', (e) => poser([e.lngLat.lng, e.lngLat.lat]));
      window.CarteLieu = carte;   // pour les essais
    }).catch((e) => {
      zone.replaceChildren(h('div', { class: 'cam-msg err', style: 'margin:1rem' }, 'La carte ne peut pas être chargée : ' + (e.message || e)));
    });
  });
}
