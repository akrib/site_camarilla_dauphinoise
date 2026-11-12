// =====================================================================
// Incarnation : un membre choisit lequel de ses personnages validés il
// joue. Les outils de jeu (panneau d'affichage, tableau d'enquête) ne
// s'ouvrent qu'à un personnage incarné, et tout ce qui s'y fait est au nom
// du personnage. Les conteurs y ont accès sans personnage (modération).
//
// - Le choix est mémorisé dans le navigateur (un par compte), et revérifié
//   dans la base à chaque page : une fiche archivée ou repassée en brouillon
//   ne s'incarne plus.
// - Le répertoire (repertoire/{idPersonnage} : nom + compte) liste les
//   personnages validés, pour pouvoir partager un tableau avec eux.
// - Les règles Firestore vérifient de leur côté, à chaque écriture, que le
//   personnage appartient bien au membre et qu'il est validé.
// =====================================================================
import { h, db, fs, estActif, estConteur, messageErreur, sessionCourante } from './core.js';

export const STATUTS_INCARNABLES = ['validee', 'active'];
export const estIncarnable = (p) => !!p && STATUTS_INCARNABLES.includes(p.statut);
const cle = (uid) => 'cam-incarnation-' + uid;

export function incarnationMemorisee(uid) {
  try { return JSON.parse(localStorage.getItem(cle(uid)) || 'null'); } catch (e) { return null; }
}
function memoriser(uid, p) {
  try {
    if (p) localStorage.setItem(cle(uid), JSON.stringify({ id: p.id, nom: p.nom }));
    else localStorage.removeItem(cle(uid));
  } catch (e) { /* navigation privée */ }
}

/** Incarne le personnage p (déjà vérifié comme validé et appartenant au membre). */
export function incarner(uid, p) { memoriser(uid, p); }
export function quitterPersonnage(uid) { memoriser(uid, null); }

/** Personnages du membre qui peuvent être incarnés (fiche validée, en réserve ou en jeu). */
export async function mesPersonnagesIncarnables(uid) {
  const snap = await fs.getDocs(fs.query(fs.collection(db, 'personnages'), fs.where('proprietaire', '==', uid)));
  const tous = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  synchroniserMonRepertoire(uid, tous);
  return tous.filter(estIncarnable).sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr'));
}

/** Personnage incarné, revérifié dans la base (null s'il n'y en a pas ou plus). */
export async function personnageIncarne(uid) {
  const m = incarnationMemorisee(uid);
  if (!m || !m.id) return null;
  try {
    const snap = await fs.getDoc(fs.doc(db, 'personnages', m.id));
    if (snap.exists()) {
      const p = { id: snap.id, ...snap.data() };
      if (p.proprietaire === uid && estIncarnable(p)) {
        if (p.nom !== m.nom) memoriser(uid, p);
        return p;
      }
    }
  } catch (e) {
    console.warn('Vérification du personnage incarné impossible', e);
    if (e.code === 'unavailable') return null;
  }
  memoriser(uid, null);
  return null;
}

// ---------------------------------------------------------------------
// Répertoire des personnages validés (pour le partage des tableaux)
// ---------------------------------------------------------------------
/** Met l'entrée du répertoire d'un personnage en accord avec sa fiche. */
export async function majRepertoire(p, actuel) {
  const ref = fs.doc(db, 'repertoire', p.id);
  try {
    if (estIncarnable(p)) {
      if (!actuel || actuel.nom !== p.nom || actuel.proprietaire !== p.proprietaire) {
        await fs.setDoc(ref, { nom: p.nom, proprietaire: p.proprietaire });
      }
    } else if (actuel !== null) {
      await fs.deleteDoc(ref);
    }
  } catch (e) { console.warn('Répertoire non mis à jour pour ' + p.nom, e); }
}

async function synchroniserMonRepertoire(uid, mesFiches) {
  try {
    const snap = await fs.getDocs(fs.query(fs.collection(db, 'repertoire'), fs.where('proprietaire', '==', uid)));
    const presents = new Map(snap.docs.map((d) => [d.id, d.data()]));
    for (const p of mesFiches) {
      const actuel = presents.has(p.id) ? presents.get(p.id) : null;
      if (estIncarnable(p) ? (!actuel || actuel.nom !== p.nom) : actuel !== null) await majRepertoire(p, actuel);
      presents.delete(p.id);
    }
    for (const id of presents.keys()) await fs.deleteDoc(fs.doc(db, 'repertoire', id));   // fiche supprimée
  } catch (e) { console.warn('Synchronisation du répertoire impossible', e); }
}

// ---------------------------------------------------------------------
// Interface : choix du personnage
// ---------------------------------------------------------------------
function resume(p) {
  return [p.clan, p.secte, p.statut === 'active' ? 'en jeu' : 'en réserve'].filter(Boolean).join(' · ');
}

/**
 * Bloc de choix du personnage. `apresChoix(p)` est appelé après le choix
 * (p = null si le membre choisit de ne plus incarner personne).
 */
