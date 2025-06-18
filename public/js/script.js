const socket = io();

// Prompt user for name
const username = prompt("Enter your name") || "Anonymous";

// Extract room ID from URL
const roomID = window.location.pathname.split("/").pop();

// Join the specified room on connection
socket.emit("join-room", roomID);

// Start tracking user location
if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            socket.emit("send-location", { roomID, username, latitude, longitude });
        },
        (error) => {
            console.error("Geolocation error:", error);
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
        }
    );
}

// Setup Leaflet map
const map = L.map("map").setView([0, 0], 10);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "Anupam dwivedi house",
}).addTo(map);

// Store markers for all users
const markers = {};

// Handle location updates from other users in the same room
socket.on("receive-location", ({ id, username, latitude, longitude }) => {
    map.setView([latitude, longitude]);

    if (markers[id]) {
        markers[id].setLatLng([latitude, longitude]);
    } else {
        markers[id] = L.marker([latitude, longitude])
            .addTo(map)
            .bindTooltip(username, {
                permanent: true,
                direction: "top",
                offset: [0, -10],
                className: "username-label"
            })
            .openTooltip();
    }
});

// Remove marker when user disconnects
socket.on("user-disconnected", (id) => {
    if (markers[id]) {
        map.removeLayer(markers[id]);
        delete markers[id];
    }
});
