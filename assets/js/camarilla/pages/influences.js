// Page /influences/ : actions d'influence du personnage incarné (Firestore).
// Les actions visent une partie du calendrier (champ mois = clé de la partie)
// et ne se créent / modifient que pendant sa fenêtre d'influences.
// Paramètres d'adresse reconnus (liens depuis la carte de Grenoble) :
//   ?perso=ID   personnage à incarner (s'il est en jeu et au membre)
//   ?mois=AAAA-MM&lieu=lng,lat#actions   nouvelle action, partie et lieu choisis
//   ?action=ID#resultats   action à mettre en avant (et à modifier si possible)
// Les tickets ont leur propre page : /membres/tickets/.
import {
  h, db, fs, pageProtegee, barreMembre, estConteur, message, messageErreur, dateFr, millis, onglets, options,
  confirmer, aujourdhui
} from '../core.js';
import { compresser, donneesDoc } from '../compression.js';
import {
  chargerCalendrier, encartCalendrier, periodesModifiables, modifiable, moisParDefaut, libelleMois, libellePartie,
  partieCourante, resumeEtat, partie
} from '../calendrier.js';
import { choisirLieu, texteLieu, chargerTerritoires, zoneDuPoint } from '../carte-base.js';
import {
  VILLES, OPTIONS_ZONES, POINTS, SPECIALISATIONS, CAT_GOTHA, CAT_PEGRE, ACTIONS_GOTHA_GLOB, ACTIONS_PEGRE_GLOB,
  CATEGORIES_AIP, AIP_ACTIONS, CATEGORIES_RAISON_SOCIALE, TYPES_ACTION, classeCat, libelleZone
} from '../donnees.js';
import { personnageIncarne, incarner, blocChoixPersonnage, fenetreChoixPersonnage } from '../incarnation.js';
import { marquerVu } from '../suivi.js';

const racine = document.getElementById('cam-influences');
barreMembre(document.getElementById('cam-barre'));

