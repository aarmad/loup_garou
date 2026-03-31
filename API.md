# 📚 API DOCUMENTATION

## Vue d'ensemble

Cette application utilise plusieurs couches d'API:
- **Couche Métier**: `GameController` (logique purement métier)
- **Couche Synchronisation**: `SyncManager` (coordination réseau)
- **Couche Bluetooth**: `BluetoothManager` (transport)
- **Couche UI**: `app.js` (interface utilisateur)

---

## GameController API

Gère la logique complète du jeu, indépendamment du transport.

### Methods

#### `startNewGame(playerNames, selectedRoles)`
Initialise une nouvelle partie.

```javascript
const controller = new GameController();
const success = controller.startNewGame(
    ['Alice', 'Bob', 'Charlie'],
    ['loupgarou', 'voyante', 'salvateur']
);
```

**Paramètres:**
- `playerNames` (Array<string>): Noms des joueurs
- `selectedRoles` (Array<string>): Noms des rôles

**Retour:** `boolean` - Succès du démarrage

---

#### `getGameState()`
Obtient l'état actuel complet de la partie.

```javascript
const state = controller.getGameState();
console.log(state);
// {
//   status: 'playing',
//   phase: 'day',
//   dayCount: 2,
//   nightCount: 1,
//   players: [...],
//   nightActions: [...],
//   votes: {...}
// }
```

**Retour:** `Object` - État sérialisable

---

#### `getCurrentPlayer()`
Obtient le joueur dont c'est le tour d'action. (Phase nuit)

```javascript
const player = controller.getCurrentPlayer();
if (player) {
    console.log(`${player.name} doit agir avec le rôle ${player.role}`);
}
```

**Retour:** `Object | null`

---

#### `performNightAction(targetId)`
Enregistre une action nocturne.

```javascript
controller.performNightAction(2); // Cibler le joueur ID 2
```

**Paramètres:**
- `targetId` (number): ID du joueur visé

**Retour:** `boolean` - Action enregistrée

**Événement émis:** `nightActionPerformed`

---

#### `nextNightAction()`
Passe à l'action nocturne suivante.

```javascript
const hasNext = controller.nextNightAction();
if (!hasNext) {
    // Fin de la nuit, phase de jour commence
}
```

**Retour:** `boolean` - Vraif s'il y a une action suivante

**Événement émis:**
- `nightActionChanged` - Nouvelle action
- `phaseChanged` - Fin de nuit → jour

---

#### `recordVote(voterId, targetId)`
Enregistre un vote de joueur.

```javascript
controller.recordVote(0, 1); // Joueur 0 vote pour le joueur 1
controller.recordVote(1, null); // Joueur 1 s'abstient
```

**Paramètres:**
- `voterId` (number): ID du votant
- `targetId` (number | null): ID de la cible ou null

---

#### `getVoteResults()`
Calcule et retourne les résultats du vote.

```javascript
const results = controller.getVoteResults();
console.log(results);
// {
//   results: { '1': 3, '2': 2 },  // targetId: votes
//   eliminated: 1,                 // Celui le plus voté
//   voteCount: 3                    // Nombre de votes reçus
// }
```

**Retour:** `{results: Object, eliminated: number | null, voteCount: number}`

---

#### `applyElimination(playerId)`
Applique l'élimination votée d'un joueur.

```javascript
const result = controller.applyElimination(1);
console.log(result);
// { eliminated: true, playerId: 1 }
// ou { survived: true, playerId: 1 }  // Idiot
// ou { linked: true, playerId: 1, linkedId: 3 }  // Cupidon
```

**Paramètres:**
- `playerId` (number): ID du joueur à éliminer

**Retour:** `Object` - Résultat de l'élimination

---

#### `checkWinConditions()`
Vérifie si la partie est terminée.

```javascript
const result = controller.checkWinConditions();
if (result.gameOver) {
    console.log(`${result.winner} wins!`);
    console.log(result.message); // Message détaillé
}
```

**Retour:** 
```javascript
{
    gameOver: boolean,
    winner: 'village' | 'wolves' | null,
    message: string
}
```

---

#### `getPlayers()`
Obtient la liste de tous les joueurs.

```javascript
const players = controller.getPlayers();
players.forEach(p => {
    console.log(`${p.name} (${p.role}) - ${p.alive ? 'Vivant' : 'Mort'}`);
});
```

**Retour:** `Array<Player>`

---

#### `getAlivePlayers()`
Obtient les joueurs vivants uniquement.

```javascript
const alive = controller.getAlivePlayers();
console.log(`${alive.length} joueurs vivants`);
```

**Retour:** `Array<Player>`

