require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ===== CONNECT TO MONGODB =====
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ Connected to MongoDB Atlas");
    await seedDatabase();
  })
  .catch((err) => console.error("❌ DB Error:", err));

// ===== SCHEMAS =====
const UserSchema = new mongoose.Schema({
  id: String,
  name: String,
  role: { type: String, default: "player" },
  password: String,
  contact: String,
  lat: Number,
  lng: Number,
});
const EventSchema = new mongoose.Schema({
  code: String,
  codes: [String],
  name: String,
  releaseTime: Date,
  status: { type: String, default: "Active" },
  lat: Number,
  lng: Number,
});
const ResultSchema = new mongoose.Schema({
  eventId: String,
  userId: String,
  userName: String,
  clockInNumber: Number,
  clockInCode: String,
  distanceKm: String,
  arrivalTime: Date,
  flightTimeHours: String,
  speedKPH: Number,
  speedMPM: Number,
});
const LogSchema = new mongoose.Schema({
  time: String,
  message: String,
});

const User = mongoose.model("User", UserSchema);
const Event = mongoose.model("Event", EventSchema);
const Result = mongoose.model("Result", ResultSchema);
const Log = mongoose.model("Log", LogSchema);

// ===== SEED DATABASE =====
async function seedDatabase() {
  const count = await User.countDocuments();
  if (count === 0) {
    console.log("🌱 Seeding initial data...");
    await User.create([
      {
        id: "ADMIN",
        name: "System Admin",
        role: "admin",
        password: "admin123",
      },
      {
        id: "P-001",
        name: "Dela Cruz, Juan M.",
        role: "player",
        password: "player123",
        contact: "09123456789",
        lat: 13.412,
        lng: 123.631,
      },
      {
        id: "P-002",
        name: "Penduko, Pedro T.",
        role: "player",
        password: "player123",
        contact: "09987654321",
        lat: 13.418,
        lng: 123.639,
      },
    ]);
    await Event.create({
      code: "EST2026",
      codes: ["EST2026"],
      name: "Estancia Opening Race",
      releaseTime: new Date(Date.now() - 6 * 60 * 60 * 1000),
      status: "Active",
      lat: 12.9744,
      lng: 124.0058,
    });
    console.log("✅ Sample data seeded!");
  }
}

// ===== HAVERSINE =====
function calculateDistance(lat1, lon1, lat2, lon2) {
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
}

// ===== CODE GENERATION HELPERS =====
function generateRandomCode() {
  const digits = String(Math.floor(Math.random() * 90 + 10));
  const letters =
    String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
    String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
    String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return digits + letters;
}

async function codeExists(code) {
  return await Event.findOne({
    $or: [{ code }, { codes: code }],
  });
}

async function getUniqueEventCode() {
  let code;
  let exists = true;
  while (exists) {
    code = generateRandomCode();
    const existing = await codeExists(code);
    if (!existing) exists = false;
  }
  return code;
}

async function getUniqueEventCodes(count = 3) {
  const codes = [];
  while (codes.length < count) {
    const code = await getUniqueEventCode();
    if (!codes.includes(code)) codes.push(code);
  }
  return codes;
}

// ===== API ROUTES =====
app.post("/api/login", async (req, res) => {
  const { id, password } = req.body;
  const user = await User.findOne({ id, password });
  if (user) {
    await Log.create({
      time: new Date().toLocaleString(),
      message: `${id} logged in.`,
    });
    res.json({ success: true, user });
  } else {
    res.json({ success: false });
  }
});

app.get("/api/events/active", async (req, res) => {
  const events = await Event.find({ status: "Active" });
  res.json(events);
});

app.get("/api/events/all", async (req, res) => {
  const events = await Event.find();
  res.json(events);
});

app.get("/api/events/generate-code", async (req, res) => {
  const count = parseInt(req.query.count, 10) || 3;
  const codes = await getUniqueEventCodes(count);
  res.json({ codes });
});

