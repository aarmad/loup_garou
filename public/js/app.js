/**
 * LOUP-GAROU - APPLICATION PRINCIPALE
 * Orchestre l'UI et la logique métier
 */

// État global de l'application
const AppState = {
    myName: '',
    myRole: null,
    myId: null,
    isPresenter: false,
    currentRoomNumber: null,
    gameController: null,
    networkManager: null,
    connectedPlayers: [],
    selectedRoles: [],
    selectedPlayerCount: 3,
    gameStarted: false
};

/**
 * Initialiser l'application
 */
function initializeApp() {
    console.log('Initialisation de l\'application...');

    // Créer les instances
    AppState.gameController = new GameController();
    AppState.networkManager = new NetworkManager();

    // Attacher les listeners d'événements
    attachEventListeners();

    // Vérifier la disponibilité réseau
    updateNetworkStatus();

    // Charger les paramètres sauvegardés
    loadSavedSettings();

    // Écouter les changements localStorage
    window.addEventListener('storage', handleStorageChange);

    console.log('Application initialisée ✓');
}

/**
 * Mettre à jour le statut réseau
 */
function updateNetworkStatus() {
    const statusElement = document.getElementById('bluetoothStatus');
    const createBtn = document.getElementById('createGameBtn');
    const joinBtn = document.getElementById('joinGameBtn');

    statusElement.innerHTML = '<span class="status-icon">✅</span> <span>Connecté au serveur</span>';
    statusElement.classList.add('available');
    createBtn.disabled = false;
    joinBtn.disabled = false;
}

/**
 * Attacher les événements
 */
function attachEventListeners() {
    // Lobby
    document.getElementById('createGameBtn').addEventListener('click', createGame);
    document.getElementById('joinGameBtn').addEventListener('click', joinGame);

    // Présentateur
    document.getElementById('backBtn').addEventListener('click', backToLobby);
    document.getElementById('incPlayersBtn').addEventListener('click', increasePlayerCount);
    document.getElementById('decPlayersBtn').addEventListener('click', decreasePlayerCount);
    document.getElementById('startGameBtn').addEventListener('click', startGame);
    document.getElementById('previousActionBtn').addEventListener('click', previousNightAction);
    document.getElementById('nextActionBtn').addEventListener('click', nextNightAction);
    document.getElementById('startVotingBtn').addEventListener('click', startVoting);
    document.getElementById('confirmVoteBtn').addEventListener('click', confirmVote);
    document.getElementById('retryVoteBtn').addEventListener('click', retryVote);

    // Joueur
    document.getElementById('disconnectBtn').addEventListener('click', disconnect);
    document.getElementById('confirmRoleBtn').addEventListener('click', confirmRole);
    document.getElementById('skipActionBtn').addEventListener('click', skipNightAction);
    document.getElementById('abstainBtn').addEventListener('click', abstainVote);
    document.getElementById('continueBtn').addEventListener('click', continueGame);
    document.getElementById('dismissMessageBtn').addEventListener('click', dismissMessage);
}

/**
 * Sauvegarder les paramètres
 */
function saveSettings() {
    localStorage.setItem('playerName', AppState.myName);
}

/**
 * Charger les paramètres sauvegardés
 */
function loadSavedSettings() {
    const saved = localStorage.getItem('playerName');
    if (saved) {
        document.getElementById('playerName').value = saved;
    }
}

/**
 * Gérer les changements localStorage
 */
function handleStorageChange(e) {
    if (e.key && e.key.startsWith('game_')) {
        // L'état de la partie a changé
        const newState = JSON.parse(e.newValue);
        
        if (AppState.isPresenter) {
            // Présentateur: afficher les joueurs connectés
            updateConnectedPlayers(newState);
        } else if (AppState.gameStarted) {
            // Joueur: synchroniser l'état du jeu
            syncGameState(newState);
        }
    }
}

// ============================================
// LOBBY SCREEN
// ============================================

/**
 * Créer une nouvelle partie
 */
