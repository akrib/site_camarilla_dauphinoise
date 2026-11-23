// =====================================================================
// Rendu de la gazette (commun : lecture des joueurs, prévisualisation,
// éditeur, impression). Aucun texte n'est injecté en HTML brut.
//
// Mise en forme du texte des articles :
//   ligne vide         -> nouveau paragraphe
//   **gras**  *italique*  _italique_
//   ## Intertitre      > citation      - élément de liste      --- ornement
// =====================================================================
import { h } from '../core.js';
import { MOTIFS, nomMois, estVide, estModele } from './modele.js';

// ---------------------------------------------------------------------
// Texte mis en forme
// ---------------------------------------------------------------------
const MOTIF_INLINE = /(\*\*[^*\n]+?\*\*|\*[^*\s][^*\n]*?\*|_[^_\s][^_\n]*?_)/g;
function enLigne(texte) {
  const morceaux = [];
  let dernier = 0;
  for (const m of texte.matchAll(MOTIF_INLINE)) {
    if (m.index > dernier) morceaux.push(texte.slice(dernier, m.index));
    const t = m[0];
    morceaux.push(t.startsWith('**') ? h('strong', {}, t.slice(2, -2)) : h('em', {}, t.slice(1, -1)));
    dernier = m.index + t.length;
  }
  if (dernier < texte.length) morceaux.push(texte.slice(dernier));
  return morceaux;
}
const avecSauts = (lignes) => lignes.flatMap((l, i) => (i ? [h('br'), ...enLigne(l)] : enLigne(l)));

/** Blocs (paragraphes, intertitres, citations, listes) d'un texte d'article. */
export function texteMisEnForme(texte) {
  const blocs = [];
  for (const bloc of String(texte || '').replace(/\r/g, '').split(/\n\s*\n/)) {
    const lignes = bloc.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim());
    if (!lignes.length) continue;
    const premier = lignes[0].trim();
    if (lignes.length === 1 && /^(-{3,}|\*{3,}|\* \* \*)$/.test(premier)) { blocs.push(h('p', { class: 'gz-orne', 'aria-hidden': 'true' }, '❦')); continue; }
    if (/^#{2,3}\s+/.test(premier) && lignes.length === 1) { blocs.push(h('h4', { class: 'gz-intertitre' }, ...enLigne(premier.replace(/^#{2,3}\s+/, '')))); continue; }
    if (lignes.every((l) => /^\s*>\s?/.test(l))) { blocs.push(h('blockquote', { class: 'gz-citation' }, ...avecSauts(lignes.map((l) => l.replace(/^\s*>\s?/, ''))))); continue; }
    if (lignes.every((l) => /^\s*[-•]\s+/.test(l))) { blocs.push(h('ul', { class: 'gz-liste' }, lignes.map((l) => h('li', {}, ...enLigne(l.replace(/^\s*[-•]\s+/, '')))))); continue; }
    blocs.push(h('p', {}, ...avecSauts(lignes)));
  }
  return blocs;
}

// ---------------------------------------------------------------------
// Édition en place : dans l'éditeur, chaque zone de texte porte
// data-champ (nom du champ) et data-ph (texte indicatif quand elle est
// vide) ; l'éditeur la rend modifiable. Les zones vides sont rendues
// quand même (classe gz-champ-vide), pour pouvoir y écrire.
// ---------------------------------------------------------------------
function zone(edition, classe, champ, ph, valeur) {
  if (!edition) return { class: classe };
  return { class: classe + (String(valeur || '').trim() ? '' : ' gz-champ-vide'), 'data-champ': champ, 'data-ph': ph };
}

// ---------------------------------------------------------------------
// Article
// ---------------------------------------------------------------------
function figure(img, { edition }) {
  if (!img.url) return null;
  const classe = 'gz-image gz-img-' + img.position + (img.position === 'gauche' || img.position === 'droite' ? ' gz-img-' + img.taille : '');
  const fig = h('figure', { class: classe });
  const el = h('img', {
    src: img.url, alt: img.legende || '', loading: 'eager', decoding: 'async', referrerpolicy: 'no-referrer',
    onerror: () => {
      fig.classList.add('gz-image-erreur');
      if (edition) fig.prepend(h('span', { class: 'gz-image-msg' }, 'Image introuvable, ou refusée par le site qui l\'héberge.'));
    }
  });
  fig.append(el);
  if (edition) {
    // Légende et crédit modifiables en place (l'image elle-même ne l'est pas).
    fig.contentEditable = 'false';
    fig.append(h('figcaption', {},
      h('span', zone(true, 'gz-legende', 'image.legende', 'Légende', img.legende), img.legende),
      h('span', zone(true, 'gz-credit', 'image.credit', 'Crédit', img.credit), img.credit)));
  } else if (img.legende || img.credit) {
    fig.append(h('figcaption', {}, img.legende, img.credit ? h('span', { class: 'gz-credit' }, img.credit) : ''));
  }
  return fig;
}

