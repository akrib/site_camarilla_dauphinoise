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

À refaire à chaque modification de ce fichier. Le site sait si c'est fait : les règles
portent une version (bloc `match /regles/{version}`, même date que `VERSION_REGLES` dans
`assets/js/camarilla/core.js`, les deux à changer ensemble). Si les règles publiées sont
en retard, le tableau de bord d'un administrateur affiche « Règles de sécurité pas à
jour », et **Comptes > Maintenance > Vérifier les règles** liste ce qui est refusé. Sans
cela, des actions sont refusées même à un administrateur (« vous n'avez pas les droits
nécessaires »).

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

Un administrateur a tous les droits d'un conteur. Pour **tester le site comme un conteur
ou un joueur**, choisissez une vue dans la barre « Connecté : … » (ou « Tester le site »
dans l'espace membres). Seul l'affichage change : pour les règles Firestore, vous restez
administrateur (une action refusée à un vrai joueur peut donc passer pour vous). Un
bandeau en bas de chaque page rappelle la vue et ramène à la vue administrateur. Le choix
est gardé dans le navigateur, et oublié à la déconnexion.

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
liste des éléments sans description). Ce dossier est exclu du dépôt (`.gitignore`) : ne
le commitez jamais, ne le déposez pas sur GitHub. Puis, connecté en administrateur :
**Espace membres > Comptes > Référentiel des règles > Importer descriptions.json**.
Réimportez quand les règles changent.

Le premier script n'est pas indispensable pour les descriptions : sans la fiche Excel
(`sortie/textes_excel.json` absent), les archétypes et la faiblesse de chaque clan sont
lus dans le PDF. Avec le PDF du 18/10/2026 : 1 367 descriptions, dont les 37 faiblesses de
clan et 135 niveaux de spécialités Mystères ; manquent seulement les éléments de la fiche
absents des règles (atouts « Morale Flexible », « Prodige Machiavélique » — retiré des
règles —, « Réputation », handicap « Chemise Empaillé », rituel « Sentinelle Numérique »,
technique « Piège de Force »), l'archétype « Autre (Préciser) » et les spécialités Mystères
sans chapitre (Cappadocien, Ravnos, Séthite, Fae, Inconnu, Inquisition, Tal'Mahe'Ra, Umbra).

**Faiblesse de clan** : un référentiel importé avant la catégorie « faiblesses » marche
encore (la faiblesse est lue dans le texte du clan), sauf pour le Toréador dont le texte
n'y figurait pas : réimportez un `descriptions.json` récent.

**Mystères** (catégorie `mysteres` du fichier) : les connaissances communes et secrètes
de chaque niveau des spécialités Mystères sont des secrets de jeu. L'import les range à
part, dans la collection `mysteres` (un document par spécialité + `index`), que **seuls les
conteurs** peuvent lire. Le joueur ne reçoit que les niveaux de son personnage : quand un
conteur valide une fiche ou la met en jeu, le site copie les textes des niveaux connus dans
`personnages/{id}/detail/mysteres` (lisible du joueur, écrit par les conteurs seulement).
Après le premier import des mystères, **Comptes > Maintenance > Transmettre les mystères
aux fiches validées** fait cette copie pour toutes les fiches déjà validées ou en jeu.

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

## 10. Jeton Mapillary (jeu « Trouve le Sabbat »)

