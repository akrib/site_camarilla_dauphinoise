---
title: "Gestion des Influences"
layout: single
permalink: /influences/
author_profile: false
toc: false
---

<div id="influences-app">

<style>
#influences-app {
  --ink: #e9e2d3;
  --ink-dim: #a89f8f;
  --bg-deep: #14100f;
  --bg-panel: #1c1613;
  --line: #362c26;
  --gotha: #b08d57;
  --gotha-dim: #6e5836;
  --pegre: #7a1f2b;
  --pegre-dim: #4a1219;
  --ok: #6f8f6a;
  --warn: #c98a3a;
  font-family: 'Source Serif Pro', Georgia, 'Times New Roman', serif;
  background: var(--bg-deep);
  color: var(--ink);
  padding: 2.5rem 2rem;
  border-radius: 4px;
  line-height: 1.55;
}
#influences-app * { box-sizing: border-box; }
#influences-app h2, #influences-app h3 {
  font-family: 'Playfair Display', Georgia, serif;
  font-weight: 600;
  letter-spacing: .02em;
}
#influences-app h2 {
  font-size: 1.5rem;
  margin: 0 0 .35rem;
  color: var(--ink);
  border-bottom: 1px solid var(--line);
  padding-bottom: .6rem;
}
#influences-app .subtitle {
  color: var(--ink-dim);
  font-size: .88rem;
  font-style: italic;
  margin: 0 0 1.4rem;
}
#influences-app section {
  background: var(--bg-panel);
  border: 1px solid var(--line);
  border-radius: 3px;
  padding: 1.5rem 1.6rem;
  margin-bottom: 1.6rem;
}
#influences-app label {
  display: block;
  font-size: .78rem;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--ink-dim);
  margin: .9rem 0 .3rem;
}
#influences-app input[type=text],
#influences-app input[type=number],
#influences-app input[type=password],
#influences-app select,
#influences-app textarea {
  width: 100%;
  background: var(--bg-deep);
  border: 1px solid var(--line);
  color: var(--ink);
  padding: .55rem .7rem;
  border-radius: 2px;
  font-family: 'IBM Plex Mono', 'Courier New', monospace;
  font-size: .92rem;
}
#influences-app textarea { min-height: 4.5rem; resize: vertical; }
#influences-app .row { display: flex; gap: 1.2rem; flex-wrap: wrap; }
#influences-app .row > div { flex: 1; min-width: 220px; }
#influences-app .split {
  display: grid;
  grid-template-columns: 1fr 2px 1fr;
  gap: 1.4rem;
  align-items: start;
}
#influences-app .divider {
  background: linear-gradient(to bottom, transparent, var(--line) 15%, var(--line) 85%, transparent);
  width: 2px;
  min-height: 100%;
}
#influences-app .col-gotha { border-left: 3px solid var(--gotha); padding-left: 1rem; }
#influences-app .col-pegre { border-left: 3px solid var(--pegre); padding-left: 1rem; }
#influences-app .col-gotha h3 { color: var(--gotha); font-size: 1.05rem; margin-bottom: .2rem;}
#influences-app .col-pegre h3 { color: var(--pegre); font-size: 1.05rem; margin-bottom: .2rem;}
#influences-app .spec-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: .3rem .8rem;
  margin-top: .4rem;
}
#influences-app .spec-item {
  display: flex; align-items: center; gap: .4rem;
  font-size: .85rem; color: var(--ink-dim);
}
#influences-app .spec-item input { width: auto; }
#influences-app .spec-item.active { color: var(--ink); }
#influences-app .spec-count {
  font-family: 'IBM Plex Mono', monospace;
  font-size: .75rem;
  margin-top: .3rem;
}
#influences-app .spec-count.over { color: var(--pegre); }
#influences-app button {
  font-family: 'IBM Plex Mono', monospace;
  background: transparent;
  border: 1px solid var(--ink-dim);
  color: var(--ink);
  padding: .6rem 1.1rem;
  border-radius: 2px;
  cursor: pointer;
  font-size: .82rem;
  letter-spacing: .04em;
  text-transform: uppercase;
  margin-top: 1rem;
  margin-right: .6rem;
  transition: border-color .15s, color .15s;
}
#influences-app button:hover { border-color: var(--ink); }
#influences-app button.primary { border-color: var(--gotha); color: var(--gotha); }
#influences-app button.primary:hover { background: var(--gotha); color: var(--bg-deep); }
#influences-app button.primary.pegre { border-color: var(--pegre); color: var(--pegre); }
#influences-app button.primary.pegre:hover { background: var(--pegre); color: var(--bg-deep); }
#influences-app .status-msg { font-size: .82rem; margin-top: .6rem; min-height: 1.2em; }
#influences-app .status-msg.ok { color: var(--ok); }
#influences-app .status-msg.err { color: var(--pegre); }
#influences-app .cost-preview {
  font-family: 'IBM Plex Mono', monospace;
  font-size: .85rem;
  background: var(--bg-deep);
  border: 1px dashed var(--line);
  padding: .5rem .8rem;
  margin-top: .8rem;
  border-radius: 2px;
  color: var(--warn);
}
#influences-app .action-desc {
  font-size: .82rem;
  color: var(--ink-dim);
  font-style: italic;
  margin-top: .4rem;
  border-left: 2px solid var(--line);
  padding-left: .6rem;
}
#influences-app .history-item {
  border-bottom: 1px solid var(--line);
  padding: .8rem 0;
  font-size: .88rem;
}
#influences-app .history-item:last-child { border-bottom: none; }
#influences-app .history-meta {
  font-family: 'IBM Plex Mono', monospace;
  font-size: .72rem;
  color: var(--ink-dim);
  text-transform: uppercase;
  letter-spacing: .05em;
  margin-bottom: .3rem;
}
#influences-app .history-meta .tag {
  padding: .1rem .4rem;
  border-radius: 2px;
  margin-right: .4rem;
}
#influences-app .tag.gotha { background: var(--gotha-dim); color: var(--gotha); }
#influences-app .tag.pegre { background: var(--pegre-dim); color: var(--pegre); }
#influences-app .tag.attente { background: #3a3020; color: var(--warn); }
#influences-app .tag.resolu { background: #223522; color: var(--ok); }
#influences-app .history-result {
  margin-top: .5rem;
  padding: .6rem .7rem;
  background: var(--bg-deep);
  border-left: 2px solid var(--ok);
  font-size: .85rem;
}
#influences-app .history-result.empty {
  border-left-color: var(--line);
  color: var(--ink-dim);
  font-style: italic;
}
#influences-app .config-warning {
  border-left: 3px solid var(--warn);
  background: #2a2016;
  color: var(--warn);
  padding: .8rem 1rem;
  font-size: .85rem;
  margin-bottom: 1.4rem;
  border-radius: 2px;
}
</style>