async function createGame() {
    const playerName = document.getElementById('playerName').value.trim();
    if (!playerName) {
        showMessage('Veuillez entrer un pseudo');
        return;
    }

    AppState.myName = playerName;
    AppState.isPresenter = true;
    saveSettings();

    try {
        // Créer la partie via réseau
        const result = await AppState.networkManager.createGame(playerName);
        AppState.myId = result.playerId;
        AppState.currentRoomNumber = result.gameId;

        // Afficher l'écran présentateur
        showPresenterScreen();
        
        // Afficher le numéro de salle en permanence
        updateRoomNumberDisplay(result.gameId);
        
        updatePlayerCountDisplay();
        updateRolesList();

        // Notification courte du code
        showMessage(`Partie créée! Code salle: ${result.gameId}`);
    } catch (err) {
        showMessage('Erreur lors de la création de la partie: ' + err.message);
    }
}

/**
 * Rejoindre une partie existante
 */
async function joinGame() {
    const playerName = document.getElementById('playerName').value.trim();
    if (!playerName) {
        showMessage('Veuillez entrer un pseudo');
        return;
    }

    // Demander le code de salle
    const gameCode = prompt('Entrez le code de la salle:');
    if (!gameCode) return;

    AppState.myName = playerName;
    AppState.currentRoomNumber = gameCode;
    saveSettings();

    try {
        // Se connecter via réseau
        const result = await AppState.networkManager.joinGame(gameCode, playerName);
        AppState.myId = result.playerId;

        // Afficher l'écran joueur
        document.getElementById('playerNameDisplay').textContent = playerName;
        document.getElementById('playerRoomNumber').textContent = gameCode;
        showPlayerScreen();
        showWaitingPanel();
    } catch (err) {
        showMessage('Impossible de se connecter: ' + err.message);
    }
}

// ============================================
// PRESENTER SCREEN
// ============================================

/**
 * Afficher l'écran présentateur
 */
function showPresenterScreen() {
    document.getElementById('lobbyScreen').classList.remove('active');
    document.getElementById('presenterScreen').classList.add('active');
}

/**
 * Augmenter le nombre de joueurs
 */
function increasePlayerCount() {
    if (AppState.selectedPlayerCount < 15) {
        AppState.selectedPlayerCount++;
        updatePlayerCountDisplay();
    }
}

/**
 * Diminuer le nombre de joueurs
 */
function decreasePlayerCount() {
    if (AppState.selectedPlayerCount > 3) {
        AppState.selectedPlayerCount--;
        updatePlayerCountDisplay();
    }
}

/**
 * Mettre à jour l'affichage du nombre de joueurs
 */
function updatePlayerCountDisplay() {
    document.getElementById('playerCountDisplay').textContent = AppState.selectedPlayerCount;
    updateRolesList();
}

/**
 * Mettre à jour le numéro de salle
 */
function updateRoomNumberDisplay(roomNumber) {
    AppState.currentRoomNumber = roomNumber;
    const presenterRoom = document.getElementById('roomNumber');
    const playerRoom = document.getElementById('playerRoomNumber');
    
    if (presenterRoom) presenterRoom.textContent = roomNumber;
    if (playerRoom) playerRoom.textContent = roomNumber;
}

/**
 * Mettre à jour la liste des rôles disponibles
 */
function updateRolesList() {
    const container = document.getElementById('rolesList');
    container.innerHTML = '';

    // Initialiser les rôles sélectionnés par défaut
    if (AppState.selectedRoles.length === 0) {
        AppState.selectedRoles = getAvailableRoles(AppState.selectedPlayerCount);
    }

    // Afficher tous les rôles disponibles
    Object.keys(ROLES).forEach(roleName => {
        const role = ROLES[roleName];
        const isSelected = AppState.selectedRoles.includes(roleName);

        const toggle = document.createElement('div');
        toggle.className = 'role-toggle' + (isSelected ? ' active' : '');
        
        let roleDisplay = role.emoji;
        if (role.image) {
            roleDisplay = `<img src="${role.image}" alt="${role.name}" style="width: 100%; height: 100%; object-fit: contain;" />`;
        }
        
        toggle.innerHTML = `
            <div class="role-toggle-emoji">${roleDisplay}</div>
            <div style="font-size: 11px; text-align: center;">${role.name}</div>
        `;

        toggle.addEventListener('click', () => toggleRole(roleName, toggle));
        container.appendChild(toggle);
    });

    // Mettre à jour le bouton "Démarrer"
    updateStartButton();
}

