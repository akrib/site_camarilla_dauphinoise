// Tableau d'enquête : sauvegarde en ligne, partage, ouverture.
// S'appuie sur le pont window.TableauEnquete défini dans _pages/utils/tableau.md.
//
// Réservé aux personnages : le membre doit incarner un de ses personnages
// validés (voir incarnation.js). Chaque personnage a UN tableau en ligne,
// le document tableaux/{idPersonnage}, qui contient les 3 tableaux de la page
// et qui est remplacé à chaque sauvegarde. « Partager » l'ouvre à d'autres
// personnages (lecture ou modification) ; « Ouvrir » liste le tableau du
// personnage et ceux qu'on lui a partagés. Les conteurs peuvent consulter
// tous les tableaux sans incarner de personnage.
//
// Document : proprietaire (compte), personnage (id), proprietaireNom (nom du
// personnage), titre, contenuJson, version, acces (comptes qui peuvent lire),
// droits ({ compte: 'lecture' | 'ecriture' }), invites ({ idPersonnage:
// { nom, droit } }), majPar / majPerso / majParNom (dernier enregistrement).
import {
  h, db, fs, surSession, estActif, estConteur, message, messageErreur, dateFr, millis, confirmer
} from '../core.js';
import { externaliser, internaliser } from '../images.js';
import { exigerPersonnage, fenetreChoixPersonnage } from '../incarnation.js';

const T = window.TableauEnquete;
T.pris = true;            // le module décide de ce qui s'affiche

const LIMITE = 950000;
const MAX_INVITES = 39;
const statut = document.getElementById('cloudStatus');
const garde = document.getElementById('cam-garde');
const btnPerso = document.getElementById('btnPerso');

let session = { user: null, profil: null };
let perso = null;         // personnage incarné { id, nom, ... } (null : conteur sans personnage)
let courant = null;       // document affiché : { id, titre, proprietaire, personnage, proprietaireNom, acces, droits, invites, version }
let reference = null;     // contenu affiché au dernier chargement / enregistrement
let dernierJson = null;   // contenuJson (images externalisées) du dernier chargement / enregistrement
let enEcriture = null;    // contenuJson en cours d'envoi (pour reconnaître notre propre écriture)
let arretEcoute = null;
let enCours = false;
let pret = false;
let uidDemarre;           // undefined tant que le démarrage n'a pas eu lieu
let confirmeJusqua = 0;   // affiche « ✓ » quelques secondes après une sauvegarde

const uid = () => (session.user ? session.user.uid : null);
const conteur = () => estConteur(session.profil);
const monNom = () => (perso ? perso.nom : (session.profil && session.profil.nom) || 'Conteur');
const estMien = () => !!courant && !!perso && courant.id === perso.id;
const invitation = (d) => (perso && d && d.invites ? d.invites[perso.id] : null);
const peutModifierCourant = () => !!courant && !estMien() && !!invitation(courant)
  && invitation(courant).droit === 'ecriture' && (courant.droits || {})[uid()] === 'ecriture';
const etatActuel = () => JSON.stringify(T.exporter());
const modifie = () => etatActuel() !== (reference !== null ? reference : T.etatBase);
const nbInvites = (d) => Object.keys(d.invites || {}).length;
const titreParDefaut = () => 'Enquête de ' + monNom();
const signature = () => ({ majLe: fs.serverTimestamp(), majPar: uid(), majPerso: perso ? perso.id : '', majParNom: monNom() });

function adresse(id) {
  const url = new URL(location.href);
  if (id && (!perso || id !== perso.id)) url.searchParams.set('tableau', id); else url.searchParams.delete('tableau');
  history.replaceState(null, '', url);
}

// ---------------------------------------------------------------------
// Garde : la page ne s'ouvre qu'à un personnage incarné (ou à un conteur)
// ---------------------------------------------------------------------
function afficherGarde(...contenu) {
  garde.hidden = false;
  garde.replaceChildren(h('div', { class: 'cam-garde-boite' }, ...contenu,
    h('p', { class: 'sous-titre', style: 'margin-top:1rem' }, h('a', { href: '/membres/' }, '← Espace membres'))));
}

