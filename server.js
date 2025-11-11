const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
app.use(express.static(path.join(__dirname)));


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.get("/", (req, res) => res.send("Serwer działa ✅"));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server działa na porcie ${PORT}`));