app.post("/api/clockin", async (req, res) => {
  const { userId, eventCode, arrivalTime } = req.body;
  const user = await User.findOne({ id: userId });
  const event = await Event.findOne({
    status: "Active",
    $or: [{ code: eventCode }, { codes: eventCode }],
  });

  if (!user || !event)
    return res.status(400).json({ error: "Invalid user or event" });

  // Validate coordinates
  if (typeof user.lat !== "number" || typeof user.lng !== "number") {
    return res
      .status(400)
      .json({ error: "Player loft coordinates are missing or invalid" });
  }

  // ===== 1. Check if this specific code has already been used =====
  const codeUsed = await Result.findOne({
    eventId: event.code,
    userId,
    clockInCode: eventCode,
  });
  if (codeUsed) {
    return res
      .status(400)
      .json({ error: "This code has already been used for this event." });
  }

  // ===== 2. Count total clock‑ins for this user in this event =====
  const existingCount = await Result.countDocuments({
    eventId: event.code,
    userId,
  });
  if (existingCount >= 3) {
    return res
      .status(400)
      .json({ error: "Maximum 3 clock-ins reached for this event" });
  }

  const release = new Date(event.releaseTime);
  const arrival = new Date(arrivalTime);
  const flightHours = (arrival - release) / (1000 * 60 * 60);
  if (flightHours <= 0)
    return res.status(400).json({ error: "Arrival before release" });

  const distanceKm = calculateDistance(
    user.lat,
    user.lng,
    event.lat,
    event.lng,
  );
  const speedKPH = parseFloat((distanceKm / flightHours).toFixed(2));
  const speedMPM = parseFloat(
    ((distanceKm * 1000) / (flightHours * 60)).toFixed(2),
  );

  const result = await Result.create({
    eventId: event.code,
    userId: user.id,
    userName: user.name,
    clockInNumber: existingCount + 1,
    clockInCode: eventCode,
    distanceKm: distanceKm.toFixed(3),
    arrivalTime: arrival,
    flightTimeHours: flightHours.toFixed(2),
    speedKPH: speedKPH,
    speedMPM: speedMPM,
  });

  await Log.create({
    time: new Date().toLocaleString(),
    message: `${userId} clocked in with code ${eventCode}. Speed: ${speedMPM} m/min`,
  });

  res.json({ success: true, result, distance: distanceKm, speed: speedMPM });
});

app.get("/api/results/:eventCode", async (req, res) => {
  const event = await Event.findOne({
    $or: [{ code: req.params.eventCode }, { codes: req.params.eventCode }],
  });
  if (!event) return res.json([]);
  const results = await Result.find({ eventId: event.code }).sort({
    speedMPM: -1,
  });
  res.json(results);
});

app.get("/api/logs", async (req, res) => {
  const logs = await Log.find().sort({ _id: -1 }).limit(50);
  res.json(logs);
});

app.get("/api/users/players", async (req, res) => {
  const users = await User.find({ role: "player" });
  res.json(users);
});

app.get("/api/users/player/:id", async (req, res) => {
  const { id } = req.params;
  const user = await User.findOne({ id });
  if (!user) return res.status(404).json({ error: "Player not found" });
  res.json(user);
});

app.post("/api/users/player", async (req, res) => {
  const { name, contact, lat, lng } = req.body;
  const count = await User.countDocuments({ role: "player" });
  const newId = `P-${String(count + 1).padStart(3, "0")}`;
  const user = await User.create({
    id: newId,
    name,
    role: "player",
    password: "player123",
    contact,
    lat,
    lng,
  });
  res.json({ success: true, user });
});

app.put("/api/users/player/:id", async (req, res) => {
  const { id } = req.params;
  const { name, contact } = req.body;
  const user = await User.findOne({ id });
  if (!user) return res.status(404).json({ error: "Player not found" });
  user.name = name;
  user.contact = contact;
  await user.save();
  res.json({ success: true, user });
});

app.delete("/api/users/player/:id", async (req, res) => {
  const { id } = req.params;
  const user = await User.findOneAndDelete({ id });
  if (!user) return res.status(404).json({ error: "Player not found" });
  await Result.deleteMany({ userId: id });
  res.json({ success: true });
});

app.delete("/api/events/:code", async (req, res) => {
  const { code } = req.params;
  const event = await Event.findOneAndDelete({ code });
  if (!event) return res.status(404).json({ error: "Event not found" });
  await Result.deleteMany({ eventId: code });
  res.json({ success: true });
});

app.post("/api/events", async (req, res) => {
  let { codes, name, releaseTime, lat, lng } = req.body;

  if (!Array.isArray(codes) || codes.length === 0) {
    codes = await getUniqueEventCodes(3);
  }

  codes = codes.map((code) => code.trim().toUpperCase()).filter(Boolean);
  if (codes.length === 0)
    return res
      .status(400)
      .json({ error: "At least one event code is required" });

  const uniqueCodes = [...new Set(codes)];
  if (uniqueCodes.length !== codes.length)
    return res
      .status(400)
      .json({ error: "Duplicate event codes are not allowed" });

  for (const code of codes) {
    const existing = await codeExists(code);
    if (existing)
      return res
        .status(400)
        .json({ error: `Event code already exists: ${code}` });
  }

  const event = await Event.create({
    code: codes[0],
    codes,
    name,
    releaseTime: new Date(releaseTime),
    status: "Active",
    lat,
    lng,
  });
  res.json({ success: true, event });
});

app.put("/api/events/:code/toggle", async (req, res) => {
  const event = await Event.findOne({ code: req.params.code });
  if (!event) return res.status(404).json({ error: "Not found" });
  event.status = event.status === "Active" ? "Closed" : "Active";
  await event.save();
  res.json({ success: true, event });
});

app.put("/api/users/update-password", async (req, res) => {
  const { userId, newPassword } = req.body;
  const user = await User.findOne({ id: userId });
  if (!user) return res.status(404).json({ error: "User not found" });
  user.password = newPassword;
  await user.save();
  res.json({ success: true });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
