# Espace membres — mise en place de Firebase

Le site reste hébergé sur GitHub Pages. La connexion des membres et leurs données
(fiches, tableaux d'enquête, tableau d'affichage, influences) passent par
**Firebase**, le service de Google, dans son offre gratuite **Spark** (aucune carte
bancaire demandée).

Comptez une vingtaine de minutes pour la mise en place. Elle ne se fait qu'une fois.

---

## 1. Créer le projet Firebase

1. Allez sur <https://console.firebase.google.com> avec le compte Google de
   l'association (par exemple CA.gratianopolis@gmail.com), pour que le projet ne
   dépende pas d'une seule personne.
2. **Créer un projet**, nom : `camarilla-dauphinoise`.
3. Google Analytics : inutile, vous pouvez le désactiver.
4. Le projet est créé avec le forfait **Spark (sans frais)**. Ne passez pas au forfait
   Blaze : avec Spark, rien ne peut jamais vous être facturé. Si un quota est
   dépassé, le service s'arrête simplement jusqu'au lendemain.

## 2. Déclarer le site comme application Web

1. Sur la page d'accueil du projet, cliquez sur l'icône **`</>`** (Web).
2. Surnom : `site`. Ne cochez pas « Firebase Hosting » (le site reste sur GitHub Pages).
3. Firebase affiche un bloc `const firebaseConfig = { ... }`. Recopiez ces valeurs dans
   **`assets/js/camarilla/firebase-config.js`**, à la place des `A_REMPLACER`.

Ces valeurs ne sont pas secrètes : elles identifient le projet, comme une adresse.
La sécurité repose sur la connexion et sur les règles de l'étape 5.

## 3. Activer la connexion

Menu **Créer > Authentication > Commencer**, puis onglet **Mode de connexion** :

- activez **Adresse e-mail/Mot de passe** (laissez « Lien envoyé par e-mail » désactivé) ;
- facultatif : activez **Google**, pour que les joueurs puissent se connecter avec leur
  compte Gmail.

Puis onglet **Paramètres** :

- **Domaines autorisés** : ajoutez `www.camarilla-dauphinoise.fr` et
  `camarilla-dauphinoise.fr` (`localhost` est déjà présent) ;
- **Modèles** (ou « Templates ») : choisissez le **français** comme langue des emails.

## 4. Créer la base de données Firestore

Menu **Créer > Firestore Database > Créer une base de données** :

- Édition : **Standard** ;
- Emplacement : **europe-west9 (Paris)**. ⚠️ Ce choix est définitif ;
- Démarrer en **mode production**.

## 5. Publier les règles de sécurité

Ce sont elles qui garantissent qu'un joueur ne lit et ne modifie que ses propres
données, et que seuls les conteurs voient et valident le reste.

1. Firestore Database > onglet **Règles**.
2. Remplacez tout le contenu par celui du fichier **`firebase/firestore.rules`** du dépôt.
3. **Publier**.

À refaire à chaque modification de ce fichier.

Recommandé (mais pas obligatoire) : les fiches de personnage et les descriptions des
règles contiennent beaucoup de champs qu'il est inutile d'indexer. Dans **Firestore
Database > Index > Exemptions** (« Ajouter une exemption »), désactivez tous les index
pour :

| Collection | Champ |
|---|---|
| `personnages` | `fiche` |
| `personnages` | `contenuJson` |
| `referentiel` | `entrees` |

(Avec l'outil en ligne de commande, `firebase deploy --only firestore` depuis le dossier
`firebase/` publie les règles et ces exemptions, décrites dans `firestore.indexes.json`.)

## 6. Mettre le site en ligne

Commitez la modification de `firebase-config.js` sur la branche `master`. GitHub Pages
reconstruit le site en une à deux minutes.

## 7. Devenir le premier administrateur

1. Ouvrez <https://www.camarilla-dauphinoise.fr/connexion/> et créez votre compte.
2. Dans la console Firebase : **Firestore Database > Données > utilisateurs >** votre
   document (vérifiez le champ `email`).
3. Modifiez deux champs : `role` → `admin` et `statut` → `actif`.
4. Rechargez <https://www.camarilla-dauphinoise.fr/membres/> : les outils conteur
   apparaissent.

C'est la seule manipulation à faire dans la console. Ensuite, tout se gère depuis le site :
page **Espace membres > Comptes**, pour activer les inscriptions et nommer les conteurs
(colonne « Rôle »).

## 7 bis. Importer les descriptions des règles (fiches de personnage)

