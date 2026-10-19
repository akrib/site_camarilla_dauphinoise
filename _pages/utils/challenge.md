layout: page
title: "Génerateur de challenge"
permalink: /utils/challenge
---

<title>Générateur de challenge de la camarilla dauphinoise</title>
<style>
  *{box-sizing:border-box}
  :root{
    --bg:#0a0a0a;
    --panel:#111111;
    --panel2:#161616;
    --border:#2a2520;
    --border2:#3a332b;
    --cream:#e8dcc4;
    --cream-dim:#a89a7e;
    --muted:#6b6355;
    --red:#b91c1c;
    --red-bright:#dc2626;
    --gold:#c9a227;
    --gold-dim:#8a7020;
  }
  html,body{height:100%}
  body{
    margin:0;
    font-family:'Courier New',Courier,monospace;
    color:var(--cream);
    background:
      radial-gradient(ellipse at 50% 0%, #151210 0%, #070605 70%, #030303 100%);
    background-attachment:fixed;
    min-height:100vh;
    -webkit-font-smoothing:antialiased;
    line-height:1.5;
  }
  .grain{
    position:fixed;inset:0;pointer-events:none;z-index:9000;opacity:.055;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
    mix-blend-mode:overlay;
  }
  .vignette{
    position:fixed;inset:0;pointer-events:none;z-index:1;
    background:radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,.6) 100%);
  }
  .app{
    position:relative;z-index:2;
    max-width:1040px;margin:0 auto;
    padding:34px 20px 80px;
    display:flex;flex-direction:column;gap:18px;
  }

  /* ---------- Masthead ---------- */
  .hero{
    text-align:center;
    padding:8px 0 22px;
    border-bottom:3px double var(--cream-dim);
    margin-bottom:8px;
  }
  .hero h1{
    font-family:Georgia,'Times New Roman',serif;
    font-size:clamp(1.35rem,3.1vw,2.2rem);
    font-weight:900;
    letter-spacing:.04em;
    text-transform:uppercase;
    margin:6px 0 4px;
    color:var(--cream);
    text-shadow:2px 2px 0 rgba(0,0,0,.9);
    line-height:1.35;
  }
  .hero h1 .accent{color:var(--gold)}

  /* ---------- Panels ---------- */
  .panel{
    background:linear-gradient(180deg, rgba(20,20,20,.9), rgba(15,15,15,.9));
    border:1px solid var(--border);
    padding:20px 20px 18px;
    position:relative;
  }
  .panel::before{
    content:'';position:absolute;top:0;left:0;width:3px;height:100%;
    background:var(--red);opacity:.7;
  }
  .panelHead{
    display:flex;align-items:baseline;justify-content:space-between;
    gap:10px;flex-wrap:wrap;margin-bottom:16px;
    padding-bottom:10px;border-bottom:1px solid var(--border);
  }
  .panelHead h2{
    font-family:Georgia,serif;
    font-size:.95rem;font-weight:700;letter-spacing:.2em;
    text-transform:uppercase;margin:0;color:var(--cream);
  }
  .panelHead .hint{
    font-size:.7rem;letter-spacing:.1em;color:var(--muted);
    text-transform:uppercase;
  }

  /* ---------- Controls ---------- */
  .ctrl-row{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end}
  .ctrl-row + .ctrl-row{margin-top:14px}

  .field{display:flex;flex-direction:column;gap:6px}
  .field label{
    font-size:.65rem;letter-spacing:.18em;color:var(--cream-dim);
    text-transform:uppercase;font-weight:700;
  }
  .field input[type=number]{
    width:90px;padding:9px 12px;
    border:1px solid var(--border2);
    background:#050505;color:var(--cream);
    font-family:'Courier New',monospace;
    font-size:1rem;font-weight:700;
    outline:none;transition:.15s;
  }
  .field input[type=number]:focus{border-color:var(--cream-dim)}

  .presets{display:flex;gap:4px;flex-wrap:wrap}
  .preset{
    padding:6px 11px;border:1px solid var(--border2);
    background:transparent;color:var(--cream-dim);
    font-family:'Courier New',monospace;
    font-size:.72rem;font-weight:700;cursor:pointer;
    transition:.15s;letter-spacing:.08em;
  }
  .preset:hover{color:var(--cream);border-color:var(--cream-dim)}
  .preset.active{
    background:var(--cream);color:var(--bg);border-color:var(--cream);
  }

  /* Toggles */
  .toggles{display:flex;gap:10px;flex-wrap:wrap}
  .toggle{
    display:inline-flex;align-items:center;gap:10px;
    padding:9px 14px;border:1px solid var(--border2);
    background:transparent;cursor:pointer;user-select:none;
    font-size:.75rem;letter-spacing:.12em;text-transform:uppercase;
    font-weight:700;color:var(--cream-dim);
    transition:.15s;font-family:'Courier New',monospace;
  }
  .toggle:hover{border-color:var(--cream-dim);color:var(--cream)}
  .toggle input{
    appearance:none;-webkit-appearance:none;
    width:14px;height:14px;border:1px solid var(--cream-dim);
    background:transparent;margin:0;cursor:pointer;
    position:relative;flex:none;border-radius:2px;
  }
  .toggle input:checked{background:var(--red);border-color:var(--red)}
  .toggle input:checked::after{
    content:'✓';position:absolute;inset:0;
    display:grid;place-items:center;
    font-size:.65rem;color:var(--cream);font-weight:900;
  }
  .toggle:has(input:checked){color:var(--cream);border-color:var(--cream-dim)}

  /* Buttons */
  .btn{
    display:inline-flex;align-items:center;gap:10px;justify-content:center;
    padding:11px 20px;
    border:1px solid var(--cream-dim);
    background:transparent;color:var(--cream);
    font-family:'Courier New',monospace;
    font-size:.75rem;font-weight:700;
    letter-spacing:.18em;text-transform:uppercase;
    cursor:pointer;transition:.15s;
  }
  .btn:hover:not(:disabled){background:var(--cream);color:var(--bg);border-color:var(--cream)}
  .btn:active:not(:disabled){transform:translateY(1px)}
  .btn:disabled{opacity:.3;cursor:not-allowed}
  .btn.primary{
    background:var(--red);border-color:var(--red);color:var(--cream);
  }
  .btn.primary:hover:not(:disabled){background:var(--red-bright);border-color:var(--red-bright);color:var(--cream)}
  .btn kbd{
    background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.2);
    padding:1px 6px;font-size:.6rem;font-family:inherit;
    letter-spacing:.05em;font-weight:700;
  }

  /* ---------- Stats ---------- */
  .statsGrid{
    display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));
    gap:1px;background:var(--border);
    border:1px solid var(--border);
  }
  .statBox{
    background:var(--panel);
    padding:14px 10px;text-align:center;
    display:flex;flex-direction:column;gap:4px;
  }
  .statBox .k{
    font-size:.6rem;letter-spacing:.2em;text-transform:uppercase;
    color:var(--muted);font-weight:700;
  }
  .statBox .v{
    font-family:Georgia,serif;
    font-size:1.6rem;font-weight:900;line-height:1;
    font-variant-numeric:tabular-nums;
  }
  .statBox.win .v{color:var(--gold)}
  .statBox.tie .v{color:var(--cream-dim)}
  .statBox.lose .v{color:var(--red-bright)}
  .bar{
    display:flex;height:6px;margin-top:14px;
    background:var(--border);overflow:hidden;
  }
  .bar i{display:block;height:100%;transition:flex-basis .5s ease}
  .bar .w{background:var(--gold)}
  .bar .t{background:var(--muted)}
  .bar .l{background:var(--red)}

  /* ---------- Results ---------- */
  .results{
    display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));
    gap:10px;min-height:100px;
  }
  .emptyState{
    grid-column:1/-1;text-align:center;
    padding:36px 12px;color:var(--muted);
    border:1px dashed var(--border);
  }
  .emptyState p{margin:0 0 4px;font-size:.75rem;letter-spacing:.15em;text-transform:uppercase}
  .emptyState span{font-size:.7rem;letter-spacing:.08em}

  .card{
    position:relative;
    display:grid;grid-template-columns:1fr auto 1fr;
    grid-template-areas:"p vs c" "badge badge badge";
    align-items:center;row-gap:10px;
    padding:16px 12px 12px;
    background:var(--panel2);
    border:1px solid var(--border);
    animation:cardIn .35s ease-out backwards;
  }
  .card.win{border-left:3px solid var(--gold)}
  .card.lose{border-left:3px solid var(--red)}
  .card.tie{border-left:3px solid var(--muted)}
  @keyframes cardIn{
    from{opacity:0;transform:translateY(8px)}
    to{opacity:1;transform:none}
  }
  .card .p{grid-area:p}
  .card .c{grid-area:c}
  .card .vs{
    grid-area:vs;font-size:.6rem;font-weight:700;
    letter-spacing:.3em;color:var(--muted);
  }
  .card .badge{
    grid-area:badge;justify-self:center;
    font-size:.62rem;font-weight:700;letter-spacing:.25em;
    text-transform:uppercase;padding:3px 12px;
    border:1px solid currentColor;
  }
  .badge.win{color:var(--gold)}
  .badge.lose{color:var(--red-bright)}
  .badge.tie{color:var(--muted)}
  .badge.pending{color:var(--muted);border-style:dashed}

  .side{display:flex;flex-direction:column;align-items:center;gap:6px}
  .slot{
    width:46px;height:46px;display:grid;place-items:center;
    color:var(--cream);
    filter:drop-shadow(0 0 6px rgba(232,220,196,.15));
  }
  .slot svg{width:100%;height:100%;display:block}
  .mname{
    font-size:.68rem;color:var(--cream-dim);
    letter-spacing:.15em;text-transform:uppercase;font-weight:700;
  }
  .card.win .p .slot{color:var(--gold);filter:drop-shadow(0 0 10px rgba(201,162,39,.4))}
  .card.lose .c .slot{color:var(--gold);filter:drop-shadow(0 0 10px rgba(201,162,39,.4))}
  .card.win .p .mname, .card.lose .c .mname{color:var(--gold)}
  .cardIdx{
    position:absolute;top:6px;right:8px;
    font-size:.55rem;color:var(--muted);
    letter-spacing:.15em;font-weight:700;
  }
  .card.rolling .slot{opacity:.5}

  /* ---------- Custom list ---------- */
  .tagArea{
    min-height:52px;
    padding:10px;
    border:1px solid var(--border2);
    background:#050505;
    display:flex;flex-wrap:wrap;gap:7px;align-items:center;
  }
  .tagEmpty{
    color:var(--muted);font-size:.72rem;
    letter-spacing:.15em;text-transform:uppercase;
    font-style:italic;padding:4px 6px;
  }
  .tag{
    display:inline-flex;align-items:center;gap:8px;
    padding:6px 4px 6px 12px;
    background:rgba(232,220,196,.06);
    border:1px dashed var(--border2);
    color:var(--cream);
    font-size:.78rem;letter-spacing:.08em;
    font-weight:700;text-transform:uppercase;
  }
  .tag .tagName{font-family:'Courier New',monospace}
  .tag .tagX{
    background:none;border:none;cursor:pointer;
    color:var(--cream-dim);padding:0 6px;
    font-family:inherit;font-size:1rem;line-height:1;
    transition:.15s;
  }
  .tag .tagX:hover{color:var(--red-bright)}

  .addBtns{
    display:flex;flex-wrap:wrap;gap:6px;
    margin-top:12px;padding-top:12px;
    border-top:1px solid var(--border);
  }
  .addBtn{
    display:inline-flex;align-items:center;gap:6px;
    padding:7px 13px;
    background:transparent;color:var(--cream-dim);
    border:1px solid var(--border2);
    font-family:'Courier New',monospace;
    font-size:.72rem;font-weight:700;letter-spacing:.1em;
    text-transform:uppercase;cursor:pointer;
    transition:.15s;
  }
  .addBtn:hover:not(:disabled){
    color:var(--cream);border-color:var(--cream-dim);
    background:rgba(232,220,196,.04);
  }
  .addBtn:disabled{opacity:.3;cursor:not-allowed}

  .customActions{
    display:flex;flex-wrap:wrap;gap:12px;align-items:center;
    margin-top:16px;padding-top:16px;
    border-top:1px solid var(--border);
  }

  .drawBox{
    display:flex;flex-direction:column;align-items:center;gap:6px;
    margin-top:18px;padding:16px;
    border:1px dashed var(--border2);
    min-height:0;
  }
  .drawBox:empty{display:none}
  .drawBox .drawSlot{width:64px;height:64px;color:var(--cream)}
  .drawBox .drawSlot svg{width:100%;height:100%;display:block}
  .drawBox .drawSlot.final{
    color:var(--gold);
    filter:drop-shadow(0 0 12px rgba(201,162,39,.5));
  }
  .drawBox .drawName{
    font-family:Georgia,serif;
    font-size:1.05rem;font-weight:700;letter-spacing:.15em;
    text-transform:uppercase;
  }
  .drawBox .drawLabel{
    font-size:.65rem;letter-spacing:.25em;
    color:var(--muted);text-transform:uppercase;
  }

  /* ---------- Rules ---------- */
  .rulesRow{
    display:flex;flex-wrap:wrap;align-items:center;gap:8px;
    font-size:.78rem;letter-spacing:.05em;
  }
  .ruleMove{
    display:inline-flex;align-items:center;gap:6px;
    padding:5px 10px;
    border:1px solid var(--border2);
    color:var(--cream);font-weight:700;
    text-transform:uppercase;letter-spacing:.1em;
    font-size:.7rem;
  }
  .ruleMove.beats{border-color:var(--cream-dim);color:var(--gold)}
  .ruleArrow{color:var(--red);font-weight:900}

  /* ---------- Toast ---------- */
  .toast{
    position:fixed;left:50%;bottom:26px;
    transform:translate(-50%,200%);
    background:var(--cream);color:var(--bg);
    border:2px solid var(--bg);
    padding:12px 24px;
    font-family:'Courier New',monospace;
    font-size:.72rem;font-weight:700;
    letter-spacing:.2em;text-transform:uppercase;
    box-shadow:0 20px 50px -18px rgba(0,0,0,.9);
    transition:transform .35s cubic-bezier(.2,1,.3,1),opacity .35s;
    opacity:0;z-index:9999;pointer-events:none;
    max-width:90vw;text-align:center;
  }
  .toast.show{transform:translate(-50%,0);opacity:1}
  .toast.warn{background:var(--red);color:var(--cream)}
  .toast.ok{background:var(--gold);color:var(--bg)}

  @media (max-width:560px){
    .results{grid-template-columns:repeat(auto-fill,minmax(170px,1fr))}
    .slot{width:38px;height:38px}
    .btn{padding:10px 14px;font-size:.68rem;letter-spacing:.12em}
  }
