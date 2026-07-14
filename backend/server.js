require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { body, validationResult, matchedData } = require("express-validator");
const rateLimit = require("express-rate-limit");

const app = express();

// ===== CORS – restricted to frontend domain(s) =====
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((url) => url.trim())
  : ["http://localhost:5173", "http://localhost:3000", "http://localhost:5500"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));

// ===== RATE LIMITING =====
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many login attempts, please try again later.",
});

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
  passwordHash: { type: String },
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

// ===== HELPER: Hash password =====
const saltRounds = 10;
async function hashPassword(plain) {
  return bcrypt.hash(plain, saltRounds);
}

// ===== SEED =====
async function seedDatabase() {
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      console.log("🌱 Seeding initial data...");
      const adminPass = await hashPassword("admin123");
      const playerPass = await hashPassword("player123");
      await User.create([
        {
          id: "ADMIN",
          name: "System Admin",
          role: "admin",
          password: "admin123",
          passwordHash: adminPass,
          lat: 13.415,
          lng: 123.635,
        },
        {
          id: "P-001",
          name: "Dela Cruz, Juan M.",
          role: "player",
          password: "player123",
          passwordHash: playerPass,
          contact: "09123456789",
          lat: 13.412345,
          lng: 123.631234,
        },
        {
          id: "P-002",
          name: "Penduko, Pedro T.",
          role: "player",
          password: "player123",
          passwordHash: playerPass,
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
      console.log("✅ Sample data seeded with hashed passwords!");
    }
  } catch (error) {
    console.error("❌ Seeding error:", error);
  }
}

// ===== AUTH MIDDLEWARE =====
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token." });
    }
    req.user = user;
    next();
  });
}

// ===== VALIDATION RULES =====
const validateLogin = [
  body("id").notEmpty().withMessage("User ID is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const validatePlayerCreation = [
  body("name").trim().isLength({ min: 1 }).withMessage("Name is required"),
  body("contact").optional().isString(),
  body("lat")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),
  body("lng")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),
];

// ===== PUBLIC ROUTES =====
app.post("/api/login", loginLimiter, validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    const { id, password } = matchedData(req);
    const user = await User.findOne({ id });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    let passwordMatch = false;
    if (user.passwordHash) {
      passwordMatch = await bcrypt.compare(password, user.passwordHash);
    } else {
      passwordMatch = user.password === password;
      if (passwordMatch) {
        user.passwordHash = await hashPassword(password);
        await user.save();
        console.log(`🔐 Upgraded password for user ${id}`);
      }
    }
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );
    await Log.create({
      time: new Date().toLocaleString(),
      message: `${id} logged in.`,
    });
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        contact: user.contact,
        lat: user.lat,
        lng: user.lng,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Server Time (public)
let timeApiFailed = false;
app.get("/api/time", async (req, res) => {
  try {
    const response = await fetch(
      "https://worldtimeapi.org/api/timezone/Asia/Manila",
    );
    if (response.ok) {
      const data = await response.json();
      timeApiFailed = false;
      return res.json({ time: data.dateTime });
    }
  } catch (error) {
    if (!timeApiFailed) {
      console.warn("⚠️ External time API failed, falling back to server time.");
      timeApiFailed = true;
    }
  }
  res.json({ time: new Date().toISOString() });
});

// ===== PROTECTED ROUTES =====
app.use("/api", authenticateToken);

// GET active events
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

