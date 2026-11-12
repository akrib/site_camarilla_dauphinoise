// =====================================================================
// Challenges demandés par un conteur à un personnage (collection defis)
// Utilisé par la page Challenge (/utils/challenge) et par les Notifications.
//
// defis/{id} : conteur, conteurNom, destinataire (compte du joueur),
//   personnage, personnageNom, titre, message, statut ('en_attente' | 'joue'),
//   challenges : [{ libelle, manches (1-10), puits, bombe, main: [coups] }]
//   resultats  : [{ v, e, d, m: [{ p, c, o }] }] un par challenge
//                (victoires, égalités, défaites, détail des manches)
// Le joueur résout la demande une seule fois ; le conteur la supprime
// après lecture du résultat (pour libérer la base).
// =====================================================================
export const COUPS = {
  pierre: { label: 'Pierre', emoji: '🪨' },
  ciseaux: { label: 'Ciseaux', emoji: '✂️' },
  papier: { label: 'Papier', emoji: '📄' },
  puits: { label: 'Puits', emoji: '🕳️' },
  bombe: { label: 'Bombe', emoji: '💣' }
};
export const ISSUES = { win: 'gagné', tie: 'égalité', lose: 'perdu' };
export const MAX_CHALLENGES = 10;
export const MAX_MANCHES = 10;

const entier = (v, min, max, def) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

/** Réglage d'un challenge, nettoyé (données venant de la base ou de la page). */
export function normaliserChallenge(c) {
  const puits = !!(c && c.puits);
  const bombe = !!(c && c.bombe);
  const permis = Object.keys(COUPS).filter((k) => (k !== 'puits' || puits) && (k !== 'bombe' || bombe));
  return {
    libelle: String((c && c.libelle) || '').trim().slice(0, 80),
    manches: entier(c && c.manches, 1, MAX_MANCHES, 1),
    puits, bombe,
    main: (Array.isArray(c && c.main) ? c.main : []).filter((m) => permis.includes(m)).slice(0, 10)
  };
}

/** « 3 manches · Puits · main imposée : Pierre, Papier » */
export function descriptionChallenge(c) {
  const n = normaliserChallenge(c);
  return [
    n.manches + ' manche' + (n.manches > 1 ? 's' : ''),
    n.puits ? COUPS.puits.emoji + ' Puits' : '',
    n.bombe ? COUPS.bombe.emoji + ' Bombe' : '',
    n.main.length ? 'main imposée : ' + n.main.map((m) => COUPS[m].label).join(', ') : ''
  ].filter(Boolean).join(' · ');
}

/** Résultat d'un challenge à partir de ses manches [{ p, c, o }]. */
export function resultat(manches) {
  return {
    v: manches.filter((x) => x.o === 'win').length,
    e: manches.filter((x) => x.o === 'tie').length,
    d: manches.filter((x) => x.o === 'lose').length,
    m: manches.map((x) => ({ p: x.p, c: x.c, o: x.o }))
  };
}

/** « 2 victoires · 0 égalité · 1 défaite » */
export function bilan(r) {
  const pl = (n, s, p) => n + ' ' + (n > 1 ? p : s);
  return [pl(r.v || 0, 'victoire', 'victoires'), pl(r.e || 0, 'égalité', 'égalités'), pl(r.d || 0, 'défaite', 'défaites')].join(' · ');
}

/** « Pierre contre Ciseaux : gagné » pour chaque manche. */
export function detailManches(r) {
  return (r.m || []).map((x, i) => (i + 1) + '. ' + (COUPS[x.p] ? COUPS[x.p].label : x.p) + ' contre '
    + (COUPS[x.c] ? COUPS[x.c].label : x.c) + ' : ' + (ISSUES[x.o] || x.o));
}
