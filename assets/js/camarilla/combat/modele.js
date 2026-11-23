// =====================================================================
// Combat : ordre d'initiative, tours et rounds de Célérité
//
// Tout est gardé dans le navigateur du conteur (localStorage), rien dans
// Firestore. Un seul combat en cours par compte.
//
// Règles appliquées (règles de la Fédération, chapitre Combat, et Célérité) :
//   - initiative = le plus haut entre Physique et Mental ; à égalité : Mental,
//     puis Physique, puis Social, puis au hasard (tiré à l'entrée en combat) ;
//   - un tour = le round classique, puis les rounds de Célérité : chacun agit
//     une fois par round où il a une action, dans l'ordre d'initiative ; les
//     deuxièmes actions passent après toutes les premières, les troisièmes
//     après toutes les deuxièmes ;
//   - Célérité activée (pour un tour) : initiative + niveaux de Célérité
//     + pouvoirs d'ancien de Célérité + techniques basées sur la Célérité ;
//     une action de plus avec Célérité 3, une autre avec Célérité 5, une
//     autre avec le pouvoir d'ancien « Vitesse » ;
//   - n'avoir pas agi (initiative retardée jusqu'à la fin) : +5 au tour suivant ;
//   - l'action qui a déclenché le combat (action surprise) passe en premier.
// =====================================================================
import { calculer } from '../fiche/calculs.js';
import { normaliser } from '../fiche/modele.js';
import { REF } from '../fiche/referentiel.js';

export const MAX_ACTIONS = 4;                 // round classique + 3 rounds de Célérité
export const LIBELLES_ROUND = { '-1': 'Action surprise', 0: 'Round classique', 1: '1er round de Célérité', 2: '2e round de Célérité', 3: '3e round de Célérité' };
export const COURTS_ROUND = { '-1': 'Surprise', 0: 'Classique', 1: 'Célérité 1', 2: 'Célérité 2', 3: 'Célérité 3' };
export const BONUS_RETARD = 5;
const MAX_TOURS_GARDES = 40;

const CLE = (uid) => 'cam-combat-' + uid;
const entier = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : 0; };
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFC').replace(/\s+/g, ' ').trim();
export const nouvelId = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---------------------------------------------------------------------
// Participants
// ---------------------------------------------------------------------
/** Ce qui compte pour le combat dans une fiche MET. */
export function caracteristiques(fiche) {
  const f = normaliser(fiche || {});
  let R = null;
  try { R = calculer(f); } catch (e) { console.warn('Calcul de la fiche impossible', e); }
  const P = entier(f.attributs.physique.valeur), M = entier(f.attributs.mental.valeur), S = entier(f.attributs.social.valeur);
  const disciplines = R ? R.disciplines : f.disciplines;
  const cel = disciplines.find((d) => norm(d.nom) === norm('Célérité'));
  const niveau = Math.max(0, Math.min(5, entier(cel && cel.niveau)));
  const anciens = cel ? cel.anciens.filter((x) => String(x || '').trim()) : [];
  const techniques = f.techniques.filter((t) => REF.techniquesCelerite.some((c) => norm(c) === norm(t))).length;
  const vitesse = anciens.some((x) => norm(x) === 'vitesse');
  return {
    init: Math.max(P, M), physique: P, mental: M, social: S,
    celerite: niveau ? {
      niveau, anciens: anciens.length, techniques,
      bonus: niveau + anciens.length + techniques,
      actions: (niveau >= 3 ? 1 : 0) + (niveau >= 5 ? 1 : 0) + (vitesse ? 1 : 0)
    } : null,
    volonteMax: R && R.volonte ? R.volonte : null
  };
}

/**
 * Nouveau participant. type : 'pj' (personnage de la cité), 'pnj', 'temp'
 * (créé pour ce combat : nom et initiative seulement).
 */