Dans l'éditeur de fiche, chaque élément (clan, atout, compétence, pouvoir, rituel…)
a un bouton « ⓘ » qui affiche son texte tiré des règles MET. Ces textes appartiennent
à la Fédération Camarilla Française (« document confidentiel, diffusion interdite en
dehors de la Fédération ») : ils ne sont **pas** dans le code du site, qui est public.
Ils sont stockés dans Firestore (collection `referentiel`), où seuls les membres actifs
peuvent les lire. Faites valider ce fonctionnement par le Bureau de la Fédération.

Pour les importer, sur votre ordinateur, avec Python 3, `openpyxl` et `pdftotext`
(paquet poppler-utils) :

```bash
pip install openpyxl
python3 outils/fiche/extraire_excel.py   chemin/vers/fiche_MET_8.0.2.xlsx
python3 outils/fiche/extraire_descriptions.py chemin/vers/Regles_MET.pdf
```

Le second script crée `outils/fiche/sortie/descriptions.json` (et `couverture.txt`, la
liste des éléments sans description). Ce dossier est exclu du dépôt : ne le commitez
jamais. Puis, connecté en administrateur : **Espace membres > Comptes > Référentiel des
règles > Importer descriptions.json**. Réimportez quand les règles changent.

Le premier script régénère aussi `assets/js/camarilla/fiche/referentiel.js` (listes et
coûts : noms des clans, disciplines, atouts…, sans texte de règles ni valeur de
personnage). À relancer, puis à commiter, quand une nouvelle version de la fiche Excel
sort. `extraire_descriptions.py` repère les chapitres du PDF par numéros de page : avec
une autre édition du PDF, ajustez le dictionnaire `P` en tête du script.

## 8. Désactiver l'ancien Apps Script ⚠️

L'ancien système d'influences (Google Apps Script + Google Sheets) reste en ligne tant
que son déploiement existe. Son adresse est dans l'historique public du dépôt, et il
renvoie les fiches, les actions et les réponses des conteurs à quiconque connaît le
nom d'un personnage.

Une fois la bascule faite :

1. Ouvrez le projet Apps Script (depuis le Google Sheet : Extensions > Apps Script).
2. **Déployer > Gérer les déploiements** > sélectionnez le déploiement > **Archiver**.

Le Google Sheet lui-même reste une archive consultable par les conteurs.

## 9. Restreindre la clé d'API (recommandé)

Cette étape empêche d'autres sites d'utiliser votre configuration.

1. <https://console.cloud.google.com/apis/credentials> (même compte, même projet).
2. Ouvrez la clé nommée **Browser key (auto created by Firebase)**.
3. **Restrictions relatives aux applications > Sites Web**, ajoutez :
   - `https://www.camarilla-dauphinoise.fr/*`
   - `https://camarilla-dauphinoise.fr/*`
   - `https://camarilla-dauphinoise.firebaseapp.com/*` (adaptez au nom exact de votre
     projet ; nécessaire pour la connexion Google)
   - `http://localhost:4000/*` (pour tester en local)
4. Enregistrez.

---

## Ce que voient les membres

| Page | Adresse | Qui |
|---|---|---|
| Connexion / inscription | `/connexion/` | tout le monde |
| Espace membres | `/membres/` | comptes connectés |
| Fiches de personnage | `/membres/fiches/` | membres actifs |
| Tableau d'enquête (en ligne + partage) | `/utils/tableau` | membres actifs (sans compte : export JSON seulement) |
| Tableau d'affichage | `/membres/affichage/` | membres actifs |
| Influences | `/influences/` | membres ayant un personnage « en jeu » |
| Comptes | `/membres/comptes/` | conteurs (rôles : admin) |
| Influences — conteur | `/influences/conteur/` | conteurs |

### Cycle de vie d'une fiche

`Brouillon` → `Soumise au conteur` → `Validée (en réserve)` → `En jeu` → `Archivée`

- Le joueur modifie librement ses brouillons, puis les soumet.
- Le conteur peut renvoyer une fiche (« À corriger », avec un commentaire), la valider
  ou la mettre en jeu.
- Une fois validée, seul un conteur peut la modifier. Le joueur dispose d'un bouton
  « Demander une modification », qui crée un ticket.
- Les influences ne sont accessibles qu'avec un personnage **en jeu**.

### Fiche de personnage MET

L'éditeur reprend la fiche Excel MET 8.0.2 : onglets Personnage, Historiques,
Serviteurs, Équipement, Mentorats et Résumé imprimable, listes filtrées selon le clan
et la secte, calcul de l'expérience (acquise, dépensée, restante) et des valeurs
dérivées (sang, volonté, éthique, langues, scores de combat…).

- **Sur ordinateur** : un onglet par feuille de l'Excel.
- **Sur téléphone** : la fiche est découpée en petites sections (Identité, Atouts,
  Attributs, Compétences, Disciplines…), avec une barre de pastilles en haut et des
  boutons « section suivante ».
