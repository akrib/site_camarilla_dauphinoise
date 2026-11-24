// Page /influences/ : actions d'influence du personnage incarné (Firestore).
// Les actions visent une partie du calendrier (champ mois = clé de la partie)
// et ne se créent / modifient que pendant sa fenêtre d'influences.
// Paramètres d'adresse reconnus (liens depuis la carte de Grenoble) :
//   ?perso=ID   personnage à incarner (s'il est en jeu et au membre)
//   ?mois=AAAA-MM&lieu=lng,lat#actions   nouvelle action, partie et lieu choisis
//   ?action=ID#resultats   action à mettre en avant (et à modifier si possible)
// Les tickets ont leur propre page : /membres/tickets/.
// Raison sociale d'une action Gotha / Pègre : une des spécialisations
// d'influence de la fiche (plus de registre à part). Les AIP suivent le
// chapitre « Actions Inter-Partie » des règles : réserve de base (3 par
// partie), Informatique, Sciences, Troupeau (voir fiche/aip.js).
import {
  h, db, fs, pageProtegee, barreMembre, estConteur, message, messageErreur, dateFr, millis, onglets, options,
  confirmer, aujourdhui
} from '../core.js';
import { compresser, donneesDoc, decompresserJson, estCompresse } from '../compression.js';
import { budgetAip } from '../fiche/aip.js';
import { normaliser } from '../fiche/modele.js';
import {
  chargerCalendrier, encartCalendrier, periodesModifiables, modifiable, moisParDefaut, libelleMois, libellePartie,
  partieCourante, resumeEtat, partie
} from '../calendrier.js';
import { choisirLieu, texteLieu, chargerTerritoires, zoneDuPoint } from '../carte-base.js';
import {
  VILLES, OPTIONS_ZONES, POINTS, SPECIALISATIONS, CAT_GOTHA, CAT_PEGRE, ACTIONS_GOTHA_GLOB, ACTIONS_PEGRE_GLOB,
  CATEGORIES_AIP, RESERVES_AIP, ACTIONS_AIP, POINTS_AIP, reserveAip, TYPES_ACTION, classeCat
} from '../donnees.js';
import { personnageIncarne, incarner, blocChoixPersonnage, fenetreChoixPersonnage, joueurDe } from '../incarnation.js';
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
      if (p && joueurDe(p) === uid && p.statut === 'active') { incarner(uid, p); perso = p; }
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

  // Fiche complète (lisible du joueur) : budget d'AIP et domaines de Sciences.
  const fichePrete = (async () => {
    try {
      if (perso.fiche) return normaliser(perso.fiche);   // ancien format
      const s = await fs.getDoc(fs.doc(db, 'personnages', perso.id, 'detail', 'fiche'));
      if (!s.exists()) return null;
      const x = s.data();
      const f = x.fiche && typeof x.fiche === 'object' && !estCompresse(x.fiche) ? x.fiche : JSON.parse((await decompresserJson(x.fiche)) || 'null');
      return f ? normaliser(f) : null;
    } catch (e) { console.warn('Fiche illisible', e); return null; }
  })();

  // ===================================================================
  // Structure
  // ===================================================================
  const panneaux = {
    fiche: h('div', { dataset: { panneau: 'fiche' } }),
    actions: h('div', { dataset: { panneau: 'actions' } }),
    recap: h('div', { dataset: { panneau: 'recap' } }),
    resultats: h('div', { dataset: { panneau: 'resultats' } })
  };
  const libelles = { fiche: 'Fiche', actions: 'Actions', recap: 'Récap du mois', resultats: 'Résultats' };
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
        h('div', {}, h('h3', { class: 'gotha' }, 'Gotha — niveau ' + p.niveauGotha), listeSpecs(p.specsGotha)),
        h('div', {}, h('h3', { class: 'pegre' }, 'Pègre — niveau ' + p.niveauPegre), listeSpecs(p.specsPegre)),
        zoneAipFiche),
      h('p', { class: 'sous-titre' }, 'Les spécialisations d\'influence de la fiche sont vos raisons sociales : choisissez-en une pour chaque action Gotha ou Pègre. ',
        'Ces valeurs viennent de votre fiche validée. Pour les faire évoluer : ',
        h('a', { href: '/membres/fiches/#fiche-' + p.id }, 'ouvrir la fiche'), ' puis « Demander une modification ».')));
    fichePrete.then((f) => {
      const a = f ? budgetAip(f) : p.aip;
      if (!a) return;
      const domaines = f ? f.sciences.filter((x) => x.nom && parseInt(x.niveau, 10) > 0).map((x) => x.nom) : [];
      zoneAipFiche.replaceChildren(h('h3', {}, 'Actions inter-partie'),
        ligne('Par partie', String(a.base + a.informatique + a.sciences)),
        ligne('dont Informatique', a.informatique ? '+1' : '—'),
        ligne('dont Sciences', a.sciences ? '+' + a.sciences + (domaines.length ? ' (' + domaines.join(', ') + ')' : '') : '—'),
        ligne('Troupeau', a.troupeau ? 'niveau ' + a.troupeau : '—'),
        ligne('Se nourrir', a.nourriture + ' AIP' + (a.troupeau ? ' (Troupeau : ' + Math.max(0, a.nourriture - a.troupeau) + ')' : '')));
    });
  }
  const zoneAipFiche = h('div', {});
  const listeSpecs = (l) => ((l || []).length ? h('ul', { class: 'cam-raisons' }, l.map((x) => h('li', {}, x))) : h('p', {}, 'Aucune spécialisation'));

  // ===================================================================
  // Actions
  // ===================================================================
  // Raison sociale : une spécialisation d'influence de la fiche, de la catégorie
  // de l'action (Gotha ou Pègre). categorie : nom de catégorie ou <select>.
  const specsDe = (cat) => ((cat === CAT_PEGRE ? perso.specsPegre : perso.specsGotha) || []).filter(Boolean);
  function selectRaison(categorie, initiale = '') {
    const s = h('select', { class: 'cam-raison' });
    let touche = false;
    s.addEventListener('change', () => { touche = true; });
    const remplir = () => {
      const l = specsDe(typeof categorie === 'string' ? categorie : categorie.value);
      const vals = l.map((x) => [x, x]);
      if (initiale && !l.includes(initiale)) vals.push([initiale, initiale + ' (n\'est plus sur la fiche)']);
      const choix = touche && vals.some(([v]) => v === s.value) ? s.value : (initiale || l[0] || '');
      options(s, vals, choix, l.length ? 'Sans spécialisation particulière' : '— Aucune spécialisation de cette catégorie sur la fiche —');
      s.dispatchEvent(new Event('input'));
    };
    if (typeof categorie !== 'string') categorie.addEventListener('change', () => { touche = false; remplir(); });
    remplir();
    return s;
  }
  // Type de spécialisation (liste des 15) deviné d'après la raison sociale : « Banques (Finance) » -> Finance.
  const sansAcc = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const typeDeRaison = (r) => {
    const t = sansAcc(r);
    const mot = (x) => new RegExp('(^|[^a-z])' + sansAcc(x).replace(/s$/, '') + 's?([^a-z]|$)').test(t);
    return SPECIALISATIONS.find((x) => t.includes('(' + sansAcc(x).replace(/s$/, ''))) || SPECIALISATIONS.find(mot) || '';
  };

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
    // Le lieu choisi sur la carte remplit le territoire (zones officielles tracées par les conteurs).
    c.zoneNote = h('small', { class: 'cam-note-zone' });
    const zoneAuto = (l) => {
      const z = zoneDuPoint(territoires, [l.lng, l.lat]);
      if (z) { c.zone.value = z; c.zoneNote.textContent = 'D\'après le lieu choisi sur la carte.'; }
    };
    c.zone.addEventListener('change', () => { c.zoneNote.textContent = ''; });
    c.lieu.surChoix = zoneAuto;
    if (lieuInitial) territoiresPrets.then(() => zoneAuto(lieuInitial));
    return c;
  }
  const ligneCommune = (c) => [h('div', { class: 'cam-ligne' },
    h('div', {}, h('label', {}, 'Date'), c.date), h('div', {}, h('label', {}, 'Ville'), c.ville), h('div', {}, h('label', {}, 'Territoire'), c.zone, c.zoneNote)),
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
    const spec = options(h('select', {}), SPECIALISATIONS, '', 'Aucune');
    const raison = selectRaison(categorie);
    raison.addEventListener('input', () => { const t = typeDeRaison(raison.value); if (t) spec.value = t; });
    raison.addEventListener('change', () => { const t = typeDeRaison(raison.value); if (t) spec.value = t; });
    raison.dispatchEvent(new Event('input'));
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
      h('div', { class: 'cam-ligne' }, h('div', {}, h('label', {}, 'Catégorie'), categorie),
        h('div', {}, h('label', { title: 'Une des spécialisations d\'influence de votre fiche' }, 'Raison sociale'), raison),
        h('div', {}, h('label', { title: 'Une action en rapport avec la spécialisation compte un niveau de plus' }, 'Type de spécialisation'), spec)),
      h('label', {}, 'Action'), action, desc, cout,
      h('label', {}, 'Points d\'action'), points,
      h('label', {}, 'Descriptif joueur *'), descriptif, btn, msg);
    return { el, init: majActions };
  }

  function formCiblee() {
    const c = champsCommuns();
    const categorie = options(h('select', {}), [CAT_GOTHA, CAT_PEGRE]);
    const action = options(h('select', {}), ['Attaque', 'Défense', 'Obstruction']);
    const raison = selectRaison(categorie);
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
      h('div', { class: 'cam-ligne' }, h('div', {}, h('label', { title: 'Une des spécialisations d\'influence de votre fiche' }, 'Raison sociale'), raison), h('div', {}, h('label', {}, 'Catégorie de la cible'), catCible), h('div', {}, h('label', {}, 'Points visés'), points)),
      h('label', {}, 'Cible *'), cible, cout,
      h('label', {}, 'Descriptif joueur *'), descriptif, btn, msg);
    return { el, init: maj };
  }

  function formSoutien() {
    const c = champsCommuns();
    const categorie = options(h('select', {}), [CAT_GOTHA, CAT_PEGRE]);
    const raison = selectRaison(categorie);
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
      h('div', { class: 'cam-ligne' }, h('div', {}, h('label', {}, 'Catégorie'), categorie), h('div', {}, h('label', { title: 'Une des spécialisations d\'influence de votre fiche' }, 'Raison sociale'), raison), h('div', {}, h('label', {}, 'Niveau de la cible avant ce point'), niveau)),
      h('label', {}, 'Cible (personnage soutenu) *'), cible,
      h('div', { class: 'cam-ligne' }, h('div', {}, h('label', {}, 'Malus hors-praxis (0 à -3)'), malus)),
      cout, h('label', {}, 'Descriptif joueur *'), descriptif, btn, msg);
    return { el, init: maj };
  }

  // AIP : réserve utilisée (base, Informatique, Science, Troupeau), action des
  // règles, nombre d'AIP, cible ou sujet facultatif, descriptif d'une phrase.
  function formAip() {
    const c = champsCommuns();
    const reserve = options(h('select', {}), Object.entries(RESERVES_AIP));
    const domaine = h('select', {});
    const ligneDomaine = h('div', { style: 'display:none' }, h('label', {}, 'Domaine d\'étude (Sciences)'), domaine);
    const action = h('select', {});
    const desc = h('div', { class: 'sous-titre' });
    const points = options(h('select', { class: 'cam-points-aip' }), POINTS_AIP);
    const libPoints = h('label', {}, 'Nombre d\'AIP');
    const libCible = h('label', {}, 'Cible ou sujet (facultatif)');
    const cible = h('input', { type: 'text', maxlength: 150 });
    const budget = h('div', { class: 'cam-encart cam-budget-aip' }, 'Calcul des AIP disponibles…');
    const descriptif = h('textarea', { maxlength: 4000, placeholder: 'Une phrase suffit (règles) : ce que fait votre personnage, où, avec qui…' });
    const msg = h('div', { class: 'cam-msg' });
    let fiche = null, aip = null;
    const actionChoisie = () => ACTIONS_AIP.find((a) => a.nom === action.value) || ACTIONS_AIP[0];
    const majActions = () => {
      const avant = action.value;
      const l = ACTIONS_AIP.filter((a) => a.reserves.includes(reserve.value));
      options(action, l.map((a) => a.nom), l.some((a) => a.nom === avant) ? avant : l[0].nom);
      ligneDomaine.style.display = reserve.value === 'AIP (Science)' ? '' : 'none';
      majAction();
    };
    const majAction = () => {
      const a = actionChoisie();
      desc.textContent = a.desc;
      if (a.points) points.value = String(a.points);
      else if (a.nourriture && aip) points.value = String(reserve.value === 'AIP (Troupeau)' ? Math.min(aip.troupeau || 1, aip.nourriture) : Math.max(1, aip.nourriture - (aip.troupeau || 0)));
      libPoints.textContent = reserve.value === 'AIP (Troupeau)' ? 'Points de Troupeau utilisés' : 'Nombre d\'AIP';
      cible.placeholder = a.cible || 'Personnage, piste, objet…';
      majBudget();
    };
    reserve.addEventListener('change', majActions);
    action.addEventListener('change', majAction);
    points.addEventListener('change', majBudget);

    // Budget de la partie visée : AIP de la fiche moins celles déjà envoyées.
    let envoyees = [];
    async function chargerEnvoyees() {
      try { envoyees = (await mesActions()).filter((a) => a.type === 'aip'); } catch (e) { envoyees = []; }
      majBudget();
    }
    function utilise(res, mois) {
      return envoyees.filter((a) => a.mois === mois && reserveAip(a.categorie) === res).reduce((t, a) => t + (a.pointsAction || 0), 0);
    }
    function majBudget() {
      if (!aip) { budget.textContent = 'AIP de la fiche : 3 entre deux parties (Informatique et Sciences en donnent davantage).'; return; }
      const mois = moisDesNouvellesActions({ date: c.date.value });
      const p = partie(cal, mois);
      const domaines = fiche ? fiche.sciences.filter((x) => x.nom && parseInt(x.niveau, 10) > 0).map((x) => x.nom) : [];
      const pastille = (lib, u, max) => h('span', { class: 'cam-tag ' + (u > max ? 'refusee' : u === max && max ? 'attente' : '') }, lib + ' ' + u + ' / ' + max);
      budget.replaceChildren(...[
        h('strong', {}, 'AIP ' + (p ? 'pour ' + libellePartie(p) : mois ? 'de ' + libelleMois(mois).toLowerCase() : '') + ' : '),
        pastille('base', utilise('AIP', mois), aip.base), ' ',
        aip.informatique ? [pastille('Informatique', utilise('AIP (Informatique)', mois), aip.informatique), ' '] : '',
        aip.sciences ? [pastille('Science', utilise('AIP (Science)', mois), aip.sciences), ' '] : '',
        aip.troupeau ? pastille('Troupeau', utilise('AIP (Troupeau)', mois), aip.troupeau) : '',
        h('br'),
        h('small', {}, 'Se nourrir : ' + aip.nourriture + ' AIP' + (aip.nourriture > 1 ? ' (faiblesse Ventrue)' : '')
          + (aip.troupeau ? ', réduit de ' + aip.troupeau + ' par votre Troupeau' : '')
          + '. Faute de quoi, vous commencez la partie à demi-réserve de sang (arrondi au supérieur). Les AIP ne se reportent pas d\'une partie à l\'autre.'
          + (domaines.length ? ' AIP Science réservées à vos domaines : ' + domaines.join(', ') + '.' : ''))].flat().filter(Boolean));
    }
    fichePrete.then((f) => {
      fiche = f;
      aip = f ? budgetAip(f) : perso.aip || null;
      const domaines = f ? f.sciences.filter((x) => x.nom && parseInt(x.niveau, 10) > 0).map((x) => x.nom) : [];
      options(domaine, domaines.length ? domaines : [['', 'Aucun domaine de Sciences sur la fiche']]);
      majAction();
    });
    if (choixPeriode) choixPeriode.addEventListener('change', majBudget);
    c.date.addEventListener('change', majBudget);

    const btn = h('button', { type: 'button' }, 'Envoyer');
    btn.addEventListener('click', async () => {
      const a = actionChoisie();
      const n = parseInt(points.value, 10);
      const res = reserve.value;
      if (res === 'AIP (Science)' && !domaine.value) { message(msg, 'Les AIP Science demandent un domaine d\'étude (Sciences) sur la fiche.', 'err'); return; }
      if (aip) {
        const mois = moisDesNouvellesActions({ date: c.date.value });
        const max = { 'AIP': aip.base, 'AIP (Informatique)': aip.informatique, 'AIP (Science)': aip.sciences, 'AIP (Troupeau)': aip.troupeau }[res] || 0;
        if (utilise(res, mois) + n > max && !confirmer('Cette action dépasse votre réserve « ' + RESERVES_AIP[res] + ' » pour cette partie ('
          + (utilise(res, mois) + n) + ' sur ' + max + '). L\'envoyer quand même (le conteur tranchera) ?')) return;
      }
      if (await envoyerAction({
        type: 'aip', date: c.date.value, ville: c.ville.value, zone: c.zone.value, categorie: res,
        nomAction: a.nom, pointsAction: n, specialisation: res === 'AIP (Science)' ? domaine.value : '',
        cible: cible.value.trim(), descriptif: descriptif.value.trim()
      }, msg, btn, c)) { descriptif.value = ''; cible.value = ''; chargerEnvoyees(); }
    });
    const el = h('div', { class: 'cam-bloc', dataset: { panneau: 'aip' } },
      h('h2', {}, 'Nouvelle action inter-partie (AIP)'),
      h('p', { class: 'sous-titre' }, 'Entre deux parties : enquêter, patrouiller, se nourrir, créer, apprendre… Le conteur décide s\'il faut un challenge ou une scène, puis donne le résultat.'),
      budget,
      ligneCommune(c),
      h('div', { class: 'cam-ligne' },
        h('div', {}, h('label', {}, 'Réserve utilisée'), reserve), ligneDomaine,
        h('div', {}, h('label', {}, 'Action'), action),
        h('div', {}, libPoints, points)),
      desc,
      libCible, cible,
      h('label', {}, 'Descriptif *'), descriptif, btn, msg);
    return { el, init: () => { majActions(); chargerEnvoyees(); } };
  }

  function dessinerActions() {
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
      const aipEnvoyees = actions.filter((a) => a.type === 'aip' || CATEGORIES_AIP.includes(a.categorie));
      const f = await fichePrete;
      const aip = f ? budgetAip(f) : perso.aip || { base: 3, informatique: 0, sciences: 0, troupeau: 0, nourriture: 1 };
      const pris = (res) => aipEnvoyees.filter((a) => reserveAip(a.categorie) === res).reduce((t, a) => t + (a.pointsAction || 0), 0);
      const ligne = (lib, val) => h('div', { class: 'ligne' }, h('span', {}, lib), h('strong', {}, String(val)));
      const carte = (titre, cls, b) => h('div', { class: 'cam-element' }, h('h3', { class: cls, style: 'margin-top:0' }, titre),
        ligne('Niveau', b.niveau), ligne('Points utilisés', b.utilises), ligne('Points restants', b.restants));
      zoneRecap.replaceChildren(carte('Gotha', 'gotha', g), carte('Pègre', 'pegre', p),
        h('div', { class: 'cam-element' }, h('h3', { style: 'margin-top:0' }, 'Actions inter-partie'),
          ligne('AIP de base', pris('AIP') + ' / ' + aip.base),
          aip.informatique || pris('AIP (Informatique)') ? ligne('AIP Informatique', pris('AIP (Informatique)') + ' / ' + aip.informatique) : '',
          aip.sciences || pris('AIP (Science)') ? ligne('AIP Science', pris('AIP (Science)') + ' / ' + aip.sciences) : '',
          aip.troupeau || pris('AIP (Troupeau)') ? ligne('Troupeau', pris('AIP (Troupeau)') + ' / ' + aip.troupeau) : '',
          ligne('S\'est nourri', aipEnvoyees.some((a) => a.nomAction === 'Se nourrir' || a.nomAction === 'Se nourrir (Troupeau)') ? 'oui' : 'non — demi-réserve de sang'),
          ligne('Actions envoyées (toutes)', actions.length)));
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
        (a.date ? dateFr(a.date) : '') + ' — ' + a.nomAction + ' — ' + a.pointsAction + (a.type === 'aip' ? (a.categorie === 'AIP (Troupeau)' ? ' pt(s) de Troupeau' : ' AIP') : ' pt(s)')
          + (a.type === 'aip' && a.specialisation ? ' — ' + a.specialisation : '')),
      h('div', {},
        a.raisonSociale ? [h('strong', {}, 'Raison sociale : '), a.raisonSociale, h('br')] : '',
        a.cible ? [h('strong', {}, a.type === 'aip' ? 'Sujet : ' : 'Cible : '), a.cible, a.categorieCible ? ' (' + a.categorieCible + ')' : '', h('br')] : '',
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
    c.lieu.surChoix = (l) => { const z = zoneDuPoint(territoires, [l.lng, l.lat]); if (z) { c.zone.value = z; c.zoneNote.textContent = 'D\'après le lieu choisi sur la carte.'; } };
    c.date.value = a.date || '';
    options(c.ville, VILLES, a.ville || '');
    options(c.zone, OPTIONS_ZONES, a.zone || '');
    const raison = a.type !== 'aip' ? selectRaison(a.categorie, a.raisonSociale || '') : null;
    const avecCible = !!a.cible || a.type === 'aip';
    const cible = h('input', { type: 'text', maxlength: 150, value: a.cible || '' });
    const descriptif = h('textarea', { maxlength: 4000 }, a.descriptif || '');
    const ouvertes = periodesModifiables(cal);
    const periode = cal.existe && ouvertes.length > 1 ? options(h('select', {}), ouvertes.map((p) => [p.cle, libellePartie(p)]), a.mois) : null;
    const msg = h('div', { class: 'cam-msg' });
    const btn = h('button', { type: 'button', class: 'petit ok' }, 'Enregistrer les modifications');
    btn.addEventListener('click', async () => {
      if (!descriptif.value.trim()) { message(msg, 'Le descriptif est obligatoire.', 'err'); return; }
      if (a.cible && a.type !== 'aip' && !cible.value.trim()) { message(msg, 'Indiquez la cible.', 'err'); return; }
      const maj = {
        date: c.date.value, ville: c.ville.value, zone: c.zone.value,
        descriptif: compresser(descriptif.value.trim()), majLe: fs.serverTimestamp(),
        lieu: c.lieu.valeur || fs.deleteField()
      };
      if (raison) maj.raisonSociale = raison.value;
      if (avecCible) maj.cible = cible.value.trim();
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
      raison ? [h('label', { title: 'Une des spécialisations d\'influence de votre fiche' }, 'Raison sociale'), raison] : '',
      avecCible ? [h('label', {}, a.type === 'aip' ? 'Cible ou sujet (facultatif)' : 'Cible'), cible] : '',
      h('label', {}, 'Descriptif joueur *'), descriptif,
      h('div', { class: 'cam-actions' }, btn, h('button', { type: 'button', class: 'petit secondaire', onclick: () => zone.replaceChildren() }, 'Annuler')),
      msg));
  }

  // ===================================================================
  // Démarrage
  // ===================================================================
  dessinerFiche(); dessinerActions();
  dessinerRecap(); dessinerResultats();
});
