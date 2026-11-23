// =====================================================================
// Camarilla Dauphinoise — socle commun de l'espace membres
// Connexion (Firebase Authentication), profil, rôles, utilitaires.
// =====================================================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js';
import * as authMod from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js';
import * as fs from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

export { fs };

// ---------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------
// Mode émulateur (tests en local) : ajouter ?emulateurs=1 à l'adresse
// d'une page servie sur localhost ; le choix est mémorisé pour l'onglet.
const surPosteLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
const params = new URLSearchParams(location.search);
if (surPosteLocal && params.get('emulateurs') === '1') sessionStorage.setItem('cam-emulateurs', '1');
if (params.get('emulateurs') === '0') sessionStorage.removeItem('cam-emulateurs');
export const modeEmulateurs = surPosteLocal && sessionStorage.getItem('cam-emulateurs') === '1';

export const configManquante = !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith('A_REMPLACER');

const config = modeEmulateurs
  ? { apiKey: 'demo-cle', authDomain: 'localhost', projectId: 'demo-camarilla' }
  : firebaseConfig;

export const app = initializeApp(config);
export const auth = authMod.getAuth(app);
auth.languageCode = 'fr';
export const db = fs.getFirestore(app);

if (modeEmulateurs) {
  authMod.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  fs.connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

// ---------------------------------------------------------------------
// Rôles
// ---------------------------------------------------------------------
export const ROLES = { joueur: 'Joueur', conteur: 'Conteur', admin: 'Administrateur' };
export const STATUTS_COMPTE = { en_attente: 'En attente de validation', actif: 'Actif', suspendu: 'Suspendu' };

export const estActif = (p) => !!p && p.statut === 'actif';
// Un administrateur a tous les droits d'un conteur (ici comme dans les règles Firestore).
export const estConteur = (p) => estActif(p) && (p.role === 'conteur' || p.role === 'admin');
export const estAdmin = (p) => estActif(p) && p.role === 'admin';

// Version des règles Firestore attendue par ce code. Le document
// regles/{VERSION_REGLES} n'est lisible que si les règles publiées dans la
// console Firebase sont celles de firebase/firestore.rules : à changer ici ET
// dans firebase/firestore.rules (match /regles/) à chaque modification des règles.
export const VERSION_REGLES = '2026-11-23';

// ---------------------------------------------------------------------
// Vue de test (administrateurs)
// Un administrateur peut regarder le site comme un conteur ou un joueur,
// pour tester. Seule l'interface change : pour les règles Firestore, il
// reste administrateur (ses actions passent avec ses vrais droits).
// Choix gardé dans le navigateur (par compte) ; un bandeau le rappelle sur
// toutes les pages, avec de quoi revenir à la vue administrateur.
// ---------------------------------------------------------------------
export const VUES_TEST = { conteur: 'Conteur', joueur: 'Joueur' };
const CLE_VUE = (uid) => 'cam-vue-test-' + uid;
function lireVue(uid) {
  try { const v = localStorage.getItem(CLE_VUE(uid)); return VUES_TEST[v] ? v : null; } catch (e) { return null; }
}
function appliquerVue(user, p) {
  if (!estAdmin(p)) return p;
  const vue = lireVue(user.uid);
  return vue ? { ...p, role: vue, roleReel: 'admin', vueTest: vue } : p;
}
/** Change de vue ('conteur', 'joueur', ou '' pour revenir administrateur) et recharge la page. */
export function changerVue(vue) {
  const u = auth.currentUser;
  if (!u) return;
  try { if (VUES_TEST[vue]) localStorage.setItem(CLE_VUE(u.uid), vue); else localStorage.removeItem(CLE_VUE(u.uid)); } catch (e) { /* navigation privée */ }
  location.reload();
}

// ---------------------------------------------------------------------
// Session : utilisateur Firebase + profil Firestore (utilisateurs/{uid})
// ---------------------------------------------------------------------
let etat = { user: null, profil: null, pret: false };   // profil : celui de la vue (vue de test comprise)
let profilReel = null;                                  // profil enregistré, vrai rôle
const abonnes = new Set();
let arreterProfil = null;
let nomInscription = null;   // nom saisi à l'inscription, utilisé pour créer le profil

function notifier() { abonnes.forEach((cb) => { try { cb(etat); } catch (e) { console.error(e); } }); }

authMod.onAuthStateChanged(auth, async (user) => {
  if (arreterProfil) { arreterProfil(); arreterProfil = null; }
  if (!user) { profilReel = null; etat = { user: null, profil: null, pret: true }; notifier(); bandeauVue(); return; }

  // Le profil est suivi en direct ; s'il n'existe pas encore (inscription),
  // on le crée, et le suivi reçoit aussitôt la nouvelle version.
  const ref = fs.doc(db, 'utilisateurs', user.uid);
  let creation = false;
  arreterProfil = fs.onSnapshot(ref, async (snap) => {
    if (!snap.exists() && !creation) {
      creation = true;
      try {
        const nom = (nomInscription || user.displayName || (user.email || 'Joueur').split('@')[0]).trim().slice(0, 60) || 'Joueur';
        await fs.setDoc(ref, {
          email: user.email, nom, role: 'joueur', statut: 'en_attente',
          creeLe: fs.serverTimestamp(), majLe: fs.serverTimestamp()
        });
        nomInscription = null;
        return;
      } catch (e) { console.error('Création du profil impossible', e); }
    }
    profilReel = snap.exists() ? { id: snap.id, ...snap.data() } : null;
    etat = { user, profil: appliquerVue(user, profilReel), pret: true };
    synchroniserAnnuaire(user, profilReel);   // toujours le vrai rôle
    notifier();
    bandeauVue();
  }, (err) => {
    console.error(err);
    profilReel = null;
    etat = { user, profil: null, pret: true };
    notifier();
  });
});

// L'annuaire (annuaire/{uid}) ne contient que le nom affiché et le rôle.
// Sa propre entrée n'est vérifiée qu'une fois par connexion (ou quand le nom
// ou le rôle change) : ce qui a été écrit est retenu dans le navigateur.
// La lecture de l'annuaire complet est dans annuaire.js (cache local).
export const CLE_ANNUAIRE = (uid) => 'cam-annuaire-' + uid;
const CLE_MON_ENTREE = (uid) => 'cam-annuaire-moi-' + uid;
async function synchroniserAnnuaire(user, profil) {
  if (!estActif(profil)) return;
  const voulu = JSON.stringify({ nom: profil.nom, role: profil.role });
  try { if (localStorage.getItem(CLE_MON_ENTREE(user.uid)) === voulu) return; } catch (e) { /* navigation privée */ }
  try {
    const ref = fs.doc(db, 'annuaire', user.uid);
    const snap = await fs.getDoc(ref);
    if (!snap.exists() || snap.data().nom !== profil.nom || snap.data().role !== profil.role) {
      await fs.setDoc(ref, { nom: profil.nom, role: profil.role });
    }
    try { localStorage.setItem(CLE_MON_ENTREE(user.uid), voulu); } catch (e) { /* ignore */ }
  } catch (e) { console.warn('Annuaire non synchronisé', e); }
}

/** Appelle cb({user, profil, pret}) maintenant (si prêt) et à chaque changement. */
export function surSession(cb) {
  abonnes.add(cb);
  if (etat.pret) cb(etat);
  return () => abonnes.delete(cb);
}

export function sessionCourante() { return etat; }
/** Vrai administrateur, même en vue de test. */
export const estAdminReel = () => estAdmin(profilReel);
/** Vue de test en cours ('conteur' | 'joueur') ou null. */
export const vueTest = () => (etat.profil && etat.profil.vueTest) || null;

/** Les règles publiées dans Firebase sont-elles à jour ? (1 lecture) */
export async function reglesAJour() {
  try { await fs.getDoc(fs.doc(db, 'regles', VERSION_REGLES)); return true; }
  catch (e) { if (e.code === 'permission-denied') return false; throw e; }
}

// Bandeau de la vue de test, sur toutes les pages (styles en ligne : il
// s'affiche aussi sur les pages qui n'ont pas la feuille de style des membres).
function bandeauVue() {
  let el = document.getElementById('cam-vue-test');
  const vue = vueTest();
  if (!vue || !document.body) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement('div');
    el.id = 'cam-vue-test';
    el.setAttribute('role', 'status');
    document.body.append(el);
  }
  el.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2147483000;max-width:min(620px,calc(100vw - 24px));'
    + 'display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:8px 12px;border:1px solid #c9a227;border-radius:6px;'
    + 'background:#1b1712;color:#f1e6cc;font:13px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.45);text-align:left';
  const bouton = (texte, valeur, principal) => h('button', {
    type: 'button', onclick: () => changerVue(valeur),
    style: 'cursor:pointer;padding:4px 10px;border-radius:4px;font:inherit;font-size:12px;'
      + (principal ? 'border:1px solid #c9a227;background:#c9a227;color:#1b1712;font-weight:600' : 'border:1px solid #6b5d45;background:transparent;color:#f1e6cc')
  }, texte);
  const autre = vue === 'joueur' ? 'conteur' : 'joueur';
  el.replaceChildren(
    h('span', {}, '👁 ', h('strong', {}, 'Vue de test : ' + VUES_TEST[vue].toLowerCase()),
      h('br'), h('small', { style: 'opacity:.8' }, 'Seul l\'affichage change : vos actions passent avec vos droits d\'administrateur.')),
    h('span', { style: 'display:flex;gap:6px;flex-wrap:wrap' },
      bouton('Voir en ' + VUES_TEST[autre].toLowerCase(), autre, false),
      bouton('Revenir administrateur', '', true)));
}