<div id="config-warning" class="config-warning" style="display:none;">
  ⚠ L'URL du Web App Google Apps Script n'est pas configurée. Modifiez la constante
  <code>API_URL</code> en haut du script de cette page.
</div>

<!-- ============ IDENTIFICATION ============ -->
<section>
  <h2>Identification</h2>
  <p class="subtitle">Entrez le nom de votre personnage pour charger sa fiche, ou créez-en une nouvelle.</p>
  <div class="row">
    <div>
      <label for="in-nom">Nom du personnage</label>
      <input type="text" id="in-nom" placeholder="Ex : Sariah de Clermont">
    </div>
    <div>
      <label for="in-code">Code joueur (protection légère)</label>
      <input type="password" id="in-code" placeholder="Laissez vide si nouvelle fiche">
    </div>
  </div>
  <button id="btn-charger">Charger la fiche</button>
  <div id="msg-identification" class="status-msg"></div>
</section>

<!-- ============ FICHE D'INFLUENCE ============ -->
<section>
  <h2>Fiche d'Influence</h2>
  <p class="subtitle">Niveau, spécialisations (max = niveau) et district, pour chaque catégorie.</p>

  <div class="row">
    <div>
      <label for="in-joueur">Joueur</label>
      <input type="text" id="in-joueur" placeholder="Votre nom">
    </div>
    <div>
      <label for="in-district">District</label>
      <input type="text" id="in-district" placeholder="Zone gérée par une association (ex : Melun)">
    </div>
  </div>

  <div class="split">
    <div class="col-gotha">
      <h3>Gotha</h3>
      <label for="gotha-niveau">Niveau (1–5)</label>
      <input type="number" id="gotha-niveau" min="0" max="5" value="0">
      <label>Spécialisations Gotha</label>
      <div class="spec-grid" id="gotha-specs"></div>
      <div class="spec-count" id="gotha-spec-count"></div>
    </div>
    <div class="divider"></div>
    <div class="col-pegre">
      <h3>Pègre</h3>
      <label for="pegre-niveau">Niveau (1–5)</label>
      <input type="number" id="pegre-niveau" min="0" max="5" value="0">
      <label>Spécialisations Pègre</label>
      <div class="spec-grid" id="pegre-specs"></div>
      <div class="spec-count" id="pegre-spec-count"></div>
    </div>
  </div>

  <button id="btn-enregistrer-fiche" class="primary">Enregistrer la fiche</button>
  <div id="msg-fiche" class="status-msg"></div>
