// Script de la page /utils/challenge (extrait de la page ; script classique,
// chargé avant le module Firebase de la page).
(function(){
"use strict";

/* =====================================================
   SVG DES COUPS
   ===================================================== */
const SVG = {
  pierre: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M26 66 L15 47 L31 27 L55 20 L77 31 L86 53 L73 72 L46 80 Z" fill="currentColor" opacity=".9"/>
    <path d="M31 46 L46 35 L62 41" stroke="rgba(10,10,10,.75)" stroke-width="4" stroke-linecap="round"/>
    <path d="M40 64 L60 57" stroke="rgba(10,10,10,.55)" stroke-width="3.5" stroke-linecap="round"/>
  </svg>`,
  ciseaux: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="36" y1="68" x2="68" y2="18" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
    <line x1="64" y1="68" x2="32" y2="18" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
    <circle cx="27" cy="79" r="10" stroke="currentColor" stroke-width="6"/>
    <circle cx="73" cy="79" r="10" stroke="currentColor" stroke-width="6"/>
    <circle cx="50" cy="43" r="4" fill="currentColor"/>
  </svg>`,
  papier: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12 H60 L78 30 V88 H24 Z" fill="currentColor" opacity=".14"/>
    <path d="M24 12 H60 L78 30 V88 H24 Z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>
    <path d="M60 12 V30 H78" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>
    <line x1="36" y1="48" x2="66" y2="48" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    <line x1="36" y1="61" x2="66" y2="61" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    <line x1="36" y1="74" x2="54" y2="74" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  </svg>`,
  puits: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="52" rx="40" ry="27" fill="currentColor" opacity=".16"/>
    <ellipse cx="50" cy="52" rx="40" ry="27" stroke="currentColor" stroke-width="5"/>
    <ellipse cx="50" cy="52" rx="25" ry="16" fill="currentColor" opacity=".35"/>
    <ellipse cx="50" cy="52" rx="25" ry="16" stroke="currentColor" stroke-width="4"/>
    <ellipse cx="50" cy="52" rx="11" ry="6.5" fill="rgba(0,0,0,.85)"/>
  </svg>`,
  bombe: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="46" cy="60" r="29" fill="currentColor" opacity=".9"/>
    <circle cx="46" cy="60" r="29" stroke="currentColor" stroke-width="3"/>
    <rect x="37" y="23" width="18" height="11" rx="3" fill="currentColor"/>
    <path d="M46 23 Q60 16 55 8 Q51 2 62 3" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
    <circle cx="64" cy="4" r="9" fill="currentColor" opacity=".3"/>
    <circle cx="64" cy="4" r="4.5" fill="currentColor"/>
    <ellipse cx="33" cy="48" rx="9" ry="5.5" fill="rgba(0,0,0,.4)" transform="rotate(-35 33 48)"/>
  </svg>`
};

const MOVES = {
  pierre:  { label:'Pierre',  emoji:'🪨', svg:SVG.pierre  },
  ciseaux: { label:'Ciseaux', emoji:'✂️', svg:SVG.ciseaux },
  papier:  { label:'Papier',  emoji:'📄', svg:SVG.papier  },
  puits:   { label:'Puits',   emoji:'🕳️', svg:SVG.puits   },
  bombe:   { label:'Bombe',   emoji:'💣', svg:SVG.bombe   }
};

/* Cycle : puits > pierre > ciseaux > papier > bombe > puits */
const ORDER = ['puits','pierre','ciseaux','papier','bombe'];

const MAX_MANCHES = 10;

/* =====================================================
   ÉTAT
   ===================================================== */
const LS_KEY = 'shifumi-noir-v2';
const state = {
  puits:false, bombe:false, count:1,
  stats:{ win:0, tie:0, lose:0 }
};

function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(raw){
      const o = JSON.parse(raw);
      if(typeof o.puits === 'boolean') state.puits = o.puits;
      if(typeof o.bombe === 'boolean') state.bombe = o.bombe;
      if(Number.isFinite(o.count))     state.count = Math.min(MAX_MANCHES, Math.max(1, o.count|0));
      if(o.stats) state.stats = {
        win:  Math.max(0, o.stats.win|0),
        tie:  Math.max(0, o.stats.tie|0),
        lose: Math.max(0, o.stats.lose|0)
      };
    }
  }catch(e){}
}
function saveState(){
  try{ localStorage.setItem(LS_KEY, JSON.stringify(state)); }catch(e){}
}

/* =====================================================
   UTILITAIRES
   ===================================================== */
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function activeMoves(){
  return ORDER.filter(m =>
    m === 'pierre' || m === 'ciseaux' || m === 'papier' ||
    (m === 'puits' && state.puits) ||
    (m === 'bombe' && state.bombe)
  );
}

function judge(p, c, active){
  if(p === c) return 'tie';
  const i = active.indexOf(p), j = active.indexOf(c);
  if(i < 0 || j < 0) return 'tie';
  return ((i + 1) % active.length === j) ? 'win' : 'lose';
}

/* =====================================================
   DOM
   ===================================================== */
const el = {
  count:$('count'), presets:$('presets'),
  puits:$('opt-puits'), bombe:$('opt-bombe'),
  launch:$('launch'), copy:$('copy'), reset:$('reset'),
  results:$('results'), rules:$('rules'),
  sWin:$('sWin'), sTie:$('sTie'), sLose:$('sLose'), sRate:$('sRate'),
  barW:$('barW'), barT:$('barT'), barL:$('barL'),
  tagArea:$('tagArea'), addBtns:$('addBtns'),
  drawBtn:$('drawBtn'), drawResult:$('drawResult'), useList:$('useList'),
  toast:$('toast')
};

let customList = [];
let lastResults = [];
let busy = false;

/* =====================================================
   TOAST
   ===================================================== */
let toastTimer = null;
function toast(msg, type='ok'){
  el.toast.textContent = msg;
  el.toast.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2400);
}

/* =====================================================
   STATS
   ===================================================== */
function renderStats(){
  const s = state.stats;
  const total = s.win + s.tie + s.lose;
  el.sWin.textContent  = s.win;
  el.sTie.textContent  = s.tie;
  el.sLose.textContent = s.lose;
  el.sRate.textContent = total ? Math.round(s.win / total * 100) + '%' : '—';

  const pct = n => total ? (n / total * 100) : 0;
  el.barW.style.flex = `0 0 ${pct(s.win)}%`;
  el.barT.style.flex = `0 0 ${pct(s.tie)}%`;
  el.barL.style.flex = `0 0 ${pct(s.lose)}%`;
}

/* =====================================================
   RÈGLES
   ===================================================== */
function renderRules(){
  const active = activeMoves();
  el.rules.innerHTML = active.map((m, i) => {
    const beaten = active[(i + 1) % active.length];
    const isLast = i === active.length - 1;
    return `
      <span class="ruleMove beats">${MOVES[m].emoji} ${MOVES[m].label}</span>
      <span class="ruleArrow">bat</span>
      <span class="ruleMove">${MOVES[beaten].emoji} ${MOVES[beaten].label}</span>
      ${isLast ? '' : '<span style="color:var(--muted);margin:0 4px">·</span>'}
    `;
  }).join('');
}

/* =====================================================
   RÉSULTATS
   ===================================================== */
function emptyState(){
  el.results.innerHTML = `
    <div class="emptyState">
      <p>Aucune manche jouée</p>
      <span>Appuyez sur Lancer ou Espace</span>
    </div>`;
}

function startRoll(n, active){
  el.results.innerHTML = '';
  const cards = [];
  for(let i = 0; i < n; i++){
    const card = document.createElement('div');
    card.className = 'card rolling';
    card.innerHTML = `
      <div class="cardIdx">#${String(i + 1).padStart(2,'0')}</div>
      <div class="side p"><div class="slot"></div><div class="mname">…</div></div>
      <div class="vs">VS</div>
      <div class="side c"><div class="slot"></div><div class="mname">…</div></div>
      <div class="badge pending">…</div>`;
    el.results.appendChild(card);
    cards.push(card);
  }
  const setRandom = () => {
    for(const card of cards){
      const a = pick(active), b = pick(active);
      const slots = card.querySelectorAll('.slot');
      slots[0].innerHTML = MOVES[a].svg;
      slots[1].innerHTML = MOVES[b].svg;
    }
  };
  setRandom();
  let iv = null;
  if(n <= 40) iv = setInterval(setRandom, 100);
  return () => { if(iv) clearInterval(iv); };
}

function buildCard(r, index){
  const card = document.createElement('div');
  card.className = 'card ' + r.outcome;
  card.style.animationDelay = (index * 45) + 'ms';
  const badgeTxt = r.outcome === 'win' ? 'Gagné' : r.outcome === 'lose' ? 'Perdu' : 'Égalité';
  card.innerHTML = `
    <div class="cardIdx">#${String(index + 1).padStart(2,'0')}</div>
    <div class="side p">
      <div class="slot">${MOVES[r.p].svg}</div>
      <div class="mname">${MOVES[r.p].label}</div>
    </div>
    <div class="vs">VS</div>
    <div class="side c">
      <div class="slot">${MOVES[r.c].svg}</div>
      <div class="mname">${MOVES[r.c].label}</div>
    </div>
    <div class="badge ${r.outcome}">${badgeTxt}</div>`;
  return card;
}

function reveal(results){
  el.results.innerHTML = '';
  results.forEach((r, i) => el.results.appendChild(buildCard(r, i)));
}

/* =====================================================
   LISTE PERSONNALISÉE — TAGS + BOUTONS
   ===================================================== */
function renderTags(){
  el.tagArea.innerHTML = '';
  if(!customList.length){
    el.tagArea.innerHTML = '<span class="tagEmpty">Aucune action sélectionnée</span>';
  } else {
    customList.forEach((m, i) => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.innerHTML = `
        <span>${MOVES[m].emoji}</span>
        <span class="tagName">${MOVES[m].label}</span>
        <button class="tagX" data-i="${i}" aria-label="Retirer">×</button>
      `;
      el.tagArea.appendChild(tag);
    });
  }
  const maxed = customList.length >= 10;
  el.addBtns.querySelectorAll('.addBtn').forEach(btn => {
    btn.disabled = maxed;
  });
  if(maxed){
    if(!el.tagArea.querySelector('.tagEmpty')){
      const warn = document.createElement('span');
      warn.className = 'tagEmpty';
      warn.style.color = 'var(--red-bright)';
      warn.textContent = '— 10 max atteint —';
      el.tagArea.appendChild(warn);
    }
  }
  if(!customList.length){
    el.useList.checked = false;
    el.useList.disabled = true;
  } else {
    el.useList.disabled = false;
  }
}

function renderAddButtons(){
  el.addBtns.innerHTML = '';
  activeMoves().forEach(m => {
    const btn = document.createElement('button');
    btn.className = 'addBtn';
    btn.dataset.move = m;
    btn.innerHTML = `${MOVES[m].emoji} ${MOVES[m].label}`;
    btn.addEventListener('click', () => {
      if(customList.length >= 10){
        toast('Maximum 10 actions', 'warn');
        return;
      }
      customList.push(m);
      renderTags();
    });
    el.addBtns.appendChild(btn);
  });
  renderTags();
}

function removeTag(i){
  customList.splice(i, 1);
  renderTags();
}

el.tagArea.addEventListener('click', e => {
  const btn = e.target.closest('.tagX');
  if(btn) removeTag(Number(btn.dataset.i));
});

function onOptionsChange(){
  const act = activeMoves();
  const before = customList.length;
  customList = customList.filter(m => act.includes(m));
  if(customList.length !== before){
    toast('Coups désactivés retirés de la liste', 'warn');
  }
  renderAddButtons();
  renderRules();
}

/* =====================================================
   TIRAGE AU SORT
   ===================================================== */
function renderDraw(move, final){
  el.drawResult.innerHTML = `
    <div class="drawSlot ${final ? 'final' : ''}">${MOVES[move].svg}</div>
    <div class="drawName">${MOVES[move].label}</div>
    <div class="drawLabel">${final ? 'Résultat du tirage' : 'Tirage en cours…'}</div>`;
}

async function drawRandom(){
  if(!customList.length){
    toast('Ajoute au moins une action', 'warn');
    return;
  }
  el.drawBtn.disabled = true;
  const chosen = pick(customList);

  const spin = setInterval(() => renderDraw(pick(customList), false), 70);
  await sleep(650);
  clearInterval(spin);

  renderDraw(chosen, true);
  el.drawBtn.disabled = false;
}

/* =====================================================
   LANCEMENT
   ===================================================== */
function playerPool(active){
  if(el.useList.checked && customList.length){
    const items = customList.filter(m => active.includes(m));
    if(items.length) return items;
  }
  return active;
}

async function launch(){
  if(busy) return;
  busy = true;
  el.launch.disabled = true;
  el.launch.innerHTML = '⏳ Tirage…';

  const n = state.count;
  const active = activeMoves();
  const pool = playerPool(active);

  const results = [];
  for(let i = 0; i < n; i++){
    const p = pick(pool);
    const c = pick(active);
    results.push({ p, c, outcome: judge(p, c, active) });
  }

  const stopRoll = startRoll(n, active);
  await sleep(n <= 40 ? 600 : 380);
  stopRoll();

  reveal(results);
  lastResults = results;
  el.copy.disabled = false;

  results.forEach(r => state.stats[r.outcome]++);
  saveState();
  renderStats();

  el.launch.disabled = false;
  el.launch.innerHTML = '▶ Lancer <kbd>Espace</kbd>';
  busy = false;
}

/* =====================================================
   COPIE
   ===================================================== */
function buildText(results){
  const now = new Date();
  const lines = [];
  lines.push('── Générateur de challenge de la camarilla dauphinoise ──');
  lines.push(now.toLocaleString('fr-FR'));
  lines.push('');
  results.forEach((r, i) => {
    const out = r.outcome === 'win' ? 'GAGNÉ'
              : r.outcome === 'lose' ? 'PERDU'
              : 'ÉGALITÉ';
    lines.push(`${String(i + 1).padStart(2,'0')}. ${MOVES[r.p].label} vs ${MOVES[r.c].label} — ${out}`);
  });
  const w = results.filter(r => r.outcome === 'win').length;
  const l = results.filter(r => r.outcome === 'lose').length;
  const t = results.length - w - l;
  lines.push('');
  lines.push(`Bilan : ${w} victoire(s) · ${t} égalité(s) · ${l} défaite(s)`);
  return lines.join('\n');
}

async function copyText(txt){
  try{
    await navigator.clipboard.writeText(txt);
    return true;
  }catch(e){
    const ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try{ ok = document.execCommand('copy'); }catch(_){}
    document.body.removeChild(ta);
    return ok;
  }
}

async function copyResults(){
  if(!lastResults.length){
    toast('Aucun résultat à copier', 'warn');
    return;
  }
  const ok = await copyText(buildText(lastResults));
  toast(ok ? 'Résultats copiés' : 'Copie impossible', ok ? 'ok' : 'warn');
}

/* =====================================================
   RESET
   ===================================================== */
function resetAll(){
  if(!confirm('Réinitialiser le registre et les résultats ?')) return;
  state.stats = { win:0, tie:0, lose:0 };
  saveState();
  renderStats();
  lastResults = [];
  el.copy.disabled = true;
  emptyState();
  el.drawResult.innerHTML = '';
  toast('Registre réinitialisé');
}

/* =====================================================
   INIT + ÉVÉNEMENTS
   ===================================================== */
loadState();

el.count.value   = state.count;
el.puits.checked = state.puits;
el.bombe.checked = state.bombe;

renderStats();
emptyState();
renderAddButtons();
renderRules();
syncPresets();

function syncPresets(){
  [...el.presets.querySelectorAll('.preset')].forEach(b => {
    b.classList.toggle('active', Number(b.dataset.n) === state.count);
  });
}

el.count.addEventListener('input', () => {
  let v = parseInt(el.count.value, 10);
  if(!Number.isFinite(v)) v = 1;
  state.count = Math.min(MAX_MANCHES, Math.max(1, v));
  saveState();
  syncPresets();
});
el.count.addEventListener('blur', () => { el.count.value = state.count; });

el.presets.addEventListener('click', e => {
  const btn = e.target.closest('.preset');
  if(!btn) return;
  state.count = Number(btn.dataset.n);
  el.count.value = state.count;
  saveState();
  syncPresets();
});

el.puits.addEventListener('change', () => {
  state.puits = el.puits.checked;
  saveState();
  onOptionsChange();
});
el.bombe.addEventListener('change', () => {
  state.bombe = el.bombe.checked;
  saveState();
  onOptionsChange();
});

el.launch.addEventListener('click', launch);
el.copy.addEventListener('click', copyResults);
el.reset.addEventListener('click', resetAll);
el.drawBtn.addEventListener('click', drawRandom);

document.addEventListener('keydown', e => {
  const tag = (e.target.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
  if(typing) return;
  if(e.code === 'Space'){ e.preventDefault(); launch(); }
  if(e.key === 'c' || e.key === 'C'){ if(lastResults.length) copyResults(); }
});

/* =====================================================
   PONT AVEC LES CHALLENGES DEMANDÉS PAR LES CONTEURS
   (assets/js/camarilla/pages/challenge-en-ligne.js)
   ===================================================== */
window.ChallengeDuJeu = {
  MOVES, ORDER,
  /** Réglage affiché : manches, Puits / Bombe, et la liste personnalisée si « Utiliser comme main ». */
  reglageActuel: () => ({
    manches: state.count, puits: state.puits, bombe: state.bombe,
    main: el.useList.checked ? customList.slice() : []
  }),
  /** Tire les manches d'un challenge : [{ p (joueur), c (adversaire), o: win | tie | lose }]. */
  jouer(cfg) {
    const active = ORDER.filter(m => m === 'pierre' || m === 'ciseaux' || m === 'papier' ||
      (m === 'puits' && cfg.puits) || (m === 'bombe' && cfg.bombe));
    const main = (cfg.main || []).filter(m => active.includes(m));
    const pool = main.length ? main : active;
    const n = Math.min(MAX_MANCHES, Math.max(1, cfg.manches | 0));
    const res = [];
    for(let i = 0; i < n; i++){
      const p = pick(pool), c = pick(active);
      res.push({ p, c, o: judge(p, c, active) });
    }
    return res;
  },
  carte: (r, i) => buildCard({ p: r.p, c: r.c, outcome: r.o }, i),
  toast
};

})();