export function blocChoixPersonnage(uid, { titre = 'Choisissez votre personnage', texte, apresChoix, avecQuitter = false, filtre = null, vide = null } = {}) {
  const msg = h('div', { class: 'cam-msg' });
  const liste = h('div', { class: 'cam-grille' }, h('p', { class: 'sous-titre' }, 'Chargement de vos personnages…'));
  const actuel = incarnationMemorisee(uid);
  const bloc = h('div', { class: 'cam-bloc cam-incarnation' },
    h('h2', {}, titre),
    h('p', {}, texte || 'Le panneau d\'affichage et le tableau d\'enquête sont des outils de jeu : on y agit en tant que personnage. Choisissez lequel de vos personnages validés vous incarnez.'),
    liste, msg);
  mesPersonnagesIncarnables(uid).then((tous) => {
    const persos = filtre ? tous.filter(filtre) : tous;
    if (!persos.length) {
      liste.replaceChildren(h('div', { class: 'cam-encart alerte' }, ...(vide || ['Aucune de vos fiches n\'est encore validée par un conteur. Créez ou complétez-la dans ',
        h('a', { href: '/membres/fiches/' }, 'Mes fiches de personnage'), ', puis soumettez-la.'])));
      return;
    }
    liste.replaceChildren(...persos.map((p) => {
      const choisi = actuel && actuel.id === p.id;
      return h('button', {
        type: 'button', class: 'cam-tuile cam-perso' + (choisi ? ' choisi' : ''),
        onclick: () => { incarner(uid, p); if (apresChoix) apresChoix(p); }
      }, h('strong', {}, p.nom, choisi ? ' ✓' : ''), h('span', {}, resume(p)));
    }));
    if (avecQuitter && actuel) {
      liste.append(h('button', {
        type: 'button', class: 'cam-tuile cam-perso quitter',
        onclick: () => { quitterPersonnage(uid); if (apresChoix) apresChoix(null); }
      }, h('strong', {}, 'Ne plus incarner personne'), h('span', {}, 'Les outils de jeu se referment.')));
    }
  }).catch((e) => { liste.replaceChildren(); msg.className = 'cam-msg err'; msg.textContent = messageErreur(e); });
  return bloc;
}

/** Fenêtre de choix (changer de personnage depuis un outil). La page est rechargée après le choix. */
export function fenetreChoixPersonnage(uid) {
  const fond = h('div', { class: 'cam-modal-fond cam-app' });
  const fermer = () => { fond.remove(); document.removeEventListener('keydown', echap, true); };
  const echap = (e) => { if (e.key === 'Escape') { e.stopPropagation(); fermer(); } };
  const bloc = blocChoixPersonnage(uid, {
    titre: 'Changer de personnage', avecQuitter: true,
    texte: 'Tout ce que vous ferez ensuite dans les outils de jeu sera au nom du personnage choisi.',
    apresChoix: (p) => { fermer(); if (p) location.reload(); else location.href = '/membres/'; }
  });
  fond.append(h('div', { class: 'cam-modal' }, bloc,
    h('div', { class: 'cam-actions' }, h('button', { type: 'button', class: 'secondaire', onclick: fermer }, 'Annuler'))));
  fond.addEventListener('click', (e) => { if (e.target === fond) fermer(); });
  document.addEventListener('keydown', echap, true);
  document.body.append(fond);
}

/**
 * Garde des outils de jeu. Renvoie { perso } (personnage incarné, vérifié),
 * ou { perso: null, conteur: true } pour un conteur sans personnage.
 * Sinon affiche le choix du personnage dans `zone` et renvoie null.
 */
export async function exigerPersonnage(zone, session = sessionCourante(), { outil = 'cet outil' } = {}) {
  const uid = session.user.uid;
  const perso = await personnageIncarne(uid);
  if (perso) return { perso };
  if (estConteur(session.profil)) return { perso: null, conteur: true };
  zone.replaceChildren(blocChoixPersonnage(uid, {
    titre: 'Réservé aux personnages',
    texte: 'Seuls les personnages ont accès à ' + outil + '. Choisissez lequel de vos personnages validés vous incarnez :',
    apresChoix: () => location.reload()
  }));
  return null;
}

// ---------------------------------------------------------------------
// Écran de garde plein écran des outils de jeu (élément #cam-garde des
// pages carte et tableau d'enquête)
// ---------------------------------------------------------------------
export function afficherGarde(garde, ...contenu) {
  garde.hidden = false;
  garde.replaceChildren(h('div', { class: 'cam-garde-boite' }, ...contenu,
    h('p', { class: 'sous-titre', style: 'margin-top:1rem' }, h('a', { href: '/membres/' }, '← Espace membres'))));
}

/**
 * Vérifie l'accès à un outil de jeu : connexion, compte actif, personnage
 * incarné (ou conteur). Renvoie { perso } / { perso: null, conteur: true },
 * ou null (l'écran de garde explique quoi faire). La garde est masquée en cas de succès.
 */
export async function accesOutil(garde, session, { outil, reserve }) {
  const retour = encodeURIComponent(location.pathname + location.search);
  if (!session.user) {
    afficherGarde(garde, h('h2', {}, 'Connexion requise'), h('p', {}, reserve),
      h('a', { class: 'cam-btn', href: '/connexion/?retour=' + retour }, 'Se connecter'));
    return null;
  }
  if (!estActif(session.profil)) {
    afficherGarde(garde, h('h2', {}, 'Compte pas encore actif'), h('p', {}, 'Un conteur doit activer votre compte avant que vous puissiez utiliser ' + outil + '.'));
    return null;
  }
  const zone = h('div', {}, h('p', { class: 'sous-titre' }, 'Vérification de votre personnage…'));
  afficherGarde(garde, zone);
  const acces = await exigerPersonnage(zone, session, { outil });
  if (acces) garde.hidden = true;
  return acces;
}
