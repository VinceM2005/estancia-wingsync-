require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { body, validationResult, matchedData } = require("express-validator");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const crypto = require("crypto");

const app = express();

// ===== CORS =====
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

app.use(helmet());
app.use(express.json({ limit: "10mb" }));

app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// ===== RATE LIMITING =====
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
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

const registrationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: "Too many registration attempts, please try again later.",
});
const clockinLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: "Too many clock‑in attempts, please try again later.",
});

// ===== CONNECT TO MONGODB =====
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
  })
  .then(async () => {
    console.log("✅ Connected to MongoDB Atlas");
    await seedDatabase();
    await migrateEvents();
  })
  .catch((err) => console.error("❌ DB Error:", err));

// ============================================================
//  SCHEMAS & MODELS
// ============================================================

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: String, default: "player", enum: ["admin", "player"] },
  passwordHash: { type: String, required: true },
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
  name: { type: String, required: true },
  releaseTime: { type: Date, required: true },
  status: { type: String, default: "Active", enum: ["Active", "Closed"] },
  lat: { type: Number, required: true, min: -90, max: 90 },
  lng: { type: Number, required: true, min: -180, max: 180 },
  state: {
    type: String,
    enum: [
      "Draft",
      "Registration Open",
      "Registration Closed",
      "Sticker Generated",
      "Ready for Release",
      "Live Race",
      "Result Verification",
      "Completed",
      "Archived",
    ],
    default: "Draft",
  },
  registrationDeadline: { type: Date },
  certificatesGenerated: { type: Boolean, default: false },
});

const RaceCodeSchema = new mongoose.Schema({
  eventId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  code: { type: String, required: true, unique: true },
  status: { type: String, enum: ["unused", "used"], default: "unused" },
  generatedAt: { type: Date, default: Date.now },
  usedAt: { type: Date },
  registrationId: { type: String, ref: "EventRegistration" },
  pigeonId: { type: String, ref: "Pigeon" },
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
  distanceKm: { type: Number, required: true },
  arrivalTime: { type: Date, required: true },
  flightTimeHours: { type: Number, required: true },
  speedKPH: { type: Number, required: true },
  speedMPM: { type: Number, required: true },
  pigeonId: { type: String, ref: "Pigeon" },
  registrationId: { type: String, ref: "EventRegistration" },
});
ResultSchema.index({ eventId: 1, userId: 1, clockInCode: 1 }, { unique: true });
ResultSchema.index({ eventId: 1, speedMPM: -1 });
ResultSchema.index({ eventId: 1, pigeonId: 1 });

const LogSchema = new mongoose.Schema({
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
LogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

// ===== PIGEON & REGISTRATION SCHEMAS =====
const PigeonSchema = new mongoose.Schema({
  ringNumber: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true, index: true },
  nickname: { type: String, default: "" },
  gender: {
    type: String,
    enum: ["Male", "Female", "Unknown"],
    default: "Unknown",
  },
  color: { type: String, default: "" },
  birthYear: { type: Number, min: 1900, max: new Date().getFullYear() },
  photo: { type: String, default: "" },
  status: {
    type: String,
    enum: ["Active", "Lost", "Sold", "Retired", "Dead"],
    default: "Active",
  },
  createdAt: { type: Date, default: Date.now },
});
PigeonSchema.index({ ringNumber: 1 }, { unique: true });
PigeonSchema.index({ ownerId: 1, status: 1 });

// ===== FIX: Disable version key to avoid conflicts =====
const EventRegistrationSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, index: true },
    playerId: { type: String, required: true, index: true },
    pigeonIds: [{ type: String, ref: "Pigeon" }],
    status: {
      type: String,
      enum: ["draft", "confirmed", "locked"],
      default: "draft",
    },
    registrationDate: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);
EventRegistrationSchema.index(
  { eventId: 1, playerId: 1, pigeonIds: 1 },
  { unique: true, sparse: true },
);
EventRegistrationSchema.index({ eventId: 1, playerId: 1 });

// ===== CERTIFICATE SCHEMA =====
const CertificateSchema = new mongoose.Schema({
  certificateNumber: { type: String, required: true, unique: true },
  eventId: { type: String, required: true, index: true },
  playerId: { type: String, required: true, index: true },
  pigeonId: { type: String, ref: "Pigeon", required: true },
  rank: { type: Number, required: true },
  speed: { type: Number, required: true },
  distance: { type: Number, required: true },
  issueDate: { type: Date, default: Date.now },
  qrHash: { type: String, required: true, unique: true },
});
CertificateSchema.index({ playerId: 1, eventId: 1 });
CertificateSchema.index({ qrHash: 1 });

const User = mongoose.model("User", UserSchema);
const Event = mongoose.model("Event", EventSchema);
const RaceCode = mongoose.model("RaceCode", RaceCodeSchema);
const Counter = mongoose.model("Counter", CounterSchema);
const Result = mongoose.model("Result", ResultSchema);
const Log = mongoose.model("Log", LogSchema);
const Pigeon = mongoose.model("Pigeon", PigeonSchema);
const EventRegistration = mongoose.model(
  "EventRegistration",
  EventRegistrationSchema,
);
const Certificate = mongoose.model("Certificate", CertificateSchema);

// ============================================================
//  HELPERS
// ============================================================
const saltRounds = 10;
async function hashPassword(plain) {
  return bcrypt.hash(plain, saltRounds);
}

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
  while (exists && attempts < 100) {
    code = generateRaceCode();
    const found = await RaceCode.findOne({ code });
    if (!found) exists = false;
    attempts++;
  }
  if (exists) {
    throw new Error("Could not generate a unique race code after 100 attempts");
  }
  return code;
}

// ============================================================
//  SEED & MIGRATION
// ============================================================
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
          passwordHash: adminPass,
          lat: 13.415,
          lng: 123.635,
        },
        {
          id: "P-001",
          name: "Dela Cruz, Juan M.",
          role: "player",
          passwordHash: playerPass,
          contact: "09123456789",
          lat: 13.412345,
          lng: 123.631234,
        },
        {
          id: "P-002",
          name: "Penduko, Pedro T.",
          role: "player",
          passwordHash: playerPass,
          contact: "09987654321",
          lat: 13.418765,
          lng: 123.639876,
        },
      ]);
      await Event.create({
        code: "EST2026",
        name: "Estancia Opening Race",
        releaseTime: new Date(Date.now() - 6 * 60 * 60 * 1000),
        status: "Active",
        lat: 12.9744,
        lng: 124.0058,
        state: "Live Race",
        registrationDeadline: new Date(Date.now() - 7 * 60 * 60 * 1000),
      });
      console.log("✅ Sample data seeded with hashed passwords!");
    }
  } catch (error) {
    console.error("❌ Seeding error:", error);
  }
}

async function migrateEvents() {
  try {
    const events = await Event.find({ state: { $exists: false } });
    if (events.length === 0) return;
    console.log(`🔄 Migrating ${events.length} events to new state field...`);
    for (const ev of events) {
      let state;
      if (ev.status === "Active") {
        state = "Live Race";
      } else if (ev.status === "Closed") {
        state = "Completed";
      } else {
        state = "Draft";
      }
      if (!ev.registrationDeadline) {
        ev.registrationDeadline = ev.releaseTime;
      }
      ev.state = state;
      await ev.save();
    }
    console.log("✅ Event migration complete.");
  } catch (err) {
    console.error("❌ Event migration error:", err);
  }
}

