#!/usr/bin/env node
/**
 * LOUP-GAROU - SERVEUR PRINCIPAL
 * Gestion des parties, WebSocket, et API REST
 */

import dotenv from 'dotenv';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import url from 'url';

// Charger les variables d'environnement
dotenv.config({ path: '.env.local' });

// Configuration des répertoires
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================================================================
// CONFIGURATION DU SERVEUR
// ================================================================

const HTTP_PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 8000;

// Gestion des parties
const games = new Map();
const players = new Map();
const playerSessions = new Map();

// ================================================================
// GESTION DES CERTIFICATS
// ================================================================

function ensureCertificate() {
    const certPath = path.join(__dirname, 'cert', 'cert.pem');
    const keyPath = path.join(__dirname, 'cert', 'key.pem');

    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        return { cert: certPath, key: keyPath };
    }

    console.log('✅ Utilisation des certificats existants');
    return { cert: certPath, key: keyPath };
}

const certs = ensureCertificate();


// ================================================================
// CLASS GAME MANAGER
// ================================================================

class GameManager {
    constructor() {
        this.games = games;
        this.players = players;
    }

    createGame(presenterName) {
        const gameId = this.generateId();
        const joinCode = this.generateCode();
        const playerId = this.generateId();

        const game = {
            gameId,
            joinCode,
            presenterName,
            presenterId: playerId,
            status: 'WAITING',
            currentPhase: 'SETUP',
            currentNight: 0,
            players: [playerId],
            roles: {},
            votes: {},
            deaths: [],
            eliminated: [],
            createdAt: Date.now()
        };

        const player = {
            playerId,
            name: presenterName,
            gameId,
            isPresenter: true,
            role: null,
            isAlive: true,
            hasActed: false,
            joinedAt: Date.now()
        };

        this.games.set(gameId, game);
        this.players.set(playerId, player);

        console.log(`🎮 Partie créée: ${gameId} (code: ${joinCode})`);
        return { gameId, playerId, joinCode };
    }

    joinGame(gameId, playerName) {
        const game = this.games.get(gameId);
        if (!game) throw new Error('Partie non trouvée');
        if (game.status !== 'WAITING') throw new Error('Partie déjà commencée');

        const playerId = this.generateId();
        game.players.push(playerId);

        const player = {
            playerId,
            name: playerName,
            gameId,
            isPresenter: false,
            role: null,
            isAlive: true,
            hasActed: false,
            joinedAt: Date.now()
        };

        this.players.set(playerId, player);
        console.log(`👤 ${playerName} a rejoint la partie ${gameId}`);
        return { playerId, players: game.players.map(id => this.players.get(id)) };
    }

    getGameState(gameId) {
        return this.games.get(gameId);
    }

    getPlayer(playerId) {
        return this.players.get(playerId);
    }

    startGame(gameId, roles) {
        const game = this.games.get(gameId);
        if (!game) throw new Error('Partie non trouvée');

        game.status = 'PLAYING';
        game.currentPhase = 'NIGHT';
        game.currentNight = 1;

        const playerList = game.players;
        for (let i = 0; i < playerList.length; i++) {
            const playerId = playerList[i];
            const player = this.players.get(playerId);
            player.role = roles[i];
        }

        console.log(`🎬 Partie ${gameId} démarrée`);
        return game;
    }

    nextPhase(gameId) {
        const game = this.games.get(gameId);
        if (!game) throw new Error('Partie non trouvée');

        if (game.currentPhase === 'NIGHT') {
            game.currentPhase = 'DAY';
        } else {
            game.currentPhase = 'NIGHT';
            game.currentNight++;
        }

        return game.currentPhase;
    }

    eliminatePlayer(gameId, playerId) {
        const game = this.games.get(gameId);
        const player = this.players.get(playerId);
        if (!game || !player) throw new Error('Données non trouvées');

        player.isAlive = false;
        game.eliminated.push(playerId);

        console.log(`💀 ${player.name} a été éliminé`);
        return game;
    }

