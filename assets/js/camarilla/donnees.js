// =====================================================================
// Données de jeu partagées (listes, actions d'influence, statuts)
// Reprises telles quelles de l'ancienne page « Gestion des Influences ».
// =====================================================================

export const VILLES = ['Grenoble', 'Angers', 'Annecy', 'Bordeaux', 'Châteauroux', 'Evry', 'Lille', 'Lyon',
  'Melun', 'Montpellier', 'Orléans', 'Périgueux', 'Strasbourg', 'Ys', 'Autres'];
// Zones de jeu de la Camarilla dauphinoise (cartes de référence) : 1 à 7
// Grenoble et sa proche banlieue, 8 à 24 le reste de l'Isère.
export const NOMS_ZONES = {
  1: 'Grenoble centre', 2: 'La Tronche · Corenc · Meylan', 3: 'Seyssinet-Pariset · Seyssins',
  4: 'Grenoble sud · Échirolles', 5: 'Saint-Martin-d\'Hères', 6: 'Eybens · Poisat', 7: 'Fontaine · Sassenage',
  8: 'Voironnais – Chartreuse', 9: 'Sud Grésivaudan', 10: 'Vals du Dauphiné', 11: 'Le Pont-de-Beauvoisin',
  12: 'Bièvre Valloire', 13: 'La Côte-Saint-André', 14: 'La Porte des Alpes', 15: 'Crémieu',
  16: 'Haut Rhône Dauphinois', 17: 'Grésivaudan', 18: 'Oisans', 19: 'Matheysine', 20: 'Trièves',
  21: 'Vallée des Écrins', 22: 'Vercors', 23: 'Belledonne', 24: 'Chartreuse'
};
export const DOMAINES_VOISINS = ['Domaine de Lyon', 'Domaine de Vienne', 'Domaine de Valence', 'Domaine des 2 Savoies', 'Domaine de Marseille'];
export const ZONES = Array.from({ length: 24 }, (_, i) => String(i + 1)).concat(['Extérieur']);
/** Libellé d'une zone : « 3 — Seyssinet-Pariset · Seyssins ». */
export const libelleZone = (z) => (NOMS_ZONES[z] ? z + ' — ' + NOMS_ZONES[z] : String(z || ''));
/** [valeur, libellé] pour remplir une liste déroulante de zones. */
export const OPTIONS_ZONES = ZONES.map((z) => [z, libelleZone(z)]);
export const POINTS = [1, 2, 3, 4, 5];
export const SPECIALISATIONS = ['Bureaucratie', 'Crime', 'Éducation', 'Finance', 'Haute Société', 'Industrie',
  'Loi', 'Média', 'Occulte', 'Police', 'Politique', 'Religion', 'Rue', 'Santé', 'Transport'];

export const CAT_GOTHA = 'Influence Gotha';
export const CAT_PEGRE = 'Influence Pègre';