/**
 * Basculer un rôle
 */
function toggleRole(roleName, element) {
    const index = AppState.selectedRoles.indexOf(roleName);
    if (index > -1) {
        AppState.selectedRoles.splice(index, 1);
        element.classList.remove('active');
    } else {
        if (AppState.selectedRoles.length < AppState.selectedPlayerCount) {
            AppState.selectedRoles.push(roleName);
            element.classList.add('active');
        } else {
            showMessage('Vous avez atteint le nombre maximum de rôles');
            return;
        }
    }

    updateStartButton();
}

/**
 * Mettre à jour l'état du bouton "Démarrer"
 */
function updateStartButton() {
    const btn = document.getElementById('startGameBtn');
    const gameState = AppState.networkManager.getGameState();
    
    const enoughPlayers = gameState && gameState.players && 
                          gameState.players.length >= AppState.selectedPlayerCount;
    const validRoles = validateSelectedRoles(AppState.selectedRoles, AppState.selectedPlayerCount);
    
    btn.disabled = !enoughPlayers || !validRoles.valid;

    if (!enoughPlayers) {
        btn.title = 'Attendez plus de joueurs';
    } else if (!validRoles.valid) {
        btn.title = validRoles.error;
    }
}

/**
 * Mettre à jour les joueurs connectés
 */
function updateConnectedPlayers(gameState) {
    if (!gameState) return;
    
    AppState.connectedPlayers = gameState.players.filter(p => !p.isPresenter) || [];
    const playerCountElement = document.getElementById('playerCount');
    const playerCountDisplayElement = document.getElementById('playerCountDisplay');
    
    const totalPlayers = gameState.players.length;
    if (playerCountElement) {
        playerCountElement.textContent = totalPlayers;
    }
    if (playerCountDisplayElement) {
        playerCountDisplayElement.textContent = totalPlayers;
    }
    
    updateStartButton();
}

/**
 * Démarrer la partie
 */
function startGame() {
    const gameState = AppState.networkManager.getGameState();
    const playerNames = gameState.players.map(p => p.name);

    // Démarrer le jeu
    AppState.gameController.startNewGame(playerNames, AppState.selectedRoles);
    AppState.gameStarted = true;

    // Mettre à jour l'état dans localStorage
    AppState.networkManager.updateGameState({
        state: 'playing',
        roles: AppState.selectedRoles,
        players: gameState.players.map(p => ({
            ...p,
            role: null // Les rôles seront assignés individuellement
        }))
    });

    // Masquer la section config, afficher la section jeu
    document.getElementById('configSection').classList.add('hidden');
    document.getElementById('gameSection').classList.remove('hidden');

    // Commencer par la nuit
    showNightPhase();
}

/**
 * Afficher la phase de nuit
 */
function showNightPhase() {
    const state = AppState.gameController.getGameState();
    document.getElementById('currentPhase').textContent = `Nuit ${state.nightCount + 1}`;
    document.getElementById('nightPanel').classList.add('active');
    document.getElementById('dayPanel').classList.remove('active');
    document.getElementById('votingPanel').classList.remove('active');

    updateNightActionsList();
}

/**
 * Mettre à jour le listage des actions nocturnes
 */
function updateNightActionsList() {
    const list = document.getElementById('nightActionsList');
    const state = AppState.gameController.getGameState();
    list.innerHTML = '';

    if (!state.nightActions || state.nightActions.length === 0) {
        // Pas d'actions - passer au jour
        nextNightAction();
        return;
    }

    state.nightActions.forEach((action, index) => {
        const player = AppState.gameController.getPlayer(action.playerId);
        const role = ROLES[player.role];
        const isActive = index === state.currentNightActionIndex;
        const isCompleted = action.completed;

        const item = document.createElement('div');
        item.className = 'action-item' + (isActive ? ' active' : '') + (isCompleted ? ' completed' : '');
        item.innerHTML = `
            <span class="action-icon">${role.emoji}</span>
            <span>${player.name} (${role.name})</span>
            ${isCompleted ? '<span style="margin-left: auto;">✓</span>' : ''}
        `;

        list.appendChild(item);
    });
}

