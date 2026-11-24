// =====================================================================
// Aperçu avant impression : toute la fiche, mise en page pour le papier
// ---------------------------------------------------------------------
// Fenêtre plein écran (fond gris, page blanche au format A4) ; à
// l'impression, seule la page est imprimée (classe cam-apercu-ouvert sur
// <body>, voir fiche.css). Rien n'est enregistré.
// =====================================================================
import { h } from '../core.js';
import { REF } from './referentiel.js';
import { normaliser, nombre } from './modele.js';
import { calculer, disciplineRef, rituelDe } from './calculs.js';
import { faiblesseDeClan } from './descriptions.js';
import { mysteresConnus, nomSpecialite } from './mysteres-base.js';
import { LIGNES_XP } from './differences.js';

const rempli = (v) => String(v ?? '').trim() !== '';
const val = (v) => (rempli(v) ? String(v) : '—');
const dateFr = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso.split('-').reverse().join('/') : val(iso));
const signe = (n) => (n > 0 ? '+' + n : String(n));

/** Paires libellé / valeur, les vides en moins. */
function kv(paires, cls = '') {
  const l = paires.filter(([, v]) => rempli(v));
  return l.length ? h('dl', { class: 'ap-kv ' + cls }, l.map(([k, v]) => [h('dt', {}, k), h('dd', {}, String(v))])) : '';
}
function tableau(entetes, lignes, cls = '') {
  if (!lignes.length) return h('p', { class: 'ap-vide' }, '—');
  return h('table', { class: 'ap-table ' + cls },
    h('thead', {}, h('tr', {}, entetes.map((t) => h('th', {}, t)))),
    h('tbody', {}, lignes.map((l) => h('tr', {}, l.map((c) => h('td', {}, c === '' || c === null || c === undefined ? '' : String(c)))))));
}
function liste(items) {
  const l = items.filter(rempli);
  return l.length ? h('ul', { class: 'ap-liste' }, l.map((x) => h('li', {}, x))) : h('p', { class: 'ap-vide' }, '—');
}
const bloc = (titre, ...enfants) => h('section', { class: 'ap-bloc' }, h('h3', {}, titre), ...enfants);
const sous = (titre, ...enfants) => h('div', { class: 'ap-sous' }, h('h4', {}, titre), ...enfants);
const texteLong = (t) => (rempli(t) ? h('p', { class: 'ap-pre' }, t) : '');

/**
 * Ouvre l'aperçu.
 * options : { portrait (élément img ou null), joueur, statut, mysteres (source des textes, facultatif) }
 */
