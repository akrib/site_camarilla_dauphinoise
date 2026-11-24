// =====================================================================
// Actions inter-partie (AIP) qu'apporte une fiche, d'après les règles MET
// ---------------------------------------------------------------------
// - 3 AIP entre deux parties (non cumulables d'une partie à l'autre) ;
// - compétence Informatique : +1 AIP, utilisable normalement ou pour
//   observer / annuler une AIP d'un autre personnage ;
// - Sciences : +1 AIP pour le premier domaine d'étude, +1 par domaine
//   supplémentaire à 3 ou plus, réservées à des tâches de ces domaines ;
// - se nourrir coûte 1 AIP (le conteur peut en demander davantage ; +1 pour
//   la faiblesse Ventrue) ; le Troupeau réduit ce coût de son niveau.
// Recopié dans le document léger de la fiche (champ aip) : page des
// influences du joueur et tableau des conteurs.
// =====================================================================
const entier = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : 0; };
const borne = (n) => Math.max(0, Math.min(20, n));

export function budgetAip(F) {
  const competences = (F && F.competences) || {};
  const sciences = ((F && F.sciences) || []).filter((s) => String(s.nom || '').trim() && entier(s.niveau) >= 1).map((s) => entier(s.niveau));
  const aTrois = sciences.filter((n) => n >= 3).length;
  // Le premier domaine compte quel que soit son niveau : on prend de préférence un domaine sous 3.
  const nbSciences = !sciences.length ? 0 : (sciences.some((n) => n < 3) ? 1 + aTrois : aTrois);
  const ventrue = /^ventrue/i.test(String((F && F.clan) || ''));
  return {
    base: 3,
    informatique: entier(competences.Informatique) >= 1 ? 1 : 0,
    sciences: borne(nbSciences),
    troupeau: borne(entier(F && F.historiques && F.historiques.troupeau && F.historiques.troupeau.niveau)),
    nourriture: ventrue ? 2 : 1,
  };
}

/** Total des AIP utilisables (hors Troupeau, qui ne sert qu'à se nourrir). */
export const totalAip = (a) => (a ? (a.base || 0) + (a.informatique || 0) + (a.sciences || 0) : 3);