// ---------------------------------------------------------------------
// Connexion / inscription
// ---------------------------------------------------------------------
export async function connexion(email, motDePasse) {
  return authMod.signInWithEmailAndPassword(auth, email.trim(), motDePasse);
}

export async function inscription(nom, email, motDePasse) {
  nomInscription = nom;
  const cred = await authMod.createUserWithEmailAndPassword(auth, email.trim(), motDePasse);
  try { await authMod.updateProfile(cred.user, { displayName: nom }); } catch (e) { /* sans importance */ }
  try { await authMod.sendEmailVerification(cred.user); } catch (e) { /* quota ou émulateur */ }
  return cred;
}

export async function connexionGoogle() {
  const provider = new authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return authMod.signInWithPopup(auth, provider);
}

export async function motDePasseOublie(email) {
  return authMod.sendPasswordResetEmail(auth, email.trim());
}

export async function renvoyerVerification() {
  if (auth.currentUser) return authMod.sendEmailVerification(auth.currentUser);
}

export async function deconnexion(redirection = '/') {
  try { const { viderCacheImages } = await import('./images.js'); await viderCacheImages(); } catch (e) { /* ignore */ }
  // L'annuaire gardé dans le navigateur sera relu à la prochaine connexion.
  try { const u = auth.currentUser; if (u) { localStorage.removeItem(CLE_ANNUAIRE(u.uid)); localStorage.removeItem(CLE_MON_ENTREE(u.uid)); localStorage.removeItem(CLE_VUE(u.uid)); } } catch (e) { /* ignore */ }
  await authMod.signOut(auth);
  location.href = redirection;
}

