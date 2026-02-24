const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connect');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// On garde en mémoire les stats par utilisateur pour éviter de tout perdre au refresh
let userStats = {};

io.on('connection', (socket) => {
    // On récupère le pseudo envoyé depuis l'URL (ex: ?user=v0lary)
    let tiktokUsername = socket.handshake.query.user;

    if (!tiktokUsername) {
        console.log("Connexion sans pseudo ignorée.");
        return;
    }

    console.log(`Tentative de connexion au Live de : ${tiktokUsername}`);

    // Initialisation des stats pour ce streamer s'il n'existe pas
    if (!userStats[tiktokUsername]) {
        userStats[tiktokUsername] = { level: 1, currentXP: 0, xpToNextLevel: 100 };
    }

    let tiktokConnection = new WebcastPushConnection(tiktokUsername);

    tiktokConnection.connect().then(state => {
        console.log(`Connecté au live de ${tiktokUsername}`);
    }).catch(err => {
        console.error("Erreur connexion TikTok", err);
    });

    // Gestion des cadeaux
    tiktokConnection.on('gift', (data) => {
        let points = data.diamondCount * 10;
        let stats = userStats[tiktokUsername];
        
        stats.currentXP += points;

        while (stats.currentXP >= stats.xpToNextLevel) {
            stats.currentXP -= stats.xpToNextLevel;
            stats.level++;
            stats.xpToNextLevel = Math.floor(stats.xpToNextLevel * 1.2);
        }

        // On envoie la mise à jour UNIQUEMENT à celui qui regarde ce pseudo
        socket.emit('MISE_A_JOUR_STATS', stats);
    });

    // Envoi des stats actuelles dès la connexion
    socket.emit('MISE_A_JOUR_STATS', userStats[tiktokUsername]);

    socket.on('disconnect', () => {
        tiktokConnection.disconnect();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur prêt sur le port ${PORT}`);
});
