// Page /membres/ : tableau de bord de l'espace membres.
import {
  h, db, fs, pageProtegee, barreMembre, estActif, estConteur, estAdmin, ROLES, STATUTS_COMPTE,
  changerNom, renvoyerVerification, deconnexion, message, messageErreur, dateFr
} from '../core.js';
import { personnageIncarne, blocChoixPersonnage, quitterPersonnage } from '../incarnation.js';
import { chargerCalendrier, encartCalendrier } from '../calendrier.js';

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

  // --- Outils du joueur (compte) ---
  const compteurNotifs = h('span');
  const tuileNotifs = tuile('/membres/notifications/', 'Notifications', 'Résultats de vos fiches, tableaux partagés, challenges demandés.');
  tuileNotifs.querySelector('strong').append(compteurNotifs);
  // Prochaine partie et fenêtre des influences (calendrier des conteurs)
  const zoneCalendrier = h('div');
  if (estActif(profil)) {
    chargerCalendrier().then((cal) => { const e = encartCalendrier(cal); if (e) zoneCalendrier.replaceChildren(e); }).catch((e) => console.warn(e));
  }
  racine.append(zoneCalendrier, h('h2', {}, 'Mes outils'),
    h('div', { class: 'cam-grille' },
      tuileNotifs,
      tuile('/membres/fiches/', 'Mes fiches de personnage', 'Créer, compléter et soumettre vos fiches au conteur.'),
      tuile('/influences/', 'Influences', 'Actions d\'influence, raisons sociales et tickets.')));

  // Challenges demandés (pour le compteur des notifications et celui de la tuile Challenges).
  let mesDefis = [];
  try {
    const snap = await fs.getDocs(fs.query(fs.collection(db, 'defis'), fs.where('destinataire', '==', user.uid)));
    mesDefis = snap.docs.map((d) => d.data()).filter((d) => d.statut === 'en_attente');
  } catch (e) { console.warn(e); }
  fs.getCountFromServer(fs.query(fs.collection(db, 'notifications'), fs.where('destinataire', '==', user.uid)))
    .then((c) => {
      const n = c.data().count + mesDefis.length;
      if (n) compteurNotifs.replaceChildren(h('span', { class: 'cam-tag soumise' }, String(n)));
    }).catch((e) => console.warn(e));

  // --- Personnage incarné et outils de jeu ---
  // Le panneau d'affichage et le tableau d'enquête ne s'ouvrent qu'à un
  // personnage validé (les conteurs y ont accès sans personnage).
  const zonePerso = h('div');
  racine.append(h('h2', { id: 'personnage' }, 'Personnage incarné'), zonePerso);
  const conteurSansPerso = estConteur(profil);
  async function dessinerPersonnage() {
    zonePerso.replaceChildren(h('p', { class: 'sous-titre' }, 'Chargement…'));
    const perso = await personnageIncarne(user.uid);
    const defisPerso = perso ? mesDefis.filter((d) => d.personnage === perso.id).length : 0;
    const tuileChallenges = tuile('/utils/challenge', 'Challenges', perso
      ? (defisPerso ? defisPerso + ' challenge' + (defisPerso > 1 ? 's' : '') + ' demandé' + (defisPerso > 1 ? 's' : '') + ' à ' + perso.nom + ' par les conteurs.' : 'Le générateur de challenge, et les challenges que les conteurs demandent à ' + perso.nom + '.')
      : 'Le générateur de challenge, et proposer un challenge à un personnage.');
    if (defisPerso) tuileChallenges.querySelector('strong').append(h('span', { class: 'cam-tag soumise' }, String(defisPerso)));
    const outils = h('div', { class: 'cam-grille' },
      tuileChallenges,
      tuile('/membres/affichage/', 'Panneau d\'affichage', perso
        ? 'Épingler des notes et voir ce que les goules ont vu, en tant que ' + perso.nom + '.'
        : 'Les notes épinglées sur le liège (en tant que conteur).'),
      tuile('/utils/carte', 'Carte de Grenoble', perso
        ? 'Havres, zones de chasse, rondes, territoires et actions d\'influence de ' + perso.nom + ', en plan ou en 3D.'
        : 'Carte tactique de Grenoble (en tant que conteur).'),
      tuile('/utils/tableau', 'Tableau d\'enquête', perso
        ? 'Les 3 tableaux d\'enquête de ' + perso.nom + ', partageables avec d\'autres personnages.'
        : 'Consulter les tableaux des personnages (en tant que conteur).'));
    if (!perso) {
      zonePerso.replaceChildren(blocChoixPersonnage(user.uid, {
        titre: 'Aucun personnage incarné',
        texte: 'Le panneau d\'affichage et le tableau d\'enquête sont réservés aux personnages. Choisissez lequel de vos personnages validés vous jouez :',
        apresChoix: () => dessinerPersonnage()
      }), conteurSansPerso ? h('div', {}, h('p', { class: 'sous-titre' }, 'En tant que conteur, vous y avez aussi accès sans personnage :'), outils) : '');
      return;
    }
    const changer = h('div', { style: 'display:none' });
    zonePerso.replaceChildren(
      h('div', { class: 'cam-bloc' },
        h('div', { class: 'cam-incarne' },
          h('span', {}, 'Vous incarnez'), h('span', { class: 'nom' }, perso.nom),
          h('span', { class: 'sous-titre', style: 'margin:0' }, [perso.clan, perso.secte, perso.statut === 'active' ? 'en jeu' : 'en réserve'].filter(Boolean).join(' · '))),
        h('div', { class: 'cam-actions' },
          h('button', { type: 'button', class: 'secondaire', onclick: () => { changer.style.display = changer.style.display === 'none' ? '' : 'none'; } }, 'Changer de personnage'),
          h('button', { type: 'button', class: 'secondaire', onclick: () => { quitterPersonnage(user.uid); dessinerPersonnage(); } }, 'Ne plus incarner personne'))),
      changer,
      h('h3', {}, 'Outils de ' + perso.nom), outils);
    changer.append(blocChoixPersonnage(user.uid, { titre: 'Changer de personnage', apresChoix: () => dessinerPersonnage() }));
  }
  dessinerPersonnage();

  // --- Outils conteurs ---
  if (estConteur(profil)) {
    const grille = h('div', { class: 'cam-grille' });
    racine.append(h('h2', {}, 'Outils conteur'), grille);
    let aValider = 0, enAttente = 0;
    try {
      const [f, c] = await Promise.all([
        fs.getCountFromServer(fs.query(fs.collection(db, 'personnages'), fs.where('statut', '==', 'soumise'))),
        fs.getCountFromServer(fs.query(fs.collection(db, 'utilisateurs'), fs.where('statut', '==', 'en_attente')))
      ]);
      aValider = f.data().count; enAttente = c.data().count;
    } catch (e) { console.warn(e); }
    grille.append(
      tuile('/membres/fiches/#a-valider', 'Fiches à valider', 'Relire, valider ou renvoyer les fiches soumises.', aValider || ''),
      tuile('/membres/comptes/', 'Comptes', 'Activer les inscriptions, gérer les rôles.', enAttente || ''),
      tuile('/influences/conteur/', 'Influences — conteur', 'Répondre aux actions, tickets, districts, export CSV.'),
      tuile('/influences/conteur/#calendrier', 'Calendrier des parties', 'Dates des parties et dates limites de rendu des influences.'));
    if (estAdmin(profil)) {
      racine.append(h('p', { class: 'sous-titre' }, 'Administrateur : la page Comptes vous permet aussi de nommer des conteurs et de nettoyer les images inutilisées.'));
    }
  }
});
