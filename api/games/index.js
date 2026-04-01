/**
 * API Vercel Function pour le jeu Loup-Garou
 * Synchronisation avec MongoDB Atlas
 */

import { getGame, createGame, updateGame } from '../../lib/mongodb.js';

/**
 * Génère un code unique de 4 chiffres
 */
function generateGameCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * GET /api/games/:code - Récupère l'état d'une partie
 * POST /api/games - Crée une nouvelle partie
 * PUT /api/games/:code - Met à jour l'état d'une partie
 */
export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Parse le code depuis l'URL (ex: /api/games/1234)
    const urlParts = req.url.split('/').filter(Boolean);
    const code = urlParts[2] || req.query.code;

    // Parser le body JSON si nécessaire (fallback robuste)
    let body = req.body;
    if ((!body || Object.keys(body).length === 0) && (req.method === 'POST' || req.method === 'PUT')) {
        try {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            const raw = Buffer.concat(chunks).toString('utf8');
            body = raw ? JSON.parse(raw) : {};
        } catch (err) {
            body = {};
        }
    }

    try {
        if (req.method === 'POST') {
            // Créer une nouvelle partie
            const newCode = generateGameCode();
            const playerList = Array.isArray(body?.players) && body.players.length > 0
                ? body.players
                : [{ playerId: body?.playerId || `presenter-${Date.now()}`, name: body?.host || 'Présentateur', isAlive: true, role: null, isPresenter: true }];

            const game = {
                code: newCode,
                host: body?.host || 'Présentateur',
                players: playerList,
                state: 'lobby',
                roles: body?.roles || [],
                currentPhase: 'day',
                nightActions: [],
                votes: {},
                eliminated: [],
                messages: [],
                settings: req.body?.settings || {}
            };
            
            // Créer dans MongoDB
            await createGame(game);
            
            return res.status(201).json({
                success: true,
                code: newCode,
                game: game
            });
        }

        if (req.method === 'GET' && code) {
            // Récupérer l'état d'une partie depuis MongoDB
            const game = await getGame(code);
            
            if (!game) {
                return res.status(404).json({
                    success: false,
                    error: 'Partie non trouvée'
                });
            }

            return res.status(200).json({
                success: true,
                game: game
            });
        }

        if (req.method === 'PUT' && code) {
            // Mettre à jour l'état d'une partie
            const game = await getGame(code);
            
            if (!game) {
                return res.status(404).json({
                    success: false,
                    error: 'Partie non trouvée'
                });
            }

            // Nettoyer les champs immuables comme _id
            const updates = { ...(body || {}) };
            if (updates._id) {
                delete updates._id;
            }

            // Mettre à jour dans MongoDB
            await updateGame(code, updates);
            
            // Récupérer la version mise à jour
            const updatedGame = await getGame(code);

            return res.status(200).json({
                success: true,
                game: updatedGame
            });
        }

        return res.status(405).json({
            success: false,
            error: 'Méthode non autorisée'
        });

    } catch (error) {
        console.error('❌ Erreur API:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur serveur',
            message: error.message
        });
    }
}
