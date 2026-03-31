/**
 * LOUP-GAROU - LOGIQUE DE JEU
 * Gère les phases, les actions, les votes, et l'état du jeu
 */

class GameState {
    constructor() {
        // État du jeu
        this.status = 'lobby'; // lobby, config, playing, finished
        this.phase = 'day'; // day, night, voting
        this.dayCount = 1;
        this.nightCount = 1;

        // Joueurs et rôles
        this.players = []; // [{ id, name, role, alive, team, ... }]
        this.assignedRoles = []; // [{ playerId, role, initialized }]
        this.selectedRoles = []; // Rôles sélectionnés pour la partie

        // Actions nocturnes
        this.nightActions = []; // [{ role, playerId, targetId, actionType, completed }]
        this.currentNightActionIndex = 0;

        // Votes
        this.votes = {}; // { voterId: targetId }
        this.voteResults = {}; // { targetId: count }

        // Paires cupidons
        this.linkedPlayers = []; // [{ player1Id, player2Id }]

        // Historique
        this.history = [];
    }

    /**
     * Initialiser une nouvelle partie
     */
    initializeGame(playerNames, selectedRoles) {
        // Réinitialiser l'état
        this.players = [];
        this.assignedRoles = [];
        this.votes = {};
        this.linkedPlayers = [];
        this.dayCount = 1;
        this.nightCount = 0;
        this.phase = 'night';
        this.status = 'playing';
        this.nightActions = [];
        this.currentNightActionIndex = 0;

        // Créer les joueurs
        playerNames.forEach((name, index) => {
            this.players.push({
                id: index,
                name,
                alive: true,
                role: null,
                team: null,
                hasActionedThisNight: false,
                linkedTo: null
            });
        });

        // Assigner les rôles
        const shuffledRoles = shuffleRoles(selectedRoles);
        shuffledRoles.forEach((roleName, index) => {
            const roleData = getRoleByName(roleName);
            this.players[index].role = roleName;
            this.players[index].team = roleData.team;
            this.assignedRoles.push({
                playerId: index,
                role: roleName,
                initialized: false
            });
        });

        // Gérer Cupidon
        this.handleCupidoLinks();

        // Générer les actions nocturnes
        this.prepareNightActions();

        return true;
    }

    /**
     * Gérer les liens de Cupidon
     */
    handleCupidoLinks() {
        const cupidoPlayer = this.players.find(p => p.role === 'cupidon');
        if (cupidoPlayer) {
            // Le Cupidon pointera deux joueurs à la première nuit
            // Cela sera géré lors de l'action nocturne
        }
    }

    /**
     * Préparer les actions nocturnes de la première nuit
     */
    prepareNightActions() {
        this.nightActions = [];
        const nightRoles = getNightActionRoles(this.assignedRoles);

        nightRoles.forEach(playerRole => {
            const role = getRoleByName(playerRole.role);
            if (!role.activeFirstNightOnly || this.nightCount === 0) {
                this.nightActions.push({
                    playerId: playerRole.playerId,
                    role: playerRole.role,
                    actionType: role.nightActionType,
                    completed: false,
                    target: null,
                    targetType: role.nightActionTarget
                });
            }
        });

        this.currentNightActionIndex = 0;
    }

    /**
     * Obtenir l'action nocturne actuelle
     */
    getCurrentNightAction() {
        if (this.nightActions.length === 0) return null;
        return this.nightActions[this.currentNightActionIndex];
    }

    /**
     * Obtenir le joueur ayant l'action nocturne actuelle
     */
    getCurrentNightActionPlayer() {
        const action = this.getCurrentNightAction();
        if (!action) return null;
        return this.players[action.playerId];
    }

    /**
     * Enregistrer une action nocturne
     */
    recordNightAction(targetId) {
        const action = this.getCurrentNightAction();
        if (!action) return false;

        action.target = targetId;
        action.completed = true;

        return true;
    }

    /**
     * Passer à l'action nocturne suivante
     */
    nextNightAction() {
        if (this.currentNightActionIndex < this.nightActions.length - 1) {
            this.currentNightActionIndex++;
            return true;
        }
        return false;
    }

    /**
     * Aller à l'action nocturne précédente
     */
    previousNightAction() {
        if (this.currentNightActionIndex > 0) {
            this.currentNightActionIndex--;
            return true;
        }
        return false;
    }