    submitVote(gameId, voterId, targetId) {
        const game = this.games.get(gameId);
        if (!game) throw new Error('Partie non trouvée');

        if (!game.votes) game.votes = {};
        game.votes[voterId] = targetId;

        return Object.keys(game.votes).length;
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    generateCode() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    }
}

const gameManager = new GameManager();

// ================================================================
// ROUTES HTTP
// ================================================================

function getMimeType(filePath) {
    const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
        '.txt': 'text/plain; charset=utf-8'
    };

    const ext = path.extname(filePath).toLowerCase();
    return mimeTypes[ext] || 'application/octet-stream';
}

function serveFile(res, filePath, contentType) {
    try {
        const fullPath = path.join(__dirname, filePath);
        if (!fs.existsSync(fullPath)) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Fichier non trouvé');
            return;
        }
        const content = fs.readFileSync(fullPath);
        res.writeHead(200, { 'Content-Type': contentType || getMimeType(filePath) });
        res.end(content);
    } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Erreur serveur: ' + err.message);
    }
}

function handleRequest(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const pathname = url.parse(req.url).pathname;

    // Routes API
    if (pathname === '/api/game/create' && req.method === 'POST') {
        return handleCreateGame(req, res);
    }

    // Route API /api/games - compatible Vercel
    if (pathname === '/api/games' && req.method === 'POST') {
        return handleCreateGame(req, res);
    }

    const gamesMatch = pathname.match(/^\/api\/games\/(.*)$/);
    if (gamesMatch && req.method === 'GET') {
        return handleGetGame(gamesMatch[1], res);
    }

    if (gamesMatch && req.method === 'PUT') {
        return handleUpdateGame(gamesMatch[1], req, res);
    }

    const joinMatch = pathname.match(/^\/api\/game\/(.+)\/join$/);
    if (joinMatch && req.method === 'POST') {
        return handleJoinGame(joinMatch[1], req, res);
    }

    const playersMatch = pathname.match(/^\/api\/game\/(.+)\/players$/);
    if (playersMatch) {
        return handleGetPlayers(playersMatch[1], res);
    }

    // Fichiers statiques
    if (pathname === '/' || pathname === '/index.html') {
        return serveFile(res, 'index.html', 'text/html');
    }

    if (pathname.startsWith('/css/')) {
        return serveFile(res, pathname.slice(1), 'text/css');
    }

    if (pathname.startsWith('/js/')) {
        return serveFile(res, pathname.slice(1), 'application/javascript');
    }

    if (pathname.startsWith('/assets/')) {
        return serveFile(res, pathname.slice(1), 'application/octet-stream');
    }

    if (pathname === '/manifest.json') {
        return serveFile(res, 'manifest.json', 'application/json');
    }

    if (pathname === '/service-worker.js') {
        return serveFile(res, 'service-worker.js', 'application/javascript');
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Non trouvé: ' + pathname);
}

function handleCreateGame(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            const data = JSON.parse(body);
            const { gameId, playerId, joinCode } = gameManager.createGame(data.host || data.presenterName || 'Présentateur');
            
            // Format compatible Vercel
            const game = {
                code: joinCode,
                gameId: gameId,
                presenterId: playerId,
                host: data.host || data.presenterName,
                players: [playerId],
                state: 'lobby',
                roles: data.roles || [],
                currentPhase: 'day',
                createdAt: Date.now()
            };
            
            games.set(joinCode, game);
            
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: true, 
                code: joinCode,
                game: game,
                // Compatibilité ancienne API
                gameId, 
                playerId, 
                joinCode 
            }));
        } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: false,
                error: err.message 
            }));
        }
    });
}

function handleJoinGame(gameId, req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            const data = JSON.parse(body);
            const result = gameManager.joinGame(gameId, data.playerName);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                playerId: result.playerId,
                players: result.players
            }));
        } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
    });
}

function handleGetPlayers(gameId, res) {
    try {
        const game = gameManager.getGameState(gameId);
        if (!game) throw new Error('Partie non trouvée');

        const playerList = game.players.map(id => gameManager.getPlayer(id));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(playerList));
    } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
    }
}

