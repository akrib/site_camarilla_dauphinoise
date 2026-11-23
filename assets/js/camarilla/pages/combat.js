// =====================================================================
// Page /membres/combat/ : gestion des initiatives pendant un combat
// (conteurs). Pensée pour un téléphone pendant les parties et pour un
// ordinateur pendant les RP.
//
// Déroulé d'un tour : « Début du tour » (bonus et malus d'initiative,
// Célérité, actions en plus, ajouts), puis les actions dans l'ordre
// (round classique, rounds de Célérité), puis « Fin du tour » (résolution).
// Précédent / Suivant en bas ; boutons utiles au centre.
// Ordinateur : frise horizontale ; téléphone : frise verticale.
// Le combat est gardé dans ce navigateur (localStorage), jamais en ligne.
// Règles et calculs : ../combat/modele.js.
// =====================================================================
import { h, db, fs, surSession, estConteur, messageErreur } from '../core.js';
import { donneesDoc } from '../compression.js';
import { lireDetail } from '../fiche/lecture.js';
import { CATEGORIES_PNJ } from '../donnees.js';
import {
  LIBELLES_ROUND, COURTS_ROUND, BONUS_RETARD, MAX_ACTIONS,
  combatNeuf, lireCombat, ecrireCombat, effacerCombat, cleStockage,
  modsDe, changerMods, participantDe, actifs, enAttente, initEffective, nbActions, detailInit, ordre,
  suivant, precedent, peutReculer, ajouter, dejaPresent, mettreHorsCombat, remettreEnCombat, retirer,
  retarder, basculerNAgitPas, compter, participant, participantDeFiche, initAuHasard
} from '../combat/modele.js';

const $ = (id) => document.getElementById(id);
const scene = $('scene');
const mobile = () => window.matchMedia('(max-width: 899px)').matches;
const LIEN_FICHE = (id) => '/membres/fiches/#fiche-' + encodeURIComponent(id);

let uid = null;
let c = null;                   // combat en cours (null : aucun)
let ouverts = new Set();        // cartes dépliées à la main (téléphone)
let ordreDebut = { tour: 0, ids: [] };   // ordre des cartes pendant le début d'un tour (stable sous le doigt)
let derniereCle = null;         // élément courant au dernier affichage (pour le recentrer quand il change)
let centrageLe = 0;             // heure du dernier recentrage animé (un clic pendant l'animation la termine au lieu de la couper)

// ---------------------------------------------------------------------
// Enregistrement et messages
// ---------------------------------------------------------------------
function sauver() { if (c && !ecrireCombat(uid, c)) toast('Ce navigateur refuse d\'enregistrer (navigation privée ?) : le combat sera perdu en quittant la page.', { erreur: true }); }
/** Modifie le combat, l'enregistre et redessine (sans bouger la frise). */
function modifier(fn, { garder = true } = {}) {
  const r = fn();
  sauver();
  rendre({ garder });
  return r;
}
let minuteurToast = null;
function toast(texte, { erreur = false, action = null } = {}) {
  const t = $('toast');
  t.replaceChildren(h('span', {}, texte), action ? h('button', { type: 'button', class: 'cb-btn petit', onclick: () => { action.fn(); t.hidden = true; } }, action.libelle) : '');
  t.classList.toggle('erreur', erreur);
  t.hidden = false;
  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => { t.hidden = true; }, action ? 6000 : 3200);
}
/** Action annulable (hors combat, retrait…) : bandeau avec « Annuler ». */
function annulable(texte, fn) {
  const avant = JSON.stringify(c);
  modifier(fn);
  toast(texte, { action: { libelle: 'Annuler', fn: () => { c = JSON.parse(avant); sauver(); rendre({ garder: true }); } } });
}

// ---------------------------------------------------------------------
// Petits éléments
// ---------------------------------------------------------------------
const stop = (fn) => (e) => { e.stopPropagation(); fn(e); };
function libelleType(p) {
  if (p.type === 'pnj') return 'PNJ' + (p.categorie && CATEGORIES_PNJ[p.categorie] ? ' · ' + CATEGORIES_PNJ[p.categorie] : '');
  if (p.type === 'temp') return 'Temporaire';
  return 'PJ' + (p.joueur ? ' · ' + p.joueur : '');
}
const puce = (texte, classe = '') => h('span', { class: 'cb-puce ' + classe }, texte);

function compteurs(p) {
  const ligne = (champ, libelle, max) => h('div', { class: 'cb-compteur ' + champ },
    h('span', { class: 'cb-compteur-lib' }, libelle),
    h('button', { type: 'button', class: 'cb-moins', 'aria-label': libelle + ' : un de moins', onclick: stop(() => modifier(() => compter(c, p.id, champ, -1))) }, '−'),
    h('output', { class: 'cb-val', 'aria-label': libelle }, String(p[champ] || 0) + (max ? ' / ' + max : '')),
    h('button', { type: 'button', class: 'cb-plus', 'aria-label': libelle + ' : un de plus', onclick: stop(() => modifier(() => compter(c, p.id, champ, +1))) }, '+'));
  return h('div', { class: 'cb-compteurs' },
    ligne('degats', 'Dégâts normaux'), ligne('aggraves', 'Dégâts aggravés'), ligne('volonte', 'Volonté utilisée', p.volonteMax));
}
const resumeCompteurs = (p) => h('span', { class: 'cb-mini', title: 'Dégâts normaux · dégâts aggravés · volonté utilisée' },
  h('span', { class: 'n' }, 'Dég. ' + (p.degats || 0)), h('span', { class: 'a' }, 'Agg. ' + (p.aggraves || 0)), h('span', { class: 'v' }, 'Vol. ' + (p.volonte || 0)));
