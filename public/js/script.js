const socket = io("https://location-tracker-p0d2.onrender.com");

const username = prompt("Enter your name") || "Anonymous";
const urlParams = new URLSearchParams(window.location.search);
const roomID = urlParams.get("roomID");

socket.emit("join-room", roomID);

// Setup Leaflet map
const map = L.map("map").setView([0, 0], 10);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "Anupam dwivedi house",
}).addTo(map);

// Store user markers
const markers = {};
let hasCenteredMap = false;

// Handle existing users
socket.on("existing-users", (users) => {
  users.forEach(({ id, username, latitude, longitude }) => {
    markers[id] = L.marker([latitude, longitude])
      .addTo(map)
      .bindTooltip(username, {
        permanent: true,
        direction: "top",
        offset: [0, -10],
        className: "username-label",
      })
      .openTooltip();
  });
});

// Handle new location data
socket.on("receive-location", ({ id, username, latitude, longitude }) => {
  if (!hasCenteredMap && id === socket.id) {
    map.setView([latitude, longitude], 15);
    hasCenteredMap = true;
  }

  if (markers[id]) {
    markers[id].setLatLng([latitude, longitude]);
  } else {
    markers[id] = L.marker([latitude, longitude])
      .addTo(map)
      .bindTooltip(username, {
        permanent: true,
        direction: "top",
        offset: [0, -10],
        className: "username-label",
      })
      .openTooltip();
  }
});

// Handle disconnection
socket.on("user-disconnected", (id) => {
  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
  }
});

// Track current user's location
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
