// Tableau d'enquête : sauvegarde en ligne, partage, ouverture.
// S'appuie sur le pont window.TableauEnquete défini dans _pages/utils/tableau.md.
//
// Chaque membre a UN seul tableau en ligne : le document tableaux/{uid}, qui
// contient les 3 tableaux de la page et qui est remplacé à chaque sauvegarde.
// « Partager » ouvre ce même document à d'autres membres (lecture ou
// modification). « Ouvrir » liste son tableau et ceux qu'on a partagés avec soi.
import {
  h, db, fs, surSession, estActif, estConteur, message, messageErreur, dateFr, millis, confirmer
} from '../core.js';
import { externaliser, internaliser } from '../images.js';

const T = window.TableauEnquete;
T.pris = true;            // le module décide désormais de ce qui s'affiche au démarrage

const LIMITE = 950000;
const MAX_INVITES = 39;
const INDICE = 'cam-tableau-perso';
const statut = document.getElementById('cloudStatus');

let session = { user: null, profil: null };
let courant = null;       // document affiché : { id, titre, proprietaire, proprietaireNom, acces, droits, version }
let reference = null;     // contenu affiché au dernier chargement / enregistrement
let dernierJson = null;   // contenuJson (images externalisées) du dernier chargement / enregistrement
let enEcriture = null;    // contenuJson en cours d'envoi (pour reconnaître notre propre écriture)
let arretEcoute = null;
let enCours = false;
let uidDemarre;           // undefined tant que le démarrage n'a pas eu lieu
let confirmeJusqua = 0;   // affiche « ✓ » quelques secondes après une sauvegarde

const uid = () => (session.user ? session.user.uid : null);
const actif = () => !!session.user && estActif(session.profil);
const monNom = () => (session.profil && session.profil.nom) || 'Joueur';
const estMien = () => !!courant && courant.id === uid();
const peutModifierCourant = () => !!courant && !estMien() && courant.proprietaire !== uid()
  && (courant.droits || {})[uid()] === 'ecriture';
const etatActuel = () => JSON.stringify(T.exporter());
const modifie = () => etatActuel() !== (reference !== null ? reference : T.etatBase);
const nbInvites = (d) => Math.max(0, (d.acces || []).filter((x) => x !== d.proprietaire).length);
const titreParDefaut = () => 'Enquête de ' + monNom();

function indice(present) {
  try { if (present) localStorage.setItem(INDICE, '1'); else localStorage.removeItem(INDICE); } catch (e) { /* navigation privée */ }
}

function adresse(id) {
  const url = new URL(location.href);
  if (id && id !== uid()) url.searchParams.set('tableau', id); else url.searchParams.delete('tableau');
  history.replaceState(null, '', url);
}

// ---------------------------------------------------------------------
// Statut dans la barre d'outils
// ---------------------------------------------------------------------
function majStatut(texte) {
  if (!statut) return;
  statut.className = 'cloud-status';
  statut.title = '';
  if (texte) { statut.textContent = texte; return; }
  if (!session.user) { statut.textContent = 'non connecté'; return; }
  const point = modifie() ? ' ●' : '';
  if (point) statut.classList.add('modifie');
  if (!courant) { statut.textContent = 'pas encore sauvegardé' + point; return; }
  const signe = Date.now() < confirmeJusqua ? '✓ ' : '☁ ';
  if (estMien()) {
    const n = nbInvites(courant);
    statut.textContent = signe + 'Mon tableau' + (n ? ' · partagé (' + n + ')' : '') + point;
    statut.title = courant.titre;
    return;
  }
  const lecture = !peutModifierCourant();
  statut.textContent = signe + (courant.proprietaire === uid() ? 'Ancien enregistrement' : 'Tableau de ' + (courant.proprietaireNom || '?'))
    + (lecture ? ' (lecture seule)' : '') + point;
  statut.title = courant.titre;
  if (lecture && !point) statut.classList.add('lecture');
}

// Indicateur « ● modifié » : vérifié peu après chaque action sur la page.
let verifPrevue = null;
function planifierVerif() {
  clearTimeout(verifPrevue);
  verifPrevue = setTimeout(() => { if (!enCours) majStatut(); }, 400);
}
['pointerup', 'keyup', 'change', 'drop'].forEach((ev) => document.addEventListener(ev, planifierVerif, true));

