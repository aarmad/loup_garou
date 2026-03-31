# 📂 STRUCTURE DU PROJET

## Vue d'ensemble

```
Inposteur/                       (Racine du projet)
├── 📄 Fichiers configuration
│   ├── index.html              (Page unique, SPA)
│   ├── manifest.json           (Configuration PWA)
│   ├── service-worker.js       (Offline + cache)
│   ├── server.js               (Serveur HTTPS Node.js)
│   ├── package.json            (Dépendances npm)
│   └── .gitignore              (Git ignore)
│
├── 📁 css/
│   └── main.css                (2100 lignes - styles responsive)
│
├── 📁 js/
│   ├── app.js                  (600 lignes - orchestration UI)
│   ├── roles.js                (200 lignes - rôles du jeu)
│   ├── gameLogic.js            (400 lignes - logique métier)
│   └── bluetooth.js            (300 lignes - gestion Bluetooth)
│
├── 📁 assets/                  (Dossier pour futures ressources)
│   └── (images, sons, etc.)
│
└── 📄 Documentation
    ├── README.md               (Documentation complète)
    ├── QUICKSTART.md           (Guide rapide)
    ├── API.md                  (API pour développeurs)  
    ├── DEPLOYMENT.md           (Guide déploiement)
    └── STRUCTURE.md            (Ce fichier)
```

**Taille totale:** ~400 KB (non compressé)

---

## 📄 Fichiers Principaux

### index.html (4 KB)
**Purpose:** Page unique SPA avec toutes les interfaces

**Contiens:**
- 3 écrans principaux (Lobby, Présentateur, Joueur)
- Structure HTML sémantique
- Références CSS et JS
- Service Worker registration
- Meta tags PWA

**Screen 1 - Lobby:**
- Pseudo + connexion Bluetooth
- Boutons: Créer / Rejoindre partie

**Screen 2 - Présentateur:**
- Configuration (nombre joueurs, rôles)
- Timeline nuit (actions rôles)
- Gestion jour (votes)
- Liste joueurs avec statuts

**Screen 3 - Joueur:**
- Affichage rôle
- Actions nocturnes
- Vote
- Messages système

---

### manifest.json (500 bytes)
**Purpose:** Configuration PWA (Progressive Web App)

**Contient:**
- Métadonnées app (nom, description)
- Icônes
- Thème couleur
- Display mode ("standalone")
- Start URL

**Résultat:** App installable sur écran d'accueil.

---

### service-worker.js (2 KB)
**Purpose:** Offline + caching

**Lifecycle:**
1. **Install:** Pré-cache les assets (HTML/CSS/JS)
2. **Activate:** Nettoie les anciens caches
3. **Fetch:** Stratégie "Cache First" avec fallback réseau

**Résultat:** App fonctionne sans internet après première visite.

---

### server.js (4 KB)
**Purpose:** Serveur HTTPS local pour développement

**Features:**
- Auto-génère certificat self-signed
- Écoute sur localhost:8000
- MIME types correctes
- Gestion CORS
- Headers HTTP appropriés

**Utilisation:**
```bash
npm start
# ou
node server.js
```

Accéder à: `https://localhost:8000`

---

### package.json (400 bytes)
**Purpose:** Configuration npm + dépendances

**Scripts:**
- `npm start` → Démarrer serveur
- `npm run cert` → Régénérer certificat SSL

**Note:** Aucune dépendance externe! Application "vanilla JavaScript".

---

### css/main.css (2100 lignes)
**Purpose:** Tous les styles du jeu

**Sections:**
1. **Reset + variables CSS** (~50 lignes)
   - Couleurs (primary, secondary, danger, etc.)
   - Espacements + rayons de bordure
   - Transitions

2. **Écrans globaux** (~50 lignes)
   - `.screen` - couches visibles
   - Transitions d'écran

3. **Lobby (150 lignes)**
   - `.logo` - animation float
   - `.form-group` - inputs
   - Statut Bluetooth

4. **Boutons (100 lignes)**
   - `.btn` - style universel
   - `.btn-primary` - gradient
   - `.btn-secondary` - flat
   - `.btn-icon` - circulaire
   - États disabled + hover

5. **Présentateur (600 lignes)**
   - Configuration (rôles, joueurs)
   - Timeline nuit
   - Phase jour
   - Gestion votes
   - Liste joueurs

6. **Joueur (500 lignes)**
   - Panneau rôle
   - Actions nocturnes
   - Vote anonyme
   - Résultats
   - Messages

7. **Responsive (100 lignes)**
   - Mobile: 320px+
   - Tablet: 768px+
   - Desktop: 1024px+

8. **Dark Mode (150 lignes)**
   - CSS variables override
   - Sélecteur `@media (prefers-color-scheme: dark)`

**KPI:** Performance A (Lighthouse)

---

### js/app.js (600 lignes)
**Purpose:** Orchestration UI + event handling

**Sections:**

