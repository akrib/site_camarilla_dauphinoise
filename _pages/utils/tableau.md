---
layout: page
title: "Tableau d'Enquête"
permalink: /utils/tableau
---

<title>Tableau d'Enquête</title>
<style>
/* ============================================================
   BASE
   ============================================================ */
*{box-sizing:border-box;}
html,body{height:100%;margin:0;}
body{
  display:flex;flex-direction:column;
  background:#0a0a0a;color:#e8e8e8;
  font-family:"Courier New",Courier,monospace;
  overflow:hidden;
  --hand:"Bradley Hand","Segoe Print","Segoe Script","Comic Sans MS","Chalkboard SE","Brush Script MT",cursive;
}

/* ============================================================
   GRAIN + VIGNETTE
   ============================================================ */
.grain{
  position:fixed;inset:-50%;z-index:9000;pointer-events:none;
  opacity:.085;mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  animation:grainShift 1.2s steps(3) infinite;
}
@keyframes grainShift{
  0%{transform:translate(0,0)} 33%{transform:translate(-2%,1%)} 66%{transform:translate(1%,-2%)} 100%{transform:translate(0,0)}
}
.vignette{
  position:fixed;inset:0;z-index:9001;pointer-events:none;
  background:radial-gradient(ellipse at 50% 45%, transparent 32%, rgba(0,0,0,.55) 75%, rgba(0,0,0,.92) 100%);
}

/* ============================================================
   BARRE D'OUTILS
   ============================================================ */
