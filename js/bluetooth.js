/**
 * LOUP-GAROU - GESTION BLUETOOTH
 * Synchronisation de l'état du jeu via Web Bluetooth API
 * Note: Web Bluetooth nécessite HTTPS ou localhost
 */

class BluetoothManager {
    constructor() {
        // État de la connexion
        this.isAvailable = 'bluetooth' in navigator;
        this.isConnected = false;
        this.isPresenter = false;
        this.device = null;
        this.server = null;
        this.characteristic = null;

        // Identifiants personnalisés
        this.SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
        this.CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

        // Listeners
        this.listeners = [];

        // Mode simulation (pour développement local)
        this.simulationMode = !this.isAvailable;

        // File d'attente des messages
        this.messageQueue = [];
        this.isProcessing = false;

        if (!this.isAvailable) {
            console.warn('Web Bluetooth API non disponible - mode simulation activé');
        }
    }

    /**
     * S'abonner aux événements Bluetooth
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
     * Créer une partie (mode Présentateur)
     */
    async createGame(playerName) {
        if (this.simulationMode) {
            return this.simulateCreateGame(playerName);
        }

        try {
            // En mode réel, le présentateur crée un serveur BLE
            // (Dans une implémentation native, ceci serait côté backend)
            this.isPresenter = true;
            this.isConnected = true;

            this.notifyListeners({
                type: 'gameCreated',
                presenter: playerName,
                gameId: this.generateGameId()
            });

            return true;
        } catch (err) {
            console.error('Erreur création partie:', err);
            return false;
        }
    }

    /**
     * Rejoindre une partie (mode Joueur)
     */
    async joinGame(playerName) {
        if (this.simulationMode) {
            return this.simulateJoinGame(playerName);
        }

        try {
            // Scan des appareils disponibles
            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ name: 'LoupGarou-Presenter' }],
                optionalServices: [this.SERVICE_UUID]
            });

            if (!this.device) {
                console.error('Aucun appareil trouvé');
                return false;
            }

            // Connecter au serveur GATT
            this.server = await this.device.gatt.connect();
            const service = await this.server.getPrimaryService(this.SERVICE_UUID);
            this.characteristic = await service.getCharacteristic(this.CHAR_UUID);

            // Écouter les notifications
            await this.characteristic.startNotifications();
            this.characteristic.addEventListener('characteristicvaluechanged', (e) => {
                this.handleBluetoothMessage(e.target.value);
            });

            this.isConnected = true;

            // Envoyer demande de connexion
            await this.sendMessage({
                type: 'joinRequest',
                playerName
            });

            this.notifyListeners({
                type: 'connected',
                role: 'player',
                playerName
            });

            return true;
        } catch (err) {
            console.error('Erreur connexion Bluetooth:', err);
            return false;
        }
    }

    /**
     * Envoyer un message via Bluetooth
     */
    async sendMessage(message) {
        if (this.simulationMode) {
            return this.simulateSendMessage(message);
        }

        try {
            if (!this.characteristic || !this.isConnected) {
                console.error('Bluetooth non connecté');
                return false;
            }

            const messageString = JSON.stringify(message);
            const encoder = new TextEncoder();
            const data = encoder.encode(messageString);

            // Les caractéristiques BLE ont une taille limite (généralement 20 bytes)
            // Splitchunker les messages longs
            if (data.length > 20) {
                // Implémenter un protocole de chunking
                return await this.sendLargeMessage(data);
            }

            await this.characteristic.writeValue(data);
            return true;
        } catch (err) {
            console.error('Erreur envoi message:', err);
            return false;
        }
    }

    /**
     * Envoyer un message volumineux en chunks
     */
    async sendLargeMessage(data) {
        const chunkSize = 18; // Réserver 2 bytes pour header
        const chunks = Math.ceil(data.length / chunkSize);

        for (let i = 0; i < chunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, data.length);
            const chunk = data.slice(start, end);

            // Ajouter header: [isLast, chunkNumber]
            const header = new Uint8Array([chunks > 1 ? (i === chunks - 1 ? 1 : 0) : 1, i]);
            const payload = new Uint8Array(header.length + chunk.length);
            payload.set(header);
            payload.set(chunk, header.length);

            await this.characteristic.writeValue(payload);
            // Petit délai entre les chunks
            await new Promise(r => setTimeout(r, 50));
        }

        return true;
    }

    /**
     * Traiter les messages reçus
     */
    handleBluetoothMessage(value) {
        try {
            const decoder = new TextDecoder();
            const messageString = decoder.decode(value);
            const message = JSON.parse(messageString);

            this.processMessage(message);
        } catch (err) {
            console.error('Erreur décodage message:', err);
        }
    }

    /**
     * Traiter un message reçu
     */
    processMessage(message) {
        // Vérifier les types de message
        const validTypes = [
            'gameCreated', 'joinRequest', 'playerJoined', 'gameStarted',
            'phaseChanged', 'nightActionPrompt', 'votingPrompt', 
            'playerEliminated', 'gameEnded', 'roleAssignment',
            'nightActionResult', 'voteResults'
        ];

        if (!validTypes.includes(message.type)) {
            console.warn('Type message inconnu:', message.type);
            return;
        }

        this.notifyListeners(message);
    }

    /**
     * Déconnecter
     */
    async disconnect() {
        try {
            if (this.device && this.server) {
                this.server.disconnect();
                this.device = null;
                this.server = null;
                this.characteristic = null;
            }
            this.isConnected = false;
            this.isPresenter = false;

            this.notifyListeners({
                type: 'disconnected'
            });

            return true;
        } catch (err) {
            console.error('Erreur déconnexion:', err);
            return false;
        }
    }

    // ============================================
    // MODE SIMULATION (Pour développement)
    // ============================================

    /**
     * Simuler la création d'une partie
     */
    simulateCreateGame(playerName) {
        this.isPresenter = true;
        this.isConnected = true;

        setTimeout(() => {
            this.notifyListeners({
                type: 'gameCreated',
                presenter: playerName,
                gameId: this.generateGameId()
            });
        }, 500);

        return true;
    }

    /**
     * Simuler la connexion à une partie
     */
    simulateJoinGame(playerName) {
        this.isConnected = true;

        setTimeout(() => {
            this.notifyListeners({
                type: 'connected',
                role: 'player',
                playerName
            });

            // Simuler un présentateur déjà existant
            setTimeout(() => {
                this.notifyListeners({
                    type: 'gameAvailable',
                    presenter: 'Présentateur Simulé'
                });
            }, 1000);
        }, 800);

        return true;
    }

    /**
     * Simuler l'envoi de message
     */
    simulateSendMessage(message) {
        // En mode simulation, les messages sont traités immédiatement
        console.log('[BT SIM] Message envoyé:', message);
        return true;
    }

    /**
     * Générer un ID de partie
     */
    generateGameId() {
        return 'GAME_' + Date.now().toString(36).toUpperCase();
    }
}

