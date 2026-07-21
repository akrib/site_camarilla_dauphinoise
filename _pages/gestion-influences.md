---
title: "Gestion des Influences"
layout: full-width
classes: wide
permalink: /influences/
author_profile: false
toc: false
---

<div id="influences-app">

<style>
#influences-app {
  --accent: #7a1f2b; --accent-dim: #a9455a; --gotha: #a3762a; --gotha-bg: #fbf3e4;
  --pegre: #7a1f2b; --pegre-bg: #f7e9ea; --line: #e2ddd6; --panel: #fafaf8;
  --ink: #2b2b2b; --ink-dim: #767267; --ok: #3f7a4d; --warn: #a3641a;
  color: var(--ink); line-height: 1.55;
}
#influences-app * { box-sizing: border-box; }
#influences-app h2 { font-size: 1.3rem; margin: 0 0 .3rem; color: var(--accent); }
#influences-app h3 { font-size: 1rem; margin: 0 0 .2rem; }
#influences-app .subtitle { color: var(--ink-dim); font-size: .85rem; font-style: italic; margin: 0 0 1.1rem; }

/* Barre d'identification */
#influences-app .id-bar {
  display: flex; gap: 1rem; flex-wrap: wrap; align-items: end;
  background: var(--panel); border: 1px solid var(--line); border-radius: 6px;
  padding: 1rem 1.2rem; margin-bottom: 1.4rem;
}
#influences-app .id-bar > div { flex: 1; min-width: 180px; }

/* Onglets de premier niveau */
#influences-app .tabs { display: flex; gap: .2rem; flex-wrap: wrap; border-bottom: 2px solid var(--line); margin-bottom: 1.5rem; }
#influences-app .tab-btn {
  background: transparent; border: none; border-bottom: 3px solid transparent;
  color: var(--ink-dim); padding: .65rem 1.1rem; cursor: pointer; font-size: .9rem;
  font-weight: 600; margin-bottom: -2px;
}
#influences-app .tab-btn:hover { color: var(--accent); }
#influences-app .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
#influences-app .tab-panel { display: none; }
#influences-app .tab-panel.active { display: block; }

/* Sous-onglets (uniquement dans l'onglet "Actions") */
#influences-app .subtabs { display: flex; gap: .4rem; flex-wrap: wrap; margin-bottom: 1.3rem; }
#influences-app .subtab-btn {
  background: var(--panel); border: 1px solid var(--line); color: var(--ink-dim);
  padding: .4rem .85rem; border-radius: 999px; cursor: pointer; font-size: .82rem; font-weight: 600;
}
#influences-app .subtab-btn:hover { border-color: var(--accent); color: var(--accent); }
#influences-app .subtab-btn.active { background: var(--accent); border-color: var(--accent); color: #fff; }
#influences-app .subtab-panel { display: none; }
#influences-app .subtab-panel.active { display: block; }

#influences-app .card { background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 1.4rem 1.6rem; }

#influences-app label { display: block; font-size: .78rem; text-transform: uppercase; letter-spacing: .04em; color: var(--ink-dim); margin: .8rem 0 .3rem; }
#influences-app input[type=text], #influences-app input[type=number], #influences-app input[type=password],
#influences-app input[type=date], #influences-app input[type=month], #influences-app select, #influences-app textarea {
  width: 100%; background: #fff; border: 1px solid #c9c3b8; color: var(--ink);
  padding: .5rem .65rem; border-radius: 4px; font-size: .92rem;
}
#influences-app textarea { min-height: 4rem; resize: vertical; }
#influences-app .row { display: flex; gap: 1.1rem; flex-wrap: wrap; }
#influences-app .row > div { flex: 1; min-width: 190px; }
#influences-app .split { display: grid; grid-template-columns: 1fr 1px 1fr; gap: 1.4rem; align-items: start; }
#influences-app .divider { background: var(--line); width: 1px; min-height: 100%; }
#influences-app .col-gotha { border-left: 3px solid var(--gotha); padding-left: 1rem; }
#influences-app .col-pegre { border-left: 3px solid var(--pegre); padding-left: 1rem; }
#influences-app .col-gotha h3 { color: var(--gotha); }
#influences-app .col-pegre h3 { color: var(--pegre); }
#influences-app .spec-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: .3rem .8rem; margin-top: .4rem; }
#influences-app .spec-item { display: flex; align-items: center; gap: .4rem; font-size: .84rem; color: var(--ink-dim); }
#influences-app .spec-item input { width: auto; }
#influences-app .spec-item.active { color: var(--ink); font-weight: 600; }
#influences-app .spec-count { font-size: .74rem; margin-top: .3rem; color: var(--ink-dim); }
#influences-app .spec-count.over { color: var(--pegre); font-weight: 600; }

#influences-app button {
  background: #fff; border: 1px solid var(--accent); color: var(--accent);
  padding: .55rem 1.1rem; border-radius: 4px; cursor: pointer; font-size: .85rem;
  font-weight: 600; margin-top: 1rem; transition: background .15s, color .15s;
}
#influences-app button:hover { background: var(--accent); color: #fff; }
#influences-app button.primary { background: var(--accent); color: #fff; }
#influences-app button.primary:hover { background: var(--accent-dim); border-color: var(--accent-dim); }

#influences-app .status-msg { font-size: .82rem; margin-top: .6rem; min-height: 1.2em; }
#influences-app .status-msg.ok { color: var(--ok); }
#influences-app .status-msg.err { color: var(--pegre); font-weight: 600; }
#influences-app .cost-preview { font-size: .85rem; background: #fff8ec; border: 1px dashed var(--warn); padding: .5rem .8rem; margin-top: .8rem; border-radius: 4px; color: var(--warn); }
#influences-app .action-desc { font-size: .82rem; color: var(--ink-dim); font-style: italic; margin-top: .4rem; border-left: 2px solid var(--line); padding-left: .6rem; }

#influences-app .history-item { border-bottom: 1px solid var(--line); padding: .8rem 0; font-size: .88rem; }
#influences-app .history-item:last-child { border-bottom: none; }
#influences-app .history-meta { font-size: .74rem; color: var(--ink-dim); text-transform: uppercase; letter-spacing: .04em; margin-bottom: .3rem; }
#influences-app .history-meta .tag { padding: .1rem .5rem; border-radius: 999px; margin-right: .4rem; font-weight: 600; }
#influences-app .tag.gotha { background: var(--gotha-bg); color: var(--gotha); }
#influences-app .tag.pegre { background: var(--pegre-bg); color: var(--pegre); }
#influences-app .tag.statut-attente { background: #f2ecdc; color: var(--warn); }
#influences-app .tag.statut-encours { background: #e4eef6; color: #2b5f8a; }
#influences-app .tag.statut-infos { background: #f2ecdc; color: var(--warn); }
#influences-app .tag.statut-complete { background: #e5f0e6; color: var(--ok); }
#influences-app .tag.statut-refuse { background: var(--pegre-bg); color: var(--pegre); }
#influences-app .tag.statut-annule { background: #ececec; color: var(--ink-dim); }
#influences-app .history-result { margin-top: .5rem; padding: .55rem .7rem; background: #fff; border-left: 3px solid var(--ok); font-size: .86rem; border-radius: 0 4px 4px 0; }
#influences-app .history-result.empty { border-left-color: var(--line); color: var(--ink-dim); font-style: italic; }
#influences-app .pagination { display: flex; align-items: center; gap: .9rem; margin-top: 1rem; font-size: .82rem; color: var(--ink-dim); }
#influences-app .pagination button {
  margin-top: 0; padding: .35rem .8rem; font-size: .78rem; font-weight: 600;
  background: #fff; border: 1px solid var(--accent); color: var(--accent);
}
#influences-app .pagination button:disabled { border-color: var(--line); color: var(--line); cursor: not-allowed; }
#influences-app .pagination button:disabled:hover { background: #fff; }

