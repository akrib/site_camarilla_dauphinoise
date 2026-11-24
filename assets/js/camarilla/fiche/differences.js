// =====================================================================
// Récapitulatif des modifications d'une fiche depuis sa dernière validation
// ---------------------------------------------------------------------
// Compare deux fiches MET (la version validée gardée par les conteurs dans
// personnages/{id}/detail/valide et la fiche actuelle) : ce qui a changé,
// rubrique par rubrique, et l'expérience dépensée entre les deux.
// Les listes sont comparées par contenu (l'ordre des lignes ne compte pas) ;
// les éléments nommés (disciplines, compétences libres, équipement…) par nom.
// =====================================================================
import { calculer } from './calculs.js';
import { normaliser, ficheVide } from './modele.js';
import { nomSpecialite } from './mysteres-base.js';

const LIBELLES = {
  nom: 'Nom', typeFiche: 'Type de fiche', secte: 'Secte', race: 'Race', age: 'Âge', clan: 'Clan',
  nomVeritable: 'Nom véritable', naissance: 'Naissance', lieuNaissance: 'Lieu de naissance', lignee: 'Lignée',
  etreinte: 'Étreinte', lieuEtreinte: 'Lieu d\'étreinte', infants: 'Infants', torpeursMois: 'Torpeurs (mois)',
  tempsGouleMois: 'Temps de goule (mois)', creeLe: 'Créé le', absenceMois: 'Absence (mois)', ageVampirique: 'Âge vampirique',
  xpGratuite: 'Expérience gratuite', concept: 'Concept', generation: 'Génération', voie: 'Voie',
  ethiqueRegagnee: 'Points d\'éthique regagnés', ethiquePerdue: 'Points d\'éthique perdus', archetype: 'Archétype',
  archetypePerso: 'Archétype personnalisé', notes: 'Notes', statutClan: 'Statut interne au clan',
  atouts: 'Atouts', handicaps: 'Handicaps', handicapsSupp: 'Handicaps supplémentaires', precisionsAtouts: 'Précisions atouts / handicaps',
  rachatHandicap: 'Rachat de handicap', oubliAtout: 'Oubli d\'atout', atoutFragment: 'Atout « Fragment restant »', atoutPropice: 'Atout « Propice »',
  liensSang: 'Liens de sang', derangements: 'Dérangements', attributs: 'Attributs', physique: 'Physique', social: 'Social', mental: 'Mental',
  valeur: 'valeur', focus: 'focus', bonus: 'bonus', changementFocus: 'Changement de focus', competences: 'Compétences',
  voyageurChevronne: 'Voyageur chevronné', competencesLibres: 'Autres compétences', sciences: 'Sciences', artisanat: 'Artisanat',
  beneficeArtisanat: 'Bénédiction de l\'Artiste (artisanat)', representation: 'Représentation',
  beneficeRepresentation: 'Bénédiction de l\'Artiste (représentation)', specialitesCompetences: 'Spécialités de compétences',
  mysteres: 'Mystères', specialites: 'spécialités', linguistique: 'Linguistique', langues: 'Langues', donInfernal: 'Don infernal',
  disciplinesCaitiff: 'Disciplines Caïtiff', disciplines: 'Disciplines', techniques: 'Techniques', rituels: 'Rituels',
  historiques: 'Historiques', gotha: 'Gotha', pegre: 'Pègre', specialisations: 'spécialisations', ressources: 'Ressources',
  renommee: 'Renommée', faussesIdentites: 'Fausses identités', havres: 'Havres', avantages: 'avantages', troupeau: 'Troupeau',
  contacts: 'Contacts', allies: 'Alliés', liste: 'liste', rituelsSabbat: 'Rituels sabbatiques', partages: 'Historiques partagés',
  emplacements: 'Emplacements d\'intérêts', serviteurs: 'Serviteurs', mentorats: 'Mentorats', equipement: 'Équipement',
  niveau: 'niveau', description: 'description', type: 'type', anciens: 'pouvoirs d\'ancien', qualites: 'qualités',
  quantite: 'quantité', art: 'art', antiquite: 'antiquité', maitre: 'maître', vassal: 'vassal', date: 'date', cout: 'coût',
  mentor: 'mentor', valideur: 'valideur', nomValideur: 'nom du valideur', competence: 'compétence',
};
// Rubriques regroupées dans le récapitulatif
const RUBRIQUE = {
  atouts: 'Atouts et handicaps', handicaps: 'Atouts et handicaps', handicapsSupp: 'Atouts et handicaps', precisionsAtouts: 'Atouts et handicaps',
  rachatHandicap: 'Atouts et handicaps', oubliAtout: 'Atouts et handicaps', atoutFragment: 'Atouts et handicaps', atoutPropice: 'Atouts et handicaps',
  derangements: 'Atouts et handicaps', liensSang: 'Liens de sang', attributs: 'Attributs', changementFocus: 'Attributs',
  competences: 'Compétences', voyageurChevronne: 'Compétences', competencesLibres: 'Compétences', sciences: 'Compétences',
  artisanat: 'Compétences', beneficeArtisanat: 'Compétences', representation: 'Compétences', beneficeRepresentation: 'Compétences',
  specialitesCompetences: 'Compétences', linguistique: 'Compétences', langues: 'Compétences', donInfernal: 'Compétences',
  disciplinesCaitiff: 'Disciplines', mysteres: 'Mystères', disciplines: 'Disciplines', techniques: 'Techniques et rituels',
  rituels: 'Techniques et rituels', historiques: 'Historiques', serviteurs: 'Serviteurs', mentorats: 'Mentorats', equipement: 'Équipement',
};
export const LIGNES_XP = [
  ['Attributs', 'attributs'], ['Compétences', 'competences'], ['Disciplines', 'disciplines'], ['Historiques', 'historiques'],
  ['Rituels', 'rituels'], ['Pouvoirs d\'ancien', 'anciens'], ['Atouts et handicaps', 'atoutsHandicaps'], ['Techniques', 'techniques'],
  ['Éthique regagnée', 'ethique'], ['Changement de focus', 'changementFocus'], ['Rachat de handicap', 'rachatHandicap'],
  ['Oubli d\'atout', 'oubliAtout'], ['Culte personnel / Bosquet', 'culte'], ['Royauté Ventrue / Attraper un tueur', 'royaute'],
];

