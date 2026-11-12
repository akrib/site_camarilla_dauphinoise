// =====================================================================
// Page /utils/challenge : challenges demandés par les conteurs.
// S'appuie sur le pont window.ChallengeDuJeu défini dans _pages/utils/challenge.md.
//
// - Le générateur reste libre pour tout le monde.
// - Un membre qui incarne un personnage voit les challenges que les conteurs
//   ont demandés à ce personnage, et les résout UNE fois : le résultat part au
//   conteur (collection defis, voir defis.js).
// - Un conteur compose une demande (un ou plusieurs challenges, à partir du
//   réglage affiché sur la page) et l'envoie à un personnage validé.
// =====================================================================
import { h, db, fs, surSession, estActif, estConteur, messageErreur, dateFr, millis } from '../core.js';
import { personnageIncarne, incarner } from '../incarnation.js';
import { normaliserChallenge, descriptionChallenge, resultat, bilan, MAX_CHALLENGES } from '../defis.js';
import { compresser, donneesDoc } from '../compression.js';
import { personnagesValides } from '../annuaire.js';

const C = window.ChallengeDuJeu;
const zoneJoueur = document.getElementById('cam-defis');
const zoneConteur = document.getElementById('cam-defis-conteur');
const demande = new URLSearchParams(location.search).get('defi');
let demarre = false;

const etat = (el, texte, type = '') => { el.textContent = texte || ''; el.className = 'defiMsgEtat ' + type; };
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

surSession(async (s) => {
  if (!s.pret || demarre) return;
  demarre = true;
  if (!s.user || !estActif(s.profil)) return;   // visiteurs : le générateur libre seulement
  const uid = s.user.uid;
  try {
    const perso = await personnageIncarne(uid);
    await afficherDemandes(uid, perso);
  } catch (e) { console.error(e); }
  if (estConteur(s.profil)) afficherComposeur(s);
});

// ---------------------------------------------------------------------
// Joueur : challenges demandés au personnage incarné
// ---------------------------------------------------------------------
async function afficherDemandes(uid, perso) {
  const snap = await fs.getDocs(fs.query(fs.collection(db, 'defis'), fs.where('destinataire', '==', uid)));
  const defis = snap.docs.map(donneesDoc).sort((a, b) => millis(b.creeLe) - millis(a.creeLe));
  if (!defis.length && !demande) return;

  const miens = perso ? defis.filter((d) => d.personnage === perso.id) : [];
  const autres = defis.filter((d) => d.statut === 'en_attente' && (!perso || d.personnage !== perso.id));
  zoneJoueur.hidden = false;
  zoneJoueur.replaceChildren(h('div', { class: 'panelHead' },
    h('h2', {}, perso ? 'Challenges demandés à ' + perso.nom : 'Challenges demandés'),
    h('span', { class: 'hint' }, 'par les conteurs · une seule résolution')));

  if (!perso) {
    zoneJoueur.append(h('p', { class: 'defiInfo' }, 'Incarnez le personnage concerné pour résoudre ses challenges.'));
  } else if (!miens.length) {
    zoneJoueur.append(h('p', { class: 'defiInfo' }, 'Aucun challenge demandé à ' + perso.nom + ' pour le moment.'));
  }
  miens.forEach((d) => zoneJoueur.append(carteDemande(d)));

  // Challenges en attente pour d'autres personnages du joueur
  const parPerso = new Map();
  autres.forEach((d) => parPerso.set(d.personnage, { nom: d.personnageNom, n: (parPerso.get(d.personnage)?.n || 0) + 1 }));
  if (parPerso.size) {
    zoneJoueur.append(h('div', { class: 'defiAutres' }, 'En attente pour vos autres personnages : ',
      [...parPerso].map(([id, p]) => h('button', {
        type: 'button', class: 'btn petit', onclick: () => { incarner(uid, { id, nom: p.nom }); location.reload(); }
      }, 'Incarner ' + p.nom + ' (' + p.n + ')'))));
  }

  const cible = demande && document.getElementById('defi-' + demande);
  if (cible) { cible.classList.add('cible'); cible.scrollIntoView({ block: 'center' }); }
}