/**
 * GET /api/games/:code - Récupère l'état d'une partie
 */
function handleGetGame(code, res) {
    try {
        const game = games.get(code);
        if (!game) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, error: 'Partie non trouvée' }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, game }));
    } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
    }
}

/**
 * PUT /api/games/:code - Met à jour l'état d'une partie
 */
function handleUpdateGame(code, req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            const game = games.get(code);
            if (!game) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: false, error: 'Partie non trouvée' }));
            }

            const updates = JSON.parse(body);
            Object.assign(game, updates);
            games.set(code, game);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, game }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
        }
    });
}

// ================================================================
// WEBSOCKET
// ================================================================

function setupWebSocket(server) {
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws, req) => {
        const urlObj = new URL(req.url, 'http://localhost');
        const gameId = urlObj.searchParams.get('gameId');
        const playerId = urlObj.searchParams.get('playerId');

        if (!gameId || !playerId) {
            ws.close();
            return;
        }

        playerSessions.set(playerId, ws);
        console.log(`🔗 ${playerId} connecté au WebSocket`);

        const broadcastToGame = (message) => {
            const game = games.get(gameId);
            if (!game) return;

            game.players.forEach(pid => {
                const playerWs = playerSessions.get(pid);
                if (playerWs && playerWs.readyState === 1) {
                    playerWs.send(JSON.stringify(message));
                }
            });
        };

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                console.log(`📨 Message: ${message.type}`);

                switch (message.type) {
                    case 'GAME_START':
                        gameManager.startGame(gameId, message.roles);
                        broadcastToGame({
                            type: 'GAME_STARTED',
                            gameState: gameManager.getGameState(gameId)
                        });
                        break;

                    case 'NEXT_PHASE':
                        const phase = gameManager.nextPhase(gameId);
                        broadcastToGame({
                            type: 'PHASE_CHANGED',
                            phase,
                            gameState: gameManager.getGameState(gameId)
                        });
                        break;

                    case 'ELIMINATE_PLAYER':
                        gameManager.eliminatePlayer(gameId, message.playerId);
                        broadcastToGame({
                            type: 'PLAYER_ELIMINATED',
                            playerId: message.playerId,
                            gameState: gameManager.getGameState(gameId)
                        });
                        break;

                    case 'VOTE':
                        const voteCount = gameManager.submitVote(gameId, playerId, message.targetPlayerId);
                        broadcastToGame({
                            type: 'VOTE_SUBMITTED',
                            voterId: playerId,
                            voteCount
                        });
                        break;

                    default:
                        console.log('Message inconnu:', message.type);
                }
            } catch (err) {
                console.error('Erreur WebSocket:', err);
            }
        });

        ws.on('close', () => {
            playerSessions.delete(playerId);
            console.log(`🔌 ${playerId} déconnecté`);
        });

        // Envoyer l'état actuel
        const game = games.get(gameId);
        if (game) {
            ws.send(JSON.stringify({
                type: 'GAME_STATE',
                gameState: game
            }));
        }
    });
}

// ================================================================
// DÉMARRAGE
// ================================================================

function start() {
    // Serveur HTTPS
    const httpsOptions = {
        cert: fs.readFileSync(certs.cert),
        key: fs.readFileSync(certs.key)
    };

    const httpsServer = https.createServer(httpsOptions, handleRequest);
    setupWebSocket(httpsServer);

    httpsServer.listen(HTTPS_PORT, () => {
        console.log(`\n✅ Serveur HTTPS sur https://localhost:${HTTPS_PORT}`);
    });

    // Redirection HTTP
    http.createServer((req, res) => {
        res.writeHead(301, { 'Location': `https://localhost:${HTTPS_PORT}${req.url}` });
        res.end();
    }).listen(HTTP_PORT, () => {
        console.log(`📌 Redirection HTTP sur http://localhost:${HTTP_PORT}\n`);
    });
}

start();