// ============================================================
//  AUTH MIDDLEWARE
// ============================================================
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

const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
};

// ============================================================
//  VALIDATION RULES
// ============================================================
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

// ============================================================
//  PUBLIC ROUTES
// ============================================================
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
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );
    await Log.create({ message: `${id} logged in.` });
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
    res
      .status(500)
      .json({ error: "An internal error occurred. Please try again later." });
  }
});

let timeApiFailed = false;
app.get("/api/time", async (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
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

// ============================================================
//  PROTECTED ROUTES (authenticated)
// ============================================================
app.use("/api", authenticateToken);

// ----- Existing routes (with minor extensions) -----
app.get("/api/events/active", async (req, res) => {
  try {
    const events = await Event.find({ status: "Active" }).sort({
      releaseTime: -1,
    });
    res.json(events);
  } catch (error) {
    console.error("Active events error:", error);
    res.status(500).json({ error: "An internal error occurred." });
  }
});

app.get("/api/events/all", async (req, res) => {
  try {
    const events = await Event.find().sort({ releaseTime: -1 });
    res.json(events);
  } catch (error) {
    console.error("All events error:", error);
    res.status(500).json({ error: "An internal error occurred." });
  }
});

app.get("/api/events/registrations-summary", async (req, res) => {
  try {
    const raceCodeSummary = await RaceCode.aggregate([
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

    const eventRegSummary = await EventRegistration.aggregate([
      {
        $group: {
          _id: "$eventId",
          playerIds: { $addToSet: "$playerId" },
          pigeonIds: { $push: "$pigeonIds" },
        },
      },
      {
        $project: {
          eventId: "$_id",
          playerCount: { $size: "$playerIds" },
          pigeonCount: {
            $size: {
              $reduce: {
                input: "$pigeonIds",
                initialValue: [],
                in: { $concatArrays: ["$$value", "$$this"] },
              },
            },
          },
        },
      },
    ]);

    const allEventIds = new Set([
      ...raceCodeSummary.map((r) => r.eventId),
      ...eventRegSummary.map((r) => r.eventId),
    ]);

    const result = [];
    for (const eventId of allEventIds) {
      const race = raceCodeSummary.find((r) => r.eventId === eventId);
      const reg = eventRegSummary.find((r) => r.eventId === eventId);
      const playerCount = Math.max(
        race ? race.playerCount : 0,
        reg ? reg.playerCount : 0,
      );
      const pigeonCount =
        (race ? race.pigeonCount : 0) + (reg ? reg.pigeonCount : 0);
      result.push({ eventId, playerCount, pigeonCount });
    }

    res.json(result);
  } catch (error) {
    console.error("Registrations summary error:", error);
    res.status(500).json({ error: "An internal error occurred." });
  }
});

// ============================================================
//  ENHANCED CLOCK-IN
// ============================================================
app.post(
  "/api/clockin",
  clockinLimiter,
  [
    body("userId").notEmpty().withMessage("User ID required"),
    body("eventCode").notEmpty().withMessage("Event code required"),
  ],
  async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: errors.array()[0].msg });
      }
      const { userId, eventCode } = matchedData(req);
      const arrivalTime = new Date();

      const user = await User.findOne({ id: userId }).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: "Invalid user" });
      }
      if (user.lat == null || user.lng == null) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          error: "Player loft coordinates missing. Please update profile.",
        });
      }

      const raceCode = await RaceCode.findOneAndUpdate(
        { code: eventCode, status: "unused" },
        { status: "used", usedAt: new Date() },
        { returnDocument: "after", session },
      );
      if (!raceCode) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ error: "Invalid or already used race code." });
      }
      if (raceCode.userId !== userId) {
        await RaceCode.updateOne(
          { _id: raceCode._id },
          { status: "unused", usedAt: null },
          { session },
        );
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ error: "This code does not belong to you." });
      }

      const event = await Event.findOne({ code: raceCode.eventId }).session(
        session,
      );
      if (!event) {
        await RaceCode.updateOne(
          { _id: raceCode._id },
          { status: "unused", usedAt: null },
          { session },
        );
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: "Event not found" });
      }

      if (event.state) {
        if (!["Live Race", "Ready for Release"].includes(event.state)) {
          await RaceCode.updateOne(
            { _id: raceCode._id },
            { status: "unused", usedAt: null },
            { session },
          );
          await session.abortTransaction();
          session.endSession();
          return res
            .status(400)
            .json({ error: "Event is not in a clockable state." });
        }
      } else {
        if (event.status !== "Active") {
          await RaceCode.updateOne(
            { _id: raceCode._id },
            { status: "unused", usedAt: null },
            { session },
          );
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ error: "Event is not active." });
        }
      }

      if (raceCode.registrationId) {
        const registration = await EventRegistration.findOne({
          _id: raceCode.registrationId,
          playerId: userId,
          eventId: event.code,
        }).session(session);
        if (!registration) {
          await RaceCode.updateOne(
            { _id: raceCode._id },
            { status: "unused", usedAt: null },
            { session },
          );
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ error: "Registration not found." });
        }
        if (registration.status !== "locked") {
          await RaceCode.updateOne(
            { _id: raceCode._id },
            { status: "unused", usedAt: null },
            { session },
          );
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ error: "Registration is not locked." });
        }
        if (!raceCode.pigeonId.startsWith("LEGACY_")) {
          const pigeon = await Pigeon.findOne({
            _id: raceCode.pigeonId,
            ownerId: userId,
            status: "Active",
          }).session(session);
          if (!pigeon) {
            await RaceCode.updateOne(
              { _id: raceCode._id },
              { status: "unused", usedAt: null },
              { session },
            );
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
              error: "Pigeon is not active or does not belong to you.",
            });
          }
        }
      }

      const totalCodes = await RaceCode.countDocuments({
        eventId: event.code,
        userId,
      }).session(session);

      let counter = await Counter.findOne({
        eventId: event.code,
        userId: userId,
      }).session(session);

      if (!counter) {
        counter = new Counter({
          eventId: event.code,
          userId: userId,
          count: 0,
        });
        await counter.save({ session });
      }

      if (counter.count >= totalCodes) {
        await RaceCode.updateOne(
          { _id: raceCode._id },
          { status: "unused", usedAt: null },
          { session },
        );
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          error: "You have already clocked all your pigeons for this event.",
        });
      }

      counter.count += 1;
      await counter.save({ session });
      const newCount = counter.count;

      const release = new Date(event.releaseTime);
      const arrival = new Date(arrivalTime);
      if (isNaN(release.getTime()) || isNaN(arrival.getTime())) {
        counter.count -= 1;
        await counter.save({ session });
        await RaceCode.updateOne(
          { _id: raceCode._id },
          { status: "unused", usedAt: null },
          { session },
        );
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: "Invalid date format" });
      }
      const flightHours = (arrival - release) / (1000 * 60 * 60);
      if (flightHours <= 0) {
        counter.count -= 1;
        await counter.save({ session });
        await RaceCode.updateOne(
          { _id: raceCode._id },
          { status: "unused", usedAt: null },
          { session },
        );
        await session.abortTransaction();
        session.endSession();
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
        counter.count -= 1;
        await counter.save({ session });
        await RaceCode.updateOne(
          { _id: raceCode._id },
          { status: "unused", usedAt: null },
          { session },
        );
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: "Error calculating distance" });
      }

      const speedKPH = parseFloat((distanceKm / flightHours).toFixed(4));
      const speedMPM = parseFloat(
        ((distanceKm * 1000) / (flightHours * 60)).toFixed(4),
      );

      const result = await Result.create(
        [
          {
            eventId: event.code,
            userId: user.id,
            userName: user.name,
            clockInNumber: newCount,
            clockInCode: eventCode,
            distanceKm: distanceKm,
            arrivalTime: arrival,
            flightTimeHours: flightHours,
            speedKPH,
            speedMPM,
            pigeonId: raceCode.pigeonId || null,
            registrationId: raceCode.registrationId || null,
          },
        ],
        { session },
      );

      await Log.create(
        [
          {
            message: `${userId} clocked in with code ${eventCode}. Distance: ${distanceKm.toFixed(
              4,
            )}km, Speed: ${speedMPM.toFixed(4)} m/min`,
          },
        ],
        { session },
      );

      await session.commitTransaction();
      session.endSession();

      res.json({
        success: true,
        result: result[0],
        distance: distanceKm,
        speed: speedMPM,
        eventName: event.name,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("Clock-in error:", error);
      if (error.code === 11000) {
        return res
          .status(400)
          .json({ error: "This code has already been used for this event." });
      }
      res.status(500).json({
        error:
          "An internal error occurred during clock-in. Please try again later.",
      });
    }
  },
);

