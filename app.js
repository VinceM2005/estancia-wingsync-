// app.js – full file with button protection + PIGEON AVATAR SYSTEM (Image Asset Version) + Certificate System
// ===== API Configuration =====
const API_URL = "https://estancia-wingsync-backend.onrender.com/api";

// ===== PIGEON AVATAR LIBRARY =====
const PIGEON_AVATARS = [
  {
    id: "pigeon001",
    name: "Blue Bar",
    image: "/assets/pigeon-profiles/pigeon-001.png",
  },
  {
    id: "pigeon002",
    name: "Red Check",
    image: "/assets/pigeon-profiles/pigeon-002.png",
  },
  {
    id: "pigeon003",
    name: "Black",
    image: "/assets/pigeon-profiles/pigeon-003.png",
  },
  {
    id: "pigeon004",
    name: "White",
    image: "/assets/pigeon-profiles/pigeon-004.png",
  },
  {
    id: "pigeon005",
    name: "Grizzle",
    image: "/assets/pigeon-profiles/pigeon-005.png",
  },
  {
    id: "pigeon006",
    name: "Splash",
    image: "/assets/pigeon-profiles/pigeon-006.png",
  },
  {
    id: "pigeon007",
    name: "Dark Checker",
    image: "/assets/pigeon-profiles/pigeon-007.png",
  },
  {
    id: "pigeon008",
    name: "Mealy",
    image: "/assets/pigeon-profiles/pigeon-008.png",
  },
  {
    id: "pigeon009",
    name: "Ash Red",
    image: "/assets/pigeon-profiles/pigeon-009.png",
  },
  {
    id: "pigeon010",
    name: "Silver",
    image: "/assets/pigeon-profiles/pigeon-010.png",
  },
  {
    id: "pigeon011",
    name: "Blue Check",
    image: "/assets/pigeon-profiles/pigeon-011.png",
  },
  {
    id: "pigeon012",
    name: "Red Bar",
    image: "/assets/pigeon-profiles/pigeon-012.png",
  },
  {
    id: "pigeon013",
    name: "Black Check",
    image: "/assets/pigeon-profiles/pigeon-013.png",
  },
  {
    id: "pigeon014",
    name: "Dun",
    image: "/assets/pigeon-profiles/pigeon-014.png",
  },
  {
    id: "pigeon015",
    name: "Cream",
    image: "/assets/pigeon-profiles/pigeon-015.png",
  },
  {
    id: "pigeon016",
    name: "Opal",
    image: "/assets/pigeon-profiles/pigeon-016.png",
  },
  {
    id: "pigeon017",
    name: "Tiger Grizzle",
    image: "/assets/pigeon-profiles/pigeon-017.png",
  },
  {
    id: "pigeon018",
    name: "Saddle",
    image: "/assets/pigeon-profiles/pigeon-018.png",
  },
  {
    id: "pigeon019",
    name: "Almond",
    image: "/assets/pigeon-profiles/pigeon-019.png",
  },
  {
    id: "pigeon020",
    name: "Stencil",
    image: "/assets/pigeon-profiles/pigeon-020.png",
  },
];

function getDefaultPigeonSVG(size = 80) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    <rect width="80" height="80" rx="12" fill="#e8e0d8"/>
    <circle cx="40" cy="35" r="20" fill="#8a9aa8"/>
    <circle cx="40" cy="35" r="16" fill="#a8b8c8"/>
    <circle cx="40" cy="12" r="10" fill="#8a9aa8"/>
    <path d="M32 28 Q40 32 48 28" stroke="#6a7a8a" stroke-width="1.5" fill="none"/>
    <circle cx="36" cy="32" r="3" fill="#2a2a2a"/>
    <circle cx="36" cy="31" r="1.2" fill="#f0f0f0"/>
    <path d="M24 20 L28 24 L26 28" stroke="#e8a030" stroke-width="1.5" fill="none"/>
    <circle cx="40" cy="55" r="14" fill="#8a9aa8"/>
    <circle cx="40" cy="55" r="11" fill="#a8b8c8"/>
    <path d="M30 52 Q40 58 50 52" stroke="#6a7a8a" stroke-width="1" fill="none"/>
  </svg>`;
}

function getDefaultPigeonSVGDataUri(size = 80) {
  const svg = getDefaultPigeonSVG(size);
  const trimmed = svg.replace(/\s+/g, " ").trim();
  const base64 = btoa(trimmed);
  return `data:image/svg+xml;base64,${base64}`;
}

function getPigeonAvatarSVG(avatarId, size = 80) {
  const avatar = PIGEON_AVATARS.find((a) => a.id === avatarId);
  if (!avatar) {
    return getDefaultPigeonSVG(size);
  }
  const defaultDataUri = getDefaultPigeonSVGDataUri(size);
  return `<img src="${avatar.image}" alt="${avatar.name}" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:50%;display:block;background:#f0ece8;" onerror="this.onerror=null;this.src='${defaultDataUri}';">`;
}

function getAvatarPreviewHTML(avatar, size = 52) {
  if (!avatar) return getDefaultPigeonSVG(size);
  return `<img src="${avatar.image}" alt="${avatar.name}" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:50%;display:block;background:#f0ece8;">`;
}

const inflightGets = new Map();
const LIVE_POLL_MS = 20000;
const BACKGROUND_POLL_MS = 60000;

function fetchWithAuth(url, options = {}) {
  const token = sessionStorage.getItem("wingsync_token");
  const method = (options.method || "GET").toUpperCase();
  if (method === "GET" && inflightGets.has(url)) {
    return inflightGets.get(url);
  }
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const request = fetch(url, {
    ...options,
    headers,
  }).then((res) => {
    if (res.status === 401) {
      sessionStorage.removeItem("wingsync_token");
      sessionStorage.removeItem("wingsync_user");
      window.location.reload();
      throw new Error("Session expired. Please log in again.");
    }
    if (res.status === 429) {
      console.warn("Rate limited:", url);
    }
    return res;
  });
  if (method === "GET") {
    inflightGets.set(url, request);
    request.finally(() => {
      if (inflightGets.get(url) === request) inflightGets.delete(url);
    });
  }
  return request;
}

function formatFlightHours(hours) {
  const totalSeconds = Math.floor(parseFloat(hours) * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toNumber(value) {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

let playerMap, playerMarker, eventMap, eventMarker;
let selectedPlayerLat = null,
  selectedPlayerLng = null;
let selectedEventLat = null,
  selectedEventLng = null;
let editPlayerMap, editPlayerMarker;
let selectedEditPlayerLat = null,
  selectedEditPlayerLng = null;

const defaultLat = 13.415;
const defaultLng = 123.635;

function parseCoordinates(input) {
  const trimmed = input.trim();
  const match = trimmed.match(/^([-+]?\d+\.\d+)\s*,\s*([-+]?\d+\.\d+)$/);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  return null;
}

function createGoogleMap(
  containerId,
  searchBoxId,
  coordsTextId,
  mapType = "player",
  retries = 0,
) {
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

    searchBox.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        const val = searchBox.value.trim();
        const coords = parseCoordinates(val);
        if (coords) {
          const { lat, lng } = coords;
          map.setCenter({ lat, lng });
          map.setZoom(17);
          setMarker(mapType, lat, lng, map, coordsTextId);
        }
      }
    });

    searchBox.addEventListener("blur", function () {
      const val = searchBox.value.trim();
      const coords = parseCoordinates(val);
      if (coords) {
        const { lat, lng } = coords;
        map.setCenter({ lat, lng });
        map.setZoom(17);
        setMarker(mapType, lat, lng, map, coordsTextId);
      }
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
  if (mapType === "edit-player" && editPlayerMarker)
    editPlayerMarker.setMap(null);

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
  } else if (mapType === "event") {
    selectedEventLat = lat;
    selectedEventLng = lng;
    eventMarker = marker;
  } else if (mapType === "edit-player") {
    selectedEditPlayerLat = lat;
    selectedEditPlayerLng = lng;
    editPlayerMarker = marker;
    document.getElementById("edit-p-lat").value = lat;
    document.getElementById("edit-p-lng").value = lng;
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
    } else if (mapType === "event") {
      selectedEventLat = newLat;
      selectedEventLng = newLng;
    } else if (mapType === "edit-player") {
      selectedEditPlayerLat = newLat;
      selectedEditPlayerLng = newLng;
      document.getElementById("edit-p-lat").value = newLat;
      document.getElementById("edit-p-lng").value = newLng;
    }
    infoWindow.setContent(
      `<div style="padding:8px;"><strong>📍 Selected Location</strong><br><span style="font-size:12px; color:#666;"><b style="color:#1a2a33;">${newLat.toFixed(6)}, ${newLng.toFixed(6)}</b></span></div>`,
    );
    infoWindow.open(map, marker);
  });

  return marker;
}

