// Page /membres/fiches/ : fiches de personnage MET (plusieurs par joueur),
// circuit de validation par les conteurs, et PNJ des conteurs (fiches sans
// joueur, champ pnj = catégorie : onglet « PNJ »).
// À la validation, un conteur enregistre aussi la version de référence de la
// fiche (detail/valide : récapitulatif des modifications suivantes) et les
// textes des mystères qu'elle connaît (detail/mysteres). Les consultations de
// fiches par les conteurs et administrateurs sont notées dans journal_fiches.
// Propriété : une fiche « Joueur » appartient à son joueur ; dès qu'elle est
// d'un autre type (antagoniste…), elle appartient au rôle conteur
// (proprietaire vide, champ pnj : onglet « PNJ et antagonistes »), gérée par
// tous ceux qui ont ce rôle, quelle que soit l'équipe. Un joueur peut en être
// l'interprète (champs interprete / interpreteNom) : il la voit, sans la modifier.
import {
  h, db, fs, pageProtegee, barreMembre, estConteur, message, messageErreur, dateFr, millis,
  onglets, confirmer, options, telecharger, reglesAJour
} from '../core.js';
import {
  compresserFichier, enregistrerImage, baliseImage, externaliser, internaliser, collecterRefs
} from '../images.js';
import { STATUTS_FICHE, STATUTS_FICHE_EDITABLES, CATEGORIES_PNJ, AIDE_PNJ, AGES_PNJ_VAMPIRE, FICHE_PNJ, STATUTS_PNJ } from '../donnees.js';
import { participantDeFiche, ajouterAuCombat } from '../combat/modele.js';
import { majRepertoire, estIncarnable, joueurDe } from '../incarnation.js';
import { annuaire } from '../annuaire.js';
import { compresser, donneesDoc, compresserJson, decompresserJson, estCompresse } from '../compression.js';
import { creerEditeur } from '../fiche/editeur.js';
import { ficheVide as ficheMetVide, normaliser } from '../fiche/modele.js';
import { sourceConteur, sourceJoueur, donneesMysteres, refMysteres } from '../fiche/mysteres.js';
import { recapitulatif } from '../fiche/differences.js';
import { budgetAip } from '../fiche/aip.js';
import { ouvrirApercu } from '../fiche/apercu.js';
import { noterAcces, panneauJournal } from '../fiche/journal.js';
import { lireFicheExcel } from '../fiche/import-excel.js';

const racine = document.getElementById('cam-fiches');
barreMembre(document.getElementById('cam-barre'));

const LIMITE_JSON = 600000;   // données complémentaires
const LIMITE_DOC = 950000;    // un document Firestore ne dépasse pas 1 Mio
const FORMAT_EXPORT = 'camarilla-fiche';

let session = null;
let avisApresNavigation = null; // message à afficher après la création d'une fiche
let conteur = false;
let mesFiches = [];
let toutes = [];     // fiches des joueurs (conteurs)
let pnjs = [];       // PNJ (conteurs)
let pnjEnPreparation = null;   // nouveau PNJ choisi dans la fenêtre de création
let mesInterpretations = [];   // PNJ et antagonistes dont je suis l'interprète

// Type de fiche : « Joueur » (ou vide) = fiche d'un joueur ; tout autre type
// (Antagoniste…) = fiche du rôle conteur.
const estTypeJoueur = (t) => !String(t || '').trim() || t === 'Joueur';
/** Catégorie de PNJ d'une fiche qui passe aux conteurs (d'après la race, l'âge, la secte). */
function categorieDeFiche(f) {
  const race = String(f.race || ''), age = String(f.age || ''), secte = String(f.secte || '');
  if (/^vampire$/i.test(race)) return /sabbat/i.test(secte) ? 'sabbat' : 'vampire';
  if (/^humain$/i.test(race)) return age === 'Goule' ? 'goule' : 'humain';
  return 'autre';
}

pageProtegee(racine, 'actif', async (s) => {
  session = s;
  conteur = estConteur(s.profil);
  window.addEventListener('hashchange', route);
  await route();
});

// ---------------------------------------------------------------------
// Chargement
// ---------------------------------------------------------------------
async function chargerMesFiches() {
  const [snap, interp] = await Promise.all([
    fs.getDocs(fs.query(fs.collection(db, 'personnages'), fs.where('proprietaire', '==', session.user.uid))),
    fs.getDocs(fs.query(fs.collection(db, 'personnages'), fs.where('interprete', '==', session.user.uid)))
      .catch((e) => { console.warn('Personnages interprétés illisibles (règles Firestore à republier ?)', e); return { docs: [] }; })
  ]);
  mesFiches = snap.docs.map(donneesDoc).sort((a, b) => millis(b.majLe) - millis(a.majLe));
  mesInterpretations = interp.docs.map(donneesDoc).filter((d) => d.statut !== 'archivee')
    .sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr'));
}
async function chargerToutes() {
  if (!conteur) return;
  const snap = await fs.getDocs(fs.collection(db, 'personnages'));
  const docs = snap.docs.map(donneesDoc);
  toutes = docs.filter((d) => !d.pnj)
    .sort((a, b) => (a.proprietaireNom || '').localeCompare(b.proprietaireNom || '') || (a.nom || '').localeCompare(b.nom || ''));
  pnjs = docs.filter((d) => d.pnj).sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr'));
}

// Chaque navigation reçoit un numéro : si une navigation plus récente a eu
// lieu pendant un chargement, le résultat de l'ancienne est ignoré.
let numeroRoute = 0;
async function route() {
  const numero = ++numeroRoute;
  const perimee = () => numero !== numeroRoute;
  const hash = decodeURIComponent(location.hash.slice(1));
  try {
    if (hash.startsWith('fiche-')) {
      const id = hash.slice(6);
      const snap = await fs.getDoc(fs.doc(db, 'personnages', id));
      if (perimee()) return;
      if (!snap.exists()) { racine.replaceChildren(h('div', { class: 'cam-encart erreur' }, 'Fiche introuvable.')); return; }
      const avis = avisApresNavigation; avisApresNavigation = null;
      const d = await chargerDetail(donneesDoc(snap));
      if (!d.pnj) d.valide = await chargerValide(d.id);
      if (perimee()) return;
      afficherEditeur(d, null, avis);
      noterAcces(session, d).catch((e) => console.warn('Journal des consultations non mis à jour', e));
    } else if (hash === 'nouvelle') {
      afficherEditeur(null);
    } else if (hash === 'nouveau-pnj' && conteur) {
      const d = pnjEnPreparation || documentPnj('vampire', '', '');
      pnjEnPreparation = null;
      afficherEditeur(null, d);
    } else {
      await chargerMesFiches();
      await chargerToutes();
      if (perimee()) return;
      afficherListes(['a-valider', 'toutes', 'pnj'].includes(hash) ? hash : 'mes');
    }
  } catch (e) {
    if (perimee()) return;
    console.error(e);
    racine.replaceChildren(h('div', { class: 'cam-encart erreur' }, messageErreur(e)));
  }
}

// ---------------------------------------------------------------------
// Listes
// ---------------------------------------------------------------------
function carte(f, avecJoueur) {
  return h('div', { class: 'cam-fiche-carte' + (f.pnj ? ' pnj' : ''), onclick: () => { location.hash = 'fiche-' + f.id; } },
    h('div', { class: 'vignette' }, f.portrait ? baliseImage(f.portrait, { alt: '' }) : '☾'),
    h('div', {},
      h('strong', {}, f.nom || 'Sans nom'),
      f.pnj ? h('small', {}, [CATEGORIES_PNJ[f.pnj] || f.pnj, f.age && f.age !== 'Autre' ? f.age : ''].filter(Boolean).join(' · ')) : '',
      h('small', {}, [f.clan, f.secte, f.generation ? f.generation + 'e gén.' : ''].filter(Boolean).join(' · ') || '—'),
      f.xp && !f.pnj ? h('small', {}, 'PX : ' + f.xp.acquise + ' acquis · ' + f.xp.restante + ' restants') : '',
      avecJoueur && !f.pnj ? h('small', {}, 'Joueur : ' + (f.proprietaireNom || '?')) : '',
      f.pnj && f.interprete ? h('small', {}, f.interprete === session.user.uid ? 'Vous l\'interprétez' : 'Interprète : ' + (f.interpreteNom || '?')) : '',
      f.pnj ? (f.statut === 'archivee' ? h('span', { class: 'cam-tag archivee' }, 'Archivé') : h('span', { class: 'cam-tag conteur' }, estTypeJoueur(f.typeFiche) ? 'PNJ' : f.typeFiche))
        : h('span', { class: 'cam-tag ' + f.statut }, STATUTS_FICHE[f.statut] || f.statut),
      h('small', {}, 'Modifiée le ' + dateFr(f.majLe))));
}