// ---------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------
surSession((s) => {
  session = s;
  if (!s.pret) return;
  const id = s.user ? s.user.uid : null;
  if (uidDemarre !== undefined) {
    if (id !== uidDemarre) location.reload();   // connexion / déconnexion dans un autre onglet
    else majStatut();
    return;
  }
  uidDemarre = id;
  demarrer();
});

async function demarrer() {
  const demande = new URLSearchParams(location.search).get('tableau');
  if (!actif()) {
    indice(false);
    if (demande) majStatut(session.user ? 'compte pas encore activé' : 'connectez-vous pour ouvrir ce tableau');
    else { T.demo(); majStatut(); }
    return;
  }
  if (demande && demande !== uid()) { await ouvrir(demande); return; }
  // Sans adresse particulière : on recharge son propre tableau s'il existe.
  majStatut('chargement…');
  try {
    const snap = await fs.getDoc(fs.doc(db, 'tableaux', uid()));
    if (snap.exists()) {
      // La démo a pu s'afficher (et être modifiée) pendant le chargement.
      if (!modifie() || confirmer('Remplacer le tableau affiché par votre tableau sauvegardé le '
        + dateFr(snap.data().majLe, true) + ' ?')) {
        await afficher(uid(), snap.data());
        return;
      }
    } else {
      indice(false);
    }
  } catch (e) {
    console.error(e);
  }
  adresse(null);
  T.demo();
  majStatut();
}

// ---------------------------------------------------------------------
// Boutons et raccourcis
// ---------------------------------------------------------------------
document.getElementById('btnSave').addEventListener('click', () => sauvegarder());
document.getElementById('btnShare').addEventListener('click', () => partager());
document.getElementById('btnCloud').addEventListener('click', () => ouvrirPanneau());
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); sauvegarder(); }
});
window.addEventListener('beforeunload', (e) => {
  if (actif() && modifie()) { e.preventDefault(); e.returnValue = ''; }
});

// ---------------------------------------------------------------------
// Fenêtres
// ---------------------------------------------------------------------
function modale(titre, ...contenu) {
  const fond = h('div', { class: 'cam-modal-fond cam-app' });
  const fermer = () => { fond.remove(); document.removeEventListener('keydown', echap, true); };
  const echap = (e) => { if (e.key === 'Escape') { e.stopPropagation(); fermer(); } };
  const boite = h('div', { class: 'cam-modal' }, h('h2', {}, titre), ...contenu);
  fond.append(boite);
  fond.addEventListener('click', (e) => { if (e.target === fond) fermer(); });
  document.addEventListener('keydown', echap, true);
  document.body.append(fond);
  return { fond, boite, fermer };
}

function exigerCompte(titre) {
  if (actif()) return true;
  const { user } = session;
  modale(titre,
    h('p', {}, user
      ? 'Votre compte doit être activé par un conteur pour sauvegarder et partager des tableaux en ligne.'
      : 'Connectez-vous avec votre compte de membre pour sauvegarder votre tableau en ligne et le partager.'),
    h('p', { class: 'sous-titre' }, 'Sans compte, l\'export / import JSON reste disponible.'),
    !user ? h('a', { class: 'cam-btn', href: '/connexion/?retour=' + encodeURIComponent(location.pathname + location.search) }, 'Se connecter') : '');
  return false;
}

