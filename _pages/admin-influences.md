---
title: "Influences — Conteur"
layout: full-width
classes: wide
permalink: /influences/conteur/
author_profile: false
toc: false
---

<div id="admin-app">

<style>
#admin-app {
  --accent: #7a1f2b; --accent-dim: #a9455a; --line: #e2ddd6; --panel: #fafaf8;
  --ink: #2b2b2b; --ink-dim: #767267; --ok: #3f7a4d; --warn: #a3641a;
  color: var(--ink); line-height: 1.55;
}
#admin-app * { box-sizing: border-box; }
#admin-app h2 { font-size: 1.2rem; margin: 0 0 1rem; color: var(--accent); }
#admin-app .subtitle { color: var(--ink-dim); font-size: .82rem; font-style: italic; margin: 0 0 1rem; }
#admin-app .id-bar { display: flex; gap: 1rem; flex-wrap: wrap; align-items: end; background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 1rem 1.2rem; margin-bottom: 1.4rem; }
#admin-app .id-bar > div { flex: 1; min-width: 160px; }
#admin-app label { display: block; font-size: .76rem; text-transform: uppercase; letter-spacing: .04em; color: var(--ink-dim); margin: .5rem 0 .3rem; }
#admin-app input[type=password], #admin-app input[type=month] {
  width: 100%; background: #fff; border: 1px solid #c9c3b8; color: var(--ink); padding: .5rem .65rem;
  border-radius: 4px; font-size: .88rem;
}
#admin-app button {
  background: var(--accent); border: 1px solid var(--accent); color: #fff;
  padding: .55rem 1.1rem; border-radius: 4px; cursor: pointer; font-size: .85rem; font-weight: 600; height: fit-content;
}
#admin-app button:hover { background: var(--accent-dim); border-color: var(--accent-dim); }
#admin-app .tabs { display: flex; gap: .2rem; flex-wrap: wrap; border-bottom: 2px solid var(--line); margin-bottom: 1.5rem; }
#admin-app .tab-btn {
  background: transparent; border: none; border-bottom: 3px solid transparent; margin-bottom: -2px;
  color: var(--ink-dim); padding: .65rem 1.1rem; cursor: pointer; font-size: .9rem; font-weight: 600;
}
#admin-app .tab-btn:hover { color: var(--accent); }
#admin-app .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
#admin-app .tab-panel { display: none; }
#admin-app .tab-panel.active { display: block; }
#admin-app .card { background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 1.4rem 1.6rem; }
#admin-app table { width: 100%; border-collapse: collapse; margin-top: .5rem; font-size: .86rem; }
#admin-app th, #admin-app td { text-align: left; padding: .5rem .6rem; border-bottom: 1px solid var(--line); vertical-align: top; }
#admin-app td select, #admin-app td textarea, #admin-app td input[type=text] {
  width: 100%; background: #fff; border: 1px solid #c9c3b8; color: var(--ink);
  padding: .35rem .5rem; border-radius: 4px; font-size: .82rem;
}
#admin-app td textarea { min-height: 3.2rem; resize: vertical; }
#admin-app td button.save-btn {
  background: transparent; border: 1px solid var(--ok); color: var(--ok);
  padding: .35rem .7rem; font-size: .76rem; font-weight: 600;
}
#admin-app td button.save-btn:hover { background: var(--ok); color: #fff; }
#admin-app .row-msg { font-size: .74rem; margin-top: .3rem; }
#admin-app .row-msg.ok { color: var(--ok); }
#admin-app .row-msg.err { color: var(--accent); }
#admin-app th { text-transform: uppercase; font-size: .7rem; letter-spacing: .04em; color: var(--ink-dim); }
#admin-app tr.fait td:first-child { color: var(--ok); font-weight: 600; }
#admin-app tr.attente td:first-child { color: var(--warn); font-weight: 600; }
#admin-app .status-msg { font-size: .82rem; margin-top: .6rem; }
#admin-app .status-msg.err { color: var(--accent); font-weight: 600; }
#admin-app .bar-cell { display: flex; align-items: center; gap: .5rem; }
#admin-app .bar { flex: 1; height: 8px; background: #fff; border: 1px solid var(--line); border-radius: 4px; overflow: hidden; }
#admin-app .bar-fill { height: 100%; background: var(--accent); }
#admin-app .pagination { display: flex; align-items: center; gap: .9rem; margin-top: 1rem; font-size: .82rem; color: var(--ink-dim); }
#admin-app .pagination button {
  padding: .35rem .8rem; font-size: .78rem; font-weight: 600;
  background: #fff; border: 1px solid var(--accent); color: var(--accent);
}
#admin-app .pagination button:hover { background: var(--accent); color: #fff; }
#admin-app .pagination button:disabled { border-color: var(--line); color: var(--line); cursor: not-allowed; background: #fff; }
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
  <button class="tab-btn" data-tab="raisons">Raisons Sociales</button>
  <button class="tab-btn" data-tab="tickets">Tickets</button>