pageProtegee(racine, 'actif', async ({ user, profil }) => {
  const uid = user.uid;
  const params = new URLSearchParams(location.search);
  const [cal, incarne] = await Promise.all([
    chargerCalendrier().catch(() => ({ existe: false, parties: [], anticipation: false })),
    personnageIncarne(uid)
  ]);
  let perso = incarne;
  // Lien venant de la carte : on agit pour le personnage indiqué, s'il est au membre et en jeu.
  const demande = params.get('perso');
  if (demande && (!perso || perso.id !== demande)) {
    try {
      const s = await fs.getDoc(fs.doc(db, 'personnages', demande));
      const p = s.exists() ? { id: s.id, ...s.data() } : null;
      if (p && p.proprietaire === uid && p.statut === 'active') { incarner(uid, p); perso = p; }
    } catch (e) { console.warn(e); }
  }
  const encart = encartCalendrier(cal);
  if (encart) racine.append(encart);
  if (!perso || perso.statut !== 'active') {
    racine.append(
      perso ? h('div', { class: 'cam-encart alerte' }, 'Vous incarnez ', h('strong', {}, perso.nom), ', qui n\'est pas encore en jeu : pas d\'influences pour ce personnage. Choisissez un personnage en jeu.') : '',
      estConteur(profil) ? h('p', { class: 'sous-titre' }, 'Conteur : les actions des joueurs sont dans ', h('a', { href: '/influences/conteur/' }, 'Influences — conteur'), '.') : '',
      blocChoixPersonnage(uid, {
        titre: 'Influences : choisissez un personnage en jeu',
        texte: 'Les influences se jouent avec un personnage « en jeu ». Celui que vous choisissez devient aussi votre personnage incarné dans les autres outils.',
        filtre: (p) => p.statut === 'active',
        vide: ['Aucun de vos personnages n\'est « en jeu ». Créez une fiche dans ', h('a', { href: '/membres/fiches/' }, 'Mes fiches de personnage'),
          ' et faites-la valider puis mettre en jeu par un conteur. Pour une question aux conteurs : ', h('a', { href: '/membres/tickets/' }, 'Tickets'), '.'],
        apresChoix: () => location.reload()
      }));
    return;
  }
  const lieuDemande = (() => {
    const [lng, lat] = (params.get('lieu') || '').split(',').map(Number);
    return Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lng) <= 180 && Math.abs(lat) <= 90 ? { lng, lat } : null;
  })();
  // Zones officielles tracées par les conteurs : la zone se déduit du lieu.
  let territoires = [];
  const territoiresPrets = chargerTerritoires().then((t) => { territoires = t; }).catch(() => {});

  let raisons = [];            // raisons sociales du personnage

  // ===================================================================
  // Structure
  // ===================================================================
  const panneaux = {
    fiche: h('div', { dataset: { panneau: 'fiche' } }),
    actions: h('div', { dataset: { panneau: 'actions' } }),
    recap: h('div', { dataset: { panneau: 'recap' } }),
    resultats: h('div', { dataset: { panneau: 'resultats' } }),
    raisons: h('div', { dataset: { panneau: 'raisons' } })
  };
  const libelles = { fiche: 'Fiche', actions: 'Actions', recap: 'Récap du mois', resultats: 'Résultats', raisons: 'Raisons sociales' };
  const app = h('div', {},
    h('div', { class: 'cam-onglets' }, Object.keys(panneaux).map((k) => h('button', { type: 'button', dataset: { onglet: k } }, libelles[k]))),
    Object.values(panneaux));

  racine.append(h('div', { class: 'cam-bloc' },
    h('div', { class: 'cam-incarne' },
      h('span', {}, 'Vous agissez en tant que'), h('span', { class: 'nom' }, perso.nom),
      h('button', { type: 'button', class: 'petit secondaire', onclick: () => fenetreChoixPersonnage(uid) }, 'Changer de personnage'))));
  racine.append(app);
  const activer = onglets(app, (nom) => { if (nom === 'resultats') marquerVu(uid, 'influences'); });
  const ongletDemande = location.hash.slice(1);
  activer(panneaux[ongletDemande] ? ongletDemande : 'fiche');

  // ===================================================================
  // Fiche (lecture seule : la fiche se modifie dans « Mes fiches »)
  // ===================================================================
  function dessinerFiche() {
    const p = perso;
    const ligne = (lib, val) => h('div', { class: 'ligne' }, h('span', {}, lib), h('strong', {}, val || '—'));
    panneaux.fiche.replaceChildren(h('div', { class: 'cam-bloc' },
      h('h2', {}, p.nom),
      h('div', { class: 'cam-recap' },
        h('div', {}, ligne('Joueur', p.proprietaireNom), ligne('Clan', p.clan), ligne('Secte', p.secte), ligne('Âge', p.age), ligne('Génération', p.generation ? p.generation + 'e' : '')),
        h('div', {}, h('h3', { class: 'gotha' }, 'Gotha — niveau ' + p.niveauGotha), h('p', {}, (p.specsGotha || []).join(', ') || 'Aucune spécialisation')),
        h('div', {}, h('h3', { class: 'pegre' }, 'Pègre — niveau ' + p.niveauPegre), h('p', {}, (p.specsPegre || []).join(', ') || 'Aucune spécialisation'))),
      h('p', { class: 'sous-titre' }, 'Ces valeurs viennent de votre fiche validée. Pour les faire évoluer : ',
        h('a', { href: '/membres/fiches/#fiche-' + p.id }, 'ouvrir la fiche'), ' puis « Demander une modification ».')));
  }

  // ===================================================================
  // Actions
  // ===================================================================
  const selRaisons = [];
  function selectRaison() {
    const s = h('select', { required: true });
    selRaisons.push(s);
    return s;
  }
  function remplirRaisons() {
    selRaisons.forEach((s) => {
      if (raisons.length) options(s, raisons.map((r) => r.nom), s.value);
      else s.replaceChildren(h('option', { value: '' }, '— Aucune : créez-en une dans l\'onglet Raisons sociales —'));
    });
  }

  // Lieu de l'action sur la carte de Grenoble (facultatif)
  function champLieu(initial) {
    let lieu = initial || null;
    const info = h('span', { class: 'cam-lieu-valeur' });
    const retirer = h('button', { type: 'button', class: 'petit secondaire', title: 'Retirer le lieu' }, '✕');
    const maj = () => { info.textContent = lieu ? texteLieu(lieu) : 'Aucun lieu choisi'; retirer.style.display = lieu ? '' : 'none'; };
    retirer.addEventListener('click', () => { lieu = null; maj(); });
    const bouton = h('button', { type: 'button', class: 'petit secondaire' }, '📍 Choisir sur la carte');
    const objet = {
      el: h('div', { class: 'cam-lieu' }, bouton, info, retirer),
      get valeur() { return lieu; },
      vider() { lieu = null; maj(); },
      surChoix: null
    };
    bouton.addEventListener('click', async () => {
      const r = await choisirLieu({ initial: lieu, titre: 'Lieu de l\'action — ' + perso.nom, territoires });
      if (r) { lieu = r; maj(); if (objet.surChoix) objet.surChoix(r); }
    });
    maj();
    return objet;
  }

  function champsCommuns(lieuInitial = lieuDemande) {
    const c = {
      date: h('input', { type: 'date', value: aujourdhui() }),
      ville: options(h('select', {}), VILLES, 'Grenoble'),
      zone: options(h('select', {}), OPTIONS_ZONES),
      lieu: champLieu(lieuInitial)
    };
    // Le lieu choisi sur la carte remplit la zone (zones officielles tracées par les conteurs).
    const zoneAuto = (l) => { const z = zoneDuPoint(territoires, [l.lng, l.lat]); if (z) c.zone.value = z; };
    c.lieu.surChoix = zoneAuto;
    if (lieuInitial) territoiresPrets.then(() => zoneAuto(lieuInitial));
    return c;
  }
  const ligneCommune = (c) => [h('div', { class: 'cam-ligne' },
    h('div', {}, h('label', {}, 'Date'), c.date), h('div', {}, h('label', {}, 'Ville'), c.ville), h('div', {}, h('label', {}, 'Zone (district)'), c.zone)),
    h('label', {}, 'Lieu sur la carte de Grenoble (facultatif)'), c.lieu.el];

  // Partie visée par les nouvelles actions (fenêtres d'influences ouvertes)
  let choixPeriode = null;
  function moisDesNouvellesActions(champs) {
    if (!cal.existe) return (champs.date || aujourdhui()).slice(0, 7);
    return choixPeriode ? choixPeriode.value : '';
  }

  async function envoyerAction(champs, msg, boutonEl, c) {
    const mois = moisDesNouvellesActions(champs);
    if (!mois || !modifiable(cal, mois)) { message(msg, 'Les influences ne sont pas ouvertes pour cette partie.', 'err'); return false; }
    if (!champs.raisonSociale) { message(msg, 'Choisissez une raison sociale (onglet Raisons sociales pour en créer une).', 'err'); return false; }
    if (!champs.descriptif) { message(msg, 'Le descriptif est obligatoire.', 'err'); return false; }
    boutonEl.disabled = true;
    message(msg, 'Envoi…', 'info');
    try {
      const doc = {
        proprietaire: uid, personnageId: perso.id, personnageNom: perso.nom,
        mois, statut: 'attente', reponseConteur: '',
        creeLe: fs.serverTimestamp(), cible: '', specialisation: '', niveau: 0, categorieCible: '',
        ...champs, descriptif: compresser(champs.descriptif)
      };
      if (c && c.lieu.valeur) doc.lieu = c.lieu.valeur;
      await fs.addDoc(fs.collection(db, 'influences'), doc);
      if (c) c.lieu.vider();
      dessinerResultats(); dessinerRecap();   // la nouvelle action apparaît tout de suite
      message(msg, 'Action envoyée au conteur' + (cal.existe ? ' (' + libelleMois(mois).toLowerCase() + ')' : '') + '.', 'ok');
      return true;
    } catch (e) { message(msg, messageErreur(e), 'err'); return false; }
    finally { boutonEl.disabled = false; }
  }

  function formGlobale() {
    const c = champsCommuns();
    const categorie = options(h('select', {}), [CAT_GOTHA, CAT_PEGRE]);
    const spec = options(h('select', {}), SPECIALISATIONS);
    const raison = selectRaison();
    const action = h('select', {});
    const desc = h('div', { class: 'sous-titre' });
    const cout = h('div', { class: 'cam-encart' });
    const points = options(h('select', {}), POINTS);
    const descriptif = h('textarea', { maxlength: 4000 });
    const msg = h('div', { class: 'cam-msg' });
    const liste = () => (categorie.value === CAT_GOTHA ? ACTIONS_GOTHA_GLOB : ACTIONS_PEGRE_GLOB);
    const majActions = () => { options(action, liste().map((a, i) => [i, a.nom])); majDesc(); };
    const majDesc = () => {
      const a = liste()[parseInt(action.value || '0', 10)];
      if (!a) return;
      desc.textContent = a.desc;
      const niv = categorie.value === CAT_GOTHA ? perso.niveauGotha : perso.niveauPegre;
      cout.textContent = niv >= a.niveau
        ? 'Coût : 1 Action d\'Influence. Niveau requis ' + a.niveau + ', vous avez ' + niv + '.'
        : 'Coût : 1 Action d\'Influence — ⚠ niveau requis ' + a.niveau + ', vous n\'avez que ' + niv + ' (sauf soutien).';
    };
    categorie.addEventListener('change', majActions);
    action.addEventListener('change', majDesc);
    const btn = h('button', { type: 'button' }, 'Envoyer');
    btn.addEventListener('click', async () => {
      const a = liste()[parseInt(action.value || '0', 10)];
      if (await envoyerAction({
        type: 'globale', date: c.date.value, ville: c.ville.value, zone: c.zone.value, categorie: categorie.value,
        niveau: a.niveau, specialisation: spec.value, raisonSociale: raison.value, nomAction: a.nom,
        pointsAction: parseInt(points.value, 10), descriptif: descriptif.value.trim()
      }, msg, btn, c)) descriptif.value = '';
    });
    const el = h('div', { class: 'cam-bloc', dataset: { panneau: 'globale' } },
      h('h2', {}, 'Nouvelle action globale'), h('p', { class: 'sous-titre' }, 'Coûte 1 Action d\'Influence. Le niveau requis dépend de l\'action choisie.'),
      ligneCommune(c),
      h('div', { class: 'cam-ligne' }, h('div', {}, h('label', {}, 'Catégorie'), categorie), h('div', {}, h('label', {}, 'Spécialisation'), spec)),
      h('label', {}, 'Raison sociale *'), raison,
      h('label', {}, 'Action'), action, desc, cout,
      h('label', {}, 'Points d\'action'), points,
      h('label', {}, 'Descriptif joueur *'), descriptif, btn, msg);
    return { el, init: majActions };
  }

  function formCiblee() {
    const c = champsCommuns();
    const categorie = options(h('select', {}), [CAT_GOTHA, CAT_PEGRE]);
    const action = options(h('select', {}), ['Attaque', 'Défense', 'Obstruction']);
    const raison = selectRaison();
    const catCible = options(h('select', {}), [CAT_GOTHA, CAT_PEGRE]);
    const points = options(h('select', {}), POINTS);
    const cible = h('input', { type: 'text', maxlength: 150, placeholder: 'Nom du personnage ou de l\'influence visée' });
    const cout = h('div', { class: 'cam-encart' });
    const descriptif = h('textarea', { maxlength: 4000 });
    const msg = h('div', { class: 'cam-msg' });
    const maj = () => {
      const p = parseInt(points.value, 10);
      if (action.value === 'Attaque') {
        const parPoint = categorie.value === catCible.value ? 2 : 3;
        cout.textContent = 'Coût estimé : ' + (parPoint * p) + ' Action(s) d\'Influence (' + parPoint + ' par point).';
      } else if (action.value === 'Défense') {
        cout.textContent = 'Coût : ' + p + ' Action(s) = -' + p + ' niveau(x) absorbé(s) sur toute attaque de cette catégorie, pour le mois.';
      } else {
        cout.textContent = 'Coût : ' + p + ' Action(s) d\'obstruction = seuil +' + p + ' à surmonter pour l\'activité visée.';
      }
    };
    [categorie, action, catCible, points].forEach((x) => x.addEventListener('change', maj));
    const btn = h('button', { type: 'button' }, 'Envoyer');
    btn.addEventListener('click', async () => {
      if (!cible.value.trim()) { message(msg, 'Indiquez la cible.', 'err'); return; }
      if (await envoyerAction({
        type: 'ciblee', date: c.date.value, ville: c.ville.value, zone: c.zone.value, categorie: categorie.value,
        categorieCible: catCible.value, nomAction: action.value, raisonSociale: raison.value, cible: cible.value.trim(),
        pointsAction: parseInt(points.value, 10), descriptif: descriptif.value.trim()
      }, msg, btn, c)) { descriptif.value = ''; cible.value = ''; }
    });
    const el = h('div', { class: 'cam-bloc', dataset: { panneau: 'ciblee' } },
      h('h2', {}, 'Nouvelle action ciblée'), h('p', { class: 'sous-titre' }, 'Attaque, Défense ou Obstruction.'),
      ligneCommune(c),
      h('div', { class: 'cam-ligne' }, h('div', {}, h('label', {}, 'Catégorie (source)'), categorie), h('div', {}, h('label', {}, 'Action'), action)),
      h('div', { class: 'cam-ligne' }, h('div', {}, h('label', {}, 'Raison sociale *'), raison), h('div', {}, h('label', {}, 'Catégorie de la cible'), catCible), h('div', {}, h('label', {}, 'Points visés'), points)),
      h('label', {}, 'Cible *'), cible, cout,
      h('label', {}, 'Descriptif joueur *'), descriptif, btn, msg);
    return { el, init: maj };
  }

  function formSoutien() {
    const c = champsCommuns();
    const raison = selectRaison();
    const categorie = options(h('select', {}), [CAT_GOTHA, CAT_PEGRE]);
    const niveau = options(h('select', {}), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const cible = h('input', { type: 'text', maxlength: 150, placeholder: 'Nom du personnage soutenu' });
    const malus = h('input', { type: 'number', min: -3, max: 0, value: 0 });
    const cout = h('div', { class: 'cam-encart' });
    const descriptif = h('textarea', { maxlength: 4000 });
    const msg = h('div', { class: 'cam-msg' });
    const maj = () => {
      const n = parseInt(niveau.value, 10), m = Math.max(-3, Math.min(0, parseInt(malus.value || '0', 10)));
      cout.textContent = 'Coût : ' + n + ' Action(s) d\'Influence pour faire passer la cible de ' + n + ' à ' + (n + 1)
        + (m < 0 ? ' — malus hors-praxis : ' + m + ' niveau(x) reçu(s) en moins.' : '.');
    };
    [niveau, malus].forEach((x) => { x.addEventListener('change', maj); x.addEventListener('input', maj); });
    const btn = h('button', { type: 'button' }, 'Envoyer');
    btn.addEventListener('click', async () => {
      if (!cible.value.trim()) { message(msg, 'Indiquez le personnage soutenu.', 'err'); return; }
      const n = parseInt(niveau.value, 10), m = Math.max(-3, Math.min(0, parseInt(malus.value || '0', 10)));
      if (await envoyerAction({
        type: 'soutien', date: c.date.value, ville: c.ville.value, zone: c.zone.value, categorie: categorie.value,
        niveau: n, raisonSociale: raison.value, nomAction: 'Soutien', cible: cible.value.trim(),
        pointsAction: n + m, descriptif: (m < 0 ? '[Malus hors-praxis : ' + m + '] ' : '') + descriptif.value.trim()
      }, msg, btn, c)) { descriptif.value = ''; cible.value = ''; }
    });
    const el = h('div', { class: 'cam-bloc', dataset: { panneau: 'soutien' } },
      h('h2', {}, 'Nouveau soutien'), h('p', { class: 'sous-titre' }, 'Prêtez vos Actions d\'Influence pour augmenter temporairement le niveau d\'un autre personnage.'),
      ligneCommune(c),
      h('div', { class: 'cam-ligne' }, h('div', {}, h('label', {}, 'Raison sociale *'), raison), h('div', {}, h('label', {}, 'Catégorie'), categorie), h('div', {}, h('label', {}, 'Niveau de la cible avant ce point'), niveau)),
      h('label', {}, 'Cible (personnage soutenu) *'), cible,
      h('div', { class: 'cam-ligne' }, h('div', {}, h('label', {}, 'Malus hors-praxis (0 à -3)'), malus)),
      cout, h('label', {}, 'Descriptif joueur *'), descriptif, btn, msg);
    return { el, init: maj };
  }

  function formAip() {
    const c = champsCommuns();
    const categorie = options(h('select', {}), CATEGORIES_AIP);
    const points = options(h('select', {}), POINTS);
    const raison = selectRaison();
    const action = h('select', {});
    const descriptif = h('textarea', { maxlength: 4000 });
    const msg = h('div', { class: 'cam-msg' });
    const maj = () => options(action, AIP_ACTIONS[categorie.value] || []);
    categorie.addEventListener('change', maj);
    const btn = h('button', { type: 'button' }, 'Envoyer');
    btn.addEventListener('click', async () => {
      if (await envoyerAction({
        type: 'aip', date: c.date.value, ville: c.ville.value, zone: c.zone.value, categorie: categorie.value,
        raisonSociale: raison.value, nomAction: action.value, pointsAction: parseInt(points.value, 10), descriptif: descriptif.value.trim()
      }, msg, btn, c)) descriptif.value = '';
    });
    const el = h('div', { class: 'cam-bloc', dataset: { panneau: 'aip' } },
      h('h2', {}, 'Nouvelle action AIP'), h('p', { class: 'sous-titre' }, 'Enquête, Patrouille, Mentorat, Chasse, Troupeau, Informatique, Artisanat, Science, Dépense d\'XP…'),
      ligneCommune(c),
      h('div', { class: 'cam-ligne' }, h('div', {}, h('label', {}, 'Catégorie'), categorie), h('div', {}, h('label', {}, 'Points d\'action'), points)),
      h('label', {}, 'Raison sociale *'), raison, h('label', {}, 'Action'), action,
      h('label', {}, 'Descriptif joueur *'), descriptif, btn, msg);
    return { el, init: maj };
  }

  function dessinerActions() {
    selRaisons.length = 0;
    choixPeriode = null;
    let entete = null;
    if (cal.existe) {
      const ouvertes = periodesModifiables(cal);
      if (!ouvertes.length) {
        const p = partieCourante(cal);
        panneaux.actions.replaceChildren(h('div', { class: 'cam-bloc' },
          h('h2', {}, 'Influences fermées'),
          h('p', {}, p ? [h('strong', {}, libellePartie(p)), ' : ', resumeEtat(cal, p)] : 'Aucune partie n\'est prévue au calendrier.'),
          h('p', { class: 'sous-titre' }, 'Les influences d\'une partie s\'ouvrent le lendemain de la partie précédente et ferment à la date limite fixée par les conteurs. Vos actions envoyées restent consultables dans « Résultats ».')));
        return;
      }
      const demande = params.get('mois');
      choixPeriode = options(h('select', {}), ouvertes.map((p) => [p.cle, libellePartie(p) + ' — jusqu\'au ' + dateFr(p.limite)]),
        ouvertes.some((p) => p.cle === demande) ? demande : ouvertes[0].cle);
      entete = h('div', { class: 'cam-bloc' },
        h('label', {}, 'Partie concernée'), choixPeriode,
        h('p', { class: 'sous-titre' }, ouvertes.length > 1
          ? 'Plusieurs parties sont ouvertes (préparation anticipée autorisée par les conteurs) : choisissez la bonne.'
          : resumeEtat(cal, ouvertes[0])));
    }
    const forms = [formGlobale(), formCiblee(), formSoutien(), formAip()];
    const bloc = h('div', {},
      h('div', { class: 'cam-onglets' },
        Object.entries({ globale: 'Action globale', ciblee: 'Action ciblée', soutien: 'Soutien', aip: 'AIP' })
          .map(([k, lib]) => h('button', { type: 'button', dataset: { onglet: k } }, lib))),
      forms.map((f) => f.el));
    panneaux.actions.replaceChildren(...[entete, bloc].filter(Boolean));
    forms.forEach((f) => f.init());
    remplirRaisons();
    onglets(bloc)('globale');
  }

  // ===================================================================
  // Actions envoyées : récap et résultats
  // ===================================================================
  async function mesActions() {
    const s = await fs.getDocs(fs.query(fs.collection(db, 'influences'),
      fs.where('proprietaire', '==', uid), fs.where('personnageId', '==', perso.id)));
    return s.docs.map(donneesDoc).sort((a, b) => millis(b.creeLe) - millis(a.creeLe));
  }

  const moisRecap = h('input', { type: 'month', value: moisParDefaut(cal) });
  const zoneRecap = h('div', { class: 'cam-recap' });
  async function dessinerRecap() {
    panneaux.recap.replaceChildren(h('div', { class: 'cam-bloc' },
      h('h2', {}, 'Récap du mois'),
      cal.existe ? h('p', { class: 'sous-titre' }, 'Le mois est celui de la partie visée par les actions.') : '',
      h('div', { class: 'cam-ligne' }, h('div', {}, h('label', {}, 'Mois'), moisRecap)), zoneRecap));
    zoneRecap.replaceChildren(h('p', { class: 'sous-titre' }, 'Chargement…'));
    try {
      const actions = (await mesActions()).filter((a) => a.mois === moisRecap.value);
      const bilan = (cat, niveau) => {
        const utilises = actions.filter((a) => a.categorie === cat).reduce((s, a) => s + (a.pointsAction || 0), 0);
        return { niveau, utilises, restants: niveau - utilises };
      };
      const g = bilan(CAT_GOTHA, perso.niveauGotha), p = bilan(CAT_PEGRE, perso.niveauPegre);
      const nbAip = actions.filter((a) => CATEGORIES_AIP.includes(a.categorie)).length;
      const ligne = (lib, val) => h('div', { class: 'ligne' }, h('span', {}, lib), h('strong', {}, String(val)));
      const carte = (titre, cls, b) => h('div', { class: 'cam-element' }, h('h3', { class: cls, style: 'margin-top:0' }, titre),
        ligne('Niveau', b.niveau), ligne('Points utilisés', b.utilises), ligne('Points restants', b.restants));
      zoneRecap.replaceChildren(carte('Gotha', 'gotha', g), carte('Pègre', 'pegre', p),
        h('div', { class: 'cam-element' }, h('h3', { style: 'margin-top:0' }, 'AIP'), ligne('Actions AIP ce mois', nbAip), ligne('Actions envoyées ce mois', actions.length)));
    } catch (e) { zoneRecap.replaceChildren(h('div', { class: 'cam-msg err' }, messageErreur(e))); }
  }
  moisRecap.addEventListener('change', dessinerRecap);

  async function dessinerResultats() {
    const liste = h('div', {}, h('p', { class: 'sous-titre' }, 'Chargement…'));
    panneaux.resultats.replaceChildren(h('div', { class: 'cam-bloc' },
      h('h2', {}, 'Résultats des influences'),
      h('p', { class: 'sous-titre' }, 'Toutes vos actions et les réponses du conteur. Une action sans réponse se modifie ou se retire tant que les influences de sa partie sont ouvertes.'),
      h('button', { type: 'button', class: 'secondaire', onclick: dessinerResultats }, 'Rafraîchir'), liste));
    try {
      const actions = await mesActions();
      const demandee = params.get('action');
      liste.replaceChildren(...(actions.length ? actions.map((a) => actionEl(a, a.id === demandee)) : [h('p', { class: 'sous-titre' }, 'Aucune action envoyée pour le moment.')]));
      const cible = demandee && liste.querySelector('.cam-element.epingle');
      if (cible) cible.scrollIntoView({ block: 'center' });
    } catch (e) { liste.replaceChildren(h('div', { class: 'cam-msg err' }, messageErreur(e))); }
  }

  const peutModifier = (a) => a.statut === 'attente' && !a.reponseConteur && modifiable(cal, a.mois);

  function actionEl(a, enAvant) {
    const zoneEdition = h('div', {});
    const p = partie(cal, a.mois);
    const el = h('div', { class: 'cam-element' + (enAvant ? ' epingle' : ''), id: 'action-' + a.id },
      h('div', { class: 'meta' },
        h('span', { class: 'cam-tag ' + classeCat(a.categorie) }, a.categorie),
        h('span', { class: 'cam-tag' }, TYPES_ACTION[a.type] || a.type),
        h('span', { class: 'cam-tag', title: p ? libellePartie(p) : '' }, libelleMois(a.mois)),
        (a.date ? dateFr(a.date) : '') + ' — ' + a.nomAction + ' — ' + a.pointsAction + ' pt(s)'),
      h('div', {},
        a.raisonSociale ? [h('strong', {}, 'Raison sociale : '), a.raisonSociale, h('br')] : '',
        a.cible ? [h('strong', {}, 'Cible : '), a.cible, a.categorieCible ? ' (' + a.categorieCible + ')' : '', h('br')] : '',
        a.lieu ? [h('strong', {}, 'Lieu : '), h('a', { href: lienCarte(a) }, '📍 voir sur la carte'), h('br')] : '',
        h('span', { class: 'texte' }, a.descriptif)),
      h('div', { class: 'reponse' + (a.reponseConteur ? '' : ' vide') }, a.reponseConteur ? ['Résultat du conteur : ', a.reponseConteur] : 'En attente du résultat du conteur…'),
      peutModifier(a) ? h('div', { class: 'cam-actions' },
        h('button', { type: 'button', class: 'petit', onclick: () => editerAction(a, zoneEdition) }, 'Modifier'),
        h('button', {
          type: 'button', class: 'petit danger', onclick: async () => {
            if (!confirmer('Retirer cette action ?')) return;
            try { await fs.deleteDoc(fs.doc(db, 'influences', a.id)); dessinerResultats(); } catch (e) { alert(messageErreur(e)); }
          }
        }, 'Retirer')) : '',
      zoneEdition);
    if (enAvant && peutModifier(a)) setTimeout(() => editerAction(a, zoneEdition), 0);
    return el;
  }

  const lienCarte = (a) => '/utils/carte?mois=' + encodeURIComponent(a.mois) + '&action=' + encodeURIComponent(a.id);

  // Modification d'une action pas encore traitée (fenêtre ouverte)
  function editerAction(a, zone) {
    if (zone.childNodes.length) { zone.replaceChildren(); return; }
    const c = champsCommuns(null);
    c.lieu = champLieu(a.lieu || null);
    c.lieu.surChoix = (l) => { const z = zoneDuPoint(territoires, [l.lng, l.lat]); if (z) c.zone.value = z; };
    c.date.value = a.date || '';
    options(c.ville, VILLES, a.ville || '');
    options(c.zone, OPTIONS_ZONES, a.zone || '');
    const raison = options(h('select', {}), raisons.map((r) => r.nom).concat(raisons.some((r) => r.nom === a.raisonSociale) || !a.raisonSociale ? [] : [a.raisonSociale]), a.raisonSociale);
    const cible = h('input', { type: 'text', maxlength: 150, value: a.cible || '' });
    const descriptif = h('textarea', { maxlength: 4000 }, a.descriptif || '');
    const ouvertes = periodesModifiables(cal);
    const periode = cal.existe && ouvertes.length > 1 ? options(h('select', {}), ouvertes.map((p) => [p.cle, libellePartie(p)]), a.mois) : null;
    const msg = h('div', { class: 'cam-msg' });
    const btn = h('button', { type: 'button', class: 'petit ok' }, 'Enregistrer les modifications');
    btn.addEventListener('click', async () => {
      if (!descriptif.value.trim()) { message(msg, 'Le descriptif est obligatoire.', 'err'); return; }
      if (a.cible && !cible.value.trim()) { message(msg, 'Indiquez la cible.', 'err'); return; }
      const maj = {
        date: c.date.value, ville: c.ville.value, zone: c.zone.value, raisonSociale: raison.value,
        descriptif: compresser(descriptif.value.trim()), majLe: fs.serverTimestamp(),
        lieu: c.lieu.valeur || fs.deleteField()
      };
      if (a.cible) maj.cible = cible.value.trim();
      if (periode) maj.mois = periode.value;
      btn.disabled = true;
      try {
        await fs.updateDoc(fs.doc(db, 'influences', a.id), maj);
        message(msg, 'Action modifiée.', 'ok');
        setTimeout(dessinerResultats, 600);
      } catch (e) { message(msg, messageErreur(e), 'err'); btn.disabled = false; }
    });
    zone.replaceChildren(h('div', { class: 'cam-edition' },
      h('h3', {}, 'Modifier l\'action'),
      periode ? [h('label', {}, 'Partie concernée'), periode] : '',
      ligneCommune(c),
      h('label', {}, 'Raison sociale'), raison,
      a.cible ? [h('label', {}, 'Cible'), cible] : '',
      h('label', {}, 'Descriptif joueur *'), descriptif,
      h('div', { class: 'cam-actions' }, btn, h('button', { type: 'button', class: 'petit secondaire', onclick: () => zone.replaceChildren() }, 'Annuler')),
      msg));
  }

  // ===================================================================
  // Raisons sociales
  // ===================================================================
  async function chargerRaisons() {
    const s = await fs.getDocs(fs.query(fs.collection(db, 'raisons_sociales'),
      fs.where('proprietaire', '==', uid), fs.where('personnageId', '==', perso.id)));
    raisons = s.docs.map(donneesDoc).sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
  }

  function dessinerRaisons() {
    const nom = h('input', { type: 'text', maxlength: 150, placeholder: 'Ex : Agence France-Presse Isère' });
    const ville = options(h('select', {}), VILLES, 'Grenoble');
    const zone = options(h('select', {}), OPTIONS_ZONES);
    const categorie = options(h('select', {}), CATEGORIES_RAISON_SOCIALE);
    const description = h('textarea', { maxlength: 3000, placeholder: 'Contexte, historique, comment le personnage y a accès…' });
    const msg = h('div', { class: 'cam-msg' });
    const btn = h('button', { type: 'button' }, 'Ajouter au registre');
    btn.addEventListener('click', async () => {
      if (!nom.value.trim()) { message(msg, 'Le nom est obligatoire.', 'err'); return; }
      try {
        await fs.addDoc(fs.collection(db, 'raisons_sociales'), {
          proprietaire: uid, personnageId: perso.id, personnageNom: perso.nom, nom: nom.value.trim(),
          ville: ville.value, zone: zone.value, categorie: categorie.value, description: compresser(description.value.trim()),
          creeLe: fs.serverTimestamp()
        });
        await chargerRaisons(); dessinerRaisons(); remplirRaisons();
        message(panneaux.raisons.querySelector('.cam-msg'), 'Raison sociale ajoutée.', 'ok');
      } catch (e) { message(msg, messageErreur(e), 'err'); }
    });
    panneaux.raisons.replaceChildren(h('div', { class: 'cam-bloc' },
      h('h2', {}, 'Raisons sociales'),
      h('p', { class: 'sous-titre' }, 'Registre des organismes, entreprises ou PNJ liés à votre personnage, réutilisables dans les formulaires d\'action.'),
      h('div', { class: 'cam-ligne' }, h('div', {}, h('label', {}, 'Nom *'), nom), h('div', {}, h('label', {}, 'Ville'), ville), h('div', {}, h('label', {}, 'Zone'), zone), h('div', {}, h('label', {}, 'Catégorie'), categorie)),
      h('label', {}, 'Description (facultatif)'), description, btn, msg,
      h('h3', {}, 'Raisons sociales de ' + perso.nom),
      ...(raisons.length ? raisons.map((r) => h('div', { class: 'cam-element' },
        h('div', { class: 'meta' }, h('span', { class: 'cam-tag ' + classeCat(r.categorie) }, r.categorie), (r.ville || '') + ' — zone ' + libelleZone(r.zone)),
        h('strong', {}, r.nom), r.description ? h('div', { class: 'texte' }, r.description) : '',
        h('button', {
          type: 'button', class: 'petit danger', onclick: async () => {
            if (!confirmer('Supprimer « ' + r.nom + ' » du registre ?')) return;
            try { await fs.deleteDoc(fs.doc(db, 'raisons_sociales', r.id)); await chargerRaisons(); dessinerRaisons(); remplirRaisons(); } catch (e) { alert(messageErreur(e)); }
          }
        }, 'Supprimer'))) : [h('p', { class: 'sous-titre' }, 'Aucune raison sociale pour le moment.')])));
  }

  // ===================================================================
  // Démarrage
  // ===================================================================
  await chargerRaisons();
  dessinerFiche(); dessinerActions(); dessinerRaisons();
  dessinerRecap(); dessinerResultats();
});
