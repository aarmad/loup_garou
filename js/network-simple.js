/**
 * LOUP-GAROU - GESTION RÉSEAU SIMPLE (localStorage)
 * Version Vercel: synchronisation stateless via localStorage uniquement
 * Chaque client gère son état local, le présentateur orchestre
 */

class NetworkManager {
    constructor() {
        this.isConnected = false;
        this.isPresenter = false;
        this.gameId = null;
        this.playerId = null;
        this.playerName = null;
        this.listeners = [];
        this.gameState = null;
        this.pollInterval = null;
        
        // Polling rapide pour détecter les changements
        this.POLL_INTERVAL = 500; // 500ms pour détection rapide
    }

    /**
     * Créer une nouvelle partie (Présentateur)
     */
    async createGame(playerName) {
        try {
            this.playerName = playerName;
            // Utiliser un timestamp comme gameId simple
            this.gameId = Date.now().toString();
            this.playerId = `presenter-${this.gameId}`;
            this.isPresenter = true;
            this.isConnected = true;

            // État initial de la partie
            this.gameState = {
                code: this.gameId,
                host: playerName,
                presenterId: this.playerId,
                players: [
                    {
                        playerId: this.playerId,
                        name: playerName,
                        isAlive: true,
                        role: null,
                        isPresenter: true
                    }
                ],
                state: 'lobby', // lobby, setup, day, night, ended
                roles: [],
                currentPhase: 'day',
                nightPhase: null, // 'setup', 'actions', 'results'
                currentNight: 0,
                votes: {},
                eliminated: [],
                messages: [],
                roleActions: {}, // {playerId: {action: 'kill', target: playerId}}
                createdAt: Date.now()
            };

            // Sauvegarder dans localStorage
            localStorage.setItem('gameId', this.gameId);
            localStorage.setItem('playerId', this.playerId);
            localStorage.setItem('isPresenter', 'true');
            localStorage.setItem(`game_${this.gameId}`, JSON.stringify(this.gameState));

            // Démarrer la synchronisation locale
            this.startPolling();

            return {
                gameId: this.gameId,
                joinCode: this.gameId,
                playerId: this.playerId
            };
        } catch (err) {
            console.error('❌ Erreur création partie:', err);
            throw err;
        }
    }

    /**
     * Rejoindre une partie existante
     */
    async joinGame(gameId, playerName) {
        try {
            this.playerName = playerName;
            this.gameId = gameId;
            this.playerId = `player-${Math.random().toString(36).substr(2, 9)}`;
            this.isPresenter = false;

            // Récupérer l'état de la partie depuis localStorage
            const gameData = localStorage.getItem(`game_${gameId}`);
            if (!gameData) {
                throw new Error('Partie non trouvée');
            }

            this.gameState = JSON.parse(gameData);

            // Ajouter le joueur à la liste
            if (!this.gameState.players.find(p => p.playerId === this.playerId)) {
                this.gameState.players.push({
                    playerId: this.playerId,
                    name: playerName,
                    isAlive: true,
                    role: null,
                    isPresenter: false
                });

                // Sauvegarder les changements
                localStorage.setItem(`game_${gameId}`, JSON.stringify(this.gameState));
            }

            // Sauvegarder localement
            localStorage.setItem('gameId', gameId);
            localStorage.setItem('playerId', this.playerId);
            localStorage.setItem('isPresenter', 'false');

            this.isConnected = true;

            // Démarrer la synchronisation locale
            this.startPolling();

            return {
                gameId: gameId,
                playerId: this.playerId
            };
        } catch (err) {
            console.error('❌ Erreur rejoindre partie:', err);
            throw err;
        }
    }

    /**
     * Récupérer l'état actuel de la partie
     */
    getGameState() {
        if (!this.gameId) return null;

        // Recharger depuis localStorage en cas de changement
        const stored = localStorage.getItem(`game_${this.gameId}`);
        if (stored) {
            this.gameState = JSON.parse(stored);
        }

        return this.gameState;
    }

    /**
     * Mettre à jour l'état de la partie (Présentateur mainly)
     */
    updateGameState(updates) {
        if (!this.gameId || !this.isPresenter) {
            console.warn('⚠️ Seul le présentateur peut mettre à jour l\'état');
            return false;
        }

        // Récupérer l'état frais
        const current = this.getGameState();
        if (!current) return false;

        // Fusionner les mises à jour
        const updated = { ...current, ...updates };

        // Sauvegarder
        localStorage.setItem(`game_${this.gameId}`, JSON.stringify(updated));
        this.gameState = updated;

        // Notifier les listeners
        this.notifyListeners('GAME_STATE_UPDATED', updated);

        return true;
    }

    /**
     * Soumettre un vote
     */
    submitVote(targetPlayerId) {
        if (!this.gameId) return false;

        const current = this.getGameState();
        if (!current) return false;

        // Enregistrer le vote
        current.votes[this.playerId] = {
            voter: this.playerId,
            target: targetPlayerId,
            timestamp: Date.now()
        };

        localStorage.setItem(`game_${this.gameId}`, JSON.stringify(current));
        this.notifyListeners('VOTE_SUBMITTED', {
            voter: this.playerId,
            target: targetPlayerId
        });

        return true;
    }

    /**
     * Soumettre une action nocturne
     */
    submitNightAction(action, targetPlayerId = null) {
        if (!this.gameId) return false;

        const current = this.getGameState();
        if (!current) return false;

        // Enregistrer l'action
        current.roleActions[this.playerId] = {
            player: this.playerId,
            action: action,
            target: targetPlayerId,
            timestamp: Date.now()
        };

        localStorage.setItem(`game_${this.gameId}`, JSON.stringify(current));
        this.notifyListeners('ROLE_ACTION_SUBMITTED', {
            player: this.playerId,
            action: action,
            target: targetPlayerId
        });

        return true;
    }

    /**
     * Listener pour surveiller les changements
     */
    addEventListener(callback) {
        this.listeners.push(callback);
    }

    notifyListeners(type, data) {
        this.listeners.forEach(cb => {
            try {
                cb({ type, data });
            } catch (err) {
                console.error('Erreur listener:', err);
            }
        });
    }

    /**
     * Polling local pour détecter les changements
     */
    startPolling() {
        let lastState = JSON.stringify(this.gameState);

        this.pollInterval = setInterval(() => {
            if (!this.gameId) return;

            const current = localStorage.getItem(`game_${this.gameId}`);
            if (current && current !== lastState) {
                lastState = current;
                this.gameState = JSON.parse(current);

                // Notifier du changement
                this.notifyListeners('GAME_STATE_CHANGED', this.gameState);
            }
        }, this.POLL_INTERVAL);
    }

    /**
     * Arrêter la synchronisation
     */
    disconnect() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }

        // Nettoyer le localStorage
        localStorage.removeItem('gameId');
        localStorage.removeItem('playerId');
        localStorage.removeItem('isPresenter');

        this.isConnected = false;
        this.gameId = null;
        this.playerId = null;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NetworkManager;
}
