// Tableau d'enquête : enregistrement en ligne, ouverture, partage.
// S'appuie sur le pont window.TableauEnquete défini dans _pages/utils/tableau.md.
import {
  h, db, fs, surSession, estActif, estConteur, message, messageErreur, dateFr, millis, confirmer
} from '../core.js';
import { externaliser, internaliser } from '../images.js';

const T = window.TableauEnquete;
const LIMITE = 950000;
const btn = document.getElementById('btnCloud');
const statut = document.getElementById('cloudStatus');

let session = { user: null, profil: null };
let courant = null;       // { id, titre, proprietaire, proprietaireNom, acces, droits, version }
let reference = null;     // état du tableau au dernier chargement / enregistrement
let arretEcoute = null;
let enCours = false;
let premierPassage = true;
let confirmeJusqua = 0;   // affiche « ✓ » quelques secondes après un enregistrement

const uid = () => (session.user ? session.user.uid : null);
const peutEcrire = () => !!courant && (courant.proprietaire === uid() || (courant.droits || {})[uid()] === 'ecriture');
const estProprio = () => !!courant && courant.proprietaire === uid();
const etatActuel = () => JSON.stringify(T.exporter());
const modifie = () => reference !== null && etatActuel() !== reference;

// ---------------------------------------------------------------------
// Statut dans la barre d'outils
// ---------------------------------------------------------------------
function majStatut(texte) {
  if (!statut) return;
  statut.className = 'cloud-status';
  if (texte) { statut.textContent = texte; return; }
  if (!session.user) { statut.textContent = 'non connecté'; return; }
  if (!courant) { statut.textContent = 'non enregistré en ligne'; return; }
  statut.textContent = (Date.now() < confirmeJusqua ? '✓ ' : '☁ ') + courant.titre + (peutEcrire() ? '' : ' (lecture seule)');
  statut.title = 'Propriétaire : ' + (courant.proprietaireNom || '?');
  if (!peutEcrire()) statut.classList.add('lecture');
}

surSession((s) => {
  session = s;
  majStatut();
  if (!s.pret || !premierPassage) return;
  premierPassage = false;
  const id = new URLSearchParams(location.search).get('tableau');
  if (id) {
    if (estActif(s.profil)) ouvrir(id);
    else { T.charge = false; majStatut('connectez-vous pour ouvrir ce tableau'); }
  }
});

btn.addEventListener('click', () => ouvrirPanneau());
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    if (!estActif(session.profil)) { ouvrirPanneau(); return; }
    if (courant && peutEcrire()) enregistrer(); else ouvrirPanneau();
  }
});
window.addEventListener('beforeunload', (e) => {
  if (courant && peutEcrire() && modifie()) { e.preventDefault(); e.returnValue = ''; }
});

// ---------------------------------------------------------------------
// Fenêtre « En ligne »
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

