---
title: "Influences — Conteur"
layout: single
permalink: /influences/conteur/
author_profile: false
toc: false
---

<div id="admin-app">

<style>
#admin-app {
  --ink: #e9e2d3; --ink-dim: #a89f8f; --bg-deep: #14100f; --bg-panel: #1c1613;
  --line: #362c26; --gotha: #b08d57; --pegre: #7a1f2b; --ok: #6f8f6a; --warn: #c98a3a;
  font-family: 'Source Serif Pro', Georgia, serif; background: var(--bg-deep); color: var(--ink);
  padding: 2.2rem 2rem 2.5rem; border-radius: 4px; line-height: 1.55;
}
#admin-app * { box-sizing: border-box; }
#admin-app h2 { font-family: 'Playfair Display', Georgia, serif; font-size: 1.25rem; margin: 0 0 1rem; }
#admin-app .subtitle { color: var(--ink-dim); font-size: .8rem; font-style: italic; margin: 0 0 1rem; }
#admin-app .id-bar { display: flex; gap: 1rem; flex-wrap: wrap; align-items: end; background: var(--bg-panel); border: 1px solid var(--line); border-radius: 3px; padding: 1rem 1.2rem; margin-bottom: 1.4rem; }
#admin-app .id-bar > div { flex: 1; min-width: 160px; }
#admin-app label { display: block; font-size: .74rem; text-transform: uppercase; letter-spacing: .07em; color: var(--ink-dim); margin: .5rem 0 .3rem; }
#admin-app input[type=password], #admin-app input[type=month] {
  width: 100%; background: var(--bg-deep); border: 1px solid var(--line); color: var(--ink); padding: .5rem .65rem;
  border-radius: 2px; font-family: 'IBM Plex Mono', monospace; font-size: .85rem;
}
#admin-app button {
  font-family: 'IBM Plex Mono', monospace; background: transparent; border: 1px solid var(--gotha); color: var(--gotha);
  padding: .5rem 1rem; border-radius: 2px; cursor: pointer; font-size: .78rem; text-transform: uppercase;
  letter-spacing: .04em; height: fit-content;
}
#admin-app button:hover { background: var(--gotha); color: var(--bg-deep); }
#admin-app .tabs { display: flex; gap: .3rem; flex-wrap: wrap; border-bottom: 1px solid var(--line); margin-bottom: 1.4rem; }
#admin-app .tab-btn {
  font-family: 'IBM Plex Mono', monospace; background: transparent; border: none; border-bottom: 2px solid transparent;
  color: var(--ink-dim); padding: .6rem .9rem; cursor: pointer; font-size: .76rem; text-transform: uppercase; letter-spacing: .05em;
}
#admin-app .tab-btn:hover { color: var(--ink); }
#admin-app .tab-btn.active { color: var(--gotha); border-bottom-color: var(--gotha); }
#admin-app .tab-panel { display: none; background: var(--bg-panel); border: 1px solid var(--line); border-radius: 3px; padding: 1.4rem 1.6rem; }
#admin-app .tab-panel.active { display: block; }
#admin-app table { width: 100%; border-collapse: collapse; margin-top: .5rem; font-size: .82rem; }
#admin-app th, #admin-app td { text-align: left; padding: .45rem .6rem; border-bottom: 1px solid var(--line); }
#admin-app th { font-family: 'IBM Plex Mono', monospace; text-transform: uppercase; font-size: .68rem; letter-spacing: .05em; color: var(--ink-dim); }
#admin-app tr.fait td:first-child { color: var(--ok); }
#admin-app tr.attente td:first-child { color: var(--warn); }
#admin-app .status-msg { font-size: .8rem; margin-top: .6rem; }
#admin-app .status-msg.err { color: var(--pegre); }
#admin-app .bar-cell { display: flex; align-items: center; gap: .5rem; }
#admin-app .bar { flex: 1; height: 8px; background: var(--bg-deep); border-radius: 2px; overflow: hidden; }
#admin-app .bar-fill { height: 100%; background: var(--gotha); }
</style>

<div class="id-bar">
  <div><label for="admin-cle">Clé conteur</label><input type="password" id="admin-cle"></div>
  <div><label for="admin-mois">Mois</label><input type="month" id="admin-mois"></div>
  <div><button id="btn-charger-tout">Charger le tableau de bord</button></div>
</div>
<div id="msg-admin" class="status-msg"></div>

<div class="tabs">
  <button class="tab-btn active" data-tab="joueurs">Joueurs</button>
  <button class="tab-btn" data-tab="districts">Districts</button>
  <button class="tab-btn" data-tab="ciblees">Actions Ciblées</button>
  <button class="tab-btn" data-tab="soutiens">Soutiens</button>
</div>

<div class="tab-panel active" data-tab="joueurs">
  <h2>Joueurs — actions soumises ce mois</h2>
  <p class="subtitle">Tous onglets d'actions confondus (Globale, Ciblée, Soutien, AIP).</p>
  <table id="table-joueurs"><thead><tr><th>Statut</th><th>Personnage</th><th>Joueur</th><th>Nb actions</th></tr></thead><tbody></tbody></table>
</div>

