// =====================================================================
// Descriptions des éléments de la fiche (textes des règles MET)
// ---------------------------------------------------------------------
// Les textes sont réservés aux membres de la Fédération : ils ne sont
// jamais dans le code public du site. Un administrateur les importe dans
// la collection Firestore « referentiel » (lisible par les membres actifs
// uniquement) ; ils sont chargés à la demande, catégorie par catégorie.
// =====================================================================
import { db, fs, h } from '../core.js';

const promesses = new Map();
let promesseIndex = null;

/** Clé de comparaison : minuscules, sans accents, apostrophes droites, sans « (cout n) » / « (niveau n) ». */
export function normaliserCle(s) {
  return String(s ?? '')
    .replace(/\((?:cout|coût|niveau)\s*\d+\)\s*$/i, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[’‘`´]/g, "'").replace(/[«»"]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

export function chargerIndex() {
  if (!promesseIndex) {
    promesseIndex = fs.getDoc(fs.doc(db, 'referentiel', 'index'))
      .then((s) => (s.exists() ? s.data() : null))
      .catch((e) => { promesseIndex = null; throw e; });
  }
  return promesseIndex;
}

/** Charge (une fois) toutes les entrées d'une catégorie ; renvoie Map(cléNormalisée → entrée). */
export function chargerCategorie(cat) {
  if (promesses.has(cat)) return promesses.get(cat);
  const p = (async () => {
    const index = await chargerIndex();
    if (!index || !index.categories || !index.categories[cat]) return new Map();
    const parts = index.categories[cat].parts || 1;
    const memo = `cam-ref:${index.version}:${cat}`;
    let entrees = null;
    try { entrees = JSON.parse(sessionStorage.getItem(memo) || 'null'); } catch (e) { entrees = null; }
    if (!entrees) {
      entrees = {};
      const ids = Array.from({ length: parts }, (_, i) => (i ? `${cat}--${i + 1}` : cat));
      const docs = await Promise.all(ids.map((id) => fs.getDoc(fs.doc(db, 'referentiel', id))));
      docs.forEach((d) => { if (d.exists()) Object.assign(entrees, d.data().entrees || {}); });
      try { sessionStorage.setItem(memo, JSON.stringify(entrees)); } catch (e) { /* quota : tant pis */ }
    }
    const carte = new Map();
    for (const [k, v] of Object.entries(entrees)) carte.set(normaliserCle(k), { cle: k, ...v });
    return carte;
  })();
  p.catch(() => promesses.delete(cat));
  promesses.set(cat, p);
  return p;
}

/** Cherche une entrée en tolérant les petites différences d'écriture. */
export async function chercherDescription(cat, nom) {
  const carte = await chargerCategorie(cat);
  const n = normaliserCle(nom);
  if (!n) return null;
  if (carte.has(n)) return carte.get(n);
  const variantes = [n + 's', n.replace(/s$/, ''), n.replace(/\s*\(.*\)\s*/g, ' ').trim(),
    n.replace(/^(thaumaturgie|necromancie)\s*:\s*voie\s+/, 'v. ')];
  for (const v of variantes) if (carte.has(v)) return carte.get(v);
  if (n.length >= 5) {
    for (const [k, v] of carte) if (k.startsWith(n) || (k.length >= 5 && n.startsWith(k))) return v;
  }
  return null;
}

// ------------------------------------------------------------- panneau
let panneau = null;
function fermer() {
  if (!panneau) return;
  panneau.remove(); panneau = null;
  document.removeEventListener('keydown', surTouche);
}
function surTouche(e) { if (e.key === 'Escape') fermer(); }

function paragraphes(texte) {
  return String(texte || '').split(/\n{2,}|\n(?=[A-ZÉÈÀÂÎÔÛ•][^\n]{0,60}\s*:)/).map((p) => h('p', {}, p.trim())).filter((p) => p.textContent);
}

/**
 * Ouvre le panneau de description.
 * demandes : [{ cat, nom, titre? }, …] — plusieurs textes peuvent être empilés (ex. clan + faiblesse).
 */
export async function ouvrirDescription(titre, demandes) {
  fermer();
  const corps = h('div', { class: 'fiche-desc-corps' }, h('p', { class: 'sous-titre' }, 'Chargement…'));
  panneau = h('div', { class: 'cam-app fiche-desc', role: 'dialog', 'aria-label': 'Description : ' + titre },
    h('div', { class: 'fiche-desc-tete' },
      h('strong', {}, titre),
      h('button', { type: 'button', class: 'petit secondaire', onclick: fermer, 'aria-label': 'Fermer' }, '✕')),
    corps,
    h('p', { class: 'fiche-desc-avert' }, 'Texte des règles de la Fédération Camarilla Française, réservé aux membres : ne pas le diffuser.'));
  document.body.append(panneau);
  document.addEventListener('keydown', surTouche);
  try {
    const index = await chargerIndex();
    if (!index) {
      corps.replaceChildren(h('p', {}, 'Les descriptions des règles n\'ont pas encore été importées par un administrateur (page Comptes > Référentiel).'));
      return;
    }
    const resultats = await Promise.all(demandes.filter((d) => d && d.nom).map(async (d) => ({ d, e: await chercherDescription(d.cat, d.nom) })));
    const blocs = resultats.filter((r) => r.e).map(({ d, e }) => h('section', {},
      d.titre ? h('h4', {}, d.titre) : '',
      paragraphes(e.t),
      h('p', { class: 'fiche-desc-source' }, [e.s || 'Règles MET', e.p ? 'p. ' + e.p : '', e.titre && normaliserCle(e.titre) !== normaliserCle(d.nom) ? '« ' + e.titre + ' »' : '']
        .filter(Boolean).join(' · '))));
    corps.replaceChildren(...(blocs.length ? blocs : [h('p', {}, 'Pas de description trouvée dans les règles pour « ' + demandes.map((d) => d && d.nom).filter(Boolean).join(' », « ') + ' ».')]));
  } catch (e) {
    console.error(e);
    corps.replaceChildren(h('p', { class: 'cam-msg err' }, 'Impossible de charger la description (' + (e.code || e.message) + ').'));
  }
}

/** Petit bouton « ⓘ » ; nom peut être une fonction (valeur courante d'une liste). */
export function boutonInfo(titre, demandes) {
  return h('button', {
    type: 'button', class: 'fiche-info', title: 'Description', 'aria-label': 'Description : ' + (typeof titre === 'function' ? '' : titre),
    onclick: (e) => {
      e.preventDefault(); e.stopPropagation();
      const t = typeof titre === 'function' ? titre() : titre;
      const d = (typeof demandes === 'function' ? demandes() : demandes).filter((x) => x && x.nom);
      if (!d.length) return;
      ouvrirDescription(t || d[0].nom, d);
    },
  }, 'ⓘ');
}
