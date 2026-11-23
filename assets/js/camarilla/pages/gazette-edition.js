// =====================================================================
// Gazette « Le Gratin Dauphinois » — éditeur des conteurs
// Page /membres/gazette/edition/ (conteurs et admins).
//
// Mise en page : la page est découpée en rangées, chaque rangée en
// colonnes (motifs sur 12) ; chaque colonne empile des articles. Les
// articles se déplacent par glisser-déposer ou avec les flèches ; ceux qui
// ne sont placés nulle part restent « en réserve ».
//
// On écrit au choix dans le panneau de gauche ou directement dans la page
// (titres, chapeau, texte, légende, bandeau : voir gazette/edition-en-place.js) ;
// les deux restent synchronisés.
//
// Sauvegardes (économes en Firestore) :
//   - « Sauvegarde locale » (et automatique) : dans ce navigateur, sans
//     aucune lecture ni écriture en ligne ;
//   - « Sauvegarder sur le site » : 2 écritures (document léger + contenu),
//     visible des autres conteurs ; des joueurs seulement si publié ;
//   - « Publier… » : ouvre la prévisualisation, à valider avant publication.
// Deux conteurs sur le même numéro : chaque sauvegarde incrémente une
// version ; les règles refusent d'écraser une version qu'on n'a pas vue.
// =====================================================================
import { h, db, fs, surSession, estConteur, estAdmin, messageErreur, moisCourant, telecharger, millis } from '../core.js';
import {
  MOTIFS, STYLES, POSITIONS_IMAGE, TAILLES_IMAGE, STATUTS, MAX_PAGES, MAX_RANGEES, MAX_ARTICLES,
  normaliserGazette, gazetteNeuve, nouvelArticle, nouvelleRangee, changerMotif, nouvelId,
  enReserve, position, retirerDesColonnes, urlImageValide, nomMois, moisValide, moisVoisin
} from '../gazette/modele.js';
import { rendreGazette, rendreArticle, rendreBandeau, rendreEnTete, preparerImpression, pagesQuiDebordent } from '../gazette/rendu.js';
import { rendreModifiable, barreFormat } from '../gazette/edition-en-place.js';
import {
  listerGazettes, lireContenu, enregistrerGazette, supprimerGazette, refGazette, lirePenseBete, marquerSujet,
  lireBrouillon, ecrireBrouillon, oublierBrouillon
} from '../gazette/stockage.js';

const $ = (id) => document.getElementById(id);
const heure = (ms) => new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const jourHeure = (ms) => new Date(ms).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// ---------------------------------------------------------------------
// État
// ---------------------------------------------------------------------
let session = null;
let liste = [];             // documents légers (tous les numéros)
let mois = '';              // numéro ouvert
let g = null;               // { donnees, numero, statut, version, publieeLe, enLigne, majLe, majParNom }
let modifie = false;        // modifications pas encore envoyées sur le site
let localLe = 0;            // dernière sauvegarde dans le navigateur
let choisi = null;          // article sélectionné
let onglet = 'article';
const penseBete = {};       // mois -> sujets (lus une fois par mois et par visite)
let moisPenseBete = '';

// ---------------------------------------------------------------------
// Petites fenêtres
// ---------------------------------------------------------------------
function fenetre(titre, contenu, boutons) {
  return new Promise((resoudre) => {
    const fermer = (v) => { fond.remove(); document.removeEventListener('keydown', echap, true); resoudre(v); };
    const echap = (e) => { if (e.key === 'Escape') { e.stopPropagation(); fermer(null); } };
    const fond = h('div', { class: 'gze-fenetre-fond' },
      h('div', { class: 'gze-fenetre', role: 'dialog', 'aria-label': titre },
        h('h2', {}, titre), contenu,
        h('div', { class: 'gze-fenetre-boutons' }, boutons.map(([texte, valeur, classe]) =>
          h('button', { type: 'button', class: 'gze-btn ' + (classe || ''), onclick: () => fermer(typeof valeur === 'function' ? valeur() : valeur) }, texte)))));
    document.addEventListener('keydown', echap, true);
    document.body.append(fond);
    const premier = fond.querySelector('input, select, textarea, .principal');
    if (premier) premier.focus();
  });
}
function etat(texte, type = 'info') {
  const el = $('etatSauvegarde');
  el.className = 'gze-etat ' + type;
  el.textContent = texte;
}
function majEtat() {
  const b = $('badgeStatut');
  b.textContent = (STATUTS[g.statut] || g.statut) + (modifie ? ' · modifié' : '');
  b.className = 'gze-badge ' + g.statut + (modifie ? ' modifie' : '');
  b.title = modifie ? 'Modifications pas encore enregistrées sur le site (elles sont gardées dans ce navigateur).' : '';
  const morceaux = [];
  if (localLe) morceaux.push('Navigateur : ' + heure(localLe));
  if (g.enLigne) morceaux.push('Site : ' + (g.majLe ? jourHeure(g.majLe) : '—') + (g.majParNom ? ' (' + g.majParNom + ')' : ''));
  else morceaux.push('Pas encore enregistré sur le site');
  if (!$('etatSauvegarde').dataset.fige) etat(morceaux.join(' · '), modifie ? 'attente' : 'ok');
  $('btnPublier').textContent = g.statut === 'publiee' ? '↩ Retirer la publication' : '📰 Publier…';
  $('btnPublier').classList.toggle('principal', g.statut !== 'publiee');
  $('nReserve').textContent = String(enReserve(g.donnees).length);
}
function annonce(texte, type = 'ok') {
  const el = $('etatSauvegarde');
  el.dataset.fige = '1';
  etat(texte, type);
  clearTimeout(annonce.minuteur);
  annonce.minuteur = setTimeout(() => { delete el.dataset.fige; majEtat(); }, 5000);
}

// ---------------------------------------------------------------------
// Sauvegardes
// ---------------------------------------------------------------------
let minuteurLocal = null;
function brouillonActuel() {
  return { donnees: g.donnees, numero: g.numero, baseVersion: g.version, modifie };
}
function sauverLocal({ annoncer = false } = {}) {
  clearTimeout(minuteurLocal);
  if (!g) return;
  if (ecrireBrouillon(session.user.uid, mois, brouillonActuel())) {
    localLe = Date.now();
    if (annoncer) annonce('Enregistré dans ce navigateur à ' + heure(localLe) + ' (rien n\'a été envoyé en ligne).');
  } else if (annoncer) annonce('Ce navigateur refuse d\'enregistrer (navigation privée ou mémoire pleine).', 'err');
  majEtat();
}
/** Après chaque modification : sauvegarde locale automatique, et redessin. */
function changer({ plan = true } = {}) {
  modifie = true;
  clearTimeout(minuteurLocal);
  minuteurLocal = setTimeout(() => sauverLocal(), 700);
  if (plan) dessinerPlan();
  majEtat();
}