// ============================================================
//  RESULTS
// ============================================================
app.get("/api/results/:eventCode", async (req, res) => {
  try {
    const event = await Event.findOne({ code: req.params.eventCode });
    if (!event) return res.json([]);
    const results = await Result.find({ eventId: event.code })
      .sort({ speedMPM: -1 })
      .populate("pigeonId", "ringNumber nickname color gender")
      .lean();
    res.json(results);
  } catch (error) {
    console.error("Results error:", error);
    res.status(500).json({ error: "An internal error occurred." });
  }
});

app.get("/api/results/:eventCode/pigeons", async (req, res) => {
  try {
    const { eventCode } = req.params;
    const event = await Event.findOne({ code: eventCode });
    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }
    const pigeonResults = await Result.aggregate([
      { $match: { eventId: event.code, pigeonId: { $ne: null } } },
      {
        $lookup: {
          from: "pigeons",
          localField: "pigeonId",
          foreignField: "_id",
          as: "pigeon",
        },
      },
      { $unwind: "$pigeon" },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "id",
          as: "player",
        },
      },
      { $unwind: "$player" },
      {
        $project: {
          pigeonId: 1,
          ringNumber: "$pigeon.ringNumber",
          nickname: "$pigeon.nickname",
          ownerName: "$player.name",
          userId: 1,
          speedMPM: 1,
          distanceKm: 1,
          arrivalTime: 1,
          flightTimeHours: 1,
          clockInNumber: 1,
          clockInCode: 1,
        },
      },
      { $sort: { speedMPM: -1 } },
    ]);
    const ranked = pigeonResults.map((r, index) => ({ ...r, rank: index + 1 }));
    res.json(ranked);
  } catch (error) {
    console.error("Pigeon results error:", error);
    res.status(500).json({ error: "Failed to fetch pigeon results." });
  }
});

// ===== LOGS =====
app.get("/api/logs", async (req, res) => {
  try {
    const logs = await Log.find().sort({ _id: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    console.error("Logs error:", error);
    res.status(500).json({ error: "An internal error occurred." });
  }
});

// ============================================================
//  PLAYERS CRUD
// ============================================================
app.get("/api/users/players", requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: "player" }).select("-passwordHash");
    res.json(users);
  } catch (error) {
    console.error("Players error:", error);
    res.status(500).json({ error: "An internal error occurred." });
  }
});

app.get("/api/users/player/:id", async (req, res) => {
  try {
    const user = await User.findOne({ id: req.params.id }).select(
      "-passwordHash",
    );
    if (!user) return res.status(404).json({ error: "Player not found" });
    res.json(user);
  } catch (error) {
    console.error("Player fetch error:", error);
    res.status(500).json({ error: "An internal error occurred." });
  }
});

app.post(
  "/api/users/player",
  requireAdmin,
  validatePlayerCreation,
  async (req, res) => {
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
        passwordHash: hashed,
        contact: contact || "",
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6)),
      });
      const userResponse = user.toObject();
      delete userResponse.passwordHash;
      await Log.create({
        message: `Admin created player ${user.id} (${user.name})`,
      });
      res.json({ success: true, user: userResponse });
    } catch (error) {
      console.error("Player creation error:", error);
      if (error.code === 11000)
        return res.status(400).json({ error: "Duplicate user ID" });
      res.status(500).json({ error: "An internal error occurred." });
    }
  },
);

app.put(
  "/api/users/player/:id",
  requireAdmin,
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
      await Log.create({ message: `Admin updated player ${id}` });
      const userResponse = user.toObject();
      delete userResponse.passwordHash;
      res.json({ success: true, user: userResponse });
    } catch (error) {
      console.error("Player update error:", error);
      res.status(500).json({ error: "An internal error occurred." });
    }
  },
);

app.delete("/api/users/player/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id === id && req.user.role === "admin") {
      return res
        .status(400)
        .json({ error: "You cannot delete your own account." });
    }
    const user = await User.findOneAndDelete({ id });
    if (!user) return res.status(404).json({ error: "Player not found" });
    await Result.deleteMany({ userId: id });
    await RaceCode.deleteMany({ userId: id });
    await Counter.deleteMany({ userId: id });
    await Log.create({ message: `Admin deleted player ${id}` });
    res.json({ success: true });
  } catch (error) {
    console.error("Player delete error:", error);
    res.status(500).json({ error: "An internal error occurred." });
  }
});

// ============================================================
//  EVENT MANAGEMENT
// ============================================================
app.delete("/api/events/:code", requireAdmin, async (req, res) => {
  try {
    const { code } = req.params;
    const event = await Event.findOneAndDelete({ code });
    if (!event) return res.status(404).json({ error: "Event not found" });
    await Result.deleteMany({ eventId: code });
    await RaceCode.deleteMany({ eventId: code });
    await Counter.deleteMany({ eventId: code });
    await EventRegistration.deleteMany({ eventId: code });
    await Certificate.deleteMany({ eventId: code });
    await Log.create({
      message: `Admin deleted event ${event.name} (${code})`,
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Event delete error:", error);
    res.status(500).json({ error: "An internal error occurred." });
  }
});

app.post(
  "/api/events",
  requireAdmin,
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
        name: name.trim(),
        releaseTime: new Date(releaseTime),
        status: "Active",
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6)),
        state: "Draft",
        registrationDeadline: new Date(releaseTime),
      });
      await Log.create({
        message: `Admin created event ${event.name} (${event.code})`,
      });
      res.json({ success: true, event });
    } catch (error) {
      console.error("Event creation error:", error);
      res.status(500).json({ error: "An internal error occurred." });
    }
  },
);

