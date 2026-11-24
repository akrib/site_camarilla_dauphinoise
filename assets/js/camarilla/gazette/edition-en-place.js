// =====================================================================
// Gazette : écrire directement dans la page de l'éditeur.
//
// Les zones marquées data-champ par le rendu (titre, surtitre, chapeau,
// texte, signature, légende, crédit, bandeau…) deviennent modifiables.
// Chaque frappe est relue et convertie dans le format des champs du panneau
// (texte brut, ou mise en forme **gras** / *italique* / ## intertitre /
// > citation / - liste / --- ornement pour le texte des articles) : le
// panneau de gauche et la page restent toujours d'accord.
// La zone n'est pas redessinée pendant la frappe (le curseur ne resterait
// pas en place) : l'éditeur la redessine quand on la quitte.
// =====================================================================
import { h } from '../core.js';

// Type de chaque champ : ligne (une ligne de texte), lignes (retours à la
// ligne gardés), enligne (une ligne avec gras / italique), texte (article).
export const CHAMPS = {
  surtitre: { type: 'ligne', max: 200, libelle: 'Surtitre' },
  titre: { type: 'ligne', max: 200, libelle: 'Titre' },
  chapeau: { type: 'enligne', max: 1000, libelle: 'Chapeau' },
  texte: { type: 'texte', max: 20000, libelle: 'Texte de l\'article' },
  signature: { type: 'ligne', max: 200, libelle: 'Signature' },
  'image.legende': { type: 'ligne', max: 200, libelle: 'Légende de l\'image' },
  'image.credit': { type: 'ligne', max: 200, libelle: 'Crédit de l\'image' },
  'bandeau.titre': { type: 'ligne', max: 200, libelle: 'Titre du journal' },
  'bandeau.sousTitre': { type: 'ligne', max: 200, libelle: 'Sous-titre' },
  'bandeau.devise': { type: 'ligne', max: 200, libelle: 'Devise' },
  'bandeau.lieu': { type: 'ligne', max: 200, libelle: 'Lieu' },
  'bandeau.dateAffichee': { type: 'ligne', max: 200, libelle: 'Date affichée' },
  'bandeau.prix': { type: 'ligne', max: 200, libelle: 'Prix' },
  'bandeau.oreilleGauche': { type: 'lignes', max: 200, libelle: 'Oreille gauche' },
  'bandeau.oreilleDroite': { type: 'lignes', max: 200, libelle: 'Oreille droite' }
};

// ---------------------------------------------------------------------
// Lecture d'une zone modifiable -> texte du champ
// ---------------------------------------------------------------------
const BLOCS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'FIGURE', 'HR', 'PRE', 'SECTION', 'ARTICLE', 'HEADER', 'TABLE']);
const propre = (s) => s.replace(/ /g, ' ').replace(/[​-‍﻿]/g, '');
const ignore = (el) => el.tagName === 'FIGURE' || el.contentEditable === 'false' || el.classList.contains('gze-ignorer');

// Pose les marques autour de chaque ligne non vide, espaces dehors (« *mot* » et non « * mot* »).
function enrober(x, marque) {
  return x.split('\n').map((l) => {
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(l);
    return m[2] ? m[1] + marque + m[2] + marque + m[3] : l;
  }).join('\n');
}
// Contenu en ligne d'une liste de nœuds. Les marques ne s'imbriquent pas
// (le format du texte ne sait pas lire « *a **b** c* »).
function enLigneNoeuds(noeuds, marques) {
  let s = '';
  for (const c of noeuds) {
    if (c.nodeType === Node.TEXT_NODE) { s += propre(c.nodeValue); continue; }
    if (c.nodeType !== Node.ELEMENT_NODE || ignore(c)) continue;
    const t = c.tagName;
    if (t === 'BR') s += '\n';
    else if (marques && (t === 'STRONG' || t === 'B')) s += enrober(enLigneNoeuds(c.childNodes, false), '**');
    else if (marques && (t === 'EM' || t === 'I')) s += enrober(enLigneNoeuds(c.childNodes, false), '*');
    else if (BLOCS.has(t)) s += '\n' + enLigneNoeuds(c.childNodes, marques) + '\n';
    else s += enLigneNoeuds(c.childNodes, marques);
  }
  return s;
}
const lignesNonVides = (s) => s.split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim());