async function ouvrirPanneau() {
  const { profil, user } = session;
  if (!user || !estActif(profil)) {
    modale('Enregistrement en ligne',
      h('p', {}, user
        ? 'Votre compte doit être activé par un conteur pour enregistrer des tableaux en ligne.'
        : 'Connectez-vous avec votre compte de membre pour enregistrer vos tableaux en ligne et les partager.'),
      h('p', { class: 'sous-titre' }, 'Sans connexion, l\'export / import JSON reste disponible.'),
      !user ? h('a', { class: 'cam-btn', href: '/connexion/?retour=' + encodeURIComponent(location.pathname + location.search) }, 'Se connecter') : '');
    return;
  }

  const msg = h('div', { class: 'cam-msg' });
  const titre = h('input', { type: 'text', maxlength: 100, value: courant ? courant.titre : 'Enquête du ' + new Date().toLocaleDateString('fr-FR'), disabled: !!courant && !peutEcrire() });
  const listeMiens = h('div', {}, h('p', { class: 'sous-titre' }, 'Chargement…'));
  const listePartages = h('div');
  const listeTous = h('div');
  const m = modale('Tableaux en ligne',
    courant
      ? h('div', { class: 'cam-encart' }, 'Tableau ouvert : ', h('strong', {}, courant.titre),
        ' — propriétaire : ' + (courant.proprietaireNom || '?'),
        peutEcrire() ? '' : ' (lecture seule : « Enregistrer comme nouveau » pour en faire une copie)')
      : h('p', { class: 'sous-titre' }, 'Le tableau affiché n\'est pas encore enregistré en ligne.'),
    h('label', {}, 'Titre'), titre,
    h('div', { class: 'cam-actions' },
      courant && peutEcrire() ? h('button', { type: 'button', onclick: async () => { if (await enregistrer(titre.value, msg)) m.fermer(); } }, 'Enregistrer') : '',
      h('button', { type: 'button', class: courant && peutEcrire() ? 'secondaire' : '', onclick: async () => { if (await enregistrerSous(titre.value, msg)) m.fermer(); } }, courant ? 'Enregistrer comme nouveau' : 'Enregistrer en ligne'),
      estProprio() ? h('button', { type: 'button', class: 'secondaire', onclick: () => { m.fermer(); partager(); } }, 'Partager…') : '',
      courant ? h('button', { type: 'button', class: 'secondaire', onclick: () => { detacher(); m.fermer(); } }, 'Ne plus suivre ce tableau') : ''),
    msg,
    h('h3', {}, 'Mes tableaux'), listeMiens,
    h('h3', {}, 'Partagés avec moi'), listePartages,
    estConteur(session.profil) ? [h('h3', {}, 'Tous les tableaux (conteurs)'), listeTous] : '');

  try {
    const snap = await fs.getDocs(fs.query(fs.collection(db, 'tableaux'), fs.where('acces', 'array-contains', uid())));
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => millis(b.majLe) - millis(a.majLe));
    remplir(listeMiens, docs.filter((d) => d.proprietaire === uid()), 'Aucun tableau enregistré.', m);
    remplir(listePartages, docs.filter((d) => d.proprietaire !== uid()), 'Personne ne vous a encore partagé de tableau.', m);
    if (estConteur(session.profil)) {
      const tous = await fs.getDocs(fs.collection(db, 'tableaux'));
      remplir(listeTous, tous.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => millis(b.majLe) - millis(a.majLe)), 'Aucun tableau.', m);
    }
  } catch (e) { message(msg, messageErreur(e), 'err'); }
}

function remplir(zone, docs, vide, m) {
  if (!docs.length) { zone.replaceChildren(h('p', { class: 'sous-titre' }, vide)); return; }
  zone.replaceChildren(h('div', { class: 'cam-table-defil' }, h('table', { class: 'cam-table' },
    h('tbody', {}, docs.map((d) => {
      const droit = d.proprietaire === uid() ? 'propriétaire' : ((d.droits || {})[uid()] === 'ecriture' ? 'modification' : 'lecture');
      return h('tr', {},
        h('td', {}, h('strong', {}, d.titre), h('br'), h('small', { class: 'sous-titre' }, 'par ' + (d.proprietaireNom || '?') + ' · ' + droit)),
        h('td', {}, h('small', {}, 'modifié le ' + dateFr(d.majLe, true), d.majParNom ? ' par ' + d.majParNom : '')),
        h('td', { style: 'white-space:nowrap' },
          h('button', { type: 'button', class: 'petit', onclick: () => { m.fermer(); ouvrir(d.id); } }, 'Ouvrir'),
          d.proprietaire === uid() ? h('button', {
            type: 'button', class: 'petit danger', onclick: async () => {
              if (!confirmer('Supprimer définitivement le tableau « ' + d.titre + ' » ?')) return;
              try {
                await fs.deleteDoc(fs.doc(db, 'tableaux', d.id));
                if (courant && courant.id === d.id) detacher();
                m.fermer(); ouvrirPanneau();
              } catch (e) { alert(messageErreur(e)); }
            }
          }, 'Supprimer') : ''));
    })))));
}