const boutonFiche = (p, grand = false) => (p && p.ficheId
  ? h('a', { class: 'cb-btn' + (grand ? ' principal cb-fiche' : ' petit'), href: LIEN_FICHE(p.ficheId), target: '_blank', rel: 'noopener', onclick: (e) => e.stopPropagation() }, '📄 ' + (grand ? 'Ouvrir la fiche' : 'Fiche') + ' ↗')
  : '');
function boutonHors(p) {
  return h('button', {
    type: 'button', class: 'cb-btn petit danger', title: 'Sortir ce personnage du combat (il peut y revenir depuis « Participants »)',
    onclick: stop(() => annulable(p.nom + ' est hors combat.', () => mettreHorsCombat(c, p.id)))
  }, '✖ Hors combat');
}
function pas(valeur, { min, max, signe = false, libelle, change }) {
  const aff = signe && valeur > 0 ? '+' + valeur : String(valeur);
  return h('div', { class: 'cb-pas', role: 'group', 'aria-label': libelle },
    h('button', { type: 'button', 'aria-label': libelle + ' : moins', disabled: valeur <= min, onclick: stop(() => change(Math.max(min, valeur - 1))) }, '−'),
    h('output', { class: valeur > 0 ? 'positif' : valeur < 0 ? 'negatif' : '' }, aff),
    h('button', { type: 'button', 'aria-label': libelle + ' : plus', disabled: valeur >= max, onclick: stop(() => change(Math.min(max, valeur + 1))) }, '+'));
}
function bascule(actif, texte, titre, change, classe = '') {
  return h('button', { type: 'button', class: 'cb-bascule ' + classe + (actif ? ' actif' : ''), 'aria-pressed': String(actif), title: titre || '', onclick: stop(() => change(!actif)) }, texte);
}

// ---------------------------------------------------------------------
// Cartes de la frise
// ---------------------------------------------------------------------
function carteSlot(it) {
  const s = it.slot;
  const p = participantDe(c, s.pid);
  const nom = p ? p.nom : s.nom;
  const compacte = it.ancien || (!it.courant && mobile() && !ouverts.has(it.cle));
  const carte = h('article', {
    class: 'cb-carte cb-slot round' + s.round + (it.courant ? ' courant' : '') + (it.passe ? ' passe' : '') + (compacte ? ' compacte' : '')
      + (p && p.hors ? ' hors' : '') + (s.retarde ? ' retarde' : ''),
    dataset: { cle: it.cle }, 'aria-current': it.courant ? 'step' : null
  });
  const tete = h('div', { class: 'cb-tete' },
    h('div', { class: 'cb-ident' },
      h('div', { class: 'cb-puces' }, puce(COURTS_ROUND[s.round], 'r' + s.round), s.retarde ? puce('retardé', 'retard') : '', p && p.hors ? puce('hors combat', 'hors') : '',
        it.courant ? puce('à lui d\'agir', 'tour') : ''),
      h('div', { class: 'cb-nom', title: nom }, nom),
      p ? h('div', { class: 'cb-type' }, libelleType(p)) : h('div', { class: 'cb-type' }, 'retiré du combat')),
    h('div', { class: 'cb-init', title: 'Initiative' }, String(s.init)));
  carte.append(tete);
  if (!p) return carte;
  if (compacte) {
    carte.append(resumeCompteurs(p));
    if (!it.ancien) {
      carte.tabIndex = 0;
      carte.title = 'Afficher les compteurs';
      const deplier = () => { ouverts.add(it.cle); rendre({ garder: true }); };
      carte.addEventListener('click', deplier);
      carte.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); deplier(); } });
    }
    return carte;
  }
  const m = modsDe(c, p.id);
  carte.append(
    h('div', { class: 'cb-detail' }, 'Initiative ' + detailInit(p, m) + (nbActions(p, m) > 1 ? ' · ' + nbActions(p, m) + ' actions ce tour' : '')),
    compteurs(p));
  const actions = h('div', { class: 'cb-actions-carte' });
  if (it.courant) actions.append(boutonFiche(p, true));
  if (it.courant && s.retarde) {
    const nAgitPas = !!(c.prochain[p.id] && c.prochain[p.id].retard);
    actions.append(bascule(nAgitPas, 'N\'agit pas ce round : +' + BONUS_RETARD + ' au tour suivant', 'Le personnage a retardé son initiative et choisit de ne pas agir',
      () => modifier(() => basculerNAgitPas(c, p.id))));
  }
  if (!p.hors) actions.append(boutonHors(p));
  carte.append(actions);
  if (!it.courant && mobile()) {
    carte.append(h('button', { type: 'button', class: 'cb-replier', onclick: stop(() => { ouverts.delete(it.cle); rendre({ garder: true }); }) }, 'Replier'));
  }
  return carte;
}

