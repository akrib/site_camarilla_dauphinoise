// =====================================================================
// Calendrier des parties et fenêtres d'influences
//
// Document unique calendrier/parties, tenu par les conteurs :
//   parties : { 'AAAA-MM': { date, limite, titre, ouverture, fermeture } }
//     date      : jour de la partie (AAAA-MM-JJ) — une partie par mois ;
//     limite    : date limite de rendu des influences pour cette partie ;
//     ouverture : lendemain de la partie précédente, 0 h (ms) ;
//     fermeture : date limite, 23 h 59 (ms).
//   anticipation : true = les joueurs peuvent aussi préparer les actions des
//                  parties suivantes avant leur ouverture.
// La clé « AAAA-MM » est le « mois » des actions d'influence (champ mois).
// Les fenêtres sont calculées ici, à l'enregistrement par le conteur, et
// vérifiées par les règles Firestore (request.time).
// Sans calendrier enregistré, les influences restent libres (ancien fonctionnement).
// =====================================================================
import { h, db, fs, moisCourant } from './core.js';

const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_PARTIES = 60;

const dateLocale = (iso) => { const [a, m, j] = iso.split('-').map(Number); return new Date(a, m - 1, j); };
const finJour = (iso) => { const d = dateLocale(iso); d.setHours(23, 59, 59, 999); return d.getTime(); };
const lendemain = (iso) => { const d = dateLocale(iso); d.setDate(d.getDate() + 1); return d.getTime(); };
const moisAvant = (iso) => { const d = dateLocale(iso); d.setMonth(d.getMonth() - 1); d.setDate(d.getDate() + 1); return d.getTime(); };

export function jourLong(v) {
  const d = typeof v === 'number' ? new Date(v) : dateLocale(v);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
export function libelleMois(cle) {
  const [a, m] = String(cle).split('-').map(Number);
  if (!a || !m) return String(cle || '');
  const t = new Date(a, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
export const libellePartie = (p) => (p.titre ? p.titre + ' — ' : '') + 'partie du ' + jourLong(p.date);

// Liste saisie par le conteur [{ date, limite, titre }] -> parties triées avec
// leurs fenêtres, et les incohérences à corriger avant d'enregistrer.
export function calculerCalendrier(saisie) {
  const triees = saisie.filter((p) => RE_DATE.test(p.date || '')).sort((a, b) => a.date.localeCompare(b.date));
  const erreurs = [];
  const vus = new Set();
  const parties = triees.map((p, i) => {
    const cle = p.date.slice(0, 7);
    if (vus.has(cle)) erreurs.push('Deux parties en ' + libelleMois(cle).toLowerCase() + ' : une seule partie par mois.');
    vus.add(cle);
    const limite = RE_DATE.test(p.limite || '') ? p.limite : p.date;
    const ouverture = i === 0 ? moisAvant(p.date) : lendemain(triees[i - 1].date);
    const fermeture = finJour(limite);
    if (limite > p.date) erreurs.push('Partie du ' + jourLong(p.date) + ' : la date limite des influences est après la partie.');
    else if (fermeture < ouverture) erreurs.push('Partie du ' + jourLong(p.date) + ' : la date limite tombe avant le lendemain de la partie précédente.');
    return { cle, date: p.date, limite, titre: String(p.titre || '').trim().slice(0, 120), ouverture, fermeture };
  });
  if (parties.length > MAX_PARTIES) erreurs.push('Au plus ' + MAX_PARTIES + ' parties : supprimez les plus anciennes.');
  return { parties, erreurs };
}

export function lireCalendrier(d) {
  if (!d || !d.parties) return { existe: false, parties: [], anticipation: false };
  const parties = Object.entries(d.parties).map(([cle, p]) => ({ cle, ...p })).sort((a, b) => a.date.localeCompare(b.date));
  return { existe: true, parties, anticipation: d.anticipation === true };
}

export async function chargerCalendrier() {
  const s = await fs.getDoc(fs.doc(db, 'calendrier', 'parties'));
  return lireCalendrier(s.exists() ? s.data() : null);
}

// État d'une partie : 'a_venir' (influences pas encore ouvertes), 'ouverte', 'fermee'.
export function etat(p, maintenant = Date.now()) {
  if (maintenant > p.fermeture) return 'fermee';
  return maintenant >= p.ouverture ? 'ouverte' : 'a_venir';
}
export const partie = (cal, cle) => cal.parties.find((p) => p.cle === cle) || null;

// Un joueur peut-il créer / modifier / retirer une action de ce mois ?
export function modifiable(cal, cle, maintenant = Date.now()) {
  if (!cal.existe) return true;
  const p = partie(cal, cle);
  if (!p) return false;
  const e = etat(p, maintenant);
  return e === 'ouverte' || (e === 'a_venir' && cal.anticipation);
}
export const periodesModifiables = (cal, maintenant = Date.now()) => cal.parties.filter((p) => modifiable(cal, p.cle, maintenant));

// Partie « en cours » : celle dont les influences sont ouvertes, sinon la
// prochaine, sinon la dernière.
export function partieCourante(cal, maintenant = Date.now()) {
  return cal.parties.find((p) => etat(p, maintenant) === 'ouverte')
    || cal.parties.find((p) => maintenant < p.ouverture)
    || cal.parties[cal.parties.length - 1] || null;
}
export function moisParDefaut(cal, maintenant = Date.now()) {
  const p = cal.existe ? partieCourante(cal, maintenant) : null;
  return p ? p.cle : moisCourant();
}

export const LIBELLES_ETAT = { a_venir: 'Pas encore ouvertes', ouverte: 'Ouvertes', fermee: 'Closes' };

export function resumeEtat(cal, p, maintenant = Date.now()) {
  const e = etat(p, maintenant);
  if (e === 'ouverte') return 'Influences ouvertes jusqu\'au ' + jourLong(p.limite) + ' à 23 h 59.';
  if (e === 'fermee') return 'Influences closes depuis le ' + jourLong(p.limite) + '.';
  return 'Ouverture des influences le ' + jourLong(p.ouverture) + (cal.anticipation ? ' (préparation anticipée autorisée).' : '.');
}

// Encart d'information pour les joueurs (page Influences, espace membres).
export function encartCalendrier(cal, maintenant = Date.now()) {
  if (!cal.existe || !cal.parties.length) return null;
  const p = partieCourante(cal, maintenant);
  const e = etat(p, maintenant);
  return h('div', { class: 'cam-encart cam-calendrier ' + (e === 'ouverte' ? 'ok' : 'alerte') },
    h('strong', {}, libellePartie(p)), h('br'), resumeEtat(cal, p, maintenant));
}
