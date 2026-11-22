// =====================================================================
// Gazette « Le Gratin Dauphinois » — lecture (page /membres/gazette/)
// Membres actifs : tous les numéros publiés, du plus récent au plus ancien.
// Lectures Firestore : la liste (un petit document par numéro publié), puis
// le contenu d'un numéro seulement s'il n'est pas déjà dans le navigateur
// à la même version.
// =====================================================================
import { h, surSession, estActif, estConteur, messageErreur, millis } from '../core.js';
import { nomMois, moisValide } from '../gazette/modele.js';
import { rendreGazette, preparerImpression } from '../gazette/rendu.js';
import { listerGazettes, lireContenu, contenuEnCache, garderEnCache } from '../gazette/stockage.js';

const $ = (id) => document.getElementById(id);
let numeros = [];
let actuel = null;   // { mois, numero, donnees }

function message(...contenu) { $('lecture').replaceChildren(h('div', { class: 'gzl-message' }, ...contenu)); }

async function afficher(mois) {
  const n = numeros.find((x) => x.mois === mois) || numeros[0];
  if (!n) return;
  history.replaceState(null, '', '#' + n.mois);
  $('choixNumero').value = n.mois;
  const i = numeros.indexOf(n);
  $('btnPrecedent').disabled = i >= numeros.length - 1;   // plus ancien
  $('btnSuivant').disabled = i <= 0;                      // plus récent
  let donnees = contenuEnCache(n.mois, n.version);
  if (!donnees) {
    message('Chargement du numéro…');
    try {
      donnees = await lireContenu(n.mois);
      if (!donnees) { message('Ce numéro est introuvable.'); return; }
      garderEnCache(n.mois, n.version, donnees);
    } catch (e) { message('Lecture impossible : ', messageErreur(e)); return; }
  }
  actuel = { mois: n.mois, numero: n.numero, donnees };
  document.title = 'N° ' + n.numero + ' — ' + nomMois(n.mois) + ' — Le Gratin Dauphinois';
  $('lecture').replaceChildren(rendreGazette(donnees, { mois: n.mois, numero: n.numero }),
    h('p', { class: 'gzl-pied' }, 'Publié' + (n.publieeLe ? ' le ' + new Date(millis(n.publieeLe)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '') + '.'));
  $('lecture').scrollTop = 0;
  window.scrollTo(0, 0);
}

let demarre = false;
surSession(async (s) => {
  if (!s.pret || demarre) return;
  if (!s.user) {
    message(h('h2', {}, 'Connexion requise'), h('p', {}, 'La gazette est réservée aux membres de l\'association.'),
      h('a', { class: 'gzl-btn', href: '/connexion/?retour=' + encodeURIComponent(location.pathname) }, 'Se connecter'));
    return;
  }
  if (!estActif(s.profil)) {
    message(h('h2', {}, 'Compte pas encore actif'), h('p', {}, 'Un conteur doit d\'abord activer votre compte.'));
    return;
  }
  demarre = true;
  $('lienEdition').hidden = !estConteur(s.profil);
  try {
    numeros = await listerGazettes({ publieesSeulement: true });
  } catch (e) { message('Lecture impossible : ', messageErreur(e)); return; }
  if (!numeros.length) {
    message(h('h2', {}, 'Le Gratin Dauphinois'), h('p', {}, 'Aucun numéro n\'a encore été publié. Les rotatives tournent…'));
    return;
  }
  $('choixNumero').replaceChildren(...numeros.map((n) => h('option', { value: n.mois },
    'N° ' + n.numero + ' — ' + nomMois(n.mois) + (n.une ? ' — ' + (n.une.length > 60 ? n.une.slice(0, 58) + '…' : n.une) : ''))));
  $('numeros').hidden = false;
  $('btnImprimer').hidden = false;
  $('choixNumero').addEventListener('change', (e) => afficher(e.target.value));
  $('btnPrecedent').addEventListener('click', () => { const i = numeros.findIndex((x) => x.mois === actuel.mois); if (numeros[i + 1]) afficher(numeros[i + 1].mois); });
  $('btnSuivant').addEventListener('click', () => { const i = numeros.findIndex((x) => x.mois === actuel.mois); if (i > 0) afficher(numeros[i - 1].mois); });
  $('btnImprimer').addEventListener('click', () => window.print());
  preparerImpression(() => (actuel ? { donnees: actuel.donnees, meta: { mois: actuel.mois, numero: actuel.numero } } : null));
  const demande = decodeURIComponent(location.hash.slice(1));
  await afficher(moisValide(demande) ? demande : numeros[0].mois);
});
