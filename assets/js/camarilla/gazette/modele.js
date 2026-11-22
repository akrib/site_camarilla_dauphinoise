// =====================================================================
// Gazette « Le Gratin Dauphinois » : structure d'un numéro
// ---------------------------------------------------------------------
// Un numéro par mois (identifiant AAAA-MM). Contenu (JSON, compressé dans
// Firestore) :
//   bandeau  : titre du journal, sous-titre, devise, prix, lieu, oreilles…
//   pages    : [{ id, rangees: [{ id, motif: '8-4', filet, colonnes: [{ id, articles: [ids] }] }] }]
//              une page = une feuille A4 ; une rangée = une bande de la page
//              découpée en colonnes (largeurs sur 12) ; chaque colonne
//              empile des articles.
//   articles : { id: { surtitre, titre, chapeau, texte, signature, style,
//                      colonnes, lettrine, image: { url, legende, credit,
//                      position, taille }, source } }
//              un article qui n'est dans aucune colonne est « en réserve ».
//   pensebete: { notes, faits: [ids d'influences traitées] }
// Les images ne sont jamais stockées : seulement leur adresse (https).
// =====================================================================

export const NOM_GAZETTE = 'Le Gratin Dauphinois';

// Découpages d'une rangée (largeurs des colonnes, sur 12)
export const MOTIFS = {
  '12': [12], '6-6': [6, 6], '8-4': [8, 4], '4-8': [4, 8], '9-3': [9, 3], '3-9': [3, 9],
  '4-4-4': [4, 4, 4], '3-6-3': [3, 6, 3], '6-3-3': [6, 3, 3], '3-3-6': [3, 3, 6], '3-3-3-3': [3, 3, 3, 3]
};
export const STYLES = {
  normal: 'Article', une: 'Gros titre (à la une)', encadre: 'Encadré', breve: 'Brève', annonce: 'Petite annonce'
};
export const POSITIONS_IMAGE = { haut: 'Au-dessus du texte', gauche: 'À gauche du texte', droite: 'À droite du texte', bas: 'Sous le texte' };
export const TAILLES_IMAGE = { petite: 'Petite (un tiers)', moyenne: 'Moyenne (la moitié)' };
export const STATUTS = { brouillon: 'Brouillon', publiee: 'Publiée' };

// Longueurs maximales (le tout reste très loin du 1 Mo d'un document Firestore)
const MAX = { court: 200, chapeau: 1000, texte: 20000, url: 1000, notes: 5000 };
export const MAX_PAGES = 12, MAX_RANGEES = 16, MAX_ARTICLES = 120;

export const BANDEAU_DEFAUT = {
  titre: NOM_GAZETTE,
  sousTitre: 'Gazette des nuits grenobloises',
  devise: 'Toutes les nouvelles qui ne voient jamais le jour',
  prix: '',
  lieu: 'Grenoble',
  dateAffichee: '',          // vide : le mois du numéro (« novembre 2026 »)
  oreilleGauche: '',         // petites cases de part et d'autre du titre
  oreilleDroite: ''
};

export const nouvelId = (prefixe) => prefixe + Math.random().toString(36).slice(2, 9);
const chaine = (v, max) => (typeof v === 'string' ? v : v == null ? '' : String(v)).slice(0, max);

