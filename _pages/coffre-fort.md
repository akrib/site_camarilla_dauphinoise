---
layout: page
title: "Coffre-fort Sécurisé"
permalink: /coffre-fort/
---
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coffre-fort Sécurisé</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .container {
            position: relative;
            width: 100%;
            max-width: 500px;
        }

        .safe-container {
            background: linear-gradient(145deg, #2c3e50, #34495e);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            text-align: center;
        }

        .safe-door {
            width: 200px;
            height: 200px;
            margin: 0 auto 30px;
            position: relative;
            background: linear-gradient(145deg, #7f8c8d, #95a5a6);
            border-radius: 50%;
            box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.3);
            transition: transform 1s ease;
        }

        .safe-door.opening {
            transform: rotateY(90deg);
        }

        .safe-handle {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 60px;
            height: 60px;
            background: linear-gradient(145deg, #e74c3c, #c0392b);
            border-radius: 50%;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }

        .safe-handle::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 30px;
            height: 30px;
            background: #34495e;
            border-radius: 50%;
        }

        h1 {
            color: #ecf0f1;
            margin-bottom: 20px;
            font-size: 24px;
        }

        .display {
            background: #1a1a1a;
            color: #2ecc71;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
            font-size: 24px;
            font-family: 'Courier New', monospace;
            min-height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            letter-spacing: 5px;
        }

        .keypad {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 20px;
        }

        .key {
            background: linear-gradient(145deg, #34495e, #2c3e50);
            color: #ecf0f1;
            border: none;
            padding: 20px;
            font-size: 24px;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }

        .key:hover {
            background: linear-gradient(145deg, #3d566e, #34495e);
            transform: translateY(-2px);
        }

        .key:active {
            transform: translateY(0);
        }

        .actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }

        .btn {
            padding: 15px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: bold;
        }

        .btn-validate {
            background: linear-gradient(145deg, #27ae60, #229954);
            color: white;
        }

        .btn-clear {
            background: linear-gradient(145deg, #e74c3c, #c0392b);
            color: white;
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
        }

        .message {
            margin-top: 15px;
            padding: 10px;
            border-radius: 5px;
            font-weight: bold;
            min-height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .error {
            background: rgba(231, 76, 60, 0.2);
            color: #e74c3c;
        }

        .success {
            background: rgba(46, 204, 113, 0.2);
            color: #2ecc71;
        }

        .document-container {
            display: none;
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
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

        .btn-close {
            background: linear-gradient(145deg, #95a5a6, #7f8c8d);
            color: white;
            margin-top: 20px;
            width: 100%;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="safe-container" id="safeContainer">
            <div class="safe-door" id="safeDoor">
                <div class="safe-handle"></div>
            </div>
            
            <h1>🔒 Coffre-fort Sécurisé</h1>
            
            <div class="display" id="display">****</div>
            
            <div class="keypad">
                <button class="key" onclick="addDigit('1')">1</button>
                <button class="key" onclick="addDigit('2')">2</button>
                <button class="key" onclick="addDigit('3')">3</button>
                <button class="key" onclick="addDigit('4')">4</button>
                <button class="key" onclick="addDigit('5')">5</button>
                <button class="key" onclick="addDigit('6')">6</button>
                <button class="key" onclick="addDigit('7')">7</button>
                <button class="key" onclick="addDigit('8')">8</button>
                <button class="key" onclick="addDigit('9')">9</button>
                <button class="key" onclick="addDigit('0')" style="grid-column: 2;">0</button>
            </div>
            
            <div class="actions">
                <button class="btn btn-clear" onclick="clearCode()">Effacer</button>
                <button class="btn btn-validate" onclick="validateCode()">Valider</button>
            </div>
            
            <div class="message" id="message"></div>
        </div>

        <div class="document-container" id="documentContainer">
            <div class="document-content">
                <h2>📄 Document Confidentiel</h2>
                <p><strong>Lorem ipsum dolor sit amet</strong>, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                
                <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
                
                <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
                
                <p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.</p>
                
                <p><em>Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?</em></p>
            </div>
            <button class="btn btn-close" onclick="closeDocument()">Fermer le document</button>
        </div>
    </div>

    <script>
        // Hash SHA-256 du code correct (actuellement "1234")
        // Pour changer le code, utilisez le générateur ci-dessous
        const correctCodeHash = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';
        
        let currentCode = '';

        // Fonction de hachage SHA-256
        async function sha256(message) {
            const msgBuffer = new TextEncoder().encode(message);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        }

        function addDigit(digit) {
            if (currentCode.length < 4) {
                currentCode += digit;
                updateDisplay();
            }
        }

        function updateDisplay() {
            const display = document.getElementById('display');
            display.textContent = '•'.repeat(currentCode.length) + '–'.repeat(4 - currentCode.length);
        }

        function clearCode() {
            currentCode = '';
            updateDisplay();
            showMessage('', '');
        }

        async function validateCode() {
            const messageDiv = document.getElementById('message');
            const inputHash = await sha256(currentCode);
            
            if (inputHash === correctCodeHash) {
                showMessage('Code correct ! Ouverture du coffre...', 'success');
                openSafe();
            } else {
                showMessage('Code incorrect ! Accès refusé.', 'error');
                setTimeout(() => {
                    clearCode();
                }, 1500);
            }
        }

        function showMessage(text, type) {
            const messageDiv = document.getElementById('message');
            messageDiv.textContent = text;
            messageDiv.className = 'message ' + type;
        }

        function openSafe() {
            const safeDoor = document.getElementById('safeDoor');
            const safeContainer = document.getElementById('safeContainer');
            const documentContainer = document.getElementById('documentContainer');
            
            safeDoor.classList.add('opening');
            
            setTimeout(() => {
                safeContainer.style.display = 'none';
                documentContainer.classList.add('visible');
            }, 1000);
        }

        function closeDocument() {
            const safeContainer = document.getElementById('safeContainer');
            const documentContainer = document.getElementById('documentContainer');
            const safeDoor = document.getElementById('safeDoor');
            
            documentContainer.classList.remove('visible');
            safeContainer.style.display = 'block';
            safeDoor.classList.remove('opening');
            clearCode();
        }

        /*
        =====================================================
        GÉNÉRATEUR DE HASH POUR CHANGER LE CODE
        =====================================================
        
        Pour changer le code du coffre-fort :
        
        1. Ouvrez la console JavaScript de votre navigateur (F12)
        2. Copiez-collez cette fonction :
        
        async function generateHash(code) {
            const msgBuffer = new TextEncoder().encode(code);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            console.log('Hash pour le code "' + code + '" :');
            console.log(hashHex);
            return hashHex;
        }
        
        3. Appelez la fonction avec votre nouveau code :
           generateHash("5678")
        
        4. Copiez le hash généré et remplacez la valeur de 
           correctCodeHash dans le code (ligne 232)
        
        Exemples de hashs :
        - "1234" : 03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4
        - "0000" : e7064f0b80f61dbc65915311032d27baa569ae2a7e0d1c9a0e7d5ec2f3b3f4c4
        - "9999" : 62c66a7a5dd70c3146618063c344e531e6d4b59e379808443ce962b3abd63c5a
        
        =====================================================
        */
    </script>
</body>
</html>