export function rendreArticle(a, { edition = false } = {}) {
  if (!a) return null;
  if (!edition && (estVide(a) || estModele(a))) return null;
  const blocs = texteMisEnForme(a.texte);
  if (a.lettrine && blocs[0] && blocs[0].tagName === 'P') blocs[0].classList.add('gz-lettrine');
  const fig = figure(a.image, { edition });
  const cote = fig && (a.image.position === 'gauche' || a.image.position === 'droite');
  const texte = h('div', zone(edition, 'gz-texte' + (a.colonnes > 1 ? ' gz-cols-' + a.colonnes : ''), 'texte', 'Cliquez ici pour écrire l\'article…', blocs.length ? 'x' : ''),
    cote ? fig : '', blocs,
    edition && !blocs.length ? h('p', { class: a.lettrine ? 'gz-lettrine' : null }, h('br')) : '');
  // En lecture, une zone vide n'est pas rendue ; dans l'éditeur, elle l'est (vide, avec son texte indicatif).
  const ligne = (balise, classe, champ, ph, ...contenu) => (a[champ] || edition)
    ? h(balise, zone(edition, classe, champ, ph, a[champ]), ...contenu) : '';
  return h('article', { class: 'gz-article gz-' + a.style, dataset: { article: a.id } },
    ligne('p', 'gz-surtitre', 'surtitre', 'Surtitre (rubrique, lieu…)', a.surtitre),
    ligne(a.style === 'une' ? 'h2' : 'h3', 'gz-titre', 'titre', 'Titre', a.titre),
    ligne('p', 'gz-chapeau', 'chapeau', 'Chapeau : introduction en italique', ...enLigne(a.chapeau)),
    fig && a.image.position === 'haut' ? fig : '',
    texte,
    fig && a.image.position === 'bas' ? fig : '',
    ligne('p', 'gz-signature', 'signature', 'Signature', a.signature));
}

// ---------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------
const majuscule = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
export const dateGazette = (bandeau, mois) => bandeau.dateAffichee || majuscule(nomMois(mois));

export function rendreBandeau(b, meta, { edition = false } = {}) {
  const z = (balise, classe, cle, ph, ...contenu) => h(balise, zone(edition, classe, 'bandeau.' + cle, ph, b[cle]), ...contenu);
  return h('header', { class: 'gz-bandeau' + (b.oreilleGauche || b.oreilleDroite ? '' : ' gz-sans-oreilles') },
    z('div', 'gz-oreille gz-oreille-g', 'oreilleGauche', 'Oreille gauche', b.oreilleGauche),
    h('div', { class: 'gz-nom' },
      z('h1', 'gz-titre-journal', 'titre', 'Titre du journal', b.titre),
      b.sousTitre || edition ? z('p', 'gz-sous-titre', 'sousTitre', 'Sous-titre', b.sousTitre) : ''),
    z('div', 'gz-oreille gz-oreille-d', 'oreilleDroite', 'Oreille droite', b.oreilleDroite),
    h('div', { class: 'gz-ligne-info' },
      h('span', {}, 'N° ' + (meta.numero || '?')),
      edition
        // Lieu et date séparés, pour les modifier chacun à sa place ; date vide = mois du numéro.
        ? h('span', {}, z('span', 'gz-lieu', 'lieu', 'Lieu', b.lieu), ', ',
          h('span', { ...zone(true, 'gz-date gz-ph-encre', 'bandeau.dateAffichee', dateGazette({}, meta.mois), b.dateAffichee) }, b.dateAffichee))
        : h('span', {}, [b.lieu, dateGazette(b, meta.mois)].filter(Boolean).join(', ')),
      z('span', 'gz-prix', 'prix', 'Prix', b.prix)),
    b.devise || edition ? z('p', 'gz-devise', 'devise', 'Devise', b.devise) : '');
}
export function rendreEnTete(b, meta, i) {
  return h('header', { class: 'gz-entete' },
    h('span', {}, b.titre), h('span', {}, dateGazette(b, meta.mois)), h('span', {}, 'Page ' + (i + 1)));
}

export function rendreRangee(d, r, opts = {}) {
  const largeurs = MOTIFS[r.motif] || [12];
  return h('div', { class: 'gz-rangee' + (r.filet ? ' gz-filet' : ''), dataset: { rangee: r.id } },
    r.colonnes.map((c, k) => h('div', { class: 'gz-col gz-l' + largeurs[k], style: 'grid-column: span ' + largeurs[k], dataset: { colonne: c.id } },
      c.articles.map((id) => rendreArticle(d.articles[id], opts)))));
}

/**
 * Le numéro complet. meta = { mois, numero }.
 * opts.edition : rendu de l'éditeur (articles vides visibles, aides).
 */
export function rendreGazette(d, meta, opts = {}) {
  return h('div', { class: 'gz-journal' + (opts.edition ? ' gz-en-edition' : ''), lang: 'fr' },
    d.pages.map((page, i) => h('section', { class: 'gz-page', dataset: { page: page.id, numero: i + 1 } },
      i === 0 ? rendreBandeau(d.bandeau, meta, opts) : rendreEnTete(d.bandeau, meta, i),
      page.rangees.map((r) => rendreRangee(d, r, opts)))));
}

// ---------------------------------------------------------------------
// Impression (noir et blanc, A4) : rendu propre dans #gz-impression juste
// avant d'imprimer, quel que soit l'écran affiché (bouton ou Ctrl+P).
// ---------------------------------------------------------------------
export function preparerImpression(fournir) {
  const zone = document.getElementById('gz-impression');
  if (!zone) return;
  window.addEventListener('beforeprint', () => {
    const g = fournir();
    zone.replaceChildren(g ? rendreGazette(g.donnees, g.meta) : '');
    zone.classList.add('gz-impression');
  });
  window.addEventListener('afterprint', () => zone.replaceChildren());
}

/** Pages qui dépassent une feuille A4 (affichage en mode impression seulement). */
export function pagesQuiDebordent(racine) {
  const etalon = h('div', { style: 'position:absolute;visibility:hidden;height:297mm;width:1px' });
  document.body.append(etalon);
  const a4 = etalon.getBoundingClientRect().height;
  etalon.remove();
  return [...racine.querySelectorAll('.gz-page')].filter((p) => {
    const trop = p.scrollHeight > a4 + 2;
    p.classList.toggle('gz-deborde', trop);
    return trop;
  }).map((p) => +p.dataset.numero);
}
