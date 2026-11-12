// =====================================================================
// Page /membres/tickets/ : demandes adressées aux conteurs
// - Joueurs  : nouveau ticket, suivi de leurs tickets (réponses, compléments).
// - Conteurs : en plus, les tickets des joueurs (ouverts d'abord), réponse,
//   statut, export CSV.
// La réponse d'un conteur date le ticket (reponduLe) : le joueur la voit
// signalée comme nouvelle dans ses notifications.
// =====================================================================
import {
  h, db, fs, pageProtegee, barreMembre, estConteur, message, messageErreur, dateFr, millis, onglets, options,
  confirmer, telecharger, versCsv
} from '../core.js';
import { CATEGORIES_TICKET, STATUTS_TICKET, CLASSE_TICKET } from '../donnees.js';
import { compresser, donneesDoc } from '../compression.js';
import { personnagesValides } from '../annuaire.js';
import { marquerVu, TICKETS_OUVERTS } from '../suivi.js';

const racine = document.getElementById('cam-tickets');
barreMembre(document.getElementById('cam-barre'));

pageProtegee(racine, 'actif', async ({ user, profil }) => {
  const uid = user.uid;
  const conteur = estConteur(profil);
  const demande = decodeURIComponent(location.hash.slice(1)).replace(/^ticket-/, '');
  const vuAvant = (() => { try { return JSON.parse(localStorage.getItem('cam-vu-' + uid) || '{}').tickets || 0; } catch (e) { return 0; } })();

  const panneaux = { mes: h('div', { dataset: { panneau: 'mes' } }) };
  if (conteur) panneaux.joueurs = h('div', { dataset: { panneau: 'joueurs' } });
  const app = h('div', {},
    conteur ? h('div', { class: 'cam-onglets' },
      h('button', { type: 'button', dataset: { onglet: 'mes' } }, 'Mes tickets'),
      h('button', { type: 'button', dataset: { onglet: 'joueurs' } }, 'Tickets des joueurs')) : '',
    Object.values(panneaux));
  racine.append(app);
  if (conteur) onglets(app)(location.hash === '#joueurs' ? 'joueurs' : 'mes');
  else panneaux.mes.classList.add('actif');

  // ===================================================================
  // Mes tickets
  // ===================================================================
  const mesPersos = (await personnagesValides().catch(() => [])).filter((p) => p.proprietaire === uid);
  const categorie = options(h('select', {}), CATEGORIES_TICKET);
  const persoTicket = options(h('select', {}), [['', 'Aucun / question générale'], ...mesPersos.map((p) => [p.id, p.nom])], '');
  const sujet = h('input', { type: 'text', maxlength: 150, placeholder: 'Ex : Scène avec le Prince' });
  const description = h('textarea', { maxlength: 6000, placeholder: 'Détaillez votre demande le plus précisément possible.' });
  const msg = h('div', { class: 'cam-msg' });
  const liste = h('div', {}, h('p', { class: 'sous-titre' }, 'Chargement…'));
  const btn = h('button', { type: 'button' }, 'Envoyer le ticket');
  btn.addEventListener('click', async () => {
    if (!sujet.value.trim() || !description.value.trim()) { message(msg, 'Le sujet et la description sont obligatoires.', 'err'); return; }
    const p = mesPersos.find((x) => x.id === persoTicket.value);
    btn.disabled = true;
    try {
      await fs.addDoc(fs.collection(db, 'tickets'), {
        proprietaire: uid, proprietaireNom: profil.nom, personnageId: p ? p.id : '', personnageNom: p ? p.nom : '',
        categorie: categorie.value, sujet: sujet.value.trim(), description: compresser(description.value.trim()),
        statut: 'En attente', resultat: '', creeLe: fs.serverTimestamp()
      });
      sujet.value = ''; description.value = '';
      message(msg, 'Ticket envoyé.', 'ok');
      chargerMesTickets();
    } catch (e) { message(msg, messageErreur(e), 'err'); }
    finally { btn.disabled = false; }
  });
  panneaux.mes.append(
    h('div', { class: 'cam-bloc' },
      h('h2', {}, 'Nouveau ticket'),
      h('p', { class: 'sous-titre' }, 'Demande adressée aux conteurs : scène, contact avec un antagoniste, dépense d\'XP, question de règles, signalement… (pour modifier une fiche validée : bouton « Demander une modification » sur la fiche).'),
      h('div', { class: 'cam-ligne' }, h('div', {}, h('label', {}, 'Catégorie'), categorie), h('div', {}, h('label', {}, 'Personnage concerné'), persoTicket)),
      h('label', {}, 'Sujet *'), sujet, h('label', {}, 'Description *'), description, btn, msg),
    h('div', { class: 'cam-bloc' }, h('h2', {}, 'Mes tickets'), liste));

  async function chargerMesTickets() {
    try {
      const s = await fs.getDocs(fs.query(fs.collection(db, 'tickets'), fs.where('proprietaire', '==', uid)));
      const tickets = s.docs.map(donneesDoc).sort((a, b) => millis(b.creeLe) - millis(a.creeLe));
      liste.replaceChildren(...(tickets.length ? tickets.map(ticketJoueur) : [h('p', { class: 'sous-titre' }, 'Aucun ticket.')]));
      marquerVu(uid, 'tickets');
      mettreEnAvant(liste);
    } catch (e) { liste.replaceChildren(h('div', { class: 'cam-msg err' }, messageErreur(e))); }
  }

  const nouveau = (t) => millis(t.reponduLe) > vuAvant;
  function enTete(t) {
    return h('div', { class: 'meta' },
      h('span', { class: 'cam-tag ' + (CLASSE_TICKET[t.statut] || 'attente') }, t.statut),
      h('span', { class: 'cam-tag' }, t.categorie),
      nouveau(t) && t.proprietaire === uid ? h('span', { class: 'cam-tag soumise' }, 'Nouvelle réponse') : '',
      dateFr(t.creeLe, true), t.proprietaireNom && t.proprietaire !== uid ? ' — ' + t.proprietaireNom : '',
      t.personnageNom ? ' (' + t.personnageNom + ')' : '');
  }

  function ticketJoueur(t) {
    const msgT = h('div', { class: 'cam-msg' });
    const complement = h('textarea', { maxlength: 2000, placeholder: 'Votre réponse au conteur…', style: 'min-height:3rem' });
    return h('div', { class: 'cam-element', id: 'ticket-' + t.id, dataset: { id: t.id } },
      enTete(t),
      h('strong', {}, t.sujet), h('div', { class: 'texte' }, t.description),
      h('div', { class: 'reponse' + (t.resultat ? '' : ' vide') }, t.resultat ? ['Réponse du conteur : ', t.resultat] : 'En attente du traitement par un conteur…'),
      t.statut === 'Informations demandées' ? h('div', {}, h('label', {}, 'Compléter ma demande'), complement,
        h('button', {
          type: 'button', class: 'petit', onclick: async () => {
            if (!complement.value.trim()) return;
            try {
              const desc = (t.description + '\n\n— Complément du ' + new Date().toLocaleDateString('fr-FR') + ' —\n' + complement.value.trim()).slice(0, 8000);
              await fs.updateDoc(fs.doc(db, 'tickets', t.id), { description: compresser(desc), statut: 'En attente', majLe: fs.serverTimestamp() });
              chargerMesTickets();
            } catch (e) { message(msgT, messageErreur(e), 'err'); }
          }
        }, 'Envoyer le complément')) : '',
      t.statut === 'En attente' || t.statut === 'Informations demandées' ? h('button', {
        type: 'button', class: 'petit secondaire', onclick: async () => {
          if (!confirmer('Annuler ce ticket ?')) return;
          try { await fs.updateDoc(fs.doc(db, 'tickets', t.id), { statut: 'Annulé', majLe: fs.serverTimestamp() }); chargerMesTickets(); }
          catch (e) { message(msgT, messageErreur(e), 'err'); }
        }
      }, 'Annuler le ticket') : '',
      msgT);
  }

  function mettreEnAvant(zone) {
    const el = demande && zone.querySelector('[data-id="' + CSS.escape(demande) + '"]');
    if (el) { el.classList.add('epingle'); el.scrollIntoView({ block: 'center' }); }
  }

  await chargerMesTickets();

  // ===================================================================
  // Conteurs : tickets des joueurs
  // ===================================================================
  if (!conteur) return;
  let tous = [], avecClos = false, filtre = '';
  const msgC = h('div', { class: 'cam-msg' });
  const zoneC = h('div');
  const selFiltre = h('select', {});
  const boutonClos = h('button', { type: 'button', class: 'secondaire' }, 'Afficher aussi les tickets clos');
  boutonClos.addEventListener('click', () => { avecClos = true; boutonClos.hidden = true; chargerTous(); });
  selFiltre.addEventListener('change', () => { filtre = selFiltre.value; dessinerTous(); });
  const exporter = h('button', { type: 'button', class: 'secondaire' }, 'Exporter en CSV');
  exporter.addEventListener('click', () => telecharger(versCsv(tous, [
    { titre: 'Créé le', cle: 'creeLe' }, { titre: 'Joueur', cle: 'proprietaireNom' }, { titre: 'Personnage', cle: 'personnageNom' },
    { titre: 'Catégorie', cle: 'categorie' }, { titre: 'Sujet', cle: 'sujet' }, { titre: 'Description', cle: 'description' },
    { titre: 'Statut', cle: 'statut' }, { titre: 'Réponse', cle: 'resultat' }, { titre: 'Répondu le', cle: 'reponduLe' }
  ]), 'tickets.csv', 'text/csv;charset=utf-8'));
  panneaux.joueurs.append(h('div', { class: 'cam-bloc' },
    h('h2', {}, 'Tickets des joueurs'),
    h('p', { class: 'sous-titre' }, 'Par défaut, seuls les tickets ouverts sont chargés (en attente, en cours, informations demandées).'),
    h('div', { class: 'cam-ligne' }, h('div', {}, h('label', {}, 'Statut'), selFiltre)),
    h('div', { class: 'cam-actions' }, boutonClos, exporter), msgC, zoneC));

  async function chargerTous() {
    message(msgC, 'Chargement…', 'info');
    try {
      const q = avecClos ? fs.collection(db, 'tickets') : fs.query(fs.collection(db, 'tickets'), fs.where('statut', 'in', TICKETS_OUVERTS));
      tous = (await fs.getDocs(q)).docs.map(donneesDoc).sort((a, b) => millis(b.creeLe) - millis(a.creeLe));
      message(msgC, tous.length + ' ticket(s)' + (avecClos ? '' : ' ouvert(s)') + '.', 'ok');
      dessinerTous();
    } catch (e) { message(msgC, messageErreur(e), 'err'); }
  }

  function dessinerTous() {
    options(selFiltre, avecClos ? STATUTS_TICKET : TICKETS_OUVERTS, filtre, 'Tous');
    const liste = tous.filter((t) => !filtre || t.statut === filtre);
    zoneC.replaceChildren(...(liste.length ? liste.map(ticketConteur) : [h('p', { class: 'sous-titre' }, 'Aucun ticket.')]));
    mettreEnAvant(zoneC);
  }

  function ticketConteur(t) {
    const statut = options(h('select', {}), STATUTS_TICKET, t.statut);
    const resultat = h('textarea', { maxlength: 6000 }, t.resultat || '');
    const msgT = h('div', { class: 'cam-msg' });
    return h('div', { class: 'cam-element', dataset: { id: t.id } },
      enTete(t),
      h('strong', {}, t.sujet), h('div', { class: 'texte' }, t.description),
      h('div', { class: 'cam-ligne' }, h('div', {}, h('label', {}, 'Statut'), statut)),
      h('label', {}, 'Réponse au joueur'), resultat,
      h('button', {
        type: 'button', class: 'petit ok', onclick: async () => {
          try {
            await fs.updateDoc(fs.doc(db, 'tickets', t.id), {
              statut: statut.value, resultat: compresser(resultat.value.trim()),
              majLe: fs.serverTimestamp(), reponduLe: fs.serverTimestamp(), traitePar: uid
            });
            t.statut = statut.value; t.resultat = resultat.value.trim();
            message(msgT, 'Ticket mis à jour : le joueur verra la réponse dans ses notifications.', 'ok');
          } catch (e) { message(msgT, messageErreur(e), 'err'); }
        }
      }, 'Enregistrer'), msgT);
  }

  await chargerTous();
});