async function sauverSurSite({ statut = g.statut, publier = false, forcer = false } = {}) {
  if (!forcer && !publier && statut === 'publiee' && g.statut === 'publiee'
    && !window.confirm('Ce numéro est publié : les joueurs verront tout de suite vos modifications. Enregistrer ?')) return false;
  const version = g.version + 1;
  etat('Enregistrement sur le site…', 'attente');
  try {
    await enregistrerGazette({ mois, numero: g.numero, donnees: g.donnees, statut, version, publieeLe: g.publieeLe, publier, session });
  } catch (e) {
    if (e.code !== 'permission-denied') { annonce('Enregistrement impossible : ' + messageErreur(e), 'err'); return false; }
    // Refus : un autre conteur a-t-il enregistré entre-temps ? (1 lecture)
    let autre = null;
    try { const s = await fs.getDoc(refGazette(mois)); autre = s.exists() ? s.data() : null; } catch (e2) { /* ignore */ }
    if (autre && autre.version !== g.version) {
      const choix = await fenetre('Un autre conteur a enregistré ce numéro',
        h('p', {}, (autre.majParNom || 'Quelqu\'un') + ' l\'a enregistré ' + (autre.majLe ? 'le ' + jourHeure(millis(autre.majLe)) : '') +
          ' pendant que vous le modifiiez. Votre version reste gardée dans ce navigateur.'),
        [['Annuler', null], ['Charger sa version (perdre les miennes)', 'site'], ['Remplacer par ma version', 'ecraser', 'danger']]);
      if (choix === 'ecraser') {
        g.version = autre.version; g.publieeLe = autre.publieeLe || null;
        return sauverSurSite({ statut, publier, forcer: true });
      }
      if (choix === 'site') { oublierBrouillon(session.user.uid, mois); liste = await listerGazettes(); await ouvrir(mois); }
      majEtat();
      return false;
    }
    annonce('Enregistrement refusé par le site : ' + messageErreur(e), 'err');
    return false;
  }
  g.version = version; g.statut = statut; g.enLigne = true; g.majLe = Date.now(); g.majParNom = session.profil.nom;
  if (publier) {
    // Date de publication fixée par le serveur : relue une fois (1 lecture), pour les sauvegardes suivantes
    try { const s = await fs.getDoc(refGazette(mois)); if (s.exists()) g.publieeLe = s.data().publieeLe || null; } catch (e) { /* ignore */ }
  }
  modifie = false;
  sauverLocal();
  const leger = { id: mois, mois, numero: g.numero, statut, version, majParNom: g.majParNom, majLe: fs.Timestamp ? fs.Timestamp.now() : null, publieeLe: g.publieeLe };
  liste = [leger, ...liste.filter((x) => x.mois !== mois)].sort((a, b) => b.mois.localeCompare(a.mois));
  remplirChoixMois();
  majEtat();
  annonce(publier ? 'Numéro publié : les joueurs le trouvent dans la gazette.'
    : statut === 'publiee' ? 'Enregistré sur le site (numéro publié, mis à jour pour les joueurs).'
      : 'Enregistré sur le site à ' + heure(Date.now()) + ' (brouillon, invisible des joueurs).');
  return true;
}

// ---------------------------------------------------------------------
// Ouverture d'un numéro
// ---------------------------------------------------------------------
function remplirChoixMois() {
  const sel = $('choixMois');
  const tous = [...liste.map((x) => x.mois)];
  if (mois && !tous.includes(mois)) tous.push(mois);
  tous.sort((a, b) => b.localeCompare(a));
  sel.replaceChildren(...tous.map((m) => {
    const x = liste.find((y) => y.mois === m);
    const libelle = 'N° ' + (x ? x.numero : (g && m === mois ? g.numero : '?')) + ' — ' + nomMois(m) + (x ? (x.statut === 'publiee' ? ' · publié' : ' · brouillon') : ' · pas encore enregistré');
    return h('option', { value: m, selected: m === mois }, libelle);
  }));
}
const numeroSuivant = () => Math.max(0, ...liste.map((x) => x.numero || 0)) + 1;

async function ouvrir(m) {
  if (g && modifie) sauverLocal();
  mois = m;
  history.replaceState(null, '', '#' + m);
  const enLigne = liste.find((x) => x.mois === m) || null;
  const local = lireBrouillon(session.user.uid, m);
  let donnees = null, numero = null, depuisLocal = false, version = enLigne ? enLigne.version : 0;
  modifie = false;
  if (enLigne && local && local.baseVersion === enLigne.version) {
    donnees = local.donnees; numero = local.numero; depuisLocal = true; modifie = !!local.modifie;
  } else if (enLigne && local && local.modifie) {
    const choix = await fenetre('Deux versions de ce numéro',
      h('div', {},
        h('p', {}, 'Le site a une version plus récente (enregistrée par ' + (enLigne.majParNom || '?') + (enLigne.majLe ? ' le ' + jourHeure(millis(enLigne.majLe)) : '') + ').'),
        h('p', {}, 'Ce navigateur garde aussi vos modifications non envoyées (du ' + jourHeure(local.sauveLe) + ').'),
        h('p', {}, 'Si vous gardez les vôtres, votre prochaine sauvegarde sur le site remplacera la sienne.')),
      [['Prendre la version du site (perdre les miennes)', 'site'], ['Garder mes modifications', 'local', 'principal']]);
    // Échap ou fermeture : on ne jette rien
    if (choix !== 'site') { donnees = local.donnees; numero = local.numero; depuisLocal = true; modifie = true; }
  } else if (!enLigne && local) {
    donnees = local.donnees; numero = local.numero; depuisLocal = true; modifie = !!local.modifie;
  }
  if (!donnees && enLigne) {
    etat('Chargement du numéro…', 'attente');
    donnees = await lireContenu(m);   // 1 lecture
    numero = enLigne.numero;
  }
  g = {
    donnees: normaliserGazette(donnees || gazetteNeuve()),
    numero: numero || (enLigne ? enLigne.numero : numeroSuivant()),
    statut: enLigne ? enLigne.statut : 'brouillon', version,
    publieeLe: enLigne ? enLigne.publieeLe || null : null, enLigne: !!enLigne,
    majLe: enLigne && enLigne.majLe ? millis(enLigne.majLe) : 0, majParNom: enLigne ? enLigne.majParNom : ''
  };
  localLe = local && depuisLocal ? local.sauveLe : 0;
  if (!depuisLocal || !local) sauverLocal();
  choisi = null; moisPenseBete = m;
  remplirChoixMois();
  dessinerPlan();
  dessinerPanneau();
  majEtat();
  if (depuisLocal && modifie) annonce('Brouillon de ce navigateur repris (modifié le ' + jourHeure(local.sauveLe) + ', pas encore envoyé sur le site).', 'attente');
}

