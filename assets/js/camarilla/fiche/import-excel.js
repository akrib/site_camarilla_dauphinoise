// Import d'une fiche Excel MET (.xlsx) dans le navigateur.
// Le fichier ne quitte pas l'ordinateur du joueur : il est lu localement
// (bibliothèque SheetJS chargée à la demande), puis converti en fiche.
import { depuisExcel } from './modele.js';

export const URL_SHEETJS = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs';

export async function lireFicheExcel(fichier) {
  let XLSX;
  try { XLSX = await import(URL_SHEETJS); } catch (e) {
    throw new Error('Impossible de charger le lecteur de fichiers Excel (connexion à cdn.sheetjs.com).');
  }
  const classeur = XLSX.read(await fichier.arrayBuffer(), { cellDates: true, cellFormula: false, cellHTML: false, cellStyles: false });
  if (!classeur.Sheets.Personnage) throw new Error('Ce fichier n\'est pas une fiche MET : onglet « Personnage » introuvable.');
  const cell = (onglet, adresse) => {
    const feuille = classeur.Sheets[onglet];
    const c = feuille && feuille[adresse];
    return c ? c.v : null;
  };
  return { fiche: depuisExcel(cell), version: String(cell('Personnage', 'A1') || '') };
}
