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
  eventLookup: {},
  allEvents: [],
  allPlayers: [],
  allResults: {},
  selectedEventCode: null,

  init() {
    const sessionStr = sessionStorage.getItem("wingsync_user");
    if (sessionStr) {
      this.currentUser = JSON.parse(sessionStr);
      this.showApp();
    }
  },

  // ========== CUSTOM MODAL SYSTEM ==========
  showModal(options) {
    const existingModal = document.getElementById("custom-modal");
    if (existingModal) existingModal.remove();

    const {
      title = "Notification",
      message = "",
      icon = "ℹ️",
      iconColor = "#2a7a62",
      buttonText = "OK",
      onClose = null,
      showButton = true,
    } = options;

    const modal = document.createElement("div");
    modal.id = "custom-modal";
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 20px;
      animation: customFadeIn 0.3s ease;
    `;

    modal.innerHTML = `
      <div style="
        background: #ffffff;
        border-radius: 16px;
        padding: 32px 40px;
        max-width: 440px;
        width: 100%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        text-align: center;
        animation: customSlideUp 0.35s ease;
        position: relative;
        max-height: 90vh;
        overflow-y: auto;
      ">
        <button class="custom-modal-close" style="
          position: absolute;
          top: 12px;
          right: 16px;
          background: none;
          border: none;
          font-size: 28px;
          color: #999;
          cursor: pointer;
          transition: color 0.2s;
          line-height: 1;
          padding: 4px 8px;
          border-radius: 50%;
        " onmouseover="this.style.color='#333'" onmouseout="this.style.color='#999'">×</button>

        <div style="
          font-size: 48px;
          margin-bottom: 8px;
          animation: customPulse 0.8s ease 0.3s;
          color: ${iconColor};
        ">${icon}</div>

        <div style="
          font-size: 22px;
          font-weight: 700;
          color: #1a2a33;
          margin-bottom: 8px;
          letter-spacing: -0.3px;
        ">${title}</div>

        <div style="
          width: 50px;
          height: 3px;
          background: ${iconColor};
          margin: 6px auto 14px;
          border-radius: 4px;
        "></div>

        <div style="
          font-size: 15px;
          color: #5b6f82;
          line-height: 1.6;
          margin-bottom: ${showButton ? "20px" : "0"};
          white-space: pre-wrap;
          word-break: break-word;
        ">${message}</div>

        ${
          showButton
            ? `
          <button class="custom-modal-btn" style="
            padding: 10px 40px;
            background: ${iconColor};
            color: #fff;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s, transform 0.1s;
          " onmouseover="this.style.background='${iconColor}dd'" onmouseout="this.style.background='${iconColor}'" 
             onmousedown="this.style.transform='scale(0.97)'" onmouseup="this.style.transform='scale(1)'">
            ${buttonText}
          </button>
        `
            : ""
        }
      </div>
    `;

    const styleId = "custom-modal-styles";
    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes customFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes customSlideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes customPulse {
          0% { transform: scale(0.6); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @media (max-width: 480px) {
          #custom-modal > div {
            padding: 24px 20px !important;
          }
          #custom-modal .custom-modal-close {
            font-size: 24px !important;
            top: 8px !important;
            right: 12px !important;
          }
          #custom-modal .custom-modal-btn {
            padding: 10px 28px !important;
            font-size: 15px !important;
            width: 100%;
          }
        }
      `;
      document.head.appendChild(style);
    }
    document.body.appendChild(modal);

    modal.addEventListener("click", function (e) {
      if (e.target === this) {
        this.remove();
        if (onClose) onClose();
      }
    });

    const closeBtn = modal.querySelector(".custom-modal-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        modal.remove();
        if (onClose) onClose();
      });
    }

    const btn = modal.querySelector(".custom-modal-btn");
    if (btn) {
      btn.addEventListener("click", function () {
        modal.remove();
        if (onClose) onClose();
      });
    }

    return modal;
  },

  // ========== AUTH ==========
  login() {
    const id = document.getElementById("login-id").value;
    const pass = document.getElementById("login-pass").value;

    if (!id || !pass) {
      this.showModal({
        title: "Login Error",
        message: "Please enter both User ID and Password.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }

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
          this.showModal({
            title: "Login Failed",
            message: "Invalid User ID or Password. Please try again.",
            icon: "❌",
            iconColor: "#c0392b",
          });
        }
      })
      .catch(() => {
        this.showModal({
          title: "Connection Error",
          message:
            "Unable to connect to the server. Please check your internet connection.",
          icon: "⚠️",
          iconColor: "#e67e22",
        });
      });
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

  // ========== DASHBOARD ==========
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
    if (!code) {
      this.showModal({
        title: "Missing Code",
        message: "Please enter an event code.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }

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
        if (data.error) {
          this.showModal({
            title: "Clock In Failed",
            message: data.error,
            icon: "❌",
            iconColor: "#c0392b",
          });
          return;
        }

        const event = this.eventLookup[code] || { name: "Unknown Event" };
        const now = new Date();
        const formattedDate = now.toLocaleDateString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const formattedTime = now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });

        this.showModal({
          title: "Bird Clocked!",
          message: `${formattedDate}  ${formattedTime}\n${event.name} (ERPC)\nAir Distance: ${data.distance.toFixed(2)} KM\nSpeed: ${data.speed.toFixed(2)} m/min`,
          icon: "✅",
          iconColor: "#27ae60",
          buttonText: "OK",
        });

        document.getElementById("clock-in-code").value = "";
        this.renderDashboard();
      })
      .catch((err) => {
        this.showModal({
          title: "Connection Error",
          message: "Unable to connect to the server. Please try again.",
          icon: "⚠️",
          iconColor: "#e67e22",
        });
      });
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
    if (newPass.length < 5) {
      this.showModal({
        title: "Password Error",
        message: "Password must be at least 5 characters long.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }

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
          this.currentUser.password = newPass;
          sessionStorage.setItem(
            "wingsync_user",
            JSON.stringify(this.currentUser),
          );
          document.getElementById("new-password").value = "";
          this.showModal({
            title: "Password Updated",
            message: "Your password has been changed successfully.",
            icon: "✅",
            iconColor: "#27ae60",
          });
        } else {
          this.showModal({
            title: "Update Failed",
            message: "Failed to update password. Please try again.",
            icon: "❌",
            iconColor: "#c0392b",
          });
        }
      })
      .catch(() => {
        this.showModal({
          title: "Connection Error",
          message: "Unable to connect to the server.",
          icon: "⚠️",
          iconColor: "#e67e22",
        });
      });
  },

  // ========== RESULTS (with search filter - NO dropdown) ==========
  initResultsView() {
    fetch(`${API_URL}/events/all`)
      .then((res) => res.json())
      .then((events) => {
        this.allEvents = events;
        this.eventLookup = {};

        events.forEach((e) => {
          this.eventLookup[e.code] = e;
          if (e.codes && e.codes.length > 0) {
            e.codes.forEach((c) => {
              this.eventLookup[c] = e;
            });
          }
        });

        // Create search input if it doesn't exist
        let searchInput = document.getElementById("result-search-input");
        if (!searchInput) {
          const container = document.querySelector("#view-results .card");
          const header = container.querySelector(".dashboard-header");
          const searchDiv = document.createElement("div");
          searchDiv.style.cssText =
            "margin: 10px 0 15px; display: flex; gap: 10px; flex-wrap: wrap;";
          searchDiv.innerHTML = `
            <input id="result-search-input" type="text" class="form-control" style="flex:1; min-width:200px;" placeholder="🔍 Search events by name or code..." oninput="app.filterResults()">
            <button class="btn btn-secondary" onclick="document.getElementById('result-search-input').value=''; app.filterResults();">✕ Clear</button>
          `;
          container.insertBefore(searchDiv, header.nextSibling);
        }

        // Remove the dropdown if it exists
        const select = document.getElementById("result-event-filter");
        if (select) select.style.display = "none";

        document.getElementById("event-release-info").innerHTML = "";
        // Auto-select first event if available
        if (events.length > 0) {
          this.selectedEventCode = events[0].code;
          this.renderResults();
        } else {
          this.selectedEventCode = null;
          this.renderResults();
        }
      })
      .catch((err) => console.error("Results init error:", err));
  },

  filterResults() {
    const searchTerm = document
      .getElementById("result-search-input")
      .value.toLowerCase()
      .trim();

    const filteredEvents = this.allEvents.filter((e) => {
      const nameMatch = e.name.toLowerCase().includes(searchTerm);
      const codeMatch = e.code.toLowerCase().includes(searchTerm);
      const codesMatch =
        e.codes && e.codes.some((c) => c.toLowerCase().includes(searchTerm));
      return nameMatch || codeMatch || codesMatch;
    });

    // Auto-select first filtered event
    if (filteredEvents.length > 0) {
      this.selectedEventCode = filteredEvents[0].code;
    } else {
      this.selectedEventCode = null;
    }

    this.renderResults();
  },

  renderResults() {
    const releaseInfoDiv = document.getElementById("event-release-info");
    const tbody = document.querySelector("#results-table tbody");

    if (!this.selectedEventCode) {
      tbody.innerHTML = "";
      releaseInfoDiv.innerHTML =
        '<p style="text-align:center; color:#999; padding:20px;">No events found. Create an event to see results.</p>';
      return;
    }

    const event = this.eventLookup[this.selectedEventCode];
    if (event) {
      releaseInfoDiv.innerHTML = `
        <div style="text-align:center; margin-bottom: 10px;">
          <div style="font-size: 20px; font-weight: 700; color: #1a2a33;">${event.name}</div>
          <div style="font-size: 14px; color: #5b6f82; margin-top: 4px;">📅 Release Time: <strong>${new Date(event.releaseTime).toLocaleString()}</strong></div>
        </div>
      `;
    } else {
      releaseInfoDiv.innerHTML = "";
    }

    fetch(`${API_URL}/results/${this.selectedEventCode}`)
      .then((res) => res.json())
      .then((results) => {
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
        this.allPlayers = users;

        let searchInput = document.getElementById("players-search-input");
        if (!searchInput) {
          const container = document.querySelector("#view-admin-players .card");
          const header = container.querySelector(".dashboard-header");
          const searchDiv = document.createElement("div");
          searchDiv.style.cssText =
            "margin: 10px 0 15px; display: flex; gap: 10px; flex-wrap: wrap;";
          searchDiv.innerHTML = `
            <input id="players-search-input" type="text" class="form-control" style="flex:1; min-width:200px;" placeholder="🔍 Search players by name or ID..." oninput="app.filterPlayers()">
            <button class="btn btn-secondary" onclick="document.getElementById('players-search-input').value=''; app.filterPlayers();">✕ Clear</button>
          `;
          container.insertBefore(searchDiv, header.nextSibling);
        }

        this.filterPlayers();
      })
      .catch((err) => console.error("Players error:", err));
  },

  filterPlayers() {
    const searchTerm = document
      .getElementById("players-search-input")
      .value.toLowerCase()
      .trim();
    const filtered = this.allPlayers.filter((u) => {
      const nameMatch = u.name.toLowerCase().includes(searchTerm);
      const idMatch = u.id.toLowerCase().includes(searchTerm);
      const contactMatch = u.contact && u.contact.includes(searchTerm);
      return nameMatch || idMatch || contactMatch;
    });

    document.querySelector("#players-table tbody").innerHTML = filtered
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
  },

  savePlayer() {
    const name = document.getElementById("modal-p-name").value;
    const contact = document.getElementById("modal-p-contact").value;
    if (!name || !selectedPlayerLat) {
      this.showModal({
        title: "Incomplete",
        message: "Name and Map Pin are required.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }

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
          this.closeModal("modal-player");
          this.renderPlayers();
          selectedPlayerLat = selectedPlayerLng = null;
          if (playerMarker) {
            playerMap.removeLayer(playerMarker);
            playerMarker = null;
          }
          document.getElementById("player-coords-text").innerText =
            "None selected";
          this.showModal({
            title: "Player Saved",
            message: `Player Saved: ${data.user.id}`,
            icon: "✅",
            iconColor: "#27ae60",
          });
        } else {
          this.showModal({
            title: "Save Failed",
            message: "Failed to save player.",
            icon: "❌",
            iconColor: "#c0392b",
          });
        }
      })
      .catch(() => {
        this.showModal({
          title: "Connection Error",
          message: "Unable to connect to the server.",
          icon: "⚠️",
          iconColor: "#e67e22",
        });
      });
  },

  openEditPlayerModal(playerId) {
    fetch(`${API_URL}/users/player/${playerId}`)
      .then((res) => res.json())
      .then((user) => {
        if (user.error) {
          this.showModal({
            title: "Error",
            message: "Player not found.",
            icon: "❌",
            iconColor: "#c0392b",
          });
          return;
        }
        document.getElementById("edit-player-id").value = user.id;
        document.getElementById("edit-p-name").value = user.name;
        document.getElementById("edit-p-contact").value = user.contact || "";
        document.getElementById("modal-edit-player").classList.add("show");
      })
      .catch(() => {
        this.showModal({
          title: "Connection Error",
          message: "Unable to fetch player details.",
          icon: "⚠️",
          iconColor: "#e67e22",
        });
      });
  },

  saveEditPlayer() {
    const id = document.getElementById("edit-player-id").value;
    const name = document.getElementById("edit-p-name").value.trim();
    const contact = document.getElementById("edit-p-contact").value.trim();
    if (!name) {
      this.showModal({
        title: "Incomplete",
        message: "Name is required.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }

    fetch(`${API_URL}/users/player/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, contact }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          this.closeModal("modal-edit-player");
          this.renderPlayers();
          this.showModal({
            title: "Player Updated",
            message: "Player updated successfully!",
            icon: "✅",
            iconColor: "#27ae60",
          });
        } else {
          this.showModal({
            title: "Update Failed",
            message: "Failed to update player.",
            icon: "❌",
            iconColor: "#c0392b",
          });
        }
      })
      .catch(() => {
        this.showModal({
          title: "Connection Error",
          message: "Unable to connect to the server.",
          icon: "⚠️",
          iconColor: "#e67e22",
        });
      });
  },

  deletePlayer(playerId) {
    if (!confirm("Are you sure you want to delete this player?")) return;
    fetch(`${API_URL}/users/player/${playerId}`, {
      method: "DELETE",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          this.renderPlayers();
          this.showModal({
            title: "Player Deleted",
            message: "Player has been removed.",
            icon: "🗑️",
            iconColor: "#c0392b",
          });
        } else {
          this.showModal({
            title: "Delete Failed",
            message: "Failed to delete player.",
            icon: "❌",
            iconColor: "#c0392b",
          });
        }
      })
      .catch(() => {
        this.showModal({
          title: "Connection Error",
          message: "Unable to connect to the server.",
          icon: "⚠️",
          iconColor: "#e67e22",
        });
      });
  },

  // ========== ADMIN: EVENTS ==========
  renderEvents() {
    fetch(`${API_URL}/events/all`)
      .then((res) => res.json())
      .then((events) => {
        this.allEvents = events;

        let searchInput = document.getElementById("events-search-input");
        if (!searchInput) {
          const container = document.querySelector("#view-admin-events .card");
          const header = container.querySelector(".dashboard-header");
          const searchDiv = document.createElement("div");
          searchDiv.style.cssText =
            "margin: 10px 0 15px; display: flex; gap: 10px; flex-wrap: wrap;";
          searchDiv.innerHTML = `
            <input id="events-search-input" type="text" class="form-control" style="flex:1; min-width:200px;" placeholder="🔍 Search events by name or code..." oninput="app.filterEvents()">
            <button class="btn btn-secondary" onclick="document.getElementById('events-search-input').value=''; app.filterEvents();">✕ Clear</button>
          `;
          container.insertBefore(searchDiv, header.nextSibling);
        }

        this.filterEvents();
      })
      .catch((err) => console.error("Events error:", err));
  },

  filterEvents() {
    const searchTerm = document
      .getElementById("events-search-input")
      .value.toLowerCase()
      .trim();
    const filtered = this.allEvents.filter((e) => {
      const nameMatch = e.name.toLowerCase().includes(searchTerm);
      const codeMatch = e.code.toLowerCase().includes(searchTerm);
      const codesMatch =
        e.codes && e.codes.some((c) => c.toLowerCase().includes(searchTerm));
      return nameMatch || codeMatch || codesMatch;
    });

    document.querySelector("#admin-events-table tbody").innerHTML = filtered
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
          this.showModal({
            title: "Event Updated",
            message: `Event status changed to ${data.event.status}.`,
            icon: "🔄",
            iconColor: "#2a7a62",
          });
        } else {
          this.showModal({
            title: "Update Failed",
            message: "Failed to toggle event status.",
            icon: "❌",
            iconColor: "#c0392b",
          });
        }
      })
      .catch(() => {
        this.showModal({
          title: "Connection Error",
          message: "Unable to connect to the server.",
          icon: "⚠️",
          iconColor: "#e67e22",
        });
      });
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
          this.renderEvents();
          this.renderDashboard();
          this.showModal({
            title: "Event Deleted",
            message: "Event has been removed.",
            icon: "🗑️",
            iconColor: "#c0392b",
          });
        } else {
          this.showModal({
            title: "Delete Failed",
            message: "Failed to delete event.",
            icon: "❌",
            iconColor: "#c0392b",
          });
        }
      })
      .catch(() => {
        this.showModal({
          title: "Connection Error",
          message: "Unable to connect to the server.",
          icon: "⚠️",
          iconColor: "#e67e22",
        });
      });
  },

  saveEvent() {
    const name = document.getElementById("modal-e-name").value.trim();
    const code1 = document.getElementById("modal-e-code-1").value.trim();
    const code2 = document.getElementById("modal-e-code-2").value.trim();
    const code3 = document.getElementById("modal-e-code-3").value.trim();
    const time = document.getElementById("modal-e-time").value;
    const codes = [code1, code2, code3]
      .map((c) => c.toUpperCase())
      .filter((c) => c);

    if (!name || codes.length === 0 || !time || !selectedEventLat) {
      this.showModal({
        title: "Incomplete",
        message:
          "Name, at least one event code, date/time, and map pin are required.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }

    const uniqueCodes = [...new Set(codes)];
    if (uniqueCodes.length !== codes.length) {
      this.showModal({
        title: "Duplicate Codes",
        message: "Please use unique codes for this event.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }

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
          this.showModal({
            title: "Event Created",
            message: `Event Created: ${data.event.codes?.join(", ") || data.event.code}`,
            icon: "✅",
            iconColor: "#27ae60",
          });
        } else {
          this.showModal({
            title: "Create Failed",
            message: data.error || "Failed to create event.",
            icon: "❌",
            iconColor: "#c0392b",
          });
        }
      })
      .catch(() => {
        this.showModal({
          title: "Connection Error",
          message: "Unable to connect to the server.",
          icon: "⚠️",
          iconColor: "#e67e22",
        });
      });
  },

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