// ---------------------------------------------------------------------
// Ouvrir / enregistrer
// ---------------------------------------------------------------------
async function preparerContenu() {
  const donnees = await externaliser(T.exporter(), (n) => majStatut('envoi des images… (' + n + ')'));
  const json = JSON.stringify(donnees);
  if (json.length > LIMITE) {
    throw new Error('Tableau trop volumineux pour être enregistré (' + Math.round(json.length / 1024)
      + ' Ko de texte, maximum ' + Math.round(LIMITE / 1024) + ' Ko). Répartissez le contenu sur plusieurs tableaux en ligne.');
  }
  return json;
}

function suivre(id) {
  if (arretEcoute) arretEcoute();
  arretEcoute = fs.onSnapshot(fs.doc(db, 'tableaux', id), (snap) => {
    if (!courant || courant.id !== id) return;
    if (!snap.exists()) { majStatut('ce tableau a été supprimé'); courant = null; return; }
    const d = snap.data();
    courant.acces = d.acces; courant.droits = d.droits; courant.titre = d.titre;
    if (snap.metadata.hasPendingWrites) return;
    if (d.version > courant.version && d.majPar !== uid()) {
      bandeauMiseAJour(d);
    } else {
      majStatut();
    }
  }, () => { /* accès retiré */ majStatut('accès à ce tableau retiré'); });
}

function bandeauMiseAJour(d) {
  majStatut('modifié par ' + (d.majParNom || 'un autre joueur'));
  statut.classList.add('modifie');
  if (document.getElementById('cam-bandeau-maj')) return;
  const bandeau = h('div', {
    id: 'cam-bandeau-maj', class: 'cam-app',
    style: 'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:9500;background:#fff;color:#2b2b2b;border:1px solid #7a1f2b;border-radius:6px;padding:.6rem 1rem;box-shadow:0 4px 20px rgba(0,0,0,.5);font-family:system-ui,sans-serif;font-size:.85rem'
  },
  (d.majParNom || 'Un autre joueur') + ' vient de modifier ce tableau. ',
  h('button', { type: 'button', class: 'petit', onclick: () => { bandeau.remove(); ouvrir(courant.id, true); } }, 'Afficher sa version'),
  h('button', { type: 'button', class: 'petit secondaire', onclick: () => bandeau.remove() }, 'Plus tard'));
  document.body.append(bandeau);
}

async function ouvrir(id, forcer = false) {
  if (!forcer && courant && peutEcrire() && modifie()
    && !confirmer('Le tableau affiché a des modifications non enregistrées. Les abandonner ?')) return;
  majStatut('ouverture…');
  try {
    const snap = await fs.getDoc(fs.doc(db, 'tableaux', id));
    if (!snap.exists()) throw new Error('Tableau introuvable.');
    const d = snap.data();
    const contenu = await internaliser(JSON.parse(d.contenuJson || '{}'));
    T.charger(contenu.boards ? contenu : { version: 2, boards: [] });
    courant = { id, titre: d.titre, proprietaire: d.proprietaire, proprietaireNom: d.proprietaireNom, acces: d.acces, droits: d.droits, version: d.version };
    reference = etatActuel();
    const url = new URL(location.href); url.searchParams.set('tableau', id);
    history.replaceState(null, '', url);
    document.getElementById('cam-bandeau-maj')?.remove();
    suivre(id);
    majStatut();
  } catch (e) {
    console.error(e);
    majStatut('ouverture impossible');
    alert('Impossible d\'ouvrir ce tableau : ' + messageErreur(e));
  }
}

