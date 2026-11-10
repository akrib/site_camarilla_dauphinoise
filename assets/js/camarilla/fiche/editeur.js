// =====================================================================
// Éditeur de fiche de personnage MET 8.0.2
// ---------------------------------------------------------------------
// Reprend les onglets du fichier Excel (Personnage, Historiques,
// Serviteur, Equipement, Gestion des mentorats, Résumé imprimable).
// Sur ordinateur : un onglet = une page proche de l'Excel.
// Sur mobile : la fiche est découpée en petites sections.
// Les « ⓘ » ouvrent la description tirée des règles (chargée à la demande).
// =====================================================================
import { h } from '../core.js';
import { REF } from './referentiel.js';
import { normaliser, nombre } from './modele.js';
import {
  calculer, ECARTS, atoutsDisponibles, handicapsDisponibles, libelleAtout, libelleRituel, disciplinesDeClan,
  disciplineRef, rituelDe, cle, clanDe,
} from './calculs.js';
import { boutonInfo, chercherDescription } from './descriptions.js';

const GROUPES = [
  ['personnage', 'Personnage'], ['historiques', 'Historiques'], ['serviteurs', 'Serviteurs'],
  ['equipement', 'Équipement'], ['mentorats', 'Mentorats'], ['resume', 'Résumé imprimable'],
];
const MOBILE = window.matchMedia('(max-width: 760px)');
const niveaux = (max) => Array.from({ length: max }, (_, i) => i + 1);
const rempli = (v) => String(v ?? '').trim() !== '';
const sansCout = (lib) => String(lib || '').replace(/\s*\((?:cout|niveau)\s*\d+\)\s*$/i, '').trim();
const signe = (n) => (n > 0 ? '+' + n : String(n));

