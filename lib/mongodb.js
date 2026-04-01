/**
 * Connexion MongoDB Atlas pour le jeu Loup-Garou
 * Gère la persistance des parties
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error('MONGODB_URI est manquante dans les variables d\'environnement');
}

// Connexion unique (réutilisée par les appels)
let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
    // Retourner la connexion en cache si elle existe
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    try {
        const client = new MongoClient(MONGODB_URI, {
            maxPoolSize: 10,
        });

        await client.connect();
        const db = client.db('loup-garou');

        // Créer les indexes
        const gamesCollection = db.collection('games');
        await gamesCollection.createIndex({ code: 1 }, { unique: true });
        await gamesCollection.createIndex({ createdAt: 1 });

        // Nettoyer les parties > 24h (optionnel)
        await gamesCollection.deleteMany({
            createdAt: { $lt: Date.now() - 24 * 60 * 60 * 1000 }
        });

        // Mettre en cache
        cachedClient = client;
        cachedDb = db;

        console.log('✅ Connecté à MongoDB Atlas');
        return { client, db };
    } catch (error) {
        console.error('❌ Erreur connexion MongoDB:', error);
        throw error;
    }
}

/**
 * Récupère une partie par code
 */
export async function getGame(code) {
    try {
        const { db } = await connectToDatabase();
        const game = await db.collection('games').findOne({ code });
        return game;
    } catch (error) {
        console.error('Erreur getGame:', error);
        return null;
    }
}

/**
 * Crée une nouvelle partie
 */
export async function createGame(gameData) {
    try {
        const { db } = await connectToDatabase();
        const result = await db.collection('games').insertOne({
            ...gameData,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        return result;
    } catch (error) {
        console.error('Erreur createGame:', error);
        throw error;
    }
}

/**
 * Met à jour une partie
 */
export async function updateGame(code, updateData) {
    try {
        const { db } = await connectToDatabase();
        const result = await db.collection('games').updateOne(
            { code },
            {
                $set: {
                    ...updateData,
                    updatedAt: Date.now(),
                }
            }
        );
        return result;
    } catch (error) {
        console.error('Erreur updateGame:', error);
        throw error;
    }
}

/**
 * Supprime une partie
 */
export async function deleteGame(code) {
    try {
        const { db } = await connectToDatabase();
        const result = await db.collection('games').deleteOne({ code });
        return result;
    } catch (error) {
        console.error('Erreur deleteGame:', error);
        throw error;
    }
}

export default {
    connectToDatabase,
    getGame,
    createGame,
    updateGame,
    deleteGame,
};