// ---------------------------------------------------------------------
// Ouvrir
// ---------------------------------------------------------------------
async function ouvrirPanneau() {
  if (!exigerCompte('Ouvrir un tableau')) return;
  const msg = h('div', { class: 'cam-msg' });
  const zoneMien = h('div', {}, h('p', { class: 'sous-titre' }, 'Chargement…'));
  const zonePartages = h('div');
  const zoneAnciens = h('div');
  const zoneTous = h('div');
  const m = modale('Ouvrir un tableau',
    courant && !estMien()
      ? h('div', { class: 'cam-encart' }, 'Affiché : ', h('strong', {}, courant.titre), ' — ' + (courant.proprietaireNom || '?'),
        peutModifierCourant() ? ' (vous pouvez le modifier)' : ' (lecture seule)')
      : '',
    h('h3', {}, 'Mon tableau'), zoneMien,
    h('h3', {}, 'Partagés avec moi'), zonePartages,
    zoneAnciens,
    estConteur(session.profil) ? [h('h3', {}, 'Tous les tableaux (conteurs)'), zoneTous] : '',
    msg);

  try {
    const snap = await fs.getDocs(fs.query(fs.collection(db, 'tableaux'), fs.where('acces', 'array-contains', uid())));
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => millis(b.majLe) - millis(a.majLe));
    const mien = docs.find((d) => d.id === uid());

    if (mien) {
      remplir(zoneMien, [mien], '', m, { supprimer: true });
    } else {
      zoneMien.replaceChildren(h('p', { class: 'sous-titre' },
        'Pas encore sauvegardé. « ☁ Sauvegarder » enregistre les 3 tableaux de la page.'));
    }
    if (courant && !estMien()) {
      zoneMien.append(h('button', { type: 'button', class: 'petit secondaire', onclick: () => { m.fermer(); revenirAuMien(); } },
        mien ? 'Revenir à mon tableau' : 'Repartir d\'un tableau vide'));
    }

    remplir(zonePartages, docs.filter((d) => d.proprietaire !== uid()), 'Personne ne vous a encore partagé de tableau.', m);

    const anciens = docs.filter((d) => d.proprietaire === uid() && d.id !== uid());
    if (anciens.length) {
      zoneAnciens.append(h('h3', {}, 'Anciens enregistrements'),
        h('p', { class: 'sous-titre' }, 'Chaque membre n\'a plus qu\'un tableau en ligne. Ouvrez un ancien enregistrement puis « ☁ Sauvegarder » pour en faire votre tableau, ou supprimez-le pour libérer de la place.'));
      const liste = h('div');
      zoneAnciens.append(liste);
      remplir(liste, anciens, '', m, { supprimer: true });
    }

    if (estConteur(session.profil)) {
      const tous = await fs.getDocs(fs.collection(db, 'tableaux'));
      remplir(zoneTous, tous.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => millis(b.majLe) - millis(a.majLe)),
        'Aucun tableau.', m, { supprimer: true });
    }
  } catch (e) { message(msg, messageErreur(e), 'err'); }
}

function remplir(zone, docs, vide, m, { supprimer = false } = {}) {
  if (!docs.length) { zone.replaceChildren(h('p', { class: 'sous-titre' }, vide)); return; }
  zone.replaceChildren(h('div', { class: 'cam-table-defil' }, h('table', { class: 'cam-table' },
    h('tbody', {}, docs.map((d) => {
      const droit = d.proprietaire === uid()
        ? (nbInvites(d) ? 'partagé avec ' + nbInvites(d) + ' membre' + (nbInvites(d) > 1 ? 's' : '') : 'non partagé')
        : ((d.droits || {})[uid()] === 'ecriture' ? 'modification' : 'lecture');
      const affiche = courant && courant.id === d.id;
      return h('tr', {},
        h('td', {}, h('strong', {}, d.titre), h('br'), h('small', { class: 'sous-titre' }, 'par ' + (d.proprietaireNom || '?') + ' · ' + droit)),
        h('td', {}, h('small', {}, 'modifié le ' + dateFr(d.majLe, true), d.majParNom ? ' par ' + d.majParNom : '')),
        h('td', { style: 'white-space:nowrap' },
          affiche ? h('small', { class: 'sous-titre' }, 'affiché ')
            : h('button', { type: 'button', class: 'petit', onclick: () => { m.fermer(); ouvrir(d.id); } }, 'Ouvrir'),
          supprimer && (d.proprietaire === uid() || estConteur(session.profil)) ? h('button', {
            type: 'button', class: 'petit danger', onclick: async () => {
              if (!confirmer('Supprimer définitivement le tableau « ' + d.titre + ' » de ' + (d.proprietaireNom || '?') + ' ?')) return;
              try {
                await fs.deleteDoc(fs.doc(db, 'tableaux', d.id));
                if (d.id === uid()) indice(false);
                if (courant && courant.id === d.id) detacher();
                m.fermer(); ouvrirPanneau();
              } catch (e) { alert(messageErreur(e)); }
            }
          }, 'Supprimer') : ''));
    })))));
}

