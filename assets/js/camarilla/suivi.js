// =====================================================================
// Suivi de l'activité (affiché dans Notifications et l'espace membres)
//
// Tout est calculé à l'affichage, sans rien écrire dans la base :
//   - joueurs : réponses des conteurs aux actions d'influence et aux tickets
//     arrivées depuis la dernière visite (champ reponduLe, écrit par le
//     conteur avec sa réponse ; la date de dernière visite est gardée dans
//     le navigateur) ;
//   - conteurs : actions sans réponse, tickets ouverts, fiches à valider ;
//   - tous : fenêtre d'influences ouverte, rappel deux jours avant la limite.
// =====================================================================
import { db, fs, millis, moisCourant } from './core.js';
import { partieCourante, etat, libellePartie, jourLong } from './calendrier.js';

const JOUR = 86400000;
const FENETRE = 45 * JOUR;    // au-delà, une réponse n'est plus « nouvelle »
export const TICKETS_OUVERTS = ['En attente', 'En cours', 'Informations demandées'];
const cleVu = (uid) => 'cam-vu-' + uid;

function lireVu(uid) {
  try { return JSON.parse(localStorage.getItem(cleVu(uid)) || '{}'); } catch (e) { return {}; }
}
/** Le joueur a vu ses réponses (type : 'influences' ou 'tickets'). */
export function marquerVu(uid, type) {
  const vu = lireVu(uid);
  vu[type] = Date.now();
  try { localStorage.setItem(cleVu(uid), JSON.stringify(vu)); } catch (e) { /* navigation privée */ }
}

// Mois dont les réponses peuvent encore arriver : partie en cours et les
// deux précédentes (sans calendrier : ce mois-ci et les deux d'avant).
function moisRecents(cal) {
  if (cal && cal.existe && cal.parties.length) {
    const p = partieCourante(cal);
    const i = cal.parties.indexOf(p);
    return cal.parties.slice(Math.max(0, i - 2), i + 1).map((x) => x.cle);
  }
  const [a, m] = moisCourant().split('-').map(Number);
  return [0, 1, 2].map((k) => { const d = new Date(a, m - 1 - k, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); });
}

/**
 * Réponses des conteurs pas encore vues par le joueur.
 * → { influences: [action…], tickets: [ticket…] } (les plus récentes d'abord)
 */
export async function nouvellesReponses(uid, cal) {
  const vu = lireVu(uid);
  const limite = Date.now() - FENETRE;
  const neuf = (x, type) => millis(x.reponduLe) > Math.max(limite, vu[type] || 0);
  const requetes = moisRecents(cal).map((m) => fs.getDocs(fs.query(fs.collection(db, 'influences'),
    fs.where('proprietaire', '==', uid), fs.where('mois', '==', m))));
  const [tickets, ...parMois] = await Promise.all([
    fs.getDocs(fs.query(fs.collection(db, 'tickets'), fs.where('proprietaire', '==', uid))),
    ...requetes
  ]);
  const recent = (a, b) => millis(b.reponduLe) - millis(a.reponduLe);
  return {
    influences: parMois.flatMap((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }))).filter((x) => neuf(x, 'influences')).sort(recent),
    tickets: tickets.docs.map((d) => ({ id: d.id, ...d.data() })).filter((x) => neuf(x, 'tickets')).sort(recent)
  };
}

/** Travail en attente pour les conteurs (requêtes de comptage : 1 lecture chacune). */
export async function travailConteur() {
  const compter = (q) => fs.getCountFromServer(q).then((c) => c.data().count).catch(() => 0);
  const [actions, tickets, fiches] = await Promise.all([
    compter(fs.query(fs.collection(db, 'influences'), fs.where('statut', '==', 'attente'))),
    compter(fs.query(fs.collection(db, 'tickets'), fs.where('statut', 'in', TICKETS_OUVERTS))),
    compter(fs.query(fs.collection(db, 'personnages'), fs.where('statut', '==', 'soumise')))
  ]);
  return { actions, tickets, fiches };
}

/**
 * Rappel du calendrier : { texte, urgent } ou null.
 * urgent = la date limite tombe dans moins de deux jours.
 */
export function rappelCalendrier(cal, maintenant = Date.now()) {
  if (!cal || !cal.existe || !cal.parties.length) return null;
  const p = partieCourante(cal, maintenant);
  if (!p) return null;
  const e = etat(p, maintenant);
  if (e === 'ouverte') {
    const reste = p.fermeture - maintenant;
    const jours = Math.ceil(reste / JOUR);
    return {
      urgent: reste < 2 * JOUR,
      partie: p,
      texte: 'Influences ouvertes pour ' + libellePartie(p) + ' : date limite le ' + jourLong(p.limite) + ' à 23 h 59'
        + (reste < 2 * JOUR ? ' — plus que ' + (jours <= 1 ? 'quelques heures' : jours + ' jours') + ' !' : '.')
    };
  }
  if (e === 'a_venir') {
    return { urgent: false, partie: p, texte: 'Prochaine ouverture des influences le ' + jourLong(p.ouverture) + ' (' + libellePartie(p) + ').' };
  }
  return { urgent: false, partie: p, texte: 'Influences closes pour ' + libellePartie(p) + '.' };
}
