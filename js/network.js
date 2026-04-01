/**
 * LOUP-GAROU - GESTION RÉSEAU via API interne Vercel
 *  - POST /api/games         : création de partie
 *  - GET /api/games/:code    : lecture état partie
 *  - PUT /api/games/:code    : mise à jour état partie
 */

const API_BASE = '/api/games';

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
        this.POLL_INTERVAL = 800;
    }

    async createGame(playerName) {
        this.playerName = playerName;
        this.playerId = `presenter-${Date.now()}`;
        this.isPresenter = true;

        const payload = {
            host: playerName,
            players: [{ playerId: this.playerId, name: playerName, isAlive: true, role: null, isPresenter: true }],
            roles: [],
            state: 'lobby',
            currentPhase: 'lobby',
            nightPhase: null,
            currentNight: 0,
            votes: {},
            eliminated: [],
            messages: []
        };

        console.log('[NetworkManager] createGame payload', payload);
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('[NetworkManager] createGame API erreur', response.status, err);
            throw new Error(`Impossible de créer la partie: ${err}`);
        }

        const json = await response.json();
        this.gameId = (json.code && /^\d{4}$/.test(json.code)) ? json.code : (Date.now().toString().slice(-4));
        this.gameState = { ...(json.game || {}), code: this.gameId };
        this.isConnected = true;

        localStorage.setItem('gameId', this.gameId);
        localStorage.setItem('playerId', this.playerId);
        localStorage.setItem('isPresenter', 'true');
        this._saveLocalState();

        this.startPolling();

        return { gameId: this.gameId, joinCode: this.gameId, playerId: this.playerId };
    }

    async joinGame(gameId, playerName) {
        this.playerName = playerName;
        gameId = (gameId || '').toString().trim();
        if (!gameId) {
            throw new Error('Code de salle invalide');
        }

        this.gameId = gameId;
        this.playerId = `player-${Math.random().toString(36).substr(2, 9)}`;
        this.isPresenter = false;

        let gameState = await this.refreshGameState();
        if (!gameState) {
            const fallback = localStorage.getItem(`game_${gameId}`);
            if (fallback) {
                gameState = JSON.parse(fallback);
            }
        }

        if (!gameState) {
            throw new Error('Partie non trouvée');
        }

        this.gameState = gameState;

        // Normaliser players
        if (Array.isArray(this.gameState.players)) {
            this.gameState.players = this.gameState.players.map(p => {
                if (typeof p === 'string') {
                    return { playerId: p, name: p, isAlive: true, role: null, isPresenter: false };
                }
                return p;
            });
        } else {
            this.gameState.players = [];
        }

        if (!this.gameState.players.find(p => p.playerId === this.playerId)) {
            this.gameState.players.push({
                playerId: this.playerId,
                name: playerName,
                isAlive: true,
                role: null,
                isPresenter: false
            });
            await this._saveRemoteState();
        }

        this.isConnected = true;

        localStorage.setItem('gameId', gameId);
        localStorage.setItem('playerId', this.playerId);
        localStorage.setItem('isPresenter', 'false');
        this._saveLocalState();

        this.startPolling();

        return { gameId, playerId: this.playerId };
    }

    getGameState() {
        if (this.gameState) return this.gameState;
        const local = this._loadLocalState();
        return local || null;
    }

    async refreshGameState() {
        if (!this.gameId) return null;

        try {
            // Utilisation du format /api/games/CODE pour Vercel (plus propre avec [code].js)
            // Ajout d'un paramètre de cache-busting pour forcer Vercel à rafraîchir les données
            const url = `${API_BASE}/${encodeURIComponent(this.gameId)}?_t=${Date.now()}`;
            console.log('[NetworkManager] refreshGameState GET', url);
            const resp = await fetch(url);
            if (!resp.ok) {
                console.error('[NetworkManager] refreshGameState status', resp.status);
                if (resp.status === 404) return null;
                throw new Error('Erreur API rafraîchissement');
            }

            const json = await resp.json();
            console.log('[NetworkManager] refreshGameState result', json);
            if (!json.success) return null;

            this.gameState = json.game;
            this._saveLocalState();
            this.notifyListeners('GAME_STATE_CHANGED', this.gameState);
            return this.gameState;
        } catch (err) {
            console.error('refreshGameState error', err);
            return this._loadLocalState();
        }
    }

    async updateGameState(updates) {
        if (!this.gameId) return false;

        const current = await this.refreshGameState();
        if (!current) return false;

        this.gameState = { ...current, ...updates };
        this._saveLocalState();
        await this._saveRemoteState();
        this.notifyListeners('GAME_STATE_UPDATED', this.gameState);
        return true;
    }

    async submitVote(targetPlayerId) {
        if (!this.gameId) return false;
        const current = await this.refreshGameState();
        if (!current) return false;

        current.votes = current.votes || {};
        current.votes[this.playerId] = {
            voter: this.playerId,
            target: targetPlayerId,
            timestamp: Date.now()
        };

        this.gameState = current;
        this._saveLocalState();
        await this._saveRemoteState();

        this.notifyListeners('VOTE_SUBMITTED', { voter: this.playerId, target: targetPlayerId });
        return true;
    }

    async submitNightAction(action, targetPlayerId = null) {
        if (!this.gameId) return false;
        const current = await this.refreshGameState();
        if (!current) return false;

        current.roleActions = current.roleActions || {};
        current.roleActions[this.playerId] = {
            player: this.playerId,
            action: action,
            target: targetPlayerId,
            timestamp: Date.now()
        };

        this.gameState = current;
        this._saveLocalState();
        await this._saveRemoteState();

        this.notifyListeners('ROLE_ACTION_SUBMITTED', { player: this.playerId, action: action, target: targetPlayerId });
        return true;
    }

    addEventListener(callback) {
        if (typeof callback === 'function') this.listeners.push(callback);
    }

    notifyListeners(type, data) {
        this.listeners.forEach(cb => {
            try { cb({ type, data }); } catch (err) { console.error('Erreur listener:', err); }
        });
    }

    startPolling() {
        if (this.pollInterval) clearInterval(this.pollInterval);

        this.pollInterval = setInterval(async () => {
            await this.refreshGameState();
        }, this.POLL_INTERVAL);
    }

    disconnect() {
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.pollInterval = null;
        localStorage.removeItem('gameId');
        localStorage.removeItem('playerId');
        localStorage.removeItem('isPresenter');
        if (this.gameId) localStorage.removeItem(`game_${this.gameId}`);

        this.isConnected = false;
        this.gameId = null;
        this.playerId = null;
        this.isPresenter = false;
        this.gameState = null;
    }

    async _saveRemoteState() {
        if (!this.gameId) return null;

        const url = `${API_BASE}/${encodeURIComponent(this.gameId)}`;
        const resp = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.gameState)
        });

        if (!resp.ok) {
            const txt = await resp.text();
            throw new Error(`Impossible de sauvegarder la partie: ${txt}`);
        }

        const json = await resp.json();
        return json.game;
    }

    _saveLocalState() {
        if (!this.gameId || !this.gameState) return;
        localStorage.setItem(`game_${this.gameId}`, JSON.stringify(this.gameState));
    }

    _loadLocalState() {
        if (!this.gameId) return null;
        const raw = localStorage.getItem(`game_${this.gameId}`);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (err) {
            return null;
        }
    }
}

const networkManager = new NetworkManager();
