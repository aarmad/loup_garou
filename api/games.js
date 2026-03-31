/**
 * API Vercel Function pour le jeu Loup-Garou
 * Gestion des parties (création, synchronisation)
 */

// Stockage en mémoire pour les parties (en production, utiliser une DB)
const games = new Map();
const players = new Map();

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
export default function handler(req, res) {
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

    const { code } = req.query;

    try {
        if (req.method === 'POST') {
            // Créer une nouvelle partie
            const newCode = generateGameCode();
            const game = {
                code: newCode,
                createdAt: Date.now(),
                host: req.body.host || 'Présentateur',
                players: [req.body.host || 'Présentateur'],
                state: 'lobby',
                roles: req.body.roles || [],
                currentPhase: 'day',
                nightActions: [],
                votes: {},
                eliminated: [],
                messages: []
            };
            
            games.set(newCode, game);
            
            return res.status(201).json({
                success: true,
                code: newCode,
                game: game
            });
        }

        if (req.method === 'GET' && code) {
            // Récupérer l'état d'une partie
            const game = games.get(code);
            
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
            const game = games.get(code);
            
            if (!game) {
                return res.status(404).json({
                    success: false,
                    error: 'Partie non trouvée'
                });
            }

            // Fusionner les changements
            Object.assign(game, req.body);
            games.set(code, game);

            return res.status(200).json({
                success: true,
                game: game
            });
        }

        return res.status(405).json({
            success: false,
            error: 'Méthode non autorisée'
        });

    } catch (error) {
        console.error('Erreur API:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur serveur',
            message: error.message
        });
    }
}
