// =====================================================================
// Page /membres/notifications/
// - Conteurs : fiches soumises à valider, résultats des challenges envoyés.
// - Joueurs  : résultat de leurs demandes de validation (avec le message du
//   conteur), tableaux d'enquête partagés avec leurs personnages, challenges
//   demandés par les conteurs.
// Les notifications sont de petits documents (collection notifications),
// supprimés dès que le joueur les a lus, pour ne pas encombrer la base.
// =====================================================================
import {
  h, db, fs, pageProtegee, barreMembre, estConteur, message, messageErreur, dateFr, millis, confirmer
} from '../core.js';
import { incarnationMemorisee, incarner } from '../incarnation.js';
import { descriptionChallenge, normaliserChallenge, bilan, detailManches } from '../defis.js';
import { donneesDoc } from '../compression.js';

const racine = document.getElementById('cam-notifications');
barreMembre(document.getElementById('cam-barre'));

const RESULTAT_FICHE = {
  validee: ['validée (en réserve)', 'active'],
  active: ['mise en jeu', 'active'],
  refusee: ['renvoyée pour correction', 'refusee'],
  archivee: ['archivée', 'archivee']
};

pageProtegee(racine, 'actif', async ({ user, profil }) => {
  const uid = user.uid;
  const conteur = estConteur(profil);
  const msg = h('div', { class: 'cam-msg' });
  racine.append(msg);
  const zones = h('div');
  racine.append(zones);

  /** Ouvre un lien en tant que personnage (change de personnage incarné si besoin). */
  function enTantQue(perso, url) {
    const actuel = incarnationMemorisee(uid);
    if (!actuel || actuel.id !== perso.id) incarner(uid, perso);
    location.href = url;
  }
  const libelleEnTantQue = (perso) => {
    const actuel = incarnationMemorisee(uid);
    return actuel && actuel.id === perso.id ? '' : ' (en tant que ' + perso.nom + ')';
  };

  async function supprimer(chemin, id) {
    try { await fs.deleteDoc(fs.doc(db, chemin, id)); await charger(); }
    catch (e) { message(msg, messageErreur(e), 'err'); }
  }

  async function charger() {
    zones.replaceChildren(h('p', { class: 'sous-titre' }, 'Chargement…'));
    try {
      const [notifsSnap, mesDefisSnap, soumisesSnap, tousDefisSnap] = await Promise.all([
        fs.getDocs(fs.query(fs.collection(db, 'notifications'), fs.where('destinataire', '==', uid))),
        fs.getDocs(fs.query(fs.collection(db, 'defis'), fs.where('destinataire', '==', uid))),
        conteur ? fs.getDocs(fs.query(fs.collection(db, 'personnages'), fs.where('statut', '==', 'soumise'))) : null,
        conteur ? fs.getDocs(fs.collection(db, 'defis')) : null
      ]);
      const recent = (a, b) => millis(b.creeLe) - millis(a.creeLe);
      const notifs = notifsSnap.docs.map(donneesDoc).sort(recent);
      const mesDefis = mesDefisSnap.docs.map(donneesDoc).sort(recent);
      const blocs = [];

      if (conteur) {
        const soumises = soumisesSnap.docs.map(donneesDoc).sort((a, b) => millis(a.majLe) - millis(b.majLe));
        blocs.push(blocFichesAValider(soumises));
        blocs.push(blocDefisEnvoyes(tousDefisSnap.docs.map(donneesDoc).sort(recent)));
      }
      blocs.push(blocResultatsFiches(notifs.filter((n) => n.type === 'fiche')));
      blocs.push(blocTableaux(notifs.filter((n) => n.type === 'tableau')));
      blocs.push(blocDefisDemandes(mesDefis));
      zones.replaceChildren(...blocs.filter(Boolean));
      if (!zones.children.length) zones.append(h('div', { class: 'cam-bloc' }, h('p', { class: 'sous-titre', style: 'margin:0' }, 'Rien de nouveau.')));
    } catch (e) {
      console.error(e);
      zones.replaceChildren();
      message(msg, messageErreur(e), 'err');
    }
  }

  // -------------------------------------------------------------------
  // Conteurs
  // -------------------------------------------------------------------
  function blocFichesAValider(soumises) {
    return h('div', { class: 'cam-bloc' },
      h('h2', {}, 'Fiches à valider ', soumises.length ? h('span', { class: 'cam-tag soumise' }, String(soumises.length)) : ''),
      soumises.length
        ? h('div', { class: 'cam-table-defil' }, h('table', { class: 'cam-table' }, h('tbody', {}, soumises.map((f) => h('tr', {},
          h('td', {}, h('strong', {}, f.nom || 'Sans nom'), h('br'), h('small', { class: 'sous-titre' }, [f.clan, f.secte].filter(Boolean).join(' · '))),
          h('td', {}, h('small', {}, 'de ' + (f.proprietaireNom || '?'))),
          h('td', {}, h('small', {}, 'soumise le ' + dateFr(f.majLe, true))),
          h('td', {}, h('a', { class: 'cam-btn petit', href: '/membres/fiches/#fiche-' + f.id }, 'Relire')))))))
        : h('p', { class: 'sous-titre', style: 'margin:0' }, 'Aucune fiche en attente de validation.'));
  }

  function blocDefisEnvoyes(defis) {
    const resolus = defis.filter((d) => d.statut === 'joue');
    return h('div', { class: 'cam-bloc' },
      h('h2', {}, 'Challenges envoyés ', resolus.length ? h('span', { class: 'cam-tag soumise' }, resolus.length + ' résolu' + (resolus.length > 1 ? 's' : '')) : ''),
      h('p', { class: 'sous-titre' }, 'Pour proposer un challenge à un personnage : page ', h('a', { href: '/utils/challenge' }, 'Challenge'), '. Supprimez une demande une fois son résultat lu.'),
      defis.length ? defis.map((d) => carteDefi(d, true)) : h('p', { class: 'sous-titre', style: 'margin:0' }, 'Aucun challenge en cours.'));
  }

  // -------------------------------------------------------------------
  // Joueurs
  // -------------------------------------------------------------------
  function blocResultatsFiches(liste) {
    if (!liste.length) return null;
    return h('div', { class: 'cam-bloc' },
      h('h2', {}, 'Mes fiches de personnage'),
      liste.map((n) => {
        const [texte, classe] = RESULTAT_FICHE[n.statut] || [n.statut, ''];
        return h('div', { class: 'cam-notif' },
          h('div', { class: 'cam-notif-tete' },
            h('span', {}, 'Fiche ', h('strong', {}, '« ' + n.personnageNom + ' »'), ' ', h('span', { class: 'cam-tag ' + classe }, texte)),
            h('small', { class: 'sous-titre' }, dateFr(n.creeLe, true) + ' · ' + (n.auteurNom || 'un conteur'))),
          n.message ? h('div', { class: 'cam-notif-message' }, n.message) : '',
          h('div', { class: 'cam-actions' },
            h('a', { class: 'cam-btn petit secondaire', href: '/membres/fiches/#fiche-' + n.personnage }, 'Voir la fiche'),
            h('button', { type: 'button', class: 'petit', onclick: () => supprimer('notifications', n.id) }, 'J\'ai lu')));
      }),
      liste.length > 1 ? h('button', {
        type: 'button', class: 'petit secondaire', onclick: async () => {
          try {
            const lot = fs.writeBatch(db);
            liste.forEach((n) => lot.delete(fs.doc(db, 'notifications', n.id)));
            await lot.commit(); await charger();
          } catch (e) { message(msg, messageErreur(e), 'err'); }
        }
      }, 'Tout marquer comme lu') : '');
  }

  function blocTableaux(liste) {
    if (!liste.length) return null;
    return h('div', { class: 'cam-bloc' },
      h('h2', {}, 'Tableaux d\'enquête partagés'),
      h('div', { class: 'cam-table-defil' }, h('table', { class: 'cam-table' }, h('tbody', {}, liste.map((n) => {
        const perso = { id: n.personnage, nom: n.personnageNom };
        return h('tr', {},
          h('td', {}, h('strong', {}, n.titre), h('br'),
            h('small', { class: 'sous-titre' }, (n.auteurNom || '?') + ' l\'a partagé avec ' + n.personnageNom + ' · ' + (n.droit === 'ecriture' ? 'modification' : 'lecture'))),
          h('td', {}, h('small', {}, dateFr(n.creeLe, true))),
          h('td', { style: 'white-space:nowrap' },
            h('button', { type: 'button', class: 'petit', onclick: () => enTantQue(perso, '/utils/tableau?tableau=' + encodeURIComponent(n.tableau)) },
              'Ouvrir' + libelleEnTantQue(perso)),
            h('button', { type: 'button', class: 'petit secondaire', title: 'Retirer de cette liste (le tableau reste partagé)', onclick: () => supprimer('notifications', n.id) }, 'Retirer')));
      })))),
      h('p', { class: 'sous-titre', style: 'margin:.6rem 0 0' }, 'Ces tableaux restent aussi accessibles depuis « ☰ Ouvrir » dans le tableau d\'enquête.'));
  }

  function blocDefisDemandes(defis) {
    if (!defis.length) return null;
    return h('div', { class: 'cam-bloc' },
      h('h2', {}, 'Challenges demandés'),
      defis.map((d) => carteDefi(d, false)));
  }

  /** Une demande de challenge (vue conteur ou vue joueur). */
  function carteDefi(d, vueConteur) {
    const challenges = (d.challenges || []).map(normaliserChallenge);
    const perso = { id: d.personnage, nom: d.personnageNom };
    const joue = d.statut === 'joue';
    const resultats = Array.isArray(d.resultats) ? d.resultats : [];
    return h('div', { class: 'cam-notif' },
      h('div', { class: 'cam-notif-tete' },
        h('span', {}, h('strong', {}, d.titre), ' — ', vueConteur ? 'pour ' + d.personnageNom : 'demandé à ' + d.personnageNom,
          ' ', h('span', { class: 'cam-tag ' + (joue ? 'active' : 'soumise') }, joue ? 'résolu' : 'en attente')),
        h('small', { class: 'sous-titre' }, (joue ? 'résolu le ' + dateFr(d.joueLe, true) : 'demandé le ' + dateFr(d.creeLe, true)) + ' · ' + (d.conteurNom || 'un conteur'))),
      d.message ? h('div', { class: 'cam-notif-message' }, d.message) : '',
      h('ol', { class: 'cam-defi-liste' }, challenges.map((c, i) => {
        const r = resultats[i];
        return h('li', {},
          h('strong', {}, c.libelle || 'Challenge ' + (i + 1)), ' — ', descriptionChallenge(c),
          r ? [h('br'), h('span', { class: 'cam-defi-bilan' }, bilan(r)),
            vueConteur ? h('details', {}, h('summary', {}, 'Détail des manches'), h('div', { class: 'cam-defi-detail' }, detailManches(r).join('\n'))) : '']
            : '');
      })),
      h('div', { class: 'cam-actions' },
        !vueConteur && !joue ? h('button', { type: 'button', class: 'petit', onclick: () => enTantQue(perso, '/utils/challenge?defi=' + encodeURIComponent(d.id)) },
          'Résoudre' + libelleEnTantQue(perso)) : '',
        !vueConteur && joue ? h('small', { class: 'sous-titre' }, 'Résultat envoyé au conteur.') : '',
        vueConteur ? h('button', {
          type: 'button', class: 'petit ' + (joue ? '' : 'danger'),
          onclick: () => (joue || confirmer('Annuler la demande « ' + d.titre + ' » ?')) && supprimer('defis', d.id)
        }, joue ? 'Lu, supprimer' : 'Annuler la demande') : ''));
  }

  await charger();
});