/**
 * Action nocturne précédente
 */
function previousNightAction() {
    AppState.gameController.gameState.previousNightAction();
    updateNightActionsList();
}

/**
 * Action nocturne suivante
 */
function nextNightAction() {
    const state = AppState.gameController.getGameState();
    const action = AppState.gameController.getCurrentAction();
    
    if (action && !action.completed) {
        showMessage('Complétez l\'action actuelle d\'abord');
        return;
    }

    const hasNext = AppState.gameController.nextNightAction();
    
    if (!hasNext) {
        // Fin de la nuit - passage au jour
        showDayPhase();
    } else {
        updateNightActionsList();
    }
}

/**
 * Afficher la phase de jour
 */
function showDayPhase() {
    const state = AppState.gameController.getGameState();
    document.getElementById('currentPhase').textContent = `Jour ${state.dayCount}`;
    document.getElementById('nightPanel').classList.remove('active');
    document.getElementById('dayPanel').classList.add('active');
    document.getElementById('votingPanel').classList.remove('active');

    updatePlayersList();
}

/**
 * Mettre à jour la liste des joueurs
 */
function updatePlayersList() {
    const list = document.getElementById('playersList');
    list.innerHTML = '';

    AppState.gameController.getPlayers().forEach(player => {
        const role = ROLES[player.role];
        const status = player.alive ? 'Vivant' : 'Éliminé';

        const item = document.createElement('div');
        item.className = 'player-item';
        let roleEmoji = role.emoji;
        if (role.image) {
            roleEmoji = `<img src="${role.image}" alt="${role.name}" style="width: 24px; height: 24px; object-fit: contain;" />`;
        }
        
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                <span style="font-size: 20px;">${roleEmoji}</span>
                <div style="flex: 1;">
                    <div class="player-name">${player.name}</div>
                    <div class="player-role">${role.name}</div>
                </div>
            </div>
            <div class="player-status ${player.alive ? 'alive' : 'dead'}">
                ${status}
            </div>
        `;

        list.appendChild(item);
    });
}

/**
 * Démarrer la phase de vote
 */
function startVoting() {
    const alivePlayers = AppState.gameController.getAlivePlayers();
    
    // Les joueurs doivent voter
    AppState.networkManager.updateGameState({ currentPhase: 'voting' });

    document.getElementById('dayPanel').classList.remove('active');
    document.getElementById('votingPanel').classList.add('active');

    // Afficher les résultats de vote (en temps réel)
    setTimeout(() => {
        showVoteResults();
    }, 5000);
}

/**
 * Afficher les résultats de vote
 */
function showVoteResults() {
    const results = AppState.gameController.getVoteResults();
    const display = document.getElementById('votesDisplay');
    display.innerHTML = '';

    // Afficher tous les votes
    Object.entries(results.results).forEach(([targetId, count]) => {
        const target = AppState.gameController.getPlayer(parseInt(targetId));
        const isLead = parseInt(targetId) === results.eliminated;

        const result = document.createElement('div');
        result.className = 'vote-result' + (isLead ? ' lead' : '');
        result.innerHTML = `
            <div class="vote-result-player">${target.name}</div>
            <div class="vote-result-count">${count}</div>
        `;

        display.appendChild(result);
    });

    // Afficher le bouton de confirmation
    const confirmBtn = document.getElementById('confirmVoteBtn');
    confirmBtn.disabled = !results.eliminated;
}

/**
 * Confirmer l'élimination
 */
function confirmVote() {
    const results = AppState.gameController.getVoteResults();
    if (!results.eliminated) return;

    const playerId = results.eliminated;
    AppState.gameController.applyElimination(playerId);

    // Vérifier les conditions de victoire
    const winCheck = AppState.gameController.checkWinConditions();
    if (winCheck.gameOver) {
        endGame(winCheck);
        return;
    }

    // Commencer la nuit
    showNightPhase();
}

/**
 * Recommencer le vote
 */
function retryVote() {
    startVoting();
}

/**
 * Retour au lobby
 */
function backToLobby() {
    if (AppState.gameStarted) {
        if (!confirm('Êtes-vous sûr? Cela fermera la partie.')) return;
    }

    AppState.isPresenter = false;
    AppState.gameStarted = false;
    AppState.connectedPlayers = [];
    AppState.selectedRoles = [];
    AppState.networkManager.disconnect();
    
    document.getElementById('presenterScreen').classList.remove('active');
    document.getElementById('lobbyScreen').classList.add('active');
    
    document.getElementById('configSection').classList.remove('hidden');
    document.getElementById('gameSection').classList.add('hidden');
}

// ============================================
// PLAYER SCREEN
// ============================================

/**
 * Afficher l'écran joueur
 */
function showPlayerScreen() {
    document.getElementById('lobbyScreen').classList.remove('active');
    document.getElementById('playerScreen').classList.add('active');
}

/**
 * Afficher le panneau d'attente
 */
function showWaitingPanel() {
    document.getElementById('waitingPanel').classList.add('active');
    document.getElementById('rolePanel').classList.remove('active');
    document.getElementById('nightActionPanel').classList.remove('active');
    document.getElementById('votingPanel').classList.remove('active');
    document.getElementById('resultPanel').classList.remove('active');
    document.getElementById('eliminatedPanel').classList.remove('active');
}

/**
 * Synchroniser l'état du jeu pour le joueur
 */
function syncGameState(gameState) {
    if (!gameState) return;

    // Vérifier si le jeu a démarré et si on connaît notre rôle
    if (gameState.state === 'playing' && gameState.players) {
        const myPlayer = gameState.players.find(p => p.playerId === AppState.myId);
        if (myPlayer && myPlayer.role && !AppState.myRole) {
            showPlayerRole(myPlayer);
        }
    }

    // Synchroniser les phases
    if (gameState.currentPhase === 'day' && AppState.gameController.getGameState().phase !== 'day') {
        showDayPhasePlayer(gameState);
    } else if (gameState.currentPhase === 'night' && AppState.gameController.getGameState().phase !== 'night') {
        showNightPhasePlayer(gameState);
    } else if (gameState.currentPhase === 'voting') {
        showVotingPhasePlayer(gameState);
    }
}

/**
 * Afficher le rôle du joueur
 */
function showPlayerRole(player) {
    AppState.myRole = player.role;
    const role = ROLES[player.role];
    
    if (!role) return;

    // Afficher l'image du rôle
    const roleImg = document.getElementById('roleImg');
    if (role.image && roleImg) {
        roleImg.src = role.image;
        roleImg.alt = role.name;
    }
    
    document.getElementById('roleName').textContent = role.name;
    document.getElementById('roleDescription').textContent = role.description;

    // Afficher les instructions
    const instructionsDiv = document.getElementById('roleInstructions');
    if (role.instructions && role.instructions.length > 0) {
        instructionsDiv.innerHTML = `
            <h4>Instructions:</h4>
            <ul>${role.instructions.map(i => `<li>${i}</li>`).join('')}</ul>
        `;
    }

    showRolePanel();
}

/**
 * Afficher le panneau du rôle
 */
function showRolePanel() {
    document.getElementById('waitingPanel').classList.remove('active');
    document.getElementById('rolePanel').classList.add('active');
}

/**
 * Confirmer la lecture du rôle
 */
function confirmRole() {
    showWaitingPanel();
}

/**
 * Afficher phase jour (joueur)
 */
function showDayPhasePlayer(gameState) {
    showWaitingPanel();
}

/**
 * Afficher phase nuit (joueur)
 */
function showNightPhasePlayer(gameState) {
    const role = ROLES[AppState.myRole];
    if (role && role.hasNightAction) {
        showNightActionPrompt();
    } else {
        showWaitingPanel();
    }
}

/**
 * Afficher l'invite d'action nocturne (joueur)
 */
function showNightActionPrompt() {
    const role = ROLES[AppState.myRole];
    if (!role) return;

    const alivePlayers = AppState.gameController.getAlivePlayers();
    
    document.getElementById('actionPrompt').textContent = `Choisissez une cible pour: ${role.nightActionType}`;

    const targetsList = document.getElementById('actionTargets');
    targetsList.innerHTML = '';

    alivePlayers.forEach(player => {
        if (player.id === AppState.myId) return; // Ne pas se cibler soi-même
        
        const btn = document.createElement('button');
        btn.className = 'target-button';
        btn.innerHTML = `<span>${player.name}</span>`;
        btn.addEventListener('click', () => selectNightTarget(player.id, btn));
        targetsList.appendChild(btn);
    });

    document.getElementById('nightActionPanel').classList.add('active');
    document.getElementById('rolePanel').classList.remove('active');
    document.getElementById('waitingPanel').classList.remove('active');
}

let selectedNightTarget = null;
function selectNightTarget(targetId, element) {
    document.querySelectorAll('#actionTargets .target-button').forEach(btn => {
        btn.classList.remove('selected');
    });

    selectedNightTarget = targetId;
    element.classList.add('selected');
}

/**
 * Sauter l'action nocturne
 */
function skipNightAction() {
    selectedNightTarget = null;
    AppState.networkManager.submitNightAction('skip', null);
    showWaitingPanel();
}

/**
 * Afficher phase vote (joueur)
 */
function showVotingPhasePlayer(gameState) {
    showVotingPrompt();
}

/**
 * Afficher l'invite de vote (joueur)
 */
function showVotingPrompt() {
    const alivePlayers = AppState.gameController.getAlivePlayers();

    const targetsList = document.getElementById('votingTargets');
    targetsList.innerHTML = '';

    alivePlayers.forEach(player => {
        if (player.id === AppState.myId) return; // Ne pas voter pour soi-même
        
        const btn = document.createElement('button');
        btn.className = 'target-button';
        btn.innerHTML = `<span>${player.name}</span>`;
        btn.addEventListener('click', () => selectVoteTarget(player.id, btn));
        targetsList.appendChild(btn);
    });

    document.getElementById('waitingPanel').classList.remove('active');
    document.getElementById('votingPanel').classList.add('active');
}

let selectedVoteTarget = null;
function selectVoteTarget(targetId, element) {
    document.querySelectorAll('#votingTargets .target-button').forEach(btn => {
        btn.classList.remove('selected');
    });

    selectedVoteTarget = targetId;
    element.classList.add('selected');

    // Soumettre le vote
    AppState.gameController.recordVote(AppState.myId, targetId);
    AppState.networkManager.submitVote(targetId);

    // Attendre la confirmation
    document.getElementById('votingPanel').classList.remove('active');
    showWaitingPanel();
}

/**
 * S'abstenir du vote
 */
function abstainVote() {
    AppState.gameController.recordVote(AppState.myId, null);
    AppState.networkManager.submitVote(null);

    document.getElementById('votingPanel').classList.remove('active');
    showWaitingPanel();
}

/**
 * Continuer après un résultat
 */
function continueGame() {
    showWaitingPanel();
}

/**
 * Terminer la partie
 */
function endGame(detail) {
    const message = detail.message || 'La partie est terminée!';
    document.getElementById('messageText').textContent = message;
    document.getElementById('messagePanel').classList.add('active');
}

/**
 * Fermer un message
 */
function dismissMessage() {
    document.getElementById('messagePanel').classList.remove('active');
    backToLobby();
}

/**
 * Déconnecter
 */
function disconnect() {
    if (confirm('Êtes-vous sûr de vouloir quitter?')) {
        AppState.networkManager.disconnect();
        backToLobby();
    }
}

// ============================================
// UTILITAIRES
// ============================================

/**
 * Afficher un message
 */
function showMessage(text) {
    alert(text); // À remplacer par une notification élégante
}

/**
 * Formater une durée
 */
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${String(secs).padStart(2, '0')}`;
}

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    console.log('DOM chargé et application prête!');
});