function carteDemande(d) {
  const challenges = (d.challenges || []).map(normaliserChallenge);
  const joue = d.statut === 'joue';
  const resultats = Array.isArray(d.resultats) ? d.resultats : [];
  const zoneRes = h('div', { class: 'defiRes' });
  const msg = h('div', { class: 'defiMsgEtat' });
  const liste = h('ol', { class: 'defiListe' }, challenges.map((c, i) => h('li', {},
    h('b', {}, c.libelle || 'Challenge ' + (i + 1)), ' — ', descriptionChallenge(c),
    resultats[i] ? [' → ', h('span', { class: 'defiBilan' }, bilan(resultats[i]))] : '')));
  const bouton = h('button', { type: 'button', class: 'btn primary' }, '▶ Résoudre');
  let calcules = null;   // résultats déjà tirés : en cas d'échec d'envoi, on renvoie les mêmes (pas de nouveau tirage)

  bouton.addEventListener('click', async () => {
    bouton.disabled = true;
    if (!calcules) {
      etat(msg, 'Tirage en cours…');
      zoneRes.replaceChildren();
      calcules = [];
      for (const [i, c] of challenges.entries()) {
        const manches = C.jouer(c);
        calcules.push(resultat(manches));
        await pause(450);
        zoneRes.append(h('h3', {}, (c.libelle || 'Challenge ' + (i + 1)) + ' — ' + bilan(calcules[i])),
          h('div', { class: 'results' }, manches.map((r, j) => C.carte(r, j))));
      }
    }
    etat(msg, 'Envoi du résultat au conteur…');
    try {
      await fs.updateDoc(fs.doc(db, 'defis', d.id), { statut: 'joue', resultats: calcules, joueLe: fs.serverTimestamp() });
      bouton.remove();
      liste.querySelectorAll('li').forEach((li, i) => li.append(' → ', h('span', { class: 'defiBilan' }, bilan(calcules[i]))));
      etat(msg, 'Résultat envoyé à ' + (d.conteurNom || 'au conteur') + '.', 'ok');
      C.toast('Résultat envoyé au conteur');
    } catch (e) {
      console.error(e);
      etat(msg, 'Envoi impossible (' + messageErreur(e) + '). Le tirage est conservé : réessayez l\'envoi.', 'err');
      bouton.textContent = '⟳ Renvoyer le résultat';
      bouton.disabled = false;
    }
  });

  return h('div', { class: 'defi', id: 'defi-' + d.id },
    h('div', { class: 'defiTete' }, h('strong', {}, d.titre),
      h('span', {}, (d.conteurNom || 'Un conteur') + ' · ' + dateFr(d.creeLe, true) + (joue ? ' · résolu le ' + dateFr(d.joueLe, true) : ''))),
    d.message ? h('div', { class: 'defiMsg' }, d.message) : '',
    liste,
    joue ? h('p', { class: 'defiInfo' }, 'Résolu : le résultat a été envoyé au conteur.') : bouton,
    msg, zoneRes);
}

