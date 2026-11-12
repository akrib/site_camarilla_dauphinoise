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
export const CATEGORIES_AIP = ['AIP', 'AIP (Troupeau)', 'AIP (Informatique)', 'AIP (Artisanat)', 'AIP (Science)', 'Dépense d\'XP'];
export const AIP_ACTIONS = {
  'AIP': ['Enquête', 'Patrouille', 'Mentorat (Apprendre)', 'Au delà de vos moyens', 'Spéciale', 'Chasse'],
  'AIP (Troupeau)': ['Se nourrir'],
  'AIP (Informatique)': ['AIP classique', 'Observer une AIP', 'Annuler une AIP'],
  'AIP (Artisanat)': ['Artisanat', 'Représentation'],
  'AIP (Science)': ['Science'],
  'Dépense d\'XP': ['Dépense XP']
};
export const CATEGORIES_RAISON_SOCIALE = [CAT_GOTHA, CAT_PEGRE, ...CATEGORIES_AIP];

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
