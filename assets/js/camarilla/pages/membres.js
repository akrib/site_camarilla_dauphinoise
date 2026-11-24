// Page /membres/ : tableau de bord de l'espace membres.
import {
  h, db, fs, pageProtegee, barreMembre, estActif, estConteur, estAdmin, ROLES, STATUTS_COMPTE,
  changerNom, renvoyerVerification, deconnexion, message, messageErreur, dateFr,
  estAdminReel, vueTest, changerVue, VUES_TEST, reglesAJour
} from '../core.js';
import { personnageIncarne, blocChoixPersonnage } from '../incarnation.js';
import { chargerCalendrier, encartCalendrier } from '../calendrier.js';
import { nouvellesReponses, travailConteur } from '../suivi.js';

const racine = document.getElementById('cam-membres');
barreMembre(document.getElementById('cam-barre'));

function tuile(href, titre, texte, compteur) {
  return h('a', { class: 'cam-tuile', href },
    h('strong', {}, titre, compteur ? h('span', { class: 'cam-tag soumise', style: 'margin-left:.4rem' }, compteur) : ''),
    h('span', {}, texte));
}

pageProtegee(racine, 'connecte', async ({ user, profil }) => {
  // --- Profil ---
  const nom = h('input', { type: 'text', maxlength: 60, value: profil ? profil.nom : '' });
  const msgNom = h('div', { class: 'cam-msg' });
  const msgVerif = h('div', { class: 'cam-msg' });
  const profilBloc = h('div', { class: 'cam-bloc' },
    h('h2', {}, 'Mon compte'),
    h('div', { class: 'cam-ligne' },
      h('div', {}, h('label', {}, 'Nom affiché'), nom),
      h('div', {}, h('label', {}, 'Email'), h('input', { type: 'text', value: user.email || '', disabled: true }))),
    h('p', {},
      h('span', { class: 'cam-tag ' + (profil ? profil.role : '') }, profil ? (ROLES[profil.role] || profil.role) : '?'),
      h('span', { class: 'cam-tag ' + (profil ? profil.statut : '') }, profil ? (STATUTS_COMPTE[profil.statut] || profil.statut) : '?'),
      profil && profil.creeLe ? h('small', { class: 'sous-titre' }, ' inscrit le ' + dateFr(profil.creeLe)) : ''),
    h('div', { class: 'cam-actions' },
      h('button', {
        type: 'button', class: 'secondaire',
        onclick: async () => {
          try { await changerNom(nom.value); message(msgNom, 'Nom enregistré.', 'ok'); }
          catch (e) { message(msgNom, messageErreur(e), 'err'); }
        }
      }, 'Enregistrer le nom'),
      !user.emailVerified && user.providerData.some((p) => p.providerId === 'password')
        ? h('button', {
          type: 'button', class: 'secondaire',
          onclick: async () => {
            try { await renvoyerVerification(); message(msgVerif, 'Email de vérification envoyé.', 'ok'); }
            catch (e) { message(msgVerif, messageErreur(e), 'err'); }
          }
        }, 'Vérifier mon adresse email')
        : '',
      h('button', { type: 'button', class: 'secondaire', onclick: () => deconnexion('/') }, 'Se déconnecter')),
    msgNom, msgVerif);

  racine.append(profilBloc);

  if (!estActif(profil)) {
    racine.append(h('div', { class: 'cam-encart alerte' },
      profil && profil.statut === 'suspendu'
        ? 'Votre compte est suspendu. Contactez un conteur.'
        : 'Votre inscription est bien enregistrée. Un conteur doit maintenant activer votre compte ; cette page se mettra à jour toute seule.'));
    return;
  }

  // --- Administrateur : vue de test, règles publiées à jour ---
  if (estAdminReel() && !vueTest()) {
    const alerteRegles = h('div');
    racine.append(alerteRegles, h('div', { class: 'cam-bloc' },
      h('h2', {}, 'Tester le site'),
      h('p', { class: 'sous-titre' }, 'Vous avez les droits d\'administrateur et ceux de conteur. Pour voir le site comme un conteur ou un joueur, choisissez une vue : seul l\'affichage change, vos actions gardent vos droits d\'administrateur (une action refusée à un vrai joueur peut donc passer pour vous). Un bandeau en bas de l\'écran permet de revenir à tout moment.'),
      h('div', { class: 'cam-actions' },
        ...Object.entries(VUES_TEST).map(([v, l]) => h('button', { type: 'button', class: 'secondaire', onclick: () => changerVue(v) }, '👁 Voir en ' + l.toLowerCase())))));
    // 1 lecture : les règles publiées dans Firebase sont-elles celles du site ?
    reglesAJour().then((ok) => {
      if (ok) return;
      alerteRegles.replaceChildren(h('div', { class: 'cam-encart erreur' },
        h('strong', {}, 'Règles de sécurité pas à jour. '),
        'Les règles publiées dans la console Firebase ne sont pas celles de cette version du site : certaines actions sont refusées, même à un administrateur (« vous n\'avez pas les droits nécessaires »). ',
        'Dans la console Firebase, Firestore Database > Règles : remplacez tout par le contenu du fichier firebase/firestore.rules du dépôt, puis « Publier ». Détail : ',
        h('a', { href: '/membres/comptes/#maintenance' }, 'Comptes > Maintenance'), '.'));
    }).catch((e) => console.warn('Vérification des règles impossible', e));
  }

  // --- Outils du joueur(se) (compte) ---
  // Les outils de jeu (au nom d'un personnage) sont plus bas, sous le choix
  // du personnage incarné.
  const compteur = (tuileEl) => { const c = h('span'); tuileEl.querySelector('strong').append(c); return c; };
  const montrer = (c, n) => { c.replaceChildren(n ? h('span', { class: 'cam-tag soumise', style: 'margin-left:.4rem' }, String(n)) : ''); };
  const tuileNotifs = tuile('/membres/notifications/', 'Notifications', 'Réponses des conteurs, résultats de vos fiches, tableaux partagés, challenges demandés.');
  const tuileTickets = tuile('/membres/tickets/', 'Tickets', 'Vos demandes aux conteurs : scènes, règles, XP, signalements…');
  const [cNotifs, cTickets] = [tuileNotifs, tuileTickets].map(compteur);
  const cInfluences = h('span');   // posé sur la tuile Influences des outils personnage
  // Prochaine partie et fenêtre des influences (calendrier des conteurs)
  const zoneCalendrier = h('div');
  const cal = await chargerCalendrier().catch((e) => { console.warn(e); return null; });
  const encart = cal && encartCalendrier(cal);
  if (encart) zoneCalendrier.append(encart);
  racine.append(zoneCalendrier, h('h2', {}, 'Mes outils joueur(se)'),
    h('div', { class: 'cam-grille' },
      tuileNotifs,
      tuile('/membres/fiches/', 'Mes fiches de personnage', 'Créer, compléter et soumettre vos fiches au conteur.'),
      tuileTickets,
      tuile('/utils/sabbat', 'Trouve le Sabbat', 'Retrouver dans Grenoble le repaire photographié par un informateur. Points et classement des joueurs.'),
      tuile('/membres/gazette/', 'Le Gratin Dauphinois', 'La gazette des nuits grenobloises : tous les numéros parus, à lire ou à imprimer.')));

  // Challenges demandés (pour le compteur des notifications et celui de la tuile Challenges).
  let mesDefis = [];
  try {
    const snap = await fs.getDocs(fs.query(fs.collection(db, 'defis'), fs.where('destinataire', '==', user.uid)));
    mesDefis = snap.docs.map((d) => d.data()).filter((d) => d.statut === 'en_attente');
  } catch (e) { console.warn(e); }
  // Compteurs : notifications non lues, défis, réponses des conteurs pas encore vues.
  Promise.all([
    fs.getCountFromServer(fs.query(fs.collection(db, 'notifications'), fs.where('destinataire', '==', user.uid))).then((c) => c.data().count).catch(() => 0),
    nouvellesReponses(user.uid, cal).catch(() => ({ influences: [], tickets: [] }))
  ]).then(([notifs, rep]) => {
    montrer(cNotifs, notifs + mesDefis.length + rep.influences.length + rep.tickets.length);
    montrer(cInfluences, rep.influences.length);
    montrer(cTickets, rep.tickets.length);
  });

  // --- Personnage incarné et outils personnage ---
  // Le panneau d'affichage, le tableau d'enquête, la carte de Grenoble, les
  // challenges et les influences ne s'ouvrent qu'à un personnage incarné.
  // Les conteurs ont accès aux quatre premiers sans personnage (modération) ;
  // les influences des joueurs sont dans « Influences — conteur ».
  const zonePerso = h('div');
  racine.append(h('h2', { id: 'personnage' }, 'Personnage incarné'), zonePerso);
  async function dessinerPersonnage() {
    zonePerso.replaceChildren(h('p', { class: 'sous-titre' }, 'Chargement…'));
    const perso = await personnageIncarne(user.uid);
    const choix = blocChoixPersonnage(user.uid, {
      titre: perso ? 'Vous incarnez ' + perso.nom : 'Aucun personnage incarné',
      texte: perso
        ? 'Les outils personnage ci-dessous agissent au nom de ' + perso.nom + '. Pour jouer un autre de vos personnages, choisissez-le :'
        : 'Le panneau d\'affichage, le tableau d\'enquête, la carte de Grenoble, les challenges et les influences ne s\'ouvrent qu\'à un personnage. Choisissez lequel de vos personnages validés vous jouez :',
      avecQuitter: true,
      apresChoix: () => dessinerPersonnage()
    });
    if (perso) {
      zonePerso.replaceChildren(choix,
        h('h2', { id: 'outils-personnage' }, 'Mes outils personnage'),
        h('p', { class: 'sous-titre' }, 'En tant que ', h('strong', {}, perso.nom),
          ' · ' + [perso.clan, perso.secte, perso.statut === 'active' ? 'en jeu' : 'en réserve'].filter(Boolean).join(' · ')),
        outilsPersonnage(perso));
    } else if (estConteur(profil)) {
      zonePerso.replaceChildren(choix,
        h('p', { class: 'sous-titre' }, 'En tant que conteur, vous avez aussi accès sans personnage à :'), outilsConteurSansPersonnage());
    } else {
      zonePerso.replaceChildren(choix);
    }
  }
  function outilsPersonnage(perso) {
    const n = mesDefis.filter((d) => d.personnage === perso.id).length;
    const tuileChallenges = tuile('/utils/challenge', 'Challenges', n
      ? n + ' challenge' + (n > 1 ? 's' : '') + ' demandé' + (n > 1 ? 's' : '') + ' à ' + perso.nom + ' par les conteurs.'
      : 'Le générateur de challenge, et les challenges que les conteurs demandent à ' + perso.nom + '.', n ? String(n) : '');
    const enJeu = perso.statut === 'active';
    const tuileInfluences = tuile('/influences/', 'Influences', enJeu
      ? 'Actions d\'influence et actions inter-partie (AIP) de ' + perso.nom + '.'
      : 'Réservées aux personnages en jeu : ' + perso.nom + ' est en réserve.');
    tuileInfluences.querySelector('strong').append(cInfluences);
    return h('div', { class: 'cam-grille' },
      tuile('/membres/affichage/', 'Panneau d\'affichage', 'Épingler des notes et voir ce que les goules ont vu, en tant que ' + perso.nom + '.'),
      tuile('/utils/tableau', 'Tableau d\'enquête', 'Les 3 tableaux d\'enquête de ' + perso.nom + ', partageables avec d\'autres personnages.'),
      tuile('/utils/carte', 'Carte de Grenoble', 'Havres, zones de chasse, rondes et actions d\'influence de ' + perso.nom + ', territoires de la ville, en plan ou en 3D.'),
      tuileChallenges,
      tuileInfluences);
  }
  function outilsConteurSansPersonnage() {
    return h('div', { class: 'cam-grille' },
      tuile('/membres/affichage/', 'Panneau d\'affichage', 'Les notes épinglées sur le liège (en tant que conteur).'),
      tuile('/utils/tableau', 'Tableau d\'enquête', 'Consulter les tableaux des personnages (en tant que conteur).'),
      tuile('/utils/carte', 'Carte de Grenoble', 'Carte tactique de Grenoble (en tant que conteur).'),
      tuile('/utils/challenge', 'Challenges', 'Le générateur de challenge, et proposer un challenge à un personnage.'));
  }
  dessinerPersonnage();

  // --- Outils conteurs ---
  if (estConteur(profil)) {
    const grille = h('div', { class: 'cam-grille' });
    racine.append(h('h2', {}, 'Outils conteur'), grille);
    let enAttente = 0;
    let travail = { actions: 0, tickets: 0, fiches: 0 };
    try {
      const [t, c] = await Promise.all([
        travailConteur(),
        fs.getCountFromServer(fs.query(fs.collection(db, 'utilisateurs'), fs.where('statut', '==', 'en_attente')))
      ]);
      travail = t; enAttente = c.data().count;
    } catch (e) { console.warn(e); }
    grille.append(
      tuile('/membres/fiches/#a-valider', 'Fiches à valider', 'Relire, valider ou renvoyer les fiches soumises.', travail.fiches || ''),
      tuile('/membres/comptes/', 'Comptes', 'Activer les inscriptions, gérer les rôles.', enAttente || ''),
      tuile('/influences/conteur/', 'Influences — conteur', 'Répondre aux actions, districts, export CSV.', travail.actions || ''),
      tuile('/membres/combat/', 'Combat — initiatives', 'Ordre d\'initiative, rounds de Célérité, dégâts et volonté pendant les combats (téléphone ou ordinateur).'),
      tuile('/membres/fiches/#pnj', 'PNJ', 'Fiches des personnages non joueurs : vampires, goules, sabbatiques, humains, inquisition, loups-garous…'),
      tuile('/membres/gazette/edition/', 'Gazette — édition', 'Mettre en page et publier Le Gratin Dauphinois (un numéro par mois).'),
      tuile('/membres/tickets/#joueurs', 'Tickets des joueurs', 'Répondre aux demandes des joueurs.', travail.tickets || ''),
      tuile('/influences/conteur/#calendrier', 'Calendrier des parties', 'Dates des parties et dates limites de rendu des influences.'),
      tuile('/membres/territoires/', 'Territoires', 'Tracer les zones 1 à 24 et les territoires de la ville, visibles sur la carte des joueurs.'));
    if (estAdmin(profil)) {
      racine.append(h('p', { class: 'sous-titre' }, 'Administrateur : la page Comptes vous permet aussi de nommer des conteurs, de nettoyer les images inutilisées, de migrer les fiches et d\'exporter toute la base.'));
    }
  }
});
