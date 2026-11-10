// Page /membres/affichage/ : tableau d'affichage général (temps réel).
import {
  h, db, fs, pageProtegee, barreMembre, estConteur, message, messageErreur, dateFr, millis, confirmer, options, ROLES
} from '../core.js';
import { compresserFichier, enregistrerImage, baliseImage, chargerImage } from '../images.js';
import { CATEGORIES_AFFICHAGE } from '../donnees.js';

const racine = document.getElementById('cam-affichage');
barreMembre(document.getElementById('cam-barre'));

const PAS = 30;

pageProtegee(racine, 'actif', async ({ user, profil }) => {
  const conteur = estConteur(profil);
  let limite = PAS;
  let arret = null;
  let filtre = '';
  let messages = [];

  // --- Rédaction ---
  const categories = Object.entries(CATEGORIES_AFFICHAGE).filter(([k]) => k !== 'annonce' || conteur);
  const categorie = options(h('select', {}), categories, conteur ? 'annonce' : 'rp');
  const titre = h('input', { type: 'text', maxlength: 120, placeholder: 'Titre (facultatif)' });
  const texte = h('textarea', { maxlength: 6000, placeholder: 'Votre message…' });
  const epingle = h('input', { type: 'checkbox' });
  const fichier = h('input', { type: 'file', accept: 'image/*', hidden: true });
  const apercu = h('div');
  const msg = h('div', { class: 'cam-msg' });
  let imageData = '';
  fichier.addEventListener('change', async () => {
    const f = fichier.files[0]; fichier.value = '';
    if (!f) return;
    try {
      imageData = await compresserFichier(f, { cote: 1400 });
      apercu.replaceChildren(h('img', { src: imageData, style: 'max-height:120px;border-radius:4px;margin-top:.5rem' }),
        h('button', { type: 'button', class: 'petit secondaire', onclick: () => { imageData = ''; apercu.replaceChildren(); } }, 'Retirer l\'image'));
    } catch (e) { message(msg, messageErreur(e), 'err'); }
  });
  const publier = h('button', { type: 'button' }, 'Publier');
  publier.addEventListener('click', async () => {
    if (!texte.value.trim()) { message(msg, 'Le message est vide.', 'err'); return; }
    publier.disabled = true;
    message(msg, 'Publication…', 'info');
    try {
      const image = imageData ? await enregistrerImage(imageData) : '';
      await fs.addDoc(fs.collection(db, 'affichage'), {
        auteur: user.uid, auteurNom: profil.nom, auteurRole: profil.role,
        categorie: categorie.value, titre: titre.value.trim(), texte: texte.value.trim(),
        image, epingle: conteur && epingle.checked, creeLe: fs.serverTimestamp()
      });
      titre.value = ''; texte.value = ''; imageData = ''; apercu.replaceChildren(); epingle.checked = false;
      message(msg, 'Message publié.', 'ok');
    } catch (e) { message(msg, messageErreur(e), 'err'); }
    publier.disabled = false;
  });

  const redaction = h('div', { class: 'cam-bloc' },
    h('h2', {}, 'Nouveau message'),
    h('div', { class: 'cam-ligne' }, h('div', {}, h('label', {}, 'Rubrique'), categorie), h('div', {}, h('label', {}, 'Titre'), titre)),
    h('label', {}, 'Message'), texte,
    apercu,
    h('div', { class: 'cam-actions' },
      publier,
      h('button', { type: 'button', class: 'secondaire', onclick: () => fichier.click() }, 'Ajouter une image'), fichier,
      conteur ? h('label', { class: 'cam-coche', style: 'margin:.6rem 0 0 .4rem' }, epingle, 'Épingler en haut') : ''),
    msg);

  // --- Filtres + fil ---
  const filtres = h('div', { class: 'cam-onglets' },
    [['', 'Tout'], ...Object.entries(CATEGORIES_AFFICHAGE)].map(([k, lib]) => h('button', {
      type: 'button', class: k === '' ? 'actif' : '', dataset: { onglet: k || 'tout' },
      onclick: (e) => {
        filtre = k;
        filtres.querySelectorAll('button').forEach((b) => b.classList.toggle('actif', b === e.currentTarget));
        dessiner();
      }
    }, lib)));
  const fil = h('div');
  const plus = h('button', { type: 'button', class: 'secondaire', onclick: () => { limite += PAS; ecouter(); } }, 'Afficher les messages plus anciens');
  racine.append(redaction, filtres, fil, plus);

  function ecouter() {
    if (arret) arret();
    const q = fs.query(fs.collection(db, 'affichage'), fs.orderBy('creeLe', 'desc'), fs.limit(limite));
    arret = fs.onSnapshot(q, (snap) => {
      messages = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
      plus.style.display = snap.size >= limite ? '' : 'none';
      dessiner();
    }, (e) => { fil.replaceChildren(h('div', { class: 'cam-encart erreur' }, messageErreur(e))); });
  }

  const ouverts = new Set(); // messages dont les réponses sont dépliées

  function dessiner() {
    const liste = messages.filter((m) => !filtre || m.categorie === filtre)
      .sort((a, b) => (b.epingle ? 1 : 0) - (a.epingle ? 1 : 0) || millis(b.creeLe) - millis(a.creeLe));
    fil.replaceChildren(...(liste.length ? liste.map(element) : [h('p', { class: 'sous-titre' }, 'Aucun message.')]));
  }

  function element(m) {
    const auteur = m.auteur === user.uid;
    const zoneReponses = h('div');
    const el = h('div', { class: 'cam-element' + (m.epingle ? ' epingle' : '') },
      h('div', { class: 'meta' },
        m.epingle ? '📌 ' : '',
        h('span', { class: 'cam-tag ' + m.categorie }, CATEGORIES_AFFICHAGE[m.categorie] || m.categorie),
        h('strong', {}, m.auteurNom),
        m.auteurRole && m.auteurRole !== 'joueur' ? h('span', { class: 'cam-tag ' + m.auteurRole, style: 'margin-left:.3rem' }, ROLES[m.auteurRole] || m.auteurRole) : '',
        ' · ', dateFr(m.creeLe, true), m.majLe ? ' (modifié)' : ''),
      m.titre ? h('h3', { style: 'margin:.2rem 0 .3rem' }, m.titre) : '',
      h('div', { class: 'texte' }, m.texte),
      m.image ? (() => {
        const img = baliseImage(m.image, { class: 'illustration', alt: m.titre || 'Image' });
        img.addEventListener('click', () => agrandir(m.image));
        return img;
      })() : '',
      h('div', { class: 'cam-actions' },
        h('button', { type: 'button', class: 'petit secondaire', onclick: () => basculerReponses(m, zoneReponses) }, 'Réponses'),
        auteur || conteur ? h('button', { type: 'button', class: 'petit secondaire', onclick: () => modifier(m, el) }, 'Modifier') : '',
        conteur ? h('button', {
          type: 'button', class: 'petit secondaire',
          onclick: () => fs.updateDoc(fs.doc(db, 'affichage', m.id), { epingle: !m.epingle, majLe: fs.serverTimestamp() }).catch((e) => alert(messageErreur(e)))
        }, m.epingle ? 'Désépingler' : 'Épingler') : '',
        auteur || conteur ? h('button', { type: 'button', class: 'petit danger', onclick: () => supprimer(m) }, 'Supprimer') : ''),
      zoneReponses);
    if (ouverts.has(m.id)) chargerReponses(m, zoneReponses);
    return el;
  }

  function agrandir(refImg) {
    chargerImage(refImg).then((src) => {
      if (!src) return;
      const fond = h('div', { class: 'cam-modal-fond', onclick: () => fond.remove() },
        h('img', { src, style: 'max-width:95vw;max-height:90vh;margin:auto;border-radius:6px;box-shadow:0 10px 40px rgba(0,0,0,.5)' }));
      document.body.append(fond);
    });
  }

  function modifier(m, el) {
    const t = h('input', { type: 'text', maxlength: 120, value: m.titre || '' });
    const x = h('textarea', { maxlength: 6000 }, m.texte);
    const cat = conteur ? options(h('select', {}), Object.entries(CATEGORIES_AFFICHAGE), m.categorie) : null;
    const garderImage = h('input', { type: 'checkbox', checked: !!m.image });
    const msgM = h('div', { class: 'cam-msg' });
    el.replaceChildren(
      cat ? [h('label', {}, 'Rubrique'), cat] : '',
      h('label', {}, 'Titre'), t, h('label', {}, 'Message'), x,
      m.image ? h('label', { class: 'cam-coche' }, garderImage, 'Garder l\'image') : '',
      h('div', { class: 'cam-actions' },
        h('button', {
          type: 'button', onclick: async () => {
            if (!x.value.trim()) { message(msgM, 'Le message est vide.', 'err'); return; }
            const champs = { titre: t.value.trim(), texte: x.value.trim(), image: m.image && garderImage.checked ? m.image : '', majLe: fs.serverTimestamp() };
            if (cat) champs.categorie = cat.value;
            try { await fs.updateDoc(fs.doc(db, 'affichage', m.id), champs); } catch (e) { message(msgM, messageErreur(e), 'err'); }
          }
        }, 'Enregistrer'),
        h('button', { type: 'button', class: 'secondaire', onclick: dessiner }, 'Annuler')),
      msgM);
  }

  async function supprimer(m) {
    if (!confirmer('Supprimer ce message et ses réponses ?')) return;
    try {
      // Un conteur efface tout ; un joueur efface son message et ses propres réponses
      // (les réponses des autres deviennent invisibles avec le message).
      const reps = await fs.getDocs(fs.collection(db, 'affichage', m.id, 'reponses'));
      const lot = fs.writeBatch(db);
      reps.docs.filter((d) => conteur || d.data().auteur === user.uid).forEach((d) => lot.delete(d.ref));
      lot.delete(fs.doc(db, 'affichage', m.id));
      await lot.commit();
    } catch (e) { alert(messageErreur(e)); }
  }

  function basculerReponses(m, zone) {
    if (ouverts.has(m.id)) { ouverts.delete(m.id); zone.replaceChildren(); return; }
    ouverts.add(m.id);
    chargerReponses(m, zone);
  }

  async function chargerReponses(m, zone) {
    const liste = h('div', {}, h('small', { class: 'sous-titre' }, 'Chargement…'));
    const champ = h('textarea', { maxlength: 3000, placeholder: 'Votre réponse…', style: 'min-height:3rem' });
    const msgR = h('div', { class: 'cam-msg' });
    zone.replaceChildren(h('div', { class: 'cam-reponses' }, liste, champ,
      h('button', {
        type: 'button', class: 'petit', onclick: async () => {
          if (!champ.value.trim()) return;
          try {
            await fs.addDoc(fs.collection(db, 'affichage', m.id, 'reponses'), {
              auteur: user.uid, auteurNom: profil.nom, auteurRole: profil.role, texte: champ.value.trim(), creeLe: fs.serverTimestamp()
            });
            champ.value = '';
            chargerReponses(m, zone);
          } catch (e) { message(msgR, messageErreur(e), 'err'); }
        }
      }, 'Répondre'), msgR));
    try {
      const snap = await fs.getDocs(fs.query(fs.collection(db, 'affichage', m.id, 'reponses'), fs.orderBy('creeLe', 'asc')));
      liste.replaceChildren(...(snap.empty ? [h('small', { class: 'sous-titre' }, 'Aucune réponse.')] : snap.docs.map((d) => {
        const r = d.data({ serverTimestamps: 'estimate' });
        return h('div', { class: 'rep' },
          h('strong', {}, r.auteurNom), r.auteurRole !== 'joueur' ? ' (' + (ROLES[r.auteurRole] || r.auteurRole) + ')' : '',
          h('small', { class: 'sous-titre' }, ' · ' + dateFr(r.creeLe, true)),
          r.auteur === user.uid || conteur ? h('button', {
            type: 'button', class: 'petit secondaire', style: 'margin-left:.5rem',
            onclick: async () => { if (confirmer('Supprimer cette réponse ?')) { await fs.deleteDoc(d.ref).catch((e) => alert(messageErreur(e))); chargerReponses(m, zone); } }
          }, 'Supprimer') : '',
          h('div', {}, r.texte));
      })));
    } catch (e) { liste.replaceChildren(h('div', { class: 'cam-msg err' }, messageErreur(e))); }
  }

  ecouter();
});
