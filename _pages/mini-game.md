---
layout: page
title: "Mini-jeu Hack — Enigmes"
permalink: /mini-game/
---

<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Mini-jeu Hack — Enigmes</title>
  <style>
    :root{--bg:#0f1724;--card:#0b1220;--accent:#22c1c3;--muted:#9aa4b2}
    html,body{height:100%}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,'Helvetica Neue',Arial;background:linear-gradient(180deg,#071029 0%,#041321 100%);color:#e6eef6}
    .wrap{max-width:820px;margin:18px auto;padding:18px}
    header{display:flex;gap:12px;align-items:center}
    header h1{font-size:20px;margin:0}
    .card{background:rgba(255,255,255,0.03);border-radius:12px;padding:14px;margin-top:14px;box-shadow:0 6px 18px rgba(2,6,23,0.6)}
    .controls{display:flex;gap:8px;flex-wrap:wrap}
    input[type=text],input[type=password]{padding:10px;border-radius:8px;border:none;background:#081826;color:var(--accent);width:100%}
    button{background:var(--accent);border:none;color:#042428;padding:10px 12px;border-radius:8px;font-weight:600}
    .puzzle{margin-top:12px}
    .puzzle h3{margin:0 0 8px 0}
    .hint{color:var(--muted);font-size:13px}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-top:12px}
    .tile{background:linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01));padding:12px;border-radius:10px;min-height:84px;display:flex;flex-direction:column;justify-content:space-between}
    .locked{opacity:0.38}
    .solved{outline:2px solid rgba(34,193,195,0.12)}
    .footer{font-size:13px;color:var(--muted);margin-top:14px}
    @media (max-width:520px){header h1{font-size:18px}}
    .log{background:#02121a;padding:10px;border-radius:8px;color:#9fd9d9;font-family:monospace;font-size:13px;max-height:120px;overflow:auto}
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>Mini-jeu « Hack » — Enigmes (mobile friendly)</h1>
    </header>

    <div class="card">
      <div style="display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap">
        <div style="flex:1;min-width:220px">
          <div style="font-weight:700">Niveau d'accès</div>
          <div id="accessDesc" class="hint">Aucun mot de passe entré — accès niveau 0</div>
        </div>
        <div style="min-width:240px" class="controls">
          <input id="pwd" type="password" placeholder="Entrer mot de passe niveau...">
          <button id="btnPwd">Valider MDP</button>
          <button id="btnClear">Effacer</button>
        </div>
      </div>

      <div class="puzzle">
        <div class="hint">Progression: <span id="progress">0/11</span> énigmes résolues · Niveau accessible: <span id="maxVisible">0</span></div>

        <div class="grid" id="puzzleGrid"></div>

        <div style="margin-top:10px">
          <div class="log" id="logArea">Bienvenue — utilisez les tuiles pour ouvrir les énigmes. Les mots de passe sont gérés localement.</div>
        </div>
      </div>

      <div class="footer">Remarque: mots de passe et verrous sont stockés côté client (localStorage). Ce système est destiné à une utilisation ludique sur GitHub Pages — il n'est pas sécurisé pour des données réelles.</div>
    </div>
  </div>

<script>
// --- CONFIGURATION ---
// mapping des MDP (changez ici) : mdpN : levelNumber
const PASSWORDS = {
  'alpha1': 1,
  'beta2': 2,
  'gamma3': 3,
  'delta4': 4,
  'omega5': 5
};
// accès: level N donne accès jusqu'à (N*2) énigmes, voir demande
function accessForLevel(n){ return n*2; }
const TOTAL_PUZZLES = 11;

// puzzles: simple validation par equals (case-insensitive), hints et texte
const PUZZLES = [
  {id:1,title:'1 — Riddle',hint:'Je suis plein de trous mais je retiens l\'eau. Qui suis-je?',answer:'éponge',desc:'Répondez le mot (sans accents fonctionne aussi).'},
  {id:2,title:'2 — César (décalage 3)',hint:'KHOOR => déchiffrez (César +3)',answer:'hello',desc:'Entrez le mot décodé.'},
  {id:3,title:'3 — Maths simple',hint:'Si 2+2=4 et 3+3=9 (système étrange). Quel est 1+1?',answer:'1',desc:'Réfléchissez au système donné.'},
  {id:4,title:'4 — Morse (.- .-.)',hint:'Interprétez .- .-. en ASCII (séparé par espace).',answer:'ar',desc:'Entrer la transcription.'},
  {id:5,title:'5 — Anagram',hint:'Un anagramme de "RAJOL" (indice: parfum)',answer:'loraj',desc:'Ceci est délibérément ambigu — changez si besoin.'},
  {id:6,title:'6 — Suite',hint:'Suite: 2,3,5,7,11, ? (prochain nombre)',answer:'13',desc:'Suite de nombres premiers.'},
  {id:7,title:'7 — Image code (ASCII)',hint:'Le mot "72 69 4c" en hex → ASCII',answer:'HiL',desc:'Entrez la chaîne décodée.'},
  {id:8,title:'8 — Vigenère (clé LUNE)',hint:'Message chiffré: "XQF" avec clé LUNE (Vigenère).',answer:'SOL',desc:'Déchiffrez avec clé donnée.'},
  {id:9,title:'9 — Devinez le mot',hint:'Mot caché: _ O _ T _',answer:'robot',desc:'Un mot de 5 lettres.'},
  {id:10,title:'10 — Pattern',hint:'Quel est le prochain symbole: ▲, ○, ▲, ○, ?',answer:'▲',desc:'Séquence alternée.'},
  {id:11,title:'11 — Final (réunir clés)',hint:'Composez les premières lettres des réponses 1→10 pour obtenir l\'indice final.',answer:'EHSAR1R1R▲',desc:'Le final attend que vous ayez résolu les 10 précédentes.'}
];

// --- UTIL ---
function log(msg){const a=document.getElementById('logArea');a.innerText=msg+'\n\n'+a.innerText}
function saveState(state){localStorage.setItem('hackgame',JSON.stringify(state))}
function loadState(){try{return JSON.parse(localStorage.getItem('hackgame')||'{}')}catch(e){return {}}}

// --- INITIALISATION UI ---
let state = loadState(); if(!state.solved) state.solved={}; if(!state.level) state.level=0;
const grid = document.getElementById('puzzleGrid');
function renderGrid(){grid.innerHTML='';
  const maxVisible = Math.min(TOTAL_PUZZLES, accessForLevel(state.level));
  document.getElementById('maxVisible').innerText = maxVisible;
  for(let i=0;i<TOTAL_PUZZLES;i++){
    const p = PUZZLES[i];
    const tile = document.createElement('div'); tile.className='tile';
    if(i+1>maxVisible) tile.classList.add('locked');
    if(state.solved[p.id]) tile.classList.add('solved');
    const h = document.createElement('div'); h.innerHTML=`<strong>${p.title}</strong>`;
    const hint = document.createElement('div'); hint.className='hint'; hint.innerText = (i+1>maxVisible)?'Verrouillé (niveau insuffisant)':p.hint;
    const btn = document.createElement('button'); btn.innerText = (state.solved[p.id])? 'Résolu' : 'Ouvrir';
    btn.disabled = (i+1>maxVisible) || state.solved[p.id];
    btn.onclick = ()=>{ openPuzzle(p) };
    tile.appendChild(h); tile.appendChild(hint); tile.appendChild(btn);
    grid.appendChild(tile);
  }
  document.getElementById('progress').innerText = Object.keys(state.solved).length + '/' + TOTAL_PUZZLES;
}

function openPuzzle(p){
  const answer = prompt(p.desc + '\n\nIndice:\n' + p.hint + '\n\nVotre réponse:');
  if(answer===null) return;
  const ok = validate(p,answer);
  if(ok){ state.solved[p.id]=true; saveState(state); log('Puzzle '+p.id+' résolu.'); alert('Bonne réponse !'); renderGrid(); checkFinalUnlock(); }
  else{ alert('Mauvaise réponse. Réessayez.'); log('Mauvaise tentative pour puzzle '+p.id); }
}

function validate(p,ans){ if(!ans) return false; const a = ans.toString().trim().toLowerCase(); const expected = p.answer.toString().trim().toLowerCase(); return a===expected }

// password handling
document.getElementById('btnPwd').onclick = ()=>{
  const v = document.getElementById('pwd').value.trim(); if(!v) return alert('Entrez un mot de passe');
  if(PASSWORDS[v]!==undefined){ state.level = PASSWORDS[v]; saveState(state); document.getElementById('accessDesc').innerText = 'MDP valide — niveau '+state.level; log('MDP accepté: niveau '+state.level); renderGrid(); }
  else{ alert('MDP invalide'); log('Tentative MDP: '+v) }
}
document.getElementById('btnClear').onclick = ()=>{ localStorage.removeItem('hackgame'); state={solved:{},level:0}; renderGrid(); log('Progression réinitialisée.'); }

function checkFinalUnlock(){
  // final (puzzle 11) unlocks only if at least 10 puzzles solved
  const solvedCount = Object.keys(state.solved).length;
  if(solvedCount>=10 && !state.solved[11]){
    alert('Félicitations — vous avez débloqué le puzzle final !');
    log('Puzzle final débloqué (10 résolus).'); renderGrid();
  }
}

// first render
renderGrid();

// small helper: if user has no password, they can still access level 0 (0 puzzles). But you might want to seed free puzzles.

</script>
</body>
</html>