/** Carte d'un participant pendant le début du tour : bonus, malus, Célérité… */
function carteDebutParticipant(p) {
  const m = modsDe(c, p.id);
  const cle = 'pa-' + p.id;
  const compacte = mobile() && !ouverts.has(cle);
  const maj = (champs) => modifier(() => changerMods(c, p.id, champs));
  const n = nbActions(p, m);
  const carte = h('article', { class: 'cb-carte cb-participant' + (compacte ? ' compacte' : ''), dataset: { cle } },
    h('div', { class: 'cb-tete' },
      h('div', { class: 'cb-ident' },
        h('div', { class: 'cb-puces' },
          m.celerite && p.celerite ? puce('⚡ Célérité', 'cel') : '',
          m.retard ? puce('+' + BONUS_RETARD, 'retard') : '',
          m.bonus ? puce((m.bonus > 0 ? '+' : '−') + Math.abs(m.bonus), m.bonus > 0 ? 'bonus' : 'malus') : '',
          n > 1 ? puce(n + ' actions', 'actions') : '',
          m.surprise && c.tour === 1 ? puce('surprise', 'r-1') : ''),
        h('div', { class: 'cb-nom', title: p.nom }, p.nom),
        h('div', { class: 'cb-type' }, libelleType(p))),
      h('div', { class: 'cb-init', title: 'Initiative de ce tour' }, String(initEffective(p, m)))));
  if (compacte) {
    carte.append(h('div', { class: 'cb-detail' }, 'Initiative ' + detailInit(p, m)), h('div', { class: 'cb-indice' }, 'Toucher pour les bonus, la Célérité et les compteurs'));
    carte.tabIndex = 0;
    const deplier = () => { ouverts.add(cle); rendre({ garder: true }); };
    carte.addEventListener('click', deplier);
    carte.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); deplier(); } });
    return carte;
  }
  const celActions = m.celerite && p.celerite ? p.celerite.actions : 0;
  carte.append(
    h('div', { class: 'cb-detail' }, 'Initiative ' + detailInit(p, m)),
    h('div', { class: 'cb-reglage' }, h('span', {}, 'Bonus / malus'),
      pas(m.bonus || 0, { min: -20, max: 20, signe: true, libelle: 'Bonus ou malus d\'initiative', change: (v) => maj({ bonus: v }) })),
    p.celerite ? h('div', { class: 'cb-reglage' },
      bascule(!!m.celerite, '⚡ Célérité ' + p.celerite.niveau + ' : +' + p.celerite.bonus + ' init'
        + (p.celerite.actions ? ', +' + p.celerite.actions + ' action' + (p.celerite.actions > 1 ? 's' : '') : ''),
      'Célérité activée pour ce tour (1 point de sang) : initiative + niveaux de Célérité, pouvoirs d\'ancien et techniques de Célérité ; une action de plus avec Célérité 3, avec Célérité 5 et avec « Vitesse »',
      (v) => maj({ celerite: v }), 'cel')) : '',
    h('div', { class: 'cb-reglage' },
      bascule(!!m.retard, '+' + BONUS_RETARD + ' : n\'a pas agi au tour précédent', 'Bonus de qui a retardé son initiative sans agir (non cumulatif)', (v) => maj({ retard: v }), 'retard')),
    h('div', { class: 'cb-reglage' }, h('span', {}, 'Actions en plus' + (celActions ? ' (hors Célérité)' : '')),
      pas(m.actionsSupp || 0, { min: 0, max: Math.max(0, MAX_ACTIONS - 1 - celActions), libelle: 'Actions en plus', change: (v) => maj({ actionsSupp: v }) })),
    h('div', { class: 'cb-detail' }, n + ' action' + (n > 1 ? 's' : '') + ' ce tour' + (n > 1 ? ' : rounds ' + Array.from({ length: n }, (_, k) => COURTS_ROUND[k]).join(', ') : '')),
    c.tour === 1 ? h('div', { class: 'cb-reglage' },
      bascule(!!m.surprise, '⚡ Action surprise', 'Le personnage a déclenché le combat : cette action est résolue avant toutes les autres', (v) => maj({ surprise: v }), 'surprise')) : '',
    compteurs(p),
    h('div', { class: 'cb-actions-carte' }, boutonFiche(p), boutonHors(p)));
  if (mobile()) carte.append(h('button', { type: 'button', class: 'cb-replier', onclick: stop(() => { ouverts.delete(cle); rendre({ garder: true }); }) }, 'Replier'));
  return carte;
}

function carteDebut(it) {
  const carte = h('article', { class: 'cb-carte cb-etape debut' + (it.courant ? ' courant' : ' passe compacte'), dataset: { cle: it.cle }, 'aria-current': it.courant ? 'step' : null },
    h('div', { class: 'cb-tete' }, h('div', { class: 'cb-ident' },
      h('div', { class: 'cb-puces' }, puce('Tour ' + c.tour, 'tour-n')),
      h('div', { class: 'cb-nom' }, 'Début du tour'))));
  if (!it.courant) return carte;
  const liste = ordre(c);
  if (!c.participants.length) {
    carte.append(h('p', {}, 'Aucun participant pour l\'instant.'),
      h('button', { type: 'button', class: 'cb-btn principal grand', onclick: () => ouvrirAjout() }, '＋ Ajouter des participants'));
    return carte;
  }
  carte.append(
    h('p', { class: 'cb-aide' }, 'Réglez sur chaque carte les bonus et malus d\'initiative, la Célérité et les actions en plus. « ＋ Ajouter » fait entrer de nouveaux participants.'),
    h('div', { class: 'cb-ordre-titre' }, 'Ordre prévu'),
    h('ol', { class: 'cb-ordre' }, liste.map((p) => {
      const m = modsDe(c, p.id);
      return h('li', {}, h('span', { class: 'cb-ordre-nom' }, p.nom), h('span', { class: 'cb-ordre-init' }, String(initEffective(p, m))),
        nbActions(p, m) > 1 ? h('span', { class: 'cb-ordre-x' }, '×' + nbActions(p, m)) : '');
    })));
  return carte;
}

