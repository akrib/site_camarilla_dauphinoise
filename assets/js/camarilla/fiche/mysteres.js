// =====================================================================
// Spécialités de la compétence Mystères : textes de chaque niveau
// ---------------------------------------------------------------------
// Les connaissances (communes et secrètes) de chaque niveau sont des
// secrets de jeu, tirés des règles de la Fédération :
//   mysteres/{faction}              textes de tous les niveaux, lisibles
//                                   des seuls conteurs (importés par un
//                                   administrateur avec le référentiel) ;
//   mysteres/index                  liste des spécialités importées ;
//   personnages/{id}/detail/mysteres  niveaux que connaît le personnage,
//                                   écrits par un conteur quand il valide
//                                   la fiche (lisibles du joueur).
// Un joueur ne lit donc jamais que ce que son personnage a appris.
// =====================================================================
import { db, fs } from '../core.js';
import { compresserJson, decompresserJson } from '../compression.js';
import { slugMystere, mysteresConnus } from './mysteres-base.js';

export { slugMystere, factionMystere, nomSpecialite, mysteresConnus } from './mysteres-base.js';

// ------------------------------------------------------------ conteurs
let promesseIndex = null;
const cache = new Map();

/** Index des spécialités importées (conteurs) ; null si rien n'est importé. */
export function indexMysteres() {
  if (!promesseIndex) {
    promesseIndex = fs.getDoc(fs.doc(db, 'mysteres', 'index'))
      .then((s) => (s.exists() ? s.data() : null))
      .catch((e) => { promesseIndex = null; throw e; });
  }
  return promesseIndex;
}

/** Textes de tous les niveaux d'une spécialité (conteurs) : { faction, niveaux: { '1': { c, x, n, t, p } } } ou null. */
export function texteMaitre(faction) {
  const id = slugMystere(faction);
  if (!cache.has(id)) {
    const p = fs.getDoc(fs.doc(db, 'mysteres', id)).then((s) => (s.exists() ? s.data() : null));
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return cache.get(id);
}

/** Source des textes pour un conteur : tous les niveaux (la fiche décide lesquels s'affichent). */
export function sourceConteur() {
  return {
    mode: 'conteur',
    async lire(faction) {
      const idx = await indexMysteres();
      if (!idx) return { etat: 'absent' };
      const d = await texteMaitre(faction);
      return d ? { etat: 'ok', niveaux: d.niveaux || {} } : { etat: 'sans-texte' };
    },
  };
}

/**
 * Document personnages/{id}/detail/mysteres : textes des niveaux que connaît
 * le personnage (écrit par un conteur quand il valide la fiche ou la met en
 * jeu). null si les textes n'ont pas été importés.
 */
export async function donneesMysteres(F) {
  const idx = await indexMysteres();
  if (!idx) return null;
  const textes = {};
  const niveaux = {};
  for (const { faction, niveau } of mysteresConnus(F)) {
    niveaux[slugMystere(faction)] = niveau;
    const d = await texteMaitre(faction);
    const n = {};
    for (let k = 1; k <= niveau; k++) if (d && d.niveaux && d.niveaux[k]) n[k] = d.niveaux[k];
    textes[slugMystere(faction)] = { faction, niveaux: n };
  }
  return { textes: await compresserJson(JSON.stringify(textes)), niveaux, majLe: fs.serverTimestamp() };
}
export const refMysteres = (idPerso) => fs.doc(db, 'personnages', idPerso, 'detail', 'mysteres');

/** Transmet les textes au joueur ; false si les textes n'ont pas été importés. */
export async function accorderMysteres(idPerso, F) {
  const d = await donneesMysteres(F);
  if (!d) return false;
  await fs.setDoc(refMysteres(idPerso), d);
  return true;
}

// ------------------------------------------------------------- joueurs
/** Source des textes pour le joueur : ce que les conteurs lui ont transmis. */
export function sourceJoueur(idPerso) {
  let promesse = null;
  const charger = () => {
    if (!promesse) {
      promesse = (idPerso ? fs.getDoc(refMysteres(idPerso)) : Promise.resolve(null))
        .then(async (s) => {
          if (!s || !s.exists()) return null;
          const x = s.data();
          return { textes: JSON.parse((await decompresserJson(x.textes)) || '{}'), niveaux: x.niveaux || {} };
        })
        .catch((e) => { promesse = null; throw e; });
    }
    return promesse;
  };
  return {
    mode: 'joueur',
    async lire(faction) {
      const d = await charger();
      if (!d) return { etat: 'non-transmis' };
      const t = d.textes[slugMystere(faction)];
      return { etat: 'ok', niveaux: (t && t.niveaux) || {}, accorde: d.niveaux[slugMystere(faction)] || 0 };
    },
  };
}
