const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// serwowanie frontendu
app.use(express.static(path.join(__dirname)));

// stan gry w pamięci
let players = {};

io.on("connection", (socket) => {
    console.log("Nowy gracz:", socket.id);

    socket.on("join", (nickname) => {
        players[socket.id] = { nickname };
        io.emit("players", Object.values(players));
    });

    socket.on("hint", ({ from, word }) => {
        io.emit("hint", { from, word });
    });

    socket.on("disconnect", () => {
        delete players[socket.id];
        io.emit("players", Object.values(players));
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server działa na porcie ${PORT}`));