export function ouvrirApercu(fiche, { portrait = null, joueur = '', statut = '', mysteres = null } = {}) {
  const F = normaliser(fiche);
  const R = calculer(F);
  const page = h('article', { class: 'fiche-apercu-page' });
  const avecTextes = h('input', { type: 'checkbox' });
  const fond = h('div', { class: 'cam-app fiche-apercu', role: 'dialog', 'aria-label': 'Aperçu avant impression' },
    h('div', { class: 'fiche-apercu-barre' },
      h('button', { type: 'button', onclick: () => window.print() }, '🖨 Imprimer'),
      mysteres ? h('label', { class: 'cam-coche' }, avecTextes, 'Inclure les textes des mystères connus') : '',
      h('span', { class: 'sous-titre' }, 'Astuce : dans la fenêtre d\'impression, choisissez « Enregistrer au format PDF » pour garder un fichier.'),
      h('button', { type: 'button', class: 'secondaire', onclick: () => fermer() }, 'Fermer')),
    page);
  const echap = (e) => { if (e.key === 'Escape') fermer(); };
  function fermer() {
    fond.remove();
    document.body.classList.remove('cam-apercu-ouvert');
    document.removeEventListener('keydown', echap);
  }

  // --- En-tête
  const x = R.xp;
  const entete = h('header', { class: 'ap-tete' },
    portrait ? h('div', { class: 'ap-portrait' }, portrait) : '',
    h('div', {},
      h('h2', {}, F.nom || 'Sans nom'),
      h('p', { class: 'ap-ligne' }, [F.typeFiche, F.secte, F.race, F.age, F.clan, F.generation ? F.generation + 'e génération' : ''].filter(rempli).join(' · ') || '—'),
      h('p', { class: 'ap-ligne' }, [joueur ? 'Joueur : ' + joueur : '', statut ? 'Statut : ' + statut : ''].filter(Boolean).join(' · ')),
      h('p', { class: 'ap-px' }, h('span', {}, 'PX acquis ', h('b', {}, x.acquise)), h('span', {}, 'dépensés ', h('b', {}, x.depensee)), h('span', {}, 'restants ', h('b', {}, x.restante)))));

  // --- Identité
  const faiblesse = h('p', { class: 'ap-pre ap-faiblesse' }, F.clan ? '…' : '—');
  if (F.clan) {
    faiblesseDeClan(F.clan).then((r) => { faiblesse.textContent = r.etat === 'ok' ? r.texte : 'Texte non disponible.'; })
      .catch(() => { faiblesse.textContent = 'Texte non disponible.'; });
  }
  const identite = bloc('Identité',
    kv([
      ['Nom véritable', F.nomVeritable], ['Naissance', [rempli(F.naissance) ? dateFr(F.naissance) : '', F.lieuNaissance].filter(rempli).join(', ')],
      ['Lignée', F.lignee], ['Étreinte', [rempli(F.etreinte) ? dateFr(F.etreinte) : '', F.lieuEtreinte].filter(rempli).join(', ')],
      ['Infants', F.infants], ['Torpeurs (mois)', F.torpeursMois], ['Temps de goule (mois)', F.tempsGouleMois],
      ['Classe', R.classe], ['Créé le', rempli(F.creeLe) ? dateFr(F.creeLe) : ''], ['Absence (mois)', F.absenceMois],
      ['Durée de jeu', R.moisDeJeu ? R.moisDeJeu + ' mois (' + R.anneesDeJeu + ' an' + (R.anneesDeJeu > 1 ? 's' : '') + ')' : ''],
      ['Âge vampirique', F.ageVampirique], ['Expérience gratuite', F.xpGratuite], ['Concept', F.concept],
      ['Voie', F.voie ? F.voie + (R.ethique !== '' ? ' — score ' + R.ethique : '') : ''],
      ['Éthique regagnée / perdue', rempli(F.ethiqueRegagnee) || rempli(F.ethiquePerdue) ? val(F.ethiqueRegagnee) + ' / ' + val(F.ethiquePerdue) : ''],
      ['Archétype', [F.archetype, F.archetypePerso].filter(rempli).join(' — ')], ['Statut interne au clan', F.statutClan],
    ], 'trois'),
    sous('Faiblesse de clan', faiblesse),
    rempli(F.notes) ? sous('Notes', texteLong(F.notes)) : '');

  // --- Atouts, handicaps, dérangements, liens de sang
  const avecCout = (lst, couts) => lst.map((a, i) => (rempli(a) ? a + (couts && couts[i] ? ' [' + signe(couts[i]) + ']' : '') : '')).filter(rempli);
  const atouts = bloc('Atouts et handicaps',
    h('div', { class: 'ap-colonnes trois' },
      sous('Atouts', liste(avecCout(F.atouts, R.atouts.couts))),
      sous('Handicaps', liste(avecCout(F.handicaps, R.handicaps.couts))),
      sous('Handicaps supplémentaires', liste(F.handicapsSupp))),
    kv([
      ['Atout « Fragment restant »', F.atoutFragment], ['Atout « Propice »', F.atoutPropice],
      ['Coût de la voie / lignée / rareté', [R.atouts.voie, R.atouts.lignee, R.atouts.rarete].join(' / ')],
      ['Total atouts', R.atouts.total], ['Total handicaps (max. 7)', R.handicaps.total + (R.handicaps.brut > 7 ? ' (' + R.handicaps.brut + ')' : '')],
      ['Rachat de handicap', F.rachatHandicap], ['Oubli d\'atout', F.oubliAtout],
    ], 'trois'),
    rempli(F.precisionsAtouts) ? sous('Précisions', texteLong(F.precisionsAtouts)) : '',
    sous('Dérangements', tableau(['Dérangement', 'Coût', 'Description'],
      F.derangements.filter((d) => rempli(d.type) || rempli(d.description)).map((d) => [d.type, d.cout, d.description]))),
    F.liensSang.some((l) => rempli(l.maitre) || rempli(l.vassal))
      ? sous('Liens de sang', tableau(['Maître', 'Vassal', 'Niveau', 'Date'], F.liensSang.filter((l) => rempli(l.maitre) || rempli(l.vassal)).map((l) => [l.maitre, l.vassal, l.niveau, l.date])))
      : '');

  // --- Attributs
  const cats = [['physique', 'Physique'], ['social', 'Social'], ['mental', 'Mental']];
  const attributs = bloc('Attributs',
    tableau(['', ...cats.map(([, l]) => l)], [
      ['Valeur', ...cats.map(([k]) => val(F.attributs[k].valeur))],
      ['Bonus', ...cats.map(([k]) => F.attributs[k].bonus)],
      ['Focus', ...cats.map(([k]) => F.attributs[k].focus.filter(rempli).join(', '))],
    ], 'ap-attributs'),
    kv([['Points de sang', R.sang + ' (max. ' + R.sangParTour + ' par tour)'], ['Volonté', R.volonte], ['Changements de focus', F.changementFocus]], 'trois'));

  // --- Compétences
  const niv = (l) => l.filter((s) => rempli(s.niveau)).map((s) => val(s.nom) + ' ' + s.niveau);
  const comps = REF.competences.filter((c) => rempli(F.competences[c])).map((c) => {
    const vc = F.voyageurChevronne[c];
    return c + ' ' + F.competences[c] + (vc === 'Oui' ? ' (voyageur chevronné)' : '');
  });
  const competences = bloc('Compétences',
    h('div', { class: 'ap-colonnes trois' },
      sous('Compétences', liste([...comps, ...niv(F.competencesLibres)])),
      sous('Sciences', liste(niv(F.sciences))),
      sous('Artisanat' + (F.beneficeArtisanat === 'Oui' ? ' (Bénédiction de l\'Artiste)' : ''), liste(niv(F.artisanat))),
      sous('Représentation' + (F.beneficeRepresentation === 'Oui' ? ' (Bénédiction de l\'Artiste)' : ''), liste(niv(F.representation))),
      sous('Spécialités de compétences', liste(F.specialitesCompetences.filter((s) => rempli(s.nom)).map((s) => (rempli(s.competence) ? s.competence + ' : ' : '') + s.nom))),
      sous('Linguistique ' + val(F.linguistique) + ' (' + R.langues + ' langue' + (R.langues > 1 ? 's' : '') + ')', liste(F.langues))),
    kv([['Don infernal', F.donInfernal], ['Disciplines Caïtiff', F.disciplinesCaitiff.filter(rempli).join(', ')]]));

  // --- Mystères
  const specs = F.mysteres.specialites.map((s, i) => [i < 3 ? nomSpecialite(F, i) : s.nom, s.niveau, i < 3 ? 'offerte' : ''])
    .filter(([n, v]) => rempli(n) && rempli(v));
  const zoneTextes = h('div', { class: 'ap-myst-textes' });
  const mysteresBloc = bloc('Mystères',
    kv([['Compétence Mystères', val(F.mysteres.niveau)]]),
    tableau(['Spécialité', 'Niveau', ''], specs), zoneTextes);

  // --- Disciplines, techniques, rituels
  const discs = R.disciplines.map((d, i) => ({ d, i })).filter(({ d }) => rempli(d.nom) && rempli(d.niveau));
  const disciplines = bloc('Disciplines',
    discs.length ? discs.map(({ d, i }) => {
      const ref = disciplineRef(d.nom);
      const n = Math.min(nombre(d.niveau), 5);
      return h('div', { class: 'ap-disc' },
        h('strong', {}, d.nom + ' ' + d.niveau), ' ', h('small', {}, [d.type === 'C' ? 'de clan' : d.type === 'H' ? 'hors clan' : d.type === 'G' ? 'gratuite' : '', R.details.disciplines[i] ? R.details.disciplines[i] + ' PX' : ''].filter(Boolean).join(' · ')),
        ref ? h('div', { class: 'ap-pouvoirs' }, ref.pouvoirs.slice(0, n).map((p, k) => h('span', {}, '•'.repeat(k + 1) + ' ' + p))) : '',
        d.anciens.filter(rempli).length ? h('div', { class: 'ap-pouvoirs' }, 'Pouvoirs d\'ancien : ' + d.anciens.filter(rempli).join(', ')) : '');
    }) : h('p', { class: 'ap-vide' }, '—'),
    h('div', { class: 'ap-colonnes deux' },
      sous('Techniques', liste(F.techniques)),
      sous('Rituels', liste(F.rituels.filter(rempli).map((r) => { const x = rituelDe(r); return r + (x && !/\(niveau/i.test(r) ? ' (niveau ' + x.niveau + ')' : ''); })))));

  // --- Historiques
  const H = F.historiques;
  const historiques = bloc('Historiques',
    h('div', { class: 'ap-colonnes trois' },
      sous('Influences', kv([['Gotha', val(H.gotha.niveau)], ['Pègre', val(H.pegre.niveau)]]),
        ...[['Gotha', H.gotha], ['Pègre', H.pegre]].map(([lib, x]) => {
          const l = x.specialisations.map((sp, i) => [sp, x.raisons[i]]).filter(([sp, r]) => rempli(sp) || rempli(r))
            .map(([sp, r]) => (rempli(sp) ? sp : '?') + (rempli(r) ? ' — ' + r : ''));
          return l.length ? h('p', {}, h('em', {}, lib + ' : '), l.join(' ; ')) : '';
        })),
      sous('Divers', kv([
        ['Génération', R.niveauGeneration ?? ''], ['Ressources', rempli(H.ressources) ? H.ressources + (R.argent !== '' ? ' (' + R.argent.toLocaleString('fr-FR') + ' € par mois)' : '') : ''],
        ['Renommée', H.renommee], ['Troupeau', [H.troupeau.niveau, H.troupeau.description].filter(rempli).join(' — ')],
        ['Historiques partagés', [H.partages.niveau, H.partages.description].filter(rempli).join(' — ')],
        ['Rituels sabbatiques', H.rituelsSabbat.niveau],
      ])),
      sous('Contacts et alliés', kv([['Contacts', H.contacts.niveau], ['Alliés', H.allies.niveau]]),
        liste([...H.contacts.liste.filter(rempli).map((c) => 'Contact : ' + c), ...H.allies.liste.filter(rempli).map((c) => 'Allié : ' + c)]))),
    H.faussesIdentites.some((f) => rempli(f.niveau) || rempli(f.description))
      ? sous('Fausses identités', tableau(['Niveau', 'Description'], H.faussesIdentites.filter((f) => rempli(f.niveau) || rempli(f.description)).map((f) => [f.niveau, f.description]))) : '',
    H.havres.some((v) => rempli(v.nom) || rempli(v.niveau))
      ? sous('Havres', tableau(['Havre', 'Niveau', 'Avantages'], H.havres.filter((v) => rempli(v.nom) || rempli(v.niveau)).map((v) => [v.nom, v.niveau, v.avantages.filter(rempli).join(', ')]))) : '',
    H.rituelsSabbat.liste.some(rempli) ? sous('Rituels sabbatiques', liste(H.rituelsSabbat.liste)) : '',
    H.emplacements.some(rempli) ? sous('Emplacements d\'intérêts contrôlés', liste(H.emplacements)) : '');

  // --- Serviteurs, équipement, mentorats
  const servs = F.serviteurs.filter((s) => rempli(s.nom) || rempli(s.niveau) || rempli(s.type));
  const serviteurs = servs.length ? bloc('Serviteurs', servs.map((s) => h('div', { class: 'ap-serviteur' },
    h('strong', {}, val(s.nom)), ' — ', [s.type, rempli(s.niveau) ? 'niveau ' + s.niveau : ''].filter(rempli).join(', '),
    texteLong(s.description),
    s.specialites.some(rempli) ? h('p', {}, h('em', {}, 'Spécialités : '), s.specialites.filter(rempli).join(', ')) : '',
    s.qualites.some(rempli) ? h('p', {}, h('em', {}, 'Qualités : '), s.qualites.filter(rempli).join(', ')) : ''))) : '';
  const equip = F.equipement.filter((e) => rempli(e.nom));
  const equipement = equip.length ? bloc('Équipement', tableau(['Objet', 'Qté', 'Type', 'Qualités', 'Description'],
    equip.map((e) => [e.nom, e.quantite, e.type, [...e.qualites.filter(rempli), e.art && e.art !== 'Classique' ? e.art : '', e.antiquite === 'Oui' ? 'antique' : ''].filter(rempli).join(', '), e.description]))) : '';
  const tabMentorat = (l) => l.filter((m) => rempli(m.nom)).map((m) => [m.nom, m.niveau, m.mentor, m.date, [m.valideur, m.nomValideur].filter(rempli).join(' — ')]);
  const mentors = [...tabMentorat(F.mentorats.disciplines), ...tabMentorat(F.mentorats.mysteres)];
  const mentorats = mentors.length ? bloc('Mentorats',
    tabMentorat(F.mentorats.disciplines).length ? sous('Disciplines hors clan', tableau(['Discipline', 'Niveau', 'Mentor', 'Date', 'Validation'], tabMentorat(F.mentorats.disciplines))) : '',
    tabMentorat(F.mentorats.mysteres).length ? sous('Spécialisations Mystères', tableau(['Spécialité', 'Niveau', 'Mentor', 'Date', 'Validation'], tabMentorat(F.mentorats.mysteres))) : '') : '';

  // --- Expérience et combat
  const experience = bloc('Expérience',
    h('div', { class: 'ap-colonnes deux' },
      tableau(['Dépense', 'PX'], LIGNES_XP.map(([l, k]) => [l, R.xp[k]]).filter(([, v]) => v)),
      tableau(['', 'PX'], [['Expérience dépensée', x.depensee], ['Expérience de base', x.base], ['Expérience gagnée (durée)', x.gagnee], ['Expérience acquise', x.acquise], ['Expérience restante', x.restante]])));
  const r = R.resume;
  const combat = bloc('Combat (sans bonus ni malus)',
    h('div', { class: 'ap-colonnes trois' },
      kv([['Initiative', r.initiative + ' (avec Célérité ' + r.initiativeCelerite + ')'], ['Tir', r.tir], ['Arme archaïque', r.archaique], ['Lancer', r.lancer], ['Mêlée', r.melee], ['Sans arme', r.sansArme], ['Défense (Esquive)', r.esquive]]),
      sous('Manœuvres (une seule gratuite par combat)', liste(r.manoeuvres.map(([n, c]) => n + ' : ' + c))),
      sous('Blessures', h('div', { class: 'ap-blessures' }, ['Sain', 'Blessé', 'Invalide / Incapacité'].map((t) => h('div', {}, h('span', {}, t), h('span', {}, '☐ ☐ ☐')))))));

  page.append(entete, identite, atouts, attributs, competences, mysteresBloc, disciplines, historiques, serviteurs, equipement, mentorats, experience, combat,
    h('footer', { class: 'ap-pied' }, 'Fiche MET ' + (REF.version || '') + ' · imprimée le ' + new Date().toLocaleDateString('fr-FR') + ' · Camarilla Dauphinoise — document de jeu, ne pas diffuser.'));

  // Textes des mystères connus (facultatifs : longs, et secrets de jeu)
  avecTextes.addEventListener('change', async () => {
    if (!avecTextes.checked) { zoneTextes.replaceChildren(); return; }
    zoneTextes.replaceChildren(h('p', { class: 'ap-vide' }, 'Chargement…'));
    const blocs = [];
    for (const { faction, niveau } of mysteresConnus(F)) {
      try {
        const res = await mysteres.lire(faction);
        if (res.etat !== 'ok') continue;
        for (let k = 1; k <= niveau; k++) {
          const t = res.niveaux[k];
          if (!t) continue;
          blocs.push(h('div', { class: 'ap-myst' }, h('h4', {}, faction + ' — niveau ' + k),
            t.n ? texteLong(t.n) : '', t.c ? [h('h5', {}, 'Connaissances communes'), texteLong(t.c)] : '',
            t.x ? [h('h5', {}, 'Connaissances secrètes'), texteLong(t.x)] : '', !t.c && !t.x && !t.n ? texteLong(t.t) : ''));
        }
      } catch (e) { console.warn(e); }
    }
    zoneTextes.replaceChildren(...(blocs.length ? blocs : [h('p', { class: 'ap-vide' }, 'Aucun texte disponible.')]));
  });

  document.body.append(fond);
  document.body.classList.add('cam-apercu-ouvert');
  document.addEventListener('keydown', echap);
  fond.scrollTop = 0;
  return { fermer };
}