// ---------------------------------------------------------------------
// Conteur : proposer un challenge (ou une liste de challenges) à un personnage
// ---------------------------------------------------------------------
async function afficherComposeur(session) {
  const liste = [];
  const msg = h('div', { class: 'defiMsgEtat' });
  const cible = h('select', {}, h('option', { value: '' }, 'Chargement des personnages…'));
  const titre = h('input', { type: 'text', maxlength: 120, placeholder: 'Ex. : Fouiller le bureau du notaire' });
  const texte = h('textarea', { maxlength: 2000, placeholder: 'Message au joueur (contexte, enjeux…)' });
  const libelle = h('input', { type: 'text', maxlength: 80, placeholder: 'Ex. : Crocheter la serrure' });
  const ol = h('ol', { class: 'defiListe' });
  const envoyer = h('button', { type: 'button', class: 'btn primary' }, '✉ Envoyer au personnage');

  const dessiner = () => {
    ol.replaceChildren(...(liste.length ? liste.map((c, i) => h('li', {},
      h('b', {}, c.libelle || 'Challenge ' + (i + 1)), ' — ', descriptionChallenge(c),
      h('button', { type: 'button', class: 'x', title: 'Retirer', onclick: () => { liste.splice(i, 1); dessiner(); } }, '×')))
      : [h('li', { style: 'list-style:none;margin-left:-1.2rem' }, 'Aucun challenge : réglez la page puis « Ajouter le réglage actuel ».')]));
    envoyer.disabled = !liste.length;
  };

  zoneConteur.hidden = false;
  zoneConteur.replaceChildren(
    h('div', { class: 'panelHead' }, h('h2', {}, 'Proposer un challenge'), h('span', { class: 'hint' }, 'conteurs')),
    h('div', { class: 'ctrl-row' },
      h('div', { class: 'field' }, h('label', {}, 'Personnage'), cible),
      h('div', { class: 'field' }, h('label', {}, 'Titre de la demande'), titre)),
    h('div', { class: 'ctrl-row' }, h('div', { class: 'field' }, h('label', {}, 'Message'), texte)),
    h('div', { class: 'ctrl-row' },
      h('div', { class: 'field' }, h('label', {}, 'Libellé du challenge'), libelle),
      h('button', {
        type: 'button', class: 'btn', onclick: () => {
          if (liste.length >= MAX_CHALLENGES) { C.toast('Maximum ' + MAX_CHALLENGES + ' challenges', 'warn'); return; }
          liste.push(normaliserChallenge({ ...C.reglageActuel(), libelle: libelle.value }));
          libelle.value = '';
          dessiner();
        }
      }, '＋ Ajouter le réglage actuel')),
    h('p', { class: 'defiInfo' }, 'Le réglage actuel, ce sont les manches, Puits / Bombe et, si « Utiliser comme main » est cochée, la liste personnalisée imposée au joueur. Ajoutez un ou plusieurs challenges (', MAX_CHALLENGES, ' au plus).'),
    ol,
    h('div', { class: 'ctrl-row' }, envoyer),
    msg,
    h('p', { class: 'defiInfo' }, 'Les résultats arrivent dans vos ', h('a', { href: '/membres/notifications/' }, 'notifications'), '.'));
  dessiner();

  let persos = [];
  try {
    persos = await personnagesValides();
    cible.replaceChildren(h('option', { value: '' }, persos.length ? '— Choisir —' : 'Aucun personnage validé'),
      ...persos.map((p) => h('option', { value: p.id }, p.nom + (p.joueur ? ' (' + p.joueur + ')' : ''))));
  } catch (e) { etat(msg, messageErreur(e), 'err'); }

  envoyer.addEventListener('click', async () => {
    const p = persos.find((x) => x.id === cible.value);
    if (!p) { etat(msg, 'Choisissez le personnage.', 'err'); return; }
    if (!titre.value.trim()) { etat(msg, 'Donnez un titre à la demande.', 'err'); titre.focus(); return; }
    envoyer.disabled = true;
    try {
      await fs.addDoc(fs.collection(db, 'defis'), {
        conteur: session.user.uid, conteurNom: session.profil.nom,
        destinataire: p.proprietaire, personnage: p.id, personnageNom: p.nom,
        titre: titre.value.trim().slice(0, 120), message: compresser(texte.value.trim().slice(0, 2000)),
        challenges: liste.map(normaliserChallenge), statut: 'en_attente', resultats: [],
        creeLe: fs.serverTimestamp()
      });
      etat(msg, 'Demande envoyée à ' + p.nom + '.', 'ok');
      C.toast('Demande envoyée à ' + p.nom);
      liste.length = 0; titre.value = ''; texte.value = '';
      dessiner();
    } catch (e) {
      console.error(e);
      etat(msg, messageErreur(e), 'err');
      envoyer.disabled = false;
    }
  });
}
