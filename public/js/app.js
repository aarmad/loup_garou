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
    gameStarted: false,
    phaseTimerInterval: null,
    phaseSecondsLeft: 0
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

    // Écouter les changements localStorage (pour un onglet)
    window.addEventListener('storage', handleStorageChange);

    // Écouter les changements via NetworkManager (pour multi-appareils)
    AppState.networkManager.addEventListener((event) => {
        if (!event || !event.type) return;

        if (event.type === 'GAME_STATE_CHANGED' || event.type === 'GAME_STATE_UPDATED') {
            const gameState = event.data;
            if (!gameState) return;

            if (AppState.isPresenter) {
                updateConnectedPlayers(gameState);
                updateRolesList();
                syncPresenterState(gameState);
            } else {
                syncGameState(gameState);
                updateConnectedPlayers(gameState);
            }
        }
    });

    console.log('Application initialisée ✓');
}

/**
 * Mettre à jour le statut réseau
 */
function updateNetworkStatus() {
    setConnectionStatus('Connecté au serveur', true);
    const createBtn = document.getElementById('createGameBtn');
    const joinBtn = document.getElementById('joinGameBtn');

    createBtn.disabled = false;
    joinBtn.disabled = false;
}

function setConnectionStatus(text, online) {
    const statusElement = document.getElementById('bluetoothStatus');
    const statusText = document.getElementById('networkStatusText');
    if (!statusElement || !statusText) return;

    statusText.textContent = text;
    statusElement.classList.remove('success', 'warning', 'error');
    statusElement.classList.add(online ? 'success' : 'error');
}

/**
 * Attacher les événements
 */