function grille(fiches, avecJoueur, vide) {
  return fiches.length ? h('div', { class: 'cam-fiches' }, fiches.map((f) => carte(f, avecJoueur))) : h('p', { class: 'sous-titre' }, vide);
}

function afficherListes(ongletInitial) {
  const fichierImport = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  const fichierExcel = h('input', { type: 'file', accept: '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', hidden: true });
  const msgImport = h('div', { class: 'cam-msg' });
  fichierImport.addEventListener('change', async () => {
    const f = fichierImport.files[0]; fichierImport.value = '';
    if (!f) return;
    try {
      message(msgImport, 'Lecture du fichier…', 'info');
      const brut = JSON.parse(await f.text());
      const fiche = await depuisImport(brut, (n) => message(msgImport, 'Envoi des images… (' + n + ')', 'info'));
      message(msgImport, '');
      afficherEditeur(null, fiche);
    } catch (e) { message(msgImport, 'Import impossible : ' + messageErreur(e), 'err'); }
  });
  fichierExcel.addEventListener('change', async () => {
    const f = fichierExcel.files[0]; fichierExcel.value = '';
    if (!f) return;
    try {
      message(msgImport, 'Lecture de la fiche Excel…', 'info');
      const { fiche, version, remarques } = await lireFicheExcel(f);
      message(msgImport, '');
      const aVoir = remarques.filter((r) => r.type !== 'corrige').length;
      const corriges = remarques.length - aVoir;
      const bilan = [aVoir ? aVoir + ' point' + (aVoir > 1 ? 's' : '') + ' à reprendre' : '',
        corriges ? corriges + ' correction' + (corriges > 1 ? 's' : '') + ' automatique' + (corriges > 1 ? 's' : '') : ''].filter(Boolean).join(', ');
      afficherEditeur(null, { ...documentVide(), nom: fiche.nom, fiche }, h('div', { class: 'cam-import-excel' },
        h('p', {}, 'Fiche importée depuis Excel' + (version ? ' (' + version + ')' : '') + ' : vérifiez-la puis enregistrez.'
          + (bilan ? ' ' + bilan[0].toUpperCase() + bilan.slice(1) + ' :' : '')),
        remarques.length ? h('ul', {}, remarques.map((r) => h('li', { class: r.type },
          r.texte + (r.type === 'inconnu' ? ' : choisissez la bonne valeur dans la liste.' : r.type === 'version' ? '.' : '.')))) : ''));
    } catch (e) { message(msgImport, 'Import impossible : ' + messageErreur(e), 'err'); }
  });

  const mes = h('div', { dataset: { panneau: 'mes' } },
    h('p', { class: 'sous-titre' }, 'Vous pouvez préparer plusieurs fiches à l\'avance. Une fiche soumise est relue par un conteur ; une fois validée, elle n\'est plus modifiable que par lui.'),
    h('div', { class: 'cam-actions' },
      h('button', { type: 'button', onclick: () => { location.hash = 'nouvelle'; } }, '＋ Nouvelle fiche'),
      h('button', { type: 'button', class: 'secondaire', onclick: () => fichierExcel.click() }, 'Importer une fiche Excel (.xlsx)'),
      h('button', { type: 'button', class: 'secondaire', onclick: () => fichierImport.click() }, 'Importer un fichier JSON'),
      fichierImport, fichierExcel),
    msgImport,
    h('div', { style: 'margin-top:1rem' }, grille(mesFiches, false, 'Aucune fiche pour l\'instant.')),
    mesInterpretations.length ? h('div', { class: 'cam-interpretations' },
      h('h3', {}, 'Personnages que vous interprétez'),
      h('p', { class: 'sous-titre' }, 'PNJ et antagonistes : ils appartiennent aux conteurs, qui les gèrent ; vous les jouez. Leur fiche est en lecture seule.'),
      grille(mesInterpretations, false, '')) : '');

  if (!conteur) {
    // Joueur : consultations de ses fiches par les conteurs et administrateurs
    racine.replaceChildren(mes, panneauJournal(mesFiches.filter((f) => !f.pnj).map((f) => ({ id: f.id, nom: f.nom }))));
    mes.classList.add('actif');
    return;
  }

  const soumises = toutes.filter((f) => f.statut === 'soumise').sort((a, b) => millis(a.majLe) - millis(b.majLe));
  const filtreStatut = options(h('select', {}), Object.entries(STATUTS_FICHE), '', 'Tous les statuts');
  const recherche = h('input', { type: 'search', placeholder: 'Personnage ou joueur…' });
  const zoneToutes = h('div', { style: 'margin-top:1rem' });
  const filtrer = () => {
    const st = filtreStatut.value, q = recherche.value.trim().toLowerCase();
    zoneToutes.replaceChildren(grille(toutes.filter((f) => (!st || f.statut === st)
      && (!q || (f.nom || '').toLowerCase().includes(q) || (f.proprietaireNom || '').toLowerCase().includes(q))), true, 'Aucune fiche.'));
  };
  filtreStatut.addEventListener('change', filtrer);
  recherche.addEventListener('input', filtrer);
  filtrer();

  const bloc = h('div', {},
    h('div', { class: 'cam-onglets' },
      h('button', { type: 'button', dataset: { onglet: 'mes' } }, 'Mes fiches'),
      h('button', { type: 'button', dataset: { onglet: 'a-valider' } }, 'À valider' + (soumises.length ? ' (' + soumises.length + ')' : '')),
      h('button', { type: 'button', dataset: { onglet: 'toutes' } }, 'Toutes les fiches'),
      h('button', { type: 'button', dataset: { onglet: 'pnj' } }, 'PNJ et antagonistes' + (pnjs.length ? ' (' + pnjs.filter((x) => x.statut !== 'archivee').length + ')' : ''))),
    mes,
    h('div', { dataset: { panneau: 'a-valider' } },
      h('p', { class: 'sous-titre' }, 'Fiches soumises par les joueurs, de la plus ancienne à la plus récente.'),
      grille(soumises, true, 'Aucune fiche en attente de validation.')),
    h('div', { dataset: { panneau: 'toutes' } },
      h('div', { class: 'cam-ligne' }, h('div', {}, h('label', {}, 'Statut'), filtreStatut), h('div', {}, h('label', {}, 'Recherche'), recherche)),
      zoneToutes),
    panneauPnj());
  racine.replaceChildren(bloc, panneauJournal());
  onglets(bloc, (nom) => { history.replaceState(null, '', nom === 'mes' ? location.pathname : '#' + nom); })(ongletInitial);
}

// ---------------------------------------------------------------------
// PNJ (conteurs)
// ---------------------------------------------------------------------
/** Nouveau document PNJ : fiche MET pré-remplie selon la catégorie. */
function documentPnj(categorie, nom, age) {
  const d = documentVide();
  d.pnj = CATEGORIES_PNJ[categorie] ? categorie : 'autre';
  d.statut = 'active';
  Object.assign(d.fiche, FICHE_PNJ[d.pnj] || {});
  if (age) d.fiche.age = age;
  d.fiche.nom = d.nom = String(nom || '').trim().slice(0, 80);
  return d;
}