---

#### `getAvailableTargets(actionType, playerId)`
Obtient les cibles valides pour une action.

```javascript
const targets = controller.getAvailableTargets('kill', 0);
// Retourne les joueurs que le joueur 0 peut cibler
```

**Paramètres:**
- `actionType` (string): Type d'action ('kill', 'protect', 'info', etc.)
- `playerId` (number): ID du joueur qui agit

**Retour:** `Array<{id, name}>`

---

#### `onStateChange(callback)`
S'abonne aux changements d'état.

```javascript
controller.onStateChange((event) => {
    console.log(event.type); // 'gameStarted', 'nightActionPerformed', etc.
    console.log(event);      // Détails de l'événement
});
```

**Événements émis:**
- `gameStarted` - Partie lancée
- `nightActionChanged` - Action nuit changée
- `nightActionPerformed` - Action exécutée
- `phaseChanged` - Phase changée
- `playerEliminated` - Joueur éliminé

---

## SyncManager API

Synchronise l'état du jeu via Bluetooth.

### Constructor

```javascript
const syncManager = new SyncManager(bluetoothManager, gameController);
// Automatiquement lié aux deux composants
```

---

### Methods

#### `sendPlayerAction(actionType, targetId)`
Envoie une action d'un joueur au présentateur.

```javascript
// Joueur: envoyer action nocturne
await syncManager.sendPlayerAction('kill', 2);

// Ou skip
await syncManager.sendPlayerAction('skip', null);
```

**Paramètres:**
- `actionType` (string): Type d'action
- `targetId` (number | null): Cible

**Retour:** `Promise<boolean>` - Succès

---

#### `sendVote(voterId, targetId)`
Envoie un vote au présentateur.

```javascript
// Joueur vote pour éliminer quelqu'un
await syncManager.sendVote(0, 1);

// Ou s'abstenir
await syncManager.sendVote(0, null);
```

**Paramètres:**
- `voterId` (number): ID du votant
- `targetId` (number | null): ID de la cible

**Retour:** `Promise<boolean>`

---

#### `requestJoin(playerName)`
Envoie une demande de connexion.

```javascript
await syncManager.requestJoin('Alice');
```

**Paramètres:**
- `playerName` (string): Nom du joueur

**Retour:** `Promise<boolean>`

---

## BluetoothManager API

Gère la couche Bluetooth et la simulation.

### Constructor

```javascript
const bt = new BluetoothManager();
// Mode simulation auto si Bluetooth indisponible
```

---

### Properties

```javascript
bt.isAvailable         // boolean - Bluetooth disponible
bt.isConnected        // boolean - Connecté maintenant
bt.isPresenter        // boolean - Rôle présentateur
bt.simulationMode     // boolean - Mode simulation actif
```

---

### Methods

#### `createGame(playerName)`
Créer une partie (mode présentateur).

```javascript
const success = await bt.createGame('Présentateur Michel');
if (success) {
    console.log('Partie créée, attente des connexions...');
}
```

---

#### `joinGame(playerName)`
Rejoindre une partie.

```javascript
const success = await bt.joinGame('Alice');
if (success) {
    console.log('Connecté au jeu!');
}
```

---

#### `sendMessage(message)`
Envoyer un message au destinataire.

```javascript
await bt.sendMessage({
    type: 'playerAction',
    playerId: 0,
    action: 'kill',
    target: 2
});
```

**Types de messages standards:**
- `playerAction` - Action nuit
- `playerVote` - Vote
- `gameStarted` - Jeu lancé
- `phaseChanged` - Changement phase
- etc.

---

#### `disconnect()`
Déconnecter.

```javascript
await bt.disconnect();
console.log('Déconnecté');
```

---

#### `onMessage(callback)`
S'abonner aux messages entrants.

```javascript
bt.onMessage((message) => {
    console.log('Message:', message.type);
    // Traiter le message
});
```

---

## Roles API

### `getAvailableRoles(playerCount)`
Obtient les rôles pour un nombre de joueurs.

```javascript
const roles = getAvailableRoles(6);
// ['loupgarou', 'loupgarou', 'voyante', 'sorciere', 'chasseur', 'cupidon']
```

---

### `shuffleRoles(roles)`
Mélange aléatoirement les rôles.

```javascript
const shuffled = shuffleRoles(['loupgarou', 'voyante']);
// ['voyante', 'loupgarou'] ou ['loupgarou', 'voyante']
```

---

### `getRoleByName(roleName)`
Obtient la définition d'un rôle.

```javascript
const role = getRoleByName('voyante');
console.log(role);
// {
//   name: 'Voyante',
//   emoji: '🔮',
//   team: 'village',
//   description: '...',
//   hasNightAction: true,
//   nightActionType: 'info'
// }
```