    /**
     * Terminer la phase de nuit et appliquer les actions
     */
    finishNightPhase() {
        // Appliquer les actions nocturnes
        const kills = [];
        const protections = [];
        const blocked = [];
        const linkedLover = null;

        this.nightActions.forEach(action => {
            const role = getRoleByName(action.role);
            if (!action.target) return;

            switch (action.actionType) {
                case 'kill':
                    kills.push(action.target);
                    break;
                case 'protect':
                    protections.push(action.target);
                    break;
                case 'block':
                    blocked.push(action.target);
                    break;
                case 'link':
                    if (!linkedLover) {
                        this.linkedPlayers.push({
                            player1Id: action.playerId,
                            player2Id: action.target
                        });
                    }
                    break;
            }
        });

        // Appliquer les kills (sauf si protégés)
        const deaths = [];
        kills.forEach(targetId => {
            if (!protections.includes(targetId)) {
                this.players[targetId].alive = false;
                deaths.push(targetId);
            }
        });

        // Si un joueur lié meurt, l'autre meurt aussi
        deaths.forEach(deadId => {
            const linked = this.linkedPlayers.find(
                l => l.player1Id === deadId || l.player2Id === deadId
            );
            if (linked) {
                const otherId = linked.player1Id === deadId ? linked.player2Id : linked.player1Id;
                if (this.players[otherId].alive) {
                    this.players[otherId].alive = false;
                    deaths.push(otherId);
                }
            }
        });

        // Passer au jour
        this.phase = 'day';
        this.dayCount++;
        this.nightCount++;

        // Vérifier les conditions de victoire
        return {
            phase: 'day',
            deaths,
            dayCount: this.dayCount
        };
    }

    /**
     * Enregistrer un vote
     */
    recordVote(voterId, targetId) {
        this.votes[voterId] = targetId;
    }

    /**
     * Obtenir les résultats du vote
     */
    getVoteResults() {
        this.voteResults = {};

        Object.values(this.votes).forEach(targetId => {
            if (targetId === null) return; // Abstention
            this.voteResults[targetId] = (this.voteResults[targetId] || 0) + 1;
        });

        // Trouver celui avec le plus de votes
        let maxVotes = 0;
        let mostVoted = null;
        Object.keys(this.voteResults).forEach(targetId => {
            if (this.voteResults[targetId] > maxVotes) {
                maxVotes = this.voteResults[targetId];
                mostVoted = parseInt(targetId);
            }
        });

        return {
            results: this.voteResults,
            eliminated: mostVoted,
            voteCount: maxVotes
        };
    }

    /**
     * Appliquer l'élimination votée
     */
    applyElimination(playerId) {
        if (!this.players[playerId].alive) return false;

        const role = getRoleByName(this.players[playerId].role);

        // Vérifier les pouvoirs spéciaux
        if (role.specialAbility === 'daySurvival') {
            // L'idiot ne meurt pas mais perd ses pouvoirs
            this.players[playerId].role = null;
            return { survived: true, playerId };
        }

        this.players[playerId].alive = false;

        // Si chasseur, il peut tirer
        if (role.deathPower && role.name === 'Chasseur') {
            return { deathPower: true, playerId };
        }

        // Vérifier les liens amoureux
        const linked = this.linkedPlayers.find(
            l => l.player1Id === playerId || l.player2Id === playerId
        );
        if (linked) {
            const otherId = linked.player1Id === playerId ? linked.player2Id : linked.player1Id;
            if (this.players[otherId].alive) {
                this.players[otherId].alive = false;
                return { linked: true, playerId, linkedId: otherId };
            }
        }

        return { eliminated: true, playerId };
    }

    /**
     * Terminer la phase de jour
     */
    finishDayPhase() {
        // Réinitialiser les votes
        this.votes = {};
        this.voteResults = {};

        // Préparer la nuit
        this.phase = 'night';
        this.prepareNightActions();

        return { phase: 'night', nightCount: this.nightCount + 1 };
    }

    /**
     * Vérifier les conditions de victoire
     */
    checkWinConditions() {
        const alive = this.players.filter(p => p.alive);
        const aliveLawyerVillagers = alive.filter(p => {
            const role = getRoleByName(p.role);
            return role && role.team === 'village';
        });
        const aliveWolves = alive.filter(p => {
            const role = getRoleByName(p.role);
            return role && role.isWolf;
        });

        // Les loups gagnent si égalité ou majorité
        if (aliveWolves.length >= aliveLawyerVillagers.length) {
            return {
                gameOver: true,
                winner: 'wolves',
                message: 'Les loups ont atteint la parité! Ils gagnent!'
            };
        }

        // Les villageois gagnent si tous les loups sont morts
        if (aliveWolves.length === 0) {
            return {
                gameOver: true,
                winner: 'village',
                message: 'Tous les loups sont éliminés! Le village gagne!'
            };
        }

        return { gameOver: false };
    }

    /**
     * Obtenir les cibles disponibles pour une action
     */
    getAvailableTargets(actionType, playerId) {
        const targets = [];

        if (actionType === 'singleWolf') {
            // Loup blanc - peut cibler d'autres loups
            return this.players
                .map((p, i) => ({ id: i, name: p.name }))
                .filter(p => {
                    const role = getRoleByName(this.players[p.id].role);
                    return this.players[p.id].alive && p.id !== playerId && 
                           role && role.isWolf && role.name !== 'Loup Blanc';
                });
        }

        // Pour les autres actions, cibler un joueur vivant
        return this.players
            .map((p, i) => ({ id: i, name: p.name }))
            .filter(p => this.players[p.id].alive && p.id !== playerId);
    }