#influences-app .config-warning { border-left: 4px solid var(--warn); background: #fff8ec; color: var(--warn); padding: .8rem 1rem; font-size: .85rem; margin-bottom: 1.4rem; border-radius: 4px; }

#influences-app .recap-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; margin-top: .5rem; }
#influences-app .recap-card { background: #fff; border: 1px solid var(--line); border-radius: 6px; padding: 1rem 1.2rem; }
#influences-app .recap-card.gotha { border-top: 3px solid var(--gotha); }
#influences-app .recap-card.pegre { border-top: 3px solid var(--pegre); }
#influences-app .recap-card.gotha h4 { color: var(--gotha); margin: 0 0 .6rem; }
#influences-app .recap-card.pegre h4 { color: var(--pegre); margin: 0 0 .6rem; }
#influences-app .recap-line { display: flex; justify-content: space-between; font-size: .88rem; padding: .3rem 0; border-bottom: 1px dashed var(--line); }

@media (max-width: 700px) {
  #influences-app .split, #influences-app .recap-grid { grid-template-columns: 1fr; }
  #influences-app .divider { display: none; }
}
</style>

<div id="config-warning" class="config-warning" style="display:none;">
  ⚠ L'URL du Web App Google Apps Script n'est pas configurée. Modifiez la constante <code>API_URL</code> en bas de cette page.
</div>

<div class="id-bar">
  <div>
    <label for="in-nom">Personnage</label>
    <input type="text" id="in-nom" list="dl-personnages" placeholder="Ex : Amarok">
    <datalist id="dl-personnages"></datalist>
  </div>
  <div>
    <label for="in-code">Code joueur</label>
    <input type="password" id="in-code" placeholder="Laissez vide si nouvelle fiche">
  </div>
  <div><button id="btn-charger" class="primary">Charger la fiche</button></div>
</div>
<div id="msg-identification" class="status-msg"></div>

<div class="tabs">
  <button class="tab-btn active" data-tab="fiche">Fiche Personnage</button>
  <button class="tab-btn" data-tab="actions">Actions</button>
  <button class="tab-btn" data-tab="recap">Récap du Mois</button>
  <button class="tab-btn" data-tab="resultats">Résultats des Influences</button>
  <button class="tab-btn" data-tab="raisons">Raisons Sociales</button>
  <button class="tab-btn" data-tab="tickets">Tickets</button>
</div>

<!-- ============ FICHE PERSONNAGE ============ -->
<div class="tab-panel active" data-tab="fiche">
  <div class="card">
    <h2>Fiche Personnage</h2>
    <div class="row">
      <div><label for="fp-joueur">Joueur</label><input type="text" id="fp-joueur"></div>
      <div><label for="fp-ville">Ville</label><select id="fp-ville"></select></div>
      <div><label for="fp-secte">Secte</label><select id="fp-secte"></select></div>
    </div>
    <div class="row">
      <div><label for="fp-clan">Clan</label><select id="fp-clan"></select></div>
      <div><label for="fp-rang">Rang</label><select id="fp-rang"></select></div>
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
  </div>
</div>

<!-- ============ ACTIONS (avec sous-onglets) ============ -->
<div class="tab-panel" data-tab="actions">
  <div class="subtabs">
    <button class="subtab-btn active" data-subtab="globale">Action Globale</button>
    <button class="subtab-btn" data-subtab="ciblee">Action Ciblée</button>
    <button class="subtab-btn" data-subtab="soutien">Soutien</button>
    <button class="subtab-btn" data-subtab="aip">AIP</button>
  </div>

  <!-- ---- Action Globale ---- -->
  <div class="subtab-panel active card" data-subtab="globale">
    <h2>Nouvelle Action Globale</h2>
    <p class="subtitle">Coûte 1 Action d'Influence. Le niveau requis dépend de la catégorie choisie.</p>
    <div class="row">
      <div><label for="glob-date">Date</label><input type="date" id="glob-date"></div>
      <div><label for="glob-ville">Ville</label><select id="glob-ville"></select></div>
      <div><label for="glob-zone">Zone (district)</label><select id="glob-zone"></select></div>
    </div>
    <div class="row">
      <div><label for="glob-categorie">Catégorie</label><select id="glob-categorie"><option>Influence Gotha</option><option>Influence Pègre</option></select></div>
      <div><label for="glob-spec">Spécialisation</label><select id="glob-spec"></select></div>
    </div>
    <label for="glob-raison">Raison sociale (parmi les vôtres) *</label>
    <select id="glob-raison" required></select>
    <p class="subtitle" style="margin:.3rem 0 0;">Aucune ne convient ? Ajoutez-en une dans l'onglet "Raisons Sociales".</p>
    <label for="glob-action">Action</label>
    <select id="glob-action"></select>
    <div class="action-desc" id="glob-desc"></div>
    <div class="cost-preview" id="glob-cost"></div>
    <label for="glob-points">Points d'action</label>
    <select id="glob-points"></select>
    <label for="glob-descriptif">Descriptif joueur *</label>
    <textarea id="glob-descriptif" required></textarea>
    <button id="btn-envoyer-globale" class="primary">Envoyer</button>
    <div id="msg-globale" class="status-msg"></div>
  </div>

  <!-- ---- Action Ciblée ---- -->
  <div class="subtab-panel card" data-subtab="ciblee">
    <h2>Nouvelle Action Ciblée</h2>
    <p class="subtitle">Attaque, Défense ou Obstruction.</p>
    <div class="row">
      <div><label for="cib-date">Date</label><input type="date" id="cib-date"></div>
      <div><label for="cib-ville">Ville</label><select id="cib-ville"></select></div>
      <div><label for="cib-zone">Zone (district)</label><select id="cib-zone"></select></div>
    </div>
    <div class="row">
      <div><label for="cib-categorie">Catégorie (source)</label><select id="cib-categorie"><option>Influence Gotha</option><option>Influence Pègre</option></select></div>
      <div><label for="cib-action">Action</label><select id="cib-action"><option>Attaque</option><option>Défense</option><option>Obstruction</option></select></div>
    </div>
    <div class="row">
      <div><label for="cib-raison">Raison sociale (parmi les vôtres) *</label><select id="cib-raison" required></select></div>
      <div><label for="cib-categorie-cible">Catégorie de la cible</label><select id="cib-categorie-cible"><option>Influence Gotha</option><option>Influence Pègre</option></select></div>
      <div><label for="cib-points">Points visés</label><select id="cib-points"></select></div>
    </div>
    <label for="cib-cible">Cible *</label>
    <input type="text" id="cib-cible" required placeholder="Nom du personnage ou de l'Influence visée (à saisir librement)">
    <div class="cost-preview" id="cib-cost"></div>
    <label for="cib-descriptif">Descriptif joueur *</label>
    <textarea id="cib-descriptif" required></textarea>
    <button id="btn-envoyer-ciblee" class="primary">Envoyer</button>
    <div id="msg-ciblee" class="status-msg"></div>
  </div>

  <!-- ---- Soutien ---- -->
  <div class="subtab-panel card" data-subtab="soutien">
    <h2>Nouveau Soutien</h2>
    <p class="subtitle">Prêtez vos Actions d'Influence pour augmenter temporairement le niveau d'un autre personnage.</p>
    <div class="row">
      <div><label for="sou-date">Date</label><input type="date" id="sou-date"></div>
      <div><label for="sou-ville">Ville</label><select id="sou-ville"></select></div>
      <div><label for="sou-zone">Zone (district)</label><select id="sou-zone"></select></div>
    </div>
    <div class="row">
      <div><label for="sou-raison">Raison sociale (parmi les vôtres) *</label><select id="sou-raison" required></select></div>
      <div><label for="sou-categorie">Catégorie</label><select id="sou-categorie"><option>Influence Gotha</option><option>Influence Pègre</option></select></div>
      <div><label for="sou-niveau">Niveau de la cible avant ce point</label><select id="sou-niveau"></select></div>
    </div>
    <label for="sou-cible">Cible (personnage soutenu) *</label>
    <input type="text" id="sou-cible" required placeholder="Nom du personnage soutenu (à saisir librement)">
    <div class="row">
      <div><label for="sou-malus">Malus hors-praxis (0 à -3)</label><input type="number" id="sou-malus" min="-3" max="0" value="0"></div>
    </div>
    <div class="cost-preview" id="sou-cost"></div>
    <label for="sou-descriptif">Descriptif joueur *</label>
    <textarea id="sou-descriptif" required></textarea>
    <button id="btn-envoyer-soutien" class="primary">Envoyer</button>
    <div id="msg-soutien" class="status-msg"></div>
  </div>

  <!-- ---- AIP ---- -->
  <div class="subtab-panel card" data-subtab="aip">
    <h2>Nouvelle Action AIP</h2>
    <p class="subtitle">Enquête, Patrouille, Mentorat, Chasse, Troupeau, Informatique, Artisanat, Science, Dépense d'XP…</p>
    <div class="row">
      <div><label for="aip-date">Date</label><input type="date" id="aip-date"></div>
      <div><label for="aip-ville">Ville</label><select id="aip-ville"></select></div>
      <div><label for="aip-zone">Zone (district)</label><select id="aip-zone"></select></div>
    </div>
    <div class="row">
      <div>
        <label for="aip-categorie">Catégorie</label>
        <select id="aip-categorie">
          <option>AIP</option><option>AIP (Troupeau)</option><option>AIP (Informatique)</option>
          <option>AIP (Artisanat)</option><option>AIP (Science)</option><option>Dépense d'XP</option>
        </select>
      </div>
      <div><label for="aip-points">Points d'action</label><select id="aip-points"></select></div>
    </div>
    <label for="aip-raison">Raison sociale (parmi les vôtres) *</label>
    <select id="aip-raison" required></select>
    <label for="aip-action">Action</label>
    <select id="aip-action"></select>
    <label for="aip-descriptif">Descriptif joueur *</label>
    <textarea id="aip-descriptif" required></textarea>
    <button id="btn-envoyer-aip" class="primary">Envoyer</button>
    <div id="msg-aip" class="status-msg"></div>
  </div>