async function ouvrir(id) {
  if (modifie() && !confirmer('Le tableau affiché a des modifications non sauvegardées. Les abandonner ?')) return;
  majStatut('ouverture…');
  try {
    const snap = await fs.getDoc(fs.doc(db, 'tableaux', id));
    if (!snap.exists()) throw new Error('Tableau introuvable (il a peut-être été supprimé).');
    await afficher(id, snap.data());
  } catch (e) {
    console.error(e);
    majStatut('ouverture impossible');
    alert('Impossible d\'ouvrir ce tableau : ' + messageErreur(e));
  }
}

async function afficher(id, d) {
  const contenu = await internaliser(JSON.parse(d.contenuJson || '{}'));
  T.charger(contenu.boards ? contenu : { version: 2, boards: [] });
  courant = { id, titre: d.titre, proprietaire: d.proprietaire, proprietaireNom: d.proprietaireNom, acces: d.acces, droits: d.droits, version: d.version };
  reference = etatActuel();
  dernierJson = d.contenuJson;
  if (id === uid()) indice(true);
  adresse(id);
  document.getElementById('cam-bandeau-maj')?.remove();
  suivre(id);
  majStatut();
}

function detacher() {
  if (arretEcoute) { arretEcoute(); arretEcoute = null; }
  courant = null; reference = null; dernierJson = null;
  adresse(null);
  majStatut();
}

async function revenirAuMien() {
  if (modifie() && !confirmer('Le tableau affiché a des modifications non sauvegardées. Les abandonner ?')) return;
  try {
    const snap = await fs.getDoc(fs.doc(db, 'tableaux', uid()));
    if (snap.exists()) { await afficher(uid(), snap.data()); return; }
  } catch (e) { console.error(e); }
  detacher();
  T.vider();
  majStatut();
}

// Mise à jour en direct quand quelqu'un d'autre (ou un autre appareil) modifie le tableau affiché.
function suivre(id) {
  if (arretEcoute) arretEcoute();
  arretEcoute = fs.onSnapshot(fs.doc(db, 'tableaux', id), (snap) => {
    if (!courant || courant.id !== id) return;
    if (!snap.exists()) { majStatut('ce tableau a été supprimé'); courant = null; reference = null; return; }
    if (snap.metadata.hasPendingWrites) return;
    const d = snap.data();
    courant.acces = d.acces; courant.droits = d.droits; courant.titre = d.titre;
    if (d.contenuJson === dernierJson || (enEcriture !== null && d.contenuJson === enEcriture)) {
      // Même contenu (notre propre sauvegarde, ou seul le partage a changé).
      courant.version = Math.max(courant.version, d.version);
      majStatut();
    } else if (d.version > courant.version) {
      bandeauMiseAJour(d);
    }
  }, () => { majStatut('accès à ce tableau retiré'); });
}

function bandeauMiseAJour(d) {
  const qui = d.majPar === uid() ? 'Vous (depuis un autre appareil)' : (d.majParNom || 'Un autre membre');
  majStatut('modifié par ' + (d.majPar === uid() ? 'un autre appareil' : (d.majParNom || 'un autre membre')));
  statut.classList.add('modifie');
  if (document.getElementById('cam-bandeau-maj')) return;
  const bandeau = h('div', {
    id: 'cam-bandeau-maj', class: 'cam-app',
    style: 'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:9500;background:#fff;color:#2b2b2b;border:1px solid #7a1f2b;border-radius:6px;padding:.6rem 1rem;box-shadow:0 4px 20px rgba(0,0,0,.5);font-family:system-ui,sans-serif;font-size:.85rem'
  },
  qui + ' vient de modifier ce tableau. ',
  h('button', { type: 'button', class: 'petit', onclick: () => { bandeau.remove(); recharger(); } }, 'Afficher la nouvelle version'),
  h('button', { type: 'button', class: 'petit secondaire', onclick: () => bandeau.remove() }, 'Plus tard'));
  document.body.append(bandeau);
}

async function recharger() {
  if (courant) await ouvrir(courant.id);   // ouvrir() demande confirmation s'il y a des modifications
}

// ---------------------------------------------------------------------
// Sauvegarder
// ---------------------------------------------------------------------
async function preparerContenu() {
  const donnees = await externaliser(T.exporter(), (n) => majStatut('envoi des images… (' + n + ')'));
  const json = JSON.stringify(donnees);
  if (json.length > LIMITE) {
    throw new Error('Tableau trop volumineux pour être sauvegardé (' + Math.round(json.length / 1024)
      + ' Ko de texte, maximum ' + Math.round(LIMITE / 1024) + ' Ko). Allégez les notes et articles les plus longs.');
  }
  return json;
}