function carteFin(it) {
  const carte = h('article', { class: 'cb-carte cb-etape fin' + (it.courant ? ' courant' : (it.passe ? ' passe' : ' a-venir') + ' compacte'), dataset: { cle: it.cle }, 'aria-current': it.courant ? 'step' : null },
    h('div', { class: 'cb-tete' }, h('div', { class: 'cb-ident' },
      h('div', { class: 'cb-puces' }, puce('Tour ' + c.tour, 'tour-n')),
      h('div', { class: 'cb-nom' }, 'Fin du tour — résolution'))));
  if (!it.courant) return carte;
  const liste = c.participants.filter((p) => (p.arrive || 1) <= c.tour);
  carte.append(
    h('p', { class: 'cb-aide' }, 'Chacun note ses dépenses de sang, de volonté et ses dégâts. « Suivant » ouvre le tour ' + (c.tour + 1) + '.'),
    h('table', { class: 'cb-bilan' },
      h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', { title: 'Dégâts normaux' }, 'Dég.'), h('th', { title: 'Dégâts aggravés' }, 'Agg.'), h('th', { title: 'Volonté utilisée' }, 'Vol.'))),
      h('tbody', {}, liste.map((p) => h('tr', { class: p.hors ? 'hors' : '' },
        h('td', {}, p.nom, p.hors ? h('small', {}, ' (hors combat)') : ''),
        h('td', {}, String(p.degats || 0)), h('td', { class: 'a' }, String(p.aggraves || 0)),
        h('td', {}, String(p.volonte || 0) + (p.volonteMax ? '/' + p.volonteMax : '')))))));
  return carte;
}

const repere = (texte, classe = '') => h('div', { class: 'cb-repere ' + classe, 'aria-hidden': 'true' }, h('span', {}, texte));

function carteAttente(p) {
  return h('article', { class: 'cb-carte cb-participant compacte attente', dataset: { cle: 'att-' + p.id } },
    h('div', { class: 'cb-tete' }, h('div', { class: 'cb-ident' },
      h('div', { class: 'cb-puces' }, puce(p.hors ? 'hors combat' : 'rejoint au tour ' + p.arrive, p.hors ? 'hors' : 'attente')),
      h('div', { class: 'cb-nom' }, p.nom), h('div', { class: 'cb-type' }, libelleType(p))),
    h('div', { class: 'cb-init' }, String(p.init))),
    p.hors ? h('div', { class: 'cb-actions-carte' }, h('button', { type: 'button', class: 'cb-btn petit', onclick: stop(() => modifier(() => remettreEnCombat(c, p.id))) }, '↩ Remettre en combat')) : '');
}

// ---------------------------------------------------------------------
// Frise
// ---------------------------------------------------------------------
function idsDebut() {
  if (ordreDebut.tour !== c.tour) ordreDebut = { tour: c.tour, ids: ordre(c).map((p) => p.id) };
  const presents = actifs(c).map((p) => p.id);
  const ids = ordreDebut.ids.filter((id) => presents.includes(id));
  presents.forEach((id) => { if (!ids.includes(id)) ids.push(id); });   // nouveaux venus à la fin
  ordreDebut.ids = ids;
  return ids;
}

function dessinerScene() {
  const el = [];
  // Fin du tour précédent : pour voir ce qui vient de se passer
  const prec = c.passe[c.passe.length - 1];
  if (prec && prec.sequence && prec.sequence.length) {
    el.push(repere('Tour ' + prec.tour, 'passe'));
    prec.sequence.slice(-3).forEach((s, i) => el.push(carteSlot({ slot: s, passe: true, ancien: true, cle: 'p' + prec.tour + '-' + i })));
  }
  if (c.etape === 'debut') {
    el.push(carteDebut({ courant: true, cle: 'debut' + c.tour }));
    idsDebut().forEach((id) => el.push(carteDebutParticipant(participantDe(c, id))));
    const autres = c.participants.filter((p) => p.hors || (p.arrive || 1) > c.tour);
    if (autres.length) { el.push(repere('Hors du tour')); autres.forEach((p) => el.push(carteAttente(p))); }
  } else {
    el.push(carteDebut({ courant: false, cle: 'debut' + c.tour }));
    let round = null;
    c.sequence.forEach((s, i) => {
      if (s.round !== round) { round = s.round; el.push(repere(LIBELLES_ROUND[round], 'r' + round)); }
      el.push(carteSlot({ slot: s, passe: c.etape === 'fin' || i < c.position, courant: c.etape === 'action' && i === c.position, cle: 's' + c.tour + '-' + i }));
    });
    el.push(carteFin({ courant: c.etape === 'fin', passe: false, cle: 'fin' + c.tour }));
    const venus = enAttente(c);
    el.push(repere('Tour ' + (c.tour + 1) + (venus.length ? ' : ' + venus.length + ' arrivée' + (venus.length > 1 ? 's' : '') : ''), 'futur'));
  }
  return el;
}

