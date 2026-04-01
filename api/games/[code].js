import { getGame, updateGame } from '../../lib/mongodb.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Parser le code depuis req.query
  const { code } = req.query;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ success: false, error: 'Code de partie invalide' });
  }

  // Parser le body JSON si nécessaire (fallback robuste pour Vercel)
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
    if (req.method === 'GET') {
      const game = await getGame(code);
      if (!game) {
        return res.status(404).json({ success: false, error: 'Partie non trouvée' });
      }
      return res.status(200).json({ success: true, game });
    }

    if (req.method === 'PUT') {
      const existingGame = await getGame(code);
      if (!existingGame) {
        return res.status(404).json({ success: false, error: 'Partie non trouvée' });
      }

      // Nettoyer les champs immuables comme _id
      const updates = { ...(body || {}) };
      if (updates._id) {
        delete updates._id;
      }

      await updateGame(code, updates);
      const updatedGame = await getGame(code);
      return res.status(200).json({ success: true, game: updatedGame });
    }

    return res.status(405).json({ success: false, error: 'Méthode non autorisée' });
  } catch (error) {
    console.error('API /api/games/[code] error:', error);
    return res.status(500).json({ success: false, error: 'Erreur serveur', message: error.message });
  }
}