/** Bouton « Sauvegarder » / Ctrl+S. */
async function sauvegarder() {
  if (!exigerCompte('Sauvegarder en ligne')) return false;
  if (enCours) return false;
  if ((estMien() || peutModifierCourant()) && !modifie()) {
    reussite(null);   // rien n'a changé depuis la dernière sauvegarde : aucune écriture
    return true;
  }
  if (peutModifierCourant()) return sauvegarderPartage();
  return sauvegarderMien();
}

/**
 * Enregistre le contenu affiché dans tableaux/{uid}, le seul tableau en ligne
 * du membre. `partage` ({ acces, droits, titre }) modifie aussi les invités.
 */
async function sauvegarderMien(partage = null, msg = null) {
  if (enCours) return false;
  enCours = true;
  majStatut('sauvegarde…');
  try {
    const ref = fs.doc(db, 'tableaux', uid());
    let existant = null;
    if (estMien()) {
      existant = courant;
    } else {
      const snap = await fs.getDoc(ref);
      existant = snap.exists() ? snap.data() : null;
      // Le tableau affiché n'est pas (encore) le mien : prévenir avant de remplacer.
      const deQui = courant && courant.proprietaire !== uid() ? (courant.proprietaireNom || 'un autre membre') : null;
      let question = null;
      if (existant && !partage) {
        question = 'Vous n\'avez qu\'un tableau en ligne : ' + (deQui ? 'le tableau de ' + deQui : 'le tableau affiché')
          + ' va remplacer « ' + existant.titre + ' », sauvegardé le ' + dateFr(existant.majLe, true) + '.\n\nContinuer ?';
      } else if (!existant && deQui) {
        question = 'Ce tableau appartient à ' + deQui + '. En faire une copie comme votre tableau en ligne ?';
      }
      if (question && !confirmer(question)) { majStatut(); return false; }
    }

    const etat = etatActuel();
    const json = (!existant || !estMien() || modifie()) ? await preparerContenu() : null;
    const signature = { majLe: fs.serverTimestamp(), majPar: uid(), majParNom: monNom() };
    enEcriture = json;

    if (!existant) {
      const titre = (partage && partage.titre) || titreParDefaut();
      const acces = (partage && partage.acces) || [uid()];
      const droits = (partage && partage.droits) || {};
      await fs.setDoc(ref, {
        proprietaire: uid(), proprietaireNom: monNom(), titre, acces, droits,
        contenuJson: json, version: 1, creeLe: fs.serverTimestamp(), ...signature
      });
      courant = { id: uid(), titre, proprietaire: uid(), proprietaireNom: monNom(), acces, droits, version: 1 };
    } else {
      const champs = { ...signature, proprietaireNom: monNom() };
      if (json !== null) champs.contenuJson = json;
      if (partage) Object.assign(champs, partage);
      const r = await ecrireVersion(uid(), champs, existant.version);
      if (typeof r === 'string') { enCours = false; return await apresConflit(r, uid()); }
      courant = {
        id: uid(), titre: champs.titre || existant.titre, proprietaire: uid(), proprietaireNom: monNom(),
        acces: champs.acces || existant.acces || [uid()], droits: champs.droits || existant.droits || {}, version: r
      };
    }
    if (json !== null) dernierJson = json;
    reference = etat;
    T.charge = true;
    indice(true);
    adresse(uid());
    suivre(uid());
    reussite(msg, partage ? 'Partage enregistré.' : 'Tableau sauvegardé.');
    return true;
  } catch (e) {
    echec(e, msg);
    return false;
  } finally { enCours = false; enEcriture = null; }
}

/** Sauvegarde dans le tableau d'un autre membre qui nous a donné le droit de modification. */
async function sauvegarderPartage() {
  if (enCours) return false;
  enCours = true;
  majStatut('sauvegarde…');
  const id = courant.id;
  try {
    const etat = etatActuel();
    const json = await preparerContenu();
    enEcriture = json;
    const r = await ecrireVersion(id, {
      contenuJson: json, majLe: fs.serverTimestamp(), majPar: uid(), majParNom: monNom()
    }, courant.version);
    if (typeof r === 'string') { enCours = false; return await apresConflit(r, id); }
    courant.version = r;
    dernierJson = json;
    reference = etat;
    reussite(null, 'Tableau sauvegardé.');
    return true;
  } catch (e) {
    echec(e);
    return false;
  } finally { enCours = false; enEcriture = null; }
}

