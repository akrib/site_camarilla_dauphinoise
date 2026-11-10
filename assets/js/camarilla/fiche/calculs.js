// =====================================================================
// Moteur de calcul de la fiche MET 8.0.2
// ---------------------------------------------------------------------
// Reproduit l'onglet « Calculs » du fichier Excel (cellules indiquées
// en commentaire). Quatre erreurs du fichier Excel sont corrigées par
// défaut (liste dans ECARTS) ; calculer(fiche, date, { commeExcel: true })
// les reproduit à l'identique.
// =====================================================================
import { REF } from './referentiel.js';
import { nombre } from './modele.js';

export const ECARTS = [
  'Changement de focus : +10 PX par changement (règle « changer votre focus vous coûtera 10 PX ») ; le fichier Excel retirait 10 PX.',
  'Représentation : les 9 lignes sont comptées ; le fichier Excel oubliait la 4e (ligne 81).',
  "Pouvoirs d'ancien : les 4 emplacements sont comptés sur chaque discipline ; le fichier Excel ignorait le 4e à partir de la 2e ligne.",
  'Compétences libres (lignes 79 à 86) : leur coût est compté ; le fichier Excel le calculait sans l\'ajouter au total.',
];

// ------------------------------------------------------------ outils
export const cle = (s) => String(s ?? '').toLowerCase().normalize('NFC').replace(/\s+/g, ' ').trim();
export const libelleAtout = (a) => `${String(a.nom).trim()} (cout ${a.cout})`;
export const libelleRituel = (r) => `${r.nom} (niveau ${r.niveau})`;
/** Rituel du référentiel correspondant à un libellé « Nom (niveau n) » (ou au nom seul). */
export function rituelDe(libelle) {
  const k = cle(libelle);
  return REF.rituels.find((r) => cle(libelleRituel(r)) === k) || REF.rituels.find((r) => cle(r.nom) === k) || null;
}
const tri = (n) => (n * (n + 1)) / 2;
const entier = (v) => Math.trunc(nombre(v));
const rempli = (v) => String(v ?? '').trim() !== '';

/** Clan (objet du référentiel) ou null. */
export function clanDe(fiche) {
  return REF.clans.find((c) => c.nom === fiche.clan) || null;
}

/** Discipline du référentiel (accepte « Thaumaturgie : Voie Verte » pour « V. Verte »). */
export function disciplineRef(nom) {
  if (!rempli(nom)) return null;
  const k = cle(nom);
  let d = REF.disciplines.find((x) => cle(x.nom) === k);
  if (!d) {
    const m = /^(?:thaumaturgie|n[ée]cromancie)\s*:\s*voie\s+(.*)$/i.exec(String(nom).trim());
    if (m) d = REF.disciplines.find((x) => cle(x.nom) === cle('V. ' + m[1]));
  }
  return d || null;
}

/** Les trois disciplines de clan (Caïtiff : choisies dans O84:O86). */
export function disciplinesDeClan(fiche) {
  const c = clanDe(fiche);
  if (!c) return ['', '', ''];
  if (/^ca[iï]tiff/i.test(c.nom)) return fiche.disciplinesCaitiff.slice(0, 3);
  return c.disciplines.slice(0, 3);
}

/** Atouts proposés dans la liste déroulante (généraux + clan + secte). */
export function atoutsDisponibles(fiche) {
  return [
    ...(REF.atouts.clan[fiche.clan] || []).map((a) => ({ ...a, origine: 'Clan' })),
    ...(REF.atouts.secte[fiche.secte] || []).map((a) => ({ ...a, origine: 'Secte' })),
    ...REF.atouts.generaux.map((a) => ({ ...a, origine: 'Général' })),
  ];
}
export function handicapsDisponibles(fiche) {
  return [
    ...(REF.handicaps.clan[fiche.clan] || []).map((a) => ({ ...a, origine: 'Clan' })),
    ...(REF.handicaps.secte[fiche.secte] || []).map((a) => ({ ...a, origine: 'Secte' })),
    ...REF.handicaps.generaux.map((a) => ({ ...a, origine: 'Général' })),
  ];
}

