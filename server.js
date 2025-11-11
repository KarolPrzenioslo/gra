const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname)));

const lobbies = {}; // { lobbyCode: { players: {}, impostorMode, password, turnOrder, round, started } }

function generateLobbyCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Socket.IO
io.on("connection", (socket) => {
    console.log("Nowy gracz:", socket.id);

    // Tworzenie lobby
    socket.on("createLobby", ({ nick, impostorMode }) => {
        const code = generateLobbyCode();
        lobbies[code] = {
            players: { [socket.id]: { nick, ready: false, isImpostor: false } },
            impostorMode,
            started: false,
            round: 0,
            turnOrder: [],
            chat: [],
            password: null,
            impostorId: null
        };
        socket.join(code);
        socket.emit("lobbyCreated", code);
        io.to(code).emit("playersUpdate", Object.values(lobbies[code].players));
    });

    // Dołączanie do lobby
    socket.on("joinLobby", ({ nick, code }) => {
        const lobby = lobbies[code];
        if (!lobby) return socket.emit("errorMsg", "Nie znaleziono lobby");
        lobby.players[socket.id] = { nick, ready: false, isImpostor: false };
        socket.join(code);
        io.to(code).emit("playersUpdate", Object.values(lobby.players));
    });

    // Ustawienie gotowości
    socket.on("setReady", ({ code, ready }) => {
        const lobby = lobbies[code];
        if (!lobby) return;
        if (lobby.players[socket.id]) lobby.players[socket.id].ready = ready;
        io.to(code).emit("playersUpdate", Object.values(lobby.players));
    });

    // Start gry
    socket.on("startGame", ({ code, password }) => {
        const lobby = lobbies[code];
        if (!lobby) return;
        const allReady = Object.values(lobby.players).every(p => p.ready);
        if (!allReady) return socket.emit("errorMsg", "Nie wszyscy gracze są gotowi");

        // losowanie impostora
        const ids = Object.keys(lobby.players);
        const impostorId = ids[Math.floor(Math.random() * ids.length)];
        lobby.impostorId = impostorId;
        ids.forEach(id => {
            lobby.players[id].isImpostor = (id === impostorId);
        });

        lobby.password = password;
        lobby.turnOrder = shuffle(ids);
        lobby.round = 1;
        lobby.started = true;
        io.to(code).emit("gameStarted", { password, impostorId, players: lobby.players });
    });

    // Podpowiedzi / ruch
    socket.on("sendHint", ({ code, hint }) => {
        const lobby = lobbies[code];
        if (!lobby) return;
        const player = lobby.players[socket.id];
        if (!player) return;
        const entry = { nick: player.nick, hint };
        lobby.chat.push(entry);
        io.to(code).emit("chatUpdate", lobby.chat);
    });

    // Zgadywanie hasła przez impostora
    socket.on("guessPassword", ({ code, guess }) => {
        const lobby = lobbies[code];
        if (!lobby) return;
        if (socket.id !== lobby.impostorId) return;
        if (guess.toLowerCase() === lobby.password.toLowerCase()) {
            io.to(code).emit("gameOver", { winner: "impostor", reason: "Zgadł hasło" });
            lobby.started = false;
        } else {
            io.to(code).emit("gameOver", { winner: "players", reason: "Impostor źle zgadł hasło" });
            lobby.started = false;
        }
    });

    // Wyrzucenie gracza (głosowanie)
    socket.on("voteKick", ({ code, votedId }) => {
        const lobby = lobbies[code];
        if (!lobby) return;
        if (votedId === lobby.impostorId) {
            io.to(code).emit("gameOver", { winner: "players", reason: "Wyrzucono impostora" });
        } else {
            io.to(code).emit("gameOver", { winner: "impostor", reason: "Wyrzucono niewinnego" });
        }
        lobby.started = false;
    });

    socket.on("disconnect", () => {
        // Usuń gracza ze wszystkich lobby
        for (const code in lobbies) {
            if (lobbies[code].players[socket.id]) {
                delete lobbies[code].players[socket.id];
                io.to(code).emit("playersUpdate", Object.values(lobbies[code].players));
            }
        }
    });
});

// Funkcja pomocnicza do losowania kolejności
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server działa na porcie ${PORT}`));