async function enregistrer(titre, msg) {
  if (enCours) return false;
  if (!courant) return enregistrerSous(titre, msg);
  enCours = true;
  majStatut('enregistrement…');
  try {
    const json = await preparerContenu();
    const nouveauTitre = (titre || courant.titre || 'Enquête').trim().slice(0, 100) || 'Enquête';
    const etat = etatActuel();
    try {
      await ecrire(json, nouveauTitre, courant.version + 1);
    } catch (e) {
      if (e.code !== 'permission-denied') throw e;
      // Refus : soit quelqu'un a enregistré entre-temps (version dépassée), soit le droit a été retiré.
      const snap = await fs.getDoc(fs.doc(db, 'tableaux', courant.id));
      const d = snap.exists() ? snap.data() : null;
      if (!d || !(d.acces || []).includes(uid())) throw new Error('Vous n\'avez plus accès à ce tableau.');
      if (d.version !== courant.version) {
        const choix = await choisirConflit(d);
        if (choix === 'ecraser') await ecrire(json, nouveauTitre, d.version + 1);
        else if (choix === 'recharger') { enCours = false; await ouvrir(courant.id, true); return false; }
        else if (choix === 'copie') { enCours = false; return enregistrerSous(nouveauTitre + ' (ma version)', msg); }
        else { majStatut(); return false; }
      } else {
        throw new Error('Vous n\'avez pas le droit de modifier ce tableau.');
      }
    }
    reference = etat;
    confirmeJusqua = Date.now() + 2500;
    majStatut();
    setTimeout(() => majStatut(), 2600);
    if (msg) message(msg, 'Enregistré.', 'ok');
    return true;
  } catch (e) {
    console.error(e);
    majStatut('échec de l\'enregistrement');
    if (msg) message(msg, messageErreur(e), 'err'); else alert(messageErreur(e));
    return false;
  } finally { enCours = false; }
}

async function ecrire(json, titre, version) {
  await fs.updateDoc(fs.doc(db, 'tableaux', courant.id), {
    contenuJson: json, titre, version, majLe: fs.serverTimestamp(),
    majPar: uid(), majParNom: session.profil.nom
  });
  courant.version = version;
  courant.titre = titre;
}

function choisirConflit(d) {
  return new Promise((resolve) => {
    let fait = false;
    const choisir = (c) => { if (fait) return; fait = true; m.fermer(); resolve(c); };
    const m = modale('Conflit d\'enregistrement',
      h('p', {}, (d.majParNom || 'Un autre joueur') + ' a enregistré ce tableau le ' + dateFr(d.majLe, true) + ', après votre ouverture.'),
      h('div', { class: 'cam-actions' },
        h('button', { type: 'button', onclick: () => choisir('copie') }, 'Garder les deux (ma version en copie)'),
        h('button', { type: 'button', class: 'secondaire', onclick: () => choisir('recharger') }, 'Afficher sa version (perdre la mienne)'),
        h('button', { type: 'button', class: 'danger', onclick: () => choisir('ecraser') }, 'Écraser avec ma version')));
    const obs = new MutationObserver(() => { if (!m.fond.isConnected) { obs.disconnect(); choisir('annuler'); } });
    obs.observe(document.body, { childList: true });
  });
}

async function enregistrerSous(titre, msg) {
  if (enCours) return false;
  enCours = true;
  majStatut('enregistrement…');
  try {
    const json = await preparerContenu();
    const t = (titre || 'Enquête').trim().slice(0, 100) || 'Enquête';
    const etat = etatActuel();
    const ref = await fs.addDoc(fs.collection(db, 'tableaux'), {
      proprietaire: uid(), proprietaireNom: session.profil.nom, titre: t,
      acces: [uid()], droits: {}, contenuJson: json, version: 1,
      creeLe: fs.serverTimestamp(), majLe: fs.serverTimestamp(), majPar: uid(), majParNom: session.profil.nom
    });
    courant = { id: ref.id, titre: t, proprietaire: uid(), proprietaireNom: session.profil.nom, acces: [uid()], droits: {}, version: 1 };
    reference = etat;
    T.charge = true;
    const url = new URL(location.href); url.searchParams.set('tableau', ref.id);
    history.replaceState(null, '', url);
    suivre(ref.id);
    majStatut();
    if (msg) message(msg, 'Tableau enregistré en ligne.', 'ok');
    return true;
  } catch (e) {
    console.error(e);
    majStatut('échec de l\'enregistrement');
    if (msg) message(msg, messageErreur(e), 'err'); else alert(messageErreur(e));
    return false;
  } finally { enCours = false; }
}