<div class="tab-panel" data-tab="districts">
  <h2>Actions par district (24 zones + Extérieur)</h2>
  <table id="table-districts"><thead><tr><th>Zone</th><th>Nb actions</th></tr></thead><tbody></tbody></table>
</div>

<div class="tab-panel" data-tab="ciblees">
  <h2>Actions Ciblées</h2>
  <p class="subtitle">Lignes de l'onglet AIP où Action = Attaque / Défense / Obstruction.</p>
  <table id="table-ciblees"><thead><tr><th>Date</th><th>Personnage</th><th>Catégorie</th><th>Action</th><th>Raison sociale (cible)</th><th>Points</th><th>Réponse</th></tr></thead><tbody></tbody></table>
</div>

<div class="tab-panel" data-tab="soutiens">
  <h2>Soutiens</h2>
  <p class="subtitle">Lignes de l'onglet AIP où Action = Soutien.</p>
  <table id="table-soutiens"><thead><tr><th>Date</th><th>Personnage</th><th>Raison sociale (soutenu)</th><th>Catégorie</th><th>Points</th><th>Réponse</th></tr></thead><tbody></tbody></table>
</div>

</div>

<script>
(function () {
  const API_URL = "https://script.google.com/macros/s/AKfycbzvQ9eGmFpoa-53YQwuCneMM6i9VA3vS2TAw1j8ImxYQpSZmL1Qaa2CZgGEfhCPf6J5xA/exec";
  const $ = (id) => document.getElementById(id);

  document.querySelectorAll('#admin-app .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#admin-app .tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('#admin-app .tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.querySelector(`#admin-app .tab-panel[data-tab="${btn.dataset.tab}"]`).classList.add('active');
    });
  });

  const now = new Date();
  $('admin-mois').value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  function apiGet(params) { return fetch(`${API_URL}?${new URLSearchParams(params)}`).then(r => r.json()); }
  function setMsg(text, err) { const el = $('msg-admin'); el.textContent = text; el.className = 'status-msg' + (err ? ' err' : ''); }
  function fillTable(sel, rows, rowBuilder) {
    const tbody = document.querySelector(`${sel} tbody`);
    tbody.innerHTML = '';
    rows.forEach(r => tbody.appendChild(rowBuilder(r)));
  }

  $('btn-charger-tout').addEventListener('click', () => {
    const cle = $('admin-cle').value, mois = $('admin-mois').value;
    if (!cle) { setMsg('Entrez la clé conteur.', true); return; }
    setMsg('Chargement…', false);

    Promise.all([
      apiGet({ action: 'joueurs', cle, mois }),
      apiGet({ action: 'districts', cle, mois }),
      apiGet({ action: 'actionsCiblees', cle }),
      apiGet({ action: 'soutiens', cle })
    ]).then(([joueurs, districts, ciblees, soutiens]) => {
      if (!joueurs.ok) { setMsg(joueurs.error, true); return; }
      setMsg(`Tableau de bord chargé pour ${mois}.`, false);

      fillTable('#table-joueurs', joueurs.joueurs, (j) => {
        const tr = document.createElement('tr');
        tr.className = j.STATUT === 'Fait' ? 'fait' : 'attente';
        tr.innerHTML = `<td>${j.STATUT === 'Fait' ? '✅' : '❌'}</td><td>${j.PERSONNAGE}</td><td>${j.JOUEUR || ''}</td><td>${j.ACTIONS_SOUMISES}</td>`;
        return tr;
      });

      const maxDistrict = Math.max(1, ...districts.districts.map(d => d.NB_ACTIONS));
      fillTable('#table-districts', districts.districts, (d) => {
        const tr = document.createElement('tr');
        const pct = Math.round((d.NB_ACTIONS / maxDistrict) * 100);
        tr.innerHTML = `<td>${d.ZONE}</td><td><div class="bar-cell"><span>${d.NB_ACTIONS}</span><div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div></div></td>`;
        return tr;
      });

      fillTable('#table-ciblees', ciblees.actions, (a) => {
        const tr = document.createElement('tr');
        const date = a['DATE'] ? new Date(a['DATE']).toLocaleDateString('fr-FR') : '';
        tr.innerHTML = `<td>${date}</td><td>${a['PERSONNAGE']||''}</td><td>${a['CATEGORIE']||''}</td><td>${a['ACTION']||''}</td><td>${a['RAISON SOCIALE']||''}</td><td>${a["POINTS D'ACTION"]||''}</td><td>${a['REPONSE CONTEUR']||'—'}</td>`;
        return tr;
      });

      fillTable('#table-soutiens', soutiens.actions, (a) => {
        const tr = document.createElement('tr');
        const date = a['DATE'] ? new Date(a['DATE']).toLocaleDateString('fr-FR') : '';
        tr.innerHTML = `<td>${date}</td><td>${a['PERSONNAGE']||''}</td><td>${a['RAISON SOCIALE']||''}</td><td>${a['CATEGORIE']||''}</td><td>${a["POINTS D'ACTION"]||''}</td><td>${a['REPONSE CONTEUR']||'—'}</td>`;
        return tr;
      });
    }).catch(err => setMsg('Erreur réseau : ' + err, true));
  });
})();
</script>
