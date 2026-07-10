// ===== API Configuration =====
// For development - change to your production URL when deploying
//const API_URL = "http://localhost:5000/api";
const API_URL = "https://estancia-wingsync-backend.onrender.com/api";

// ===== Maps Variables - Google Maps =====
let playerMap, playerMarker, eventMap, eventMarker;
let selectedPlayerLat = null,
  selectedPlayerLng = null;
let selectedEventLat = null,
  selectedEventLng = null;

const defaultLat = 13.415;
const defaultLng = 123.635;

// ===== Create Google Map with Precision and Retry =====
function createGoogleMap(
  containerId,
  searchBoxId,
  coordsTextId,
  mapType = "player",
  retries = 0,
) {
  // Check if Google Maps API is loaded
  if (typeof google === "undefined" || typeof google.maps === "undefined") {
    if (retries < 10) {
      console.log(`Google Maps not ready, retrying... (${retries + 1})`);
      setTimeout(
        () =>
          createGoogleMap(
            containerId,
            searchBoxId,
            coordsTextId,
            mapType,
            retries + 1,
          ),
        500,
      );
    } else {
      console.error("Google Maps API failed to load after 10 retries.");
      app.showModal({
        title: "Map Error",
        message: "Google Maps failed to load. Please refresh the page.",
        icon: "❌",
        iconColor: "#c0392b",
      });
    }
    return;
  }

  const mapElement = document.getElementById(containerId);
  if (!mapElement) {
    console.error(`Map container ${containerId} not found`);
    return;
  }

  // Ensure the container is visible and has a valid height
  const rect = mapElement.getBoundingClientRect();
  if (rect.height === 0 && retries < 5) {
    console.log(
      `Map container ${containerId} not yet visible, retrying... (${retries + 1})`,
    );
    setTimeout(
      () =>
        createGoogleMap(
          containerId,
          searchBoxId,
          coordsTextId,
          mapType,
          retries + 1,
        ),
      300,
    );
    return;
  }
  if (rect.height === 0) mapElement.style.height = "400px";

  const map = new google.maps.Map(mapElement, {
    center: { lat: defaultLat, lng: defaultLng },
    zoom: 15,
    mapTypeId: google.maps.MapTypeId.HYBRID,
    mapTypeControl: true,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
      position: google.maps.ControlPosition.TOP_RIGHT,
    },
    zoomControl: true,
    zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
    fullscreenControl: true,
    streetViewControl: true,
    streetViewControlOptions: {
      position: google.maps.ControlPosition.RIGHT_BOTTOM,
    },
  });

  const searchBox = document.getElementById(searchBoxId);
  if (searchBox) {
    const autocomplete = new google.maps.places.Autocomplete(searchBox);
    autocomplete.bindTo("bounds", map);
    autocomplete.setFields(["geometry", "name", "formatted_address"]);
    autocomplete.addListener("place_changed", function () {
      const place = autocomplete.getPlace();
      if (!place.geometry) {
        app.showModal({
          title: "Location Not Found",
          message: "Please select a location from the dropdown.",
          icon: "⚠️",
          iconColor: "#e67e22",
        });
        return;
      }
      const lat = parseFloat(place.geometry.location.lat().toFixed(6));
      const lng = parseFloat(place.geometry.location.lng().toFixed(6));
      map.setCenter(place.geometry.location);
      map.setZoom(17);
      setMarker(mapType, lat, lng, map, coordsTextId, place);
    });
  }

  map.addListener("click", function (event) {
    const lat = parseFloat(event.latLng.lat().toFixed(6));
    const lng = parseFloat(event.latLng.lng().toFixed(6));
    setMarker(mapType, lat, lng, map, coordsTextId);
  });

  setTimeout(() => google.maps.event.trigger(map, "resize"), 300);
  return map;
}