/**
 * Écrit `champs` avec version + 1. Si quelqu'un a sauvegardé entre-temps,
 * demande quoi faire. Renvoie la nouvelle version (nombre), ou le choix de
 * l'utilisateur ('recharger' | 'copie' | 'annuler') si rien n'a été écrit.
 */
async function ecrireVersion(id, champs, version) {
  const ref = fs.doc(db, 'tableaux', id);
  try {
    await fs.updateDoc(ref, { ...champs, version: version + 1 });
    return version + 1;
  } catch (e) {
    if (e.code !== 'permission-denied') throw e;
  }
  // Refus : soit la version est dépassée (quelqu'un a sauvegardé), soit le droit a été retiré.
  let d = null;
  try {
    const snap = await fs.getDoc(ref);
    d = snap.exists() ? snap.data() : null;
  } catch (e) { /* plus d'accès en lecture */ }
  if (!d) throw new Error('Vous n\'avez plus accès à ce tableau.');
  if (d.version === version) throw new Error('Vous n\'avez pas le droit de modifier ce tableau.');
  const choix = await choisirConflit(d, id !== uid());
  if (choix !== 'ecraser') return choix;
  await fs.updateDoc(ref, { ...champs, version: d.version + 1 });
  return d.version + 1;
}

async function apresConflit(choix, id) {
  enEcriture = null;
  if (choix === 'recharger') { reference = etatActuel(); await ouvrir(id); }   // « perdre la mienne » : sans redemander
  else if (choix === 'copie') { return sauvegarderMien(); }
  else majStatut();
  return false;
}

function choisirConflit(d, chezUnAutre) {
  return new Promise((resolve) => {
    let fait = false;
    const choisir = (c) => { if (fait) return; fait = true; m.fermer(); resolve(c); };
    const qui = d.majPar === uid() ? 'Vous avez' : (d.majParNom || 'Un autre membre') + ' a';
    const m = modale('Conflit de sauvegarde',
      h('p', {}, qui + ' sauvegardé ce tableau le ' + dateFr(d.majLe, true) + (d.majPar === uid() ? ' depuis un autre appareil' : '') + ', après votre ouverture.'),
      h('div', { class: 'cam-actions' },
        chezUnAutre ? h('button', { type: 'button', onclick: () => choisir('copie') }, 'Garder ma version dans mon propre tableau') : '',
        h('button', { type: 'button', class: chezUnAutre ? 'secondaire' : '', onclick: () => choisir('recharger') }, 'Afficher sa version (perdre la mienne)'),
        h('button', { type: 'button', class: 'danger', onclick: () => choisir('ecraser') }, 'Écraser avec ma version')));
    const obs = new MutationObserver(() => { if (!m.fond.isConnected) { obs.disconnect(); choisir('annuler'); } });
    obs.observe(document.body, { childList: true });
  });
}

function reussite(msg, texte) {
  confirmeJusqua = Date.now() + 2500;
  majStatut();
  setTimeout(() => majStatut(), 2600);
  if (msg) message(msg, texte, 'ok');
}

function echec(e, msg) {
  console.error(e);
  majStatut('échec de la sauvegarde');
  if (msg) message(msg, messageErreur(e), 'err'); else alert(messageErreur(e));
}

