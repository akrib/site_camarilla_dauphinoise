// Page /membres/comptes/ : validation des inscriptions, rôles, maintenance.
import {
  h, db, fs, pageProtegee, barreMembre, estAdmin, ROLES, STATUTS_COMPTE,
  message, messageErreur, dateFr, millis, onglets, confirmer, options
} from '../core.js';
import { collecterRefs } from '../images.js';

const racine = document.getElementById('cam-comptes');
barreMembre(document.getElementById('cam-barre'));

pageProtegee(racine, 'conteur', async ({ user, profil }) => {
  const admin = estAdmin(profil);
  const msg = h('div', { class: 'cam-msg' });
  const corpsAttente = h('tbody');
  const corpsTous = h('tbody');
  const filtre = h('input', { type: 'search', placeholder: 'Filtrer par nom ou email…' });
  const compteurAttente = h('span');

  const bloc = h('div', {},
    h('div', { class: 'cam-onglets' },
      h('button', { type: 'button', dataset: { onglet: 'attente' } }, 'En attente ', compteurAttente),
      h('button', { type: 'button', dataset: { onglet: 'tous' } }, 'Tous les comptes'),
      admin ? h('button', { type: 'button', dataset: { onglet: 'referentiel' } }, 'Référentiel des règles') : '',
      admin ? h('button', { type: 'button', dataset: { onglet: 'maintenance' } }, 'Maintenance') : ''),
    h('div', { dataset: { panneau: 'attente' } },
      h('p', { class: 'sous-titre' }, 'Vérifiez que la personne est bien membre de l\'association avant d\'activer son compte.'),
      h('div', { class: 'cam-table-defil' }, h('table', { class: 'cam-table' },
        h('thead', {}, h('tr', {}, ['Nom', 'Email', 'Inscription', ''].map((t) => h('th', {}, t)))),
        corpsAttente))),
    h('div', { dataset: { panneau: 'tous' } },
      filtre,
      h('div', { class: 'cam-table-defil' }, h('table', { class: 'cam-table' },
        h('thead', {}, h('tr', {}, ['Nom', 'Email', 'Rôle', 'Statut', 'Inscription', ''].map((t) => h('th', {}, t)))),
        corpsTous))),
    admin ? panneauReferentiel(user) : '',
    admin ? panneauMaintenance() : '',
    msg);
  racine.append(bloc);
  onglets(bloc)('attente');

  let comptes = [];
  let annuaireVerifie = false;

  async function charger() {
    try {
      const snap = await fs.getDocs(fs.collection(db, 'utilisateurs'));
      comptes = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => millis(b.creeLe) - millis(a.creeLe));
      dessiner();
      if (!annuaireVerifie) { annuaireVerifie = true; verifierAnnuaire(); }
    } catch (e) { message(msg, messageErreur(e), 'err'); }
  }

  async function modifier(c, champs, libelle) {
    try {
      await fs.updateDoc(fs.doc(db, 'utilisateurs', c.id), { ...champs, majLe: fs.serverTimestamp(), validePar: user.uid });
      message(msg, libelle + ' : ' + c.nom, 'ok');
      await majAnnuaire({ ...c, ...champs });
      await charger();
    } catch (e) { message(msg, messageErreur(e), 'err'); }
  }

  // L'annuaire (nom + rôle des comptes actifs) sert à choisir avec qui
  // partager un tableau d'enquête. Un compte y figure dès son activation,
  // sans attendre que la personne se reconnecte, et en sort s'il est suspendu.
  async function majAnnuaire(c, actuel) {
    const ref = fs.doc(db, 'annuaire', c.id);
    try {
      if (c.statut === 'actif') {
        if (!actuel || actuel.nom !== c.nom || actuel.role !== c.role) await fs.setDoc(ref, { nom: c.nom, role: c.role });
      } else if (actuel !== null) {
        await fs.deleteDoc(ref);
      }
    } catch (e) { console.warn('Annuaire non mis à jour pour ' + c.nom, e); }
  }

  // Remet l'annuaire en accord avec les comptes (une fois par visite de la page).
  async function verifierAnnuaire() {
    try {
      const snap = await fs.getDocs(fs.collection(db, 'annuaire'));
      const presents = new Map(snap.docs.map((d) => [d.id, d.data()]));
      for (const c of comptes) {
        const actuel = presents.has(c.id) ? presents.get(c.id) : null;
        const voulu = c.statut === 'actif';
        if (voulu ? (!actuel || actuel.nom !== c.nom || actuel.role !== c.role) : actuel !== null) await majAnnuaire(c, actuel);
        presents.delete(c.id);
      }
      for (const id of presents.keys()) await fs.deleteDoc(fs.doc(db, 'annuaire', id));   // comptes supprimés
    } catch (e) { console.warn('Vérification de l\'annuaire impossible', e); }
  }

  // Un conteur gère les joueurs ; un admin gère tout le monde sauf lui-même.
  const gerable = (c) => c.id !== user.uid && (admin || c.role === 'joueur');

  function boutonsStatut(c) {
    if (!gerable(c)) return [];
    const b = [];
    if (c.statut !== 'actif') b.push(h('button', { type: 'button', class: 'petit ok', onclick: () => modifier(c, { statut: 'actif' }, 'Compte activé') }, 'Activer'));
    if (c.statut !== 'suspendu') b.push(h('button', { type: 'button', class: 'petit danger', onclick: () => confirmer('Suspendre le compte de ' + c.nom + ' ?') && modifier(c, { statut: 'suspendu' }, 'Compte suspendu') }, 'Suspendre'));
    return b;
  }

  function choixRole(c) {
    if (!admin || c.id === user.uid) return h('span', { class: 'cam-tag ' + c.role }, ROLES[c.role] || c.role);
    const sel = options(h('select', { style: 'min-width:9rem' }), Object.entries(ROLES), c.role);
    sel.addEventListener('change', () => {
      if (confirmer('Donner le rôle « ' + ROLES[sel.value] + ' » à ' + c.nom + ' ?')) modifier(c, { role: sel.value }, 'Rôle modifié');
      else sel.value = c.role;
    });
    return sel;
  }

  function dessiner() {
    const attente = comptes.filter((c) => c.statut === 'en_attente');
    compteurAttente.textContent = attente.length ? '(' + attente.length + ')' : '';
    corpsAttente.replaceChildren(...(attente.length ? attente.map((c) => h('tr', {},
      h('td', {}, c.nom), h('td', {}, c.email), h('td', {}, dateFr(c.creeLe, true)),
      h('td', {}, ...boutonsStatut(c)))) : [h('tr', {}, h('td', { colspan: 4 }, 'Aucune inscription en attente.'))]));

    const f = filtre.value.trim().toLowerCase();
    const liste = comptes.filter((c) => !f || (c.nom || '').toLowerCase().includes(f) || (c.email || '').toLowerCase().includes(f));
    corpsTous.replaceChildren(...liste.map((c) => h('tr', {},
      h('td', {}, c.nom, c.id === user.uid ? ' (vous)' : ''), h('td', {}, c.email),
      h('td', {}, choixRole(c)),
      h('td', {}, h('span', { class: 'cam-tag ' + c.statut }, STATUTS_COMPTE[c.statut] || c.statut)),
      h('td', {}, dateFr(c.creeLe)),
      h('td', {}, ...boutonsStatut(c)))));
  }
  filtre.addEventListener('input', dessiner);

  await charger();
});