export function participant({ nom, type, ficheId = null, categorie = '', joueur = '', carac = null, init = 0 }) {
  const c = carac || {};
  return {
    id: nouvelId(), nom: String(nom || 'Sans nom').slice(0, 80), type, ficheId, categorie, joueur: String(joueur || '').slice(0, 60),
    init: carac ? c.init : Math.max(0, entier(init)),
    physique: c.physique || 0, mental: c.mental || 0, social: c.social || 0,
    celerite: c.celerite || null, volonteMax: c.volonteMax || null,
    departage: Math.random(),
    degats: 0, aggraves: 0, volonte: 0,
    hors: false, arrive: 1
  };
}
/** Participant tiré d'une fiche ({ id, nom, pnj }) déjà lue. */
export function participantDeFiche(doc, fiche) {
  return participant({
    nom: doc.nom || (fiche && fiche.nom), type: doc.pnj ? 'pnj' : 'pj', ficheId: doc.id,
    categorie: doc.pnj || '', joueur: doc.pnj ? '' : doc.proprietaireNom || '', carac: caracteristiques(fiche)
  });
}
/** Initiative tirée au hasard entre deux bornes (comprises). */
export function initAuHasard(min, max) {
  const a = entier(min), b = entier(max);
  return a + Math.floor(Math.random() * (b - a + 1));
}

// ---------------------------------------------------------------------
// État du combat
// ---------------------------------------------------------------------
//   tour      : numéro du tour en cours
//   etape     : 'debut' (bonus, malus, Célérité, ajouts), 'action', 'fin' (résolution)
//   position  : action en cours dans la séquence (étape 'action')
//   mods      : { idParticipant: modificateurs du tour }
//   prochain  : { idParticipant: { retard } } à reporter au tour suivant
//   sequence  : actions du tour [{ pid, nom, round, init, retarde }], fixée en quittant le début du tour
//   passe     : tours terminés [{ tour, mods, sequence }] (pour revenir en arrière et les montrer)
export function combatNeuf() {
  return { v: 1, creeLe: Date.now(), tour: 1, etape: 'debut', position: 0, participants: [], mods: {}, prochain: {}, sequence: null, passe: [] };
}
export function lireCombat(uid) {
  try { const c = JSON.parse(localStorage.getItem(CLE(uid)) || 'null'); return c && c.v === 1 && Array.isArray(c.participants) ? c : null; }
  catch (e) { return null; }
}
export function ecrireCombat(uid, c) {
  try { localStorage.setItem(CLE(uid), JSON.stringify(c)); return true; } catch (e) { return false; }
}
export function effacerCombat(uid) { try { localStorage.removeItem(CLE(uid)); } catch (e) { /* ignore */ } }
export const cleStockage = CLE;

export const modsVides = () => ({ bonus: 0, celerite: false, retard: false, actionsSupp: 0, surprise: false });
export const modsDe = (c, pid) => ({ ...modsVides(), ...(c.mods[pid] || {}) });
export function changerMods(c, pid, champs) { c.mods[pid] = { ...modsDe(c, pid), ...champs }; }

export const participantDe = (c, pid) => c.participants.find((p) => p.id === pid) || null;
/** En combat ce tour-ci (ni hors combat, ni arrivé pour un tour suivant). */
export const actifs = (c) => c.participants.filter((p) => !p.hors && (p.arrive || 1) <= c.tour);
export const enAttente = (c) => c.participants.filter((p) => !p.hors && (p.arrive || 1) > c.tour);