const vide = (v) => v === undefined || v === null || String(v).trim() === '';
const court = (v, n = 70) => { const s = String(v ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const valeur = (v) => (vide(v) ? '—' : court(v));
const lib = (k) => LIBELLES[k] || k;

/** Texte court d'un élément de liste (objet) : « Auspex — niveau 3, type C ». */
function resume(o) {
  if (o === null || typeof o !== 'object') return vide(o) ? '' : court(o, 90);
  if ('competence' in o) return [o.competence, o.nom].filter((x) => !vide(x)).join(' : ');
  const parts = [];
  for (const [k, v] of Object.entries(o)) {
    if (k === 'nom') continue;
    if (Array.isArray(v)) {
      const l = v.filter((x) => !vide(typeof x === 'object' ? resume(x) : x)).map((x) => (typeof x === 'object' ? resume(x) : court(x, 40)));
      if (l.length) parts.push(lib(k) + ' : ' + l.join(', '));
    } else if (v && typeof v === 'object') {
      const r = resume(v);
      if (r) parts.push(r);
    } else if (!vide(v)) parts.push(lib(k) + ' ' + court(v, 40));
  }
  return [vide(o.nom) ? '' : String(o.nom).trim(), parts.join(', ')].filter(Boolean).join(' — ');
}

/** Multiensemble : compte des occurrences de chaque texte. */
function compter(liste) {
  const m = new Map();
  for (const x of liste) if (x) m.set(x, (m.get(x) || 0) + 1);
  return m;
}
function ajoutsRetraits(a, b) {
  const ca = compter(a), cb = compter(b);
  const plus = [], moins = [];
  for (const [x, n] of cb) for (let i = (ca.get(x) || 0); i < n; i++) plus.push(x);
  for (const [x, n] of ca) for (let i = (cb.get(x) || 0); i < n; i++) moins.push(x);
  return { plus, moins };
}

// Lignes vides d'une liste (valeurs par défaut du modèle : quantité 1, art « Classique »…) : ignorées.
let DEFAUT = null;
function lignesVides(chemin) {
  if (!DEFAUT) DEFAUT = preparer(ficheVide()).G;
  const l = chemin.reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), DEFAUT);
  return new Set(Array.isArray(l) ? l.map((x) => (x && typeof x === 'object' ? resume(x) : '')).filter(Boolean) : []);
}