</div>

<div class="tab-panel active" data-tab="joueurs">
  <div class="card">
    <h2>Joueurs — actions soumises ce mois</h2>
    <p class="subtitle">Tous types d'actions confondus (Globale, Ciblée, Soutien, AIP).</p>
    <table id="table-joueurs"><thead><tr><th>Statut</th><th>Personnage</th><th>Joueur</th><th>Nb actions</th></tr></thead><tbody></tbody></table>
  </div>
</div>

<div class="tab-panel" data-tab="districts">
  <div class="card">
    <h2>Actions par district (24 zones + Extérieur)</h2>
    <table id="table-districts"><thead><tr><th>Zone</th><th>Nb actions</th></tr></thead><tbody></tbody></table>
  </div>
</div>

<div class="tab-panel" data-tab="ciblees">
  <div class="card">
    <h2>Actions Ciblées</h2>
    <p class="subtitle">Lignes de l'onglet AIP où Action = Attaque / Défense / Obstruction.</p>
    <table id="table-ciblees"><thead><tr><th>Date</th><th>Personnage</th><th>Catégorie</th><th>Action</th><th>Raison sociale (cible)</th><th>Points</th><th>Réponse</th></tr></thead><tbody></tbody></table>
    <div id="ciblees-pagination" class="pagination"></div>
  </div>
</div>

<div class="tab-panel" data-tab="soutiens">
  <div class="card">
    <h2>Soutiens</h2>
    <p class="subtitle">Lignes de l'onglet AIP où Action = Soutien.</p>
    <table id="table-soutiens"><thead><tr><th>Date</th><th>Personnage</th><th>Raison sociale (soutenu)</th><th>Catégorie</th><th>Points</th><th>Réponse</th></tr></thead><tbody></tbody></table>
    <div id="soutiens-pagination" class="pagination"></div>
  </div>
</div>

<div class="tab-panel" data-tab="raisons">
  <div class="card">
    <h2>Raisons Sociales</h2>
    <p class="subtitle">Registre complet, tous personnages confondus — alimenté automatiquement à chaque action et par l'onglet "Raisons Sociales" côté joueur.</p>
    <table id="table-raisons"><thead><tr><th>Nom</th><th>Personnage lié</th><th>Ville</th><th>Zone</th><th>Catégorie</th><th>Description</th></tr></thead><tbody></tbody></table>
    <div id="raisons-pagination" class="pagination"></div>
  </div>
</div>

