// =====================================================================
// Annuaire gardé dans le navigateur
//
// Comptes actifs (annuaire/{uid} : nom, rôle) et personnages validés
// (repertoire/{id} : nom, compte) sont lus UNE fois après la connexion, puis
// gardés dans le navigateur (localStorage). Ils servent à choisir avec qui
// partager un tableau d'enquête, à qui proposer un challenge, quelle carte
// de personnage consulter (conteurs)…
// Pour voir un nouveau membre ou un personnage validé depuis, il suffit de
// se déconnecter puis de se reconnecter (la déconnexion vide ce cache).
// =====================================================================
import { db, fs, sessionCourante, CLE_ANNUAIRE } from './core.js';

let enMemoire = null;

/** { comptes: { uid: { nom, role } }, personnages: { id: { nom, proprietaire } }, le } */
export async function annuaire() {
  const uid = sessionCourante().user?.uid;
  if (!uid) throw new Error('Non connecté');
  if (enMemoire && enMemoire.uid === uid) return enMemoire;
  try {
    const garde = JSON.parse(localStorage.getItem(CLE_ANNUAIRE(uid)) || 'null');
    if (garde && garde.personnages && garde.comptes) { enMemoire = { ...garde, uid }; return enMemoire; }
  } catch (e) { /* cache illisible : relu ci-dessous */ }
  const [comptes, persos] = await Promise.all([
    fs.getDocs(fs.collection(db, 'annuaire')),
    fs.getDocs(fs.collection(db, 'repertoire'))
  ]);
  const r = {
    le: Date.now(),
    comptes: Object.fromEntries(comptes.docs.map((d) => [d.id, { nom: d.data().nom, role: d.data().role }])),
    personnages: Object.fromEntries(persos.docs.map((d) => [d.id, { nom: d.data().nom, proprietaire: d.data().proprietaire }]))
  };
  try { localStorage.setItem(CLE_ANNUAIRE(uid), JSON.stringify(r)); } catch (e) { /* navigation privée */ }
  enMemoire = { ...r, uid };
  return enMemoire;
}

/** Personnages validés, triés par nom : [{ id, nom, proprietaire, joueur }] */
export async function personnagesValides() {
  const a = await annuaire();
  return Object.entries(a.personnages)
    .map(([id, p]) => ({ id, nom: p.nom, proprietaire: p.proprietaire, joueur: (a.comptes[p.proprietaire] || {}).nom || '' }))
    .sort((x, y) => (x.nom || '').localeCompare(y.nom || '', 'fr'));
}

/** Date de lecture de l'annuaire (pour l'afficher : « liste du 12/11 »). */
export const dateAnnuaire = () => (enMemoire ? enMemoire.le : null);