function attachEventListeners() {
    // Lobby
    document.getElementById('createGameBtn').addEventListener('click', createGame);
    document.getElementById('joinGameBtn').addEventListener('click', showJoinForm);
    document.getElementById('confirmJoinBtn').addEventListener('click', joinGame);
    document.getElementById('cancelJoinBtn').addEventListener('click', hideJoinForm);

    // Présentateur
    document.getElementById('backBtn').addEventListener('click', backToLobby);
    document.getElementById('incPlayersBtn').addEventListener('click', increasePlayerCount);
    document.getElementById('decPlayersBtn').addEventListener('click', decreasePlayerCount);
    document.getElementById('startGameBtn').addEventListener('click', startGame);

    // Joueur
    document.getElementById('disconnectBtn').addEventListener('click', disconnect);
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

function setDebugInfo(text) {
    const debugEl = document.getElementById('debugInfo');
    if (debugEl) {
        debugEl.textContent = text;
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

        // Vérifier que le code de salle est correctement formaté
        if (!/^\d{4}$/.test(result.gameId)) {
            setDebugInfo(`⚠️ Code incorrect généré (${result.gameId}). Passage en code 4 chiffres forcé.`);
            result.gameId = (Date.now().toString().slice(-4));
        }

        // Afficher le numéro de salle en permanence
        updateRoomNumberDisplay(result.gameId);
        
        updatePlayerCountDisplay();
        updateRolesList();

        // Mettre à jour l'affichage du compteur players
        updateConnectedPlayers(AppState.networkManager.getGameState());

        // Notification courte du code
        showMessage(`Partie créée! Code salle: ${result.gameId}`);
        setDebugInfo(`Salle créée: ${result.gameId} (utilisez ce code dans le champ de connexion)`);
    } catch (err) {
        showMessage('Erreur lors de la création de la partie: ' + err.message);
        setDebugInfo(`Erreur création: ${err.message}`);
    }
}

/**
 * Afficher le formulaire de rejoindre une partie
 */
function showJoinForm() {
    const playerName = document.getElementById('playerName').value.trim();
    if (!playerName) {
        showMessage('Veuillez entrer un pseudo d\'abord');
        return;
    }

    // Masquer les boutons principaux
    document.querySelector('.button-group').style.display = 'none';

    // Afficher le formulaire de code
    document.getElementById('joinGameForm').classList.remove('hidden');

    // Focus sur le champ de code
    document.getElementById('gameCode').focus();

    // Validation en temps réel du code
    document.getElementById('gameCode').addEventListener('input', function(e) {
        const code = e.target.value.trim();
        const confirmBtn = document.getElementById('confirmJoinBtn');
        confirmBtn.disabled = code.length !== 4 || !/^\d{4}$/.test(code);
    });
}

/**
 * Masquer le formulaire de rejoindre une partie
 */
function hideJoinForm() {
    // Masquer le formulaire de code
    document.getElementById('joinGameForm').classList.add('hidden');

    // Afficher les boutons principaux
    document.querySelector('.button-group').style.display = 'flex';

    // Réinitialiser le champ
    document.getElementById('gameCode').value = '';
    document.getElementById('confirmJoinBtn').disabled = true;
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

    const gameCode = document.getElementById('gameCode').value.trim();
    if (!gameCode || gameCode.length !== 4 || !/^\d{4}$/.test(gameCode)) {
        showMessage('Veuillez entrer un code de salle valide (4 chiffres)');
        return;
    }

    AppState.myName = playerName;
    AppState.currentRoomNumber = gameCode;
    saveSettings();

    try {
        // Se connecter via réseau
        const result = await AppState.networkManager.joinGame(gameCode, playerName);
        AppState.myId = result.playerId;

        // Démarrer le polling pour recevoir les mises à jour
        AppState.networkManager.startPolling();

        // Mise à jour du compteur et du numéro de salle
        updateRoomNumberDisplay(gameCode);
        updateConnectedPlayers(AppState.networkManager.getGameState());

        // Afficher l'écran joueur
        document.getElementById('playerNameDisplay').textContent = playerName;
        document.getElementById('playerRoomNumber').textContent = gameCode;
        showPlayerScreen();
        showWaitingPanel('En attente du démarrage...');

        setDebugInfo(`Connecté à la salle: ${gameCode}`);
    } catch (err) {
        showMessage('Impossible de se connecter: ' + err.message);
        setDebugInfo(`Connexion échouée pour le code ${gameCode}: ${err.message}`);
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
    if (AppState.selectedPlayerCount < 22) {
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

function formatTimer(seconds) {
    const min = Math.floor(seconds / 60).toString().padStart(2, '0');
    const sec = (seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
}

function startPhaseTimer(durationSeconds) {
    stopPhaseTimer();
    AppState.phaseSecondsLeft = durationSeconds;

    const phaseTimerEl = document.getElementById('phaseTimer');
    if (phaseTimerEl) phaseTimerEl.textContent = formatTimer(durationSeconds);

    AppState.phaseTimerInterval = setInterval(() => {
        AppState.phaseSecondsLeft -= 1;
        if (phaseTimerEl) phaseTimerEl.textContent = formatTimer(AppState.phaseSecondsLeft);

        if (AppState.phaseSecondsLeft <= 0) {
            stopPhaseTimer();
            if (AppState.isPresenter) {
                if (AppState.gameController.getGameState().phase === 'night') {
                    nextNightAction();
                } else {
                    startVoting();
                }
            }
        }
    }, 1000);
}

function stopPhaseTimer() {
    if (AppState.phaseTimerInterval) {
        clearInterval(AppState.phaseTimerInterval);
        AppState.phaseTimerInterval = null;
    }
}

function skipPhase() {
    stopPhaseTimer();

    const phase = AppState.gameController.getGameState().phase;
    if (phase === 'night') {
        nextNightAction();
    } else if (phase === 'day') {
        startVoting();
    }
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
        toggle.className = 'role-item' + (isSelected ? ' selected' : '');
        
        let roleDisplay = `<span class="role-icon">${role.emoji}</span>`;
        if (role.image) {
            roleDisplay = `<img src="${role.image}" alt="${role.name}" class="role-preview-img" style="width: 32px; height: 32px; object-fit: contain; cursor: zoom-in;" />`;
        } else {
            roleDisplay = `<span class="role-preview-img" style="cursor: zoom-in;">${role.emoji}</span>`;
        }
        
        toggle.innerHTML = `
            ${roleDisplay}
            <div class="role-name-text" style="font-size: 10px; text-align: center; cursor: pointer;">${role.name}</div>
        `;

        // Clic sur l'image = Preview
        toggle.querySelector('.role-preview-img').addEventListener('click', (e) => {
            e.stopPropagation();
            showRolePreview(roleName);
        });

        // Clic sur le reste = Toggle selection
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
        element.classList.remove('selected');
    } else {
        if (AppState.selectedRoles.length < AppState.selectedPlayerCount) {
            AppState.selectedRoles.push(roleName);
            element.classList.add('selected');
        } else {
            showMessage('Maximum de rôles atteint');
            return;
        }
    }

    updateStartButton();
}

/**
 * Afficher un rôle en grand pour le présentateur
 */
function showRolePreview(roleName) {
    const role = ROLES[roleName];
    if (!role) return;

    const modal = document.getElementById('rolePreviewModal');
    const img = document.getElementById('rolePreviewImg');
    const name = document.getElementById('rolePreviewName');
    const desc = document.getElementById('rolePreviewDesc');

    if (role.image) {
        img.src = role.image;
        img.style.display = 'block';
    } else {
        img.style.display = 'none';
    }
    
    name.textContent = role.name;
    desc.textContent = role.description;
    
    modal.classList.add('active');
}

/**
 * Fermer le preview du rôle
 */
function hideRolePreview() {
    document.getElementById('rolePreviewModal').classList.remove('active');
}

// Rendre disponible globalement si nécessaire
window.showRolePreview = showRolePreview;
window.hideRolePreview = hideRolePreview;

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
    if (!gameState || !gameState.players) return;
    
    // Filtrer pour ne compter que les joueurs (exclure le meneur)
    const playersOnly = gameState.players.filter(p => !p.isPresenter);
    const count = playersOnly.length;
    
    AppState.connectedPlayers = playersOnly;
    
    const playerCountPresenter = document.getElementById('playerCountPresenter');
    const playerCountStatus = document.getElementById('playerCountStatus');
    const connectedCountElement = document.getElementById('connectedPlayersCount');
    const playerCountPlayer = document.getElementById('playerCountPlayer');
    
    if (playerCountPresenter) playerCountPresenter.textContent = count;
    if (playerCountStatus) playerCountStatus.textContent = count;
    if (connectedCountElement) connectedCountElement.textContent = count;
    if (playerCountPlayer) playerCountPlayer.textContent = count;
    
    updateStartButton();
}

/**
 * Démarrer la partie
 */
function startGame() {
    const gameState = AppState.networkManager.getGameState();
    const playerNames = gameState.players.filter(p => !p.isPresenter).map(p => p.name);

    if (playerNames.length < AppState.selectedPlayerCount) {
        showMessage(`Attendez que tous les joueurs (${AppState.selectedPlayerCount}) soient connectés.`);
        return;
    }

    // Mélanger les rôles réellement sélectionnés par le présentateur
    const shuffledRoles = shuffleRoles([...AppState.selectedRoles]);
    
    // Assigner les rôles aux joueurs dans le réseau
    const updatedPlayers = gameState.players.map(p => {
        if (p.isPresenter) return p;
        // On prend un rôle au hasard dans la liste mélangée
        const role = shuffledRoles.pop();
        return { ...p, role, alive: true };
    });

    AppState.gameStarted = true;

    // Mettre à jour l'état sur le serveur
    AppState.networkManager.updateGameState({
        state: 'playing',
        currentPhase: 'role_reveal', /* Phase statique de distribution */
        players: updatedPlayers
    });

    // Masquer la section config, afficher la section jeu
    document.getElementById('configSection').classList.add('hidden');
    document.getElementById('gameSection').classList.remove('hidden');

    // Mettre à jour la liste des joueurs
    updatePlayersList();
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

    // Timer de phase nocturne (60s par défaut - le présentateur peut passer)
    startPhaseTimer(60);
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
        // Obtenir le nom du joueur depuis le contrôleur local
        const playerFromInternal = AppState.gameController.getPlayer(action.playerId);
        
        // Trouver son playerId réseau
        const networkState = AppState.networkManager.getGameState();
        const playersOnly = networkState.players.filter(p => !p.isPresenter);
        const networkPlayer = playersOnly[action.playerId];
        
        const isActive = index === state.currentNightActionIndex;
        // Vérifier si l'action est complétée via les données du réseau
        const isCompleted = networkState.roleActions && networkPlayer && networkState.roleActions[networkPlayer.playerId];

        if (isActive && isCompleted && !action.completed) {
            // Synchroniser le contrôleur local si l'action vient d'être faite sur le réseau
            action.completed = true;
            action.target = networkState.roleActions[networkPlayer.playerId].target;
            // On pourrait appeler nextNightAction() tout de suite mais on laisse le présentateur valider
        }

        const role = ROLES[playerFromInternal.role];
        const item = document.createElement('div');
        item.className = 'action-item' + (isActive ? ' active' : '') + (isCompleted ? ' completed' : '');
        
        // Use an SVG instead of raw emoji
        const checkSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: bottom;"><path d="M20 6L9 17l-5-5"></path></svg>`;
        
        let roleDisplay = role.emoji;
        if (role.image) {
            roleDisplay = `<img src="${role.image}" alt="${role.name}" style="width: 24px; height: 24px; object-fit: contain; margin-right: 8px; vertical-align: middle;" />`;
        } else {
            roleDisplay = `<span style="font-size: 20px; margin-right: 8px; vertical-align: middle;">${role.emoji}</span>`;
        }

        item.innerHTML = `
            ${roleDisplay}
            <span style="vertical-align: middle;">${playerFromInternal.name} (${role.name})</span>
            ${isCompleted ? '<span style="margin-left: auto; color: var(--success);">' + checkSvg + '</span>' : ''}
        `;

        list.appendChild(item);
    });
}

/**
 * Synchroniser l'état du jeu pour le présentateur
 */
function syncPresenterState(gameState) {
    if (gameState.state !== 'playing') return;
    
    // On met juste à jour la liste si on est en jeu
    updatePlayersList();
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
    const hasNext = AppState.gameController.nextNightAction();

    stopPhaseTimer();
    
    if (!hasNext) {
        // Fin de la nuit - passage au jour
        const result = AppState.gameController.gameState.finishNightPhase();
        
        // Mettre à jour les joueurs (morts) sur le réseau
        const networkGameState = AppState.networkManager.getGameState();
        const updatedPlayers = networkGameState.players.map(p => {
            if (p.isPresenter) return p;
            const updatedInfo = AppState.gameController.getPlayers().find(gp => gp.name === p.name);
            return { ...p, alive: updatedInfo ? updatedInfo.alive : p.alive };
        });

        AppState.networkManager.updateGameState({ 
            currentPhase: 'day',
            players: updatedPlayers,
            dayCount: AppState.gameController.gameState.dayCount,
            votes: {}, // Vider les votes de la veille
            roleActions: {} // Vider les actions
        });
        showDayPhase();
    } else {
        // Mettre à jour l'index de l'action sur le réseau pour que le joueur concerné sache que c'est à lui
        AppState.networkManager.updateGameState({ 
            currentNightActionIndex: AppState.gameController.gameState.currentNightActionIndex 
        });
        updateNightActionsList();
        startPhaseTimer(45);
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

    // Timer de discussion de jour (120s par défaut)
    startPhaseTimer(120);
}

/**
 * Mettre à jour la liste des joueurs
 */
function updatePlayersList() {
    const list = document.getElementById('playersList');
    list.innerHTML = '';
    
    // Récupérer les données depuis le réseau
    const gameState = AppState.networkManager.getGameState();
    if (!gameState || !gameState.players) return;
    
    const players = gameState.players.filter(p => !p.isPresenter);

    players.forEach(player => {
        const role = ROLES[player.role] || { name: 'Inconnu', emoji: '❓' };

        const item = document.createElement('div');
        item.className = 'player-item';
        let roleEmoji = `<span style="font-size: 24px;">${role.emoji}</span>`;
        if (role.image) {
            roleEmoji = `<img src="${role.image}" alt="${role.name}" style="width: 32px; height: 32px; object-fit: contain;" />`;
        }
        
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                ${roleEmoji}
                <div style="flex: 1;">
                    <div class="player-name">${player.name}</div>
                    <div class="player-role">${role.name}</div>
                </div>
            </div>
            <div class="status-badge success" style="margin: 0; padding: 4px 10px; font-size: 10px;">Distribué</div>
        `;

        list.appendChild(item);
    });
}

/**
 * Démarrer la phase de vote
 */
function startVoting() {
    stopPhaseTimer();
    AppState.networkManager.updateGameState({ currentPhase: 'voting' });

    document.getElementById('dayPanel').classList.remove('active');
    document.getElementById('votingPanel').classList.add('active');

    // On efface les anciens votes dans le game controller local
    AppState.gameController.gameState.votes = {};
    
    // Au lieu d'attendre 5 secondes bêtement, on affiche l'interface en temps réel.
    // La liste se mettra à jour à chaque fois qu'un joueur vote via syncPresenterState()
    showVoteResults();
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

    const updatedNetworkPlayers = AppState.networkManager.getGameState().players.map(p => {
        if (p.isPresenter) return p;
        const localP = AppState.gameController.getPlayers().find(lp => lp.name === p.name);
        return { ...p, alive: localP ? localP.alive : p.alive };
    });

    // Envoyer la mort sur le réseau
    AppState.networkManager.updateGameState({
        players: updatedNetworkPlayers
    });

    // Vérifier les conditions de victoire
    const winCheck = AppState.gameController.checkWinConditions();
    if (winCheck.gameOver) {
        endGame(winCheck);
        return;
    }

    // Commencer la nuit
    showNightPhase();
}

// Masquer le formulaire de rejoindre si visible
hideJoinForm();

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
    AppState.isPresenter = false;
    AppState.gameStarted = false;
    AppState.connectedPlayers = [];
    AppState.selectedRoles = [];
    AppState.networkManager.disconnect();
    
    document.getElementById('presenterScreen').classList.remove('active');
    document.getElementById('playerScreen').classList.remove('active');
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
 * Afficher l'écran d'attente
 */
function showWaitingPanel(text = "En attente du démarrage...") {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('waitingPanel').classList.add('active');
    const msgBox = document.getElementById('waitingMessageText');
    if (msgBox) msgBox.textContent = text;
}

/**
 * Synchroniser l'état du jeu pour le joueur
 */
function syncGameState(gameState) {
    if (!gameState) return;

    // --- DEBUG BAR ---
    const debugBar = document.getElementById('debugBar');
    const debugInfo = `ID:${AppState.myId?.slice(-6)||'?'} | Nom:${AppState.myName||'?'} | État:${gameState.state||'?'} | Phase:${gameState.currentPhase||'?'} | Joueurs:${gameState.players?.length||0}`;
    if (debugBar) debugBar.textContent = debugInfo;
    console.log('[SYNC]', debugInfo);

    // Trouver notre joueur par ID d'abord, puis par nom en fallback
    const myPlayer = gameState.players
        ? (gameState.players.find(p => p.playerId === AppState.myId)
           || gameState.players.find(p => p.name === AppState.myName && !p.isPresenter))
        : null;

    console.log('[SYNC] myPlayer:', myPlayer ? `${myPlayer.name} role=${myPlayer.role} alive=${myPlayer.alive}` : 'NON TROUVÉ');

    // Mettre à jour AppState.myId si on l'a trouvé par nom
    if (myPlayer && myPlayer.playerId && myPlayer.playerId !== AppState.myId) {
        console.log('[SYNC] Mise à jour myId:', myPlayer.playerId);
        AppState.myId = myPlayer.playerId;
    }

    // Normaliser le champ alive
    const isAlive = myPlayer ? (myPlayer.alive !== undefined ? myPlayer.alive : myPlayer.isAlive !== false) : true;

    // Gérer l'élimination (seulement si la partie a démarré)
    if (myPlayer && gameState.state === 'playing' && !isAlive) {
        console.log('[SYNC] Éliminé !');
        showEliminatedScreen();
        return;
    }

    // Le jeu a démarré
    if (gameState.state === 'playing' && gameState.players) {
        if (!AppState.gameStarted) {
            AppState.gameStarted = true;
            console.log('[SYNC] Jeu démarré');
        }

        // Afficher la carte de rôle
        if (myPlayer && myPlayer.role) {
            console.log('[SYNC] Affichage du rôle statique:', myPlayer.role);
            showPlayerRole(myPlayer);
        }
    }
}


/**
 * Afficher l'écran d'élimination
 */
function showEliminatedScreen() {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('eliminatedPanel').classList.add('active');
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
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
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
    // Trouver notre joueur (par ID puis par nom en fallback)
    const myPlayer = gameState.players
        ? (gameState.players.find(p => p.playerId === AppState.myId)
           || gameState.players.find(p => p.name === AppState.myName && !p.isPresenter))
        : null;

    const isAlive = myPlayer ? (myPlayer.alive !== undefined ? myPlayer.alive : myPlayer.isAlive !== false) : true;
    if (!isAlive) {
        showEliminatedScreen();
        return;
    }

    // Si j'ai déjà agi cette nuit
    if (gameState.roleActions && gameState.roleActions[AppState.myId]) {
        showWaitingPanel("Action enregistrée. Attente des autres...");
        return;
    }

    const myRole = ROLES[AppState.myRole];

    // Si ce rôle n'a pas d'action nocturne, attendre en silence
    if (!myRole || !myRole.hasNightAction) {
        showWaitingPanel("C'est la nuit... Chut !");
        return;
    }

    // Trouver le joueur actif par nom (plus fiable que l'index local)
    const currentActionIndex = gameState.currentNightActionIndex || 0;
    const currentAction = gameState.nightActions ? gameState.nightActions[currentActionIndex] : null;

    if (currentAction && currentAction.playerName) {
        // nightActions contient playerName (nom du joueur)
        if (currentAction.playerName === AppState.myName) {
            showNightActionPrompt();
        } else {
            showWaitingPanel("C'est la nuit... Chut !");
        }
    } else if (currentAction && currentAction.playerId !== undefined) {
        // Fallback: playerId dans nightActions est un index local
        const nonPresenters = gameState.players.filter(p => !p.isPresenter);
        const actingPlayer = nonPresenters[currentAction.playerId];
        if (actingPlayer && (actingPlayer.playerId === AppState.myId || actingPlayer.name === AppState.myName)) {
            showNightActionPrompt();
        } else {
            showWaitingPanel("C'est la nuit... Chut !");
        }
    } else {
        // Pas d'info de tour : si j'ai un rôle nocturne, afficher l'action
        showNightActionPrompt();
    }
}

/**
 * Afficher l'invite d'action nocturne (joueur)
 */
function showNightActionPrompt() {
    const role = ROLES[AppState.myRole];
    if (!role) return;

    // Utiliser les joueurs du gameState network
    const networkGameState = AppState.networkManager.getGameState();
    const alivePlayers = networkGameState.players.filter(p => !p.isPresenter && p.alive);
    
    document.getElementById('actionPrompt').textContent = `Action : ${role.name}`;

    const targetsList = document.getElementById('actionTargets');
    targetsList.innerHTML = '';

    alivePlayers.forEach(player => {
        const btn = document.createElement('button');
        btn.className = 'target-button';
        btn.innerHTML = `<span>${player.name}</span>`;
        btn.addEventListener('click', () => selectNightTarget(player.playerId, btn));
        targetsList.appendChild(btn);
    });

    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('nightActionPanel').classList.add('active');
}

let selectedNightTarget = null;
/**
 * Sélectionner une cible pour l'action nocturne (joueur)
 */
function selectNightTarget(targetId, element) {
    document.querySelectorAll('#actionTargets .target-button').forEach(btn => {
        btn.classList.remove('selected');
    });

    selectedNightTarget = targetId;
    element.classList.add('selected');
    
    // Soumettre via réseau
    AppState.networkManager.submitNightAction('use-ability', targetId);
    
    // Afficher attente
    document.getElementById('nightActionPanel').classList.remove('active');
    showWaitingPanel("Action enregistrée. Attente des autres...");
}

/**
 * Passer l'action nocturne (joueur)
 */
function skipNightAction() {
    selectedNightTarget = null;
    AppState.networkManager.submitNightAction('skip', null);
    document.getElementById('nightActionPanel').classList.remove('active');
    showWaitingPanel("Action sautée. Attente des autres...");
}

/**
 * Passer la phase actuelle (présentateur)
 */
function skipPhase() {
    const state = AppState.gameController.getGameState();
    if (state.phase === 'night') {
        const action = AppState.gameController.getCurrentAction();
        if (action) {
            action.completed = true;
            nextNightAction();
        }
    } else if (state.phase === 'day') {
        startVoting();
    }
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
    const networkGameState = AppState.networkManager.getGameState();
    const alivePlayers = networkGameState.players.filter(p => !p.isPresenter && p.alive);

    const targetsList = document.getElementById('votingTargets');
    targetsList.innerHTML = '';

    alivePlayers.forEach(player => {
        // Souvent au loup-garou on peut voter pour soi, mais ici on suit la règle indexée
        if (player.playerId === AppState.myId) return;
        
        const btn = document.createElement('button');
        btn.className = 'target-button';
        btn.innerHTML = `<span>${player.name}</span>`;
        btn.addEventListener('click', () => selectVoteTarget(player.playerId, btn));
        targetsList.appendChild(btn);
    });

    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('votingPanel').classList.add('active');
}

let selectedVoteTarget = null;
function selectVoteTarget(targetId, element) {
    document.querySelectorAll('#votingTargets .target-button').forEach(btn => {
        btn.classList.remove('selected');
    });

    selectedVoteTarget = targetId;
    element.classList.add('selected');

    // Soumettre le vote via réseau
    AppState.networkManager.submitVote(targetId);

    // Attendre la confirmation
    document.getElementById('votingPanel').classList.remove('active');
    showWaitingPanel("Vote enregistré. Attente du résultat...");
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
    AppState.networkManager.disconnect();
    setConnectionStatus('Déconnecté', false);
    backToLobby();
}

// ============================================
// UTILITAIRES
// ============================================

/**
 * Afficher un message
 */
function showMessage(text) {
    const messagePanel = document.getElementById('messagePanel');
    const messageText = document.getElementById('messageText');
    if (messagePanel && messageText) {
        messageText.textContent = text;
        messagePanel.classList.add('active');
        return;
    }
    console.warn('showMessage:', text);
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