async function nouveauNumero() {
  let propose = moisVoisin(liste.length ? liste[0].mois : moisCourant(), liste.length ? 1 : 0);
  while (liste.some((x) => x.mois === propose)) propose = moisVoisin(propose, 1);
  const champ = h('input', { type: 'month', value: propose, required: true });
  const erreur = h('p', { class: 'cam-msg err' });
  const m = await fenetre('Nouveau numéro',
    h('div', {}, h('p', {}, 'Un numéro par mois. Mois de ce numéro :'), champ, erreur),
    [['Annuler', null], ['Créer', () => champ.value, 'principal']]);
  if (!m) return;
  if (!moisValide(m)) { annonce('Mois invalide.', 'err'); return; }
  if (liste.some((x) => x.mois === m)) { annonce('Le numéro de ' + nomMois(m) + ' existe déjà : il est ouvert.', 'attente'); }
  await ouvrir(m);
}

// ---------------------------------------------------------------------
// Opérations sur la mise en page
// ---------------------------------------------------------------------
const d = () => g.donnees;
function trouverRangee(id) {
  for (const page of d().pages) { const i = page.rangees.findIndex((r) => r.id === id); if (i >= 0) return { page, rangee: page.rangees[i], i }; }
  return null;
}
function trouverColonne(id) {
  for (const page of d().pages) for (const rangee of page.rangees) { const colonne = rangee.colonnes.find((c) => c.id === id); if (colonne) return { page, rangee, colonne }; }
  return null;
}
function deplacerArticle(id, colonne, index) {
  const p = position(d(), id);
  if (p) {
    p.colonne.articles.splice(p.index, 1);
    if (p.colonne === colonne && p.index < index) index -= 1;
  }
  colonne.articles.splice(Math.max(0, Math.min(index, colonne.articles.length)), 0, id);
}
function ajouterArticle(colonne, props = {}) {
  if (Object.keys(d().articles).length >= MAX_ARTICLES) { annonce('Trop d\'articles dans ce numéro (' + MAX_ARTICLES + ' au plus).', 'err'); return null; }
  const a = nouvelArticle({ titre: 'Titre de l\'article', ...props });
  d().articles[a.id] = a;
  if (colonne) colonne.articles.push(a.id);
  return a;
}
function supprimerArticle(id) {
  const a = d().articles[id];
  if (!a) return;
  if ((a.texte.trim() || a.chapeau.trim()) && !window.confirm('Supprimer définitivement l\'article « ' + (a.titre || 'sans titre') + ' » ?')) return;
  retirerDesColonnes(d(), id);
  delete d().articles[id];
  if (choisi === id) choisi = null;
  changer();
  dessinerPanneau();
}
function choisirArticle(id, { ouvrirOnglet = true } = {}) {
  const deja = choisi === id && onglet === 'article';
  choisi = id;
  if (ouvrirOnglet) onglet = 'article';
  document.querySelectorAll('#plan .gze-choisi').forEach((el) => el.classList.remove('gze-choisi'));
  const el = document.querySelector('#plan [data-article="' + CSS.escape(id) + '"]');
  if (el) el.classList.add('gze-choisi');
  if (!deja) dessinerPanneau();   // (re)cliquer dans l'article déjà ouvert ne refait pas le panneau
}
function libelleColonne(page, rangee, colonne) {
  const ip = d().pages.indexOf(page) + 1, ir = page.rangees.indexOf(rangee) + 1, ic = rangee.colonnes.indexOf(colonne) + 1;
  return 'Page ' + ip + ' · rangée ' + ir + ' · colonne ' + ic + ' (' + MOTIFS[rangee.motif][ic - 1] + '/12)';
}
function toutesColonnes() {
  return d().pages.flatMap((page) => page.rangees.flatMap((rangee) => rangee.colonnes.map((colonne) => ({ page, rangee, colonne }))));
}

// Petit dessin d'un motif (largeurs proportionnelles)
const dessinMotif = (motif) => h('span', { class: 'gze-motif', 'aria-hidden': 'true' }, MOTIFS[motif].map((l) => h('span', { style: 'flex:' + l })));
function choixMotif(actuel, surChoix) {
  return h('div', { class: 'gze-motifs', role: 'group', 'aria-label': 'Découpage en colonnes' },
    Object.keys(MOTIFS).map((m) => h('button', {
      type: 'button', class: 'gze-motif-btn' + (m === actuel ? ' actif' : ''), title: MOTIFS[m].length + ' colonne(s) : ' + MOTIFS[m].join(' + ') + ' (sur 12)',
      onclick: (e) => { e.stopPropagation(); surChoix(m); }
    }, dessinMotif(m))));
}

// ---------------------------------------------------------------------
// Plan (rendu de la gazette + outils d'édition)
// ---------------------------------------------------------------------
let glisse = null;   // id de l'article en cours de glisser-déposer
const format = barreFormat();   // barre G / I / intertitre… au-dessus de la zone en cours d'écriture
function dessinerPlan() {
  const defilement = $('plan').scrollTop;
  format.cacher();
  const journal = rendreGazette(d(), { mois, numero: g.numero }, { edition: true });
  decorer(journal);
  $('plan').replaceChildren(journal,
    d().pages.length < MAX_PAGES ? h('button', { type: 'button', class: 'gze-btn gze-ajout-page', onclick: () => {
      d().pages.push({ id: nouvelId('p'), rangees: [nouvelleRangee('4-4-4')] }); changer();
    } }, '＋ Ajouter une page') : '',
    format.el);
  $('plan').scrollTop = defilement;
}