/** Texte d'article (paragraphes, intertitres, citations, listes, ornements). */
export function versTexte(racine) {
  const blocs = [];
  let enAttente = [];   // nœuds en ligne hors de tout bloc (frappe directe dans la zone)
  const vider = () => {
    if (!enAttente.length) return;
    const l = lignesNonVides(enLigneNoeuds(enAttente, true));
    if (l.length) blocs.push(l.join('\n'));
    enAttente = [];
  };
  const bloc = (el) => {
    const t = el.tagName;
    if (ignore(el)) return;
    if (t === 'HR' || el.classList.contains('gz-orne')) { blocs.push('---'); return; }
    if (/^H[1-6]$/.test(t)) {
      const x = enLigneNoeuds(el.childNodes, true).replace(/\s*\n\s*/g, ' ').trim();
      if (x) blocs.push('## ' + x);
      return;
    }
    if (t === 'BLOCKQUOTE') {
      const l = lignesNonVides(enLigneNoeuds(el.childNodes, true));
      if (l.length) blocs.push(l.map((x) => '> ' + x.trim()).join('\n'));
      return;
    }
    if (t === 'UL' || t === 'OL') {
      const el2 = [...el.children].filter((li) => li.tagName === 'LI')
        .map((li) => enLigneNoeuds(li.childNodes, true).replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
      if (el2.length) blocs.push(el2.map((x) => '- ' + x).join('\n'));
      return;
    }
    // Paragraphe ; s'il contient lui-même des blocs (collage, navigateur), on y descend.
    if ([...el.children].some((c) => BLOCS.has(c.tagName) && !ignore(c))) { parcourir(el); return; }
    const l = lignesNonVides(enLigneNoeuds(el.childNodes, true));
    if (l.length) blocs.push(l.join('\n'));
  };
  const parcourir = (el) => {
    for (const c of el.childNodes) {
      if (c.nodeType === Node.ELEMENT_NODE && BLOCS.has(c.tagName)) { vider(); bloc(c); }
      else enAttente.push(c);
    }
    vider();
  };
  parcourir(racine);
  return blocs.join('\n\n');
}
/** Une ligne avec **gras** et *italique* (chapeau). */
export const versEnLigne = (el) => enLigneNoeuds(el.childNodes, true).replace(/\s*\n\s*/g, ' ');
/** Une ligne de texte brut. */
export const versLigne = (el) => enLigneNoeuds(el.childNodes, false).replace(/\s*\n\s*/g, ' ');
/** Texte brut, retours à la ligne gardés (oreilles). */
export const versLignes = (el) => enLigneNoeuds(el.childNodes, false).replace(/^\n+|\n+$/g, '').replace(/\n{2,}/g, '\n');

export function lireZone(el) {
  const def = CHAMPS[el.dataset.champ] || { type: 'ligne', max: 200 };
  const lire = { texte: versTexte, enligne: versEnLigne, lignes: versLignes, ligne: versLigne }[def.type] || versLigne;
  return lire(el).slice(0, def.max);
}

// ---------------------------------------------------------------------
// Rendre une zone modifiable
// ---------------------------------------------------------------------
const echapper = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const caretAuDebut = (el) => {
  const r = document.createRange(); r.selectNodeContents(el); r.collapse(true);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
};
const toutSelectionner = (el) => {
  const r = document.createRange(); r.selectNodeContents(el);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
};
const visible = (el) => el.offsetParent !== null || getComputedStyle(el).position === 'fixed';

/**
 * el : zone (data-champ) ; options :
 *   saisie(valeur)  à chaque frappe ;   entree()  quand on entre dans la zone ;
 *   modele          texte d'exemple (titre « Titre de l'article »…) : sélectionné à l'entrée,
 *                   pour être remplacé dès la première frappe.
 */
export function rendreModifiable(el, { saisie, entree, modele = null } = {}) {
  const def = CHAMPS[el.dataset.champ] || { type: 'ligne', libelle: el.dataset.champ };
  el.contentEditable = 'true';
  el.spellcheck = true;
  el.setAttribute('role', 'textbox');
  el.setAttribute('aria-label', def.libelle || el.dataset.champ);
  if (def.type === 'texte' || def.type === 'lignes') el.setAttribute('aria-multiline', 'true');
  el.addEventListener('focus', () => {
    if (entree) entree();
    if (modele && modele.test(el.textContent.trim())) setTimeout(() => { if (document.activeElement === el) toutSelectionner(el); }, 0);
  });
  el.addEventListener('input', (e) => {
    if (e.target !== el) return;   // frappe dans une zone imbriquée (légende d'une image dans le texte)
    const v = lireZone(el);
    el.classList.toggle('gz-champ-vide', !v.trim());
    if (saisie) saisie(v);
  });
  el.addEventListener('keydown', (e) => {
    if (e.target !== el) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); el.blur(); return; }
    // Ctrl+A : tout le texte de cette zone seulement (pas celui de la zone qui l'entoure,
    // pour la légende d'une image placée dans le texte).
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); toutSelectionner(el); return; }
    // Gras / italique : seulement là où le format les garde.
    if ((e.ctrlKey || e.metaKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())
      && (def.type === 'ligne' || def.type === 'lignes' || e.key.toLowerCase() === 'u')) { e.preventDefault(); return; }
    if (e.key === 'Enter' && !e.shiftKey && (def.type === 'ligne' || def.type === 'enligne')) {
      // Une seule ligne : Entrée passe à la zone suivante de l'article (ou du bandeau).
      e.preventDefault();
      const groupe = el.closest('.gz-article, .gz-bandeau') || el.parentElement;
      const zones = [...groupe.querySelectorAll('[data-champ]')].filter((z) => z.isContentEditable && visible(z));
      const suivante = zones[zones.indexOf(el) + 1];
      if (suivante) { suivante.focus(); caretAuDebut(suivante); } else el.blur();
    }
  });
  // Collage : texte seul (pas de styles venus d'ailleurs).
  el.addEventListener('paste', (e) => {
    if (e.target !== el && !el.contains(e.target)) return;
    e.preventDefault();
    let t = propre((e.clipboardData || window.clipboardData).getData('text/plain') || '').replace(/\r/g, '');
    if (def.type === 'texte') {
      const paras = t.split(/\n\s*\n/).map((p) => echapper(p.trim()).replace(/\n/g, '<br>')).filter(Boolean);
      if (paras.length <= 1) document.execCommand('insertText', false, t.replace(/^\s*\n|\n\s*$/g, '').replace(/\n/g, ' '));
      else document.execCommand('insertHTML', false, paras.map((p) => '<p>' + p + '</p>').join(''));
    } else if (def.type === 'lignes') {
      document.execCommand('insertText', false, t);
    } else {
      document.execCommand('insertText', false, t.replace(/\s*\n\s*/g, ' '));
    }
  });
  // Pas de dépôt de texte ou de fichier dans la zone (un article glissé ici est
  // déposé dans la colonne : l'événement continue jusqu'à elle).
  el.addEventListener('drop', (e) => e.preventDefault());
}