/**
 * Manager centralisé pour la synchronisation réseau
 */
class SyncManager {
    constructor(bluetoothManager, gameController) {
        this.bt = bluetoothManager;
        this.game = gameController;

        // S'abonner aux messages Bluetooth
        this.bt.onMessage((message) => this.handleBluetoothMessage(message));

        // S'abonner aux changements de jeu
        this.game.onStateChange((event) => this.handleGameStateChange(event));
    }

    /**
     * Traiter les messages Bluetooth entrants
     */
    handleBluetoothMessage(message) {
        console.log('[SYNC] Message reçu:', message.type);

        switch (message.type) {
            case 'gameStarted':
                // Présentateur: partie lancée
                this.game.startNewGame(message.playerNames, message.selectedRoles);
                break;

            case 'nightActionPrompt':
                // Joueur: invite d'action nocturne
                window.dispatchEvent(new CustomEvent('nightActionPrompt', { detail: message }));
                break;

            case 'votingPrompt':
                // Joueur: invite de vote
                window.dispatchEvent(new CustomEvent('votingPrompt', { detail: message }));
                break;

            case 'roleAssignment':
                // Joueur: leur rôle assigné
                window.dispatchEvent(new CustomEvent('roleAssigned', { detail: message }));
                break;

            case 'playerJoined':
                // Présentateur: un joueur s'est connecté
                window.dispatchEvent(new CustomEvent('playerJoined', { detail: message }));
                break;

            case 'playerList':
                // Présentateur: Liste mise à jour
                window.dispatchEvent(new CustomEvent('playerListUpdated', { detail: message }));
                break;

            case 'gameEnded':
                // Tous: jeu terminé
                window.dispatchEvent(new CustomEvent('gameEnded', { detail: message }));
                break;
        }
    }

    /**
     * Traiter les changements d'état du jeu
     */
    handleGameStateChange(event) {
        console.log('[SYNC] État du jeu changé:', event.type);

        // Le présentateur synchronise les changements à tous les joueurs
        if (this.bt.isPresenter) {
            switch (event.type) {
                case 'gameStarted':
                    this.bt.sendMessage({
                        type: 'gameStarted',
                        state: event.state
                    });
                    break;

                case 'nightActionChanged':
                    // Envoyer au joueur la nouvelle action
                    const currentPlayer = this.game.getCurrentPlayer();
                    if (currentPlayer) {
                        this.bt.sendMessage({
                            type: 'nightActionPrompt',
                            playerId: currentPlayer.id,
                            action: event.currentAction
                        });
                    }
                    break;

                case 'phaseChanged':
                    this.bt.sendMessage({
                        type: 'phaseChanged',
                        phase: event.phase,
                        dayCount: event.dayCount
                    });
                    break;

                case 'playerEliminated':
                    this.bt.sendMessage({
                        type: 'playerEliminated',
                        result: event.result
                    });
                    break;
            }
        }
    }

    /**
     * Envoyer une action de joueur au présentateur
     */
    async sendPlayerAction(actionType, targetId) {
        return await this.bt.sendMessage({
            type: 'playerAction',
            actionType,
            targetId,
            timestamp: Date.now()
        });
    }

    /**
     * Envoyer un vote de joueur
     */
    async sendVote(voterId, targetId) {
        return await this.bt.sendMessage({
            type: 'playerVote',
            voterId,
            targetId
        });
    }

    /**
     * Envoyer une demande de connexion
     */
    async requestJoin(playerName) {
        return await this.bt.sendMessage({
            type: 'joinRequest',
            playerName
        });
    }
}