function dessinerVide() {
  return [h('div', { class: 'cb-vide' },
    h('div', { class: 'cb-vide-icone', 'aria-hidden': 'true' }, '⚔'),
    h('h1', {}, 'Aucun combat en cours'),
    h('p', {}, 'Ajoutez les personnages de la cité, des PNJ ou des figurants : leur initiative est calculée d\'après leur fiche. Le combat est gardé dans ce navigateur.'),
    h('button', { type: 'button', class: 'cb-btn principal grand', onclick: () => { c = combatNeuf(); sauver(); rendre(); ouvrirAjout(); } }, 'Commencer un combat'))];
}

function titre() {
  const t = $('cbTitre');
  if (!c) { t.textContent = 'Aucun combat'; return; }
  if (c.etape === 'debut') t.replaceChildren(h('strong', {}, 'Tour ' + c.tour), ' · début du tour');
  else if (c.etape === 'fin') t.replaceChildren(h('strong', {}, 'Tour ' + c.tour), ' · résolution');
  else {
    const s = c.sequence[c.position];
    t.replaceChildren(h('strong', {}, 'Tour ' + c.tour), ' · ' + LIBELLES_ROUND[s.round] + ' · ', h('span', { class: 'cb-compte' }, (c.position + 1) + '/' + c.sequence.length));
  }
}

function bouton(texte, titreBouton, fn, classe = '') {
  return h('button', { type: 'button', class: 'cb-btn ' + classe, title: titreBouton, onclick: fn }, texte);
}
/** Bouton du centre de la barre : icône et libellé court. */
const utile = (icone, libelle, titreBouton, fn, classe = '') => bouton(
  [h('span', { class: 'cb-icone', 'aria-hidden': 'true' }, icone), h('span', { class: 'cb-lib-court' }, libelle)], titreBouton, fn, 'cb-utile ' + classe);
function pied() {
  const prec = $('btnPrec'), suiv = $('btnSuiv'), utiles = $('utiles');
  utiles.replaceChildren();
  if (!c) { prec.disabled = true; suiv.disabled = true; $('precInfo').textContent = ''; $('suivInfo').textContent = ''; return; }
  prec.disabled = !peutReculer(c);
  suiv.disabled = c.etape === 'debut' && !actifs(c).length;
  const ajout = utile('＋', 'Ajouter', c.etape === 'debut' ? 'Ajouter des participants' : 'Ajouter des participants (ils entrent au début du prochain tour)', () => ouvrirAjout());
  if (c.etape === 'debut') {
    const reglages = Object.keys(c.mods).length > 0;
    utiles.append(ajout, utile('↺', 'À zéro', 'Retirer tous les bonus, malus, Célérité et actions en plus de ce tour', () => {
      if (!reglages) { toast('Aucun réglage à retirer.'); return; }
      annulable('Réglages du tour remis à zéro.', () => { c.mods = {}; });
    }));
    $('precInfo').textContent = c.passe.length ? 'Tour ' + (c.tour - 1) : '';
    $('suivInfo').textContent = 'Commencer le tour';
  } else if (c.etape === 'action') {
    const s = c.sequence[c.position];
    let derniere = true;
    for (let i = c.position + 1; i < c.sequence.length && c.sequence[i].round === s.round; i++) derniere = false;
    const ret = utile('⏳', 'Retarder', 'Retarder : agira plus tard dans ce round (son action passe à la fin du round)', () => {
      const msg = modifier(() => retarder(c));
      if (msg) toast(msg); else toast(s.nom + ' retarde son action.');
    });
    ret.disabled = derniere;
    utiles.append(ret, ajout);
    const ensuite = c.sequence[c.position + 1];
    $('precInfo').textContent = c.position > 0 ? c.sequence[c.position - 1].nom : 'Début du tour';
    $('suivInfo').textContent = ensuite ? ensuite.nom : 'Fin du tour';
  } else {
    utiles.append(ajout, utile('■', 'Terminer', 'Terminer le combat (il est effacé de ce navigateur)', terminer, 'danger'));
    $('precInfo').textContent = c.sequence.length ? c.sequence[c.sequence.length - 1].nom : '';
    $('suivInfo').textContent = 'Tour ' + (c.tour + 1);
  }
}

function rendre({ garder = false } = {}) {
  const sx = scene.scrollLeft, sy = scene.scrollTop;
  titre();
  pied();
  scene.classList.toggle('vide', !c);
  scene.classList.toggle('etape-debut', !!c && c.etape === 'debut');
  scene.replaceChildren(...(c ? dessinerScene() : dessinerVide()));
  const courant = scene.querySelector('.courant');
  const cle = courant ? courant.dataset.cle : null;
  // Action en cours au centre ; début du tour : à gauche sur ordinateur, pour voir le plus de cartes à régler.
  const debut = !!c && c.etape === 'debut' && !mobile();
  const centrer = (doux) => courant.scrollIntoView({ block: debut ? 'nearest' : 'center', inline: debut ? 'start' : 'center', behavior: doux ? 'smooth' : 'auto' });
  if (courant && cle !== derniereCle && !garder) {
    const doux = derniereCle !== null && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (doux) centrageLe = Date.now();
    requestAnimationFrame(() => centrer(doux));
  } else if (courant && Date.now() - centrageLe < 700) {
    centrer(false);   // un compteur touché pendant l'animation : on va directement à la fin de l'animation
  } else { scene.scrollLeft = sx; scene.scrollTop = sy; }
  derniereCle = cle;
}