export async function changerNom(nom) {
  const u = auth.currentUser;
  if (!u) throw new Error('Non connecté');
  nom = nom.trim().slice(0, 60);
  if (!nom) throw new Error('Le nom ne peut pas être vide.');
  await fs.updateDoc(fs.doc(db, 'utilisateurs', u.uid), { nom, majLe: fs.serverTimestamp() });
}

const ERREURS_AUTH = {
  'auth/invalid-email': 'Adresse email invalide.',
  'auth/missing-password': 'Entrez un mot de passe.',
  'auth/weak-password': 'Mot de passe trop faible (8 caractères minimum conseillés).',
  'auth/email-already-in-use': 'Un compte existe déjà avec cette adresse.',
  'auth/invalid-credential': 'Email ou mot de passe incorrect.',
  'auth/wrong-password': 'Email ou mot de passe incorrect.',
  'auth/user-not-found': 'Email ou mot de passe incorrect.',
  'auth/user-disabled': 'Ce compte a été désactivé.',
  'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
  'auth/popup-closed-by-user': 'Fenêtre de connexion fermée avant la fin.',
  'auth/popup-blocked': 'Le navigateur a bloqué la fenêtre de connexion Google.',
  'auth/network-request-failed': 'Problème de connexion réseau.',
  'auth/unauthorized-domain': 'Ce domaine n\'est pas autorisé dans la console Firebase (Authentication > Paramètres > Domaines autorisés).',
  'auth/operation-not-allowed': 'Cette méthode de connexion n\'est pas activée dans la console Firebase.'
};
export function messageErreur(err) {
  if (!err) return 'Erreur inconnue.';
  if (ERREURS_AUTH[err.code]) return ERREURS_AUTH[err.code];
  if (err.code === 'permission-denied') {
    return 'Action refusée : vous n\'avez pas les droits nécessaires.' + (estAdmin(profilReel)
      ? ' (Administrateur : si cela ne devrait pas arriver, vérifiez que les règles publiées dans Firebase sont à jour : Comptes > Maintenance > « Vérifier les règles ».)'
      : '');
  }
  if (err.code === 'unavailable') return 'Service momentanément injoignable, vérifiez votre connexion.';
  return err.message || String(err);
}