// ---------------------------------------------------------------------
// Écriture directe dans la page
// ---------------------------------------------------------------------
/** Recopie dans le panneau de gauche ce qui vient d'être écrit dans la page. */
function synchroniserChamp(champ, valeur) {
  const el = $('panneau').querySelector('[data-champ="' + CSS.escape(champ) + '"]');
  if (el && el !== document.activeElement) el.value = valeur;
}
function saisieArticle(id, champ, valeur) {
  const a = d().articles[id];
  if (!a) return;
  if (champ.startsWith('image.')) a.image[champ.slice(6)] = valeur; else a[champ] = valeur;
  if (choisi === id && onglet === 'article') synchroniserChamp(champ, valeur);
  changer({ plan: false });
}
const MODELE_TITRE = /^Titre (de la une|de l'article)$/;
// Entrée dans un paragraphe recopie ses classes : la lettrine ne doit rester qu'au premier.
function reparerLettrine(z, lettrine) {
  z.querySelectorAll(':scope > .gz-lettrine').forEach((el) => el.classList.remove('gz-lettrine'));
  const premier = [...z.children].find((el) => el.tagName !== 'FIGURE');
  if (lettrine && premier && premier.tagName === 'P') premier.classList.add('gz-lettrine');
}

function decorerBandeau(bEl) {
  if (!bEl) return;
  const versReglages = () => { if (onglet !== 'reglages') { onglet = 'reglages'; dessinerPanneau(); } };
  bEl.querySelectorAll('[data-champ]').forEach((z) => {
    const cle = z.dataset.champ.replace(/^bandeau\./, '');
    rendreModifiable(z, {
      entree: versReglages,
      saisie: (v) => { d().bandeau[cle] = v; synchroniserChamp(z.dataset.champ, v); changer({ plan: false }); }
    });
  });
  bEl.addEventListener('click', (e) => { if (!e.target.closest('[data-champ]')) versReglages(); });
  bEl.addEventListener('focusout', (e) => { if (!bEl.contains(e.relatedTarget)) rafraichirBandeau(); });
}
/** Redessine le bandeau et les en-têtes des pages (titre, date) une fois sorti du bandeau. */
function rafraichirBandeau() {
  setTimeout(() => {
    const ancien = document.querySelector('#plan .gz-bandeau');
    if (!ancien || ancien.contains(document.activeElement)) return;
    const meta = { mois, numero: g.numero };
    const nouveau = rendreBandeau(d().bandeau, meta, { edition: true });
    decorerBandeau(nouveau);
    ancien.replaceWith(nouveau);
    document.querySelectorAll('#plan .gz-entete').forEach((el, i) => el.replaceWith(rendreEnTete(d().bandeau, meta, i + 1)));
  }, 150);
}

function decorer(journal) {
  const pages = d().pages;
  journal.querySelectorAll('.gz-page').forEach((pageEl, ip) => {
    const page = pages[ip];
    // Outils de la page
    pageEl.before(h('div', { class: 'gze-outils-page' },
      h('strong', {}, 'Page ' + (ip + 1)),
      h('span', { class: 'gze-espace' }),
      ip > 0 ? h('button', { type: 'button', class: 'gze-mini', title: 'Monter la page', onclick: () => { pages.splice(ip - 1, 0, pages.splice(ip, 1)[0]); changer(); } }, '↑') : '',
      ip < pages.length - 1 ? h('button', { type: 'button', class: 'gze-mini', title: 'Descendre la page', onclick: () => { pages.splice(ip + 1, 0, pages.splice(ip, 1)[0]); changer(); } }, '↓') : '',
      pages.length > 1 ? h('button', { type: 'button', class: 'gze-mini danger', title: 'Supprimer la page (ses articles passent en réserve)', onclick: () => {
        if (!window.confirm('Supprimer la page ' + (ip + 1) + ' ? Ses articles passent en réserve.')) return;
        pages.splice(ip, 1); changer(); dessinerPanneau();
      } }, '🗑') : ''));
    // Ajouter une rangée en bas de la page
    if (page.rangees.length < MAX_RANGEES) {
      pageEl.append(h('div', { class: 'gze-ajout-rangee' },
        h('span', {}, '＋ Ajouter une rangée :'),
        choixMotif(null, (m) => { page.rangees.push(nouvelleRangee(m)); changer(); })));
    }
    // Rangées
    pageEl.querySelectorAll('.gz-rangee').forEach((rEl) => {
      const t = trouverRangee(rEl.dataset.rangee);
      if (!t) return;
      const { rangee, i } = t;
      rEl.prepend(h('div', { class: 'gze-outils-rangee' },
        choixMotif(rangee.motif, (m) => { changerMotif(rangee, m); changer(); }),
        h('label', { class: 'gze-case', title: 'Filet (trait) sous la rangée' },
          h('input', { type: 'checkbox', checked: rangee.filet, onchange: (e) => { rangee.filet = e.target.checked; changer(); } }), 'filet'),
        i > 0 ? h('button', { type: 'button', class: 'gze-mini', title: 'Monter la rangée', onclick: () => { page.rangees.splice(i - 1, 0, page.rangees.splice(i, 1)[0]); changer(); } }, '↑') : '',
        i < page.rangees.length - 1 ? h('button', { type: 'button', class: 'gze-mini', title: 'Descendre la rangée', onclick: () => { page.rangees.splice(i + 1, 0, page.rangees.splice(i, 1)[0]); changer(); } }, '↓') : '',
        h('button', { type: 'button', class: 'gze-mini danger', title: 'Supprimer la rangée (ses articles passent en réserve)', onclick: () => {
          page.rangees.splice(i, 1); changer(); dessinerPanneau();
        } }, '🗑')));
    });
    // Colonnes : ajout d'article, dépôt
    pageEl.querySelectorAll('.gz-col').forEach((cEl) => {
      const t = trouverColonne(cEl.dataset.colonne);
      if (!t) return;
      const { colonne } = t;
      const reserve = enReserve(d());
      cEl.append(h('div', { class: 'gze-ajout-article' },
        h('button', { type: 'button', class: 'gze-mini', title: 'Nouvel article dans cette colonne', onclick: () => {
          const a = ajouterArticle(colonne); if (a) { changer(); choisirArticle(a.id); }
        } }, '＋ Article'),
        reserve.length ? h('select', { class: 'gze-mini', title: 'Placer ici un article de la réserve', onchange: (e) => {
          if (e.target.value) { deplacerArticle(e.target.value, colonne, colonne.articles.length); changer(); dessinerPanneau(); }
        } }, h('option', { value: '' }, '⤵ Réserve…'), reserve.map((id) => h('option', { value: id }, d().articles[id].titre || '(sans titre)'))) : ''));
      cEl.addEventListener('dragover', (e) => {
        if (!glisse) return;
        e.preventDefault();
        marquerInsertion(cEl, e.clientY);
      });
      cEl.addEventListener('dragleave', (e) => { if (!cEl.contains(e.relatedTarget)) effacerInsertion(); });
      cEl.addEventListener('drop', (e) => {
        if (!glisse) return;
        e.preventDefault();
        const index = indexInsertion(cEl, e.clientY);
        effacerInsertion();
        deplacerArticle(glisse, colonne, index);
        glisse = null;
        changer(); dessinerPanneau();
      });
    });
    // Articles : sélection, glisser, outils
    pageEl.querySelectorAll('.gz-article').forEach((aEl) => decorerArticle(aEl));
  });
  decorerBandeau(journal.querySelector('.gz-bandeau'));
}

function decorerArticle(aEl) {
  const id = aEl.dataset.article;
  // Glisser l'article : par sa poignée ⠿, ou en le saisissant hors des zones de
  // texte (dans une zone de texte, la souris sélectionne le texte).
  aEl.draggable = false;
  aEl.tabIndex = 0;
  if (id === choisi) aEl.classList.add('gze-choisi');
  aEl.addEventListener('pointerdown', (e) => {
    aEl.draggable = !e.target.closest('[contenteditable="true"], button, select, input, label');
  });
  aEl.addEventListener('click', (e) => { if (!e.target.closest('.gze-outils-article')) choisirArticle(id); });
  aEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target === aEl) choisirArticle(id); });
  aEl.addEventListener('dragstart', (e) => {
    glisse = id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); aEl.classList.add('gze-glisse');
    if (e.target !== aEl && e.dataTransfer.setDragImage) e.dataTransfer.setDragImage(aEl, 16, 16);
  });
  aEl.addEventListener('dragend', () => { glisse = null; aEl.draggable = false; aEl.classList.remove('gze-glisse'); effacerInsertion(); });
  // Zones de texte modifiables en place
  aEl.querySelectorAll('[data-champ]').forEach((z) => {
    const champ = z.dataset.champ;
    const avecFormat = champ === 'texte' || champ === 'chapeau';
    rendreModifiable(z, {
      modele: champ === 'titre' ? MODELE_TITRE : null,
      entree: () => { choisirArticle(id); if (avecFormat) format.montrer(z); },
      saisie: (v) => {
        if (champ === 'texte') reparerLettrine(z, d().articles[id] && d().articles[id].lettrine);
        saisieArticle(id, champ, v);
        if (avecFormat) format.montrer(z);
      }
    });
    z.addEventListener('blur', () => format.cacher(z));
  });
  // Sorti de l'article : il est redessiné (mise en forme définitive, zones vides…).
  aEl.addEventListener('focusout', (e) => { if (!aEl.contains(e.relatedTarget)) rafraichirArticle(id); });
  const p = position(d(), id);
  aEl.prepend(h('div', { class: 'gze-outils-article' },
    h('span', { class: 'gze-mini gze-poignee', draggable: 'true', title: 'Glisser pour déplacer l\'article', 'aria-hidden': 'true' }, '⠿'),
    p && p.index > 0 ? h('button', { type: 'button', class: 'gze-mini', title: 'Monter', onclick: () => { deplacerArticle(id, p.colonne, p.index - 1); changer(); } }, '↑') : '',
    p && p.index < p.colonne.articles.length - 1 ? h('button', { type: 'button', class: 'gze-mini', title: 'Descendre', onclick: () => { deplacerArticle(id, p.colonne, p.index + 2); changer(); } }, '↓') : '',
    h('button', { type: 'button', class: 'gze-mini', title: 'Retirer de la page (garder en réserve)', onclick: () => { retirerDesColonnes(d(), id); changer(); dessinerPanneau(); } }, '⤴'),
    h('button', { type: 'button', class: 'gze-mini danger', title: 'Supprimer l\'article', onclick: () => supprimerArticle(id) }, '🗑')));
}