function panneauPnj() {
  const filtreCat = options(h('select', {}), Object.entries(CATEGORIES_PNJ), '', 'Toutes les catégories');
  const recherche = h('input', { type: 'search', placeholder: 'Nom, clan, interprète…' });
  const avecArchives = h('input', { type: 'checkbox' });
  const zone = h('div', { style: 'margin-top:1rem' });
  const filtrer = () => {
    const cat = filtreCat.value, q = recherche.value.trim().toLowerCase();
    const liste = pnjs.filter((f) => (avecArchives.checked || f.statut !== 'archivee') && (!cat || f.pnj === cat)
      && (!q || [f.nom, f.clan, f.secte, f.age, f.interpreteNom, f.typeFiche].some((x) => (x || '').toLowerCase().includes(q))));
    if (!liste.length) { zone.replaceChildren(h('p', { class: 'sous-titre' }, pnjs.length ? 'Aucun PNJ ne correspond.' : 'Aucun PNJ pour l\'instant.')); return; }
    // Regroupés par catégorie, dans l'ordre de la liste des catégories
    zone.replaceChildren(...Object.keys(CATEGORIES_PNJ).map((k) => {
      const groupe = liste.filter((f) => f.pnj === k);
      return groupe.length ? h('div', { class: 'cam-groupe-pnj' }, h('h3', {}, CATEGORIES_PNJ[k] + ' (' + groupe.length + ')'), grille(groupe, false, '')) : '';
    }));
  };
  [filtreCat, recherche, avecArchives].forEach((el) => el.addEventListener(el === recherche ? 'input' : 'change', filtrer));
  filtrer();
  return h('div', { dataset: { panneau: 'pnj' } },
    h('p', { class: 'sous-titre' }, 'PNJ et antagonistes, sur la même fiche MET que les joueurs. Ils appartiennent au rôle conteur : tous les conteurs les gèrent, quelle que soit l\'équipe. Une fiche de joueur qui passe en type « Antagoniste » arrive ici. Un joueur peut en être l\'interprète (choisi dans la fiche) : il la voit, sans pouvoir la modifier. Ni répertoire, ni influences ; ils s\'ajoutent au combat depuis leur fiche ou depuis l\'outil de combat.'),
    h('div', { class: 'cam-actions' }, h('button', { type: 'button', onclick: fenetreNouveauPnj }, '＋ Nouveau PNJ')),
    h('div', { class: 'cam-ligne' },
      h('div', {}, h('label', {}, 'Catégorie'), filtreCat),
      h('div', {}, h('label', {}, 'Recherche'), recherche)),
    h('label', { class: 'cam-coche' }, avecArchives, 'Montrer les PNJ archivés'),
    zone);
}

/** Fenêtre de création : nom, catégorie (et âge pour un vampire) -> éditeur pré-rempli. */
function fenetreNouveauPnj() {
  const nom = h('input', { type: 'text', maxlength: 80, placeholder: 'Nom du PNJ' });
  const choixAge = options(h('select', {}), AGES_PNJ_VAMPIRE, 'Ancien', 'Âge à choisir dans la fiche');
  const ligneAge = h('div', {}, h('label', {}, 'Âge'), choixAge);
  let categorie = 'vampire';
  const aide = h('p', { class: 'sous-titre', style: 'margin:.3rem 0 0' });
  const boutons = h('div', { class: 'cam-choix-pnj', role: 'radiogroup', 'aria-label': 'Catégorie' });
  const majCategorie = () => {
    boutons.querySelectorAll('button').forEach((b) => { b.classList.toggle('actif', b.dataset.cat === categorie); b.setAttribute('aria-checked', String(b.dataset.cat === categorie)); });
    aide.textContent = AIDE_PNJ[categorie] || '';
    ligneAge.hidden = !(categorie === 'vampire' || categorie === 'sabbat');
  };
  Object.entries(CATEGORIES_PNJ).forEach(([k, l]) => boutons.append(h('button', {
    type: 'button', role: 'radio', dataset: { cat: k }, onclick: () => { categorie = k; majCategorie(); }
  }, l)));
  majCategorie();
  const msg = h('div', { class: 'cam-msg' });
  const fond = h('div', { class: 'cam-modal-fond cam-app' });
  const fermer = () => { fond.remove(); document.removeEventListener('keydown', echap, true); };
  const echap = (e) => { if (e.key === 'Escape') { e.stopPropagation(); fermer(); } };
  const creer = () => {
    if (!nom.value.trim()) { message(msg, 'Donnez un nom au PNJ.', 'err'); nom.focus(); return; }
    pnjEnPreparation = documentPnj(categorie, nom.value, ligneAge.hidden ? '' : choixAge.value);
    fermer();
    location.hash = 'nouveau-pnj';
  };
  nom.addEventListener('keydown', (e) => { if (e.key === 'Enter') creer(); });
  fond.append(h('div', { class: 'cam-modal' },
    h('h2', {}, 'Nouveau PNJ'),
    h('label', {}, 'Nom'), nom,
    h('label', {}, 'Catégorie'), boutons, aide,
    ligneAge,
    h('p', { class: 'sous-titre' }, 'La fiche s\'ouvre pré-remplie (type « Antagoniste », race, âge, secte) : complétez attributs, disciplines… puis enregistrez.'),
    h('div', { class: 'cam-actions' },
      h('button', { type: 'button', onclick: creer }, 'Créer la fiche'),
      h('button', { type: 'button', class: 'secondaire', onclick: fermer }, 'Annuler')),
    msg));
  fond.addEventListener('click', (e) => { if (e.target === fond) fermer(); });
  document.addEventListener('keydown', echap, true);
  document.body.append(fond);
  nom.focus();
}

// ---------------------------------------------------------------------
// Stockage : document léger + détail
// personnages/{id}               champs des listes (nom, clan, influences, PX,
//                                statut…) : lu par les listes, les influences,
//                                l'incarnation ;
// personnages/{id}/detail/fiche  fiche MET complète et données
//                                complémentaires, compressées (deflate) : lu
//                                seulement à l'ouverture de la fiche.
// Les deux sont écrits ensemble (lot). Les anciennes fiches (tout dans le
// document) restent lisibles et passent au nouveau format à leur prochain
// enregistrement, ou d'un coup par Comptes > Maintenance > Migrer les fiches.
// ---------------------------------------------------------------------
const refDetail = (id) => fs.doc(db, 'personnages', id, 'detail', 'fiche');

async function chargerDetail(d) {
  if (d.fiche) return { ...d, ancienFormat: true };
  const s = await fs.getDoc(refDetail(d.id));
  if (!s.exists()) return { ...d, fiche: null, contenuJson: '{}' };
  const x = s.data();
  const fiche = x.fiche && typeof x.fiche === 'object' && !estCompresse(x.fiche) ? x.fiche : JSON.parse(await decompresserJson(x.fiche) || 'null');
  return { ...d, fiche, contenuJson: (await decompresserJson(x.contenuJson)) || '{}' };
}

// Version de référence (dernière validation par un conteur) : sert au
// récapitulatif des modifications. Absente pour une fiche jamais validée
// (ou validée avant que le site ne la garde).
const refValide = (id) => fs.doc(db, 'personnages', id, 'detail', 'valide');
async function chargerValide(id) {
  try {
    const s = await fs.getDoc(refValide(id));
    if (!s.exists()) return null;
    const x = s.data();
    return { ...x, fiche: JSON.parse((await decompresserJson(x.fiche)) || 'null') };
  } catch (e) { console.warn('Version validée illisible', e); return null; }
}
async function donneesValide(fiche, xp, uid, nomConteur) {
  return {
    fiche: await compresserJson(JSON.stringify(fiche)), nom: String(fiche.nom || '').slice(0, 80),
    xp: { acquise: xp.acquise || 0, depensee: xp.depensee || 0, restante: xp.restante || 0 },
    valideLe: fs.serverTimestamp(), validePar: uid, valideParNom: String(nomConteur || '').slice(0, 80),
  };
}

/** Écrit le document léger et le détail dans un même lot. */
async function ecrireFiche(ref, leger, detail, { creation = false, ancienFormat = false } = {}) {
  const lot = fs.writeBatch(db);
  if (creation) lot.set(ref, leger);
  else lot.update(ref, ancienFormat ? { ...leger, fiche: fs.deleteField(), contenuJson: fs.deleteField() } : leger);
  lot.set(refDetail(ref.id), {
    fiche: await compresserJson(JSON.stringify(detail.fiche)),
    contenuJson: await compresserJson(detail.contenuJson || '{}'),
    majLe: fs.serverTimestamp()
  });
  await lot.commit();
}

// ---------------------------------------------------------------------
// Documents, import / export
// ---------------------------------------------------------------------
function documentVide() {
  return { nom: '', statut: 'brouillon', commentaireConteur: '', portrait: '', contenuJson: '{}', fiche: ficheMetVide() };
}

