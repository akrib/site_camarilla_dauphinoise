---
layout: null
title: "Tableau d'Enquête"
permalink: /utils/tableau
---

<title>Tableau d'Enquête</title>
<link rel="stylesheet" href="{{ '/assets/css/tableau.css' | relative_url }}">
<body>

<div class="grain"></div>
<div class="vignette"></div>
<div id="cam-garde" class="cam-app cam-garde"><div class="cam-garde-boite"><p>Chargement…</p><noscript><p>Cette page nécessite JavaScript.</p></noscript></div></div>

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
    <button id="btnSave" title="Sauvegarder vos 3 tableaux en ligne (Ctrl+S). Chaque personnage a un seul tableau en ligne, remplacé à chaque sauvegarde.">☁ Sauvegarder</button>
    <button id="btnShare" title="Partager votre tableau avec d'autres personnages, en lecture ou en modification">⇄ Partager</button>
    <button id="btnCloud" title="Ouvrir le tableau de votre personnage ou un tableau partagé avec lui">☰ Ouvrir</button>
    <button id="btnPerso" title="Personnage incarné">☺ …</button>
    <span id="cloudStatus" class="cloud-status"></span>
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

<script src="{{ '/assets/js/camarilla/outils/tableau.js' | relative_url }}"></script>
<link rel="stylesheet" href="/assets/css/membres.css">
<script type="module" src="{{ '/assets/js/camarilla/pages/tableau-en-ligne.js' | relative_url }}"></script>