// ---------------------------------------------------------------------
// Statut dans la barre d'outils
// ---------------------------------------------------------------------
function majStatut(texte) {
  if (!statut) return;
  statut.className = 'cloud-status';
  statut.title = '';
  if (texte) { statut.textContent = texte; return; }
  if (!pret) return;
  const point = modifie() ? ' ●' : '';
  if (point) statut.classList.add('modifie');
  if (!courant) { statut.textContent = (perso ? 'pas encore sauvegardé' : 'mode conteur') + point; return; }
  const signe = Date.now() < confirmeJusqua ? '✓ ' : '☁ ';
  if (estMien()) {
    const n = nbInvites(courant);
    statut.textContent = signe + 'Tableau de ' + perso.nom + (n ? ' · partagé (' + n + ')' : '') + point;
    statut.title = courant.titre;
    return;
  }
  const lecture = !peutModifierCourant();
  statut.textContent = signe + (courant.personnage ? 'Tableau de ' + (courant.proprietaireNom || '?') : 'Ancien enregistrement')
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
  const retour = encodeURIComponent(location.pathname + location.search);
  if (!session.user) {
    afficherGarde(h('h2', {}, 'Connexion requise'),
      h('p', {}, 'Le tableau d\'enquête est réservé aux personnages des membres de l\'association.'),
      h('a', { class: 'cam-btn', href: '/connexion/?retour=' + retour }, 'Se connecter'));
    return;
  }
  if (!estActif(session.profil)) {
    afficherGarde(h('h2', {}, 'Compte pas encore actif'),
      h('p', {}, 'Un conteur doit activer votre compte avant que vous puissiez utiliser le tableau d\'enquête.'));
    return;
  }
  const zone = h('div');
  afficherGarde(zone);
  zone.append(h('p', { class: 'sous-titre' }, 'Vérification de votre personnage…'));
  const acces = await exigerPersonnage(zone, session, { outil: 'ce tableau d\'enquête' });
  if (!acces) return;
  perso = acces.perso;
  garde.hidden = true;
  pret = true;
  btnPerso.textContent = perso ? '☺ ' + perso.nom : '☺ Conteur';
  btnPerso.title = perso ? 'Vous incarnez ' + perso.nom + ' (cliquer pour changer)' : 'Mode conteur : vous consultez sans personnage (cliquer pour en incarner un)';

  const demande = new URLSearchParams(location.search).get('tableau');
  if (demande && (!perso || demande !== perso.id)) { await ouvrir(demande); return; }
  if (!perso) { adresse(null); majStatut(); return; }
  // Sans adresse particulière : le tableau du personnage, s'il existe.
  majStatut('chargement…');
  try {
    const snap = await fs.getDoc(fs.doc(db, 'tableaux', perso.id));
    if (snap.exists()) { await afficher(perso.id, snap.data()); return; }
  } catch (e) {
    console.error(e);
  }
  adresse(null);
  majStatut();
}