/** Fiche MET d'un document (les documents d'avant la fiche MET sont convertis au mieux). */
function ficheDuDocument(d) {
  if (d.fiche) return normaliser(d.fiche);
  const f = ficheMetVide();
  f.nom = d.nom || ''; f.clan = d.clan || ''; f.secte = d.secte || '';
  const infos = d.infos || {};
  f.concept = infos.concept || '';
  f.notes = [['Historique', infos.historique], ['Apparence et personnalité', infos.description], ['Objectifs', infos.objectifs], ['Notes', infos.notes]]
    .filter(([, v]) => v).map(([k, v]) => k + ' :\n' + v).join('\n\n');
  if (d.niveauGotha) f.historiques.gotha.niveau = d.niveauGotha;
  if (d.niveauPegre) f.historiques.pegre.niveau = d.niveauPegre;
  (d.specsGotha || []).slice(0, 10).forEach((x, i) => { f.historiques.gotha.specialisations[i] = x; f.historiques.gotha.raisons[i] = (d.raisonsGotha || [])[i] || ''; });
  (d.specsPegre || []).slice(0, 10).forEach((x, i) => { f.historiques.pegre.specialisations[i] = x; f.historiques.pegre.raisons[i] = (d.raisonsPegre || [])[i] || ''; });
  return f;
}

/** Champs recopiés de la fiche au premier niveau du document (listes, influences, règles). */
function champsDerives(f, R) {
  const entier = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : 0; };
  const borne = (v) => Math.max(0, Math.min(10, entier(v)));
  // Spécialisations d'influence (non vides) et, au même rang, leur raison sociale
  const lignesInfl = (x) => x.specialisations.map((sp, i) => [String(sp || '').trim().slice(0, 80), String((x.raisons || [])[i] || '').trim().slice(0, 100)])
    .filter(([sp]) => sp).slice(0, 10);
  const lg = lignesInfl(f.historiques.gotha), lp = lignesInfl(f.historiques.pegre);
  const g = parseInt(f.generation, 10);
  return {
    schema: 2, nom: f.nom, clan: f.clan, secte: f.secte,
    race: String(f.race || '').slice(0, 30), age: String(f.age || '').slice(0, 30), typeFiche: String(f.typeFiche || '').slice(0, 40),
    generation: Number.isInteger(g) && g >= 3 && g <= 16 ? g : null,
    niveauGotha: borne(f.historiques.gotha.niveau), specsGotha: lg.map(([sp]) => sp), raisonsGotha: lg.map(([, r]) => r),
    niveauPegre: borne(f.historiques.pegre.niveau), specsPegre: lp.map(([sp]) => sp), raisonsPegre: lp.map(([, r]) => r),
    xp: { acquise: R.xp.acquise, depensee: R.xp.depensee, restante: R.xp.restante },
    aip: budgetAip(f),
  };
}

async function depuisImport(brut, progression) {
  const d = documentVide();
  if (brut && brut.app === FORMAT_EXPORT && brut.fiche) {
    d.fiche = brut.version >= 2 ? normaliser(brut.fiche) : ficheDuDocument(brut.fiche);
    if (typeof brut.fiche.portrait === 'string' && brut.fiche.portrait.startsWith('data:image/')) d.portrait = await enregistrerImage(brut.fiche.portrait);
    if (typeof brut.portrait === 'string' && brut.portrait.startsWith('data:image/')) d.portrait = await enregistrerImage(brut.portrait);
    d.contenuJson = JSON.stringify(await externaliser(brut.libre ?? brut.fiche.libre ?? {}, progression));
  } else {
    d.fiche.nom = (brut && (brut.nom || brut.name || brut.personnage)) || 'Fiche importée';
    if (typeof d.fiche.nom !== 'string') d.fiche.nom = 'Fiche importée';
    d.contenuJson = JSON.stringify(await externaliser(brut ?? {}, progression));
  }
  d.fiche.nom = String(d.fiche.nom).slice(0, 80);
  d.nom = d.fiche.nom;
  return d;
}

async function exporter(d) {
  const libre = await internaliser(JSON.parse(d.contenuJson || '{}'));
  const portrait = d.portrait ? await internaliser(d.portrait) : '';
  const donnees = { app: FORMAT_EXPORT, version: 2, exporteLe: new Date().toISOString(), statut: d.statut, portrait, fiche: ficheDuDocument(d), libre };
  const nom = (d.nom || 'fiche').normalize('NFD').replace(/[^\w-]+/g, '-').replace(/-+/g, '-').toLowerCase();
  telecharger(JSON.stringify(donnees, null, 2), 'fiche-' + nom + '.json');
}

function retourListe() {
  if (location.hash) location.hash = ''; else route();
}

let promesseRegles = null;
const reglesRecentes = () => (promesseRegles = promesseRegles || reglesAJour().catch(() => false));

let gardeSortie = null;
function proteger(actif) {
  if (gardeSortie) window.removeEventListener('beforeunload', gardeSortie);
  gardeSortie = null;
  if (actif) {
    gardeSortie = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', gardeSortie);
  }
}