app.put("/api/events/:code/toggle", requireAdmin, async (req, res) => {
  try {
    const event = await Event.findOne({ code: req.params.code });
    if (!event) return res.status(404).json({ error: "Not found" });
    event.status = event.status === "Active" ? "Closed" : "Active";
    await event.save();
    await Log.create({
      message: `Admin toggled event ${event.name} (${event.code}) to ${event.status}`,
    });
    res.json({ success: true, event });
  } catch (error) {
    console.error("Event toggle error:", error);
    res.status(500).json({ error: "An internal error occurred." });
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
      if (req.user.id !== userId && req.user.role !== "admin") {
        return res
          .status(403)
          .json({ error: "You can only change your own password." });
      }
      const user = await User.findOne({ id: userId });
      if (!user) return res.status(404).json({ error: "User not found" });
      user.passwordHash = await hashPassword(newPassword);
      await user.save();
      await Log.create({ message: `User ${userId} updated password` });
      res.json({ success: true });
    } catch (error) {
      console.error("Password update error:", error);
      res.status(500).json({ error: "An internal error occurred." });
    }
  },
);

// ============================================================
//  PIGEON REGISTRY API
// ============================================================
async function isPigeonInActiveEvent(pigeonId) {
  const registration = await EventRegistration.findOne({
    pigeonIds: pigeonId,
    status: { $ne: "locked" },
  }).populate("eventId", "state");
  if (registration) {
    const event = registration.eventId;
    if (event && !["Completed", "Archived"].includes(event.state)) {
      return true;
    }
  }
  return false;
}

app.get("/api/pigeons", async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { ownerId: req.user.id };
    if (
      status &&
      ["Active", "Lost", "Sold", "Retired", "Dead"].includes(status)
    ) {
      filter.status = status;
    }
    const pigeons = await Pigeon.find(filter).sort({ createdAt: -1 });
    res.json(pigeons);
  } catch (error) {
    console.error("Error fetching pigeons:", error);
    res.status(500).json({ error: "Failed to fetch pigeons." });
  }
});

app.post(
  "/api/pigeons",
  [
    body("ringNumber")
      .trim()
      .notEmpty()
      .withMessage("Ring number is required")
      .isLength({ min: 4, max: 20 })
      .withMessage("Ring number must be between 4 and 20 characters"),
    body("nickname").optional().trim().isString(),
    body("gender")
      .optional()
      .isIn(["Male", "Female", "Unknown"])
      .withMessage("Gender must be Male, Female, or Unknown"),
    body("color").optional().trim().isString(),
    body("birthYear")
      .optional()
      .isInt({ min: 1900, max: new Date().getFullYear() })
      .withMessage(
        `Birth year must be between 1900 and ${new Date().getFullYear()}`,
      ),
    body("photo").optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }
      const { ringNumber, nickname, gender, color, birthYear, photo } =
        matchedData(req);
      const existing = await Pigeon.findOne({ ringNumber });
      if (existing) {
        return res.status(400).json({ error: "Ring number already exists." });
      }
      const pigeon = new Pigeon({
        ringNumber: ringNumber.toUpperCase(),
        ownerId: req.user.id,
        nickname: nickname || "",
        gender: gender || "Unknown",
        color: color || "",
        birthYear: birthYear || null,
        photo: photo || "",
        status: "Active",
      });
      await pigeon.save();
      await Log.create({
        message: `Player ${req.user.id} created pigeon ${pigeon.ringNumber}`,
      });
      res.status(201).json({ success: true, pigeon });
    } catch (error) {
      console.error("Error creating pigeon:", error);
      res.status(500).json({ error: "Failed to create pigeon." });
    }
  },
);

app.get("/api/pigeons/:id", async (req, res) => {
  try {
    const pigeon = await Pigeon.findOne({
      _id: req.params.id,
      ownerId: req.user.id,
    });
    if (!pigeon) {
      return res.status(404).json({ error: "Pigeon not found." });
    }
    res.json(pigeon);
  } catch (error) {
    console.error("Error fetching pigeon:", error);
    res.status(500).json({ error: "Failed to fetch pigeon." });
  }
});

app.put(
  "/api/pigeons/:id",
  [
    body("nickname").optional().trim().isString(),
    body("color").optional().trim().isString(),
    body("photo").optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }
      const pigeon = await Pigeon.findOne({
        _id: req.params.id,
        ownerId: req.user.id,
      });
      if (!pigeon) {
        return res.status(404).json({ error: "Pigeon not found." });
      }
      const { nickname, color, photo } = matchedData(req);
      if (nickname !== undefined) pigeon.nickname = nickname;
      if (color !== undefined) pigeon.color = color;
      if (photo !== undefined) pigeon.photo = photo;
      await pigeon.save();
      await Log.create({
        message: `Player ${req.user.id} updated pigeon ${pigeon.ringNumber}`,
      });
      res.json({ success: true, pigeon });
    } catch (error) {
      console.error("Error updating pigeon:", error);
      res.status(500).json({ error: "Failed to update pigeon." });
    }
  },
);

app.delete("/api/pigeons/:id", async (req, res) => {
  try {
    const pigeon = await Pigeon.findOne({
      _id: req.params.id,
      ownerId: req.user.id,
    });
    if (!pigeon) {
      return res.status(404).json({ error: "Pigeon not found." });
    }
    const inActive = await isPigeonInActiveEvent(pigeon._id);
    if (inActive) {
      return res.status(400).json({
        error:
          "Cannot delete pigeon because it is registered in an active event.",
      });
    }
    await pigeon.deleteOne();
    await Log.create({
      message: `Player ${req.user.id} deleted pigeon ${pigeon.ringNumber}`,
    });
    res.json({ success: true, message: "Pigeon deleted." });
  } catch (error) {
    console.error("Error deleting pigeon:", error);
    res.status(500).json({ error: "Failed to delete pigeon." });
  }
});

// ============================================================
//  PLAYER SELF-REGISTRATION
// ============================================================
async function validateRegistrationEligibility(
  eventId,
  playerId,
  pigeonIds,
  excludeRegistrationId = null,
) {
  const event = await Event.findOne({ code: eventId });
  if (!event) throw new Error("Event not found.");
  if (event.state !== "Registration Open") {
    throw new Error("Event is not open for registration.");
  }
  if (
    event.registrationDeadline &&
    new Date() > new Date(event.registrationDeadline)
  ) {
    throw new Error("Registration deadline has passed.");
  }
  const pigeons = await Pigeon.find({
    _id: { $in: pigeonIds },
    ownerId: playerId,
    status: "Active",
  });
  if (pigeons.length !== pigeonIds.length) {
    throw new Error(
      "One or more pigeons are invalid, inactive, or do not belong to you.",
    );
  }
  const query = {
    eventId,
    playerId,
    pigeonIds: { $in: pigeonIds },
  };
  if (excludeRegistrationId) {
    query._id = { $ne: excludeRegistrationId };
  }
  const existing = await EventRegistration.findOne(query);
  if (existing) {
    throw new Error(
      "One or more pigeons are already registered in this event.",
    );
  }
  return { event, pigeons };
}