// ---------------------------------------------------------------------
// Boutons et raccourcis
// ---------------------------------------------------------------------
document.getElementById('btnSave').addEventListener('click', () => sauvegarder());
document.getElementById('btnShare').addEventListener('click', () => partager());
document.getElementById('btnCloud').addEventListener('click', () => ouvrirPanneau());
btnPerso.addEventListener('click', () => { if (pret) fenetreChoixPersonnage(uid()); });
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); sauvegarder(); }
});
window.addEventListener('beforeunload', (e) => {
  if (pret && perso && modifie()) { e.preventDefault(); e.returnValue = ''; }
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

/** Un conteur sans personnage peut consulter, mais n'a pas de tableau à lui. */
function exigerIncarnation(titre) {
  if (!pret) return false;
  if (perso) return true;
  const m = modale(titre,
    h('p', {}, 'Vous consultez les tableaux en tant que conteur. Pour avoir votre propre tableau et le partager, incarnez un de vos personnages (un PNJ, par exemple).'),
    h('div', { class: 'cam-actions' },
      h('button', { type: 'button', onclick: () => { m.fermer(); fenetreChoixPersonnage(uid()); } }, 'Incarner un personnage'),
      h('button', { type: 'button', class: 'secondaire', onclick: () => m.fermer() }, 'Fermer')));
  return false;
}

// ---------------------------------------------------------------------
// Ouvrir
// ---------------------------------------------------------------------
async function ouvrirPanneau() {
  if (!pret) return;
  const msg = h('div', { class: 'cam-msg' });
  const zoneMien = h('div');
  const zonePartages = h('div');
  const zoneAnciens = h('div');
  const zoneTous = h('div');
  const m = modale(perso ? 'Tableaux de ' + perso.nom : 'Tableaux des personnages',
    courant && !estMien()
      ? h('div', { class: 'cam-encart' }, 'Affiché : ', h('strong', {}, courant.titre), ' — ' + (courant.proprietaireNom || '?'),
        peutModifierCourant() ? ' (vous pouvez le modifier)' : ' (lecture seule)')
      : '',
    perso ? [h('h3', {}, 'Son tableau'), zoneMien, h('h3', {}, 'Partagés avec ' + perso.nom), zonePartages, zoneAnciens] : '',
    conteur() ? [h('h3', {}, 'Tous les tableaux (conteurs)'), zoneTous] : '',
    msg);
  zoneMien.append(h('p', { class: 'sous-titre' }, 'Chargement…'));

  try {
    if (perso) {
      const snap = await fs.getDocs(fs.query(fs.collection(db, 'tableaux'), fs.where('acces', 'array-contains', uid())));
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => millis(b.majLe) - millis(a.majLe));
      const mien = docs.find((d) => d.id === perso.id);
      if (mien) remplir(zoneMien, [mien], '', m, { supprimer: true });
      else zoneMien.replaceChildren(h('p', { class: 'sous-titre' }, 'Pas encore sauvegardé. « ☁ Sauvegarder » enregistre les 3 tableaux de la page.'));
      if (courant && !estMien()) {
        zoneMien.append(h('button', { type: 'button', class: 'petit secondaire', onclick: () => { m.fermer(); revenirAuMien(); } },
          mien ? 'Revenir au tableau de ' + perso.nom : 'Repartir d\'un tableau vide'));
      }
      // Seuls les tableaux partagés avec CE personnage (pas avec vos autres personnages).
      remplir(zonePartages, docs.filter((d) => d.id !== perso.id && invitation(d)),
        'Personne n\'a encore partagé de tableau avec ' + perso.nom + '.', m);
      // Enregistrements d'avant les personnages (rattachés au compte).
      const anciens = docs.filter((d) => d.proprietaire === uid() && !d.personnage);
      if (anciens.length) {
        zoneAnciens.append(h('h3', {}, 'Anciens enregistrements'),
          h('p', { class: 'sous-titre' }, 'Enregistrés avant que les tableaux soient tenus par les personnages. Ouvrez-en un puis « ☁ Sauvegarder » pour le reprendre dans le tableau de ' + perso.nom + ', ou supprimez-le.'));
        const liste = h('div');
        zoneAnciens.append(liste);
        remplir(liste, anciens, '', m, { supprimer: true });
      }
    }
    if (conteur()) {
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
      const sien = perso && d.id === perso.id;
      const inv = invitation(d);
      const droit = sien || (d.proprietaire === uid() && !d.personnage)
        ? (nbInvites(d) ? 'partagé avec ' + nbInvites(d) + ' personnage' + (nbInvites(d) > 1 ? 's' : '') : 'non partagé')
        : (inv ? (inv.droit === 'ecriture' ? 'modification' : 'lecture') : 'conteur');
      const affiche = courant && courant.id === d.id;
      return h('tr', {},
        h('td', {}, h('strong', {}, d.titre), h('br'), h('small', { class: 'sous-titre' }, (d.personnage ? 'de ' : 'compte de ') + (d.proprietaireNom || '?') + ' · ' + droit)),
        h('td', {}, h('small', {}, 'modifié le ' + dateFr(d.majLe, true), d.majParNom ? ' par ' + d.majParNom : '')),
        h('td', { style: 'white-space:nowrap' },
          affiche ? h('small', { class: 'sous-titre' }, 'affiché ')
            : h('button', { type: 'button', class: 'petit', onclick: () => { m.fermer(); ouvrir(d.id); } }, 'Ouvrir'),
          supprimer && (d.proprietaire === uid() || conteur()) ? h('button', {
            type: 'button', class: 'petit danger', onclick: async () => {
              if (!confirmer('Supprimer définitivement le tableau « ' + d.titre + ' » de ' + (d.proprietaireNom || '?') + ' ?')) return;
              try {
                await fs.deleteDoc(fs.doc(db, 'tableaux', d.id));
                if (courant && courant.id === d.id) detacher();
                m.fermer(); ouvrirPanneau();
              } catch (e) { alert(messageErreur(e)); }
            }
          }, 'Supprimer') : ''));
    })))));
}

