import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

// Setup __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize express app
const app = express();
const server = http.createServer(app);

// Enable CORS for cross-origin communication
app.use(cors());

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, "public")));

// Initialize Socket.IO server with CORS config
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Route: Homepage to create a room
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Route: Tracking page (room ID in query string)
app.get("/track.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "track.html"));
});

// Store user locations by room
const roomUsers = {};

io.on("connection", (socket) => {
  console.log("New socket connected:", socket.id);

  // Join room
  socket.on("join-room", (roomID) => {
    socket.join(roomID);
    console.log(`Socket ${socket.id} joined room ${roomID}`);

    if (!roomUsers[roomID]) {
      roomUsers[roomID] = {};
    }

    // Send current users to the new user
    const existingUsers = Object.entries(roomUsers[roomID]).map(([id, user]) => ({
      id,
      username: user.username,
      latitude: user.latitude,
      longitude: user.longitude,
    }));
    socket.emit("existing-users", existingUsers);
  });

  // Receive and broadcast location
  socket.on("send-location", ({ roomID, username, latitude, longitude }) => {
    // Save user data
    if (!roomUsers[roomID]) {
      roomUsers[roomID] = {};
    }

    roomUsers[roomID][socket.id] = { username, latitude, longitude };

    io.to(roomID).emit("receive-location", {
      id: socket.id,
      username,
      latitude,
      longitude,
    });
  });

  // Remove marker on disconnect
  socket.on("disconnecting", () => {
    for (const roomID of socket.rooms) {
      if (roomID !== socket.id && roomUsers[roomID]) {
        delete roomUsers[roomID][socket.id];
        io.to(roomID).emit("user-disconnected", socket.id);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