export function initEffective(p, m) {
  return p.init + (m.bonus || 0) + (m.celerite && p.celerite ? p.celerite.bonus : 0) + (m.retard ? BONUS_RETARD : 0);
}
export function nbActions(p, m) {
  return Math.max(1, Math.min(MAX_ACTIONS, 1 + (m.celerite && p.celerite ? p.celerite.actions : 0) + (m.actionsSupp || 0)));
}
/** Détail de l'initiative (« 8 + 6 Célérité + 5 retard − 1 »). */
export function detailInit(p, m) {
  const parts = [String(p.init)];
  if (m.celerite && p.celerite) parts.push('+ ' + p.celerite.bonus + ' Célérité');
  if (m.retard) parts.push('+ ' + BONUS_RETARD + ' (n\'a pas agi)');
  if (m.bonus) parts.push((m.bonus > 0 ? '+ ' : '− ') + Math.abs(m.bonus));
  return parts.join(' ');
}

/** Ordre d'initiative du tour (plus haute d'abord, départages des règles). */
export function ordre(c) {
  const cle = (p) => { const m = modsDe(c, p.id); return [initEffective(p, m), p.mental, p.physique, p.social, p.departage]; };
  return actifs(c).map((p) => ({ p, k: cle(p) })).sort((a, b) => {
    for (let i = 0; i < a.k.length; i++) if (a.k[i] !== b.k[i]) return b.k[i] - a.k[i];
    return 0;
  }).map((x) => x.p);
}

/** Actions du tour : surprise (tour 1), round classique, puis rounds de Célérité. */
export function construireSequence(c) {
  const liste = ordre(c);
  const seq = [];
  const slot = (p, round) => { const m = modsDe(c, p.id); return { pid: p.id, nom: p.nom, round, init: initEffective(p, m) }; };
  if (c.tour === 1) liste.filter((p) => modsDe(c, p.id).surprise).forEach((p) => seq.push(slot(p, -1)));
  for (let k = 0; k < MAX_ACTIONS; k++) liste.forEach((p) => { if (nbActions(p, modsDe(c, p.id)) > k) seq.push(slot(p, k)); });
  return seq;
}

// ---------------------------------------------------------------------
// Navigation : Précédent / Suivant
// ---------------------------------------------------------------------
/** Avance d'une étape. Renvoie un message si c'est impossible. */
export function suivant(c) {
  if (c.etape === 'debut') {
    const seq = construireSequence(c);
    if (!seq.length) return 'Personne n\'est en combat : ajoutez des participants.';
    c.sequence = seq; c.etape = 'action'; c.position = 0;
    return null;
  }
  if (c.etape === 'action') {
    if (c.position < c.sequence.length - 1) c.position += 1;
    else c.etape = 'fin';
    return null;
  }
  // Fin du tour -> début du suivant
  c.passe.push({ tour: c.tour, mods: c.mods, sequence: c.sequence });
  if (c.passe.length > MAX_TOURS_GARDES) c.passe.shift();
  const anciens = c.mods;
  c.tour += 1;
  c.mods = {};
  c.participants.forEach((p) => {
    const a = anciens[p.id] || {};
    // Célérité reste activée d'un tour à l'autre (à décocher si le sang n'est pas redépensé) ;
    // le reste repart de zéro, sauf le +5 de celui qui n'a pas agi.
    const m = { celerite: !!a.celerite, retard: !!(c.prochain[p.id] && c.prochain[p.id].retard) };
    if (m.celerite || m.retard) c.mods[p.id] = { ...modsVides(), ...m };
  });
  c.prochain = {};
  c.sequence = null; c.etape = 'debut'; c.position = 0;
  return null;
}
export const peutReculer = (c) => !(c.etape === 'debut' && !c.passe.length);
/** Recule d'une étape (jusque dans le tour précédent). */
export function precedent(c) {
  if (c.etape === 'action') {
    if (c.position > 0) c.position -= 1;
    else { c.etape = 'debut'; c.sequence = null; }
    return null;
  }
  if (c.etape === 'fin') { c.etape = 'action'; c.position = Math.max(0, c.sequence.length - 1); return null; }
  if (!c.passe.length) return 'C\'est le début du combat.';
  const t = c.passe.pop();
  c.tour = t.tour; c.mods = t.mods || {}; c.sequence = t.sequence; c.prochain = {};
  c.etape = 'fin'; c.position = Math.max(0, c.sequence.length - 1);
  return null;
}