</div>

<!-- ============ RÉCAP DU MOIS ============ -->
<div class="tab-panel" data-tab="recap">
  <div class="card">
    <h2>Récap du Mois</h2>
    <div class="row">
      <div><label for="recap-mois">Mois</label><input type="month" id="recap-mois"></div>
      <div style="display:flex;align-items:end;"><button id="btn-recap">Actualiser</button></div>
    </div>
    <div id="recap-contenu" class="recap-grid"></div>
    <div id="msg-recap" class="status-msg"></div>
  </div>
</div>

<!-- ============ RÉSULTATS DES INFLUENCES ============ -->
<div class="tab-panel" data-tab="resultats">
  <div class="card">
    <h2>Résultats des Influences</h2>
    <p class="subtitle">Toutes vos actions et les réponses du conteur.</p>
    <button id="btn-rafraichir-historique">Rafraîchir</button>
    <div id="historique-liste"></div>
    <div id="historique-pagination" class="pagination"></div>
  </div>
</div>

<!-- ============ RAISONS SOCIALES ============ -->
<div class="tab-panel" data-tab="raisons">
  <div class="card">
    <h2>Raisons Sociales</h2>
    <p class="subtitle">Registre des cibles / organismes / PNJ liés à votre personnage, réutilisables dans les formulaires d'action. Chaque raison sociale utilisée dans une action est aussi ajoutée automatiquement ici.</p>
    <div class="row">
      <div><label for="rs-nom">Nom de la raison sociale *</label><input type="text" id="rs-nom" required placeholder="Ex : Agence France-Presse Isère"></div>
      <div><label for="rs-ville">Ville *</label><select id="rs-ville"></select></div>
      <div><label for="rs-zone">Zone (district) *</label><select id="rs-zone"></select></div>
    </div>
    <div class="row">
      <div><label for="rs-categorie">Catégorie *</label>
        <select id="rs-categorie">
          <option>Influence Gotha</option><option>Influence Pègre</option><option>AIP</option>
          <option>AIP (Troupeau)</option><option>AIP (Informatique)</option><option>AIP (Artisanat)</option>
          <option>AIP (Science)</option><option>Dépense d'XP</option>
        </select>
      </div>
    </div>
    <label for="rs-description">Description (optionnel)</label>
    <textarea id="rs-description" placeholder="Contexte, historique, comment le personnage y a accès..."></textarea>
    <button id="btn-envoyer-rs" class="primary">Ajouter au registre</button>
    <div id="msg-rs" class="status-msg"></div>

    <h3 style="margin-top:1.6rem;">Raisons sociales liées à ce personnage</h3>
    <button id="btn-rafraichir-rs">Rafraîchir</button>
    <div id="rs-liste"></div>
    <div id="rs-pagination" class="pagination"></div>
  </div>
</div>

