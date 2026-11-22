// =====================================================================
// Gazette : Firestore et stockage du navigateur
// ---------------------------------------------------------------------
// gazettes/{AAAA-MM}                   document léger, pour les listes :
//     { mois, numero, une, statut, version, majLe, majPar, majParNom, publieeLe }
// gazettes/{AAAA-MM}/contenu/edition   le numéro complet (JSON compressé) :
//     { statut, donnees, majLe }       écrit avec le document léger (lot)
// gazette_pensebete/{AAAA-MM}          sujets marqués « gazette » depuis les
//     influences (conteurs seulement) : { sujets: { idInfluence: {...} }, majLe }
//
// Économie de lectures :
//   - joueurs : la liste lit les documents légers ; un numéro déjà lu et
//     inchangé (même version) est relu dans le navigateur, sans Firestore ;
//   - conteurs : le brouillon vit dans le navigateur (sauvegarde locale) ;
//     on ne lit le contenu sur le site que si une autre version y a été
//     enregistrée entre-temps.
// Écritures : 2 par sauvegarde sur le site (document léger + contenu).
// =====================================================================
import { db, fs } from '../core.js';
import { compresserJson, decompresserJson } from '../compression.js';
import { normaliserGazette, titreUne } from './modele.js';

export const refGazette = (mois) => fs.doc(db, 'gazettes', mois);
export const refContenu = (mois) => fs.doc(db, 'gazettes', mois, 'contenu', 'edition');
export const refPenseBete = (mois) => fs.doc(db, 'gazette_pensebete', mois);

/** Documents légers, du plus récent au plus ancien. */
export async function listerGazettes({ publieesSeulement = false } = {}) {
  const col = fs.collection(db, 'gazettes');
  const s = await fs.getDocs(publieesSeulement ? fs.query(col, fs.where('statut', '==', 'publiee')) : col);
  return s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.mois.localeCompare(a.mois));
}

export async function lireContenu(mois) {
  const s = await fs.getDoc(refContenu(mois));
  if (!s.exists()) return null;
  return normaliserGazette(JSON.parse((await decompresserJson(s.data().donnees)) || '{}'));
}

/**
 * Enregistre le numéro (document léger + contenu, dans un même lot).
 * version : celle connue + 1 (les règles refusent si quelqu'un d'autre a
 * enregistré entre-temps). publier : date de publication = maintenant.
 */
export async function enregistrerGazette({ mois, numero, donnees, statut, version, publieeLe, publier, session }) {
  const leger = {
    mois, numero, une: titreUne(donnees), statut, version,
    majLe: fs.serverTimestamp(), majPar: session.user.uid, majParNom: (session.profil && session.profil.nom) || ''
  };
  if (publier) leger.publieeLe = fs.serverTimestamp();
  else if (publieeLe) leger.publieeLe = publieeLe;
  const lot = fs.writeBatch(db);
  lot.set(refGazette(mois), leger);
  lot.set(refContenu(mois), { statut, donnees: await compresserJson(JSON.stringify(donnees)), majLe: fs.serverTimestamp() });
  await lot.commit();
}

export async function supprimerGazette(mois) {
  const lot = fs.writeBatch(db);
  lot.delete(refContenu(mois));
  lot.delete(refGazette(mois));
  await lot.commit();
}

// ---------------------------------------------------------------------
// Pense-bête : sujets marqués depuis les influences (conteurs)
// ---------------------------------------------------------------------
export async function lirePenseBete(mois) {
  const s = await fs.getDoc(refPenseBete(mois));
  return s.exists() && s.data().sujets && typeof s.data().sujets === 'object' ? s.data().sujets : {};
}
const court = (v, n) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, n);
/** Résumé d'une action d'influence gardé dans le pense-bête (une seule lecture côté gazette). */
export function sujetDepuisAction(a, uid) {
  return {
    personnage: court(a.personnageNom, 80), action: court(a.nomAction, 150), categorie: court(a.categorie, 60),
    cible: court(a.cible, 150), lieu: court([a.ville, a.zone ? 'zone ' + a.zone : ''].filter(Boolean).join(', '), 120),
    date: court(a.date, 20), descriptif: court(a.descriptif, 700), reponse: court(a.reponseConteur, 700),
    ajoutePar: uid, ajouteLe: Date.now()
  };
}
/** Ajoute ou retire un sujet (une écriture, champ par champ : pas d'écrasement). */
export async function marquerSujet(mois, idInfluence, sujet) {
  const ref = refPenseBete(mois);
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(idInfluence)) throw new Error('Identifiant d\'action invalide.');
  try {
    await fs.updateDoc(ref, { ['sujets.' + idInfluence]: sujet ? sujet : fs.deleteField(), majLe: fs.serverTimestamp() });
  } catch (e) {
    if (!sujet || (e.code !== 'not-found' && !/No document/i.test(e.message || ''))) throw e;
    await fs.setDoc(ref, { sujets: { [idInfluence]: sujet }, majLe: fs.serverTimestamp() });
  }
}

// ---------------------------------------------------------------------
// Navigateur
// ---------------------------------------------------------------------
const lireLocal = (cle) => { try { return JSON.parse(localStorage.getItem(cle) || 'null'); } catch (e) { return null; } };
const ecrireLocal = (cle, v) => { try { localStorage.setItem(cle, JSON.stringify(v)); return true; } catch (e) { return false; } };

// Brouillon du conteur : { donnees, numero, baseVersion, modifie, sauveLe }
export const CLE_BROUILLON = (uid, mois) => 'cam-gazette-brouillon-' + uid + '-' + mois;
export const lireBrouillon = (uid, mois) => lireLocal(CLE_BROUILLON(uid, mois));
export const ecrireBrouillon = (uid, mois, b) => ecrireLocal(CLE_BROUILLON(uid, mois), { ...b, sauveLe: Date.now() });
export const oublierBrouillon = (uid, mois) => { try { localStorage.removeItem(CLE_BROUILLON(uid, mois)); } catch (e) { /* ignore */ } };

// Numéros publiés déjà lus (joueurs) : { version, donnees }
const CLE_LU = (mois) => 'cam-gazette-lue-' + mois;
export function contenuEnCache(mois, version) {
  const c = lireLocal(CLE_LU(mois));
  return c && c.version === version && c.donnees ? normaliserGazette(c.donnees) : null;
}
export function garderEnCache(mois, version, donnees) {
  if (!ecrireLocal(CLE_LU(mois), { version, donnees })) {
    // Navigateur plein : on oublie les anciens numéros puis on réessaie
    try { Object.keys(localStorage).filter((k) => k.startsWith('cam-gazette-lue-')).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
    ecrireLocal(CLE_LU(mois), { version, donnees });
  }
}