export function creerEditeur({ fiche, modifiable = true, surModification } = {}) {
  const F = normaliser(fiche);
  let R = calculer(F);
  const dis = !modifiable;
  const vues = new Map(); // id de section → fonctions de mise à jour des valeurs calculées
  let sectionEnCours = null;
  let minuteur = null;

  // ------------------------------------------------------------ données
  const lire = (chemin) => chemin.split('.').reduce((o, k) => (o == null ? o : o[k]), F);
  function ecrire(chemin, v) {
    const ks = chemin.split('.');
    const dernier = ks.pop();
    const o = ks.reduce((x, k) => x[k], F);
    o[dernier] = v;
  }
  function planifier(immediat) {
    clearTimeout(minuteur);
    const go = () => { R = calculer(F); majVues(); if (surModification) surModification(); };
    if (immediat) go(); else minuteur = setTimeout(go, 150);
  }
  function majVues() {
    for (const liste of vues.values()) liste.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    majBarre();
  }
  /** Zone affichant une valeur calculée, rafraîchie à chaque recalcul. */
  function calc(fn, cls = 'fiche-calc') {
    const el = h('output', { class: cls });
    const maj = () => { const v = fn(); el.textContent = v === '' || v === null || v === undefined ? '—' : String(v); };
    maj();
    if (!vues.has(sectionEnCours)) vues.set(sectionEnCours, []);
    vues.get(sectionEnCours).push(maj);
    return el;
  }
  function vue(fn) {
    if (!vues.has(sectionEnCours)) vues.set(sectionEnCours, []);
    vues.get(sectionEnCours).push(fn);
    fn();
  }

  // ------------------------------------------------------------ champs
  function texte(chemin, attrs = {}) {
    return h('input', {
      type: 'text', value: lire(chemin) ?? '', disabled: dis, ...attrs,
      oninput: (e) => { ecrire(chemin, e.target.value); planifier(); },
    });
  }
  function zone(chemin, attrs = {}) {
    const t = h('textarea', { disabled: dis, rows: 3, ...attrs, oninput: (e) => { ecrire(chemin, e.target.value); planifier(); } });
    t.value = lire(chemin) ?? '';
    return t;
  }
  function nombreChamp(chemin, attrs = {}) {
    return h('input', {
      type: 'number', inputmode: 'numeric', value: lire(chemin) ?? '', disabled: dis, class: 'court', ...attrs,
      oninput: (e) => { ecrire(chemin, e.target.value === '' ? '' : Number(e.target.value)); planifier(); },
    });
  }
  function dateChamp(chemin) {
    return h('input', {
      type: 'date', value: /^\d{4}-\d{2}-\d{2}$/.test(lire(chemin) || '') ? lire(chemin) : '', disabled: dis, min: '0001-01-01',
      onchange: (e) => { ecrire(chemin, e.target.value); planifier(); },
    });
  }
  /**
   * Liste déroulante. valeurs : chaînes, [valeur, libellé] ou { groupe, valeurs }.
   * Une valeur enregistrée absente de la liste est conservée (marquée « hors liste »).
   */
  function liste(chemin, valeurs, { vide = '—', apres, numerique = false, attrs = {} } = {}) {
    const actuelle = lire(chemin) ?? '';
    const sel = h('select', { disabled: dis, ...attrs });
    const opt = (v) => {
      const [val, lib] = Array.isArray(v) ? v : [v, v];
      return h('option', { value: val, selected: String(val) === String(actuelle) }, lib);
    };
    const enfants = [h('option', { value: '' }, vide)];
    let trouve = actuelle === '';
    const marquer = (v) => { if (String(Array.isArray(v) ? v[0] : v) === String(actuelle)) trouve = true; };
    for (const v of valeurs) {
      if (v && typeof v === 'object' && !Array.isArray(v) && v.groupe) {
        if (!v.valeurs.length) continue;
        v.valeurs.forEach(marquer);
        enfants.push(h('optgroup', { label: v.groupe }, v.valeurs.map(opt)));
      } else { marquer(v); enfants.push(opt(v)); }
    }
    if (!trouve) enfants.push(h('option', { value: actuelle, selected: true }, actuelle + ' (hors liste)'));
    sel.append(...enfants);
    sel.addEventListener('change', () => {
      const v = sel.value;
      ecrire(chemin, numerique && v !== '' ? Number(v) : v);
      if (apres) { planifier(true); apres(v); } else planifier();
    });
    return sel;
  }
  const niveau = (chemin, max = 10, opts = {}) => liste(chemin, niveaux(max), { numerique: true, attrs: { class: 'court' }, ...opts });

  /** Bloc libellé + champ (+ bouton description). */
  function champ(libelle, controle, { info, cls = '' } = {}) {
    return h('div', { class: 'fiche-champ ' + cls }, h('label', {}, libelle, info || ''), controle);
  }
  const info = (titre, demandes) => boutonInfo(titre, demandes);
  const infoListe = (cat, chemin, prefixe) => boutonInfo(() => sansCout(lire(chemin)), () => [{ cat, nom: (prefixe ? prefixe() + ' / ' : '') + sansCout(lire(chemin)) }]);

  /** Lignes répétées : affiche les lignes remplies + quelques vides, bouton pour en ajouter. */
  function lignes(n, estRemplie, rendreLigne, { videsVisibles = 2, classe = '' } = {}) {
    const conteneur = h('div', { class: 'fiche-lignes ' + classe });
    const elts = Array.from({ length: n }, (_, i) => rendreLigne(i));
    let dernierePleine = -1;
    for (let i = 0; i < n; i++) if (estRemplie(i)) dernierePleine = i;
    const visibles = dis ? dernierePleine + 1 : Math.min(n, dernierePleine + 1 + videsVisibles);
    elts.forEach((e, i) => { if (i >= Math.max(visibles, dis ? 0 : 1)) e.hidden = true; conteneur.append(e); });
    if (!dis && visibles < n) {
      const plus = h('button', {
        type: 'button', class: 'petit secondaire fiche-plus', onclick: () => {
          const cachee = elts.find((e) => e.hidden);
          if (cachee) cachee.hidden = false;
          if (!elts.some((e) => e.hidden)) plus.remove();
        },
      }, '＋ ligne');
      conteneur.append(plus);
    }
    if (dis && dernierePleine < 0) conteneur.append(h('p', { class: 'sous-titre' }, 'Aucun.'));
    return conteneur;
  }

  // ------------------------------------------------------------ sections
  const SECTIONS = [
    { id: 'identite', titre: 'Identité', groupe: 'personnage', rendre: rendreIdentite },
    { id: 'atouts', titre: 'Atouts et handicaps', groupe: 'personnage', rendre: rendreAtouts },
    { id: 'attributs', titre: 'Attributs', groupe: 'personnage', rendre: rendreAttributs },
    { id: 'competences', titre: 'Compétences', groupe: 'personnage', rendre: rendreCompetences },
    { id: 'disciplines', titre: 'Disciplines', groupe: 'personnage', rendre: rendreDisciplines },
    { id: 'techniques', titre: 'Techniques et rituels', groupe: 'personnage', rendre: rendreTechniques },
    { id: 'historiques', titre: 'Historiques', groupe: 'historiques', rendre: rendreHistoriques },
    { id: 'serviteurs', titre: 'Serviteurs', groupe: 'serviteurs', rendre: rendreServiteurs },
    { id: 'equipement', titre: 'Équipement', groupe: 'equipement', rendre: rendreEquipement },
    { id: 'mentorats', titre: 'Mentorats', groupe: 'mentorats', rendre: rendreMentorats },
    { id: 'resume', titre: 'Résumé', groupe: 'resume', rendre: rendreResume },
  ];
  const conteneurs = new Map();
  function rafraichir(...ids) {
    for (const id of ids) {
      const s = SECTIONS.find((x) => x.id === id);
      const c = conteneurs.get(id);
      if (!s || !c) continue;
      vues.delete(id);
      sectionEnCours = id;
      c.replaceChildren(...[].concat(s.rendre()));
      sectionEnCours = null;
    }
  }

  // ===================================================== PERSONNAGE
  function rendreIdentite() {
    const faiblesse = h('div', { class: 'fiche-faiblesse' });
    const chargerFaiblesse = async () => {
      if (!F.clan) { faiblesse.textContent = 'Choisissez un clan.'; return; }
      faiblesse.textContent = '…';
      try {
        const e = await chercherDescription('faiblesses', F.clan);
        faiblesse.textContent = e ? e.t : 'Texte non disponible (référentiel non importé).';
      } catch (err) { faiblesse.textContent = 'Texte réservé aux membres : non disponible.'; }
    };
    chargerFaiblesse();
    return [
      h('div', { class: 'fiche-grille' },
        champ('Nom', texte('nom', { maxlength: 80 }), { cls: 'large' }),
        champ('Type de fiche', liste('typeFiche', REF.typesFiche, { apres: () => rafraichir('atouts') }), { info: info('Antagoniste', [{ cat: 'notions', nom: 'Antagoniste' }]) }),
        champ('Secte', liste('secte', REF.sectes, { apres: () => rafraichir('atouts') }), { info: infoListe('sectes', 'secte') }),
        champ('Race', liste('race', REF.races)),
        champ('Âge', liste('age', REF.ages)),
        champ('Clan', liste('clan', REF.clans.map((c) => c.nom), { apres: () => rafraichir('identite', 'atouts', 'competences', 'disciplines') }),
          { info: boutonInfo(() => F.clan, () => [{ cat: 'clans', nom: F.clan }, { cat: 'faiblesses', nom: F.clan, titre: 'Faiblesse de clan (fiche Excel)' }]), cls: 'large' })),
      h('div', { class: 'fiche-champ pleine' }, h('label', {}, 'Faiblesse de clan'), faiblesse),
      h('div', { class: 'fiche-grille' },
        champ('Nom véritable', texte('nomVeritable')), champ('Naissance', dateChamp('naissance')), champ('Lieu de naissance', texte('lieuNaissance')),
        champ('Lignée', texte('lignee')), champ('Étreinte', dateChamp('etreinte')), champ("Lieu d'étreinte", texte('lieuEtreinte')),
        champ('Infants', texte('infants')), champ('Torpeurs (en mois)', nombreChamp('torpeursMois', { min: 0 })), champ('Temps de goule (en mois)', nombreChamp('tempsGouleMois', { min: 0 })),
        champ('Classe', calc(() => R.classe)), champ('Créé le', dateChamp('creeLe')), champ('Absence (en mois)', nombreChamp('absenceMois', { min: 0 })),
        champ('Durée de jeu (mois)', calc(() => R.moisDeJeu)), champ('Durée de jeu (années)', calc(() => R.anneesDeJeu)), champ('Âge vampirique', nombreChamp('ageVampirique', { min: 0 })),
        champ('Expérience gratuite (diablerie, ancien système)', nombreChamp('xpGratuite'), { cls: 'large' })),
      h('div', { class: 'fiche-grille' },
        champ('Concept', texte('concept'), { cls: 'pleine' }),
        champ('Génération', niveauGen(), { info: info('Génération', [{ cat: 'notions', nom: 'Génération' }, { cat: 'historiques', nom: 'Génération', titre: 'Historique Génération' }]) }),
        champ('Voie', liste('voie', REF.voies, { apres: () => rafraichir('atouts') }), { info: infoListe('voies', 'voie'), cls: 'large' }),
        champ("Score d'éthique", calc(() => R.ethique), { info: info('Éthique', [{ cat: 'notions', nom: 'Éthique' }]) }),
        champ("Points d'éthique regagnés", nombreChamp('ethiqueRegagnee', { min: 0 })),
        champ("Points d'éthique perdus", nombreChamp('ethiquePerdue', { min: 0 })),
        champ('Archétype', liste('archetype', REF.archetypes), { info: boutonInfo(() => F.archetype || 'Archétype', () => [{ cat: 'archetypes', nom: F.archetype }, { cat: 'notions', nom: 'Archétype', titre: 'Archétype (règles)' }]), cls: 'large' }),
        champ('Archétype personnalisé', texte('archetypePerso'), { cls: 'large' }),
        champ('Statut interne au clan', texte('statutClan'), { cls: 'large' }),
        champ('Notes / divers', zone('notes', { rows: 4 }), { cls: 'pleine' })),
      blocExperience(),
    ];
  }
  function niveauGen() {
    return liste('generation', REF.generations.map((g) => [g, g + 'e']), { numerique: true, apres: () => rafraichir('historiques') });
  }
  function blocExperience() {
    const lignesXp = [
      ['Attributs', 'attributs'], ['Compétences', 'competences'], ['Disciplines', 'disciplines'], ['Historiques', 'historiques'],
      ['Rituels', 'rituels'], ["Pouvoirs d'ancien", 'anciens'], ['Atouts et handicaps', 'atoutsHandicaps'], ['Techniques', 'techniques'],
      ['Éthique regagnée', 'ethique'], ['Changement de focus', 'changementFocus'], ['Rachat de handicap', 'rachatHandicap'],
      ['Oubli d\'atout', 'oubliAtout'], ['Culte personnel / Bosquet', 'culte'], ['Royauté Ventrue / Attraper un tueur', 'royaute'],
    ];
    return h('details', { class: 'fiche-xp-detail', open: !MOBILE.matches },
      h('summary', {}, 'Détail de l\'expérience', info('Dépense des PX', [{ cat: 'notions', nom: 'Expérience' }, { cat: 'notions', nom: 'Dépense des PX' }])),
      h('div', { class: 'fiche-xp-table' },
        lignesXp.map(([lib, k]) => h('div', { class: 'ligne' }, h('span', {}, lib), calc(() => R.xp[k]))),
        h('div', { class: 'ligne total' }, h('span', {}, 'Expérience dépensée'), calc(() => R.xp.depensee)),
        h('div', { class: 'ligne' }, h('span', {}, 'Expérience de base'), calc(() => R.xp.base)),
        h('div', { class: 'ligne' }, h('span', {}, 'Expérience gagnée (durée)'), calc(() => R.xp.gagnee)),
        h('div', { class: 'ligne total' }, h('span', {}, 'Expérience acquise'), calc(() => R.xp.acquise)),
        h('div', { class: 'ligne total' }, h('span', {}, 'Expérience restante'), calc(() => R.xp.restante))),
      h('p', { class: 'sous-titre' }, 'Coûts selon la génération : attribut ', calc(() => R.couts.attribut ?? '—'), ' · compétence ', calc(() => R.couts.competence ?? '—'),
        ' · historique ', calc(() => R.couts.historique ?? '—'), ' · discipline de clan ', calc(() => R.couts.disciplineClan ?? '—'),
        ' / hors clan ', calc(() => R.couts.disciplineHorsClan ?? '—'), ' · technique ', calc(() => R.couts.technique ?? '—'),
        ' · rituel ', calc(() => R.couts.rituel ?? '—'), ' · pouvoir d\'ancien ', calc(() => R.couts.ancienClan ?? '—'), ' / ', calc(() => R.couts.ancienHorsClan ?? '—'), '.'),
      h('details', { class: 'fiche-ecarts' }, h('summary', {}, 'Différences avec le fichier Excel'),
        h('ul', {}, ECARTS.map((t) => h('li', {}, t)))));
  }

  function rendreAtouts() {
    const groupesA = groupesAtouts(atoutsDisponibles(F));
    const groupesH = groupesAtouts(handicapsDisponibles(F));
    const colonne = (titre, chemin, groupes, cat, cout) => h('div', { class: 'fiche-col' },
      h('h4', {}, titre),
      lignes(7, (i) => rempli(F[chemin][i]), (i) => h('div', { class: 'fiche-ligne' },
        liste(`${chemin}.${i}`, groupes),
        cout ? calc(() => (rempli(F[chemin][i]) ? signe(chemin === 'atouts' ? R.atouts.couts[i] : R.handicaps.couts[i]) : ''), 'fiche-calc mini') : '',
        infoListe(cat, `${chemin}.${i}`)), { videsVisibles: 1 }));
    const fragment = REF.clans.filter((c) => c.nom !== F.clan)
      .map((c) => ({ groupe: c.nom, valeurs: (REF.atouts.clan[c.nom] || []).filter((a) => a.cout <= 2).map(libelleAtout) }));
    const propice = REF.atouts.generaux.filter((a) => a.cout <= 3).map(libelleAtout);
    return [
      h('div', { class: 'fiche-colonnes trois' },
        colonne('Atouts', 'atouts', groupesA, 'atouts', true),
        colonne('Handicaps', 'handicaps', groupesH, 'handicaps', true),
        colonne('Handicaps supplémentaires (au-delà de 7 points ou gagnés en jeu)', 'handicapsSupp', groupesH, 'handicaps', false)),
      h('div', { class: 'fiche-grille' },
        champ("Coût de la voie d'éthique", calc(() => R.atouts.voie)),
        champ('Coût de lignée', calc(() => R.atouts.lignee)),
        champ('Coût de rareté', calc(() => R.atouts.rarete)),
        champ("Total des points d'atouts", calc(() => R.atouts.total)),
        champ("Total des points de handicaps (max. 7)", calc(() => R.handicaps.total + (R.handicaps.brut > 7 ? ' (' + R.handicaps.brut + ')' : ''))),
        champ('Rachat de handicap', nombreChamp('rachatHandicap', { min: 0 })),
        champ("Oubli d'atout", nombreChamp('oubliAtout', { min: 0 })),
        champ('Atout « Fragment restant »', liste('atoutFragment', fragment), { info: infoListe('atouts', 'atoutFragment'), cls: 'large' }),
        champ('Atout « Propice »', liste('atoutPropice', propice), { info: infoListe('atouts', 'atoutPropice'), cls: 'large' }),
        champ('Précisions atouts / handicaps', zone('precisionsAtouts', { rows: 4 }), { cls: 'pleine' })),
      h('h4', {}, 'Dérangements', info('Dérangements', [{ cat: 'notions', nom: 'Dérangements' }])),
      h('div', { class: 'fiche-colonnes trois' }, F.derangements.map((_, i) => h('div', { class: 'fiche-carte' },
        h('div', { class: 'fiche-ligne' }, liste(`derangements.${i}.type`, REF.derangements, { vide: 'Dérangement ?' }), infoListe('derangements', `derangements.${i}.type`)),
        champ('Coût', liste(`derangements.${i}.cout`, REF.coutsDerangement, { numerique: true, vide: 'Coût ?' })),
        champ('Description', zone(`derangements.${i}.description`, { rows: 2 }))))),
      h('details', { class: 'fiche-sous' }, h('summary', {}, 'Liens de sang', info('Lien de sang', [{ cat: 'notions', nom: 'Lien de sang' }])),
        h('div', { class: 'fiche-table-tete quatre' }, h('span', {}, 'Maître'), h('span', {}, 'Vassal'), h('span', {}, 'Niveau'), h('span', {}, 'Date')),
        lignes(10, (i) => rempli(F.liensSang[i].maitre) || rempli(F.liensSang[i].vassal), (i) => h('div', { class: 'fiche-table-ligne quatre' },
          texte(`liensSang.${i}.maitre`, { 'aria-label': 'Maître' }), texte(`liensSang.${i}.vassal`, { 'aria-label': 'Vassal' }),
          niveau(`liensSang.${i}.niveau`, 3), texte(`liensSang.${i}.date`, { 'aria-label': 'Date' })))),
    ];
  }
  function groupesAtouts(liste) {
    const g = new Map();
    for (const a of liste) {
      if (!g.has(a.origine)) g.set(a.origine, []);
      g.get(a.origine).push(libelleAtout(a));
    }
    return [...g].map(([groupe, valeurs]) => ({ groupe, valeurs }));
  }

  function rendreAttributs() {
    const cats = [['physique', 'Physique', 'Attributs Physiques'], ['social', 'Social', 'Attributs Sociaux'], ['mental', 'Mental', 'Attributs Mentaux']];
    return [
      h('div', { class: 'fiche-colonnes trois' }, cats.map(([k, lib, desc]) => h('div', { class: 'fiche-carte' },
        h('h4', {}, lib, info(desc, [{ cat: 'attributs', nom: desc }])),
        h('div', { class: 'fiche-grille serree' },
          champ('Valeur', nombreChamp(`attributs.${k}.valeur`, { min: 0, max: 15 })),
          champ('Bonus', nombreChamp(`attributs.${k}.bonus`))),
        h('label', {}, 'Focus', info('Focus', [{ cat: 'notions', nom: 'Focus' }])),
        F.attributs[k].focus.map((_, i) => h('div', { class: 'fiche-ligne' },
          liste(`attributs.${k}.focus.${i}`, REF.focus[lib]), infoListe('focus', `attributs.${k}.focus.${i}`)))))),
      h('div', { class: 'fiche-grille' },
        champ('Changement de focus (nombre)', nombreChamp('changementFocus', { min: 0 }), { info: info('Focus', [{ cat: 'focus', nom: 'Force' }, { cat: 'notions', nom: 'Focus' }]) }),
        champ('Points de sang', calc(() => R.sang), { info: info('Point de sang', [{ cat: 'notions', nom: 'Point de sang' }]) }),
        champ('Max. par tour', calc(() => R.sangParTour)),
        champ('Volonté', calc(() => R.volonte), { info: info('Volonté', [{ cat: 'notions', nom: 'Volonté' }]) })),
    ];
  }

  function rendreCompetences() {
    const ligneComp = (nom) => h('div', { class: 'fiche-ligne comp' },
      h('span', { class: 'nom' }, nom, info(nom, [{ cat: 'competences', nom }])),
      ['Expérience de la Rue', 'Survie'].includes(nom)
        ? liste(`voyageurChevronne.${nom}`, ['Oui', 'Non'], { vide: 'Voy. Chevr. ?', attrs: { class: 'court', title: 'Voyageur Chevronné' } }) : '',
      niveau(`competences.${nom}`));
    const listeLibre = (titre, chemin, n, extra) => h('div', { class: 'fiche-carte' },
      h('h4', {}, titre, info(titre, [{ cat: 'competences', nom: titre }])),
      extra || '',
      lignes(n, (i) => rempli(F[chemin][i].nom) || rempli(F[chemin][i].niveau), (i) => h('div', { class: 'fiche-ligne' },
        texte(`${chemin}.${i}.nom`, { placeholder: 'Spécialité', 'aria-label': titre }), niveau(`${chemin}.${i}.niveau`))));
    const caitiff = clanDe(F) && /^ca[iï]tiff/i.test(clanDe(F).nom);
    const cardinales = REF.disciplinesCardinales;
    const troisieme = R.particularites.atouts.vestiges ? REF.disciplinesExotiques : cardinales;
    const autoMystere = (i) => [F.secte, F.clan, F.race][i] || ['Secte', 'Clan', 'Race'][i];
    return [
      h('div', { class: 'fiche-colonnes trois' },
        h('div', { class: 'fiche-carte' },
          h('h4', {}, 'Compétences'),
          REF.competences.map(ligneComp),
          h('h4', {}, 'Autres compétences'),
          lignes(8, (i) => rempli(F.competencesLibres[i].nom), (i) => h('div', { class: 'fiche-ligne' },
            texte(`competencesLibres.${i}.nom`, { placeholder: 'Compétence', 'aria-label': 'Compétence' }), niveau(`competencesLibres.${i}.niveau`)), { videsVisibles: 1 })),
        h('div', {},
          listeLibre('Sciences', 'sciences', 10),
          listeLibre('Artisanat', 'artisanat', 10,
            champ("Bénédiction de l'Artiste (1re ligne)", liste('beneficeArtisanat', ['Oui', 'Non'], { vide: 'Béné. Arti ?', attrs: { class: 'court' } }))),
          listeLibre('Représentation', 'representation', 9,
            champ("Bénédiction de l'Artiste (1re ligne)", liste('beneficeRepresentation', ['Oui', 'Non'], { vide: 'Béné. Arti ?', attrs: { class: 'court' } })))),
        h('div', {},
          h('div', { class: 'fiche-carte' },
            h('h4', {}, 'Mystères', info('Mystères', [{ cat: 'competences', nom: 'Mystères' }])),
            champ('Niveau', niveau('mysteres.niveau')),
            h('label', {}, 'Spécialités'),
            lignes(25, (i) => i < 3 || rempli(F.mysteres.specialites[i].nom), (i) => h('div', { class: 'fiche-ligne' },
              i < 3 ? h('span', { class: 'nom auto' }, calc(() => autoMystere(i))) : liste(`mysteres.specialites.${i}.nom`, REF.factionsMystere),
              niveau(`mysteres.specialites.${i}.niveau`)), { videsVisibles: 1 })),
          h('div', { class: 'fiche-carte' },
            h('h4', {}, 'Linguistique', info('Linguistique', [{ cat: 'competences', nom: 'Linguistique' }])),
            h('div', { class: 'fiche-grille serree' },
              champ('Niveau', niveau('linguistique')),
              champ('Langues connues', calc(() => R.langues))),
            lignes(15, (i) => rempli(F.langues[i]), (i) => texte(`langues.${i}`, { placeholder: 'Langue', 'aria-label': 'Langue ' + (i + 1) }), { videsVisibles: 1 })),
          h('div', { class: 'fiche-carte' },
            champ('Don infernal', liste('donInfernal', REF.donsInfernaux)),
            caitiff ? [h('label', {}, 'Disciplines Caïtiff'),
              [0, 1, 2].map((i) => liste(`disciplinesCaitiff.${i}`, i < 2 ? cardinales : troisieme, { apres: () => rafraichir('disciplines') }))] : ''))),
    ];
  }

  function rendreDisciplines() {
    const clanDisc = disciplinesDeClan(F);
    const selectionnables = REF.disciplines.filter((d) => d.selectionnable).map((d) => d.nom);
    const ligne = (i) => {
      const d = F.disciplines[i];
      const nom = i < 3 ? clanDisc[i] : d.nom;
      const ref = disciplineRef(nom);
      const niv = Math.min(nombre(d.niveau), 5);
      const pouvoirs = ref ? ref.pouvoirs.map((p, n) => h('li', { class: n < niv ? 'acquis' : '' },
        h('span', { class: 'points' }, '•'.repeat(n + 1)), ' ', p, n < niv ? info(p, [{ cat: 'pouvoirs', nom: ref.nom + ' / ' + p }]) : '')) : [];
      return h('div', { class: 'fiche-disc' + (i < 3 ? ' clan' : '') },
        h('div', { class: 'fiche-disc-tete' },
          i < 3 ? h('strong', { class: 'nom' }, nom || '(discipline de clan)') : liste(`disciplines.${i}.nom`, selectionnables, { apres: () => rafraichir('disciplines') }),
          ref ? info(ref.nom, [{ cat: 'disciplines', nom: ref.nom }]) : '',
          h('span', { class: 'fiche-disc-niv' }, h('label', {}, 'Niveau'), niveau(`disciplines.${i}.niveau`, 6, { apres: () => rafraichir('disciplines') })),
          h('span', { class: 'fiche-disc-type' }, h('label', { title: 'C : de clan, H : hors clan, G : gratuite' }, 'C/H/G'), liste(`disciplines.${i}.type`, REF.typesDiscipline, { attrs: { class: 'court' } })),
          calc(() => (R.details.disciplines[i] ? R.details.disciplines[i] + ' PX' : ''), 'fiche-calc mini')),
        ref ? h('ol', { class: 'fiche-pouvoirs' }, pouvoirs) : '',
        ref && ref.anciens.length ? h('div', { class: 'fiche-anciens' },
          h('label', {}, "Pouvoirs d'ancien"),
          d.anciens.map((_, k) => h('div', { class: 'fiche-ligne' },
            liste(`disciplines.${i}.anciens.${k}`, ref.anciens), infoListe('anciens', `disciplines.${i}.anciens.${k}`, () => ref.nom)))) : '');
    };
    return [
      h('p', { class: 'sous-titre' }, 'Les trois premières lignes sont les disciplines de clan (choisies par le clan ; pour un Caïtiff, dans Compétences).'),
      lignes(15, (i) => i < 3 || rempli(F.disciplines[i].nom), ligne, { videsVisibles: 1, classe: 'fiche-discs' }),
    ];
  }

  function rendreTechniques() {
    const rituels = [...new Set(REF.rituels.map((r) => r.type))].map((type) => ({
      groupe: type, valeurs: REF.rituels.filter((r) => r.type === type).map(libelleRituel),
    }));
    return h('div', { class: 'fiche-colonnes deux' },
      h('div', { class: 'fiche-carte' },
        h('h4', {}, 'Techniques', calc(() => (R.couts.technique === 'X' ? ' (inaccessibles à cette génération)' : R.couts.technique ? ' — ' + R.couts.technique + ' PX chacune' : ''), 'fiche-calc mini')),
        lignes(20, (i) => rempli(F.techniques[i]), (i) => h('div', { class: 'fiche-ligne' },
          liste(`techniques.${i}`, REF.techniques), infoListe('techniques', `techniques.${i}`)))),
      h('div', { class: 'fiche-carte' },
        h('h4', {}, 'Rituels', calc(() => (R.couts.rituel ? ' — ' + R.couts.rituel + ' PX par niveau' : ''), 'fiche-calc mini')),
        lignes(50, (i) => rempli(F.rituels[i]), (i) => h('div', { class: 'fiche-ligne' },
          liste(`rituels.${i}`, rituels), calc(() => { const r = rituelDe(F.rituels[i]); return r ? 'niv. ' + r.niveau : ''; }, 'fiche-calc mini'),
          infoListe('rituels', `rituels.${i}`)))));
  }

  // ===================================================== HISTORIQUES
  function rendreHistoriques() {
    const H = 'historiques';
    const ih = (nom) => info(nom, [{ cat: 'historiques', nom }]);
    const influence = (k, titre) => h('div', { class: 'fiche-carte ' + k },
      h('h4', {}, titre, ih(titre)),
      champ('Niveau', niveau(`${H}.${k}.niveau`)),
      h('label', {}, 'Spécialisations'),
      lignes(10, (i) => rempli(F.historiques[k].specialisations[i]), (i) => texte(`${H}.${k}.specialisations.${i}`, { 'aria-label': 'Spécialisation', maxlength: 80 })));
    return [
      h('div', { class: 'fiche-colonnes trois' },
        influence('gotha', 'Gotha'), influence('pegre', 'Pègre'),
        h('div', { class: 'fiche-carte' },
          h('h4', {}, 'Génération', ih('Génération')),
          champ('Niveau', calc(() => R.niveauGeneration ?? '—')),
          h('h4', {}, 'Ressources', ih('Ressources')),
          h('div', { class: 'fiche-grille serree' },
            champ('Niveau', niveau(`${H}.ressources`)),
            champ('Argent liquide par mois', calc(() => (R.argent === '' ? '' : R.argent.toLocaleString('fr-FR')))))),
      ),
      h('div', { class: 'fiche-colonnes trois' },
        h('div', { class: 'fiche-carte' },
          h('h4', {}, 'Renommée', ih('Renommée')), champ('Niveau', niveau(`${H}.renommee`)),
          h('h4', {}, 'Troupeau', ih('Troupeau')), champ('Niveau', niveau(`${H}.troupeau.niveau`)), zone(`${H}.troupeau.description`, { rows: 2, 'aria-label': 'Troupeau' })),
        h('div', { class: 'fiche-carte' },
          h('h4', {}, 'Fausses identités', ih('Fausses identités')),
          F.historiques.faussesIdentites.map((_, i) => h('div', { class: 'fiche-sous-carte' },
            champ('Fausse identité ' + (i + 1), niveau(`${H}.faussesIdentites.${i}.niveau`)),
            zone(`${H}.faussesIdentites.${i}.description`, { rows: 2, 'aria-label': 'Fausse identité ' + (i + 1) })))),
        h('div', { class: 'fiche-carte' },
          h('h4', {}, 'Contacts', ih('Contacts')), champ('Niveau', niveau(`${H}.contacts.niveau`)),
          lignes(5, (i) => rempli(F.historiques.contacts.liste[i]), (i) => texte(`${H}.contacts.liste.${i}`, { 'aria-label': 'Contact' })),
          h('h4', {}, 'Alliés', ih('Alliés')), champ('Niveau', niveau(`${H}.allies.niveau`)),
          lignes(5, (i) => rempli(F.historiques.allies.liste[i]), (i) => texte(`${H}.allies.liste.${i}`, { 'aria-label': 'Allié' })))),
      h('h4', {}, 'Havres', ih('Havre')),
      h('div', { class: 'fiche-colonnes trois' }, F.historiques.havres.map((_, i) => h('div', { class: 'fiche-carte' },
        h('div', { class: 'fiche-grille serree' },
          champ('Havre ' + (i + 1), texte(`${H}.havres.${i}.nom`)), champ('Niveau', niveau(`${H}.havres.${i}.niveau`))),
        h('label', {}, 'Avantages'),
        F.historiques.havres[i].avantages.map((__, k) => h('div', { class: 'fiche-ligne' },
          liste(`${H}.havres.${i}.avantages.${k}`, REF.avantagesHavre), infoListe('avantagesHavre', `${H}.havres.${i}.avantages.${k}`)))))),
      h('div', { class: 'fiche-colonnes deux' },
        h('div', { class: 'fiche-carte' },
          h('h4', {}, 'Rituels sabbatiques', ih('Rituels sabbatiques')), champ('Niveau', niveau(`${H}.rituelsSabbat.niveau`)),
          lignes(24, (i) => rempli(F.historiques.rituelsSabbat.liste[i]), (i) => h('div', { class: 'fiche-ligne' },
            liste(`${H}.rituelsSabbat.liste.${i}`, REF.rituelsSabbat), infoListe('rituelsSabbat', `${H}.rituelsSabbat.liste.${i}`)))),
        h('div', { class: 'fiche-carte' },
          h('h4', {}, 'Historiques partagés', ih('Historiques partagés')),
          champ('Valeur (PX)', nombreChamp(`${H}.partages.niveau`)),
          zone(`${H}.partages.description`, { rows: 3, 'aria-label': 'Historiques partagés' }),
          h('h4', {}, "Emplacements d'intérêts contrôlés", ih("Emplacements d'intérêts")),
          lignes(10, (i) => rempli(F.historiques.emplacements[i]), (i) => texte(`${H}.emplacements.${i}`, { 'aria-label': 'Emplacement' })))),
    ];
  }

  // ===================================================== SERVITEURS
  function rendreServiteurs() {
    const qualites = REF.qualitesServiteur.map((q) => `${q.nom} (${q.points} points)`);
    const carte = (i) => {
      const s = F.serviteurs[i];
      const animal = s.type === 'Animal';
      return h('div', { class: 'fiche-carte' },
        h('div', { class: 'fiche-grille serree' },
          champ('Nom', texte(`serviteurs.${i}.nom`), { cls: 'large' }),
          champ('Niveau', niveau(`serviteurs.${i}.niveau`, 10, { apres: () => rafraichir('serviteurs') })),
          champ('Type', liste(`serviteurs.${i}.type`, REF.typesServiteur, { apres: () => rafraichir('serviteurs') }))),
        champ('Description', zone(`serviteurs.${i}.description`, { rows: 2 })),
        h('label', {}, 'Spécialités'),
        lignes(10, (k) => rempli(s.specialites[k]), (k) => texte(`serviteurs.${i}.specialites.${k}`, { 'aria-label': 'Spécialité' }), { videsVisibles: 1 }),
        h('label', {}, 'Qualités (serviteur animal uniquement)', info('Qualités de serviteur', [{ cat: 'historiques', nom: 'Serviteurs' }])),
        animal ? [
          calc(() => {
            const pts = F.serviteurs[i].qualites.reduce((t, q) => t + (REF.qualitesServiteur.find((x) => cle(`${x.nom} (${x.points} points)`) === cle(q))?.points || 0), 0);
            return `${pts} / ${nombre(F.serviteurs[i].niveau)} points maxi`;
          }, 'fiche-calc mini'),
          lignes(10, (k) => rempli(s.qualites[k]), (k) => h('div', { class: 'fiche-ligne' },
            liste(`serviteurs.${i}.qualites.${k}`, qualites), boutonInfo(() => sansQualite(F.serviteurs[i].qualites[k]), () => [{ cat: 'qualitesServiteur', nom: sansQualite(F.serviteurs[i].qualites[k]) }])), { videsVisibles: 1 }),
        ] : h('p', { class: 'sous-titre' }, 'Indisponible'));
    };
    return [
      h('p', { class: 'sous-titre' }, 'Le premier serviteur est gratuit avec les atouts Serviteur fantôme, Parangon ou Compagnon Ardent.', info('Serviteurs', [{ cat: 'historiques', nom: 'Serviteurs' }])),
      lignes(6, (i) => rempli(F.serviteurs[i].nom) || rempli(F.serviteurs[i].niveau) || rempli(F.serviteurs[i].type), carte, { videsVisibles: 1, classe: 'fiche-colonnes trois' }),
    ];
  }
  const sansQualite = (q) => String(q || '').replace(/\s*\(\d+ points?\)\s*$/, '');

  // ===================================================== ÉQUIPEMENT
  function rendreEquipement() {
    const carte = (i) => {
      const e = F.equipement[i];
      const quals = REF.qualites[e.type] || [];
      return h('div', { class: 'fiche-carte' },
        h('div', { class: 'fiche-grille serree' },
          champ('Nom', texte(`equipement.${i}.nom`), { cls: 'large' }),
          champ('Quantité', nombreChamp(`equipement.${i}.quantite`, { min: 0 })),
          champ('Type', liste(`equipement.${i}.type`, REF.typesEquipement, { vide: 'Type ?', apres: () => rafraichir('equipement') }),
            { info: boutonInfo(() => e.type, () => [{ cat: 'typesEquipement', nom: F.equipement[i].type }]) })),
        h('label', {}, 'Qualités'),
        e.qualites.map((_, k) => h('div', { class: 'fiche-ligne' },
          liste(`equipement.${i}.qualites.${k}`, quals, { vide: 'Qualité ?' }),
          boutonInfo(() => F.equipement[i].qualites[k], () => [{ cat: 'qualites', nom: F.equipement[i].type + ' / ' + F.equipement[i].qualites[k] }]))),
        champ('Description', zone(`equipement.${i}.description`, { rows: 3 })),
        h('div', { class: 'fiche-grille serree' },
          champ('Art', liste(`equipement.${i}.art`, REF.artsEquipement)),
          champ('Antiquité', liste(`equipement.${i}.antiquite`, ['Non', 'Oui']))));
    };
    return lignes(12, (i) => rempli(F.equipement[i].nom) || rempli(F.equipement[i].type), carte, { videsVisibles: 1, classe: 'fiche-colonnes trois' });
  }

  // ===================================================== MENTORATS
  function rendreMentorats() {
    const tableau = (titre, chemin, valeurs) => h('div', { class: 'fiche-carte' },
      h('h4', {}, titre),
      h('div', { class: 'fiche-table-tete six' }, ['Nom', 'Niveau', 'Mentor en jeu', 'Date', 'Valideur', 'Nom du valideur'].map((t) => h('span', {}, t))),
      lignes(15, (i) => rempli(F.mentorats[chemin][i].nom), (i) => h('div', { class: 'fiche-table-ligne six' },
        liste(`mentorats.${chemin}.${i}.nom`, valeurs), niveau(`mentorats.${chemin}.${i}.niveau`, chemin === 'disciplines' ? 5 : 10),
        texte(`mentorats.${chemin}.${i}.mentor`, { 'aria-label': 'Mentor' }), texte(`mentorats.${chemin}.${i}.date`, { 'aria-label': 'Date' }),
        texte(`mentorats.${chemin}.${i}.valideur`, { 'aria-label': 'Valideur' }), texte(`mentorats.${chemin}.${i}.nomValideur`, { 'aria-label': 'Nom du valideur' }))));
    return [
      h('p', { class: 'sous-titre' }, 'Gestion des mentorats : disciplines hors clan (communes et rares) et spécialisations de la compétence Mystères.'),
      tableau('Mentorats de discipline hors clan', 'disciplines', REF.disciplines.filter((d) => d.selectionnable).map((d) => d.nom)),
      tableau('Mentorats de spécialisation Mystères', 'mysteres', REF.factionsMystere),
    ];
  }

  // ===================================================== RÉSUMÉ
  function rendreResume() {
    const zoneResume = h('div', { class: 'fiche-resume' });
    vue(() => zoneResume.replaceChildren(...resume()));
    return [
      h('div', { class: 'cam-actions fiche-pas-imprimer' },
        h('button', { type: 'button', onclick: () => { document.body.classList.add('cam-impression-resume'); window.print(); } }, 'Imprimer le résumé')),
      zoneResume,
    ];
  }
  function resume() {
    const lst = (titre, items) => h('div', { class: 'res-bloc' }, h('h5', {}, titre),
      items.length ? h('ul', {}, items.map((x) => h('li', {}, x))) : h('p', { class: 'vide' }, '—'));
    const niv = (n, nom) => `${n} — ${nom}`;
    const sous = (t) => t.filter((x) => rempli(x.nom) && rempli(x.niveau)).map((x) => niv(x.niveau, x.nom));
    const comp = REF.competences.filter((c) => rempli(F.competences[c])).map((c) => niv(F.competences[c], c))
      .concat(sous(F.competencesLibres));
    if (rempli(F.linguistique)) comp.push(niv(F.linguistique, 'Linguistique'));
    if (rempli(F.mysteres.niveau)) comp.push(niv(F.mysteres.niveau, 'Mystères'));
    const myst = F.mysteres.specialites.map((x, i) => ({ nom: i < 3 ? R.specialitesMystereAuto[i] : x.nom, niveau: x.niveau })).filter((x) => rempli(x.nom) && rempli(x.niveau));
    const disc = R.disciplines.filter((d) => rempli(d.nom) && rempli(d.niveau)).map((d) => {
      const ref = disciplineRef(d.nom);
      const pv = ref ? ref.pouvoirs.slice(0, Math.min(nombre(d.niveau), 5)).join(', ') : '';
      const anc = d.anciens.filter(rempli);
      return `${d.niveau} — ${d.nom}${pv ? ' : ' + pv : ''}${anc.length ? ' · Ancien : ' + anc.join(', ') : ''}`;
    });
    const h_ = F.historiques;
    const hist = [
      ['Génération', R.niveauGeneration], ['Gotha', h_.gotha.niveau], ['Pègre', h_.pegre.niveau], ['Ressources', h_.ressources],
      ['Renommée', h_.renommee], ['Troupeau', h_.troupeau.niveau], ['Contacts', h_.contacts.niveau], ['Alliés', h_.allies.niveau],
      ['Rituels sabbatiques', h_.rituelsSabbat.niveau],
    ].filter(([, v]) => rempli(v)).map(([k, v]) => `${k} ${v}`);
    h_.faussesIdentites.forEach((x, i) => { if (rempli(x.niveau)) hist.push(`Fausse identité ${i + 1} : ${x.niveau}${x.description ? ' (' + x.description + ')' : ''}`); });
    h_.havres.forEach((x) => { if (rempli(x.niveau) || rempli(x.nom)) hist.push(`Havre ${x.nom || ''} ${x.niveau || ''}${x.avantages.filter(rempli).length ? ' : ' + x.avantages.filter(rempli).join(', ') : ''}`); });
    const r = R.resume;
    const foc = (k) => F.attributs[k].focus.filter(rempli).join(', ') || '—';
    return [
      h('div', { class: 'res-tete' },
        h('strong', {}, F.nom || 'Sans nom'),
        h('span', {}, [F.typeFiche, F.secte, F.race, F.age, F.clan, F.generation ? F.generation + 'e génération' : ''].filter(Boolean).join(' · ')),
        h('span', {}, `PX : ${R.xp.acquise} acquis, ${R.xp.depensee} dépensés, ${R.xp.restante} restants`)),
      h('div', { class: 'res-grille' },
        h('div', { class: 'res-bloc' }, h('h5', {}, 'Attributs'),
          h('table', {}, h('tr', {}, h('th', {}, 'Physique'), h('th', {}, 'Social'), h('th', {}, 'Mental')),
            h('tr', {}, h('td', {}, F.attributs.physique.valeur || 0), h('td', {}, F.attributs.social.valeur || 0), h('td', {}, F.attributs.mental.valeur || 0)),
            h('tr', {}, h('td', {}, foc('physique')), h('td', {}, foc('social')), h('td', {}, foc('mental')))),
          h('p', {}, `Sang ${R.sang} (max ${R.sangParTour}/tour) · Volonté ${R.volonte}`),
          h('p', {}, `${F.voie || 'Voie ?'} : ${R.ethique === '' ? '—' : R.ethique} · Archétype : ${F.archetype || '—'}`),
          h('p', {}, 'Dérangements : ' + (F.derangements.filter((d) => rempli(d.type)).map((d) => d.type + (d.description ? ' (' + d.description + ')' : '')).join(' ; ') || '—')),
          h('p', {}, 'Langues (' + R.langues + ') : ' + (F.langues.filter(rempli).join(', ') || '—'))),
        lst('Compétences', comp),
        lst('Sciences · Artisanat · Représentation', [...sous(F.sciences), ...sous(F.artisanat), ...sous(F.representation)]),
        lst('Mystères', myst.map((x) => niv(x.niveau, x.nom))),
        lst('Atouts', F.atouts.filter(rempli)),
        lst('Handicaps', [...F.handicaps, ...F.handicapsSupp].filter(rempli)),
        lst('Disciplines', disc),
        lst('Techniques', F.techniques.filter(rempli)),
        lst('Rituels', F.rituels.filter(rempli)),
        lst('Historiques', hist),
        lst('Contacts et alliés', [...h_.contacts.liste, ...h_.allies.liste].filter(rempli)),
        h('div', { class: 'res-bloc' }, h('h5', {}, 'Scores (sans bonus ni malus)'),
          h('ul', {},
            h('li', {}, `Initiative ${r.initiative} · avec Célérité ${r.initiativeCelerite}`),
            h('li', {}, `Tir ${r.tir} · Arme archaïque ${r.archaique} · Lancer ${r.lancer}`),
            h('li', {}, `Mêlée ${r.melee} · Sans arme ${r.sansArme}`),
            h('li', {}, `Défense (Esquive) ${r.esquive}`))),
        h('div', { class: 'res-bloc' }, h('h5', {}, 'Manœuvres de combat (une seule gratuite par combat)'),
          h('ul', {}, r.manoeuvres.map(([n, c]) => h('li', {}, `${n} : ${c}`))),
          h('p', { class: 'petit' }, 'Férales : ' + r.manoeuvresFerales.join(', ') + ' · Aériennes : ' + r.manoeuvresAeriennes.join(', ') + ' (1 point de Volonté)')),
        h('div', { class: 'res-bloc' }, h('h5', {}, 'Blessures'),
          h('div', { class: 'res-blessures' }, ['Sain', 'Blessé', 'Invalide / Incapacité'].map((t) => h('div', {}, h('span', {}, t), h('span', { class: 'cases' }, '☐ ☐ ☐'))))),
        lst('Serviteurs', F.serviteurs.filter((s) => rempli(s.nom) || rempli(s.niveau)).map((s) => `${s.nom || '?'} (${s.type || '?'}, niv. ${s.niveau || 0})${[...s.specialites, ...s.qualites].filter(rempli).length ? ' : ' + [...s.specialites, ...s.qualites].filter(rempli).join(' | ') : ''}`)),
        lst('Équipement', F.equipement.filter((e) => rempli(e.nom)).map((e) => `${e.quantite > 1 ? e.quantite + ' × ' : ''}${e.nom} (${e.type || '?'}${e.qualites.filter(rempli).length ? ', ' + e.qualites.filter(rempli).join(', ') : ''}${e.art && e.art !== 'Classique' ? ', ' + e.art : ''}${e.antiquite === 'Oui' ? ', antique' : ''})`)),
        F.precisionsAtouts ? h('div', { class: 'res-bloc large' }, h('h5', {}, 'Précisions atouts / handicaps'), h('p', { class: 'pre' }, F.precisionsAtouts)) : ''),
    ];
  }

  // ===================================================== BARRE + NAVIGATION
  const barre = h('div', { class: 'fiche-barre' });
  const listeAlertes = h('ul', { class: 'fiche-alertes', hidden: true });
  function majBarre() {
    const x = R.xp;
    const nb = R.alertes.filter((a) => a.niveau !== 'info').length;
    barre.replaceChildren(
      h('span', { class: 'fiche-px' }, h('small', {}, 'PX acquis'), h('b', {}, x.acquise)),
      h('span', { class: 'fiche-px' }, h('small', {}, 'dépensés'), h('b', {}, x.depensee)),
      h('span', { class: 'fiche-px ' + (x.restante < 0 ? 'neg' : 'pos') }, h('small', {}, 'restants'), h('b', {}, x.restante)),
      R.alertes.length ? h('button', {
        type: 'button', class: 'petit ' + (nb ? 'danger' : 'secondaire'),
        onclick: () => { listeAlertes.hidden = !listeAlertes.hidden; },
      }, (nb ? '⚠ ' : 'ℹ ') + R.alertes.length + ' message' + (R.alertes.length > 1 ? 's' : '')) : h('span', { class: 'fiche-ok' }, '✓'));
    listeAlertes.replaceChildren(...R.alertes.map((a) => h('li', { class: a.niveau }, a.texte)));
    if (!R.alertes.length) listeAlertes.hidden = true;
  }

  let groupeActif = 'personnage';
  let sectionActive = 'identite';
  const navPc = h('nav', { class: 'cam-onglets fiche-nav-pc' }, GROUPES.map(([id, lib]) => h('button', { type: 'button', dataset: { cible: id }, onclick: () => montrer({ groupe: id }) }, lib)));
  const navMobile = h('nav', { class: 'fiche-nav-mobile' }, SECTIONS.map((s) => h('button', { type: 'button', dataset: { cible: s.id }, onclick: () => montrer({ section: s.id }) }, s.titre)));
  const corps = h('div', { class: 'fiche-corps' });

  for (const s of SECTIONS) {
    const contenu = h('div', { class: 'fiche-section-corps' });
    conteneurs.set(s.id, contenu);
    const idx = SECTIONS.indexOf(s);
    corps.append(h('section', { class: 'fiche-section', dataset: { section: s.id, groupe: s.groupe } },
      h('h3', { class: 'fiche-section-titre' }, s.titre),
      contenu,
      h('div', { class: 'fiche-suivant' },
        idx > 0 ? h('button', { type: 'button', class: 'petit secondaire', onclick: () => montrer({ section: SECTIONS[idx - 1].id, defiler: true }) }, '← ' + SECTIONS[idx - 1].titre) : h('span'),
        idx < SECTIONS.length - 1 ? h('button', { type: 'button', class: 'petit secondaire', onclick: () => montrer({ section: SECTIONS[idx + 1].id, defiler: true }) }, SECTIONS[idx + 1].titre + ' →') : h('span'))));
    rafraichir(s.id);
  }

  function montrer({ groupe, section, defiler } = {}) {
    if (section) { sectionActive = section; groupeActif = SECTIONS.find((s) => s.id === section).groupe; }
    if (groupe) { groupeActif = groupe; if (SECTIONS.find((s) => s.id === sectionActive).groupe !== groupe) sectionActive = SECTIONS.find((s) => s.groupe === groupe).id; }
    const mobile = MOBILE.matches;
    corps.querySelectorAll(':scope > .fiche-section').forEach((el) => {
      el.hidden = mobile ? el.dataset.section !== sectionActive : el.dataset.groupe !== groupeActif;
    });
    navPc.querySelectorAll('button').forEach((b) => b.classList.toggle('actif', b.dataset.cible === groupeActif));
    navMobile.querySelectorAll('button').forEach((b) => {
      const actif = b.dataset.cible === sectionActive;
      b.classList.toggle('actif', actif);
      if (actif && mobile) b.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
    if (defiler) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  MOBILE.addEventListener('change', () => montrer({}));
  window.addEventListener('afterprint', () => document.body.classList.remove('cam-impression-resume'));

  const el = h('div', { class: 'fiche-editeur' + (dis ? ' lecture' : '') },
    h('div', { class: 'fiche-entete-collante' }, barre, listeAlertes, navMobile),
    navPc, corps);
  majBarre();
  montrer({});

  return {
    el,
    /** Copie de la fiche en cours d'édition. */
    lireFiche: () => JSON.parse(JSON.stringify(F)),
    calcul: () => { R = calculer(F); return R; },
    montrer,
  };
}