// GET all events
app.get("/api/events/all", async (req, res) => {
  try {
    const events = await Event.find().sort({ releaseTime: -1 });
    res.json(events);
  } catch (error) {
    console.error("All events error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET registrations summary
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

// GET registrations for an event
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

// REGISTER PLAYERS
app.post(
  "/api/events/:eventId/register-players",
  [
    body("registrations")
      .isArray({ min: 1 })
      .withMessage("At least one registration required"),
    body("registrations.*.userId")
      .notEmpty()
      .withMessage("Each registration must have a userId"),
    body("registrations.*.pigeonCount")
      .isInt({ min: 1, max: 10 })
      .withMessage("Pigeon count must be between 1 and 10"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }
      const { eventId } = req.params;
      const { registrations } = matchedData(req);
      const event = await Event.findOne({ code: eventId });
      if (!event) return res.status(404).json({ error: "Event not found" });
      if (event.status !== "Active")
        return res.status(400).json({ error: "Event is not active" });

      const results = [];
      for (const reg of registrations) {
        const { userId, pigeonCount } = reg;
        const user = await User.findOne({ id: userId });
        if (!user)
          return res.status(400).json({ error: `User ${userId} not found` });

        const existingCount = await RaceCode.countDocuments({
          eventId,
          userId,
        });
        if (existingCount > 0) {
          return res.status(400).json({
            error: `Player ${user.name} already registered for this event`,
          });
        }

        const generatedCodes = [];
        for (let i = 0; i < pigeonCount; i++) {
          const code = await getUniqueRaceCode();
          if (!code) throw new Error("Failed to generate unique race code");
          await RaceCode.create({ eventId, userId, code, status: "unused" });
          generatedCodes.push(code);
        }
        results.push({ userId, userName: user.name, codes: generatedCodes });
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
  },
);

// CLOCK IN
app.post(
  "/api/clockin",
  [
    body("userId").notEmpty().withMessage("User ID required"),
    body("eventCode").notEmpty().withMessage("Event code required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }
      const { userId, eventCode } = matchedData(req);
      const arrivalTime = new Date(); // server time

      const user = await User.findOne({ id: userId });
      if (!user) return res.status(400).json({ error: "Invalid user" });
      if (user.lat == null || user.lng == null) {
        return res.status(400).json({
          error: "Player loft coordinates missing. Please update profile.",
        });
      }

      const raceCode = await RaceCode.findOneAndUpdate(
        { code: eventCode, status: "unused" },
        { status: "used", usedAt: new Date() },
        { returnDocument: "after" },
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

      const counter = await Counter.findOneAndUpdate(
        { eventId: event.code, userId: userId },
        { $inc: { count: 1 } },
        { upsert: true, returnDocument: "after" },
      );
      const newCount = counter.count;

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
        return res.status(400).json({
          error: "You have already clocked all your pigeons for this event.",
        });
      }

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
        distanceKm = calculateDistance(
          user.lat,
          user.lng,
          event.lat,
          event.lng,
        );
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
  },
);

// RESULTS
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

// LOGS
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

app.post("/api/users/player", validatePlayerCreation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    const { name, contact, lat, lng } = matchedData(req);

    const count = await User.countDocuments({ role: "player" });
    const newId = `P-${String(count + 1).padStart(3, "0")}`;
    const defaultPassword = "player123";
    const hashed = await hashPassword(defaultPassword);

    const user = await User.create({
      id: newId,
      name: name.trim(),
      role: "player",
      password: defaultPassword,
      passwordHash: hashed,
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

// ===== UPDATED PUT: accept lat/lng =====
app.put(
  "/api/users/player/:id",
  [
    body("name")
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage("Name cannot be empty"),
    body("contact").optional().isString(),
    body("lat")
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage("Latitude must be between -90 and 90"),
    body("lng")
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage("Longitude must be between -180 and 180"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }
      const { id } = req.params;
      const { name, contact, lat, lng } = matchedData(req);
      const user = await User.findOne({ id });
      if (!user) return res.status(404).json({ error: "Player not found" });

      if (name !== undefined) user.name = name.trim();
      if (contact !== undefined) user.contact = contact;
      if (lat !== undefined) user.lat = parseFloat(lat.toFixed(6));
      if (lng !== undefined) user.lng = parseFloat(lng.toFixed(6));

      await user.save();
      res.json({ success: true, user });
    } catch (error) {
      console.error("Player update error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
);

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

app.post(
  "/api/events",
  [
    body("name").trim().notEmpty().withMessage("Event name required"),
    body("releaseTime").isISO8601().withMessage("Valid release time required"),
    body("lat").isFloat({ min: -90, max: 90 }),
    body("lng").isFloat({ min: -180, max: 180 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }
      let { name, releaseTime, lat, lng } = matchedData(req);

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
  },
);

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
app.put(
  "/api/users/update-password",
  [
    body("userId").notEmpty().withMessage("User ID required"),
    body("newPassword")
      .isLength({ min: 5 })
      .withMessage("Password must be at least 5 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }
      const { userId, newPassword } = matchedData(req);
      const user = await User.findOne({ id: userId });
      if (!user) return res.status(404).json({ error: "User not found" });
      user.passwordHash = await hashPassword(newPassword);
      user.password = newPassword;
      await user.save();
      res.json({ success: true });
    } catch (error) {
      console.error("Password update error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
);

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

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
