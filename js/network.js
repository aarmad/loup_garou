/**
 * LOUP-GAROU - GESTION RÉSEAU (WiFi/Internet)
 * Synchronisation de l'état du jeu via HTTP/WebSocket
 * Connexion simple par code de salle
 */

class NetworkManager {
    constructor() {
        // État de la connexion
        this.isConnected = false;
        this.isPresenter = false;
        this.gameId = null;
        this.playerId = null;
        this.playerName = null;
        this.serverUrl = this.getServerUrl();

        // WebSocket
        this.ws = null;

        // Listeners
        this.listeners = [];

        // File d'attente des messages
        this.messageQueue = [];
        this.isProcessing = false;

        // État local du jeu
        this.gameState = null;
    }

    /**
     * Obtenir l'URL du serveur (adapté à localhost ou domaine)
     */
    getServerUrl() {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const host = window.location.host;
        return `${protocol}://${host}`;
    }

    /**
     * Créer une nouvelle partie
     */
    async createGame(playerName) {
        try {
            this.playerName = playerName;
            const response = await fetch('/api/game/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ presenterName: playerName })
            });

            if (!response.ok) throw new Error('Erreur création partie');

            const data = await response.json();
            this.gameId = data.gameId;
            this.playerId = data.playerId;
            this.isPresenter = true;

            // Connecter au WebSocket
            await this.connectToGame();

            return {
                gameId: this.gameId,
                joinCode: data.joinCode,
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

            const response = await fetch(`/api/game/${gameId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerName: playerName })
            });

            if (!response.ok) throw new Error('Erreur connexion partie');

            const data = await response.json();
            this.playerId = data.playerId;
            this.isPresenter = false;

            // Connecter au WebSocket
            await this.connectToGame();

            return {
                gameId: this.gameId,
                playerId: this.playerId,
                players: data.players
            };
        } catch (err) {
            console.error('Erreur connexion partie:', err);
            throw err;
        }
    }

    /**
     * Se connecter au WebSocket de la partie
     */
    connectToGame() {
        return new Promise((resolve, reject) => {
            try {
                const wsUrl = `${this.serverUrl}/ws?gameId=${this.gameId}&playerId=${this.playerId}`;
                this.ws = new WebSocket(wsUrl);

                this.ws.onopen = () => {
                    console.log('✅ Connecté au serveur');
                    this.isConnected = true;
                    this.processMessageQueue();
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                };

                this.ws.onerror = (error) => {
                    console.error('Erreur WebSocket:', error);
                    reject(error);
                };

                this.ws.onclose = () => {
                    console.warn('Déconnexion du serveur');
                    this.isConnected = false;
                    // Tenter reconnexion après 3s
                    setTimeout(() => this.reconnect(), 3000);
                };
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Se reconnecter après déconnexion
     */
    async reconnect() {
        if (!this.isConnected && this.gameId && this.playerId) {
            try {
                await this.connectToGame();
            } catch (err) {
                console.error('Reconnexion échouée:', err);
                setTimeout(() => this.reconnect(), 3000);
            }
        }
    }

    /**
     * Traiter un message reçu du serveur
     */
    handleMessage(message) {
        console.log('📨 Message reçu:', message.type);

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
     * Envoyer un message au serveur
     */
    sendMessage(message) {
        if (!message.gameId) message.gameId = this.gameId;
        if (!message.playerId) message.playerId = this.playerId;

        if (!this.isConnected) {
            // Ajouter à la file d'attente si non connecté
            this.messageQueue.push(message);
            return;
        }

        this.ws.send(JSON.stringify(message));
    }

    /**
     * Traiter la file d'attente des messages
     */
    processMessageQueue() {
        while (this.messageQueue.length > 0 && !this.isProcessing) {
            this.isProcessing = true;
            const message = this.messageQueue.shift();
            this.ws.send(JSON.stringify(message));
            this.isProcessing = false;
        }
    }

    /**
     * Démarrer la partie (Présentateur uniquement)
     */
    startGame(roles) {
        this.sendMessage({
            type: 'GAME_START',
            roles: roles
        });
    }

    /**
     * Soumettre une action nocturne
     */
    submitNightAction(action) {
        this.sendMessage({
            type: 'NIGHT_ACTION',
            action: action
        });
    }

    /**
     * Voter pour éliminer quelqu'un
     */
    submitVote(targetPlayerId) {
        this.sendMessage({
            type: 'VOTE',
            targetPlayerId: targetPlayerId
        });
    }

    /**
     * Passer à la phase suivante (Présentateur)
     */
    nextPhase() {
        this.sendMessage({
            type: 'NEXT_PHASE'
        });
    }

    /**
     * Éliminer un joueur (Présentateur)
     */
    eliminatePlayer(playerId) {
        this.sendMessage({
            type: 'ELIMINATE_PLAYER',
            playerId: playerId
        });
    }

    /**
     * Obtenir la liste des joueurs
     */
    async getPlayers() {
        try {
            const response = await fetch(`/api/game/${this.gameId}/players`);
            return await response.json();
        } catch (err) {
            console.error('Erreur récupération joueurs:', err);
            return [];
        }
    }

    /**
     * Se déconnecter
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
        this.isConnected = false;
        this.gameId = null;
        this.playerId = null;
    }
}

// Exporter le gestionnaire
const networkManager = new NetworkManager();
