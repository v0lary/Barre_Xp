const { WebcastPushConnection } = require('tiktok-live-connector');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let tiktokUsername = "kelrasof"; 

let playerStats = {
    level: 1,
    currentXP: 0,
    xpToNextLevel: 100 
};

// Liste pour limiter le gain XP des follows (1 fois par personne)
let usersWhoFollowed = new Set(); 

app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });

let tiktokLiveConnection = new WebcastPushConnection(tiktokUsername);
tiktokLiveConnection.connect().then(state => { console.log(`✅ Connecté !`); }).catch(err => console.error(err));

// --- FONCTION DE CALCUL D'XP ---
function ajouterXP(points) {
    playerStats.currentXP += points;

    // TANT QUE l'XP est supérieure à l'objectif, on monte de niveau
    // Cela permet de passer plusieurs niveaux d'un coup avec un énorme cadeau
    while (playerStats.currentXP >= playerStats.xpToNextLevel) {
        playerStats.currentXP -= playerStats.xpToNextLevel; // ON GARDE LE SURPLUS ICI
        playerStats.level++;
        playerStats.xpToNextLevel = Math.floor(playerStats.xpToNextLevel * 1.5);
        console.log(`✨ LEVEL UP ! Niveau ${playerStats.level}`);
    }

    io.emit('MISE_A_JOUR_STATS', playerStats);
}

// CADEAUX : 1 pièce = 1 XP
tiktokLiveConnection.on('gift', (data) => {
    console.log(`🎁 ${data.giftName} : +${data.diamondCount} XP`);
    ajouterXP(data.diamondCount);
});

// FOLLOWS : +20 XP (Limité à 1 fois par live)
tiktokLiveConnection.on('follow', (data) => {
    let pseudo = data.uniqueId;
    if (!usersWhoFollowed.has(pseudo)) {
        usersWhoFollowed.add(pseudo);
        console.log(`👤 ${pseudo} follow : +20 XP`);
        ajouterXP(20);
    }
});

// ABONNEMENTS PAYANTS : +50 XP
tiktokLiveConnection.on('subscribe', (data) => {
    console.log(`⭐ ${data.uniqueId} s'est abonné : +50 XP`);
    ajouterXP(50);
});

server.listen(3000);