app.get("/api/events/open", async (req, res) => {
  try {
    const now = new Date();
    const events = await Event.find({
      state: "Registration Open",
      $or: [
        { registrationDeadline: { $exists: false } },
        { registrationDeadline: { $gt: now } },
      ],
    }).sort({ releaseTime: 1 });
    res.json(events);
  } catch (error) {
    console.error("Error fetching open events:", error);
    res.status(500).json({ error: "Failed to fetch open events." });
  }
});

app.get("/api/events/:eventId/registrations/my", async (req, res) => {
  try {
    const { eventId } = req.params;
    const registration = await EventRegistration.findOne({
      eventId,
      playerId: req.user.id,
    }).populate("pigeonIds");
    if (!registration) {
      return res.json({ registration: null });
    }
    res.json({ registration });
  } catch (error) {
    console.error("Error fetching player registration:", error);
    res.status(500).json({ error: "Failed to fetch registration." });
  }
});

app.post(
  "/api/events/:eventId/register",
  [
    body("pigeonIds")
      .isArray({ min: 1 })
      .withMessage("At least one pigeon must be selected."),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }
      const { eventId } = req.params;
      const { pigeonIds } = matchedData(req);
      const playerId = req.user.id;
      await validateRegistrationEligibility(eventId, playerId, pigeonIds);
      const existing = await EventRegistration.findOne({
        eventId,
        playerId,
        status: "draft",
      });
      if (existing) {
        return res.status(400).json({
          error:
            "You already have a draft registration. Please update it or withdraw.",
        });
      }
      const registration = new EventRegistration({
        eventId,
        playerId,
        pigeonIds,
        status: "draft",
        registrationDate: new Date(),
        updatedAt: new Date(),
      });
      await registration.save();
      await Log.create({
        message: `Player ${playerId} registered for event ${eventId} with ${pigeonIds.length} pigeons.`,
      });
      res.status(201).json({ success: true, registration });
    } catch (error) {
      console.error("Error creating registration:", error);
      res
        .status(400)
        .json({ error: error.message || "Failed to create registration." });
    }
  },
);

app.put(
  "/api/events/:eventId/register",
  [
    body("pigeonIds")
      .isArray({ min: 1 })
      .withMessage("At least one pigeon must be selected."),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }
      const { eventId } = req.params;
      const { pigeonIds } = matchedData(req);
      const playerId = req.user.id;

      const registration = await EventRegistration.findOne({
        eventId,
        playerId,
        status: "draft",
      });
      if (!registration) {
        return res
          .status(404)
          .json({ error: "No draft registration found for this event." });
      }

      await validateRegistrationEligibility(
        eventId,
        playerId,
        pigeonIds,
        registration._id,
      );

      const updated = await EventRegistration.findOneAndUpdate(
        { _id: registration._id },
        { pigeonIds, updatedAt: new Date() },
        { new: true, runValidators: true },
      );
      if (!updated) {
        return res
          .status(500)
          .json({ error: "Failed to update registration." });
      }

      await Log.create({
        message: `Player ${playerId} updated registration for event ${eventId}.`,
      });
      res.json({ success: true, registration: updated });
    } catch (error) {
      console.error("Error updating registration:", error);
      res
        .status(400)
        .json({ error: error.message || "Failed to update registration." });
    }
  },
);

app.delete("/api/events/:eventId/register", async (req, res) => {
  try {
    const { eventId } = req.params;
    const playerId = req.user.id;
    const event = await Event.findOne({ code: eventId });
    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }
    if (event.state !== "Registration Open") {
      return res.status(400).json({
        error: "Cannot withdraw registration; event is no longer open.",
      });
    }
    const registration = await EventRegistration.findOneAndDelete({
      eventId,
      playerId,
      status: "draft",
    });
    if (!registration) {
      return res.status(404).json({ error: "No draft registration found." });
    }
    await Log.create({
      message: `Player ${playerId} withdrew registration for event ${eventId}.`,
    });
    res.json({ success: true, message: "Registration withdrawn." });
  } catch (error) {
    console.error("Error withdrawing registration:", error);
    res.status(500).json({ error: "Failed to withdraw registration." });
  }
});

// ============================================================
//  ADMIN REVIEW & STICKER GENERATION
// ============================================================
async function validateRegistrations(eventId) {
  const registrations = await EventRegistration.find({ eventId }).populate(
    "pigeonIds",
  );

  const ringMap = new Map();
  const results = [];

  for (const reg of registrations) {
    const playerId = reg.playerId;
    const user = await User.findOne({ id: playerId });
    const playerName = user ? user.name : "Unknown Player";
    const pigeons = reg.pigeonIds;

    const isLegacy = pigeons.every(
      (p) => typeof p === "string" && p.startsWith("LEGACY_"),
    );
    if (isLegacy) {
      results.push({
        registrationId: reg._id,
        playerId: playerId,
        playerName: playerName,
        pigeonIds: pigeons.map((p) => p._id || p),
        ringNumbers: pigeons.map((p) => p.ringNumber || "LEGACY"),
        valid: true,
        duplicateRing: false,
        invalidStatus: false,
        missingInfo: false,
        status: reg.status,
        registrationDate: reg.registrationDate,
      });
      continue;
    }

    let valid = true;
    let duplicateRing = false;
    let invalidStatus = false;
    let missingInfo = false;

    for (const p of pigeons) {
      if (ringMap.has(p.ringNumber)) {
        duplicateRing = true;
        valid = false;
      } else {
        ringMap.set(p.ringNumber, { playerId: playerId, pigeonId: p._id });
      }
      if (p.status !== "Active") {
        invalidStatus = true;
        valid = false;
      }
      if (!p.color || !p.birthYear) {
        missingInfo = true;
      }
    }
    results.push({
      registrationId: reg._id,
      playerId: playerId,
      playerName: playerName,
      pigeonIds: pigeons.map((p) => p._id),
      ringNumbers: pigeons.map((p) => p.ringNumber),
      valid,
      duplicateRing,
      invalidStatus,
      missingInfo,
      status: reg.status,
      registrationDate: reg.registrationDate,
    });
  }
  return results;
}

async function lockAllRegistrations(eventId) {
  await EventRegistration.updateMany(
    { eventId },
    { status: "locked", updatedAt: new Date() },
  );
}

app.get(
  "/api/admin/events/:eventId/registrations",
  requireAdmin,
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const event = await Event.findOne({ code: eventId });
      if (!event) {
        return res.status(404).json({ error: "Event not found." });
      }
      const validation = await validateRegistrations(eventId);
      res.json({
        event: { name: event.name, state: event.state },
        registrations: validation,
      });
    } catch (error) {
      console.error("Error fetching admin registrations:", error);
      res.status(500).json({ error: "Failed to fetch registrations." });
    }
  },
);

