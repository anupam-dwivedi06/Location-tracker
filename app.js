import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

// Setup __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize app and server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Routes
// Home page to create/join rooms
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "home.html"));
});

// Dynamic room page
app.get("/track/:roomID", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "index.html"));
});

// Socket.IO for real-time location sharing per room
io.on("connection", (socket) => {
    console.log("New socket connected:", socket.id);

    socket.on("join-room", (roomID) => {
        socket.join(roomID);
        console.log(`Socket ${socket.id} joined room ${roomID}`);
    });

    socket.on("send-location", ({ roomID, username, latitude, longitude }) => {
        io.to(roomID).emit("receive-location", {
            id: socket.id,
            username,
            latitude,
            longitude,
        });
    });

    socket.on("disconnecting", () => {
        for (const roomID of socket.rooms) {
            if (roomID !== socket.id) {
                io.to(roomID).emit("user-disconnected", socket.id);
            }
        }
    });

    socket.on("disconnect", () => {
        console.log("Socket disconnected:", socket.id);
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