    /**
     * Obtenir les joueurs vivants
     */
    getAlivePlayers() {
        return this.players.filter(p => p.alive);
    }

    /**
     * Obtenir les joueurs morts
     */
    getDeadPlayers() {
        return this.players.filter(p => !p.alive);
    }

    /**
     * Obtenir l'état complet pour sérialisation
     */
    getState() {
        return {
            status: this.status,
            phase: this.phase,
            dayCount: this.dayCount,
            nightCount: this.nightCount,
            players: this.players,
            nightActions: this.nightActions,
            currentNightActionIndex: this.currentNightActionIndex,
            votes: this.votes,
            linkedPlayers: this.linkedPlayers
        };
    }

    /**
     * Restaurer l'état depuis une sérialisation
     */
    setState(state) {
        this.status = state.status;
        this.phase = state.phase;
        this.dayCount = state.dayCount;
        this.nightCount = state.nightCount;
        this.players = state.players;
        this.nightActions = state.nightActions;
        this.currentNightActionIndex = state.currentNightActionIndex;
        this.votes = state.votes;
        this.linkedPlayers = state.linkedPlayers;
    }
}

/**
 * Contrôler la logique générale du jeu
 */
class GameController {
    constructor() {
        this.gameState = new GameState();
        this.listeners = [];
    }

    /**
     * S'abonner aux changements d'état
     */
    onStateChange(callback) {
        this.listeners.push(callback);
    }

    /**
     * Notifier les observateurs
     */
    notifyStateChange(event) {
        this.listeners.forEach(cb => cb(event));
    }

    /**
     * Initialiser une nouvelle partie
     */
    startNewGame(playerNames, selectedRoles) {
        const success = this.gameState.initializeGame(playerNames, selectedRoles);
        if (success) {
            this.notifyStateChange({
                type: 'gameStarted',
                state: this.gameState.getState()
            });
        }
        return success;
    }

    /**
     * Obtenir l'état actuel
     */
    getGameState() {
        return this.gameState.getState();
    }

    /**
     * Obtenir le joueur actuel (pour la nuit)
     */
    getCurrentPlayer() {
        return this.gameState.getCurrentNightActionPlayer();
    }

    /**
     * Obtenir l'action actuelle
     */
    getCurrentAction() {
        return this.gameState.getCurrentNightAction();
    }

    /**
     * Attribuer une cible à l'action actuelle
     */
    performNightAction(targetId) {
        const success = this.gameState.recordNightAction(targetId);
        if (success) {
            this.notifyStateChange({
                type: 'nightActionPerformed',
                action: this.gameState.getCurrentNightAction()
            });
        }
        return success;
    }

    /**
     * Aller à l'action suivante
     */
    nextNightAction() {
        const hasNext = this.gameState.nextNightAction();
        if (hasNext) {
            this.notifyStateChange({
                type: 'nightActionChanged',
                currentAction: this.gameState.getCurrentNightAction(),
                currentIndex: this.gameState.currentNightActionIndex
            });
        } else {
            // Fin de la nuit
            const result = this.gameState.finishNightPhase();
            this.notifyStateChange({
                type: 'phaseChanged',
                phase: 'day',
                deaths: result.deaths
            });
        }
        return hasNext;
    }

    /**
     * Enregistrer un vote
     */
    recordVote(voterId, targetId) {
        this.gameState.recordVote(voterId, targetId);
        this.notifyStateChange({
            type: 'voteRecorded',
            voterId,
            targetId
        });
    }

    /**
     * Obtenir les résultats de vote
     */
    getVoteResults() {
        return this.gameState.getVoteResults();
    }

    /**
     * Appliquer l'élimination
     */
    applyElimination(playerId) {
        const result = this.gameState.applyElimination(playerId);
        if (result) {
            this.notifyStateChange({
                type: 'playerEliminated',
                result
            });
        }
        return result;
    }

    /**
     * Vérifier les conditions de victoire
     */
    checkWinConditions() {
        return this.gameState.checkWinConditions();
    }

    /**
     * Obtenir les cibles disponibles
     */
    getAvailableTargets(actionType, playerId) {
        return this.gameState.getAvailableTargets(actionType, playerId);
    }

    /**
     * Obtenir les joueurs
     */
    getPlayers() {
        return this.gameState.players;
    }

    /**
     * Obtenir un joueur par ID
     */
    getPlayer(playerId) {
        return this.gameState.players[playerId];
    }

    /**
     * Obtenir les joueurs vivants
     */
    getAlivePlayers() {
        return this.gameState.getAlivePlayers();
    }
}