function detacher() {
  if (arretEcoute) { arretEcoute(); arretEcoute = null; }
  courant = null; reference = null;
  const url = new URL(location.href); url.searchParams.delete('tableau');
  history.replaceState(null, '', url);
  majStatut();
}

// ---------------------------------------------------------------------
// Partage
// ---------------------------------------------------------------------
async function partager() {
  const msg = h('div', { class: 'cam-msg' });
  const corps = h('tbody', {}, h('tr', {}, h('td', {}, 'Chargement…')));
  const filtre = h('input', { type: 'search', placeholder: 'Rechercher un membre…' });
  const m = modale('Partager « ' + courant.titre + ' »',
    h('p', { class: 'sous-titre' }, 'Les conteurs voient tous les tableaux. Choisissez ici les joueurs qui peuvent le consulter ou le modifier.'),
    filtre,
    h('div', { class: 'cam-table-defil', style: 'max-height:50vh;overflow-y:auto' }, h('table', { class: 'cam-table' }, corps)),
    h('div', { class: 'cam-actions' },
      h('button', { type: 'button', onclick: () => valider() }, 'Enregistrer le partage'),
      h('button', { type: 'button', class: 'secondaire', onclick: () => m.fermer() }, 'Annuler')),
    msg);

  const choix = new Map();
  let membres = [];
  try {
    const snap = await fs.getDocs(fs.collection(db, 'annuaire'));
    membres = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((x) => x.id !== uid())
      .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
    membres.forEach((x) => choix.set(x.id, (courant.droits || {})[x.id] || ((courant.acces || []).includes(x.id) ? 'lecture' : '')));
  } catch (e) { message(msg, messageErreur(e), 'err'); }

  const dessiner = () => {
    const f = filtre.value.trim().toLowerCase();
    const liste = membres.filter((x) => !f || (x.nom || '').toLowerCase().includes(f));
    corps.replaceChildren(...(liste.length ? liste.map((x) => {
      const sel = h('select', {},
        h('option', { value: '', selected: !choix.get(x.id) }, 'Pas d\'accès'),
        h('option', { value: 'lecture', selected: choix.get(x.id) === 'lecture' }, 'Lecture'),
        h('option', { value: 'ecriture', selected: choix.get(x.id) === 'ecriture' }, 'Modification'));
      sel.addEventListener('change', () => choix.set(x.id, sel.value));
      return h('tr', {}, h('td', {}, x.nom, x.role !== 'joueur' ? h('span', { class: 'cam-tag ' + x.role, style: 'margin-left:.4rem' }, x.role) : ''), h('td', {}, sel));
    }) : [h('tr', {}, h('td', {}, 'Aucun membre.'))]));
  };
  filtre.addEventListener('input', dessiner);
  dessiner();

  async function valider() {
    const acces = [uid()];
    const droits = {};
    choix.forEach((v, id) => { if (v) { acces.push(id); droits[id] = v; } });
    if (acces.length > 40) { message(msg, 'Maximum 39 personnes par tableau.', 'err'); return; }
    try {
      const version = courant.version + 1;
      await fs.updateDoc(fs.doc(db, 'tableaux', courant.id), {
        acces, droits, version, majLe: fs.serverTimestamp(), majPar: uid(), majParNom: session.profil.nom
      });
      courant.version = version; courant.acces = acces; courant.droits = droits;
      message(msg, 'Partage enregistré.', 'ok');
      setTimeout(() => m.fermer(), 800);
    } catch (e) {
      message(msg, e.code === 'permission-denied' ? 'Le tableau a été modifié entre-temps : rouvrez-le puis recommencez.' : messageErreur(e), 'err');
    }
  }
}