// ---------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------
function avancer() {
  if (!c) return;
  const msg = suivant(c);
  if (msg) { toast(msg); return; }
  ouverts = new Set();
  sauver(); rendre();
}
function reculer() {
  if (!c) return;
  const msg = precedent(c);
  if (msg) { toast(msg); return; }
  ouverts = new Set();
  sauver(); rendre();
}
function terminer() {
  if (!window.confirm('Terminer le combat ? Il sera effacé de ce navigateur.')) return;
  effacerCombat(uid); c = null; ouverts = new Set(); derniereCle = null;
  rendre();
  toast('Combat terminé.');
}

// ---------------------------------------------------------------------
// Fenêtres
// ---------------------------------------------------------------------
function fenetre(titreF, contenu, pieds, { large = false } = {}) {
  const fermer = () => { fond.remove(); document.removeEventListener('keydown', echap, true); };
  const echap = (e) => { if (e.key === 'Escape') { e.stopPropagation(); fermer(); } };
  const fond = h('div', { class: 'cb-fond' },
    h('section', { class: 'cb-fenetre' + (large ? ' large' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': titreF },
      h('header', { class: 'cb-fenetre-tete' }, h('h2', {}, titreF), h('button', { type: 'button', class: 'cb-btn petit', 'aria-label': 'Fermer', onclick: () => fermer() }, '✕')),
      h('div', { class: 'cb-fenetre-corps' }, contenu),
      pieds ? h('footer', { class: 'cb-fenetre-pied' }, pieds) : ''));
  fond.addEventListener('click', (e) => { if (e.target === fond) fermer(); });
  document.addEventListener('keydown', echap, true);
  document.body.append(fond);
  return { fermer, el: fond };
}

// --- Ajout de participants ---
let cacheFiches = null;   // fiches (personnages et PNJ) lues une fois par visite de la page
async function chargerFiches(forcer = false) {
  if (!cacheFiches || forcer) {
    const snap = await fs.getDocs(fs.collection(db, 'personnages'));
    cacheFiches = snap.docs.map(donneesDoc).sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr'));
  }
  return cacheFiches;
}

function ouvrirAjout(ongletInitial = 'pj') {
  if (!c) { c = combatNeuf(); sauver(); rendre(); }
  let onglet = ongletInitial;
  const choisis = new Set();
  const recherche = h('input', { type: 'search', placeholder: 'Rechercher…', 'aria-label': 'Rechercher' });
  const avecReserve = h('input', { type: 'checkbox' });
  let categorie = '';
  const zone = h('div', { class: 'cb-liste' }, h('p', { class: 'cb-aide' }, 'Chargement des fiches…'));
  const info = h('div', { class: 'cb-info-ajout' });
  const btnAjouter = h('button', { type: 'button', class: 'cb-btn principal', disabled: true }, 'Ajouter');
  const onglets = h('div', { class: 'cb-onglets', role: 'tablist' });
  const corps = h('div', {});
  const arriveTexte = () => (c.etape === 'debut' ? '' : ' Ils entreront au début du tour ' + (c.tour + 1) + '.');

  // Temporaire : nom + initiative (valeur, ou au hasard entre deux bornes)
  const tNom = h('input', { type: 'text', maxlength: 80, placeholder: 'Ex : Goule du Prince, policier…' });
  const tMode = { v: 'valeur' };
  const tValeur = h('input', { type: 'number', min: 0, max: 40, value: 5, inputmode: 'numeric', 'aria-label': 'Initiative' });
  const bornes = Array.from({ length: 20 }, (_, i) => i + 1);
  const tMin = h('select', { 'aria-label': 'Borne basse' }, bornes.map((n) => h('option', { value: n, selected: n === 1 }, String(n))));
  const tMax = h('select', { 'aria-label': 'Borne haute' }, bornes.map((n) => h('option', { value: n, selected: n === 10 }, String(n))));
  const tNombre = h('select', { 'aria-label': 'Nombre' }, Array.from({ length: 10 }, (_, i) => h('option', { value: i + 1 }, String(i + 1))));
  const tErreur = h('div', { class: 'cb-erreur', role: 'alert' });
  const modeBtn = (v, texte) => h('button', { type: 'button', class: 'cb-segment' + (tMode.v === v ? ' actif' : ''), 'aria-pressed': String(tMode.v === v), onclick: () => { tMode.v = v; dessiner(); } }, texte);

  function lignesFiches(fiches) {
    const filtre = recherche.value.trim().toLowerCase();
    const liste = fiches.filter((d) => !filtre || [d.nom, d.clan, d.proprietaireNom, d.age].some((x) => (x || '').toLowerCase().includes(filtre)));
    if (!liste.length) return [h('p', { class: 'cb-aide' }, fiches.length ? 'Aucune fiche ne correspond.' : (onglet === 'pj' ? 'Aucun personnage en jeu.' : 'Aucun PNJ : créez-les dans Fiches > PNJ.'))];
    return liste.map((d) => {
      const deja = dejaPresent(c, d.id);
      const coche = h('input', { type: 'checkbox', checked: choisis.has(d.id) || deja, disabled: deja });
      coche.addEventListener('change', () => { if (coche.checked) choisis.add(d.id); else choisis.delete(d.id); majBouton(); });
      return h('label', { class: 'cb-ligne-fiche' + (deja ? ' deja' : '') }, coche,
        h('span', { class: 'cb-ligne-nom' }, d.nom || 'Sans nom',
          h('small', {}, (d.pnj ? [CATEGORIES_PNJ[d.pnj], d.age !== 'Autre' ? d.age : '', d.clan] : [d.clan, d.statut === 'validee' ? 'en réserve' : '', d.proprietaireNom ? 'joueur : ' + d.proprietaireNom : ''])
            .filter(Boolean).join(' · '))),
        deja ? h('span', { class: 'cb-puce' }, 'déjà en combat') : '');
    });
  }
  function majBouton() {
    if (onglet === 'temp') {
      const okBornes = tMode.v !== 'hasard' || +tMin.value <= +tMax.value;
      tErreur.textContent = okBornes ? '' : 'La borne basse doit être inférieure ou égale à la borne haute.';
      btnAjouter.disabled = !tNom.value.trim() || !okBornes || (tMode.v === 'valeur' && tValeur.value === '');
      btnAjouter.textContent = 'Créer et ajouter' + (+tNombre.value > 1 ? ' (' + tNombre.value + ')' : '');
    } else {
      btnAjouter.disabled = !choisis.size;
      btnAjouter.textContent = 'Ajouter' + (choisis.size ? ' (' + choisis.size + ')' : '');
    }
    info.textContent = arriveTexte().trim();
  }
  async function dessiner() {
    onglets.replaceChildren(...[['pj', 'Personnages de la cité'], ['pnj', 'PNJ'], ['temp', 'Temporaire']].map(([k, l]) =>
      h('button', { type: 'button', role: 'tab', class: 'cb-onglet' + (onglet === k ? ' actif' : ''), 'aria-selected': String(onglet === k), onclick: () => { onglet = k; dessiner(); } }, l)));
    if (onglet === 'temp') {
      corps.replaceChildren(h('div', { class: 'cb-form' },
        h('label', {}, 'Nom', tNom),
        h('div', { class: 'cb-champ' }, h('span', {}, 'Initiative'),
          h('div', { class: 'cb-segments' }, modeBtn('valeur', 'Valeur'), modeBtn('hasard', 'Au hasard')),
          tMode.v === 'valeur' ? tValeur : h('div', { class: 'cb-bornes' }, h('span', {}, 'entre'), tMin, h('span', {}, 'et'), tMax),
          tErreur),
        h('label', {}, 'Nombre', tNombre, h('small', {}, 'Plusieurs : numérotés (« Goule 1 », « Goule 2 »…), initiative tirée pour chacun.'))));
      majBouton();
      tNom.focus();
      return;
    }
    corps.replaceChildren(h('div', { class: 'cb-filtres' }, recherche,
      onglet === 'pj' ? h('label', { class: 'cb-coche' }, avecReserve, 'Inclure les personnages en réserve') : h('div', { class: 'cb-segments' },
        [['', 'Tous'], ...Object.entries(CATEGORIES_PNJ)].map(([k, l]) => h('button', { type: 'button', class: 'cb-segment' + (categorie === k ? ' actif' : ''), onclick: () => { categorie = k; dessiner(); } }, l)))), zone);
    majBouton();
    try {
      const fiches = await chargerFiches();
      const liste = onglet === 'pj'
        ? fiches.filter((d) => !d.pnj && (d.statut === 'active' || (avecReserve.checked && d.statut === 'validee')))
        : fiches.filter((d) => d.pnj && d.statut !== 'archivee' && (!categorie || d.pnj === categorie));
      zone.replaceChildren(...lignesFiches(liste));
    } catch (e) { zone.replaceChildren(h('p', { class: 'cb-erreur' }, messageErreur(e))); }
  }
  recherche.addEventListener('input', () => dessiner());
  avecReserve.addEventListener('change', () => dessiner());
  [tNom, tValeur, tMin, tMax, tNombre].forEach((el) => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', majBouton));
  tNom.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !btnAjouter.disabled) btnAjouter.click(); });

  btnAjouter.addEventListener('click', async () => {
    btnAjouter.disabled = true;
    let nouveaux = [];
    try {
      if (onglet === 'temp') {
        const n = +tNombre.value;
        const base = tNom.value.trim();
        for (let i = 1; i <= n; i++) {
          const init = tMode.v === 'hasard' ? initAuHasard(tMin.value, tMax.value) : Math.max(0, parseInt(tValeur.value, 10) || 0);
          nouveaux.push(participant({ nom: n > 1 ? base + ' ' + i : base, type: 'temp', init }));
        }
      } else {
        const fiches = await chargerFiches();
        const ids = [...choisis];
        for (let i = 0; i < ids.length; i++) {
          btnAjouter.textContent = 'Lecture des fiches… ' + (i + 1) + '/' + ids.length;
          const d = fiches.find((x) => x.id === ids[i]);
          if (!d || dejaPresent(c, d.id)) continue;
          nouveaux.push(participantDeFiche(d, await lireDetail(d)));
        }
      }
    } catch (e) { toast(messageErreur(e), { erreur: true }); majBouton(); return; }
    if (!nouveaux.length) { majBouton(); return; }
    const arrive = modifier(() => ajouter(c, nouveaux), { garder: false });
    f.fermer();
    toast(nouveaux.length === 1
      ? nouveaux[0].nom + ' entre en combat (initiative ' + nouveaux[0].init + ')' + (arrive > c.tour ? ' au tour ' + arrive : '') + '.'
      : nouveaux.length + ' participants ajoutés' + (arrive > c.tour ? ' (au tour ' + arrive + ')' : '') + '.');
  });

  const f = fenetre('Ajouter au combat', h('div', {}, onglets, info, corps),
    [h('button', { type: 'button', class: 'cb-btn', onclick: () => f.fermer() }, 'Annuler'), btnAjouter], { large: true });
  dessiner();
}