// ============================================================
//  MAIN APP
// ============================================================
const app = {
  currentUser: null,
  eventLookup: {},
  allEvents: [],
  allPlayers: [],
  allResults: {},
  selectedEventCode: null,
  currentRegistrations: [],
  currentEventCode: null,
  registrationCounts: {},
  _eventsWithSummary: [],

  refreshIntervalId: null,
  serverTimeOffset: 0,
  clockIntervalId: null,
  _lastEventsFetch: 0,
  _isRendering: false,
  _dashboardLoading: false,
  _eventsInFlight: null,

  _profileStatsInterval: null,
  _pigeonRefreshInterval: null,
  _currentCert: null,

  _qrScannerInstance: null,
  _isScanning: false,

  _adminStatsInterval: null,
  _adminCertRefreshInterval: null,

  init() {
    this.loadTheme();
    this.setupVisibilityListener();
    this.syncServerTime();
    setInterval(() => {
      if (document.hidden) return;
      this.syncServerTime();
    }, BACKGROUND_POLL_MS);

    const path = window.location.pathname;
    if (path.startsWith("/verify/")) {
      const hash = path.substring(8);
      if (hash) {
        this.showVerificationView(hash);
        return;
      }
    }

    const sessionStr = sessionStorage.getItem("wingsync_user");
    const token = sessionStorage.getItem("wingsync_token");
    if (sessionStr && token) {
      this.currentUser = JSON.parse(sessionStr);
      this.showApp();
    }

    this.initStickerGenerator();
  },

  showVerificationView: async function (hash) {
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("app-screen").classList.remove("hidden");
    document.getElementById("header-user").innerText =
      "Certificate Verification";

    document
      .querySelectorAll(".sidebar-menu li")
      .forEach((li) => (li.style.display = "none"));
    document.querySelector(".sidebar-footer").style.display = "block";

    document
      .querySelectorAll(".view-section")
      .forEach((el) => el.classList.add("hidden"));
    const verifyView = document.getElementById("view-certificate-verify");
    if (verifyView) verifyView.classList.remove("hidden");

    try {
      const res = await fetch(`${API_URL}/certificates/verify/${hash}`);
      if (!res.ok) throw new Error("Certificate not found");
      const data = await res.json();
      this._renderVerificationResult(data);
    } catch (err) {
      document.getElementById("cert-verify-result").innerHTML = `
        <p style="color: red; font-size: 18px;">❌ ${err.message || "Invalid or expired certificate."}</p>
      `;
    }
  },

  _renderVerificationResult: function (data) {
    const container = document.getElementById("cert-verify-result");
    if (!container) return;
    container.innerHTML = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; background: var(--card-bg); border-radius: 12px; border: 1px solid var(--border);">
        <div style="text-align: center; margin-bottom: 16px;">
          <span style="font-size: 48px;">✅</span>
          <h2 style="color: var(--primary);">Valid Certificate</h2>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; margin: 12px 0;">
          <div><strong>Certificate #</strong></div><div>${data.certificateNumber}</div>
          <div><strong>Player</strong></div><div>${data.player}</div>
          <div><strong>Pigeon</strong></div><div>${data.pigeon}</div>
          <div><strong>Event</strong></div><div>${data.event}</div>
          <div><strong>Rank</strong></div><div>#${data.rank}</div>
          <div><strong>Speed</strong></div><div>${data.speed.toFixed(2)} m/min</div>
          <div><strong>Issue Date</strong></div><div>${new Date(data.issueDate).toLocaleDateString()}</div>
        </div>
        <div style="text-align: center; margin-top: 16px; font-size: 14px; color: var(--text-muted);">
          This certificate is digitally verified and authentic.
        </div>
      </div>
    `;
  },

  cleanupScanner() {
    console.log("[QR Scanner] Cleaning up scanner instance...");
    if (this._qrScannerInstance) {
      try {
        if (this._qrScannerInstance.isScanning) {
          this._qrScannerInstance
            .stop()
            .then(() => {
              console.log("[QR Scanner] Scanner stopped successfully.");
            })
            .catch((err) => {
              console.warn("[QR Scanner] Error stopping scanner:", err);
            });
        }
        this._qrScannerInstance.clear();
        console.log("[QR Scanner] Scanner cleared.");
      } catch (e) {
        console.warn("[QR Scanner] Cleanup error:", e);
      }
      this._qrScannerInstance = null;
    }
    this._isScanning = false;
  },

  openQRScanner() {
    if (typeof Html5Qrcode === "undefined") {
      console.error("[QR Scanner] Html5Qrcode library not loaded.");
      this.showModal({
        title: "Scanner Not Available",
        message: "QR scanner library not loaded. Please refresh the page.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }

    this.cleanupScanner();
    this._isScanning = false;

    console.log("[QR Scanner] Opening scanner...");

    const scannerModal = document.createElement("div");
    scannerModal.id = "qr-scanner-modal";
    scannerModal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.85);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
    `;
    scannerModal.innerHTML = `
      <div style="background: #fff; border-radius: 16px; padding: 20px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="margin:0;"><i class="fas fa-qrcode"></i> Scan QR Code</h3>
          <button id="qr-close-btn" style="background:none; border:none; font-size:28px; cursor:pointer; color:#666;">&times;</button>
        </div>
        <div style="position: relative; width: 100%;">
          <div id="qr-reader" style="width:100%;"></div>
          <div id="qr-frame" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 280px; height: 280px; border: 3px solid #00ff00; border-radius: 16px; pointer-events: none; box-shadow: 0 0 25px rgba(0,255,0,0.35); z-index: 10; transition: border-color 0.3s ease, box-shadow 0.3s ease;">
            <span class="corner-bracket bl"></span>
            <span class="corner-bracket tr"></span>
          </div>
        </div>
        <div id="qr-reader-results" style="margin-top: 12px; font-size: 14px; color: #333; text-align:center; min-height: 24px;"></div>

        <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
          <label style="font-size:13px; font-weight:600; color:#333;">Zoom:</label>
          <input type="range" id="zoom-slider" min="0.5" max="5.0" step="0.1" value="1.0" style="flex:1; min-width:100px;">
          <span id="zoom-value" style="font-size:13px; font-weight:600; min-width:40px; text-align:center;">1.0×</span>
          <button id="reset-zoom-btn" class="btn btn-sm btn-secondary" style="padding:4px 12px; font-size:12px;">⟲ Reset</button>
        </div>

        <button id="flashlight-btn" class="btn btn-secondary" style="margin-top:8px; width:100%; justify-content:center;">
          <i class="fas fa-lightbulb"></i> <span id="flash-status">Toggle Flash</span>
        </button>

        <button class="btn btn-secondary" style="margin-top:8px; width:100%;" id="qr-cancel-btn">Cancel</button>
      </div>
    `;
    document.body.appendChild(scannerModal);

    const closeModal = () => {
      console.log("[QR Scanner] Closing modal...");
      this.cleanupScanner();
      const modal = document.getElementById("qr-scanner-modal");
      if (modal) modal.remove();
    };

    const closeBtn = scannerModal.querySelector("#qr-close-btn");
    if (closeBtn) closeBtn.addEventListener("click", closeModal);

    const cancelBtn = scannerModal.querySelector("#qr-cancel-btn");
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

    scannerModal.addEventListener("click", (e) => {
      if (e.target === scannerModal) closeModal();
    });

    console.log("[QR Scanner] Initializing Html5Qrcode on #qr-reader...");
    let html5QrCode;
    try {
      html5QrCode = new Html5Qrcode("qr-reader");
      this._qrScannerInstance = html5QrCode;
      console.log("[QR Scanner] Html5Qrcode instance created.");
    } catch (err) {
      console.error("[QR Scanner] Failed to initialize scanner:", err);
      document.getElementById("qr-reader-results").innerHTML =
        "❌ Failed to initialize scanner: " + err.message;
      return;
    }

    const config = {
      fps: 20,
      qrbox: { width: 280, height: 280 },
      aspectRatio: undefined,
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
    };

    console.log("[QR Scanner] Starting scanner with config:", config);

    let videoTrack = null;
    let trackRetryInterval = null;
    let trackRetryCount = 0;
    const MAX_TRACK_RETRIES = 30;

    const setupZoomControls = () => {
      const zoomSlider = document.getElementById("zoom-slider");
      const zoomValue = document.getElementById("zoom-value");
      const resetZoomBtn = document.getElementById("reset-zoom-btn");

      if (!zoomSlider || !zoomValue) return;

      const applyZoom = async (zoomFactor) => {
        if (!videoTrack) {
          console.warn("[QR Scanner] No video track available for zoom.");
          return;
        }
        try {
          await videoTrack.applyConstraints({
            advanced: [{ zoom: zoomFactor }],
          });
          zoomValue.textContent = zoomFactor.toFixed(1) + "×";
          console.log(`[QR Scanner] Zoom set to ${zoomFactor.toFixed(1)}×`);
        } catch (e) {
          console.warn("[QR Scanner] Zoom not supported:", e);
          if (!window._zoomWarningShown) {
            window._zoomWarningShown = true;
            zoomValue.textContent = "⚠️";
            document.getElementById("zoom-slider").disabled = true;
          }
        }
      };

      zoomSlider.addEventListener("input", () => {
        const val = parseFloat(zoomSlider.value);
        applyZoom(val);
      });

      resetZoomBtn?.addEventListener("click", () => {
        zoomSlider.value = "1.0";
        applyZoom(1.0);
      });
    };

    const flashBtn = document.getElementById("flashlight-btn");
    const flashStatus = document.getElementById("flash-status");
    let flashOn = false;

    const toggleFlash = async () => {
      if (!videoTrack) {
        flashStatus.textContent = "⚠️ Camera not ready";
        return;
      }

      try {
        if (typeof html5QrCode.toggleFlash === "function") {
          const isOn = await html5QrCode.toggleFlash();
          flashOn = isOn;
          flashStatus.textContent = flashOn ? "✅ Flash ON" : "Flash OFF";
          flashBtn.style.background = flashOn ? "#ffd700" : "";
          flashBtn.style.color = flashOn ? "#333" : "";
          console.log(`[QR Scanner] Flash toggled via library: ${flashOn}`);
          return;
        }

        const capabilities = videoTrack.getCapabilities();
        if (capabilities.torch) {
          flashOn = !flashOn;
          await videoTrack.applyConstraints({ advanced: [{ torch: flashOn }] });
          flashStatus.textContent = flashOn ? "✅ Flash ON" : "Flash OFF";
          flashBtn.style.background = flashOn ? "#ffd700" : "";
          flashBtn.style.color = flashOn ? "#333" : "";
          console.log(`[QR Scanner] Flash toggled via torch: ${flashOn}`);
        } else {
          throw new Error("Torch not supported");
        }
      } catch (e) {
        console.warn("[QR Scanner] Flash toggle error:", e);
        flashStatus.textContent = "⚠️ Not available";
        if (!window._flashWarningShown) {
          window._flashWarningShown = true;
          app.showModal({
            title: "Flash Not Supported",
            message:
              "Your device or browser does not support the flashlight. You can still scan codes in good lighting.",
            icon: "⚠️",
            iconColor: "#e67e22",
          });
        }
      }
    };

    flashBtn?.addEventListener("click", toggleFlash);

    const setupTrackMonitoring = () => {
      if (trackRetryInterval) {
        clearInterval(trackRetryInterval);
        trackRetryInterval = null;
      }

      trackRetryCount = 0;

      trackRetryInterval = setInterval(() => {
        trackRetryCount++;
        const videoElement = document.querySelector("#qr-reader video");
        if (videoElement && videoElement.srcObject) {
          const tracks = videoElement.srcObject.getVideoTracks();
          if (tracks && tracks.length > 0) {
            videoTrack = tracks[0];
            console.log("[QR Scanner] Video track acquired!");

            setupZoomControls();

            try {
              videoTrack.applyConstraints({
                advanced: [{ focusMode: "continuous" }, { zoom: 1.0 }],
              });
              console.log(
                "[QR Scanner] Autofocus and zoom constraints applied.",
              );
            } catch (e) {
              console.warn(
                "[QR Scanner] Autofocus/zoom constraints not supported:",
                e,
              );
            }

            if (trackRetryInterval) {
              clearInterval(trackRetryInterval);
              trackRetryInterval = null;
            }
            return;
          }
        }

        if (trackRetryCount >= MAX_TRACK_RETRIES) {
          console.warn(
            "[QR Scanner] Failed to acquire video track after 30 attempts.",
          );
          if (trackRetryInterval) {
            clearInterval(trackRetryInterval);
            trackRetryInterval = null;
          }
          document.getElementById("qr-reader-results").innerHTML =
            "⚠️ Camera started but video track not available. Try refreshing.";
        }
      }, 300);
    };

    html5QrCode
      .start(
        { facingMode: "environment" },
        config,
        (decodedText, decodedResult) => {
          console.log("[QR Scanner] QR Code detected! Text:", decodedText);

          if (this._isScanning) {
            console.log(
              "[QR Scanner] Already processing a scan, ignoring duplicate.",
            );
            return;
          }
          this._isScanning = true;

          document.getElementById("clock-in-code").value =
            decodedText.toUpperCase();
          document.getElementById("qr-reader-results").innerHTML =
            `✅ Decoded: <strong>${decodedText}</strong>`;

          const frame = document.getElementById("qr-frame");
          if (frame) {
            frame.style.borderColor = "#00ff00";
            frame.style.boxShadow = "0 0 35px rgba(0,255,0,0.6)";
            setTimeout(() => {
              frame.style.borderColor = "#00ff00";
              frame.style.boxShadow = "0 0 25px rgba(0,255,0,0.35)";
            }, 800);
          }

          console.log(
            "[QR Scanner] Stopping scanner after successful decode...",
          );
          this.cleanupScanner();

          const modal = document.getElementById("qr-scanner-modal");
          if (modal) {
            setTimeout(() => {
              modal.remove();
              console.log("[QR Scanner] Modal removed.");
            }, 300);
          }

          setTimeout(() => {
            console.log(
              "[QR Scanner] Triggering clock-in for code:",
              decodedText,
            );
            this._isScanning = false;
            app.clockIn();
          }, 500);
        },
        (error) => {
          if (error && error !== "NotFoundException") {
            console.debug(
              "[QR Scanner] Scan attempt failed:",
              error.message || error,
            );
          }
        },
      )
      .then(() => {
        console.log("[QR Scanner] Scanner started successfully.");
        document.getElementById("qr-reader-results").innerHTML =
          "📷 Camera active. Point at QR code.";

        setupTrackMonitoring();

        setTimeout(() => {
          const videoElement = document.querySelector("#qr-reader video");
          if (videoElement && videoElement.srcObject) {
            const tracks = videoElement.srcObject.getVideoTracks();
            if (tracks && tracks.length > 0) {
              videoTrack = tracks[0];
              console.log(
                "[QR Scanner] Video track acquired (immediate check).",
              );
              setupZoomControls();
              try {
                videoTrack.applyConstraints({
                  advanced: [{ focusMode: "continuous" }, { zoom: 1.0 }],
                });
              } catch (e) {
                /* ignore */
              }
              if (trackRetryInterval) {
                clearInterval(trackRetryInterval);
                trackRetryInterval = null;
              }
            }
          }
        }, 500);
      })
      .catch((err) => {
        console.error("[QR Scanner] Failed to start scanner:", err);
        document.getElementById("qr-reader-results").innerHTML =
          `❌ Camera error: ${err.message || err}`;

        let message = "Unable to access camera. ";
        if (err.message && err.message.includes("Permission")) {
          message += "Please allow camera access in your browser settings.";
        } else if (err.message && err.message.includes("NotFound")) {
          message += "No camera found on this device.";
        } else {
          message += "Please check your camera and try again.";
        }
        this.showModal({
          title: "Camera Error",
          message: message,
          icon: "❌",
          iconColor: "#c0392b",
        });
      });
  },

  // ===== STICKER GENERATOR =====
  initStickerGenerator() {
    const state = {
      stickers: [],
      widthMm: 42,
      heightMm: 10,
      dpi: 300,
      eventId: null,
      eventName: "",
      isGenerating: false,
      canvasCache: [],
    };

    const generateQRCanvas = (data, sizePx) => {
      return new Promise((resolve, reject) => {
        try {
          if (typeof QRCode === "undefined") {
            reject(new Error("QRCode library not loaded"));
            return;
          }
          const container = document.createElement("div");
          container.style.cssText = "display:none;position:absolute;";
          document.body.appendChild(container);
          new QRCode(container, {
            text: data,
            width: sizePx,
            height: sizePx,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H,
          });
          const qrCanvas = container.querySelector("canvas");
          if (qrCanvas) {
            const canvas = document.createElement("canvas");
            canvas.width = sizePx;
            canvas.height = sizePx;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(qrCanvas, 0, 0);
            document.body.removeChild(container);
            resolve(canvas);
            return;
          }
          const qrImg = container.querySelector("img");
          if (qrImg) {
            const canvas = document.createElement("canvas");
            canvas.width = sizePx;
            canvas.height = sizePx;
            const ctx = canvas.getContext("2d");
            const img = new Image();
            img.onload = function () {
              ctx.drawImage(img, 0, 0);
              document.body.removeChild(container);
              resolve(canvas);
            };
            img.onerror = function () {
              document.body.removeChild(container);
              reject(new Error("Failed to load QR code image"));
            };
            img.src = qrImg.src;
            return;
          }
          document.body.removeChild(container);
          reject(new Error("QR code canvas or image not found"));
        } catch (e) {
          reject(e);
        }
      });
    };

    const generateBarcodeCanvas = (data, widthPx, heightPx) => {
      return new Promise((resolve, reject) => {
        try {
          if (typeof JsBarcode === "undefined") {
            reject(new Error("JsBarcode library not loaded"));
            return;
          }
          const canvas = document.createElement("canvas");
          canvas.width = widthPx;
          canvas.height = heightPx;
          JsBarcode(canvas, data, {
            format: "CODE128",
            width: Math.max(1, Math.floor(widthPx / (data.length * 6))),
            height: heightPx,
            displayValue: false,
            background: "#ffffff",
            lineColor: "#000000",
            margin: 0,
            fontSize: 0,
          });
          resolve(canvas);
        } catch (e) {
          reject(e);
        }
      });
    };

    const roundRectPath = (ctx, x, y, w, h, r) => {
      const radius = Math.max(0, Math.min(r, w / 2, h / 2));
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + w, y, x + w, y + h, radius);
      ctx.arcTo(x + w, y + h, x, y + h, radius);
      ctx.arcTo(x, y + h, x, y, radius);
      ctx.arcTo(x, y, x + w, y, radius);
      ctx.closePath();
    };

    const renderStickerCanvas = async (
      eventName,
      playerName,
      code,
      widthMm,
      heightMm,
      dpi,
      ringNumber = "",
      nickname = "",
    ) => {
      const widthPx = Math.round((widthMm / 25.4) * dpi);
      const heightPx = Math.round((heightMm / 25.4) * dpi);
      const canvas = document.createElement("canvas");
      canvas.width = widthPx;
      canvas.height = heightPx;
      const ctx = canvas.getContext("2d");
      const borderWidth = 1.2;
      const inset = borderWidth / 2;
      const cornerRadiusPx = Math.round((1.8 / 25.4) * dpi);

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, widthPx, heightPx);

      const topHeightPx = Math.round((5.5 / 10) * heightPx);
      const bottomHeightPx = heightPx - topHeightPx;
      const marginPx = Math.round((0.8 / 25.4) * dpi);
      const scratchWidthPx = Math.round((22 / 25.4) * dpi);

      const qrSizeMm = 5.0;
      const qrSizePx = Math.round((qrSizeMm / 25.4) * dpi);
      const qrX = marginPx;
      const qrY = Math.round((topHeightPx - qrSizePx) / 2);

      let qrCanvas = null;
      try {
        qrCanvas = await generateQRCanvas(code, qrSizePx);
      } catch (e) {
        console.warn("QR generation failed for", code, e);
        ctx.fillStyle = "#f0f0f0";
        ctx.fillRect(qrX, qrY, qrSizePx, qrSizePx);
        ctx.fillStyle = "#999";
        ctx.font = `${Math.round(qrSizePx * 0.25)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("QR", qrX + qrSizePx / 2, qrY + qrSizePx / 2);
      }
      if (qrCanvas) {
        ctx.drawImage(qrCanvas, qrX, qrY, qrSizePx, qrSizePx);
      }

      // Sticker code (unique race code bound to this pigeon)
      const codeText = code;
      const gapPx = Math.round((1.5 / 25.4) * dpi);
      const textStartX = qrX + qrSizePx + gapPx;
      const textAvailableWidth = scratchWidthPx - textStartX - marginPx;

      let fontSize = Math.round(topHeightPx * 0.72);
      const estimatedWidth = codeText.length * fontSize * 0.6;
      if (estimatedWidth > textAvailableWidth) {
        fontSize = textAvailableWidth / (codeText.length * 0.6);
      }
      fontSize = Math.min(42, Math.max(12, Math.round(fontSize)));

      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#000000";
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.fillText(codeText, textStartX, topHeightPx / 2);

      // Bottom band: RING (unique pigeon) + player — so stickers cannot be swapped blindly
      const ringLabel = (ringNumber || "NO-RING").toString().toUpperCase();
      const playerLabel = playerName || "Player";
      const nick = (nickname || "").trim();
      const pigeonLabel = nick ? `${ringLabel} · ${nick}` : ringLabel;

      const bottomY = topHeightPx;
      const leftX = marginPx;
      const rightX = widthPx - marginPx;
      const centerY = bottomY + bottomHeightPx / 2;
      const maxLeft = widthPx * 0.58;
      const maxRight = widthPx * 0.38;

      let ringSize = Math.min(
        Math.round((2.4 / 25.4) * dpi),
        Math.round(bottomHeightPx * 0.7),
      );
      ctx.font = `bold ${ringSize}px sans-serif`;
      while (ringSize > 7 && ctx.measureText(pigeonLabel).width > maxLeft) {
        ringSize -= 1;
        ctx.font = `bold ${ringSize}px sans-serif`;
      }
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#0a3d30";
      ctx.fillText(pigeonLabel, leftX, centerY);

      let playerSize = Math.min(
        Math.round((1.8 / 25.4) * dpi),
        Math.round(bottomHeightPx * 0.55),
      );
      ctx.font = `${playerSize}px sans-serif`;
      while (playerSize > 6 && ctx.measureText(playerLabel).width > maxRight) {
        playerSize -= 1;
        ctx.font = `${playerSize}px sans-serif`;
      }
      ctx.textAlign = "right";
      ctx.fillStyle = "#333333";
      ctx.fillText(playerLabel, rightX, centerY);

      ctx.strokeStyle = "#000000";
      ctx.lineWidth = borderWidth;
      roundRectPath(
        ctx,
        inset,
        inset,
        widthPx - inset * 2,
        heightPx - inset * 2,
        cornerRadiusPx,
      );
      ctx.stroke();

      return canvas;
    };

    const renderAllStickers = async (stickers, widthMm) => {
      const container = document.getElementById("sticker-grid-container");
      if (!container) return;

      if (!stickers || stickers.length === 0) {
        container.innerHTML = `
          <div class="sticker-empty-state">
            <i class="fas fa-tags" style="font-size:56px; display:block; margin-bottom:12px; color:#ccc;"></i>
            <h3>No Stickers Generated</h3>
            <p>Click the "Generate Stickers" button to create stickers for this event.</p>
          </div>
        `;
        document.getElementById("sticker-total-count").textContent =
          "0 stickers";
        return;
      }

      container.innerHTML = `
        <div class="sticker-loading">
          <div class="spinner"></div>
          <p>Generating stickers... (${stickers.length} stickers)</p>
        </div>
      `;

      const canvasItems = [];
      const dpi = state.dpi;
      const heightMm = 10;

      for (let i = 0; i < stickers.length; i++) {
        const s = stickers[i];
        try {
          const canvas = await renderStickerCanvas(
            s.eventName || state.eventName || "Event",
            s.playerName || "Player",
            s.code,
            widthMm,
            heightMm,
            dpi,
            s.ringNumber || "",
            s.nickname || "",
          );
          canvasItems.push({ canvas, data: s });
        } catch (e) {
          console.error("Failed to render sticker for", s, e);
        }
      }

      state.canvasCache = canvasItems;

      const grid = document.createElement("div");
      grid.className = "sticker-preview-grid";

      for (const item of canvasItems) {
        const canvas = item.canvas;
        const data = item.data;
        const dataUrl = canvas.toDataURL("image/png");

        const wrapper = document.createElement("div");
        wrapper.className = "sticker-preview-item";

        const img = document.createElement("img");
        img.src = dataUrl;
        img.alt = `Sticker ${data.code} · ${data.ringNumber || "NO-RING"}`;
        img.style.width = "100%";
        img.style.height = "auto";
        img.style.borderRadius = "8px";
        wrapper.appendChild(img);

        const playerDiv = document.createElement("div");
        playerDiv.className = "sticker-player";
        playerDiv.textContent = data.playerName;
        wrapper.appendChild(playerDiv);

        const ringDiv = document.createElement("div");
        ringDiv.className = "sticker-ring";
        ringDiv.style.cssText =
          "font-weight:700;font-size:12px;color:#0a3d30;margin-top:2px;";
        ringDiv.textContent = data.ringNumber
          ? `Ring: ${data.ringNumber}${data.nickname ? ` (${data.nickname})` : ""}`
          : "Ring: — missing —";
        wrapper.appendChild(ringDiv);

        const codeDiv = document.createElement("div");
        codeDiv.className = "sticker-label";
        codeDiv.textContent = `Code: ${data.code}`;
        wrapper.appendChild(codeDiv);

        grid.appendChild(wrapper);
      }

      container.innerHTML = "";
      container.appendChild(grid);
      document.getElementById("sticker-total-count").textContent =
        `${canvasItems.length} stickers`;
    };

    const generateStickerPDF = async (stickers, widthMm) => {
      if (!stickers || stickers.length === 0) {
        app.showModal({
          title: "No Stickers",
          message: "Please generate stickers first.",
          icon: "⚠️",
          iconColor: "#e67e22",
        });
        return null;
      }

      const { jsPDF } = window.jspdf;
      const heightMm = 10;
      const dpi = state.dpi;
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const gap = 2;

      const cols = Math.floor((pageWidth - margin * 2 + gap) / (widthMm + gap));
      const rows = Math.floor(
        (pageHeight - margin * 2 + gap) / (heightMm + gap),
      );

      const doc = new jsPDF("p", "mm", "a4");
      let stickerIndex = 0;

      while (stickerIndex < stickers.length) {
        if (stickerIndex > 0) doc.addPage();

        for (let r = 0; r < rows && stickerIndex < stickers.length; r++) {
          for (let c = 0; c < cols && stickerIndex < stickers.length; c++) {
            const s = stickers[stickerIndex];
            const x = margin + c * (widthMm + gap);
            const y = margin + r * (heightMm + gap);

            const canvas = await renderStickerCanvas(
              s.eventName || state.eventName || "Event",
              s.playerName || "Player",
              s.code,
              widthMm,
              heightMm,
              dpi,
              s.ringNumber || "",
              s.nickname || "",
            );
            const imgData = canvas.toDataURL("image/png");
            doc.addImage(imgData, "PNG", x, y, widthMm, heightMm);
            stickerIndex++;
          }
        }
      }
      return doc;
    };

    this._stickerState = state;

    this.loadStickersForEvent = async function () {
      const select = document.getElementById("sticker-event-select");
      const eventCode = select ? select.value : "";
      if (!eventCode) {
        app.showModal({
          title: "Error",
          message: "Please select an event.",
          icon: "❌",
          iconColor: "#c0392b",
        });
        return;
      }

      try {
        state.isGenerating = true;
        const loadingDiv = document.getElementById("sticker-grid-container");
        if (loadingDiv) {
          loadingDiv.innerHTML = `
            <div class="sticker-loading">
              <div class="spinner"></div>
              <p>Loading stickers...</p>
            </div>
          `;
        }

        const res = await fetchWithAuth(
          `${API_URL}/admin/events/${eventCode}/codes`,
        );

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to fetch codes");
        }

        const data = await res.json();
        if (!data.codes || data.codes.length === 0) {
          if (loadingDiv) {
            loadingDiv.innerHTML = `
              <div class="sticker-empty-state">
                <i class="fas fa-tags" style="font-size:56px; display:block; margin-bottom:12px; color:#ccc;"></i>
                <h3>No Stickers Generated</h3>
                <p>Click the "Generate Stickers" button to create stickers for this event.</p>
              </div>
            `;
          }
          document.getElementById("sticker-total-count").textContent =
            "0 stickers";
          state.isGenerating = false;
          return;
        }

        const stickers = data.codes
          .map((c) => ({
            eventName: data.eventName || "Event",
            playerName: c.playerName || "Unknown Player",
            code: c.code,
            pigeonId: c.pigeonId,
            ringNumber: c.ringNumber || "",
            nickname: c.nickname || "",
            avatarId: c.avatarId || "",
          }))
          .sort((a, b) => {
            const p = (a.playerName || "").localeCompare(b.playerName || "");
            if (p !== 0) return p;
            return (a.ringNumber || "").localeCompare(b.ringNumber || "");
          });

        state.stickers = stickers;
        state.eventId = eventCode;
        state.eventName = data.eventName;

        await renderAllStickers(stickers, state.widthMm);
        state.isGenerating = false;
      } catch (e) {
        console.error("Load stickers error:", e);
        state.isGenerating = false;
        app.showModal({
          title: "Failed to Load Stickers",
          message: e.message || "Unable to load codes. Please try again.",
          icon: "❌",
          iconColor: "#c0392b",
        });
        const container = document.getElementById("sticker-grid-container");
        if (container) container.innerHTML = "";
      }
    };

    this.generateStickers = async function () {
      const select = document.getElementById("sticker-event-select");
      const eventCode = select ? select.value : "";
      if (!eventCode) {
        app.showModal({
          title: "No Event Selected",
          message: "Please select an event first.",
          icon: "⚠️",
          iconColor: "#e67e22",
        });
        return;
      }

      try {
        const res = await fetchWithAuth(
          `${API_URL}/admin/events/${eventCode}/generate-stickers`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          },
        );
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to generate stickers");
        }
        const data = await res.json();
        app.showModal({
          title: "✅ Stickers Generated",
          message: data.message || "Stickers generated successfully.",
          icon: "✅",
          iconColor: "#27ae60",
        });
        this.loadStickersForEvent();
      } catch (e) {
        console.error("Generate stickers error:", e);
        app.showModal({
          title: "Generation Failed",
          message:
            e.message || "Unable to generate stickers. Please try again.",
          icon: "❌",
          iconColor: "#c0392b",
        });
      }
    };

    this.downloadStickerPDF = async function () {
      if (!state.stickers || state.stickers.length === 0) {
        app.showModal({
          title: "No Stickers",
          message: "Generate stickers first before downloading PDF.",
          icon: "⚠️",
          iconColor: "#e67e22",
        });
        return;
      }

      try {
        const doc = await generateStickerPDF(state.stickers, state.widthMm);
        if (doc) {
          doc.save(`stickers_${state.eventId || "event"}.pdf`);
          app.showModal({
            title: "✅ PDF Downloaded",
            message: `PDF with ${state.stickers.length} stickers has been generated.`,
            icon: "✅",
            iconColor: "#27ae60",
          });
        }
      } catch (e) {
        console.error("PDF generation error:", e);
        app.showModal({
          title: "PDF Error",
          message: "Failed to generate PDF. Please try again.",
          icon: "❌",
          iconColor: "#c0392b",
        });
      }
    };

    this.updateStickerWidth = function (val) {
      state.widthMm = Math.min(42, Math.max(22, parseFloat(val) || 42));
      document.getElementById("sticker-width-display").textContent =
        state.widthMm;
      document.getElementById("sticker-width-slider").value = state.widthMm;
      if (state.stickers && state.stickers.length > 0 && state.eventId) {
        this.loadStickersForEvent();
      }
    };

    this.populateStickerSelector = function (events) {
      const select = document.getElementById("sticker-event-select");
      if (!select) return;
      const current = select.value;
      select.innerHTML = '<option value="">-- Select Event --</option>';
      (events || this.allEvents).forEach((e) => {
        const opt = document.createElement("option");
        opt.value = e.code;
        opt.textContent = `${e.name} (${e.code})`;
        select.appendChild(opt);
      });
      if (current) select.value = current;
    };

    this.navigateToStickerGenerator = function (code) {
      if (code) {
        const select = document.getElementById("sticker-event-select");
        if (select) select.value = code;
      }
      this.navigate("sticker-generator");
      setTimeout(() => {
        const select = document.getElementById("sticker-event-select");
        if (select && select.value) {
          this.loadStickersForEvent();
        }
      }, 300);
    };
  },

  populateReviewSelector: function (events) {
    const select = document.getElementById("review-event-select");
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">-- Select Event --</option>';
    (events || this.allEvents).forEach((e) => {
      const opt = document.createElement("option");
      opt.value = e.code;
      opt.textContent = `${e.name} (${e.code})`;
      select.appendChild(opt);
    });
    if (current) select.value = current;
  },

  // ============================================================
  //  ADMIN EVENT REVIEW – FIXED with Certificate Generation
  // ============================================================
  loadAdminReview: async function () {
    const select = document.getElementById("review-event-select");
    const eventCode = select ? select.value : "";
    const container = document.getElementById("review-results");

    if (!eventCode) {
      container.innerHTML = "<p>Select an event to review registrations.</p>";
      return;
    }

    try {
      const res = await fetchWithAuth(
        `${API_URL}/admin/events/${eventCode}/registrations?statuses=draft,confirmed,locked`,
      );
      if (!res.ok) throw new Error("Failed to fetch registrations");
      const data = await res.json();
      const registrations = data.registrations || [];
      const eventData = data.event || {};

      const isResultVerification = eventData.state === "Result Verification";
      const certsGenerated = eventData.certificatesGenerated || false;
      const canGenerate = isResultVerification && !certsGenerated;

      let html = `
        <div style="margin: 12px 0 16px; padding: 12px 16px; background: var(--bg); border-radius: 8px; border-left: 4px solid ${isResultVerification ? "#27ae60" : "#e67e22"};">
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px;">
            <div>
              <span style="font-weight: 600;">Event State:</span>
              <span style="font-weight: 700; color: ${isResultVerification ? "#27ae60" : "#e67e22"};">
                ${eventData.state || "Unknown"}
              </span>
              ${isResultVerification ? " ✅" : ""}
            </div>
            <div>
              <span style="font-weight: 600;">Certificates:</span>
              <span style="font-weight: 700; color: ${certsGenerated ? "#27ae60" : "#e67e22"};">
                ${certsGenerated ? "✅ Generated" : "Not Generated"}
              </span>
            </div>
            ${
              canGenerate
                ? `
              <button class="btn btn-success" onclick="app.generateCertificatesForEvent('${eventCode}')" style="margin-left: auto; padding: 10px 28px; font-size: 15px;">
                <i class="fas fa-file-certificate"></i> Generate Certificates
              </button>
            `
                : ""
            }
            ${
              isResultVerification && certsGenerated
                ? `
              <span style="margin-left: auto; font-size: 14px; color: var(--text-muted);">
                <i class="fas fa-check-circle" style="color: #27ae60;"></i> Certificates already generated
              </span>
            `
                : ""
            }
            ${
              !isResultVerification
                ? `
              <span style="margin-left: auto; font-size: 13px; color: var(--text-muted);">
                <i class="fas fa-info-circle"></i> Event must be in <strong>Result Verification</strong> to generate certificates
              </span>
            `
                : ""
            }
          </div>
        </div>
      `;

      html += `
        <div style="overflow-x:auto; margin-top: 12px;">
          <table class="review-table" style="width:100%; font-size:14px;">
            <thead>
              <tr>
                <th>Player</th>
                <th>Pigeons</th>
                <th>Status</th>
                <th>Valid</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
      `;

      if (registrations.length === 0) {
        html += `<tr><td colspan="5" style="text-align:center; color:#999; padding:20px;">No registrations yet.</td></tr>`;
      } else {
        for (const reg of registrations) {
          const validClass = reg.valid ? "badge-valid" : "badge-invalid";
          let pigeonList = "";
          if (reg.pigeonIds && reg.pigeonIds.length) {
            pigeonList = reg.pigeonIds
              .map((pid, idx) => {
                const ringNum = reg.ringNumbers[idx] || "Unknown";
                const avatarId =
                  reg.avatarIds && reg.avatarIds[idx] ? reg.avatarIds[idx] : "";
                const avatarHTML = avatarId
                  ? getPigeonAvatarSVG(avatarId, 32)
                  : getDefaultPigeonSVG(32);
                return `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0;background:var(--bg);padding:2px 8px 2px 4px;border-radius:12px;border:1px solid var(--border);">
                <span style="width:24px;height:24px;display:inline-block;border-radius:50%;overflow:hidden;">${avatarHTML}</span>
                ${ringNum}
              </span>`;
              })
              .join("");
          } else {
            pigeonList = reg.ringNumbers ? reg.ringNumbers.join(", ") : "N/A";
          }
          html += `
            <tr>
              <td>${reg.playerName}</td>
              <td>${pigeonList}</td>
              <td>${reg.status}</td>
              <td><span class="${validClass}">${reg.valid ? "✅" : "❌"}</span></td>
              <td>
                ${!reg.valid ? `<button class="btn btn-sm btn-danger" onclick="app.removeRegistration('${eventCode}', '${reg.playerId}')">Remove</button>` : ""}
              </td>
            </tr>
          `;
        }
      }
      html += `</tbody></table></div>`;
      container.innerHTML = html;
    } catch (err) {
      console.error("Load admin review error:", err);
      container.innerHTML = `<p style="color:red;">Failed to load registrations.</p>`;
    }
  },

  // ============================================================
  //  CERTIFICATE GENERATION - FIXED
  // ============================================================
  generateCertificatesForEvent: async function (eventCode) {
    if (!eventCode) {
      this.showModal({
        title: "Error",
        message: "No event selected.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }

    if (
      !confirm(
        `Generate certificates for event ${eventCode}? This will create certificates for all pigeons with results.`,
      )
    ) {
      return;
    }

    const button = document.querySelector(
      `button[onclick*="generateCertificatesForEvent('${eventCode}')"]`,
    );
    if (button) {
      button.disabled = true;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    }

    try {
      const res = await fetchWithAuth(
        `${API_URL}/admin/events/${eventCode}/generate-certificates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate certificates");
      }

      const count = data.count || "certificates";
      this.showModal({
        title: "✅ Certificates Generated",
        message: `Successfully generated ${count} certificate${count > 1 || (typeof count === "number" && count > 1) ? "s" : ""} for event ${eventCode}.`,
        icon: "✅",
        iconColor: "#27ae60",
      });

      this.loadAdminReview();
      const certView = document.getElementById("view-admin-certificates");
      if (certView && !certView.classList.contains("hidden")) {
        this.loadAdminCertificates();
      }
      this.fetchAllEvents(true);
    } catch (err) {
      console.error("Certificate generation error:", err);
      this.showModal({
        title: "Generation Failed",
        message:
          err.message ||
          "Unable to generate certificates. Please check that the event has results and is in Result Verification state.",
        icon: "❌",
        iconColor: "#c0392b",
      });
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML =
          '<i class="fas fa-file-certificate"></i> Generate Certificates';
      }
    }
  },

  removeRegistration: async function (eventCode, playerId) {
    if (!confirm(`Remove all registrations for ${playerId} from this event?`))
      return;
    try {
      const res = await fetchWithAuth(
        `${API_URL}/admin/events/${eventCode}/registrations/${playerId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to remove");
      this.loadAdminReview();
      this.showModal({
        title: "Removed",
        message: "Registration removed.",
        icon: "🗑️",
        iconColor: "#c0392b",
      });
    } catch (err) {
      this.showModal({
        title: "Error",
        message: "Could not remove registration.",
        icon: "❌",
        iconColor: "#c0392b",
      });
    }
  },

  setupVisibilityListener() {
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        console.log("👁️ Tab became visible – refreshing data");
        const currentView = document.querySelector(
          ".view-section:not(.hidden)",
        );
        if (currentView) {
          const id = currentView.id;
          if (id === "view-dashboard") this.renderDashboard();
          else if (id === "view-results") this.renderResults();
          else if (id === "view-admin-events") this.renderEvents();
          else if (id === "view-admin-players") this.renderPlayers();
          else if (id === "view-profile") {
            this.loadPlayerStats();
            if (this.currentUser.role === "admin") this.loadAdminStats();
          } else if (id === "view-pigeons") this.loadPigeons();
          else if (id === "view-entries") this.loadOpenEvents();
          else if (id === "view-certificates") this.loadCertificates();
          else if (id === "view-admin-certificates")
            this.loadAdminCertificates();
          else if (id === "view-event-review") this.loadAdminReview();
        }
        this.updateClockDisplay();
      }
    });
  },

  syncServerTime() {
    const clientTime = Date.now();
    fetchWithAuth(`${API_URL}/time`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const serverTime = new Date(data.time).getTime();
        const newOffset = serverTime - clientTime;

        const previousOffset = this.serverTimeOffset;
        if (
          previousOffset !== undefined &&
          Math.abs(newOffset - previousOffset) > 10000
        ) {
          console.warn(
            `⚠️ Suspicious time sync – offset jumped from ${previousOffset}ms to ${newOffset}ms. Ignoring.`,
          );
          this.updateClockDisplay();
          return;
        }

        this.serverTimeOffset = newOffset;
        if (Math.abs(this.serverTimeOffset) > 5000) {
          console.warn(
            `⚠️ Server time offset is ${this.serverTimeOffset}ms – check server clock.`,
          );
        }
        this.updateClockDisplay();
        console.log("✅ Server time synced, offset:", this.serverTimeOffset);
      })
      .catch((err) => {
        console.warn("⚠️ Failed to sync server time, using client time:", err);
        this.serverTimeOffset = 0;
        this.updateClockDisplay();
      });
  },

  getServerTime() {
    return new Date(Date.now() + this.serverTimeOffset);
  },

  updateClockDisplay() {
    const clockElement = document.getElementById("server-clock");
    if (!clockElement) return;
    const now = this.getServerTime();
    const timeStr = now.toLocaleTimeString("en-PH", {
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Manila",
    });
    clockElement.textContent = timeStr;
  },

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
      htmlMessage = false,
      maxWidth = 440,
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
        max-width: ${maxWidth}px;
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

        <div class="custom-modal-message${htmlMessage ? " custom-modal-message--html" : ""}" style="
          font-size: 15px;
          color: #5b6f82;
          line-height: 1.6;
          margin-bottom: ${showButton ? "20px" : "0"};
          white-space: ${htmlMessage ? "normal" : "pre-wrap"};
          word-break: break-word;
          text-align: ${htmlMessage ? "left" : "center"};
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

  showClockInSuccessModal(data) {
    const existingModal = document.getElementById("custom-modal");
    if (existingModal) existingModal.remove();

    const result = data.result || {};
    const pigeon = data.pigeon || {};
    const arrival = result.arrivalTime
      ? new Date(result.arrivalTime)
      : this.getServerTime();
    const distanceKm = Number(data.distance ?? result.distanceKm);
    const speedMpm = Number(data.speed ?? result.speedMPM);
    const flightHours = Number(result.flightTimeHours);
    const hasFlight = Number.isFinite(flightHours) && flightHours >= 0;
    const eventName = data.eventName || result.eventId || "Event";
    const eventCode = result.eventId || "";
    const stickerCode = data.stickerCode || result.clockInCode || "—";
    const ringNumber = pigeon.ringNumber || "—";
    const nickname = (pigeon.nickname || "").trim();
    const playerName =
      result.userName || this.currentUser?.name || "Player";
    const avatarHtml = getPigeonAvatarSVG(pigeon.avatarId, 56);

    const dateLine = arrival.toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const timeLine = arrival.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    const distanceLabel = Number.isFinite(distanceKm)
      ? distanceKm.toFixed(2)
      : "—";
    const speedLabel = Number.isFinite(speedMpm) ? speedMpm.toFixed(2) : "—";
    const flightLabel = hasFlight ? formatFlightHours(flightHours) : "—";

    const modal = document.createElement("div");
    modal.id = "custom-modal";
    modal.className = "clockin-overlay";
    modal.innerHTML = `
      <div class="clockin-card" role="dialog" aria-labelledby="clockin-activity-title">
        <button type="button" class="clockin-close" aria-label="Close">×</button>
        <header class="clockin-hero">
          <div class="clockin-kicker">Clocked</div>
          <h2 id="clockin-activity-title" class="clockin-title">${escapeHtml(eventName)}</h2>
          <p class="clockin-when">${escapeHtml(dateLine)} at ${escapeHtml(timeLine)}</p>
        </header>
        <div class="clockin-athlete">
          <div class="clockin-avatar">${avatarHtml}</div>
          <div class="clockin-athlete-copy">
            <div class="clockin-ring">${escapeHtml(ringNumber)}</div>
            <div class="clockin-sub">${escapeHtml(nickname || "Racing pigeon")} · ${escapeHtml(playerName)}</div>
          </div>
        </div>
        <div class="clockin-stats">
          <div class="clockin-stat">
            <div class="clockin-stat-value">${escapeHtml(distanceLabel)}</div>
            <div class="clockin-stat-label">Distance</div>
            <div class="clockin-stat-unit">km</div>
          </div>
          <div class="clockin-stat">
            <div class="clockin-stat-value">${escapeHtml(flightLabel)}</div>
            <div class="clockin-stat-label">Time</div>
            <div class="clockin-stat-unit">hh:mm:ss</div>
          </div>
          <div class="clockin-stat">
            <div class="clockin-stat-value">${escapeHtml(speedLabel)}</div>
            <div class="clockin-stat-label">Speed</div>
            <div class="clockin-stat-unit">m/min</div>
          </div>
        </div>
        <dl class="clockin-details">
          <div><dt>Sticker</dt><dd>${escapeHtml(stickerCode)}</dd></div>
          <div><dt>Event</dt><dd>${escapeHtml(eventCode || "—")}</dd></div>
        </dl>
        <button type="button" class="clockin-done">Done</button>
      </div>
    `;

    const close = () => modal.remove();
    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });
    modal.querySelector(".clockin-close").addEventListener("click", close);
    modal.querySelector(".clockin-done").addEventListener("click", close);
    document.body.appendChild(modal);
    return modal;
  },

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
          sessionStorage.setItem("wingsync_token", data.token);
          sessionStorage.setItem("wingsync_user", JSON.stringify(data.user));
          this.currentUser = data.user;
          document.getElementById("login-error").style.display = "none";
          this.showApp();
        } else {
          this.showModal({
            title: "Login Failed",
            message:
              data.error || "Invalid User ID or Password. Please try again.",
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
    if (this.clockIntervalId) {
      clearInterval(this.clockIntervalId);
      this.clockIntervalId = null;
    }
    if (this._profileStatsInterval) {
      clearInterval(this._profileStatsInterval);
      this._profileStatsInterval = null;
    }
    if (this._pigeonRefreshInterval) {
      clearInterval(this._pigeonRefreshInterval);
      this._pigeonRefreshInterval = null;
    }
    if (this._adminStatsInterval) {
      clearInterval(this._adminStatsInterval);
      this._adminStatsInterval = null;
    }
    if (this._adminCertRefreshInterval) {
      clearInterval(this._adminCertRefreshInterval);
      this._adminCertRefreshInterval = null;
    }
    this.cleanupScanner();
    this.currentUser = null;
    sessionStorage.removeItem("wingsync_user");
    sessionStorage.removeItem("wingsync_token");
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
      document.getElementById("player-stats-container").classList.add("hidden");
      document
        .getElementById("admin-stats-container")
        .classList.remove("hidden");

      if (this._adminCertRefreshInterval)
        clearInterval(this._adminCertRefreshInterval);
      this._adminCertRefreshInterval = setInterval(() => {
        if (document.hidden) return;
        const currentView = document.querySelector(
          ".view-section:not(.hidden)",
        );
        if (currentView && currentView.id === "view-admin-certificates") {
          this.loadAdminCertificates();
        }
      }, BACKGROUND_POLL_MS);
    } else {
      adminEls.forEach((el) => el.classList.add("hidden"));
      playerEls.forEach((el) => el.classList.remove("hidden"));
      document
        .getElementById("player-clock-in-area")
        .classList.remove("hidden");
      document.getElementById("admin-stats-container").classList.add("hidden");
      this.loadPlayerStats();
    }

    if (document.getElementById("server-clock")) {
      if (this.clockIntervalId) clearInterval(this.clockIntervalId);
      this.clockIntervalId = setInterval(() => this.updateClockDisplay(), 1000);
    }

    this.navigate("dashboard");
    this.loadProfile();
    this.fetchAllEvents(true);

    if (this.currentUser.role === "admin") {
      this.loadAdminStats();
      this.loadAdminCertificates();
    }
  },

  fetchAllEvents(force = false) {
    if (!force && this._eventsInFlight) return this._eventsInFlight;
    if (
      !force &&
      Array.isArray(this.allEvents) &&
      this.allEvents.length &&
      Date.now() - this._lastEventsFetch < LIVE_POLL_MS
    ) {
      return Promise.resolve(this.allEvents);
    }
    this._eventsInFlight = fetchWithAuth(`${API_URL}/events/all`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((events) => {
        if (!Array.isArray(events)) events = [];
        this.allEvents = events;
        this.eventLookup = {};
        events.forEach((e) => {
          this.eventLookup[e.code] = e;
        });
        this._lastEventsFetch = Date.now();
        this.populateReviewSelector();
        this.populateStickerSelector(events);
        this._populateAdminCertEventFilter();
        return events;
      })
      .catch((err) => {
        console.error("Failed to fetch events for lookup:", err);
        this.allEvents = [];
        this.eventLookup = {};
      })
      .finally(() => {
        this._eventsInFlight = null;
      });
    return this._eventsInFlight;
  },

  fetchRegistrationCounts() {
    return fetchWithAuth(`${API_URL}/events/registrations-summary`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((summary) => {
        if (!Array.isArray(summary)) summary = [];
        this.registrationCounts = {};
        summary.forEach((item) => {
          this.registrationCounts[item.eventId] = item.pigeonCount || 0;
        });
      })
      .catch((err) => {
        console.warn("Failed to fetch registration counts:", err);
        this.registrationCounts = {};
      });
  },

  navigate(view) {
    this.stopAutoRefresh();
    if (this._profileStatsInterval) {
      clearInterval(this._profileStatsInterval);
      this._profileStatsInterval = null;
    }
    if (this._pigeonRefreshInterval) {
      clearInterval(this._pigeonRefreshInterval);
      this._pigeonRefreshInterval = null;
    }
    if (this._adminStatsInterval) {
      clearInterval(this._adminStatsInterval);
      this._adminStatsInterval = null;
    }

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
    if (view === "admin-certificates") {
      this.loadAdminCertificates();
      this._populateAdminCertEventFilter();
    }
    if (view === "results") this.initResultsView();
    if (view === "logs") this.renderLogs();
    if (view === "profile") {
      this.loadProfile();
      if (this.currentUser.role === "player") {
        this.loadPlayerStats();
        this._profileStatsInterval = setInterval(() => {
          if (document.hidden) return;
          const currentView = document.querySelector(
            ".view-section:not(.hidden)",
          );
          if (currentView && currentView.id === "view-profile") {
            this.loadPlayerStats();
          } else {
            clearInterval(this._profileStatsInterval);
            this._profileStatsInterval = null;
          }
        }, BACKGROUND_POLL_MS);
      } else {
        this.loadAdminStats();
        this._adminStatsInterval = setInterval(() => {
          if (document.hidden) return;
          const currentView = document.querySelector(
            ".view-section:not(.hidden)",
          );
          if (currentView && currentView.id === "view-profile") {
            this.loadAdminStats();
          } else {
            clearInterval(this._adminStatsInterval);
            this._adminStatsInterval = null;
          }
        }, BACKGROUND_POLL_MS);
      }
    }
    if (view === "pigeons") {
      this.loadPigeons();
      this._pigeonRefreshInterval = setInterval(() => {
        if (document.hidden) return;
        const currentView = document.querySelector(
          ".view-section:not(.hidden)",
        );
        if (currentView && currentView.id === "view-pigeons") {
          this.loadPigeons();
        } else {
          clearInterval(this._pigeonRefreshInterval);
          this._pigeonRefreshInterval = null;
        }
      }, BACKGROUND_POLL_MS);
    }
    if (view === "entries") {
      this.loadOpenEvents();
    }
    if (view === "certificates") {
      this.loadCertificates();
    }
    if (view === "event-review") {
      this.populateReviewSelector();
      this.loadAdminReview();
    }
    if (view === "sticker-generator") {
      this.populateStickerSelector(this.allEvents);
      const regCode = document.getElementById("register-event-code")?.value;
      if (regCode) {
        const select = document.getElementById("sticker-event-select");
        if (select) select.value = regCode;
        setTimeout(() => this.loadStickersForEvent(), 300);
      }
    }

    if (view === "dashboard" || view === "results") {
      this.startAutoRefresh();
    }
  },

  toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("open");
  },

  toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute("data-theme") || "light";
    const newTheme = currentTheme === "light" ? "dark" : "light";
    html.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    const icon = document.getElementById("theme-icon");
    if (icon) {
      icon.className = newTheme === "light" ? "fas fa-moon" : "fas fa-sun";
    }
  },

  loadTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    const icon = document.getElementById("theme-icon");
    if (icon) {
      icon.className = savedTheme === "light" ? "fas fa-moon" : "fas fa-sun";
    }
  },

  startAutoRefresh() {
    if (this.refreshIntervalId) clearInterval(this.refreshIntervalId);
    this.refreshIntervalId = setInterval(() => {
      if (document.hidden) return;
      const currentView = document.querySelector(".view-section:not(.hidden)");
      if (currentView) {
        const id = currentView.id;
        if (id === "view-results") {
          this.renderResults();
        } else if (id === "view-dashboard") {
          this.renderDashboard();
        }
      }
    }, LIVE_POLL_MS);
  },

  stopAutoRefresh() {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  },

  renderDashboard() {
    if (this._dashboardLoading) return;
    this._dashboardLoading = true;
    fetchWithAuth(`${API_URL}/dashboard`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((payload) => {
        let activeEvents = payload.activeEvents;
        let openEvents = payload.openEvents;
        let summary = payload.summary;
        if (!Array.isArray(activeEvents)) activeEvents = [];
        if (!Array.isArray(openEvents)) openEvents = [];
        if (!Array.isArray(summary)) summary = [];

        this.registrationCounts = {};
        summary.forEach((item) => {
          this.registrationCounts[item.eventId] = item.pigeonCount || 0;
        });

        const summaryMap = {};
        summary.forEach((item) => {
          summaryMap[item.eventId] = item.playerCount || 0;
        });

        const table = document.querySelector("#active-events-table");
        const isAdmin = this.currentUser.role === "admin";

        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        if (isAdmin) {
          const thPlayers = document.createElement("th");
          thPlayers.textContent = "Players";
          headerRow.appendChild(thPlayers);
        }
        const thName = document.createElement("th");
        thName.textContent = "Event Name";
        headerRow.appendChild(thName);
        const thRelease = document.createElement("th");
        thRelease.textContent = "Release Time";
        headerRow.appendChild(thRelease);
        const thStatus = document.createElement("th");
        thStatus.textContent = "Status";
        headerRow.appendChild(thStatus);
        const thAction = document.createElement("th");
        thAction.textContent = "Action";
        headerRow.appendChild(thAction);
        thead.appendChild(headerRow);
        table.innerHTML = "";
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        const allDisplayEvents = [...activeEvents, ...openEvents];
        const unique = new Map();
        allDisplayEvents.forEach((e) => unique.set(e.code, e));
        const events = Array.from(unique.values());

        events.forEach((e) => {
          const row = document.createElement("tr");
          if (isAdmin) {
            const tdPlayers = document.createElement("td");
            tdPlayers.setAttribute("data-label", "Players");
            tdPlayers.textContent = summaryMap[e.code] || 0;
            row.appendChild(tdPlayers);
          }
          const tdName = document.createElement("td");
          tdName.setAttribute("data-label", "Name");
          tdName.textContent = e.name;
          row.appendChild(tdName);

          const tdRelease = document.createElement("td");
          tdRelease.setAttribute("data-label", "Release");
          tdRelease.textContent = new Date(e.releaseTime).toLocaleString();
          row.appendChild(tdRelease);

          const tdStatus = document.createElement("td");
          tdStatus.setAttribute("data-label", "Status");
          tdStatus.textContent = e.state || e.status;
          row.appendChild(tdStatus);

          const tdAction = document.createElement("td");
          tdAction.setAttribute("data-label", "Action");
          if (!isAdmin) {
            const viewBtn = document.createElement("button");
            viewBtn.className = "btn btn-sm btn-primary";
            viewBtn.textContent = "View";
            viewBtn.onclick = () => this.openEventDetailsModal(e.code);
            tdAction.appendChild(viewBtn);
          } else {
            const reviewBtn = document.createElement("button");
            reviewBtn.className = "btn btn-sm btn-primary";
            reviewBtn.textContent = "Review";
            reviewBtn.onclick = () => {
              this.navigate("event-review");
              const select = document.getElementById("review-event-select");
              if (select) select.value = e.code;
              this.loadAdminReview();
            };
            tdAction.appendChild(reviewBtn);
          }
          row.appendChild(tdAction);
          tbody.appendChild(row);
        });
        table.appendChild(tbody);
      })
      .catch((err) => {
        console.error("Dashboard error:", err);
        const table = document.querySelector("#active-events-table");
        table.innerHTML = `<tbody><tr><td colspan="5" style="text-align:center; color:#999; padding:20px;">Could not load events. Please refresh.</td></tr></tbody>`;
      })
      .finally(() => {
        this._dashboardLoading = false;
      });
  },

  clockIn() {
    const code = document.getElementById("clock-in-code").value.trim();
    if (!code) {
      this.showModal({
        title: "Missing Code",
        message: "Please enter or scan the pigeon sticker code.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }

    this._isScanning = false;

    fetchWithAuth(`${API_URL}/clockin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: this.currentUser.id,
        eventCode: code,
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

        this.showClockInSuccessModal(data);

        document.getElementById("clock-in-code").value = "";
        this.renderDashboard();

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

  loadPlayerStats() {
    const userId = this.currentUser.id;
    fetchWithAuth(`${API_URL}/users/player/${userId}/stats`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((stats) => {
        document.getElementById("stats-total-pigeons").textContent =
          stats.totalPigeons;
        document.getElementById("stats-events").textContent =
          stats.eventsParticipated;
        document.getElementById("stats-wins").textContent = stats.wins;
        document.getElementById("stats-podiums").textContent = stats.podiums;
        document.getElementById("stats-avg-speed").textContent =
          stats.averageSpeed.toFixed(2);
        document.getElementById("stats-best-speed").textContent =
          stats.bestSpeed.toFixed(2);
        document.getElementById("stats-win-rate").textContent =
          stats.winRate.toFixed(1) + "%";
        const joinedEl = document.getElementById("stats-races-joined");
        if (joinedEl) joinedEl.textContent = stats.racesJoined || 0;
        const certEl = document.getElementById("stats-total-certificates");
        if (certEl) certEl.textContent = stats.totalCertificates || 0;
        if (stats.seasonRanking && stats.seasonRanking.rank) {
          let rankEl = document.querySelector(".season-rank");
          if (!rankEl) {
            const container = document.querySelector(".stats-grid");
            if (container) {
              rankEl = document.createElement("div");
              rankEl.className =
                "stat-metric stat-metric-highlight stat-metric-full season-rank";
              container.appendChild(rankEl);
            }
          }
          if (rankEl) {
            rankEl.innerHTML = `
              <div class="stat-metric-content">
                <span class="stat-metric-label">Current Season Rank</span>
                <span class="stat-metric-value stat-metric-value-accent">#${stats.seasonRanking.rank}</span>
                <span class="stat-metric-unit">${stats.seasonRanking.totalPoints} pts</span>
              </div>
            `;
          }
        }
        document
          .getElementById("player-stats-container")
          .classList.remove("hidden");
      })
      .catch((err) => {
        console.error("Failed to load player stats:", err);
        document
          .getElementById("player-stats-container")
          .classList.add("hidden");
      });
  },

  loadAdminStats() {
    Promise.all([
      fetchWithAuth(`${API_URL}/users/players`).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }),
      fetchWithAuth(`${API_URL}/events/all`).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }),
    ])
      .then(([players, events]) => {
        if (!Array.isArray(players)) players = [];
        if (!Array.isArray(events)) events = [];

        const totalPlayers = players.length;
        const totalEvents = events.length;

        const openStates = [
          "Registration Open",
          "Registration Closed",
          "Sticker Generated",
          "Ready for Release",
          "Live Race",
        ];
        const closedStates = ["Result Verification"];

        let openEvents = 0,
          closedEvents = 0;
        events.forEach((e) => {
          const state = e.state || "";
          if (openStates.includes(state)) {
            openEvents++;
          } else if (closedStates.includes(state)) {
            closedEvents++;
          }
        });

        document.getElementById("admin-total-players").textContent =
          totalPlayers;
        document.getElementById("admin-total-events").textContent = totalEvents;
        document.getElementById("admin-open-events").textContent = openEvents;
        document.getElementById("admin-closed-events").textContent =
          closedEvents;
      })
      .catch((err) => {
        console.error("Failed to load admin stats:", err);
        document.getElementById("admin-total-players").textContent = "Error";
        document.getElementById("admin-total-events").textContent = "Error";
        document.getElementById("admin-open-events").textContent = "Error";
        document.getElementById("admin-closed-events").textContent = "Error";
      });
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

    fetchWithAuth(`${API_URL}/users/update-password`, {
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
            message:
              data.error || "Failed to update password. Please try again.",
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

  initResultsView() {
    this.fetchAllEvents()
      .then(() => this.fetchRegistrationCounts())
      .then(() => this.setupResultsView())
      .catch((err) => {
        console.error("Results init error:", err);
        this.allEvents = [];
        this.setupResultsView();
      });
  },

  buildEventLookup(events) {
    this.eventLookup = {};
    events.forEach((e) => {
      this.eventLookup[e.code] = e;
    });
  },

  setupResultsView() {
    if (this.allEvents.length > 0) {
      if (!this.selectedEventCode) {
        this.selectedEventCode = this.allEvents[0].code;
      }
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
      return nameMatch || codeMatch;
    });

    if (filteredEvents.length === 0) {
      this.selectedEventCode = null;
    } else {
      if (!filteredEvents.some((e) => e.code === this.selectedEventCode)) {
        this.selectedEventCode = filteredEvents[0].code;
      }
    }
    this.renderResults();
  },

  refreshResults() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    const updatedEl = document.getElementById("results-last-updated");
    if (updatedEl) updatedEl.textContent = `Last updated: ${timeStr}`;
    this.renderResults();
  },

  async renderResults() {
    if (this._isRendering) return;
    this._isRendering = true;

    try {
      const tbody = document.querySelector("#results-table tbody");

      if (!this.selectedEventCode) {
        tbody.innerHTML = "";
        this.clearAnalyticsSections();
        this._isRendering = false;
        return;
      }

      if (!this.eventLookup[this.selectedEventCode]) {
        await this.fetchAllEvents(true);
        if (!this.eventLookup[this.selectedEventCode]) {
          this.selectedEventCode = null;
          tbody.innerHTML = "";
          this.clearAnalyticsSections();
          this._isRendering = false;
          return;
        }
      }

      const event = this.eventLookup[this.selectedEventCode];
      if (event) {
        document.getElementById("race-name").textContent = event.name;
        document.getElementById("race-release-point").innerHTML =
          `<span class="coord">${event.lat.toFixed(6)}, ${event.lng.toFixed(6)}</span>`;
        document.getElementById("race-release-time").textContent = new Date(
          event.releaseTime,
        ).toLocaleString();

        const statusBadge = document.getElementById("race-status");
        const status = event.state
          ? event.state.toLowerCase()
          : event.status.toLowerCase();
        statusBadge.textContent = event.state || event.status;
        statusBadge.className = `race-status-badge ${status}`;
      } else {
        document.getElementById("race-name").textContent = "—";
        document.getElementById("race-release-point").innerHTML =
          '<span class="coord">—</span>';
        document.getElementById("race-release-time").textContent = "—";
        document.getElementById("race-status").textContent = "—";
        document.getElementById("race-status").className = "race-status-badge";
      }

      const res = await fetchWithAuth(
        `${API_URL}/results/${this.selectedEventCode}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let results = await res.json();
      if (!Array.isArray(results)) results = [];

      tbody.innerHTML = "";
      if (results.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 8;
        td.style.textAlign = "center";
        td.style.color = "#999";
        td.style.padding = "20px";
        td.textContent = "No results yet for this event.";
        tr.appendChild(td);
        tbody.appendChild(tr);
        this.clearAnalyticsSections();
        this._isRendering = false;
        return;
      }

      const safeResults = results.map((r) => ({
        ...r,
        distanceKm: toNumber(r.distanceKm),
        speedMPM: toNumber(r.speedMPM),
        flightTimeHours: toNumber(r.flightTimeHours),
        arrivalTime: new Date(r.arrivalTime),
      }));

      const winner = safeResults[0];
      document.getElementById("champion-name").textContent = winner.userName;
      document.getElementById("champion-code").textContent = winner.clockInCode;
      document.getElementById("champion-speed").innerHTML =
        `${winner.speedMPM.toFixed(2)} <span class="unit">m/min</span>`;
      document.getElementById("champion-flight-time").textContent =
        formatFlightHours(winner.flightTimeHours);
      document.getElementById("champion-distance").innerHTML =
        `${winner.distanceKm.toFixed(2)} <span class="unit">km</span>`;

      const clocked = safeResults.length;
      const totalRegistered =
        this.registrationCounts[this.selectedEventCode] || 0;
      const missing = Math.max(0, totalRegistered - clocked);
      const completionRate =
        totalRegistered > 0 ? (clocked / totalRegistered) * 100 : 0;
      const participants = new Set(safeResults.map((r) => r.userId)).size;
      const speeds = safeResults.map((r) => r.speedMPM);
      const avgSpeed =
        speeds.length > 0
          ? speeds.reduce((a, b) => a + b, 0) / speeds.length
          : 0;
      const highest = speeds.length > 0 ? Math.max(...speeds) : 0;
      const lowest = speeds.length > 0 ? Math.min(...speeds) : 0;
      const avgFlight =
        safeResults.length > 0
          ? safeResults.reduce((a, b) => a + b.flightTimeHours, 0) /
            safeResults.length
          : 0;
      const winningMargin =
        safeResults.length > 1
          ? safeResults[0].speedMPM - safeResults[1].speedMPM
          : 0;

      document.getElementById("stat-released").textContent = totalRegistered;
      document.getElementById("stat-clocked").textContent = clocked;
      document.getElementById("stat-missing").textContent = missing;
      document.getElementById("stat-completion").textContent =
        completionRate.toFixed(1) + "%";
      document.getElementById("stat-participants").textContent = participants;
      document.getElementById("stat-avg-speed").innerHTML =
        `${avgSpeed.toFixed(2)} <span class="unit">m/min</span>`;
      document.getElementById("stat-highest-speed").innerHTML =
        `${highest.toFixed(2)} <span class="unit">m/min</span>`;
      document.getElementById("stat-lowest-speed").innerHTML =
        `${lowest.toFixed(2)} <span class="unit">m/min</span>`;
      document.getElementById("stat-avg-flight-time").textContent =
        formatFlightHours(avgFlight);
      document.getElementById("stat-winning-margin").innerHTML =
        `${winningMargin.toFixed(2)} <span class="unit">m/min</span>`;

      const fastest =
        safeResults.length > 0
          ? safeResults.reduce((a, b) => (a.speedMPM > b.speedMPM ? a : b))
          : null;
      const firstArrival =
        safeResults.length > 0
          ? safeResults.reduce((a, b) =>
              a.arrivalTime < b.arrivalTime ? a : b,
            )
          : null;
      const lastArrival =
        safeResults.length > 0
          ? safeResults.reduce((a, b) =>
              a.arrivalTime > b.arrivalTime ? a : b,
            )
          : null;
      const longestDist =
        safeResults.length > 0
          ? safeResults.reduce((a, b) => (a.distanceKm > b.distanceKm ? a : b))
          : null;
      const closestFinish =
        safeResults.length > 1
          ? safeResults[0].speedMPM - safeResults[1].speedMPM
          : 0;
      const highestSpeed = fastest;

      document.getElementById("hl-fastest-bird").textContent = fastest
        ? `${fastest.userName} (${fastest.speedMPM.toFixed(2)} m/min)`
        : "—";
      document.getElementById("hl-first-arrival").textContent = firstArrival
        ? `${firstArrival.userName} (${firstArrival.arrivalTime.toLocaleTimeString()})`
        : "—";
      document.getElementById("hl-last-arrival").textContent = lastArrival
        ? `${lastArrival.userName} (${lastArrival.arrivalTime.toLocaleTimeString()})`
        : "—";
      document.getElementById("hl-longest-dist").innerHTML =
        '— <span class="unit">km</span>';
      document.getElementById("hl-closest-finish").textContent =
        closestFinish > 0 ? `${closestFinish.toFixed(2)} m/min` : "—";
      document.getElementById("hl-highest-speed").innerHTML = highestSpeed
        ? `${highestSpeed.speedMPM.toFixed(2)} <span class="unit">m/min</span>`
        : '— <span class="unit">m/min</span>';

      safeResults.forEach((r, i) => {
        const tr = document.createElement("tr");

        const tdRank = document.createElement("td");
        tdRank.setAttribute("data-label", "Rank");
        let rankClass = "";
        if (i === 0) {
          tdRank.textContent = "🥇";
          rankClass = "rank-gold";
        } else if (i === 1) {
          tdRank.textContent = "🥈";
          rankClass = "rank-silver";
        } else if (i === 2) {
          tdRank.textContent = "🥉";
          rankClass = "rank-bronze";
        } else {
          tdRank.textContent = i + 1;
          rankClass = "rank-number";
        }
        tdRank.className = rankClass;
        tr.appendChild(tdRank);

        const tdPlayer = document.createElement("td");
        tdPlayer.setAttribute("data-label", "Player");
        tdPlayer.textContent = r.userName;
        tr.appendChild(tdPlayer);

        const tdPigeon = document.createElement("td");
        tdPigeon.setAttribute("data-label", "Pigeon");
        const avatarId = r.pigeonId?.avatarId || "";
        const avatarHTML = avatarId
          ? getPigeonAvatarSVG(avatarId, 28)
          : getDefaultPigeonSVG(28);
        tdPigeon.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="width:32px;height:32px;display:inline-block;border-radius:50%;overflow:hidden;flex-shrink:0;border:1px solid var(--border);">${avatarHTML}</span>
            <span>${r.pigeonId?.nickname || "N/A"}</span>
          </div>
        `;
        tr.appendChild(tdPigeon);

        const tdRingNumber = document.createElement("td");
        tdRingNumber.setAttribute("data-label", "Ring Number");
        tdRingNumber.textContent = r.pigeonId?.ringNumber || "N/A";
        tr.appendChild(tdRingNumber);

        const tdDist = document.createElement("td");
        tdDist.setAttribute("data-label", "Air Dist");
        tdDist.textContent = r.distanceKm.toFixed(2) + " km";
        tr.appendChild(tdDist);

        const tdArr = document.createElement("td");
        tdArr.setAttribute("data-label", "Arr");
        tdArr.textContent = r.arrivalTime.toLocaleTimeString();
        tr.appendChild(tdArr);

        const tdFlight = document.createElement("td");
        tdFlight.setAttribute("data-label", "Flight Hrs");
        tdFlight.textContent = formatFlightHours(r.flightTimeHours);
        tr.appendChild(tdFlight);

        const tdSpeed = document.createElement("td");
        tdSpeed.setAttribute("data-label", "Speed m/min");
        tdSpeed.className = "speed-cell";
        tdSpeed.textContent = r.speedMPM.toFixed(4);
        tr.appendChild(tdSpeed);

        if (i === 0) tr.className = "winner-row";
        tbody.appendChild(tr);
      });

      const updatedEl = document.getElementById("results-last-updated");
      if (updatedEl) {
        const now = new Date();
        updatedEl.textContent = `Last updated: ${now.toLocaleTimeString()}`;
      }
    } catch (err) {
      console.error("Results error:", err);
      const tbody = document.querySelector("#results-table tbody");
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="8" style="text-align:center; color:#999; padding:20px;">Error loading results.</td></tr>';
      }
      this.clearAnalyticsSections();
    } finally {
      this._isRendering = false;
    }
  },

  clearAnalyticsSections() {
    document.getElementById("champion-name").textContent = "—";
    document.getElementById("champion-code").textContent = "—";
    document.getElementById("champion-speed").innerHTML =
      '— <span class="unit">m/min</span>';
    document.getElementById("champion-flight-time").textContent = "—";
    document.getElementById("champion-distance").innerHTML =
      '— <span class="unit">km</span>';

    document.getElementById("stat-released").textContent = "0";
    document.getElementById("stat-clocked").textContent = "0";
    document.getElementById("stat-missing").textContent = "0";
    document.getElementById("stat-completion").textContent = "0%";
    document.getElementById("stat-participants").textContent = "0";
    document.getElementById("stat-avg-speed").innerHTML =
      '0.00 <span class="unit">m/min</span>';
    document.getElementById("stat-highest-speed").innerHTML =
      '0.00 <span class="unit">m/min</span>';
    document.getElementById("stat-lowest-speed").innerHTML =
      '0.00 <span class="unit">m/min</span>';
    document.getElementById("stat-avg-flight-time").textContent = "0:00";
    document.getElementById("stat-winning-margin").innerHTML =
      '0.00 <span class="unit">m/min</span>';

    document.getElementById("hl-fastest-bird").textContent = "—";
    document.getElementById("hl-first-arrival").textContent = "—";
    document.getElementById("hl-last-arrival").textContent = "—";
    document.getElementById("hl-longest-dist").innerHTML =
      '— <span class="unit">km</span>';
    document.getElementById("hl-closest-finish").textContent = "—";
    document.getElementById("hl-highest-speed").innerHTML =
      '— <span class="unit">m/min</span>';
  },

  renderLogs() {
    fetchWithAuth(`${API_URL}/logs`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((logs) => {
        if (!Array.isArray(logs)) logs = [];
        const list = document.getElementById("log-list");
        list.innerHTML = "";

        logs.forEach((log) => {
          const li = document.createElement("li");
          li.style.padding = "10px";
          li.style.borderBottom = "1px solid #eee";

          const date = new Date(log.createdAt);
          const displayTime = date.toLocaleString("en-PH", {
            timeZone: "Asia/Manila",
            hour12: true,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

          const small = document.createElement("small");
          small.textContent = `[${displayTime}]`;
          li.appendChild(small);
          li.appendChild(document.createElement("br"));
          const textSpan = document.createElement("span");
          textSpan.textContent = log.message;
          li.appendChild(textSpan);
          list.appendChild(li);
        });
      })
      .catch((err) => {
        console.error("Logs error:", err);
        const list = document.getElementById("log-list");
        list.innerHTML =
          '<li style="padding:10px;color:#999;">Could not load logs.</li>';
      });
  },

  renderPlayers() {
    fetchWithAuth(`${API_URL}/users/players`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((users) => {
        if (!Array.isArray(users)) users = [];
        this.allPlayers = users;
        this.filterPlayers();
      })
      .catch((err) => {
        console.error("Players error:", err);
        this.allPlayers = [];
        this.filterPlayers();
      });
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

    const tbody = document.querySelector("#players-table tbody");
    tbody.innerHTML = "";
    filtered.forEach((u) => {
      const tr = document.createElement("tr");
      const tdId = document.createElement("td");
      tdId.setAttribute("data-label", "ID");
      tdId.textContent = u.id;
      tr.appendChild(tdId);

      const tdName = document.createElement("td");
      tdName.setAttribute("data-label", "Name");
      tdName.textContent = u.name;
      tr.appendChild(tdName);

      const tdLoc = document.createElement("td");
      tdLoc.setAttribute("data-label", "Lat/Lng");
      tdLoc.textContent = `${u.lat.toFixed(6)}, ${u.lng.toFixed(6)}`;
      tr.appendChild(tdLoc);

      const tdContact = document.createElement("td");
      tdContact.setAttribute("data-label", "Contact");
      tdContact.textContent = u.contact;
      tr.appendChild(tdContact);

      const tdActions = document.createElement("td");
      tdActions.setAttribute("data-label", "Actions");
      const editBtn = document.createElement("button");
      editBtn.className = "btn btn-primary btn-sm";
      editBtn.textContent = "✏️ Edit";
      editBtn.onclick = () => app.openEditPlayerModal(u.id);
      tdActions.appendChild(editBtn);
      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-danger btn-sm";
      delBtn.textContent = "🗑️ Delete";
      delBtn.onclick = () => app.deletePlayer(u.id);
      tdActions.appendChild(delBtn);
      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });
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

    fetchWithAuth(`${API_URL}/users/player`, {
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
    fetchWithAuth(`${API_URL}/users/player/${playerId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
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
        document.getElementById("edit-p-lat").value = user.lat || "";
        document.getElementById("edit-p-lng").value = user.lng || "";

        const modal = document.getElementById("modal-edit-player");
        modal.classList.add("show");

        setTimeout(() => {
          const lat = user.lat || defaultLat;
          const lng = user.lng || defaultLng;
          if (!editPlayerMap) {
            editPlayerMap = createGoogleMap(
              "edit-player-map",
              "edit-player-search-box",
              "edit-player-coords-text",
              "edit-player",
            );
            setTimeout(() => {
              setMarker(
                "edit-player",
                lat,
                lng,
                editPlayerMap,
                "edit-player-coords-text",
              );
              selectedEditPlayerLat = lat;
              selectedEditPlayerLng = lng;
            }, 300);
          } else {
            google.maps.event.trigger(editPlayerMap, "resize");
            editPlayerMap.setCenter({ lat, lng });
            editPlayerMap.setZoom(17);
            setMarker(
              "edit-player",
              lat,
              lng,
              editPlayerMap,
              "edit-player-coords-text",
            );
            selectedEditPlayerLat = lat;
            selectedEditPlayerLng = lng;
          }
        }, 500);
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
    let lat = document.getElementById("edit-p-lat").value
      ? parseFloat(document.getElementById("edit-p-lat").value)
      : null;
    let lng = document.getElementById("edit-p-lng").value
      ? parseFloat(document.getElementById("edit-p-lng").value)
      : null;
    if (selectedEditPlayerLat !== null && selectedEditPlayerLng !== null) {
      lat = selectedEditPlayerLat;
      lng = selectedEditPlayerLng;
    }

    if (!name) {
      this.showModal({
        title: "Incomplete",
        message: "Name is required.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }
    if (lat !== null && (lat < -90 || lat > 90)) {
      this.showModal({
        title: "Invalid Latitude",
        message: "Latitude must be between -90 and 90.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }
    if (lng !== null && (lng < -180 || lng > 180)) {
      this.showModal({
        title: "Invalid Longitude",
        message: "Longitude must be between -180 and 180.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }

    const payload = { name, contact };
    if (lat !== null && lng !== null) {
      payload.lat = parseFloat(lat.toFixed(6));
      payload.lng = parseFloat(lng.toFixed(6));
    }

    fetchWithAuth(`${API_URL}/users/player/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          this.closeModal("modal-edit-player");
          this.renderPlayers();
          if (editPlayerMarker) {
            editPlayerMarker.setMap(null);
            editPlayerMarker = null;
          }
          editPlayerMap = null;
          selectedEditPlayerLat = null;
          selectedEditPlayerLng = null;
          this.showModal({
            title: "✅ Player Updated",
            message: "Player updated successfully!",
            icon: "✅",
            iconColor: "#27ae60",
          });
        } else {
          this.showModal({
            title: "Update Failed",
            message: data.error || "Failed to update player.",
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
    fetchWithAuth(`${API_URL}/users/player/${playerId}`, { method: "DELETE" })
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

  renderEvents() {
    fetchWithAuth(`${API_URL}/events/all`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((events) => {
        if (!Array.isArray(events)) events = [];
        this.allEvents = events;
        this.buildEventLookup(events);

        return fetchWithAuth(`${API_URL}/events/registrations-summary`)
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          })
          .then((summary) => {
            if (!Array.isArray(summary)) summary = [];
            const summaryMap = {};
            summary.forEach((item) => {
              summaryMap[item.eventId] = item.playerCount || 0;
            });
            this._eventsWithSummary = events.map((e) => ({
              ...e,
              playerCount: summaryMap[e.code] || 0,
            }));
            this.filterEvents();
          })
          .catch((err) => {
            console.warn(
              "Failed to fetch registration summary, showing 0 players",
              err,
            );
            this._eventsWithSummary = events.map((e) => ({
              ...e,
              playerCount: 0,
            }));
            this.filterEvents();
          });
      })
      .catch((err) => {
        console.error("Events error:", err);
        this._eventsWithSummary = [];
        this.filterEvents();
      });
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
          return nameMatch || codeMatch;
        })
      : [];

    const tbody = document.querySelector("#admin-events-table tbody");
    tbody.innerHTML = "";
    filtered.forEach((e) => {
      const tr = document.createElement("tr");
      const tdPlayers = document.createElement("td");
      tdPlayers.setAttribute("data-label", "Players");
      tdPlayers.textContent = e.playerCount;
      tr.appendChild(tdPlayers);

      const tdName = document.createElement("td");
      tdName.setAttribute("data-label", "Name");
      tdName.textContent = e.name;
      tr.appendChild(tdName);

      const tdPoint = document.createElement("td");
      tdPoint.setAttribute("data-label", "Point");
      tdPoint.textContent = `${e.lat.toFixed(6)}, ${e.lng.toFixed(6)}`;
      tr.appendChild(tdPoint);

      const tdActions = document.createElement("td");
      tdActions.setAttribute("data-label", "Actions");

      const manageBtn = document.createElement("button");
      manageBtn.className = "btn btn-sm btn-primary";
      manageBtn.textContent = "⚙️ Manage Registration";
      manageBtn.onclick = () => app.openManageRegistrationModal(e.code);
      tdActions.appendChild(manageBtn);

      const toggleBtn = document.createElement("button");
      toggleBtn.className = "btn btn-danger btn-sm";
      toggleBtn.textContent = e.status === "Active" ? "🔒 Close" : "🔓 Re-open";
      toggleBtn.onclick = () => app.toggleEvent(e.code);
      tdActions.appendChild(toggleBtn);

      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-danger btn-sm";
      delBtn.textContent = "🗑️ Delete";
      delBtn.onclick = () => app.deleteEvent(e.code);
      tdActions.appendChild(delBtn);

      const exportBtn = document.createElement("button");
      exportBtn.className = "btn btn-sm btn-secondary admin-export-pdf-btn";
      exportBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Export PDF';
      exportBtn.onclick = () => app.exportEventResultsPDF(e.code, exportBtn);
      tdActions.appendChild(exportBtn);

      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });
  },

  async _loadPdfLogoDataUrl() {
    const candidates = ["logo.png", "./logo.png"];
    for (const path of candidates) {
      try {
        const resp = await fetch(path);
        if (!resp.ok) continue;
        const blob = await resp.blob();
        return await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch {
        /* try next path */
      }
    }
    return null;
  },

  _pdfTruncateText(doc, text, maxWidth) {
    const value = String(text ?? "—");
    if (doc.getTextWidth(value) <= maxWidth) return value;
    let trimmed = value;
    while (trimmed.length > 1 && doc.getTextWidth(`${trimmed}…`) > maxWidth) {
      trimmed = trimmed.slice(0, -1);
    }
    return `${trimmed}…`;
  },

  async exportEventResultsPDF(eventCode, triggerBtn = null) {
    if (!window.jspdf) {
      this.showModal({
        title: "PDF Unavailable",
        message: "PDF library is not loaded. Please refresh the page.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }

    let event =
      this.eventLookup?.[eventCode] ||
      (this.allEvents || []).find((e) => e.code === eventCode) ||
      (this._eventsWithSummary || []).find((e) => e.code === eventCode);

    if (!event) {
      try {
        const res = await fetchWithAuth(`${API_URL}/events/all`);
        if (res.ok) {
          const events = await res.json();
          event = (events || []).find((e) => e.code === eventCode);
        }
      } catch {
        /* handled below */
      }
    }

    if (!event) {
      this.showModal({
        title: "Event Not Found",
        message: "Could not load event details for export.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }

    const exportBtn =
      triggerBtn ||
      document.querySelector(
        `#admin-events-table button.admin-export-pdf-btn`,
      );
    const prevBtnHtml = exportBtn ? exportBtn.innerHTML : "";
    if (exportBtn) {
      exportBtn.disabled = true;
      exportBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Exporting...';
    }

    try {
      const res = await fetchWithAuth(
        `${API_URL}/results/${eventCode}/pigeons`,
      );
      if (!res.ok) throw new Error("Failed to fetch event results");
      const results = await res.json();
      if (!Array.isArray(results) || results.length === 0) {
        this.showModal({
          title: "No Results",
          message:
            "This event has no clocked results yet. Export is available once birds are clocked in.",
          icon: "ℹ️",
          iconColor: "#e67e22",
        });
        return;
      }

      await this._generateEventResultsPDF(event, results);
      this.showModal({
        title: "PDF Downloaded",
        message: `Event results for "${event.name}" have been exported.`,
        icon: "✅",
        iconColor: "#27ae60",
      });
    } catch (err) {
      console.error("Export PDF error:", err);
      this.showModal({
        title: "Export Failed",
        message: err.message || "Could not generate the PDF.",
        icon: "❌",
        iconColor: "#c0392b",
      });
    } finally {
      if (exportBtn) {
        exportBtn.disabled = false;
        exportBtn.innerHTML = prevBtnHtml;
      }
    }
  },

  async _generateEventResultsPDF(event, results) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 10;
    const footerY = pageH - 8;
    const logoData = await this._loadPdfLogoDataUrl();

    const cols = [
      { key: "rank", label: "Rank", w: 14, align: "center" },
      { key: "player", label: "Player Name", w: 42 },
      { key: "pigeon", label: "Pigeon Name", w: 36 },
      { key: "ring", label: "Ring Number", w: 38 },
      { key: "dist", label: "Air Dist (km)", w: 24, align: "right" },
      { key: "arrival", label: "Arrival", w: 30, align: "center" },
      { key: "flight", label: "Flight Hrs", w: 24, align: "center" },
      { key: "speed", label: "Speed (m/min)", w: 28, align: "right" },
    ];

    const tableWidth = cols.reduce((sum, c) => sum + c.w, 0);
    const tableX = margin + (pageW - margin * 2 - tableWidth) / 2;
    const rowH = 7.5;
    const headerBandH = 8;

    const releaseStr = event.releaseTime
      ? new Date(event.releaseTime).toLocaleString("en-PH", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "—";
    const releasePoint = `${Number(event.lat).toFixed(6)}, ${Number(event.lng).toFixed(6)}`;
    const generatedStr = new Date().toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    const drawPageHeader = () => {
      let y = margin;

      if (logoData) {
        doc.addImage(logoData, "PNG", margin, y, 24, 24);
      }

      const headerTextX = logoData ? margin + 28 : margin;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(15, 49, 38);
      doc.text("EVENT RESULTS", headerTextX, y + 9);

      doc.setFontSize(10);
      doc.setTextColor(42, 122, 98);
      doc.text("MALINAO RACING PIGEON CLUB", headerTextX, y + 15);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("— MRPC —", headerTextX, y + 19);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(event.name || "Unknown Event", pageW - margin, y + 8, {
        align: "right",
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80, 90, 100);
      doc.text(`Event ID: ${event.code}`, pageW - margin, y + 14, {
        align: "right",
      });

      if (event.state || event.status) {
        doc.text(
          `Status: ${event.state || event.status}`,
          pageW - margin,
          y + 19,
          { align: "right" },
        );
      }

      y += 28;
      doc.setDrawColor(42, 122, 98);
      doc.setLineWidth(0.6);
      doc.line(margin, y, pageW - margin, y);
      y += 5;

      doc.setFontSize(8.5);
      doc.setTextColor(60, 70, 80);
      doc.text(`Release: ${releaseStr}`, margin, y);
      doc.text(`Release Point: ${releasePoint}`, margin + 88, y);
      doc.text(`Birds Clocked: ${results.length}`, margin + 188, y);
      y += 4.5;
      doc.text(`Exported: ${generatedStr}`, margin, y);

      y += 5;
      doc.setDrawColor(200, 210, 220);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageW - margin, y);
      return y + 3;
    };

    const drawTableHead = (startY) => {
      doc.setFillColor(42, 122, 98);
      doc.rect(tableX, startY, tableWidth, headerBandH, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);

      let x = tableX;
      cols.forEach((col) => {
        const tx =
          col.align === "right"
            ? x + col.w - 2
            : col.align === "center"
              ? x + col.w / 2
              : x + 2;
        doc.text(col.label, tx, startY + 5.3, {
          align: col.align || "left",
        });
        x += col.w;
      });
      return startY + headerBandH;
    };

    const drawRow = (row, startY, indexOnPage) => {
      if (indexOnPage % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(tableX, startY, tableWidth, rowH, "F");
      }

      const rank = row.rank ?? indexOnPage + 1;
      const player = row.ownerName || row.userName || "—";
      const pigeon = (row.nickname || "").trim() || "—";
      const ring = row.ringNumber || row.pigeonId?.ringNumber || "—";
      const dist = `${toNumber(row.distanceKm).toFixed(2)}`;
      const arrival = row.arrivalTime
        ? new Date(row.arrivalTime).toLocaleString("en-PH", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
          })
        : "—";
      const flight = formatFlightHours(toNumber(row.flightTimeHours));
      const speed = toNumber(row.speedMPM).toFixed(4);

      const values = [String(rank), player, pigeon, ring, dist, arrival, flight, speed];

      doc.setFont("helvetica", rank <= 3 ? "bold" : "normal");
      doc.setFontSize(7.5);

      if (rank === 1) doc.setTextColor(180, 130, 0);
      else if (rank === 2) doc.setTextColor(90, 100, 110);
      else if (rank === 3) doc.setTextColor(160, 90, 40);
      else doc.setTextColor(40, 50, 60);

      let x = tableX;
      values.forEach((val, i) => {
        const col = cols[i];
        const pad = 2;
        const maxW = col.w - pad * 2;
        doc.setFont("helvetica", i === 0 && rank <= 3 ? "bold" : "normal");
        const text = this._pdfTruncateText(doc, val, maxW);
        const tx =
          col.align === "right"
            ? x + col.w - pad
            : col.align === "center"
              ? x + col.w / 2
              : x + pad;
        if (i > 0) doc.setTextColor(40, 50, 60);
        doc.text(text, tx, startY + 5.2, { align: col.align || "left" });
        x += col.w;
      });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(tableX, startY + rowH, tableX + tableWidth, startY + rowH);
      return startY + rowH;
    };

    const drawFooter = (pageNum, totalPages) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(130, 140, 150);
      doc.text(
        "Malinao Racing Pigeon Club · WingSync Event Results",
        pageW / 2,
        footerY,
        { align: "center" },
      );
      doc.text(`Page ${pageNum} of ${totalPages}`, pageW - margin, footerY, {
        align: "right",
      });
    };

    const sorted = [...results].sort(
      (a, b) => toNumber(a.rank || 9999) - toNumber(b.rank || 9999) || toNumber(b.speedMPM) - toNumber(a.speedMPM),
    );

    let pageNum = 1;
    let y = drawPageHeader();
    y = drawTableHead(y);
    let rowsOnPage = 0;
    const maxY = footerY - 6;

    sorted.forEach((row, idx) => {
      if (y + rowH > maxY) {
        drawFooter(pageNum, 0);
        doc.addPage();
        pageNum += 1;
        y = drawPageHeader();
        y = drawTableHead(y);
        rowsOnPage = 0;
      }
      y = drawRow(row, y, rowsOnPage);
      rowsOnPage += 1;
    });

    const totalPages = pageNum;
    for (let p = 1; p <= totalPages; p += 1) {
      doc.setPage(p);
      drawFooter(p, totalPages);
    }

    const safeName = (event.name || event.code || "event")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 40);
    doc.save(`MRPC_EventResults_${safeName}_${event.code}.pdf`);
  },

  openManageRegistrationModal(eventCode) {
    const event = this.eventLookup[eventCode];
    if (!event) {
      this.showModal({
        title: "Error",
        message: "Event not found.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }
    document.getElementById("manage-event-code").value = eventCode;
    document.getElementById("manage-state-select").value =
      event.state || "Draft";
    document.getElementById("modal-manage-registration").classList.add("show");
  },

  saveRegistrationSettings() {
    const eventCode = document.getElementById("manage-event-code").value;
    const state = document.getElementById("manage-state-select").value;

    const payload = { state };

    fetchWithAuth(
      `${API_URL}/admin/events/${eventCode}/registration-settings`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          this.closeModal("modal-manage-registration");
          this.renderEvents();
          this.renderDashboard();
          this.fetchAllEvents(true);
          this.showModal({
            title: "✅ Registration Settings Updated",
            message: `Event state: ${data.event.state}`,
            icon: "✅",
            iconColor: "#27ae60",
          });
        } else {
          this.showModal({
            title: "Update Failed",
            message: data.error || "Failed to update registration settings.",
            icon: "❌",
            iconColor: "#c0392b",
          });
        }
      })
      .catch((err) => {
        this.showModal({
          title: "Connection Error",
          message: "Unable to connect to the server.",
          icon: "⚠️",
          iconColor: "#e67e22",
        });
      });
  },

  toggleEvent(code) {
    fetchWithAuth(`${API_URL}/events/${code}/toggle`, { method: "PUT" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          this.renderEvents();
          this.renderDashboard();
          this.fetchAllEvents(true);
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
    fetchWithAuth(`${API_URL}/events/${eventCode}`, { method: "DELETE" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          this.renderEvents();
          this.renderDashboard();
          this.fetchAllEvents(true);
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
    const time = document.getElementById("modal-e-time").value;
    const deadline = document.getElementById("modal-e-deadline").value;

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
    if (!deadline) {
      this.showModal({
        title: "Incomplete",
        message: "Registration deadline is required.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }

    const releaseDate = new Date(time);
    const deadlineDate = new Date(deadline);
    if (deadlineDate >= releaseDate) {
      this.showModal({
        title: "Invalid Deadline",
        message: "Registration deadline must be before the release time.",
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

    fetchWithAuth(`${API_URL}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        releaseTime: new Date(time).toISOString(),
        registrationDeadline: new Date(deadline).toISOString(),
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
          this.fetchAllEvents(true);
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

  generateEventCodes() {
    this.showModal({
      title: "Codes Not Needed",
      message: "Event codes are now generated per player during registration.",
      icon: "ℹ️",
      iconColor: "#2a7a62",
    });
  },

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
    const now = new Date();
    const defaultDeadline = new Date(now.getTime() + 30 * 60 * 1000);
    document.getElementById("modal-e-deadline").value = defaultDeadline
      .toISOString()
      .slice(0, 16);

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
    if (id === "modal-edit-player") {
      if (editPlayerMarker) {
        editPlayerMarker.setMap(null);
        editPlayerMarker = null;
      }
      if (editPlayerMap) {
        const container = document.getElementById("edit-player-map");
        if (container) container.innerHTML = "";
        editPlayerMap = null;
      }
      selectedEditPlayerLat = null;
      selectedEditPlayerLng = null;
    }
    [
      "modal-pigeon",
      "modal-register-event",
      "modal-edit-registration",
      "modal-certificate",
      "modal-event-details",
      "modal-manage-registration",
    ].forEach((modalId) => {
      const el = document.getElementById(modalId);
      if (el) el.classList.remove("show");
    });
    document.getElementById(id).classList.remove("show");
  },

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

        let map = null;
        let coordsTextId = "";
        if (mapType === "player") {
          map = playerMap;
          coordsTextId = "player-coords-text";
        } else if (mapType === "event") {
          map = eventMap;
          coordsTextId = "event-coords-text";
        } else if (mapType === "edit-player") {
          map = editPlayerMap;
          coordsTextId = "edit-player-coords-text";
        }
        if (map) {
          map.setCenter({ lat, lng });
          map.setZoom(18);
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
    toggleElement.innerHTML = isPassword
      ? '<i class="fas fa-eye-slash"></i>'
      : '<i class="far fa-eye"></i>';
  },

  // ============================================================
  //  PIGEON MANAGEMENT - FIXED AVATAR RENDERING
  // ============================================================
  openPigeonModal(pigeonId = null) {
    const modal = document.getElementById("modal-pigeon");
    modal.classList.add("show");
    const title = document.getElementById("pigeon-modal-title");
    if (pigeonId) {
      title.textContent = "Edit Pigeon";
      fetchWithAuth(`${API_URL}/pigeons/${pigeonId}`)
        .then((res) => res.json())
        .then((pigeon) => {
          document.getElementById("pigeon-id").value = pigeon._id;
          document.getElementById("pigeon-ring").value = pigeon.ringNumber;
          document.getElementById("pigeon-ring").disabled = true;
          document.getElementById("pigeon-nickname").value =
            pigeon.nickname || "";
          document.getElementById("pigeon-gender").value =
            pigeon.gender || "Unknown";
          document.getElementById("pigeon-color").value = pigeon.color || "";
          document.getElementById("pigeon-birthyear").value =
            pigeon.birthYear || "";
          document.getElementById("pigeon-photo").value = pigeon.photo || "";
          const selectedAvatarId = pigeon.avatarId || "";
          this.renderAvatarGrid(selectedAvatarId);
        })
        .catch((err) => {
          this.showModal({
            title: "Error",
            message: "Failed to load pigeon.",
            icon: "❌",
            iconColor: "#c0392b",
          });
        });
    } else {
      title.textContent = "Add Pigeon";
      document.getElementById("pigeon-id").value = "";
      document.getElementById("pigeon-ring").disabled = false;
      document.getElementById("pigeon-ring").value = "";
      document.getElementById("pigeon-nickname").value = "";
      document.getElementById("pigeon-gender").value = "Unknown";
      document.getElementById("pigeon-color").value = "";
      document.getElementById("pigeon-birthyear").value = "";
      document.getElementById("pigeon-photo").value = "";
      this.renderAvatarGrid("");
    }
  },

  renderAvatarGrid(selectedId) {
    const container = document.getElementById("avatar-grid-container");
    if (!container) return;

    let html = `<div class="avatar-grid">`;
    PIGEON_AVATARS.forEach((avatar) => {
      const isSelected = avatar.id === selectedId;
      const previewHTML = getAvatarPreviewHTML(avatar, 52);
      html += `
        <div class="avatar-option ${isSelected ? "selected" : ""}" 
             data-avatar-id="${avatar.id}"
             onclick="app.selectAvatar('${avatar.id}')"
             title="${avatar.name}">
          <div class="avatar-preview">${previewHTML}</div>
          <span class="avatar-name">${avatar.name}</span>
          ${isSelected ? '<span class="avatar-check">✓</span>' : ""}
        </div>
      `;
    });
    html += `</div>`;
    container.innerHTML = html;

    if (selectedId) {
      document.getElementById("selected-avatar-id").value = selectedId;
    } else {
      document.getElementById("selected-avatar-id").value = "";
    }

    this.updateAvatarPreview(selectedId);
  },

  selectAvatar(avatarId) {
    document.querySelectorAll(".avatar-option").forEach((el) => {
      el.classList.remove("selected");
      const check = el.querySelector(".avatar-check");
      if (check) check.remove();
    });
    const selectedEl = document.querySelector(
      `.avatar-option[data-avatar-id="${avatarId}"]`,
    );
    if (selectedEl) {
      selectedEl.classList.add("selected");
      const check = document.createElement("span");
      check.className = "avatar-check";
      check.textContent = "✓";
      selectedEl.appendChild(check);
    }
    document.getElementById("selected-avatar-id").value = avatarId;

    this.updateAvatarPreview(avatarId);
  },

  updateAvatarPreview(avatarId) {
    const previewContainer = document.getElementById(
      "avatar-preview-container",
    );
    if (!previewContainer) return;
    if (avatarId) {
      const avatar = PIGEON_AVATARS.find((a) => a.id === avatarId);
      if (avatar && avatar.image) {
        previewContainer.innerHTML = `<img src="${avatar.image}" alt="${avatar.name}" style="width:80px;height:80px;object-fit:cover;border-radius:50%;display:block;background:#f0ece8;">`;
        return;
      }
    }
    previewContainer.innerHTML = getDefaultPigeonSVG(80);
  },

  savePigeon() {
    const id = document.getElementById("pigeon-id").value;
    const ringNumber = document
      .getElementById("pigeon-ring")
      .value.trim()
      .toUpperCase();
    const nickname = document.getElementById("pigeon-nickname").value.trim();
    const gender = document.getElementById("pigeon-gender").value;
    const color = document.getElementById("pigeon-color").value.trim();
    const birthYear = parseInt(
      document.getElementById("pigeon-birthyear").value,
    );
    const photo = document.getElementById("pigeon-photo").value.trim();
    const avatarId = document.getElementById("selected-avatar-id").value || "";

    if (!ringNumber) {
      this.showModal({
        title: "Error",
        message: "Ring number is required.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }

    const payload = {
      ringNumber,
      nickname,
      gender,
      color,
      birthYear,
      photo,
      avatarId,
    };
    const url = id ? `${API_URL}/pigeons/${id}` : `${API_URL}/pigeons`;
    const method = id ? "PUT" : "POST";

    fetchWithAuth(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          this.closeModal("modal-pigeon");
          this.loadPigeons();
          this.showModal({
            title: "✅ Success",
            message: `Pigeon ${id ? "updated" : "created"} successfully.`,
            icon: "✅",
            iconColor: "#27ae60",
          });
        } else {
          this.showModal({
            title: "Error",
            message: data.error || "Failed to save pigeon.",
            icon: "❌",
            iconColor: "#c0392b",
          });
        }
      })
      .catch((err) => {
        this.showModal({
          title: "Error",
          message: "Connection error.",
          icon: "❌",
          iconColor: "#c0392b",
        });
      });
  },

  loadPigeons() {
    fetchWithAuth(`${API_URL}/pigeons`)
      .then((res) => res.json())
      .then((pigeons) => {
        const container = document.getElementById("pigeons-list");
        if (!pigeons || pigeons.length === 0) {
          container.innerHTML = `<div class="pigeon-empty">You have no pigeons registered. <button class="btn btn-primary" onclick="app.openPigeonModal()">Add one now</button></div>`;
          return;
        }
        let html = '<div class="pigeons-grid">';
        pigeons.forEach((p) => {
          const statusClass = p.status === "Active" ? "" : "inactive";
          const avatarId = p.avatarId || "";
          const avatarHTML = avatarId
            ? getPigeonAvatarSVG(avatarId, 60)
            : getDefaultPigeonSVG(60);
          html += `
            <div class="pigeon-card">
              <div class="pigeon-avatar-wrapper">
                <span class="pigeon-avatar">${avatarHTML}</span>
              </div>
              <div class="ring">${p.ringNumber}</div>
              <div><strong>${p.nickname || "No nickname"}</strong></div>
              <div>${p.gender || "Unknown"} • ${p.color || "N/A"}</div>
              <div>Born: ${p.birthYear || "N/A"}</div>
              <div class="status ${statusClass}">${p.status}</div>
              <div style="margin-top:8px;">
                <button class="btn btn-sm btn-primary" onclick="app.openPigeonModal('${p._id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="app.deletePigeon('${p._id}')">Delete</button>
                <button class="btn btn-sm btn-secondary" onclick="app.viewPigeonStats('${p._id}')">Stats</button>
              </div>
            </div>
          `;
        });
        html += "</div>";
        container.innerHTML = html;
      })
      .catch((err) => {
        document.getElementById("pigeons-list").innerHTML =
          `<p>Failed to load pigeons.</p>`;
      });
  },

  deletePigeon(id) {
    if (
      !confirm(
        "Delete this pigeon? This cannot be undone if it's in an active event.",
      )
    )
      return;
    fetchWithAuth(`${API_URL}/pigeons/${id}`, { method: "DELETE" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          this.loadPigeons();
          this.showModal({
            title: "🗑️ Deleted",
            message: "Pigeon deleted.",
            icon: "🗑️",
            iconColor: "#c0392b",
          });
        } else {
          this.showModal({
            title: "Error",
            message: data.error || "Failed to delete.",
            icon: "❌",
            iconColor: "#c0392b",
          });
        }
      });
  },

  viewPigeonStats(id) {
    fetchWithAuth(`${API_URL}/pigeons/${id}/stats`)
      .then((res) => res.json())
      .then((stats) => {
        const avatarId = stats.avatarId || "";
        const avatarHTML = avatarId
          ? getPigeonAvatarSVG(avatarId, 48)
          : getDefaultPigeonSVG(48);

        const ring = this._escapeCertHtml(stats.ringNumber || "Unknown ring");
        const nick = (stats.nickname || "").trim();
        const nickLine = nick
          ? `<div class="pigeon-stats-nick">${this._escapeCertHtml(nick)}</div>`
          : `<div class="pigeon-stats-nick pigeon-stats-nick--empty">No nickname</div>`;

        const metaParts = [];
        if (stats.color) metaParts.push(this._escapeCertHtml(stats.color));
        if (stats.gender) metaParts.push(this._escapeCertHtml(stats.gender));
        if (stats.birthYear) metaParts.push(String(stats.birthYear));
        const metaLine =
          metaParts.length > 0
            ? `<div class="pigeon-stats-meta">${metaParts.join(" · ")}</div>`
            : "";

        const totalRaces = stats.totalRaces ?? 0;
        const wins = stats.wins ?? 0;
        const podiums = stats.podiums ?? 0;
        const bestSpeed = Number(stats.bestSpeed) || 0;
        const avgSpeed = Number(stats.averageSpeed) || 0;

        const history = (stats.raceHistory || []).slice(0, 5);
        const historyHtml =
          history.length > 0
            ? history
                .map((r) => {
                  const eventName = this._escapeCertHtml(
                    r.eventName || "Unknown Event",
                  );
                  const rank = r.rank;
                  let rankClass = "pigeon-stats-rank";
                  let rankText = rank ? `#${rank}` : "—";
                  if (rank === 1) rankClass += " pigeon-stats-rank--gold";
                  else if (rank === 2) rankClass += " pigeon-stats-rank--silver";
                  else if (rank === 3) rankClass += " pigeon-stats-rank--bronze";

                  const speed = Number(r.speed) || 0;
                  const dateStr = r.date
                    ? new Date(r.date).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "";

                  return `<li class="pigeon-stats-history-item">
                    <div class="pigeon-stats-history-main">
                      <span class="pigeon-stats-history-event">${eventName}</span>
                      ${dateStr ? `<span class="pigeon-stats-history-date">${this._escapeCertHtml(dateStr)}</span>` : ""}
                    </div>
                    <div class="pigeon-stats-history-stats">
                      <span class="${rankClass}">${this._escapeCertHtml(rankText)}</span>
                      <span class="pigeon-stats-speed">${speed.toFixed(2)} m/min</span>
                    </div>
                  </li>`;
                })
                .join("")
            : `<li class="pigeon-stats-history-empty">No race history yet. Enter an event to start building stats.</li>`;

        const certs = stats.certificates || [];
        const certsHtml =
          certs.length > 0
            ? `<div class="pigeon-stats-section">
                <div class="pigeon-stats-section-title">Certificates</div>
                <ul class="pigeon-stats-cert-list">
                  ${certs
                    .slice(0, 3)
                    .map((c) => {
                      const eventName = this._escapeCertHtml(
                        c.eventName || "Unknown",
                      );
                      const rank = c.rank ? `#${c.rank}` : "—";
                      return `<li class="pigeon-stats-cert-item">
                        <i class="fas fa-certificate" aria-hidden="true"></i>
                        <span>${eventName}</span>
                        <span class="pigeon-stats-cert-rank">${this._escapeCertHtml(rank)}</span>
                      </li>`;
                    })
                    .join("")}
                </ul>
              </div>`
            : "";

        const html = `
          <div class="pigeon-stats-modal">
            <div class="pigeon-stats-header">
              <span class="pigeon-stats-avatar">${avatarHTML}</span>
              <div class="pigeon-stats-identity">
                <div class="pigeon-stats-ring">${ring}</div>
                ${nickLine}
                ${metaLine}
              </div>
            </div>

            <div class="pigeon-stats-grid">
              <div class="pigeon-stats-card">
                <span class="pigeon-stats-card-value">${totalRaces}</span>
                <span class="pigeon-stats-card-label">Races</span>
              </div>
              <div class="pigeon-stats-card pigeon-stats-card--highlight">
                <span class="pigeon-stats-card-value">${wins}</span>
                <span class="pigeon-stats-card-label">Wins</span>
              </div>
              <div class="pigeon-stats-card">
                <span class="pigeon-stats-card-value">${podiums}</span>
                <span class="pigeon-stats-card-label">Podiums</span>
              </div>
            </div>

            <div class="pigeon-stats-speed-row">
              <div class="pigeon-stats-speed-item">
                <span class="pigeon-stats-speed-icon" aria-hidden="true"><i class="fas fa-bolt"></i></span>
                <div class="pigeon-stats-speed-info">
                  <span class="pigeon-stats-speed-label">Best speed</span>
                  <span class="pigeon-stats-speed-value">${bestSpeed.toFixed(2)} <small>m/min</small></span>
                </div>
              </div>
              <div class="pigeon-stats-speed-item">
                <span class="pigeon-stats-speed-icon" aria-hidden="true"><i class="fas fa-chart-line"></i></span>
                <div class="pigeon-stats-speed-info">
                  <span class="pigeon-stats-speed-label">Average</span>
                  <span class="pigeon-stats-speed-value">${avgSpeed.toFixed(2)} <small>m/min</small></span>
                </div>
              </div>
            </div>

            <div class="pigeon-stats-section">
              <div class="pigeon-stats-section-title">Recent races</div>
              <ul class="pigeon-stats-history">${historyHtml}</ul>
            </div>

            ${certsHtml}
          </div>
        `;

        this.showModal({
          title: "Pigeon Career Stats",
          message: html,
          icon: "📊",
          iconColor: "#2a7a62",
          htmlMessage: true,
          maxWidth: 500,
        });
      })
      .catch((err) => {
        this.showModal({
          title: "Error",
          message: "Failed to load stats.",
          icon: "❌",
          iconColor: "#c0392b",
        });
      });
  },

  loadOpenEvents() {
    fetchWithAuth(`${API_URL}/events/open`)
      .then((res) => res.json())
      .then((events) => {
        const container = document.getElementById("entries-container");
        if (!events || events.length === 0) {
          container.innerHTML = `<p>No open events for registration at the moment.</p>`;
          return;
        }
        return Promise.all(
          events.map((e) =>
            fetchWithAuth(`${API_URL}/events/${e.code}/registrations/my`)
              .then((r) => r.json())
              .then((data) => ({ event: e, registration: data.registration }))
              .catch(() => ({ event: e, registration: null })),
          ),
        ).then((rows) => {
          let html = `<h3>Open Events</h3>`;
          rows.forEach(({ event: e, registration }) => {
            const hasEntry = !!registration;
            const joinLabel = hasEntry ? "Manage Entry" : "Join Race";
            const joinClass = hasEntry ? "btn-primary" : "btn-success";
            const entryBadge = hasEntry
              ? `<span class="entry-registered-badge">${registration.pigeonIds?.length || 0} entered</span>`
              : "";
            html += `
            <div class="entry-item">
              <div><strong>${e.name}</strong> (${e.code}) ${entryBadge}<br><small>Release: ${new Date(e.releaseTime).toLocaleString()}</small></div>
              <div>
                <button class="btn btn-sm ${joinClass}" onclick="app.openRegisterModalNew('${e.code}')">${joinLabel}</button>
                <button class="btn btn-sm btn-secondary" onclick="app.checkMyRegistration('${e.code}')">My Entry</button>
              </div>
            </div>
          `;
          });
          container.innerHTML = html;
        });
      })
      .catch((err) => {
        document.getElementById("entries-container").innerHTML =
          `<p>Failed to load events.</p>`;
      });
  },

  checkMyRegistration(eventCode) {
    fetchWithAuth(`${API_URL}/events/${eventCode}/registrations/my`)
      .then((res) => res.json())
      .then((data) => {
        const reg = data.registration;
        if (!reg) {
          this.showModal({
            title: "No Entry",
            message: "You have not registered for this event yet.",
            icon: "ℹ️",
            iconColor: "#2a7a62",
          });
          return;
        }

        const status = (reg.status || "draft").toLowerCase();
        const statusLabel =
          status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ");
        const statusClass = `entry-status entry-status--${status.replace(/\s+/g, "-")}`;

        const pigeons = reg.pigeonIds || [];
        const pigeonItems =
          pigeons.length > 0
            ? pigeons
                .map((p) => {
                  const avatarId = p.avatarId || "";
                  const avatarHTML = avatarId
                    ? getPigeonAvatarSVG(avatarId, 36)
                    : getDefaultPigeonSVG(36);
                  const ring = this._escapeCertHtml(
                    p.ringNumber || "Unknown ring",
                  );
                  const nick = (p.nickname || "").trim();
                  const sub = nick
                    ? `<span class="entry-pigeon-nick">${this._escapeCertHtml(nick)}</span>`
                    : "";
                  return `<li class="entry-pigeon-item">
                  <span class="entry-pigeon-avatar">${avatarHTML}</span>
                  <span class="entry-pigeon-info">
                    <span class="entry-pigeon-ring">${ring}</span>
                    ${sub}
                  </span>
                </li>`;
                })
                .join("")
            : `<li class="entry-pigeon-empty">No pigeons on this entry.</li>`;

        const registeredAt = reg.registrationDate
          ? new Date(reg.registrationDate).toLocaleString("en-PH", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })
          : "—";

        const eventLabel = this._escapeCertHtml(reg.eventId || eventCode);

        const html = `
          <div class="entry-detail-modal">
            <p class="entry-detail-lead">Your registration for</p>
            <div class="entry-detail-event">${eventLabel}</div>
            <div class="entry-detail-row">
              <span class="entry-detail-label">Status</span>
              <span class="${statusClass}">${this._escapeCertHtml(statusLabel)}</span>
            </div>
            <div class="entry-detail-section">
              <div class="entry-detail-label entry-detail-label--section">Registered pigeons</div>
              <ul class="entry-pigeon-list">${pigeonItems}</ul>
            </div>
            <div class="entry-detail-footer">
              <i class="fas fa-clock" aria-hidden="true"></i>
              <span>Registered ${this._escapeCertHtml(registeredAt)}</span>
            </div>
          </div>
        `;

        this.showModal({
          title: "My Entry",
          message: html,
          icon: "📋",
          iconColor: "#2a7a62",
          htmlMessage: true,
          maxWidth: 480,
        });
      });
  },

  _updateRegistrationSelectionSummary() {
    const checked = document.querySelectorAll(
      "#pigeon-select-list .pigeon-checkbox:checked",
    );
    const summary = document.getElementById("reg-selection-summary");
    if (summary) {
      const n = checked.length;
      summary.textContent =
        n === 1 ? "1 pigeon selected" : `${n} pigeons selected`;
    }
    const notice = document.getElementById("reg-inline-notice");
    if (notice) notice.classList.add("hidden");
  },

  _setRegistrationModalState(event, existingReg) {
    const hasEntry = !!existingReg;
    const codeEl = document.getElementById("reg-event-code");
    if (codeEl) codeEl.dataset.hasEntry = hasEntry ? "1" : "0";

    const titleEl = document.getElementById("reg-modal-title");
    if (titleEl) {
      titleEl.textContent = hasEntry ? "Manage Entry" : "Register for Event";
    }

    const saveLabel = document.getElementById("reg-save-label");
    if (saveLabel) {
      saveLabel.textContent = hasEntry ? "Update Entry" : "Save Entry";
    }

    const withdrawBtn = document.getElementById("reg-withdraw-btn");
    if (withdrawBtn) withdrawBtn.classList.toggle("hidden", !hasEntry);

    const statusEl = document.getElementById("reg-entry-status");
    if (statusEl) {
      if (hasEntry) {
        const status = (existingReg.status || "draft").toLowerCase();
        const count = existingReg.pigeonIds?.length || 0;
        statusEl.classList.remove("hidden");
        statusEl.innerHTML = `<span class="register-status-badge register-status-badge--${this._escapeCertHtml(status.replace(/\s+/g, "-"))}">${this._escapeCertHtml(status.charAt(0).toUpperCase() + status.slice(1))}</span> Current entry · ${count} pigeon${count === 1 ? "" : "s"}`;
      } else {
        statusEl.classList.add("hidden");
        statusEl.innerHTML = "";
      }
    }

    const meta = document.getElementById("reg-event-meta");
    if (meta && event) {
      const parts = [];
      if (event.releaseTime) {
        parts.push(
          `Release: ${new Date(event.releaseTime).toLocaleString()}`,
        );
      }
      if (event.registrationDeadline) {
        parts.push(
          `Closes: ${new Date(event.registrationDeadline).toLocaleString()}`,
        );
      }
      meta.textContent = parts.join(" · ");
    }

    const notice = document.getElementById("reg-inline-notice");
    if (notice) {
      notice.classList.add("hidden");
      notice.textContent = "";
    }
  },

  openRegisterModalNew(eventCode) {
    const joinBtn = document.querySelector(
      `#entries-container .btn-sm[onclick*="${eventCode}"]`,
    );
    const joinBtnLabel = joinBtn ? joinBtn.textContent : "";
    if (joinBtn) {
      joinBtn.disabled = true;
      joinBtn.textContent = "Loading...";
    }

    Promise.all([
      fetchWithAuth(`${API_URL}/events/all`).then((r) => r.json()),
      fetchWithAuth(`${API_URL}/pigeons`).then((r) => r.json()),
      fetchWithAuth(`${API_URL}/events/${eventCode}/registrations/my`).then(
        (r) => r.json(),
      ),
    ])
      .then(([events, pigeons, existingReg]) => {
        const event = events.find((e) => e.code === eventCode);
        if (!event) throw new Error("Event not found");

        if (event.state !== "Registration Open") {
          this.showModal({
            title: "Registration Closed",
            message:
              "This event is no longer accepting entries. You cannot register, edit, or remove an entry.",
            icon: "🔒",
            iconColor: "#e67e22",
          });
          return;
        }
        if (
          event.registrationDeadline &&
          new Date() > new Date(event.registrationDeadline)
        ) {
          this.showModal({
            title: "Deadline Passed",
            message:
              "The registration deadline has passed. Entries can no longer be changed.",
            icon: "⏰",
            iconColor: "#e67e22",
          });
          return;
        }

        document.getElementById("reg-event-code").value = eventCode;
        document.getElementById("reg-event-name").textContent = event.name;
        this._setRegistrationModalState(event, existingReg.registration);

        const container = document.getElementById("pigeon-select-list");
        const activePigeons = pigeons.filter((p) => p.status === "Active");
        if (activePigeons.length === 0) {
          container.innerHTML = `<div class="register-pigeon-empty">You have no active pigeons. Add one in My Pigeons first.</div>`;
          document.getElementById("reg-save-btn").disabled = true;
          document.getElementById("modal-register-event").classList.add("show");
          return;
        }

        document.getElementById("reg-save-btn").disabled = false;
        const selectedIds = existingReg.registration
          ? existingReg.registration.pigeonIds.map((p) => String(p._id || p))
          : [];
        const selectedSet = new Set(selectedIds);
        let html = "";
        activePigeons.forEach((p) => {
          const checked = selectedSet.has(String(p._id)) ? "checked" : "";
          const avatarId = p.avatarId || "";
          const avatarHTML = avatarId
            ? getPigeonAvatarSVG(avatarId, 36)
            : getDefaultPigeonSVG(36);
          const ring = this._escapeCertHtml(p.ringNumber || "Unknown");
          const nick = this._escapeCertHtml(p.nickname || "No nickname");
          const color = this._escapeCertHtml(p.color || "N/A");
          html += `
            <label class="register-pigeon-item">
              <input type="checkbox" value="${p._id}" ${checked} class="pigeon-checkbox register-pigeon-checkbox" />
              <span class="register-pigeon-avatar">${avatarHTML}</span>
              <span class="register-pigeon-info">
                <span class="register-pigeon-ring">${ring}</span>
                <span class="register-pigeon-meta">${nick} · ${color}</span>
              </span>
              <span class="register-pigeon-check" aria-hidden="true"><i class="fas fa-check"></i></span>
            </label>
          `;
        });
        container.innerHTML = html;
        container.querySelectorAll(".pigeon-checkbox").forEach((cb) => {
          cb.addEventListener("change", () =>
            this._updateRegistrationSelectionSummary(),
          );
        });
        this._updateRegistrationSelectionSummary();
        document.getElementById("modal-register-event").classList.add("show");
      })
      .catch((err) => {
        this.showModal({
          title: "Error",
          message: "Failed to load data for registration.",
          icon: "❌",
          iconColor: "#c0392b",
        });
      })
      .finally(() => {
        if (joinBtn) {
          joinBtn.disabled = false;
          joinBtn.textContent = joinBtnLabel || "Join Race";
        }
      });
  },

  confirmRegistration() {
    const codeEl = document.getElementById("reg-event-code");
    const eventCode = codeEl.value;
    const hasEntry = codeEl.dataset.hasEntry === "1";
    const checkboxes = document.querySelectorAll(
      "#pigeon-select-list .pigeon-checkbox:checked",
    );
    const pigeonIds = Array.from(checkboxes).map((cb) => cb.value);
    const notice = document.getElementById("reg-inline-notice");

    if (pigeonIds.length === 0 && !hasEntry) {
      if (notice) {
        notice.textContent =
          "Select at least one pigeon to register for this event.";
        notice.classList.remove("hidden");
      }
      return;
    }
    if (notice) notice.classList.add("hidden");

    const saveBtn = document.getElementById("reg-save-btn");
    const saveLabel = document.getElementById("reg-save-label");
    const originalLabel = saveLabel ? saveLabel.textContent : "Save Entry";
    if (saveBtn) saveBtn.disabled = true;
    if (saveLabel) saveLabel.textContent = "Saving...";

    const isWithdraw = pigeonIds.length === 0 && hasEntry;
    const request =
      isWithdraw || hasEntry
        ? fetchWithAuth(`${API_URL}/events/${eventCode}/register`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pigeonIds }),
          })
        : fetchWithAuth(`${API_URL}/events/${eventCode}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pigeonIds }),
          });

    request
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          this.closeModal("modal-register-event");
          const withdrawn = isWithdraw || data.withdrawn;
          this.showModal({
            title: withdrawn
              ? "Entry Removed"
              : hasEntry
                ? "Entry Updated"
                : "Registration Saved",
            message:
              data.message ||
              (withdrawn
                ? "Your registration has been removed."
                : "Your entry has been recorded."),
            icon: "✅",
            iconColor: "#27ae60",
          });
          this.loadOpenEvents();
        } else {
          this.showModal({
            title: "Error",
            message: data.error || "Failed to save registration.",
            icon: "❌",
            iconColor: "#c0392b",
          });
        }
      })
      .catch((err) => {
        this.showModal({
          title: "Error",
          message: "Connection error.",
          icon: "❌",
          iconColor: "#c0392b",
        });
      })
      .finally(() => {
        if (saveBtn) saveBtn.disabled = false;
        if (saveLabel) saveLabel.textContent = originalLabel;
      });
  },

  withdrawRegistration() {
    const eventCode = document.getElementById("reg-event-code").value;
    if (
      !confirm(
        "Remove your entire entry for this event? This cannot be undone after registration closes.",
      )
    ) {
      return;
    }

    const withdrawBtn = document.getElementById("reg-withdraw-btn");
    if (withdrawBtn) {
      withdrawBtn.disabled = true;
      withdrawBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Removing...';
    }

    fetchWithAuth(`${API_URL}/events/${eventCode}/register`, {
      method: "DELETE",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          this.closeModal("modal-register-event");
          this.showModal({
            title: "Entry Removed",
            message: data.message || "Your registration has been removed.",
            icon: "✅",
            iconColor: "#27ae60",
          });
          this.loadOpenEvents();
        } else {
          this.showModal({
            title: "Error",
            message: data.error || "Failed to remove entry.",
            icon: "❌",
            iconColor: "#c0392b",
          });
        }
      })
      .catch(() => {
        this.showModal({
          title: "Error",
          message: "Connection error.",
          icon: "❌",
          iconColor: "#c0392b",
        });
      })
      .finally(() => {
        if (withdrawBtn) {
          withdrawBtn.disabled = false;
          withdrawBtn.innerHTML =
            '<i class="fas fa-trash-alt"></i> Remove Entry';
        }
      });
  },

  openEditRegistration(eventCode) {
    this.openRegisterModalNew(eventCode);
  },

  confirmEditRegistration() {
    this.confirmRegistration();
  },

  // ============================================================
  //  CERTIFICATES (ENHANCED) – REDESIGNED TEMPLATE
  // ============================================================

  loadCertificates() {
    fetchWithAuth(`${API_URL}/certificates/player`)
      .then((res) => res.json())
      .then((certs) => {
        const container = document.getElementById("certificates-list");
        if (!certs || certs.length === 0) {
          container.innerHTML = `<p>You have no certificates yet.</p>`;
          return;
        }
        let html = "";
        certs.forEach((c) => {
          const rankLabel =
            c.rank === 1
              ? "🥇 Champion"
              : c.rank === 2
                ? "🥈 Second"
                : c.rank === 3
                  ? "🥉 Third"
                  : "🏅 Participation";
          const avatarId = c.pigeonId?.avatarId || "";
          const avatarHTML = avatarId
            ? getPigeonAvatarSVG(avatarId, 32)
            : getDefaultPigeonSVG(32);
          html += `
            <div class="certificate-card" style="display:flex;align-items:center;gap:12px;">
              <span style="width:40px;height:40px;display:inline-block;border-radius:50%;overflow:hidden;flex-shrink:0;border:1px solid var(--border);">${avatarHTML}</span>
              <div style="flex:1;">
                <div><strong>${c.certificateNumber}</strong> – ${rankLabel}</div>
                <div>Event: ${c.eventId ? c.eventId.name : "Unknown"} • Pigeon: ${c.pigeonId ? c.pigeonId.ringNumber : "N/A"}</div>
                <div>Speed: ${c.speed.toFixed(2)} m/min | Distance: ${c.distance.toFixed(2)} km</div>
              </div>
              <div>
                <button class="btn btn-sm btn-primary" onclick="app.viewCertificate('${c._id}')">View</button>
              </div>
            </div>
          `;
        });
        container.innerHTML = html;
      })
      .catch((err) => {
        document.getElementById("certificates-list").innerHTML =
          `<p>Failed to load certificates.</p>`;
      });
  },

  viewCertificate: function (certId) {
    fetchWithAuth(`${API_URL}/certificates/${certId}`)
      .then((res) => res.json())
      .then((cert) => {
        this._currentCert = cert;
        this._renderCertificateDetail(cert);
        document.getElementById("modal-certificate").classList.add("show");
      })
      .catch((err) => {
        console.error("Certificate load error:", err);
        this.showModal({
          title: "Error",
          message: "Failed to load certificate.",
          icon: "❌",
          iconColor: "#c0392b",
        });
      });
  },

  // ----- CERTIFICATE TEMPLATE (full CSS layout matching MRPC design) -----
  _getCertificateRankMeta: function (rank) {
    const n = Number(rank) || 0;
    const ordinal = (r) => {
      const j = r % 10;
      const k = r % 100;
      if (j === 1 && k !== 11) return `${r}ST PLACE`;
      if (j === 2 && k !== 12) return `${r}ND PLACE`;
      if (j === 3 && k !== 13) return `${r}RD PLACE`;
      return `${r}TH PLACE`;
    };
    // Template ranking is always gold-styled
    if (n === 1) return { label: "CHAMPION", rankClass: "gold" };
    if (n === 2) return { label: "2ND PLACE", rankClass: "gold" };
    if (n === 3) return { label: "3RD PLACE", rankClass: "gold" };
    if (n > 3) return { label: ordinal(n), rankClass: "gold" };
    return { label: "PARTICIPANT", rankClass: "gold" };
  },

  _escapeCertHtml: function (str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  _processCertLogoImg: function (img) {
    if (!img || img.dataset.processed === "1") return;
    try {
      const w = img.naturalWidth || 240;
      const h = img.naturalHeight || 140;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const pixels = imageData.data;
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        if (r < 42 && g < 42 && b < 42) {
          pixels[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      img.src = canvas.toDataURL("image/png");
      img.style.mixBlendMode = "normal";
      img.dataset.processed = "1";
      img.classList.add("cert-logo-img--processed");
    } catch (err) {
      console.warn("Certificate logo processing skipped:", err);
    }
  },

  _renderCertificateDetail: function (cert) {
    const container = document.getElementById("certificate-detail");
    const { label: rankLabel, rankClass } = this._getCertificateRankMeta(
      cert.rank,
    );
    const esc = (s) => this._escapeCertHtml(s);

    const avatarId = cert.pigeonId?.avatarId || "";
    const avatarHTML = avatarId
      ? getPigeonAvatarSVG(avatarId, 220)
      : getDefaultPigeonSVG(220);

    const issueDate = new Date(cert.issueDate);
    const formattedDate = issueDate.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const releaseDate = cert.eventId?.releaseTime
      ? new Date(cert.eventId.releaseTime)
      : null;
    const releaseDateStr = releaseDate
      ? releaseDate.toLocaleDateString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "N/A";

    const nickname = (cert.pigeonId?.nickname || "").trim();
    const ringNumber = cert.pigeonId?.ringNumber || "N/A";
    const pigeonDisplay = nickname
      ? `${nickname} (${ringNumber})`
      : ringNumber;

    const eventName = cert.eventId?.name || "Unknown Event";
    const distance = Number(cert.distance || 0).toFixed(2);
    const speed = Number(cert.speed || 0).toFixed(2);

    const baseUrl = window.location.origin;
    const verifyUrl = `${baseUrl}/verify/${cert.qrHash || ""}`;

    const cornerSvg = `
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 36C6 14 14 6 36 6" stroke="currentColor" stroke-width="2.4"/>
        <path d="M10 42C10 20 20 10 42 10" stroke="currentColor" stroke-width="1.3" opacity="0.75"/>
        <path d="M6 20C14 12 22 9 30 7M6 28C16 18 26 12 38 9" stroke="currentColor" stroke-width="1.5"/>
        <path d="M18 6C22 14 25 22 27 30M26 6C30 16 33 24 35 32" stroke="currentColor" stroke-width="1.5"/>
        <path d="M12 12c8-2 14 2 16 10M20 8c6 4 8 12 6 18" stroke="currentColor" stroke-width="1.2" opacity="0.85"/>
        <circle cx="12" cy="12" r="2.4" fill="currentColor"/>
        <path d="M28 28c6-8 14-10 22-8" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
      </svg>`;

    const laurelSvg = `
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g fill="#b8963e">
          <ellipse cx="34" cy="78" rx="6" ry="13" transform="rotate(-55 34 78)" opacity="0.92"/>
          <ellipse cx="30" cy="98" rx="6.5" ry="13" transform="rotate(-40 30 98)" opacity="0.92"/>
          <ellipse cx="32" cy="118" rx="6.5" ry="13" transform="rotate(-25 32 118)" opacity="0.92"/>
          <ellipse cx="40" cy="136" rx="6.5" ry="13" transform="rotate(-10 40 136)" opacity="0.92"/>
          <ellipse cx="54" cy="150" rx="6.5" ry="13" transform="rotate(8 54 150)" opacity="0.92"/>
          <ellipse cx="72" cy="160" rx="6.5" ry="13" transform="rotate(22 72 160)" opacity="0.92"/>
          <ellipse cx="92" cy="166" rx="6.5" ry="13" transform="rotate(38 92 166)" opacity="0.92"/>
          <ellipse cx="166" cy="78" rx="6" ry="13" transform="rotate(55 166 78)" opacity="0.92"/>
          <ellipse cx="170" cy="98" rx="6.5" ry="13" transform="rotate(40 170 98)" opacity="0.92"/>
          <ellipse cx="168" cy="118" rx="6.5" ry="13" transform="rotate(25 168 118)" opacity="0.92"/>
          <ellipse cx="160" cy="136" rx="6.5" ry="13" transform="rotate(10 160 136)" opacity="0.92"/>
          <ellipse cx="146" cy="150" rx="6.5" ry="13" transform="rotate(-8 146 150)" opacity="0.92"/>
          <ellipse cx="128" cy="160" rx="6.5" ry="13" transform="rotate(-22 128 160)" opacity="0.92"/>
          <ellipse cx="108" cy="166" rx="6.5" ry="13" transform="rotate(-38 108 166)" opacity="0.92"/>
        </g>
        <path d="M36 70C28 100 48 158 100 170C152 158 172 100 164 70" fill="none" stroke="#b8963e" stroke-width="1.4" opacity="0.55"/>
      </svg>`;

    const badgeSvg = `
      <svg viewBox="0 0 90 58" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 26c0-3 3-5 10-5h58c7 0 10 2 10 5v6c0 12-16 20-39 20S6 44 6 32v-6z" fill="#0a3d30" stroke="#b8963e" stroke-width="2"/>
        <path d="M4 28c8 2 14 2 20 0M86 28c-8 2-14 2-20 0" stroke="#b8963e" stroke-width="1.5" fill="none"/>
        <path d="M32 12h26l5 12H27l5-12z" fill="#0a3d30" stroke="#b8963e" stroke-width="1.6"/>
        <path d="M45 18c7 0 11 3.2 12 7.5-2.2 1-5.5 2-12 2s-9.8-1-12-2c1-4.3 5-7.5 12-7.5z" fill="#b8963e"/>
        <circle cx="38" cy="36" r="1.7" fill="#b8963e"/>
        <circle cx="45" cy="36" r="1.7" fill="#b8963e"/>
        <circle cx="52" cy="36" r="1.7" fill="#b8963e"/>
      </svg>`;

    const flourishSvg = `
      <svg viewBox="0 0 120 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M4 8c18-7 36-7 52 0 16 7 34 7 52 0" fill="none" stroke="#b8963e" stroke-width="1.3"/>
        <path d="M50 8c4-5 10-5 14 0-4 5-10 5-14 0z" fill="#b8963e"/>
        <circle cx="8" cy="8" r="1.4" fill="#b8963e"/>
        <circle cx="112" cy="8" r="1.4" fill="#b8963e"/>
      </svg>`;

    const ornamentSvg = `
      <svg class="orn-side" viewBox="0 0 70 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M2 12c10-10 22-10 34 0 12 10 24 10 34 0" fill="none" stroke="#b8963e" stroke-width="1.4"/>
        <path d="M28 12c3-4 8-4 11 0-3 4-8 4-11 0z" fill="#b8963e"/>
      </svg>`;

    container.innerHTML = `
      <div class="certificate-wrapper">
        <div class="certificate-sheet" id="certificate-sheet">
          <div class="cert-frame">
            <div class="cert-corner cert-corner-tl">${cornerSvg}</div>
            <div class="cert-corner cert-corner-tr">${cornerSvg}</div>
            <div class="cert-corner cert-corner-bl">${cornerSvg}</div>
            <div class="cert-corner cert-corner-br">${cornerSvg}</div>

            <div class="cert-header">
              <div class="cert-logo-wrap">
                <img
                  src="wingsync-logo.png"
                  alt="WingSync"
                  class="cert-logo-img"
                  crossorigin="anonymous"
                  decoding="async"
                />
              </div>
              <div class="cert-powered">POWERED BY WINGSYNC</div>
              <div class="cert-club">MALINAO RACING PIGEON CLUB</div>
              <div class="cert-mrpc"><span>— MRPC —</span></div>
              <h1 class="cert-title">CERTIFICATE</h1>
              <div class="cert-title-flourish">${flourishSvg}</div>
            </div>

            <div class="cert-main">
              <div class="cert-avatar-col">
                <div class="cert-avatar-wrap">
                  <div class="cert-avatar-outer-ring" aria-hidden="true"></div>
                  <div class="cert-laurel">${laurelSvg}</div>
                  <div class="cert-avatar-ring">${avatarHTML}</div>
                  <div class="cert-badge">${badgeSvg}</div>
                </div>
              </div>
              <div class="cert-text">
                <p class="cert-intro">This is to certify that</p>
                <p class="cert-name">${esc(pigeonDisplay)}</p>
                <p class="cert-body">
                  has flown from <span class="cert-value">${esc(eventName)}</span>
                  a distance of <span class="cert-value">${esc(distance)} km</span>
                  on <span class="cert-value">${esc(releaseDateStr)}</span>,
                  recording a velocity of <span class="cert-value">${esc(speed)} m/min</span>
                  and thereby won
                </p>
                <p class="cert-rank rank-${rankClass}">— ${esc(rankLabel)} —</p>
                <p class="cert-closing">in the said race.</p>
              </div>
            </div>

            <div class="cert-footer">
              <div class="cert-signed">
                <div class="cert-signed-date">${esc(formattedDate)}</div>
                <div class="cert-signed-label">Signed on,</div>
              </div>
              <div class="cert-ornament">
                ${ornamentSvg}
                <div class="cert-trophy" aria-hidden="true">
                  <i class="fas fa-trophy"></i>
                </div>
                ${ornamentSvg}
              </div>
              <div class="cert-sigs">
                <div class="cert-sig">
                  <span class="cert-sig-name">Ash Cargullo</span>
                  <span class="cert-sig-title">Club Vice-President</span>
                </div>
                <div class="cert-sig">
                  <span class="cert-sig-name">Vincent Macauyam</span>
                  <span class="cert-sig-title">Club President</span>
                </div>
              </div>
            </div>

            <div class="cert-qr" id="cert-qr-container"></div>
          </div>
        </div>
      </div>
    `;

    this._generateQRCodeForCert(verifyUrl);

    const logoImg = container.querySelector(".cert-logo-img");
    if (logoImg) {
      if (logoImg.complete) this._processCertLogoImg(logoImg);
      else logoImg.onload = () => this._processCertLogoImg(logoImg);
    }

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "certificate-actions";

    if (this.currentUser?.role === "admin") {
      const printBtn = document.createElement("button");
      printBtn.className = "btn btn-primary";
      printBtn.innerHTML = '<i class="fas fa-print"></i> Print';
      printBtn.onclick = () => this.printCertificate();
      actionsDiv.appendChild(printBtn);

      const pdfBtn = document.createElement("button");
      pdfBtn.className = "btn btn-success";
      pdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Download PDF';
      pdfBtn.onclick = () => this.downloadCertificatePDF();
      actionsDiv.appendChild(pdfBtn);

      container.appendChild(actionsDiv);
    }
  },

  _generateQRCodeForCert: function (text) {
    const container = document.getElementById("cert-qr-container");
    if (!container) return;
    try {
      if (typeof QRCode === "undefined") {
        console.warn("QRCode library not loaded");
        return;
      }
      container.innerHTML = "";
      const qrDiv = document.createElement("div");
      qrDiv.id = "qr-code-element";
      container.appendChild(qrDiv);
      const size = Math.max(44, Math.floor(container.clientWidth || 48));
      new QRCode(qrDiv, {
        text: text,
        width: size,
        height: size,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M,
      });
    } catch (e) {
      console.warn("QR generation failed:", e);
      container.innerHTML = `<div style="width:100%;height:100%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:8px;color:#999;">QR</div>`;
    }
  },

  printCertificate: function () {
    const sheet = document.getElementById("certificate-sheet");
    if (!sheet) return;
    const win = window.open("", "_blank");
    if (!win) {
      this.showModal({
        title: "Popup blocked",
        message: "Please allow popups to print the certificate.",
        icon: "⚠️",
        iconColor: "#e67e22",
      });
      return;
    }

    const origin = window.location.origin;
    const basePath = window.location.pathname.replace(/\/[^/]*$/, "/");
    const cssHref = `${origin}${basePath}style.css?v=17`;
    const fontHref =
      "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Great+Vibes&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap";
    const faHref =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css";

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Certificate - WingSync</title>
  <base href="${origin}${basePath}" />
  <link rel="stylesheet" href="${fontHref}" />
  <link rel="stylesheet" href="${faHref}" />
  <link rel="stylesheet" href="${cssHref}" />
  <style>
    @page { size: landscape; margin: 8mm; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .certificate-wrapper { max-width: none; width: 100%; }
    .certificate-sheet { box-shadow: none; width: 100%; }
    .certificate-actions { display: none !important; }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  </style>
</head>
<body>
  <div class="certificate-wrapper">${sheet.outerHTML}</div>
  <script>
    window.onload = function () {
      setTimeout(function () { window.focus(); window.print(); }, 450);
    };
  <\/script>
</body>
</html>`);
    win.document.close();
  },

  downloadCertificatePDF: function () {
    if (!this._currentCert) {
      this.showModal({
        title: "Error",
        message: "No certificate to download.",
        icon: "❌",
        iconColor: "#c0392b",
      });
      return;
    }
    this._generateCertificatePDF(this._currentCert);
  },

  _generateCertificatePDF: function (cert) {
    this.showModal({
      title: "Generating PDF",
      message: "Please wait while your certificate is being prepared...",
      icon: "⏳",
      iconColor: "#2a7a62",
      showButton: false,
    });

    const certElement = document.querySelector(
      "#certificate-detail .certificate-sheet",
    );

    if (typeof html2canvas !== "undefined" && certElement) {
      html2canvas(certElement, {
        scale: 2,
        backgroundColor: "#f4efe3",
        logging: false,
        allowTaint: true,
        useCORS: true,
        foreignObjectRendering: false,
      })
        .then((canvas) => {
          document.getElementById("custom-modal")?.remove();
          this._canvasToPDF(canvas);
        })
        .catch((err) => {
          console.error("html2canvas error:", err);
          document.getElementById("custom-modal")?.remove();
          this._fallbackPDF(cert);
        });
    } else {
      this._fallbackPDF(cert);
    }
  },

  _canvasToPDF: function (canvas) {
    const { jsPDF } = window.jspdf;
    const imgData = canvas.toDataURL("image/png");
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 6;
    const maxW = pageWidth - margin * 2;
    const maxH = pageHeight - margin * 2;
    const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
    const imgWidth = canvas.width * ratio;
    const imgHeight = canvas.height * ratio;
    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;
    doc.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
    const cert = this._currentCert;
    doc.save(`certificate_${cert.certificateNumber}.pdf`);
    document.getElementById("custom-modal")?.remove();
    this.showModal({
      title: "✅ PDF Downloaded",
      message: `Certificate ${cert.certificateNumber} has been downloaded.`,
      icon: "✅",
      iconColor: "#27ae60",
    });
  },

  // Fallback PDF when html2canvas is unavailable – landscape template layout
  _fallbackPDF: function (cert) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("l", "mm", "a4");
    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 12;
    const { label: rankLabel } = this._getCertificateRankMeta(cert.rank);

    doc.setFillColor(244, 239, 227);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    doc.setDrawColor(184, 150, 62);
    doc.setLineWidth(1.2);
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);
    doc.setDrawColor(10, 61, 48);
    doc.setLineWidth(4);
    doc.rect(
      margin + 3,
      margin + 3,
      pageWidth - 2 * margin - 6,
      pageHeight - 2 * margin - 6,
    );
    doc.setDrawColor(184, 150, 62);
    doc.setLineWidth(0.8);
    doc.rect(
      margin + 7,
      margin + 7,
      pageWidth - 2 * margin - 14,
      pageHeight - 2 * margin - 14,
    );

    const cx = pageWidth / 2;
    let y = margin + 18;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(90, 100, 100);
    doc.text("POWERED BY WINGSYNC", cx, y, { align: "center" });
    y += 7;
    doc.setFontSize(13);
    doc.setTextColor(10, 61, 48);
    doc.text("MALINAO RACING PIGEON CLUB", cx, y, { align: "center" });
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(184, 150, 62);
    doc.text("— MRPC —", cx, y, { align: "center" });
    y += 9;
    doc.setFontSize(26);
    doc.setTextColor(10, 61, 48);
    doc.text("CERTIFICATE", cx, y, { align: "center" });
    y += 12;

    const nickname = (cert.pigeonId?.nickname || "").trim();
    const ringNumber = cert.pigeonId?.ringNumber || "N/A";
    const pigeonDisplay = nickname
      ? `${nickname} (${ringNumber})`
      : ringNumber;
    const eventName = cert.eventId?.name || "Unknown Event";
    const distance = Number(cert.distance || 0).toFixed(2);
    const speed = Number(cert.speed || 0).toFixed(2);
    const releaseDate = cert.eventId?.releaseTime
      ? new Date(cert.eventId.releaseTime).toLocaleDateString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "N/A";
    const signedDate = new Date(cert.issueDate).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const avatarX = margin + 32;
    const avatarY = pageHeight / 2 + 6;
    doc.setDrawColor(184, 150, 62);
    doc.setLineWidth(1.4);
    doc.circle(avatarX, avatarY, 22);
    doc.setFillColor(239, 232, 216);
    doc.circle(avatarX, avatarY, 20, "F");

    const textX = margin + 68;
    const textW = pageWidth - margin - textX - 12;
    y = pageHeight / 2 - 26;

    doc.setFont("times", "italic");
    doc.setFontSize(11);
    doc.setTextColor(26, 36, 32);
    doc.text("This is to certify that", textX + textW / 2, y, {
      align: "center",
    });
    y += 8;
    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.setTextColor(10, 61, 48);
    doc.text(pigeonDisplay, textX + textW / 2, y, { align: "center" });
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.line(textX + 8, y + 2, textX + textW - 8, y + 2);
    y += 9;

    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(26, 36, 32);
    const body =
      `has flown from ${eventName} a distance of ${distance} km on ${releaseDate}, ` +
      `recording of a velocity of ${speed} m/min and thereby won`;
    const bodyLines = doc.splitTextToSize(body, textW - 6);
    doc.text(bodyLines, textX + textW / 2, y, { align: "center" });
    y += bodyLines.length * 4.5 + 5;

    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.setTextColor(184, 150, 62);
    doc.text(`— ${rankLabel} —`, textX + textW / 2, y, { align: "center" });
    y += 7;
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(26, 36, 32);
    doc.text("in the said race.", textX + textW / 2, y, { align: "center" });

    const footerY = pageHeight - margin - 18;
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.4);
    doc.line(margin + 14, footerY, margin + 55, footerY);
    doc.setFontSize(9);
    doc.setTextColor(26, 36, 32);
    doc.text(signedDate, margin + 34.5, footerY - 2, { align: "center" });
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text("Signed on,", margin + 34.5, footerY + 5, { align: "center" });

    doc.setFont("times", "italic");
    doc.setFontSize(11);
    doc.setTextColor(26, 36, 32);
    doc.text("Ash Cargullo", pageWidth - margin - 32, footerY - 10, {
      align: "center",
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text("Club Vice-President", pageWidth - margin - 32, footerY - 4, {
      align: "center",
    });
    doc.setFont("times", "italic");
    doc.setFontSize(11);
    doc.setTextColor(26, 36, 32);
    doc.text("Vincent Macauyam", pageWidth - margin - 32, footerY + 6, {
      align: "center",
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text("Club President", pageWidth - margin - 32, footerY + 12, {
      align: "center",
    });

    doc.save(`certificate_${cert.certificateNumber}.pdf`);
    document.getElementById("custom-modal")?.remove();
    this.showModal({
      title: "✅ PDF Downloaded",
      message: `Certificate ${cert.certificateNumber} has been downloaded.`,
      icon: "✅",
      iconColor: "#27ae60",
    });
  },

  // ============================================================
  //  ADMIN CERTIFICATE MANAGEMENT
  // ============================================================

  loadAdminCertificates: async function () {
    const container = document.getElementById("admin-certificates-list");
    const searchTerm =
      document.getElementById("admin-cert-search")?.value || "";
    const eventFilter =
      document.getElementById("admin-cert-event-filter")?.value || "";

    container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);">Loading certificates...</div>`;

    try {
      let url = `${API_URL}/admin/certificates?limit=200`;
      if (eventFilter) url += `&eventId=${eventFilter}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;

      const res = await fetchWithAuth(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const certs = data.certificates || [];
      const total = data.total || 0;

      document.getElementById("admin-cert-total-count").textContent = total;

      if (certs.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">
          <i class="fas fa-award" style="font-size:48px;display:block;margin-bottom:12px;"></i>
          <p>No certificates found. Generate certificates from Event Review.</p>
        </div>`;
        return;
      }

      let html = `<div style="overflow-x:auto;"><table style="width:100%;font-size:13px;">
        <thead><tr>
          <th>Certificate #</th>
          <th>Player</th>
          <th>Pigeon</th>
          <th>Event</th>
          <th>Rank</th>
          <th>Speed (m/min)</th>
          <th>Issued</th>
          <th>Actions</th>
        </tr></thead><tbody>`;

      certs.forEach((c) => {
        const rankEmoji =
          c.rank === 1
            ? "🥇"
            : c.rank === 2
              ? "🥈"
              : c.rank === 3
                ? "🥉"
                : "🏅";
        const rankLabel =
          c.rank === 1
            ? "Champion"
            : c.rank === 2
              ? "2nd"
              : c.rank === 3
                ? "3rd"
                : `#${c.rank}`;
        const avatarId = c.pigeonId?.avatarId || "";
        const avatarHTML = avatarId
          ? getPigeonAvatarSVG(avatarId, 24)
          : getDefaultPigeonSVG(24);
        const issueDate = new Date(c.issueDate).toLocaleDateString();

        html += `<tr>
          <td><strong>${c.certificateNumber}</strong></td>
          <td>${c.playerId?.name || "Unknown"}</td>
          <td>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="width:28px;height:28px;display:inline-block;border-radius:50%;overflow:hidden;flex-shrink:0;">${avatarHTML}</span>
              ${c.pigeonId?.ringNumber || "N/A"}
            </div>
          </td>
          <td>${c.eventId?.name || "Unknown"}</td>
          <td>${rankEmoji} ${rankLabel}</td>
          <td>${c.speed.toFixed(2)}</td>
          <td>${issueDate}</td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="app.viewAdminCertificate('${c._id}')"><i class="fas fa-eye"></i></button>
            <button class="btn btn-sm btn-secondary" onclick="app.reprintCertificate('${c._id}')"><i class="fas fa-print"></i></button>
            <button class="btn btn-sm btn-success" onclick="app.downloadAdminCertificate('${c._id}')"><i class="fas fa-file-pdf"></i></button>
          </td>
        </tr>`;
      });

      html += `</tbody></table></div>`;
      container.innerHTML = html;

      this._populateAdminCertEventFilter();
    } catch (err) {
      console.error("Load admin certificates error:", err);
      container.innerHTML = `<p style="color:red;">Failed to load certificates.</p>`;
    }
  },

  _populateAdminCertEventFilter: async function () {
    const select = document.getElementById("admin-cert-event-filter");
    if (!select) return;
    const current = select.value;

    try {
      const res = await fetchWithAuth(`${API_URL}/admin/certificates/events`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const events = data.events || [];

      select.innerHTML = `<option value="">All Events</option>`;
      events.forEach((e) => {
        const opt = document.createElement("option");
        opt.value = e.code;
        opt.textContent = `${e.name} (${e.code})`;
        select.appendChild(opt);
      });
      if (current) select.value = current;
    } catch (err) {
      console.error("Failed to load certificate events:", err);
    }
  },

  viewAdminCertificate: async function (certId) {
    try {
      const res = await fetchWithAuth(`${API_URL}/certificates/${certId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const cert = await res.json();
      this._currentCert = cert;
      this._renderCertificateDetail(cert);
      document.getElementById("modal-certificate").classList.add("show");
    } catch (err) {
      console.error("View admin certificate error:", err);
      this.showModal({
        title: "Error",
        message: "Failed to load certificate.",
        icon: "❌",
        iconColor: "#c0392b",
      });
    }
  },

  reprintCertificate: async function (certId) {
    try {
      const res = await fetchWithAuth(
        `${API_URL}/admin/certificates/${certId}/reprint`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this._currentCert = data.certificate;
      this._renderCertificateDetail(data.certificate);
      document.getElementById("modal-certificate").classList.add("show");
      setTimeout(() => this.printCertificate(), 500);
    } catch (err) {
      console.error("Reprint error:", err);
      this.showModal({
        title: "Error",
        message: "Failed to reprint certificate.",
        icon: "❌",
        iconColor: "#c0392b",
      });
    }
  },

  downloadAdminCertificate: async function (certId) {
    try {
      const res = await fetchWithAuth(`${API_URL}/certificates/${certId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const cert = await res.json();
      this._currentCert = cert;
      await this._generateCertificatePDF(cert);
    } catch (err) {
      console.error("Download admin certificate error:", err);
      this.showModal({
        title: "Error",
        message: "Failed to download certificate.",
        icon: "❌",
        iconColor: "#c0392b",
      });
    }
  },

  // ============================================================
  //  EVENT DETAILS MODAL
  // ============================================================
  openEventDetailsModal(eventCode) {
    let event = this.eventLookup[eventCode];
    if (!event) {
      this.fetchAllEvents()
        .then(() => {
          event = this.eventLookup[eventCode];
          if (!event) {
            this.showModal({
              title: "Error",
              message:
                "Event not found. Please refresh the page and try again.",
              icon: "❌",
              iconColor: "#c0392b",
            });
            return;
          }
          this._openEventDetailsModalWithEvent(event);
        })
        .catch(() => {
          this.showModal({
            title: "Error",
            message: "Failed to load event data. Please refresh the page.",
            icon: "❌",
            iconColor: "#c0392b",
          });
        });
      return;
    }
    this._openEventDetailsModalWithEvent(event);
  },

  _openEventDetailsModalWithEvent(event) {
    document.getElementById("view-event-name").textContent = event.name;
    document.getElementById("view-event-code").textContent = event.code;
    document.getElementById("view-event-release").textContent = new Date(
      event.releaseTime,
    ).toLocaleString();
    document.getElementById("view-event-location").textContent =
      `${event.lat.toFixed(6)}, ${event.lng.toFixed(6)}`;
    document.getElementById("view-event-status").textContent =
      event.state || event.status;
    const joinBtn = document.getElementById("view-event-join-btn");
    if (event.state === "Registration Open") {
      if (
        event.registrationDeadline &&
        new Date() > new Date(event.registrationDeadline)
      ) {
        joinBtn.style.display = "none";
        document.getElementById("view-event-status-msg").textContent =
          "Registration deadline has passed.";
      } else {
        joinBtn.style.display = "block";
        joinBtn.onclick = () => {
          this.closeModal("modal-event-details");
          this.openRegisterModalNew(event.code);
        };
      }
    } else {
      joinBtn.style.display = "none";
    }
    document.getElementById("modal-event-details").classList.add("show");
  },

  // ===== Admin table pagination (Manage Players / Manage Events) =====
  TABLE_PAGE_SIZE: 10,
  playersPage: 1,
  eventsPage: 1,

  _renderTablePagination({
    containerId,
    currentPage,
    totalItems,
    pageSize,
    onPageChange,
    itemLabel = "items",
  }) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!totalItems) {
      container.innerHTML = "";
      container.classList.remove("table-pagination--visible");
      return;
    }

    const totalPages = Math.ceil(totalItems / pageSize);
    const safePage = Math.min(Math.max(currentPage, 1), totalPages);
    const start = (safePage - 1) * pageSize + 1;
    const end = Math.min(safePage * pageSize, totalItems);

    container.classList.add("table-pagination--visible");

    if (totalPages <= 1) {
      container.innerHTML = `<p class="table-pagination-info">Showing all <strong>${totalItems}</strong> ${itemLabel}</p>`;
      return;
    }

    const pageButtons = [];
    for (let p = 1; p <= totalPages; p += 1) {
      const isEdge = p === 1 || p === totalPages;
      const isNear = Math.abs(p - safePage) <= 1;
      if (isEdge || isNear || totalPages <= 7) {
        pageButtons.push(p);
      } else if (pageButtons[pageButtons.length - 1] !== "…") {
        pageButtons.push("…");
      }
    }

    const pagesHtml = pageButtons
      .map((p) => {
        if (p === "…") {
          return `<span class="table-pagination-ellipsis">…</span>`;
        }
        const active = p === safePage ? " table-pagination-page--active" : "";
        return `<button type="button" class="table-pagination-page${active}" data-page="${p}" aria-label="Page ${p}" aria-current="${p === safePage ? "page" : "false"}">${p}</button>`;
      })
      .join("");

    container.innerHTML = `
      <p class="table-pagination-info">Showing <strong>${start}–${end}</strong> of <strong>${totalItems}</strong> ${itemLabel}</p>
      <nav class="table-pagination-controls" aria-label="Pagination">
        <button type="button" class="table-pagination-nav" data-page="prev" ${safePage <= 1 ? "disabled" : ""} aria-label="Previous page">
          <i class="fas fa-chevron-left" aria-hidden="true"></i>
        </button>
        <div class="table-pagination-pages">${pagesHtml}</div>
        <button type="button" class="table-pagination-nav" data-page="next" ${safePage >= totalPages ? "disabled" : ""} aria-label="Next page">
          <i class="fas fa-chevron-right" aria-hidden="true"></i>
        </button>
      </nav>
    `;

    container.onclick = (e) => {
      const btn = e.target.closest("[data-page]");
      if (!btn || btn.disabled) return;
      const target = btn.dataset.page;
      if (target === "prev" && safePage > 1) onPageChange(safePage - 1);
      else if (target === "next" && safePage < totalPages)
        onPageChange(safePage + 1);
      else if (/^\d+$/.test(target)) onPageChange(parseInt(target, 10));
    };
  },

  _syncPlayersPagination() {
    const tbody = document.querySelector("#players-table tbody");
    const table = document.getElementById("players-table");
    if (!tbody || !table) return;

    const rows = Array.from(tbody.querySelectorAll("tr"));
    const total = rows.length;
    const pageSize = this.TABLE_PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    if (this.playersPage > totalPages) this.playersPage = totalPages;
    if (this.playersPage < 1) this.playersPage = 1;

    const start = (this.playersPage - 1) * pageSize;
    const end = start + pageSize;

    table.classList.add("table-pagination-fade");
    requestAnimationFrame(() => {
      rows.forEach((row, i) => {
        const visible = i >= start && i < end;
        row.hidden = !visible;
      });
      requestAnimationFrame(() => table.classList.remove("table-pagination-fade"));
    });

    this._renderTablePagination({
      containerId: "players-pagination",
      currentPage: this.playersPage,
      totalItems: total,
      pageSize,
      itemLabel: total === 1 ? "player" : "players",
      onPageChange: (page) => {
        this.playersPage = page;
        this._syncPlayersPagination();
        document
          .getElementById("players-pagination")
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      },
    });
  },

  _syncEventsPagination() {
    const tbody = document.querySelector("#admin-events-table tbody");
    const table = document.getElementById("admin-events-table");
    if (!tbody || !table) return;

    const rows = Array.from(tbody.querySelectorAll("tr"));
    const total = rows.length;
    const pageSize = this.TABLE_PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    if (this.eventsPage > totalPages) this.eventsPage = totalPages;
    if (this.eventsPage < 1) this.eventsPage = 1;

    const start = (this.eventsPage - 1) * pageSize;
    const end = start + pageSize;

    table.classList.add("table-pagination-fade");
    requestAnimationFrame(() => {
      rows.forEach((row, i) => {
        const visible = i >= start && i < end;
        row.hidden = !visible;
      });
      requestAnimationFrame(() => table.classList.remove("table-pagination-fade"));
    });

    this._renderTablePagination({
      containerId: "events-pagination",
      currentPage: this.eventsPage,
      totalItems: total,
      pageSize,
      itemLabel: total === 1 ? "event" : "events",
      onPageChange: (page) => {
        this.eventsPage = page;
        this._syncEventsPagination();
        document
          .getElementById("events-pagination")
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      },
    });
  },

  // ===== Event Review search (replaces dropdown UI; loadAdminReview unchanged) =====
  _reviewEventsList: [],
  _reviewSearchDebounce: null,
  _reviewSearchInitialized: false,
  _reviewSearchActiveIndex: -1,

  initReviewEventSearchUI() {
    if (this._reviewSearchInitialized) return;
    const input = document.getElementById("review-event-search-input");
    const results = document.getElementById("review-event-search-results");
    const clearBtn = document.getElementById("review-event-search-clear");
    const wrap = document.getElementById("review-event-search-wrap");
    if (!input || !results || !wrap) return;

    this._reviewSearchInitialized = true;

    input.addEventListener("input", () => {
      clearTimeout(this._reviewSearchDebounce);
      this._reviewSearchDebounce = setTimeout(() => {
        this._renderReviewEventSearchResults(input.value);
      }, 180);
      if (clearBtn) {
        clearBtn.classList.toggle("hidden", !input.value.trim());
      }
    });

    input.addEventListener("focus", () => {
      this._renderReviewEventSearchResults(input.value);
    });

    input.addEventListener("keydown", (e) => {
      const items = results.querySelectorAll(".review-event-search-item");
      if (!items.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        this._reviewSearchActiveIndex = Math.min(
          this._reviewSearchActiveIndex + 1,
          items.length - 1,
        );
        this._highlightReviewSearchItem(items);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this._reviewSearchActiveIndex = Math.max(
          this._reviewSearchActiveIndex - 1,
          0,
        );
        this._highlightReviewSearchItem(items);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const idx =
          this._reviewSearchActiveIndex >= 0
            ? this._reviewSearchActiveIndex
            : 0;
        const item = items[idx];
        if (item) this.selectReviewEvent(item.dataset.code);
      } else if (e.key === "Escape") {
        this._hideReviewEventSearchResults();
        input.blur();
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        this.clearReviewEventSearch();
      });
    }

    results.addEventListener("click", (e) => {
      const item = e.target.closest(".review-event-search-item");
      if (!item) return;
      this.selectReviewEvent(item.dataset.code);
    });

    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) this._hideReviewEventSearchResults();
    });
  },

  _highlightReviewSearchItem(items) {
    items.forEach((el, i) => {
      el.classList.toggle(
        "review-event-search-item--active",
        i === this._reviewSearchActiveIndex,
      );
    });
    items[this._reviewSearchActiveIndex]?.scrollIntoView({
      block: "nearest",
    });
  },

  _hideReviewEventSearchResults() {
    const results = document.getElementById("review-event-search-results");
    const input = document.getElementById("review-event-search-input");
    if (results) {
      results.classList.add("hidden");
      results.innerHTML = "";
    }
    if (input) input.setAttribute("aria-expanded", "false");
    this._reviewSearchActiveIndex = -1;
  },

  _getReviewEventLabel(code) {
    const list = this._reviewEventsList.length
      ? this._reviewEventsList
      : this.allEvents || [];
    const event = list.find((e) => e.code === code);
    return event ? `${event.name} (${event.code})` : code;
  },

  _syncReviewSearchDisplay() {
    const hidden = document.getElementById("review-event-select");
    const input = document.getElementById("review-event-search-input");
    const clearBtn = document.getElementById("review-event-search-clear");
    if (!hidden || !input) return;

    const code = hidden.value;
    if (code) {
      input.value = this._getReviewEventLabel(code);
      if (clearBtn) clearBtn.classList.remove("hidden");
    }
  },

  _renderReviewEventSearchResults(query) {
    const results = document.getElementById("review-event-search-results");
    const input = document.getElementById("review-event-search-input");
    if (!results || !input) return;

    const list = this._reviewEventsList.length
      ? this._reviewEventsList
      : this.allEvents || [];
    const q = (query || "").toLowerCase().trim();
    const filtered = q
      ? list.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.code.toLowerCase().includes(q),
        )
      : list;

    const slice = filtered.slice(0, 12);
    this._reviewSearchActiveIndex = slice.length ? 0 : -1;

    if (slice.length === 0) {
      results.innerHTML = `<li class="review-event-search-empty" role="presentation">No events match your search.</li>`;
    } else {
      results.innerHTML = slice
        .map((e, i) => {
          const name = this._escapeCertHtml(e.name);
          const code = this._escapeCertHtml(e.code);
          const active =
            i === 0 ? " review-event-search-item--active" : "";
          return `<li class="review-event-search-item${active}" role="option" data-code="${code}" tabindex="-1">
            <span class="review-event-search-name">${name}</span>
            <span class="review-event-search-code">${code}</span>
          </li>`;
        })
        .join("");
    }

    results.classList.remove("hidden");
    input.setAttribute("aria-expanded", "true");
  },

  selectReviewEvent(code) {
    const hidden = document.getElementById("review-event-select");
    const input = document.getElementById("review-event-search-input");
    const clearBtn = document.getElementById("review-event-search-clear");
    if (!hidden || !code) return;

    hidden.value = code;
    if (input) input.value = this._getReviewEventLabel(code);
    if (clearBtn) clearBtn.classList.remove("hidden");
    this._hideReviewEventSearchResults();
    this.loadAdminReview();
  },

  clearReviewEventSearch() {
    const hidden = document.getElementById("review-event-select");
    const input = document.getElementById("review-event-search-input");
    const clearBtn = document.getElementById("review-event-search-clear");
    const container = document.getElementById("review-results");

    if (hidden) hidden.value = "";
    if (input) input.value = "";
    if (clearBtn) clearBtn.classList.add("hidden");
    this._hideReviewEventSearchResults();
    if (container) {
      container.innerHTML =
        "<p>Select an event to review registrations.</p>";
    }
  },
};

// Wrap admin table filters with pagination (existing filter logic unchanged)
(function initAdminTablePagination() {
  const attach = (filterName, pageKey, syncName) => {
    const original = app[filterName].bind(app);
    app[filterName] = function (...args) {
      app[pageKey] = 1;
      original(...args);
      app[syncName]();
    };
  };
  attach("filterPlayers", "playersPage", "_syncPlayersPagination");
  attach("filterEvents", "eventsPage", "_syncEventsPagination");
})();

// Event Review: search UI wraps dropdown population (loadAdminReview unchanged)
(function initReviewEventSearch() {
  app.populateReviewSelector = function (events) {
    app._reviewEventsList = events || app.allEvents || [];
    app.initReviewEventSearchUI();
    app._syncReviewSearchDisplay();
  };

  const origLoadAdminReview = app.loadAdminReview.bind(app);
  app.loadAdminReview = async function (...args) {
    app._syncReviewSearchDisplay();
    return origLoadAdminReview(...args);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () =>
      app.initReviewEventSearchUI(),
    );
  } else {
    app.initReviewEventSearchUI();
  }
})();

// ===== Service Worker =====
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./sw.js")
    .then(() => console.log("✅ Service Worker registered"))
    .catch((err) =>
      console.warn("⚠️ Service Worker registration failed:", err),
    );
}

window.onload = () => app.init();
