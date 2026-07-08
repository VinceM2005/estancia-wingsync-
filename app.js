// ===== API Configuration =====
// 🔴 REMEMBER: Change this to your LIVE backend URL before deploying!
//    Example: https://your-backend.onrender.com/api
const API_URL = "https://estancia-wingsync-backend.onrender.com/api";

// ===== Maps Variables =====
let playerMap, playerMarker, eventMap, eventMarker;
let selectedPlayerLat = null,
  selectedPlayerLng = null;
let selectedEventLat = null,
  selectedEventLng = null;

const defaultLat = 13.415;
const defaultLng = 123.635;

// ===== Main App =====
const app = {
  currentUser: null,
  eventLookup: {}, // Stores event details keyed by code for quick lookup

  init() {
    const sessionStr = sessionStorage.getItem("wingsync_user");
    if (sessionStr) {
      this.currentUser = JSON.parse(sessionStr);
      this.showApp();
    }
  },

  // ========== AUTH ==========
  login() {
    const id = document.getElementById("login-id").value;
    const pass = document.getElementById("login-pass").value;

    fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, password: pass }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          this.currentUser = data.user;
          sessionStorage.setItem("wingsync_user", JSON.stringify(data.user));
          document.getElementById("login-error").style.display = "none";
          this.showApp();
        } else {
          document.getElementById("login-error").style.display = "block";
        }
      })
      .catch((err) => alert("Login error: " + err.message));
  },

  logout() {
    this.currentUser = null;
    sessionStorage.removeItem("wingsync_user");
    document.getElementById("app-screen").classList.add("hidden");
    document.getElementById("login-screen").classList.remove("hidden");
  },

  showApp() {
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("app-screen").classList.remove("hidden");
    document.getElementById("header-user").innerText =
      `Hello, ${this.currentUser.name}`;

    const adminEls = document.querySelectorAll(".admin-only");
    const playerEls = document.querySelectorAll(".player-only");
    if (this.currentUser.role === "admin") {
      adminEls.forEach((el) => el.classList.remove("hidden"));
      playerEls.forEach((el) => el.classList.add("hidden"));
      document.getElementById("player-clock-in-area").classList.add("hidden");
    } else {
      adminEls.forEach((el) => el.classList.add("hidden"));
      playerEls.forEach((el) => el.classList.remove("hidden"));
      document
        .getElementById("player-clock-in-area")
        .classList.remove("hidden");
    }
    this.navigate("dashboard");
    this.loadProfile();
  },

  navigate(view) {
    document
      .querySelectorAll(".view-section")
      .forEach((el) => el.classList.add("hidden"));
    document
      .querySelectorAll(".sidebar-menu li")
      .forEach((el) => el.classList.remove("active"));
    document.getElementById(`view-${view}`).classList.remove("hidden");
    document.getElementById(`nav-${view}`).classList.add("active");
    document.getElementById("sidebar").classList.remove("open");

    if (view === "dashboard") this.renderDashboard();
    if (view === "admin-players") this.renderPlayers();
    if (view === "admin-events") this.renderEvents();
    if (view === "results") this.initResultsView();
    if (view === "logs") this.renderLogs();
  },

  toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("open");
  },

  // ========== DASHBOARD (hides Code column for players) ==========
  renderDashboard() {
    fetch(`${API_URL}/events/active`)
      .then((res) => res.json())
      .then((events) => {
        const table = document.querySelector("#active-events-table");
        const isAdmin = this.currentUser.role === "admin";

        let thead = "<thead><tr>";
        if (isAdmin) {
          thead += "<th>Codes</th>";
        }
        thead += "<th>Event Name</th><th>Release Time</th><th>Status</th>";
        thead += "</tr></thead>";

        let tbody = "<tbody>";
        events.forEach((e) => {
          tbody += "<tr>";
          if (isAdmin) {
            const codesDisplay =
              e.codes && e.codes.length ? e.codes.join(", ") : e.code;
            tbody += `<td data-label="Codes">${codesDisplay}</td>`;
          }
          tbody += `
            <td data-label="Name">${e.name}</td>
            <td data-label="Release">${new Date(e.releaseTime).toLocaleString()}</td>
            <td data-label="Status">${e.status}</td>
          </tr>`;
        });
        tbody += "</tbody>";

        table.innerHTML = thead + tbody;
      })
      .catch((err) => console.error("Dashboard error:", err));
  },

  // ========== CLOCK IN ==========
  clockIn() {
    const code = document.getElementById("clock-in-code").value.trim();
    if (!code) return alert("Please enter an event code.");

    fetch(`${API_URL}/clockin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: this.currentUser.id,
        eventCode: code,
        arrivalTime: new Date().toISOString(),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) return alert(data.error);
        alert(
          `Bird Clocked!\nAir Distance: ${data.distance.toFixed(2)} km\nSpeed: ${data.speed} m/min`,
        );
        document.getElementById("clock-in-code").value = "";
        this.renderDashboard();
      })
      .catch((err) => alert("Clock‑in error: " + err.message));
  },

  // ========== PROFILE ==========
  loadProfile() {
    document.getElementById("prof-name").innerText = this.currentUser.name;
    document.getElementById("prof-id").innerText = this.currentUser.id;
    document.getElementById("prof-contact").value =
      this.currentUser.contact || "";
    if (this.currentUser.role === "player") {
      document.getElementById("prof-lat").value = this.currentUser.lat;
      document.getElementById("prof-lng").value = this.currentUser.lng;
    }
  },

  changePassword() {
    const newPass = document.getElementById("new-password").value;
    if (newPass.length < 5) return alert("Password too short!");
    fetch(`${API_URL}/users/update-password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: this.currentUser.id,
        newPassword: newPass,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert("Password updated.");
          this.currentUser.password = newPass;
          sessionStorage.setItem(
            "wingsync_user",
            JSON.stringify(this.currentUser),
          );
          document.getElementById("new-password").value = "";
        } else {
          alert("Failed to update password.");
        }
      })
      .catch((err) => alert("Error: " + err.message));
  },

  // ========== RESULTS (now shows release time) ==========
  initResultsView() {
    fetch(`${API_URL}/events/all`)
      .then((res) => res.json())
      .then((events) => {
        // Build lookup and populate dropdown
        this.eventLookup = {};
        const select = document.getElementById("result-event-filter");
        select.innerHTML = '<option value="">Select Event...</option>';
        events.forEach((e) => {
          this.eventLookup[e.code] = e;
          select.innerHTML += `<option value="${e.code}">${e.name}</option>`;
        });
        // Clear any previous release info
        document.getElementById("event-release-info").innerHTML = "";
        // If an event was previously selected, re-render
        if (select.value) {
          this.renderResults();
        }
      })
      .catch((err) => console.error("Results init error:", err));
  },

  renderResults() {
    const eventCode = document.getElementById("result-event-filter").value;
    const releaseInfoDiv = document.getElementById("event-release-info");

    if (!eventCode) {
      document.querySelector("#results-table tbody").innerHTML = "";
      releaseInfoDiv.innerHTML = "";
      return;
    }

    // Show release time for the selected event
    const event = this.eventLookup[eventCode];
    if (event) {
      const releaseTimeFormatted = new Date(event.releaseTime).toLocaleString();
      releaseInfoDiv.innerHTML = `📅 Release Time: <strong>${releaseTimeFormatted}</strong>`;
    } else {
      releaseInfoDiv.innerHTML = "";
    }

    fetch(`${API_URL}/results/${eventCode}`)
      .then((res) => res.json())
      .then((results) => {
        const tbody = document.querySelector("#results-table tbody");
        tbody.innerHTML = results
          .map(
            (r, i) => `
          <tr>
            <td data-label="Rank">${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</td>
            <td data-label="Player">${r.userName}</td>
            <td data-label="Air Dist">${r.distanceKm} km</td>
            <td data-label="Arr">${new Date(r.arrivalTime).toLocaleTimeString()}</td>
            <td data-label="Flight Hrs">${r.flightTimeHours} hrs</td>
            <td data-label="Speed m/min" style="color:var(--primary);"><b>${r.speedMPM || (r.speedKPH * 16.6667).toFixed(2)}</b></td>
          </tr>
        `,
          )
          .join("");
      })
      .catch((err) => console.error("Results error:", err));
  },

  // ========== LOGS ==========
  renderLogs() {
    fetch(`${API_URL}/logs`)
      .then((res) => res.json())
      .then((logs) => {
        document.getElementById("log-list").innerHTML = logs
          .map(
            (log) => `
          <li style="padding: 10px; border-bottom: 1px solid #eee;">
            <small>[${log.time}]</small><br>${log.message}
          </li>
        `,
          )
          .join("");
      })
      .catch((err) => console.error("Logs error:", err));
  },

  // ========== ADMIN: PLAYERS ==========
  renderPlayers() {
    fetch(`${API_URL}/users/players`)
      .then((res) => res.json())
      .then((users) => {
        document.querySelector("#players-table tbody").innerHTML = users
          .map(
            (u) => `
          <tr>
            <td data-label="ID">${u.id}</td>
            <td data-label="Name">${u.name}</td>
            <td data-label="Lat/Lng">${u.lat.toFixed(4)}, ${u.lng.toFixed(4)}</td>
            <td data-label="Contact">${u.contact}</td>
            <td data-label="Actions">
              <button class="btn btn-primary btn-sm" onclick="app.openEditPlayerModal('${u.id}')">✏️ Edit</button>
              <button class="btn btn-danger btn-sm" onclick="app.deletePlayer('${u.id}')">🗑️ Delete</button>
            </td>
          </tr>
        `,
          )
          .join("");
      })
      .catch((err) => console.error("Players error:", err));
  },

  savePlayer() {
    const name = document.getElementById("modal-p-name").value;
    const contact = document.getElementById("modal-p-contact").value;
    if (!name || !selectedPlayerLat)
      return alert("Name and Map Pin are required.");

    fetch(`${API_URL}/users/player`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        contact,
        lat: selectedPlayerLat,
        lng: selectedPlayerLng,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert(`Player Saved: ${data.user.id}`);
          this.closeModal("modal-player");
          this.renderPlayers();
          selectedPlayerLat = selectedPlayerLng = null;
          if (playerMarker) {
            playerMap.removeLayer(playerMarker);
            playerMarker = null;
          }
          document.getElementById("player-coords-text").innerText =
            "None selected";
        } else {
          alert("Failed to save player.");
        }
      })
      .catch((err) => alert("Error: " + err.message));
  },

  // ========== ADMIN: EDIT PLAYER ==========
  openEditPlayerModal(playerId) {
    fetch(`${API_URL}/users/player/${playerId}`)
      .then((res) => res.json())
      .then((user) => {
        if (user.error) return alert("Player not found");
        document.getElementById("edit-player-id").value = user.id;
        document.getElementById("edit-p-name").value = user.name;
        document.getElementById("edit-p-contact").value = user.contact || "";
        document.getElementById("modal-edit-player").classList.add("show");
      })
      .catch((err) => alert("Error fetching player: " + err.message));
  },

  saveEditPlayer() {
    const id = document.getElementById("edit-player-id").value;
    const name = document.getElementById("edit-p-name").value.trim();
    const contact = document.getElementById("edit-p-contact").value.trim();
    if (!name) return alert("Name is required");

    fetch(`${API_URL}/users/player/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, contact }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert("Player updated successfully!");
          this.closeModal("modal-edit-player");
          this.renderPlayers();
        } else {
          alert("Failed to update player.");
        }
      })
      .catch((err) => alert("Error: " + err.message));
  },

  deletePlayer(playerId) {
    if (!confirm("Are you sure you want to delete this player?")) return;
    fetch(`${API_URL}/users/player/${playerId}`, {
      method: "DELETE",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert("Player deleted.");
          this.renderPlayers();
        } else {
          alert("Failed to delete player.");
        }
      })
      .catch((err) => alert("Error: " + err.message));
  },

  // ========== ADMIN: EVENTS ==========
  renderEvents() {
    fetch(`${API_URL}/events/all`)
      .then((res) => res.json())
      .then((events) => {
        document.querySelector("#admin-events-table tbody").innerHTML = events
          .map(
            (e) => `
          <tr>
            <td data-label="Codes">${e.codes && e.codes.length ? e.codes.join(", ") : e.code}</td>
            <td data-label="Name">${e.name}</td>
            <td data-label="Point">${e.lat.toFixed(4)}, ${e.lng.toFixed(4)}</td>
            <td data-label="Actions">
              <button class="btn btn-danger btn-sm" onclick="app.toggleEvent('${e.code}')">
                ${e.status === "Active" ? "Close" : "Re-open"}
              </button>
              <button class="btn btn-danger btn-sm" onclick="app.deleteEvent('${e.code}')">🗑️ Delete</button>
            </td>
          </tr>
        `,
          )
          .join("");
      })
      .catch((err) => console.error("Events error:", err));
  },

  toggleEvent(code) {
    fetch(`${API_URL}/events/${code}/toggle`, {
      method: "PUT",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          this.renderEvents();
          this.renderDashboard();
        } else {
          alert("Failed to toggle event.");
        }
      })
      .catch((err) => alert("Error: " + err.message));
  },

  deleteEvent(eventCode) {
    if (
      !confirm(
        "Are you sure you want to delete this event? All results will also be removed.",
      )
    )
      return;
    fetch(`${API_URL}/events/${eventCode}`, {
      method: "DELETE",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert("Event deleted.");
          this.renderEvents();
          this.renderDashboard();
        } else {
          alert("Failed to delete event.");
        }
      })
      .catch((err) => alert("Error: " + err.message));
  },

  // ===== CREATE / SAVE EVENT =====
  saveEvent() {
    const name = document.getElementById("modal-e-name").value.trim();
    const code1 = document.getElementById("modal-e-code-1").value.trim();
    const code2 = document.getElementById("modal-e-code-2").value.trim();
    const code3 = document.getElementById("modal-e-code-3").value.trim();
    const time = document.getElementById("modal-e-time").value;
    const codes = [code1, code2, code3]
      .map((c) => c.toUpperCase())
      .filter((c) => c);

    if (!name || codes.length === 0 || !time || !selectedEventLat)
      return alert(
        "Name, at least one event code, date/time, and map pin are required.",
      );

    const uniqueCodes = [...new Set(codes)];
    if (uniqueCodes.length !== codes.length)
      return alert("Please use unique codes for this event.");

    fetch(`${API_URL}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        codes: uniqueCodes,
        name,
        releaseTime: new Date(time).toISOString(),
        lat: selectedEventLat,
        lng: selectedEventLng,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert(
            `Event Created: ${data.event.codes?.join(", ") || data.event.code}`,
          );
          this.closeModal("modal-event");
          this.renderEvents();
          this.renderDashboard();
          selectedEventLat = selectedEventLng = null;
          if (eventMarker) {
            eventMap.removeLayer(eventMarker);
            eventMarker = null;
          }
          document.getElementById("event-coords-text").innerText =
            "None selected";
        } else {
          alert("Failed to create event: " + (data.error || "unknown error"));
        }
      })
      .catch((err) => alert("Error: " + err.message));
  },

  // ========== GENERATE EVENT CODE ==========
  generateEventCodes() {
    fetch(`${API_URL}/events/generate-code?count=3`)
      .then((res) => res.json())
      .then((data) => {
        const codes = data.codes || [];
        document.getElementById("modal-e-code-1").value = codes[0] || "";
        document.getElementById("modal-e-code-2").value = codes[1] || "";
        document.getElementById("modal-e-code-3").value = codes[2] || "";
      })
      .catch((err) => alert("Error generating codes: " + err.message));
  },

  // ========== MODALS & MAPS ==========
  openPlayerModal() {
    document.getElementById("modal-player").classList.add("show");
    setTimeout(() => {
      if (!playerMap) {
        playerMap = L.map("player-map").setView([defaultLat, defaultLng], 14);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap",
        }).addTo(playerMap);
        playerMap.on("click", function (e) {
          if (playerMarker) playerMap.removeLayer(playerMarker);
          playerMarker = L.marker(e.latlng).addTo(playerMap);
          selectedPlayerLat = e.latlng.lat;
          selectedPlayerLng = e.latlng.lng;
          document.getElementById("player-coords-text").innerText =
            `${selectedPlayerLat.toFixed(5)}, ${selectedPlayerLng.toFixed(5)}`;
        });
      } else {
        playerMap.invalidateSize();
      }
    }, 300);
  },

  openEventModal() {
    document.getElementById("modal-event").classList.add("show");
    setTimeout(() => {
      if (!eventMap) {
        eventMap = L.map("event-map").setView([defaultLat, defaultLng], 8);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap",
        }).addTo(eventMap);
        eventMap.on("click", function (e) {
          if (eventMarker) eventMap.removeLayer(eventMarker);
          eventMarker = L.marker(e.latlng).addTo(eventMap);
          selectedEventLat = e.latlng.lat;
          selectedEventLng = e.latlng.lng;
          document.getElementById("event-coords-text").innerText =
            `${selectedEventLat.toFixed(5)}, ${selectedEventLng.toFixed(5)}`;
        });
      } else {
        eventMap.invalidateSize();
      }
      this.generateEventCodes();
    }, 300);
  },

  closeModal(id) {
    document.getElementById(id).classList.remove("show");
  },

  togglePasswordVisibility(inputId, toggleElement) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    toggleElement.innerText = isPassword ? "🙈" : "👁️";
  },

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },
};

window.onload = () => app.init();
