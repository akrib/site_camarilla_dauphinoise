---
layout: null
title: "Génerateur de challenge"
permalink: /utils/challenge
---

<title>Générateur de challenge de la camarilla dauphinoise</title>
<link rel="stylesheet" href="{{ '/assets/css/challenge.css' | relative_url }}">
<body>
<div class="grain"></div>
<div class="vignette"></div>

<div class="app">

  <header class="hero">
    <h1>Générateur de challenge<br>de la <span class="accent">camarilla dauphinoise</span></h1>
  </header>

  <!-- ============ CHALLENGES DEMANDÉS PAR LES CONTEURS (membres connectés) ============ -->
  <section id="cam-defis" class="panel cam-defis" hidden></section>

  <!-- ============ CONTRÔLES ============ -->
  <section class="panel">
    <div class="panelHead">
      <h2>Commandes</h2>
      <span class="hint"></span>
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
      <span class="hint">Cumul des challenges résolues</span>
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

  <!-- ============ PROPOSER UN CHALLENGE (conteurs) ============ -->
  <section id="cam-defis-conteur" class="panel cam-defis" hidden></section>

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

<script src="{{ '/assets/js/camarilla/outils/challenge.js' | relative_url }}"></script>
<script type="module" src="{{ '/assets/js/camarilla/pages/challenge-en-ligne.js' | relative_url }}"></script>
</body>
</html>
