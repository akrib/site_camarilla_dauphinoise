// =====================================================================
// Journal des consultations de fiches par les conteurs et administrateurs
// ---------------------------------------------------------------------
// journal_fiches/{idFiche} : { nom: nom de la fiche, acces: [{ n, t }] }
//   n : nom du compte qui a ouvert la fiche, t : heure (millisecondes).
// Les 25 dernières consultations par fiche ; le message affiché est
// recomposé ici. Seules les fiches des joueurs sont notées (pas les PNJ,
// ni les fiches du conteur lui-même) ; une même personne qui rouvre la même
// fiche dans les 10 minutes n'est notée qu'une fois.
// Lisible des conteurs et administrateurs ; les règles Firestore n'acceptent
// qu'un ajout en fin de liste, au nom de son auteur et à l'heure actuelle.
// =====================================================================
import { h, db, fs, estConteur, messageErreur } from '../core.js';

export const MAX_ACCES = 25;
const DELAI_REPETITION = 10 * 60 * 1000;

/** Note l'ouverture d'une fiche (conteurs et administrateurs, fiches des joueurs). */
export async function noterAcces(session, d) {
  if (!session || !estConteur(session.profil) || !d || !d.id || d.pnj || !d.proprietaire || d.proprietaire === session.user.uid) return false;
  const ref = fs.doc(db, 'journal_fiches', d.id);
  const n = String(session.profil.nom || '').slice(0, 80);
  return fs.runTransaction(db, async (tx) => {
    const s = await tx.get(ref);
    const avant = s.exists() && Array.isArray(s.data().acces) ? s.data().acces : [];
    const t = Date.now();
    const dernier = avant[avant.length - 1];
    if (dernier && dernier.n === n && t - dernier.t < DELAI_REPETITION) return false;
    tx.set(ref, { nom: String(d.nom || '').slice(0, 80), acces: avant.concat({ n, t }).slice(-MAX_ACCES) });
    return true;
  });
}

const heure = (t) => new Date(t).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Fenêtre du journal (bas de la page des fiches, conteurs et administrateurs). */
export function panneauJournal() {
  const liste = h('ol', { class: 'cam-journal-lignes', reversed: true }, h('li', { class: 'sous-titre' }, 'Chargement…'));
  const filtre = h('input', { type: 'search', placeholder: 'Filtrer : compte ou fiche…', 'aria-label': 'Filtrer le journal' });
  const compte = h('span', { class: 'sous-titre' });
  let lignes = [];
  const dessiner = () => {
    const q = filtre.value.trim().toLowerCase();
    const l = q ? lignes.filter((x) => x.n.toLowerCase().includes(q) || x.fiche.toLowerCase().includes(q)) : lignes;
    compte.textContent = l.length + ' consultation' + (l.length > 1 ? 's' : '');
    liste.replaceChildren(...(l.length ? l.map((x) => h('li', {},
      h('time', { datetime: new Date(x.t).toISOString() }, heure(x.t)), ' — ', h('strong', {}, x.n), ' a consulté la fiche ',
      h('a', { href: '#fiche-' + x.id }, '« ' + x.fiche + ' »'), '.'))
      : [h('li', { class: 'sous-titre' }, lignes.length ? 'Aucune consultation ne correspond.' : 'Aucune consultation notée pour l\'instant.')]));
  };
  filtre.addEventListener('input', dessiner);
  (async () => {
    try {
      const snap = await fs.getDocs(fs.collection(db, 'journal_fiches'));
      lignes = [];
      snap.docs.forEach((doc) => {
        const x = doc.data();
        (Array.isArray(x.acces) ? x.acces : []).forEach((a) => {
          if (a && a.n && Number.isFinite(a.t)) lignes.push({ id: doc.id, fiche: x.nom || doc.id, n: String(a.n), t: a.t });
        });
      });
      lignes.sort((a, b) => b.t - a.t);
      dessiner();
    } catch (e) {
      liste.replaceChildren(h('li', { class: 'cam-msg err' }, 'Journal illisible : ' + messageErreur(e)));
    }
  })();
  return h('section', { class: 'cam-bloc cam-journal', 'aria-label': 'Journal des consultations' },
    h('div', { class: 'cam-journal-tete' },
      h('h3', {}, 'Journal des consultations'), compte, filtre),
    h('p', { class: 'sous-titre' }, 'Fiches de joueurs ouvertes par les conteurs et les administrateurs (les ' + MAX_ACCES + ' dernières consultations de chaque fiche).'),
    liste);
}
