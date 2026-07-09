require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

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
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: String, default: "player", enum: ["admin", "player"] },
  password: { type: String, required: true },
  contact: { type: String },
  lat: {
    type: Number,
    required: function () {
      return this.role === "player";
    },
    min: -90,
    max: 90,
    validate: { validator: (v) => v !== null && v !== undefined && !isNaN(v) },
  },
  lng: {
    type: Number,
    required: function () {
      return this.role === "player";
    },
    min: -180,
    max: 180,
    validate: { validator: (v) => v !== null && v !== undefined && !isNaN(v) },
  },
});

const EventSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  codes: [{ type: String }],
  name: { type: String, required: true },
  releaseTime: { type: Date, required: true },
  status: { type: String, default: "Active", enum: ["Active", "Closed"] },
  lat: { type: Number, required: true, min: -90, max: 90 },
  lng: { type: Number, required: true, min: -180, max: 180 },
});

const RaceCodeSchema = new mongoose.Schema({
  eventId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  code: { type: String, required: true, unique: true },
  status: { type: String, enum: ["unused", "used"], default: "unused" },
  generatedAt: { type: Date, default: Date.now },
  usedAt: { type: Date },
});
// Compound index for query performance (not unique)
RaceCodeSchema.index({ eventId: 1, userId: 1, status: 1 });

const CounterSchema = new mongoose.Schema({
  eventId: { type: String, required: true },
  userId: { type: String, required: true },
  count: { type: Number, default: 0 },
});
CounterSchema.index({ eventId: 1, userId: 1 }, { unique: true });