async function ouvrir(id) {
  if (perso && modifie() && !confirmer('Le tableau affiché a des modifications non sauvegardées. Les abandonner ?')) return;
  majStatut('ouverture…');
  try {
    const snap = await fs.getDoc(fs.doc(db, 'tableaux', id));
    if (!snap.exists()) throw new Error('Tableau introuvable (il a peut-être été supprimé).');
    const d = snap.data();
    // Un tableau partagé avec un autre de vos personnages ne s'ouvre pas avec celui-ci.
    if (perso && !conteur() && id !== perso.id && d.personnage && !invitation(d)) {
      throw new Error('Ce tableau n\'est pas partagé avec ' + perso.nom + '.');
    }
    await afficher(id, d);
  } catch (e) {
    console.error(e);
    majStatut('ouverture impossible');
    alert('Impossible d\'ouvrir ce tableau : ' + messageErreur(e));
  }
}

async function afficher(id, d) {
  const contenu = await internaliser(JSON.parse(d.contenuJson || '{}'));
  T.charger(contenu.boards ? contenu : { version: 2, boards: [] });
  courant = {
    id, titre: d.titre, proprietaire: d.proprietaire, personnage: d.personnage || '', proprietaireNom: d.proprietaireNom,
    acces: d.acces, droits: d.droits, invites: d.invites || {}, version: d.version
  };
  reference = etatActuel();
  dernierJson = d.contenuJson;
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
    const snap = await fs.getDoc(fs.doc(db, 'tableaux', perso.id));
    if (snap.exists()) { await afficher(perso.id, snap.data()); return; }
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
    courant.acces = d.acces; courant.droits = d.droits; courant.invites = d.invites || {}; courant.titre = d.titre;
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
  const moiMeme = perso && d.majPerso === perso.id;
  const qui = moiMeme ? perso.nom + ' (depuis un autre appareil)' : (d.majParNom || 'Un autre personnage');
  majStatut('modifié par ' + (moiMeme ? 'un autre appareil' : (d.majParNom || 'un autre personnage')));
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
  if (!exigerIncarnation('Sauvegarder')) return false;
  if (enCours) return false;
  if ((estMien() || peutModifierCourant()) && !modifie()) {
    reussite(null);   // rien n'a changé depuis la dernière sauvegarde : aucune écriture
    return true;
  }
  if (peutModifierCourant()) return sauvegarderPartage();
  return sauvegarderMien();
}

/**
 * Enregistre le contenu affiché dans tableaux/{idPersonnage}, le seul tableau
 * en ligne du personnage. `partage` ({ acces, droits, invites, titre }) modifie aussi les invités.
 */
async function sauvegarderMien(partage = null, msg = null) {
  if (enCours) return false;
  enCours = true;
  majStatut('sauvegarde…');
  try {
    const ref = fs.doc(db, 'tableaux', perso.id);
    let existant = null;
    if (estMien()) {
      existant = courant;
    } else {
      const snap = await fs.getDoc(ref);
      existant = snap.exists() ? snap.data() : null;
      // Le tableau affiché n'est pas (encore) celui du personnage : prévenir avant de remplacer.
      const deQui = courant && courant.personnage && courant.id !== perso.id ? (courant.proprietaireNom || 'un autre personnage') : null;
      let question = null;
      if (existant && !partage) {
        question = perso.nom + ' n\'a qu\'un tableau en ligne : ' + (deQui ? 'le tableau de ' + deQui : 'le tableau affiché')
          + ' va remplacer « ' + existant.titre + ' », sauvegardé le ' + dateFr(existant.majLe, true) + '.\n\nContinuer ?';
      } else if (!existant && deQui) {
        question = 'Ce tableau appartient à ' + deQui + '. En faire une copie comme tableau de ' + perso.nom + ' ?';
      }
      if (question && !confirmer(question)) { majStatut(); return false; }
    }

    const etat = etatActuel();
    const json = (!existant || !estMien() || modifie()) ? await preparerContenu() : null;
    enEcriture = json;

    if (!existant) {
      const titre = (partage && partage.titre) || titreParDefaut();
      const p = partage || { acces: [uid()], droits: {}, invites: {} };
      await fs.setDoc(ref, {
        proprietaire: uid(), personnage: perso.id, proprietaireNom: perso.nom, titre,
        acces: p.acces, droits: p.droits, invites: p.invites,
        contenuJson: json, version: 1, creeLe: fs.serverTimestamp(), ...signature()
      });
      courant = { id: perso.id, titre, proprietaire: uid(), personnage: perso.id, proprietaireNom: perso.nom, acces: p.acces, droits: p.droits, invites: p.invites, version: 1 };
    } else {
      const champs = { ...signature(), proprietaireNom: perso.nom };
      if (json !== null) champs.contenuJson = json;
      if (partage) Object.assign(champs, partage);
      const r = await ecrireVersion(perso.id, champs, existant.version);
      if (typeof r === 'string') { enCours = false; return await apresConflit(r, perso.id); }
      courant = {
        id: perso.id, titre: champs.titre || existant.titre, proprietaire: uid(), personnage: perso.id, proprietaireNom: perso.nom,
        acces: champs.acces || existant.acces || [uid()], droits: champs.droits || existant.droits || {},
        invites: champs.invites || existant.invites || {}, version: r
      };
    }
    if (json !== null) dernierJson = json;
    reference = etat;
    T.charge = true;
    adresse(perso.id);
    suivre(perso.id);
    reussite(msg, partage ? 'Partage enregistré.' : 'Tableau sauvegardé.');
    return true;
  } catch (e) {
    echec(e, msg);
    return false;
  } finally { enCours = false; enEcriture = null; }
}