<!-- ============ TICKETS (avec sous-onglets) ============ -->
<div class="tab-panel" data-tab="tickets">
  <div class="subtabs">
    <button class="subtab-btn active" data-subtab="nouveau-ticket">Nouveau Ticket</button>
    <button class="subtab-btn" data-subtab="mes-tickets">Mes Tickets</button>
  </div>

  <!-- ---- Nouveau Ticket ---- -->
  <div class="subtab-panel active card" data-subtab="nouveau-ticket">
    <h2>Nouveau Ticket</h2>
    <p class="subtitle">Demande adressée au conteur : modification de fiche, scène, contact avec un antagoniste, dépense d'XP, question de règles, signalement...</p>
    <label for="tk-categorie">Catégorie *</label>
    <select id="tk-categorie">
      <option>Modification de fiche</option>
      <option>Demande de scène</option>
      <option>Contact avec un antagoniste</option>
      <option>Mise à jour de fiche / Dépense d'XP</option>
      <option>Question de règles</option>
      <option>Signalement (Bris de Mascarade, comportement...)</option>
      <option>Demande d'objet / artefact</option>
      <option>Autre</option>
    </select>
    <label for="tk-sujet">Sujet *</label>
    <input type="text" id="tk-sujet" required placeholder="Ex : Scène avec Faustine">
    <label for="tk-description">Description *</label>
    <textarea id="tk-description" required placeholder="Détaillez votre demande le plus précisément possible."></textarea>
    <button id="btn-envoyer-ticket" class="primary">Envoyer le ticket</button>
    <div id="msg-ticket" class="status-msg"></div>
  </div>

  <!-- ---- Mes Tickets ---- -->
  <div class="subtab-panel card" data-subtab="mes-tickets">
    <h2>Mes Tickets</h2>
    <p class="subtitle">Vos demandes envoyées au conteur, leur statut et son commentaire.</p>
    <button id="btn-rafraichir-tickets">Rafraîchir</button>
    <div id="tickets-liste"></div>
    <div id="tickets-pagination" class="pagination"></div>
  </div>
</div>

</div>