export const ACTIONS_GOTHA_GLOB = [
  { nom: 'Un ami dans le besoin (Gotha 1)', niveau: 1, desc: 'Emprunter gratuitement des ressources (≈1000€ par niveau d\'Influence Gotha).' },
  { nom: 'Potins et délit d\'initié (Gotha 2)', niveau: 2, desc: 'Découvrir les usages récents (3 mois) de l\'Influence Gotha liés à vos spécialisations.' },
  { nom: 'Erreurs administratives (Gotha 3)', niveau: 3, desc: 'Faveurs légales onéreuses : paperasse, perquisition, arme enregistrée...' },
  { nom: 'Désamorcer les problèmes (Gotha 4)', niveau: 4, desc: 'Faire disparaître un problème embarrassant (témoins, articles, alibis, Bris de Mascarade).' },
  { nom: 'Pas de pique-assiettes (Gotha 5)', niveau: 5, desc: 'Sécuriser une zone (manoir / petit immeuble) 24h, obstruction niveau 5 incluse.' },
  { nom: 'Tout a un prix (Gotha 6)', niveau: 5, desc: 'Faveur importante non nécessairement légale (évasion, drogues, arme illégale...).' },
  { nom: 'Collection privée (Gotha 7)', niveau: 5, desc: 'Accès temporaire à une œuvre rare (risque de perte = -2 niveaux pendant 2 mois).' },
  { nom: 'La débâcle d\'une vedette (Gotha 8)', niveau: 5, desc: 'Organiser un incident à l\'échelle de la ville, détourner l\'attention.' },
  { nom: 'Le pouvoir derrière le Trône (Gotha 9)', niveau: 5, desc: 'Effet significatif et à long terme sur la ville (élection, services d\'urgence...).' },
  { nom: 'Influence Régionale (Gotha 10)', niveau: 5, desc: 'Étend les actions globales à une région entière.' }
];
export const ACTIONS_PEGRE_GLOB = [
  { nom: 'Course gratuite (Pègre 1)', niveau: 1, desc: 'Traverser n\'importe quel quartier sans encombre, forces de l\'ordre discrètes.' },
  { nom: 'La rumeur (Pègre 2)', niveau: 2, desc: 'Découvrir les usages récents (3 mois) de l\'Influence Pègre liés à vos spécialisations.' },
  { nom: 'Faveurs illégales (Pègre 3)', niveau: 3, desc: 'Faveur importante non nécessairement légale (évasion, drogues, arme illégale...).' },
  { nom: 'Déballer son linge sale en public (Pègre 4)', niveau: 4, desc: 'Organiser un incident à l\'échelle de la ville (guerre de gangs, incendies...).' },
  { nom: 'État d\'urgence (Pègre 5)', niveau: 5, desc: 'Sécuriser une zone (entrepôt / petit immeuble) 24h, obstruction niveau 5 incluse.' },
  { nom: 'Tirer les ficelles (Pègre 6)', niveau: 5, desc: 'Faveurs légales onéreuses : votes, perquisitions, armes enregistrées, événements...' },
  { nom: 'Détourner le regard (Pègre 7)', niveau: 5, desc: 'Faire disparaître un problème embarrassant (témoins, articles, alibis, Bris de Mascarade).' },
  { nom: 'Ce dont tu t\'empares est tien (Pègre 8)', niveau: 5, desc: 'Accès temporaire à une œuvre rare (risque : attention des autorités).' },
  { nom: 'Une offre que vous ne pouvez refuser (Pègre 9)', niveau: 5, desc: 'Effet significatif et à long terme (légalité, scandales, émeutes...).' },
  { nom: 'Influence Régionale (Pègre 10)', niveau: 5, desc: 'Étend les actions globales à une région entière.' }
];
// ---------------------------------------------------------------------
// Actions inter-partie (AIP), d'après le chapitre « Actions Inter-Partie »
// des règles MET : 3 AIP entre deux parties (+1 Informatique, +1 par
// domaine de Sciences, voir fiche/aip.js). La catégorie d'une action AIP
// est la réserve utilisée ; les anciennes catégories restent reconnues.
// ---------------------------------------------------------------------
export const RESERVES_AIP = {
  'AIP': 'AIP de base',
  'AIP (Informatique)': 'AIP Informatique',
  'AIP (Science)': 'AIP Science',
  'AIP (Troupeau)': 'Troupeau (se nourrir sans AIP)'
};
export const CATEGORIES_AIP = ['AIP', 'AIP (Troupeau)', 'AIP (Informatique)', 'AIP (Artisanat)', 'AIP (Science)', 'Dépense d\'XP'];
/** Réserve d'AIP d'une action (les anciennes catégories comptent dans la réserve de base). */
export const reserveAip = (categorie) => (RESERVES_AIP[categorie] ? categorie : 'AIP');
const COURANTES = ['AIP', 'AIP (Informatique)'];
export const ACTIONS_AIP = [
  { nom: 'Enquête', reserves: [...COURANTES, 'AIP (Science)'], cible: 'Piste, ennemi, événement, savoir recherché…',
    desc: 'Suivre une piste, se renseigner sur un ennemi, un événement étrange ou un savoir caché, à l\'aide de vos historiques ou capacités. Le conteur peut demander un challenge.' },
  { nom: 'Patrouiller', reserves: COURANTES, lieu: true,
    desc: 'Surveiller votre territoire : chaque AIP dépensée rend plus coûteux, pour un intrus, de s\'y nourrir sans se faire prendre. Indiquez le territoire.' },
  { nom: 'Se nourrir', reserves: [...COURANTES, 'AIP (Troupeau)'], lieu: true, nourriture: true,
    desc: 'Chasser entre deux parties : 1 AIP (davantage si le conteur l\'exige, +1 pour un Ventrue). Faute de quoi, le personnage commence la partie à demi-réserve de sang (arrondi au supérieur). Le Troupeau réduit ce coût de son niveau.' },
  { nom: 'Artisanat : créer ou réparer', reserves: COURANTES, cible: 'Objet',
    desc: 'Créer, construire ou réparer un objet avec votre compétence Artisanat (1 AIP par objet ; œuvre d\'art ou chef-d\'œuvre selon votre niveau et un challenge).' },
  { nom: 'Artisanat : produire et vendre', reserves: COURANTES, points: 2,
    desc: '2 AIP (créer puis vendre) : Ressources +1 pendant un mois, jusqu\'à 5, même sans l\'historique.' },
  { nom: 'Représentation', reserves: COURANTES, points: 2,
    desc: '2 AIP (promouvoir puis jouer le spectacle) : Renommée +1 pendant un mois, jusqu\'à 5, même sans l\'historique.' },
  { nom: 'Au-delà de vos moyens', reserves: COURANTES, cible: 'Objet recherché',
    desc: 'Obtenir un objet coûteux sans les Ressources nécessaires : payer d\'avance, rendre des services ou gagner l\'argent.' },
  { nom: 'Apprentissage (mentorat, étude)', reserves: [...COURANTES, 'AIP (Science)'], cible: 'Mentor et ce qui est appris',
    desc: 'Étudier auprès d\'un mentor : discipline hors clan, spécialité Mystères (1 AIP par spécialité), voie, rituel… Indiquez le mentor.' },
  { nom: 'Recherche scientifique', reserves: [...COURANTES, 'AIP (Science)'], cible: 'Sujet de la recherche',
    desc: 'Travail en rapport avec un de vos domaines d\'étude (Sciences).' },
  { nom: 'Observer une AIP', reserves: ['AIP (Informatique)'], cible: 'Personnage observé',
    desc: 'Informatique : observer une action inter-partie d\'un autre personnage (il doit se trouver dans la même cité).' },
  { nom: 'Annuler une AIP', reserves: ['AIP (Informatique)'], cible: 'Personnage visé',
    desc: 'Informatique : annuler une action inter-partie d\'un autre personnage (il garde toujours au moins 1 AIP).' },
  { nom: 'Autre', reserves: [...COURANTES, 'AIP (Science)'], cible: 'Sujet',
    desc: 'Toute autre activité entre deux parties : décrivez-la en une phrase.' }
];
export const POINTS_AIP = [1, 2, 3, 4, 5, 6];