// Ligne d'insertion pendant le glisser-déposer
function indexInsertion(cEl, y) {
  const articles = [...cEl.querySelectorAll(':scope > .gz-article')].filter((el) => el.dataset.article !== glisse);
  const i = articles.findIndex((el) => { const r = el.getBoundingClientRect(); return y < r.top + r.height / 2; });
  const ids = trouverColonne(cEl.dataset.colonne).colonne.articles;
  if (i < 0) return ids.length;
  return ids.indexOf(articles[i].dataset.article);
}
function marquerInsertion(cEl, y) {
  effacerInsertion();
  const articles = [...cEl.querySelectorAll(':scope > .gz-article')].filter((el) => el.dataset.article !== glisse);
  const avant = articles.find((el) => { const r = el.getBoundingClientRect(); return y < r.top + r.height / 2; });
  const trait = h('div', { class: 'gze-insertion' });
  if (avant) avant.before(trait); else cEl.querySelector('.gze-ajout-article').before(trait);
}
function effacerInsertion() { document.querySelectorAll('.gze-insertion').forEach((el) => el.remove()); }

/** Redessine un seul article (frappe dans le formulaire, sortie de l'article) sans tout reconstruire. */
const minuteursArticle = new Map();
function rafraichirArticle(id) {
  clearTimeout(minuteursArticle.get(id));
  minuteursArticle.set(id, setTimeout(() => {
    minuteursArticle.delete(id);
    const ancien = document.querySelector('#plan [data-article="' + CSS.escape(id) + '"]');
    if (!ancien || !d().articles[id]) return;
    // On écrit encore dans cet article, dans la page : il sera redessiné en le quittant.
    if (ancien.contains(document.activeElement) && document.activeElement.isContentEditable) return;
    const nouveau = rendreArticle(d().articles[id], { edition: true });
    decorerArticle(nouveau);
    ancien.replaceWith(nouveau);
  }, 200));
}

// ---------------------------------------------------------------------
// Panneau de gauche
// ---------------------------------------------------------------------
function dessinerPanneau() {
  document.querySelectorAll('#onglets [data-onglet]').forEach((b) => b.classList.toggle('actif', b.dataset.onglet === onglet));
  $('nPenseBete').textContent = penseBete[moisPenseBete] ? String(Object.keys(penseBete[moisPenseBete]).length) : '';
  const corps = { article: panneauArticle, reserve: panneauReserve, pensebete: panneauPenseBete, reglages: panneauReglages }[onglet]();
  $('panneau').replaceChildren(corps);
  majEtat();
}
const champ = (libelle, el, aide) => h('label', { class: 'gze-champ' }, h('span', {}, libelle), el, aide ? h('small', {}, aide) : '');

