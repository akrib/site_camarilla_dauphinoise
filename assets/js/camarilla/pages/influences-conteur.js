// Page /influences/conteur/ : tableau de bord des conteurs (Firestore).
import {
  h, db, fs, pageProtegee, barreMembre, message, messageErreur, dateFr, millis, onglets, options,
  moisCourant, telecharger, versCsv, confirmer
} from '../core.js';
import { ZONES, STATUTS_TICKET, TYPES_ACTION, CATEGORIES_AIP } from '../donnees.js';

const racine = document.getElementById('cam-influences-conteur');
barreMembre(document.getElementById('cam-barre'));

const CLASSE_TICKET = {
  'En attente': 'attente', 'En cours': 'encours', 'Informations demandées': 'infos',
  'Complété': 'complete', 'Refusé': 'refuse', 'Annulé': 'annule'
};
const classeCat = (c) => (c || '').includes('Gotha') ? 'gotha' : ((c || '').includes('Pègre') ? 'pegre' : '');

pageProtegee(racine, 'conteur', async ({ user }) => {
  const mois = h('input', { type: 'month', value: moisCourant() });
  const msg = h('div', { class: 'cam-msg' });
  const panneaux = {
    personnages: h('div', { dataset: { panneau: 'personnages' } }),
    actions: h('div', { dataset: { panneau: 'actions' } }),
    districts: h('div', { dataset: { panneau: 'districts' } }),
    raisons: h('div', { dataset: { panneau: 'raisons' } }),
    tickets: h('div', { dataset: { panneau: 'tickets' } }),
    exports: h('div', { dataset: { panneau: 'exports' } })
  };
  const libelles = { personnages: 'Personnages', actions: 'Actions du mois', districts: 'Districts', raisons: 'Raisons sociales', tickets: 'Tickets', exports: 'Exports CSV' };
  const app = h('div', {},
    h('div', { class: 'cam-onglets' }, Object.keys(panneaux).map((k) => h('button', { type: 'button', dataset: { onglet: k } }, libelles[k]))),
    Object.values(panneaux));
  racine.append(
    h('div', { class: 'cam-bloc' },
      h('div', { class: 'cam-ligne' }, h('div', {}, h('label', {}, 'Mois'), mois)),
      h('button', { type: 'button', onclick: () => charger() }, 'Actualiser'), msg),
    app);
  onglets(app)(location.hash === '#tickets' ? 'tickets' : 'actions');

  let actions = [], persos = [], raisons = [], tickets = [];

  async function charger() {
    message(msg, 'Chargement…', 'info');
    try {
      const [a, p, r, t] = await Promise.all([
        fs.getDocs(fs.query(fs.collection(db, 'influences'), fs.where('mois', '==', mois.value))),
        fs.getDocs(fs.query(fs.collection(db, 'personnages'), fs.where('statut', '==', 'active'))),
        fs.getDocs(fs.collection(db, 'raisons_sociales')),
        fs.getDocs(fs.collection(db, 'tickets'))
      ]);
      actions = a.docs.map((d) => ({ id: d.id, ...d.data() })).sort((x, y) => millis(y.creeLe) - millis(x.creeLe));
      persos = p.docs.map((d) => ({ id: d.id, ...d.data() })).sort((x, y) => (x.nom || '').localeCompare(y.nom || ''));
      raisons = r.docs.map((d) => ({ id: d.id, ...d.data() })).sort((x, y) => (x.personnageNom || '').localeCompare(y.personnageNom || '') || (x.nom || '').localeCompare(y.nom || ''));
      tickets = t.docs.map((d) => ({ id: d.id, ...d.data() })).sort((x, y) => millis(y.creeLe) - millis(x.creeLe));
      const enAttente = actions.filter((x) => x.statut === 'attente').length;
      message(msg, actions.length + ' action(s) en ' + mois.value + ', dont ' + enAttente + ' sans réponse. '
        + tickets.filter((x) => ['En attente', 'En cours'].includes(x.statut)).length + ' ticket(s) à traiter.', 'ok');
      dessinerPersonnages(); dessinerActions(); dessinerDistricts(); dessinerRaisons(); dessinerTickets(); dessinerExports();
    } catch (e) { message(msg, messageErreur(e), 'err'); }
  }
  mois.addEventListener('change', charger);

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
        (a.date ? dateFr(a.date) : '') + ' · ' + (a.ville || '') + ' zone ' + (a.zone || '?')),
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
                reponseConteur: reponse.value.trim(), statut, majLe: fs.serverTimestamp(), traitePar: user.uid
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
        h('tbody', {}, ZONES.map((z) => h('tr', {}, h('td', {}, z),
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

  // --- Tickets ---
  let filtreTicket = '';
  function dessinerTickets() {
    const sel = options(h('select', {}), STATUTS_TICKET, filtreTicket, 'Tous les statuts');
    sel.addEventListener('change', () => { filtreTicket = sel.value; dessinerTickets(); });
    const liste = tickets.filter((t) => !filtreTicket || t.statut === filtreTicket);
    panneaux.tickets.replaceChildren(h('div', { class: 'cam-bloc' },
      h('h2', {}, 'Tickets'),
      h('div', { class: 'cam-ligne' }, h('div', {}, h('label', {}, 'Statut'), sel)),
      h('p', { class: 'sous-titre' }, liste.length + ' ticket(s).'),
      ...liste.map((t) => {
        const statut = options(h('select', {}), STATUTS_TICKET, t.statut);
        const resultat = h('textarea', { maxlength: 6000 }, t.resultat || '');
        const msgT = h('div', { class: 'cam-msg' });
        return h('div', { class: 'cam-element' },
          h('div', { class: 'meta' },
            h('span', { class: 'cam-tag ' + (CLASSE_TICKET[t.statut] || '') }, t.statut),
            h('span', { class: 'cam-tag' }, t.categorie),
            dateFr(t.creeLe, true) + ' — ' + (t.proprietaireNom || '') + (t.personnageNom ? ' (' + t.personnageNom + ')' : '')),
          h('strong', {}, t.sujet), h('div', { class: 'texte' }, t.description),
          h('div', { class: 'cam-ligne' }, h('div', {}, h('label', {}, 'Statut'), statut)),
          h('label', {}, 'Réponse au joueur'), resultat,
          h('button', {
            type: 'button', class: 'petit ok', onclick: async () => {
              try {
                await fs.updateDoc(fs.doc(db, 'tickets', t.id), { statut: statut.value, resultat: resultat.value.trim(), majLe: fs.serverTimestamp(), traitePar: user.uid });
                t.statut = statut.value; t.resultat = resultat.value.trim();
                message(msgT, 'Ticket mis à jour.', 'ok');
              } catch (e) { message(msgT, messageErreur(e), 'err'); }
            }
          }, 'Enregistrer'), msgT);
      })));
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
          { titre: 'Statut', cle: 'statut' }, { titre: 'Envoyée le', cle: 'creeLe' }
        ]), 'actions-' + mois.value + '.csv', 'text/csv;charset=utf-8')),
        btn('Raisons sociales', () => telecharger(versCsv(raisons, [
          { titre: 'Nom', cle: 'nom' }, { titre: 'Personnage', cle: 'personnageNom' }, { titre: 'Ville', cle: 'ville' },
          { titre: 'Zone', cle: 'zone' }, { titre: 'Catégorie', cle: 'categorie' }, { titre: 'Description', cle: 'description' }
        ]), 'raisons-sociales.csv', 'text/csv;charset=utf-8')),
        btn('Tickets', () => telecharger(versCsv(tickets, [
          { titre: 'Créé le', cle: 'creeLe' }, { titre: 'Joueur', cle: 'proprietaireNom' }, { titre: 'Personnage', cle: 'personnageNom' },
          { titre: 'Catégorie', cle: 'categorie' }, { titre: 'Sujet', cle: 'sujet' }, { titre: 'Description', cle: 'description' },
          { titre: 'Statut', cle: 'statut' }, { titre: 'Réponse', cle: 'resultat' }
        ]), 'tickets.csv', 'text/csv;charset=utf-8')),
        btn('Personnages en jeu', () => telecharger(versCsv(persos, [
          { titre: 'Personnage', cle: 'nom' }, { titre: 'Joueur', cle: 'proprietaireNom' }, { titre: 'Clan', cle: 'clan' },
          { titre: 'Secte', cle: 'secte' }, { titre: 'Âge', cle: 'age' }, { titre: 'Génération', cle: 'generation' },
          { titre: 'PX acquis', valeur: (p) => (p.xp ? p.xp.acquise : '') }, { titre: 'PX restants', valeur: (p) => (p.xp ? p.xp.restante : '') },
          { titre: 'Gotha', cle: 'niveauGotha' }, { titre: 'Spé. Gotha', valeur: (p) => (p.specsGotha || []).join(', ') },
          { titre: 'Pègre', cle: 'niveauPegre' }, { titre: 'Spé. Pègre', valeur: (p) => (p.specsPegre || []).join(', ') }
        ]), 'personnages-en-jeu.csv', 'text/csv;charset=utf-8')))));
  }

  await charger();
});