</style>
<body>
<div class="grain"></div>
<div class="vignette"></div>

<div class="app">

  <header class="hero">
    <h1>Générateur de challenge<br>de la <span class="accent">camarilla dauphinoise</span></h1>
  </header>

  <!-- ============ CONTRÔLES ============ -->
  <section class="panel">
    <div class="panelHead">
      <h2>Commandes</h2>
      <span class="hint">Préparation du terrain</span>
    </div>

    <div class="ctrl-row">
      <div class="field">
        <label>Manches simultanées</label>
        <input type="number" id="count" min="1" max="10" value="1">
      </div>
      <div class="presets" id="presets">
        <button class="preset" data-n="1">1</button>
        <button class="preset" data-n="3">3</button>
        <button class="preset" data-n="5">5</button>
        <button class="preset" data-n="10">10</button>
      </div>
    </div>

    <div class="ctrl-row">
      <div class="toggles">
        <label class="toggle"><input type="checkbox" id="opt-puits"><span>🕳️ Puits</span></label>
        <label class="toggle"><input type="checkbox" id="opt-bombe"><span>💣 Bombe</span></label>
      </div>
    </div>

    <div class="ctrl-row">
      <button id="launch" class="btn primary">▶ Lancer <kbd>Espace</kbd></button>
      <button id="copy" class="btn" disabled>⧉ Copier</button>
      <button id="reset" class="btn">⟲ Réinitialiser</button>
    </div>
  </section>

  <!-- ============ STATS ============ -->
  <section class="panel">
    <div class="panelHead">
      <h2>Registre</h2>
      <span class="hint">Cumul des affaires résolues</span>
    </div>
    <div class="statsGrid">
      <div class="statBox win"><span class="k">Victoires</span><span class="v" id="sWin">0</span></div>
      <div class="statBox tie"><span class="k">Égalités</span><span class="v" id="sTie">0</span></div>
      <div class="statBox lose"><span class="k">Défaites</span><span class="v" id="sLose">0</span></div>
      <div class="statBox"><span class="k">Taux</span><span class="v" id="sRate" style="color:var(--cream)">—</span></div>
    </div>
    <div class="bar">
      <i class="w" id="barW" style="flex:0 0 0%"></i>
      <i class="t" id="barT" style="flex:0 0 0%"></i>
      <i class="l" id="barL" style="flex:0 0 0%"></i>
    </div>
  </section>

  <!-- ============ RÉSULTATS ============ -->
  <section id="results" class="results"></section>

  <!-- ============ LISTE PERSONNALISÉE ============ -->
  <section class="panel">
    <div class="panelHead">
      <h2>Liste Personnalisée</h2>
      <span class="hint">10 actions maximum</span>
    </div>

    <div class="tagArea" id="tagArea">
      <span class="tagEmpty">Aucune action sélectionnée</span>
    </div>

    <div class="addBtns" id="addBtns"></div>

    <div class="customActions">
      <button id="drawBtn" class="btn primary">🎯 Tirer au sort</button>
      <label class="toggle"><input type="checkbox" id="useList"><span>Utiliser comme main</span></label>
    </div>

    <div id="drawResult" class="drawBox"></div>
  </section>

  <!-- ============ RÈGLES ============ -->
  <section class="panel">
    <div class="panelHead">
      <h2>Règles Actives</h2>
      <span class="hint">Chaque coup bat le suivant</span>
    </div>
    <div id="rules" class="rulesRow"></div>
  </section>

</div>

<div id="toast" class="toast"></div>

<script>
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

})();
</script>
</body>
</html>