// --- Participants : liste complète, initiative de base, hors combat, retrait ---
function ouvrirParticipants() {
  if (!c || !c.participants.length) { toast('Aucun participant.'); return; }
  const corps = h('div', { class: 'cb-participants' });
  const dessiner = () => {
    corps.replaceChildren(...c.participants.map((p) => {
      const nom = h('input', { type: 'text', value: p.nom, maxlength: 80, 'aria-label': 'Nom' });
      nom.addEventListener('change', () => { const v = nom.value.trim(); if (v) modifier(() => { p.nom = v.slice(0, 80); }); });
      const init = h('input', { type: 'number', min: 0, max: 40, value: p.init, inputmode: 'numeric', 'aria-label': 'Initiative de base' });
      init.addEventListener('change', () => modifier(() => { p.init = Math.max(0, Math.min(40, parseInt(init.value, 10) || 0)); }));
      const etat = p.hors ? 'Hors combat' : (p.arrive || 1) > c.tour ? 'Entre au tour ' + p.arrive : 'En combat';
      return h('div', { class: 'cb-ligne-part' + (p.hors ? ' hors' : '') },
        h('div', { class: 'cb-ligne-part-id' }, nom, h('small', {}, libelleType(p) + ' · ' + etat
          + (p.celerite ? ' · Célérité ' + p.celerite.niveau : '') + (p.volonteMax ? ' · volonté ' + p.volonteMax : ''))),
        h('label', { class: 'cb-ligne-part-init' }, h('span', {}, 'Init.'), init),
        h('div', { class: 'cb-ligne-part-actions' },
          boutonFiche(p),
          p.hors
            ? h('button', { type: 'button', class: 'cb-btn petit', onclick: () => { modifier(() => remettreEnCombat(c, p.id)); dessiner(); } }, '↩ Remettre')
            : h('button', { type: 'button', class: 'cb-btn petit', onclick: () => { modifier(() => mettreHorsCombat(c, p.id)); dessiner(); } }, '✖ Hors combat'),
          h('button', { type: 'button', class: 'cb-btn petit danger', title: 'Retirer complètement du combat', onclick: () => {
            if (!window.confirm('Retirer ' + p.nom + ' du combat ?')) return;
            modifier(() => retirer(c, p.id));
            if (!c.participants.length) { f.fermer(); return; }
            dessiner();
          } }, '🗑')));
    }));
  };
  dessiner();
  const f = fenetre('Participants (' + c.participants.length + ')', h('div', {},
    h('p', { class: 'cb-aide' }, 'L\'initiative de base vient de la fiche (le plus haut entre Physique et Mental) ; elle se corrige ici. Les bonus et malus d\'un tour se règlent au début du tour.'),
    corps), [h('button', { type: 'button', class: 'cb-btn principal', onclick: () => f.fermer() }, 'Fermer')], { large: true });
}

