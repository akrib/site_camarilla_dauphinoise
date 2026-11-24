// Page /influences/conteur/ : tableau de bord des conteurs (Firestore).
// Onglet « Calendrier » : dates des parties et dates limites des influences.
// (Les tickets ont leur propre page : /membres/tickets/.)
import {
  h, db, fs, pageProtegee, barreMembre, message, messageErreur, dateFr, millis, onglets, options,
  telecharger, versCsv, confirmer
} from '../core.js';
import { ZONES, TYPES_ACTION, CATEGORIES_AIP, CAT_GOTHA, CAT_PEGRE, reserveAip, classeCat, libelleZone } from '../donnees.js';
import { totalAip } from '../fiche/aip.js';
import { compresser, donneesDoc } from '../compression.js';
import {
  chargerCalendrier, calculerCalendrier, moisParDefaut, partie, libellePartie, resumeEtat, etat, LIBELLES_ETAT, MAX_PARTIES,
  finDuMois
} from '../calendrier.js';
import { lirePenseBete, marquerSujet, sujetDepuisAction } from '../gazette/stockage.js';
import { chargerTerritoires, zoneDuPoint } from '../carte-base.js';

const racine = document.getElementById('cam-influences-conteur');
barreMembre(document.getElementById('cam-barre'));


pageProtegee(racine, 'conteur', async ({ user }) => {
  let calendrier = await chargerCalendrier().catch(() => ({ existe: false, parties: [], anticipation: false }));
  const mois = h('input', { type: 'month', value: moisParDefaut(calendrier) });
  const infoPartie = h('p', { class: 'sous-titre' });
  const lienCarte = h('a', { class: 'cam-btn secondaire', href: '#' }, '📍 Voir sur la carte');
  const majInfoPartie = () => {
    const p = partie(calendrier, mois.value);
    infoPartie.replaceChildren(...(p ? [h('strong', {}, libellePartie(p)), ' — ', resumeEtat(calendrier, p)]
      : [calendrier.existe ? 'Aucune partie prévue ce mois-ci au calendrier.' : 'Aucun calendrier enregistré : les joueurs envoient leurs actions librement (onglet « Calendrier »).']));
    lienCarte.href = '/utils/carte?mois=' + encodeURIComponent(mois.value);
  };
  const msg = h('div', { class: 'cam-msg' });
  const panneaux = {
    calendrier: h('div', { dataset: { panneau: 'calendrier' } }),
    personnages: h('div', { dataset: { panneau: 'personnages' } }),
    actions: h('div', { dataset: { panneau: 'actions' } }),
    territoires: h('div', { dataset: { panneau: 'territoires' } }),
    raisons: h('div', { dataset: { panneau: 'raisons' } }),
    exports: h('div', { dataset: { panneau: 'exports' } })
  };
  const libelles = { calendrier: 'Calendrier', personnages: 'Personnages', actions: 'Actions du mois', territoires: 'Territoires', raisons: 'Raisons sociales', exports: 'Exports CSV' };
  const app = h('div', {},
    h('div', { class: 'cam-onglets' }, Object.keys(panneaux).map((k) => h('button', { type: 'button', dataset: { onglet: k } }, libelles[k]))),
    Object.values(panneaux));
  racine.append(
    h('div', { class: 'cam-bloc' },
      h('div', { class: 'cam-ligne' }, h('div', {}, h('label', {}, 'Mois (partie)'), mois)), infoPartie,
      h('div', { class: 'cam-actions' }, h('button', { type: 'button', onclick: () => charger() }, 'Actualiser'), lienCarte), msg),
    app);
  const ongletDemande = location.hash.slice(1) === 'districts' ? 'territoires' : location.hash.slice(1);   // ancien nom de l'onglet
  onglets(app)(panneaux[ongletDemande] ? ongletDemande : 'actions');
  majInfoPartie();

  let actions = [], persos = [], raisons = null;
  let sujetsGazette = {};   // actions marquées pour la gazette (pense-bête du mois, conteurs seulement)

  // Personnages en jeu et raisons sociales ne dépendent pas du mois : lus une
  // fois (bouton « Actualiser » pour les relire), seules les actions changent.
  async function charger(tout = true) {
    message(msg, 'Chargement…', 'info');
    try {
      const [a, p, r, sg] = await Promise.all([
        fs.getDocs(fs.query(fs.collection(db, 'influences'), fs.where('mois', '==', mois.value))),
        tout || !persos.length ? fs.getDocs(fs.query(fs.collection(db, 'personnages'), fs.where('statut', '==', 'active'))) : null,
        tout || !raisons ? fs.getDocs(fs.collection(db, 'raisons_sociales')).catch(() => null) : null,
        lirePenseBete(mois.value).catch((e) => { console.warn('Pense-bête de la gazette illisible', e); return {}; })
      ]);
      sujetsGazette = sg;
      actions = a.docs.map(donneesDoc).sort((x, y) => millis(y.creeLe) - millis(x.creeLe));
      if (p) persos = p.docs.map((d) => ({ id: d.id, ...d.data() })).filter((x) => !x.pnj).sort((x, y) => (x.nom || '').localeCompare(y.nom || ''));   // pas les PNJ
      if (r || !raisons) raisons = r ? r.docs.map(donneesDoc).sort((x, y) => (x.personnageNom || '').localeCompare(y.personnageNom || '') || (x.nom || '').localeCompare(y.nom || '')) : [];
      const enAttente = actions.filter((x) => x.statut === 'attente').length;
      message(msg, actions.length + ' action(s) en ' + mois.value + ', dont ' + enAttente + ' sans réponse.', 'ok');
      dessinerPersonnages(); dessinerActions(); dessinerTerritoires(); dessinerExports();
      dessinerRaisons();
    } catch (e) { message(msg, messageErreur(e), 'err'); }
  }
  mois.addEventListener('change', () => { majInfoPartie(); charger(false); });

  // --- Calendrier des parties ---
  function dessinerCalendrier() {
    // Une ligne : une partie { date, limite, titre }, ou un mois sans partie { sansPartie, mois, limite, titre }.
    const lignes = calendrier.parties.map((p) => (p.sansPartie
      ? { sansPartie: true, mois: p.cle, limite: p.limite, titre: p.titre || '' }
      : { date: p.date, limite: p.limite, titre: p.titre || '' }));
    const ordre = (l) => (l.sansPartie ? l.limite || (l.mois ? finDuMois(l.mois) : '') : l.date) || '9999';
    const anticipation = h('input', { type: 'checkbox', checked: calendrier.anticipation });
    const corps = h('tbody');
    const alertes = h('div', {});
    const msgC = h('div', { class: 'cam-msg' });
    const CLASSE_ETAT = { ouverte: 'traitee', a_venir: 'attente', fermee: 'archivee' };
    const dessinerLignes = () => {
      if (msgC.classList.contains('err')) { msgC.className = 'cam-msg'; msgC.textContent = ''; }
      lignes.sort((a, b) => ordre(a).localeCompare(ordre(b)));
      const { parties, erreurs } = calculerCalendrier(lignes);
      corps.replaceChildren(...(lignes.length ? lignes.map((l, i) => {
        // Partie : sa date ; mois sans partie : le mois.
        const largeur = 'width:170px;max-width:100%';   // laisse de la place au titre
        const date = l.sansPartie ? h('input', { type: 'month', value: l.mois || '', style: largeur }) : h('input', { type: 'date', value: l.date, style: largeur });
        const limite = h('input', { type: 'date', value: l.limite, style: largeur });
        const titre = h('input', { type: 'text', value: l.titre, maxlength: 120, placeholder: 'Facultatif', style: 'min-width:110px' });
        date.addEventListener('change', () => { if (l.sansPartie) l.mois = date.value; else l.date = date.value; dessinerLignes(); });
        limite.addEventListener('change', () => { l.limite = limite.value; dessinerLignes(); });
        titre.addEventListener('input', () => { l.titre = titre.value; });
        // Bascule partie <-> mois sans partie (les influences du mois restent ouvertes).
        const sansPartie = h('input', { type: 'checkbox', checked: !!l.sansPartie });
        sansPartie.addEventListener('change', () => {
          if (sansPartie.checked) {
            l.dateGardee = l.date;
            l.mois = (l.date || '').slice(0, 7) || l.mois || '';
            if (!l.limite && l.mois) l.limite = finDuMois(l.mois);
            l.sansPartie = true;
            delete l.date;
          } else {
            l.date = l.dateGardee && (!l.mois || l.dateGardee.startsWith(l.mois)) ? l.dateGardee : '';
            l.sansPartie = false;
            delete l.mois;
            if (!l.date) message(msgC, 'Indiquez la date de la partie, puis enregistrez le calendrier.', 'info');
          }
          dessinerLignes();
        });
        const c = parties.find((x) => (l.sansPartie ? x.sansPartie && x.cle === l.mois : !x.sansPartie && x.date === l.date));
        return h('tr', { class: l.sansPartie ? 'cam-sans-partie' : null },
          h('td', {}, date, h('label', { class: 'cam-coche', title: 'Pas de partie ce mois-là : les influences du mois restent ouvertes jusqu\'à la date limite' }, sansPartie, 'Sans partie')),
          h('td', {}, limite), h('td', {}, titre),
          h('td', {}, c ? dateFr(c.ouverture) + ' → ' + dateFr(c.fermeture) : '—'),
          h('td', {}, c ? h('span', { class: 'cam-tag ' + CLASSE_ETAT[etat(c)] }, LIBELLES_ETAT[etat(c)]) : ''),
          h('td', {}, h('button', { type: 'button', class: 'petit danger', title: 'Retirer cette partie', onclick: () => { lignes.splice(i, 1); dessinerLignes(); } }, '×')));
      }) : [h('tr', {}, h('td', { colspan: 6 }, 'Aucune partie. Ajoutez la prochaine ci-dessous.'))]));
      alertes.replaceChildren(...erreurs.map((e) => h('div', { class: 'cam-msg err' }, e)));
    };
    // Ajout d'une partie (date limite proposée une semaine avant), ou d'un mois
    // sans partie (date limite proposée au dernier jour du mois).
    const nSansPartie = h('input', { type: 'checkbox' });
    const nDate = h('input', { type: 'date' });
    const nMois = h('input', { type: 'month' });
    const nLimite = h('input', { type: 'date' });
    const nTitre = h('input', { type: 'text', maxlength: 120, placeholder: 'Ex : Élysée de décembre' });
    const libDate = h('label', {}, 'Date de la partie');
    const champDate = h('div', {}, libDate, nDate, nMois);
    nDate.addEventListener('change', () => {
      if (!nDate.value || nLimite.value) return;
      const d = new Date(nDate.value + 'T12:00:00');
      d.setDate(d.getDate() - 7);
      nLimite.value = d.toISOString().slice(0, 10);
    });
    nMois.addEventListener('change', () => { if (nMois.value && !nLimite.value) nLimite.value = finDuMois(nMois.value); });
    const ajouter = h('button', { type: 'button', class: 'petit' }, 'Ajouter la partie');
    const majTypeAjout = () => {
      const sp = nSansPartie.checked;
      nDate.hidden = sp; nMois.hidden = !sp;
      libDate.textContent = sp ? 'Mois (sans partie)' : 'Date de la partie';
      ajouter.textContent = sp ? 'Ajouter le mois sans partie' : 'Ajouter la partie';
      nTitre.placeholder = sp ? 'Ex : Relâche estivale' : 'Ex : Élysée de décembre';
    };
    nSansPartie.addEventListener('change', majTypeAjout);
    majTypeAjout();
    ajouter.addEventListener('click', () => {
      if (lignes.length >= MAX_PARTIES) { message(msgC, 'Au plus ' + MAX_PARTIES + ' parties : retirez les plus anciennes.', 'err'); return; }
      if (nSansPartie.checked) {
        if (!nMois.value || !nLimite.value) { message(msgC, 'Indiquez le mois et la date limite des influences.', 'err'); return; }
        lignes.push({ sansPartie: true, mois: nMois.value, limite: nLimite.value, titre: nTitre.value.trim() });
        message(msgC, 'Mois sans partie ajouté : pensez à enregistrer le calendrier.', 'info');
      } else {
        if (!nDate.value) { message(msgC, 'Indiquez la date de la partie.', 'err'); return; }
        lignes.push({ date: nDate.value, limite: nLimite.value || nDate.value, titre: nTitre.value.trim() });
        message(msgC, 'Partie ajoutée : pensez à enregistrer le calendrier.', 'info');
      }
      nDate.value = ''; nMois.value = ''; nLimite.value = ''; nTitre.value = '';
      dessinerLignes();
    });
    const enregistrer = h('button', { type: 'button', class: 'ok' }, 'Enregistrer le calendrier');
    enregistrer.addEventListener('click', async () => {
      const { parties, erreurs } = calculerCalendrier(lignes);
      if (erreurs.length) { message(msgC, 'Corrigez d\'abord : ' + erreurs[0], 'err'); return; }
      enregistrer.disabled = true;
      try {
        await fs.setDoc(fs.doc(db, 'calendrier', 'parties'), {
          parties: Object.fromEntries(parties.map(({ cle, ...p }) => [cle, p])),
          anticipation: anticipation.checked, majLe: fs.serverTimestamp(), majPar: user.uid
        });
        calendrier = { existe: true, parties, anticipation: anticipation.checked };
        const sans = parties.filter((x) => x.sansPartie).length;
        message(msgC, 'Calendrier enregistré : ' + (parties.length - sans) + ' partie(s)' + (sans ? ' et ' + sans + ' mois sans partie' : '') + '.', 'ok');
        majInfoPartie(); dessinerLignes();
      } catch (e) { message(msgC, messageErreur(e), 'err'); }
      finally { enregistrer.disabled = false; }
    });
    panneaux.calendrier.replaceChildren(h('div', { class: 'cam-bloc' },
      h('h2', {}, 'Calendrier des parties'),
      h('p', { class: 'sous-titre' }, 'Les influences d\'une partie s\'ouvrent le lendemain de la partie précédente (la toute première : un mois avant sa date) et ferment à sa date limite, à 23 h 59. Une seule partie par mois : le mois de la partie est celui de ses actions d\'influence. Un mois sans partie (vacances, relâche…) a quand même ses influences : elles ferment à sa date limite, et celles du mois suivant s\'ouvrent le lendemain. Les dates se modifient directement dans le tableau ; la case « Sans partie » passe une partie en mois sans partie (ou l\'inverse). Pensez à enregistrer.'),
      h('div', { class: 'cam-table-defil' }, h('table', { class: 'cam-table' },
        h('thead', {}, h('tr', {}, ['Date de la partie (ou mois)', 'Date limite des influences', 'Titre', 'Fenêtre d\'influences', 'État', ''].map((x) => h('th', {}, x)))),
        corps)),
      alertes,
      h('h3', {}, 'Ajouter une partie'),
      h('label', { class: 'cam-coche' }, nSansPartie, 'Mois sans partie (influences seulement)'),
      h('div', { class: 'cam-ligne' },
        champDate,
        h('div', {}, h('label', {}, 'Date limite des influences'), nLimite),
        h('div', {}, h('label', {}, 'Titre'), nTitre)),
      ajouter,
      h('label', { class: 'cam-coche', style: 'margin-top:1rem' }, anticipation,
        'Autoriser les joueurs à préparer les actions des parties suivantes avant leur ouverture'),
      h('div', { class: 'cam-actions' }, enregistrer), msgC));
    dessinerLignes();
  }

  // AIP d'un personnage pour la partie : utilisées / disponibles (d'après sa fiche, champ aip)
  function celluleAip(p, siennes) {
    const aips = siennes.filter((a) => a.type === 'aip' || CATEGORIES_AIP.includes(a.categorie));
    const pris = (res) => aips.filter((a) => reserveAip(a.categorie) === res).reduce((t, a) => t + (a.pointsAction || 0), 0);
    const utilisees = pris('AIP') + pris('AIP (Informatique)') + pris('AIP (Science)');
    const nourri = aips.some((a) => a.nomAction === 'Se nourrir');
    if (!p.aip) return h('td', { title: 'Budget inconnu : fiche enregistrée avant le calcul des AIP' }, utilisees + ' AIP' + (nourri ? ' 🩸' : ''));
    const max = totalAip(p.aip);
    const detail = 'Base ' + pris('AIP') + '/' + p.aip.base + (p.aip.informatique ? ' · Informatique ' + pris('AIP (Informatique)') + '/' + p.aip.informatique : '')
      + (p.aip.sciences ? ' · Science ' + pris('AIP (Science)') + '/' + p.aip.sciences : '') + (p.aip.troupeau ? ' · Troupeau ' + pris('AIP (Troupeau)') + '/' + p.aip.troupeau : '')
      + (nourri ? ' · s\'est nourri' : ' · ne s\'est pas nourri (demi-réserve de sang)');
    return h('td', { title: detail }, h('span', { class: utilisees > max ? 'cam-tag refusee' : '' }, utilisees + ' / ' + max), nourri ? ' 🩸' : '');
  }

  // --- Personnages en jeu : qui a agi ce mois-ci ---
  function dessinerPersonnages() {
    const corps = persos.map((p) => {
      const siennes = actions.filter((a) => a.personnageId === p.id);
      const fait = siennes.length > 0;
      const pts = (cat) => siennes.filter((a) => a.categorie === cat).reduce((s, a) => s + (a.pointsAction || 0), 0);
      return h('tr', {},
        h('td', {}, fait ? '✅' : '❌'),
        h('td', {}, h('a', { href: '/membres/fiches/#fiche-' + p.id }, p.nom)),
        h('td', {}, p.proprietaireNom || ''),
        h('td', {}, String(siennes.length)),
        h('td', {}, pts('Influence Gotha') + ' / ' + p.niveauGotha),
        h('td', {}, pts('Influence Pègre') + ' / ' + p.niveauPegre),
        celluleAip(p, siennes));
    });
    panneaux.personnages.replaceChildren(h('div', { class: 'cam-bloc' },
      h('h2', {}, 'Personnages en jeu — ' + mois.value),
      h('div', { class: 'cam-table-defil' }, h('table', { class: 'cam-table' },
        h('thead', {}, h('tr', {}, ['', 'Personnage', 'Joueur', 'Actions', 'Gotha (pts/niv.)', 'Pègre (pts/niv.)', 'AIP (utilisées/dispo.)'].map((x) => h('th', {}, x)))),
        h('tbody', {}, corps.length ? corps : h('tr', {}, h('td', { colspan: 7 }, 'Aucun personnage en jeu.')))))));
  }

  // --- Actions du mois, avec réponse du conteur ---
  let filtreType = '', filtreStatut = 'attente', filtrePerso = '';
  function dessinerActions() {
    const selType = options(h('select', {}), Object.entries(TYPES_ACTION), filtreType, 'Tous les types');
    const selStatut = options(h('select', {}), [['attente', 'Sans réponse'], ['traitee', 'Traitées']], filtreStatut, 'Toutes');
    const selPerso = options(h('select', {}), [...new Set(actions.map((a) => a.personnageNom))].sort(), filtrePerso, 'Tous les personnages');
    selType.addEventListener('change', () => { filtreType = selType.value; dessinerActions(); });
    selStatut.addEventListener('change', () => { filtreStatut = selStatut.value; dessinerActions(); });
    selPerso.addEventListener('change', () => { filtrePerso = selPerso.value; dessinerActions(); });
    const liste = actions.filter((a) => (!filtreType || a.type === filtreType) && (!filtreStatut || a.statut === filtreStatut) && (!filtrePerso || a.personnageNom === filtrePerso));

    panneaux.actions.replaceChildren(h('div', { class: 'cam-bloc' },
      h('h2', {}, 'Actions — ' + mois.value),
      h('div', { class: 'cam-ligne' },
        h('div', {}, h('label', {}, 'Type'), selType), h('div', {}, h('label', {}, 'Statut'), selStatut), h('div', {}, h('label', {}, 'Personnage'), selPerso)),
      h('p', { class: 'sous-titre' }, liste.length + ' action(s) affichée(s). La réponse est visible par le joueur dès l\'enregistrement.'),
      ...liste.map(actionEl)));
  }

  function actionEl(a) {
    const reponse = h('textarea', { maxlength: 6000, placeholder: 'Résultat communiqué au joueur…' }, a.reponseConteur || '');
    const traitee = h('input', { type: 'checkbox', checked: a.statut === 'traitee' || !a.reponseConteur });
    const msgA = h('div', { class: 'cam-msg' });
    // Pense-bête de la gazette : un sujet d'article à ne pas oublier
    const tagGazette = h('span', { class: 'cam-tag gazette', hidden: !sujetsGazette[a.id] }, '📰 pense-bête gazette');
    const btnGazette = h('button', { type: 'button', class: 'petit secondaire', title: 'Ajouter ou retirer cette action du pense-bête de la gazette (Le Gratin Dauphinois)' });
    const majGazette = () => { const oui = !!sujetsGazette[a.id]; btnGazette.textContent = oui ? '📰 Retirer de la gazette' : '📰 Gazette'; tagGazette.hidden = !oui; };
    majGazette();
    btnGazette.addEventListener('click', async () => {
      btnGazette.disabled = true;
      try {
        if (sujetsGazette[a.id]) {
          await marquerSujet(a.mois, a.id, null);
          delete sujetsGazette[a.id];
          message(msgA, 'Retirée du pense-bête de la gazette.', 'ok');
        } else {
          const sujet = sujetDepuisAction({ ...a, reponseConteur: reponse.value.trim() || a.reponseConteur }, user.uid);
          await marquerSujet(a.mois, a.id, sujet);
          sujetsGazette[a.id] = sujet;
          message(msgA, 'Ajoutée au pense-bête de la gazette (' + a.mois + ').', 'ok');
        }
        majGazette();
      } catch (e) { message(msgA, messageErreur(e), 'err'); }
      btnGazette.disabled = false;
    });
    return h('div', { class: 'cam-element' },
      h('div', { class: 'meta' },
        h('span', { class: 'cam-tag ' + classeCat(a.categorie) }, a.categorie),
        h('span', { class: 'cam-tag' }, TYPES_ACTION[a.type] || a.type),
        h('span', { class: 'cam-tag ' + a.statut }, a.statut === 'traitee' ? 'Traitée' : 'Sans réponse'), tagGazette,
        (a.date ? dateFr(a.date) : '') + ' · ' + (a.ville || '') + ' · territoire ' + (libelleZone(zoneDe(a)) || '?'),
        a.lieu ? [' · ', h('a', { href: '/utils/carte?mois=' + encodeURIComponent(a.mois) + '&action=' + encodeURIComponent(a.id) }, '📍 carte')] : ''),
      h('strong', {}, a.personnageNom), ' — ', a.nomAction, ' — ', a.pointsAction + (a.type === 'aip' ? (a.categorie === 'AIP (Troupeau)' ? ' pt(s) de Troupeau' : ' AIP') : ' pt(s)'),
      a.niveau ? ' — niveau ' + a.niveau : '', a.specialisation ? ' — ' + a.specialisation : '',
      h('div', {},
        a.raisonSociale ? [h('strong', {}, 'Raison sociale : '), a.raisonSociale, h('br')] : '',
        a.cible ? [h('strong', {}, 'Cible : '), a.cible, a.categorieCible ? ' (' + a.categorieCible + ')' : '', h('br')] : '',
        h('span', { class: 'texte' }, a.descriptif)),
      h('label', {}, 'Réponse du conteur'), reponse,
      h('div', { class: 'cam-actions' },
        h('label', { class: 'cam-coche', style: 'margin:.6rem .6rem 0 0' }, traitee, 'Marquer comme traitée'),
        h('button', {
          type: 'button', class: 'petit ok', onclick: async () => {
            try {
              const statut = traitee.checked ? 'traitee' : 'attente';
              await fs.updateDoc(fs.doc(db, 'influences', a.id), {
                reponseConteur: compresser(reponse.value.trim()), statut, majLe: fs.serverTimestamp(), traitePar: user.uid,
                ...(reponse.value.trim() ? { reponduLe: fs.serverTimestamp() } : {})
              });
              a.reponseConteur = reponse.value.trim(); a.statut = statut;
              message(msgA, 'Réponse enregistrée.', 'ok');
            } catch (e) { message(msgA, messageErreur(e), 'err'); }
          }
        }, 'Enregistrer'),
        btnGazette,
        h('button', {
          type: 'button', class: 'petit danger', onclick: async () => {
            if (!confirmer('Supprimer définitivement cette action ?')) return;
            try { await fs.deleteDoc(fs.doc(db, 'influences', a.id)); actions = actions.filter((x) => x.id !== a.id); dessinerActions(); }
            catch (e) { message(msgA, messageErreur(e), 'err'); }
          }
        }, 'Supprimer')),
      msgA);
  }

  // --- Territoires (zones 1 à 24, tracées par les conteurs : page Territoires) ---
  // Territoire d'une action : celui choisi dans sa fiche, sinon celui où elle
  // est placée sur la carte.
  let territoires = [];
  const territoiresPrets = chargerTerritoires().then((t) => { territoires = t; }).catch((e) => console.warn('Territoires illisibles', e));
  const zoneDe = (a) => a.zone || (a.lieu ? zoneDuPoint(territoires, [a.lieu.lng, a.lieu.lat]) : '');
  territoiresPrets.then(() => { if (actions.length) { dessinerTerritoires(); dessinerActions(); } });
  function dessinerTerritoires() {
    const compte = Object.fromEntries(ZONES.map((z) => [z, 0]));
    let sans = 0;
    actions.forEach((a) => { const z = zoneDe(a); if (z in compte) compte[z]++; else sans++; });
    const max = Math.max(1, ...Object.values(compte));
    const traces = new Set(territoires.map((t) => String(t.zone || '')).filter(Boolean));
    const p = partie(calendrier, mois.value);
    const lienCarteTerritoire = (z) => '/utils/carte?mois=' + encodeURIComponent(mois.value) + '&territoire=' + encodeURIComponent(z);
    panneaux.territoires.replaceChildren(h('div', { class: 'cam-bloc' },
      h('h2', {}, 'Actions par territoire — ' + (p ? libellePartie(p) : mois.value)),
      h('p', { class: 'sous-titre' }, 'Le territoire d\'une action est celui choisi dans sa fiche d\'influence ou, à défaut, celui où elle est placée sur la carte. « Voir sur la carte » n\'affiche que ce territoire et ses actions de la partie ; une action sans lieu y est posée au hasard.'),
      h('table', { class: 'cam-table' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Territoire'), h('th', {}, 'Actions'), h('th', {}, ''))),
        h('tbody', {}, ZONES.map((z) => h('tr', {}, h('td', {}, libelleZone(z)),
          h('td', {}, h('div', { class: 'cam-barre-progression' }, h('span', {}, String(compte[z])),
            h('div', {}, h('div', { style: 'width:' + Math.round(compte[z] / max * 100) + '%' })))),
          h('td', {}, traces.has(z)
            ? h('a', { class: 'cam-lien-carte', href: lienCarteTerritoire(z), title: 'Le territoire ' + libelleZone(z) + ' et ses actions de la partie, sur la carte' }, '📍 Voir sur la carte')
            : h('small', { class: 'sous-titre', title: 'À tracer dans la page Territoires' }, z === 'Extérieur' ? '' : 'pas tracé')))),
          sans ? h('tr', {}, h('td', {}, h('em', {}, 'Sans territoire')), h('td', {}, String(sans)), h('td', {})) : ''))));
  }

  // --- Raisons sociales : les spécialisations d'influence des fiches en jeu ---
  // (l'ancien registre saisi à part reste consultable, et peut être vidé)
  // Une ligne par spécialisation d'influence, avec sa raison sociale (onglet Historiques de la fiche)
  const raisonsDesFiches = () => persos.flatMap((p) => [
    ...(p.specsGotha || []).map((sp, i) => ({ personnageNom: p.nom, proprietaireNom: p.proprietaireNom || p.interpreteNom || '', categorie: CAT_GOTHA, specialisation: sp, nom: (p.raisonsGotha || [])[i] || '', niveau: p.niveauGotha })),
    ...(p.specsPegre || []).map((sp, i) => ({ personnageNom: p.nom, proprietaireNom: p.proprietaireNom || p.interpreteNom || '', categorie: CAT_PEGRE, specialisation: sp, nom: (p.raisonsPegre || [])[i] || '', niveau: p.niveauPegre }))]);
  function dessinerRaisons() {
    const recherche = h('input', { type: 'search', placeholder: 'Raison sociale, personnage, joueur…' });
    const corps = h('tbody');
    const toutes = raisonsDesFiches();
    const dessiner = () => {
      const q = recherche.value.trim().toLowerCase();
      const liste = toutes.filter((r) => !q || [r.nom, r.specialisation, r.personnageNom, r.proprietaireNom].some((v) => (v || '').toLowerCase().includes(q)));
      corps.replaceChildren(...(liste.length ? liste.map((r) => h('tr', {},
        h('td', {}, r.nom || h('em', { class: 'sous-titre' }, 'pas de raison sociale')), h('td', {}, r.specialisation), h('td', {}, r.personnageNom), h('td', {}, r.proprietaireNom),
        h('td', {}, h('span', { class: 'cam-tag ' + classeCat(r.categorie) }, r.categorie + ' ' + r.niveau))))
        : [h('tr', {}, h('td', { colspan: 5 }, toutes.length ? 'Aucune raison sociale ne correspond.' : 'Aucune spécialisation d\'influence sur les fiches en jeu.'))]));
    };
    recherche.addEventListener('input', dessiner);
    const ancien = (raisons || []).length ? h('details', { class: 'cam-bloc' },
      h('summary', {}, 'Ancien registre saisi à part (' + raisons.length + ' entrée' + (raisons.length > 1 ? 's' : '') + ')'),
      h('p', { class: 'sous-titre' }, 'Le registre des raisons sociales n\'est plus utilisé : les joueurs choisissent désormais une spécialisation de leur fiche. Reportez au besoin ces entrées dans les fiches, puis videz le registre.'),
      h('div', { class: 'cam-table-defil' }, h('table', { class: 'cam-table' },
        h('thead', {}, h('tr', {}, ['Nom', 'Personnage', 'Ville', 'Territoire', 'Catégorie', 'Description'].map((x) => h('th', {}, x)))),
        h('tbody', {}, raisons.map((r) => h('tr', {}, h('td', {}, r.nom), h('td', {}, r.personnageNom), h('td', {}, r.ville), h('td', {}, r.zone),
          h('td', {}, r.categorie), h('td', { class: 'texte' }, r.description || '')))))),
      h('button', {
        type: 'button', class: 'petit danger', onclick: async (e) => {
          if (!confirmer('Supprimer définitivement les ' + raisons.length + ' entrées de l\'ancien registre des raisons sociales ?')) return;
          e.target.disabled = true;
          try {
            for (const r of raisons) await fs.deleteDoc(fs.doc(db, 'raisons_sociales', r.id));
            raisons = []; dessinerRaisons(); dessinerExports();
          } catch (x) { message(msg, messageErreur(x), 'err'); e.target.disabled = false; }
        }
      }, 'Vider l\'ancien registre')) : '';
    panneaux.raisons.replaceChildren(h('div', { class: 'cam-bloc' },
      h('h2', {}, 'Raisons sociales des personnages en jeu'),
      h('p', { class: 'sous-titre' }, 'Chaque spécialisation d\'influence (Gotha, Pègre) d\'une fiche a sa raison sociale (onglet Historiques de la fiche) : chaque action d\'influence en précise une. Une fiche enregistrée avant cette colonne la montre au prochain enregistrement.'),
      recherche,
      h('div', { class: 'cam-table-defil' }, h('table', { class: 'cam-table' },
        h('thead', {}, h('tr', {}, ['Raison sociale', 'Spécialisation', 'Personnage', 'Joueur', 'Catégorie'].map((x) => h('th', {}, x)))), corps))), ancien);
    dessiner();
  }

  // --- Exports CSV (pour archiver ou retravailler dans un tableur) ---
  function dessinerExports() {
    const btn = (texte, fn) => h('button', { type: 'button', class: 'secondaire', onclick: fn }, texte);
    panneaux.exports.replaceChildren(h('div', { class: 'cam-bloc' },
      h('h2', {}, 'Exports CSV'),
      h('p', { class: 'sous-titre' }, 'Fichiers lisibles par Excel, LibreOffice ou Google Sheets (séparateur point-virgule).'),
      h('div', { class: 'cam-actions' },
        btn('Actions du mois', () => telecharger(versCsv(actions, [
          { titre: 'Date', cle: 'date' }, { titre: 'Personnage', cle: 'personnageNom' }, { titre: 'Type', valeur: (a) => TYPES_ACTION[a.type] || a.type },
          { titre: 'Catégorie', cle: 'categorie' }, { titre: 'Action', cle: 'nomAction' }, { titre: 'Niveau', cle: 'niveau' },
          { titre: 'Spécialisation', cle: 'specialisation' }, { titre: 'Raison sociale', cle: 'raisonSociale' }, { titre: 'Cible', cle: 'cible' },
          { titre: 'Catégorie cible', cle: 'categorieCible' }, { titre: 'Points', cle: 'pointsAction' }, { titre: 'Ville', cle: 'ville' },
          { titre: 'Territoire', cle: 'zone' }, { titre: 'Descriptif', cle: 'descriptif' }, { titre: 'Réponse conteur', cle: 'reponseConteur' },
          { titre: 'Statut', cle: 'statut' }, { titre: 'Envoyée le', cle: 'creeLe' },
          { titre: 'Partie', valeur: (a) => { const p = partie(calendrier, a.mois); return p ? libellePartie(p) : a.mois; } },
          { titre: 'Latitude', valeur: (a) => (a.lieu ? a.lieu.lat : '') }, { titre: 'Longitude', valeur: (a) => (a.lieu ? a.lieu.lng : '') }
        ]), 'actions-' + mois.value + '.csv', 'text/csv;charset=utf-8')),
        btn('Raisons sociales', () => telecharger(versCsv(raisonsDesFiches(), [
          { titre: 'Raison sociale', cle: 'nom' }, { titre: 'Spécialisation', cle: 'specialisation' }, { titre: 'Personnage', cle: 'personnageNom' }, { titre: 'Joueur', cle: 'proprietaireNom' },
          { titre: 'Catégorie', cle: 'categorie' }, { titre: 'Niveau', cle: 'niveau' }
        ]), 'raisons-sociales.csv', 'text/csv;charset=utf-8')),
        btn('Personnages en jeu', () => telecharger(versCsv(persos, [
          { titre: 'Personnage', cle: 'nom' }, { titre: 'Joueur', cle: 'proprietaireNom' }, { titre: 'Clan', cle: 'clan' },
          { titre: 'Secte', cle: 'secte' }, { titre: 'Âge', cle: 'age' }, { titre: 'Génération', cle: 'generation' },
          { titre: 'PX acquis', valeur: (p) => (p.xp ? p.xp.acquise : '') }, { titre: 'PX restants', valeur: (p) => (p.xp ? p.xp.restante : '') },
          { titre: 'Gotha', cle: 'niveauGotha' }, { titre: 'Spé. Gotha', valeur: (p) => (p.specsGotha || []).map((sp, i) => sp + ((p.raisonsGotha || [])[i] ? ' (' + p.raisonsGotha[i] + ')' : '')).join(', ') },
          { titre: 'Pègre', cle: 'niveauPegre' }, { titre: 'Spé. Pègre', valeur: (p) => (p.specsPegre || []).map((sp, i) => sp + ((p.raisonsPegre || [])[i] ? ' (' + p.raisonsPegre[i] + ')' : '')).join(', ') },
          { titre: 'AIP par partie', valeur: (p) => (p.aip ? totalAip(p.aip) : '') }, { titre: 'Troupeau', valeur: (p) => (p.aip ? p.aip.troupeau : '') }
        ]), 'personnages-en-jeu.csv', 'text/csv;charset=utf-8')))));
  }

  dessinerCalendrier();
  await charger();
});