// ---------------------------------------------------------------------
// Actions sur les participants
// ---------------------------------------------------------------------
/** Ajoute des participants : tout de suite au début d'un tour, sinon au début du suivant. */
export function ajouter(c, liste) {
  const arrive = c.etape === 'debut' ? c.tour : c.tour + 1;
  liste.forEach((p) => { p.arrive = arrive; c.participants.push(p); });
  return arrive;
}
export const dejaPresent = (c, ficheId) => !!ficheId && c.participants.some((p) => p.ficheId === ficheId);

/** Sort un participant du combat : ses actions à venir de ce tour disparaissent. */
export function mettreHorsCombat(c, pid) {
  const p = participantDe(c, pid);
  if (!p) return;
  p.hors = true;
  if (c.sequence && c.etape !== 'fin') {
    const limite = c.etape === 'action' ? c.position : -1;
    c.sequence = c.sequence.filter((s, i) => i <= limite || s.pid !== pid);
    if (c.etape === 'action' && c.position >= c.sequence.length) { c.position = Math.max(0, c.sequence.length - 1); if (!c.sequence.length) c.etape = 'fin'; }
  }
}
/** Remet en combat : tout de suite au début d'un tour, sinon au tour suivant. */
export function remettreEnCombat(c, pid) {
  const p = participantDe(c, pid);
  if (!p) return;
  p.hors = false;
  p.arrive = c.etape === 'debut' ? c.tour : Math.max(p.arrive || 1, c.tour + 1);
}
export function retirer(c, pid) {
  mettreHorsCombat(c, pid);
  c.participants = c.participants.filter((p) => p.id !== pid);
  delete c.mods[pid];
}

/**
 * Retarde l'action en cours : elle passe à la fin de son round (le personnage
 * agira quand il voudra pendant le reste du round). Renvoie un message si
 * c'est déjà la dernière action du round.
 */
export function retarder(c) {
  if (c.etape !== 'action') return 'Rien à retarder.';
  const s = c.sequence[c.position];
  let fin = c.position;
  while (fin + 1 < c.sequence.length && c.sequence[fin + 1].round === s.round) fin += 1;
  if (fin === c.position) return 'C\'est déjà la dernière action de ce round.';
  c.sequence.splice(c.position, 1);
  c.sequence.splice(fin, 0, { ...s, retarde: true });
  return null;
}
/** N'agit pas ce round : +5 au tour suivant (non cumulatif). */
export function basculerNAgitPas(c, pid) {
  const actuel = !!(c.prochain[pid] && c.prochain[pid].retard);
  c.prochain[pid] = { ...(c.prochain[pid] || {}), retard: !actuel };
  return !actuel;
}

/** Compteurs : dégâts normaux, dégâts aggravés, volonté utilisée (jamais sous 0). */
export function compter(c, pid, champ, delta) {
  const p = participantDe(c, pid);
  if (!p || !['degats', 'aggraves', 'volonte'].includes(champ)) return;
  p[champ] = Math.max(0, Math.min(99, (p[champ] || 0) + delta));
}

// ---------------------------------------------------------------------
// Depuis une autre page (fiche) : ajout au combat gardé dans ce navigateur
// ---------------------------------------------------------------------
/** Ajoute un participant au combat en cours (ou à un nouveau). Renvoie { arrive, deja, nouveau }. */
export function ajouterAuCombat(uid, p) {
  let c = lireCombat(uid);
  const nouveau = !c;
  if (!c) c = combatNeuf();
  if (dejaPresent(c, p.ficheId)) return { deja: true, arrive: null, nouveau: false, tour: c.tour };
  const arrive = ajouter(c, [p]);
  ecrireCombat(uid, c);
  return { deja: false, arrive, nouveau, tour: c.tour };
}