// ---------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------
function garde(...contenu) {
  const g = $('cbGarde');
  g.hidden = false;
  g.replaceChildren(h('div', { class: 'cb-garde-boite' }, ...contenu, h('p', {}, h('a', { href: '/membres/' }, '← Espace membres'))));
}

function brancher() {
  $('btnPrec').addEventListener('click', reculer);
  $('btnSuiv').addEventListener('click', avancer);
  $('btnParticipants').addEventListener('click', ouvrirParticipants);
  $('btnNouveau').addEventListener('click', () => {
    if (c && c.participants.length && !window.confirm('Commencer un nouveau combat ? Le combat en cours sera effacé.')) return;
    c = combatNeuf(); ouverts = new Set(); derniereCle = null; ordreDebut = { tour: 0, ids: [] };
    sauver(); rendre(); ouvrirAjout();
  });
  // Clavier (ordinateur) : flèches ou Page préc. / Page suiv.
  document.addEventListener('keydown', (e) => {
    if (document.querySelector('.cb-fond') || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest && e.target.closest('input, select, textarea')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); avancer(); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); reculer(); }
  });
  // Combat modifié depuis un autre onglet (« Ajouter au combat » sur une fiche)
  window.addEventListener('storage', (e) => {
    if (e.key !== cleStockage(uid)) return;
    c = lireCombat(uid);
    rendre({ garder: true });
    if (c) toast('Combat mis à jour depuis un autre onglet.');
  });
  // Passage ordinateur <-> téléphone (rotation, redimensionnement)
  window.matchMedia('(max-width: 899px)').addEventListener('change', () => { derniereCle = null; rendre(); });
}

let demarre = false;
surSession((s) => {
  if (!s.pret || demarre) return;
  if (!s.user) {
    garde(h('h2', {}, 'Connexion requise'), h('p', {}, 'L\'outil de combat est réservé aux conteurs.'),
      h('a', { class: 'cb-btn principal', href: '/connexion/?retour=' + encodeURIComponent(location.pathname) }, 'Se connecter'));
    return;
  }
  if (!estConteur(s.profil)) { garde(h('h2', {}, 'Réservé aux conteurs'), h('p', {}, 'L\'outil de combat sert aux conteurs pendant les parties.')); return; }
  demarre = true;
  uid = s.user.uid;
  c = lireCombat(uid);
  brancher();
  rendre();
  $('cbGarde').hidden = true;
});