const ResultSchema = new mongoose.Schema({
  eventId: { type: String, required: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  clockInNumber: { type: Number, required: true },
  clockInCode: { type: String, required: true },
  distanceKm: { type: String, required: true },
  arrivalTime: { type: Date, required: true },
  flightTimeHours: { type: String, required: true },
  speedKPH: { type: Number, required: true },
  speedMPM: { type: Number, required: true },
});
ResultSchema.index({ eventId: 1, userId: 1, clockInCode: 1 }, { unique: true });
ResultSchema.index({ eventId: 1, speedMPM: -1 });

const LogSchema = new mongoose.Schema({
  time: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
LogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

UserSchema.index({ role: 1 });
EventSchema.index({ status: 1 });
EventSchema.index({ releaseTime: -1 });

const User = mongoose.model("User", UserSchema);
const Event = mongoose.model("Event", EventSchema);
const RaceCode = mongoose.model("RaceCode", RaceCodeSchema);
const Counter = mongoose.model("Counter", CounterSchema);
const Result = mongoose.model("Result", ResultSchema);
const Log = mongoose.model("Log", LogSchema);

// ===== SEED =====
async function seedDatabase() {
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      console.log("🌱 Seeding initial data...");
      await User.create([
        {
          id: "ADMIN",
          name: "System Admin",
          role: "admin",
          password: "admin123",
          lat: 13.415,
          lng: 123.635,
        },
        {
          id: "P-001",
          name: "Dela Cruz, Juan M.",
          role: "player",
          password: "player123",
          contact: "09123456789",
          lat: 13.412345,
          lng: 123.631234,
        },
        {
          id: "P-002",
          name: "Penduko, Pedro T.",
          role: "player",
          password: "player123",
          contact: "09987654321",
          lat: 13.418765,
          lng: 123.639876,
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
  } catch (error) {
    console.error("❌ Seeding error:", error);
  }
}

// ===== HELPERS =====
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (
    typeof lat1 !== "number" ||
    typeof lon1 !== "number" ||
    typeof lat2 !== "number" ||
    typeof lon2 !== "number"
  )
    throw new Error("Invalid coordinates");
  const R = 6371.009;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) *
      Math.sin(dLon / 2) *
      Math.cos(lat1Rad) *
      Math.cos(lat2Rad);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Generate an 8‑character code (was 6)
function generateRaceCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++)
    code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function getUniqueRaceCode() {
  let code,
    exists = true,
    attempts = 0;
  while (exists && attempts < 50) {
    code = generateRaceCode();
    const found = await RaceCode.findOne({ code });
    if (!found) exists = false;
    attempts++;
  }
  return code;
}

// ===== LOGIN =====
app.post("/api/login", async (req, res) => {
  try {
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
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== EVENTS =====
app.get("/api/events/active", async (req, res) => {
  try {
    const events = await Event.find({ status: "Active" }).sort({
      releaseTime: -1,
    });
    res.json(events);
  } catch (error) {
    console.error("Active events error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/events/all", async (req, res) => {
  try {
    const events = await Event.find().sort({ releaseTime: -1 });
    res.json(events);
  } catch (error) {
    console.error("All events error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== REGISTRATION SUMMARY =====
app.get("/api/events/registrations-summary", async (req, res) => {
  try {
    const summary = await RaceCode.aggregate([
      {
        $group: {
          _id: "$eventId",
          playerCount: { $addToSet: "$userId" },
          pigeonCount: { $sum: 1 },
        },
      },
      {
        $project: {
          eventId: "$_id",
          playerCount: { $size: "$playerCount" },
          pigeonCount: 1,
        },
      },
    ]);
    res.json(summary);
  } catch (error) {
    console.error("Registrations summary error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== REGISTRATIONS (GET) =====
app.get("/api/events/:eventId/registrations", async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findOne({ code: eventId });
    if (!event) return res.status(404).json({ error: "Event not found" });

    const registrations = await RaceCode.aggregate([
      { $match: { eventId } },
      {
        $group: {
          _id: "$userId",
          codes: { $push: "$code" },
          statuses: { $push: "$status" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          userId: "$_id",
          userName: "$user.name",
          codes: 1,
          statuses: 1,
        },
      },
    ]);
    res.json(registrations);
  } catch (error) {
    console.error("Get registrations error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== REGISTER PLAYERS (POST) – with per‑pigeon retry, 8‑char codes =====
app.post("/api/events/:eventId/register-players", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { registrations } = req.body;

    if (
      !registrations ||
      !Array.isArray(registrations) ||
      registrations.length === 0
    ) {
      return res.status(400).json({ error: "No registrations provided" });
    }

    const event = await Event.findOne({ code: eventId });
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.status !== "Active")
      return res.status(400).json({ error: "Event is not active" });

    const results = [];
    for (const reg of registrations) {
      const { userId, pigeonCount } = reg;

      if (!userId) return res.status(400).json({ error: "UserId is required" });
      if (
        typeof pigeonCount !== "number" ||
        pigeonCount < 1 ||
        pigeonCount > 10
      ) {
        return res
          .status(400)
          .json({
            error: `Invalid pigeon count: ${pigeonCount}. Must be between 1 and 10.`,
          });
      }

      const user = await User.findOne({ id: userId });
      if (!user)
        return res.status(400).json({ error: `User ${userId} not found` });

      // Check if already registered
      const existingCount = await RaceCode.countDocuments({ eventId, userId });
      if (existingCount > 0) {
        return res
          .status(400)
          .json({
            error: `Player ${user.name} already registered for this event`,
          });
      }

      const generatedCodes = [];
      const maxRetries = 5; // increased from 3

      for (let i = 0; i < pigeonCount; i++) {
        let code = null;
        let success = false;
        let attempts = 0;

        while (!success && attempts < maxRetries) {
          try {
            // Generate a unique code (8 chars)
            code = await getUniqueRaceCode();
            if (!code) throw new Error("Failed to generate unique race code");

            // Insert this single code
            await RaceCode.create({
              eventId,
              userId,
              code,
              status: "unused",
            });

            success = true;
            generatedCodes.push(code);
          } catch (err) {
            if (err.code === 11000) {
              attempts++;
              console.warn(
                `Duplicate code for user ${userId}, pigeon ${i + 1}, attempt ${attempts} of ${maxRetries}...`,
              );
              if (attempts >= maxRetries) {
                // Rollback all codes for this user/event
                await RaceCode.deleteMany({ eventId, userId });
                return res.status(500).json({
                  error: `Failed to generate unique code for pigeon ${i + 1} after ${maxRetries} attempts. Please try again.`,
                });
              }
            } else {
              console.error("Registration insertion error:", err);
              await RaceCode.deleteMany({ eventId, userId });
              return res
                .status(500)
                .json({
                  error: "Failed to register player. Please try again.",
                });
            }
          }
        }
      }

      results.push({
        userId,
        userName: user.name,
        codes: generatedCodes,
      });
    }

    await Log.create({
      time: new Date().toLocaleString(),
      message: `Registered players for event ${event.name}`,
    });

    res.json({ success: true, registrations: results });
  } catch (error) {
    console.error("Register players error:", error);
    res.status(500).json({ error: "Server error: " + error.message });
  }
});

// ===== CLOCK IN (with fixed deprecation warnings) =====
app.post("/api/clockin", async (req, res) => {
  try {
    const { userId, eventCode, arrivalTime } = req.body;
    if (!userId || !eventCode || !arrivalTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const user = await User.findOne({ id: userId });
    if (!user) return res.status(400).json({ error: "Invalid user" });
    if (user.lat == null || user.lng == null) {
      return res
        .status(400)
        .json({
          error: "Player loft coordinates missing. Please update profile.",
        });
    }

    // 1. Atomically claim the race code
    const raceCode = await RaceCode.findOneAndUpdate(
      { code: eventCode, status: "unused" },
      { status: "used", usedAt: new Date() },
      { returnDocument: "after" }, // fixed deprecation
    );
    if (!raceCode) {
      return res
        .status(400)
        .json({ error: "Invalid or already used race code." });
    }
    if (raceCode.userId !== userId) {
      await RaceCode.updateOne(
        { _id: raceCode._id },
        { status: "unused", usedAt: null },
      );
      return res
        .status(400)
        .json({ error: "This code does not belong to you." });
    }

    const event = await Event.findOne({ code: raceCode.eventId });
    if (!event) {
      await RaceCode.updateOne(
        { _id: raceCode._id },
        { status: "unused", usedAt: null },
      );
      return res.status(400).json({ error: "Event not found" });
    }
    if (event.status !== "Active") {
      await RaceCode.updateOne(
        { _id: raceCode._id },
        { status: "unused", usedAt: null },
      );
      return res.status(400).json({ error: "Event is not active" });
    }

    // 2. Increment counter atomically
    const counter = await Counter.findOneAndUpdate(
      { eventId: event.code, userId: userId },
      { $inc: { count: 1 } },
      { upsert: true, returnDocument: "after" }, // fixed deprecation
    );
    const newCount = counter.count;

    // 3. Validate count vs total codes
    const totalCodes = await RaceCode.countDocuments({
      eventId: event.code,
      userId,
    });
    if (newCount > totalCodes) {
      await Counter.updateOne(
        { eventId: event.code, userId: userId },
        { $inc: { count: -1 } },
      );
      await RaceCode.updateOne(
        { _id: raceCode._id },
        { status: "unused", usedAt: null },
      );
      return res
        .status(400)
        .json({
          error: "You have already clocked all your pigeons for this event.",
        });
    }

    // 4. Calculate flight time and distance
    const release = new Date(event.releaseTime);
    const arrival = new Date(arrivalTime);
    if (isNaN(release.getTime()) || isNaN(arrival.getTime())) {
      await Counter.updateOne(
        { eventId: event.code, userId: userId },
        { $inc: { count: -1 } },
      );
      await RaceCode.updateOne(
        { _id: raceCode._id },
        { status: "unused", usedAt: null },
      );
      return res.status(400).json({ error: "Invalid date format" });
    }
    const flightHours = (arrival - release) / (1000 * 60 * 60);
    if (flightHours <= 0) {
      await Counter.updateOne(
        { eventId: event.code, userId: userId },
        { $inc: { count: -1 } },
      );
      await RaceCode.updateOne(
        { _id: raceCode._id },
        { status: "unused", usedAt: null },
      );
      return res
        .status(400)
        .json({ error: "Arrival time must be after release time" });
    }

    let distanceKm;
    try {
      distanceKm = calculateDistance(user.lat, user.lng, event.lat, event.lng);
    } catch (err) {
      await Counter.updateOne(
        { eventId: event.code, userId: userId },
        { $inc: { count: -1 } },
      );
      await RaceCode.updateOne(
        { _id: raceCode._id },
        { status: "unused", usedAt: null },
      );
      return res.status(400).json({ error: "Error calculating distance" });
    }

    const speedKPH = parseFloat((distanceKm / flightHours).toFixed(4));
    const speedMPM = parseFloat(
      ((distanceKm * 1000) / (flightHours * 60)).toFixed(4),
    );

    // 5. Create result
    const result = await Result.create({
      eventId: event.code,
      userId: user.id,
      userName: user.name,
      clockInNumber: newCount,
      clockInCode: eventCode,
      distanceKm: distanceKm.toFixed(4),
      arrivalTime: arrival,
      flightTimeHours: flightHours.toFixed(4),
      speedKPH,
      speedMPM,
    });

    await Log.create({
      time: new Date().toLocaleString(),
      message: `${userId} clocked in with code ${eventCode}. Distance: ${distanceKm.toFixed(4)}km, Speed: ${speedMPM.toFixed(4)} m/min`,
    });

    res.json({
      success: true,
      result,
      distance: distanceKm,
      speed: speedMPM,
      eventName: event.name,
    });
  } catch (error) {
    console.error("Clock-in error:", error);
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ error: "This code has already been used for this event." });
    }
    res.status(500).json({ error: "Server error during clock-in" });
  }
});

// ===== RESULTS =====
app.get("/api/results/:eventCode", async (req, res) => {
  try {
    const event = await Event.findOne({
      $or: [{ code: req.params.eventCode }, { codes: req.params.eventCode }],
    });
    if (!event) return res.json([]);
    const results = await Result.find({ eventId: event.code }).sort({
      speedMPM: -1,
    });
    res.json(results);
  } catch (error) {
    console.error("Results error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== LOGS =====
app.get("/api/logs", async (req, res) => {
  try {
    const logs = await Log.find().sort({ _id: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    console.error("Logs error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== PLAYERS CRUD =====
app.get("/api/users/players", async (req, res) => {
  try {
    const users = await User.find({ role: "player" });
    res.json(users);
  } catch (error) {
    console.error("Players error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/users/player/:id", async (req, res) => {
  try {
    const user = await User.findOne({ id: req.params.id });
    if (!user) return res.status(404).json({ error: "Player not found" });
    res.json(user);
  } catch (error) {
    console.error("Player fetch error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/users/player", async (req, res) => {
  try {
    const { name, contact, lat, lng } = req.body;
    if (lat == null || lng == null)
      return res
        .status(400)
        .json({ error: "Latitude and longitude are required" });
    if (typeof lat !== "number" || typeof lng !== "number")
      return res.status(400).json({ error: "Lat/lng must be numbers" });
    if (lat < -90 || lat > 90)
      return res
        .status(400)
        .json({ error: "Latitude must be between -90 and 90" });
    if (lng < -180 || lng > 180)
      return res
        .status(400)
        .json({ error: "Longitude must be between -180 and 180" });
    if (!name || name.trim().length === 0)
      return res.status(400).json({ error: "Name is required" });

    const count = await User.countDocuments({ role: "player" });
    const newId = `P-${String(count + 1).padStart(3, "0")}`;
    const user = await User.create({
      id: newId,
      name: name.trim(),
      role: "player",
      password: "player123",
      contact: contact || "",
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
    });
    res.json({ success: true, user });
  } catch (error) {
    console.error("Player creation error:", error);
    if (error.code === 11000)
      return res.status(400).json({ error: "Duplicate user ID" });
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/users/player/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact } = req.body;
    const user = await User.findOne({ id });
    if (!user) return res.status(404).json({ error: "Player not found" });
    if (name) user.name = name.trim();
    if (contact !== undefined) user.contact = contact;
    await user.save();
    res.json({ success: true, user });
  } catch (error) {
    console.error("Player update error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/users/player/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOneAndDelete({ id });
    if (!user) return res.status(404).json({ error: "Player not found" });
    await Result.deleteMany({ userId: id });
    await RaceCode.deleteMany({ userId: id });
    await Counter.deleteMany({ userId: id });
    res.json({ success: true });
  } catch (error) {
    console.error("Player delete error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== EVENT MANAGEMENT =====
app.delete("/api/events/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const event = await Event.findOneAndDelete({ code });
    if (!event) return res.status(404).json({ error: "Event not found" });
    await Result.deleteMany({ eventId: code });
    await RaceCode.deleteMany({ eventId: code });
    await Counter.deleteMany({ eventId: code });
    res.json({ success: true });
  } catch (error) {
    console.error("Event delete error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/events", async (req, res) => {
  try {
    let { name, releaseTime, lat, lng } = req.body;
    if (lat == null || lng == null)
      return res
        .status(400)
        .json({ error: "Latitude and longitude are required" });
    if (typeof lat !== "number" || typeof lng !== "number")
      return res.status(400).json({ error: "Lat/lng must be numbers" });
    if (lat < -90 || lat > 90)
      return res
        .status(400)
        .json({ error: "Latitude must be between -90 and 90" });
    if (lng < -180 || lng > 180)
      return res
        .status(400)
        .json({ error: "Longitude must be between -180 and 180" });
    if (!name || name.trim().length === 0)
      return res.status(400).json({ error: "Event name is required" });
    if (!releaseTime)
      return res.status(400).json({ error: "Release time is required" });

    let dummyCode = "EVT" + Date.now().toString(36).toUpperCase();
    let existing = await Event.findOne({ code: dummyCode });
    while (existing) {
      dummyCode =
        "EVT" +
        Date.now().toString(36).toUpperCase() +
        Math.random().toString(36).substring(2, 5).toUpperCase();
      existing = await Event.findOne({ code: dummyCode });
    }

    const event = await Event.create({
      code: dummyCode,
      codes: [dummyCode],
      name: name.trim(),
      releaseTime: new Date(releaseTime),
      status: "Active",
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
    });
    res.json({ success: true, event });
  } catch (error) {
    console.error("Event creation error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/events/:code/toggle", async (req, res) => {
  try {
    const event = await Event.findOne({ code: req.params.code });
    if (!event) return res.status(404).json({ error: "Not found" });
    event.status = event.status === "Active" ? "Closed" : "Active";
    await event.save();
    res.json({ success: true, event });
  } catch (error) {
    console.error("Event toggle error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== UPDATE PASSWORD =====
app.put("/api/users/update-password", async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword)
      return res.status(400).json({ error: "Missing required fields" });
    if (newPassword.length < 5)
      return res
        .status(400)
        .json({ error: "Password must be at least 5 characters" });
    const user = await User.findOne({ id: userId });
    if (!user) return res.status(404).json({ error: "User not found" });
    user.password = newPassword;
    await user.save();
    res.json({ success: true });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
