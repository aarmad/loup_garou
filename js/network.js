/**
 * LOUP-GAROU - GESTION RÉSEAU (WiFi/Internet)
 * Synchronisation via API HTTP (Vercel + localStorage)
 */

class NetworkManager {
    constructor() {
        this.isConnected = false;
        this.isPresenter = false;
        this.gameId = null;
        this.playerId = null;
        this.playerName = null;
        this.listeners = [];
        this.messageQueue = [];
        this.isProcessing = false;
        this.gameState = null;
        this.syncInterval = null;
        this.apiBaseUrl = this.getApiUrl();
    }

    /**
     * Obtient l'URL de l'API (localhost ou Vercel)
     */
    getApiUrl() {
        // Sur Vercel ou en production
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            return window.location.origin;
        }
        return 'http://localhost:3000';
    }

    /**
     * Créer une nouvelle partie
     */
    async createGame(playerName) {
        try {
            this.playerName = playerName;
            const response = await fetch(`${this.apiBaseUrl}/api/games`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    host: playerName,
                    roles: []
                })
            });

            if (!response.ok) throw new Error('Erreur création partie');

            const data = await response.json();
            this.gameId = data.code;
            this.playerId = `presenter-${Date.now()}`;
            this.isPresenter = true;
            this.isConnected = true;

            // Sauvegarder localement
            localStorage.setItem('gameId', this.gameId);
            localStorage.setItem('playerId', this.playerId);
            localStorage.setItem('isPresenter', 'true');

            // Démarrer la synchronisation
            this.startSync();

            return {
                gameId: this.gameId,
                joinCode: this.gameId,
                playerId: this.playerId
            };
        } catch (err) {
            console.error('Erreur création partie:', err);
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

            // Vérifier que la partie existe
            const response = await fetch(`${this.apiBaseUrl}/api/games?code=${gameId}`);
            
            if (!response.ok) throw new Error('Partie non trouvée');

            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Partie non trouvée');

            this.playerId = `player-${Date.now()}`;
            this.isPresenter = false;
            this.isConnected = true;

            // Sauvegarder localement
            localStorage.setItem('gameId', this.gameId);
            localStorage.setItem('playerId', this.playerId);
            localStorage.setItem('isPresenter', 'false');
            localStorage.setItem('playerName', playerName);

            // Démarrer la synchronisation
            this.startSync();

            return {
                gameId: this.gameId,
                playerId: this.playerId,
                players: data.game.players || []
            };
        } catch (err) {
            console.error('Erreur connexion partie:', err);
            throw err;
        }
    }

    /**
     * Démarrer la synchronisation avec l'API
     */
    startSync() {
        if (!this.syncInterval) {
            // Synchroniser toutes les 2 secondes
            this.syncInterval = setInterval(() => {
                this.syncGameState();
            }, 2000);
        }
    }

    /**
     * Synchronise l'état de la partie
     */
    async syncGameState() {
        if (!this.gameId) return;

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/games?code=${this.gameId}`);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.success) {
                    const game = data.game;
                    
                    // Comparer avec l'état local
                    if (JSON.stringify(game) !== JSON.stringify(this.gameState)) {
                        this.gameState = game;
                        this.notifyListeners({
                            type: 'STATE_UPDATE',
                            gameState: game
                        });
                    }
                }
            }
        } catch (error) {
            console.warn('Erreur synchronisation:', error);
        }
    }

    /**
     * Se connecter au WebSocket de la partie
     */
    connectToGame() {
        return Promise.resolve(); // Pas besoin de WebSocket avec l'API HTTP
    }

    /**
     * Se reconnecter après déconnexion
     */
    async reconnect() {
        if (!this.isConnected && this.gameId && this.playerId) {
            this.isConnected = true;
            this.startSync();
        }
    }

    /**
     * Traiter un message reçu
     */
    handleMessage(message) {
        console.log('📨 Message:', message.type);

        // Mettre à jour l'état local
        if (message.gameState) {
            this.gameState = message.gameState;
        }

        // Notifier les listeners
        this.notifyListeners(message);
    }

    /**
     * S'abonner aux événements réseau
     */
    onMessage(callback) {
        this.listeners.push(callback);
    }

    /**
     * Notifier les listeners
     */
    notifyListeners(message) {
        this.listeners.forEach(cb => {
            try {
                cb(message);
            } catch (err) {
                console.error('Erreur listener:', err);
            }
        });
    }

    /**
     * Envoyer une action au serveur (mise à jour API)
     */
    async sendMessage(message) {
        if (!message.gameId) message.gameId = this.gameId;
        if (!message.playerId) message.playerId = this.playerId;

        try {
            const updates = {
                type: message.type,
                playerId: message.playerId,
                ...message
            };

            const response = await fetch(`${this.apiBaseUrl}/api/games?code=${this.gameId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            if (response.ok) {
                const data = await response.json();
                this.gameState = data.game;
                this.notifyListeners({
                    type: 'STATE_UPDATE',
                    gameState: data.game
                });
            }
        } catch (err) {
            console.error('Erreur envoi message:', err);
            if (!this.isProcessing) {
                this.messageQueue.push(message);
            }
        }
    }

    /**
     * Traiter la file d'attente des messages
     */
    async processMessageQueue() {
        while (this.messageQueue.length > 0 && !this.isProcessing) {
            this.isProcessing = true;
            const message = this.messageQueue.shift();
            await this.sendMessage(message);
            this.isProcessing = false;
        }
    }

    /**
     * Démarrer la partie (Présentateur uniquement)
     */
    async startGame(roles) {
        return this.sendMessage({
            type: 'GAME_START',
            roles: roles,
            state: 'playing'
        });
    }

    /**
     * Soumettre une action nocturne
     */
    async submitNightAction(action) {
        return this.sendMessage({
            type: 'NIGHT_ACTION',
            action: action
        });
    }

    /**
     * Voter pour éliminer quelqu'un
     */
    async submitVote(targetPlayerId) {
        return this.sendMessage({
            type: 'VOTE',
            targetPlayerId: targetPlayerId
        });
    }

    /**
     * Passer à la phase suivante (Présentateur)
     */
    async nextPhase() {
        return this.sendMessage({
            type: 'NEXT_PHASE'
        });
    }

    /**
     * Éliminer un joueur (Présentateur)
     */
    async eliminatePlayer(playerId) {
        return this.sendMessage({
            type: 'ELIMINATE_PLAYER',
            playerId: playerId
        });
    }

    /**
     * Obtenir la liste des joueurs
     */
    async getPlayers() {
        try {
            if (this.gameState) {
                return this.gameState.players || [];
            }
            return [];
        } catch (err) {
            console.error('Erreur récupération joueurs:', err);
            return [];
        }
    }

    /**
     * Se déconnecter
     */
    disconnect() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        this.isConnected = false;
        this.gameId = null;
        this.playerId = null;
        
        // Effacer le localStorage
        localStorage.removeItem('gameId');
        localStorage.removeItem('playerId');
        localStorage.removeItem('isPresenter');
        localStorage.removeItem('playerName');
    }
}

// Exporter le gestionnaire
const networkManager = new NetworkManager();