---

### `validateSelectedRoles(selectedRoles, playerCount)`
Valide une sélection de rôles.

```javascript
const validation = validateSelectedRoles(['loupgarou', 'voyante'], 2);
// { valid: true } ou { valid: false, error: 'Message' }
```

---

## Événements Personnalisés

L'application émet des événements DOM pour les interactions.

### `playerJoined`
Un joueur s'est connecté.
```javascript
window.addEventListener('playerJoined', (e) => {
    console.log(`${e.detail.name} a rejoint!`);
});
```

### `roleAssigned`
Un rôle a été assigné au joueur.
```javascript
window.addEventListener('roleAssigned', (e) => {
    console.log(`Vous êtes ${e.detail.role}`);
});
```

### `nightActionPrompt`
Invitation à une action nocturne.
```javascript
window.addEventListener('nightActionPrompt', (e) => {
    console.log(`Action: ${e.detail.action.actionType}`);
});
```

### `votingPrompt`
Invitation à voter.
```javascript
window.addEventListener('votingPrompt', (e) => {
    // Afficher les cibles de vote
});
```

### `gameEnded`
Fin de partie.
```javascript
window.addEventListener('gameEnded', (e) => {
    console.log(`${e.detail.winner} wins!`);
});
```

---

## Exemple d'intégration: Nouveau rôle

Ajouter un rôle personnalisé:

```javascript
// 1. Définir dans js/roles.js
const newRole = {
    name: 'Alchimiste',
    emoji: '⚗️',
    team: 'village',
    description: 'Transforme les rôles chaque nuit.',
    instructions: [
        'Vous êtes l\'Alchimiste',
        'Chaque nuit, pointez 2 joueurs pour échanger leurs rôles',
        'Seuls vous voyez le changement'
    ],
    hasNightAction: true,
    nightActionType: 'swap',
    nightActionTarget: 'twoPlayers',
    winCondition: 'wolves'
};

ROLES.alchimiste = newRole;

// 2. Ajouter à la distribution
ROLE_DISTRIBUTIONS[7].push('alchimiste');

// 3. Implémenter la logique dans GameState.finishNightPhase()
if (action.actionType === 'swap') {
    // Aller les rôles entre action.playerId et action.target
}
```

---

## Débogage

### Logs personnalisés

```javascript
// Voir tous les messages Bluetooth
AppState.bluetoothManager.onMessage(m => {
    console.log('[BT]', m.type, m);
});

// État du jeu
console.log(AppState.gameController.getGameState());

// Liste des joueurs
console.log(AppState.gameController.getPlayers());

// Historique complet
console.log(AppState.gameController.gameState.history);
```

### Mode débogage UI

Ajouter à la fin d'app.js:

```javascript
// Afficher panel débogage en DEV
if (location.hostname === 'localhost') {
    document.getElementById('debugInfo').classList.add('active');
    
    // Mettre à jour en continu
    setInterval(() => {
        const state = AppState.gameController.getGameState();
        document.getElementById('debugInfo').innerHTML = `
            Phase: ${state.phase}<br>
            Day: ${state.dayCount}, Night: ${state.nightCount}<br>
            Players: ${state.players.length}<br>
            Status: ${state.status}
        `;
    }, 500);
}
```

---

## Performance Tips

1. **Throtteling des mises à jour UI**
   ```javascript
   let updateTimeout;
   function updateUI() {
       clearTimeout(updateTimeout);
       updateTimeout = setTimeout(() => {
           // Faire la mise à jour
       }, 100);
   }
   ```

2. **Caching des état**
   ```javascript
   const cachedState = AppState.gameController.getGameState();
   // Réutiliser cachedState plusieurs fois
   ```

3. **Listeners ciblés**
   ```javascript
   // Au lieu d'écouter ALL messages
   bluetooth.onMessage(m => {
       if (m.type === 'nightActionPrompt') {
           // Traiter
       }
   });
   ```

---

## Limitations et Futures

| Feature | Statut | Notes |
|---------|--------|-------|
| Web Bluetooth | ✅ Stable | Mode simulation si indisponible |
| PWA | ✅ Stable | Offline + cache |
| Rôles | ✅ 12 rôles | Extensible facilement |
| Historique | 🔄 Partial | Logs localement |
| Replay | ❌ Not impl | Approvisionnement possible |
| Sessions | ❌ Not impl | Sauvegarde à implémenter |
| Backend | ❌ Not impl | Optionnel pour persistence |

---

Pour plus: Consulter les commentaires dans le code source.