<div class="tab-panel" data-tab="tickets">
  <div class="card">
    <h2>Tickets</h2>
    <p class="subtitle">Demandes des joueurs. Changez le statut et/ou ajoutez un résultat puis cliquez "Enregistrer" sur la ligne concernée.</p>
    <div class="row" style="align-items:end;">
      <div><label for="tk-filtre-statut">Filtrer par statut</label>
        <select id="tk-filtre-statut">
          <option value="">Tous</option>
          <option>En attente</option><option>En cours</option><option>Informations demandées</option>
          <option>Complété</option><option>Refusé</option><option>Annulé</option>
        </select>
      </div>
      <div><button id="btn-filtrer-tickets">Filtrer</button></div>
    </div>
    <table id="table-tickets">
      <thead><tr><th>Date</th><th>Personnage</th><th>Catégorie</th><th>Sujet / Description</th><th>Statut</th><th>Résultat</th><th></th></tr></thead>
      <tbody></tbody>
    </table>
    <div id="tickets-pagination" class="pagination"></div>
  </div>
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

  $('btn-charger-tout').addEventListener('click', () => {
    const cle = $('admin-cle').value, mois = $('admin-mois').value;
    if (!cle) { setMsg('Entrez la clé conteur.', true); return; }
    setMsg('Chargement…', false);

    Promise.all([
      apiGet({ action: 'joueurs', cle, mois }),
      apiGet({ action: 'districts', cle, mois })
    ]).then(([joueurs, districts]) => {
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
    }).catch(err => setMsg('Erreur réseau : ' + err, true));

    chargerCiblees(0);
    chargerSoutiens(0);
    chargerRaisons(0);
    chargerTickets(0);
  });

  // ---------- Actions Ciblées (paginé) ----------
  let pageCiblees = 0;
  function chargerCiblees(page) {
    if (typeof page === 'number') pageCiblees = page;
    const cle = $('admin-cle').value;
    if (!cle) return;
    apiGet({ action: 'actionsCiblees', cle, page: pageCiblees }).then((res) => {
      if (!res.ok) { setMsg(res.error, true); return; }
      fillTable('#table-ciblees', res.actions, (a) => {
        const tr = document.createElement('tr');
        const date = a['DATE'] ? new Date(a['DATE']).toLocaleDateString('fr-FR') : '';
        tr.innerHTML = `<td>${date}</td><td>${a['PERSONNAGE']||''}</td><td>${a['CATEGORIE']||''}</td><td>${a['ACTION']||''}</td><td>${a['RAISON SOCIALE']||''}</td><td>${a["POINTS D'ACTION"]||''}</td><td>${a['REPONSE CONTEUR']||'—'}</td>`;
        return tr;
      });
      renderPagination('ciblees-pagination', res, chargerCiblees);
    }).catch(err => setMsg('Erreur réseau (actions ciblées) : ' + err, true));
  }

  // ---------- Soutiens (paginé) ----------
  let pageSoutiens = 0;
  function chargerSoutiens(page) {
    if (typeof page === 'number') pageSoutiens = page;
    const cle = $('admin-cle').value;
    if (!cle) return;
    apiGet({ action: 'soutiens', cle, page: pageSoutiens }).then((res) => {
      if (!res.ok) { setMsg(res.error, true); return; }
      fillTable('#table-soutiens', res.actions, (a) => {
        const tr = document.createElement('tr');
        const date = a['DATE'] ? new Date(a['DATE']).toLocaleDateString('fr-FR') : '';
        tr.innerHTML = `<td>${date}</td><td>${a['PERSONNAGE']||''}</td><td>${a['RAISON SOCIALE']||''}</td><td>${a['CATEGORIE']||''}</td><td>${a["POINTS D'ACTION"]||''}</td><td>${a['REPONSE CONTEUR']||'—'}</td>`;
        return tr;
      });
      renderPagination('soutiens-pagination', res, chargerSoutiens);
    }).catch(err => setMsg('Erreur réseau (soutiens) : ' + err, true));
  }

  // ---------- Raisons Sociales (paginé) ----------
  let pageRaisons = 0;
  function chargerRaisons(page) {
    if (typeof page === 'number') pageRaisons = page;
    apiGet({ action: 'raisonsSociales', page: pageRaisons }).then((res) => {
      if (!res.ok) { setMsg(res.error, true); return; }
      fillTable('#table-raisons', res.raisonsSociales || [], (r) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${r['NOM']||''}</td><td>${r['PERSONNAGE LIE']||''}</td><td>${r['VILLE']||''}</td><td>${r['ZONE']||''}</td><td>${r['CATEGORIE']||''}</td><td>${r['DESCRIPTION']||''}</td>`;
        return tr;
      });
      renderPagination('raisons-pagination', res, chargerRaisons);
    }).catch(err => setMsg('Erreur réseau (raisons sociales) : ' + err, true));
  }

  // ---------- Tickets (paginé) ----------
  const STATUTS = ['En attente', 'En cours', 'Informations demandées', 'Complété', 'Refusé', 'Annulé'];

  function apiPost(body) {
    return fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) }).then(r => r.json());
  }

  let pageTickets = 0;
  function chargerTickets(page) {
    if (typeof page === 'number') pageTickets = page;
    const cle = $('admin-cle').value;
    if (!cle) return;
    const statut = $('tk-filtre-statut').value;
    apiGet({ action: 'tickets', cle, statut, page: pageTickets }).then((res) => {
      if (!res.ok) { setMsg(res.error, true); return; }
      fillTable('#table-tickets', res.tickets, (t) => {
        const tr = document.createElement('tr');
        const date = t['DATE CREATION'] ? new Date(t['DATE CREATION']).toLocaleDateString('fr-FR') : '';
        const statutOptions = STATUTS.map(s => `<option value="${s}"${s === t['STATUT'] ? ' selected' : ''}>${s}</option>`).join('');
        tr.innerHTML = `
          <td>${date}</td>
          <td>${t['PERSONNAGE']||''}</td>
          <td>${t['CATEGORIE']||''}</td>
          <td><strong>${t['SUJET']||''}</strong><br>${t['DESCRIPTION']||''}</td>
          <td><select class="tk-statut">${statutOptions}</select></td>
          <td><textarea class="tk-resultat">${t['RESULTAT']||''}</textarea></td>
          <td><button class="save-btn">Enregistrer</button><div class="row-msg"></div></td>
        `;
        tr.querySelector('.save-btn').addEventListener('click', () => {
          const msgEl = tr.querySelector('.row-msg');
          msgEl.textContent = 'Enregistrement…'; msgEl.className = 'row-msg';
          apiPost({
            action: 'majTicket', cle: $('admin-cle').value, ticketId: t['TICKET ID'],
            statut: tr.querySelector('.tk-statut').value, resultat: tr.querySelector('.tk-resultat').value
          }).then((res2) => {
            if (!res2.ok) { msgEl.textContent = res2.error; msgEl.className = 'row-msg err'; return; }
            msgEl.textContent = 'Enregistré.'; msgEl.className = 'row-msg ok';
          }).catch(err => { msgEl.textContent = 'Erreur réseau : ' + err; msgEl.className = 'row-msg err'; });
        });
        return tr;
      });
      renderPagination('tickets-pagination', res, chargerTickets);
    }).catch(err => setMsg('Erreur réseau (tickets) : ' + err, true));
  }
  $('btn-filtrer-tickets').addEventListener('click', () => chargerTickets(0));
})();
</script>