/** Adresse d'image acceptée : https seulement (le site est en https). */
export function urlImageValide(url) {
  const u = String(url || '').trim();
  if (!u || u.length > MAX.url || !/^https:\/\/[^\s"'<>]+$/i.test(u)) return false;
  try { return new URL(u).protocol === 'https:'; } catch (e) { return false; }
}

export function nouvelArticle(props = {}) {
  return normaliserArticle({ id: nouvelId('a'), ...props });
}

export function normaliserArticle(a) {
  const x = a && typeof a === 'object' ? a : {};
  const img = x.image && typeof x.image === 'object' ? x.image : {};
  return {
    id: chaine(x.id, 20) || nouvelId('a'),
    surtitre: chaine(x.surtitre, MAX.court),
    titre: chaine(x.titre, MAX.court),
    chapeau: chaine(x.chapeau, MAX.chapeau),
    texte: chaine(x.texte, MAX.texte),
    signature: chaine(x.signature, MAX.court),
    style: STYLES[x.style] ? x.style : 'normal',
    colonnes: [1, 2, 3].includes(+x.colonnes) ? +x.colonnes : 1,
    lettrine: !!x.lettrine,
    image: {
      url: urlImageValide(img.url) ? String(img.url).trim() : '',
      legende: chaine(img.legende, MAX.court),
      credit: chaine(img.credit, MAX.court),
      position: POSITIONS_IMAGE[img.position] ? img.position : 'haut',
      taille: TAILLES_IMAGE[img.taille] ? img.taille : 'moyenne'
    },
    source: x.source && typeof x.source === 'object'
      ? { influence: chaine(x.source.influence, 40), libelle: chaine(x.source.libelle, MAX.court) } : null
  };
}

export function nouvelleRangee(motif = '12') {
  const largeurs = MOTIFS[motif] || MOTIFS['12'];
  return { id: nouvelId('r'), motif: MOTIFS[motif] ? motif : '12', filet: true, colonnes: largeurs.map(() => ({ id: nouvelId('c'), articles: [] })) };
}

/** Change le découpage d'une rangée sans perdre d'article (ceux des colonnes retirées passent dans la dernière). */
export function changerMotif(rangee, motif) {
  const n = (MOTIFS[motif] || [12]).length;
  const cols = rangee.colonnes;
  while (cols.length < n) cols.push({ id: nouvelId('c'), articles: [] });
  if (cols.length > n) {
    const restes = cols.splice(n).flatMap((c) => c.articles);
    cols[n - 1].articles.push(...restes);
  }
  rangee.motif = MOTIFS[motif] ? motif : '12';
  return rangee;
}

/** Remet en ordre un contenu lu (Firestore, navigateur, import) : rien d'inattendu ne passe. */
export function normaliserGazette(d) {
  const x = d && typeof d === 'object' ? d : {};
  const articles = {};
  for (const [id, a] of Object.entries(x.articles && typeof x.articles === 'object' ? x.articles : {}).slice(0, MAX_ARTICLES)) {
    const art = normaliserArticle({ ...a, id });
    articles[art.id] = art;
  }
  const vus = new Set();
  const pages = (Array.isArray(x.pages) ? x.pages : []).slice(0, MAX_PAGES).map((p) => ({
    id: chaine(p && p.id, 20) || nouvelId('p'),
    rangees: (Array.isArray(p && p.rangees) ? p.rangees : []).slice(0, MAX_RANGEES).map((r) => {
      const rangee = { id: chaine(r && r.id, 20) || nouvelId('r'), motif: MOTIFS[r && r.motif] ? r.motif : '12', filet: !(r && r.filet === false), colonnes: [] };
      const largeurs = MOTIFS[rangee.motif];
      rangee.colonnes = largeurs.map((_, i) => {
        const c = (Array.isArray(r && r.colonnes) ? r.colonnes : [])[i] || {};
        // un article n'est placé qu'une fois, et seulement s'il existe
        const ids = (Array.isArray(c.articles) ? c.articles : []).filter((id) => articles[id] && !vus.has(id) && vus.add(id));
        return { id: chaine(c.id, 20) || nouvelId('c'), articles: ids };
      });
      return rangee;
    })
  }));
  if (!pages.length) pages.push({ id: nouvelId('p'), rangees: [nouvelleRangee('12')] });
  const b = x.bandeau && typeof x.bandeau === 'object' ? x.bandeau : {};
  const bandeau = Object.fromEntries(Object.entries(BANDEAU_DEFAUT).map(([k, v]) => [k, k in b ? chaine(b[k], MAX.court) : v]));
  const pb = x.pensebete && typeof x.pensebete === 'object' ? x.pensebete : {};
  return {
    version: 1, bandeau, pages, articles,
    pensebete: { notes: chaine(pb.notes, MAX.notes), faits: (Array.isArray(pb.faits) ? pb.faits : []).map((v) => chaine(v, 40)).slice(0, 300) }
  };
}

/** Numéro tout neuf : une « une », un article et un encadré, trois colonnes. */
export function gazetteNeuve() {
  const une = nouvelArticle({ style: 'une', titre: 'Titre de la une', colonnes: 2, lettrine: true });
  const a2 = nouvelArticle({ titre: 'Titre de l\'article' });
  const breves = nouvelArticle({ style: 'encadre', titre: 'Brèves' });
  const a3 = nouvelArticle({ titre: 'Titre de l\'article' }), a4 = nouvelArticle({ titre: 'Titre de l\'article' }), a5 = nouvelArticle({ titre: 'Titre de l\'article' });
  const r1 = nouvelleRangee('12'), r2 = nouvelleRangee('8-4'), r3 = nouvelleRangee('4-4-4');
  r1.colonnes[0].articles.push(une.id);
  r2.colonnes[0].articles.push(a2.id); r2.colonnes[1].articles.push(breves.id);
  r3.colonnes[0].articles.push(a3.id); r3.colonnes[1].articles.push(a4.id); r3.colonnes[2].articles.push(a5.id);
  const articles = Object.fromEntries([une, a2, breves, a3, a4, a5].map((a) => [a.id, a]));
  return normaliserGazette({ pages: [{ id: nouvelId('p'), rangees: [r1, r2, r3] }], articles });
}

/** Ids des articles dans l'ordre de lecture (page, rangée, colonne, pile). */
export function ordreLecture(d) {
  return d.pages.flatMap((p) => p.rangees.flatMap((r) => r.colonnes.flatMap((c) => c.articles)));
}
export function enReserve(d) {
  const places = new Set(ordreLecture(d));
  return Object.keys(d.articles).filter((id) => !places.has(id));
}
/** Où est placé un article : { page, rangee, colonne, index } ou null. */
export function position(d, id) {
  for (const page of d.pages) for (const rangee of page.rangees) for (const colonne of rangee.colonnes) {
    const index = colonne.articles.indexOf(id);
    if (index >= 0) return { page, rangee, colonne, index };
  }
  return null;
}
export function retirerDesColonnes(d, id) {
  const p = position(d, id);
  if (p) p.colonne.articles.splice(p.index, 1);
}
export const estVide = (a) => !a || (!a.titre.trim() && !a.texte.trim() && !a.chapeau.trim() && !a.image.url);
export const estModele = (a) => a && /^Titre (de la une|de l'article)$/.test(a.titre) && !a.texte.trim() && !a.chapeau.trim() && !a.image.url;

/** Titre principal du numéro (pour la liste des gazettes). */
export function titreUne(d) {
  const ids = ordreLecture(d).map((id) => d.articles[id]).filter((a) => !estVide(a) && !estModele(a));
  const a = ids.find((x) => x.style === 'une') || ids[0];
  return a ? a.titre.slice(0, 200) : '';
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export function nomMois(mois) {
  const m = /^(\d{4})-(\d{2})$/.exec(mois || '');
  return m ? MOIS[+m[2] - 1] + ' ' + m[1] : '';
}
export const moisValide = (m) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m || '');
export function moisVoisin(mois, delta) {
  const [a, m] = mois.split('-').map(Number);
  const d = new Date(a, m - 1 + delta, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