app.delete(
  "/api/admin/events/:eventId/registrations/:playerId",
  requireAdmin,
  async (req, res) => {
    try {
      const { eventId, playerId } = req.params;
      if (!playerId) {
        return res.status(400).json({ error: "Player ID is required." });
      }
      const event = await Event.findOne({ code: eventId });
      if (!event) {
        return res.status(404).json({ error: "Event not found." });
      }
      const blockedStates = [
        "Sticker Generated",
        "Ready for Release",
        "Live Race",
        "Result Verification",
        "Completed",
        "Archived",
      ];
      if (blockedStates.includes(event.state)) {
        return res
          .status(400)
          .json({ error: "Cannot remove registration at this stage." });
      }
      const result = await EventRegistration.findOneAndDelete({
        eventId,
        playerId,
      });
      if (!result) {
        const altResult = await EventRegistration.findOneAndDelete({
          eventId,
          playerId: { $regex: new RegExp(`^${playerId}$`, "i") },
        });
        if (!altResult) {
          return res.status(404).json({ error: "Registration not found." });
        }
        await Log.create({
          message: `Admin removed player ${playerId} from event ${eventId} (alternative match).`,
        });
        return res.json({ success: true });
      }
      await Log.create({
        message: `Admin removed player ${playerId} from event ${eventId}.`,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing registration:", error);
      res.status(500).json({ error: "Failed to remove registration." });
    }
  },
);

app.delete(
  "/api/admin/events/:eventId/registrations/:playerId/pigeons/:pigeonId",
  requireAdmin,
  async (req, res) => {
    try {
      const { eventId, playerId, pigeonId } = req.params;
      const event = await Event.findOne({ code: eventId });
      if (!event) {
        return res.status(404).json({ error: "Event not found." });
      }
      const blockedStates = [
        "Sticker Generated",
        "Ready for Release",
        "Live Race",
        "Result Verification",
        "Completed",
        "Archived",
      ];
      if (blockedStates.includes(event.state)) {
        return res
          .status(400)
          .json({ error: "Cannot remove pigeon at this stage." });
      }
      const registration = await EventRegistration.findOne({
        eventId,
        playerId,
      });
      if (!registration) {
        return res.status(404).json({ error: "Registration not found." });
      }
      const index = registration.pigeonIds.indexOf(pigeonId);
      if (index === -1) {
        return res
          .status(404)
          .json({ error: "Pigeon not found in registration." });
      }
      registration.pigeonIds.splice(index, 1);
      registration.updatedAt = new Date();
      await registration.save();
      await Log.create({
        message: `Admin removed pigeon ${pigeonId} from player ${playerId} in event ${eventId}.`,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing pigeon:", error);
      res.status(500).json({ error: "Failed to remove pigeon." });
    }
  },
);

// ===== STICKER GENERATION (with debug logs) =====
app.post(
  "/api/admin/events/:eventId/generate-stickers",
  requireAdmin,
  async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { eventId } = req.params;
      console.log("🔍 [STICKERS] Received eventId:", eventId);

      const event = await Event.findOne({ code: eventId }).session(session);
      if (!event) {
        await session.abortTransaction();
        session.endSession();
        console.warn("❌ [STICKERS] Event not found for code:", eventId);
        return res.status(404).json({ error: "Event not found." });
      }

      const allowedStates = ["Registration Closed", "Sticker Generated"];
      if (!allowedStates.includes(event.state)) {
        await session.abortTransaction();
        session.endSession();
        console.warn("❌ [STICKERS] Invalid state:", event.state);
        return res.status(400).json({
          error: `Event must be in Registration Closed state (current: ${event.state}).`,
        });
      }

      const existingRaceCodes = await RaceCode.find({ eventId }).session(
        session,
      );
      if (existingRaceCodes.length > 0 && event.state === "Sticker Generated") {
        await session.commitTransaction();
        session.endSession();
        return res.json({
          success: true,
          message: "Stickers were already generated for this event.",
          codes: existingRaceCodes.map((c) => ({
            code: c.code,
            playerId: c.userId,
            pigeonId: c.pigeonId,
          })),
        });
      }

      const registrations = await EventRegistration.find({ eventId }).session(
        session,
      );
      if (registrations.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ error: "No registrations found for this event." });
      }

      const validation = await validateRegistrations(eventId);
      const invalid = validation.filter((r) => !r.valid);
      if (invalid.length > 0) {
        await session.abortTransaction();
        session.endSession();
        console.warn("❌ [STICKERS] Invalid registrations:", invalid);
        return res.status(400).json({
          error: "Some registrations are invalid. Please review and fix.",
          invalid,
        });
      }

      const generatedCodes = [];
      for (const reg of registrations) {
        const regPigeonIds = reg.pigeonIds || [];
        for (const pigeonId of regPigeonIds) {
          const existingCode = await RaceCode.findOne({
            eventId,
            registrationId: reg._id.toString(),
            pigeonId: pigeonId.toString(),
          }).session(session);

          if (existingCode) {
            continue;
          }

          const code = await getUniqueRaceCode();
          const raceCode = new RaceCode({
            eventId,
            userId: reg.playerId,
            code,
            status: "unused",
            registrationId: reg._id,
            pigeonId,
          });
          await raceCode.save({ session });
          generatedCodes.push({ playerId: reg.playerId, pigeonId, code });
        }
      }

      await EventRegistration.updateMany(
        { eventId },
        { status: "locked", updatedAt: new Date() },
      ).session(session);

      event.state = "Sticker Generated";
      await event.save({ session });

      await Log.create(
        {
          message: `Admin generated ${generatedCodes.length} stickers for event ${event.name} (${eventId}).`,
        },
        { session },
      );

      await session.commitTransaction();
      session.endSession();

      console.log(
        `✅ [STICKERS] Successfully generated ${generatedCodes.length} stickers.`,
      );
      res.json({
        success: true,
        message:
          generatedCodes.length > 0
            ? `Generated ${generatedCodes.length} stickers.`
            : "No new stickers were needed; existing codes were reused.",
        codes: generatedCodes,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("❌ [STICKERS] Error generating stickers:", error);
      res.status(500).json({ error: "Failed to generate stickers." });
    }
  },
);

app.put(
  "/api/admin/events/:eventId/state",
  requireAdmin,
  [
    body("state")
      .isIn([
        "Draft",
        "Registration Open",
        "Registration Closed",
        "Sticker Generated",
        "Ready for Release",
        "Live Race",
        "Result Verification",
        "Completed",
        "Archived",
      ])
      .withMessage("Invalid state."),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }
      const { eventId } = req.params;
      const { state } = matchedData(req);
      const event = await Event.findOne({ code: eventId });
      if (!event) {
        return res.status(404).json({ error: "Event not found." });
      }
      event.state = state;
      await event.save();
      await Log.create({
        message: `Admin changed event ${eventId} state to ${state}.`,
      });
      res.json({ success: true, event });
    } catch (error) {
      console.error("Error updating event state:", error);
      res.status(500).json({ error: "Failed to update event state." });
    }
  },
);

// ===== NEW: Admin update registration settings (state + deadline) =====
app.put(
  "/api/admin/events/:eventId/registration-settings",
  requireAdmin,
  [
    body("state")
      .optional()
      .isIn([
        "Draft",
        "Registration Open",
        "Registration Closed",
        "Sticker Generated",
        "Ready for Release",
        "Live Race",
        "Result Verification",
        "Completed",
        "Archived",
      ])
      .withMessage("Invalid state."),
    body("registrationDeadline")
      .optional()
      .isISO8601()
      .withMessage("Invalid date format. Use ISO 8601."),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }
      const { eventId } = req.params;
      const { state, registrationDeadline } = matchedData(req);
      const event = await Event.findOne({ code: eventId });
      if (!event) {
        return res.status(404).json({ error: "Event not found." });
      }
      if (state !== undefined) event.state = state;
      if (registrationDeadline !== undefined) {
        event.registrationDeadline = new Date(registrationDeadline);
      }
      await event.save();
      await Log.create({
        message: `Admin updated registration settings for event ${event.name} (${eventId})`,
      });
      res.json({ success: true, event });
    } catch (error) {
      console.error("Error updating registration settings:", error);
      res
        .status(500)
        .json({ error: "Failed to update registration settings." });
    }
  },
);