/** Niveau de l'historique Génération (Calculs!N61:O70), ou null. */
export function niveauGeneration(fiche) {
  const g = entier(fiche.generation);
  const l = REF.tableGeneration.find((t) => t.generation === g);
  return l ? l.niveau : null;
}

/** Coût voie d'éthique (Moralité!DL6). */
export function coutVoie(fiche) {
  if (!rempli(fiche.voie)) return 0;
  return nombre(REF.coutsVoies[fiche.secte]?.[fiche.clan]?.[fiche.voie]);
}

const MOIS_ANTAGO = [
  // [borne, valeur si borne dépassée, diviseur, début]
  [1200, 200, 6, 0], [1800, 100, 6, 1200], [2400, 50, 12, 1800], [4200, 150, 12, 2400], [4800, 50, 12, 4200],
  [7200, 100, 24, 4800], [9600, 100, 24, 7200], [12000, 50, 48, 9600], [16800, 50, 48, 12000],
];

function lireDate(s) {
  const m = /^(-?\d{1,4})-(\d{2})-(\d{2})/.exec(String(s || ''));
  return m ? { a: +m[1], m: +m[2], j: +m[3] } : null;
}
function isoDuJour(d) {
  const x = d instanceof Date ? d : new Date(d);
  return { a: x.getFullYear(), m: x.getMonth() + 1, j: x.getDate() };
}
/** DATEDIF(debut, fin, "M") : mois entiers écoulés. */
function moisEntiers(d, f) {
  let n = (f.a - d.a) * 12 + (f.m - d.m);
  if (f.j < d.j) n -= 1;
  return n;
}

