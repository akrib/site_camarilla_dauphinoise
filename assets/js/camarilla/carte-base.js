// =====================================================================
// Éléments communs aux cartes du site (MapLibre + OpenFreeMap)
//   - constantes (centre de Grenoble, fonds de carte) ;
//   - chargement de MapLibre à la demande (pages qui n'en ont pas toujours
//     besoin, comme la gestion des influences) ;
//   - choisirLieu() : fenêtre où l'on clique sur la carte pour choisir un
//     point (lieu d'une action d'influence).
// =====================================================================
import { h } from './core.js';

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

let chargement = null;
export function chargerMapLibre() {
  if (!document.querySelector('link[data-maplibre]')) {
    document.head.append(h('link', { rel: 'stylesheet', href: MAPLIBRE + 'maplibre-gl.css', 'data-maplibre': '' }));
  }
  if (!chargement) chargement = import(MAPLIBRE + 'maplibre-gl.mjs').catch((e) => { chargement = null; throw e; });
  return chargement;
}

// Fenêtre de choix d'un point. Résout { lng, lat }, ou null si annulé.
export function choisirLieu({ initial = null, titre = 'Lieu de l\'action', couleur = '#c4283d' } = {}) {
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
      const poser = (p) => {
        choix = p;
        if (!marqueur) {
          const el = h('div', { class: 'cam-lieu-marqueur', style: 'background:' + couleur });
          marqueur = new maplibregl.Marker({ element: el, draggable: true, anchor: 'bottom' }).setLngLat(p).addTo(carte);
          marqueur.on('dragend', () => { const ll = marqueur.getLngLat(); poser([ll.lng, ll.lat]); });
        } else marqueur.setLngLat(p);
        info.textContent = texteLieu(versLieu(p));
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
