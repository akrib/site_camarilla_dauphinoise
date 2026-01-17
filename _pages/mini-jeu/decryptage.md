---
layout: page
title: "decryptage"
permalink: /mini-jeu/decryptage/
---
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jeu de Déchiffrement</title>
    <style>
        * {
            box-sizing: border-box;
        }

        body {
            font-family: 'Courier New', monospace;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 10px;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .container {
            background: white;
            border-radius: 15px;
            padding: 15px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            max-width: 1200px;
            width: 100%;
        }

        h1 {
            text-align: center;
            color: #667eea;
            margin-bottom: 20px;
            font-size: 24px;
        }

        .alphabet-container {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 4px;
            margin-bottom: 20px;
            padding: 0 5px;
        }

        .letter-box {
            width: 30px;
            height: 30px;
            border: 2px solid #667eea;
            border-radius: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
            background: white;
            position: relative;
            flex-shrink: 0;
        }

        .letter-box:hover {
            background: #f0f0f0;
            transform: scale(1.1);
        }

        .letter-box.selected {
            background: #667eea;
            color: white;
            box-shadow: 0 0 15px rgba(102, 126, 234, 0.5);
        }

        .letter-box.mapped {
            background: #4ade80;
            color: white;
            border-color: #22c55e;
        }

        .spacer {
            height: 80px;
        }

        @media (min-width: 768px) {
            .container {
                padding: 30px;
            }

            h1 {
                font-size: 32px;
                margin-bottom: 30px;
            }

            .alphabet-container {
                gap: 8px;
                flex-wrap: nowrap;
            }

            .letter-box {
                width: 35px;
                height: 35px;
                font-size: 18px;
            }

            .spacer {
                height: 100px;
            }
        }

        .text-container {
            background: #f8f9fa;
            border: 2px solid #dee2e6;
            border-radius: 10px;
            padding: 15px;
            margin-top: 30px;
            line-height: 1.8;
            font-size: 14px;
            overflow-wrap: break-word;
        }

        @media (min-width: 768px) {
            .text-container {
                padding: 25px;
                margin-top: 40px;
                font-size: 16px;
            }
        }

        .cipher-letter {
            color: #dc2626;
            font-weight: bold;
            padding: 2px 4px;
            border-radius: 3px;
            background: #fee2e2;
        }

        .decoded-letter {
            color: #16a34a;
            font-weight: bold;
            padding: 2px 4px;
            border-radius: 3px;
            background: #dcfce7;
        }

        svg {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
        }

        .connection-line {
            stroke: #667eea;
            stroke-width: 2;
            fill: none;
            opacity: 0.7;
        }

        .mapping-display {
            margin-top: 15px;
            padding: 10px;
            background: #e0e7ff;
            border-radius: 8px;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            justify-content: center;
        }

        @media (min-width: 768px) {
            .mapping-display {
                margin-top: 20px;
                padding: 15px;
                gap: 10px;
            }
        }

        .mapping-item {
            background: white;
            padding: 6px 12px;
            border-radius: 5px;
            font-weight: bold;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            font-size: 14px;
        }

        @media (min-width: 768px) {
            .mapping-item {
                padding: 8px 15px;
            }
        }

        .controls {
            margin-top: 15px;
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
        }

        button {
            background: #667eea;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.3s;
        }

        @media (min-width: 768px) {
            button {
                font-size: 16px;
            }
        }

        button:hover {
            background: #5568d3;
        }

        .instructions {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px;
            margin-bottom: 15px;
            border-radius: 5px;
            font-size: 13px;
        }

        @media (min-width: 768px) {
            .instructions {
                padding: 15px;
                margin-bottom: 20px;
                font-size: 14px;
            }
        }

        .game-container {
            position: relative;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 Jeu de Déchiffrement</h1>
        
        <div class="instructions">
            <strong>Comment jouer :</strong> Cliquez sur une lettre chiffrée de l'alphabet du haut (du texte), puis sur la lettre déchiffrée correspondante de l'alphabet du bas. Le texte sera automatiquement déchiffré !
        </div>

        <div class="game-container">
            <svg id="connectionsSvg"></svg>
            
            <div id="alphabet1" class="alphabet-container"></div>
            
            <div class="spacer"></div>
            
            <div id="alphabet2" class="alphabet-container"></div>
        </div>

        <div class="mapping-display" id="mappingDisplay"></div>

        <div class="controls">
            <button onclick="resetMappings()">Réinitialiser</button>
            //<button onclick="showSolution()">Voir la solution</button>
        </div>

        <div class="text-container" id="cipherText"></div>
    </div>

    <script>
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        
        // Texte original
        const originalText = "FELICITATIONS VOUS RECEVEZ UN JETON UNIQUE MERCI DE PRESENTER CE TEXTE VERS UN HOTES DU LIEU POUR OBTENIR VOTRE JETON BONUS OFFERT";
        
        // Créer un chiffrement aléatoire
        let shuffledAlphabet = [...alphabet].sort(() => Math.random() - 0.5);
        let cipherMap = {};
        alphabet.forEach((letter, index) => {
            cipherMap[letter] = shuffledAlphabet[index];
        });

        // Chiffrer le texte
        function encryptText(text) {
            return text.split('').map(char => {
                if (cipherMap[char]) {
                    return cipherMap[char];
                }
                return char;
            }).join('');
        }

        const encryptedText = encryptText(originalText);
        
        let mappings = {}; // {lettre_chiffrée: lettre_déchiffrée}
        let reverseMappings = {}; // {lettre_déchiffrée: lettre_chiffrée} pour éviter les doublons
        let selectedFrom = null;
        let alphabet1Positions = {};
        let alphabet2Positions = {};

        // Créer les alphabets (inversés)
        function createAlphabets() {
            const alpha1 = document.getElementById('alphabet1');
            const alpha2 = document.getElementById('alphabet2');
            
            // Alphabet 1 (haut) = lettres chiffrées du texte
            alphabet.forEach((letter, index) => {
                const box1 = document.createElement('div');
                box1.className = 'letter-box';
                box1.textContent = letter;
                box1.dataset.letter = letter;
                box1.dataset.type = 'cipher';
                box1.onclick = () => selectLetter(letter, 'cipher', box1);
                alpha1.appendChild(box1);
            });

            // Alphabet 2 (bas) = lettres déchiffrées (originales)
            alphabet.forEach((letter, index) => {
                const box2 = document.createElement('div');
                box2.className = 'letter-box';
                box2.textContent = letter;
                box2.dataset.letter = letter;
                box2.dataset.type = 'original';
                box2.onclick = () => selectLetter(letter, 'original', box2);
                alpha2.appendChild(box2);
            });

            // Sauvegarder les positions après un court délai pour s'assurer que le DOM est rendu
            setTimeout(calculatePositions, 100);
        }

        function calculatePositions() {
            const boxes1 = document.querySelectorAll('#alphabet1 .letter-box');
            const boxes2 = document.querySelectorAll('#alphabet2 .letter-box');
            
            boxes1.forEach(box => {
                const rect = box.getBoundingClientRect();
                const container = document.querySelector('.game-container').getBoundingClientRect();
                alphabet1Positions[box.dataset.letter] = {
                    x: rect.left + rect.width / 2 - container.left,
                    y: rect.top + rect.height / 2 - container.top
                };
            });

            boxes2.forEach(box => {
                const rect = box.getBoundingClientRect();
                const container = document.querySelector('.game-container').getBoundingClientRect();
                alphabet2Positions[box.dataset.letter] = {
                    x: rect.left + rect.width / 2 - container.left,
                    y: rect.top + rect.height / 2 - container.top
                };
            });
        }

        function selectLetter(letter, type, element) {
            if (type === 'cipher') {
                // Sélection d'une lettre chiffrée (alphabet du haut)
                document.querySelectorAll('.letter-box').forEach(box => {
                    box.classList.remove('selected');
                });
                
                element.classList.add('selected');
                selectedFrom = letter;
            } else if (type === 'original') {
                // Sélection d'une lettre déchiffrée (alphabet du bas)
                if (selectedFrom) {
                    // Supprimer l'ancien mapping si la lettre chiffrée était déjà mappée
                    if (mappings[selectedFrom]) {
                        const oldOriginal = mappings[selectedFrom];
                        delete reverseMappings[oldOriginal];
                    }
                    
                    // Supprimer l'ancien mapping si cette lettre déchiffrée était déjà utilisée
                    if (reverseMappings[letter]) {
                        const oldCipher = reverseMappings[letter];
                        delete mappings[oldCipher];
                    }
                    
                    // Créer le nouveau mapping
                    mappings[selectedFrom] = letter;
                    reverseMappings[letter] = selectedFrom;
                    
                    // Réinitialiser la sélection
                    document.querySelectorAll('.letter-box').forEach(box => {
                        box.classList.remove('selected');
                    });
                    selectedFrom = null;
                    
                    updateDisplay();
                    drawConnections();
                }
            }
        }

        function updateDisplay() {
            // Mettre à jour les boîtes mappées
            document.querySelectorAll('.letter-box').forEach(box => {
                box.classList.remove('mapped');
                if (box.dataset.type === 'cipher' && mappings[box.dataset.letter]) {
                    box.classList.add('mapped');
                }
                if (box.dataset.type === 'original' && reverseMappings[box.dataset.letter]) {
                    box.classList.add('mapped');
                }
            });

            // Afficher le texte déchiffré
            displayText();
            
            // Afficher les mappings
            displayMappings();
        }

        function displayText() {
            const container = document.getElementById('cipherText');
            let html = '';
            
            for (let char of encryptedText) {
                if (alphabet.includes(char)) {
                    if (mappings[char]) {
                        html += `<span class="decoded-letter">${mappings[char]}</span>`;
                    } else {
                        html += `<span class="cipher-letter">${char}</span>`;
                    }
                } else {
                    html += char;
                }
            }
            
            container.innerHTML = html;
        }

        function displayMappings() {
            const container = document.getElementById('mappingDisplay');
            container.innerHTML = '';
            
            Object.entries(mappings).forEach(([cipher, original]) => {
                const item = document.createElement('div');
                item.className = 'mapping-item';
                item.textContent = `${cipher} → ${original}`;
                container.appendChild(item);
            });
        }

        function drawConnections() {
            const svg = document.getElementById('connectionsSvg');
            svg.innerHTML = '';

            Object.entries(mappings).forEach(([cipher, original]) => {
                if (alphabet1Positions[cipher] && alphabet2Positions[original]) {
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('class', 'connection-line');
                    line.setAttribute('x1', alphabet1Positions[cipher].x);
                    line.setAttribute('y1', alphabet1Positions[cipher].y);
                    line.setAttribute('x2', alphabet2Positions[original].x);
                    line.setAttribute('y2', alphabet2Positions[original].y);
                    svg.appendChild(line);
                }
            });
        }

        function resetMappings() {
            mappings = {};
            reverseMappings = {};
            selectedFrom = null;
            updateDisplay();
            drawConnections();
        }

        function showSolution() {
            // Inverser le cipherMap pour obtenir la solution
            mappings = {};
            reverseMappings = {};
            Object.entries(cipherMap).forEach(([original, cipher]) => {
                mappings[cipher] = original;
                reverseMappings[original] = cipher;
            });
            updateDisplay();
            drawConnections();
        }

        // Initialiser le jeu
        createAlphabets();
        displayText();

        // Recalculer les positions lors du redimensionnement
        window.addEventListener('resize', () => {
            calculatePositions();
            drawConnections();
        });
    </script>
</body>
</html>