// ---------------------------------------------------------------------
// Maintenance (admin) : espace utilisé par les images, nettoyage
// ---------------------------------------------------------------------
function panneauMaintenance() {
  const sortie = h('div', { class: 'cam-msg' });
  const bouton = h('button', { type: 'button', class: 'secondaire' }, 'Analyser les images');
  const nettoyer = h('button', { type: 'button', class: 'danger', disabled: true }, 'Supprimer les images inutilisées');
  let orphelines = [];

  bouton.addEventListener('click', async () => {
    message(sortie, 'Analyse en cours…', 'info');
    try {
      const [index, persos, tableaux] = await Promise.all([
        fs.getDocs(fs.collection(db, 'images_index')),
        fs.getDocs(fs.collection(db, 'personnages')),
        fs.getDocs(fs.collection(db, 'tableaux'))
      ]);
      const utilisees = new Set();
      [persos, tableaux].forEach((s) => s.docs.forEach((d) => collecterRefs(d.data(), utilisees)));
      const uneSemaine = Date.now() - 7 * 24 * 3600 * 1000;
      let total = 0;
      orphelines = [];
      index.docs.forEach((d) => {
        const v = d.data();
        total += v.taille || 0;
        // On laisse une semaine aux images d'un brouillon pas encore enregistré.
        if (!utilisees.has(d.id) && millis(v.creeLe) < uneSemaine) orphelines.push({ id: d.id, taille: v.taille || 0 });
      });
      const mo = (n) => (n / 1048576).toFixed(1) + ' Mo';
      const perdu = orphelines.reduce((s, o) => s + o.taille, 0);
      message(sortie, index.size + ' images, ' + mo(total) + ' sur 1 024 Mo gratuits. '
        + orphelines.length + ' image(s) inutilisée(s) depuis plus d\'une semaine (' + mo(perdu) + ').', 'ok');
      nettoyer.disabled = orphelines.length === 0;
    } catch (e) { message(sortie, messageErreur(e), 'err'); }
  });

  nettoyer.addEventListener('click', async () => {
    if (!confirmer('Supprimer définitivement ' + orphelines.length + ' image(s) inutilisée(s) ?')) return;
    try {
      for (let i = 0; i < orphelines.length; i += 200) {
        const lot = fs.writeBatch(db);
        orphelines.slice(i, i + 200).forEach((o) => {
          lot.delete(fs.doc(db, 'images', o.id));
          lot.delete(fs.doc(db, 'images_index', o.id));
        });
        await lot.commit();
      }
      message(sortie, orphelines.length + ' image(s) supprimée(s).', 'ok');
      orphelines = []; nettoyer.disabled = true;
    } catch (e) { message(sortie, messageErreur(e), 'err'); }
  });

  return h('div', { dataset: { panneau: 'maintenance' } },
    h('h3', {}, 'Images'),
    h('p', { class: 'sous-titre' }, 'Les images restent stockées même quand le tableau, la fiche ou le message qui les utilisait est supprimé. Cet outil mesure l\'espace utilisé (1 Go gratuit) et supprime celles qui ne servent plus.'),
    h('div', { class: 'cam-actions' }, bouton, nettoyer), sortie,
    h('h3', {}, 'Rôles'),
    h('p', { class: 'sous-titre' }, 'Pour nommer un conteur ou un autre administrateur, utilisez la colonne Rôle de l\'onglet « Tous les comptes ».'));
}

