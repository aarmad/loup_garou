#!/usr/bin/env node
/**
 * SERVEUR HTTPS LOCAL POUR DÉVELOPPEMENT
 * Permet de tester les fonctionnalités (incluant Bluetooth)
 * 
 * Utilisation:
 *   node server.js
 * 
 * Puis accédez à: https://localhost:8000
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Définir __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8000;
const HOSTNAME = process.env.HOSTNAME || 'localhost';
const HTTP_PORT = process.env.HTTP_PORT || 3000;

/**
 * Créer certificate self-signed si absent
 */
function ensureCertificate() {
    const certDir = path.join(__dirname, 'cert');
    const keyPath = path.join(certDir, 'key.pem');
    const certPath = path.join(certDir, 'cert.pem');

    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        return true;
    }

    console.log('⚠️  Certificat manquant. Génération...');

    try {
        if (!fs.existsSync(certDir)) {
            fs.mkdirSync(certDir, { recursive: true });
        }

        execSync(
            `openssl req -x509 -newkey rsa:2048 -nodes -out ${certPath} -keyout ${keyPath} -days 365 -subj "/C=FR/ST=Ile-de-France/L=Paris/O=Loup-Garou/CN=localhost"`,
            { stdio: 'inherit' }
        );

        console.log('✅ Certificat créé avec succès!');
        return true;
    } catch (err) {
        console.error('❌ Erreur génération certificat:');
        console.error('   Installez OpenSSL: https://slproweb.com/products/Win32OpenSSL.html (Windows)');
        console.error('   ou: brew install openssl (macOS)');
        console.error('   ou: apt-get install openssl (Linux)');
        return false;
    }
}

/**
 * Obtenir le type MIME
 */
function getMimeType(filePath) {
    const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'font/otf',
        '.mp3': 'audio/mpeg',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.txt': 'text/plain; charset=utf-8'
    };

    const ext = path.extname(filePath).toLowerCase();
    return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Servir un fichier
 */
function serveFile(filePath, res) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Erreur serveur: ' + err.message);
            return;
        }

        const mimeType = getMimeType(filePath);
        res.writeHead(200, {
            'Content-Type': mimeType,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(data);
    });
}

/**
 * Handler de requête
 */
function requestHandler(req, res) {
    // Désactiver CORS pour le développement local
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Service Worker et données
    res.setHeader('Service-Worker-Allowed', '/');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    let urlPath = url.parse(req.url).pathname;
    if (urlPath === '/') {
        urlPath = '/index.html';
    }

    const filePath = path.join(__dirname, urlPath);

    // Prévention directory traversal
    const realPath = fs.realpathSync(__dirname);
    if (!fs.realpathSync(filePath).startsWith(realPath)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Accès refusé');
        return;
    }

    // Vérifier si le fichier existe
    fs.stat(filePath, (err, stats) => {
        if (err) {
            // Fichier non trouvé
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
                <!DOCTYPE html>
                <html lang="fr">
                <head>
                    <meta charset="UTF-8">
                    <title>404 - Non trouvé</title>
                    <style>
                        body { font-family: sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                        h1 { color: #d32f2f; }
                        a { color: #1976d2; text-decoration: none; }
                    </style>
                </head>
                <body>
                    <h1>404 - Page non trouvée</h1>
                    <p>Le fichier "${urlPath}" n'existe pas</p>
                    <a href="/">Retour à l'accueil</a>
                </body>
                </html>
            `);
            return;
        }

        if (stats.isDirectory()) {
            // Dossier: chercher index.html
            const indexPath = path.join(filePath, 'index.html');
            fs.stat(indexPath, (err) => {
                if (err) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Dossier non accessible');
                } else {
                    serveFile(indexPath, res);
                }
            });
        } else {
            // Fichier
            serveFile(filePath, res);
        }
    });
}

/**
 * Démarrer le serveur
 */
async function start() {
    console.log('🐺 Loup-Garou - Serveur Développement\n');

    if (!ensureCertificate()) {
        process.exit(1);
    }

    // Options HTTPS avec certificat self-signed
    const httpsOptions = {
        key: fs.readFileSync(path.join(__dirname, 'cert', 'key.pem'), 'utf8'),
        cert: fs.readFileSync(path.join(__dirname, 'cert', 'cert.pem'), 'utf8')
    };

    // Créer serveur HTTPS
    const httpsServer = https.createServer(httpsOptions, requestHandler);

    httpsServer.listen(PORT, HOSTNAME, () => {
        console.log(`✅ Serveur HTTPS démarré`);
        console.log(`   URL: https://${HOSTNAME}:${PORT}`);
        console.log(`   Certificat: ./cert/`);
        console.log('');
        console.log('💡 Notes:');
        console.log('   - Le certificat est auto-signé (avertissement normal)');
        console.log('   - Bluetooth fonctionne sur HTTPS seulement');
        console.log('   - Mode simulation activé si Bluetooth indisponible');
        console.log('   - Appuyez sur Ctrl+C pour arrêter\n');
    });

    // Redirection HTTP → HTTPS (port optionnel)
    http.createServer((req, res) => {
        res.writeHead(301, { 'Location': `https://${HOSTNAME}:${PORT}${req.url}` });
        res.end();
    }).listen(HTTP_PORT, HOSTNAME, () => {
        console.log(`📌 Redirection HTTP disponible à http://${HOSTNAME}:${HTTP_PORT} → HTTPS`);
    });

    httpsServer.on('error', (err) => {
        console.error('❌ Erreur serveur:', err.message);
        process.exit(1);
    });
}

// Lancer le serveur
start();