<script>
(function () {
  // ==========================================================
  // CONFIGURATION — remplacez par l'URL /exec de votre déploiement
  // ==========================================================
  const API_URL = "https://script.google.com/macros/s/AKfycbzvQ9eGmFpoa-53YQwuCneMM6i9VA3vS2TAw1j8ImxYQpSZmL1Qaa2CZgGEfhCPf6J5xA/exec";

  const VILLES = ["Grenoble","Angers","Annecy","Bordeaux","Châteauroux","Evry","Lille","Lyon",
    "Melun","Montpellier","Orléans","Périgueux","Strasbourg","Ys","Autres"];
  const ZONES = Array.from({length:24}, (_,i)=>String(i+1)).concat(["Extérieur"]);
  const POINTS = [1,2,3,4,5];
  const SPECIALISATIONS = ["Bureaucratie","Crime","Éducation","Finance","Haute Société","Industrie",
    "Loi","Média","Occulte","Police","Politique","Religion","Rue","Santé","Transport"];
  const SECTES = ["Camarilla","Sabbat","Anarch","Indépendant"];
  const CLANS = ["Brujah","Gangrel","Malkavian","Nosferatu","Toreador","Tremere","Ventrue",
    "Assamite","Follower of Set","Giovanni","Lasombra","Ravnos","Tzimisce","Caitiff","Autre"];
  const RANGS = ["Nouveau-Né","Ancilla","Ancien","Méthuselah"];

  const ACTIONS_GOTHA_GLOB = [
    { nom: "Un ami dans le besoin (Gotha 1)", niveau: 1, desc: "Emprunter gratuitement des ressources (≈1000€ par niveau d'Influence Gotha)." },
    { nom: "Potins et délit d'initié (Gotha 2)", niveau: 2, desc: "Découvrir les usages récents (3 mois) de l'Influence Gotha liés à vos spécialisations." },
    { nom: "Erreurs administratives (Gotha 3)", niveau: 3, desc: "Faveurs légales onéreuses : paperasse, perquisition, arme enregistrée..." },
    { nom: "Désamorcer les problèmes (Gotha 4)", niveau: 4, desc: "Faire disparaître un problème embarrassant (témoins, articles, alibis, Bris de Mascarade)." },
    { nom: "Pas de pique-assiettes (Gotha 5)", niveau: 5, desc: "Sécuriser une zone (manoir / petit immeuble) 24h, obstruction niveau 5 incluse." },
    { nom: "Tout a un prix (Gotha 6)", niveau: 5, desc: "Faveur importante non nécessairement légale (évasion, drogues, arme illégale...)." },
    { nom: "Collection privée (Gotha 7)", niveau: 5, desc: "Accès temporaire à une œuvre rare (risque de perte = -2 niveaux pendant 2 mois)." },
    { nom: "La débâcle d'une vedette (Gotha 8)", niveau: 5, desc: "Organiser un incident à l'échelle de la ville, détourner l'attention." },
    { nom: "Le pouvoir derrière le Trône (Gotha 9)", niveau: 5, desc: "Effet significatif et à long terme sur la ville (élection, services d'urgence...)." },
    { nom: "Influence Régionale (Gotha 10)", niveau: 5, desc: "Étend les actions globales à une région entière." }
  ];
  const ACTIONS_PEGRE_GLOB = [
    { nom: "Course gratuite (Pègre 1)", niveau: 1, desc: "Traverser n'importe quel quartier sans encombre, forces de l'ordre discrètes." },
    { nom: "La rumeur (Pègre 2)", niveau: 2, desc: "Découvrir les usages récents (3 mois) de l'Influence Pègre liés à vos spécialisations." },
    { nom: "Faveurs illégales (Pègre 3)", niveau: 3, desc: "Faveur importante non nécessairement légale (évasion, drogues, arme illégale...)." },
    { nom: "Déballer son linge sale en public (Pègre 4)", niveau: 4, desc: "Organiser un incident à l'échelle de la ville (guerre de gangs, incendies...)." },
    { nom: "État d'urgence (Pègre 5)", niveau: 5, desc: "Sécuriser une zone (entrepôt / petit immeuble) 24h, obstruction niveau 5 incluse." },
    { nom: "Tirer les ficelles (Pègre 6)", niveau: 5, desc: "Faveurs légales onéreuses : votes, perquisitions, armes enregistrées, événements..." },
    { nom: "Détourner le regard (Pègre 7)", niveau: 5, desc: "Faire disparaître un problème embarrassant (témoins, articles, alibis, Bris de Mascarade)." },
    { nom: "Ce dont tu t'empares est tien (Pègre 8)", niveau: 5, desc: "Accès temporaire à une œuvre rare (risque : attention des autorités)." },
    { nom: "Une offre que vous ne pouvez refuser (Pègre 9)", niveau: 5, desc: "Effet significatif et à long terme (légalité, scandales, émeutes...)." },
    { nom: "Influence Régionale (Pègre 10)", niveau: 5, desc: "Étend les actions globales à une région entière." }
  ];
  const AIP_ACTIONS = {
    "AIP": ["Enquête","Patrouille","Mentorat (Apprendre)","Au delà de vos moyens","Spéciale","Chasse"],
    "AIP (Troupeau)": ["Se nourrir"],
    "AIP (Informatique)": ["AIP classique","Observer une AIP","Annuler une AIP"],
    "AIP (Artisanat)": ["Artisanat","Représentation"],
    "AIP (Science)": ["Science"],
    "Dépense d'XP": ["Dépense XP"]
  };

  const $ = (id) => document.getElementById(id);
  if (API_URL.indexOf('REMPLACER') !== -1) { $('config-warning').style.display = 'block'; }

  // ---------- Onglets de premier niveau ----------
  document.querySelectorAll('#influences-app > .tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#influences-app > .tabs .tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('#influences-app > .tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.querySelector(`#influences-app > .tab-panel[data-tab="${btn.dataset.tab}"]`).classList.add('active');
    });
  });

  // ---------- Sous-onglets (scopés à leur onglet parent : Actions, Tickets...) ----------
  document.querySelectorAll('.tab-panel').forEach(panel => {
    const subBtns = panel.querySelectorAll(':scope > .subtabs > .subtab-btn');
    subBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        subBtns.forEach(b => b.classList.remove('active'));
        panel.querySelectorAll(':scope > .subtab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        panel.querySelector(`:scope > .subtab-panel[data-subtab="${btn.dataset.subtab}"]`).classList.add('active');
      });
    });
  });

  function fillSelect(id, items, withEmpty) {
    const el = $(id); if (!el) return;
    el.innerHTML = (withEmpty ? '<option value=""></option>' : '') + items.map(i => `<option value="${i}">${i}</option>`).join('');
  }
  ['glob-ville','cib-ville','sou-ville','aip-ville','rs-ville'].forEach(id => fillSelect(id, VILLES));
  ['glob-zone','cib-zone','sou-zone','aip-zone','rs-zone'].forEach(id => fillSelect(id, ZONES));
  fillSelect('glob-points', POINTS); fillSelect('aip-points', POINTS);
  fillSelect('cib-points', POINTS); fillSelect('sou-niveau', [1,2,3,4,5,6,7,8,9]);
  fillSelect('glob-spec', SPECIALISATIONS);
  fillSelect('fp-ville', VILLES); fillSelect('fp-secte', SECTES); fillSelect('fp-clan', CLANS); fillSelect('fp-rang', RANGS);

  const today = new Date().toISOString().slice(0,10);
  ['glob-date','cib-date','sou-date','aip-date'].forEach(id => $(id).value = today);
  $('recap-mois').value = new Date().toISOString().slice(0,7);

  // ---------- Spécialisations ----------
  function buildSpecGrid(containerId) {
    const el = $(containerId);
    SPECIALISATIONS.forEach((spec) => {
      const wrap = document.createElement('label');
      wrap.className = 'spec-item';
      wrap.innerHTML = `<input type="checkbox" value="${spec}"> ${spec}`;
      el.appendChild(wrap);
    });
  }
  buildSpecGrid('gotha-specs'); buildSpecGrid('pegre-specs');
  function updateSpecCount(prefix) {
    const niveau = parseInt($(`${prefix}-niveau`).value || '0', 10);
    const checked = document.querySelectorAll(`#${prefix}-specs input:checked`);
    const countEl = $(`${prefix}-spec-count`);
    countEl.textContent = `${checked.length} / ${niveau} spécialisation(s)`;
    countEl.classList.toggle('over', checked.length > niveau);
    document.querySelectorAll(`#${prefix}-specs input`).forEach((cb) => {
      cb.closest('.spec-item').classList.toggle('active', cb.checked);
      cb.disabled = !cb.checked && checked.length >= niveau;
    });
  }
  ['gotha','pegre'].forEach((prefix) => {
    $(`${prefix}-niveau`).addEventListener('input', () => updateSpecCount(prefix));
    $(`${prefix}-specs`).addEventListener('change', () => updateSpecCount(prefix));
    updateSpecCount(prefix);
  });
  function getChecked(prefix) { return Array.from(document.querySelectorAll(`#${prefix}-specs input:checked`)).map(c => c.value); }
  function setChecked(prefix, values) {
    const set = new Set((values || []).map(v => v.trim()));
    document.querySelectorAll(`#${prefix}-specs input`).forEach(cb => cb.checked = set.has(cb.value));
    updateSpecCount(prefix);
  }

  // ---------- Réseau ----------
  function apiGet(params) { return fetch(`${API_URL}?${new URLSearchParams(params)}`).then(r => r.json()); }
  function apiPost(body) {
    return fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) }).then(r => r.json());
  }
  function setMsg(id, text, ok) { const el = $(id); el.textContent = text; el.className = 'status-msg ' + (ok ? 'ok' : 'err'); }

  // Affiche des boutons Précédent/Suivant si la liste dépasse une page (50 résultats).
  function renderPagination(containerId, state, onGoto) {
    const el = $(containerId);
    if (!el) return;
    if (!state || state.total <= state.pageSize) { el.innerHTML = ''; return; }
    const totalPages = Math.ceil(state.total / state.pageSize);
    el.innerHTML = `
      <button data-dir="prev" ${state.page <= 0 ? 'disabled' : ''}>← Précédent</button>
      <span>Page ${state.page + 1} / ${totalPages} (${state.total} résultats)</span>
      <button data-dir="next" ${!state.hasMore ? 'disabled' : ''}>Suivant →</button>
    `;
    const prevBtn = el.querySelector('[data-dir="prev"]');
    const nextBtn = el.querySelector('[data-dir="next"]');
    if (prevBtn) prevBtn.addEventListener('click', () => onGoto(state.page - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => onGoto(state.page + 1));
  }

  // Vérifie qu'un champ texte/textarea n'est pas vide ; retourne le label du premier manquant, ou null.
  function premierChampVideLabel(pairs) {
    for (const [id, label] of pairs) {
      if (!$(id).value.trim()) return label;
    }
    return null;
  }

  apiGet({ action: 'personnages' }).then(res => {
    if (!res.ok) return;
    $('dl-personnages').innerHTML = res.personnages.map(n => `<option value="${n}">`).join('');
  }).catch(() => {});

  // Remplit les 4 menus "Raison sociale" avec UNIQUEMENT les raisons sociales
  // liées au personnage chargé (jamais celles des autres joueurs).
  const SELECTS_RAISON_SOCIALE = ['glob-raison', 'cib-raison', 'sou-raison', 'aip-raison'];
  function remplirSelectsRaisonsSociales() {
    const nom = nomInput.value.trim();
    if (!nom) {
      SELECTS_RAISON_SOCIALE.forEach(id => { $(id).innerHTML = '<option value="">— Chargez d\'abord votre fiche —</option>'; });
      return;
    }
    apiGet({ action: 'raisonsSociales', nom }).then(res => {
      if (!res.ok) return;
      const options = res.raisonsSociales.length
        ? res.raisonsSociales.map(r => `<option value="${r['NOM']}">${r['NOM']}</option>`).join('')
        : '<option value="">— Aucune, créez-en une dans l\'onglet Raisons Sociales —</option>';
      SELECTS_RAISON_SOCIALE.forEach(id => { $(id).innerHTML = options; });
    }).catch(() => {});
  }

  // ---------- Identification / Fiche ----------
  const nomInput = $('in-nom'), codeInput = $('in-code');
  $('btn-charger').addEventListener('click', () => {
    const nom = nomInput.value.trim();
    if (!nom) { setMsg('msg-identification', 'Entrez un nom de personnage.', false); return; }
    setMsg('msg-identification', 'Chargement…', true);
    apiGet({ action: 'fiche', nom }).then((res) => {
      if (!res.ok) { setMsg('msg-identification', res.error, false); return; }
      if (!res.fiche) { setMsg('msg-identification', 'Aucune fiche existante — vous pouvez en créer une.', true); return; }
      const f = res.fiche;
      $('fp-joueur').value = f['JOUEUR'] || '';
      $('fp-ville').value = f['VILLE'] || '';
      $('fp-secte').value = f['SECTE'] || '';
      $('fp-clan').value = f['CLAN'] || '';
      $('fp-rang').value = f['RANG'] || '';
      $('gotha-niveau').value = f['NIVEAU GOTHA'] || 0;
      $('pegre-niveau').value = f['NIVEAU PEGRE'] || 0;
      setChecked('gotha', String(f['SPECIALISATIONS GOTHA'] || '').split(',').map(s=>s.trim()).filter(Boolean));
      setChecked('pegre', String(f['SPECIALISATIONS PEGRE'] || '').split(',').map(s=>s.trim()).filter(Boolean));
      setMsg('msg-identification', 'Fiche chargée.', true);
      chargerHistorique(); chargerRecap(); chargerRaisonsSociales(); chargerTickets(); remplirSelectsRaisonsSociales();
    }).catch(err => setMsg('msg-identification', 'Erreur réseau : ' + err, false));
  });

  $('btn-enregistrer-fiche').addEventListener('click', () => {
    const nom = nomInput.value.trim();
    if (!nom) { setMsg('msg-fiche', 'Entrez un nom de personnage en haut de page.', false); return; }
    const gothaNiveau = parseInt($('gotha-niveau').value || '0', 10);
    const pegreNiveau = parseInt($('pegre-niveau').value || '0', 10);
    const gothaSpecs = getChecked('gotha'), pegreSpecs = getChecked('pegre');
    if (gothaSpecs.length > gothaNiveau || pegreSpecs.length > pegreNiveau) {
      setMsg('msg-fiche', 'Trop de spécialisations pour le niveau indiqué.', false); return;
    }
    setMsg('msg-fiche', 'Enregistrement…', true);
    apiPost({
      action: 'enregistrerFiche', nom, joueur: $('fp-joueur').value.trim(), codeJoueur: codeInput.value,
      ville: $('fp-ville').value, secte: $('fp-secte').value, clan: $('fp-clan').value, rang: $('fp-rang').value,
      niveauGotha: gothaNiveau, specialitesGotha: gothaSpecs, niveauPegre: pegreNiveau, specialitesPegre: pegreSpecs
    }).then((res) => {
      if (!res.ok) { setMsg('msg-fiche', res.error, false); return; }
      setMsg('msg-fiche', 'Fiche enregistrée.', true);
    }).catch(err => setMsg('msg-fiche', 'Erreur réseau : ' + err, false));
  });

  // ---------- Action Globale ----------
  function buildGlobaleOptions() {
    const cat = $('glob-categorie').value;
    const list = cat === 'Influence Gotha' ? ACTIONS_GOTHA_GLOB : ACTIONS_PEGRE_GLOB;
    $('glob-action').innerHTML = list.map((a,i) => `<option value="${i}">${a.nom}</option>`).join('');
    updateGlobaleDesc();
  }
  function updateGlobaleDesc() {
    const cat = $('glob-categorie').value;
    const list = cat === 'Influence Gotha' ? ACTIONS_GOTHA_GLOB : ACTIONS_PEGRE_GLOB;
    const a = list[parseInt($('glob-action').value || '0', 10)];
    if (!a) return;
    $('glob-desc').textContent = a.desc;
    const niveauActuel = parseInt($(cat === 'Influence Gotha' ? 'gotha-niveau' : 'pegre-niveau').value || '0', 10);
    $('glob-cost').textContent = niveauActuel >= a.niveau
      ? `Coût : 1 Action d'Influence. Niveau requis ${a.niveau}, vous avez ${niveauActuel}.`
      : `Coût : 1 Action d'Influence — ⚠ niveau requis ${a.niveau}, vous n'avez que ${niveauActuel} (sauf soutien).`;
  }
  $('glob-categorie').addEventListener('change', buildGlobaleOptions);
  $('glob-action').addEventListener('change', updateGlobaleDesc);
  buildGlobaleOptions();

  $('btn-envoyer-globale').addEventListener('click', () => {
    const nom = nomInput.value.trim();
    if (!nom) { setMsg('msg-globale', "Chargez d'abord votre fiche.", false); return; }
    const manque = premierChampVideLabel([['glob-raison','Raison sociale'], ['glob-descriptif','Descriptif joueur']]);
    if (manque) { setMsg('msg-globale', `Champ obligatoire manquant : ${manque}.`, false); return; }
    const cat = $('glob-categorie').value;
    const list = cat === 'Influence Gotha' ? ACTIONS_GOTHA_GLOB : ACTIONS_PEGRE_GLOB;
    const a = list[parseInt($('glob-action').value || '0', 10)];
    setMsg('msg-globale', 'Envoi…', true);
    apiPost({
      action: 'nouvelleAction', nom, codeJoueur: codeInput.value, date: $('glob-date').value,
      ville: $('glob-ville').value, zone: $('glob-zone').value, categorie: cat,
      niveau: a.niveau, specialisation: $('glob-spec').value, raisonSociale: $('glob-raison').value.trim(),
      nomAction: a.nom, pointsAction: parseInt($('glob-points').value || '1', 10), descriptif: $('glob-descriptif').value.trim()
    }).then((res) => {
      if (!res.ok) { setMsg('msg-globale', res.error, false); return; }
      setMsg('msg-globale', 'Action globale envoyée.', true);
      chargerHistorique();
    }).catch(err => setMsg('msg-globale', 'Erreur réseau : ' + err, false));
  });

  // ---------- Action Ciblée ----------
  function updateCibleCost() {
    const type = $('cib-action').value;
    const points = parseInt($('cib-points').value || '1', 10);
    const catSource = $('cib-categorie').value, catCible = $('cib-categorie-cible').value;
    if (type === 'Attaque') {
      const cout = (catSource === catCible ? 2 : 3) * points;
      $('cib-cost').textContent = `Coût estimé : ${cout} Action(s) d'Influence (${catSource === catCible ? '2' : '3'} par point). Entrez ce total dans "Points visés" si vous voulez l'enregistrer comme coût final.`;
    } else if (type === 'Défense') {
      $('cib-cost').textContent = `Coût : ${points} Action(s) = -${points} niveau(x) absorbé(s) sur toute attaque de cette catégorie, pour le mois.`;
    } else {
      $('cib-cost').textContent = `Coût : ${points} Action(s) d'obstruction = seuil +${points} à surmonter pour l'activité visée.`;
    }
  }
  ['cib-action','cib-categorie','cib-categorie-cible','cib-points'].forEach(id => { $(id).addEventListener('input', updateCibleCost); $(id).addEventListener('change', updateCibleCost); });
  updateCibleCost();

  $('btn-envoyer-ciblee').addEventListener('click', () => {
    const nom = nomInput.value.trim();
    if (!nom) { setMsg('msg-ciblee', "Chargez d'abord votre fiche.", false); return; }
    const manque = premierChampVideLabel([['cib-raison','Raison sociale'], ['cib-cible','Cible'], ['cib-descriptif','Descriptif joueur']]);
    if (manque) { setMsg('msg-ciblee', `Champ obligatoire manquant : ${manque}.`, false); return; }
    setMsg('msg-ciblee', 'Envoi…', true);
    const cible = $('cib-cible').value.trim();
    apiPost({
      action: 'nouvelleAction', nom, codeJoueur: codeInput.value, date: $('cib-date').value,
      ville: $('cib-ville').value, zone: $('cib-zone').value, categorie: $('cib-categorie').value,
      nomAction: $('cib-action').value, raisonSociale: $('cib-raison').value.trim(),
      pointsAction: parseInt($('cib-points').value || '1', 10),
      descriptif: `Cible : ${cible} — ${$('cib-descriptif').value.trim()}`
    }).then((res) => {
      if (!res.ok) { setMsg('msg-ciblee', res.error, false); return; }
      setMsg('msg-ciblee', 'Action ciblée envoyée.', true);
      chargerHistorique();
    }).catch(err => setMsg('msg-ciblee', 'Erreur réseau : ' + err, false));
  });

  // ---------- Soutien ----------
  function updateSoutienCost() {
    const niveauAvant = parseInt($('sou-niveau').value || '0', 10);
    const malus = parseInt($('sou-malus').value || '0', 10);
    $('sou-cost').textContent = `Coût : ${niveauAvant} Action(s) d'Influence pour faire passer la cible de ${niveauAvant} à ${niveauAvant+1}` +
      (malus < 0 ? ` — malus hors-praxis : ${malus} niveau(x) reçu(s) en moins.` : '.');
  }
  ['sou-niveau','sou-malus'].forEach(id => { $(id).addEventListener('input', updateSoutienCost); $(id).addEventListener('change', updateSoutienCost); });
  updateSoutienCost();

  $('btn-envoyer-soutien').addEventListener('click', () => {
    const nom = nomInput.value.trim();
    if (!nom) { setMsg('msg-soutien', "Chargez d'abord votre fiche.", false); return; }
    const manque = premierChampVideLabel([['sou-raison','Raison sociale'], ['sou-cible','Cible'], ['sou-descriptif','Descriptif joueur']]);
    if (manque) { setMsg('msg-soutien', `Champ obligatoire manquant : ${manque}.`, false); return; }
    setMsg('msg-soutien', 'Envoi…', true);
    const cible = $('sou-cible').value.trim();
    apiPost({
      action: 'nouvelleAction', nom, codeJoueur: codeInput.value, date: $('sou-date').value,
      ville: $('sou-ville').value, zone: $('sou-zone').value, categorie: $('sou-categorie').value,
      niveau: parseInt($('sou-niveau').value || '0', 10), raisonSociale: $('sou-raison').value.trim(),
      nomAction: 'Soutien', pointsAction: parseInt($('sou-niveau').value || '0', 10) + parseInt($('sou-malus').value || '0', 10),
      descriptif: `Cible : ${cible} — ${$('sou-descriptif').value.trim()}`
    }).then((res) => {
      if (!res.ok) { setMsg('msg-soutien', res.error, false); return; }
      setMsg('msg-soutien', 'Soutien envoyé.', true);
      chargerHistorique();
    }).catch(err => setMsg('msg-soutien', 'Erreur réseau : ' + err, false));
  });

  // ---------- AIP ----------
  function buildAipOptions() { fillSelect('aip-action', AIP_ACTIONS[$('aip-categorie').value] || []); }
  $('aip-categorie').addEventListener('change', buildAipOptions);
  buildAipOptions();

  $('btn-envoyer-aip').addEventListener('click', () => {
    const nom = nomInput.value.trim();
    if (!nom) { setMsg('msg-aip', "Chargez d'abord votre fiche.", false); return; }
    const manque = premierChampVideLabel([['aip-raison','Raison sociale'], ['aip-descriptif','Descriptif joueur']]);
    if (manque) { setMsg('msg-aip', `Champ obligatoire manquant : ${manque}.`, false); return; }
    setMsg('msg-aip', 'Envoi…', true);
    apiPost({
      action: 'nouvelleAction', nom, codeJoueur: codeInput.value, date: $('aip-date').value,
      ville: $('aip-ville').value, zone: $('aip-zone').value, categorie: $('aip-categorie').value,
      raisonSociale: $('aip-raison').value.trim(), nomAction: $('aip-action').value,
      pointsAction: parseInt($('aip-points').value || '1', 10), descriptif: $('aip-descriptif').value.trim()
    }).then((res) => {
      if (!res.ok) { setMsg('msg-aip', res.error, false); return; }
      setMsg('msg-aip', 'Action AIP envoyée.', true);
      chargerHistorique();
    }).catch(err => setMsg('msg-aip', 'Erreur réseau : ' + err, false));
  });

  // ---------- Récap du Mois ----------
  function chargerRecap() {
    const nom = nomInput.value.trim();
    if (!nom) { $('recap-contenu').innerHTML = ''; return; }
    setMsg('msg-recap', 'Chargement…', true);
    apiGet({ action: 'recap', nom, mois: $('recap-mois').value }).then((res) => {
      if (!res.ok) { setMsg('msg-recap', res.error, false); return; }
      setMsg('msg-recap', '', true);
      $('recap-contenu').innerHTML = `
        <div class="recap-card gotha"><h4>Gotha</h4>
          <div class="recap-line"><span>Niveau</span><span>${res.gotha.niveau}</span></div>
          <div class="recap-line"><span>Points utilisés</span><span>${res.gotha.utilises}</span></div>
          <div class="recap-line"><span>Points restants</span><span>${res.gotha.restants}</span></div>
        </div>
        <div class="recap-card pegre"><h4>Pègre</h4>
          <div class="recap-line"><span>Niveau</span><span>${res.pegre.niveau}</span></div>
          <div class="recap-line"><span>Points utilisés</span><span>${res.pegre.utilises}</span></div>
          <div class="recap-line"><span>Points restants</span><span>${res.pegre.restants}</span></div>
        </div>
        <div class="recap-card" style="grid-column:1/-1;"><h4>AIP</h4>
          <div class="recap-line"><span>Actions AIP ce mois</span><span>${res.nbActionsAIP}</span></div>
        </div>`;
    }).catch(err => setMsg('msg-recap', 'Erreur réseau : ' + err, false));
  }
  $('btn-recap').addEventListener('click', chargerRecap);

  // ---------- Résultats des Influences ----------
  let pageHistorique = 0;
  function chargerHistorique(page) {
    if (typeof page === 'number') pageHistorique = page;
    const nom = nomInput.value.trim();
    const list = $('historique-liste');
    if (!nom) { list.innerHTML = '<p class="subtitle">Chargez une fiche pour voir les résultats.</p>'; $('historique-pagination').innerHTML = ''; return; }
    list.innerHTML = '<p class="subtitle">Chargement…</p>';
    apiGet({ action: 'historique', nom, page: pageHistorique }).then((res) => {
      if (!res.ok) { list.innerHTML = `<p class="status-msg err">${res.error}</p>`; return; }
      if (!res.actions.length) { list.innerHTML = '<p class="subtitle">Aucune action enregistrée pour le moment.</p>'; $('historique-pagination').innerHTML = ''; return; }
      list.innerHTML = '';
      res.actions.forEach((a) => {
        const cat = a['CATEGORIE'] || '';
        const catClass = cat.indexOf('Gotha') !== -1 ? 'gotha' : (cat.indexOf('Pègre') !== -1 ? 'pegre' : '');
        const reponse = a['REPONSE CONTEUR'];
        const date = a['DATE'] ? new Date(a['DATE']).toLocaleDateString('fr-FR') : '';
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
          <div class="history-meta">
            ${catClass ? `<span class="tag ${catClass}">${cat}</span>` : (cat ? `<span class="tag">${cat}</span>` : '')}
            ${date} — ${a['ACTION'] || ''}
          </div>
          <div>${a['RAISON SOCIALE'] ? `<strong>Raison sociale :</strong> ${a['RAISON SOCIALE']}<br>` : ''}${a['DESCRIPTIF JOUEUR'] || ''}</div>
          <div class="history-result ${reponse ? '' : 'empty'}">${reponse ? `<strong>Résultat du conteur :</strong> ${reponse}` : 'En attente du résultat du conteur…'}</div>
        `;
        list.appendChild(div);
      });
      renderPagination('historique-pagination', res, chargerHistorique);
    }).catch(err => { list.innerHTML = `<p class="status-msg err">Erreur réseau : ${err}</p>`; });
  }
  $('btn-rafraichir-historique').addEventListener('click', () => chargerHistorique(0));

  // ---------- Raisons Sociales ----------
  let pageRaisons = 0;
  function chargerRaisonsSociales(page) {
    if (typeof page === 'number') pageRaisons = page;
    const nom = nomInput.value.trim();
    const list = $('rs-liste');
    if (!nom) { list.innerHTML = '<p class="subtitle">Chargez une fiche pour voir ses raisons sociales.</p>'; $('rs-pagination').innerHTML = ''; return; }
    list.innerHTML = '<p class="subtitle">Chargement…</p>';
    apiGet({ action: 'raisonsSociales', nom, page: pageRaisons }).then((res) => {
      if (!res.ok) { list.innerHTML = `<p class="status-msg err">${res.error}</p>`; return; }
      if (!res.raisonsSociales.length) { list.innerHTML = '<p class="subtitle">Aucune raison sociale liée pour le moment.</p>'; $('rs-pagination').innerHTML = ''; return; }
      list.innerHTML = '';
      res.raisonsSociales.forEach((r) => {
        const cat = r['CATEGORIE'] || '';
        const catClass = cat.indexOf('Gotha') !== -1 ? 'gotha' : (cat.indexOf('Pègre') !== -1 ? 'pegre' : '');
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
          <div class="history-meta">
            ${catClass ? `<span class="tag ${catClass}">${cat}</span>` : (cat ? `<span class="tag">${cat}</span>` : '')}
            ${r['VILLE'] || ''} — Zone ${r['ZONE'] || ''}
          </div>
          <div><strong>${r['NOM']}</strong>${r['DESCRIPTION'] ? `<br>${r['DESCRIPTION']}` : ''}</div>
        `;
        list.appendChild(div);
      });
      renderPagination('rs-pagination', res, chargerRaisonsSociales);
    }).catch(err => { list.innerHTML = `<p class="status-msg err">Erreur réseau : ${err}</p>`; });
  }
  $('btn-rafraichir-rs').addEventListener('click', () => chargerRaisonsSociales(0));

  $('btn-envoyer-rs').addEventListener('click', () => {
    const nom = nomInput.value.trim();
    if (!nom) { setMsg('msg-rs', "Chargez d'abord votre fiche.", false); return; }
    const nomRs = $('rs-nom').value.trim();
    if (!nomRs) { setMsg('msg-rs', 'Le nom de la raison sociale est obligatoire.', false); return; }
    setMsg('msg-rs', 'Envoi…', true);
    apiPost({
      action: 'nouvelleRaisonSociale', personnage: nom, codeJoueur: codeInput.value,
      nomRaisonSociale: nomRs, ville: $('rs-ville').value, zone: $('rs-zone').value,
      categorie: $('rs-categorie').value, description: $('rs-description').value.trim()
    }).then((res) => {
      if (!res.ok) { setMsg('msg-rs', res.error, false); return; }
      setMsg('msg-rs', 'Raison sociale ajoutée au registre.', true);
      $('rs-nom').value = ''; $('rs-description').value = '';
      chargerRaisonsSociales(0); remplirSelectsRaisonsSociales();
    }).catch(err => setMsg('msg-rs', 'Erreur réseau : ' + err, false));
  });

  // ---------- Tickets ----------
  const STATUT_CLASS = {
    'En attente': 'attente', 'En cours': 'encours', 'Informations demandées': 'infos',
    'Complété': 'complete', 'Refusé': 'refuse', 'Annulé': 'annule'
  };

  $('btn-envoyer-ticket').addEventListener('click', () => {
    const nom = nomInput.value.trim();
    if (!nom) { setMsg('msg-ticket', "Chargez d'abord votre fiche.", false); return; }
    const manque = premierChampVideLabel([['tk-sujet','Sujet'], ['tk-description','Description']]);
    if (manque) { setMsg('msg-ticket', `Champ obligatoire manquant : ${manque}.`, false); return; }
    setMsg('msg-ticket', 'Envoi…', true);
    apiPost({
      action: 'nouveauTicket', nom, codeJoueur: codeInput.value,
      categorie: $('tk-categorie').value, sujet: $('tk-sujet').value.trim(),
      description: $('tk-description').value.trim()
    }).then((res) => {
      if (!res.ok) { setMsg('msg-ticket', res.error, false); return; }
      setMsg('msg-ticket', `Ticket envoyé (${res.ticketId}).`, true);
      $('tk-sujet').value = ''; $('tk-description').value = '';
      chargerTickets(0);
    }).catch(err => setMsg('msg-ticket', 'Erreur réseau : ' + err, false));
  });

  let pageTickets = 0;
  function chargerTickets(page) {
    if (typeof page === 'number') pageTickets = page;
    const nom = nomInput.value.trim();
    const list = $('tickets-liste');
    if (!nom) { list.innerHTML = '<p class="subtitle">Chargez une fiche pour voir vos tickets.</p>'; $('tickets-pagination').innerHTML = ''; return; }
    list.innerHTML = '<p class="subtitle">Chargement…</p>';
    apiGet({ action: 'mesTickets', nom, page: pageTickets }).then((res) => {
      if (!res.ok) { list.innerHTML = `<p class="status-msg err">${res.error}</p>`; return; }
      if (!res.tickets.length) { list.innerHTML = '<p class="subtitle">Aucun ticket envoyé pour le moment.</p>'; $('tickets-pagination').innerHTML = ''; return; }
      list.innerHTML = '';
      res.tickets.forEach((t) => {
        const statut = t['STATUT'] || 'En attente';
        const resultat = t['RESULTAT'];
        const date = t['DATE CREATION'] ? new Date(t['DATE CREATION']).toLocaleDateString('fr-FR') : '';
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
          <div class="history-meta">
            <span class="tag statut-${STATUT_CLASS[statut] || 'attente'}">${statut}</span>
            <span class="tag">${t['CATEGORIE'] || ''}</span>
            ${date} — ${t['TICKET ID'] || ''}
          </div>
          <div><strong>${t['SUJET'] || ''}</strong><br>${t['DESCRIPTION'] || ''}</div>
          <div class="history-result ${resultat ? '' : 'empty'}">${resultat ? `<strong>Résultat du conteur :</strong> ${resultat}` : 'En attente du traitement par le conteur…'}</div>
        `;
        list.appendChild(div);
      });
      renderPagination('tickets-pagination', res, chargerTickets);
    }).catch(err => { list.innerHTML = `<p class="status-msg err">Erreur réseau : ${err}</p>`; });
  }
  $('btn-rafraichir-tickets').addEventListener('click', () => chargerTickets(0));
})();
</script>