// ===== Set Marker with Precision =====
function setMarker(mapType, lat, lng, map, coordsTextId, place = null) {
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    app.showModal({
      title: "Invalid Location",
      message: "Please select a valid location on the map.",
      icon: "⚠️",
      iconColor: "#e67e22",
    });
    return;
  }
  if (mapType === "player" && playerMarker) playerMarker.setMap(null);
  if (mapType === "event" && eventMarker) eventMarker.setMap(null);

  const position = new google.maps.LatLng(lat, lng);
  const marker = new google.maps.Marker({
    position,
    map,
    draggable: true,
    animation: google.maps.Animation.DROP,
    title: place ? place.name : "Selected Location",
  });

  const latStr = lat.toFixed(6);
  const lngStr = lng.toFixed(6);
  document.getElementById(coordsTextId).innerText = `${latStr}, ${lngStr}`;

  if (mapType === "player") {
    selectedPlayerLat = lat;
    selectedPlayerLng = lng;
    playerMarker = marker;
  } else {
    selectedEventLat = lat;
    selectedEventLng = lng;
    eventMarker = marker;
  }

  const content = place
    ? `<div style="padding: 8px; max-width:260px;"><strong>📍 ${place.name || "Selected Location"}</strong><br><span style="font-size:12px; color:#666;">${place.formatted_address || ""}<br><b style="color:#1a2a33;">${latStr}, ${lngStr}</b></span></div>`
    : `<div style="padding:8px;"><strong>📍 Selected Location</strong><br><span style="font-size:12px; color:#666;"><b style="color:#1a2a33;">${latStr}, ${lngStr}</b></span></div>`;
  const infoWindow = new google.maps.InfoWindow({ content });
  infoWindow.open(map, marker);

  marker.addListener("dragend", function () {
    const pos = marker.getPosition();
    const newLat = parseFloat(pos.lat().toFixed(6));
    const newLng = parseFloat(pos.lng().toFixed(6));
    if (newLat < -90 || newLat > 90 || newLng < -180 || newLng > 180) {
      app.showModal({
        title: "Invalid Location",
        message: "Please select a valid location on the map.",
        icon: "⚠️",
        iconColor: "#e67e22",
      });
      return;
    }
    document.getElementById(coordsTextId).innerText =
      `${newLat.toFixed(6)}, ${newLng.toFixed(6)}`;
    if (mapType === "player") {
      selectedPlayerLat = newLat;
      selectedPlayerLng = newLng;
    } else {
      selectedEventLat = newLat;
      selectedEventLng = newLng;
    }
    infoWindow.setContent(
      `<div style="padding:8px;"><strong>📍 Selected Location</strong><br><span style="font-size:12px; color:#666;"><b style="color:#1a2a33;">${newLat.toFixed(6)}, ${newLng.toFixed(6)}</b></span></div>`,
    );
    infoWindow.open(map, marker);
  });

  return marker;
}