// ---------------------------------------------------------------------
// Éditeur
// ---------------------------------------------------------------------
function afficherEditeur(existante, preRemplie, avis) {
  const uid = session.user.uid;
  const nouvelle = !existante;
  const d = existante || preRemplie || documentVide();
  const estPnj = !!d.pnj && conteur;   // PNJ / antagoniste : conteurs seulement, ni joueur ni circuit de validation
  const jInterprete = !conteur && !!d.interprete && d.interprete === uid;   // lecture seule pour l'interprète
  let categoriePnj = d.pnj || '';
  let interprete = { uid: d.interprete || '', nom: d.interpreteNom || '' };
  const proprio = !estPnj && (nouvelle || d.proprietaire === uid);
  const modifiable = conteur || (proprio && (nouvelle || STATUTS_FICHE_EDITABLES.includes(d.statut)));
  const dis = !modifiable;
  let portraitRef = d.portrait || '';
  let modifie = !!preRemplie;
  proteger(false);

  // --- Fiche MET ---
  const resumeEntete = h('p', { class: 'sous-titre fiche-resume-entete' });
  const titre = h('span', {});
  // Textes des mystères : tous les niveaux pour un conteur, ceux transmis à la validation pour le joueur.
  const sourceMyst = conteur ? sourceConteur() : sourceJoueur(nouvelle ? null : d.id);
  const editeur = creerEditeur({
    fiche: ficheDuDocument(d), modifiable, mysteres: sourceMyst, apercu: () => apercu(),
    surModification: () => { if (!modifie) { modifie = true; proteger(true); } majEntete(); majRecap(); },
  });
  function apercu() {
    try {
      ouvrirApercu(editeur.lireFiche(), {
        portrait: portraitRef ? baliseImage(portraitRef, { alt: 'Portrait' }) : null,
        joueur: estPnj ? '' : (d.proprietaireNom || (nouvelle ? session.profil.nom : '')),
        statut: estPnj ? 'PNJ' + (CATEGORIES_PNJ[categoriePnj] ? ' (' + CATEGORIES_PNJ[categoriePnj] + ')' : '') : (nouvelle ? 'Nouvelle fiche' : STATUTS_FICHE[d.statut] || d.statut),
        mysteres: sourceMyst,
      });
    } catch (e) { console.error(e); message(msg, 'Aperçu impossible : ' + messageErreur(e), 'err'); }
  }

  // --- Récapitulatif des modifications depuis la dernière validation (conteurs, et joueur pendant ses modifications)
  const zoneRecap = h('div', { class: 'fiche-recap-zone' });
  let minuteurRecap = null;
  function majRecap() { clearTimeout(minuteurRecap); minuteurRecap = setTimeout(dessinerRecap, 400); }
  function dessinerRecap() {
    try { zoneRecap.replaceChildren(blocRecap()); } catch (e) { console.error('Récapitulatif impossible', e); zoneRecap.replaceChildren(); }
  }
  function blocRecap() {
    if (estPnj || nouvelle || !(conteur || proprio)) return '';
    const signe = (n) => (n > 0 ? '+' + n : String(n));
    if (!d.valide || !d.valide.fiche) {
      if (!conteur || d.statut !== 'soumise') return '';
      const x = editeur.calcul().xp;
      return h('div', { class: 'cam-encart fiche-recap' },
        h('strong', {}, 'Pas de version validée de référence'), ' : première validation de cette fiche, ou fiche validée avant que le site ne garde cette version. ',
        'PX acquis ', h('b', {}, x.acquise), ', dépensés ', h('b', {}, x.depensee), ', restants ', h('b', {}, x.restante), '.');
    }
    const r = recapitulatif(d.valide.fiche, editeur.lireFiche());
    const xa = r.xp.avant, xb = r.xp.apres;
    const dxp = xb.depensee - xa.depensee;
    const rien = !r.changements.length && !r.xp.lignes.length;
    if (rien && !(conteur && d.statut === 'soumise')) return '';
    const parRubrique = new Map();
    r.changements.forEach((c) => { if (!parRubrique.has(c.rubrique)) parRubrique.set(c.rubrique, []); parRubrique.get(c.rubrique).push(c.texte); });
    const quand = d.valide.valideLe ? dateFr(d.valide.valideLe) : '';
    return h('details', { class: 'cam-bloc fiche-recap', open: conteur && d.statut === 'soumise' },
      h('summary', {}, h('strong', {}, 'Modifications depuis la dernière validation'),
        ' ', h('span', { class: 'cam-tag ' + (rien ? 'validee' : 'soumise') }, rien ? 'aucune' : r.changements.length + ' modification' + (r.changements.length > 1 ? 's' : '')),
        dxp ? h('span', { class: 'cam-tag ' + (dxp > 0 ? 'refusee' : 'validee') }, signe(dxp) + ' PX dépensés') : ''),
      h('p', { class: 'sous-titre' }, 'Comparaison avec la version validée' + (quand ? ' le ' + quand : '') + (d.valide.valideParNom ? ' par ' + d.valide.valideParNom : '') + '. Mis à jour pendant les modifications.'),
      h('p', { class: 'fiche-recap-xp' },
        'PX dépensés ', h('b', {}, xa.depensee), ' → ', h('b', {}, xb.depensee), dxp ? ' (' + signe(dxp) + ')' : '',
        ' · acquis ', h('b', {}, xa.acquise), ' → ', h('b', {}, xb.acquise),
        ' · restants ', h('b', {}, xa.restante), ' → ', h('b', {}, xb.restante)),
      r.xp.lignes.length ? h('ul', { class: 'fiche-recap-xp-detail' }, r.xp.lignes.map(([l, a, b]) => h('li', {}, l + ' : ' + a + ' → ' + b + ' PX (' + signe(b - a) + ')'))) : '',
      rien ? h('p', {}, 'Aucune modification depuis la dernière validation.')
        : h('div', { class: 'fiche-recap-liste' }, [...parRubrique].map(([rub, l]) => h('div', {}, h('h4', {}, rub), h('ul', {}, l.map((t) => h('li', { class: t.includes(': + ') || t.startsWith('+ ') ? 'plus' : t.includes(': − ') || t.startsWith('− ') ? 'moins' : '' }, t)))))));
  }
  function majEntete() {
    const f = editeur.lireFiche();
    titre.textContent = f.nom || (nouvelle ? 'Nouvelle fiche' : 'Fiche sans nom');
    resumeEntete.textContent = [f.typeFiche, f.clan, f.secte, f.generation ? f.generation + 'e génération' : ''].filter(Boolean).join(' · ') || 'Choisissez le clan, la secte et la génération dans l\'onglet Personnage.';
  }
  majEntete();
  if (modifie) proteger(true);

  // --- Portrait ---
  const cadrePortrait = h('div', { class: 'cam-portrait' });
  const dessinerPortrait = () => cadrePortrait.replaceChildren(portraitRef ? baliseImage(portraitRef, { alt: 'Portrait' }) : 'Pas de portrait');
  dessinerPortrait();
  const fichierPortrait = h('input', { type: 'file', accept: 'image/*', hidden: true });
  const msgPortrait = h('div', { class: 'cam-msg' });
  fichierPortrait.addEventListener('change', async () => {
    const file = fichierPortrait.files[0]; fichierPortrait.value = '';
    if (!file) return;
    try {
      message(msgPortrait, 'Envoi de l\'image…', 'info');
      portraitRef = await enregistrerImage(await compresserFichier(file, { cote: 900 }));
      dessinerPortrait(); modifie = true; proteger(true);
      message(msgPortrait, 'Image prête (pensez à enregistrer la fiche).', 'ok');
    } catch (e) { message(msgPortrait, messageErreur(e), 'err'); }
  });

  // --- Données libres (JSON) ---
  let jsonAffiche = '{}';
  try { jsonAffiche = JSON.stringify(JSON.parse(d.contenuJson || '{}'), null, 2); } catch (e) { jsonAffiche = d.contenuJson || '{}'; }
  const zoneJson = h('textarea', { class: 'code', disabled: dis, spellcheck: 'false', oninput: () => { modifie = true; proteger(true); } }, jsonAffiche);
  const galerie = h('div', { style: 'display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.4rem' });
  const majGalerie = () => {
    const refs = [...collecterRefs(zoneJson.value)];
    galerie.replaceChildren(...refs.slice(0, 24).map((id) => baliseImage('img:' + id, { style: 'height:60px;border-radius:3px;border:1px solid #ddd' })));
  };
  majGalerie();
  zoneJson.addEventListener('change', majGalerie);
  const fichierJson = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  const msgJson = h('div', { class: 'cam-msg' });
  fichierJson.addEventListener('change', async () => {
    const file = fichierJson.files[0]; fichierJson.value = '';
    if (!file) return;
    try {
      const brut = JSON.parse(await file.text());
      message(msgJson, 'Envoi des images…', 'info');
      const ext = await externaliser(brut, (n) => message(msgJson, 'Envoi des images… (' + n + ')', 'info'));
      zoneJson.value = JSON.stringify(ext, null, 2);
      majGalerie(); modifie = true; proteger(true);
      message(msgJson, 'JSON chargé (pensez à enregistrer la fiche).', 'ok');
    } catch (e) { message(msgJson, 'Fichier illisible : ' + messageErreur(e), 'err'); }
  });

  // --- Commentaire conteur ---
  const commentaire = h('textarea', {
    disabled: !conteur, maxlength: 2000,
    placeholder: conteur ? 'Envoyé au joueur dans ses notifications quand vous validez, mettez en jeu, renvoyez ou archivez la fiche.' : ''
  }, d.commentaireConteur || '');

  // --- Actions ---
  const msg = h('div', { class: 'cam-msg' });
  const actions = h('div', { class: 'cam-actions' });

  async function construire(statut) {
    const f = editeur.lireFiche();
    f.nom = String(f.nom || '').trim().slice(0, 80);
    f.clan = String(f.clan || '').slice(0, 60);
    f.secte = String(f.secte || '').slice(0, 60);
    if (!f.nom) { editeur.montrer({ section: 'identite' }); throw new Error('Le nom du personnage est obligatoire (onglet Personnage).'); }
    const R = editeur.calcul();
    let libre;
    try { libre = JSON.parse(zoneJson.value.trim() || '{}'); } catch (e) { throw new Error('Les données complémentaires ne sont pas un JSON valide : ' + e.message); }
    libre = await externaliser(libre);
    const contenuJson = JSON.stringify(libre);
    if (contenuJson.length > LIMITE_JSON) throw new Error('Données complémentaires trop volumineuses (' + Math.round(contenuJson.length / 1024) + ' Ko, maximum ' + Math.round(LIMITE_JSON / 1024) + ' Ko).');
    if (portraitRef.startsWith('data:')) portraitRef = await enregistrerImage(portraitRef);
    const data = { ...champsDerives(f, R), portrait: portraitRef, statut, majLe: fs.serverTimestamp() };
    // Champ récent : écrit seulement si les règles Firestore publiées le connaissent.
    if (!(await reglesRecentes())) { delete data.aip; delete data.raisonsGotha; delete data.raisonsPegre; }
    if (estPnj) {
      data.pnj = categoriePnj;
      // Champ récent : écrit seulement si les règles Firestore publiées le connaissent.
      if (await reglesRecentes()) { data.interprete = interprete.uid; data.interpreteNom = interprete.uid ? interprete.nom.slice(0, 80) : ''; }
      else if (interprete.uid !== (d.interprete || '')) throw new Error('Pour enregistrer l\'interprète, republiez d\'abord les règles Firestore (firebase/firestore.rules).');
    }
    const detail = { fiche: f, contenuJson };
    const taille = new Blob([JSON.stringify(detail)]).size;
    if (taille > LIMITE_DOC) throw new Error('Fiche trop volumineuse (' + Math.round(taille / 1024) + ' Ko) : raccourcissez les textes ou les données complémentaires.');
    return { data, detail };
  }

  // Après l'enregistrement par un conteur : à la validation (ou mise en jeu),
  // version de référence + textes des mystères connus ; quand une fiche validée
  // repasse en modification, on garde la version validée si elle manquait.
  // Écrit à part : un échec (règles Firestore pas à jour) n'empêche pas la validation.
  async function enregistrerReference(id, statut, fiche, xp) {
    const valider = ['validee', 'active'].includes(statut);
    const retour = !valider && ['validee', 'active'].includes(d.statut) && !d.valide;
    if (!valider && !retour) return '';
    try {
      const lot = fs.writeBatch(db);
      if (valider) {
        lot.set(refValide(id), await donneesValide(fiche, xp, uid, session.profil.nom));
        const m = await donneesMysteres(fiche).catch((e) => { console.warn('Mystères non transmis', e); return null; });
        if (m) lot.set(refMysteres(id), m);
      } else {
        lot.set(refValide(id), { ...(await donneesValide(ficheDuDocument(d), d.xp || {}, d.validePar || uid, '')), ...(d.valideLe ? { valideLe: d.valideLe } : {}) });
      }
      await lot.commit();
      return '';
    } catch (e) {
      console.warn('Version de référence non enregistrée', e);
      return ' (Attention : version de référence et mystères non enregistrés — ' + messageErreur(e) + '. Republiez les règles Firestore.)';
    }
  }

  // Interprète d'un PNJ / antagoniste : il reçoit les textes des mystères du personnage.
  async function transmettreMysteres(id, fiche) {
    try {
      const m = await donneesMysteres(fiche);
      if (m) await fs.setDoc(refMysteres(id), m);
      return '';
    } catch (e) {
      console.warn('Mystères non transmis à l\'interprète', e);
      return ' (Attention : textes des mystères non transmis à l\'interprète — ' + messageErreur(e) + '.)';
    }
  }

  async function enregistrer(statut, texteOk) {
    message(msg, 'Enregistrement…', 'info');
    actions.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    const reactiver = () => actions.querySelectorAll('button').forEach((b) => { b.disabled = false; });
    let avert = '';
    try {
      const { data, detail } = await construire(statut);
      if (estPnj) {
        // PNJ / antagoniste : propriété du rôle conteur ; pas de notification, pas de répertoire.
        if (nouvelle) {
          const ref = fs.doc(fs.collection(db, 'personnages'));
          await ecrireFiche(ref, { ...data, proprietaire: '', proprietaireNom: '', commentaireConteur: '', creeLe: fs.serverTimestamp() }, detail, { creation: true });
          if (data.interprete) {
            avert = await transmettreMysteres(ref.id, detail.fiche);
            // Répertoire : l'interprète le joue dans les outils (tableaux partagés, challenges…).
            await majRepertoire({ id: ref.id, nom: data.nom, proprietaire: '', interprete: data.interprete, statut: data.statut }, null);
          }
          proteger(false);
          avisApresNavigation = (texteOk || 'PNJ enregistré.') + avert;
          location.hash = 'fiche-' + ref.id;
          return;
        }
        await ecrireFiche(fs.doc(db, 'personnages', d.id), { ...data, commentaireConteur: '' }, detail, { ancienFormat: d.ancienFormat });
        if (data.interprete) avert = await transmettreMysteres(d.id, detail.fiche);
        // Répertoire : suit l'interprète (retiré s'il n'y en a plus, ou si le PNJ est archivé).
        if (data.interprete !== undefined && (data.interprete || d.interprete)) {
          await majRepertoire({ id: d.id, nom: data.nom, proprietaire: '', interprete: data.interprete, statut: data.statut }, undefined);
        }
        proteger(false);
        await route();
        message(document.querySelector('#cam-fiches .cam-msg') || msg, (texteOk || 'PNJ enregistré.') + avert, avert ? 'err' : 'ok');
        return;
      }
      // Fiche créée par un conteur avec un type autre que « Joueur » : elle naît au rôle conteur.
      if (nouvelle && conteur && !estTypeJoueur(detail.fiche.typeFiche)) {
        const ref = fs.doc(fs.collection(db, 'personnages'));
        await ecrireFiche(ref, { ...data, statut: 'active', pnj: categorieDeFiche(detail.fiche), proprietaire: '', proprietaireNom: '', commentaireConteur: '', creeLe: fs.serverTimestamp() }, detail, { creation: true });
        proteger(false);
        avisApresNavigation = 'Fiche de type « ' + detail.fiche.typeFiche + ' » : elle appartient au rôle conteur (onglet « PNJ et antagonistes »). Choisissez-lui un interprète si besoin.';
        location.hash = 'fiche-' + ref.id;
        return;
      }
      if (nouvelle) {
        const ref = fs.doc(fs.collection(db, 'personnages'));
        await ecrireFiche(ref, {
          ...data, statut: 'brouillon', proprietaire: uid, proprietaireNom: session.profil.nom,
          commentaireConteur: '', creeLe: fs.serverTimestamp()
        }, detail, { creation: true });
        if (statut === 'soumise') await fs.updateDoc(ref, { statut: 'soumise', majLe: fs.serverTimestamp() });
        proteger(false);
        avisApresNavigation = texteOk || 'Fiche enregistrée.';
        location.hash = 'fiche-' + ref.id;
        return;
      } else {
        const ref = fs.doc(db, 'personnages', d.id);
        // Fiche d'un joueur passée en type « Antagoniste » (ou autre) : elle passe au rôle conteur.
        const versConteurs = conteur && !!d.proprietaire && !estTypeJoueur(detail.fiche.typeFiche);
        if (versConteurs) {
          if (!(await reglesRecentes())) throw new Error('Pour passer cette fiche aux conteurs, republiez d\'abord les règles Firestore (firebase/firestore.rules).');
          if (!confirmer('« ' + data.nom + ' » est de type « ' + detail.fiche.typeFiche + ' » : la fiche passe au rôle conteur (onglet « PNJ et antagonistes »). '
            + 'Elle n\'appartiendra plus à ' + (d.proprietaireNom || 'son joueur') + ', qui en devient l\'interprète (vous pourrez en changer). Continuer ?')) {
            message(msg, 'Enregistrement annulé.', 'info'); reactiver(); return;
          }
          // Prévenir le joueur avant le transfert (les règles vérifient qu'il est encore le propriétaire).
          if (d.proprietaire !== uid) {
            try {
              await fs.addDoc(fs.collection(db, 'notifications'), {
                type: 'fiche', destinataire: d.proprietaire, auteur: uid, auteurNom: session.profil.nom,
                personnage: d.id, personnageNom: d.nom || data.nom, statut: 'antagoniste',
                message: compresser(((commentaire.value.trim() ? commentaire.value.trim() + '\n\n' : '')
                  + 'Ce personnage devient un antagoniste : il appartient désormais aux conteurs, et vous en êtes l\'interprète.').slice(0, 2000)),
                creeLe: fs.serverTimestamp()
              });
            } catch (e) { console.warn('Notification non envoyée', e); }
          }
          await ecrireFiche(ref, {
            ...data, statut: statut === 'archivee' ? 'archivee' : 'active', pnj: categorieDeFiche(detail.fiche),
            proprietaire: '', proprietaireNom: '', interprete: d.proprietaire, interpreteNom: String(d.proprietaireNom || '').slice(0, 80), commentaireConteur: ''
          }, detail, { ancienFormat: d.ancienFormat });
          // Répertoire : le personnage reste joué par son interprète (l'ancien joueur).
          await majRepertoire({ id: d.id, nom: data.nom, proprietaire: '', interprete: d.proprietaire, statut: statut === 'archivee' ? 'archivee' : 'active' }, undefined);
          avert = await transmettreMysteres(d.id, detail.fiche);
          proteger(false);
          await route();
          message(document.querySelector('#cam-fiches .cam-msg') || msg, 'Fiche passée aux conteurs ; ' + (d.proprietaireNom || 'le joueur') + ' en est l\'interprète.' + avert, avert ? 'err' : 'ok');
          return;
        }
        if (conteur) {
          const changement = d.statut !== statut;
          const extra = { commentaireConteur: compresser(commentaire.value) };
          if ((statut === 'validee' || statut === 'active') && changement) {
            extra.validePar = uid; extra.valideLe = fs.serverTimestamp();
            // Fiche validée : le message n'a plus à rester sur la fiche (il part dans la notification).
            extra.commentaireConteur = '';
          }
          if (proprio) extra.proprietaireNom = session.profil.nom;
          await ecrireFiche(ref, { ...data, ...extra }, detail, { ancienFormat: d.ancienFormat });
          avert = await enregistrerReference(d.id, statut, detail.fiche, data.xp);
          // Répertoire des personnages validés (partage des tableaux d'enquête).
          if (estIncarnable(d) || estIncarnable({ statut })) {
            await majRepertoire({ id: d.id, nom: data.nom, proprietaire: d.proprietaire, statut }, estIncarnable(d) ? undefined : null);
          }
          // Résultat de la demande de validation : notification au joueur, avec le message du conteur.
          if (changement && ['validee', 'active', 'refusee', 'archivee'].includes(statut) && d.proprietaire !== uid) {
            try {
              await fs.addDoc(fs.collection(db, 'notifications'), {
                type: 'fiche', destinataire: d.proprietaire, auteur: uid, auteurNom: session.profil.nom,
                personnage: d.id, personnageNom: data.nom, statut,
                message: compresser(commentaire.value.trim().slice(0, 2000)), creeLe: fs.serverTimestamp()
              });
            } catch (e) { console.warn('Notification non envoyée', e); }
          }
        } else {
          await ecrireFiche(ref, { ...data, proprietaireNom: session.profil.nom }, detail, { ancienFormat: d.ancienFormat });
        }
        proteger(false);
        await route();
      }
      message(document.querySelector('#cam-fiches .cam-msg.global') || msg, (texteOk || 'Fiche enregistrée.') + avert, avert ? 'err' : 'ok');
    } catch (e) {
      console.error(e);
      message(msg, messageErreur(e), 'err');
      reactiver();
    }
  }

  const bouton = (texte, fn, cls) => h('button', { type: 'button', class: cls || '', onclick: fn }, texte);
  if (estPnj) {
    const archive = d.statut === 'archivee';
    actions.append(
      bouton(nouvelle ? 'Créer le PNJ' : 'Enregistrer', () => enregistrer(archive ? 'archivee' : 'active', nouvelle ? 'PNJ créé.' : 'PNJ enregistré.')),
      !nouvelle ? (archive
        ? bouton('Réactiver', () => enregistrer('active', 'PNJ réactivé.'), 'ok')
        : bouton('Archiver', () => confirmer('Archiver ce PNJ ? Il ne sera plus proposé (il reste consultable dans les archives).') && enregistrer('archivee', 'PNJ archivé.'), 'secondaire')) : '');
  } else if (modifiable) {
    if (conteur && !nouvelle) {
      const avertirActive = () => {
        const autres = toutes.concat(mesFiches).filter((x) => x.proprietaire === d.proprietaire && x.statut === 'active' && x.id !== d.id);
        return !autres.length || confirmer('Ce joueur a déjà un personnage en jeu (' + autres.map((x) => x.nom).join(', ') + '). Mettre aussi celui-ci en jeu ?');
      };
      actions.append(
        bouton('Enregistrer', () => enregistrer(d.statut)),
        d.statut !== 'validee' ? bouton('Valider (en réserve)', () => enregistrer('validee', 'Fiche validée.'), 'ok') : '',
        d.statut !== 'active' ? bouton('Mettre en jeu', () => avertirActive() && enregistrer('active', 'Personnage mis en jeu.'), 'ok') : '',
        d.statut !== 'refusee' ? bouton('Renvoyer au joueur', () => {
          if (!commentaire.value.trim()) { message(msg, 'Expliquez dans le commentaire ce qu\'il faut corriger.', 'err'); commentaire.focus(); return; }
          enregistrer('refusee', 'Fiche renvoyée au joueur.');
        }, 'secondaire') : '',
        d.statut !== 'archivee' ? bouton('Archiver', () => confirmer('Archiver cette fiche ?') && enregistrer('archivee', 'Fiche archivée.'), 'secondaire') : '',
        d.statut !== 'brouillon' ? bouton('Repasser en brouillon', () => enregistrer('brouillon'), 'secondaire') : '');
    } else if (nouvelle || d.statut !== 'soumise') {
      actions.append(
        bouton('Enregistrer le brouillon', () => enregistrer('brouillon')),
        bouton('Enregistrer et soumettre au conteur', () => enregistrer('soumise', 'Fiche soumise : un conteur va la relire.'), 'ok'));
    } else {
      actions.append(
        bouton('Enregistrer', () => enregistrer('soumise')),
        bouton('Retirer la soumission', () => enregistrer('brouillon', 'Soumission retirée.'), 'secondaire'));
    }
  }
  actions.append(bouton('🖨 Aperçu avant impression', apercu, 'secondaire'));
  if (!nouvelle) {
    // Conteur : ajouter ce personnage au combat en cours (gardé dans ce navigateur).
    if (conteur && d.statut !== 'archivee') {
      actions.append(bouton('⚔ Ajouter au combat', () => {
        const p = participantDeFiche({ id: d.id, nom: editeur.lireFiche().nom || d.nom, pnj: estPnj ? categoriePnj : '' }, editeur.lireFiche());
        const r = ajouterAuCombat(uid, p);
        const lien = h('a', { href: '/membres/combat/', target: '_blank', rel: 'noopener' }, 'Ouvrir le combat');
        msg.className = 'cam-msg ' + (r.deja ? 'info' : 'ok');
        msg.replaceChildren(r.deja ? 'Déjà dans le combat. ' : (r.nouveau ? 'Combat créé, ' + p.nom + ' y entre (initiative ' + p.init + '). '
          : p.nom + ' rejoint le combat ' + (r.arrive > r.tour ? 'au début du prochain tour' : 'dès ce tour') + ' (initiative ' + p.init + '). '), lien);
      }, 'secondaire'));
    }
    actions.append(bouton('Exporter en JSON', () => exporter({ ...d, fiche: editeur.lireFiche() }).catch((e) => message(msg, messageErreur(e), 'err')), 'secondaire'));
    if (estPnj) {
      actions.append(bouton('Dupliquer', async () => {
        try {
          const ref = fs.doc(fs.collection(db, 'personnages'));
          const { data, detail } = await construire('active');
          data.nom = detail.fiche.nom = (data.nom + ' (copie)').slice(0, 80);
          await ecrireFiche(ref, { ...data, proprietaire: '', proprietaireNom: '', commentaireConteur: '', creeLe: fs.serverTimestamp() }, detail, { creation: true });
          proteger(false);
          location.hash = 'fiche-' + ref.id;
        } catch (e) { message(msg, messageErreur(e), 'err'); }
      }, 'secondaire'));
    }
    if (proprio) {
      actions.append(bouton('Dupliquer', async () => {
        try {
          const ref = fs.doc(fs.collection(db, 'personnages'));
          const { data, detail } = await construire('brouillon');
          data.nom = detail.fiche.nom = (data.nom + ' (copie)').slice(0, 80);
          await ecrireFiche(ref, { ...data, proprietaire: uid, proprietaireNom: session.profil.nom, commentaireConteur: '', creeLe: fs.serverTimestamp() }, detail, { creation: true });
          proteger(false);
          location.hash = 'fiche-' + ref.id;
        } catch (e) { message(msg, messageErreur(e), 'err'); }
      }, 'secondaire'));
    }
    if (!modifiable && proprio) actions.append(bouton('Demander une modification', () => demanderModification(d), 'secondaire'));
    if (conteur || (proprio && ['brouillon', 'refusee'].includes(d.statut))) {
      actions.append(bouton('Supprimer', async () => {
        if (!confirmer('Supprimer définitivement la fiche « ' + d.nom + ' » ?')) return;
        try {
          const lot = fs.writeBatch(db);
          lot.delete(fs.doc(db, 'personnages', d.id));
          lot.delete(refDetail(d.id));
          if (!estPnj) { lot.delete(refValide(d.id)); lot.delete(refMysteres(d.id)); }
          await lot.commit();
          if (estIncarnable(d) && joueurDe(d)) await majRepertoire({ ...d, statut: 'archivee' }, undefined);
          proteger(false); retourListe();
        } catch (e) { message(msg, messageErreur(e), 'err'); }
      }, 'danger'));
    }
  }

  // --- Mise en page ---
  const statutTag = estPnj || jInterprete
    ? h('span', { class: 'cam-tag ' + (d.statut === 'archivee' ? 'archivee' : 'conteur') }, nouvelle ? 'Nouveau PNJ' : (estTypeJoueur(d.typeFiche) ? 'PNJ' : d.typeFiche) + ' · ' + (STATUTS_PNJ[d.statut] || d.statut))
    : h('span', { class: 'cam-tag ' + (d.statut || 'brouillon') }, nouvelle ? 'Nouvelle fiche' : (STATUTS_FICHE[d.statut] || d.statut));
  // PNJ : catégorie modifiable dans l'en-tête
  const choixCategorie = estPnj ? options(h('select', {
    'aria-label': 'Catégorie du PNJ',
    onchange: (e) => { categoriePnj = e.target.value; if (!modifie) { modifie = true; proteger(true); } }
  }), Object.entries(CATEGORIES_PNJ), categoriePnj) : null;
  // Interprète (PNJ / antagoniste) : un compte de l'annuaire, modifiable par les conteurs.
  const choixInterprete = estPnj ? h('select', { 'aria-label': 'Interprète', class: 'cam-interprete' }) : null;
  if (choixInterprete) {
    let comptes = {};
    const remplir = () => {
      const liste = Object.entries(comptes).map(([id, c]) => [id, (c.nom || '?') + (c.role && c.role !== 'joueur' ? ' (' + c.role + ')' : '')])
        .sort((a, b) => a[1].localeCompare(b[1], 'fr'));
      if (interprete.uid && !comptes[interprete.uid]) liste.unshift([interprete.uid, (interprete.nom || '?') + (Object.keys(comptes).length ? ' (compte introuvable)' : '')]);
      options(choixInterprete, liste, interprete.uid, 'Aucun interprète');
    };
    remplir();
    annuaire().then((a) => { comptes = a.comptes || {}; remplir(); }).catch((e) => console.warn('Annuaire illisible', e));
    choixInterprete.addEventListener('change', () => {
      const id = choixInterprete.value;
      interprete = { uid: id, nom: id ? ((comptes[id] && comptes[id].nom) || interprete.nom || '') : '' };
      if (!modifie) { modifie = true; proteger(true); }
    });
  }
  racine.replaceChildren(
    h('p', {}, h('a', { href: '#', onclick: (e) => { e.preventDefault(); if (!modifie || confirmer('Quitter sans enregistrer les modifications ?')) { proteger(false); if (estPnj) location.hash = 'pnj'; else retourListe(); } } }, estPnj ? '← Retour aux PNJ' : '← Retour aux fiches')),
    h('div', { class: 'cam-msg global' }),
    avis ? h('div', { class: 'cam-encart' }, avis) : '',
    jInterprete ? h('div', { class: 'cam-encart' }, 'Vous interprétez ce personnage. Il appartient aux conteurs, qui le gèrent : sa fiche est en lecture seule.')
      : !modifiable ? h('div', { class: 'cam-encart' }, 'Cette fiche est « ' + (STATUTS_FICHE[d.statut] || d.statut) + ' » : seuls les conteurs peuvent la modifier. Utilisez « Demander une modification » si besoin.') : '',
    estPnj && nouvelle ? h('div', { class: 'cam-encart' }, 'Nouveau PNJ (' + (CATEGORIES_PNJ[categoriePnj] || categoriePnj) + ') : la fiche est pré-remplie, complétez-la puis « Créer le PNJ ». Les attributs Physique et Mental donnent son initiative au combat, sa Célérité ses actions supplémentaires.') : '',
    d.statut === 'refusee' && d.commentaireConteur && !conteur ? h('div', { class: 'cam-encart alerte' }, 'À corriger : ', d.commentaireConteur) : '',
    h('div', { class: 'cam-bloc fiche-entete' },
      h('div', { class: 'cam-entete-fiche' },
        h('div', {}, cadrePortrait,
          modifiable ? h('div', { class: 'cam-actions' },
            h('button', { type: 'button', class: 'petit secondaire', onclick: () => fichierPortrait.click() }, 'Choisir une image'),
            portraitRef || d.portrait ? h('button', { type: 'button', class: 'petit secondaire', onclick: () => { portraitRef = ''; dessinerPortrait(); modifie = true; proteger(true); } }, 'Retirer') : '',
            fichierPortrait) : '',
          msgPortrait),
        h('div', { class: 'champs' },
          h('h2', {}, titre, ' ', statutTag),
          resumeEntete,
          estPnj ? h('div', { class: 'cam-ligne-pnj' }, h('label', {}, 'Catégorie du PNJ'), choixCategorie) : '',
          estPnj ? h('div', { class: 'cam-ligne-pnj' }, h('label', {}, 'Interprète'), choixInterprete,
            h('small', { class: 'sous-titre' }, 'Le joueur qui le joue : il voit la fiche (et ses mystères), sans la modifier.')) : '',
          jInterprete ? h('p', { class: 'sous-titre' }, 'Interprète : vous') : '',
          conteur && !proprio && !estPnj ? h('p', { class: 'sous-titre' }, 'Joueur : ' + (d.proprietaireNom || '?')) : '',
          d.validePar && d.valideLe ? h('p', { class: 'sous-titre' }, 'Validée le ' + dateFr(d.valideLe)) : '',
          h('p', { class: 'sous-titre' }, 'Cliquez sur « ⓘ » pour lire la description d\'un élément dans les règles MET.')))),
    zoneRecap,
    editeur.el,
    h('details', { class: 'cam-bloc' },
      h('summary', {}, h('strong', {}, 'Données complémentaires (JSON)')),
      h('p', { class: 'sous-titre' }, 'Pour stocker des informations venant d\'un autre outil. Les images en base64 sont enregistrées à part et remplacées par des références « img:… ».'),
      zoneJson, galerie,
      modifiable ? h('div', { class: 'cam-actions' }, h('button', { type: 'button', class: 'petit secondaire', onclick: () => fichierJson.click() }, 'Charger un fichier JSON'), fichierJson) : '',
      msgJson),
    estPnj ? '' : h('div', { class: 'cam-bloc' },
      h('h3', {}, conteur ? 'Message au joueur' : 'Commentaire du conteur'),
      conteur ? h('p', { class: 'sous-titre' }, 'Envoyé dans les notifications du joueur avec le résultat (validation, mise en jeu, renvoi, archivage). Il est effacé de la fiche une fois celle-ci validée.') : '',
      commentaire),
    h('div', { class: 'fiche-actions' }, actions, msg));
  dessinerRecap();
}

