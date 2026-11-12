// Page /membres/fiches/ : fiches de personnage MET (plusieurs par joueur),
// circuit de validation par les conteurs.
import {
  h, db, fs, pageProtegee, barreMembre, estConteur, message, messageErreur, dateFr, millis,
  onglets, confirmer, options, telecharger
} from '../core.js';
import {
  compresserFichier, enregistrerImage, baliseImage, externaliser, internaliser, collecterRefs
} from '../images.js';
import { STATUTS_FICHE, STATUTS_FICHE_EDITABLES } from '../donnees.js';
import { majRepertoire, estIncarnable } from '../incarnation.js';
import { creerEditeur } from '../fiche/editeur.js';
import { ficheVide as ficheMetVide, normaliser } from '../fiche/modele.js';
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
let toutes = [];

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
  const snap = await fs.getDocs(fs.query(fs.collection(db, 'personnages'), fs.where('proprietaire', '==', session.user.uid)));
  mesFiches = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => millis(b.majLe) - millis(a.majLe));
}
async function chargerToutes() {
  if (!conteur) return;
  const snap = await fs.getDocs(fs.collection(db, 'personnages'));
  toutes = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.proprietaireNom || '').localeCompare(b.proprietaireNom || '') || (a.nom || '').localeCompare(b.nom || ''));
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
      afficherEditeur({ id, ...snap.data() }, null, avis);
    } else if (hash === 'nouvelle') {
      afficherEditeur(null);
    } else {
      await chargerMesFiches();
      await chargerToutes();
      if (perimee()) return;
      afficherListes(hash === 'a-valider' ? 'a-valider' : (hash === 'toutes' ? 'toutes' : 'mes'));
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
  return h('div', { class: 'cam-fiche-carte', onclick: () => { location.hash = 'fiche-' + f.id; } },
    h('div', { class: 'vignette' }, f.portrait ? baliseImage(f.portrait, { alt: '' }) : '☾'),
    h('div', {},
      h('strong', {}, f.nom || 'Sans nom'),
      h('small', {}, [f.clan, f.secte, f.generation ? f.generation + 'e gén.' : ''].filter(Boolean).join(' · ') || '—'),
      f.xp ? h('small', {}, 'PX : ' + f.xp.acquise + ' acquis · ' + f.xp.restante + ' restants') : '',
      avecJoueur ? h('small', {}, 'Joueur : ' + (f.proprietaireNom || '?')) : '',
      h('span', { class: 'cam-tag ' + f.statut }, STATUTS_FICHE[f.statut] || f.statut),
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
      const { fiche, version } = await lireFicheExcel(f);
      message(msgImport, '');
      afficherEditeur(null, { ...documentVide(), nom: fiche.nom, fiche },
        'Fiche importée depuis Excel' + (version ? ' (' + version + ')' : '') + ' : vérifiez-la puis enregistrez.');
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
    h('div', { style: 'margin-top:1rem' }, grille(mesFiches, false, 'Aucune fiche pour l\'instant.')));

  if (!conteur) { racine.replaceChildren(mes); mes.classList.add('actif'); return; }

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
      h('button', { type: 'button', dataset: { onglet: 'toutes' } }, 'Toutes les fiches')),
    mes,
    h('div', { dataset: { panneau: 'a-valider' } },
      h('p', { class: 'sous-titre' }, 'Fiches soumises par les joueurs, de la plus ancienne à la plus récente.'),
      grille(soumises, true, 'Aucune fiche en attente de validation.')),
    h('div', { dataset: { panneau: 'toutes' } },
      h('div', { class: 'cam-ligne' }, h('div', {}, h('label', {}, 'Statut'), filtreStatut), h('div', {}, h('label', {}, 'Recherche'), recherche)),
      zoneToutes));
  racine.replaceChildren(bloc);
  onglets(bloc, (nom) => { history.replaceState(null, '', nom === 'mes' ? location.pathname : '#' + nom); })(ongletInitial);
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
  (d.specsGotha || []).slice(0, 10).forEach((x, i) => { f.historiques.gotha.specialisations[i] = x; });
  (d.specsPegre || []).slice(0, 10).forEach((x, i) => { f.historiques.pegre.specialisations[i] = x; });
  return f;
}