function panneauArticle() {
  const a = choisi && d().articles[choisi];
  if (!a) {
    return h('div', { class: 'gze-vide' },
      h('p', {}, 'Cliquez sur un article de la page pour le modifier : écrivez directement dans la page (titre, chapeau, texte, signature…), ou dans les champs qui s\'affichent ici. Les deux restent identiques.'),
      h('p', {}, 'Le bandeau de la une (titre du journal, devise, lieu, date, prix) s\'écrit aussi dans la page ; ses réglages sont dans l\'onglet « Réglages ».'),
      h('p', {}, 'Pour découper la page : survolez une rangée et choisissez son découpage en colonnes, ou ajoutez une rangée en bas de la page.'),
      h('p', {}, 'Les articles se déplacent par glisser-déposer, d\'une colonne à l\'autre ou d\'une page à l\'autre.'));
  }
  const maj = (cle, valeur) => { a[cle] = valeur; modifie = true; rafraichirArticle(a.id); changer({ plan: false }); };
  const majImage = (cle, valeur) => { a.image[cle] = valeur; rafraichirArticle(a.id); changer({ plan: false }); };
  // data-champ : le même nom que la zone de la page, pour recopier ce qui s'écrit dans l'une vers l'autre.
  const texte = (cle, max, attrs = {}) => h('input', { type: 'text', maxlength: max, value: a[cle], 'data-champ': cle, oninput: (e) => maj(cle, e.target.value), ...attrs });
  const zone = (cle, max, lignes) => h('textarea', { maxlength: max, rows: lignes, 'data-champ': cle, oninput: (e) => maj(cle, e.target.value) }, a[cle]);
  const select = (valeurs, actuel, surChange) => h('select', { onchange: (e) => surChange(e.target.value) },
    Object.entries(valeurs).map(([v, l]) => h('option', { value: v, selected: String(v) === String(actuel) }, l)));

  // Image par lien
  const apercuImg = h('div', { class: 'gze-apercu-img' });
  const msgImg = h('small', { class: 'gze-msg-img' });
  const montrerImage = () => {
    apercuImg.replaceChildren();
    msgImg.textContent = '';
    if (!a.image.url) return;
    apercuImg.append(h('img', { src: a.image.url, alt: '', referrerpolicy: 'no-referrer',
      onerror: () => { msgImg.textContent = 'Image introuvable, ou refusée par le site qui l\'héberge : essayez une autre adresse.'; msgImg.className = 'gze-msg-img err'; } }));
  };
  const url = h('input', { type: 'url', maxlength: 1000, placeholder: 'https://…/image.jpg', value: a.image.url,
    onchange: (e) => {
      const v = e.target.value.trim();
      if (v && !urlImageValide(v)) { msgImg.textContent = 'Adresse refusée : elle doit commencer par https://'; msgImg.className = 'gze-msg-img err'; return; }
      majImage('url', v); montrerImage();
    } });
  montrerImage();

  const p = position(d(), a.id);
  return h('div', { class: 'gze-form' },
    h('div', { class: 'gze-ou' }, p ? libelleColonne(p.page, p.rangee, p.colonne) : 'En réserve (pas sur la page)'),
    a.source ? h('p', { class: 'gze-source' }, '📌 D\'après : ', a.source.libelle) : '',
    champ('Style', select(STYLES, a.style, (v) => { a.style = v; rafraichirArticle(a.id); changer({ plan: false }); })),
    champ('Surtitre', texte('surtitre', 200), 'Petite ligne au-dessus du titre (rubrique, lieu…).'),
    champ('Titre', texte('titre', 200)),
    champ('Chapeau', zone('chapeau', 1000, 2), 'Introduction en italique, sous le titre.'),
    champ('Texte', zone('texte', 20000, 12)),
    h('details', { class: 'gze-aide' }, h('summary', {}, 'Mise en forme du texte'),
      h('ul', {},
        h('li', {}, 'Dans la page : barre de mise en forme au-dessus du texte, Entrée pour un nouveau paragraphe, Maj+Entrée pour aller à la ligne'),
        h('li', {}, 'Ici : ligne vide pour un nouveau paragraphe'),
        h('li', {}, h('code', {}, '**gras**'), ' et ', h('code', {}, '*italique*')),
        h('li', {}, h('code', {}, '## Intertitre'), ' (seul sur sa ligne)'),
        h('li', {}, h('code', {}, '> citation'), ', ', h('code', {}, '- liste'), ', ', h('code', {}, '---'), ' (ornement)'))),
    h('div', { class: 'gze-ligne' },
      champ('Colonnes du texte', select({ 1: '1', 2: '2', 3: '3' }, a.colonnes, (v) => { a.colonnes = +v; rafraichirArticle(a.id); changer({ plan: false }); })),
      h('label', { class: 'gze-case gze-champ' }, h('input', { type: 'checkbox', checked: a.lettrine, onchange: (e) => { a.lettrine = e.target.checked; rafraichirArticle(a.id); changer({ plan: false }); } }), 'Lettrine')),
    champ('Signature', texte('signature', 200), 'Par exemple : « Notre envoyé spécial à la Bastille ».'),
    h('fieldset', { class: 'gze-image-champs' }, h('legend', {}, 'Image (lien externe, jamais stockée sur le site)'),
      champ('Adresse de l\'image', url), msgImg, apercuImg,
      champ('Légende', h('input', { type: 'text', maxlength: 200, value: a.image.legende, 'data-champ': 'image.legende', oninput: (e) => majImage('legende', e.target.value) })),
      champ('Crédit', h('input', { type: 'text', maxlength: 200, value: a.image.credit, 'data-champ': 'image.credit', oninput: (e) => majImage('credit', e.target.value) }), 'Auteur ou source de l\'image.'),
      h('div', { class: 'gze-ligne' },
        champ('Position', select(POSITIONS_IMAGE, a.image.position, (v) => { majImage('position', v); })),
        champ('Taille (à gauche / à droite)', select(TAILLES_IMAGE, a.image.taille, (v) => { majImage('taille', v); })))),
    h('div', { class: 'gze-actions' },
      p ? h('button', { type: 'button', class: 'gze-btn', onclick: () => { retirerDesColonnes(d(), a.id); changer(); dessinerPanneau(); } }, '⤴ Retirer de la page') : '',
      h('button', { type: 'button', class: 'gze-btn', onclick: () => {
        const copie = ajouterArticle(null, { ...JSON.parse(JSON.stringify(a)), id: undefined, titre: a.titre + ' (copie)' });
        if (copie) { if (p) p.colonne.articles.splice(p.index + 1, 0, copie.id); changer(); choisirArticle(copie.id); }
      } }, 'Dupliquer'),
      h('button', { type: 'button', class: 'gze-btn danger', onclick: () => supprimerArticle(a.id) }, 'Supprimer')));
}

function panneauReserve() {
  const ids = enReserve(d());
  const colonnes = toutesColonnes();
  const zone = h('div', { class: 'gze-reserve' },
    h('p', { class: 'gze-note' }, 'Articles écrits mais pas encore placés sur la page. Glissez un article de la page ici pour le mettre de côté.'),
    h('button', { type: 'button', class: 'gze-btn', onclick: () => { const a = ajouterArticle(null); if (a) { changer({ plan: false }); choisirArticle(a.id); } } }, '＋ Nouvel article (en réserve)'),
    ids.length ? ids.map((id) => {
      const a = d().articles[id];
      return h('div', { class: 'gze-carte' },
        h('strong', {}, a.titre || '(sans titre)'),
        h('small', {}, (STYLES[a.style] || '') + (a.texte ? ' · ' + a.texte.length + ' signes' : ' · vide') + (a.source ? ' · d\'après ' + a.source.libelle : '')),
        h('div', { class: 'gze-actions' },
          h('select', { class: 'gze-mini', onchange: (e) => {
            const c = colonnes[+e.target.value]; if (!c) return;
            deplacerArticle(id, c.colonne, c.colonne.articles.length); changer(); dessinerPanneau();
          } }, h('option', { value: '' }, 'Placer dans…'), colonnes.map((c, i) => h('option', { value: i }, libelleColonne(c.page, c.rangee, c.colonne)))),
          h('button', { type: 'button', class: 'gze-mini', onclick: () => choisirArticle(id) }, '✎ Modifier'),
          h('button', { type: 'button', class: 'gze-mini danger', onclick: () => supprimerArticle(id) }, '🗑')));
    }) : h('p', { class: 'gze-note' }, 'La réserve est vide.'));
  zone.addEventListener('dragover', (e) => { if (glisse) { e.preventDefault(); zone.classList.add('gze-cible'); } });
  zone.addEventListener('dragleave', () => zone.classList.remove('gze-cible'));
  zone.addEventListener('drop', (e) => { if (!glisse) return; e.preventDefault(); retirerDesColonnes(d(), glisse); glisse = null; changer(); dessinerPanneau(); });
  return zone;
}

