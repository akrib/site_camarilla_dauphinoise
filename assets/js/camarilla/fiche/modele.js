// =====================================================================
// Modèle de données de la fiche de personnage MET 8.0.2
// ---------------------------------------------------------------------
// Chaque champ correspond à une cellule de la fiche Excel (indiquée en
// commentaire) : la fonction depuisExcel() s'en sert pour importer une
// fiche existante. Pas de tableau dans un tableau (contrainte Firestore).
// =====================================================================
import { REF } from './referentiel.js';

export const TAILLES = {
  atouts: 7, liensSang: 10, competencesLibres: 8, sciences: 10, artisanat: 10, representation: 9,
  specialitesMystere: 25, langues: 15, disciplines: 15, techniques: 20, rituels: 50,
  specialitesInfluence: 10, havres: 3, avantagesHavre: 6, faussesIdentites: 3, contacts: 5, allies: 5,
  rituelsSabbat: 24, emplacements: 10, serviteurs: 6, specialitesServiteur: 10, qualitesServiteur: 10,
  mentorats: 15, equipement: 12,
};

const vide = (n, f = () => '') => Array.from({ length: n }, (_, i) => f(i));
const libre = () => ({ nom: '', niveau: '' });

export function ficheVide() {
  return {
    version: REF.version,
    // --- En-tête (onglet Personnage, lignes 1-2)
    nom: '', typeFiche: '', secte: '', race: '', age: '', clan: '',            // C1 J1 A2 C2 E2 H2
    // --- Identité (lignes 8-23)
    nomVeritable: '', naissance: '', lieuNaissance: '',                          // C8 G8 I8
    lignee: '', etreinte: '', lieuEtreinte: '',                                 // C9 G9 I9
    infants: '', torpeursMois: '', tempsGouleMois: '',                          // C10 G10 I10
    creeLe: new Date().toISOString().slice(0, 10), absenceMois: '', ageVampirique: '', // F11 I11 I12
    xpGratuite: '',                                                             // N9 (diablerie, ancien système)
    concept: '', generation: '', voie: '',                                      // B14 I14 K15
    ethiqueRegagnee: '', ethiquePerdue: '',                                     // J16 J17
    archetype: '', archetypePerso: '', notes: '', statutClan: '',               // B16 N15 B18 C23
    // --- Atouts et handicaps (lignes 25-36) : libellés « Nom (cout n) » comme dans l'Excel
    atouts: vide(TAILLES.atouts), handicaps: vide(TAILLES.atouts), handicapsSupp: vide(TAILLES.atouts),
    precisionsAtouts: '', rachatHandicap: '', oubliAtout: '', atoutFragment: '', atoutPropice: '',
    liensSang: vide(TAILLES.liensSang, () => ({ maitre: '', vassal: '', niveau: '', date: '' })), // P33:S42
    // --- Dérangements (lignes 38-46)
    derangements: vide(3, () => ({ type: '', cout: '', description: '' })),
    // --- Attributs (lignes 48-52)
    attributs: {
      physique: { valeur: '', focus: vide(3), bonus: '' },                       // C50, B51:D51, D49
      social: { valeur: '', focus: vide(3), bonus: '' },                         // G50, F51:H51, H49
      mental: { valeur: '', focus: vide(3), bonus: '' },                         // K50, J51:L51, L49
    },
    changementFocus: '',                                                        // N48
    // --- Compétences (lignes 54-86)
    competences: Object.fromEntries(REF.competences.map((c) => [c, ''])),        // colonne D
    voyageurChevronne: { 'Expérience de la Rue': '', 'Survie': '' },            // C67 C77
    competencesLibres: vide(TAILLES.competencesLibres, libre),                 // A79:A86 / D79:D86
    sciences: vide(TAILLES.sciences, libre),                                   // E56:E65 / H
    artisanat: vide(TAILLES.artisanat, libre), beneficeArtisanat: '',          // E67:E76 / H, G67
    representation: vide(TAILLES.representation, (i) => ({ nom: i === 8 ? 'Chant' : '', niveau: '' })), // E78:E86
    beneficeRepresentation: '',                                                 // G78
    // Les 3 premières spécialités sont la secte, le clan et la race (J56:J58, niveau 2 par défaut)
    mysteres: { niveau: '', specialites: vide(TAILLES.specialitesMystere, (i) => ({ nom: '', niveau: i < 3 ? 2 : '' })) }, // L55, J56:J80 / L
    linguistique: '', langues: vide(TAILLES.langues, (i) => (i === 0 ? 'Français' : '')), // L81, O56:O70
    donInfernal: '', disciplinesCaitiff: vide(3),                               // N81, O84:O86
    // --- Disciplines (lignes 88-104) : les trois premières sont celles du clan
    disciplines: vide(TAILLES.disciplines, (i) => ({ nom: '', niveau: '', type: i < 3 ? 'C' : 'H', anciens: vide(4) })),
    techniques: vide(TAILLES.techniques),                                       // A107:A116, D107:D116
    rituels: vide(TAILLES.rituels),                                             // G/J/M/P/S 107-116
    // --- Onglet Historiques
    historiques: {
      gotha: { niveau: '', specialisations: vide(TAILLES.specialitesInfluence) },
      pegre: { niveau: '', specialisations: vide(TAILLES.specialitesInfluence) },
      ressources: '', renommee: '',
      faussesIdentites: vide(TAILLES.faussesIdentites, () => ({ niveau: '', description: '' })),
      havres: vide(TAILLES.havres, () => ({ nom: '', niveau: '', avantages: vide(TAILLES.avantagesHavre) })),
      troupeau: { niveau: '', description: '' },
      contacts: { niveau: '', liste: vide(TAILLES.contacts) },
      allies: { niveau: '', liste: vide(TAILLES.allies) },
      rituelsSabbat: { niveau: '', liste: vide(TAILLES.rituelsSabbat) },
      partages: { niveau: '', description: '' },
      emplacements: vide(TAILLES.emplacements),
    },
    // --- Onglet Serviteur
    serviteurs: vide(TAILLES.serviteurs, () => ({
      nom: '', niveau: '', type: '', description: '',
      specialites: vide(TAILLES.specialitesServiteur), qualites: vide(TAILLES.qualitesServiteur),
    })),
    // --- Onglet Gestion des mentorats
    mentorats: {
      disciplines: vide(TAILLES.mentorats, () => ({ nom: '', niveau: '', mentor: '', date: '', valideur: '', nomValideur: '' })),
      mysteres: vide(TAILLES.mentorats, () => ({ nom: '', niveau: '', mentor: '', date: '', valideur: '', nomValideur: '' })),
    },
    // --- Onglet Equipement
    equipement: vide(TAILLES.equipement, () => ({
      nom: '', quantite: 1, type: '', description: '', qualites: vide(2), art: 'Classique', antiquite: 'Non',
    })),
  };
}

