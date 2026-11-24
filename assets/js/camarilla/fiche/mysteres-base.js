// =====================================================================
// Spécialités Mystères : noms et niveaux connus d'une fiche (sans accès à
// la base ; les textes sont gérés par mysteres.js)
// =====================================================================
import { REF } from './referentiel.js';

const sansAccents = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’'`]/g, "'").replace(/\s+/g, ' ').trim();

/** Identifiant de document d'une spécialité : « Caitiff/Panders » -> « caitiff-panders ». */
export const slugMystere = (nom) => sansAccents(nom).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'x';

// Noms de secte, de clan ou de race -> spécialité de la liste de la fiche
const ALIAS = {
  anarchs: 'Anarch', 'disciple de set': 'Séthite', 'disciples de set': 'Séthite', setite: 'Séthite', lasombra: 'Lassombra',
  nosferatu: 'Nosfératu', caitiff: 'Caitiff/Panders', 'gangrel urbain': 'Gangrel', salubrien: 'Salubri',
  'loups-garous': 'Lupin', 'loup-garou': 'Lupin', noddisme: 'Livre de Nod', 'reseau lunatique malkavien': 'RLM',
};

/** Spécialité Mystères correspondant à un nom de secte, de clan (lignée comprise) ou de race ; '' s'il n'y en a pas. */
export function factionMystere(nom) {
  let n = String(nom || '').trim();
  if (!n) return '';
  const autark = /^Autark\s*\((.+)\)$/i.exec(n);
  if (autark) n = autark[1];
  const cle = sansAccents(n);
  const direct = REF.factionsMystere.find((f) => sansAccents(f) === cle);
  if (direct) return direct;
  if (ALIAS[cle]) return ALIAS[cle];
  const sansLignee = sansAccents(n.split(' - ')[0]);
  return REF.factionsMystere.find((f) => sansAccents(f) === sansLignee) || ALIAS[sansLignee] || '';
}

/** Nom affiché de la spécialité n° i (les trois premières : secte, clan, race). */
export function nomSpecialite(F, i) {
  if (i < 3) return [F.secte, F.clan, F.race][i] || '';
  return (F.mysteres.specialites[i] || {}).nom || '';
}

/**
 * Spécialités connues d'une fiche : [{ faction, niveau, libelle }] (niveau le
 * plus haut si la même spécialité apparaît deux fois). Les trois spécialités
 * offertes (secte, clan, race) ne comptent que si elles ont une spécialité
 * Mystères (pas d'« Aubain » ni d'« Humain »).
 */
export function mysteresConnus(F) {
  const res = new Map();
  (F.mysteres && F.mysteres.specialites || []).forEach((s, i) => {
    const libelle = nomSpecialite(F, i);
    const faction = factionMystere(libelle) || (i >= 3 ? String(s.nom || '').trim() : '');
    const niveau = Math.max(0, Math.min(6, parseInt(s.niveau, 10) || 0));
    if (!faction || !niveau) return;
    const avant = res.get(faction);
    if (!avant || avant.niveau < niveau) res.set(faction, { faction, niveau, libelle: libelle || faction });
  });
  return [...res.values()].sort((a, b) => a.faction.localeCompare(b.faction, 'fr'));
}