// ---------------------------------------------------------------------
// Garde d'accès pour les pages protégées
// ---------------------------------------------------------------------
/**
 * Affiche dans `racine` le bon message tant que l'accès n'est pas permis.
 * exige : 'connecte' | 'actif' | 'conteur' | 'admin'
 * Renvoie true si l'accès est autorisé.
 */
export function verifierAcces(racine, session, exige = 'actif') {
  const { user, profil } = session;
  const retour = encodeURIComponent(location.pathname + location.search);
  const bloquer = (titre, texte, lien) => {
    racine.replaceChildren(h('div', { class: 'cam-bloc cam-acces' },
      h('h2', {}, titre), h('p', {}, texte), lien || ''));
    return false;
  };
  if (configManquante && !modeEmulateurs) {
    return bloquer('Configuration manquante', 'Firebase n\'est pas encore configuré : remplissez assets/js/camarilla/firebase-config.js (voir docs/FIREBASE.md).');
  }
  if (!user) {
    return bloquer('Connexion requise', 'Cette page est réservée aux membres de l\'association.',
      h('a', { class: 'cam-btn', href: '/connexion/?retour=' + retour }, 'Se connecter'));
  }
  if (exige === 'connecte') return true;
  if (!profil) return bloquer('Profil introuvable', 'Votre profil n\'a pas pu être chargé. Rechargez la page.');
  if (profil.statut === 'en_attente') {
    return bloquer('Compte en attente', 'Votre inscription est enregistrée. Un conteur doit maintenant activer votre compte ; vous aurez accès à cette page dès que ce sera fait.');
  }
  if (profil.statut !== 'actif') return bloquer('Compte suspendu', 'Votre compte est suspendu. Contactez un conteur.');
  if (exige === 'conteur' && !estConteur(profil)) return bloquer('Accès réservé', 'Cette page est réservée aux conteurs.');
  if (exige === 'admin' && !estAdmin(profil)) return bloquer('Accès réservé', 'Cette page est réservée aux administrateurs.');
  return true;
}

/**
 * Démarre une page protégée : `demarrer(session)` n'est appelé qu'une fois,
 * quand l'accès est autorisé. Si l'utilisateur change, la page est rechargée.
 */
export function pageProtegee(racine, exige, demarrer) {
  let uidDemarre = null;
  let statutDemarre = null;
  surSession((session) => {
    if (!session.pret) return;
    if (uidDemarre !== null) {
      const uid = session.user ? session.user.uid : '';
      const statut = session.profil ? session.profil.statut + '/' + session.profil.role : '';
      if (uid !== uidDemarre || statut !== statutDemarre) location.reload();
      return;
    }
    if (!verifierAcces(racine, session, exige)) return;
    uidDemarre = session.user.uid;
    statutDemarre = session.profil ? session.profil.statut + '/' + session.profil.role : '';
    racine.replaceChildren();
    Promise.resolve(demarrer(session)).catch((e) => {
      console.error(e);
      racine.prepend(h('div', { class: 'cam-msg err' }, 'Erreur au chargement : ' + messageErreur(e)));
    });
  });
}

