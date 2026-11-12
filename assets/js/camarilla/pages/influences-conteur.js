// Page /influences/conteur/ : tableau de bord des conteurs (Firestore).
// Onglet « Calendrier » : dates des parties et dates limites des influences.
// (Les tickets ont leur propre page : /membres/tickets/.)
import {
  h, db, fs, pageProtegee, barreMembre, message, messageErreur, dateFr, millis, onglets, options,
  telecharger, versCsv, confirmer
} from '../core.js';
import { ZONES, TYPES_ACTION, CATEGORIES_AIP, classeCat, libelleZone } from '../donnees.js';
import { compresser, donneesDoc } from '../compression.js';
import {
  chargerCalendrier, calculerCalendrier, moisParDefaut, partie, libellePartie, resumeEtat, etat, LIBELLES_ETAT, MAX_PARTIES
} from '../calendrier.js';

const racine = document.getElementById('cam-influences-conteur');
barreMembre(document.getElementById('cam-barre'));


pageProtegee(racine, 'conteur', async ({ user }) => {
  let calendrier = await chargerCalendrier().catch(() => ({ existe: false, parties: [], anticipation: false }));
  const mois = h('input', { type: 'month', value: moisParDefaut(calendrier) });
  const infoPartie = h('p', { class: 'sous-titre' });
  const lienCarte = h('a', { class: 'cam-btn secondaire', href: '#' }, '📍 Voir sur la carte');
  const majInfoPartie = () => {
    const p = partie(calendrier, mois.value);
    infoPartie.replaceChildren(...(p ? [h('strong', {}, libellePartie(p)), ' — ', resumeEtat(calendrier, p)]
      : [calendrier.existe ? 'Aucune partie prévue ce mois-ci au calendrier.' : 'Aucun calendrier enregistré : les joueurs envoient leurs actions librement (onglet « Calendrier »).']));
    lienCarte.href = '/utils/carte?mois=' + encodeURIComponent(mois.value);
  };
  const msg = h('div', { class: 'cam-msg' });
  const panneaux = {
    calendrier: h('div', { dataset: { panneau: 'calendrier' } }),
    personnages: h('div', { dataset: { panneau: 'personnages' } }),
    actions: h('div', { dataset: { panneau: 'actions' } }),
    districts: h('div', { dataset: { panneau: 'districts' } }),
    raisons: h('div', { dataset: { panneau: 'raisons' } }),
    exports: h('div', { dataset: { panneau: 'exports' } })
  };
  const libelles = { calendrier: 'Calendrier', personnages: 'Personnages', actions: 'Actions du mois', districts: 'Districts', raisons: 'Raisons sociales', exports: 'Exports CSV' };
  const app = h('div', {},
    h('div', { class: 'cam-onglets' }, Object.keys(panneaux).map((k) => h('button', { type: 'button', dataset: { onglet: k } }, libelles[k]))),
    Object.values(panneaux));
  racine.append(
    h('div', { class: 'cam-bloc' },
      h('div', { class: 'cam-ligne' }, h('div', {}, h('label', {}, 'Mois (partie)'), mois)), infoPartie,
      h('div', { class: 'cam-actions' }, h('button', { type: 'button', onclick: () => charger() }, 'Actualiser'), lienCarte), msg),
    app);
  const ongletDemande = location.hash.slice(1);
  onglets(app)(panneaux[ongletDemande] ? ongletDemande : 'actions');
  majInfoPartie();

  let actions = [], persos = [], raisons = null;

  // Personnages en jeu et raisons sociales ne dépendent pas du mois : lus une
  // fois (bouton « Actualiser » pour les relire), seules les actions changent.
  async function charger(tout = true) {
    message(msg, 'Chargement…', 'info');
    try {
      const [a, p, r] = await Promise.all([
        fs.getDocs(fs.query(fs.collection(db, 'influences'), fs.where('mois', '==', mois.value))),
        tout || !persos.length ? fs.getDocs(fs.query(fs.collection(db, 'personnages'), fs.where('statut', '==', 'active'))) : null,
        tout || !raisons ? fs.getDocs(fs.collection(db, 'raisons_sociales')) : null
      ]);
      actions = a.docs.map(donneesDoc).sort((x, y) => millis(y.creeLe) - millis(x.creeLe));
      if (p) persos = p.docs.map((d) => ({ id: d.id, ...d.data() })).sort((x, y) => (x.nom || '').localeCompare(y.nom || ''));
      if (r) raisons = r.docs.map(donneesDoc).sort((x, y) => (x.personnageNom || '').localeCompare(y.personnageNom || '') || (x.nom || '').localeCompare(y.nom || ''));
      const enAttente = actions.filter((x) => x.statut === 'attente').length;
      message(msg, actions.length + ' action(s) en ' + mois.value + ', dont ' + enAttente + ' sans réponse.', 'ok');
      dessinerPersonnages(); dessinerActions(); dessinerDistricts(); dessinerExports();
      if (r) dessinerRaisons();
    } catch (e) { message(msg, messageErreur(e), 'err'); }
  }
  mois.addEventListener('change', () => { majInfoPartie(); charger(false); });

  // --- Calendrier des parties ---
  function dessinerCalendrier() {
    const lignes = calendrier.parties.map((p) => ({ date: p.date, limite: p.limite, titre: p.titre || '' }));
    const anticipation = h('input', { type: 'checkbox', checked: calendrier.anticipation });
    const corps = h('tbody');
    const alertes = h('div', {});
    const msgC = h('div', { class: 'cam-msg' });
    const CLASSE_ETAT = { ouverte: 'traitee', a_venir: 'attente', fermee: 'archivee' };
    const dessinerLignes = () => {
      if (msgC.classList.contains('err')) { msgC.className = 'cam-msg'; msgC.textContent = ''; }
      lignes.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
      const { parties, erreurs } = calculerCalendrier(lignes);
      corps.replaceChildren(...(lignes.length ? lignes.map((l, i) => {
        const date = h('input', { type: 'date', value: l.date });
        const limite = h('input', { type: 'date', value: l.limite });
        const titre = h('input', { type: 'text', value: l.titre, maxlength: 120, placeholder: 'Facultatif' });
        date.addEventListener('change', () => { l.date = date.value; dessinerLignes(); });
        limite.addEventListener('change', () => { l.limite = limite.value; dessinerLignes(); });
        titre.addEventListener('input', () => { l.titre = titre.value; });
        const c = parties.find((x) => x.date === l.date);
        return h('tr', {},
          h('td', {}, date), h('td', {}, limite), h('td', {}, titre),
          h('td', {}, c ? dateFr(c.ouverture) + ' → ' + dateFr(c.fermeture) : '—'),
          h('td', {}, c ? h('span', { class: 'cam-tag ' + CLASSE_ETAT[etat(c)] }, LIBELLES_ETAT[etat(c)]) : ''),
          h('td', {}, h('button', { type: 'button', class: 'petit danger', title: 'Retirer cette partie', onclick: () => { lignes.splice(i, 1); dessinerLignes(); } }, '×')));
      }) : [h('tr', {}, h('td', { colspan: 6 }, 'Aucune partie. Ajoutez la prochaine ci-dessous.'))]));
      alertes.replaceChildren(...erreurs.map((e) => h('div', { class: 'cam-msg err' }, e)));
    };
    // Ajout d'une partie : la date limite est proposée une semaine avant.
    const nDate = h('input', { type: 'date' });
    const nLimite = h('input', { type: 'date' });
    const nTitre = h('input', { type: 'text', maxlength: 120, placeholder: 'Ex : Élysée de décembre' });
    nDate.addEventListener('change', () => {
      if (!nDate.value || nLimite.value) return;
      const d = new Date(nDate.value + 'T12:00:00');
      d.setDate(d.getDate() - 7);
      nLimite.value = d.toISOString().slice(0, 10);
    });
    const ajouter = h('button', { type: 'button', class: 'petit' }, 'Ajouter la partie');
    ajouter.addEventListener('click', () => {
      if (!nDate.value) { message(msgC, 'Indiquez la date de la partie.', 'err'); return; }
      if (lignes.length >= MAX_PARTIES) { message(msgC, 'Au plus ' + MAX_PARTIES + ' parties : retirez les plus anciennes.', 'err'); return; }
      lignes.push({ date: nDate.value, limite: nLimite.value || nDate.value, titre: nTitre.value.trim() });
      nDate.value = ''; nLimite.value = ''; nTitre.value = '';
      message(msgC, 'Partie ajoutée : pensez à enregistrer le calendrier.', 'info');
      dessinerLignes();
    });
    const enregistrer = h('button', { type: 'button', class: 'ok' }, 'Enregistrer le calendrier');
    enregistrer.addEventListener('click', async () => {
      const { parties, erreurs } = calculerCalendrier(lignes);
      if (erreurs.length) { message(msgC, 'Corrigez d\'abord : ' + erreurs[0], 'err'); return; }
      enregistrer.disabled = true;
      try {
        await fs.setDoc(fs.doc(db, 'calendrier', 'parties'), {
          parties: Object.fromEntries(parties.map(({ cle, ...p }) => [cle, p])),
          anticipation: anticipation.checked, majLe: fs.serverTimestamp(), majPar: user.uid
        });
        calendrier = { existe: true, parties, anticipation: anticipation.checked };
        message(msgC, 'Calendrier enregistré : ' + parties.length + ' partie(s).', 'ok');
        majInfoPartie(); dessinerLignes();
      } catch (e) { message(msgC, messageErreur(e), 'err'); }
      finally { enregistrer.disabled = false; }
    });
    panneaux.calendrier.replaceChildren(h('div', { class: 'cam-bloc' },
      h('h2', {}, 'Calendrier des parties'),
      h('p', { class: 'sous-titre' }, 'Les influences d\'une partie s\'ouvrent le lendemain de la partie précédente (la toute première : un mois avant sa date) et ferment à sa date limite, à 23 h 59. Une seule partie par mois : le mois de la partie est celui de ses actions d\'influence.'),
      h('div', { class: 'cam-table-defil' }, h('table', { class: 'cam-table' },
        h('thead', {}, h('tr', {}, ['Date de la partie', 'Date limite des influences', 'Titre', 'Fenêtre d\'influences', 'État', ''].map((x) => h('th', {}, x)))),
        corps)),
      alertes,
      h('h3', {}, 'Ajouter une partie'),
      h('div', { class: 'cam-ligne' },
        h('div', {}, h('label', {}, 'Date de la partie'), nDate),
        h('div', {}, h('label', {}, 'Date limite des influences'), nLimite),
        h('div', {}, h('label', {}, 'Titre'), nTitre)),
      ajouter,
      h('label', { class: 'cam-coche', style: 'margin-top:1rem' }, anticipation,
        'Autoriser les joueurs à préparer les actions des parties suivantes avant leur ouverture'),
      h('div', { class: 'cam-actions' }, enregistrer), msgC));
    dessinerLignes();
  }

  // --- Personnages en jeu : qui a agi ce mois-ci ---
  function dessinerPersonnages() {
    const corps = persos.map((p) => {
      const siennes = actions.filter((a) => a.personnageId === p.id);
      const fait = siennes.length > 0;
      const pts = (cat) => siennes.filter((a) => a.categorie === cat).reduce((s, a) => s + (a.pointsAction || 0), 0);
      return h('tr', {},
        h('td', {}, fait ? '✅' : '❌'),
        h('td', {}, h('a', { href: '/membres/fiches/#fiche-' + p.id }, p.nom)),
        h('td', {}, p.proprietaireNom || ''),
        h('td', {}, String(siennes.length)),
        h('td', {}, pts('Influence Gotha') + ' / ' + p.niveauGotha),
        h('td', {}, pts('Influence Pègre') + ' / ' + p.niveauPegre),
        h('td', {}, String(siennes.filter((a) => CATEGORIES_AIP.includes(a.categorie)).length)));
    });
    panneaux.personnages.replaceChildren(h('div', { class: 'cam-bloc' },
      h('h2', {}, 'Personnages en jeu — ' + mois.value),
      h('div', { class: 'cam-table-defil' }, h('table', { class: 'cam-table' },
        h('thead', {}, h('tr', {}, ['', 'Personnage', 'Joueur', 'Actions', 'Gotha (pts/niv.)', 'Pègre (pts/niv.)', 'AIP'].map((x) => h('th', {}, x)))),
        h('tbody', {}, corps.length ? corps : h('tr', {}, h('td', { colspan: 7 }, 'Aucun personnage en jeu.')))))));
  }

  // --- Actions du mois, avec réponse du conteur ---
  let filtreType = '', filtreStatut = 'attente', filtrePerso = '';
  function dessinerActions() {
    const selType = options(h('select', {}), Object.entries(TYPES_ACTION), filtreType, 'Tous les types');
    const selStatut = options(h('select', {}), [['attente', 'Sans réponse'], ['traitee', 'Traitées']], filtreStatut, 'Toutes');
    const selPerso = options(h('select', {}), [...new Set(actions.map((a) => a.personnageNom))].sort(), filtrePerso, 'Tous les personnages');
    selType.addEventListener('change', () => { filtreType = selType.value; dessinerActions(); });
    selStatut.addEventListener('change', () => { filtreStatut = selStatut.value; dessinerActions(); });
    selPerso.addEventListener('change', () => { filtrePerso = selPerso.value; dessinerActions(); });
    const liste = actions.filter((a) => (!filtreType || a.type === filtreType) && (!filtreStatut || a.statut === filtreStatut) && (!filtrePerso || a.personnageNom === filtrePerso));

    panneaux.actions.replaceChildren(h('div', { class: 'cam-bloc' },
      h('h2', {}, 'Actions — ' + mois.value),
      h('div', { class: 'cam-ligne' },
        h('div', {}, h('label', {}, 'Type'), selType), h('div', {}, h('label', {}, 'Statut'), selStatut), h('div', {}, h('label', {}, 'Personnage'), selPerso)),
      h('p', { class: 'sous-titre' }, liste.length + ' action(s) affichée(s). La réponse est visible par le joueur dès l\'enregistrement.'),
      ...liste.map(actionEl)));
  }

  function actionEl(a) {
    const reponse = h('textarea', { maxlength: 6000, placeholder: 'Résultat communiqué au joueur…' }, a.reponseConteur || '');
    const traitee = h('input', { type: 'checkbox', checked: a.statut === 'traitee' || !a.reponseConteur });
    const msgA = h('div', { class: 'cam-msg' });
    return h('div', { class: 'cam-element' },
      h('div', { class: 'meta' },
        h('span', { class: 'cam-tag ' + classeCat(a.categorie) }, a.categorie),
        h('span', { class: 'cam-tag' }, TYPES_ACTION[a.type] || a.type),
        h('span', { class: 'cam-tag ' + a.statut }, a.statut === 'traitee' ? 'Traitée' : 'Sans réponse'),
        (a.date ? dateFr(a.date) : '') + ' · ' + (a.ville || '') + ' · zone ' + (libelleZone(a.zone) || '?'),
        a.lieu ? [' · ', h('a', { href: '/utils/carte?mois=' + encodeURIComponent(a.mois) + '&action=' + encodeURIComponent(a.id) }, '📍 carte')] : ''),
      h('strong', {}, a.personnageNom), ' — ', a.nomAction, ' — ', a.pointsAction + ' pt(s)',
      a.niveau ? ' — niveau ' + a.niveau : '', a.specialisation ? ' — ' + a.specialisation : '',
      h('div', {},
        a.raisonSociale ? [h('strong', {}, 'Raison sociale : '), a.raisonSociale, h('br')] : '',
        a.cible ? [h('strong', {}, 'Cible : '), a.cible, a.categorieCible ? ' (' + a.categorieCible + ')' : '', h('br')] : '',
        h('span', { class: 'texte' }, a.descriptif)),
      h('label', {}, 'Réponse du conteur'), reponse,
      h('div', { class: 'cam-actions' },
        h('label', { class: 'cam-coche', style: 'margin:.6rem .6rem 0 0' }, traitee, 'Marquer comme traitée'),
        h('button', {
          type: 'button', class: 'petit ok', onclick: async () => {
            try {
              const statut = traitee.checked ? 'traitee' : 'attente';
              await fs.updateDoc(fs.doc(db, 'influences', a.id), {
                reponseConteur: compresser(reponse.value.trim()), statut, majLe: fs.serverTimestamp(), traitePar: user.uid,
                ...(reponse.value.trim() ? { reponduLe: fs.serverTimestamp() } : {})
              });
              a.reponseConteur = reponse.value.trim(); a.statut = statut;
              message(msgA, 'Réponse enregistrée.', 'ok');
            } catch (e) { message(msgA, messageErreur(e), 'err'); }
          }
        }, 'Enregistrer'),
        h('button', {
          type: 'button', class: 'petit danger', onclick: async () => {
            if (!confirmer('Supprimer définitivement cette action ?')) return;
            try { await fs.deleteDoc(fs.doc(db, 'influences', a.id)); actions = actions.filter((x) => x.id !== a.id); dessinerActions(); }
            catch (e) { message(msgA, messageErreur(e), 'err'); }
          }
        }, 'Supprimer')),
      msgA);
  }

  // --- Districts ---
  function dessinerDistricts() {
    const compte = Object.fromEntries(ZONES.map((z) => [z, 0]));
    actions.forEach((a) => { if (a.zone in compte) compte[a.zone]++; });
    const max = Math.max(1, ...Object.values(compte));
    panneaux.districts.replaceChildren(h('div', { class: 'cam-bloc' },
      h('h2', {}, 'Actions par district — ' + mois.value),
      h('table', { class: 'cam-table' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Zone'), h('th', {}, 'Actions'))),
        h('tbody', {}, ZONES.map((z) => h('tr', {}, h('td', {}, libelleZone(z)),
          h('td', {}, h('div', { class: 'cam-barre-progression' }, h('span', {}, String(compte[z])),
            h('div', {}, h('div', { style: 'width:' + Math.round(compte[z] / max * 100) + '%' }))))))))));
  }

  // --- Raisons sociales ---
  function dessinerRaisons() {
    const recherche = h('input', { type: 'search', placeholder: 'Nom, personnage, ville…' });
    const corps = h('tbody');
    const dessiner = () => {
      const q = recherche.value.trim().toLowerCase();
      const liste = raisons.filter((r) => !q || [r.nom, r.personnageNom, r.ville, r.description].some((v) => (v || '').toLowerCase().includes(q)));
      corps.replaceChildren(...liste.map((r) => h('tr', {},
        h('td', {}, r.nom), h('td', {}, r.personnageNom), h('td', {}, r.ville), h('td', {}, r.zone),
        h('td', {}, h('span', { class: 'cam-tag ' + classeCat(r.categorie) }, r.categorie)), h('td', { class: 'texte' }, r.description || ''))));
    };
    recherche.addEventListener('input', dessiner);
    panneaux.raisons.replaceChildren(h('div', { class: 'cam-bloc' },
      h('h2', {}, 'Registre des raisons sociales'), recherche,
      h('div', { class: 'cam-table-defil' }, h('table', { class: 'cam-table' },
        h('thead', {}, h('tr', {}, ['Nom', 'Personnage', 'Ville', 'Zone', 'Catégorie', 'Description'].map((x) => h('th', {}, x)))), corps))));
    dessiner();
  }

  // --- Exports CSV (pour archiver ou retravailler dans un tableur) ---
  function dessinerExports() {
    const btn = (texte, fn) => h('button', { type: 'button', class: 'secondaire', onclick: fn }, texte);
    panneaux.exports.replaceChildren(h('div', { class: 'cam-bloc' },
      h('h2', {}, 'Exports CSV'),
      h('p', { class: 'sous-titre' }, 'Fichiers lisibles par Excel, LibreOffice ou Google Sheets (séparateur point-virgule).'),
      h('div', { class: 'cam-actions' },
        btn('Actions du mois', () => telecharger(versCsv(actions, [
          { titre: 'Date', cle: 'date' }, { titre: 'Personnage', cle: 'personnageNom' }, { titre: 'Type', valeur: (a) => TYPES_ACTION[a.type] || a.type },
          { titre: 'Catégorie', cle: 'categorie' }, { titre: 'Action', cle: 'nomAction' }, { titre: 'Niveau', cle: 'niveau' },
          { titre: 'Spécialisation', cle: 'specialisation' }, { titre: 'Raison sociale', cle: 'raisonSociale' }, { titre: 'Cible', cle: 'cible' },
          { titre: 'Catégorie cible', cle: 'categorieCible' }, { titre: 'Points', cle: 'pointsAction' }, { titre: 'Ville', cle: 'ville' },
          { titre: 'Zone', cle: 'zone' }, { titre: 'Descriptif', cle: 'descriptif' }, { titre: 'Réponse conteur', cle: 'reponseConteur' },
          { titre: 'Statut', cle: 'statut' }, { titre: 'Envoyée le', cle: 'creeLe' },
          { titre: 'Partie', valeur: (a) => { const p = partie(calendrier, a.mois); return p ? libellePartie(p) : a.mois; } },
          { titre: 'Latitude', valeur: (a) => (a.lieu ? a.lieu.lat : '') }, { titre: 'Longitude', valeur: (a) => (a.lieu ? a.lieu.lng : '') }
        ]), 'actions-' + mois.value + '.csv', 'text/csv;charset=utf-8')),
        btn('Raisons sociales', () => telecharger(versCsv(raisons || [], [
          { titre: 'Nom', cle: 'nom' }, { titre: 'Personnage', cle: 'personnageNom' }, { titre: 'Ville', cle: 'ville' },
          { titre: 'Zone', cle: 'zone' }, { titre: 'Catégorie', cle: 'categorie' }, { titre: 'Description', cle: 'description' }
        ]), 'raisons-sociales.csv', 'text/csv;charset=utf-8')),
        btn('Personnages en jeu', () => telecharger(versCsv(persos, [
          { titre: 'Personnage', cle: 'nom' }, { titre: 'Joueur', cle: 'proprietaireNom' }, { titre: 'Clan', cle: 'clan' },
          { titre: 'Secte', cle: 'secte' }, { titre: 'Âge', cle: 'age' }, { titre: 'Génération', cle: 'generation' },
          { titre: 'PX acquis', valeur: (p) => (p.xp ? p.xp.acquise : '') }, { titre: 'PX restants', valeur: (p) => (p.xp ? p.xp.restante : '') },
          { titre: 'Gotha', cle: 'niveauGotha' }, { titre: 'Spé. Gotha', valeur: (p) => (p.specsGotha || []).join(', ') },
          { titre: 'Pègre', cle: 'niveauPegre' }, { titre: 'Spé. Pègre', valeur: (p) => (p.specsPegre || []).join(', ') }
        ]), 'personnages-en-jeu.csv', 'text/csv;charset=utf-8')))));
  }

  dessinerCalendrier();
  await charger();
});