- **Import** : « Importer une fiche Excel (.xlsx) » lit une fiche MET existante dans
  le navigateur (le fichier n'est envoyé nulle part) et ouvre une nouvelle fiche
  pré-remplie.
- Le calcul reproduit l'onglet « Calculs » de l'Excel, à quatre corrections près
  (listées dans la fiche, rubrique « Différences avec le fichier Excel ») : coût du
  changement de focus, 4e ligne de Représentation, 4e pouvoir d'ancien, compétences
  libres.
- Les champs Gotha, Pègre, génération et PX de la fiche sont recopiés dans le document
  pour la page Influences.

### Images

Les images (portraits, photos du tableau d'enquête, images des messages, images en
base64 dans les JSON importés) sont réduites dans le navigateur puis enregistrées à
part dans Firestore (un document par image, 1 Mo maximum chacun). Les JSON exportés
contiennent de nouveau les images en base64.

---

## Limites de l'offre gratuite

| Ressource | Quota gratuit |
|---|---|
| Comptes | 50 000 utilisateurs actifs par mois |
| Lectures | 50 000 par jour |
| Écritures | 20 000 par jour |
| Stockage | 1 Go |
| Données téléchargées | 10 Go par mois |
| Emails « mot de passe oublié » | 150 par jour |

Les quotas journaliers repartent à zéro vers 9 h, heure de Paris (minuit en Californie).
Pour une association, on en reste très loin. Les images sont ce qui occupe le plus
d'espace : la page **Comptes > Maintenance** (réservée aux admins) affiche l'espace
utilisé et supprime les images qui ne servent plus. Les descriptions des règles
(environ 1,8 Mo) sont lues une catégorie à la fois, au premier « ⓘ » cliqué, puis gardées
en mémoire par le navigateur jusqu'à la fermeture de l'onglet.

Suivi de la consommation : console Firebase > Firestore Database > onglet **Utilisation**.

## Sauvegardes

Les sauvegardes automatiques de Firestore exigent le forfait payant. Avec l'offre
gratuite, sauvegardez depuis le site :

- **Influences — conteur > Exports CSV** (actions, raisons sociales, tickets,
  personnages en jeu) ;
- **Fiches > Exporter en JSON** pour chaque fiche importante.

---

## Pour les développeurs

### Tester les règles de sécurité

```bash
cd firebase
npm install
npm test        # Java 21 requis (émulateur Firestore officiel)
```

Le workflow GitHub `.github/workflows/regles-firestore.yml` lance aussi ces tests
automatiquement à chaque modification du dossier `firebase/`.

### Tester le site en local, sans toucher aux vraies données

```bash
cd firebase && npm run emulateurs     # émulateurs Auth + Firestore
bundle exec jekyll serve              # dans un autre terminal, à la racine
```

Puis ouvrez <http://localhost:4000/connexion/?emulateurs=1>. Le paramètre
`emulateurs=1` est mémorisé pour l'onglet ; `?emulateurs=0` le désactive.

### Organisation du code

| Fichier | Rôle |
|---|---|
| `assets/js/camarilla/firebase-config.js` | configuration du projet |
| `assets/js/camarilla/core.js` | connexion, profil, rôles, utilitaires |
| `assets/js/camarilla/images.js` | compression et stockage des images |
| `assets/js/camarilla/donnees.js` | listes de jeu (villes, actions d'influence…) |
| `assets/js/camarilla/pages/*.js` | une page = un module |
| `assets/js/camarilla/fiche/referentiel.js` | listes et coûts de la fiche MET (généré par `outils/fiche/extraire_excel.py`) |
| `assets/js/camarilla/fiche/modele.js` | structure d'une fiche, import d'un classeur Excel |
| `assets/js/camarilla/fiche/calculs.js` | calculs de l'onglet « Calculs » (PX, sang, volonté…) |
| `assets/js/camarilla/fiche/editeur.js` | éditeur (ordinateur et mobile) et résumé imprimable |
| `assets/js/camarilla/fiche/descriptions.js` | chargement des textes de règles depuis Firestore |
| `assets/css/membres.css`, `assets/css/fiche.css` | styles de l'espace membres et de la fiche |
| `firebase/firestore.rules` | règles de sécurité (à publier dans la console) |
| `firebase/firestore.indexes.json` | exemptions d'index (gros champs) |
| `firebase/tests/regles.test.mjs` | tests des règles |
| `outils/fiche/*.py` | extraction des listes (Excel) et des descriptions (PDF, privées) |

Le SDK Firebase est chargé depuis le CDN de Google, en version 13.2.0 : pour changer
de version, modifiez les trois adresses `gstatic.com/firebasejs/…` en tête de `core.js`.
