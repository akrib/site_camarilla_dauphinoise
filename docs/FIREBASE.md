# Espace membres — mise en place de Firebase

Le site reste hébergé sur GitHub Pages. La connexion des membres et leurs données
(fiches, tableaux d'enquête, panneau d'affichage, influences) passent par
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
| Tableau d'enquête (sauvegarde en ligne + partage) | `/utils/tableau` | personnages validés (et conteurs) |
| Panneau d'affichage | `/membres/affichage/` | personnages validés (et conteurs) |
| Notifications | `/membres/notifications/` | membres actifs |
| Challenge (générateur + challenges demandés) | `/utils/challenge` | tout le monde (demandes : personnages et conteurs) |
| Carte de Grenoble | `/utils/carte` | personnages validés (et conteurs) |
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

### Calendrier des parties et fenêtres d'influences

Onglet **Calendrier** de la page *Influences — conteur* (`/influences/conteur/#calendrier`,
tuile « Calendrier des parties » de l'espace membres). Pour chaque partie : sa date, la
date limite de rendu des influences et un titre facultatif. **Une partie par mois** : le
mois de la partie est celui de ses actions d'influence (champ `mois`).

- Les influences d'une partie **s'ouvrent le lendemain de la partie précédente** (0 h) et
  **ferment à sa date limite** (23 h 59). La toute première partie du calendrier s'ouvre
  un mois avant sa date.
- Pendant la fenêtre, le joueur envoie, **modifie** (texte, cible, raison sociale, lieu)
  et retire ses actions **tant que le conteur n'a pas répondu**. Après la date limite,
  tout est en lecture seule ; le conteur, lui, répond toujours.
- Case « Autoriser les joueurs à préparer les actions des parties suivantes » : les
  parties à venir sont aussi ouvertes (jamais les parties closes).
- La prochaine partie et l'état des influences sont rappelés en haut de la page
  Influences et de l'espace membres.
- Tant qu'aucun calendrier n'est enregistré, les influences restent libres (ancien
  fonctionnement).

Ces fenêtres sont vérifiées par les **règles Firestore** (heure du serveur), pas seulement
par la page. Document : `calendrier/parties`
(`parties : { 'AAAA-MM': { date, limite, titre, ouverture, fermeture } }`, `anticipation`).

### Textes longs compressés (Unishox2)

Les textes longs sont compressés avant d'être enregistrés : descriptif et réponse des
actions d'influence, description des raisons sociales, description et réponse des
tickets, message du conteur sur une fiche, messages des notifications et des challenges
demandés. Un texte de plus de 160 caractères est stocké en **octets** (Unishox2, environ
35 à 60 % de la taille d'origine pour du français) si la compression fait gagner au moins
10 % ; sinon il reste en texte. Les anciens documents restent lisibles. Bibliothèque :
`assets/js/camarilla/lib/unishox2.js` (Unishox2 1.1.5, licence Apache-2.0) ; code :
`assets/js/camarilla/compression.js`. Les exports CSV contiennent les textes en clair.

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

### Personnage incarné

Le panneau d'affichage et le tableau d'enquête sont des **outils de jeu** : seuls les
personnages y ont accès, pas les membres en tant que tels.

- Dans **Espace membres > Personnage incarné**, le joueur choisit lequel de ses
  personnages validés il joue (fiche « Validée (en réserve) » ou « En jeu »). Les
  deux outils n'apparaissent qu'ensuite. On change de personnage depuis la même
  page, ou depuis le nom du personnage affiché dans chaque outil.
- Le choix est mémorisé dans le navigateur, et revérifié dans la base à chaque
  page : une fiche archivée ou repassée en brouillon ne s'incarne plus.
- Tout ce qui se fait dans les outils est au nom du personnage : lignes du journal
  du panneau, tableaux d'enquête, « modifié par … ».
- Les règles Firestore vérifient à chaque écriture que le personnage appartient au
  membre et qu'il est validé : impossible d'agir au nom du personnage d'un autre.
- Les **conteurs** ont accès aux deux outils sans personnage (sous leur propre nom),
  pour modérer. Ils peuvent aussi incarner un de leurs personnages (un PNJ).
- Le **répertoire** (`repertoire/{idPersonnage}` : nom du personnage et compte du
  joueur) liste les personnages validés, pour pouvoir partager un tableau avec eux.
  Il est tenu à jour quand un conteur valide, met en jeu ou archive une fiche, quand
  le joueur ouvre son espace membres, et la page **Comptes** en retire les
  personnages des comptes suspendus.

### Tableau d'enquête

La page contient 3 tableaux. Chaque personnage a **un seul tableau en ligne**
(document `tableaux/{idPersonnage}`), qui regroupe ces 3 tableaux et qui est remplacé
à chaque sauvegarde : la base ne grossit pas au fil des enquêtes.

- **☁ Sauvegarder** (ou Ctrl+S) : enregistre les 3 tableaux affichés. Le tableau du
  personnage incarné est rechargé automatiquement à la visite suivante.
- **⇄ Partager** : choisit, dans le répertoire, quels personnages peuvent consulter
  (lecture) ou modifier (modification) ce tableau. Le lien
  `/utils/tableau?tableau={idPersonnage}` ouvre directement le tableau d'un personnage.
- **☰ Ouvrir** : le tableau du personnage, ceux partagés avec lui (pas ceux partagés
  avec vos autres personnages), et pour les conteurs tous les tableaux. Si deux
  personnes sauvegardent en même temps, la seconde choisit d'écraser, de recharger ou
  de garder sa version dans son propre tableau.
- **☺ (nom du personnage)** : changer de personnage.
- Les tableaux enregistrés avant les personnages (rattachés au compte) apparaissent
  dans « Anciens enregistrements » : les ouvrir pour les reprendre, ou les supprimer.
- Sans compte, ou sans personnage validé, la page reste fermée (l'export / import
  JSON n'est plus accessible aux visiteurs).

### Notifications

Page **Espace membres > Notifications** (`/membres/notifications/`), aussi accessible par
le lien « Notifications » en haut des pages membres.

- **Conteurs** : les fiches soumises à valider (avec un lien pour les relire), et les
  challenges qu'ils ont envoyés, avec le résultat une fois résolus (« Lu, supprimer »).
- **Joueurs** :
  - le résultat de leurs demandes de validation (validée, mise en jeu, renvoyée pour
    correction, archivée) avec le **message du conteur** ;
  - les tableaux d'enquête partagés avec leurs personnages (lien « Ouvrir », qui fait
    incarner le bon personnage si besoin) ;
  - les challenges demandés par les conteurs (lien « Résoudre »).
- Le message au joueur se saisit dans l'éditeur de fiche (bloc « Message au joueur »)
  avant de cliquer sur Valider, Mettre en jeu, Renvoyer ou Archiver. Il part dans la
  notification, et il est **effacé de la fiche** dès qu'elle est validée ou mise en jeu.
- Une notification lue (« J'ai lu », « Retirer ») est **supprimée de la base**.
- Collection `notifications` : petits documents (destinataire, type, texte court). Seul
  un conteur peut envoyer un résultat de fiche, et seul le propriétaire d'un tableau
  peut signaler un partage, vers un personnage réellement invité.

### Challenges demandés

La page **Challenge** (`/utils/challenge`) reste un générateur libre. En plus :

- un **conteur** compose une demande pour un personnage validé : un titre, un message,
  et un ou plusieurs challenges (10 au plus), chacun pris sur le réglage affiché de la
  page (nombre de manches, Puits, Bombe, et la liste personnalisée imposée au joueur si
  « Utiliser comme main » est cochée) ;
- le **personnage** concerné (incarné) voit la demande en haut de la page et dans ses
  notifications, et la résout **une seule fois** : le tirage est envoyé au conteur ;
- le conteur lit le résultat dans ses notifications (bilan et détail des manches), puis
  le supprime.
- Collection `defis`. Les règles empêchent de résoudre deux fois, de résoudre pour un
  autre personnage ou avec un personnage archivé.

### Panneau d'affichage

Un liège partagé en temps réel entre les personnages : on y épingle des notes
(9 types de papier, 6 polices), on peut les examiner, les déplacer, caviarder ou
colorier un passage, les déchirer ou les enlever. Sous le liège, « Ce que les goules
se souviennent d'avoir vu » : le journal daté des actions (quel personnage a fait quoi,
jamais sur quelle note ni avec quel texte).

- Tout tient dans **un seul document**, `panneau/principal` : une action = une
  écriture, une lecture par personne connectée, une lecture à l'ouverture de la page.
- Le journal est découpé en 6 segments de 100 lignes (`j0` … `j5`). Quand le segment
  en cours est plein, on passe au suivant, qui est vidé : les **500 dernières lignes**
  sont toujours là, et le document ne grossit pas.
- Les règles Firestore imposent que chaque écriture d'un membre ajoute exactement une
  ligne au journal, au nom d'un de ses personnages validés, et que la modification de la note corresponde à
  l'action annoncée. Personne ne peut agir sans laisser de souvenir, ni effacer ou
  réécrire le journal.
- Caviarder ou colorier remplace vraiment les lettres du passage, et déchirer
  supprime la fin du texte : ce qui est caché n'existe plus dans la base.
- Une visite n'est notée qu'une fois par demi-heure, et relire la même note dans les
  deux minutes n'est pas noté de nouveau.
- Seuls les conteurs peuvent « Effacer les souvenirs ».
- Limites : 80 notes, 1 200 caractères par note.

### Carte de Grenoble

Page `/utils/carte` (outil de jeu : personnage incarné, ou conteur). Carte tactique de
Grenoble et de ses environs :

- **Plan** : carte routière (rues, quartiers, places, espaces verts…), fond **Nuit**
  (sombre) ou **Jour** (clair) ;
- **3D** : la même carte inclinée, bâtiments en volume à leur hauteur réelle. Le
  passage de l'un à l'autre garde le centre, le zoom et tous les tracés ;
- **Territoires** : polygones dessinés à la main (clic par clic, double-clic ou Entrée
  pour fermer), points déplaçables, ajout / suppression de points, agrandir / réduire,
  déplacement d'un bloc, couleur, transparence, nom (les zones 1 à 24 sont proposées),
  description ;
- **Havres** : marqueurs déplaçables, nom, description, icône, couleur ;
- **Zones de chasse** : un **cercle autour du marqueur** (300 m par défaut, de 50 m à
  3 km), réglable au curseur ou en glissant le point blanc sur le bord du cercle ; le
  cercle suit le marqueur quand on le déplace ;
- **Rondes** : lignes reliant plusieurs points (cliquer sur un havre pendant le tracé
  y pose un point) ;
- **Zones** : les deux cartes de référence de l'association (zones 1 à 7 et 8 à 24),
  fichiers `assets/images/carte/zones-grenoble.webp` et `zones-isere.webp`.

- **Influences** : liste des mois (parties du calendrier, avec leur état) dans la barre
  du haut ; les actions d'influence du personnage pour ce mois s'affichent en losanges
  (or : Gotha, rouge : Pègre, bleu : AIP). Tant que la fenêtre de la partie est ouverte et
  que le conteur n'a pas répondu, on place une action (📍), on la déplace en la glissant
  ou on la retire de la carte ; les mois clos sont en lecture seule. L'outil
  **Influence** ouvre la gestion des influences avec le lieu cliqué déjà rempli. Un
  conteur voit toutes les actions du mois (lecture seule). Dans la gestion des
  influences, chaque formulaire a aussi « 📍 Choisir sur la carte ».

Sauvegarde : dans le navigateur, **une carte par personnage** (clé `cam-carte-{id}`),
plus **Export / Import JSON** pour passer d'un appareil à l'autre ou partager une carte.
Les actions d'influence, elles, sont dans Firestore (champ `lieu : { lng, lat }`).

Dépendances, toutes gratuites et sans clé d'API :

| Quoi | Où | Rôle |
|---|---|---|
| MapLibre GL JS 6.18.0 (licence BSD) | `https://unpkg.com/maplibre-gl@6.18.0/…` | affichage de la carte vectorielle, 3D |
| OpenFreeMap (styles `dark` et `liberty`) | `https://tiles.openfreemap.org/styles/…` | tuiles, polices et icônes de la carte |
| OpenStreetMap | via OpenFreeMap | données (rues, bâtiments et leurs hauteurs) |

Rien à installer ni à lancer : la page fonctionne dès qu'elle est sur le site. Pour
changer de version de MapLibre, modifiez les adresses `unpkg.com` (en tête de
`_pages/utils/carte.html`, de `assets/js/camarilla/pages/carte.js` et de
`assets/js/camarilla/carte-base.js`). OpenFreeMap est un service gratuit fourni « en
l'état » : s'il disparaissait, il suffirait de changer les deux adresses de `FONDS` dans
`carte-base.js` (n'importe quel style au schéma OpenMapTiles convient).

### Images

Les images (portraits, photos du tableau d'enquête, images en base64 dans les JSON
importés) sont réduites dans le navigateur puis enregistrées à
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
| `assets/js/camarilla/incarnation.js` | personnage incarné (choix, vérification, répertoire) |
| `assets/js/camarilla/defis.js` | challenges demandés (libellés, bilans) |
| `assets/js/camarilla/donnees.js` | listes de jeu (villes, actions d'influence…) |
| `assets/js/camarilla/calendrier.js` | calendrier des parties, fenêtres d'influences |
| `assets/js/camarilla/compression.js` | compression des textes longs (Unishox2) |
| `assets/js/camarilla/lib/unishox2.js` | bibliothèque Unishox2 (Apache-2.0) |
| `assets/js/camarilla/carte-base.js` | MapLibre à la demande, fonds, choix d'un lieu |
| `assets/js/camarilla/pages/*.js` | une page = un module |
| `assets/js/camarilla/fiche/referentiel.js` | listes et coûts de la fiche MET (généré par `outils/fiche/extraire_excel.py`) |
| `assets/js/camarilla/fiche/modele.js` | structure d'une fiche, import d'un classeur Excel |
| `assets/js/camarilla/fiche/calculs.js` | calculs de l'onglet « Calculs » (PX, sang, volonté…) |
| `assets/js/camarilla/fiche/editeur.js` | éditeur (ordinateur et mobile) et résumé imprimable |
| `assets/js/camarilla/fiche/descriptions.js` | chargement des textes de règles depuis Firestore |
| `assets/css/membres.css`, `assets/css/fiche.css`, `assets/css/panneau.css` | styles de l'espace membres, de la fiche et du panneau d'affichage |
| `firebase/firestore.rules` | règles de sécurité (à publier dans la console) |
| `firebase/firestore.indexes.json` | exemptions d'index (gros champs) |
| `firebase/tests/regles.test.mjs` | tests des règles |
| `outils/fiche/*.py` | extraction des listes (Excel) et des descriptions (PDF, privées) |

Le SDK Firebase est chargé depuis le CDN de Google, en version 13.2.0 : pour changer
de version, modifiez les trois adresses `gstatic.com/firebasejs/…` en tête de `core.js`.