Le jeu `/utils/sabbat` montre des photos de rue de Grenoble tirées de
[Mapillary](https://www.mapillary.com) (photos libres, API gratuite). Il lui faut un
jeton d'accès, gratuit :

1. Créez un compte sur <https://www.mapillary.com> (ou connectez-vous), puis ouvrez
   <https://www.mapillary.com/developer>.
2. **Register application** : nom « Camarilla Dauphinoise », site
   `https://www.camarilla-dauphinoise.fr`, autorisation **Read** seulement (pas d'écriture,
   pas de téléversement).
3. Copiez le **Client Token** (il commence par `MLY|`) dans
   `assets/js/camarilla/mapillary-config.js`, à la place de `MLY|A_REMPLACER`.

Comme la clé Firebase, ce jeton est fait pour être visible dans le code du site : il ne
permet que de lire les photos publiques. Tant qu'il n'est pas rempli, la page du jeu
l'indique et le bouton « Commencer » reste grisé.

---

## Ce que voient les membres

| Page | Adresse | Qui |
|---|---|---|
| Connexion / inscription | `/connexion/` | tout le monde |
| Espace membres | `/membres/` | comptes connectés |
| Fiches de personnage | `/membres/fiches/` | membres actifs (onglet PNJ : conteurs) |
| Tableau d'enquête (sauvegarde en ligne + partage) | `/utils/tableau` | personnages validés (et conteurs) |
| Panneau d'affichage | `/membres/affichage/` | personnages validés (et conteurs) |
| Notifications | `/membres/notifications/` | membres actifs |
| Challenge (générateur + challenges demandés) | `/utils/challenge` | personnages validés (et conteurs) |
| Carte de Grenoble | `/utils/carte` | personnages validés (et conteurs) |
| Trouve le Sabbat (jeu) | `/utils/sabbat` | tout le monde (classement : membres actifs) |
| Le Gratin Dauphinois (gazette) | `/membres/gazette/` | membres actifs (numéros publiés) |
| Gazette — édition | `/membres/gazette/edition/` | conteurs |
| Influences | `/influences/` | personnage incarné « en jeu » |
| Tickets | `/membres/tickets/` | membres actifs (réponses : conteurs) |
| Comptes | `/membres/comptes/` | conteurs (rôles, maintenance : admin) |
| Influences — conteur (et calendrier) | `/influences/conteur/` | conteurs |
| Territoires (outil des conteurs) | `/membres/territoires/` | conteurs |
| Combat — initiatives | `/membres/combat/` | conteurs |

### Cycle de vie d'une fiche

`Brouillon` → `Soumise au conteur` → `Validée (en réserve)` → `En jeu` → `Archivée`

- Le joueur modifie librement ses brouillons, puis les soumet.
- Le conteur peut renvoyer une fiche (« À corriger », avec un commentaire), la valider
  ou la mettre en jeu.
- Une fois validée, seul un conteur peut la modifier. Le joueur dispose d'un bouton
  « Demander une modification », qui crée un ticket.
- **Récapitulatif avant validation** : à chaque validation (ou mise en jeu), le site garde
  la version validée (`personnages/{id}/detail/valide`, écrite par les conteurs). Quand le
  joueur modifie ensuite sa fiche (repassée en brouillon), un encadré « Modifications depuis
  la dernière validation » liste ce qui a changé, rubrique par rubrique (compétences,
  disciplines, atouts, historiques, mystères…), et les PX dépensés entre les deux versions
  (total et détail par poste). Il est ouvert d'office pour le conteur quand la fiche est
  soumise, et se met à jour pendant les modifications. Pour une fiche validée avant cette
  fonction, la version de référence est créée quand le conteur la repasse en brouillon, ou
  d'un coup par **Comptes > Maintenance > Transmettre les mystères aux fiches validées**.
- **Journal des consultations** : en bas de la page des fiches, une fenêtre de quelques
  lignes (avec ascenseur et filtre) liste qui, parmi les conteurs et administrateurs, a
  ouvert quelle fiche de joueur, et quand. Les conteurs et administrateurs voient tout le
  journal ; chaque joueur voit les consultations de ses propres fiches. Seuls sont gardés le nom du compte, l'heure et le nom de
  la fiche (`journal_fiches/{idFiche}`, les 25 dernières consultations de chaque fiche) ; la
  phrase est recomposée à l'affichage. Les PNJ et ses propres fiches ne sont pas notés, ni
  la même fiche rouverte par la même personne dans les 10 minutes. Les règles Firestore
  n'autorisent qu'un ajout en fin de liste, au nom de son auteur et à l'heure du serveur
  (± 5 min) : personne ne peut effacer ou réécrire les lignes des autres (un administrateur
  peut supprimer le journal d'une fiche depuis la console).
- Les influences ne sont accessibles qu'avec un personnage **en jeu** : la page
  Influences agit pour le **personnage incarné** (comme la carte, le panneau et le
  tableau d'enquête) ; un bouton permet d'en changer.
- **Stockage en deux parties** : le document `personnages/{id}` ne garde que les champs
  des listes (nom, clan, influences, PX, statut…) ; la fiche MET complète et les données
  complémentaires sont dans `personnages/{id}/detail/fiche`, compressées, lues seulement
  à l'ouverture de la fiche. Les deux sont écrits ensemble. Les anciennes fiches passent
  au nouveau format à leur prochain enregistrement, ou toutes d'un coup par
  **Comptes > Maintenance > Migrer les fiches** (admin).

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
- **Mois sans partie** (vacances, relâche…) : case « Mois sans partie (influences
  seulement) » sous le tableau, puis le mois et la date limite (proposée au dernier jour
  du mois). Les influences de ce mois s'ouvrent le lendemain de la partie précédente et
  ferment à sa date limite ; celles du mois suivant s'ouvrent le lendemain. Partout, ce
  mois s'affiche « août 2026 (sans partie) ».
- **Modifier le calendrier** : les dates se changent directement dans le tableau. La case
  « Sans partie » de chaque ligne passe une partie existante en mois sans partie (le mois
  et la date limite sont gardés, les influences restent ouvertes), ou l'inverse (la date de
  la partie revient). Puis « Enregistrer le calendrier ». Une partie sans date est signalée
  au lieu d'être supprimée sans prévenir.

Ces fenêtres sont vérifiées par les **règles Firestore** (heure du serveur), pas seulement
par la page. Document : `calendrier/parties`
(`parties : { 'AAAA-MM': { date, limite, titre, ouverture, fermeture, sansPartie } }`,
`anticipation` ; pour un mois sans partie, `date` = date limite).

### Influences : raisons sociales et actions inter-partie (AIP)

- **Raison sociale** : c'est une des **spécialisations d'influence de la fiche** (Gotha ou
  Pègre, par ex. « Banques (Finance) »), choisie dans une liste pour chaque action globale,
  ciblée ou de soutien, selon la catégorie de l'action. Le type de spécialisation (liste des
  15) est déduit de la parenthèse quand il y en a une. L'ancien registre des raisons
  sociales saisi à part n'est plus utilisé : l'onglet a disparu côté joueur ; côté
  conteur, l'onglet « Raisons sociales » liste les spécialisations des fiches en jeu, avec
  l'ancien registre consultable (et un bouton pour le vider). Les règles Firestore
  n'acceptent plus de nouvelle entrée dans `raisons_sociales`.
- **AIP**, d'après le chapitre « Actions Inter-Partie » des règles : 3 AIP entre deux
  parties, non reportables ; +1 avec la compétence Informatique (utilisable aussi pour
  **observer** ou **annuler** l'AIP d'un autre personnage) ; Sciences : +1 pour le premier
  domaine, +1 par domaine supplémentaire à 3 ou plus, réservées aux tâches de ces domaines.
  Le formulaire demande la **réserve** utilisée (base, Informatique, Science avec le
  domaine, Troupeau), l'**action** (Enquête, Patrouiller, Se nourrir, Artisanat, Représentation,
  Au-delà de vos moyens, Apprentissage, Recherche scientifique, Observer / Annuler une AIP,
  Autre — avec un rappel de ce qu'elle permet), le nombre d'AIP, une cible ou un sujet
  facultatif et un descriptif d'une phrase ; plus de raison sociale. La date, la ville, le
  **territoire** et le **lieu sur la carte** restent (patrouille, chasse…), comme le
  pense-bête de la gazette côté conteur.
- **Se nourrir** coûte 1 AIP (+1 pour la faiblesse Ventrue), réduit du niveau de
  Troupeau ; faute de quoi, le personnage commence la partie à demi-réserve de sang.
  Le formulaire propose le bon nombre et affiche les AIP restantes de chaque réserve pour
  la partie visée ; un dépassement demande confirmation (le conteur tranche).
- Côté conteur, la colonne **AIP** de l'onglet Personnages affiche « utilisées /
  disponibles » (détail au survol) et 🩸 quand le personnage s'est nourri ; le « Récap du
  mois » du joueur fait de même.

### Tickets

Page **Tickets** (`/membres/tickets/`, tuile de l'espace membres) : nouvelle demande aux
conteurs (scène, règles, XP, signalement…), suivi, complément quand un conteur demande
des informations, annulation. Les conteurs ont un onglet **Tickets des joueurs** : les
tickets ouverts sont chargés par défaut (bouton pour afficher aussi les tickets clos),
réponse, statut, export CSV. La demande de modification d'une fiche validée crée aussi
un ticket.

### Textes longs compressés (Unishox2)

Les textes longs sont compressés avant d'être enregistrés : descriptif et réponse des
actions d'influence, description de l'ancien registre des raisons sociales, description et réponse des
tickets, message du conteur sur une fiche, messages des notifications et des challenges
demandés. Un texte de plus de 160 caractères est stocké en **octets** (Unishox2, environ
35 à 60 % de la taille d'origine pour du français) si la compression fait gagner au moins
10 % ; sinon il reste en texte. Les anciens documents restent lisibles. Bibliothèque :
`assets/js/camarilla/lib/unishox2.js` (Unishox2 1.1.5, licence Apache-2.0) ; code :
`assets/js/camarilla/compression.js`. Les exports CSV contiennent les textes en clair.

Les gros JSON (contenu des tableaux d'enquête, détail des fiches, cartes des personnages,
territoires) sont compressés avec **deflate**, la compression native des navigateurs
(environ 80 % de gain ; Unishox2 est trop lent sur ces volumes). Un navigateur antérieur
à 2023 ne sait pas les relire : il faut le mettre à jour.

### Annuaire gardé dans le navigateur

La liste des comptes (`annuaire`) et des personnages validés (`repertoire`) est lue
**une fois après la connexion**, puis gardée dans le navigateur. Elle sert à partager un
tableau d'enquête, à proposer un challenge, à consulter la carte d'un personnage
(conteurs). Pour voir un membre ou un personnage validé depuis, il suffit de **se
déconnecter puis se reconnecter**. Sa propre entrée de l'annuaire n'est vérifiée
qu'une fois par connexion (ou quand le nom ou le rôle change).

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
  pré-remplie ; « Enregistrer le brouillon » l'envoie dans Firestore, « Enregistrer et
  soumettre au conteur » la transmet pour validation. Les valeurs des listes sont
  rapprochées des listes officielles sans tenir compte des accents, majuscules, tirets
  et apostrophes (« Toreador » → « Toréador », « Humanité » → « Voie de l'Humanité ») ;
  un encart au-dessus de la fiche liste ces corrections, les valeurs inconnues (en
  rouge, à choisir dans la liste) et l'éventuelle différence de version de la fiche
  Excel (le site suit la fiche MET 8.0.2).
- Le calcul reproduit l'onglet « Calculs » de l'Excel, à quatre corrections près
  (listées dans la fiche, rubrique « Différences avec le fichier Excel ») : coût du
  changement de focus, 4e ligne de Représentation, 4e pouvoir d'ancien, compétences
  libres.
- Les champs Gotha, Pègre, génération et PX de la fiche sont recopiés dans le document
  pour la page Influences, ainsi que les actions inter-partie qu'elle donne (champ `aip` :
  base 3, +1 Informatique, Sciences, Troupeau, coût pour se nourrir).
- **Onglet Mystères** : la compétence Mystères et ses spécialités (les trois premières,
  offertes, suivent la secte, le clan et la race), puis les **connaissances** de chaque
  niveau connu (communes et secrètes). Un conteur voit tous les textes ; le joueur ceux
  que les conteurs lui ont transmis à la validation (un niveau pas encore validé est
  annoncé « accessible quand un conteur aura validé ce niveau »). L'ancienne carte
  Mystères de l'onglet Compétences est remplacée par **Spécialités de compétences** :
  une liste « ＋ ligne » (compétence + spécialité : Érudition / histoire de l'art,
  Conduite / moto…), sans coût en PX.
- **Aperçu avant impression** (bouton de la barre d'actions, et onglet Résumé) : toute
  la fiche mise en page pour une feuille A4 (identité, faiblesse, atouts et handicaps,
  attributs, compétences, mystères, disciplines et pouvoirs, techniques, rituels,
  historiques, serviteurs, équipement, mentorats, expérience, combat), textes des
  mystères en option. « Imprimer » n'imprime que la page (ou l'enregistre en PDF).
- **Sur ordinateur**, la page des fiches prend toute la largeur de l'écran (jusqu'à
  1 800 px) : les grilles de la fiche affichent plus de colonnes.
- **Alignement** : dans une rangée de champs, quand les libellés font une, deux ou trois
  lignes, c'est la case du libellé qui grandit (texte calé en bas) et tous les champs ont
  la même hauteur : ils restent alignés (idem dans les formulaires de l'espace membres).

### PNJ et antagonistes : propriété du rôle conteur

**Principe** : une fiche « Joueur » appartient à son joueur. Les PNJ, et toute fiche d'un
autre type (Antagoniste, Antagoniste C1, Ancien joueur / antagoniste), appartiennent au
**rôle conteur** : `proprietaire` vide, catégorie `pnj`. Tous ceux qui ont le rôle conteur
(ou admin) les gèrent, tant qu'ils l'ont : quand l'équipe de conteurs change, les nouveaux
en récupèrent la gestion, sans transfert à faire.

- **Passage aux conteurs** : quand un conteur enregistre la fiche d'un joueur avec un type
  autre que « Joueur », le site demande confirmation, prévient le joueur (notification
  « passée aux conteurs ») et range la fiche dans l'onglet « PNJ et antagonistes » ; le
  joueur en devient l'**interprète**. Une fiche créée par un conteur avec un type
  « Antagoniste » naît directement au rôle conteur. Les règles Firestore permettent à un
  conteur de vider le propriétaire d'une fiche, jamais de la donner à un autre compte.
- **Interprète** (champs `interprete`, `interpreteNom`) : le compte qui joue le personnage,
  choisi par un conteur dans la liste des comptes (en-tête de la fiche), et modifiable. Il
  trouve le personnage dans « Personnages que vous interprétez » (page des fiches), voit la
  fiche en lecture seule et reçoit les textes de ses mystères ; il ne la modifie pas. Il
  l'**incarne** comme ses propres personnages et utilise tous les outils de personnage :
  panneau d'affichage, tableau d'enquête (partage compris), carte de Grenoble, challenges,
  influences et tickets. Les règles Firestore traitent l'interprète comme le joueur du
  personnage (fonction `joueurDe`) ; le répertoire des personnages l'associe à son compte.
  Quand l'interprète change, le nouveau reprend le tableau d'enquête et la carte du
  personnage (l'ancien perd l'accès) ; les actions d'influence restent à celui qui les a
  envoyées.
- **Comptes > Maintenance > Passer les antagonistes au rôle conteur** (admin) : fait le
  tour des fiches existantes d'un autre type que « Joueur » encore rattachées à un compte
  (par exemple des antagonistes créés sous le compte d'un conteur qui quitte l'équipe) ;
  l'ancien propriétaire devient l'interprète.

Onglet **PNJ et antagonistes** de la page des fiches (tuile « PNJ » des outils conteur). « ＋ Nouveau
PNJ » : nom et catégorie — vampire (vénérables, anciens, ancillas…, âge à choisir), goule,
sabbatique, humain, inquisition, loup-garou, autre. La fiche MET s'ouvre pré-remplie
(type « Antagoniste », race, âge, secte) : même éditeur, mêmes calculs que les joueurs.

- Document `personnages/{id}` avec `pnj` (catégorie) et `proprietaire` vide : les
  règles ne laissent les écrire qu'aux conteurs, et les lire qu'aux conteurs et à leur
  interprète ; un joueur ne peut pas en créer. Ils ne vont ni dans le répertoire (partage des tableaux), ni dans les
  influences, ni dans « Toutes les fiches » / « À valider ».
- Actifs ou archivés ; dupliquer (pour une série de figurants), exporter, supprimer.
- Bouton « ⚔ Ajouter au combat » (aussi sur les fiches des joueurs, pour les conteurs).

### Combat — initiatives (conteurs)

Page `/membres/combat/` (tuile « Combat — initiatives »), faite pour un téléphone pendant
les parties comme pour un ordinateur pendant les RP. Le combat est gardé **dans le
navigateur** du conteur (rien dans Firestore) : il survit à un rechargement, pas à un
changement d'appareil.

- **Participants** : personnages de la cité (fiches en jeu, ou en réserve sur demande),
  PNJ, ou **temporaires** (nom et initiative, ou initiative au hasard entre deux bornes
  de 1 à 20 — impossible de valider si la borne basse dépasse la haute ; plusieurs d'un
  coup, numérotés). Pour une fiche, l'initiative est calculée : le plus haut entre
  Physique et Mental ; à égalité Mental, puis Physique, puis Social, puis au hasard. La
  Célérité de la fiche (niveau, pouvoirs d'ancien, techniques basées sur la Célérité) est
  reprise.
- **Début du tour** : sur chaque carte, bonus ou malus d'initiative, Célérité activée
  (+ niveaux de Célérité, pouvoirs d'ancien et techniques ; une action de plus avec
  Célérité 3, avec Célérité 5 et avec « Vitesse »), « +5 : n'a pas agi », actions en
  plus, et au premier tour l'action surprise. « ＋ Ajouter » fait entrer des
  participants (pendant un tour : au début du suivant). La Célérité reste cochée d'un
  tour à l'autre, le reste repart de zéro.
- **Tour** : round classique, puis rounds de Célérité (les deuxièmes actions après toutes
  les premières, les troisièmes après les deuxièmes), puis « Fin du tour — résolution »
  (bilan des dégâts et de la volonté).
- **Cartes** : compteurs de dégâts normaux, aggravés et volonté utilisée (sur le maximum
  de la fiche), « Hors combat » (annulable ; « Participants » ou le début du tour pour
  le remettre). La carte de celui qui agit a « Ouvrir la fiche », dans un nouvel onglet.
- **Barre du bas** : « Précédent » à gauche (jusque dans le tour précédent), « Suivant » à
  droite, au centre « ⏳ Retarder » (l'action passe à la fin du round ; s'il n'agit pas,
  « +5 au tour suivant »), « ＋ Ajouter », « À zéro », « Terminer ». Sur ordinateur, les
  flèches du clavier font Précédent / Suivant.
- **Affichage** : frise horizontale sur ordinateur (plusieurs actions avant et après),
  verticale sur téléphone (au moins l'action d'avant et celle d'après ; toucher une
  carte la déplie).

### Personnage incarné

Le panneau d'affichage, le tableau d'enquête, la carte de Grenoble, les challenges
et les influences sont des **outils de jeu** : seuls les personnages y ont accès,
pas les membres en tant que tels. Un joueur qui n'incarne personne tombe, sur chacune
de ces pages, sur un écran qui lui demande de choisir son personnage.

- L'**Espace membres** sépare les outils du compte et ceux du personnage :
  - **Mes outils joueur(se)** : notifications, fiches, tickets, Trouve le Sabbat,
    gazette ;
  - **Personnage incarné** : la liste des personnages validés du joueur (fiche
    « Validée (en réserve) » ou « En jeu »), y compris les **PNJ et antagonistes dont
    il est l'interprète** (« vous l'interprétez »), celui qu'il incarne coché ; un clic
    change de personnage, « Ne plus incarner personne » referme les outils ;
  - **Mes outils personnage**, sous cette liste, seulement quand le joueur incarne
    un personnage : panneau d'affichage, tableau d'enquête, carte de Grenoble,
    challenges, influences (ces dernières demandent un personnage « en jeu »).
- On change aussi de personnage depuis le nom du personnage affiché dans chaque outil.
- Le choix est mémorisé dans le navigateur, et revérifié dans la base à chaque
  page : une fiche archivée ou repassée en brouillon ne s'incarne plus.
- Tout ce qui se fait dans les outils est au nom du personnage : lignes du journal
  du panneau, tableaux d'enquête, « modifié par … ».
- Les règles Firestore vérifient à chaque écriture que le personnage appartient au
  membre et qu'il est validé : impossible d'agir au nom du personnage d'un autre.
- Les **conteurs** ont accès au panneau, au tableau d'enquête, à la carte et aux
  challenges sans personnage (sous leur propre nom), pour modérer ; les influences
  des joueurs sont dans « Influences — conteur ». Ils peuvent aussi incarner un de
  leurs personnages.
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

- **Tous** : la fenêtre des influences de la partie en cours, avec un rappel en rouge
  moins de deux jours avant la date limite.
- **Conteurs** : « À traiter » (actions d'influence sans réponse, tickets ouverts), les
  fiches soumises à valider (avec un lien pour les relire), et les challenges qu'ils ont
  envoyés, avec le résultat une fois résolus (« Lu, supprimer »).
- **Joueurs** :
  - les **nouvelles réponses des conteurs** à leurs actions d'influence et à leurs
    tickets (lien « Lire la réponse ») ; elles ne sont plus signalées une fois l'onglet
    Résultats ou la page Tickets ouverts. Rien n'est écrit dans la base pour cela : la
    date de réponse (`reponduLe`) est posée par le conteur, la date de dernière visite
    est gardée dans le navigateur ;
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

La page **Challenge** (`/utils/challenge`) est un outil de jeu : le générateur ne s'ouvre
qu'à un personnage incarné ou à un conteur. En plus :

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
- **Havres** : marqueurs déplaçables, nom, description, icône, couleur ;
- **Zones de chasse** : un **cercle autour du marqueur** (300 m par défaut, de 50 m à
  3 km), réglable au curseur ou en glissant le point blanc sur le bord du cercle ; le
  cercle suit le marqueur quand on le déplace ;
- **Territoires** : tracés par les conteurs seulement (ci-dessous) ; la case
  **Territoires** de la barre les affiche (lecture seule, choix retenu) ;
- **Rondes** : lignes reliant plusieurs points (cliquer sur un havre pendant le tracé
  y pose un point) ;
- **Zones** : les deux cartes de référence de l'association (zones 1 à 7 et 8 à 24),
  fichiers `assets/images/carte/zones-grenoble.webp` et `zones-isere.webp`.

- **Influences** : liste des mois (parties du calendrier, avec leur état) dans la barre
  du haut ; les actions d'influence du personnage pour ce mois s'affichent en losanges
  (or : Gotha, rouge : Pègre, bleu : AIP), avec le nom du personnage et l'action en dessous
  (« Se nourrir », « Enquête »…). **Au survol** d'un losange (souris), une infobulle donne
  le détail : action, partie, territoire, raison sociale ou sujet, description et, si les
  conteurs l'ont rédigée, la **résolution** (sinon « pas encore résolue ») ; un clic ouvre
  la fiche complète de l'action. Tant que la fenêtre de la partie est ouverte et
  que le conteur n'a pas répondu, on place une action (📍), on la déplace en la glissant
  ou on la retire de la carte ; les mois clos sont en lecture seule. L'outil
  **Influence** ouvre la gestion des influences avec le lieu cliqué déjà rempli. Un
  conteur voit toutes les actions du mois (lecture seule). Dans la gestion des
  influences, chaque formulaire a aussi « 📍 Choisir sur la carte ».
- **Territoire d'une action** : quand le joueur place ou déplace une action sur la carte
  (ou choisit son lieu dans le formulaire), le territoire de l'action devient celui des
  territoires officiels qui contient le lieu (champ `zone`, rien à changer dans les règles).
- **Vue d'un territoire** (`/utils/carte?mois=AAAA-MM&territoire=N`, lien « 📍 Voir sur la
  carte » de l'onglet *Territoires* de la page conteur) : la carte se cadre sur le
  territoire N et n'affiche que lui et ses actions de la partie : celles dont le territoire
  est N, et celles sans territoire placées dans N. Une action sans lieu y est posée au
  hasard (losange en pointillés, « lieu non précisé » ; toujours au même endroit, rien
  n'est enregistré). Lien « Toute la ville » pour revenir à la carte complète.

Sauvegarde : **une carte par personnage dans Firestore** (`cartes/{idPersonnage}`, JSON
compressé), envoyée 2 secondes après la dernière modification (déplacer ou zoomer la
carte n'écrit rien), avec une copie dans le navigateur ; l'état s'affiche en bas à
gauche. La carte d'un conteur sans personnage reste dans son navigateur. **Export /
Import JSON** dans tous les cas. Les actions d'influence sont dans Firestore (champ
`lieu : { lng, lat }`).

Les **conteurs** choisissent dans la barre la carte d'un personnage à consulter
(`/utils/carte?carte=ID`) : en **lecture seule**, sans outils de dessin.

**Outil des territoires** (`/membres/territoires/`, conteurs et admins) : carte en 2D
pour tracer les territoires officiels (clic par clic, double-clic ou Entrée pour fermer,
points déplaçables, ajout / suppression de points, agrandir / réduire, déplacement d'un
bloc, couleur, transparence, nom, description) et leur donner un **numéro de zone (1 à
24)**. Bouton **Enregistrer** (ou Ctrl+S) : document `territoires/officiels`. Le numéro de
zone sert à remplir la zone d'une action d'influence d'après le lieu choisi sur la carte.

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

Le style `dark` d'OpenFreeMap (fond Nuit) dessine les bois avec un motif `wood-pattern`
absent de sa propre planche d'icônes (avertissement MapLibre « Image "wood-pattern" could
not be loaded ») : `completerImages()` dans `carte-base.js` fabrique ce motif pour toutes
les cartes du site (carte de Grenoble, territoires, choix d'un lieu, Trouve le Sabbat).

### Trouve le Sabbat

Jeu à la GeoGuessr, limité à la commune de Grenoble (`/utils/sabbat`, lien depuis
l'espace membres). Une photo de rue montre l'entrée d'un repaire du Sabbat ; le joueur
regarde autour de lui (vues à 360° quand il y en a, déplacement possible dans la rue),
place son repère sur la mini-carte (agrandie au survol, en plein écran sur téléphone) et
valide. **5 repaires par traque**, jusqu'à **5 000 points** chacun selon la distance
(points pleins à moins de 50 m, environ 3 400 à 500 m, 2 300 à 1 km, 1 000 à 2 km, 400 à 3 km) ; à
moins de 150 m, le repaire est **débusqué**. En fin de traque : bilan sur la carte et
titre (de « Néonate égaré » à « Justicar »).

- **Points au joueur** : les points vont au compte (`classement/{uid}`), pas à un
  personnage. Champs : `nom` (nom affiché du compte), `total` (toutes les traques),
  `parties`, `meilleure` (meilleure traque, sur 25 000), `derniere`, `debusques`,
  `majLe`.
- **Classement** (bouton en haut de page) : par total des points ou par meilleure
  traque, 100 premiers. Réservé aux membres actifs ; un **admin** peut remettre un
  joueur à zéro (✕ sur sa ligne).
- **Sans compte actif** (visiteur, compte en attente) : on peut jouer, mais les points
  ne sont pas inscrits.
- **Garde-fous des règles** : chacun n'écrit que sa propre ligne, à son nom, une traque
  à la fois (+25 000 points et +5 débusqués au plus, `parties` + 1, `meilleure` tenue
  à jour), au plus une traque toutes les 30 secondes. Le score étant calculé dans le
  navigateur, un tricheur déterminé pourrait encore gonfler ses points dans ces
  limites : en cas d'abus, un admin remet sa ligne à zéro.
- **Photos** : API Mapillary v4 (`graph.mapillary.com/images`, recherche dans un petit
  carré tiré au hasard dans la commune, vues à 360° préférées, repaires d'une même
  traque à 600 m les uns des autres si possible), visionneuse MapillaryJS 4.1.2
  (`unpkg.com/mapillary-js@4.1.2`, licence MIT). Les photos sont sous licence
  **CC BY-SA 4.0** : la mention Mapillary est toujours affichée en bas de page, et le
  photographe, la date et le lien vers la photo apparaissent à chaque résultat et au
  bilan. Pendant la manche, le crédit intégré de la visionneuse est masqué (son lien
  donnerait le lieu).
- **Coût** : Mapillary est gratuit (quotas très larges). Firestore : une lecture et une
  écriture par traque terminée, une lecture par ligne affichée dans le classement.

### Le Gratin Dauphinois (gazette)

Une gazette par mois, mise en page par les conteurs (`/membres/gazette/edition/`), lue
par les membres actifs une fois publiée (`/membres/gazette/`, lien « Le Gratin
Dauphinois » de l'espace membres ; « Gazette — édition » côté conteurs).

- **Mise en page** : chaque page (une feuille A4) est découpée en **rangées**, chaque
  rangée en **colonnes** (découpages sur 12 : 12, 6+6, 8+4, 4+4+4, 3+6+3, 3+3+3+3…, au
  survol de la rangée ou en bas de la page) ; chaque colonne empile des articles, qui se
  déplacent par glisser-déposer ou avec les flèches. Un article retiré de la page reste
  dans la **réserve**. Pages à ajouter, monter, descendre, supprimer.
- **Articles** : surtitre, titre, chapeau, texte, signature ; style (article, gros titre
  de une, encadré, brève, petite annonce) ; texte sur 1 à 3 colonnes ; lettrine ;
  **alignement du texte** (justifié par défaut, à gauche ou à droite : « Alignement du
  texte » dans le panneau, ou les boutons ⫷ ☰ ⫸ de la barre au-dessus du texte, qui
  l'appliquent sans quitter l'écriture ; respecté à la lecture et à l'impression). Mise en
  forme du texte : ligne vide = paragraphe, `**gras**`, `*italique*`, `## Intertitre`,
  `> citation`, `- liste`, `---` (ornement). Aucun HTML n'est accepté.
- **Images** : seulement par **lien** `https://` (jamais stockées sur le site ni dans
  Firestore) ; légende, crédit, position (au-dessus, à gauche, à droite, en dessous),
  taille. Hauteur limitée pour tenir sur la page ; en gris éclairci à l'impression. Une
  image refusée par le site qui l'héberge est signalée dans l'éditeur et masquée aux
  joueurs.
- **Écrire dans la page** : titre, surtitre, chapeau, texte, signature, légende et crédit
  des images, et tout le bandeau s'écrivent directement dans la page, avec les champs du
  panneau remplis au fur et à mesure (et inversement). Une zone vide de l'article choisi
  montre ce qu'on peut y mettre (« Chapeau », « Signature »…). Dans le texte : Entrée =
  nouveau paragraphe, Maj+Entrée = retour à la ligne, barre de mise en forme (gras,
  italique, intertitre, citation, liste, ornement) convertie dans le format ci-dessus.
  Collage : texte seul. Les articles se déplacent par leur poignée ⠿ (ou en les saisissant
  hors du texte).
- **Bandeau** (onglet Réglages, ou dans la page) : titre du journal, sous-titre, devise,
  lieu, prix, date affichée (le mois du numéro par défaut), « oreilles » de part et
  d'autre du titre.
- **Pense-bête** : dans **Influences — conteur**, le bouton **« 📰 Gazette »** d'une action
  la note comme sujet d'article (document `gazette_pensebete/{mois}`, conteurs seulement :
  le joueur ne voit rien). L'onglet Pense-bête de l'éditeur liste les sujets du mois
  (une lecture), avec « Créer un article » (article en réserve, sujet rappelé), « Traité »
  et « Retirer » ; plus des notes libres gardées avec le numéro.
- **Sauvegarde locale** (bouton, Ctrl+S, et automatique à chaque modification) : dans le
  navigateur, sans aucune lecture ni écriture en ligne. Au retour sur l'éditeur, le
  brouillon local est repris sans relire le site, sauf si un autre conteur a enregistré
  une version plus récente (choix proposé).
- **Sauvegarder sur le site** : 2 écritures (`gazettes/{mois}`, document léger, et
  `gazettes/{mois}/contenu/edition`, numéro complet compressé). Visible des conteurs ;
  des joueurs seulement une fois publié. Chaque sauvegarde porte un numéro de version :
  si un autre conteur a enregistré entre-temps, l'éditeur le dit et propose de charger
  sa version ou de la remplacer.
- **Prévisualiser** : le numéro tel que les joueurs le verront (écran), ou tel qu'il sera
  imprimé (**A4 noir et blanc**), avec un contrôle des pages qui dépassent une feuille.
  **Publier…** ouvre cette prévisualisation : la publication se fait avec **« Valider et
  publier »**. « Retirer la publication » le repasse en brouillon.
- **Lecture des joueurs** : vieux journal (papier ivoire, filets, caractères d'époque)
  sur fond sombre, contrasté ; une seule colonne sur téléphone. **Imprimer** (ou
  Ctrl+P) : noir et blanc, fond blanc, filets fins, A4. Polices hébergées sur le site
  (`assets/fonts/gazette/`, licence OFL).
- **Économie Firestore** : la liste des numéros lit un petit document par numéro publié ;
  un numéro déjà lu et inchangé est relu dans le navigateur (0 lecture). Éditeur : la
  liste, puis le contenu seulement s'il a changé ; le pense-bête à la demande.
- **Règles** : `gazettes` et `contenu` écrits par les conteurs (même lot, même statut,
  version + 1, auteur = soi) ; lus par les membres actifs seulement si `statut ==
  'publiee'`. Suppression : brouillon par un conteur, numéro publié par un admin.

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

- **Comptes > Maintenance > Exporter toute la base (JSON)** (admin) : toutes les données,
  fiches complètes et textes en clair, images en option. Le fichier contient les emails
  des membres : gardez-le en lieu sûr ;
- **Influences — conteur > Exports CSV** (actions avec partie et lieu, raisons sociales
  tirées des fiches, personnages en jeu) et **Tickets > Exporter en CSV** ;
- **Fiches > Exporter en JSON** pour chaque fiche importante.

---

## Pour les développeurs

### Tester les règles de sécurité

```bash
cd firebase
npm install
npm test        # Java 21 requis (émulateur Firestore officiel)
```

À lancer avant chaque publication des règles (il n'y a pas de test automatique sur
GitHub).

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
| `assets/js/camarilla/carte-base.js` | MapLibre à la demande, fonds, choix d'un lieu, territoires officiels |
| `assets/js/camarilla/annuaire.js` | annuaire et répertoire gardés dans le navigateur |
| `assets/js/camarilla/suivi.js` | nouvelles réponses, travail des conteurs, rappels du calendrier |
| `assets/js/camarilla/mapillary-config.js` | jeton Mapillary du jeu « Trouve le Sabbat » (CSS : `assets/css/sabbat.css`) |
| `assets/js/camarilla/combat/modele.js`, `pages/combat.js` | combat : ordre d'initiative, tours et rounds de Célérité, page (CSS : `combat.css`) |
| `assets/js/camarilla/fiche/lecture.js` | lecture d'une fiche complète (document + détail) hors de la page des fiches |
| `assets/js/camarilla/gazette/modele.js`, `rendu.js`, `stockage.js`, `edition-en-place.js` | gazette : structure d'un numéro, rendu (écran, impression), Firestore et navigateur, écriture directe dans la page de l'éditeur (CSS : `gazette.css`, `gazette-edition.css`, `gazette-lecture.css` ; polices : `assets/fonts/gazette/`) |
| `assets/js/camarilla/outils/tableau.js`, `challenge.js` | scripts des pages tableau d'enquête et challenge (CSS : `assets/css/tableau.css`, `challenge.css`) |
| `assets/js/camarilla/pages/*.js` | une page = un module |
| `assets/js/camarilla/fiche/referentiel.js` | listes et coûts de la fiche MET (généré par `outils/fiche/extraire_excel.py`) |
| `assets/js/camarilla/fiche/modele.js` | structure d'une fiche, import d'un classeur Excel |
| `assets/js/camarilla/fiche/calculs.js` | calculs de l'onglet « Calculs » (PX, sang, volonté…) |
| `assets/js/camarilla/fiche/editeur.js` | éditeur (ordinateur et mobile) et résumé imprimable |
| `assets/js/camarilla/fiche/descriptions.js` | chargement des textes de règles depuis Firestore, faiblesse de clan |
| `assets/js/camarilla/fiche/mysteres.js`, `mysteres-base.js` | spécialités Mystères : niveaux connus, textes (conteurs), transmission au joueur |
| `assets/js/camarilla/fiche/differences.js` | récapitulatif des modifications depuis la dernière validation |
| `assets/js/camarilla/fiche/apercu.js` | aperçu avant impression de toute la fiche |
| `assets/js/camarilla/fiche/journal.js` | journal des consultations de fiches (conteurs, administrateurs) |
| `assets/js/camarilla/fiche/aip.js` | actions inter-partie qu'apporte une fiche (Informatique, Sciences, Troupeau) |
| `assets/css/membres.css`, `assets/css/fiche.css`, `assets/css/panneau.css` | styles de l'espace membres, de la fiche et du panneau d'affichage |
| `firebase/firestore.rules` | règles de sécurité (à publier dans la console) |
| `firebase/firestore.indexes.json` | exemptions d'index (gros champs) |
| `firebase/tests/regles.test.mjs` | tests des règles |
| `outils/fiche/*.py` | extraction des listes (Excel) et des descriptions (PDF, privées) |

Le SDK Firebase est chargé depuis le CDN de Google, en version 13.2.0 : pour changer
de version, modifiez les trois adresses `gstatic.com/firebasejs/…` en tête de `core.js`.