// ---------------------------------------------------------------------
// Partager
// ---------------------------------------------------------------------
async function partager() {
  if (!exigerCompte('Partager un tableau')) return;
  if (courant && !estMien() && courant.proprietaire !== uid()) {
    const m = modale('Partager',
      h('p', {}, 'Vous consultez le tableau de ' + (courant.proprietaireNom || 'un autre membre') + ' : seul son propriétaire peut le partager.'),
      h('div', { class: 'cam-actions' },
        h('button', { type: 'button', onclick: () => { m.fermer(); revenirAuMien(); } }, 'Revenir à mon tableau'),
        h('button', { type: 'button', class: 'secondaire', onclick: () => m.fermer() }, 'Fermer')));
    return;
  }

  // Partage actuel de mon tableau (s'il existe déjà en ligne).
  let actuel = estMien() ? courant : null;
  if (!actuel) {
    try {
      const snap = await fs.getDoc(fs.doc(db, 'tableaux', uid()));
      if (snap.exists()) actuel = snap.data();
    } catch (e) { /* on part d'un partage vide */ }
  }

  const msg = h('div', { class: 'cam-msg' });
  const corps = h('tbody', {}, h('tr', {}, h('td', {}, 'Chargement de la liste des membres…')));
  const filtre = h('input', { type: 'search', placeholder: 'Rechercher un membre…' });
  const titre = h('input', { type: 'text', maxlength: 100, value: (actuel && actuel.titre) || titreParDefaut() });
  const lien = location.origin + location.pathname + '?tableau=' + uid();
  const enregistrerAussi = !estMien() || modifie();
  const m = modale('Partager mon tableau',
    h('p', { class: 'sous-titre' }, 'Les membres choisis verront vos 3 tableaux dans « ☰ Ouvrir > Partagés avec moi ». Les conteurs voient tous les tableaux.'),
    enregistrerAussi
      ? h('div', { class: 'cam-encart alerte' }, actuel
        ? 'Le tableau affiché sera sauvegardé en même temps et remplacera votre tableau en ligne.'
        : 'Votre tableau sera sauvegardé en ligne en même temps.')
      : '',
    h('label', {}, 'Titre vu par les invités'), titre,
    filtre,
    h('div', { class: 'cam-table-defil', style: 'max-height:45vh;overflow-y:auto' }, h('table', { class: 'cam-table' }, corps)),
    h('div', { class: 'cam-actions' },
      h('button', { type: 'button', onclick: () => valider() }, 'Enregistrer le partage'),
      actuel ? h('button', {
        type: 'button', class: 'secondaire', title: lien,
        onclick: async (e) => {
          try { await navigator.clipboard.writeText(lien); e.target.textContent = '✓ Lien copié'; }
          catch (err) { prompt('Lien vers votre tableau :', lien); }
        }
      }, 'Copier le lien') : '',
      h('button', { type: 'button', class: 'secondaire', onclick: () => m.fermer() }, 'Annuler')),
    msg);

  const choix = new Map();
  let membres = [];
  try {
    const snap = await fs.getDocs(fs.collection(db, 'annuaire'));
    membres = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((x) => x.id !== uid())
      .sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr'));
  } catch (e) { message(msg, messageErreur(e), 'err'); }
  const droitsActuels = (actuel && actuel.droits) || {};
  const accesActuels = (actuel && actuel.acces) || [];
  membres.forEach((x) => choix.set(x.id, droitsActuels[x.id] || (accesActuels.includes(x.id) ? 'lecture' : '')));

  const dessiner = () => {
    const f = filtre.value.trim().toLowerCase();
    const liste = membres.filter((x) => !f || (x.nom || '').toLowerCase().includes(f));
    corps.replaceChildren(...(liste.length ? liste.map((x) => {
      const sel = h('select', {},
        h('option', { value: '', selected: !choix.get(x.id) }, 'Pas d\'accès'),
        h('option', { value: 'lecture', selected: choix.get(x.id) === 'lecture' }, 'Lecture'),
        h('option', { value: 'ecriture', selected: choix.get(x.id) === 'ecriture' }, 'Modification'));
      sel.addEventListener('change', () => choix.set(x.id, sel.value));
      return h('tr', {}, h('td', {}, x.nom, x.role && x.role !== 'joueur' ? h('span', { class: 'cam-tag ' + x.role, style: 'margin-left:.4rem' }, x.role) : ''), h('td', {}, sel));
    }) : [h('tr', {}, h('td', {}, membres.length ? 'Aucun membre ne correspond.' : 'Aucun autre membre actif pour le moment.'))]));
  };
  filtre.addEventListener('input', dessiner);
  dessiner();

  async function valider() {
    const acces = [uid()];
    const droits = {};
    choix.forEach((v, id) => { if (v) { acces.push(id); droits[id] = v; } });
    if (acces.length > MAX_INVITES + 1) { message(msg, 'Maximum ' + MAX_INVITES + ' membres par tableau.', 'err'); return; }
    const t = titre.value.trim().slice(0, 100) || titreParDefaut();
    const ok = await sauvegarderMien({ acces, droits, titre: t }, msg);
    if (ok) setTimeout(() => m.fermer(), 800);
  }
}