// ===================================================================
export function calculer(fiche, aujourdhui = new Date(), { commeExcel = false } = {}) {
  const alertes = [];
  const atoutsCles = new Set(fiche.atouts.filter(rempli).map(cle));
  const handicapsCles = new Set(fiche.handicaps.filter(rempli).map(cle));
  const aAtout = (lib) => atoutsCles.has(cle(lib));
  const aHandicap = (lib) => handicapsCles.has(cle(lib));

  // --- Atouts particuliers (Calculs!A81:P85, A95:E96)
  const A = {
    inflexible: aAtout('Inflexible (cout 4)'),
    epreuveSang: aAtout('Epreuve du sang (cout 3)'),
    aria: aAtout('Aria Surnaturelle (cout 1)'),
    vestiges: aAtout('Vestiges de la Grandeur (cout 3)'),
    serviteurFantome: aAtout('Serviteur fantôme (cout 3)'),
    culte: aAtout('Culte Personnel (cout 1)'),
    benediction: aAtout("Bénédiction de l'Artiste (cout 1)"),
    sangTzimisce: aAtout('Sang du Tzimisce (cout 1)'),
    parangon: aAtout('Parangon (cout 3)'),
    shrinking: aAtout('Shrinking violet (cout 3)'),
    voyageur: aAtout('Voyageur Chevronné (cout 1)'),
    grotesque: aAtout("L'Art Imite la Vie - Grotesque (cout 3)"),
    bosquet: aAtout('Bosquet consacré (cout 2)'),
    tueur: aAtout('Comment Attraper un Tueur (cout 2)'),
    donLangues: aAtout('Don pour les langues (cout 1)'),
    diva: aAtout('Diva (cout 2)'),
    maitreVice: aAtout('Maître du Vice (cout 2)'),
    durAcier: aAtout("Dur comme l'Acier (cout 3)"),
    compagnon: aAtout('Compagnon Ardent (cout 3)'),
    jouets: aAtout('Tous les Meilleurs Jouets (cout 2)'),
    angelique: aAtout("L'Art Imite la Vie - Angélique (cout 3)"),
    maitreRitualiste: aAtout('Maitre Ritualiste (cout 1)'),
    royaute: aAtout('Royauté Ventrue (cout 2)'),
    vitalite: aAtout('Vitalité intense (cout 2)') || aAtout('Vitalité intense (cout 3)'),
  };
  const H = {
    deficit: aHandicap("Déficit d'attention (cout 4)"),
    inepte: aHandicap('Inepte (cout 3)'),
    sangClair: aHandicap('Sang clair (cout 3)'),
    froid: aHandicap('Froidement Logique (cout 1)'),
    infestation: aHandicap('Infestation Parasitaire (cout 3)'),
    estomac: aHandicap('Estomac sensible (cout 3)'),
  };
  const modifTableau = A.epreuveSang || A.shrinking || A.durAcier; // Q81

  // --- Coûts appliqués selon le niveau de génération (Calculs!H4:H13)
  const ng = niveauGeneration(fiche);
  if (ng === null) alertes.push({ niveau: 'erreur', texte: 'Choisissez une génération : sans elle, les coûts en PX ne peuvent pas être calculés.' });
  const cx = REF.coutsXp;
  const cout = (table) => (ng === null ? null : table[ng]);
  const C = {
    attribut: cout(cx.attribut),
    disciplineClan: cout(cx.disciplineClan),
    disciplineHorsClan: cout(cx.disciplineHorsClan),
    ancienClan: ng === null ? null : (ng <= 2 ? (modifTableau ? 20 : 'X') : ng === 3 && modifTableau ? 20 : cx.ancienClan[ng]),
    ancienHorsClan: ng === null ? null : (ng <= 2 ? (modifTableau ? 20 : 'X') : ng === 3 && modifTableau ? 20 : cx.ancienHorsClan[ng]),
    humanite: cout(cx.humanite),
    rituel: A.maitreRitualiste ? 1 : cout(cx.rituel),
    historique: cout(cx.historique),
    competence: cout(cx.competence),
    technique: ng === null ? null : (ng >= 4 ? (modifTableau ? 12 : 'X') : cx.technique[ng]),
  };
  const num = (c) => (typeof c === 'number' ? c : 0); // « X » ou inconnu → 0 (comme SUM dans l'Excel)
  const sansGen = ng === null;

  // --- Attributs (D15)
  const P = entier(fiche.attributs.physique.valeur);
  const S = entier(fiche.attributs.social.valeur);
  const M = entier(fiche.attributs.mental.valeur);
  const xpAttributs = sansGen ? 0 : (P + S + M) * C.attribut - 45;

  // --- Compétences (D16)
  const cc = num(C.competence);
  const parCompetence = {};
  for (const nom of REF.competences) {
    const n = entier(fiche.competences[nom]);
    let c = tri(n) * cc;
    if (nom === 'Conduite' && A.jouets) c -= 15;
    if (nom === 'Commandement' && A.angelique) c = tri(n) * Math.ceil(cc / 2);
    if (nom === 'Intimidation' && A.grotesque) c = tri(n) * Math.ceil(cc / 2);
    parCompetence[nom] = c;
  }
  const ligne = (x) => tri(entier(x.niveau)) * cc;
  const coutsSciences = fiche.sciences.map(ligne);
  const coutsArtisanat = fiche.artisanat.map((x, i) => {
    const c = ligne(x);
    return i === 0 && cle(fiche.beneficeArtisanat) === 'oui' && A.benediction ? Math.max(0, c - 6 * cc) : c;
  });
  const coutsRepresentation = fiche.representation.map((x, i) => {
    const c = ligne(x);
    if (commeExcel && i === 3) return 0; // ligne 81 oubliée par l'Excel
    if (i === 0 && cle(fiche.beneficeRepresentation) === 'oui' && A.benediction) return Math.max(0, c - 6 * cc);
    if (i === fiche.representation.length - 1 && A.aria) return Math.ceil(c / 2);
    return c;
  });
  const coutsLibres = fiche.competencesLibres.map(ligne);
  const coutLinguistique = tri(entier(fiche.linguistique)) * cc;
  const coutMysteres = tri(entier(fiche.mysteres.niveau)) * cc - (A.sangTzimisce ? 3 : 0);
  const somme = (t) => t.reduce((s, v) => s + v, 0);
  const xpCompetences = sansGen ? 0
    : somme(Object.values(parCompetence)) + somme(coutsSciences) + somme(coutsArtisanat) + somme(coutsRepresentation)
      + (commeExcel ? 0 : somme(coutsLibres)) + coutLinguistique + coutMysteres - 35 * cc - (A.voyageur ? 6 : 0);

  // --- Disciplines (D17) et pouvoirs d'ancien (D20)
  const clanDisc = disciplinesDeClan(fiche);
  const disciplines = fiche.disciplines.map((d, i) => ({ ...d, nom: i < 3 ? clanDisc[i] || '' : d.nom }));
  const coutsDisciplines = disciplines.map((d) => {
    const g = Math.min(entier(d.niveau), 5);
    if (d.type === 'C') return tri(g) * num(C.disciplineClan);
    if (d.type === 'H') return tri(g) * num(C.disciplineHorsClan);
    return 0; // G = gratuit
  });
  const xpDisciplines = sansGen ? 0 : somme(coutsDisciplines) - 5 * num(C.disciplineClan) + (H.inepte ? 3 : 0) + (H.sangClair ? 9 : 0);
  let nbAnciensClanLignes = 0;
  const coutsAnciens = disciplines.map((d, i) => {
    const n = (commeExcel && i > 0 ? d.anciens.slice(0, 3) : d.anciens).filter(rempli).length;
    if (i < 3) nbAnciensClanLignes += n;
    return n * num(d.type === 'C' ? C.ancienClan : C.ancienHorsClan);
  });
  const nbAnciens = disciplines.reduce((s, d) => s + d.anciens.filter(rempli).length, 0);
  const xpAnciens = sansGen ? 0 : somme(coutsAnciens) - (ng === 3 && nbAnciensClanLignes >= 1 ? 2 : 0);
  if (nbAnciens && (C.ancienClan === 'X' || C.ancienHorsClan === 'X')) {
    alertes.push({ niveau: 'alerte', texte: "Pouvoirs d'ancien inaccessibles à cette génération (coût « X ») : ils ne sont pas comptés." });
  }

  // --- Historiques (D18)
  const h = fiche.historiques;
  const ch = num(C.historique);
  const hist = (n) => tri(entier(n)) * ch;
  const coutsHistoriques = {
    gotha: hist(h.gotha.niveau),
    pegre: hist(h.pegre.niveau),
    generation: ng === null ? 0 : tri(ng) * ch,
    ressources: hist(h.ressources),
    renommee: hist(h.renommee) - (A.diva ? 3 : 0),
    faussesIdentites: h.faussesIdentites.map((x) => hist(x.niveau)),
    troupeau: A.maitreVice ? tri(entier(h.troupeau.niveau)) : hist(h.troupeau.niveau),
    havres: h.havres.map((x) => hist(x.niveau)),
    contacts: hist(h.contacts.niveau),
    allies: hist(h.allies.niveau),
    serviteurs: fiche.serviteurs.map((s, i) => (i === 0 && (A.serviteurFantome || A.parangon || A.compagnon) ? 0 : hist(s.niveau))),
    rituelsSabbat: hist(h.rituelsSabbat.niveau),
    partages: nombre(h.partages.niveau),
  };
  const xpHistoriques = sansGen ? 0
    : Object.values(coutsHistoriques).reduce((s, v) => s + (Array.isArray(v) ? somme(v) : v), 0) - 10 * ch;

  // --- Rituels (D19)
  const niveauxRituels = fiche.rituels.map((r) => {
    if (!rempli(r)) return 0;
    const x = rituelDe(r);
    if (!x) alertes.push({ niveau: 'alerte', texte: `Rituel « ${r} » inconnu : non compté.` });
    return nombre(x?.niveau);
  });
  const xpRituels = sansGen && !A.maitreRitualiste ? 0 : somme(niveauxRituels.map((n) => n * num(C.rituel)));

  // --- Techniques (D22)
  const nbTechniques = fiche.techniques.filter(rempli).length;
  const xpTechniques = sansGen ? 0 : nbTechniques * num(C.technique);
  if (nbTechniques && C.technique === 'X') alertes.push({ niveau: 'alerte', texte: 'Techniques inaccessibles à cette génération (coût « X ») : elles ne sont pas comptées.' });

  // --- Atouts et handicaps (D21, Personnage!H36 et L36)
  const dispoA = new Map(atoutsDisponibles(fiche).map((a) => [cle(libelleAtout(a)), a.cout]));
  const dispoH = new Map(handicapsDisponibles(fiche).map((a) => [cle(libelleAtout(a)), a.cout]));
  const coutsAtouts = fiche.atouts.map((a) => {
    if (!rempli(a)) return 0;
    if (!dispoA.has(cle(a))) { alertes.push({ niveau: 'alerte', texte: `Atout « ${a} » indisponible pour ce clan / cette secte : non compté.` }); return 0; }
    return dispoA.get(cle(a));
  });
  const coutsHandicaps = fiche.handicaps.map((a) => {
    if (!rempli(a)) return 0;
    if (!dispoH.has(cle(a))) { alertes.push({ niveau: 'alerte', texte: `Handicap « ${a} » indisponible pour ce clan / cette secte : non compté.` }); return 0; }
    return dispoH.get(cle(a));
  });
  const clan = clanDe(fiche);
  const pointsVoie = coutVoie(fiche);
  const pointsLignee = nombre(clan?.coutLignee);
  const antago = ['antagoniste', 'antagoniste c1 (xp joueur)'].includes(cle(fiche.typeFiche));
  const pointsRarete = antago || !REF.sectesAvecRarete.includes(fiche.secte) ? 0 : nombre(clan?.rarete?.[fiche.secte]);
  const totalAtouts = somme(coutsAtouts) + pointsVoie + pointsLignee + pointsRarete; // -H36
  const derangementsPoints = fiche.derangements.reduce((s, d) => s + nombre(d.cout), 0);
  const brutHandicaps = somme(coutsHandicaps) + derangementsPoints;
  const totalHandicaps = Math.min(brutHandicaps, 7); // L36
  const xpAtouts = totalAtouts - totalHandicaps;

  // --- Divers
  const xpEthique = nombre(fiche.ethiqueRegagnee) * num(C.humanite) * (H.froid ? 2 : 1); // D28
  const xpRachat = nombre(fiche.rachatHandicap) * 2; // B30
  const xpOubli = nombre(fiche.oubliAtout); // B31
  const xpFocus = nombre(fiche.changementFocus) * (commeExcel ? -10 : 10); // D23 (voir ECARTS)
  const xpCulte = A.culte || A.bosquet ? -15 * ch : 0; // Q82
  const xpRoyaute = A.royaute || A.tueur ? -19 * ch : 0; // Q83

  const xpDepenseeBrute = xpAtouts + xpAttributs + xpDisciplines + xpCompetences + xpRituels + xpHistoriques + xpEthique
    + xpCulte + xpAnciens + xpRachat + xpOubli + xpTechniques + xpFocus + xpRoyaute; // B1

  // --- Expérience acquise (F1, N14, N23)
  const jour = isoDuJour(aujourdhui);
  const type = cle(fiche.typeFiche);
  let moisDeJeu = 0, ageVampiriqueMois = 0, xpGagnee = 0, xpBase = 0;
  if (['joueur', 'ancien joueur/antagoniste', 'antagoniste c1 (xp joueur)'].includes(type)) {
    const cree = lireDate(fiche.creeLe);
    moisDeJeu = cree ? Math.trunc(jour.m - cree.m - nombre(fiche.absenceMois) + 12 * (jour.a - cree.a)) : 0; // O14
    const o = moisDeJeu;
    const r = [o < 25 ? o * 3 : 72, o < 49 ? (o - 24) * 2 : 48, o < 145 ? o - 48 : 96,
      o < 337 ? Math.floor((o - 144) * 0.5) : 192, o > 337 ? Math.floor((o - 336) / 12) : 0];
    xpGagnee = r.reduce((s, v) => s + Math.max(v, 0), 0);
    xpBase = 50;
  } else if (type === 'antagoniste') {
    const e = lireDate(fiche.etreinte);
    if (e) {
      ageVampiriqueMois = moisEntiers(e, jour) - nombre(fiche.torpeursMois) + nombre(fiche.tempsGouleMois) / 2; // O23
      const o = ageVampiriqueMois;
      xpGagnee = MOIS_ANTAGO.reduce((s, [borne, plafond, div, debut]) => {
        const v = o < borne ? (o - debut) / div : plafond;
        return s + (v > 0 ? Math.floor(v) : 0);
      }, 0) + Math.max(0, Math.floor((o - 16800) / 120));
    }
    xpBase = 50;
  }
  const xpAcquise = xpBase + xpGagnee + nombre(fiche.xpGratuite); // N1
  const xpDepensee = Math.max(xpDepenseeBrute, 0); // N3
  const xpRestante = xpAcquise - xpDepensee; // N5

  // --- Alertes de l'Excel (Personnage!O4:O10)
  if (!sansGen) {
    if (xpAttributs < 0) alertes.push({ niveau: 'alerte', texte: 'Veuillez rentrer les Attributs de Base' });
    if (xpCompetences < 0) alertes.push({ niveau: 'alerte', texte: 'Veuillez rentrer les Compétences de Base' });
    if (xpDisciplines < 0) alertes.push({ niveau: 'alerte', texte: 'Veuillez rentrer les Disciplines de Base' });
    if (xpHistoriques < 0) alertes.push({ niveau: 'alerte', texte: 'Veuillez rentrer les Historiques de Base' });
  }
  if (type === 'ancien joueur/antagoniste') alertes.push({ niveau: 'info', texte: 'ANCIEN JOUEUR DEVENU ANTAGONISTE. NE PEUX PLUS ETRE REPASSER JOUEUR!' });
  if (xpRestante < 0) alertes.push({ niveau: 'erreur', texte: `Expérience dépensée supérieure à l'expérience acquise (${-xpRestante} PX de trop).` });
  if (brutHandicaps > 7) alertes.push({ niveau: 'info', texte: `Handicaps et dérangements : ${brutHandicaps} points, seuls 7 rapportent des points.` });

  // --- Valeurs dérivées
  const gen = REF.sangParGeneration[String(entier(fiche.generation))];
  const malusInfestation = H.infestation ? (ng !== null && ng < 4 ? -3 : -6) : 0; // E96
  const sang = gen ? (H.estomac ? gen[0] : gen[1]) + malusInfestation : 0; // C52
  const sangParTour = gen ? gen[2] + (A.vitalite ? 1 : 0) : 0; // G52
  const volonte = A.inflexible ? 7 : H.deficit ? 5 : 6; // K52
  const ethique = !rempli(fiche.voie) ? '' : (fiche.voie === "Voie de l'Humanité" ? 5 : 4) + nombre(fiche.ethiqueRegagnee) - nombre(fiche.ethiquePerdue); // L16
  const langues = (A.donLangues ? 2 : 1) * nombre(fiche.linguistique) + 1; // P55
  const age = nombre(fiche.ageVampirique);
  const classe = type === 'antagoniste'
    ? (age < 101 ? 'C1' : age < 201 ? 'C2' : age < 351 ? 'C3' : age < 601 ? 'C4' : age < 1001 ? 'C5' : 'C6')
    : type === 'joueur' ? 'C1' : ''; // C11
  const niveauRessources = entier(h.ressources);
  const argent = REF.ressources[niveauRessources] ? REF.ressources[niveauRessources] * (A.parangon ? 2 : 1) : ''; // Historiques!L9

  // --- Résumé imprimable (scores sans bonus/malus)
  const focusP = fiche.attributs.physique.focus.map(cle);
  const focusM = fiche.attributs.mental.focus.map(cle);
  const aFocusP = (f) => focusP.includes(cle(f));
  const comp = (n) => entier(fiche.competences[n]);
  const celerite = entier(disciplines.find((d) => d.nom === 'Célérité')?.niveau);
  const techCelerite = fiche.techniques.filter((t) => REF.techniquesCelerite.some((c) => cle(c) === cle(t))).length;
  const baseTir = focusM.includes('astuce') ? Math.max(P, M) : P;
  const gratuite = (ok) => (ok ? 'Gratuite' : '1 point de Volonté');
  const resume = {
    initiative: Math.max(P, M),
    initiativeCelerite: celerite + techCelerite + Math.max(P, M),
    tir: baseTir + comp('Armes à feu'),
    archaique: baseTir + comp('Athlétisme'),
    melee: P + comp('Mêlée'),
    sansArme: P + comp('Bagarre'),
    lancer: P + comp('Athlétisme'),
    esquive: P + comp('Esquive'),
    manoeuvres: [
      ['Accélération', gratuite(aFocusP('Dextérité'))],
      ['Agripper', gratuite(aFocusP('Force'))],
      ['Assommer', gratuite(false)],
      ['Attaque Aveuglante', gratuite(false)],
      ['Combat en Aveugle', gratuite(aFocusP('Dextérité'))],
      ['Dégainer Rapidement', gratuite(aFocusP('Dextérité'))],
      ['Désarmer', gratuite(aFocusP('Dextérité') || aFocusP('Force'))],
      ['Mise à Terre', gratuite(aFocusP('Force'))],
      ['Percer le Cœur', gratuite(aFocusP('Force'))],
    ],
    manoeuvresFerales: ['Passe-Derrière', 'Charge Férale', 'Fourrure Mutilée', 'Bond sauvage'],
    manoeuvresAeriennes: ['Échapper', 'Frappe', 'Bombe plongeante', 'Aplomb'],
  };

  return {
    niveauGeneration: ng,
    couts: C,
    xp: {
      attributs: xpAttributs, competences: xpCompetences, disciplines: xpDisciplines, historiques: xpHistoriques,
      rituels: xpRituels, anciens: xpAnciens, atoutsHandicaps: xpAtouts, techniques: xpTechniques, changementFocus: xpFocus,
      ethique: xpEthique, rachatHandicap: xpRachat, oubliAtout: xpOubli, culte: xpCulte, royaute: xpRoyaute,
      total: xpDepenseeBrute, depensee: xpDepensee, acquise: xpAcquise, base: xpBase, gagnee: xpGagnee, restante: xpRestante,
    },
    moisDeJeu, anneesDeJeu: Math.trunc(moisDeJeu / 12), ageVampiriqueMois,
    atouts: { couts: coutsAtouts, voie: pointsVoie, lignee: pointsLignee, rarete: pointsRarete, total: totalAtouts },
    handicaps: { couts: coutsHandicaps, derangements: derangementsPoints, brut: brutHandicaps, total: totalHandicaps },
    details: {
      competences: parCompetence, sciences: coutsSciences, artisanat: coutsArtisanat, representation: coutsRepresentation,
      libres: coutsLibres, linguistique: coutLinguistique, mysteres: coutMysteres,
      disciplines: coutsDisciplines, anciens: coutsAnciens, historiques: coutsHistoriques, rituels: niveauxRituels,
    },
    disciplines, // avec les noms de clan résolus
    specialitesMystereAuto: [fiche.secte, fiche.clan, fiche.race],
    sang, sangParTour, volonte, ethique, langues, classe, argent,
    resume, alertes, particularites: { atouts: A, handicaps: H },
  };
}