/** Sauvegarde dans le tableau d'un autre personnage qui nous a donné le droit de modification. */
async function sauvegarderPartage() {
  if (enCours) return false;
  enCours = true;
  majStatut('sauvegarde…');
  const id = courant.id;
  try {
    const etat = etatActuel();
    const json = await preparerContenu();
    enEcriture = json;
    const r = await ecrireVersion(id, { contenuJson: json, ...signature() }, courant.version);
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
  const choix = await choisirConflit(d, id !== perso.id);
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
    const moiMeme = d.majPerso === perso.id;
    const qui = moiMeme ? perso.nom + ' a' : (d.majParNom || 'Un autre personnage') + ' a';
    const m = modale('Conflit de sauvegarde',
      h('p', {}, qui + ' sauvegardé ce tableau le ' + dateFr(d.majLe, true) + (moiMeme ? ' depuis un autre appareil' : '') + ', après votre ouverture.'),
      h('div', { class: 'cam-actions' },
        chezUnAutre ? h('button', { type: 'button', onclick: () => choisir('copie') }, 'Garder ma version dans le tableau de ' + perso.nom) : '',
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
// Partager (avec d'autres personnages)
// ---------------------------------------------------------------------
async function partager() {
  if (!exigerIncarnation('Partager un tableau')) return;
  if (courant && !estMien() && courant.personnage) {
    const m = modale('Partager',
      h('p', {}, 'Vous consultez le tableau de ' + (courant.proprietaireNom || 'un autre personnage') + ' : seul son propriétaire peut le partager.'),
      h('div', { class: 'cam-actions' },
        h('button', { type: 'button', onclick: () => { m.fermer(); revenirAuMien(); } }, 'Revenir au tableau de ' + perso.nom),
        h('button', { type: 'button', class: 'secondaire', onclick: () => m.fermer() }, 'Fermer')));
    return;
  }

  // Partage actuel du tableau du personnage (s'il existe déjà en ligne).
  let actuel = estMien() ? courant : null;
  if (!actuel) {
    try {
      const snap = await fs.getDoc(fs.doc(db, 'tableaux', perso.id));
      if (snap.exists()) actuel = snap.data();
    } catch (e) { /* on part d'un partage vide */ }
  }

  const msg = h('div', { class: 'cam-msg' });
  const corps = h('tbody', {}, h('tr', {}, h('td', {}, 'Chargement de la liste des personnages…')));
  const filtre = h('input', { type: 'search', placeholder: 'Rechercher un personnage…' });
  const titre = h('input', { type: 'text', maxlength: 100, value: (actuel && actuel.titre) || titreParDefaut() });
  const lien = location.origin + location.pathname + '?tableau=' + perso.id;
  const enregistrerAussi = !estMien() || modifie();
  const m = modale('Partager le tableau de ' + perso.nom,
    h('p', { class: 'sous-titre' }, 'Les personnages choisis verront vos 3 tableaux dans « ☰ Ouvrir > Partagés avec… ». Les conteurs voient tous les tableaux.'),
    enregistrerAussi
      ? h('div', { class: 'cam-encart alerte' }, actuel
        ? 'Le tableau affiché sera sauvegardé en même temps et remplacera le tableau en ligne de ' + perso.nom + '.'
        : 'Le tableau sera sauvegardé en ligne en même temps.')
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
          catch (err) { prompt('Lien vers ce tableau :', lien); }
        }
      }, 'Copier le lien') : '',
      h('button', { type: 'button', class: 'secondaire', onclick: () => m.fermer() }, 'Annuler')),
    msg);

  // Personnages validés des autres membres (répertoire).
  const choix = new Map();
  let persos = [];
  try {
    const snap = await fs.getDocs(fs.collection(db, 'repertoire'));
    persos = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .filter((x) => x.proprietaire !== uid())
      .sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr'));
  } catch (e) { message(msg, messageErreur(e), 'err'); }
  const invitesActuels = (actuel && actuel.invites) || {};
  persos.forEach((x) => choix.set(x.id, (invitesActuels[x.id] && invitesActuels[x.id].droit) || ''));

  const dessiner = () => {
    const f = filtre.value.trim().toLowerCase();
    const liste = persos.filter((x) => !f || (x.nom || '').toLowerCase().includes(f));
    corps.replaceChildren(...(liste.length ? liste.map((x) => {
      const sel = h('select', {},
        h('option', { value: '', selected: !choix.get(x.id) }, 'Pas d\'accès'),
        h('option', { value: 'lecture', selected: choix.get(x.id) === 'lecture' }, 'Lecture'),
        h('option', { value: 'ecriture', selected: choix.get(x.id) === 'ecriture' }, 'Modification'));
      sel.addEventListener('change', () => choix.set(x.id, sel.value));
      return h('tr', {}, h('td', {}, x.nom), h('td', {}, sel));
    }) : [h('tr', {}, h('td', {}, persos.length ? 'Aucun personnage ne correspond.' : 'Aucun autre personnage validé pour le moment.'))]));
  };
  filtre.addEventListener('input', dessiner);
  dessiner();

  async function valider() {
    const invites = {};
    const droits = {};
    const acces = [uid()];
    choix.forEach((droit, id) => {
      if (!droit) return;
      const x = persos.find((p) => p.id === id);
      if (!x) return;
      invites[id] = { nom: x.nom, droit };
      // Les règles raisonnent par compte : le droit le plus fort parmi ses personnages invités.
      if (!acces.includes(x.proprietaire)) acces.push(x.proprietaire);
      if (droits[x.proprietaire] !== 'ecriture') droits[x.proprietaire] = droit;
    });
    if (Object.keys(invites).length > MAX_INVITES || acces.length > MAX_INVITES + 1) {
      message(msg, 'Maximum ' + MAX_INVITES + ' personnages par tableau.', 'err'); return;
    }
    const t = titre.value.trim().slice(0, 100) || titreParDefaut();
    const ok = await sauvegarderMien({ acces, droits, invites, titre: t }, msg);
    if (ok) {
      await notifierPartage(invitesActuels, invites, t);
      setTimeout(() => m.fermer(), 800);
    }
  }

  // Notifications : les personnages nouvellement invités voient le lien dans
  // leur page Notifications ; celles des personnages retirés sont supprimées.
  async function notifierPartage(avant, apres, titreTableau) {
    try {
      for (const id of Object.keys(apres).filter((x) => !avant[x])) {
        const x = persos.find((p) => p.id === id);
        if (!x) continue;
        await fs.addDoc(fs.collection(db, 'notifications'), {
          type: 'tableau', destinataire: x.proprietaire, auteur: uid(), auteurNom: perso.nom,
          personnage: id, personnageNom: apres[id].nom, tableau: perso.id, titre: titreTableau,
          droit: apres[id].droit, creeLe: fs.serverTimestamp()
        });
      }
      const retires = Object.keys(avant).filter((x) => !apres[x]);
      if (retires.length) {
        const snap = await fs.getDocs(fs.query(fs.collection(db, 'notifications'), fs.where('auteur', '==', uid())));
        for (const d of snap.docs) {
          const n = d.data();
          if (n.type === 'tableau' && n.tableau === perso.id && retires.includes(n.personnage)) await fs.deleteDoc(d.ref);
        }
      }
    } catch (e) { console.warn('Notifications de partage non envoyées', e); }
  }
}