// ---------------------------------------------------------------------
// Barre de mise en forme (texte et chapeau des articles)
// ---------------------------------------------------------------------
function blocCourant(racine) {
  const s = getSelection();
  if (!s.rangeCount) return null;
  let n = s.getRangeAt(0).startContainer;
  if (n.nodeType === Node.TEXT_NODE) n = n.parentElement;
  while (n && n !== racine && !(n.parentElement === racine)) n = n.parentElement;
  return n && n !== racine ? n : null;
}

/**
 * Barre G / I / Intertitre / Citation / Liste / Ornement, affichée au-dessus de la zone active,
 * et, pour le texte d'un article, l'alignement (aligner(zone, 'gauche' | 'justifie' | 'droite')).
 */
export function barreFormat({ aligner = null } = {}) {
  let zoneActive = null;
  const cmd = (fn) => (e) => {
    e.preventDefault();   // garder le curseur et la sélection dans la zone
    if (!zoneActive) return;
    zoneActive.focus();
    fn(zoneActive);
    zoneActive.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const basculerBloc = (balise) => (z) => {
    const b = blocCourant(z);
    const deja = b && b.tagName === balise.toUpperCase();
    document.execCommand('formatBlock', false, deja ? 'p' : balise);
  };
  const bouton = (texte, titre, fn, bloc = false) => h('button', {
    type: 'button', class: 'gze-mini' + (bloc ? ' gze-bloc' : ''), title: titre, onmousedown: cmd(fn)
  }, texte);
  const barre = h('div', { class: 'gze-format', role: 'toolbar', 'aria-label': 'Mise en forme', hidden: true },
    bouton(h('b', {}, 'G'), 'Gras (Ctrl+B)', () => document.execCommand('bold')),
    bouton(h('i', {}, 'I'), 'Italique (Ctrl+I)', () => document.execCommand('italic')),
    bouton('Intertitre', 'Intertitre (ligne en gras, seule)', basculerBloc('h4'), true),
    bouton('« Citation »', 'Citation', basculerBloc('blockquote'), true),
    bouton('• Liste', 'Liste à puces', () => document.execCommand('insertUnorderedList'), true),
    bouton('❦', 'Ornement (séparation)', () => document.execCommand('insertHTML', false, '<p class="gz-orne">❦</p><p><br></p>'), true));
  // Alignement du texte de l'article (gauche, justifié, droite)
  const ALIGNS = [['gauche', 'Aligner à gauche', '⫷'], ['justifie', 'Justifier', '☰'], ['droite', 'Aligner à droite', '⫸']];
  const boutonsAlign = aligner ? ALIGNS.map(([v, titre, icone]) => {
    const b = bouton(icone, titre, (z) => { aligner(z, v); majAlign(z); }, true);
    b.classList.add('gze-aligne'); b.dataset.align = v; b.setAttribute('aria-label', titre);
    return b;
  }) : [];
  const alignDe = (z) => (z.classList.contains('gz-al-gauche') ? 'gauche' : z.classList.contains('gz-al-droite') ? 'droite' : 'justifie');
  const majAlign = (z) => boutonsAlign.forEach((b) => b.classList.toggle('actif', b.dataset.align === alignDe(z)));
  if (boutonsAlign.length) barre.append(h('span', { class: 'gze-sep gze-aligne', 'aria-hidden': 'true' }), ...boutonsAlign);
  return {
    el: barre,
    /** Affiche la barre pour la zone z (texte ou chapeau), placée au-dessus d'elle. */
    montrer(z) {
      zoneActive = z;
      const def = CHAMPS[z.dataset.champ] || {};
      barre.classList.toggle('gze-format-court', def.type !== 'texte');
      if (def.type === 'texte') majAlign(z);
      barre.hidden = false;
      const conteneur = barre.offsetParent || document.body;
      const rc = conteneur.getBoundingClientRect(), rz = z.getBoundingClientRect();
      barre.style.left = Math.max(0, rz.left - rc.left + conteneur.scrollLeft) + 'px';
      barre.style.top = Math.max(0, rz.top - rc.top + conteneur.scrollTop - barre.offsetHeight - 4) + 'px';
    },
    cacher(z) { if (!z || z === zoneActive) { zoneActive = null; barre.hidden = true; } }
  };
}