// Demande de modification d'une fiche validée : crée un ticket pour les conteurs.
function demanderModification(f) {
  const sujet = h('input', { type: 'text', maxlength: 150, value: 'Modification de fiche : ' + f.nom });
  const description = h('textarea', { maxlength: 6000, placeholder: 'Décrivez précisément la modification souhaitée.' });
  const msg = h('div', { class: 'cam-msg' });
  const fond = h('div', { class: 'cam-modal-fond cam-app' });
  const fermer = () => fond.remove();
  fond.append(h('div', { class: 'cam-modal' },
    h('h2', {}, 'Demander une modification'),
    h('label', {}, 'Sujet'), sujet, h('label', {}, 'Description'), description,
    h('div', { class: 'cam-actions' },
      h('button', {
        type: 'button', onclick: async () => {
          if (!description.value.trim()) { message(msg, 'Décrivez la modification.', 'err'); return; }
          try {
            await fs.addDoc(fs.collection(db, 'tickets'), {
              proprietaire: session.user.uid, proprietaireNom: session.profil.nom,
              personnageId: f.id, personnageNom: f.nom, categorie: 'Modification de fiche',
              sujet: sujet.value.trim() || 'Modification de fiche', description: compresser(description.value.trim()),
              statut: 'En attente', resultat: '', creeLe: fs.serverTimestamp()
            });
            message(msg, 'Demande envoyée. Suivez-la dans la page Tickets (espace membres).', 'ok');
            setTimeout(fermer, 1500);
          } catch (e) { message(msg, messageErreur(e), 'err'); }
        }
      }, 'Envoyer'),
      h('button', { type: 'button', class: 'secondaire', onclick: fermer }, 'Annuler')),
    msg));
  fond.addEventListener('click', (e) => { if (e.target === fond) fermer(); });
  document.body.append(fond);
}