// ---------------------------------------------------------------------
// Référentiel (admin) : import des descriptions des règles MET
// Le fichier descriptions.json est produit en local par
// outils/fiche/extraire_descriptions.py à partir du PDF des règles.
// Il n'est jamais publié dans le dépôt : il va dans Firestore, lisible
// par les seuls membres actifs.
// ---------------------------------------------------------------------
function panneauReferentiel(user) {
  const LIMITE_DOC = 700000;
  const etat = h('div');
  const sortie = h('div', { class: 'cam-msg' });
  const fichier = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
  const importer = h('button', { type: 'button', onclick: () => fichier.click() }, 'Importer descriptions.json');
  const supprimer = h('button', { type: 'button', class: 'danger' }, 'Supprimer le référentiel');

  async function afficherEtat() {
    try {
      const s = await fs.getDoc(fs.doc(db, 'referentiel', 'index'));
      if (!s.exists()) { etat.replaceChildren(h('div', { class: 'cam-encart alerte' }, 'Aucun référentiel importé : les « ⓘ » des fiches n\'affichent rien pour l\'instant.')); return; }
      const d = s.data();
      const cats = Object.entries(d.categories || {}).sort();
      etat.replaceChildren(h('div', { class: 'cam-encart' },
        h('strong', {}, d.version || 'Référentiel'), ' — importé le ', dateFr(d.importeLe, true), '. ',
        cats.reduce((n, [, c]) => n + (c.nb || 0), 0) + ' descriptions en ' + cats.length + ' catégories.',
        h('div', { class: 'sous-titre', style: 'margin:.4rem 0 0' }, cats.map(([k, c]) => k + ' (' + c.nb + ')').join(' · '))));
    } catch (e) { etat.replaceChildren(h('div', { class: 'cam-msg err' }, messageErreur(e))); }
  }

  async function idsExistants() {
    const snap = await fs.getDocs(fs.collection(db, 'referentiel'));
    return snap.docs.map((d) => d.id);
  }

  fichier.addEventListener('change', async () => {
    const f = fichier.files[0]; fichier.value = '';
    if (!f) return;
    try {
      message(sortie, 'Lecture du fichier…', 'info');
      const brut = JSON.parse(await f.text());
      if (!brut || typeof brut.categories !== 'object') throw new Error('Fichier inattendu : choisissez le descriptions.json produit par outils/fiche/extraire_descriptions.py.');
      const docs = [];
      const index = {};
      for (const [cat, entrees] of Object.entries(brut.categories)) {
        if (!/^[A-Za-z0-9]{1,60}$/.test(cat) || cat === 'index' || !entrees || typeof entrees !== 'object') continue;
        const parties = [{}];
        let taille = 0;
        for (const [cle, v] of Object.entries(entrees)) {
          if (!cle || cle.startsWith('__') || !v || typeof v.t !== 'string') continue;
          const e = { t: v.t };
          if (v.p) e.p = v.p;
          if (v.s) e.s = String(v.s);
          if (v.titre) e.titre = String(v.titre);
          const t = new Blob([JSON.stringify([cle, e])]).size;
          if (taille + t > LIMITE_DOC && Object.keys(parties[parties.length - 1]).length) { parties.push({}); taille = 0; }
          parties[parties.length - 1][cle] = e;
          taille += t;
        }
        const nb = parties.reduce((n, p) => n + Object.keys(p).length, 0);
        if (!nb) continue;
        parties.forEach((p, i) => docs.push({ id: i ? cat + '--' + (i + 1) : cat, data: { categorie: cat, partie: i + 1, entrees: p } }));
        index[cat] = { parts: parties.length, nb };
      }
      if (!docs.length) throw new Error('Aucune description dans ce fichier.');
      if (!confirmer('Importer ' + Object.values(index).reduce((n, c) => n + c.nb, 0) + ' descriptions (' + docs.length + ' documents) ? Le référentiel actuel sera remplacé.')) { message(sortie, ''); return; }
      const anciens = await idsExistants();
      for (let i = 0; i < docs.length; i++) {
        message(sortie, 'Envoi ' + (i + 1) + ' / ' + docs.length + ' (' + docs[i].id + ')…', 'info');
        await fs.setDoc(fs.doc(db, 'referentiel', docs[i].id), docs[i].data);
      }
      const garder = new Set(docs.map((d) => d.id).concat('index'));
      for (const id of anciens.filter((x) => !garder.has(x))) await fs.deleteDoc(fs.doc(db, 'referentiel', id));
      await fs.setDoc(fs.doc(db, 'referentiel', 'index'), {
        version: String(brut.version || f.name).slice(0, 200), avertissement: String(brut.avertissement || '').slice(0, 500),
        categories: index, importeLe: fs.serverTimestamp(), importePar: user.uid,
      });
      message(sortie, 'Référentiel importé.', 'ok');
      afficherEtat();
    } catch (e) { console.error(e); message(sortie, messageErreur(e), 'err'); }
  });

  supprimer.addEventListener('click', async () => {
    if (!confirmer('Supprimer toutes les descriptions des règles ?')) return;
    try {
      const ids = await idsExistants();
      for (const id of ids.filter((x) => x !== 'index')) await fs.deleteDoc(fs.doc(db, 'referentiel', id));
      if (ids.includes('index')) await fs.deleteDoc(fs.doc(db, 'referentiel', 'index'));
      message(sortie, 'Référentiel supprimé.', 'ok');
      afficherEtat();
    } catch (e) { message(sortie, messageErreur(e), 'err'); }
  });

  afficherEtat();
  return h('div', { dataset: { panneau: 'referentiel' } },
    h('p', { class: 'sous-titre' }, 'Les descriptions affichées par les « ⓘ » des fiches de personnage viennent des règles MET de la Fédération (document confidentiel). '
      + 'Elles ne sont pas dans le code du site : générez descriptions.json sur votre ordinateur avec outils/fiche/extraire_descriptions.py, puis importez-le ici. '
      + 'Seuls les membres actifs peuvent les lire.'),
    etat,
    h('div', { class: 'cam-actions' }, importer, supprimer, fichier), sortie);
}
