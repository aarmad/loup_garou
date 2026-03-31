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
    gameController: null,
    networkManager: null,
    syncManager: null,
    connectedPlayers: [],
    selectedRoles: [],
    selectedPlayerCount: 3
};

/**
 * Initialiser l'application
 */
function initializeApp() {
    console.log('Initialisation de l\'application...');

    // Créer les instances
    AppState.gameController = new GameController();
    AppState.networkManager = new NetworkManager();
    AppState.syncManager = new SyncManager(AppState.networkManager, AppState.gameController);

    // Attacher les listeners d'événements
    attachEventListeners();

    // Vérifier la disponibilité réseau
    updateNetworkStatus();

    // Charger les paramètres sauvegardés
    loadSavedSettings();

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

    // Réseau events
    AppState.networkManager.onMessage((message) => handleNetworkMessage(message));

    // Événements personnalisés
    window.addEventListener ('playerJoined', (e) => handlePlayerJoined(e.detail));
    window.addEventListener('roleAssigned', (e) => showPlayerRole(e.detail));
    window.addEventListener('nightActionPrompt', (e) => showNightActionPrompt(e.detail));
    window.addEventListener('votingPrompt', (e) => showVotingPrompt(e.detail));
    window.addEventListener('gameEnded', (e) => endGame(e.detail));
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

        // Afficher l'écran présentateur
        showPresenterScreen();
        updatePlayerCountDisplay();
        updateRolesList();
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
    const gameCode = prompt('Entrez le code de la salle (4 chiffres):');
    if (!gameCode) return;

    AppState.myName = playerName;
    saveSettings();

    try {
        // Se connecter via réseau
        const result = await AppState.networkManager.joinGame(gameCode, playerName);
        AppState.myId = result.playerId;

        // Afficher l'écran joueur
        document.getElementById('playerNameDisplay').textContent = playerName;
        showPlayerScreen();
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
    const validation = validateSelectedRoles(AppState.selectedRoles, AppState.selectedPlayerCount);
    btn.disabled = !validation.valid;

    if (!validation.valid) {
        btn.title = validation.error;
    }
}

/**
 * Démarrer la partie
 */
function startGame() {
    if (AppState.connectedPlayers.length < AppState.selectedPlayerCount) {
        showMessage(`Attendez ${AppState.selectedPlayerCount - AppState.connectedPlayers.length} joueur(s) supplémentaire(s)`);
        return;
    }

    // Shuffle les rôles et assigner aux joueurs
    const shuffledRoles = getRolesForGame(AppState.selectedPlayerCount);
    const playerNames = AppState.connectedPlayers.map(p => p.name);

    // Démarrer le jeu
    AppState.gameController.startNewGame(playerNames, shuffledRoles);

    // Masquer la section config, afficher la section jeu
    document.getElementById('configSection').classList.add('hidden');
    document.getElementById('gameSection').classList.remove('hidden');

    // Commencer par la nuit
    showNightPhase();

    // Synchroniser avec les joueurs
    AppState.networkManager.startGame(shuffledRoles);
}

/**
 * Afficher la phase de nuit
 */
function showNightPhase() {
    document.getElementById('currentPhase').textContent = `Nuit ${AppState.gameController.getGameState().nightCount + 1}`;
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
    if (AppState.gameController.gameState.previousNightAction()) {
        updateNightActionsList();
        promptNightAction();
    }
}

/**
 * Action nocturne suivante
 */
function nextNightAction() {
    const action = AppState.gameController.getCurrentAction();
    if (!action || !action.completed) {
        showMessage('Complétez l\'action actuelle d\'abord');
        return;
    }

    if (!AppState.gameController.nextNightAction()) {
        // Fin de la nuit - passage au jour
        showDayPhase();
    } else {
        updateNightActionsList();
        promptNightAction();
    }
}

/**
 * Inviter à l'action nocturne
 */
function promptNightAction() {
    const player = AppState.gameController.getCurrentPlayer();
    const action = AppState.gameController.getCurrentAction();

    if (!player || !action) {
        // Fin de la nuit automatiquement
        nextNightAction();
        return;
    }

    // Envoyer l'invitation au joueur
    AppState.syncManager.sendPlayerAction('nightActionPrompt', {
        playerId: player.id,
        action: action
    });

    // Afficher localement (pour simulation)
    console.log(`${player.name} doit agir: ${action.actionType}`);
}

/**
 * Afficher la phase de jour
 */
function showDayPhase() {
    document.getElementById('currentPhase').textContent = `Jour ${AppState.gameController.getGameState().dayCount}`;
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
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                <span style="font-size: 20px;">${role.emoji}</span>
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
    // Envoyer les invitations de vote aux joueurs
    AppState.gameController.getAlivePlayers().forEach(player => {
        AppState.syncManager.sendPlayerAction('votingInvitation', {
            playerId: player.id
        });
    });

    document.getElementById('dayPanel').classList.remove('active');
    document.getElementById('votingPanel').classList.add('active');

    // Simuler l'attente des votes (en réalité, ils arrivent via Bluetooth)
    setTimeout(() => {
        showVoteResults();
    }, 10000);
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
    const result = AppState.gameController.applyElimination(playerId);

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
    if (confirm('Êtes-vous sûr? Cela fermera la partie.')) {
        AppState.isPresenter = false;
        AppState.connectedPlayers = [];
        AppState.selectedRoles = [];
        
        document.getElementById('presenterScreen').classList.remove('active');
        document.getElementById('lobbyScreen').classList.add('active');
        
        document.getElementById('configSection').classList.remove('hidden');
        document.getElementById('gameSection').classList.add('hidden');
    }
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
    showWaitingPanel();
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
 * Afficher le rôle du joueur
 */
function showPlayerRole(detail) {
    AppState.myRole = detail.role;
    AppState.myId = detail.playerId;

    const role = ROLES[detail.role];
    
    // Afficher l'image du rôle
    const roleEmojiDiv = document.getElementById('roleEmoji');
    if (role.image) {
        roleEmojiDiv.innerHTML = `<img src="${role.image}" alt="${role.name}" />`;
    } else {
        roleEmojiDiv.textContent = role.emoji;
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
 * Afficher l'invite d'action nocturne
 */
function showNightActionPrompt(detail) {
    const role = ROLES[detail.action.role];
    document.getElementById('actionPrompt').textContent = `Choisissez une cible pour: ${role.nightActionType}`;

    // Remplir les cibles disponibles
    const targets = AppState.gameController.getAvailableTargets(
        detail.action.targetType,
        AppState.myId
    );

    const targetsList = document.getElementById('actionTargets');
    targetsList.innerHTML = '';

    targets.forEach(target => {
        const btn = document.createElement('button');
        btn.className = 'target-button';
        btn.innerHTML = `<span>${target.name}</span>`;
        btn.addEventListener('click', () => selectTarget(target.id, btn, detail.action));
        targetsList.appendChild(btn);
    });

    document.getElementById('rolePanel').classList.remove('active');
    document.getElementById('nightActionPanel').classList.add('active');
}

/**
 * Sélectionner une cible
 */
let selectedTarget = null;
function selectTarget(targetId, element, action) {
    // Désélectionner le précédent
    document.querySelectorAll('.target-button').forEach(btn => {
        btn.classList.remove('selected');
    });

    selectedTarget = targetId;
    element.classList.add('selected');
}

/**
 * Sauter l'action nocturne
 */
function skipNightAction() {
    AppState.syncManager.sendPlayerAction('skipNightAction', {
        playerId: AppState.myId
    });

    showWaitingPanel();
}

/**
 * Afficher l'invite de vote
 */
function showVotingPrompt(detail) {
    const targets = AppState.gameController.getAlivePlayers();

    const targetsList = document.getElementById('votingTargets');
    targetsList.innerHTML = '';

    targets.forEach(target => {
        const btn = document.createElement('button');
        btn.className = 'target-button';
        btn.innerHTML = `<span>${target.name}</span>`;
        btn.addEventListener('click', () => selectVoteTarget(target.id, btn));
        targetsList.appendChild(btn);
    });

    document.getElementById('nightActionPanel').classList.remove('active');
    document.getElementById('votingPanel').classList.add('active');
}

/**
 * Sélectionner une cible de vote
 */
let selectedVoteTarget = null;
function selectVoteTarget(targetId, element) {
    document.querySelectorAll('#votingTargets .target-button').forEach(btn => {
        btn.classList.remove('selected');
    });

    selectedVoteTarget = targetId;
    element.classList.add('selected');

    // Envoyer le vote immédiatement
    AppState.gameController.recordVote(AppState.myId, targetId);
    AppState.syncManager.sendVote(AppState.myId, targetId);

    // Attendre la confirmation
    document.getElementById('votingPanel').classList.remove('active');
    showWaitingPanel();
}

/**
 * S'abstenir du vote
 */
function abstainVote() {
    AppState.gameController.recordVote(AppState.myId, null);
    AppState.syncManager.sendVote(AppState.myId, null);

    document.getElementById('votingPanel').classList.remove('active');
    showWaitingPanel();
}

/**
 * Afficher l'élimination
 */
function showEliminationResult(detail) {
    if (detail.result.playerId === AppState.myId) {
        // Vous avez été éliminé
        document.getElementById('eliminatedPanel').classList.add('active');
        document.getElementById('resultPanel').classList.remove('active');
    } else {
        // Quelqu'un d'autre a été éliminé
        const eliminated = AppState.gameController.getPlayer(detail.result.playerId);
        document.getElementById('resultText').textContent = `${eliminated.name} a été éliminé.`;
        document.getElementById('resultStatus').textContent = '⚰️';
        document.getElementById('resultPanel').classList.add('active');
    }
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
// HANDLERS BLUETOOTH
// ============================================

/**
 * Traiter les messages Bluetooth
 */
function handleNetworkMessage(message) {
    console.log('[APP] Message reçu:', message.type);

    switch (message.type) {
        case 'GAME_STARTED':
            console.log('Jeu démarré');
            break;
        case 'PHASE_CHANGED':
            console.log('Phase changée:', message.phase);
            break;
        case 'PLAYER_ELIMINATED':
            console.log('Joueur éliminé:', message.playerId);
            break;
        case 'VOTE_SUBMITTED':
            console.log('Vote soumis:', message.voterId);
            break;
    }
}

/**
 * Gérer la connexion d'un joueur
 */
function handlePlayerConnected(message) {
    console.log(`Connecté en tant que ${message.role}`);
}

/**
 * Gérer un joueur qui rejoint
 */
function handlePlayerJoined(message) {
    console.log(`${message.name} a rejoint!`);

    // Ajouter à la liste si on est présentateur
    if (AppState.isPresenter) {
        AppState.connectedPlayers.push({
            name: message.name,
            id: message.playerId
        });

        // Mettre à jour l'affichage
        document.getElementById('playerCount').textContent = AppState.connectedPlayers.length;
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