/** Champs recopiés de la fiche au premier niveau du document (listes, influences, règles). */
function champsDerives(f, R) {
  const entier = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : 0; };
  const borne = (v) => Math.max(0, Math.min(10, entier(v)));
  const specs = (l) => l.map((x) => String(x || '').trim().slice(0, 80)).filter(Boolean).slice(0, 10);
  const g = parseInt(f.generation, 10);
  return {
    schema: 2, nom: f.nom, clan: f.clan, secte: f.secte,
    race: String(f.race || '').slice(0, 30), age: String(f.age || '').slice(0, 30), typeFiche: String(f.typeFiche || '').slice(0, 40),
    generation: Number.isInteger(g) && g >= 3 && g <= 16 ? g : null,
    niveauGotha: borne(f.historiques.gotha.niveau), specsGotha: specs(f.historiques.gotha.specialisations),
    niveauPegre: borne(f.historiques.pegre.niveau), specsPegre: specs(f.historiques.pegre.specialisations),
    xp: { acquise: R.xp.acquise, depensee: R.xp.depensee, restante: R.xp.restante },
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
  const proprio = nouvelle || d.proprietaire === uid;
  const modifiable = conteur || (proprio && (nouvelle || STATUTS_FICHE_EDITABLES.includes(d.statut)));
  const dis = !modifiable;
  let portraitRef = d.portrait || '';
  let modifie = !!preRemplie;
  proteger(false);

  // --- Fiche MET ---
  const resumeEntete = h('p', { class: 'sous-titre fiche-resume-entete' });
  const titre = h('span', {});
  const editeur = creerEditeur({
    fiche: ficheDuDocument(d), modifiable,
    surModification: () => { if (!modifie) { modifie = true; proteger(true); } majEntete(); },
  });
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
  const commentaire = h('textarea', { disabled: !conteur, maxlength: 4000, placeholder: conteur ? 'Visible par le joueur.' : '' }, d.commentaireConteur || '');

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
    const data = { ...champsDerives(f, R), fiche: f, portrait: portraitRef, contenuJson, statut, majLe: fs.serverTimestamp() };
    const taille = new Blob([JSON.stringify(data)]).size;
    if (taille > LIMITE_DOC) throw new Error('Fiche trop volumineuse (' + Math.round(taille / 1024) + ' Ko) : raccourcissez les textes ou les données complémentaires.');
    return data;
  }

  async function enregistrer(statut, texteOk) {
    message(msg, 'Enregistrement…', 'info');
    actions.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    try {
      const data = await construire(statut);
      if (nouvelle) {
        const ref = fs.doc(fs.collection(db, 'personnages'));
        await fs.setDoc(ref, {
          ...data, statut: 'brouillon', proprietaire: uid, proprietaireNom: session.profil.nom,
          commentaireConteur: '', creeLe: fs.serverTimestamp()
        });
        if (statut === 'soumise') await fs.updateDoc(ref, { statut: 'soumise', majLe: fs.serverTimestamp() });
        proteger(false);
        avisApresNavigation = texteOk || 'Fiche enregistrée.';
        location.hash = 'fiche-' + ref.id;
        return;
      } else {
        const ref = fs.doc(db, 'personnages', d.id);
        if (conteur) {
          const extra = { commentaireConteur: commentaire.value };
          if ((statut === 'validee' || statut === 'active') && d.statut !== statut) { extra.validePar = uid; extra.valideLe = fs.serverTimestamp(); }
          if (proprio) extra.proprietaireNom = session.profil.nom;
          await fs.updateDoc(ref, { ...data, ...extra });
          // Répertoire des personnages validés (partage des tableaux d'enquête).
          if (estIncarnable(d) || estIncarnable({ statut })) {
            await majRepertoire({ id: d.id, nom: data.nom, proprietaire: d.proprietaire, statut }, estIncarnable(d) ? undefined : null);
          }
        } else {
          await fs.updateDoc(ref, { ...data, proprietaireNom: session.profil.nom });
        }
        proteger(false);
        await route();
      }
      message(document.querySelector('#cam-fiches .cam-msg.global') || msg, texteOk || 'Fiche enregistrée.', 'ok');
    } catch (e) {
      console.error(e);
      message(msg, messageErreur(e), 'err');
      actions.querySelectorAll('button').forEach((b) => { b.disabled = false; });
    }
  }

  const bouton = (texte, fn, cls) => h('button', { type: 'button', class: cls || '', onclick: fn }, texte);
  if (modifiable) {
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
  if (!nouvelle) {
    actions.append(bouton('Exporter en JSON', () => exporter({ ...d, fiche: editeur.lireFiche() }).catch((e) => message(msg, messageErreur(e), 'err')), 'secondaire'));
    if (proprio) {
      actions.append(bouton('Dupliquer', async () => {
        try {
          const ref = fs.doc(fs.collection(db, 'personnages'));
          const data = await construire('brouillon');
          data.nom = data.fiche.nom = (data.nom + ' (copie)').slice(0, 80);
          await fs.setDoc(ref, { ...data, proprietaire: uid, proprietaireNom: session.profil.nom, commentaireConteur: '', creeLe: fs.serverTimestamp() });
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
          await fs.deleteDoc(fs.doc(db, 'personnages', d.id));
          if (estIncarnable(d)) await majRepertoire({ ...d, statut: 'archivee' }, undefined);
          proteger(false); retourListe();
        } catch (e) { message(msg, messageErreur(e), 'err'); }
      }, 'danger'));
    }
  }

  // --- Mise en page ---
  const statutTag = h('span', { class: 'cam-tag ' + (d.statut || 'brouillon') }, nouvelle ? 'Nouvelle fiche' : (STATUTS_FICHE[d.statut] || d.statut));
  racine.replaceChildren(
    h('p', {}, h('a', { href: '#', onclick: (e) => { e.preventDefault(); if (!modifie || confirmer('Quitter sans enregistrer les modifications ?')) { proteger(false); retourListe(); } } }, '← Retour aux fiches')),
    h('div', { class: 'cam-msg global' }),
    avis ? h('div', { class: 'cam-encart' }, avis) : '',
    !modifiable ? h('div', { class: 'cam-encart' }, 'Cette fiche est « ' + (STATUTS_FICHE[d.statut] || d.statut) + ' » : seuls les conteurs peuvent la modifier. Utilisez « Demander une modification » si besoin.') : '',
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
          conteur && !proprio ? h('p', { class: 'sous-titre' }, 'Joueur : ' + (d.proprietaireNom || '?')) : '',
          d.validePar && d.valideLe ? h('p', { class: 'sous-titre' }, 'Validée le ' + dateFr(d.valideLe)) : '',
          h('p', { class: 'sous-titre' }, 'Cliquez sur « ⓘ » pour lire la description d\'un élément dans les règles MET.')))),
    editeur.el,
    h('details', { class: 'cam-bloc' },
      h('summary', {}, h('strong', {}, 'Données complémentaires (JSON)')),
      h('p', { class: 'sous-titre' }, 'Pour stocker des informations venant d\'un autre outil. Les images en base64 sont enregistrées à part et remplacées par des références « img:… ».'),
      zoneJson, galerie,
      modifiable ? h('div', { class: 'cam-actions' }, h('button', { type: 'button', class: 'petit secondaire', onclick: () => fichierJson.click() }, 'Charger un fichier JSON'), fichierJson) : '',
      msgJson),
    h('div', { class: 'cam-bloc' },
      h('h3', {}, 'Commentaire du conteur'),
      commentaire),
    h('div', { class: 'fiche-actions' }, actions, msg));
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
              sujet: sujet.value.trim() || 'Modification de fiche', description: description.value.trim(),
              statut: 'En attente', resultat: '', creeLe: fs.serverTimestamp()
            });
            message(msg, 'Demande envoyée. Suivez-la dans Influences > Tickets.', 'ok');
            setTimeout(fermer, 1500);
          } catch (e) { message(msg, messageErreur(e), 'err'); }
        }
      }, 'Envoyer'),
      h('button', { type: 'button', class: 'secondaire', onclick: fermer }, 'Annuler')),
    msg));
  fond.addEventListener('click', (e) => { if (e.target === fond) fermer(); });
  document.body.append(fond);
}