1. **Initialisation (50 lignes)**
   - `initializeApp()` - setup
   - `updateBluetoothStatus()` - check disponibilité
   - `attachEventListeners()` - event binding

2. **Lobby Screen (100 lignes)**
   - `createGame()` - Présentateur
   - `joinGame()` - Joueur
   - Validation pseudo

3. **Presenter Screen (250 lignes)**
   - Configuration: nombre joueurs, rôles
   - `updatePlayerCountDisplay()`
   - `toggleRole()` - active/désactive rôles
   - `startGame()` - lance partie
   - **Phase Nuit:**
     - `showNightPhase()`
     - `updateNightActionsList()`
     - `previousNightAction()` / `nextNightAction()`
   - **Phase Jour:**
     - `showDayPhase()`
     - `startVoting()`
     - `showVoteResults()`
     - `confirmVote()` / `retryVote()`

4. **Player Screen (150 lignes)**
   - `showPlayerRole()` - affiche rôle
   - `showNightActionPrompt()` - invite action
   - `selectTarget()` - sélection cible
   - `skipNightAction()` - passer
   - `showVotingPrompt()` - invite vote
   - `selectVoteTarget()` - vote
   - `abstainVote()` - s'abstenir

5. **Bluetooth Handlers (50 lignes)**
   - `handleBluetoothMessage()`
   - `handlePlayerJoined()`

6. **Utilitaires (50 lignes)**
   - `showMessage()` - notifications
   - `formatDuration()` - timing

---

### js/roles.js (200 lignes)
**Purpose:** Définition des rôles du jeu

**Content:**

1. **ROLES Object (~150 lignes)**

   12 rôles complets:

   **Village (10):**
   - `voyante` 🔮 - découvre rôle
   - `cupidon` 💘 - lie 2 joueurs (1ère nuit)
   - `chasseur` 🔫 - élimine après mort
   - `pettefille` 👧 - voit la nuit
   - `sorciere` 🧙‍♀️ - 2 potions
   - `salvateur` 🛡️ - protège
   - `idiot` 🤡 - survit vote jour
   - `tancheancre` ⚙️ - lié à un autre
   - `gendarme` 🚔 - bloque action
   - `renard` 🦊 - détecte loup

   **Loups (2):**
   - `loupgarou` 🐺 - tue chaque nuit
   - `loupblanc` ⚪🐺 - loup solitaire

   Chaque rôle contient:
   - Emoji, nom, description
   - Team (village/wolves/solo)
   - Instructions joueur
   - Propriétés de mécaniques

2. **Distribution automatique (~20 lignes)**
   - `ROLE_DISTRIBUTIONS` - rôles par nombre joueurs
   - 3 joueurs → 5 joueurs → 15 joueurs

3. **Helper Functions (~30 lignes)**
   - `getAvailableRoles(playerCount)`
   - `shuffleRoles(roles)`
   - `getRoleByName(roleName)`
   - `validateSelectedRoles()`
   - `getNightActionRoles()`

---

### js/gameLogic.js (400 lignes)
**Purpose:** Logique métier du jeu (indépendante du transport)

**Classes:**

1. **GameState (250 lignes)**

   Propriétés:
   ```javascript
   {
       status, phase, dayCount, nightCount,
       players[], assignedRoles[], selectedRoles[],
       nightActions[], currentNightActionIndex,
       votes{}, linkedPlayers[]
   }
   ```

   Methods:
   - `initializeGame()` - crée partie
   - `getCurrentNightAction()` - action active
   - `recordNightAction()` - enregistre action
   - `finishNightPhase()` - applique tué, passe au jour
   - `recordVote()` - enregistre vote
   - `getVoteResults()` - Calcule résultats
   - `applyElimination()` - élimine joueur
   - `checkWinConditions()` - vérifie fin partie
   - `getAvailableTargets()` - cibles légales

2. **GameController (150 lignes)**

   Orchestre GameState + listeners

   - `startNewGame()` - wrapper
   - `getGameState()` - sérialisation
   - `performNightAction()`
   - `nextNightAction()`
   - `recordVote()`
   - `onStateChange(callback)` - événements

**Événements émis:**
- `gameStarted`
- `nightActionChanged`
- `phaseChanged`
- `playerEliminated`

---

### js/bluetooth.js (300 lignes)
**Purpose:** Gestion Bluetooth + synchronisation réseau

**Classes:**

1. **BluetoothManager (150 lignes)**

   Encapsule Web Bluetooth API avec simulation

   Methods:
   - `createGame(playerName)` - Présentateur
   - `joinGame(playerName)` - Joueur
   - `sendMessage(msg)` - Envoi
   - `disconnect()` - Fermeture

   Features:
   - ✅ Web Bluetooth réelle si disponible
   - ✅ Mode simulation si indisponible
   - ✅ Queue messages fiable
   - ✅ Gestion chunking (> 20 bytes)