function panneauPenseBete() {
  const m = moisPenseBete || mois;
  const sujets = penseBete[m];
  const choixM = h('select', { onchange: (e) => { moisPenseBete = e.target.value; dessinerPanneau(); } },
    [moisVoisin(mois, -1), mois, moisVoisin(mois, 1)].map((x) => h('option', { value: x, selected: x === m }, 'Influences de ' + nomMois(x))));
  const notes = h('textarea', { rows: 4, maxlength: 5000, placeholder: 'Idées, rumeurs à glisser, sujets à ne pas oublier…',
    oninput: (e) => { d().pensebete.notes = e.target.value; changer({ plan: false }); } }, d().pensebete.notes);
  const charger = async () => {
    corps.replaceChildren(h('p', { class: 'gze-note' }, 'Chargement…'));
    try { penseBete[m] = await lirePenseBete(m); dessinerPanneau(); }   // 1 lecture par mois
    catch (e) { corps.replaceChildren(h('p', { class: 'cam-msg err' }, messageErreur(e))); }
  };
  const corps = h('div', {});
  if (!sujets) {
    corps.append(h('button', { type: 'button', class: 'gze-btn', onclick: charger }, 'Voir les sujets marqués'));
  } else {
    const ids = Object.keys(sujets).sort((x, y) => (sujets[x].ajouteLe || 0) - (sujets[y].ajouteLe || 0));
    corps.append(h('div', { class: 'gze-actions' }, h('button', { type: 'button', class: 'gze-mini', onclick: charger }, '↻ Rafraîchir')),
      h('div', {}, ids.length ? ids.map((id) => {
        const s = sujets[id];
        const fait = d().pensebete.faits.includes(id);
        return h('div', { class: 'gze-carte gze-sujet' + (fait ? ' fait' : '') },
          h('strong', {}, s.personnage + ' — ' + s.action),
          h('small', {}, [s.categorie, s.lieu, s.date].filter(Boolean).join(' · ')),
          s.cible ? h('p', {}, h('b', {}, 'Cible : '), s.cible) : '',
          s.descriptif ? h('details', {}, h('summary', {}, 'Action du joueur'), h('p', {}, s.descriptif)) : '',
          s.reponse ? h('details', {}, h('summary', {}, 'Réponse du conteur'), h('p', {}, s.reponse)) : '',
          h('div', { class: 'gze-actions' },
            h('button', { type: 'button', class: 'gze-mini', onclick: () => {
              const a = ajouterArticle(null, { titre: s.action, surtitre: s.lieu, source: { influence: id, libelle: s.personnage + ' — ' + s.action } });
              if (!a) return;
              if (!d().pensebete.faits.includes(id)) d().pensebete.faits.push(id);
              changer({ plan: false }); choisirArticle(a.id);
              annonce('Article créé en réserve : écrivez-le, puis placez-le sur la page.');
            } }, '✍ Créer un article'),
            h('label', { class: 'gze-case' }, h('input', { type: 'checkbox', checked: fait, onchange: (e) => {
              const f = d().pensebete.faits;
              if (e.target.checked) { if (!f.includes(id)) f.push(id); } else d().pensebete.faits = f.filter((x) => x !== id);
              changer({ plan: false }); dessinerPanneau();
            } }), 'Traité'),
            h('button', { type: 'button', class: 'gze-mini danger', title: 'Retirer ce sujet du pense-bête (pour tous les conteurs)', onclick: async () => {
              try { await marquerSujet(m, id, null); delete sujets[id]; dessinerPanneau(); } catch (e) { annonce(messageErreur(e), 'err'); }
            } }, 'Retirer')));
      }) : h('p', { class: 'gze-note' }, 'Aucun sujet marqué. Dans Influences — conteur, le bouton « 📰 Gazette » d\'une action l\'ajoute ici.')));
  }
  return h('div', { class: 'gze-form' },
    h('h3', {}, 'Pense-bête — ' + nomMois(mois)),
    champ('Notes de la rédaction', notes, 'Gardées avec ce numéro.'),
    h('h3', {}, 'Sujets marqués depuis les influences'),
    champ('Mois', choixM), corps);
}

function panneauReglages() {
  const b = d().bandeau;
  const majB = (cle) => (e) => { b[cle] = e.target.value; changer(); };
  const t = (cle, max = 200, attrs = {}) => h('input', { type: 'text', maxlength: max, value: b[cle], 'data-champ': 'bandeau.' + cle, onchange: majB(cle), ...attrs });
  const fichier = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async (e) => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      const brut = JSON.parse(await f.text());
      if (!window.confirm('Remplacer le contenu de ce numéro par celui du fichier ?')) return;
      g.donnees = normaliserGazette(brut.donnees || brut);
      choisi = null; changer(); dessinerPanneau();
    } catch (err) { annonce('Fichier illisible : ' + messageErreur(err), 'err'); }
  } });
  const peutSupprimer = g.enLigne && (g.statut === 'brouillon' || estAdmin(session.profil));
  return h('div', { class: 'gze-form' },
    h('h3', {}, 'Ce numéro'),
    h('div', { class: 'gze-ligne' },
      champ('Numéro', h('input', { type: 'number', min: 1, max: 9999, value: g.numero, onchange: (e) => { g.numero = Math.max(1, Math.min(9999, parseInt(e.target.value, 10) || 1)); changer(); remplirChoixMois(); } })),
      champ('Date affichée', t('dateAffichee', 200, { placeholder: nomMois(mois) }))),
    h('h3', {}, 'Bandeau de la une'),
    champ('Titre du journal', t('titre')),
    champ('Sous-titre', t('sousTitre')),
    champ('Devise', t('devise')),
    h('div', { class: 'gze-ligne' }, champ('Lieu', t('lieu')), champ('Prix', t('prix'))),
    h('div', { class: 'gze-ligne' },
      champ('Oreille gauche', h('textarea', { rows: 3, maxlength: 200, 'data-champ': 'bandeau.oreilleGauche', onchange: majB('oreilleGauche') }, b.oreilleGauche)),
      champ('Oreille droite', h('textarea', { rows: 3, maxlength: 200, 'data-champ': 'bandeau.oreilleDroite', onchange: majB('oreilleDroite') }, b.oreilleDroite))),
    h('p', { class: 'gze-note' }, 'Les oreilles sont les petites cases de part et d\'autre du titre (météo nocturne, citation, lune…). Tout le bandeau s\'écrit aussi directement dans la page.'),
    h('h3', {}, 'Sauvegarde et fichiers'),
    h('div', { class: 'gze-actions' },
      h('button', { type: 'button', class: 'gze-btn', onclick: () => telecharger(JSON.stringify({ mois, numero: g.numero, donnees: d() }, null, 1), 'gazette-' + mois + '.json') }, 'Exporter (JSON)'),
      h('button', { type: 'button', class: 'gze-btn', onclick: () => fichier.click() }, 'Importer (JSON)'), fichier),
    g.enLigne ? h('div', { class: 'gze-actions' },
      h('button', { type: 'button', class: 'gze-btn', title: 'Oublier les modifications gardées dans ce navigateur et recharger la version du site', onclick: async () => {
        if (modifie && !window.confirm('Oublier vos modifications non envoyées et recharger la version du site ?')) return;
        oublierBrouillon(session.user.uid, mois); localLe = 0; modifie = false; await ouvrir(mois);
      } }, 'Recharger la version du site')) : '',
    peutSupprimer ? h('div', { class: 'gze-actions' },
      h('button', { type: 'button', class: 'gze-btn danger', onclick: async () => {
        if (!window.confirm('Supprimer définitivement le numéro de ' + nomMois(mois) + ' du site ?')) return;
        try {
          await supprimerGazette(mois);
          oublierBrouillon(session.user.uid, mois);
          liste = liste.filter((x) => x.mois !== mois);
          annonce('Numéro supprimé.');
          await ouvrir(liste.length ? liste[0].mois : moisCourant());
        } catch (e) { annonce(messageErreur(e), 'err'); }
      } }, 'Supprimer ce numéro du site')) : '');
}