export const TYPES_ACTION = { globale: 'Globale', ciblee: 'Ciblée', soutien: 'Soutien', aip: 'AIP' };

export const CATEGORIES_TICKET = [
  'Modification de fiche', 'Demande de scène', 'Contact avec un antagoniste',
  'Mise à jour de fiche / Dépense d\'XP', 'Question de règles',
  'Signalement (Bris de Mascarade, comportement...)', 'Demande d\'objet / artefact', 'Autre'
];
export const STATUTS_TICKET = ['En attente', 'En cours', 'Informations demandées', 'Complété', 'Refusé', 'Annulé'];
// Classe CSS de l'étiquette d'un statut de ticket, et d'une catégorie d'influence
export const CLASSE_TICKET = {
  'En attente': 'attente', 'En cours': 'encours', 'Informations demandées': 'infos',
  'Complété': 'complete', 'Refusé': 'refuse', 'Annulé': 'annule'
};
export const classeCat = (c) => ((c || '').includes('Gotha') ? 'gotha' : ((c || '').includes('Pègre') ? 'pegre' : ''));

// Fiches de personnage
export const STATUTS_FICHE = {
  brouillon: 'Brouillon',
  soumise: 'Soumise au conteur',
  refusee: 'À corriger',
  validee: 'Validée (en réserve)',
  active: 'En jeu',
  archivee: 'Archivée'
};
export const STATUTS_FICHE_EDITABLES = ['brouillon', 'refusee', 'soumise'];

// PNJ des conteurs : fiches MET sans joueur (proprietaire vide), champ pnj = catégorie.
// Invisibles des joueurs (règles Firestore), hors du répertoire et des influences.
export const CATEGORIES_PNJ = {
  vampire: 'Vampire', goule: 'Goule', sabbat: 'Sabbatique', humain: 'Humain',
  inquisition: 'Inquisition', lupin: 'Loup-garou', autre: 'Autre'
};
export const AIDE_PNJ = {
  vampire: 'Vénérables, anciens, ancillas… de la Camarilla, anarchs, indépendants',
  goule: 'Serviteurs nourris de vitae',
  sabbat: 'Vampires du Sabbat',
  humain: 'Mortels : contacts, policiers, chasseurs…',
  inquisition: 'Société de Léopold et autres chasseurs organisés',
  lupin: 'Garous et autres changeurs de forme',
  autre: 'Fantômes, mages, fées, créatures…'
};
// Âges proposés à la création d'un PNJ vampire (liste « Âge » de la fiche MET)
export const AGES_PNJ_VAMPIRE = ['Vénérable', 'Ancien', 'Ancilla', 'Nouveau-Né'];
// Pré-remplissage de la fiche MET selon la catégorie
export const FICHE_PNJ = {
  vampire: { typeFiche: 'Antagoniste', race: 'Vampire' },
  goule: { typeFiche: 'Antagoniste', race: 'Humain', age: 'Goule' },
  sabbat: { typeFiche: 'Antagoniste', race: 'Vampire', secte: 'Sabbat' },
  humain: { typeFiche: 'Antagoniste', race: 'Humain', age: 'Autre' },
  inquisition: { typeFiche: 'Antagoniste', race: 'Humain', age: 'Autre' },
  lupin: { typeFiche: 'Antagoniste', age: 'Autre' },
  autre: { typeFiche: 'Antagoniste', age: 'Autre' }
};
export const STATUTS_PNJ = { active: 'Actif', archivee: 'Archivé' };
