// ===== API Configuration =====
//const API_URL = "http://localhost:5000/api";
const API_URL = "https://estancia-wingsync-backend.onrender.com/api";

// ===== Helper: Fetch with Authorization Header =====
function fetchWithAuth(url, options = {}) {
  const token = sessionStorage.getItem("wingsync_token");
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(url, {
    ...options,
    headers,
  }).then((res) => {
    if (res.status === 401) {
      sessionStorage.removeItem("wingsync_token");
      sessionStorage.removeItem("wingsync_user");
      window.location.reload();
      throw new Error("Session expired. Please log in again.");
    }
    return res;
  });
}

// ===== Helper: Convert decimal hours to HH:MM:SS =====
function formatFlightHours(hours) {
  const totalSeconds = Math.floor(parseFloat(hours) * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ===== Helper: Safely parse numeric values =====
function toNumber(value) {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

// ===== Maps Variables =====
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

// ===== Helper: Parse coordinate string =====
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

// ===== Create Google Map =====
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

    // Coordinate search on Enter
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

// ===== Set Marker =====
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

// ===== MAIN APP =====
const app = {
  currentUser: null,
  eventLookup: {},
  allEvents: [],
  allPlayers: [],
  allResults: {},
  selectedEventCode: null,
  currentRegistrations: [],
  registrationCounts: {},
  _eventsWithSummary: [],

  refreshIntervalId: null,
  serverTimeOffset: 0,
  clockIntervalId: null,
  _lastEventsFetch: 0,
  _isRendering: false,

  init() {
    this.loadTheme();
    this.setupVisibilityListener(); // ADD THIS LINE
    this.syncServerTime();
    setInterval(() => this.syncServerTime(), 30000); // reduced to 30s

    const sessionStr = sessionStorage.getItem("wingsync_user");
    const token = sessionStorage.getItem("wingsync_token");
    if (sessionStr && token) {
      this.currentUser = JSON.parse(sessionStr);
      this.showApp();
    }

    this.initStickerGenerator();
  },

  // ===== STICKER GENERATOR (merged from external script) =====
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

    const SCRATCH_WIDTH_MM = 22;

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

    const renderStickerCanvas = async (
      eventName,
      playerName,
      code,
      widthMm,
      heightMm,
      dpi,
    ) => {
      const widthPx = Math.round((widthMm / 25.4) * dpi);
      const heightPx = Math.round((heightMm / 25.4) * dpi);
      const canvas = document.createElement("canvas");
      canvas.width = widthPx;
      canvas.height = heightPx;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, widthPx, heightPx);

      const topHeightPx = Math.round((6 / 10) * heightPx);
      const bottomHeightPx = heightPx - topHeightPx;
      const marginPx = Math.round((1 / 25.4) * dpi);
      const scratchWidthPx = Math.round((SCRATCH_WIDTH_MM / 25.4) * dpi);

      // QR code
      const qrSizeMm = Math.min(4.5, SCRATCH_WIDTH_MM * 0.28);
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

      // Barcode
      const barcodeHeightMm = 1.6;
      const barcodeHeightPx = Math.round((barcodeHeightMm / 25.4) * dpi);
      const barcodeY = marginPx;
      const gap1 = Math.round((1.2 / 25.4) * dpi);
      const barcodeLeft = qrX + qrSizePx + gap1;
      const barcodeWidth = scratchWidthPx - barcodeLeft - marginPx;

      let bcCanvas = null;
      try {
        bcCanvas = await generateBarcodeCanvas(
          code,
          Math.max(20, barcodeWidth),
          barcodeHeightPx,
        );
      } catch (e) {
        console.warn("Barcode generation failed for", code, e);
      }
      if (bcCanvas) {
        ctx.drawImage(
          bcCanvas,
          barcodeLeft,
          barcodeY,
          Math.max(20, barcodeWidth),
          barcodeHeightPx,
        );
      } else {
        ctx.fillStyle = "#f0f0f0";
        ctx.fillRect(barcodeLeft, barcodeY, barcodeWidth, barcodeHeightPx);
        ctx.fillStyle = "#999";
        ctx.font = `${Math.round(barcodeHeightPx * 0.5)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          "Barcode",
          barcodeLeft + barcodeWidth / 2,
          barcodeY + barcodeHeightPx / 2,
        );
      }

      // CODE TEXT
      const codeText = code;
      const gap2 = Math.round((0.8 / 25.4) * dpi);
      const codeY = barcodeY + barcodeHeightPx + gap2;
      const codeAvailableHeight = topHeightPx - codeY - marginPx;
      const codeAvailableWidth = barcodeWidth;

      const maxFontByHeight = codeAvailableHeight * 0.95;
      const maxFontByWidth = codeAvailableWidth / (codeText.length * 0.6);
      let codeFontSize = Math.min(
        maxFontByHeight,
        maxFontByWidth,
        Math.round((5.0 / 25.4) * dpi),
      );
      codeFontSize = Math.min(48, Math.max(16, Math.round(codeFontSize)));
      const letterSpacing = Math.min(
        3,
        Math.max(1, Math.round(codeFontSize * 0.05)),
      );

      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#000000";
      ctx.font = `bold ${codeFontSize}px monospace`;

      let totalWidth = 0;
      const charWidths = [];
      for (let i = 0; i < codeText.length; i++) {
        const char = codeText[i];
        const metrics = ctx.measureText(char);
        const w = metrics.width;
        charWidths.push(w);
        totalWidth += w;
      }
      totalWidth += (codeText.length - 1) * letterSpacing;

      const centerX = barcodeLeft + barcodeWidth / 2;
      let currentX = centerX - totalWidth / 2;

      for (let i = 0; i < codeText.length; i++) {
        ctx.fillText(codeText[i], currentX, codeY);
        currentX += charWidths[i] + letterSpacing;
      }

      // Bottom section
      const bottomY = topHeightPx;
      const fontSizePx = Math.min(
        Math.round((2.2 / 25.4) * dpi),
        Math.round(bottomHeightPx * 0.6),
      );

      let eventLabel = eventName || "Event";
      let playerLabel = playerName || "Player";

      let testSize = fontSizePx;
      const leftX = marginPx;
      const rightX = widthPx - marginPx;
      const centerY = bottomY + bottomHeightPx / 2;
      const maxWidth = widthPx * 0.42;

      ctx.font = `${testSize}px sans-serif`;
      while (testSize > 8 && ctx.measureText(eventLabel).width > maxWidth) {
        testSize -= 1;
        ctx.font = `${testSize}px sans-serif`;
      }
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#000000";
      ctx.fillText(eventLabel, leftX, centerY);

      testSize = fontSizePx;
      ctx.font = `${testSize}px sans-serif`;
      while (testSize > 8 && ctx.measureText(playerLabel).width > maxWidth) {
        testSize -= 1;
        ctx.font = `${testSize}px sans-serif`;
      }
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#000000";
      ctx.fillText(playerLabel, rightX, centerY);

      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1.0;
      ctx.strokeRect(0, 0, widthPx, heightPx);

      ctx.strokeStyle = "#e0e0e0";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 3]);
      ctx.strokeRect(
        marginPx,
        marginPx,
        scratchWidthPx - marginPx,
        topHeightPx - marginPx,
      );
      ctx.setLineDash([]);

      return canvas;
    };

    const renderAllStickers = async (stickers, widthMm) => {
      const container = document.getElementById("sticker-grid-container");
      if (!container) return;

      if (!stickers || stickers.length === 0) {
        container.innerHTML = `
          <div class="sticker-empty-state">
            <i class="fas fa-tags" style="font-size:56px; display:block; margin-bottom:12px; color:#ccc;"></i>
            <h3>No Stickers to Generate</h3>
            <p>Register players to an event first, then click "Generate Stickers".</p>
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
        img.alt = `Sticker ${data.code}`;
        img.style.width = "100%";
        img.style.height = "auto";
        img.style.borderRadius = "3px";
        wrapper.appendChild(img);

        const playerDiv = document.createElement("div");
        playerDiv.className = "sticker-player";
        playerDiv.textContent = data.playerName;
        wrapper.appendChild(playerDiv);

        const codeDiv = document.createElement("div");
        codeDiv.className = "sticker-label";
        codeDiv.textContent = data.code;
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
            );
            const imgData = canvas.toDataURL("image/png");
            doc.addImage(imgData, "PNG", x, y, widthMm, heightMm);
            stickerIndex++;
          }
        }
      }
      return doc;
    };

    // --- Expose sticker functions on app ---
    this._stickerState = state;

    this.loadStickersForEvent = async function () {
      const select = document.getElementById("sticker-event-select");
      const eventCode = select ? select.value : "";
      if (!eventCode) {
        document.getElementById("sticker-grid-container").innerHTML = `
          <div class="sticker-empty-state">
            <i class="fas fa-list-ul" style="font-size:56px; display:block; margin-bottom:12px; color:#ccc;"></i>
            <h3>Select an Event</h3>
            <p>Choose an event from the dropdown to generate stickers.</p>
          </div>
        `;
        document.getElementById("sticker-total-count").textContent =
          "0 stickers";
        return;
      }

      try {
        const res = await fetchWithAuth(
          `${API_URL}/events/${eventCode}/registrations`,
        );
        if (!res.ok) throw new Error("Failed to fetch registrations");
        const registrations = await res.json();

        const stickers = [];
        for (const reg of registrations) {
          const playerName = reg.userName || "Player";
          for (let i = 0; i < reg.codes.length; i++) {
            stickers.push({
              playerName: playerName,
              code: reg.codes[i],
              status: reg.statuses ? reg.statuses[i] : "unused",
            });
          }
        }

        const eventRes = await fetchWithAuth(`${API_URL}/events/all`);
        const events = await eventRes.json();
        const evt = events.find((e) => e.code === eventCode);
        if (evt) {
          state.eventName = evt.name;
          state.eventId = eventCode;
        }

        state.stickers = stickers;
        await renderAllStickers(stickers, state.widthMm);
      } catch (e) {
        console.error("Load stickers error:", e);
        app.showModal({
          title: "Failed to Load Stickers",
          message: e.message || "Could not load stickers.",
          icon: "❌",
          iconColor: "#c0392b",
        });
      }
    };

    this.generateStickers = function () {
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
      this.loadStickersForEvent();
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

  // ===== VISIBILITY LISTENER (NEW) =====
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
        }
        this.updateClockDisplay();
      }
    });
  },

  // ===== SERVER TIME SYNC =====
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

  // ===== CUSTOM MODAL =====
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

  // ===== AUTH =====
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
    } else {
      adminEls.forEach((el) => el.classList.add("hidden"));
      playerEls.forEach((el) => el.classList.remove("hidden"));
      document
        .getElementById("player-clock-in-area")
        .classList.remove("hidden");
      this.loadPlayerStats();
    }

    if (document.getElementById("server-clock")) {
      if (this.clockIntervalId) clearInterval(this.clockIntervalId);
      this.clockIntervalId = setInterval(() => this.updateClockDisplay(), 1000);
    }

    this.navigate("dashboard");
    this.loadProfile();
    this.fetchAllEvents();
  },

  // === Fetch all events and update lookup ===
  fetchAllEvents() {
    return fetchWithAuth(`${API_URL}/events/all`)
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
      })
      .catch((err) => {
        console.error("Failed to fetch events for lookup:", err);
        this.allEvents = [];
        this.eventLookup = {};
      });
  },

  // === Fetch registration counts ===
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
    if (view === "sticker-generator") {
      this.populateStickerSelector(this.allEvents);
      // If there's a selected event in the register modal, pre-select it
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
      const currentView = document.querySelector(".view-section:not(.hidden)");
      if (currentView) {
        const id = currentView.id;
        if (id === "view-results") {
          this.renderResults();
        } else if (id === "view-dashboard") {
          this.renderDashboard();
        }
      }
    }, 5000);
  },

  stopAutoRefresh() {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  },

  renderDashboard() {
    Promise.all([
      fetchWithAuth(`${API_URL}/events/active`).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }),
      fetchWithAuth(`${API_URL}/events/registrations-summary`).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }),
    ])
      .then(([events, summary]) => {
        if (!Array.isArray(events)) events = [];
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
        thead.appendChild(headerRow);
        table.innerHTML = "";
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
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
          tdStatus.textContent = e.status;
          row.appendChild(tdStatus);

          tbody.appendChild(row);
        });
        table.appendChild(tbody);
      })
      .catch((err) => {
        console.error("Dashboard error:", err);
        const table = document.querySelector("#active-events-table");
        table.innerHTML = `<tbody><tr><td colspan="4" style="text-align:center; color:#999; padding:20px;">Could not load events. Please refresh.</td></tr></tbody>`;
      });
  },

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

        const eventName = data.eventName || "Unknown Event";
        const now = this.getServerTime();
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
    const loadData = () => {
      return this.fetchAllEvents()
        .then(() => this.fetchRegistrationCounts())
        .then(() => this.setupResultsView())
        .catch((err) => {
          console.error("Results init error:", err);
          this.allEvents = [];
          this.setupResultsView();
        });
    };

    if (this.allEvents.length === 0) {
      loadData();
    } else {
      if (Object.keys(this.registrationCounts).length === 0) {
        this.fetchRegistrationCounts().then(() => this.setupResultsView());
      } else {
        this.setupResultsView();
      }
    }
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

  // ===== FILTER RESULTS (without auto-select) =====
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

  // ===== renderResults with fixes =====
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

      if (Date.now() - this._lastEventsFetch > 10000) {
        await this.fetchAllEvents();
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
        const status = event.status.toLowerCase();
        statusBadge.textContent = event.status;
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
        td.colSpan = 6;
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

      // Highlights
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
      document.getElementById("hl-longest-dist").innerHTML = longestDist
        ? `${longestDist.distanceKm.toFixed(2)} <span class="unit">km</span>`
        : "—";
      document.getElementById("hl-closest-finish").textContent =
        closestFinish > 0 ? `${closestFinish.toFixed(2)} m/min` : "—";
      document.getElementById("hl-highest-speed").innerHTML = highestSpeed
        ? `${highestSpeed.speedMPM.toFixed(2)} <span class="unit">m/min</span>`
        : "—";

      // Table rows
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

        const tdDist = document.createElement("td");
        tdDist.setAttribute("data-label", "Air Dist");
        tdDist.textContent = r.distanceKm + " km";
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
          '<tr><td colspan="6" style="text-align:center; color:#999; padding:20px;">Error loading results.</td></tr>';
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
          const small = document.createElement("small");
          small.textContent = `[${log.time}]`;
          li.appendChild(small);
          li.appendChild(document.createElement("br"));
          const textSpan = document.createElement("span");
          textSpan.textContent = log.message;
          li.appendChild(textSpan);
          list.appendChild(li);
        });
      })
      .catch((err) => console.error("Logs error:", err));
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
      const regBtn = document.createElement("button");
      regBtn.className = "btn btn-primary btn-sm";
      regBtn.textContent = "📝 Register Players";
      regBtn.onclick = () => app.openRegisterModal(e.code);
      tdActions.appendChild(regBtn);

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

      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });
  },

  openRegisterModal(eventCode) {
    this.currentEventCode = eventCode;
    const modal = document.getElementById("modal-register-players");
    modal.classList.add("show");
    this.loadRegistrations(eventCode);
  },

  loadRegistrations(eventCode) {
    fetchWithAuth(`${API_URL}/events/${eventCode}/registrations`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((registrations) => {
        if (!Array.isArray(registrations)) registrations = [];
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
    fetchWithAuth(`${API_URL}/users/players`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch players");
        return res.json();
      })
      .then((players) => {
        if (!Array.isArray(players)) players = [];
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

    tbody.innerHTML = "";
    if (this.currentRegistrations && this.currentRegistrations.length > 0) {
      this.currentRegistrations.forEach((r) => {
        const tr = document.createElement("tr");
        const tdPlayer = document.createElement("td");
        const strong = document.createElement("strong");
        strong.textContent = r.userName;
        tdPlayer.appendChild(strong);
        tr.appendChild(tdPlayer);

        const tdCodes = document.createElement("td");
        r.codes.forEach((code, idx) => {
          const status = r.statuses[idx];
          const span = document.createElement("span");
          span.className = "code-item";

          const codeSpan = document.createElement("span");
          codeSpan.textContent = code;
          span.appendChild(codeSpan);
          span.appendChild(document.createTextNode(" "));

          const badge = document.createElement("span");
          badge.className = status === "unused" ? "badge-unused" : "badge-used";
          badge.textContent = status === "unused" ? "✅ Unused" : "⏳ Used";
          span.appendChild(badge);

          tdCodes.appendChild(span);
          if (idx < r.codes.length - 1) {
            tdCodes.appendChild(document.createTextNode(" "));
          }
        });
        tr.appendChild(tdCodes);

        const tdStatus = document.createElement("td");
        const total = r.codes.length;
        const used = r.statuses.filter((s) => s === "used").length;
        const unused = total - used;
        tdStatus.innerHTML = `
          <span class="badge-total">${total} total</span>
          <span class="badge-unused">${unused} unused</span>
          <span class="badge-used">${used} used</span>
        `;
        tr.appendChild(tdStatus);

        tbody.appendChild(tr);
      });
    } else {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 3;
      td.style.textAlign = "center";
      td.style.color = "#999";
      td.style.padding = "20px";
      td.textContent = "No players registered yet.";
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
  },

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

    fetchWithAuth(`${API_URL}/events/${eventCode}/register-players`, {
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

  toggleEvent(code) {
    fetchWithAuth(`${API_URL}/events/${code}/toggle`, { method: "PUT" })
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
    fetchWithAuth(`${API_URL}/events/${eventCode}`, { method: "DELETE" })
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

    fetchWithAuth(`${API_URL}/events`, {
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
};

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