.toolbar{
  position:relative;z-index:50;
  display:flex;align-items:center;justify-content:space-between;
  gap:14px;flex-wrap:wrap;
  padding:9px 16px;
  background:linear-gradient(#1d1d1d,#080808);
  border-bottom:2px solid #3a3a3a;
  box-shadow:0 6px 24px rgba(0,0,0,.95);
}
.brand{display:flex;align-items:center;gap:12px;}
.badge{
  width:34px;height:34px;flex:none;display:grid;place-items:center;
  border:2px solid #cfcfcf;border-radius:50%;
  font-size:14px;color:#dcdcdc;
  box-shadow:inset 0 0 14px rgba(255,255,255,.14), 0 0 10px rgba(0,0,0,.8);
}
.brand h1{margin:0;font-size:14px;letter-spacing:.3em;font-weight:700;color:#f2f2f2;}
.brand small{display:block;font-size:9px;letter-spacing:.2em;color:#767676;text-transform:uppercase;margin-top:2px;}

.tools{display:flex;align-items:center;gap:7px;flex-wrap:wrap;}
button{
  font-family:inherit;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;
  background:#1c1c1c;color:#cfcfcf;border:1px solid #3d3d3d;
  padding:8px 11px;border-radius:2px;cursor:pointer;
  transition:background .15s,border-color .15s,color .15s;
}
button:hover{background:#2d2d2d;border-color:#808080;color:#fff;}
button:active{transform:translateY(1px);}
button.danger:hover{background:#3d1414;border-color:#a33;color:#ffb8b8;}
.sep{width:1px;height:22px;background:#333;margin:0 3px;}

.colors{display:flex;align-items:center;gap:6px;}
.lbl{font-size:9px;letter-spacing:.16em;color:#787878;text-transform:uppercase;}
.sw{
  width:19px;height:19px;border-radius:50%;padding:0;cursor:pointer;
  border:2px solid #3a3a3a;background:var(--c);
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.8);
  transition:transform .12s,border-color .12s;
}
.sw:hover{transform:scale(1.18);}
.sw.active{border-color:#fff;box-shadow:0 0 10px var(--c),inset 0 0 0 1px rgba(0,0,0,.8);}

.zoom-group{display:flex;align-items:center;gap:4px;}
.zoom-group button{padding:8px 9px;min-width:32px;font-size:12px;letter-spacing:0;}
#zoomLabel{
  font-size:10px;letter-spacing:.08em;color:#b8b8b8;
  min-width:44px;text-align:center;padding:0 4px;
  font-family:"Courier New",monospace;
}

/* ============================================================
   STAGE / CARROUSEL 3D
   ============================================================ */
.stage{
  position:relative;flex:1;overflow:hidden;
  background:
    repeating-linear-gradient(0deg, rgba(255,255,255,.014) 0 1px, transparent 1px 3px),
    radial-gradient(ellipse at 50% 32%, #272727 0%, #111 55%, #050505 100%);
  perspective:1500px;
  perspective-origin:50% 50%;
}
.stage.armed{cursor:crosshair;}

.slot{
  position:absolute;inset:0;
  transform-style:preserve-3d;
  backface-visibility:hidden;
  transition:transform .7s cubic-bezier(.45,.05,.25,1), opacity .55s ease;
  will-change:transform,opacity;
  overflow:hidden;
  border-radius:2px;
}
.slot[data-state="front"]{
  transform:translateX(0) rotateY(0deg) scale(1);
  opacity:1;
  pointer-events:auto;
  z-index:2;
}
.slot[data-state="left"]{
  transform:translateX(-42%) rotateY(48deg) scale(0.82);
  opacity:0.32;
  pointer-events:none;
  z-index:1;
  filter:brightness(0.65);
}
.slot[data-state="right"]{
  transform:translateX(42%) rotateY(-48deg) scale(0.82);
  opacity:0.32;
  pointer-events:none;
  z-index:1;
  filter:brightness(0.65);
}
.slot[data-state="hidden"]{
  transform:translateX(0) rotateY(85deg) scale(0.6);
  opacity:0;
  pointer-events:none;
  z-index:0;
}

/* === MONDE (transformé par zoom/pan) === */
.board-content{
  position:absolute;inset:0;
  transform-origin:0 0;
  transform:translate(0,0) scale(1);
  will-change:transform;
}
.itemLayer{position:absolute;inset:0;z-index:1;}
.threadLayer{
  position:absolute;inset:0;width:100%;height:100%;
  overflow:visible;pointer-events:none;z-index:2;
}
.pinLayer{position:absolute;inset:0;z-index:3;pointer-events:none;}

/* ============================================================
   NAV ARROWS
   ============================================================ */
.nav-arrow{
  position:absolute;top:50%;transform:translateY(-50%);z-index:30;
  width:44px;height:84px;
  background:rgba(10,10,10,0.68);
  border:1px solid #3a3a3a;color:#e8e8e8;
  font-size:30px;border-radius:3px;cursor:pointer;
  display:grid;place-items:center;padding:0;line-height:1;
  font-family:Georgia,serif;
  transition:background .2s, border-color .2s, opacity .25s;
  backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);
}
.nav-arrow:hover{background:rgba(40,40,40,0.9);border-color:#8a8a8a;}
.nav-arrow.off{opacity:0;pointer-events:none;}
.nav-left{left:14px;}
.nav-right{right:14px;}

/* ============================================================
   HINT
   ============================================================ */
.hint{
  position:absolute;left:14px;top:12px;z-index:15;
  font-size:10px;letter-spacing:.08em;color:#5c5c5c;
  pointer-events:none;text-transform:uppercase;
  text-shadow:0 1px 2px #000;
  max-width:calc(100% - 130px);
  line-height:1.5;
}
.hint b{color:#8a8a8a;font-weight:700;}

/* ============================================================
   MINI-STRIP
   ============================================================ */
.mini-strip{
  display:flex;gap:12px;padding:10px 16px;justify-content:center;
  background:linear-gradient(#0c0c0c,#050505);
  border-top:2px solid #2a2a2a;
  overflow-x:auto;overflow-y:hidden;
}
.mini{
  display:flex;flex-direction:column;gap:6px;
  padding:8px;border:1px solid #262626;border-radius:3px;
  background:#0b0b0b;cursor:pointer;
  transition:border-color .2s, box-shadow .25s, transform .15s;
  flex:none;
}
.mini:hover{border-color:#555;}
.mini:active{transform:translateY(1px);}
.mini.active{
  border-color:#e8e8e8;
  box-shadow:0 0 0 1px #e8e8e8, 0 0 22px rgba(255,255,255,0.18);
}
.mini-head{
  display:flex;align-items:center;gap:8px;
  font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;
  color:#888;
}
.mini-head input[type="checkbox"]{
  accent-color:#e8e8e8;cursor:pointer;width:13px;height:13px;flex:none;
}
.mini-num{flex:1;}
.mini.active .mini-head{color:#e8e8e8;}
.mini-preview{
  width:132px;height:78px;
  background:#050505;border:1px solid #1a1a1a;border-radius:2px;
  overflow:hidden;position:relative;
}
.mini-svg{width:100%;height:100%;display:block;}

/* ============================================================
   OBJETS ÉPINGLÉS
   ============================================================ */
.item{
  position:absolute;user-select:none;-webkit-user-select:none;
  cursor:grab;touch-action:none;will-change:left,top;
}
.item.dragging{cursor:grabbing;}
.item.dragging > *{filter:brightness(1.07);}

.del{
  position:absolute;top:-10px;right:-10px;width:22px;height:22px;
  display:none;align-items:center;justify-content:center;
  border-radius:50%;background:#111;color:#eee;border:1px solid #666;
  font-size:14px;line-height:1;padding:0;cursor:pointer;z-index:6;
  font-family:system-ui,sans-serif;
}
.item:hover .del{display:flex;}
.del:hover{background:#7c1c1c;border-color:#e55;color:#fff;}

.polaroid{
  background:linear-gradient(#f1f1f1,#d5d5d5);
  padding:10px 10px 6px;
  box-shadow:0 14px 28px rgba(0,0,0,.88), inset 0 0 0 1px rgba(255,255,255,.55);
}
.polaroid img.ph{
  display:block;width:190px;height:190px;object-fit:cover;
  background:#0e0e0e;
  filter:grayscale(1) contrast(1.14) brightness(.96);
  box-shadow:0 0 0 1px rgba(0,0,0,.45), inset 0 0 22px rgba(0,0,0,.9);
}
.ph-empty{
  display:grid;place-items:center;width:190px;height:190px;
  background:#0e0e0e;color:#5a5a5a;font-size:11px;letter-spacing:.2em;
  text-transform:uppercase;
  box-shadow:0 0 0 1px rgba(0,0,0,.45), inset 0 0 22px rgba(0,0,0,.9);
}
.polaroid .cap{
  margin-top:7px;padding:1px 0 4px;min-height:26px;
  text-align:center;font-family:var(--hand);font-size:16px;
  color:#161616;line-height:1.15;outline:none;white-space:pre-wrap;
}

.map-polaroid .mapbox{
  width:220px;height:150px;background:#111;overflow:hidden;
  box-shadow:0 0 0 1px rgba(0,0,0,.45);position:relative;
}
.map-polaroid .mapbox iframe{
  width:100%;height:100%;border:0;display:block;
  filter:grayscale(1) contrast(1.15) brightness(.92);
  pointer-events:none;
}
.map-polaroid .cap{font-size:15px;}
.maplink{
  display:block;text-align:center;font-size:9px;letter-spacing:.12em;
  text-transform:uppercase;color:#2a2a2a;text-decoration:none;
  padding:0 0 4px;opacity:.72;
}
.maplink:hover{opacity:1;text-decoration:underline;}

.postit{
  position:relative;width:172px;min-height:172px;
  padding:15px 14px 22px;
  background:linear-gradient(155deg,#ececec 0%,#d4d4d4 68%,#bcbcbc 100%);
  box-shadow:0 16px 28px rgba(0,0,0,.82), inset 0 0 0 1px rgba(255,255,255,.5);
  font-family:var(--hand);font-size:17px;line-height:1.3;color:#141414;
  overflow-wrap:break-word;
}
.postit::after{
  content:'';position:absolute;right:0;bottom:0;width:26px;height:26px;
  background:linear-gradient(135deg,transparent 47%,rgba(0,0,0,.2) 50%);
  pointer-events:none;
}
.postit .txt{outline:none;white-space:pre-wrap;min-height:1em;}

.clipping{
  position:relative;width:238px;padding:11px 12px 14px;
  background:linear-gradient(#ebebe9,#d4d4d1);
  box-shadow:0 16px 30px rgba(0,0,0,.88), inset 0 0 0 1px rgba(255,255,255,.5);
  color:#0f0f0f;font-family:"Times New Roman",Georgia,serif;
}
.clipping .kicker{
  display:flex;justify-content:space-between;gap:8px;
  font-family:"Courier New",monospace;font-size:8px;letter-spacing:.16em;
  text-transform:uppercase;border-bottom:2px solid #111;
  padding-bottom:5px;margin-bottom:8px;color:#1a1a1a;
}
.clipping h3{
  margin:0 0 8px;font-size:18px;line-height:1.05;
  letter-spacing:-.01em;text-transform:uppercase;font-weight:800;outline:none;
}
.clipping .cols{column-count:2;column-gap:9px;column-rule:1px solid rgba(0,0,0,.22);}
.clipping p{
  margin:0;font-size:10.5px;line-height:1.35;
  text-align:justify;outline:none;hyphens:auto;
}

/* ============================================================
   PUNAISES
   ============================================================ */
.pin{
  position:absolute;width:16px;height:16px;margin:-8px 0 0 -8px;
  border-radius:50%;
  background:radial-gradient(circle at 34% 28%,#fff 0%,#c6c6c6 26%,#6f6f6f 62%,#141414 100%);
  box-shadow:0 3px 4px rgba(0,0,0,.92), 0 0 0 1px rgba(0,0,0,.7);
  pointer-events:auto;cursor:pointer;
  transition:transform .12s;
}
.pin:hover{transform:scale(1.3);}
.pin.armed::before{
  content:'';position:absolute;inset:-7px;border-radius:50%;
  border:2px solid var(--c,#c0392b);
  animation:ping 1.1s ease-out infinite;
}
@keyframes ping{
  0%{transform:scale(.72);opacity:1}
  100%{transform:scale(1.6);opacity:0}
}

/* ============================================================
   FILS
   ============================================================ */
.threadPath{
  fill:none;stroke-width:2.6;stroke-linecap:round;
  filter:drop-shadow(0 1px 2px rgba(0,0,0,.95));
}
.threadHit{fill:none;stroke:transparent;stroke-width:16;pointer-events:stroke;}
.threadDel{opacity:0;pointer-events:none;transition:opacity .15s;}
.thread:hover .threadDel{opacity:1;pointer-events:auto;}
#preview{fill:none;stroke-width:2;stroke-dasharray:7 7;opacity:.75;pointer-events:none;}

/* ============================================================
   ÉDITION INLINE
   ============================================================ */
[contenteditable="true"]{
  outline:none;background:rgba(255,255,255,.6);
  box-shadow:0 0 0 2px rgba(0,0,0,.4);border-radius:1px;
  cursor:text;user-select:text;-webkit-user-select:text;
}

/* ============================================================
   MODALES
   ============================================================ */
.modal-overlay{
  position:fixed;inset:0;z-index:9500;
  display:flex;align-items:center;justify-content:center;
  padding:20px;background:rgba(0,0,0,.8);
  animation:fadeIn .14s ease-out;
}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.modal{
  width:min(620px,100%);max-height:92vh;
  display:flex;flex-direction:column;
  background:linear-gradient(#1e1e1e,#0c0c0c);
  border:1px solid #4a4a4a;border-radius:3px;
  box-shadow:0 30px 90px rgba(0,0,0,.95), inset 0 0 0 1px rgba(255,255,255,.05);
}
.modal h2{
  margin:0;padding:14px 18px;
  font-size:12px;letter-spacing:.24em;text-transform:uppercase;
  color:#e8e8e8;border-bottom:1px solid #333;font-weight:700;
}
.modal-body{padding:18px;overflow:auto;font-family:"Courier New",monospace;}
.modal-foot{
  display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;
  padding:12px 18px;border-top:1px solid #333;background:#080808;
}
.modal-foot button.primary{background:#e8e8e8;color:#111;border-color:#fff;}
.modal-foot button.primary:hover{background:#fff;color:#000;}

.fld{display:block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#8a8a8a;margin-bottom:14px;}
.fld input,.fld select,.fld textarea{
  display:block;width:100%;margin-top:7px;
  background:#0d0d0d;border:1px solid #3a3a3a;color:#e0e0e0;
  font-family:"Courier New",monospace;font-size:12px;padding:9px 10px;
  border-radius:2px;letter-spacing:normal;text-transform:none;
}
.fld input:focus,.fld select:focus,.fld textarea:focus{
  outline:none;border-color:#8a8a8a;box-shadow:0 0 0 2px rgba(255,255,255,.07);
}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px;}
.row input[type=text]{
  flex:1;min-width:180px;background:#0d0d0d;border:1px solid #3a3a3a;
  color:#e0e0e0;font-family:"Courier New",monospace;font-size:12px;
  padding:9px 10px;border-radius:2px;
}
.row input[type=text]:focus{outline:none;border-color:#8a8a8a;}
.mini-info{font-size:10px;color:#6e6e6e;letter-spacing:.06em;line-height:1.5;font-family:"Courier New",monospace;}
.or{
  text-align:center;font-size:9px;letter-spacing:.25em;color:#555;
  text-transform:uppercase;margin:16px 0 14px;position:relative;
}
.or::before,.or::after{
  content:'';position:absolute;top:50%;width:38%;height:1px;background:#2e2e2e;
}
.or::before{left:0}.or::after{right:0}
textarea.json{
  width:100%;min-height:250px;resize:vertical;
  font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;line-height:1.55;
  background:#080808;border:1px solid #333;color:#cfcfcf;padding:10px;border-radius:2px;
}
textarea.json:focus{outline:none;border-color:#7a7a7a;}

.chk-list{list-style:none;padding:0;margin:0 0 12px;display:flex;flex-direction:column;gap:8px;}
.chk-list li{display:flex;align-items:center;gap:10px;font-size:11px;color:#c8c8c8;letter-spacing:.04em;}
.chk-list input[type="checkbox"]{width:14px;height:14px;accent-color:#e8e8e8;flex:none;}
.chk-list .muted{color:#555;font-size:10px;}
</style>
<body>

<div class="grain"></div>
<div class="vignette"></div>

<header class="toolbar">
  <div class="brand">
    <div class="badge">★</div>
    <div>
      <h1>TABLEAU D'ENQUÊTE</h1>
    </div>
  </div>

  <div class="tools">
    <button id="btnPhoto">＋ Photo</button>
    <button id="btnNote">＋ Note</button>
    <button id="btnArticle">＋ Article</button>
    <button id="btnMap">＋ Lieu</button>
    <div class="sep"></div>
    <div class="colors" id="colors"><span class="lbl">Fil&nbsp;:</span></div>
    <div class="sep"></div>
    <div class="zoom-group">
      <button id="btnZoomOut" title="Dézoomer (molette avec Ctrl)">−</button>
      <span id="zoomLabel">100%</span>
      <button id="btnZoomIn" title="Zoomer (molette avec Ctrl)">＋</button>
      <button id="btnZoomReset" title="Réinitialiser le zoom">⟲</button>
    </div>
    <div class="sep"></div>
    <button id="btnExport">⇩ Export JSON</button>
    <button id="btnImport">⇧ Import JSON</button>
    <button id="btnClear" class="danger">✕ Vider</button>
  </div>
</header>

<main class="stage" id="stage">
  <div class="slot" data-index="0">
    <div class="board-content" data-index="0">
      <div class="itemLayer"></div>
      <svg class="threadLayer" xmlns="http://www.w3.org/2000/svg"></svg>
      <div class="pinLayer"></div>
    </div>
  </div>
  <div class="slot" data-index="1">
    <div class="board-content" data-index="1">
      <div class="itemLayer"></div>
      <svg class="threadLayer" xmlns="http://www.w3.org/2000/svg"></svg>
      <div class="pinLayer"></div>
    </div>
  </div>
  <div class="slot" data-index="2">
    <div class="board-content" data-index="2">
      <div class="itemLayer"></div>
      <svg class="threadLayer" xmlns="http://www.w3.org/2000/svg"></svg>
      <div class="pinLayer"></div>
    </div>
  </div>

  <button class="nav-arrow nav-left off" id="navLeft" title="Tableau précédent">‹</button>
  <button class="nav-arrow nav-right off" id="navRight" title="Tableau suivant">›</button>

  <div class="hint">
    <b>Glisser</b> déplacer / <b>glisser dans le vide</b> panoramique &nbsp;·&nbsp;
    <b>Double-clic</b> éditer &nbsp;·&nbsp; <b>Punaise</b> relier &nbsp;·&nbsp;
    <b>Ctrl+molette</b> zoom
  </div>
</main>

<div class="mini-strip" id="miniStrip">
  <div class="mini" data-index="0">
    <div class="mini-head">
      <input type="checkbox" checked data-export="0">
      <span class="mini-num">Tableau 1</span>
    </div>
    <div class="mini-preview"><svg class="mini-svg" viewBox="0 0 132 78" preserveAspectRatio="xMidYMid meet"></svg></div>
  </div>
  <div class="mini" data-index="1">
    <div class="mini-head">
      <input type="checkbox" checked data-export="1">
      <span class="mini-num">Tableau 2</span>
    </div>
    <div class="mini-preview"><svg class="mini-svg" viewBox="0 0 132 78" preserveAspectRatio="xMidYMid meet"></svg></div>
  </div>
  <div class="mini" data-index="2">
    <div class="mini-head">
      <input type="checkbox" checked data-export="2">
      <span class="mini-num">Tableau 3</span>
    </div>
    <div class="mini-preview"><svg class="mini-svg" viewBox="0 0 132 78" preserveAspectRatio="xMidYMid meet"></svg></div>
  </div>
</div>

<input type="file" id="fileImg" accept="image/*" hidden>
<input type="file" id="fileJson" accept="application/json,.json" hidden>
<div id="modalRoot"></div>

<script>
(() => {
'use strict';

/* ============================================================
   RÉFÉRENCES
   ============================================================ */
const SVGNS       = 'http://www.w3.org/2000/svg';
const stage       = document.getElementById('stage');
const modalRoot   = document.getElementById('modalRoot');
const fileImg     = document.getElementById('fileImg');
const fileJson    = document.getElementById('fileJson');
const zoomLabel   = document.getElementById('zoomLabel');
const navLeft     = document.getElementById('navLeft');
const navRight    = document.getElementById('navRight');
const miniStrip   = document.getElementById('miniStrip');

/* ============================================================
   ÉTAT GLOBAL
   ============================================================ */
const boards = [
  { items: [], threads: [] },
  { items: [], threads: [] },
  { items: [], threads: [] }
];
let currentBoard = 0;

/* Vue par tableau (DOM + état de transform) */
const views = [0, 1, 2].map(i => {
  const slot = document.querySelector('.slot[data-index="' + i + '"]');
  return {
    index: i,
    slot,
    content:    slot.querySelector('.board-content'),
    itemLayer:  slot.querySelector('.itemLayer'),
    threadLayer:slot.querySelector('.threadLayer'),
    pinLayer:   slot.querySelector('.pinLayer'),
    px: 0, py: 0, z: 1,
    els: Object.create(null),
    pinEls: Object.create(null),
    pinPos: Object.create(null),
    armed: null,
    previewPath: null,
    suppressClick: false
  };
});

let threadColor = '#c0392b';
let currentModal = null;
let pendingPhotoCaption = '';

const rid = () => 'x' + Math.random().toString(36).slice(2, 10);
const num = (v, d) => Number.isFinite(+v) ? +v : d;
const B = () => boards[currentBoard];
const V = () => views[currentBoard];

/* ============================================================
   CONTENUS PAR DÉFAUT
   ============================================================ */
const NOTE_PRESETS = [
  "Appeler le labo.\nRésultats avant lundi.",
  "Il mentait.\nVérifier l'alibi.",
  "La clé ouvre quelque chose.\nMais quoi ?",
  "Suivre la piste du port.\nDiscrètement.",
  "Qui payait le loyer ?",
  "Ne pas oublier :\nla lettre du notaire."
];
const ARTICLE_PRESETS = [
  { kicker:'LE JOURNAL DU SOIR', headline:'CORPS RETROUVÉ SUR LES QUAIS',
    body:"Les autorités ont confirmé hier soir la découverte d'un corps sans vie à proximité des entrepôts du port. La victime, un homme d'une quarantaine d'années, n'a pas encore été formellement identifiée. Une enquête a été ouverte." },
  { kicker:'LA GAZETTE', headline:'LE TÉMOIN A DISPARU',
    body:"Le principal témoin du vol de la bijouterie n'a plus donné signe de vie depuis mardi. Sa logeuse affirme l'avoir vu partir en hâte avec une valise. La police lance un appel à témoins." },
  { kicker:'ÉDITION SPÉCIALE', headline:'UN INCENDIE SUSPECT',
    body:"L'entrepôt de la rue des Lilas a été la proie des flammes dans la nuit de samedi à dimanche. Aucune victime n'est à déplorer, mais les pompiers évoquent une origine criminelle." }
];
const SWATCHES = ['#c0392b', '#2c6fbb', '#c9a227', '#2e8b57', '#8e44ad', '#e8e8e8'];

/* ============================================================
   MODALE
   ============================================================ */
function openModal(opts) {
  if (currentModal) currentModal.close();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const box = document.createElement('div');
  box.className = 'modal';
  const h = document.createElement('h2');
  h.textContent = opts.title || '';
  const body = document.createElement('div');
  body.className = 'modal-body';
  if (typeof opts.body === 'string') body.innerHTML = opts.body;
  else if (opts.body) body.appendChild(opts.body);
  const foot = document.createElement('div');
  foot.className = 'modal-foot';

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    if (currentModal && currentModal.overlay === overlay) currentModal = null;
  };
  const onKey = e => { if (e.key === 'Escape') close(); };

  (opts.actions || []).forEach(a => {
    const b = document.createElement('button');
    b.textContent = a.label;
    if (a.cls) b.className = a.cls;
    b.addEventListener('click', () => a.onClick(close, body));
    foot.appendChild(b);
  });
  const cb = document.createElement('button');
  cb.textContent = 'Fermer';
  cb.addEventListener('click', close);
  foot.appendChild(cb);

  box.append(h, body, foot);
  overlay.appendChild(box);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', onKey);
  modalRoot.appendChild(overlay);
  currentModal = { close, overlay, body };
  return currentModal;
}

/* ============================================================
   PALETTE DE FILS
   ============================================================ */
const colorsBox = document.getElementById('colors');
SWATCHES.forEach(c => {
  const b = document.createElement('button');
  b.className = 'sw' + (c === threadColor ? ' active' : '');
  b.style.setProperty('--c', c);
  b.dataset.color = c;
  b.title = 'Fil ' + c;
  b.addEventListener('click', () => setThreadColor(c));
  colorsBox.appendChild(b);
});
function setThreadColor(c) {
  threadColor = c;
  colorsBox.querySelectorAll('.sw').forEach(s =>
    s.classList.toggle('active', s.dataset.color === c));
  const v = V();
  if (v.armed && v.pinEls[v.armed]) v.pinEls[v.armed].style.setProperty('--c', c);
  drawThreadsFor(v);
}

/* ============================================================
   CONVERSION ÉCRAN <-> MONDE
   ============================================================ */
function screenToWorld(view, sx, sy) {
  const rect = view.content.getBoundingClientRect();
  return {
    x: (sx - rect.left) / view.z,
    y: (sy - rect.top) / view.z
  };
}

function applyViewTransform(view) {
  view.content.style.transform =
    'translate(' + view.px + 'px,' + view.py + 'px) scale(' + view.z + ')';
  if (view.index === currentBoard) updateZoomLabel();
}

function updateZoomLabel() {
  zoomLabel.textContent = Math.round(V().z * 100) + '%';
}

/* ============================================================
   POSITION DE SPAWN
   ============================================================ */
function spawnPos(view, w, h) {
  const stageRect = stage.getBoundingClientRect();
  const center = screenToWorld(view,
    stageRect.left + stageRect.width / 2,
    stageRect.top  + stageRect.height / 2);
  return {
    x: Math.round(center.x - (w || 220) / 2 + (Math.random() - .5) * 200),
    y: Math.round(center.y - (h || 220) / 2 + (Math.random() - .5) * 160)
  };
}

/* ============================================================
   CRÉATION D'OBJETS
   ============================================================ */
function buildItem(view, type, opts) {
  opts = opts || {};
  const p = spawnPos(view);
  const base = {
    id:  opts.id || rid(),
    type,
    x:   num(opts.x, p.x),
    y:   num(opts.y, p.y),
    rot: num(opts.rot, +(Math.random() * 6 - 3).toFixed(2))
  };
  if (type === 'photo') {
    return Object.assign(base, {
      src: opts.src || '',
      srcType: opts.srcType === 'url' ? 'url' : 'data',
      caption: opts.caption || 'Sans titre'
    });
  }
  if (type === 'note') {
    return Object.assign(base, {
      text: opts.text || NOTE_PRESETS[(Math.random() * NOTE_PRESETS.length) | 0]
    });
  }
  if (type === 'article') {
    const pr = ARTICLE_PRESETS[(Math.random() * ARTICLE_PRESETS.length) | 0];
    return Object.assign(base, {
      kicker:   opts.kicker   || pr.kicker,
      headline: opts.headline || pr.headline,
      body:     opts.body     || pr.body
    });
  }
  if (type === 'map') {
    return Object.assign(base, {
      address: opts.address || 'Paris, France',
      zoom:    num(opts.zoom, 15)
    });
  }
  return null;
}

function addItemTo(boardIndex, type, opts) {
  const item = buildItem(views[boardIndex], type, opts);
  if (!item) return null;
  boards[boardIndex].items.push(item);
  renderItemTo(boardIndex, item);
  updateOverlaysFor(views[boardIndex]);
  updateMiniature(boardIndex);
  return item;
}

function addItem(type, opts) {
  return addItemTo(currentBoard, type, opts);
}

function removeItemFrom(boardIndex, id) {
  const bd = boards[boardIndex];
  bd.items   = bd.items.filter(i => i.id !== id);
  bd.threads = bd.threads.filter(t => t.from !== id && t.to !== id);
  const v = views[boardIndex];
  if (v.els[id])    { v.els[id].remove();    delete v.els[id]; }
  if (v.pinEls[id]) { v.pinEls[id].remove(); delete v.pinEls[id]; }
  delete v.pinPos[id];
  if (v.armed === id) disarmView(v);
  drawThreadsFor(v);
  updateMiniature(boardIndex);
}

function removeThreadFrom(boardIndex, id) {
  const bd = boards[boardIndex];
  bd.threads = bd.threads.filter(t => t.id !== id);
  drawThreadsFor(views[boardIndex]);
  updateMiniature(boardIndex);
}

/* ============================================================
   GOOGLE MAPS SANS CLÉ API
   ============================================================ */
function mapSrc(item) {
  const q = encodeURIComponent(item.address || 'Paris');
  const z = Math.max(2, Math.min(20, item.zoom || 15));
  return 'https://maps.google.com/maps?q=' + q + '&z=' + z + '&t=m&output=embed';
}
function mapLink(item) {
  return 'https://www.google.com/maps/search/?api=1&query=' +
         encodeURIComponent(item.address || 'Paris');
}

/* ============================================================
   CONSTRUCTION DU CONTENU
   ============================================================ */
function buildContent(item) {
  if (item.type === 'photo') {
    const wrap = document.createElement('div');
    wrap.className = 'polaroid';
    if (item.src) {
      const img = document.createElement('img');
      img.className = 'ph'; img.alt = ''; img.draggable = false;
      img.referrerPolicy = 'no-referrer'; img.src = item.src;
      wrap.appendChild(img);
    } else {
      const ph = document.createElement('div');
      ph.className = 'ph-empty'; ph.textContent = 'Aucune image';
      wrap.appendChild(ph);
    }
    const cap = document.createElement('div');
    cap.className = 'cap'; cap.dataset.field = 'caption';
    cap.textContent = item.caption || 'Sans titre';
    wrap.appendChild(cap);
    return wrap;
  }
  if (item.type === 'map') {
    const wrap = document.createElement('div');
    wrap.className = 'polaroid map-polaroid';
    const box = document.createElement('div');
    box.className = 'mapbox';
    const ifr = document.createElement('iframe');
    ifr.loading = 'lazy';
    ifr.referrerPolicy = 'no-referrer-when-downgrade';
    ifr.setAttribute('title', 'Carte : ' + (item.address || ''));
    ifr.src = mapSrc(item);
    box.appendChild(ifr);
    const cap = document.createElement('div');
    cap.className = 'cap'; cap.dataset.field = 'address';
    cap.textContent = item.address || 'Adresse inconnue';
    const link = document.createElement('a');
    link.className = 'maplink'; link.href = mapLink(item);
    link.target = '_blank'; link.rel = 'noopener';
    link.textContent = 'Ouvrir dans Maps ↗';
    link.addEventListener('pointerdown', e => e.stopPropagation());
    wrap.append(box, cap, link);
    return wrap;
  }
  if (item.type === 'note') {
    const wrap = document.createElement('div');
    wrap.className = 'postit';
    const txt = document.createElement('div');
    txt.className = 'txt'; txt.dataset.field = 'text';
    txt.textContent = item.text || '';
    wrap.appendChild(txt);
    return wrap;
  }
  // article
  const wrap = document.createElement('div');
  wrap.className = 'clipping';
  const kicker = document.createElement('div');
  kicker.className = 'kicker';
  const k1 = document.createElement('span'); k1.textContent = item.kicker || 'ÉDITION SPÉCIALE';
  const k2 = document.createElement('span'); k2.textContent = '1947';
  kicker.append(k1, k2);
  const h3 = document.createElement('h3');
  h3.dataset.field = 'headline'; h3.textContent = item.headline || '...';
  const cols = document.createElement('div');
  cols.className = 'cols';
  const p = document.createElement('p');
  p.dataset.field = 'body'; p.textContent = item.body || '...';
  cols.appendChild(p);
  wrap.append(kicker, h3, cols);
  return wrap;
}

/* ============================================================
   RENDU D'UN OBJET DANS UN TABLEAU
   ============================================================ */
function renderItemTo(boardIndex, item) {
  const v = views[boardIndex];
  const el = document.createElement('div');
  el.className = 'item';
  el.dataset.id = item.id;
  el.style.left = item.x + 'px';
  el.style.top  = item.y + 'px';
  el.style.transform = 'rotate(' + (item.rot || 0) + 'deg)';
  el.appendChild(buildContent(item));

  const del = document.createElement('button');
  del.className = 'del'; del.type = 'button';
  del.textContent = '×'; del.title = 'Supprimer';
  del.addEventListener('pointerdown', e => e.stopPropagation());
  del.addEventListener('click', e => {
    e.stopPropagation();
    removeItemFrom(boardIndex, item.id);
  });
  el.appendChild(del);

  el.addEventListener('dblclick', e => {
    const f = e.target.closest('[data-field]');
    if (f) startEdit(boardIndex, f, item);
  });

  enableDrag(el, item, boardIndex);

  v.itemLayer.appendChild(el);
  v.els[item.id] = el;

  const pin = document.createElement('div');
  pin.className = 'pin';
  pin.title = 'Relier à une autre punaise';
  pin.addEventListener('pointerdown', e => e.stopPropagation());
  pin.addEventListener('click', e => {
    e.stopPropagation();
    toggleArmView(v, item.id);
  });
  v.pinLayer.appendChild(pin);
  v.pinEls[item.id] = pin;
}

/* ============================================================
   ÉDITION INLINE
   ============================================================ */
function startEdit(boardIndex, fieldEl, item) {
  if (fieldEl.isContentEditable) return;
  const key = fieldEl.dataset.field;
  if (!key) return;
  fieldEl.contentEditable = 'true';
  fieldEl.focus();
  const range = document.createRange();
  range.selectNodeContents(fieldEl);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  const done = () => {
    fieldEl.contentEditable = 'false';
    item[key] = fieldEl.innerText.replace(/\u00a0/g, ' ').trim();
    fieldEl.removeEventListener('blur', done);
    fieldEl.onkeydown = null;
    if (item.type === 'map') {
      const el = views[boardIndex].els[item.id];
      if (el) {
        const ifr = el.querySelector('iframe');
        if (ifr) ifr.src = mapSrc(item);
        const link = el.querySelector('.maplink');
        if (link) link.href = mapLink(item);
      }
    }
    updateOverlaysFor(views[boardIndex]);
    updateMiniature(boardIndex);
  };
  fieldEl.addEventListener('blur', done);
  fieldEl.onkeydown = ev => {
    if (ev.key === 'Escape') { ev.preventDefault(); fieldEl.blur(); }
    if (ev.key === 'Enter' && !ev.shiftKey && item.type !== 'note') {
      ev.preventDefault(); fieldEl.blur();
    }
  };
}

/* ============================================================
   DÉPLACEMENT
   ============================================================ */
function enableDrag(el, item, boardIndex) {
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    if (e.target.closest('[contenteditable="true"]')) return;
    if (e.target.closest('button')) return;
    if (e.target.closest('a')) return;
    e.stopPropagation();   // empêche le pan du plateau

    const v = views[boardIndex];
    // si un fil est armé sur CE tableau, le désarmer
    if (v.armed && v.armed !== item.id) disarmView(v);

    const startX = e.clientX, startY = e.clientY;
    const ox = item.x, oy = item.y;
    let moved = false;

    const move = ev => {
      const dx = (ev.clientX - startX) / v.z;
      const dy = (ev.clientY - startY) / v.z;
      if (!moved) {
        if (Math.hypot(dx, dy) < 3) return;
        moved = true;
        el.classList.add('dragging');
        el.style.zIndex = 60;
      }
      item.x = ox + dx;
      item.y = oy + dy;
      el.style.left = item.x + 'px';
      el.style.top  = item.y + 'px';
      updateOverlaysFor(v);
    };

    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      el.classList.remove('dragging');
      el.style.zIndex = '';
      if (moved) updateMiniature(boardIndex);
    };

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  });
}

/* ============================================================
   PINS / FILS
   ============================================================ */
function updateOverlaysFor(view) {
  const bd = boards[view.index];
  for (const item of bd.items) {
    const el = view.els[item.id];
    if (!el) continue;
    const w = el.offsetWidth || 0;
    const h = el.offsetHeight || 0;
    if (!w || !h) continue;
    const rad = (item.rot || 0) * Math.PI / 180;
    const cx = item.x + w / 2;
    const cy = item.y + h / 2;
    const px = cx + (h / 2) * Math.sin(rad);
    const py = cy - (h / 2) * Math.cos(rad);
    view.pinPos[item.id] = { x: px, y: py };
    const pin = view.pinEls[item.id];
    if (pin) {
      pin.style.left = px + 'px';
      pin.style.top  = py + 'px';
    }
  }
  drawThreadsFor(view);
}

function drawThreadsFor(view) {
  while (view.threadLayer.firstChild) view.threadLayer.removeChild(view.threadLayer.firstChild);
  const bd = boards[view.index];
  const isActive = view.index === currentBoard;

  for (const t of bd.threads) {
    const a = view.pinPos[t.from];
    const b = view.pinPos[t.to];
    if (!a || !b) continue;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const off = Math.min(34, len * 0.08);
    const mx = (a.x + b.x) / 2 - (dy / len) * off;
    const my = (a.y + b.y) / 2 + (dx / len) * off;
    const d = `M${a.x.toFixed(2)},${a.y.toFixed(2)} Q${mx.toFixed(2)},${my.toFixed(2)} ${b.x.toFixed(2)},${b.y.toFixed(2)}`;

    const g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', 'thread');

    const hit = document.createElementNS(SVGNS, 'path');
    hit.setAttribute('class', 'threadHit');
    hit.setAttribute('d', d);
    g.appendChild(hit);

    const path = document.createElementNS(SVGNS, 'path');
    path.setAttribute('class', 'threadPath');
    path.setAttribute('d', d);
    path.setAttribute('stroke', t.color || '#c0392b');
    g.appendChild(path);

    if (isActive) {
      const qx = 0.25 * a.x + 0.5 * mx + 0.25 * b.x;
      const qy = 0.25 * a.y + 0.5 * my + 0.25 * b.y;
      const delG = document.createElementNS(SVGNS, 'g');
      delG.setAttribute('class', 'threadDel');
      delG.setAttribute('transform', `translate(${qx.toFixed(2)},${qy.toFixed(2)})`);

      const circ = document.createElementNS(SVGNS, 'circle');
      circ.setAttribute('r', '9'); circ.setAttribute('fill', '#0d0d0d');
      circ.setAttribute('stroke', '#bbb'); circ.setAttribute('stroke-width', '1');
      delG.appendChild(circ);

      const txt = document.createElementNS(SVGNS, 'text');
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('dominant-baseline', 'central');
      txt.setAttribute('font-size', '12');
      txt.setAttribute('font-family', 'system-ui,sans-serif');
      txt.setAttribute('fill', '#eee');
      txt.textContent = '×';
      delG.appendChild(txt);
      delG.addEventListener('click', ev => {
        ev.stopPropagation();
        removeThreadFrom(view.index, t.id);
      });
      g.appendChild(delG);
    }

    view.threadLayer.appendChild(g);
  }

  if (!view.previewPath) {
    view.previewPath = document.createElementNS(SVGNS, 'path');
    view.previewPath.id = 'preview';
  }
  view.previewPath.setAttribute('stroke', threadColor);
  view.previewPath.style.display = (isActive && view.armed) ? '' : 'none';
  if (!(isActive && view.armed)) view.previewPath.removeAttribute('d');
  view.threadLayer.appendChild(view.previewPath);
}

function toggleArmView(view, itemId) {
  if (view.armed === null) {
    view.armed = itemId;
    view.pinEls[itemId].classList.add('armed');
    view.pinEls[itemId].style.setProperty('--c', threadColor);
    stage.classList.add('armed');
    drawThreadsFor(view);
  } else if (view.armed === itemId) {
    disarmView(view);
  } else {
    const exists = boards[view.index].threads.some(t =>
      (t.from === view.armed && t.to === itemId) ||
      (t.from === itemId && t.to === view.armed));
    if (!exists) {
      boards[view.index].threads.push({
        id: rid(), from: view.armed, to: itemId, color: threadColor
      });
      updateMiniature(view.index);
    }
    disarmView(view);
  }
}

function disarmView(view) {
  if (view.armed && view.pinEls[view.armed]) view.pinEls[view.armed].classList.remove('armed');
  view.armed = null;
  if (view.index === currentBoard) stage.classList.remove('armed');
  if (view.previewPath) {
    view.previewPath.style.display = 'none';
    view.previewPath.removeAttribute('d');
  }
  drawThreadsFor(view);
}

function disarmCurrent() {
  const v = V();
  if (v.armed) disarmView(v);
}

/* ============================================================
   GESTION DU PLATEAU (pan + preview fil + disarm)
   ============================================================ */
views.forEach(v => {
  // pointerdown : pan (uniquement sur zone vide)
  v.content.addEventListener('pointerdown', e => {
    if (v.index !== currentBoard) return;
    if (e.button !== 0) return;
    if (e.target !== v.itemLayer) return;
    if (e.target.closest('.threadHit') || e.target.closest('.threadDel')) return;

    const startX = e.clientX, startY = e.clientY;
    const startPx = v.px, startPy = v.py;
    let moved = false;

    const move = ev => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved) {
        if (Math.hypot(dx, dy) < 4) return;
        moved = true;
        v.content.style.cursor = 'grabbing';
      }
      v.px = startPx + dx;
      v.py = startPy + dy;
      applyViewTransform(v);
    };

    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      v.content.style.cursor = '';
      if (moved) v.suppressClick = true;
    };

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  });

  // click : disarm (si pas un pan)
  v.content.addEventListener('click', e => {
    if (v.suppressClick) { v.suppressClick = false; return; }
    if (v.index !== currentBoard) return;
    if (v.armed && !e.target.closest('.pin')) disarmView(v);
  });

  // mousemove : preview du fil
  v.content.addEventListener('pointermove', e => {
    if (v.index !== currentBoard) return;
    if (!v.armed || !v.previewPath) return;
    const a = v.pinPos[v.armed];
    if (!a) return;
    const w = screenToWorld(v, e.clientX, e.clientY);
    v.previewPath.setAttribute('d',
      `M${a.x.toFixed(2)},${a.y.toFixed(2)} L${w.x.toFixed(2)},${w.y.toFixed(2)}`);
  });

  // wheel : zoom vers la souris
  v.content.addEventListener('wheel', e => {
    if (v.index !== currentBoard) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setZoomAt(v, v.z * factor, e.clientX, e.clientY);
  }, { passive: false });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !currentModal) disarmCurrent();
});

/* ============================================================
   ZOOM
   ============================================================ */
function setZoomAt(view, newZ, screenX, screenY) {
  newZ = Math.max(0.25, Math.min(4, newZ));
  if (Math.abs(newZ - view.z) < 1e-4) return;
  const rect = view.content.getBoundingClientRect();
  const ux = screenX - rect.left;
  const uy = screenY - rect.top;
  const ratio = newZ / view.z;
  view.px = ux * (1 - ratio) + view.px;
  view.py = uy * (1 - ratio) + view.py;
  view.z  = newZ;
  applyViewTransform(view);
  updateZoomLabel();
}

function zoomBy(factor) {
  const v = V();
  const r = stage.getBoundingClientRect();
  setZoomAt(v, v.z * factor, r.left + r.width / 2, r.top + r.height / 2);
}

function resetZoom() {
  const v = V();
  v.px = 0; v.py = 0; v.z = 1;
  applyViewTransform(v);
  updateZoomLabel();
}

document.getElementById('btnZoomIn').addEventListener('click', () => zoomBy(1.25));
document.getElementById('btnZoomOut').addEventListener('click', () => zoomBy(1 / 1.25));
document.getElementById('btnZoomReset').addEventListener('click', resetZoom);

/* ============================================================
   NAVIGATION ENTRE TABLEAUX
   ============================================================ */
function setCurrentBoard(index) {
  if (index < 0 || index > 2 || index === currentBoard) return;

  // désarmer l'ancien
  disarmView(views[currentBoard]);
  document.activeElement && document.activeElement.blur && document.activeElement.blur();

  currentBoard = index;
  updateSlotStates();
  updateMiniSelection();
  updateZoomLabel();
  updateNavArrows();

  // recalculer les overlays du nouveau tableau (au cas où)
  requestAnimationFrame(() => {
    updateOverlaysFor(views[currentBoard]);
    updateMiniature(currentBoard);
  });
}

function updateSlotStates() {
  views.forEach((v, i) => {
    const rel = i - currentBoard;
    let state = 'hidden';
    if (rel === 0) state = 'front';
    else if (rel === -1) state = 'left';
    else if (rel === 1) state = 'right';
    // rel = -2 ou +2 -> hidden
    v.slot.setAttribute('data-state', state);
  });
}

function updateMiniSelection() {
  miniStrip.querySelectorAll('.mini').forEach(m => {
    m.classList.toggle('active', +m.dataset.index === currentBoard);
  });
}

function updateNavArrows() {
  navLeft.classList.toggle('off', currentBoard <= 0);
  navRight.classList.toggle('off', currentBoard >= 2);
}

navLeft.addEventListener('click', () => setCurrentBoard(currentBoard - 1));
navRight.addEventListener('click', () => setCurrentBoard(currentBoard + 1));

/* ============================================================
   MINIATURES
   ============================================================ */
function updateMiniature(index) {
  const svg = miniStrip.querySelector('.mini[data-index="' + index + '"] .mini-svg');
  if (!svg) return;
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const bd = boards[index];
  const items = bd.items;

  if (!items.length) {
    const t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('x', '66'); t.setAttribute('y', '42');
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'central');
    t.setAttribute('fill', '#333');
    t.setAttribute('font-size', '9');
    t.setAttribute('font-family', 'system-ui,sans-serif');
    t.setAttribute('letter-spacing', '2');
    t.textContent = 'VIDE';
    svg.appendChild(t);
    return;
  }

  // bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const it of items) {
    const w = views[index].els[it.id] ? views[index].els[it.id].offsetWidth  : 200;
    const h = views[index].els[it.id] ? views[index].els[it.id].offsetHeight : 200;
    minX = Math.min(minX, it.x);
    minY = Math.min(minY, it.y);
    maxX = Math.max(maxX, it.x + w);
    maxY = Math.max(maxY, it.y + h);
  }
  const wW = Math.max(1, maxX - minX);
  const wH = Math.max(1, maxY - minY);
  const pad = 8;
  const availW = 132 - pad * 2;
  const availH = 78 - pad * 2;
  const scale = Math.min(availW / wW, availH / wH);

  const toMini = (x, y) => ({
    x: pad + (x - minX) * scale,
    y: pad + (y - minY) * scale
  });

  // centre approximatif de chaque item
  const center = id => {
    const it = items.find(i => i.id === id);
    if (!it) return null;
    const el = views[index].els[it.id];
    const w = el ? el.offsetWidth  : 200;
    const h = el ? el.offsetHeight : 200;
    return { x: it.x + w / 2, y: it.y + h / 2 };
  };

  // fils
  bd.threads.forEach(t => {
    const c1 = center(t.from);
    const c2 = center(t.to);
    if (!c1 || !c2) return;
    const p1 = toMini(c1.x, c1.y);
    const p2 = toMini(c2.x, c2.y);
    const line = document.createElementNS(SVGNS, 'line');
    line.setAttribute('x1', p1.x.toFixed(1));
    line.setAttribute('y1', p1.y.toFixed(1));
    line.setAttribute('x2', p2.x.toFixed(1));
    line.setAttribute('y2', p2.y.toFixed(1));
    line.setAttribute('stroke', t.color || '#c0392b');
    line.setAttribute('stroke-width', '0.8');
    line.setAttribute('opacity', '0.85');
    svg.appendChild(line);
  });

  // objets
  items.forEach(it => {
    const el = views[index].els[it.id];
    const w = el ? el.offsetWidth  : 200;
    const h = el ? el.offsetHeight : 200;
    const p = toMini(it.x + w / 2, it.y + h / 2);
    const rect = document.createElementNS(SVGNS, 'rect');
    const size = Math.max(4, Math.min(10, Math.min(w, h) * scale));
    rect.setAttribute('x', (p.x - size / 2).toFixed(1));
    rect.setAttribute('y', (p.y - size / 2).toFixed(1));
    rect.setAttribute('width', size.toFixed(1));
    rect.setAttribute('height', size.toFixed(1));
    rect.setAttribute('fill',
      it.type === 'photo'   ? '#d4d4d4' :
      it.type === 'note'    ? '#e8e8a0' :
      it.type === 'article' ? '#c8c8c8' : '#9ec4d4');
    rect.setAttribute('stroke', 'rgba(0,0,0,0.8)');
    rect.setAttribute('stroke-width', '0.5');
    svg.appendChild(rect);
  });
}

function updateAllMiniatures() {
  for (let i = 0; i < 3; i++) updateMiniature(i);
}

// Interactions sur les miniatures
miniStrip.querySelectorAll('.mini').forEach(m => {
  const idx = +m.dataset.index;
  const chk = m.querySelector('input[type="checkbox"]');

  chk.addEventListener('click', e => e.stopPropagation());
  chk.addEventListener('change', () => {});  // rien à faire de plus

  m.addEventListener('click', e => {
    if (e.target === chk) return;
    setCurrentBoard(idx);
  });
});

function getCheckedBoards() {
  const res = [];
  for (let i = 0; i < 3; i++) {
    const chk = miniStrip.querySelector('input[data-export="' + i + '"]');
    if (chk && chk.checked) res.push(i);
  }
  return res;
}

/* ============================================================
   RENDU GLOBAL D'UN TABLEAU
   ============================================================ */
function renderBoardTo(index) {
  const v = views[index];
  v.itemLayer.innerHTML = '';
  v.pinLayer.innerHTML = '';
  while (v.threadLayer.firstChild) v.threadLayer.removeChild(v.threadLayer.firstChild);
  v.previewPath = null;
  v.els    = Object.create(null);
  v.pinEls = Object.create(null);
  v.pinPos = Object.create(null);
  v.armed  = null;

  boards[index].items.forEach(item => renderItemTo(index, item));
  updateOverlaysFor(v);
}

function renderAll() {
  for (let i = 0; i < 3; i++) renderBoardTo(i);
  requestAnimationFrame(() => {
    for (let i = 0; i < 3; i++) updateOverlaysFor(views[i]);
    updateAllMiniatures();
  });
  setTimeout(() => {
    for (let i = 0; i < 3; i++) updateOverlaysFor(views[i]);
    updateAllMiniatures();
  }, 150);
}

/* ============================================================
   IMAGE -> DATA URL
   ============================================================ */
function fileToDataURL(file, maxSize, quality) {
  return new Promise(resolve => {
    const fr = new FileReader();
    fr.onload = () => {
      const raw = fr.result;
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth, h = img.naturalHeight;
        const scale = Math.min(1, maxSize / Math.max(w, h));
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        try { resolve(cv.toDataURL('image/jpeg', quality)); }
        catch (err) { resolve(raw); }
      };
      img.onerror = () => resolve(raw);
      img.src = raw;
    };
    fr.onerror = () => resolve('');
    fr.readAsDataURL(file);
  });
}

/* ============================================================
   MODALE PHOTO
   ============================================================ */
document.getElementById('btnPhoto').addEventListener('click', () => {
  const body = document.createElement('div');

  const f1 = document.createElement('label');
  f1.className = 'fld'; f1.textContent = 'Légende';
  const inpCap = document.createElement('input');
  inpCap.type = 'text'; inpCap.placeholder = 'Sans titre'; inpCap.maxLength = 90;
  f1.appendChild(inpCap);
  body.appendChild(f1);

  const or1 = document.createElement('div');
  or1.className = 'or'; or1.textContent = 'image';
  body.appendChild(or1);

  const rowFile = document.createElement('div');
  rowFile.className = 'row';
  const btnFile = document.createElement('button');
  btnFile.type = 'button'; btnFile.className = 'primary';
  btnFile.textContent = '📁 Choisir un fichier…';
  const noteFile = document.createElement('span');
  noteFile.className = 'mini-info';
  noteFile.textContent = '→ intégrée en base64 dans le JSON';
  rowFile.append(btnFile, noteFile);
  body.appendChild(rowFile);

  const or2 = document.createElement('div');
  or2.className = 'or'; or2.textContent = 'ou';
  body.appendChild(or2);

  const rowUrl = document.createElement('div');
  rowUrl.className = 'row';
  const inpUrl = document.createElement('input');
  inpUrl.type = 'text'; inpUrl.placeholder = 'https://exemple.com/photo.jpg';
  const btnUrl = document.createElement('button');
  btnUrl.type = 'button'; btnUrl.textContent = 'Utiliser cette URL';
  rowUrl.append(inpUrl, btnUrl);
  body.appendChild(rowUrl);

  const noteUrl = document.createElement('div');
  noteUrl.className = 'mini-info';
  noteUrl.textContent = '→ l’URL est conservée telle quelle dans le JSON (fichier plus léger).';
  body.appendChild(noteUrl);

  const m = openModal({ title: 'Ajouter une photo', body, actions: [] });

  btnFile.addEventListener('click', () => {
    pendingPhotoCaption = inpCap.value.trim();
    fileImg.click();
  });
  btnUrl.addEventListener('click', () => {
    const u = inpUrl.value.trim();
    if (!u) { inpUrl.focus(); return; }
    addItem('photo', { src: u, srcType: 'url',
      caption: inpCap.value.trim() || 'Sans titre' });
    m.close();
  });
  inpUrl.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); btnUrl.click(); }
  });
  setTimeout(() => inpCap.focus(), 40);
});

fileImg.addEventListener('change', async e => {
  const f = e.target.files && e.target.files[0];
  fileImg.value = '';
  if (!f) return;
  const src = await fileToDataURL(f, 720, 0.82);
  if (!src) return;
  addItem('photo', { src, srcType: 'data',
    caption: pendingPhotoCaption || 'Sans titre' });
  pendingPhotoCaption = '';
  if (currentModal) currentModal.close();
});

/* ============================================================
   MODALE LIEU / GOOGLE MAPS
   ============================================================ */
document.getElementById('btnMap').addEventListener('click', () => {
  const body = document.createElement('div');

  const f1 = document.createElement('label');
  f1.className = 'fld'; f1.textContent = 'Adresse / lieu';
  const inpAddr = document.createElement('input');
  inpAddr.type = 'text'; inpAddr.placeholder = '12 rue de la Paix, Paris, France';
  inpAddr.maxLength = 200;
  f1.appendChild(inpAddr);
  body.appendChild(f1);

  const f2 = document.createElement('label');
  f2.className = 'fld'; f2.textContent = 'Zoom (2 = monde → 20 = rue)';
  const inpZoom = document.createElement('input');
  inpZoom.type = 'number'; inpZoom.min = '2'; inpZoom.max = '20'; inpZoom.value = '15';
  f2.appendChild(inpZoom);
  body.appendChild(f2);

  const note = document.createElement('div');
  note.className = 'mini-info';
  note.textContent = 'Carte intégrée via Google Maps, aucune clé API requise. Seule l’adresse et le zoom sont enregistrés dans le JSON.';
  body.appendChild(note);

  const m = openModal({
    title: 'Ajouter un lieu',
    body,
    actions: [{
      label: '＋ Épingler la carte',
      cls: 'primary',
      onClick: close => {
        const address = inpAddr.value.trim();
        if (!address) { inpAddr.focus(); return; }
        addItem('map', {
          address,
          zoom: Math.max(2, Math.min(20, parseInt(inpZoom.value, 10) || 15))
        });
        close();
      }
    }]
  });
  inpAddr.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); inpZoom.focus(); }
  });
  setTimeout(() => inpAddr.focus(), 40);
});

/* ============================================================
   EXPORT JSON (MULTI-TABLEAUX)
   ============================================================ */
function buildExportData(selectedIndices) {
  return {
    version: 2,
    app: 'tableau-enquete',
    exportedAt: new Date().toISOString(),
    boards: selectedIndices.map(slot => ({
      slot,
      items:   boards[slot].items.map(i => Object.assign({}, i)),
      threads: boards[slot].threads.map(t => Object.assign({}, t))
    }))
  };
}

function downloadText(text, filename, mime) {
  const blob = new Blob([text], { type: mime || 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    if (a.parentNode) a.parentNode.removeChild(a);
  }, 3000);
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  }
  fallbackCopy(text);
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); } catch (e) {}
  document.body.removeChild(ta);
}

document.getElementById('btnExport').addEventListener('click', () => {
  const selected = getCheckedBoards();
  if (!selected.length) {
    alert('Aucun tableau n’est coché pour l’export.\nCochez au moins un tableau dans la barre du bas.');
    return;
  }

  const data = buildExportData(selected);
  const json = JSON.stringify(data, null, 2);

  const body = document.createElement('div');

  const info = document.createElement('p');
  info.className = 'mini-info';
  info.style.margin = '0 0 8px';
  info.textContent =
    'Tableaux exportés : ' + selected.map(i => i + 1).join(', ') +
    '  ·  ' + json.length + ' octets (' + (json.length / 1024).toFixed(1) + ' Ko)';

  const list = document.createElement('ul');
  list.className = 'chk-list';
  [0, 1, 2].forEach(i => {
    const li = document.createElement('li');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = selected.includes(i);
    cb.dataset.slot = i;
    cb.addEventListener('change', () => {
      // recalculer le JSON affiché
      const sel = [0, 1, 2].filter(k => {
        const c = list.querySelector('input[data-slot="' + k + '"]');
        return c && c.checked;
      });
      if (!sel.length) { cb.checked = true; return; }
      const j = JSON.stringify(buildExportData(sel), null, 2);
      ta.value = j;
      info.textContent =
        'Tableaux exportés : ' + sel.map(x => x + 1).join(', ') +
        '  ·  ' + j.length + ' octets (' + (j.length / 1024).toFixed(1) + ' Ko)';
      // synchroniser les cases de la barre du bas
      [0, 1, 2].forEach(k => {
        const barCb = miniStrip.querySelector('input[data-export="' + k + '"]');
        if (barCb) barCb.checked = sel.includes(k);
      });
    });
    const lb = document.createElement('label');
    lb.style.display = 'flex'; lb.style.alignItems = 'center'; lb.style.gap = '8px';
    lb.appendChild(cb);
    const txt = document.createElement('span');
    txt.textContent = 'Tableau ' + (i + 1);
    lb.appendChild(txt);
    const muted = document.createElement('span');
    muted.className = 'muted';
    muted.textContent = '(' + boards[i].items.length + ' objet' + (boards[i].items.length > 1 ? 's' : '') +
                        ', ' + boards[i].threads.length + ' fil' + (boards[i].threads.length > 1 ? 's' : '') + ')';
    lb.appendChild(muted);
    li.appendChild(lb);
    list.appendChild(li);
  });

  const ta = document.createElement('textarea');
  ta.className = 'json'; ta.readOnly = true; ta.spellcheck = false;
  ta.value = json;

  body.append(info, list, ta);

  openModal({
    title: 'Export JSON',
    body,
    actions: [
      {
        label: '⇩ Télécharger le .json',
        cls: 'primary',
        onClick: () => {
          const sel = [0, 1, 2].filter(k => {
            const c = list.querySelector('input[data-slot="' + k + '"]');
            return c && c.checked;
          });
          if (!sel.length) { alert('Sélectionnez au moins un tableau.'); return; }
          const j = JSON.stringify(buildExportData(sel), null, 2);
          const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
          downloadText(j, 'tableau-enquete-' + stamp + '.json', 'application/json');
        }
      },
      {
        label: '⧉ Copier',
        onClick: () => {
          copyText(ta.value);
          const btn = document.querySelector('.modal-foot button:nth-child(2)');
          if (btn) {
            const old = btn.textContent;
            btn.textContent = '✓ Copié';
            setTimeout(() => { btn.textContent = old; }, 1400);
          }
        }
      }
    ]
  });

  setTimeout(() => { ta.focus(); ta.select(); }, 60);
});

/* ============================================================
   IMPORT JSON
   ============================================================ */
document.getElementById('btnImport').addEventListener('click', () => {
  const body = document.createElement('div');

  const p = document.createElement('p');
  p.className = 'mini-info';
  p.style.margin = '0 0 10px';
  p.textContent = 'Collez un JSON exporté (v1 ou v2), ou chargez directement le fichier. Un JSON v1 est chargé dans le tableau courant. Un JSON v2 restaure les tableaux dans leurs emplacements d’origine.';

  const ta = document.createElement('textarea');
  ta.className = 'json';
  ta.placeholder = '{ "version": 2, "boards": [ ... ] }';
  ta.spellcheck = false;

  body.append(p, ta);

  openModal({
    title: 'Import JSON',
    body,
    actions: [
      {
        label: '📁 Charger un fichier…',
        onClick: () => fileJson.click()
      },
      {
        label: '⇧ Importer ce texte',
        cls: 'primary',
        onClick: close => {
          const raw = ta.value.trim();
          if (!raw) { ta.focus(); return; }
          try {
            const data = JSON.parse(raw);
            loadState(data);
            close();
          } catch (err) {
            alert('JSON invalide :\n' + err.message);
          }
        }
      }
    ]
  });
});

fileJson.addEventListener('change', e => {
  const f = e.target.files && e.target.files[0];
  fileJson.value = '';
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      loadState(data);
      if (currentModal) currentModal.close();
    } catch (err) {
      alert('Fichier JSON illisible :\n' + err.message);
    }
  };
  reader.readAsText(f);
});

function normalizeItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!['photo', 'note', 'article', 'map'].includes(raw.type)) return null;
  const base = {
    id:  raw.id || rid(),
    type: raw.type,
    x:   num(raw.x, 40),
    y:   num(raw.y, 40),
    rot: num(raw.rot, 0)
  };
  if (raw.type === 'photo') {
    base.src     = typeof raw.src === 'string' ? raw.src : '';
    base.srcType = raw.srcType === 'url' ? 'url' : 'data';
    base.caption = raw.caption || 'Sans titre';
  } else if (raw.type === 'note') {
    base.text = raw.text || '';
  } else if (raw.type === 'article') {
    base.kicker   = raw.kicker || 'ÉDITION SPÉCIALE';
    base.headline = raw.headline || '...';
    base.body     = raw.body || '...';
  } else if (raw.type === 'map') {
    base.address = raw.address || 'Paris, France';
    base.zoom    = num(raw.zoom, 15);
  }
  return base;
}

function loadBoardInto(slot, data) {
  const items = (Array.isArray(data.items) ? data.items : [])
    .map(normalizeItem).filter(Boolean);
  const ids = new Set(items.map(i => i.id));
  const threads = (Array.isArray(data.threads) ? data.threads : [])
    .filter(t => t && ids.has(t.from) && ids.has(t.to) && t.from !== t.to)
    .map(t => ({
      id:    t.id || rid(),
      from:  t.from,
      to:    t.to,
      color: typeof t.color === 'string' ? t.color : '#c0392b'
    }));
  boards[slot].items = items;
  boards[slot].threads = threads;
}

function loadState(data) {
  if (!data || typeof data !== 'object') throw new Error('Format inattendu');

  if (Array.isArray(data.boards)) {
    // v2
    boards.forEach(b => { b.items = []; b.threads = []; });
    data.boards.forEach(entry => {
      if (!entry || typeof entry !== 'object') return;
      const slot = Number.isInteger(entry.slot) ? entry.slot : 0;
      if (slot < 0 || slot > 2) return;
      loadBoardInto(slot, entry);
    });
  } else if (Array.isArray(data.items)) {
    // v1 -> tableau courant
    loadBoardInto(currentBoard, data);
  } else {
    throw new Error('Aucun tableau trouvé dans le JSON.');
  }

  disarmCurrent();
  renderAll();
  updateSlotStates();
  updateMiniSelection();
  updateNavArrows();
}

/* ============================================================
   VIDER
   ============================================================ */
document.getElementById('btnClear').addEventListener('click', () => {
  const bd = B();
  if (!bd.items.length && !bd.threads.length) return;
  if (!confirm('Effacer le tableau ' + (currentBoard + 1) + ' ? Cette action est irréversible.')) return;
  bd.items = [];
  bd.threads = [];
  disarmCurrent();
  renderBoardTo(currentBoard);
  updateMiniature(currentBoard);
  updateZoomLabel();
});

/* ============================================================
   DÉMARRAGE / SEED
   ============================================================ */
function seed() {
  // Tableau 1 : la scène
  const n1 = addItemTo(0, 'note', {
    text: "Le témoin\nn'a jamais quitté\nla ville.", rot: -3.2
  });
  const a1 = addItemTo(0, 'article', {
    kicker: 'LE JOURNAL DU SOIR',
    headline: 'CORPS RETROUVÉ SUR LES QUAIS',
    body: "Les autorités ont confirmé hier soir la découverte d'un corps sans vie à proximité des entrepôts du port. La victime, un homme d'une quarantaine d'années, n'a pas encore été formellement identifiée. Une enquête a été ouverte.",
    rot: 1.4
  });
  const m1 = addItemTo(0, 'map', {
    address: 'Vieux-Port, Marseille, France', zoom: 14, rot: 2.1
  });
  boards[0].threads.push({ id: rid(), from: n1.id, to: a1.id, color: '#c0392b' });
  boards[0].threads.push({ id: rid(), from: a1.id, to: m1.id, color: '#2c6fbb' });

  // Tableau 2 : les suspects
  const p1 = addItemTo(1, 'note', {
    text: "SUSPECT n°1\nLe majordome.\nTrop calme.", rot: -2.5
  });
  const p2 = addItemTo(1, 'note', {
    text: "SUSPECT n°2\nLa veuve.\nHérite de tout.", rot: 1.8
  });
  const a2 = addItemTo(1, 'article', {
    kicker: 'LA GAZETTE',
    headline: 'LE TÉMOIN A DISPARU',
    body: "Le principal témoin du vol de la bijouterie n'a plus donné signe de vie depuis mardi. Sa logeuse affirme l'avoir vu partir en hâte avec une valise. La police lance un appel à témoins.",
    rot: -1.2
  });
  boards[1].threads.push({ id: rid(), from: p1.id, to: a2.id, color: '#c9a227' });
  boards[1].threads.push({ id: rid(), from: p2.id, to: a2.id, color: '#8e44ad' });

  // Tableau 3 : vide (prêt pour la suite)
  // (rien)

  updateOverlaysFor(views[0]);
  updateOverlaysFor(views[1]);
  updateAllMiniatures();
}

/* ============================================================
   INITIALISATION
   ============================================================ */
updateSlotStates();
updateMiniSelection();
updateNavArrows();
renderAll();
window.addEventListener('resize', () => {
  for (let i = 0; i < 3; i++) updateOverlaysFor(views[i]);
});
if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(() => {
    for (let i = 0; i < 3; i++) updateOverlaysFor(views[i]);
  }).observe(stage);
}
setTimeout(seed, 80);

})();
</script>
