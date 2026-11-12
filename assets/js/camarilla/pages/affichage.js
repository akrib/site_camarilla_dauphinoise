// =====================================================================
// Page /membres/affichage/ : panneau d'affichage en liège, partagé en
// temps réel entre les membres actifs.
//
// Tout tient dans UN document Firestore, panneau/principal :
//   notes   : { id: { texte, type, police, x, y, rotation, epingle, r, g, dechiree } }
//             x / y : position relative (0 à 1) sur le liège, pour que la
//             disposition soit la même sur ordinateur et sur téléphone ;
//             r / g : passages caviardés / coloriés [{ s, e }].
//   j0 … j5 : journal des souvenirs, 6 segments de 100 lignes { t, n, a }
//             (date en millisecondes, nom du membre, action). On écrit dans
//             le segment « courant » ; quand il est plein, on passe au suivant,
//             qu'on vide : les 500 dernières lignes sont toujours conservées.
//   courant : nom du segment en cours ('j0' à 'j5')
//   op      : { a, id } dernière opération (sert aux règles de sécurité)
//
// Une action = une seule écriture (note + ligne de journal ensemble), et une
// seule lecture par personne connectée. Aucun texte de note n'entre dans le
// journal, ni aucun lien entre une ligne du journal et une note précise.
// =====================================================================
import { db, fs, pageProtegee, barreMembre, estConteur, messageErreur } from '../core.js';

const SEGMENTS = ['j0', 'j1', 'j2', 'j3', 'j4', 'j5'];
const TAILLE_SEGMENT = 100;
const LIGNES_AFFICHEES = 500;
const MAX_NOTES = 80;
const MAX_MARQUES = 40;
const VISITE_MS = 30 * 60 * 1000;   // une visite n'est notée qu'une fois par demi-heure
const INTERET_MS = 2 * 60 * 1000;   // relire la même note dans les 2 minutes n'est pas re-noté

const REF = fs.doc(db, 'panneau', 'principal');
const racine = document.getElementById('cam-affichage');
barreMembre(document.getElementById('cam-barre'));

pageProtegee(racine, 'actif', ({ profil }) => demarrer(profil));