// ============================================================
//  CERTIFICATES
// ============================================================
async function generateCertificateNumber() {
  const year = new Date().getFullYear();
  const count = await Certificate.countDocuments();
  const seq = String(count + 1).padStart(4, "0");
  return `WSC-${year}-${seq}`;
}

async function computePigeonRankings(eventId) {
  const results = await Result.find({ eventId, pigeonId: { $ne: null } })
    .sort({ speedMPM: -1 })
    .populate("pigeonId")
    .lean();
  return results.map((r, index) => ({
    pigeonId: r.pigeonId._id,
    userId: r.userId,
    userName: r.userName,
    ringNumber: r.pigeonId.ringNumber,
    nickname: r.pigeonId.nickname,
    speedMPM: r.speedMPM,
    distanceKm: r.distanceKm,
    rank: index + 1,
  }));
}

function generateQRHash(certificateNumber, eventId, playerId) {
  const data = `${certificateNumber}:${eventId}:${playerId}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

app.post(
  "/api/admin/events/:eventId/generate-certificates",
  requireAdmin,
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const event = await Event.findOne({ code: eventId });
      if (!event) {
        return res.status(404).json({ error: "Event not found." });
      }
      if (event.certificatesGenerated) {
        return res
          .status(400)
          .json({ error: "Certificates already generated for this event." });
      }
      if (!["Completed", "Archived"].includes(event.state)) {
        return res.status(400).json({
          error:
            "Event must be Completed or Archived to generate certificates.",
        });
      }
      const rankings = await computePigeonRankings(eventId);
      if (rankings.length === 0) {
        return res
          .status(400)
          .json({ error: "No pigeon-level results found for this event." });
      }
      const created = [];
      for (const r of rankings) {
        const certNumber = await generateCertificateNumber();
        const rank = r.rank;
        const qrHash = generateQRHash(certNumber, eventId, r.userId);
        const cert = new Certificate({
          certificateNumber: certNumber,
          eventId,
          playerId: r.userId,
          pigeonId: r.pigeonId,
          rank: rank,
          speed: r.speedMPM,
          distance: r.distanceKm,
          issueDate: new Date(),
          qrHash,
        });
        await cert.save();
        created.push(cert);
      }
      event.certificatesGenerated = true;
      await event.save();
      await Log.create({
        message: `Admin generated ${created.length} certificates for event ${event.name} (${eventId}).`,
      });
      res.json({ success: true, count: created.length });
    } catch (error) {
      console.error("Certificate generation error:", error);
      res.status(500).json({ error: "Failed to generate certificates." });
    }
  },
);

app.get("/api/certificates/player", async (req, res) => {
  try {
    const playerId = req.user.id;
    const certs = await Certificate.find({ playerId })
      .populate("eventId", "name releaseTime")
      .populate("pigeonId", "ringNumber nickname color")
      .sort({ issueDate: -1 });
    res.json(certs);
  } catch (error) {
    console.error("Error fetching player certificates:", error);
    res.status(500).json({ error: "Failed to fetch certificates." });
  }
});

app.get("/api/certificates/:certificateId", async (req, res) => {
  try {
    const cert = await Certificate.findOne({ _id: req.params.certificateId })
      .populate("eventId", "name releaseTime lat lng")
      .populate("playerId", "id name")
      .populate("pigeonId", "ringNumber nickname color gender birthYear");
    if (!cert) {
      return res.status(404).json({ error: "Certificate not found." });
    }
    if (req.user.id !== cert.playerId.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied." });
    }
    res.json(cert);
  } catch (error) {
    console.error("Error fetching certificate:", error);
    res.status(500).json({ error: "Failed to fetch certificate." });
  }
});

app.get("/api/certificates/verify/:hash", async (req, res) => {
  try {
    const { hash } = req.params;
    const cert = await Certificate.findOne({ qrHash: hash })
      .populate("eventId", "name releaseTime")
      .populate("playerId", "id name")
      .populate("pigeonId", "ringNumber nickname");
    if (!cert) {
      return res.status(404).json({ error: "Invalid certificate." });
    }
    res.json({
      valid: true,
      certificateNumber: cert.certificateNumber,
      player: cert.playerId.name,
      pigeon: cert.pigeonId.ringNumber,
      event: cert.eventId.name,
      rank: cert.rank,
      speed: cert.speed,
      issueDate: cert.issueDate,
    });
  } catch (error) {
    console.error("Certificate verification error:", error);
    res.status(500).json({ error: "Verification failed." });
  }
});

// ============================================================
//  EXTENDED PLAYER & PIGEON STATS
// ============================================================
async function getChampionTitles(playerId) {
  const results = await Result.aggregate([
    { $match: { userId: playerId } },
    {
      $group: {
        _id: "$eventId",
        maxSpeed: { $max: "$speedMPM" },
      },
    },
    {
      $lookup: {
        from: "results",
        let: { eventId: "$_id", speed: "$maxSpeed" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$eventId", "$$eventId"] },
                  { $eq: ["$speedMPM", "$$speed"] },
                ],
              },
            },
          },
          { $limit: 1 },
        ],
        as: "winner",
      },
    },
    { $unwind: "$winner" },
    { $match: { "winner.userId": playerId } },
    { $count: "championTitles" },
  ]);
  return results.length > 0 ? results[0].championTitles : 0;
}

async function getSeasonRanking(playerId, year = new Date().getFullYear()) {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59);
  const events = await Event.find({
    releaseTime: { $gte: start, $lte: end },
    state: { $in: ["Completed", "Archived"] },
  });
  const eventIds = events.map((e) => e.code);
  const results = await Result.find({
    userId: playerId,
    eventId: { $in: eventIds },
    pigeonId: { $ne: null },
  });
  if (results.length === 0) {
    return { year, rank: null, totalPoints: 0, eventsParticipated: 0 };
  }
  let totalPoints = 0;
  for (const r of results) {
    const eventResults = await Result.find({
      eventId: r.eventId,
      pigeonId: { $ne: null },
    }).sort({ speedMPM: -1 });
    const position =
      eventResults.findIndex((res) => res._id.toString() === r._id.toString()) +
      1;
    if (position === 1) totalPoints += 10;
    else if (position === 2) totalPoints += 7;
    else if (position === 3) totalPoints += 5;
    else totalPoints += 3;
  }
  const allPlayers = await Result.aggregate([
    { $match: { eventId: { $in: eventIds }, pigeonId: { $ne: null } } },
    {
      $group: {
        _id: "$userId",
        events: { $addToSet: "$eventId" },
        results: { $push: "$$ROOT" },
      },
    },
  ]);
  const playerPoints = [];
  for (const p of allPlayers) {
    let pts = 0;
    for (const r of p.results) {
      const eventRes = await Result.find({
        eventId: r.eventId,
        pigeonId: { $ne: null },
      }).sort({ speedMPM: -1 });
      const pos =
        eventRes.findIndex((res) => res._id.toString() === r._id.toString()) +
        1;
      if (pos === 1) pts += 10;
      else if (pos === 2) pts += 7;
      else if (pos === 3) pts += 5;
      else pts += 3;
    }
    playerPoints.push({ userId: p._id, points: pts });
  }
  playerPoints.sort((a, b) => b.points - a.points);
  const rank = playerPoints.findIndex((p) => p.userId === playerId) + 1;
  return {
    year,
    rank: rank > 0 ? rank : null,
    totalPoints,
    eventsParticipated: results.length,
  };
}

app.get("/api/users/player/:id/stats", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id !== id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const user = await User.findOne({ id });
    if (!user) return res.status(404).json({ error: "Player not found" });

    const results = await Result.find({ userId: id });
    if (results.length === 0) {
      return res.json({
        userId: id,
        userName: user.name,
        totalPigeons: 0,
        eventsParticipated: 0,
        wins: 0,
        podiums: 0,
        averageSpeed: 0,
        bestSpeed: 0,
        winRate: 0,
        championTitles: 0,
        totalCertificates: 0,
        fastestArrival: null,
        seasonRanking: null,
        currentSeasonRank: null,
        winningPercentage: 0,
      });
    }

    const totalPigeons = results.length;
    const eventIds = [...new Set(results.map((r) => r.eventId))];
    const eventsParticipated = eventIds.length;
    const speeds = results.map((r) => r.speedMPM);
    const averageSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const bestSpeed = Math.max(...speeds);

    const fastestResult = results.reduce((a, b) =>
      a.speedMPM > b.speedMPM ? a : b,
    );
    let fastestArrival = null;
    if (fastestResult.pigeonId) {
      const pigeon = await Pigeon.findById(fastestResult.pigeonId);
      fastestArrival = {
        speed: fastestResult.speedMPM,
        pigeonName: pigeon ? pigeon.nickname || pigeon.ringNumber : "Unknown",
        ringNumber: pigeon ? pigeon.ringNumber : "Unknown",
      };
    } else {
      fastestArrival = {
        speed: fastestResult.speedMPM,
        pigeonName: "Unknown",
        ringNumber: "Unknown",
      };
    }

    let wins = 0;
    let podiums = 0;
    for (const eventId of eventIds) {
      const eventResults = await Result.find({
        eventId,
        pigeonId: { $ne: null },
      })
        .sort({ speedMPM: -1 })
        .lean();
      if (eventResults.length === 0) continue;
      const userIndex = eventResults.findIndex((r) => r.userId === id);
      if (userIndex === 0) wins++;
      if (userIndex >= 0 && userIndex < 3) podiums++;
    }
    const winRate =
      eventsParticipated > 0 ? (wins / eventsParticipated) * 100 : 0;
    const championTitles = await getChampionTitles(id);
    const totalCertificates = await Certificate.countDocuments({
      playerId: id,
    });
    const currentYear = new Date().getFullYear();
    const seasonRanking = await getSeasonRanking(id, currentYear);

    res.json({
      userId: id,
      userName: user.name,
      totalPigeons,
      eventsParticipated,
      wins,
      podiums,
      averageSpeed: parseFloat(averageSpeed.toFixed(4)),
      bestSpeed: parseFloat(bestSpeed.toFixed(4)),
      winRate: parseFloat(winRate.toFixed(1)),
      championTitles,
      totalCertificates,
      fastestArrival,
      seasonRanking,
      currentSeasonRank: seasonRanking.rank || null,
      winningPercentage: parseFloat(winRate.toFixed(1)),
    });
  } catch (error) {
    console.error("Player stats error:", error);
    res.status(500).json({ error: "An internal error occurred." });
  }
});

app.get("/api/pigeons/:id/stats", async (req, res) => {
  try {
    const pigeonId = req.params.id;
    const pigeon = await Pigeon.findOne({
      _id: pigeonId,
      ownerId: req.user.id,
    });
    if (!pigeon) {
      return res
        .status(404)
        .json({ error: "Pigeon not found or does not belong to you." });
    }
    const results = await Result.find({ pigeonId })
      .sort({ arrivalTime: -1 })
      .populate("eventId", "name releaseTime")
      .lean();
    if (results.length === 0) {
      return res.json({
        pigeonId: pigeon._id,
        ringNumber: pigeon.ringNumber,
        nickname: pigeon.nickname,
        totalRaces: 0,
        wins: 0,
        podiums: 0,
        bestSpeed: 0,
        averageSpeed: 0,
        raceHistory: [],
        certificates: [],
      });
    }
    const eventIds = [...new Set(results.map((r) => r.eventId))];
    let wins = 0,
      podiums = 0;
    const speeds = results.map((r) => r.speedMPM);
    const bestSpeed = Math.max(...speeds);
    const averageSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    for (const eventId of eventIds) {
      const eventResults = await Result.find({
        eventId,
        pigeonId: { $ne: null },
      })
        .sort({ speedMPM: -1 })
        .lean();
      const position =
        eventResults.findIndex(
          (r) => r.pigeonId.toString() === pigeonId.toString(),
        ) + 1;
      if (position === 1) wins++;
      if (position >= 1 && position <= 3) podiums++;
    }
    const raceHistory = results.map((r) => ({
      eventName: r.eventId ? r.eventId.name : "Unknown Event",
      eventCode: r.eventId ? r.eventId.code : "N/A",
      date: r.arrivalTime,
      rank: null,
      speed: r.speedMPM,
      distance: r.distanceKm,
    }));
    for (let i = 0; i < raceHistory.length; i++) {
      const eventResults = await Result.find({
        eventId: results[i].eventId,
        pigeonId: { $ne: null },
      })
        .sort({ speedMPM: -1 })
        .lean();
      const pos =
        eventResults.findIndex(
          (r) => r.pigeonId.toString() === pigeonId.toString(),
        ) + 1;
      raceHistory[i].rank = pos;
    }
    const certificates = await Certificate.find({ pigeonId })
      .populate("eventId", "name")
      .sort({ issueDate: -1 });
    res.json({
      pigeonId: pigeon._id,
      ringNumber: pigeon.ringNumber,
      nickname: pigeon.nickname,
      color: pigeon.color,
      gender: pigeon.gender,
      birthYear: pigeon.birthYear,
      status: pigeon.status,
      totalRaces: results.length,
      wins,
      podiums,
      bestSpeed: parseFloat(bestSpeed.toFixed(4)),
      averageSpeed: parseFloat(averageSpeed.toFixed(4)),
      raceHistory: raceHistory.slice(0, 20),
      certificates: certificates.map((c) => ({
        certificateNumber: c.certificateNumber,
        eventName: c.eventId ? c.eventId.name : "Unknown",
        rank: c.rank,
        issueDate: c.issueDate,
      })),
    });
  } catch (error) {
    console.error("Pigeon stats error:", error);
    res.status(500).json({ error: "Failed to fetch pigeon stats." });
  }
});

// ============================================================
//  GLOBAL ERROR HANDLER
// ============================================================
app.use((err, req, res, next) => {
  console.error("Global error:", err.stack || err);
  res.status(500).json({
    error: "An unexpected error occurred. Please try again later.",
  });
});

// ============================================================
//  START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
