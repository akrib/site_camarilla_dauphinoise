// Page /connexion/ : connexion, inscription, mot de passe oublié.
import {
  h, surSession, connexion, inscription, connexionGoogle, motDePasseOublie, deconnexion,
  messageErreur, message, onglets, configManquante, modeEmulateurs, ROLES, STATUTS_COMPTE
} from '../core.js';

const racine = document.getElementById('cam-connexion');

// N'accepte qu'un chemin interne au site (évite les redirections vers l'extérieur).
function adresseRetour() {
  const r = new URLSearchParams(location.search).get('retour') || '';
  return /^\/(?!\/)[^\s]*$/.test(r) ? r : '/membres/';
}

function formulaireConnexion() {
  const email = h('input', { type: 'email', autocomplete: 'username', required: true });
  const mdp = h('input', { type: 'password', autocomplete: 'current-password', required: true });
  const msg = h('div', { class: 'cam-msg' });
  const form = h('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      message(msg, 'Connexion…', 'info');
      try { await connexion(email.value, mdp.value); }
      catch (err) { message(msg, messageErreur(err), 'err'); }
    }
  },
  h('label', {}, 'Adresse email'), email,
  h('label', {}, 'Mot de passe'), mdp,
  h('div', { class: 'cam-actions' }, h('button', { type: 'submit' }, 'Se connecter')),
  msg);
  return form;
}

function formulaireInscription() {
  const nom = h('input', { type: 'text', maxlength: 60, required: true, placeholder: 'Prénom Nom (nom de joueur, pas de personnage)' });
  const email = h('input', { type: 'email', autocomplete: 'username', required: true });
  const mdp = h('input', { type: 'password', autocomplete: 'new-password', minlength: 8, required: true });
  const mdp2 = h('input', { type: 'password', autocomplete: 'new-password', minlength: 8, required: true });
  const msg = h('div', { class: 'cam-msg' });
  return h('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      if (mdp.value !== mdp2.value) { message(msg, 'Les deux mots de passe ne correspondent pas.', 'err'); return; }
      if (mdp.value.length < 8) { message(msg, 'Choisissez un mot de passe d\'au moins 8 caractères.', 'err'); return; }
      message(msg, 'Création du compte…', 'info');
      try { await inscription(nom.value.trim(), email.value, mdp.value); }
      catch (err) { message(msg, messageErreur(err), 'err'); }
    }
  },
  h('p', { class: 'sous-titre' }, 'Après l\'inscription, un conteur doit activer votre compte avant que vous puissiez accéder à l\'espace membres.'),
  h('label', {}, 'Votre nom (joueur)'), nom,
  h('label', {}, 'Adresse email'), email,
  h('label', {}, 'Mot de passe (8 caractères minimum)'), mdp,
  h('label', {}, 'Confirmez le mot de passe'), mdp2,
  h('div', { class: 'cam-actions' }, h('button', { type: 'submit' }, 'Créer mon compte')),
  msg);
}

function formulaireOubli() {
  const email = h('input', { type: 'email', autocomplete: 'username', required: true });
  const msg = h('div', { class: 'cam-msg' });
  return h('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      try {
        await motDePasseOublie(email.value);
        message(msg, 'Si un compte existe pour cette adresse, un email de réinitialisation vient d\'être envoyé (pensez aux courriers indésirables).', 'ok');
      } catch (err) { message(msg, messageErreur(err), 'err'); }
    }
  },
  h('label', {}, 'Adresse email du compte'), email,
  h('div', { class: 'cam-actions' }, h('button', { type: 'submit' }, 'Recevoir un lien de réinitialisation')),
  msg);
}

function boutonGoogle() {
  const msg = h('div', { class: 'cam-msg' });
  return h('div', {},
    h('button', {
      type: 'button', class: 'secondaire',
      onclick: async () => {
        try { await connexionGoogle(); } catch (err) { message(msg, messageErreur(err), 'err'); }
      }
    }, 'Continuer avec Google'),
    msg);
}

function afficherFormulaires() {
  const bloc = h('div', { class: 'cam-bloc', style: 'max-width:520px;margin:0 auto 1.2rem;' },
    h('div', { class: 'cam-onglets' },
      h('button', { type: 'button', dataset: { onglet: 'connexion' } }, 'Connexion'),
      h('button', { type: 'button', dataset: { onglet: 'inscription' } }, 'Créer un compte'),
      h('button', { type: 'button', dataset: { onglet: 'oubli' } }, 'Mot de passe oublié')),
    h('div', { dataset: { panneau: 'connexion' } }, formulaireConnexion()),
    h('div', { dataset: { panneau: 'inscription' } }, formulaireInscription()),
    h('div', { dataset: { panneau: 'oubli' } }, formulaireOubli()),
    h('hr', {}),
    boutonGoogle());
  racine.replaceChildren(bloc);
  const activer = onglets(bloc);
  activer(location.hash === '#inscription' ? 'inscription' : 'connexion');
}

let dejaAffiche = false;
surSession(({ user, profil, pret }) => {
  if (!pret) return;
  if (configManquante && !modeEmulateurs) {
    racine.replaceChildren(h('div', { class: 'cam-bloc cam-acces' },
      h('h2', {}, 'Configuration manquante'),
      h('p', {}, 'Firebase n\'est pas encore configuré (voir docs/FIREBASE.md dans le dépôt).')));
    return;
  }
  if (!user) {
    if (!dejaAffiche) { afficherFormulaires(); dejaAffiche = true; }
    return;
  }
  dejaAffiche = false;
  // Connecté : on part directement vers la page demandée si le compte est actif.
  if (profil && profil.statut === 'actif' && new URLSearchParams(location.search).has('retour')) {
    location.replace(adresseRetour());
    return;
  }
  racine.replaceChildren(h('div', { class: 'cam-bloc cam-acces' },
    h('h2', {}, 'Bonjour ' + (profil ? profil.nom : user.email)),
    profil ? h('p', {}, 'Rôle : ' + (ROLES[profil.role] || profil.role) + ' · Compte : ' + (STATUTS_COMPTE[profil.statut] || profil.statut)) : '',
    profil && profil.statut === 'en_attente'
      ? h('p', { class: 'cam-encart alerte' }, 'Votre compte est créé. Un conteur doit l\'activer : vous aurez accès à l\'espace membres dès que ce sera fait.')
      : '',
    h('a', { class: 'cam-btn', href: adresseRetour() }, 'Continuer'),
    h('button', { type: 'button', class: 'secondaire', onclick: () => deconnexion('/connexion/') }, 'Se déconnecter')));
});