function demarrer(profil) {
  const $ = (id) => document.getElementById(id);
  const coque = $('panneau');
  const couches = $('panneauCouches');
  document.body.append(couches);   // les fenêtres passent au-dessus de l'en-tête du thème
  coque.hidden = false;
  couches.hidden = false;
  racine.hidden = true;

  const board = $('board');
  const composerModal = $('composerModal');
  const detailModal = $('detailModal');
  const noteInput = $('noteInput');
  const noteType = $('noteType');
  const noteFont = $('noteFont');
  const noteCount = $('noteCount');
  const logList = $('logList');
  const logCount = $('logCount');
  const createPreview = $('createPreview');
  const previewText = $('previewText');
  const detailState = $('detailState');
  const tearPanel = $('tearPanel');
  const confirmModal = $('actionConfirm');
  const toolHint = $('toolHint');
  const selectionPreview = $('selectionPreview');
  const toast = $('toast');
  const tearInstruction = tearPanel.querySelector('.tear-instruction');

  const nom = String(profil.nom || 'Joueur').slice(0, 60);
  const conteur = estConteur(profil);
  $('playerName').textContent = nom;
  $('playerName').title = 'Connecté : ' + nom;
  if (conteur) $('clearLog').hidden = false;

  const fontStacks = {
    georgia: 'Georgia, "Times New Roman", serif',
    serif: '"Times New Roman", Times, serif',
    arial: 'Arial, Helvetica, sans-serif',
    verdana: 'Verdana, Geneva, sans-serif',
    mono: '"Courier New", Courier, monospace',
    trebuchet: '"Trebuchet MS", Arial, sans-serif'
  };
  const typeNames = {
    paper: 'bout de papier', postit: 'post-it', parchment: 'vélin ouvragé', newspaper: 'article de journal',
    napkin: 'serviette de table', businesscard: 'carte de visite', expense: 'note de frais', invoice: 'facture', receipt: 'ticket / reçu'
  };
  const pinColors = ['#b94335', '#3e5960', '#b18a45', '#6c4d6c', '#526447'];
  // Les libellés sont générés à partir d'actions prédéfinies : le texte des notes n'entre jamais dans les logs.
  const actionPhrases = {
    visite: (n) => `${n} est venu voir le tableau.`,
    ajout: (n) => `${n} a ajouté une note.`,
    interet: (n) => `${n} s'est intéressé à une note.`,
    caviardage: (n) => `${n} a caviardé une note.`,
    coloriage: (n) => `${n} a colorié une note.`,
    dechirure: (n) => `${n} a déchiré une note.`,
    retrait: (n) => `${n} a enlevé une note.`,
    deplacement: (n) => `${n} a déplacé une note.`
  };

  let etat = null;            // dernier état du document (null tant qu'il n'existe pas)
  let charge = false;         // premier instantané reçu
  let notes = [];             // [{ id, ... }] dans l'ordre d'épinglage
  let journal = [];           // 500 dernières lignes, la plus récente d'abord
  let openedNoteId = null;
  let detailSignature = '';
  let dragState = null;
  let renduDiffere = false;
  let toastTimer = null;
  let selectionMode = null;
  let pendingSelection = null;
  let scissorsMarker = null;
  let scissorsDragging = false;
  let scissorsCutOffset = null;
  let visiteTentee = false;
  const interets = new Map();  // note -> date du dernier « s'est intéressé » noté

  // -------------------------------------------------------------------
  // Utilitaires
  // -------------------------------------------------------------------
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const arrondi = (v) => Math.round(clamp(Number(v) || 0, 0, 1) * 10000) / 10000;
  const makeId = () => 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const dateLog = (t) => new Date(t).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  function notify(message, erreur = false) {
    toast.textContent = message;
    toast.classList.toggle('erreur', erreur);
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, erreur ? 4500 : 2300);
  }
  function closeModal(modal) {
    modal.hidden = true;
    if ([composerModal, detailModal, confirmModal].every((item) => item.hidden)) document.body.style.overflow = '';
  }
  function openModal(modal) { modal.hidden = false; document.body.style.overflow = 'hidden'; }

  // Remplace les lettres d'un passage (sans toucher aux espaces ni à la longueur) :
  // le texte caviardé ou colorié n'existe plus, même dans la base.
  function masquer(texte, start, end) {
    const passage = Array.from(texte.slice(start, end)).map((c) => (/\s/.test(c) ? c : (c.length === 2 ? '\u{1F7EB}' : '█'))).join('');
    return texte.slice(0, start) + passage + texte.slice(end);
  }

  // -------------------------------------------------------------------
  // Lecture du document
  // -------------------------------------------------------------------
  function marques(liste, longueur) {
    return (Array.isArray(liste) ? liste : [])
      .filter((m) => m && Number.isFinite(m.s) && Number.isFinite(m.e) && m.e > m.s)
      .map((m) => ({ s: clamp(m.s, 0, longueur), e: clamp(m.e, 0, longueur) }));
  }
  function lireNotes(map) {
    return Object.entries(map || {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([id, n]) => {
      const texte = String(n.texte || '');
      return {
        id, texte,
        type: typeNames[n.type] ? n.type : 'paper',
        police: fontStacks[n.police] ? n.police : 'georgia',
        x: arrondi(n.x), y: arrondi(n.y),
        rotation: Number.isFinite(n.rotation) ? n.rotation : 0,
        epingle: typeof n.epingle === 'string' ? n.epingle : '',
        r: marques(n.r, texte.length), g: marques(n.g, texte.length),
        dechiree: !!n.dechiree
      };
    });
  }
  const segmentCourant = (d) => Math.max(0, SEGMENTS.indexOf(d.courant));
  function lireJournal(d) {
    const c = segmentCourant(d);
    let tout = [];
    // Du plus ancien segment (celui qui suit le courant) au courant.
    for (let k = 1; k <= SEGMENTS.length; k++) {
      const liste = d[SEGMENTS[(c + k) % SEGMENTS.length]];
      if (Array.isArray(liste)) tout = tout.concat(liste);
    }
    return tout.filter((e) => e && actionPhrases[e.a]).slice(-LIGNES_AFFICHEES).reverse();
  }

  fs.onSnapshot(REF, (snap) => {
    etat = snap.exists() ? snap.data() : null;
    charge = true;
    notes = etat ? lireNotes(etat.notes) : [];
    journal = etat ? lireJournal(etat) : [];
    if (dragState) renduDiffere = true; else renderBoard();
    renderLogs();
    synchroniserDetail();
    if (!visiteTentee) { visiteTentee = true; visiter(); }
  }, (err) => {
    console.error(err);
    notify('Lecture du tableau impossible : ' + messageErreur(err), true);
  });

  // -------------------------------------------------------------------
  // Écriture : la modification de note et sa ligne de journal partent ensemble
  // -------------------------------------------------------------------
  function champsJournal(d, entree) {
    const c = SEGMENTS[segmentCourant(d)];
    if ((d[c] || []).length >= TAILLE_SEGMENT) {
      const suivant = SEGMENTS[(segmentCourant(d) + 1) % SEGMENTS.length];
      return { [suivant]: [entree], courant: suivant };   // segment plein : on vide le suivant
    }
    return { [c]: fs.arrayUnion(entree) };                // ajout sans lecture préalable
  }

  async function creer(entree) {
    const doc = { notes: {}, courant: 'j0', op: { a: 'visite', id: '' } };
    SEGMENTS.forEach((j) => { doc[j] = []; });
    doc.j0 = [entree];
    await fs.setDoc(REF, doc);
  }

  class Abandon extends Error {}

  /**
   * action : code du journal ; noteId : note concernée ('' sinon) ;
   * calcul(d) : renvoie les champs de note à modifier, à partir de l'état d.
   * transaction : relit le document avant d'écrire (actions qui changent le texte).
   */
  async function ecrire(action, noteId = '', calcul = null, { transaction = false } = {}) {
    const entree = { t: Date.now(), n: nom, a: action };
    const op = { a: action, id: noteId };
    try {
      let local = etat;
      if (!local) {
        // Premier passage sur le panneau : on le crée (avec la visite), puis on continue.
        const visite = { ...entree, a: 'visite' };
        await creer(visite);
        if (action === 'visite') return true;
        local = { notes: {}, courant: 'j0', j0: [visite] };
        entree.t = Date.now() + 1;
      }
      if (transaction) {
        await fs.runTransaction(db, async (tx) => {
          const snap = await tx.get(REF);
          if (!snap.exists()) throw new Abandon('Le tableau n\'existe plus.');
          const d = snap.data();
          const champs = calcul ? calcul(d) : {};
          tx.update(REF, { ...champs, ...champsJournal(d, entree), op });
        });
      } else {
        const champs = calcul ? calcul(local) : {};
        await fs.updateDoc(REF, { ...champs, ...champsJournal(local, entree), op });
      }
      return true;
    } catch (e) {
      if (e instanceof Abandon) { notify(e.message, true); return false; }
      console.error(e);
      notify(e.code === 'permission-denied'
        ? 'Action refusée : le tableau vient de changer. Réessayez.'
        : messageErreur(e), true);
      return false;
    }
  }

  function visiter() {
    const recente = journal.some((e) => e.n === nom && e.a === 'visite' && Date.now() - e.t < VISITE_MS);
    if (!recente) ecrire('visite');
  }

  // -------------------------------------------------------------------
  // Journal
  // -------------------------------------------------------------------
  function renderLogs() {
    logList.replaceChildren();
    if (!journal.length) {
      const empty = document.createElement('li');
      empty.className = 'empty-log';
      empty.textContent = charge ? 'Aucun souvenir récent…' : 'Chargement des souvenirs…';
      logList.appendChild(empty);
      logCount.textContent = '';
      return;
    }
    const fragment = document.createDocumentFragment();
    journal.forEach((entry) => {
      const li = document.createElement('li');
      const time = document.createElement('span');
      const message = document.createElement('span');
      time.className = 'log-time';
      time.textContent = Number.isFinite(entry.t) ? dateLog(entry.t) : '--/--/---- --:--';
      message.textContent = actionPhrases[entry.a](String(entry.n || 'Joueur'));
      li.append(time, message);
      fragment.appendChild(li);
    });
    logList.appendChild(fragment);
    logCount.textContent = journal.length >= LIGNES_AFFICHEES
      ? 'Les ' + LIGNES_AFFICHEES + ' derniers souvenirs.'
      : journal.length + ' souvenir' + (journal.length > 1 ? 's' : '') + '.';
  }

  // -------------------------------------------------------------------
  // Liège
  // -------------------------------------------------------------------
  function renderMarkedText(content, text, note) {
    content.replaceChildren();
    const redactions = note ? note.r : [];
    const scribbles = note ? note.g : [];
    const bounds = new Set([0, text.length]);
    [...redactions, ...scribbles].forEach((mark) => {
      const start = clamp(mark.s, 0, text.length);
      const end = clamp(mark.e, 0, text.length);
      if (end > start) { bounds.add(start); bounds.add(end); }
    });
    const points = [...bounds].sort((a, b) => a - b);
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i], end = points[i + 1];
      if (end <= start) continue;
      const isRedacted = redactions.some((mark) => mark.s < end && mark.e > start);
      const isScribbled = scribbles.some((mark) => mark.s < end && mark.e > start);
      if (!isRedacted && !isScribbled) content.appendChild(document.createTextNode(text.slice(start, end)));
      else {
        const span = document.createElement('span');
        span.className = isRedacted ? 'marked-redacted' : 'marked-scribbled';
        span.textContent = text.slice(start, end);
        content.appendChild(span);
      }
    }
    if (!text.length) content.appendChild(document.createTextNode(''));
  }
  function makePaper(type, font, text, extraClass = '', note = null) {
    const paper = document.createElement('article');
    paper.className = `note-sheet type-${type}${extraClass ? ' ' + extraClass : ''}`;
    paper.style.fontFamily = fontStacks[font] || fontStacks.georgia;
    const heading = document.createElement('div');
    heading.className = 'sheet-heading';
    heading.textContent = typeNames[type] || 'note';
    const content = document.createElement('div');
    content.className = 'sheet-content';
    renderMarkedText(content, text, note);
    const bottom = document.createElement('div');
    bottom.className = 'sheet-bottom';
    bottom.textContent = 'PIÈCE ÉPINGLÉE';
    paper.append(heading, content, bottom);
    return paper;
  }
  function limites(el) {
    return { maxX: Math.max(0, board.clientWidth - el.offsetWidth), maxY: Math.max(0, board.clientHeight - el.offsetHeight) };
  }
  function placer(el, note) {
    const { maxX, maxY } = limites(el);
    el.style.left = `${Math.round(note.x * maxX)}px`;
    el.style.top = `${Math.round(note.y * maxY)}px`;
  }
  function renderBoard() {
    renduDiffere = false;
    board.replaceChildren();
    if (!charge) {
      const att = document.createElement('div');
      att.className = 'board-loading';
      att.textContent = 'Chargement du tableau…';
      board.appendChild(att);
    }
    notes.forEach((note) => {
      const el = document.createElement('article');
      el.className = `board-note type-${note.type}${note.r.length ? ' redacted' : ''}${note.g.length ? ' scribbled' : ''}${note.dechiree ? ' torn' : ''}`;
      el.dataset.id = note.id;
      el.style.setProperty('--note-rotation', `${note.rotation || 0}deg`);
      el.setAttribute('role', 'button');
      el.tabIndex = 0;
      el.setAttribute('aria-label', 'S\'intéresser à une note pour la lire');
      const pin = document.createElement('span');
      pin.className = 'note-pin';
      if (note.epingle) pin.style.background = `radial-gradient(circle at 32% 28%,#fff0e5,${note.epingle} 36%,#4b2922 76%)`;
      const grip = document.createElement('div');
      grip.className = 'note-grip';
      grip.title = 'Glisser pour déplacer';
      const kind = document.createElement('span');
      kind.className = 'note-kind';
      kind.textContent = typeNames[note.type] || 'note';
      const dots = document.createElement('span');
      dots.className = 'note-kind';
      dots.textContent = '···';
      grip.append(kind, dots);
      const teaser = document.createElement('div');
      teaser.className = 'note-teaser';
      el.append(pin, grip, teaser);
      el.addEventListener('click', (event) => {
        if (event.detail === 0 || !event.target.closest('.note-grip')) openDetail(note.id);
      });
      el.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDetail(note.id); }
      });
      grip.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        const rect = el.getBoundingClientRect();
        const boardRect = board.getBoundingClientRect();
        dragState = {
          id: note.id, el, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, boardRect,
          startX: el.offsetLeft, startY: el.offsetTop, x: el.offsetLeft, y: el.offsetTop, moved: false
        };
        grip.setPointerCapture?.(event.pointerId);
      });
      grip.addEventListener('pointermove', (event) => {
        if (!dragState || dragState.id !== note.id) return;
        const { maxX, maxY } = limites(el);
        const x = clamp(event.clientX - dragState.boardRect.left - dragState.offsetX, 0, maxX);
        const y = clamp(event.clientY - dragState.boardRect.top - dragState.offsetY, 0, maxY);
        if (Math.abs(x - dragState.startX) + Math.abs(y - dragState.startY) > 4) dragState.moved = true;
        dragState.x = Math.round(x); dragState.y = Math.round(y);
        el.style.left = `${dragState.x}px`; el.style.top = `${dragState.y}px`;
      });
      const finishDrag = () => {
        if (!dragState || dragState.id !== note.id) return;
        const { moved, x, y } = dragState;
        dragState = null;
        if (moved) {
          const { maxX, maxY } = limites(el);
          const nx = maxX ? arrondi(x / maxX) : 0;
          const ny = maxY ? arrondi(y / maxY) : 0;
          ecrire('deplacement', note.id, () => ({ [`notes.${note.id}.x`]: nx, [`notes.${note.id}.y`]: ny }))
            .then(() => { if (renduDiffere) renderBoard(); });
        } else {
          if (renduDiffere) renderBoard();
          openDetail(note.id);
        }
      };
      grip.addEventListener('pointerup', finishDrag);
      grip.addEventListener('pointercancel', finishDrag);
      board.appendChild(el);
      placer(el, note);
    });
    noteCount.textContent = String(notes.length);
  }

  // -------------------------------------------------------------------
  // Examen d'une note
  // -------------------------------------------------------------------
  function clearToolModes() {
    selectionMode = null;
    pendingSelection = null;
    toolHint.hidden = true;
    toolHint.textContent = '';
    tearPanel.hidden = true;
    $('confirmTear').hidden = true;
    removeScissorsMarker();
    if (window.getSelection) window.getSelection().removeAllRanges();
  }
  function getCurrentContent() {
    return detailModal.querySelector('.detail-paper-wrap .sheet-content');
  }
  const noteOuverte = () => notes.find((item) => item.id === openedNoteId);
  function renderDetail(note) {
    const oldPaper = detailModal.querySelector('.detail-paper-wrap .note-sheet');
    const newPaper = makePaper(note.type, note.police, note.texte, note.dechiree ? 'torn' : '', note);
    newPaper.id = 'detailPaper';
    oldPaper.replaceWith(newPaper);
    detailSignature = JSON.stringify(note);
    detailState.textContent = [
      note.r.length ? `Caviardages : ${note.r.length}` : '',
      note.g.length ? `Coloriages : ${note.g.length}` : '',
      note.dechiree ? 'Déchirée' : ''
    ].filter(Boolean).join(' · ') || 'Aucune intervention';
    $('showTear').disabled = note.dechiree;
  }
  // Quelqu'un d'autre a modifié ou enlevé la note qu'on examine.
  function synchroniserDetail() {
    if (!openedNoteId || detailModal.hidden) return;
    const note = noteOuverte();
    if (!note) {
      clearToolModes();
      if (!confirmModal.hidden) closeModal(confirmModal);
      closeModal(detailModal);
      openedNoteId = null;
      notify('Cette note vient d\'être enlevée du tableau.');
      return;
    }
    if (JSON.stringify(note) !== detailSignature) { clearToolModes(); renderDetail(note); }
  }
  function openDetail(noteId) {
    const note = notes.find((item) => item.id === noteId);
    if (!note) return;
    clearToolModes();
    openedNoteId = noteId;
    renderDetail(note);
    $('detailTitle').textContent = 'Examen de la note';
    openModal(detailModal);
    const dernier = interets.get(noteId) || 0;
    if (Date.now() - dernier > INTERET_MS) {
      interets.set(noteId, Date.now());
      ecrire('interet');
    }
  }
  function armSelectionTool(kind) {
    clearToolModes();
    selectionMode = kind;
    toolHint.hidden = false;
    toolHint.textContent = kind === 'redact'
      ? 'Sélectionnez à la souris le passage à caviarder. Une fenêtre de validation apparaîtra ensuite.'
      : 'Sélectionnez à la souris le passage à recouvrir de gribouillis rouges. Une fenêtre de validation apparaîtra ensuite.';
    getCurrentContent()?.focus({ preventScroll: true });
  }
  function selectionOffsets(content) {
    const selection = window.getSelection && window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) return null;
    const range = selection.getRangeAt(0);
    if (!content.contains(range.startContainer) || !content.contains(range.endContainer)) return null;
    const before = document.createRange();
    before.selectNodeContents(content);
    before.setEnd(range.startContainer, range.startOffset);
    const start = before.toString().length;
    const selected = range.toString();
    if (!selected.trim()) return null;
    return { start, end: start + selected.length, text: selected };
  }
  function showSelectionConfirmation(kind, selection) {
    pendingSelection = { kind, start: selection.start, end: selection.end };
    $('confirmTitle').textContent = kind === 'redact' ? 'Confirmer le caviardage' : 'Confirmer le coloriage';
    $('confirmDescription').textContent = kind === 'redact'
      ? 'Ce passage deviendra illisible sous des blocs d\'encre noire, pour tout le monde et définitivement.'
      : 'Ce passage sera recouvert de gribouillis rouges et deviendra illisible, pour tout le monde et définitivement.';
    selectionPreview.className = `selection-preview ${kind === 'redact' ? 'redact' : 'scribble'}`;
    selectionPreview.textContent = selection.text;
    $('acceptAction').textContent = kind === 'redact' ? 'Valider le caviardage' : 'Valider le coloriage';
    openModal(confirmModal);
  }
  function inspectTextSelection() {
    if (!selectionMode || detailModal.hidden || !confirmModal.hidden) return;
    const content = getCurrentContent();
    if (!content) return;
    const selection = selectionOffsets(content);
    if (selection) showSelectionConfirmation(selectionMode, selection);
  }
  function stopSelectionConfirmation() {
    pendingSelection = null;
    closeModal(confirmModal);
    if (window.getSelection) window.getSelection().removeAllRanges();
  }
  function removeScissorsMarker() {
    if (scissorsMarker) scissorsMarker.remove();
    scissorsMarker = null;
    scissorsDragging = false;
    scissorsCutOffset = null;
  }
  function textOffsetAt(content, node, nodeOffset) {
    if (!content || !node || !content.contains(node)) return null;
    if (node.nodeType === Node.TEXT_NODE) {
      let total = 0;
      const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
      let current;
      while ((current = walker.nextNode())) {
        if (current === node) return total + clamp(nodeOffset, 0, current.textContent.length);
        total += current.textContent.length;
      }
      return null;
    }
    const range = document.createRange();
    range.selectNodeContents(content);
    try { range.setEnd(node, nodeOffset); } catch (_) { return null; }
    return range.toString().length;
  }
  function caretAtPoint(x, y) {
    if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
    if (document.caretPositionFromPoint) {
      const position = document.caretPositionFromPoint(x, y);
      if (position) {
        const range = document.createRange();
        range.setStart(position.offsetNode, position.offset);
        range.collapse(true);
        return range;
      }
    }
    return null;
  }
  function placeScissorsAt(clientX, clientY) {
    const content = getCurrentContent();
    if (!content || !scissorsMarker) return;
    const contentRect = content.getBoundingClientRect();
    scissorsMarker.style.visibility = 'hidden';
    const caret = caretAtPoint(clientX, clientY);
    scissorsMarker.style.visibility = 'visible';
    if (!caret || !content.contains(caret.startContainer)) return;
    const offset = textOffsetAt(content, caret.startContainer, caret.startOffset);
    if (offset === null) return;
    const note = noteOuverte();
    scissorsCutOffset = clamp(offset, 0, (note?.texte || '').length);
    const left = clamp(clientX - contentRect.left - 13, 0, Math.max(0, contentRect.width - 32));
    const top = clamp(clientY - contentRect.top - 24, 0, Math.max(0, contentRect.height - 32));
    scissorsMarker.style.left = `${left}px`;
    scissorsMarker.style.top = `${top}px`;
    $('confirmTear').hidden = false;
    const words = note ? note.texte.slice(0, scissorsCutOffset).trim().split(/\s+/).filter(Boolean).length : 0;
    tearInstruction.textContent = `Point de coupe placé après environ ${words} mot(s). Déplacez les ciseaux pour ajuster, puis validez.`;
  }
  function armTearTool() {
    clearToolModes();
    const note = noteOuverte();
    if (!note || note.dechiree) return;
    const content = getCurrentContent();
    if (!content) return;
    tearPanel.hidden = false;
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'scissors-marker';
    marker.setAttribute('aria-label', 'Ciseaux : faites glisser jusqu\'au point de déchirure');
    marker.title = 'Faire glisser jusqu\'au point de coupe';
    marker.style.left = '0px';
    marker.style.top = '0px';
    content.appendChild(marker);
    scissorsMarker = marker;
    const move = (event) => { if (scissorsDragging) placeScissorsAt(event.clientX, event.clientY); };
    marker.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      scissorsDragging = true;
      marker.setPointerCapture?.(event.pointerId);
      placeScissorsAt(event.clientX, event.clientY);
    });
    marker.addEventListener('pointermove', move);
    const finish = () => { if (scissorsDragging) scissorsDragging = false; };
    marker.addEventListener('pointerup', finish);
    marker.addEventListener('pointercancel', finish);
    tearInstruction.textContent = 'Faites glisser les ciseaux sur le texte jusqu\'au mot où couper.';
    toolHint.hidden = false;
    toolHint.textContent = 'Mode déchirure : déplacez l\'icône ✂ sur le mot où la note doit être coupée, puis cliquez sur « Valider la déchirure ».';
  }
  function cutAtWordStart(text, offset) {
    let index = clamp(offset, 0, text.length);
    if (index >= text.length) return text.length;
    while (index < text.length && /\s/.test(text[index])) index++;
    while (index > 0 && !/\s/.test(text[index - 1])) index--;
    return index;
  }
  const noteDans = (d, id) => {
    const n = d && d.notes && d.notes[id];
    if (!n) throw new Abandon('Cette note n\'est plus sur le tableau.');
    return n;
  };
  async function validateTear() {
    const id = openedNoteId;
    if (!noteOuverte() || scissorsCutOffset === null) { notify('Placez d\'abord les ciseaux sur le texte.'); return; }
    const cutOffset = scissorsCutOffset;
    const ok = await ecrire('dechirure', id, (d) => {
      const n = noteDans(d, id);
      if (n.dechiree) throw new Abandon('Cette note est déjà déchirée.');
      const texte = String(n.texte || '');
      const reste = texte.slice(0, cutAtWordStart(texte, cutOffset)).trimEnd();
      if (reste.length >= texte.length) throw new Abandon('Placez les ciseaux avant la fin du texte.');
      const couper = (liste) => marques(liste, texte.length).filter((m) => m.s < reste.length).map((m) => ({ s: m.s, e: Math.min(m.e, reste.length) }));
      return {
        [`notes.${id}.texte`]: reste,
        [`notes.${id}.r`]: couper(n.r),
        [`notes.${id}.g`]: couper(n.g),
        [`notes.${id}.dechiree`]: true
      };
    }, { transaction: true });
    clearToolModes();
    if (ok) notify('La note a été déchirée.');
  }
  async function confirmSelectedAction() {
    if (!pendingSelection) return;
    const action = pendingSelection;
    const id = openedNoteId;
    stopSelectionConfirmation();
    clearToolModes();
    if (!noteOuverte()) return;
    const cle = action.kind === 'redact' ? 'r' : 'g';
    const ok = await ecrire(action.kind === 'redact' ? 'caviardage' : 'coloriage', id, (d) => {
      const n = noteDans(d, id);
      const texte = String(n.texte || '');
      const s = clamp(action.start, 0, texte.length);
      const e = clamp(action.end, 0, texte.length);
      if (e <= s) throw new Abandon('Sélection vide.');
      const existantes = marques(n[cle], texte.length);
      if (existantes.some((m) => m.s === s && m.e === e)) throw new Abandon('Ce passage est déjà marqué.');
      if (existantes.length >= MAX_MARQUES) throw new Abandon('Cette note ne peut plus recevoir de marques.');
      return { [`notes.${id}.texte`]: masquer(texte, s, e), [`notes.${id}.${cle}`]: fs.arrayUnion({ s, e }) };
    }, { transaction: true });
    if (ok) notify(action.kind === 'redact' ? 'Le passage a été caviardé.' : 'Le passage a été colorié.');
  }

  // -------------------------------------------------------------------
  // Ajout d'une note
  // -------------------------------------------------------------------
  function updatePreview() {
    createPreview.className = `note-sheet type-${noteType.value}`;
    createPreview.style.fontFamily = fontStacks[noteFont.value] || fontStacks.georgia;
    previewText.textContent = noteInput.value.trim() || 'Le texte apparaîtra ici…';
    previewText.classList.toggle('placeholder', !noteInput.value.trim());
    createPreview.querySelector('.sheet-heading').textContent = typeNames[noteType.value] || 'brouillon';
    $('noteInputCount').textContent = noteInput.value.length + ' / 1200';
  }
  async function addNote(text, type, font) {
    if (notes.length >= MAX_NOTES) { notify('Le tableau est plein (' + MAX_NOTES + ' notes) : enlevez-en une d\'abord.', true); return false; }
    const id = makeId();
    const note = {
      texte: text, type, police: font,
      x: arrondi(0.02 + Math.random() * 0.9), y: arrondi(0.03 + Math.random() * 0.9),
      rotation: Number((Math.random() * 5 - 2.5).toFixed(1)),
      epingle: pinColors[Math.floor(Math.random() * pinColors.length)],
      r: [], g: [], dechiree: false
    };
    const ok = await ecrire('ajout', id, () => ({ [`notes.${id}`]: note }));
    if (ok) notify('La note a été épinglée.');
    return ok;
  }

  // -------------------------------------------------------------------
  // Événements
  // -------------------------------------------------------------------
  $('openComposer').addEventListener('click', () => {
    noteInput.value = ''; noteType.value = 'paper'; noteFont.value = 'georgia'; updatePreview();
    openModal(composerModal);
    noteInput.focus();
  });
  [noteInput, noteType, noteFont].forEach((control) => control.addEventListener('input', updatePreview));
  $('addNote').addEventListener('click', async () => {
    const text = noteInput.value.trim();
    if (!text) { noteInput.focus(); notify('Écris quelque chose avant d\'épingler la note.'); return; }
    const bouton = $('addNote');
    bouton.disabled = true;
    const ok = await addNote(text, noteType.value, noteFont.value);
    bouton.disabled = false;
    if (ok) closeModal(composerModal);
  });
  couches.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => {
    const modal = $(button.dataset.close);
    if (modal === detailModal) { clearToolModes(); openedNoteId = null; }
    closeModal(modal);
  }));
  [composerModal, detailModal].forEach((modal) => modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      if (modal === detailModal) { clearToolModes(); openedNoteId = null; }
      closeModal(modal);
    }
  }));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!confirmModal.hidden) stopSelectionConfirmation();
      else if (!detailModal.hidden) { clearToolModes(); openedNoteId = null; closeModal(detailModal); }
      else if (!composerModal.hidden) closeModal(composerModal);
    }
  });
  $('redactNote').addEventListener('click', () => armSelectionTool('redact'));
  $('scribbleNote').addEventListener('click', () => armSelectionTool('scribble'));
  $('showTear').addEventListener('click', armTearTool);
  $('confirmTear').addEventListener('click', validateTear);
  $('acceptAction').addEventListener('click', confirmSelectedAction);
  $('cancelAction').addEventListener('click', stopSelectionConfirmation);
  confirmModal.addEventListener('click', (event) => { if (event.target === confirmModal) stopSelectionConfirmation(); });
  detailModal.addEventListener('mouseup', () => setTimeout(inspectTextSelection, 0));
  detailModal.addEventListener('keyup', () => setTimeout(inspectTextSelection, 0));
  $('removeNote').addEventListener('click', async () => {
    const id = openedNoteId;
    if (!id) return;
    clearToolModes();
    const ok = await ecrire('retrait', id, (d) => { noteDans(d, id); return { [`notes.${id}`]: fs.deleteField() }; });
    if (ok) {
      openedNoteId = null;
      closeModal(detailModal);
      notify('La note a été enlevée du tableau.');
    }
  });
  $('clearLog').addEventListener('click', async () => {
    if (!conteur || !confirm('Effacer tous les souvenirs des goules ? Cette action est définitive.')) return;
    const champs = { courant: 'j0', op: { a: 'effacement', id: '' } };
    SEGMENTS.forEach((j) => { champs[j] = []; });
    try { await fs.updateDoc(REF, champs); notify('Les souvenirs ont été effacés.'); }
    catch (e) { console.error(e); notify(messageErreur(e), true); }
  });
  // Changement de taille : on replace les notes, sans rien écrire dans la base.
  let redim = null;
  window.addEventListener('resize', () => {
    clearTimeout(redim);
    redim = setTimeout(() => {
      if (dragState) return;
      notes.forEach((note) => {
        const el = board.querySelector(`[data-id="${CSS.escape(note.id)}"]`);
        if (el) placer(el, note);
      });
    }, 100);
  });

  renderBoard();
  renderLogs();
}
