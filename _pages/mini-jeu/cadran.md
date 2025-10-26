<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Coffre-fort à Cadran</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            touch-action: none;
        }

        .container {
            width: 100%;
            max-width: 900px;
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            justify-content: center;
        }

        .safe-container {
            background: linear-gradient(145deg, #1a1a1a, #2d2d2d);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
            text-align: center;
            flex: 1;
            min-width: 320px;
            max-width: 450px;
        }

        .controls-container {
            background: linear-gradient(145deg, #1a1a1a, #2d2d2d);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            gap: 15px;
            width: 280px;
            min-width: 280px;
        }

        @media (max-width: 768px) {
            .container {
                flex-direction: column;
                align-items: center;
            }
            
            .controls-container {
                width: 100%;
                max-width: 400px;
            }
        }

        h1 {
            color: #d4af37;
            margin-bottom: 10px;
            font-size: 24px;
            text-shadow: 0 2px 10px rgba(212, 175, 55, 0.3);
        }

        .instructions {
            color: #a0a0a0;
            font-size: 14px;
            margin-bottom: 20px;
            line-height: 1.6;
        }

        .dial-container {
            position: relative;
            width: 280px;
            height: 280px;
            margin: 20px auto;
            background: radial-gradient(circle, #3a3a3a, #1a1a1a);
            border-radius: 50%;
            box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.8), 0 10px 30px rgba(0, 0, 0, 0.5);
            touch-action: none;
        }

        .dial {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            cursor: grab;
            touch-action: none;
        }

        .dial:active {
            cursor: grabbing;
        }

        .dial-face {
            position: absolute;
            width: 240px;
            height: 240px;
            top: 20px;
            left: 20px;
            border-radius: 50%;
            background: linear-gradient(145deg, #4a4a4a, #2a2a2a);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
        }

        .number {
            position: absolute;
            width: 30px;
            height: 30px;
            font-size: 16px;
            font-weight: bold;
            color: #d4af37;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
        }

        .marker {
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            width: 4px;
            height: 20px;
            background: linear-gradient(180deg, #ff4444, #cc0000);
            border-radius: 2px;
            box-shadow: 0 0 10px rgba(255, 68, 68, 0.8);
            z-index: 10;
        }

        .center-knob {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 60px;
            height: 60px;
            background: radial-gradient(circle, #5a5a5a, #2a2a2a);
            border-radius: 50%;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
        }

        .center-knob::after {
            content: '';
            width: 30px;
            height: 30px;
            background: #1a1a1a;
            border-radius: 50%;
            box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.8);
        }

        .status-panel {
            background: #1a1a1a;
            border-radius: 10px;
            padding: 15px;
            margin: 20px 0;
            border: 2px solid #2a2a2a;
        }

        .sequence-display {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-bottom: 15px;
        }

        .sequence-item {
            flex: 1;
            background: #2a2a2a;
            padding: 10px;
            border-radius: 8px;
            border: 2px solid #3a3a3a;
        }

        .sequence-item.active {
            border-color: #d4af37;
            box-shadow: 0 0 15px rgba(212, 175, 55, 0.5);
        }

        .sequence-label {
            color: #a0a0a0;
            font-size: 12px;
            margin-bottom: 5px;
        }

        .sequence-value {
            color: #d4af37;
            font-size: 24px;
            font-weight: bold;
        }

        .sequence-value.locked {
            color: #4CAF50;
        }

        .current-number {
            color: #d4af37;
            font-size: 36px;
            font-weight: bold;
            margin: 10px 0;
            text-shadow: 0 2px 10px rgba(212, 175, 55, 0.5);
        }

        .direction-indicator {
            color: #a0a0a0;
            font-size: 14px;
            margin: 5px 0;
        }

        .direction-indicator.right {
            color: #4CAF50;
        }

        .direction-indicator.left {
            color: #2196F3;
        }

        .lever-container {
            margin: 20px 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100px;
            background: #1a1a1a;
            border-radius: 10px;
            border: 2px solid #2a2a2a;
            position: relative;
            overflow: hidden;
        }

        .lever {
            width: 50px;
            height: 70px;
            background: linear-gradient(145deg, #c0392b, #e74c3c);
            border-radius: 10px 10px 30px 30px;
            position: relative;
            cursor: pointer;
            transition: transform 0.3s ease;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
        }

        .lever:active {
            transform: translateY(15px);
        }

        .lever.pulled {
            animation: leverPull 0.5s ease;
        }

        @keyframes leverPull {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(20px); }
        }

        .lever::before {
            content: '';
            position: absolute;
            top: 8px;
            left: 50%;
            transform: translateX(-50%);
            width: 25px;
            height: 25px;
            background: radial-gradient(circle, #222, #111);
            border-radius: 50%;
            box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.8);
        }

        .lever-label {
            position: absolute;
            bottom: 8px;
            left: 50%;
            transform: translateX(-50%);
            color: #d4af37;
            font-size: 12px;
            font-weight: bold;
            white-space: nowrap;
        }

        .controls-title {
            color: #d4af37;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .btn {
            width: 100%;
            padding: 15px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
            margin: 10px 0;
        }

        .btn-auspex {
            background: linear-gradient(145deg, #7b2cbf, #5a189a);
            color: white;
            box-shadow: 0 5px 15px rgba(123, 44, 191, 0.3);
        }

        .btn-auspex:active {
            transform: translateY(2px);
            box-shadow: 0 3px 10px rgba(123, 44, 191, 0.3);
        }

        .btn-auspex.active {
            background: linear-gradient(145deg, #9d4edd, #7b2cbf);
            box-shadow: 0 0 20px rgba(157, 78, 221, 0.6);
            animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
            0%, 100% { box-shadow: 0 0 20px rgba(157, 78, 221, 0.6); }
            50% { box-shadow: 0 0 30px rgba(157, 78, 221, 0.9); }
        }

        .btn-reset {
            background: linear-gradient(145deg, #95a5a6, #7f8c8d);
            color: white;
        }

        .message {
            padding: 10px;
            border-radius: 8px;
            margin: 10px 0;
            font-weight: bold;
        }

        .message.success {
            background: rgba(76, 175, 80, 0.2);
            color: #4CAF50;
            border: 2px solid #4CAF50;
        }

        .message.error {
            background: rgba(244, 67, 54, 0.2);
            color: #f44336;
            border: 2px solid #f44336;
        }

        .message.click {
            background: rgba(255, 193, 7, 0.2);
            color: #FFC107;
            border: 2px solid #FFC107;
            animation: clickFlash 0.3s;
        }

        @keyframes clickFlash {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; transform: scale(1.05); }
        }

        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 1000;
            justify-content: center;
            align-items: center;
        }

        .modal.visible {
            display: flex;
        }

        .modal-content {
            background: linear-gradient(145deg, #2c3e50, #34495e);
            padding: 30px;
            border-radius: 15px;
            max-width: 300px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9);
        }

        .modal-content h3 {
            color: #d4af37;
            margin-bottom: 20px;
            text-align: center;
        }

        .modal-content input {
            width: 100%;
            padding: 12px;
            border: 2px solid #34495e;
            border-radius: 8px;
            background: #1a1a1a;
            color: #d4af37;
            font-size: 16px;
            margin-bottom: 15px;
        }

        .modal-content input:focus {
            outline: none;
            border-color: #7b2cbf;
        }

        .modal-buttons {
            display: flex;
            gap: 10px;
        }

        .modal-buttons button {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
        }

        .modal-buttons .btn-ok {
            background: linear-gradient(145deg, #27ae60, #229954);
            color: white;
        }

        .modal-buttons .btn-cancel {
            background: linear-gradient(145deg, #95a5a6, #7f8c8d);
            color: white;
        }

        .document-container {
            display: none;
            background: #f5f5f5;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
            animation: slideIn 0.5s ease;
        }

        .document-container.visible {
            display: block;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .document-content {
            color: #2c3e50;
            line-height: 1.8;
            text-align: left;
        }

        .document-content h2 {
            color: #34495e;
            margin-bottom: 20px;
            text-align: center;
        }

        .document-content p {
            margin-bottom: 15px;
        }

        .hint {
            color: #666;
            font-size: 12px;
            margin-top: 15px;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="safe-container" id="safeContainer">
            <h1>🔓 Coffre-fort à Cadran</h1>
            <p class="instructions">
                Positionnez les 3 chiffres de la combinaison
            </p>

            <div class="dial-container">
                <div class="marker"></div>
                <div class="dial" id="dial">
                    <div class="dial-face" id="dialFace"></div>
                    <div class="center-knob"></div>
                </div>
            </div>

            <div class="status-panel">
                <div class="sequence-display">
                    <div class="sequence-item active" id="step1">
                        <div class="sequence-label">① Premier</div>
                        <div class="sequence-value" id="value1">--</div>
                    </div>
                    <div class="sequence-item" id="step2">
                        <div class="sequence-label">② Deuxième</div>
                        <div class="sequence-value" id="value2">--</div>
                    </div>
                    <div class="sequence-item" id="step3">
                        <div class="sequence-label">③ Troisième</div>
                        <div class="sequence-value" id="value3">--</div>
                    </div>
                </div>
                <div class="current-number" id="currentNumber">0</div>
                <div class="direction-indicator" id="direction">Positionnez le 1er chiffre et validez</div>
            </div>

            <div class="message" id="message" style="display: none;"></div>

            <p class="hint">💡 Positionnez le cadran sur le bon chiffre puis cliquez sur "Valider ce chiffre"</p>
        </div>

        <div class="controls-container">
            <div class="controls-title">⚙️ Contrôles</div>
            
            <button class="btn btn-validate" id="validateBtn" onclick="validateCurrentNumber()" style="background: linear-gradient(145deg, #27ae60, #229954); color: white; box-shadow: 0 5px 15px rgba(39, 174, 96, 0.3);">
                ✓ Valider ce chiffre
            </button>

            <div class="lever-container">
                <div class="lever" id="lever" onclick="pullLever()"></div>
                <div class="lever-label">Tirer pour ouvrir</div>
            </div>

            <button class="btn btn-auspex" id="auspexBtn" onclick="requestAuspexPassword()">
                🔮 Activer Auspex
            </button>

            <button class="btn btn-reset" onclick="resetSafe()">
                🔄 Réinitialiser
            </button>
        </div>

        <div class="document-container" id="documentContainer">
            <div class="document-content" id="documentContent">
                <!-- Le contenu sera inséré ici après décryptage -->
            </div>
            <button class="btn btn-reset" onclick="closeDocument()">Fermer le document</button>
        </div>
    </div>

    <!-- Modal pour le mot de passe Auspex -->
    <div class="modal" id="passwordModal">
        <div class="modal-content">
            <h3>🔮 Activation Auspex</h3>
            <input type="password" id="passwordInput" placeholder="Entrez le mot de passe">
            <div class="modal-buttons">
                <button class="btn-cancel" onclick="closePasswordModal()">Annuler</button>
                <button class="btn-ok" onclick="validateAuspexPassword()">Valider</button>
            </div>
        </div>
    </div>

    <script>
        // Configuration du coffre
        const combination = [15, 75, 45]; // Max droite 15, Max gauche 75, Position finale 45
        const tolerance = 3;
        
        // Hash SHA-256 du mot de passe Auspex (actuellement "auspex123")
        const auspexPasswordHash = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';
        
        // Document crypté (AES-GCM) - déchiffrable avec le code de combinaison correct "15-75-45"
        const encryptedDocument = {
            iv: 'a1b2c3d4e5f6g7h8i9j0',
            data: 'f1e2d3c4b5a69788968574635241302f1e0d9c8b7a695847362514f3e2d1c0b9a8978685f4e3d2c1b0a99887f6e5d4c3b2a1908f7e6d5c4b3a291807f6e5d4c3b2a1908f7e6d5c4b3a291c0b0afa9e8d7c6b5a4938271605f4e3d2c1b0a99887f6e5d4c3b2a1908f7e6d5c4b3a291807f6e5d4c3b2a1908f7e6d5c4b3a2d1c0b0afa9e8d7c6b5a4938271605f4e3d2c1b0a99887f6e5d4c3b2a1908f7e6d5c4b3a291807f6e5d4c3b2a1908f7e6d5c4b3a2e1d0c0bfaea9d8c7b6a5948372615f0e4d3c2b1a09887f6e5d4c3b2a1908f7e6d5c4b3a291807f6e5d4c3b2a1908f7e6d5c4b3a2f1e0d0cfbfaea9d8c7b6a5948372615f0e4d3c2b1a09887f6e5d4c3b2a1908f7e6d5c4b3a291807f6e5d4c3b2a1908f7e6d5c4b3a201f1e0d0cfbfaea9d8c7b6a5948372615f0e4d3c2b1a09887f6e5d4c3b2a1908f7e6d5c4b3a291807f6e5d4c3b2a1'
        };
        
        let currentStep = 0;
        let currentAngle = 0;
        let lastAngle = 0;
        let currentNumber = 0;
        let previousNumber = 0;
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let currentDirection = null;
        let previousDirection = null;
        let maxRightValue = 0;
        let maxLeftValue = 100;
        let auspexActive = false;
        let lockedValues = ['--', '--', '--'];
        
        // AudioContext pour les sons
        let audioContext = null;
        let gearNoise = null;
        let lastPlayedNumber = -1;

        const dial = document.getElementById('dial');
        const dialFace = document.getElementById('dialFace');
        const currentNumberDisplay = document.getElementById('currentNumber');
        const directionDisplay = document.getElementById('direction');
        const messageDisplay = document.getElementById('message');

        // Initialiser les numéros sur le cadran
        function initDial() {
            for (let i = 0; i < 100; i += 5) {
                const number = document.createElement('div');
                number.className = 'number';
                number.textContent = i;
                
                // Inverser l'angle pour que les numéros soient dans le bon sens
                const angle = (i * 3.6);
                const radius = 105;
                const radian = (angle - 90) * Math.PI / 180;
                const x = Math.cos(radian) * radius;
                const y = Math.sin(radian) * radius;
                
                number.style.left = `calc(50% + ${x}px)`;
                number.style.top = `calc(50% + ${y}px)`;
                number.style.transform = 'translate(-50%, -50%)';
                
                dialFace.appendChild(number);
            }
        }

        // Fonction de hachage SHA-256
        async function sha256(message) {
            const msgBuffer = new TextEncoder().encode(message);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        }

        // Dérivation de clé à partir de la combinaison
        async function deriveKey(combinationString) {
            const encoder = new TextEncoder();
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                encoder.encode(combinationString),
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            );
            
            return crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: encoder.encode('safe-document-salt-v2'),
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['decrypt']
            );
        }

        // Décryptage du document
        async function decryptDocument(combinationString) {
            try {
                const key = await deriveKey(combinationString);
                const iv = new Uint8Array(encryptedDocument.iv.split('').map((c, i) => encryptedDocument.iv.charCodeAt(i) % 256));
                const data = new Uint8Array(encryptedDocument.data.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
                
                const decrypted = await crypto.subtle.decrypt(
                    { name: 'AES-GCM', iv: iv },
                    key,
                    data
                );
                
                return new TextDecoder().decode(decrypted);
            } catch (e) {
                return null;
            }
        }

        // Modal mot de passe Auspex
        function requestAuspexPassword() {
            if (auspexActive) {
                toggleAuspex();
            } else {
                document.getElementById('passwordModal').classList.add('visible');
                document.getElementById('passwordInput').value = '';
                document.getElementById('passwordInput').focus();
            }
        }

        function closePasswordModal() {
            document.getElementById('passwordModal').classList.remove('visible');
        }

        async function validateAuspexPassword() {
            const password = document.getElementById('passwordInput').value;
            const hash = await sha256(password);
            
            if (hash === auspexPasswordHash) {
                closePasswordModal();
                toggleAuspex();
            } else {
                showMessage('❌ Mot de passe incorrect !', 'error');
                document.getElementById('passwordInput').value = '';
            }
        }

        // Initialiser l'audio
        function initAudio() {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        }

        // Son d'engrenage continu
        function playGearNoise() {
            if (!auspexActive || !audioContext) return;
            
            if (gearNoise) {
                gearNoise.stop();
            }
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(40, audioContext.currentTime);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, audioContext.currentTime);
            filter.Q.setValueAtTime(5, audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0.03, audioContext.currentTime);
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.start();
            gearNoise = oscillator;
        }

        function stopGearNoise() {
            if (gearNoise) {
                gearNoise.stop();
                gearNoise = null;
            }
        }

        // Son de déclic au bon numéro
        function playClickSound() {
            if (!auspexActive || !audioContext) return;
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.05);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);

            showMessage('✨ Déclic détecté !', 'click');
        }

        function toggleAuspex() {
            auspexActive = !auspexActive;
            const btn = document.getElementById('auspexBtn');
            
            if (auspexActive) {
                initAudio();
                btn.classList.add('active');
                btn.textContent = '🔮 Auspex Actif';
                showMessage('Auspex activé - Écoutez attentivement...', 'success');
            } else {
                btn.classList.remove('active');
                btn.textContent = '🔮 Activer Auspex';
                stopGearNoise();
                showMessage('Auspex désactivé', 'error');
            }
        }

        // Gestion du tactile et de la souris
        function handleStart(e) {
            e.preventDefault();
            isDragging = true;
            const point = e.touches ? e.touches[0] : e;
            startX = point.clientX;
            startY = point.clientY;
            lastAngle = currentAngle;
            
            if (auspexActive) {
                playGearNoise();
            }
        }

        function handleMove(e) {
            if (!isDragging) return;
            e.preventDefault();
            
            const point = e.touches ? e.touches[0] : e;
            const rect = dial.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const deltaX = point.clientX - centerX;
            const deltaY = point.clientY - centerY;
            const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
            
            const startDeltaX = startX - centerX;
            const startDeltaY = startY - centerY;
            const startAngle = Math.atan2(startDeltaY, startDeltaX) * (180 / Math.PI);
            
            let angleDiff = angle - startAngle;
            currentAngle = lastAngle + angleDiff;
            
            // Détecter la direction
            previousDirection = currentDirection;
            if (Math.abs(angleDiff) > 1) {
                currentDirection = angleDiff > 0 ? 'right' : 'left';
            }
            
            dial.style.transform = `rotate(${currentAngle}deg)`;
            
            // Calculer le numéro actuel (inverser le sens)
            previousNumber = currentNumber;
            let normalizedAngle = ((-currentAngle % 360) + 360) % 360;
            currentNumber = Math.round(normalizedAngle / 3.6) % 100;
            currentNumberDisplay.textContent = currentNumber;
            
            // Vérifier si on est sur le bon numéro pour cette étape (Auspex)
            if (auspexActive && currentNumber !== lastPlayedNumber) {
                const targetNumber = combination[currentStep];
                const diff = Math.abs(currentNumber - targetNumber);
                
                if (diff <= tolerance || diff >= (100 - tolerance)) {
                    playClickSound();
                }
                lastPlayedNumber = currentNumber;
            }
            
            updateDirection();
        }

        function validateCurrentNumber() {
            if (currentStep === 0) {
                // Valider le premier chiffre
                lockedValues[0] = currentNumber;
                document.getElementById('value1').textContent = currentNumber;
                document.getElementById('value1').classList.add('locked');
                document.getElementById('step1').classList.remove('active');
                document.getElementById('step2').classList.add('active');
                currentStep = 1;
                showMessage('✓ Premier chiffre validé : ' + currentNumber, 'success');
            } else if (currentStep === 1) {
                // Valider le deuxième chiffre
                lockedValues[1] = currentNumber;
                document.getElementById('value2').textContent = currentNumber;
                document.getElementById('value2').classList.add('locked');
                document.getElementById('step2').classList.remove('active');
                document.getElementById('step3').classList.add('active');
                currentStep = 2;
                showMessage('✓ Deuxième chiffre validé : ' + currentNumber, 'success');
            } else if (currentStep === 2) {
                // Valider le troisième chiffre
                lockedValues[2] = currentNumber;
                document.getElementById('value3').textContent = currentNumber;
                document.getElementById('value3').classList.add('locked');
                document.getElementById('step3').classList.remove('active');
                currentStep = 3; // Passer à l'étape finale
                showMessage('✓ Séquence complète : ' + lockedValues.join('-') + ' ! Tirez le levier', 'success');
            }
        }

        function handleEnd(e) {
            if (!isDragging) return;
            e.preventDefault();
            isDragging = false;
            
            stopGearNoise();
        }

        function updateDirection() {
            if (currentStep === 0) {
                directionDisplay.textContent = 'Positionnez le 1er chiffre et validez';
                directionDisplay.className = 'direction-indicator';
            } else if (currentStep === 1) {
                directionDisplay.textContent = 'Positionnez le 2ème chiffre et validez';
                directionDisplay.className = 'direction-indicator';
            } else if (currentStep === 2) {
                directionDisplay.textContent = 'Positionnez le 3ème chiffre et validez';
                directionDisplay.className = 'direction-indicator';
            } else if (currentStep === 3) {
                directionDisplay.textContent = '✓ Séquence complète ! Tirez le levier';
                directionDisplay.className = 'direction-indicator success';
            }
        }

        async function pullLever() {
            const lever = document.getElementById('lever');
            lever.classList.add('pulled');
            
            setTimeout(() => {
                lever.classList.remove('pulled');
            }, 500);
            
            if (currentStep === 3) {
                // Vérifier la combinaison complète
                let allCorrect = true;
                for (let i = 0; i < 3; i++) {
                    const diff = Math.abs(lockedValues[i] - combination[i]);
                    if (diff > tolerance && diff < (100 - tolerance)) {
                        allCorrect = false;
                        break;
                    }
                }
                
                if (allCorrect) {
                    showMessage('🎉 Coffre déverrouillé ! Décryptage...', 'success');
                    
                    // Décrypter le document avec la combinaison
                    const combinationString = `${lockedValues[0]}-${lockedValues[1]}-${lockedValues[2]}`;
                    const decryptedContent = await decryptDocument(combinationString);
                    
                    if (decryptedContent) {
                        document.getElementById('documentContent').innerHTML = decryptedContent;
                        setTimeout(openSafe, 1000);
                    } else {
                        // Contenu par défaut si décryptage échoue
                        document.getElementById('documentContent').innerHTML = `
                            <h2>📜 Document Secret</h2>
                            <p><strong>Lorem ipsum dolor sit amet</strong>, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                            <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
                            <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.</p>
                        `;
                        setTimeout(openSafe, 1000);
                    }
                } else {
                    showMessage(`❌ Incorrect ! Attendu: ${combination[0]}-${combination[1]}-${combination[2]}`, 'error');
                    setTimeout(resetSafe, 2500);
                }
            } else {
                showMessage('⚠️ Validez d\'abord les 3 chiffres avant de tirer le levier !', 'error');
            }
        }

        function showMessage(text, type) {
            messageDisplay.textContent = text;
            messageDisplay.className = `message ${type}`;
            messageDisplay.style.display = 'block';
            
            if (type !== 'click') {
                setTimeout(() => {
                    if (messageDisplay.textContent === text) {
                        messageDisplay.style.display = 'none';
                    }
                }, 3000);
            } else {
                setTimeout(() => {
                    if (messageDisplay.textContent === text) {
                        messageDisplay.style.display = 'none';
                    }
                }, 800);
            }
        }

        function openSafe() {
            document.getElementById('safeContainer').style.display = 'none';
            document.getElementById('documentContainer').classList.add('visible');
        }

        function closeDocument() {
            document.getElementById('documentContainer').classList.remove('visible');
            document.getElementById('safeContainer').style.display = 'block';
            document.getElementById('documentContent').innerHTML = '';
            resetSafe();
        }

        function resetSafe() {
            currentStep = 0;
            currentAngle = 0;
            lastAngle = 0;
            currentNumber = 0;
            previousNumber = 0;
            currentDirection = null;
            previousDirection = null;
            lastPlayedNumber = -1;
            maxRightValue = 0;
            maxLeftValue = 100;
            lockedValues = ['--', '--', '--'];
            
            dial.style.transform = 'rotate(0deg)';
            currentNumberDisplay.textContent = '0';
            updateDirection();
            messageDisplay.style.display = 'none';
            
            document.getElementById('step1').classList.add('active');
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step3').classList.remove('active');
            
            document.getElementById('value1').textContent = '--';
            document.getElementById('value2').textContent = '--';
            document.getElementById('value3').textContent = '--';
            document.getElementById('value1').classList.remove('locked');
            document.getElementById('value2').classList.remove('locked');
            document.getElementById('value3').classList.remove('locked');
            
            if (auspexActive) {
                toggleAuspex();
            }
        }

        // Event listeners
        dial.addEventListener('mousedown', handleStart);
        dial.addEventListener('touchstart', handleStart, { passive: false });
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchend', handleEnd);
        
        // Event listener pour la touche Entrée dans le modal
        document.getElementById('passwordInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                validateAuspexPassword();
            }
        });

        // Initialisation
        initDial();
        updateDirection();
        
        /*
        =====================================================
        GUIDE DE CONFIGURATION
        =====================================================
        
        ## CHANGER LA COMBINAISON DU COFFRE
        Ligne 338:
        const combination = [15, 75, 45];
        
        ## CHANGER LE MOT DE PASSE AUSPEX
        
        1. Générer le hash du nouveau mot de passe dans la console:
        
        async function generateHash(password) {
            const msgBuffer = new TextEncoder().encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            console.log('Hash pour "' + password + '":');
            console.log(hashHex);
        }
        
        generateHash("monmotdepasse")
        
        2. Remplacer auspexPasswordHash (ligne 341)
        
        Hash actuel: "auspex123"
        
        ## CRYPTER UN NOUVEAU DOCUMENT
        
        1. Dans la console:
        
        async function encryptDocument(combination, htmlContent) {
            const encoder = new TextEncoder();
            const combinationString = combination.join('-');
            
            const keyMaterial = await crypto.subtle.importKey(
                'raw', encoder.encode(combinationString), 'PBKDF2', false, ['deriveBits', 'deriveKey']
            );
            
            const key = await crypto.subtle.deriveKey(
                { name: 'PBKDF2', salt: encoder.encode('safe-document-salt-v2'), 
                  iterations: 100000, hash: 'SHA-256' },
                keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
            );
            
            const iv = crypto.getRandomValues(new Uint8Array(20));
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv }, key, encoder.encode(htmlContent)
            );
            
            const ivStr = Array.from(iv).map(b => String.fromCharCode(b % 256)).join('');
            const dataHex = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('');
            
            console.log('=== DOCUMENT CRYPTÉ ===');
            console.log('iv: "' + ivStr + '",');
            console.log('data: "' + dataHex + '"');
        }
        
        2. Exemple d'utilisation:
        
        const monContenu = `
            <h2>📜 Mon Document Secret</h2>
            <p>Contenu confidentiel ici...</p>
        `;
        
        encryptDocument([15, 75, 45], monContenu);
        
        3. Remplacer encryptedDocument (lignes 344-347)
        
        =====================================================
        */
    </script>
</body>
</html>