// ---------------------------------------------------------------------
// Prévisualisation et publication
// ---------------------------------------------------------------------
let modeApercu = 'ecran';
let pourPublier = false;
function dessinerApercu() {
  const journal = rendreGazette(d(), { mois, numero: g.numero });
  const enveloppe = h('div', { class: modeApercu === 'impression' ? 'gz-impression gze-a4' : 'gze-lecture' }, journal);
  $('apercuContenu').replaceChildren(enveloppe);
  document.querySelectorAll('#apercu [data-mode]').forEach((b) => b.classList.toggle('actif', b.dataset.mode === modeApercu));
  const info = $('apercuInfo');
  info.className = 'gze-apercu-info';
  if (modeApercu === 'impression') {
    // laisser le temps aux images de se charger avant de mesurer
    const mesurer = () => {
      const trop = pagesQuiDebordent(journal);
      info.textContent = trop.length
        ? '⚠ Page' + (trop.length > 1 ? 's ' : ' ') + trop.join(', ') + ' : dépasse une feuille A4 (le surplus sera imprimé sur une feuille de plus).'
        : '✔ Chaque page tient sur une feuille A4. Filets fins et images en gris : impression économe.';
      info.classList.add(trop.length ? 'err' : 'ok');
    };
    mesurer();
    journal.querySelectorAll('img').forEach((img) => { if (!img.complete) img.addEventListener('load', mesurer, { once: true }); });
  } else {
    info.textContent = 'Tel que les joueurs le verront' + (g.statut === 'publiee' ? '.' : ' une fois publié.');
  }
}
function ouvrirApercu({ publication = false } = {}) {
  pourPublier = publication;
  $('btnValiderPublier').hidden = !publication;
  $('apercu').hidden = false;
  dessinerApercu();
  if (publication) annonce('Relisez le numéro, puis « Valider et publier ».', 'attente');
}

// ---------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------
function garde(...contenu) {
  const el = $('gze-garde');
  el.hidden = false;
  el.replaceChildren(h('div', { class: 'cam-garde-boite' }, ...contenu,
    h('p', { class: 'sous-titre', style: 'margin-top:1rem' }, h('a', { href: '/membres/' }, '← Espace membres'))));
}

function brancherCommandes() {
  $('choixMois').addEventListener('change', (e) => ouvrir(e.target.value));
  $('btnNouveau').addEventListener('click', nouveauNumero);
  $('btnLocal').addEventListener('click', () => sauverLocal({ annoncer: true }));
  $('btnSite').addEventListener('click', () => sauverSurSite());
  $('btnApercu').addEventListener('click', () => ouvrirApercu());
  $('btnPublier').addEventListener('click', async () => {
    if (g.statut === 'publiee') {
      if (!window.confirm('Retirer la publication ? Les joueurs ne verront plus ce numéro (il redevient un brouillon).')) return;
      await sauverSurSite({ statut: 'brouillon', forcer: true });
    } else ouvrirApercu({ publication: true });
  });
  $('btnValiderPublier').addEventListener('click', async () => {
    if (await sauverSurSite({ statut: 'publiee', publier: true })) { $('apercu').hidden = true; }
  });
  $('btnFermerApercu').addEventListener('click', () => { $('apercu').hidden = true; if (pourPublier) majEtat(); });
  $('btnImprimer').addEventListener('click', () => window.print());
  document.querySelectorAll('#apercu [data-mode]').forEach((b) => b.addEventListener('click', () => { modeApercu = b.dataset.mode; dessinerApercu(); }));
  document.querySelectorAll('#onglets [data-onglet]').forEach((b) => b.addEventListener('click', () => { onglet = b.dataset.onglet; dessinerPanneau(); }));
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); sauverLocal({ annoncer: true }); }
    if (e.key === 'Escape' && !$('apercu').hidden && !document.querySelector('.gze-fenetre-fond')) $('apercu').hidden = true;
  });
  window.addEventListener('beforeunload', (e) => {
    if (!g) return;
    sauverLocal();
    if (modifie && !localLe) { e.preventDefault(); e.returnValue = ''; }
  });
  preparerImpression(() => (g ? { donnees: d(), meta: { mois, numero: g.numero } } : null));
}

let demarre = false;
surSession(async (s) => {
  if (!s.pret || demarre) return;
  if (!s.user) {
    garde(h('h2', {}, 'Connexion requise'), h('p', {}, 'L\'édition de la gazette est réservée aux conteurs.'),
      h('a', { class: 'cam-btn', href: '/connexion/?retour=' + encodeURIComponent(location.pathname) }, 'Se connecter'));
    return;
  }
  if (!estConteur(s.profil)) {
    garde(h('h2', {}, 'Réservé aux conteurs'), h('p', {}, 'Les numéros publiés se lisent dans ', h('a', { href: '/membres/gazette/' }, 'la gazette'), '.'));
    return;
  }
  demarre = true;
  session = s;
  try {
    // Entrée dans le texte d'un article (écrit dans la page) : un nouveau paragraphe <p>.
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* ancien navigateur */ }
    brancherCommandes();
    liste = await listerGazettes();
    const demande = decodeURIComponent(location.hash.slice(1));
    await ouvrir(moisValide(demande) ? demande : liste.length ? liste[0].mois : moisCourant());
    $('gze-garde').hidden = true;
  } catch (e) {
    console.error(e);
    garde(h('h2', {}, 'Chargement impossible'), h('p', {}, messageErreur(e)));
  }
});