</section>

<!-- ============ ACTION CIBLÉE ============ -->
<section>
  <h2>Nouvelle action ciblée</h2>
  <p class="subtitle">Attaque, Défense, Obstruction ou Soutien — affecte des Influences (la vôtre ou celle d'autrui).</p>

  <div class="row">
    <div>
      <label for="cible-mois">Mois</label>
      <input type="text" id="cible-mois" placeholder="AAAA-MM">
    </div>
    <div>
      <label for="cible-categorie">Catégorie source</label>
      <select id="cible-categorie">
        <option value="Gotha">Gotha</option>
        <option value="Pègre">Pègre</option>
      </select>
    </div>
    <div>
      <label for="cible-type">Type d'action</label>
      <select id="cible-type">
        <option value="Attaque">Attaque</option>
        <option value="Défense">Défense</option>
        <option value="Obstruction">Obstruction</option>
        <option value="Soutien">Soutien</option>
      </select>
    </div>
  </div>

  <div class="row" id="cible-attaque-fields">
    <div>
      <label for="cible-cible">Personnage / Influence visé(e)</label>
      <input type="text" id="cible-cible" placeholder="Nom de la cible">
    </div>
    <div>
      <label for="cible-categorie-visee">Catégorie de la cible</label>
      <select id="cible-categorie-visee">
        <option value="Gotha">Gotha</option>
        <option value="Pègre">Pègre</option>
      </select>
    </div>
    <div>
      <label for="cible-points">Points visés (niveaux à retirer / ajouter)</label>
      <input type="number" id="cible-points" min="1" value="1">
    </div>
  </div>

  <div class="cost-preview" id="cible-cost-preview"></div>

  <label for="cible-details">Détails / justification (ce que vous avez observé, comment vous agissez)</label>
  <textarea id="cible-details"></textarea>

  <button id="btn-envoyer-ciblee" class="primary">Envoyer l'action ciblée</button>
  <div id="msg-ciblee" class="status-msg"></div>
</section>

<!-- ============ ACTION GLOBALE ============ -->
<section>
  <h2>Nouvelle action globale</h2>
  <p class="subtitle">Coûte toujours 1 Action d'Influence ; le niveau requis dépend de la catégorie choisie.</p>

  <div class="row">
    <div>
      <label for="globale-mois">Mois</label>
      <input type="text" id="globale-mois" placeholder="AAAA-MM">
    </div>
    <div>
      <label for="globale-categorie">Catégorie</label>
      <select id="globale-categorie">
        <option value="Gotha">Gotha</option>
        <option value="Pègre">Pègre</option>
      </select>
    </div>
    <div>
      <label for="globale-action">Action</label>
      <select id="globale-action"></select>
    </div>
  </div>

  <div class="action-desc" id="globale-desc"></div>
  <div class="cost-preview" id="globale-cost-preview"></div>

  <label for="globale-details">Détails (à qui / quoi cela s'applique-t-il ?)</label>
  <textarea id="globale-details"></textarea>

  <button id="btn-envoyer-globale" class="primary">Envoyer l'action globale</button>
  <div id="msg-globale" class="status-msg"></div>
</section>

<!-- ============ HISTORIQUE ============ -->
<section>
  <h2>Historique &amp; résultats</h2>
  <p class="subtitle">Vos actions passées et les résultats renseignés par le conteur.</p>
  <button id="btn-rafraichir-historique">Rafraîchir</button>
  <div id="historique-liste"></div>
</section>

</div>

<script>
(function () {
  // ==========================================================
  // CONFIGURATION — remplacez par l'URL de votre déploiement
  // Google Apps Script (Déployer > Nouveau déploiement > App Web)
  // ==========================================================
  const API_URL = "REMPLACER_PAR_URL_DU_WEB_APP";

  const SPECIALITES = [
    'Bureaucratie', 'Crime', 'Education', 'Finances', 'Haute Société',
    'Industrie', 'Loi', 'Média', 'Occulte', 'Police', 'Politique',
    'Religion', 'Rue', 'Santé', 'Transport'
  ];

  const ACTIONS_GOTHA = [
    { niveau: 1, nom: "Un ami dans le besoin", desc: "Emprunter gratuitement des ressources (≈1000€ par niveau d'Influence Gotha)." },
    { niveau: 2, nom: "Potins et délit d'initié", desc: "Découvrir les usages récents (3 mois) de l'Influence Gotha liés à vos spécialisations." },
    { niveau: 3, nom: "Erreurs Administratives", desc: "Obtenir des faveurs légales onéreuses : paperasse, perquisition, arme enregistrée..." },
    { niveau: 4, nom: "Désamorcer les problèmes", desc: "Faire disparaître un problème embarrassant (témoins, articles, alibis, Bris de Mascarade)." },
    { niveau: 5, nom: "Pas de pique-assiettes", desc: "Sécuriser une zone (manoir / petit immeuble) 24h, obstruction niveau 5 incluse." },
    { niveau: 5, nom: "Tout a un prix", desc: "Faveur importante non nécessairement légale (évasion, drogues, arme illégale...)." },
    { niveau: 5, nom: "Collection privée", desc: "Accès temporaire à une œuvre rare (risque de perte = -2 niveaux pendant 2 mois)." },
    { niveau: 5, nom: "La débâcle d'une vedette", desc: "Organiser un incident à l'échelle de la ville, détourner l'attention." },
    { niveau: 5, nom: "Le pouvoir derrière le Trône", desc: "Effet significatif et à long terme sur la ville (élection, services d'urgence...)." },
    { niveau: 6, nom: "Influence Régionale", desc: "Étend les actions globales à une région entière (grand État / territoire / petit pays)." }
  ];

  const ACTIONS_PEGRE = [
    { niveau: 1, nom: "Course gratuite", desc: "Traverser n'importe quel quartier sans encombre, forces de l'ordre discrètes." },
    { niveau: 2, nom: "La rumeur", desc: "Découvrir les usages récents (3 mois) de l'Influence Pègre liés à vos spécialisations." },
    { niveau: 3, nom: "Faveurs illégales", desc: "Faveur importante non nécessairement légale (évasion, drogues, arme illégale...)." },
    { niveau: 4, nom: "Déballer son linge sale en public", desc: "Organiser un incident à l'échelle de la ville (guerre de gangs, incendies, assassinat PNJ rang ≤4...)." },
    { niveau: 5, nom: "État d'urgence", desc: "Sécuriser une zone (entrepôt / petit immeuble) 24h, obstruction niveau 5 incluse." },
    { niveau: 5, nom: "Tirer les ficelles", desc: "Faveurs légales onéreuses : votes, perquisitions, armes enregistrées, événements..." },
    { niveau: 5, nom: "Détourner le regard", desc: "Faire disparaître un problème embarrassant (témoins, articles, alibis, Bris de Mascarade)." },
    { niveau: 5, nom: "Ce dont tu t'empares est tien", desc: "Accès temporaire à une œuvre rare (risque : attention des autorités, pas de perte de niveau)." },
    { niveau: 5, nom: "Une offre que vous ne pouvez refuser", desc: "Effet significatif et à long terme (légalité, scandales, émeutes, délocalisations...)." },
    { niveau: 6, nom: "Influence Régionale", desc: "Étend les actions globales à une région entière (grand État / territoire / petit pays)." }
  ];

  // ---------- Références DOM ----------
  const $ = (id) => document.getElementById(id);
  const nomInput = $('in-nom'), codeInput = $('in-code');

  if (API_URL.indexOf('REMPLACER') !== -1) {
    $('config-warning').style.display = 'block';
  }

  // ---------- Grilles de spécialisations ----------
  function buildSpecGrid(containerId, prefix) {
    const el = $(containerId);
    SPECIALITES.forEach((spec) => {
      const wrap = document.createElement('label');
      wrap.className = 'spec-item';
      wrap.innerHTML = `<input type="checkbox" value="${spec}" data-prefix="${prefix}"> ${spec}`;
      el.appendChild(wrap);
    });
  }
  buildSpecGrid('gotha-specs', 'gotha');
  buildSpecGrid('pegre-specs', 'pegre');

  function updateSpecCount(prefix) {
    const niveau = parseInt($(`${prefix}-niveau`).value || '0', 10);
    const checked = document.querySelectorAll(`#${prefix}-specs input:checked`);
    const countEl = $(`${prefix}-spec-count`);
    countEl.textContent = `${checked.length} / ${niveau} spécialisation(s) sélectionnée(s)`;
    countEl.classList.toggle('over', checked.length > niveau);
    checked.forEach(c => c.closest('.spec-item').classList.add('active'));
    document.querySelectorAll(`#${prefix}-specs input:not(:checked)`).forEach(c => c.closest('.spec-item').classList.remove('active'));
    // Empêche de cocher au-delà du niveau
    document.querySelectorAll(`#${prefix}-specs input`).forEach((cb) => {
      cb.disabled = !cb.checked && checked.length >= niveau;
    });
  }
  ['gotha', 'pegre'].forEach((prefix) => {
    $(`${prefix}-niveau`).addEventListener('input', () => updateSpecCount(prefix));
    $(`${prefix}-specs`).addEventListener('change', () => updateSpecCount(prefix));
    updateSpecCount(prefix);
  });

  function getChecked(prefix) {
    return Array.from(document.querySelectorAll(`#${prefix}-specs input:checked`)).map(c => c.value);
  }
  function setChecked(prefix, values) {
    const set = new Set((values || []).map(v => v.trim()));
    document.querySelectorAll(`#${prefix}-specs input`).forEach((cb) => {
      cb.checked = set.has(cb.value);
    });
    updateSpecCount(prefix);
  }

  // ---------- Appels réseau ----------
  function apiGet(params) {
    const url = `${API_URL}?${new URLSearchParams(params).toString()}`;
    return fetch(url).then(r => r.json());
  }
  function apiPost(body) {
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // évite le preflight CORS
      body: JSON.stringify(body)
    }).then(r => r.json());
  }
  function setMsg(id, text, ok) {
    const el = $(id);
    el.textContent = text;
    el.className = 'status-msg ' + (ok ? 'ok' : 'err');
  }

  // ---------- Charger la fiche ----------
  $('btn-charger').addEventListener('click', () => {
    const nom = nomInput.value.trim();
    if (!nom) { setMsg('msg-identification', 'Entrez un nom de personnage.', false); return; }
    setMsg('msg-identification', 'Chargement…', true);
    apiGet({ action: 'fiche', nom }).then((res) => {
      if (!res.ok) { setMsg('msg-identification', res.error || 'Erreur.', false); return; }
      if (!res.fiche) {
        setMsg('msg-identification', 'Aucune fiche existante — vous pouvez en créer une.', true);
        return;
      }
      const f = res.fiche;
      $('in-joueur').value = f.Joueur || '';
      $('in-district').value = f.District || '';
      $('gotha-niveau').value = f.NiveauGotha || 0;
      $('pegre-niveau').value = f.NiveauPegre || 0;
      setChecked('gotha', String(f.SpecialitesGotha || '').split(',').map(s => s.trim()).filter(Boolean));
      setChecked('pegre', String(f.SpecialitesPegre || '').split(',').map(s => s.trim()).filter(Boolean));
      setMsg('msg-identification', 'Fiche chargée.', true);
      chargerHistorique();
    }).catch(err => setMsg('msg-identification', 'Erreur réseau : ' + err, false));
  });

  // ---------- Enregistrer la fiche ----------
  $('btn-enregistrer-fiche').addEventListener('click', () => {
    const nom = nomInput.value.trim();
    if (!nom) { setMsg('msg-fiche', 'Entrez un nom de personnage dans la section Identification.', false); return; }
    const gothaNiveau = parseInt($('gotha-niveau').value || '0', 10);
    const pegreNiveau = parseInt($('pegre-niveau').value || '0', 10);
    const gothaSpecs = getChecked('gotha');
    const pegreSpecs = getChecked('pegre');
    if (gothaSpecs.length > gothaNiveau || pegreSpecs.length > pegreNiveau) {
      setMsg('msg-fiche', 'Trop de spécialisations pour le niveau indiqué.', false);
      return;
    }
    setMsg('msg-fiche', 'Enregistrement…', true);
    apiPost({
      action: 'enregistrerFiche',
      nom, joueur: $('in-joueur').value.trim(), codeJoueur: codeInput.value,
      district: $('in-district').value.trim(),
      niveauGotha: gothaNiveau, specialitesGotha: gothaSpecs,
      niveauPegre: pegreNiveau, specialitesPegre: pegreSpecs
    }).then((res) => {
      if (!res.ok) { setMsg('msg-fiche', res.error || 'Erreur.', false); return; }
      setMsg('msg-fiche', 'Fiche enregistrée.', true);
    }).catch(err => setMsg('msg-fiche', 'Erreur réseau : ' + err, false));
  });

  // ---------- Action ciblée : coût dynamique ----------
  function updateCibleCost() {
    const type = $('cible-type').value;
    const preview = $('cible-cost-preview');
    $('cible-attaque-fields').style.display = (type === 'Défense' || type === 'Obstruction') ? 'none' : 'flex';
    const points = parseInt($('cible-points').value || '1', 10);
    const catSource = $('cible-categorie').value;
    const catCible = $('cible-categorie-visee').value;

    if (type === 'Attaque') {
      const cout = (catSource === catCible ? 2 : 3) * points;
      preview.textContent = `Coût estimé : ${cout} Action(s) d'Influence (${catSource === catCible ? '2' : '3'} par point, catégorie ${catSource === catCible ? 'identique' : 'opposée'}).`;
    } else if (type === 'Défense') {
      preview.textContent = `Coût : 1 Action = -1 niveau absorbé sur toute attaque de la catégorie ${catSource}, pour le mois entier.`;
    } else if (type === 'Obstruction') {
      preview.textContent = `Coût : chaque Action dépensée ajoute +1 au seuil à dépasser pour l'activité obstruée.`;
    } else if (type === 'Soutien') {
      preview.textContent = `Coût : nombre d'Actions = niveau actuel de la cible avant ce point de soutien (ex. 5→6 coûte 5 Actions). Pensez au malus de soutien hors-praxis (0 à -3) si applicable.`;
    }
  }
  ['cible-type', 'cible-categorie', 'cible-categorie-visee', 'cible-points'].forEach(id => {
    $(id).addEventListener('input', updateCibleCost);
    $(id).addEventListener('change', updateCibleCost);
  });
  updateCibleCost();

  $('btn-envoyer-ciblee').addEventListener('click', () => {
    const nom = nomInput.value.trim();
    if (!nom) { setMsg('msg-ciblee', 'Chargez ou créez d\'abord votre fiche.', false); return; }
    const type = $('cible-type').value;
    setMsg('msg-ciblee', 'Envoi…', true);
    apiPost({
      action: 'nouvelleAction',
      nom, codeJoueur: codeInput.value,
      mois: $('cible-mois').value.trim(),
      categorie: $('cible-categorie').value,
      typeAction: 'Ciblée',
      sousType: type,
      cible: (type === 'Attaque' || type === 'Soutien') ? $('cible-cible').value.trim() : '',
      details: $('cible-details').value.trim(),
      actionsDepensees: (type === 'Attaque')
        ? ($('cible-categorie').value === $('cible-categorie-visee').value ? 2 : 3) * parseInt($('cible-points').value || '1', 10)
        : parseInt($('cible-points').value || '1', 10)
    }).then((res) => {
      if (!res.ok) { setMsg('msg-ciblee', res.error || 'Erreur.', false); return; }
      setMsg('msg-ciblee', 'Action ciblée envoyée au conteur.', true);
      chargerHistorique();
    }).catch(err => setMsg('msg-ciblee', 'Erreur réseau : ' + err, false));
  });

  // ---------- Action globale ----------
  function buildGlobaleOptions() {
    const cat = $('globale-categorie').value;
    const list = cat === 'Gotha' ? ACTIONS_GOTHA : ACTIONS_PEGRE;
    const select = $('globale-action');
    select.innerHTML = '';
    list.forEach((a, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `Niveau ${a.niveau} — ${a.nom}`;
      select.appendChild(opt);
    });
    updateGlobaleDesc();
  }
  function updateGlobaleDesc() {
    const cat = $('globale-categorie').value;
    const list = cat === 'Gotha' ? ACTIONS_GOTHA : ACTIONS_PEGRE;
    const a = list[parseInt($('globale-action').value || '0', 10)];
    if (!a) return;
    $('globale-desc').textContent = a.desc;
    const prefix = cat === 'Gotha' ? 'gotha' : 'pegre';
    const niveauActuel = parseInt($(`${prefix}-niveau`).value || '0', 10);
    const suffisant = niveauActuel >= a.niveau;
    $('globale-cost-preview').textContent = suffisant
      ? `Coût : 1 Action d'Influence. Votre niveau ${cat} (${niveauActuel}) suffit (requis : ${a.niveau}).`
      : `Coût : 1 Action d'Influence — ⚠ votre niveau ${cat} (${niveauActuel}) est inférieur au niveau requis (${a.niveau}), sauf soutien temporaire.`;
  }
  $('globale-categorie').addEventListener('change', buildGlobaleOptions);
  $('globale-action').addEventListener('change', updateGlobaleDesc);
  buildGlobaleOptions();

  $('btn-envoyer-globale').addEventListener('click', () => {
    const nom = nomInput.value.trim();
    if (!nom) { setMsg('msg-globale', 'Chargez ou créez d\'abord votre fiche.', false); return; }
    const cat = $('globale-categorie').value;
    const list = cat === 'Gotha' ? ACTIONS_GOTHA : ACTIONS_PEGRE;
    const a = list[parseInt($('globale-action').value || '0', 10)];
    setMsg('msg-globale', 'Envoi…', true);
    apiPost({
      action: 'nouvelleAction',
      nom, codeJoueur: codeInput.value,
      mois: $('globale-mois').value.trim(),
      categorie: cat,
      typeAction: 'Globale',
      sousType: `Niveau ${a.niveau} — ${a.nom}`,
      cible: '',
      details: $('globale-details').value.trim(),
      actionsDepensees: 1
    }).then((res) => {
      if (!res.ok) { setMsg('msg-globale', res.error || 'Erreur.', false); return; }
      setMsg('msg-globale', 'Action globale envoyée au conteur.', true);
      chargerHistorique();
    }).catch(err => setMsg('msg-globale', 'Erreur réseau : ' + err, false));
  });

  // ---------- Historique ----------
  function chargerHistorique() {
    const nom = nomInput.value.trim();
    const list = $('historique-liste');
    if (!nom) { list.innerHTML = '<p class="subtitle">Chargez une fiche pour voir l\'historique.</p>'; return; }
    list.innerHTML = '<p class="subtitle">Chargement…</p>';
    apiGet({ action: 'actions', nom }).then((res) => {
      if (!res.ok) { list.innerHTML = `<p class="status-msg err">${res.error}</p>`; return; }
      if (!res.actions.length) { list.innerHTML = '<p class="subtitle">Aucune action enregistrée pour le moment.</p>'; return; }
      list.innerHTML = '';
      res.actions.forEach((a) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        const catClass = a.Categorie === 'Gotha' ? 'gotha' : 'pegre';
        const statutClass = a.Statut === 'Résolu' ? 'resolu' : 'attente';
        div.innerHTML = `
          <div class="history-meta">
            <span class="tag ${catClass}">${a.Categorie}</span>
            <span class="tag ${statutClass}">${a.Statut}</span>
            ${a.Mois || ''} — ${a.TypeAction} : ${a.SousType}
          </div>
          <div>${a.Cible ? `<strong>Cible :</strong> ${a.Cible}<br>` : ''}${a.Details || ''}</div>
          <div class="history-result ${a.ResultatConteur ? '' : 'empty'}">
            ${a.ResultatConteur ? `<strong>Résultat du conteur :</strong> ${a.ResultatConteur}` : 'En attente du résultat du conteur…'}
          </div>
        `;
        list.appendChild(div);
      });
    }).catch(err => { list.innerHTML = `<p class="status-msg err">Erreur réseau : ${err}</p>`; });
  }
  $('btn-rafraichir-historique').addEventListener('click', chargerHistorique);

})();
</script>
</div>
