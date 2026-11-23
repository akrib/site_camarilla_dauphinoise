// =====================================================================
// Lecture d'une fiche complète (document léger + détail compressé), pour
// les outils qui ont besoin de la fiche MET hors de la page des fiches
// (combat). Les anciennes fiches (tout dans le document) restent lues.
// =====================================================================
import { db, fs } from '../core.js';
import { donneesDoc, decompresserJson, estCompresse } from '../compression.js';

/** Fiche MET d'un document déjà lu (1 lecture du détail, sauf ancien format). */
export async function lireDetail(d) {
  if (d.fiche) return d.fiche;
  const s = await fs.getDoc(fs.doc(db, 'personnages', d.id, 'detail', 'fiche'));
  if (!s.exists()) return null;
  const x = s.data();
  return x.fiche && typeof x.fiche === 'object' && !estCompresse(x.fiche) ? x.fiche : JSON.parse(await decompresserJson(x.fiche) || 'null');
}

/** { doc, fiche } d'un personnage, ou null s'il n'existe pas (2 lectures). */
export async function lireFicheComplete(id) {
  const snap = await fs.getDoc(fs.doc(db, 'personnages', id));
  if (!snap.exists()) return null;
  const doc = donneesDoc(snap);
  return { doc, fiche: await lireDetail(doc) };
}
