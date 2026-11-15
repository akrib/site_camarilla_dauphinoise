// =====================================================================
// Jeton d'accès Mapillary du jeu « Trouve le Sabbat » (/utils/sabbat)
// ---------------------------------------------------------------------
// Mapillary : photos de rue libres (CC BY-SA), API gratuite.
// Créer le jeton (gratuit) :
//   1. se connecter sur https://www.mapillary.com (compte Mapillary) ;
//   2. https://www.mapillary.com/developer > « Register application » :
//      nom « Camarilla Dauphinoise », site https://www.camarilla-dauphinoise.fr,
//      autorisation « Read » seulement ;
//   3. copier le « Client Token » (il commence par MLY|) ci-dessous.
// Ce jeton est fait pour être public : il n'autorise que la lecture des
// photos, comme la clé Firebase de firebase-config.js. Voir docs/FIREBASE.md.
// =====================================================================
export const MAPILLARY_JETON = 'MLY|A_REMPLACER';