/** Barre « connecté en tant que » à placer en haut des pages membres. */
export function barreMembre(conteneur) {
  surSession(({ user, profil }) => {
    if (!conteneur) return;
    if (!user) {
      conteneur.replaceChildren(h('div', { class: 'cam-barre' },
        h('span', {}, 'Non connecté'),
        h('a', { href: '/connexion/?retour=' + encodeURIComponent(location.pathname) }, 'Se connecter')));
      return;
    }
    const vue = profil && profil.vueTest;
    const role = !profil ? '' : vue ? 'Administrateur, vue ' + VUES_TEST[vue].toLowerCase()
      : profil.role === 'admin' ? 'Administrateur (et conteur)' : (ROLES[profil.role] || profil.role);
    // Vrai administrateur : choix de la vue de test.
    const choixVue = estAdmin(profilReel) ? h('select', {
      class: 'cam-vue-choix', 'aria-label': 'Voir le site en tant que',
      title: 'Voir le site comme un conteur ou un joueur, pour tester. Vos droits ne changent pas.',
      onchange: (e) => changerVue(e.target.value)
    },
    h('option', { value: '', selected: !vue }, 'Vue administrateur'),
    ...Object.entries(VUES_TEST).map(([v, l]) => h('option', { value: v, selected: vue === v }, 'Vue ' + l.toLowerCase()))) : '';
    conteneur.replaceChildren(h('div', { class: 'cam-barre' },
      h('span', {}, 'Connecté : ', h('strong', {}, profil ? profil.nom : user.email), role ? ' · ' + role : ''),
      choixVue,
      h('a', { href: '/membres/' }, 'Espace membres'),
      h('a', { href: '/membres/notifications/' }, 'Notifications'),
      h('a', { href: '#', onclick: (e) => { e.preventDefault(); deconnexion('/'); } }, 'Déconnexion')));
  });
}

// ---------------------------------------------------------------------
// Utilitaires DOM (aucun texte utilisateur n'est injecté en HTML brut)
// ---------------------------------------------------------------------
/** Crée un élément : h('div', {class:'x', onclick: fn}, 'texte', autreElement) */
export function h(tag, props = {}, ...enfants) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'multiple' || k === 'readOnly') el[k] = !!v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const e of enfants.flat(Infinity)) {
    if (e === null || e === undefined || e === false || e === '') continue;
    el.append(e instanceof Node ? e : document.createTextNode(String(e)));
  }
  return el;
}

export function options(select, valeurs, selection, avecVide) {
  select.replaceChildren(
    ...(avecVide ? [h('option', { value: '' }, typeof avecVide === 'string' ? avecVide : '')] : []),
    ...valeurs.map((v) => {
      const [val, lib] = Array.isArray(v) ? v : [v, v];
      return h('option', { value: val, selected: String(val) === String(selection ?? '') }, lib);
    }));
  return select;
}

export function message(el, texte, type = 'ok') {
  if (!el) return;
  el.textContent = texte || '';
  el.className = 'cam-msg ' + (texte ? type : '');
}

export function dateFr(v, avecHeure = false) {
  if (!v) return '';
  const d = typeof v.toDate === 'function' ? v.toDate() : new Date(v);
  if (isNaN(d)) return '';
  return avecHeure
    ? d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
    : d.toLocaleDateString('fr-FR');
}

export function millis(v) {
  if (!v) return 0;
  if (typeof v.toMillis === 'function') return v.toMillis();
  const t = new Date(v).getTime();
  return isNaN(t) ? 0 : t;
}

// Date du jour en heure locale (et non en UTC : entre minuit et 1 ou 2 h,
// toISOString() donnerait la veille).
export function aujourdhui() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
export function moisCourant() { return aujourdhui().slice(0, 7); }

export function telecharger(texte, nomFichier, type = 'application/json') {
  const blob = new Blob([texte], { type });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: nomFichier });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Convertit un tableau d'objets en CSV (séparateur ; pour Excel français). */
export function versCsv(lignes, colonnes) {
  const cell = (v) => {
    const s = v === null || v === undefined ? '' : (typeof v === 'object' && v.toDate ? dateFr(v, true) : String(v));
    return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const tete = colonnes.map((c) => cell(c.titre)).join(';');
  const corps = lignes.map((l) => colonnes.map((c) => cell(typeof c.valeur === 'function' ? c.valeur(l) : l[c.cle])).join(';'));
  return '﻿' + [tete, ...corps].join('\r\n');
}

/** Système d'onglets simple : boutons [data-onglet] et panneaux [data-panneau]. */
export function onglets(racine, surChangement) {
  const boutons = racine.querySelectorAll(':scope > .cam-onglets > [data-onglet]');
  const panneaux = racine.querySelectorAll(':scope > [data-panneau]');
  const activer = (nom) => {
    boutons.forEach((b) => b.classList.toggle('actif', b.dataset.onglet === nom));
    panneaux.forEach((p) => p.classList.toggle('actif', p.dataset.panneau === nom));
    if (surChangement) surChangement(nom);
  };
  boutons.forEach((b) => b.addEventListener('click', () => activer(b.dataset.onglet)));
  return activer;
}

export function confirmer(texte) { return window.confirm(texte); }