/** Complète une fiche (ancienne version, import…) avec les champs manquants. */
export function normaliser(f) {
  const base = ficheVide();
  const fusion = (modele, valeur) => {
    if (Array.isArray(modele)) {
      const src = Array.isArray(valeur) ? valeur : [];
      return modele.map((m, i) => fusion(m, src[i]));
    }
    if (modele && typeof modele === 'object') {
      const src = valeur && typeof valeur === 'object' && !Array.isArray(valeur) ? valeur : {};
      const res = {};
      for (const k of Object.keys(modele)) res[k] = fusion(modele[k], src[k]);
      return res;
    }
    if (valeur === undefined || valeur === null) return modele;
    return typeof valeur === 'number' || typeof valeur === 'string' ? valeur : String(valeur);
  };
  return fusion(base, f || {});
}

export const nombre = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

// =====================================================================
// Import d'une fiche Excel existante
// ---------------------------------------------------------------------
// cell(onglet, 'C1') doit renvoyer la valeur affichée de la cellule.
// =====================================================================
export function depuisExcel(cell) {
  const f = ficheVide();
  const P = (a) => texte(cell('Personnage', a));
  const H = (a) => texte(cell('Historiques', a));
  const S = (a) => texte(cell('Serviteur', a));
  const M = (a) => texte(cell('Gestion des mentorats', a));
  const E = (a) => texte(cell('Equipement', a));
  const sansQuestion = (v) => (/\?$/.test(v) ? '' : v);

  Object.assign(f, {
    nom: P('C1'), typeFiche: sansQuestion(P('J1')), secte: sansQuestion(P('A2')), race: sansQuestion(P('C2')),
    age: sansQuestion(P('E2')), clan: sansQuestion(P('H2')),
    nomVeritable: P('C8'), naissance: date(cell('Personnage', 'G8')), lieuNaissance: P('I8'),
    lignee: P('C9'), etreinte: date(cell('Personnage', 'G9')), lieuEtreinte: P('I9'),
    infants: P('C10'), torpeursMois: P('G10'), tempsGouleMois: P('I10'),
    creeLe: date(cell('Personnage', 'F11')), absenceMois: P('I11'), ageVampirique: P('I12'), xpGratuite: P('N9'),
    concept: P('B14'), generation: P('I14'), voie: sansQuestion(P('K15')),
    ethiqueRegagnee: P('J16'), ethiquePerdue: P('J17'),
    archetype: sansQuestion(P('B16')), archetypePerso: P('N15'), notes: P('B18'), statutClan: P('C23'),
    precisionsAtouts: P('G34'), rachatHandicap: P('N25'), oubliAtout: P('N27'),
    // Dans l'Excel, les listes de M31 et M33 sont inversées par rapport à leurs libellés :
    // M31 propose les atouts généraux (Propice), M33 les atouts de clan à 1-2 points (Fragment restant).
    atoutPropice: P('M31'), atoutFragment: P('M33'), changementFocus: P('N48'),
    linguistique: P('L81'), donInfernal: P('N81'),
    beneficeArtisanat: sansQuestion(P('G67')), beneficeRepresentation: sansQuestion(P('G78')),
  });
  for (let i = 0; i < 7; i++) {
    f.atouts[i] = P('A' + (27 + i)); f.handicaps[i] = P('E' + (27 + i)); f.handicapsSupp[i] = P('I' + (27 + i));
  }
  f.liensSang.forEach((l, i) => Object.assign(l, { maitre: P('P' + (33 + i)), vassal: P('Q' + (33 + i)), niveau: P('R' + (33 + i)), date: P('S' + (33 + i)) }));
  ['A', 'E', 'I'].forEach((c, i) => {
    const cout = String.fromCharCode(c.charCodeAt(0) + 3);
    f.derangements[i] = { type: sansQuestion(P(c + '39')), cout: sansQuestion(P(cout + '39')), description: P(c + '40') };
  });
  [['physique', 'C', 'B', 'D'], ['social', 'G', 'F', 'H'], ['mental', 'K', 'J', 'L']].forEach(([k, val, f0, bonus]) => {
    f.attributs[k].valeur = P(val + '50');
    f.attributs[k].bonus = P(bonus + '49');
    for (let i = 0; i < 3; i++) f.attributs[k].focus[i] = P(String.fromCharCode(f0.charCodeAt(0) + i) + '51');
  });
  const lignesComp = [55, 58, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78];
  REF.competences.forEach((c, i) => { f.competences[c] = P('D' + lignesComp[i]); });
  f.voyageurChevronne['Expérience de la Rue'] = sansQuestion(P('C67'));
  f.voyageurChevronne.Survie = sansQuestion(P('C77'));
  f.competencesLibres.forEach((x, i) => { x.nom = P('A' + (79 + i)); x.niveau = P('D' + (79 + i)); });
  f.sciences.forEach((x, i) => { x.nom = P('E' + (56 + i)); x.niveau = P('H' + (56 + i)); });
  f.artisanat.forEach((x, i) => { x.nom = P('E' + (67 + i)); x.niveau = P('H' + (67 + i)); });
  f.representation.forEach((x, i) => { x.nom = P('E' + (78 + i)) || x.nom; x.niveau = P('H' + (78 + i)); });
  f.mysteres.niveau = P('L55');
  f.mysteres.specialites.forEach((x, i) => { x.nom = i < 3 ? '' : P('J' + (56 + i)); x.niveau = P('L' + (56 + i)); });
  f.langues.forEach((_, i) => { f.langues[i] = P('O' + (56 + i)); });
  f.disciplinesCaitiff = [P('O84'), P('O85'), P('O86')];
  f.disciplines.forEach((d, i) => {
    const r = 90 + i;
    d.nom = P('A' + r); d.niveau = P('B' + r); d.type = P('U' + r) || d.type;
    d.anciens = ['M', 'O', 'Q', 'S'].map((c) => P(c + r));
  });
  for (let i = 0; i < 10; i++) { f.techniques[i] = P('A' + (107 + i)); f.techniques[10 + i] = P('D' + (107 + i)); }
  let k = 0;
  for (let r = 107; r <= 116; r++) for (const c of ['G', 'J', 'M', 'P', 'S']) f.rituels[k++] = P(c + r);

  // Historiques
  const h = f.historiques;
  h.gotha.niveau = H('D6'); h.pegre.niveau = H('H6');
  for (let i = 0; i < 5; i++) {
    h.gotha.specialisations[2 * i] = H('A' + (8 + i)); h.gotha.specialisations[2 * i + 1] = H('C' + (8 + i));
    h.pegre.specialisations[2 * i] = H('E' + (8 + i)); h.pegre.specialisations[2 * i + 1] = H('G' + (8 + i));
  }
  h.ressources = H('L8'); h.renommee = H('L11');
  [[13, 14], [16, 17], [19, 20]].forEach(([n, d], i) => { h.faussesIdentites[i] = { niveau: H('L' + n), description: H('J' + d) }; });
  [15, 19, 23].forEach((r, i) => {
    h.havres[i].nom = H('B' + r); h.havres[i].niveau = H('H' + r);
    for (let j = 0; j < 3; j++) {
      h.havres[i].avantages[2 * j] = sansQuestion(H('C' + (r + 1 + j)));
      h.havres[i].avantages[2 * j + 1] = sansQuestion(H('G' + (r + 1 + j)));
    }
  });
  h.troupeau = { niveau: H('L23'), description: H('J24') };
  h.contacts.niveau = H('F28'); h.allies.niveau = H('L28');
  for (let i = 0; i < 5; i++) { h.contacts.liste[i] = H('A' + (29 + i)); h.allies.liste[i] = H('G' + (29 + i)); }
  h.rituelsSabbat.niveau = H('L35');
  k = 0;
  for (let r = 36; r <= 39; r++) for (const c of ['A', 'C', 'E', 'G', 'I', 'K']) h.rituelsSabbat.liste[k++] = H(c + r);
  h.partages = { niveau: H('B41'), description: H('C41') };
  for (let i = 0; i < 5; i++) { h.emplacements[i] = H('B' + (46 + i)); h.emplacements[5 + i] = H('G' + (46 + i)); }

  // Serviteurs : 2 rangées de 3 blocs
  f.serviteurs.forEach((s, i) => {
    const base = i < 3 ? 4 : 20;
    const col = ['A', 'E', 'I'][i % 3].charCodeAt(0);
    const C = (d) => String.fromCharCode(col + d);
    s.nom = S(C(0) + (base + 1)); s.niveau = S(C(2) + (base + 1)); s.type = S(C(3) + (base + 1));
    s.description = S(C(0) + (base + 3));
    for (let j = 0; j < 5; j++) {
      s.specialites[2 * j] = S(C(0) + (base + 5 + j)); s.specialites[2 * j + 1] = S(C(2) + (base + 5 + j));
      s.qualites[2 * j] = S(C(0) + (base + 11 + j)); s.qualites[2 * j + 1] = S(C(2) + (base + 11 + j));
    }
  });

  // Mentorats
  for (let i = 0; i < 15; i++) {
    const r = 8 + i;
    f.mentorats.disciplines[i] = { nom: M('A' + r), niveau: M('B' + r), mentor: M('C' + r), date: M('D' + r), valideur: M('E' + r), nomValideur: M('F' + r) };
    f.mentorats.mysteres[i] = { nom: M('G' + r), niveau: M('H' + r), mentor: M('I' + r), date: M('J' + r), valideur: M('K' + r), nomValideur: M('L' + r) };
  }

  // Equipement : 2 colonnes de 6 blocs
  f.equipement.forEach((e, i) => {
    const base = 2 + 14 * (i % 6);
    const [cNom, cType, cQ1, cQ2] = i < 6 ? ['A', 'B', 'E', 'H'] : ['J', 'K', 'N', 'Q'];
    e.nom = E(cNom + (base + 1)); e.quantite = E(cNom + (base + 3)) || 1; e.type = sansQuestion(E(cType + (base + 3)));
    e.description = E(cNom + (base + 5));
    e.qualites = [sansQuestion(E(cQ1 + base)), sansQuestion(E(cQ2 + base))];
    e.art = E(cType + (base + 12)) || 'Classique'; e.antiquite = E(cType + (base + 13)) || 'Non';
  });
  return normaliser(f);
}

const isoLocal = (d) => `${String(d.getFullYear()).padStart(4, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function texte(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return isoLocal(v);
  if (typeof v === 'number') return Number.isInteger(v) ? v : Math.round(v * 1000) / 1000;
  return String(v).trim();
}

/** Accepte une date Excel, « jj/mm/aaaa » ou « aaaa-mm-jj » ; renvoie « aaaa-mm-jj » (ou le texte d'origine). */
export function date(v) {
  if (!v) return '';
  if (v instanceof Date) return isoLocal(v);
  if (typeof v === 'number') return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
  const s = String(v).trim();
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{3,4})$/.exec(s);
  if (m) return `${m[3].padStart(4, '0')}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = /^(\d{3,4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[1].padStart(4, '0')}-${m[2]}-${m[3]}` : s;
}
