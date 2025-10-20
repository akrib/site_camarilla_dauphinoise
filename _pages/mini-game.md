---
layout: page
title: "Mini-jeu Hack — Enigmes"
permalink: /mini-game/
---
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AKRIB INDUSTRIES UNIFIED OPERATING SYSTEM</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'VT323', 'Courier New', monospace;
            background: #000;
            color: #33ff33;
            overflow-x: hidden;
            user-select: none;
        }

        .crt {
            animation: flicker 0.15s infinite;
        }

        @keyframes flicker {
            0% { opacity: 0.97; }
            50% { opacity: 1; }
            100% { opacity: 0.97; }
        }

        .scanline {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(
                to bottom,
                transparent 50%,
                rgba(0, 0, 0, 0.3) 51%
            );
            background-size: 100% 4px;
            pointer-events: none;
            z-index: 1000;
        }

        .terminal {
            padding: 20px;
            font-size: 18px;
            letter-spacing: 1px;
            line-height: 1.4;
            text-shadow: 0 0 5px #33ff33;
        }

        .header {
            border-bottom: 2px solid #33ff33;
            padding-bottom: 10px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .title {
            font-size: 16px;
            margin-bottom: 5px;
        }

        .hack-button {
            padding: 5px 15px;
            border: 2px solid #33ff33;
            background: transparent;
            color: #33ff33;
            font-family: inherit;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.2s;
            text-shadow: 0 0 5px #33ff33;
        }

        .hack-button:hover {
            background: #33ff33;
            color: #000;
            text-shadow: none;
        }

        .game-screen {
            max-width: 900px;
            margin: 0 auto;
        }

        .hidden {
            display: none;
        }

        .prompt-line {
            margin: 10px 0;
        }

        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        }

        .modal-content {
            background: #000;
            border: 3px solid #33ff33;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 0 30px rgba(51, 255, 51, 0.5);
        }

        .modal-title {
            font-size: 22px;
            margin-bottom: 20px;
            text-align: center;
            color: #ffff33;
        }

        .input-line {
            display: flex;
            align-items: center;
            margin: 20px 0;
        }

        .input-prefix {
            margin-right: 10px;
        }

        input {
            background: transparent;
            border: none;
            color: #33ff33;
            font-family: inherit;
            font-size: 18px;
            outline: none;
            flex: 1;
            caret-color: #33ff33;
            text-shadow: 0 0 5px #33ff33;
            border-bottom: 2px solid #33ff33;
            padding: 5px;
        }

        .modal-buttons {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }

        .button {
            flex: 1;
            padding: 10px 20px;
            border: 2px solid #33ff33;
            background: transparent;
            color: #33ff33;
            font-family: inherit;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
        }

        .button:hover {
            background: #33ff33;
            color: #000;
        }

        .button.cancel {
            border-color: #ff3333;
            color: #ff3333;
        }

        .button.cancel:hover {
            background: #ff3333;
            color: #000;
        }

        .cursor {
            display: inline-block;
            width: 10px;
            height: 20px;
            background: #33ff33;
            animation: blink 1s infinite;
        }

        @keyframes blink {
            0%, 49% { opacity: 1; }
            50%, 100% { opacity: 0; }
        }

        .game-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin: 20px 0;
        }

        .hex-column {
            font-family: 'Courier New', monospace;
            font-size: 16px;
        }

        .hex-line {
            margin: 2px 0;
            cursor: pointer;
            transition: background 0.1s;
        }

        .hex-line:hover {
            background: rgba(51, 255, 51, 0.2);
        }

        .hex-address {
            color: #33ff33;
            margin-right: 10px;
        }

        .word {
            display: inline-block;
            position: relative;
            transition: all 0.1s;
        }

        .word:hover {
            background: #33ff33;
            color: #000;
        }

        .word.correct {
            color: #000;
            background: #33ff33;
        }

        .sidebar {
            border-left: 2px solid #33ff33;
            padding-left: 20px;
        }

        .attempts {
            margin: 20px 0;
            font-size: 20px;
        }

        .attempt-box {
            display: inline-block;
            width: 15px;
            height: 15px;
            background: #33ff33;
            margin: 0 3px;
        }

        .attempt-box.used {
            background: transparent;
            border: 2px solid #33ff33;
        }

        .message-log {
            margin: 20px 0;
            min-height: 150px;
        }

        .log-entry {
            margin: 5px 0;
            animation: fadeIn 0.3s;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .success-message {
            color: #33ff33;
            font-size: 24px;
            text-align: center;
            margin: 30px 0;
            animation: pulse 1s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }

        .error-message {
            color: #ff3333;
            text-shadow: 0 0 5px #ff3333;
        }

        @media (max-width: 768px) {
            .terminal {
                font-size: 14px;
                padding: 10px;
            }

            .header {
                flex-direction: column;
                gap: 10px;
            }

            .game-container {
                grid-template-columns: 1fr;
                gap: 20px;
            }

            .sidebar {
                border-left: none;
                border-top: 2px solid #33ff33;
                padding-left: 0;
                padding-top: 20px;
            }

            .hex-column {
                font-size: 13px;
            }

            .modal-content {
                padding: 20px;
            }
        }
    </style>
</head>
<body class="crt">
    <div class="scanline"></div>
    
    <!-- Modal de hack -->
    <div id="hack-modal" class="modal hidden" style="display: none;">
        <div class="modal-content">
            <div class="modal-title">&gt;&gt;&gt; ACCES ADMINISTRATEUR &lt;&lt;&lt;</div>
            <div class="prompt-line">ENTREZ LE CODE D'ACCES:</div>
            <div class="input-line">
                <span class="input-prefix">&gt;</span>
                <input type="text" id="hack-input" placeholder="levelX">
            </div>
            <div id="hack-message" style="margin: 10px 0; text-align: center;"></div>
            <div class="modal-buttons">
                <button class="button" onclick="submitHackCode()">VALIDER</button>
                <button class="button cancel" onclick="closeHackModal()">ANNULER</button>
            </div>
        </div>
    </div>

    <div class="terminal">
        <div id="game-screen" class="game-screen">
            <div class="header">
                <div>
                    <div class="title">ROBCO INDUSTRIES (TM) TERMLINK PROTOCOL</div>
                    <div class="title" id="level-display">NIVEAU 1/11</div>
                </div>
                <button class="hack-button" onclick="openHackModal()">[ HACK ]</button>
            </div>

            <div id="enigme-display" class="prompt-line" style="margin: 20px 0; font-size: 20px;"></div>

            <div class="game-container">
                <div>
                    <div class="hex-column" id="hex-left"></div>
                </div>
                <div>
                    <div class="hex-column" id="hex-right"></div>
                </div>
            </div>

            <div class="sidebar">
                <div class="attempts" id="attempts-display"></div>
                <div class="message-log" id="message-log"></div>
            </div>

            <div id="success-screen" class="hidden">
                <div class="success-message">
                    &gt;&gt;&gt; ACCES ACCORDE &lt;&lt;&lt;
                </div>
                <div class="prompt-line" style="text-align: center; margin: 20px 0;">
                    NIVEAU COMPLETE !
                </div>
                <div class="button" onclick="nextLevel()" style="display: block; text-align: center; margin: 20px auto; width: 200px;">
                    NIVEAU SUIVANT
                </div>
            </div>

            <div id="final-clue" class="hidden">
                <div class="success-message">
                    &gt;&gt;&gt; SYSTEME ENTIEREMENT PIRATE &lt;&lt;&lt;
                </div>
                <div style="margin: 30px 0; font-size: 18px;">
                    <div class="prompt-line">FICHIER SECRET DEVERROUILLE...</div>
                    <div class="prompt-line"></div>
                    <div class="prompt-line">INDICE FINAL:</div>
                    <div class="prompt-line" style="color: #ffff33;">"LE TRESOR SE TROUVE LA OU LES ETOILES</div>
                    <div class="prompt-line" style="color: #ffff33;">RENCONTRENT LA TERRE"</div>
                    <div class="prompt-line"></div>
                    <div class="prompt-line" style="color: #ffff33;">COORDONNEES: 48.8584° N, 2.2945° E</div>
                </div>
                <div class="button" onclick="restart()">RECOMMENCER</div>
            </div>

            <div class="button" onclick="restart()">REINITIALISER</div>
        </div>
    </div>

    <script>
        const hackPasswords = {
            'alpha7': 1,
            'bravo9': 2,
            'charlie5': 3,
            'delta3': 4,
            'echo8': 5,
            'foxtrot2': 6,
            'golf6': 7,
            'hotel4': 8,
            'india1': 9,
            'juliet0': 10,
            'kilo99': 11
        };

        const enigmes = [
            { 
                question: "NIVEAU 1/11: PREMIER NOMBRE PREMIER", 
                answer: "DEUX",
                decoys: ["UN", "TROIS", "CINQ", "SEPT", "ONZE", "ZERO", "QUATRE", "NEUF", "HIBOU", "PARIS", "LUNE", "ROUGE", "CHAT", "SOLEIL", "OCEAN", "VENT", "FLAMME", "PIERRE"]
            },
            { 
                question: "NIVEAU 2/11: FIBONACCI 1,1,2,3,5,8,?", 
                answer: "TREIZE",
                decoys: ["QUINZE", "DOUZE", "VINGT", "DIX", "SEIZE", "NEUF", "ONZE", "HUIT", "SEPT", "CINQ", "TROIS", "UN", "ZERO", "DEUX", "QUATRE", "SIX", "QUATORZE", "DIXSEPT"]
            },
            { 
                question: "NIVEAU 3/11: BINAIRE 1010 EN DECIMAL", 
                answer: "DIX",
                decoys: ["ONZE", "DOUZE", "HUIT", "NEUF", "SEPT", "TREIZE", "QUINZE", "SEIZE", "CINQ", "VINGT", "SIX", "QUATRE", "TROIS", "QUATORZE", "DEUX", "UN", "ZERO", "DIX-SEPT"]
            },
            { 
                question: "NIVEAU 4/11: HEXADECIMAL 0xFF EN DECIMAL", 
                answer: "DEUXCENTCINQUANTECINQ",
                decoys: ["CENTVINGT", "DEUXCENTS", "TROISCENTS", "CINQUANTE", "QUATRECENTS", "SOIXANTE", "CENT", "MILLE", "CINQCENTS", "QUATRE-VINGT", "TRENTE", "QUARANTE", "VINGT", "DIX", "QUINZE", "DEUX-CENT-CINQUANTE", "TROIS-CENT-DIX", "CENT-CINQUANTE"]
            },
            { 
                question: "NIVEAU 5/11: BITS DANS UN OCTET", 
                answer: "HUIT",
                decoys: ["SEIZE", "TRENTE-DEUX", "SOIXANTE-QUATRE", "QUATRE", "DIX", "DEUX", "UN", "CENT", "DOUZE", "VINGT", "SIX", "TROIS", "CINQ", "NEUF", "SEPT", "ONZE", "QUATORZE", "QUINZE"]
            },
            { 
                question: "NIVEAU 6/11: PORT HTTPS PAR DEFAUT", 
                answer: "QUATRECENTQUARANTETROIS",
                decoys: ["QUATREVINGTS", "HUITCENTS", "VINGT-DEUX", "TRENTE", "CINQUANTE", "SOIXANTE", "QUATRECENTS", "DEUXMILLE", "MILLE", "CENT", "DEUX-CENTS", "TROIS-CENTS", "SIX-CENTS", "SEPT-CENTS", "CINQ-CENTS", "NEUF-CENTS", "CENT-VINGT", "DEUX-CENT-DIX"]
            },
            { 
                question: "NIVEAU 7/11: CODE ASCII DE LA LETTRE A", 
                answer: "SOIXANTECINQ",
                decoys: ["CINQUANTE", "QUATRE-VINGTS", "SOIXANTE-DIX", "QUARANTE-CINQ", "TRENTE-DEUX", "CINQUANTE-SEPT", "SOIXANTE", "SOIXANTE-DOUZE", "QUARANTE-HUIT", "CINQUANTE-DEUX", "TRENTE-HUIT", "VINGT-SIX", "QUATRE-VINGT-DIX", "SOIXANTE-TREIZE", "CENT-DIX", "CENT-VINGT", "QUATRE-VINGT-CINQ", "QUARANTE-DEUX"]
            },
            { 
                question: "NIVEAU 8/11: ROT13 DE URYYB", 
                answer: "HELLO",
                decoys: ["BONJOUR", "SALUT", "BONSOIR", "ADIEU", "MERCI", "WORLD", "PYTHON", "LINUX", "WINDOWS", "APPLE", "GOOGLE", "ORACLE", "CISCO", "ADOBE", "AMAZON", "GITHUB", "DOCKER", "REDIS"]
            },
            { 
                question: "NIVEAU 9/11: DEUX PUISSANCE DIX", 
                answer: "MILLEVINGTQUATRE",
                decoys: ["MILLE", "DEUXMILLE", "CINQCENTS", "HUITCENTS", "TROISMILLE", "CINQMILLE", "DIXMILLE", "NEUFCENTS", "SEPTCENTS", "QUATREMILLE", "SIXMILLE", "HUITCENTSVINGT", "MILLEDEUX", "NEUFCENTQUATRE", "SEPTCENTCINQUANTE", "SIXCENTQUARANTE", "HUITCENTSOIXANTE", "DEUXCENTCINQUANTE"]
            },
            { 
                question: "NIVEAU 10/11: PYTHON LEN([1,2,3])", 
                answer: "TROIS",
                decoys: ["UN", "DEUX", "QUATRE", "CINQ", "SIX", "SEPT", "HUIT", "NEUF", "DIX", "ZERO", "ONZE", "DOUZE", "QUINZE", "VINGT", "CENT", "MILLE", "LISTE", "ARRAY"]
            },
            { 
                question: "NIVEAU 11/11: CENT MODULO SEPT", 
                answer: "DEUX",
                decoys: ["UN", "TROIS", "QUATRE", "CINQ", "SIX", "SEPT", "ZERO", "HUIT", "NEUF", "DIX", "ONZE", "DOUZE", "TREIZE", "QUATORZE", "QUINZE", "SEIZE", "VINGT", "CENT"]
            }
        ];

        let currentLevel = 1;
        let maxUnlockedLevel = 1;
        let attempts = 4;
        let words = [];
        let correctWord = '';

        function loadProgress() {
            const saved = localStorage.getItem('hackGameProgress');
            if (saved) {
                const data = JSON.parse(saved);
                maxUnlockedLevel = data.maxUnlockedLevel || 1;
                currentLevel = data.currentLevel || 1;
            }
        }

        function saveProgress() {
            localStorage.setItem('hackGameProgress', JSON.stringify({
                maxUnlockedLevel: maxUnlockedLevel,
                currentLevel: currentLevel
            }));
        }

        function openHackModal() {
            const modal = document.getElementById('hack-modal');
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            document.getElementById('hack-input').focus();
            document.getElementById('hack-message').innerHTML = '';
        }

        function closeHackModal() {
            const modal = document.getElementById('hack-modal');
            modal.classList.add('hidden');
            modal.style.display = 'none';
            document.getElementById('hack-input').value = '';
            document.getElementById('hack-message').innerHTML = '';
        }

        function submitHackCode() {
            const input = document.getElementById('hack-input').value.toLowerCase().trim();
            const messageDiv = document.getElementById('hack-message');

            // Si le champ est vide, retourner au niveau actuel
            if (input === '') {
                messageDiv.innerHTML = '<div style="color: #ffff33;">&gt; RETOUR AU NIVEAU ACTUEL</div>';
                setTimeout(() => {
                    closeHackModal();
                    loadLevel();
                }, 800);
                return;
            }

            if (hackPasswords.hasOwnProperty(input)) {
                const targetLevel = hackPasswords[input];
                messageDiv.innerHTML = '<div style="color: #33ff33;">&gt; CODE ACCEPTE</div>';
                
                setTimeout(() => {
                    currentLevel = targetLevel;
                    maxUnlockedLevel = Math.max(maxUnlockedLevel, targetLevel);
                    saveProgress();
                    loadLevel();
                    closeHackModal();
                }, 1000);
            } else {
                messageDiv.innerHTML = '<div class="error-message">&gt; CODE INVALIDE</div>';
            }
        }

        document.getElementById('hack-input').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                submitHackCode();
            }
        });

        function generateHexAddress() {
            return '0x' + Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
        }

        function generateRandomChars(length) {
            const chars = '!@#$%^&*(){}[]<>?/|;:.,';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars[Math.floor(Math.random() * chars.length)];
            }
            return result;
        }

        function updateLevelDisplay() {
            document.getElementById('level-display').textContent = `NIVEAU ${currentLevel}/11`;
        }

        function loadLevel() {
            if (currentLevel > 11) {
                showFinalClue();
                return;
            }

            attempts = 4;
            const enigme = enigmes[currentLevel - 1];
            correctWord = enigme.answer;
            
            document.getElementById('enigme-display').textContent = enigme.question;
            document.getElementById('success-screen').classList.add('hidden');
            
            generateWords(enigme.decoys);
            displayHexDump();
            updateAttempts();
            clearMessageLog();
            updateLevelDisplay();
        }

        function generateWords(decoys) {
            words = [...decoys];
            const randomIndex = Math.floor(Math.random() * words.length);
            words[randomIndex] = correctWord;
        }

        function displayHexDump() {
            const leftColumn = document.getElementById('hex-left');
            const rightColumn = document.getElementById('hex-right');
            
            leftColumn.innerHTML = '';
            rightColumn.innerHTML = '';
            
            const wordsPerColumn = Math.ceil(words.length / 2);
            
            for (let i = 0; i < words.length; i++) {
                const column = i < wordsPerColumn ? leftColumn : rightColumn;
                const address = generateHexAddress();
                const preChars = generateRandomChars(Math.floor(Math.random() * 3) + 1);
                const postChars = generateRandomChars(Math.floor(Math.random() * 3) + 1);
                
                const line = document.createElement('div');
                line.className = 'hex-line';
                line.innerHTML = `<span class="hex-address">${address}</span>${preChars}<span class="word" onclick="selectWord('${words[i]}')">${words[i]}</span>${postChars}`;
                
                column.appendChild(line);
            }
        }

        function selectWord(word) {
            if (attempts <= 0) return;

            if (word === correctWord) {
                logMessage('&gt; EXACT MATCH!');
                logMessage('&gt; ACCES ACCORDE');
                document.querySelectorAll('.word').forEach(w => {
                    if (w.textContent === correctWord) {
                        w.classList.add('correct');
                    }
                });
                setTimeout(() => {
                    document.getElementById('success-screen').classList.remove('hidden');
                }, 1000);
            } else {
                attempts--;
                const likeness = calculateLikeness(word, correctWord);
                logMessage(`&gt; ACCES REFUSE`);
                logMessage(`&gt; RESSEMBLANCE=${likeness}/${correctWord.length}`);
                updateAttempts();
                
                if (attempts === 0) {
                    lockout();
                }
            }
        }

        function calculateLikeness(word1, word2) {
            let count = 0;
            const minLength = Math.min(word1.length, word2.length);
            for (let i = 0; i < minLength; i++) {
                if (word1[i] === word2[i]) count++;
            }
            return count;
        }

        function updateAttempts() {
            const attemptsDisplay = document.getElementById('attempts-display');
            let html = 'TENTATIVES RESTANTES: ';
            for (let i = 0; i < 4; i++) {
                html += `<span class="attempt-box ${i >= attempts ? 'used' : ''}"></span>`;
            }
            attemptsDisplay.innerHTML = html;
        }

        function logMessage(message) {
            const log = document.getElementById('message-log');
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.innerHTML = message;
            log.appendChild(entry);
            log.scrollTop = log.scrollHeight;
        }

        function clearMessageLog() {
            document.getElementById('message-log').innerHTML = '';
        }

        function lockout() {
            logMessage('<div class="error-message">&gt;&gt;&gt; TERMINAL VERROUILLE &lt;&lt;&lt;</div>');
            logMessage('<div class="prompt-line">&gt; REINITIALISATION DU NIVEAU...</div>');
            document.querySelectorAll('.word').forEach(w => {
                w.style.pointerEvents = 'none';
            });
            setTimeout(() => {
                loadLevel();
            }, 3000);
        }

        function nextLevel() {
            currentLevel++;
            if (currentLevel > maxUnlockedLevel) {
                maxUnlockedLevel = currentLevel;
                saveProgress();
            }
            loadLevel();
        }

        function showFinalClue() {
            document.getElementById('enigme-display').style.display = 'none';
            document.querySelector('.game-container').style.display = 'none';
            document.querySelector('.sidebar').style.display = 'none';
            document.querySelector('.button[onclick="restart()"]').style.display = 'none';
            document.getElementById('final-clue').classList.remove('hidden');
        }

        function restart() {
            currentLevel = 1;
            saveProgress();
            loadLevel();
            document.getElementById('enigme-display').style.display = 'block';
            document.querySelector('.game-container').style.display = 'grid';
            document.querySelector('.sidebar').style.display = 'block';
            document.querySelector('.button[onclick="restart()"]').style.display = 'inline-block';
            document.getElementById('final-clue').classList.add('hidden');
        }

        loadProgress();
        loadLevel();
    </script>
</body>
</html>