function comparer(a, b, chemin, sortie) {
  const rubrique = RUBRIQUE[chemin[0]] || lib(chemin[0]);
  // « Compétences : Érudition : 2 → 3 » plutôt que « Compétences : Compétences › Érudition »
  const titre = chemin.slice(lib(chemin[0]) === rubrique ? 1 : 0).filter((k) => !/^\d+$/.test(k)).map(lib).join(' › ');
  const noter = (texte) => sortie.push({ rubrique, texte: (titre ? titre + ' : ' : '') + texte });
  if (Array.isArray(a) || Array.isArray(b)) {
    const vides = lignesVides(chemin);
    const utile = (x) => !(x && typeof x === 'object' && vide(x.nom) && vides.has(resume(x)));
    const la = (Array.isArray(a) ? a : []).filter(utile), lb = (Array.isArray(b) ? b : []).filter(utile);
    const objets = [...la, ...lb].some((x) => x && typeof x === 'object');
    if (objets && [...la, ...lb].some((x) => x && typeof x === 'object' && 'nom' in x)) {
      // Éléments nommés : appariés par nom (sauf doublons : comparaison par contenu)
      const noms = (l) => l.filter((x) => !vide(x && x.nom)).map((x) => String(x.nom).trim());
      const na = noms(la), nb = noms(lb);
      if (new Set(na).size === na.length && new Set(nb).size === nb.length) {
        const parNom = (l) => new Map(l.filter((x) => !vide(x && x.nom)).map((x) => [String(x.nom).trim(), x]));
        const ma = parNom(la), mb = parNom(lb);
        for (const [n, x] of mb) {
          if (!ma.has(n)) noter('+ ' + resume(x));
          else comparer(ma.get(n), x, chemin.concat(n), sortie);
        }
        for (const [n, x] of ma) if (!mb.has(n)) noter('− ' + resume(x));
        const sansNom = (l) => l.filter((x) => vide(x && x.nom)).map(resume);
        const { plus, moins } = ajoutsRetraits(sansNom(la), sansNom(lb));
        plus.forEach((x) => noter('+ ' + x));
        moins.forEach((x) => noter('− ' + x));
        return;
      }
    }
    const { plus, moins } = ajoutsRetraits(la.map((x) => (x && typeof x === 'object' ? resume(x) : (vide(x) ? '' : court(x, 90)))),
      lb.map((x) => (x && typeof x === 'object' ? resume(x) : (vide(x) ? '' : court(x, 90)))));
    plus.forEach((x) => noter('+ ' + x));
    moins.forEach((x) => noter('− ' + x));
    return;
  }
  if ((a && typeof a === 'object') || (b && typeof b === 'object')) {
    const oa = a && typeof a === 'object' ? a : {}, ob = b && typeof b === 'object' ? b : {};
    for (const k of new Set([...Object.keys(oa), ...Object.keys(ob)])) comparer(oa[k], ob[k], chemin.concat(k), sortie);
    return;
  }
  const sa = vide(a) ? '' : String(a).trim(), sb = vide(b) ? '' : String(b).trim();
  if (sa === sb) return;
  if (sa.length > 70 || sb.length > 70) noter('texte modifié (« ' + court(sb || '—', 90) + ' »)');
  else noter(valeur(sa) + ' → ' + valeur(sb));
}

/** Fiche préparée pour la comparaison : noms implicites (spécialités offertes, disciplines de clan) écrits en clair. */
function preparer(fiche) {
  const F = normaliser(fiche);
  const R = calculer(F);
  const G = JSON.parse(JSON.stringify(F));
  delete G.version;
  G.mysteres.specialites.forEach((s, i) => { if (i < 3) s.nom = nomSpecialite(F, i); });
  G.disciplines.forEach((d, i) => { if (i < 3 && R.disciplines[i]) d.nom = R.disciplines[i].nom || d.nom; });
  return { G, R };
}

/**
 * Récapitulatif : { changements: [{ rubrique, texte }], xp: { avant, apres, lignes: [[libellé, avant, après]] } }.
 */
export function recapitulatif(ficheValidee, ficheActuelle) {
  const A = preparer(ficheValidee), B = preparer(ficheActuelle);
  const changements = [];
  for (const k of new Set([...Object.keys(A.G), ...Object.keys(B.G)])) comparer(A.G[k], B.G[k], [k], changements);
  const xa = A.R.xp, xb = B.R.xp;
  return {
    changements,
    xp: {
      avant: { acquise: xa.acquise, depensee: xa.depensee, restante: xa.restante },
      apres: { acquise: xb.acquise, depensee: xb.depensee, restante: xb.restante },
      lignes: LIGNES_XP.map(([l, k]) => [l, xa[k] || 0, xb[k] || 0]).filter(([, a, b]) => a !== b),
    },
  };
}