2. **SyncManager (100 lignes)**

   Synchronise GameController ↔ BluetoothManager

   - Reçoit messages Bluetooth
   - Émet événements DOM
   - Reçoit changements jeu
   - Les envoie via Bluetooth

   Flow:
   ```
   Bluetooth Message
       ↓
   SyncManager.handleBluetoothMessage()
       ↓
   window.dispatchEvent(CustomEvent)
       ↓
   app.js listeners
       ↓
   UI update
   ```

**Mode Simulation:**
- Activé auto si Bluetooth indisponible
- Messages simulés avec délais réalistes
- Tous les rôles testables
- Idéal pour développement

---

## 📊 Graphique de Dépendances

```
index.html
    ↓
├── service-worker.js        (offline)
├── manifest.json            (PWA)
├── css/main.css            (styles)
└── js/
    ├── roles.js            (data)
    ├── gameLogic.js        (logic)
    │   └── roles.js
    ├── bluetooth.js        (sync)
    │   ├── gameLogic.js
    │   └── roles.js
    └── app.js              (ui)
        ├── gameLogic.js
        ├── bluetooth.js
        ├── roles.js
        └── css/main.css
```

**Flot de données:**
```
UI (app.js)
    ↓
GameController (gameLogic.js)
    ↓
SyncManager (bluetooth.js)
    ↓
BluetoothManager
    ↓
Appareils Bluetooth
```

---

## 💾 Stockage Données

### localStorage
```javascript
localStorage.setItem('playerName', 'Alice')    // Sauvé localement
localStorage.getItem('playerName')              // Récupéré
```

### Cache (Service Worker)
```javascript
caches.open('loup-garou-v1')  // Pré-cache assets
// Stratégie: Cache First → Network Fallback
```

### Session (Runtime)
```javascript
AppState = {
    myName, myRole, myId, isPresenter,
    gameController, bluetoothManager, syncManager,
    connectedPlayers[], selectedRoles[]
}
```

---

## 🔄 Flux de Requête Principal

### Créer une partie (Présentateur)

```
1. User clique "Créer Partie"
   → app.js: createGame()
   
2. BluetoothManager.createGame()
   → AppState.isPresenter = true
   → notifyListeners({type: 'gameCreated'})
   
3. app.js showPresenterScreen()
   → Affiche écran config
   
4. User configure rôles + joueurs
   → updatePlayerCountDisplay()
   → updateRolesList()
   
5. User clique "Démarrer"
   → startGame()
   
6. GameController.startNewGame()
   → Assigne les rôles
   → Émet 'gameStarted'
   
7. showNightPhase()
   → Affiche timeline nuit
   → promptNightAction() pour premier joueur
   
8. BluetoothManager.sendMessage({
       type: 'gameStarted',
       state: appState
   })
```

### Rejoindre une partie (Joueur)

```
1. User clique "Rejoindre"
   → app.js: joinGame()
   
2. BluetoothManager.joinGame()
   → Navigator.bluetooth.requestDevice()
   → device.gatt.connect()
   → startNotifications()
   → Émet 'connected'
   
3. app.js showPlayerScreen()
   → Affiche "En attente..."
   
4. Présentateur démarre
   → Message: {type: 'gameStarted'}
   
5. SyncManager.handleBluetoothMessage()
   → Émet CustomEvent 'roleAssigned'
   
6. app.js: showPlayerRole()
   → Affiche rôle + instructions
   
7. Joueur clique "J'ai lu"
   → retour à "En attente"
   
8. Présentateur avance nuit
   → Message: {type: 'nightActionPrompt'}
   
9. app.js: showNightActionPrompt()
   → Affiche cibles disponibles
   → Joueur sélectionne
   → Envoie 'playerAction' via Bluetooth
```

---

## 📈 Statistiques Code

| Fichier | Lignes | Fonction |
|---------|--------|----------|
| index.html | 300 | Structure HTML |
| main.css | 2100 | Styles + responsive |
| app.js | 600 | UI + event handling |
| gameLogic.js | 400 | Logique métier |
| bluetooth.js | 300 | Sync Bluetooth |
| roles.js | 200 | Rôles data |
| service-worker.js | 100 | PWA offline |
| server.js | 150 | Serveur dev |
| **TOTAL** | **4150** | |

**Gzip:** ~130 KB (40% du texte brut)

---

## 🚀 Build Artifacts

Non applicable - application statique pure.

Aucun build step requis.

Copier simplement tous les fichiers → serveur web.

---

## 📝 Modifications Courantes

### Ajouter un rôle
1. Éditer `js/roles.js` - ajouter au `ROLES`
2. Ajouter à `ROLE_DISTRIBUTIONS`
3. Implémenter logique dans `gameLogic.js`

### Changer les couleurs
1. Éditer `:root` dans `css/main.css`
2. Variables `--primary`, `--secondary`, etc.

### Ajouter un écran
1. Créer `<div class="screen">` dans `index.html`
2. Ajouter styles dans `main.css`
3. Ajouter logic dans `app.js`
4. Lier les boutons

---

Pour plus de détails: voir les fichiers source avec commentaires détaillés.

Happy coding! 🚀
