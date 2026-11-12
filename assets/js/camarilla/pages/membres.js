// Page /membres/ : tableau de bord de l'espace membres.
import {
  h, db, fs, pageProtegee, barreMembre, estActif, estConteur, estAdmin, ROLES, STATUTS_COMPTE,
  changerNom, renvoyerVerification, deconnexion, message, messageErreur, dateFr
} from '../core.js';

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

  // --- Outils joueurs ---
  racine.append(h('h2', {}, 'Mes outils'),
    h('div', { class: 'cam-grille' },
      tuile('/membres/fiches/', 'Mes fiches de personnage', 'Créer, compléter et soumettre vos fiches au conteur.'),
      tuile('/utils/tableau', 'Tableau d\'enquête', 'Vos 3 tableaux, sauvegardés en ligne et partageables.'),
      tuile('/membres/affichage/', 'Panneau d\'affichage', 'Les notes épinglées sur le liège, et ce que les goules en ont vu.'),
      tuile('/influences/', 'Influences', 'Actions d\'influence, raisons sociales et tickets.')));

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
      tuile('/influences/conteur/', 'Influences — conteur', 'Répondre aux actions, tickets, districts, export CSV.'));
    if (estAdmin(profil)) {
      racine.append(h('p', { class: 'sous-titre' }, 'Administrateur : la page Comptes vous permet aussi de nommer des conteurs et de nettoyer les images inutilisées.'));
    }
  }
});
