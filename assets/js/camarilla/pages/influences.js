// Page /influences/ : actions d'influence des joueurs (Firestore).
import {
  h, db, fs, pageProtegee, barreMembre, message, messageErreur, dateFr, millis, onglets, options,
  confirmer, moisCourant, aujourdhui
} from '../core.js';
import {
  VILLES, ZONES, POINTS, SPECIALISATIONS, CAT_GOTHA, CAT_PEGRE, ACTIONS_GOTHA_GLOB, ACTIONS_PEGRE_GLOB,
  CATEGORIES_AIP, AIP_ACTIONS, CATEGORIES_RAISON_SOCIALE, CATEGORIES_TICKET, TYPES_ACTION, STATUTS_TICKET
} from '../donnees.js';

const racine = document.getElementById('cam-influences');
barreMembre(document.getElementById('cam-barre'));

const CLASSE_TICKET = {
  'En attente': 'attente', 'En cours': 'encours', 'Informations demandées': 'infos',
  'Complété': 'complete', 'Refusé': 'refuse', 'Annulé': 'annule'
};
const classeCat = (c) => (c || '').includes('Gotha') ? 'gotha' : ((c || '').includes('Pègre') ? 'pegre' : '');

pageProtegee(racine, 'actif', async ({ user, profil }) => {
  const uid = user.uid;
  const snap = await fs.getDocs(fs.query(fs.collection(db, 'personnages'), fs.where('proprietaire', '==', uid)));
  const tousPersos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const enJeu = tousPersos.filter((p) => p.statut === 'active').sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));

  let perso = null;            // personnage sélectionné
  let raisons = [];            // raisons sociales du personnage
  const choixPerso = options(h('select', {}), enJeu.map((p) => [p.id, p.nom]), enJeu[0] ? enJeu[0].id : '');

  // ===================================================================
  // Structure
  // ===================================================================
  const panneaux = {
    fiche: h('div', { dataset: { panneau: 'fiche' } }),
    actions: h('div', { dataset: { panneau: 'actions' } }),
    recap: h('div', { dataset: { panneau: 'recap' } }),
    resultats: h('div', { dataset: { panneau: 'resultats' } }),
    raisons: h('div', { dataset: { panneau: 'raisons' } }),
    tickets: h('div', { dataset: { panneau: 'tickets' } })
  };
  const libelles = { fiche: 'Fiche', actions: 'Actions', recap: 'Récap du mois', resultats: 'Résultats', raisons: 'Raisons sociales', tickets: 'Tickets' };
  const visibles = enJeu.length ? Object.keys(panneaux) : ['tickets'];
  const app = h('div', {},
    h('div', { class: 'cam-onglets' }, visibles.map((k) => h('button', { type: 'button', dataset: { onglet: k } }, libelles[k]))),
    visibles.map((k) => panneaux[k]));

  if (enJeu.length) {
    racine.append(h('div', { class: 'cam-bloc' },
      h('div', { class: 'cam-ligne' }, h('div', {}, h('label', {}, 'Personnage en jeu'), choixPerso)),
      enJeu.length > 1 ? h('p', { class: 'sous-titre' }, 'Vous avez plusieurs personnages en jeu : choisissez celui pour lequel vous agissez.') : ''));
  } else {
    racine.append(h('div', { class: 'cam-encart alerte' },
      'Aucun de vos personnages n\'est « en jeu ». Créez une fiche dans ',
      h('a', { href: '/membres/fiches/' }, 'Mes fiches de personnage'),
      ' et faites-la valider puis mettre en jeu par un conteur pour pouvoir utiliser vos influences. Les tickets restent disponibles.'));
  }
  racine.append(app);
  const activer = onglets(app);
  activer(location.hash === '#tickets' || !enJeu.length ? 'tickets' : 'fiche');

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

  function champsCommuns() {
    return {
      date: h('input', { type: 'date', value: aujourdhui() }),
      ville: options(h('select', {}), VILLES, perso ? perso.ville : ''),
      zone: options(h('select', {}), ZONES)
    };
  }
  const ligneCommune = (c) => h('div', { class: 'cam-ligne' },
    h('div', {}, h('label', {}, 'Date'), c.date), h('div', {}, h('label', {}, 'Ville'), c.ville), h('div', {}, h('label', {}, 'Zone (district)'), c.zone));

  async function envoyerAction(champs, msg, boutonEl) {
    if (!champs.raisonSociale) { message(msg, 'Choisissez une raison sociale (onglet Raisons sociales pour en créer une).', 'err'); return false; }
    if (!champs.descriptif) { message(msg, 'Le descriptif est obligatoire.', 'err'); return false; }
    boutonEl.disabled = true;
    message(msg, 'Envoi…', 'info');
    try {
      await fs.addDoc(fs.collection(db, 'influences'), {
        proprietaire: uid, personnageId: perso.id, personnageNom: perso.nom,
        mois: (champs.date || aujourdhui()).slice(0, 7), statut: 'attente', reponseConteur: '',
        creeLe: fs.serverTimestamp(), cible: '', specialisation: '', niveau: 0, categorieCible: '',
        ...champs
      });
      message(msg, 'Action envoyée au conteur.', 'ok');
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
      }, msg, btn)) descriptif.value = '';
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
      }, msg, btn)) { descriptif.value = ''; cible.value = ''; }
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
      }, msg, btn)) { descriptif.value = ''; cible.value = ''; }
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
      }, msg, btn)) descriptif.value = '';
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
    const forms = [formGlobale(), formCiblee(), formSoutien(), formAip()];
    const bloc = h('div', {},
      h('div', { class: 'cam-onglets' },
        Object.entries({ globale: 'Action globale', ciblee: 'Action ciblée', soutien: 'Soutien', aip: 'AIP' })
          .map(([k, lib]) => h('button', { type: 'button', dataset: { onglet: k } }, lib))),
      forms.map((f) => f.el));
    panneaux.actions.replaceChildren(bloc);
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
    return s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => millis(b.creeLe) - millis(a.creeLe));
  }

  const moisRecap = h('input', { type: 'month', value: moisCourant() });
  const zoneRecap = h('div', { class: 'cam-recap' });
  async function dessinerRecap() {
    panneaux.recap.replaceChildren(h('div', { class: 'cam-bloc' },
      h('h2', {}, 'Récap du mois'),
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
      h('h2', {}, 'Résultats des influences'), h('p', { class: 'sous-titre' }, 'Toutes vos actions et les réponses du conteur.'),
      h('button', { type: 'button', class: 'secondaire', onclick: dessinerResultats }, 'Rafraîchir'), liste));
    try {
      const actions = await mesActions();
      liste.replaceChildren(...(actions.length ? actions.map((a) => h('div', { class: 'cam-element' },
        h('div', { class: 'meta' },
          h('span', { class: 'cam-tag ' + classeCat(a.categorie) }, a.categorie),
          h('span', { class: 'cam-tag' }, TYPES_ACTION[a.type] || a.type),
          (a.date ? dateFr(a.date) : '') + ' — ' + a.nomAction + ' — ' + a.pointsAction + ' pt(s)'),
        h('div', {},
          a.raisonSociale ? [h('strong', {}, 'Raison sociale : '), a.raisonSociale, h('br')] : '',
          a.cible ? [h('strong', {}, 'Cible : '), a.cible, a.categorieCible ? ' (' + a.categorieCible + ')' : '', h('br')] : '',
          h('span', { class: 'texte' }, a.descriptif)),
        h('div', { class: 'reponse' + (a.reponseConteur ? '' : ' vide') }, a.reponseConteur ? ['Résultat du conteur : ', a.reponseConteur] : 'En attente du résultat du conteur…'),
        a.statut === 'attente' && !a.reponseConteur ? h('button', {
          type: 'button', class: 'petit danger', onclick: async () => {
            if (!confirmer('Retirer cette action ?')) return;
            try { await fs.deleteDoc(fs.doc(db, 'influences', a.id)); dessinerResultats(); } catch (e) { alert(messageErreur(e)); }
          }
        }, 'Retirer') : '')) : [h('p', { class: 'sous-titre' }, 'Aucune action envoyée pour le moment.')]));
    } catch (e) { liste.replaceChildren(h('div', { class: 'cam-msg err' }, messageErreur(e))); }
  }

  // ===================================================================
  // Raisons sociales
  // ===================================================================
  async function chargerRaisons() {
    const s = await fs.getDocs(fs.query(fs.collection(db, 'raisons_sociales'),
      fs.where('proprietaire', '==', uid), fs.where('personnageId', '==', perso.id)));
    raisons = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
  }

  function dessinerRaisons() {
    const nom = h('input', { type: 'text', maxlength: 150, placeholder: 'Ex : Agence France-Presse Isère' });
    const ville = options(h('select', {}), VILLES, perso.ville);
    const zone = options(h('select', {}), ZONES);
    const categorie = options(h('select', {}), CATEGORIES_RAISON_SOCIALE);
    const description = h('textarea', { maxlength: 3000, placeholder: 'Contexte, historique, comment le personnage y a accès…' });
    const msg = h('div', { class: 'cam-msg' });
    const btn = h('button', { type: 'button' }, 'Ajouter au registre');
    btn.addEventListener('click', async () => {
      if (!nom.value.trim()) { message(msg, 'Le nom est obligatoire.', 'err'); return; }
      try {
        await fs.addDoc(fs.collection(db, 'raisons_sociales'), {
          proprietaire: uid, personnageId: perso.id, personnageNom: perso.nom, nom: nom.value.trim(),
          ville: ville.value, zone: zone.value, categorie: categorie.value, description: description.value.trim(),
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
        h('div', { class: 'meta' }, h('span', { class: 'cam-tag ' + classeCat(r.categorie) }, r.categorie), (r.ville || '') + ' — Zone ' + (r.zone || '')),
        h('strong', {}, r.nom), r.description ? h('div', { class: 'texte' }, r.description) : '',
        h('button', {
          type: 'button', class: 'petit danger', onclick: async () => {
            if (!confirmer('Supprimer « ' + r.nom + ' » du registre ?')) return;
            try { await fs.deleteDoc(fs.doc(db, 'raisons_sociales', r.id)); await chargerRaisons(); dessinerRaisons(); remplirRaisons(); } catch (e) { alert(messageErreur(e)); }
          }
        }, 'Supprimer'))) : [h('p', { class: 'sous-titre' }, 'Aucune raison sociale pour le moment.')])));
  }

  // ===================================================================
  // Tickets
  // ===================================================================
  async function dessinerTickets() {
    const categorie = options(h('select', {}), CATEGORIES_TICKET);
    const persoTicket = options(h('select', {}), [['', 'Aucun / question générale'], ...tousPersos.map((p) => [p.id, p.nom])], perso ? perso.id : '');
    const sujet = h('input', { type: 'text', maxlength: 150, placeholder: 'Ex : Scène avec le Prince' });
    const description = h('textarea', { maxlength: 6000, placeholder: 'Détaillez votre demande le plus précisément possible.' });
    const msg = h('div', { class: 'cam-msg' });
    const liste = h('div', {}, h('p', { class: 'sous-titre' }, 'Chargement…'));
    const btn = h('button', { type: 'button' }, 'Envoyer le ticket');
    btn.addEventListener('click', async () => {
      if (!sujet.value.trim() || !description.value.trim()) { message(msg, 'Le sujet et la description sont obligatoires.', 'err'); return; }
      const p = tousPersos.find((x) => x.id === persoTicket.value);
      try {
        await fs.addDoc(fs.collection(db, 'tickets'), {
          proprietaire: uid, proprietaireNom: profil.nom, personnageId: p ? p.id : '', personnageNom: p ? p.nom : '',
          categorie: categorie.value, sujet: sujet.value.trim(), description: description.value.trim(),
          statut: 'En attente', resultat: '', creeLe: fs.serverTimestamp()
        });
        sujet.value = ''; description.value = '';
        message(msg, 'Ticket envoyé.', 'ok');
        chargerListe();
      } catch (e) { message(msg, messageErreur(e), 'err'); }
    });
    panneaux.tickets.replaceChildren(
      h('div', { class: 'cam-bloc' },
        h('h2', {}, 'Nouveau ticket'),
        h('p', { class: 'sous-titre' }, 'Demande adressée aux conteurs : modification de fiche, scène, contact avec un antagoniste, dépense d\'XP, question de règles, signalement…'),
        h('div', { class: 'cam-ligne' }, h('div', {}, h('label', {}, 'Catégorie'), categorie), h('div', {}, h('label', {}, 'Personnage concerné'), persoTicket)),
        h('label', {}, 'Sujet *'), sujet, h('label', {}, 'Description *'), description, btn, msg),
      h('div', { class: 'cam-bloc' }, h('h2', {}, 'Mes tickets'), liste));

    async function chargerListe() {
      try {
        const s = await fs.getDocs(fs.query(fs.collection(db, 'tickets'), fs.where('proprietaire', '==', uid)));
        const tickets = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => millis(b.creeLe) - millis(a.creeLe));
        liste.replaceChildren(...(tickets.length ? tickets.map(ticketEl) : [h('p', { class: 'sous-titre' }, 'Aucun ticket.')]));
      } catch (e) { liste.replaceChildren(h('div', { class: 'cam-msg err' }, messageErreur(e))); }
    }

    function ticketEl(t) {
      const msgT = h('div', { class: 'cam-msg' });
      const complement = h('textarea', { maxlength: 2000, placeholder: 'Votre réponse au conteur…', style: 'min-height:3rem' });
      return h('div', { class: 'cam-element' },
        h('div', { class: 'meta' },
          h('span', { class: 'cam-tag ' + (CLASSE_TICKET[t.statut] || 'attente') }, t.statut),
          h('span', { class: 'cam-tag' }, t.categorie),
          dateFr(t.creeLe), t.personnageNom ? ' — ' + t.personnageNom : ''),
        h('strong', {}, t.sujet), h('div', { class: 'texte' }, t.description),
        h('div', { class: 'reponse' + (t.resultat ? '' : ' vide') }, t.resultat ? ['Réponse du conteur : ', t.resultat] : 'En attente du traitement par un conteur…'),
        t.statut === 'Informations demandées' ? h('div', {}, h('label', {}, 'Compléter ma demande'), complement,
          h('button', {
            type: 'button', class: 'petit', onclick: async () => {
              if (!complement.value.trim()) return;
              try {
                const desc = (t.description + '\n\n— Complément du ' + new Date().toLocaleDateString('fr-FR') + ' —\n' + complement.value.trim()).slice(0, 8000);
                await fs.updateDoc(fs.doc(db, 'tickets', t.id), { description: desc, statut: 'En attente', majLe: fs.serverTimestamp() });
                chargerListe();
              } catch (e) { message(msgT, messageErreur(e), 'err'); }
            }
          }, 'Envoyer le complément')) : '',
        t.statut === 'En attente' || t.statut === 'Informations demandées' ? h('button', {
          type: 'button', class: 'petit secondaire', onclick: async () => {
            if (!confirmer('Annuler ce ticket ?')) return;
            try { await fs.updateDoc(fs.doc(db, 'tickets', t.id), { statut: 'Annulé', majLe: fs.serverTimestamp() }); chargerListe(); }
            catch (e) { message(msgT, messageErreur(e), 'err'); }
          }
        }, 'Annuler le ticket') : '',
        msgT);
    }
    chargerListe();
  }

  // ===================================================================
  // Changement de personnage
  // ===================================================================
  async function selectionner() {
    perso = enJeu.find((p) => p.id === choixPerso.value) || null;
    if (perso) {
      await chargerRaisons();
      dessinerFiche(); dessinerActions(); dessinerRaisons();
      dessinerRecap(); dessinerResultats();
    }
    dessinerTickets();
  }
  choixPerso.addEventListener('change', selectionner);
  await selectionner();
});
