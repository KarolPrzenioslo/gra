const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// serwowanie frontendu
app.use(express.static(path.join(__dirname)));

// Socket.IO
io.on("connection", (socket) => {
    console.log("Nowy gracz:", socket.id);
    socket.on("join", (nick) => {
        console.log(nick, "dołączył");
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server działa na porcie ${PORT}`));