// ===== Main App =====
const app = {
  currentUser: null,
  eventLookup: {},
  allEvents: [],
  allPlayers: [],
  allResults: {},
  selectedEventCode: null,
  currentRegistrations: [],

  // ----- auto‑refresh timer ID -----
  refreshIntervalId: null,

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
                @keyframes customFadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes customSlideUp { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
                @keyframes customPulse { 0% { transform: scale(0.6); opacity: 0; } 50% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }
                @media (max-width: 480px) {
                    #custom-modal > div { padding: 24px 20px !important; }
                    #custom-modal .custom-modal-close { font-size: 24px !important; top: 8px !important; right: 12px !important; }
                    #custom-modal .custom-modal-btn { padding: 10px 28px !important; font-size: 15px !important; width: 100%; }
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
    this.stopAutoRefresh();
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
    this.fetchAllEvents();
  },

  fetchAllEvents() {
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
      })
      .catch((err) => console.error("Failed to fetch events for lookup:", err));
  },

  // ========== NAVIGATION ==========
  navigate(view) {
    this.stopAutoRefresh();

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

    // Start auto‑refresh for live views
    if (view === "dashboard" || view === "results") {
      this.startAutoRefresh();
    }
  },

  toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("open");
  },

  // ========== AUTO‑REFRESH ==========
  startAutoRefresh() {
    if (this.refreshIntervalId) clearInterval(this.refreshIntervalId);
    this.refreshIntervalId = setInterval(() => {
      const currentView = document.querySelector(".view-section:not(.hidden)");
      if (currentView) {
        const id = currentView.id;
        if (id === "view-results") {
          this.renderResults();
        } else if (id === "view-dashboard") {
          this.renderDashboard();
        }
      }
    }, 3000);
  },

  stopAutoRefresh() {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  },

  // ========== DASHBOARD ==========
  renderDashboard() {
    Promise.all([
      fetch(`${API_URL}/events/active`).then((res) => res.json()),
      fetch(`${API_URL}/events/registrations-summary`).then((res) =>
        res.json(),
      ),
    ])
      .then(([events, summary]) => {
        const summaryMap = {};
        summary.forEach((item) => {
          summaryMap[item.eventId] = item.playerCount || 0;
        });

        const table = document.querySelector("#active-events-table");
        const isAdmin = this.currentUser.role === "admin";

        let thead = "<thead><tr>";
        if (isAdmin) {
          thead += "<th>Players</th>";
        }
        thead += "<th>Event Name</th><th>Release Time</th><th>Status</th>";
        thead += "</tr></thead>";

        let tbody = "<tbody>";
        events.forEach((e) => {
          tbody += "<tr>";
          if (isAdmin) {
            const playerCount = summaryMap[e.code] || 0;
            tbody += `<td data-label="Players">${playerCount}</td>`;
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

        const eventName = data.eventName || "Unknown Event";
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
          title: "✅ Bird Clocked!",
          message: `${formattedDate}  ${formattedTime}\n📋 ${eventName} (ERPC)\n📏 Air Distance: ${data.distance.toFixed(4)} KM\n⚡ Speed: ${data.speed.toFixed(4)} m/min`,
          icon: "✅",
          iconColor: "#27ae60",
          buttonText: "OK",
        });

        document.getElementById("clock-in-code").value = "";
        this.renderDashboard();

        // If currently on results view, refresh it immediately
        const resultsView = document.getElementById("view-results");
        if (resultsView && !resultsView.classList.contains("hidden")) {
          this.renderResults();
        }
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
      document.getElementById("prof-lat").value = this.currentUser.lat || "";
      document.getElementById("prof-lng").value = this.currentUser.lng || "";
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

  // ========== RESULTS ==========
  initResultsView() {
    if (this.allEvents.length === 0) {
      fetch(`${API_URL}/events/all`)
        .then((res) => res.json())
        .then((events) => {
          this.allEvents = events;
          this.buildEventLookup(events);
          this.setupResultsView();
        })
        .catch((err) => console.error("Results init error:", err));
    } else {
      this.setupResultsView();
    }
  },

  buildEventLookup(events) {
    this.eventLookup = {};
    events.forEach((e) => {
      this.eventLookup[e.code] = e;
      if (e.codes && e.codes.length > 0) {
        e.codes.forEach((c) => {
          this.eventLookup[c] = e;
        });
      }
    });
  },

  setupResultsView() {
    let searchInput = document.getElementById("result-search-input");
    if (!searchInput) {
      const container = document.querySelector("#view-results .card");
      const header = container.querySelector(".dashboard-header");

      // Add auto-refresh status and refresh button
      const infoBar = document.createElement("div");
      infoBar.style.cssText =
        "display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;";
      infoBar.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <span style="font-size: 13px; color: var(--text-light);">
                        🔄 Auto-refresh <span style="color: var(--primary); font-weight: 600;">every 3s</span>
                    </span>
                    <button class="btn btn-sm btn-primary" onclick="app.refreshResults()">
                        🔄 Refresh Now
                    </button>
                </div>
                <div style="font-size: 13px; color: #999;" id="results-last-updated">
                    Last updated: just now
                </div>
            `;

      const searchDiv = document.createElement("div");
      searchDiv.style.cssText =
        "margin: 10px 0 15px; display: flex; gap: 10px; flex-wrap: wrap;";
      searchDiv.innerHTML = `
                        <input id="result-search-input" type="text" class="form-control" style="flex:1; min-width:200px;" placeholder="🔍 Search events by name or code..." oninput="app.filterResults()">
                        <button class="btn btn-secondary" onclick="document.getElementById('result-search-input').value=''; app.filterResults();">✕ Clear</button>
                    `;

      // Insert after header
      container.insertBefore(infoBar, header.nextSibling);
      container.insertBefore(searchDiv, header.nextSibling.nextSibling);
    }

    document.getElementById("event-release-info").innerHTML = "";
    if (this.allEvents.length > 0) {
      this.selectedEventCode = this.allEvents[0].code;
      this.renderResults();
    } else {
      this.selectedEventCode = null;
      this.renderResults();
    }
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
    if (filteredEvents.length > 0) {
      this.selectedEventCode = filteredEvents[0].code;
    } else {
      this.selectedEventCode = null;
    }
    this.renderResults();
  },

  refreshResults() {
    // Update last updated time
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    const updatedEl = document.getElementById("results-last-updated");
    if (updatedEl) updatedEl.textContent = `Last updated: ${timeStr}`;
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
                    <div style="font-size: 13px; color: #888; margin-top: 2px;">📍 Release Point: ${event.lat.toFixed(6)}, ${event.lng.toFixed(6)}</div>
                </div>
            `;
    } else {
      releaseInfoDiv.innerHTML = "";
    }

    fetch(`${API_URL}/results/${this.selectedEventCode}`)
      .then((res) => res.json())
      .then((results) => {
        if (results.length === 0) {
          tbody.innerHTML =
            '<tr><td colspan="6" style="text-align:center; color:#999; padding:20px;">No results yet for this event.</td></tr>';
          return;
        }
        tbody.innerHTML = results
          .map(
            (r, i) => `
                    <tr>
                        <td data-label="Rank">${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</td>
                        <td data-label="Player">${r.userName}</td>
                        <td data-label="Air Dist">${r.distanceKm} km</td>
                        <td data-label="Arr">${new Date(r.arrivalTime).toLocaleTimeString()}</td>
                        <td data-label="Flight Hrs">${r.flightTimeHours} hrs</td>
                        <td data-label="Speed m/min" style="color:var(--primary); font-weight: 700; font-size: 1.1em;">
                            ${r.speedMPM.toFixed(4)}
                        </td>
                    </tr>
                `,
          )
          .join("");
        // Update timestamp
        const updatedEl = document.getElementById("results-last-updated");
        if (updatedEl) {
          const now = new Date();
          updatedEl.textContent = `Last updated: ${now.toLocaleTimeString()}`;
        }
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
            (log) =>
              `<li style="padding: 10px; border-bottom: 1px solid #eee;"><small>[${log.time}]</small><br>${log.message}</li>`,
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
                    <td data-label="Lat/Lng">${u.lat.toFixed(6)}, ${u.lng.toFixed(6)}</td>
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
    const name = document.getElementById("modal-p-name").value.trim();
    const contact = document.getElementById("modal-p-contact").value.trim();

    if (!name) {
      this.showModal({
        title: "Incomplete",
        message: "Player name is required.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }
    if (!selectedPlayerLat || !selectedPlayerLng) {
      this.showModal({
        title: "Missing Location",
        message:
          "Please select a location on the map by clicking or searching.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }
    if (selectedPlayerLat < -90 || selectedPlayerLat > 90) {
      this.showModal({
        title: "Invalid Latitude",
        message: "Latitude must be between -90 and 90 degrees.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }
    if (selectedPlayerLng < -180 || selectedPlayerLng > 180) {
      this.showModal({
        title: "Invalid Longitude",
        message: "Longitude must be between -180 and 180 degrees.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }

    const lat = parseFloat(selectedPlayerLat.toFixed(6));
    const lng = parseFloat(selectedPlayerLng.toFixed(6));

    fetch(`${API_URL}/users/player`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, contact, lat, lng }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          this.closeModal("modal-player");
          this.renderPlayers();
          this.clearPlayerSelection();
          this.showModal({
            title: "✅ Player Saved",
            message: `Player Saved: ${data.user.id}\n📍 ${data.user.lat.toFixed(6)}, ${data.user.lng.toFixed(6)}`,
            icon: "✅",
            iconColor: "#27ae60",
          });
        } else {
          this.showModal({
            title: "Save Failed",
            message: data.error || "Failed to save player.",
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

  clearPlayerSelection() {
    selectedPlayerLat = null;
    selectedPlayerLng = null;
    if (playerMarker) {
      playerMarker.setMap(null);
      playerMarker = null;
    }
    document.getElementById("player-coords-text").innerText = "None selected";
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
            title: "✅ Player Updated",
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
    fetch(`${API_URL}/users/player/${playerId}`, { method: "DELETE" })
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
        this.buildEventLookup(events);

        return fetch(`${API_URL}/events/registrations-summary`)
          .then((res) => res.json())
          .then((summary) => {
            const summaryMap = {};
            summary.forEach((item) => {
              summaryMap[item.eventId] = item.playerCount || 0;
            });
            this.renderEventTable(events, summaryMap);
          })
          .catch((err) => {
            console.warn(
              "Failed to fetch registration summary, showing 0 players",
              err,
            );
            const emptyMap = {};
            this.renderEventTable(events, emptyMap);
          });
      })
      .catch((err) => console.error("Events error:", err));
  },

  renderEventTable(events, summaryMap) {
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

    this._eventsWithSummary = events.map((e) => ({
      ...e,
      playerCount: summaryMap[e.code] || 0,
    }));
    this.filterEvents();
  },

  filterEvents() {
    const searchTerm = document
      .getElementById("events-search-input")
      .value.toLowerCase()
      .trim();
    const filtered = this._eventsWithSummary
      ? this._eventsWithSummary.filter((e) => {
          const nameMatch = e.name.toLowerCase().includes(searchTerm);
          const codeMatch = e.code.toLowerCase().includes(searchTerm);
          const codesMatch =
            e.codes &&
            e.codes.some((c) => c.toLowerCase().includes(searchTerm));
          return nameMatch || codeMatch || codesMatch;
        })
      : [];

    document.querySelector("#admin-events-table tbody").innerHTML = filtered
      .map(
        (e) => `
                <tr>
                    <td data-label="Players">${e.playerCount}</td>
                    <td data-label="Name">${e.name}</td>
                    <td data-label="Point">${e.lat.toFixed(6)}, ${e.lng.toFixed(6)}</td>
                    <td data-label="Actions">
                        <button class="btn btn-primary btn-sm" onclick="app.openRegisterModal('${e.code}')">📝 Register Players</button>
                        <button class="btn btn-danger btn-sm" onclick="app.toggleEvent('${e.code}')">
                            ${e.status === "Active" ? "🔒 Close" : "🔓 Re-open"}
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="app.deleteEvent('${e.code}')">🗑️ Delete</button>
                    </td>
                </tr>
            `,
      )
      .join("");
  },

  // ===== REGISTRATION MODAL =====
  openRegisterModal(eventCode) {
    this.currentEventCode = eventCode;
    const modal = document.getElementById("modal-register-players");
    modal.classList.add("show");
    this.loadRegistrations(eventCode);
  },

  loadRegistrations(eventCode) {
    fetch(`${API_URL}/events/${eventCode}/registrations`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((registrations) => {
        this.currentRegistrations = registrations;
        this.populateRegisterModal(eventCode);
      })
      .catch((err) => {
        console.error("❌ Error loading registrations:", err);
        this.currentRegistrations = [];
        this.populateRegisterModal(eventCode);
        this.showModal({
          title: "Warning",
          message: "Could not load existing registrations. Please refresh.",
          icon: "⚠️",
          iconColor: "#e67e22",
        });
      });
  },

  populateRegisterModal(eventCode) {
    fetch(`${API_URL}/users/players`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch players");
        return res.json();
      })
      .then((players) => {
        const registeredIds = this.currentRegistrations
          ? this.currentRegistrations.map((r) => r.userId)
          : [];
        const available = players.filter((p) => !registeredIds.includes(p.id));

        const select = document.getElementById("register-player-select");
        select.innerHTML =
          '<option value="">-- Select Player --</option>' +
          available
            .map((p) => `<option value="${p.id}">${p.name} (${p.id})</option>`)
            .join("");

        this.updateRegistrationTable();

        document.getElementById("register-pigeon-count").value = 1;
        document.getElementById("register-event-code").value = eventCode;
      })
      .catch((err) => {
        console.error("❌ Error loading players:", err);
        this.showModal({
          title: "Error",
          message: "Could not load player list. Please refresh the page.",
          icon: "❌",
          iconColor: "#c0392b",
        });
      });
  },

  updateRegistrationTable() {
    const tbody = document.querySelector("#registrations-table tbody");
    if (!tbody) return;

    if (this.currentRegistrations && this.currentRegistrations.length > 0) {
      tbody.innerHTML = this.currentRegistrations
        .map((r) => {
          const totalCodes = r.codes.length;
          const used = r.statuses.filter((s) => s === "used").length;
          const unused = totalCodes - used;
          const codeItems = r.codes
            .map((code, idx) => {
              const status = r.statuses[idx];
              const badge =
                status === "unused"
                  ? '<span class="badge-unused">✅ Unused</span>'
                  : '<span class="badge-used">⏳ Used</span>';
              return `<span class="code-item">${code} ${badge}</span>`;
            })
            .join("");

          return `
                    <tr>
                        <td><strong>${r.userName}</strong></td>
                        <td>${codeItems}</td>
                        <td>
                            <span class="badge-total">${totalCodes} total</span>
                            <span class="badge-unused">${unused} unused</span>
                            <span class="badge-used">${used} used</span>
                        </td>
                    </tr>
                `;
        })
        .join("");
    } else {
      tbody.innerHTML =
        '<tr><td colspan="3" style="text-align:center; color:#999; padding:20px;">No players registered yet.</td></tr>';
    }
  },

  // -------- registerPlayers --------
  registerPlayers() {
    const eventCode = document.getElementById("register-event-code").value;
    const userId = document.getElementById("register-player-select").value;
    const pigeonCount = parseInt(
      document.getElementById("register-pigeon-count").value,
      10,
    );

    if (!userId) {
      this.showModal({
        title: "Incomplete",
        message: "Please select a player.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }
    if (isNaN(pigeonCount) || pigeonCount < 1 || pigeonCount > 10) {
      this.showModal({
        title: "Invalid Count",
        message: "Pigeon count must be between 1 and 10.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }

    const btn = document.querySelector("#modal-register-players .btn-success");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "⏳ Registering...";
    }

    fetch(`${API_URL}/events/${eventCode}/register-players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrations: [{ userId, pigeonCount }] }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Registration failed");
        return data;
      })
      .then((data) => {
        if (data.success) {
          this.showModal({
            title: "✅ Registration Successful",
            message: `Generated ${pigeonCount} codes for player.\nCodes: ${data.registrations[0].codes.join(", ")}`,
            icon: "✅",
            iconColor: "#27ae60",
          });
          this.loadRegistrations(eventCode);
        } else {
          throw new Error(data.error || "Unknown error");
        }
      })
      .catch((err) => {
        console.error("❌ Registration error:", err);
        this.showModal({
          title: "Registration Failed",
          message: err.message || "Unable to connect to the server.",
          icon: "❌",
          iconColor: "#c0392b",
        });
      })
      .finally(() => {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "✅ Register Player";
        }
      });
  },

  closeRegisterModal() {
    document.getElementById("modal-register-players").classList.remove("show");
  },

  // ===== TOGGLE EVENT =====
  toggleEvent(code) {
    fetch(`${API_URL}/events/${code}/toggle`, { method: "PUT" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          this.renderEvents();
          this.renderDashboard();
          this.showModal({
            title: "🔄 Event Updated",
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
        "Are you sure you want to delete this event? All results and registrations will also be removed.",
      )
    )
      return;
    fetch(`${API_URL}/events/${eventCode}`, { method: "DELETE" })
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

  // ===== CREATE EVENT =====
  saveEvent() {
    const name = document.getElementById("modal-e-name").value.trim();
    const time = document.getElementById("modal-e-time").value;

    if (!name) {
      this.showModal({
        title: "Incomplete",
        message: "Event name is required.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }
    if (!time) {
      this.showModal({
        title: "Incomplete",
        message: "Release date and time are required.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }
    if (!selectedEventLat || !selectedEventLng) {
      this.showModal({
        title: "Missing Location",
        message:
          "Please select a release location on the map by clicking or searching.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }
    if (selectedEventLat < -90 || selectedEventLat > 90) {
      this.showModal({
        title: "Invalid Latitude",
        message: "Latitude must be between -90 and 90 degrees.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }
    if (selectedEventLng < -180 || selectedEventLng > 180) {
      this.showModal({
        title: "Invalid Longitude",
        message: "Longitude must be between -180 and 180 degrees.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }

    const lat = parseFloat(selectedEventLat.toFixed(6));
    const lng = parseFloat(selectedEventLng.toFixed(6));

    fetch(`${API_URL}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        releaseTime: new Date(time).toISOString(),
        lat,
        lng,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          this.closeModal("modal-event");
          this.renderEvents();
          this.renderDashboard();
          this.clearEventSelection();
          this.fetchAllEvents();
          this.showModal({
            title: "✅ Event Created",
            message: `Event Created: ${data.event.name}\n📍 ${data.event.lat.toFixed(6)}, ${data.event.lng.toFixed(6)}`,
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

  clearEventSelection() {
    selectedEventLat = null;
    selectedEventLng = null;
    if (eventMarker) {
      eventMarker.setMap(null);
      eventMarker = null;
    }
    document.getElementById("event-coords-text").innerText = "None selected";
  },

  // ===== GENERATE EVENT CODES (deprecated) =====
  generateEventCodes() {
    this.showModal({
      title: "Codes Not Needed",
      message: "Event codes are now generated per player during registration.",
      icon: "ℹ️",
      iconColor: "#2a7a62",
    });
  },

  // ========== GOOGLE MAPS MODALS ==========
  openPlayerModal() {
    const modal = document.getElementById("modal-player");
    modal.classList.add("show");
    setTimeout(() => {
      if (!playerMap) {
        playerMap = createGoogleMap(
          "player-map",
          "player-search-box",
          "player-coords-text",
          "player",
        );
      } else {
        google.maps.event.trigger(playerMap, "resize");
        const center = playerMap.getCenter();
        if (center) playerMap.setCenter(center);
      }
    }, 500);
  },

  openEventModal() {
    const modal = document.getElementById("modal-event");
    modal.classList.add("show");
    setTimeout(() => {
      if (!eventMap) {
        eventMap = createGoogleMap(
          "event-map",
          "event-search-box",
          "event-coords-text",
          "event",
        );
      } else {
        google.maps.event.trigger(eventMap, "resize");
        const center = eventMap.getCenter();
        if (center) eventMap.setCenter(center);
      }
    }, 500);
  },

  closeModal(id) {
    document.getElementById(id).classList.remove("show");
  },

  // ========== GET CURRENT LOCATION ==========
  getCurrentLocation(mapType = "player") {
    if (!navigator.geolocation) {
      this.showModal({
        title: "Location Not Available",
        message: "Your browser doesn't support geolocation.",
        icon: "⚠️",
        iconColor: "#e67e22",
      });
      return;
    }

    this.showModal({
      title: "📍 Getting Location",
      message: "Please allow location access when prompted...",
      icon: "📍",
      iconColor: "#2a7a62",
      showButton: false,
    });

    let locationReceived = false;
    const timeoutId = setTimeout(() => {
      if (!locationReceived) {
        document.getElementById("custom-modal")?.remove();
        this.showModal({
          title: "Location Timeout",
          message:
            "GPS is taking too long. Please select location manually on the map.",
          icon: "⏱️",
          iconColor: "#e67e22",
          buttonText: "OK, I'll select manually",
        });
      }
    }, 15000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        locationReceived = true;
        clearTimeout(timeoutId);
        document.getElementById("custom-modal")?.remove();

        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));

        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          this.showModal({
            title: "Invalid Location",
            message: "Received invalid coordinates from GPS.",
            icon: "❌",
            iconColor: "#c0392b",
          });
          return;
        }

        const map = mapType === "player" ? playerMap : eventMap;
        if (map) {
          map.setCenter({ lat, lng });
          map.setZoom(18);
          const coordsTextId =
            mapType === "player" ? "player-coords-text" : "event-coords-text";
          setMarker(mapType, lat, lng, map, coordsTextId);
        }
      },
      (error) => {
        locationReceived = true;
        clearTimeout(timeoutId);
        document.getElementById("custom-modal")?.remove();

        let message =
          "Unable to get your location. Please select manually on the map.";
        if (error.code === 1) {
          message =
            "Location access denied. Please allow location access in your browser settings or select manually on the map.";
        } else if (error.code === 2) {
          message =
            "Location unavailable. Please check your GPS signal and try again, or select manually on the map.";
        } else if (error.code === 3) {
          message =
            "Location request timed out. Please try again or select manually on the map.";
        }

        this.showModal({
          title: "Location Error",
          message,
          icon: "❌",
          iconColor: "#c0392b",
          buttonText: "OK, I'll select manually",
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  },

  togglePasswordVisibility(inputId, toggleElement) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    // Toggle between eye and eye-slash icons
    toggleElement.innerHTML = isPassword
      ? '<i class="fas fa-eye-slash"></i>'
      : '<i class="far fa-eye"></i>';
  },
};

// Initialize app when page loads
window.onload = () => app.init();
