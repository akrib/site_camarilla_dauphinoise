---
layout: page
title: "Mini-jeu assembleur — Enigmes"
permalink: /mini-jeu/blind-map/
---
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Le Cartographe Aveugle</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }

        body {
            font-family: 'Georgia', serif;
            background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
            height: 100vh;
            overflow: hidden;
            color: #2c3e50;
            touch-action: pan-y;
        }

        .container {
            height: 100vh;
            display: flex;
            flex-direction: column;
            position: relative;
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);
            color: #ecf0f1;
            padding: 15px;
            text-align: center;
            flex-shrink: 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }

        .header h1 {
            font-size: 1.5em;
            margin-bottom: 5px;
        }

        .page-indicator {
            font-size: 0.85em;
            opacity: 0.9;
            margin-top: 5px;
        }

        .slider-container {
            flex: 1;
            position: relative;
            overflow: hidden;
        }

        .slides {
            display: flex;
            height: 100%;
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            will-change: transform;
        }

        .slide {
            min-width: 100%;
            height: 100%;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        }

        /* PAGE 1 - DESCRIPTIONS */
        .descriptions {
            padding: 20px;
            background: #fff;
        }

        .descriptions h2 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 1.3em;
            border-left: 5px solid #e74c3c;
            padding-left: 15px;
        }

        .description-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .description-item {
            background: #ecf0f1;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #3498db;
            font-size: 0.9em;
            line-height: 1.5;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }

        /* PAGE 2 - JEU */
        .game-page {
            display: flex;
            flex-direction: column;
            height: 100%;
            background: #f8f9fa;
        }

        .map-section {
            flex: 1;
            padding: 15px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .map-title {
            color: #2c3e50;
            margin-bottom: 10px;
            font-size: 1.1em;
            text-align: center;
        }

        .map-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: repeat(4, 1fr);
            gap: 3px;
            background: #34495e;
            padding: 3px;
            border-radius: 8px;
            aspect-ratio: 1;
            max-width: 100%;
            margin: 0 auto;
            flex-shrink: 0;
        }

        .map-cell {
            background: #ecf0f1;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2em;
            touch-action: none;
            transition: background 0.2s;
            position: relative;
        }

        .map-cell.drag-over {
            background: #d5dbdb;
            box-shadow: inset 0 0 10px rgba(52, 152, 219, 0.5);
        }

        .map-cell.has-element {
            background: #fff;
        }

        .placed-element {
            cursor: pointer;
            touch-action: none;
        }

        .elements-section {
            background: #fff;
            padding: 15px;
            border-top: 3px solid #34495e;
            overflow-x: auto;
            overflow-y: hidden;
            flex-shrink: 0;
        }

        .elements-title {
            color: #2c3e50;
            margin-bottom: 10px;
            font-size: 1em;
            text-align: center;
        }

        .elements-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            max-width: 500px;
            margin: 0 auto;
        }

        .element {
            background: #fff;
            border: 2px solid #34495e;
            border-radius: 8px;
            padding: 10px;
            text-align: center;
            cursor: move;
            touch-action: none;
            transition: all 0.2s;
            font-size: 1.8em;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            aspect-ratio: 1;
        }

        .element.dragging {
            opacity: 0.5;
            transform: scale(0.9);
        }

        .element.used {
            opacity: 0.3;
            cursor: not-allowed;
        }

        .element-label {
            display: block;
            font-size: 0.35em;
            margin-top: 5px;
            color: #555;
        }

        .validate-section {
            padding: 15px;
            text-align: center;
            background: #fff;
            border-top: 2px solid #ecf0f1;
        }

        .validate-btn {
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            color: white;
            border: none;
            padding: 15px 40px;
            font-size: 1.2em;
            border-radius: 50px;
            cursor: pointer;
            box-shadow: 0 5px 15px rgba(231, 76, 60, 0.3);
            font-weight: bold;
            touch-action: manipulation;
        }

        .validate-btn:active {
            transform: scale(0.95);
        }

        /* BOUTONS DE NAVIGATION */
        .nav-button {
            position: fixed;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(52, 73, 94, 0.9);
            color: white;
            border: none;
            width: 50px;
            height: 80px;
            font-size: 1.5em;
            cursor: pointer;
            z-index: 100;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 3px 10px rgba(0,0,0,0.3);
        }

        .nav-button:active {
            background: rgba(52, 73, 94, 1);
        }

        .nav-button.left {
            left: 0;
            border-radius: 0 10px 10px 0;
        }

        .nav-button.right {
            right: 0;
            border-radius: 10px 0 0 10px;
        }

        .nav-button:disabled {
            opacity: 0.3;
            cursor: not-allowed;
        }

        /* MODAL RÉSULTAT */
        .result-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.9);
            z-index: 1000;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .result-modal.show {
            display: flex;
        }

        .result-content {
            background: #fff;
            padding: 30px 20px;
            border-radius: 15px;
            max-width: 500px;
            width: 100%;
            text-align: center;
            box-shadow: 0 10px 50px rgba(0,0,0,0.5);
            max-height: 90vh;
            overflow-y: auto;
        }

        .result-content h2 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 1.5em;
        }

        .score {
            font-size: 3em;
            color: #e74c3c;
            margin: 15px 0;
            font-weight: bold;
        }

        .score-message {
            font-size: 1em;
            margin: 15px 0;
            color: #555;
        }

        .encrypted-message {
            background: #ecf0f1;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
            border-left: 5px solid #3498db;
            text-align: left;
            word-wrap: break-word;
            font-size: 0.85em;
        }

        .close-btn {
            background: #3498db;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 1.1em;
            margin-top: 15px;
        }

        /* DRAG VISUAL FEEDBACK */
        .drag-ghost {
            position: fixed;
            pointer-events: none;
            z-index: 1000;
            font-size: 2.5em;
            opacity: 0.8;
            transform: translate(-50%, -50%);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🗺️ Le Cartographe Aveugle</h1>
            <div class="page-indicator" id="pageIndicator">Page 1/2 - Descriptions</div>
        </div>

        <button class="nav-button left" id="prevBtn" disabled>‹</button>
        <button class="nav-button right" id="nextBtn">›</button>

        <div class="slider-container">
            <div class="slides" id="slides">
                <!-- SLIDE 1 - DESCRIPTIONS -->
                <div class="slide">
                    <div class="descriptions">
                        <h2>📜 Descriptions du Territoire</h2>
                        <div class="description-list">
                            <div class="description-item">Une masse d'eau coule du septentrion vers le couchant</div>
                            <div class="description-item">L'habitat principal se trouve dans les terres orientales, loin des berges</div>
                            <div class="description-item">Une haute formation rocheuse se dresse dans l'angle supérieur gauche</div>
                            <div class="description-item">La densité végétale se concentre entre l'élévation et le cours d'eau</div>
                            <div class="description-item">Un édifice sacré marque le centre des habitations</div>
                            <div class="description-item">Les parcelles agricoles occupent la partie méridionale du territoire</div>
                            <div class="description-item">Un passage permet de traverser l'obstacle aquatique</div>
                            <div class="description-item">Un lieu d'échange se situe aux confins du territoire habité</div>
                            <div class="description-item">Des vestiges du passé reposent dans l'angle opposé à l'élévation</div>
                            <div class="description-item">Un mécanisme hydraulique fonctionne proche de la rive</div>
                            <div class="description-item">Des habitations modestes bordent le chemin principal</div>
                            <div class="description-item">Un espace boisé plus petit se trouve au sud des grandes cultures</div>
                            <div class="description-item">Une tour de guet observe depuis les hauteurs rocheuses</div>
                            <div class="description-item">Un puits communal se trouve au cœur du village</div>
                            <div class="description-item">Des animaux paissent dans les prairies occidentales</div>
                            <div class="description-item">Un sentier sinueux relie tous les points remarquables du territoire</div>
                        </div>
                    </div>
                </div>

                <!-- SLIDE 2 - JEU -->
                <div class="slide">
                    <div class="game-page">
                        <div class="map-section">
                            <h3 class="map-title">🗺️ Votre Carte (4×4)</h3>
                            <div class="map-grid" id="mapGrid"></div>
                        </div>

                        <div class="elements-section">
                            <h4 class="elements-title">🎨 Éléments à Placer</h4>
                            <div class="elements-grid" id="elementsGrid">
                                <div class="element" data-type="river">🌊<span class="element-label">Rivière</span></div>
                                <div class="element" data-type="mountain">⛰️<span class="element-label">Montagne</span></div>
                                <div class="element" data-type="forest">🌲<span class="element-label">Forêt</span></div>
                                <div class="element" data-type="village">🏘️<span class="element-label">Village</span></div>
                                <div class="element" data-type="church">⛪<span class="element-label">Église</span></div>
                                <div class="element" data-type="field">🌾<span class="element-label">Champ</span></div>
                                <div class="element" data-type="bridge">🌉<span class="element-label">Pont</span></div>
                                <div class="element" data-type="market">🏪<span class="element-label">Marché</span></div>
                                <div class="element" data-type="ruins">🏛️<span class="element-label">Ruines</span></div>
                                <div class="element" data-type="mill">⚙️<span class="element-label">Moulin</span></div>
                                <div class="element" data-type="house">🏠<span class="element-label">Maisons</span></div>
                                <div class="element" data-type="trees">🌳<span class="element-label">Bosquet</span></div>
                                <div class="element" data-type="tower">🗼<span class="element-label">Tour</span></div>
                                <div class="element" data-type="well">🪣<span class="element-label">Puits</span></div>
                                <div class="element" data-type="animals">🐄<span class="element-label">Bétail</span></div>
                                <div class="element" data-type="path">🛤️<span class="element-label">Sentier</span></div>
                            </div>
                        </div>

                        <div class="validate-section">
                            <button class="validate-btn" id="validateBtn">✨ Valider ma Carte</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="result-modal" id="resultModal">
        <div class="result-content">
            <h2>🎯 Résultat</h2>
            <div class="score" id="scoreDisplay"></div>
            <p class="score-message" id="scoreMessage"></p>
            <div class="encrypted-message" id="encryptedMessage"></div>
            <button class="close-btn" id="closeBtn">Recommencer</button>
        </div>
    </div>

    <script>
        // Solution correcte (grille 4x4)
        const correctMap = {
            '0-0': 'mountain', '0-1': 'river', '0-2': 'forest', '0-3': 'village',
            '1-0': 'tower', '1-1': 'bridge', '1-2': 'path', '1-3': 'church',
            '2-0': 'animals', '2-1': 'mill', '2-2': 'house', '2-3': 'well',
            '3-0': 'field', '3-1': 'trees', '3-2': 'market', '3-3': 'ruins'
        };

        const playerMap = {};
        let currentSlide = 0;
        let draggedElement = null;
        let draggedFromCell = null;
        let touchStartX = 0;
        let touchStartY = 0;
        let dragGhost = null;

        // Créer la grille 4x4
        const mapGrid = document.getElementById('mapGrid');
        for (let i = 0; i < 16; i++) {
            const cell = document.createElement('div');
            cell.className = 'map-cell';
            cell.dataset.row = Math.floor(i / 4);
            cell.dataset.col = i % 4;
            mapGrid.appendChild(cell);
        }

        // Navigation entre slides
        const slides = document.getElementById('slides');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const pageIndicator = document.getElementById('pageIndicator');

        function updateSlide() {
            slides.style.transform = `translateX(-${currentSlide * 100}%)`;
            prevBtn.disabled = currentSlide === 0;
            nextBtn.disabled = currentSlide === 1;
            
            if (currentSlide === 0) {
                pageIndicator.textContent = 'Page 1/2 - Descriptions';
            } else {
                pageIndicator.textContent = 'Page 2/2 - Carte';
            }
        }

        prevBtn.addEventListener('click', () => {
            if (currentSlide > 0) {
                currentSlide--;
                updateSlide();
            }
        });

        nextBtn.addEventListener('click', () => {
            if (currentSlide < 1) {
                currentSlide++;
                updateSlide();
            }
        });

        // Support tactile pour drag & drop
        function createDragGhost(emoji) {
            const ghost = document.createElement('div');
            ghost.className = 'drag-ghost';
            ghost.textContent = emoji;
            document.body.appendChild(ghost);
            return ghost;
        }

        // Touch handlers pour les éléments
        document.querySelectorAll('.element').forEach(element => {
            element.addEventListener('touchstart', (e) => {
                if (element.classList.contains('used')) return;
                
                e.preventDefault();
                draggedElement = element;
                draggedFromCell = null;
                element.classList.add('dragging');
                
                const emoji = element.textContent.trim().split('\n')[0];
                dragGhost = createDragGhost(emoji);
                
                const touch = e.touches[0];
                dragGhost.style.left = touch.clientX + 'px';
                dragGhost.style.top = touch.clientY + 'px';
            }, { passive: false });
        });

        document.addEventListener('touchmove', (e) => {
            if (!draggedElement || !dragGhost) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            dragGhost.style.left = touch.clientX + 'px';
            dragGhost.style.top = touch.clientY + 'px';
            
            // Highlight cell under touch
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            document.querySelectorAll('.map-cell').forEach(c => c.classList.remove('drag-over'));
            if (element && element.classList.contains('map-cell')) {
                element.classList.add('drag-over');
            }
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            if (!draggedElement) return;
            
            const touch = e.changedTouches[0];
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            
            if (element && element.classList.contains('map-cell')) {
                placeElement(element);
            }
            
            draggedElement.classList.remove('dragging');
            if (dragGhost) {
                dragGhost.remove();
                dragGhost = null;
            }
            document.querySelectorAll('.map-cell').forEach(c => c.classList.remove('drag-over'));
            draggedElement = null;
        });

        // Desktop drag & drop
        document.querySelectorAll('.element').forEach(element => {
            element.addEventListener('dragstart', (e) => {
                if (element.classList.contains('used')) {
                    e.preventDefault();
                    return;
                }
                draggedElement = element;
                draggedFromCell = null;
                element.classList.add('dragging');
            });

            element.addEventListener('dragend', () => {
                element.classList.remove('dragging');
            });
        });

        document.querySelectorAll('.map-cell').forEach(cell => {
            cell.addEventListener('dragover', (e) => {
                e.preventDefault();
                cell.classList.add('drag-over');
            });

            cell.addEventListener('dragleave', () => {
                cell.classList.remove('drag-over');
            });

            cell.addEventListener('drop', (e) => {
                e.preventDefault();
                cell.classList.remove('drag-over');
                if (draggedElement) {
                    placeElement(cell);
                }
            });
        });

        function placeElement(cell) {
            const row = cell.dataset.row;
            const col = cell.dataset.col;
            const key = `${row}-${col}`;

            // Retirer ancien élément si existant
            if (cell.querySelector('.placed-element')) {
                const oldElement = cell.querySelector('.placed-element');
                const oldType = oldElement.dataset.type;
                delete playerMap[key];
                
                document.querySelectorAll('.element').forEach(el => {
                    if (el.dataset.type === oldType && el.classList.contains('used')) {
                        el.classList.remove('used');
                    }
                });
            }

            if (draggedFromCell) {
                delete playerMap[draggedFromCell];
            }

            const type = draggedElement.dataset.type;
            const emoji = draggedElement.textContent.trim().split('\n')[0];
            
            cell.innerHTML = `<span class="placed-element" data-type="${type}">${emoji}</span>`;
            cell.classList.add('has-element');
            playerMap[key] = type;

            if (!draggedFromCell) {
                draggedElement.classList.add('used');
            }

            // Support pour déplacer les éléments placés
            const placedElement = cell.querySelector('.placed-element');
            placedElement.addEventListener('touchstart', (e) => {
                e.preventDefault();
                draggedElement = document.querySelector(`.element[data-type="${type}"]`);
                draggedFromCell = key;
                const emoji = placedElement.textContent;
                dragGhost = createDragGhost(emoji);
                const touch = e.touches[0];
                dragGhost.style.left = touch.clientX + 'px';
                dragGhost.style.top = touch.clientY + 'px';
            }, { passive: false });
        }

        // Validation
        document.getElementById('validateBtn').addEventListener('click', () => {
            const placedCount = Object.keys(playerMap).length;
            
            if (placedCount === 0) {
                alert('Veuillez placer au moins un élément !');
                return;
            }

            let correctPlacements = 0;
            const totalCorrect = 16;

            for (let key in correctMap) {
                if (playerMap[key] === correctMap[key]) {
                    correctPlacements++;
                }
            }

            const score = Math.round((correctPlacements / totalCorrect) * 100);
            
            const messages = {
                90: "Fydqmmfou! Mf dpef: DBSUPHSBQIF.EJWJO.NBJUSF - Wvpvt êuft ejwjo!",
                70: "Usès cjfo! Tfdsfu: FYQMPSF.TBHF.DIBSUF - Tbhfttf sfnbsrvbcmf!",
                50: "Dpssfdu! Joejdf: QBSDPVST.GPSUOVF.OPSF - Dpoujovf{ bjotj!",
                30: "Effcvu! Hjqqjdf: OPSF.PVFTU.NZTUFFSF - Sffybnjof{ mft joejdft!",
                0: "Fouubujwf! Dpef: DBSUF.SFOWFSTF.DIPNJFOG - Sfupvsof{ bvy cbtft!"
            };

            let encryptedMsg = messages[0];
            if (score >= 90) encryptedMsg = messages[90];
            else if (score >= 70) encryptedMsg = messages[70];
            else if (score >= 50) encryptedMsg = messages[50];
            else if (score >= 30) encryptedMsg = messages[30];

            let scoreMsg = "";
            if (score >= 90) scoreMsg = "Exceptionnel ! Cartographe légendaire !";
            else if (score >= 70) scoreMsg = "Très bien ! Sens de l'orientation remarquable !";
            else if (score >= 50) scoreMsg = "Correct ! Quelques ajustements nécessaires.";
            else if (score >= 30) scoreMsg = "Potentiel présent, révision nécessaire...";
            else scoreMsg = "Le chemin est encore long, courage !";

            document.getElementById('scoreDisplay').textContent = `${score}%`;
            document.getElementById('scoreMessage').textContent = scoreMsg;
            document.getElementById('encryptedMessage').innerHTML = `
                <strong>📜 Message Crypté :</strong><br><br>
                ${encryptedMsg}<br><br>
                <small style="color: #7f8c8d;">Indice : César (-1)</small>
            `;

            document.getElementById('resultModal').classList.add('show');
        });

        document.getElementById('closeBtn').addEventListener('click', () => {
            location.reload();
        });
    </script>
</body>
</html>
