require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { body, validationResult, matchedData } = require("express-validator");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet"); // NEW

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

app.use(helmet()); // NEW – security headers
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
  })
  .catch((err) => console.error("❌ DB Error:", err));

// ===== SCHEMAS =====
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
});
// removed unused 'codes' field

const RaceCodeSchema = new mongoose.Schema({
  eventId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  code: { type: String, required: true, unique: true },
  status: { type: String, enum: ["unused", "used"], default: "unused" },
  generatedAt: { type: Date, default: Date.now },
  usedAt: { type: Date },
});
RaceCodeSchema.index({ eventId: 1, userId: 1, status: 1 }); // compound index for speed

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

// ===== HELPER =====
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

const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
};

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
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
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
    res
      .status(500)
      .json({ error: "An internal error occurred. Please try again later." });
  }
});

let timeApiFailed = false;
app.get("/api/time", async (req, res) => {
  // Prevent any caching
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
    res
      .status(500)
      .json({ error: "An internal error occurred. Please try again later." });
  }
});

// GET all events
app.get("/api/events/all", async (req, res) => {
  try {
    const events = await Event.find().sort({ releaseTime: -1 });
    res.json(events);
  } catch (error) {
    console.error("All events error:", error);
    res
      .status(500)
      .json({ error: "An internal error occurred. Please try again later." });
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
    res
      .status(500)
      .json({ error: "An internal error occurred. Please try again later." });
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
    res
      .status(500)
      .json({ error: "An internal error occurred. Please try again later." });
  }
});

// ===== REGISTER PLAYERS (WITH TRANSACTION) =====
app.post(
  "/api/events/:eventId/register-players",
  registrationLimiter,
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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: errors.array()[0].msg });
      }
      const { eventId } = req.params;
      const { registrations } = matchedData(req);
      const event = await Event.findOne({ code: eventId }).session(session);
      if (!event) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ error: "Event not found" });
      }
      if (event.status !== "Active") {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: "Event is not active" });
      }

      const results = [];
      for (const reg of registrations) {
        const { userId, pigeonCount } = reg;
        const user = await User.findOne({ id: userId }).session(session);
        if (!user) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ error: `User ${userId} not found` });
        }

        const existingCount = await RaceCode.countDocuments({
          eventId,
          userId,
        }).session(session);
        if (existingCount > 0) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            error: `Player ${user.name} already registered for this event`,
          });
        }

        const generatedCodes = [];
        for (let i = 0; i < pigeonCount; i++) {
          const code = await getUniqueRaceCode();
          await RaceCode.create([{ eventId, userId, code, status: "unused" }], {
            session,
          });
          generatedCodes.push(code);
        }
        results.push({ userId, userName: user.name, codes: generatedCodes });
      }

      await Log.create(
        [
          {
            time: new Date().toLocaleString(),
            message: `Registered ${registrations.length} player(s) for event ${event.name}`,
          },
        ],
        { session },
      );

      await session.commitTransaction();
      session.endSession();
      res.json({ success: true, registrations: results });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("Register players error:", error);
      res
        .status(500)
        .json({ error: "An internal error occurred. Please try again later." });
    }
  },
);

// ===== CLOCK IN (WITH TRANSACTION) =====
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
      if (event.status !== "Active") {
        await RaceCode.updateOne(
          { _id: raceCode._id },
          { status: "unused", usedAt: null },
          { session },
        );
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: "Event is not active" });
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
          },
        ],
        { session },
      );

      await Log.create(
        [
          {
            time: new Date().toLocaleString(),
            message: `${userId} clocked in with code ${eventCode}. Distance: ${distanceKm.toFixed(4)}km, Speed: ${speedMPM.toFixed(4)} m/min`,
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

// RESULTS
app.get("/api/results/:eventCode", async (req, res) => {
  try {
    const event = await Event.findOne({ code: req.params.eventCode });
    if (!event) return res.json([]);
    const results = await Result.find({ eventId: event.code })
      .sort({ speedMPM: -1 })
      .lean();
    res.json(results);
  } catch (error) {
    console.error("Results error:", error);
    res
      .status(500)
      .json({ error: "An internal error occurred. Please try again later." });
  }
});

// LOGS
app.get("/api/logs", async (req, res) => {
  try {
    const logs = await Log.find().sort({ _id: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    console.error("Logs error:", error);
    res
      .status(500)
      .json({ error: "An internal error occurred. Please try again later." });
  }
});

// ===== PLAYERS CRUD =====
// SECURE: now requireAdmin for GET all players
app.get("/api/users/players", requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: "player" }).select("-passwordHash");
    res.json(users);
  } catch (error) {
    console.error("Players error:", error);
    res
      .status(500)
      .json({ error: "An internal error occurred. Please try again later." });
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
    res
      .status(500)
      .json({ error: "An internal error occurred. Please try again later." });
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
      res.json({ success: true, user: userResponse });
    } catch (error) {
      console.error("Player creation error:", error);
      if (error.code === 11000)
        return res.status(400).json({ error: "Duplicate user ID" });
      res
        .status(500)
        .json({ error: "An internal error occurred. Please try again later." });
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

      await Log.create({
        time: new Date().toLocaleString(),
        message: `Admin updated player ${id}`,
      });

      const userResponse = user.toObject();
      delete userResponse.passwordHash;
      res.json({ success: true, user: userResponse });
    } catch (error) {
      console.error("Player update error:", error);
      res
        .status(500)
        .json({ error: "An internal error occurred. Please try again later." });
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

    await Log.create({
      time: new Date().toLocaleString(),
      message: `Admin deleted player ${id}`,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Player delete error:", error);
    res
      .status(500)
      .json({ error: "An internal error occurred. Please try again later." });
  }
});

// ===== EVENT MANAGEMENT =====
app.delete("/api/events/:code", requireAdmin, async (req, res) => {
  try {
    const { code } = req.params;
    const event = await Event.findOneAndDelete({ code });
    if (!event) return res.status(404).json({ error: "Event not found" });
    await Result.deleteMany({ eventId: code });
    await RaceCode.deleteMany({ eventId: code });
    await Counter.deleteMany({ eventId: code });

    await Log.create({
      time: new Date().toLocaleString(),
      message: `Admin deleted event ${event.name} (${code})`,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Event delete error:", error);
    res
      .status(500)
      .json({ error: "An internal error occurred. Please try again later." });
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
      });

      await Log.create({
        time: new Date().toLocaleString(),
        message: `Admin created event ${event.name} (${event.code})`,
      });

      res.json({ success: true, event });
    } catch (error) {
      console.error("Event creation error:", error);
      res
        .status(500)
        .json({ error: "An internal error occurred. Please try again later." });
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
      time: new Date().toLocaleString(),
      message: `Admin toggled event ${event.name} (${event.code}) to ${event.status}`,
    });

    res.json({ success: true, event });
  } catch (error) {
    console.error("Event toggle error:", error);
    res
      .status(500)
      .json({ error: "An internal error occurred. Please try again later." });
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

      await Log.create({
        time: new Date().toLocaleString(),
        message: `User ${userId} updated password`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Password update error:", error);
      res
        .status(500)
        .json({ error: "An internal error occurred. Please try again later." });
    }
  },
);

// ===== PLAYER STATS =====
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
      });
    }

    const totalPigeons = results.length;
    const eventIds = [...new Set(results.map((r) => r.eventId))];
    const eventsParticipated = eventIds.length;
    const speeds = results.map((r) => r.speedMPM);
    const averageSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const bestSpeed = Math.max(...speeds);

    let wins = 0;
    let podiums = 0;

    for (const eventId of eventIds) {
      const eventResults = await Result.find({ eventId })
        .sort({ speedMPM: -1 })
        .lean();

      if (eventResults.length === 0) continue;

      const userIndex = eventResults.findIndex((r) => r.userId === id);

      if (userIndex === 0) wins++;
      if (userIndex >= 0 && userIndex < 3) podiums++;
    }

    const winRate =
      eventsParticipated > 0 ? (wins / eventsParticipated) * 100 : 0;

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
    });
  } catch (error) {
    console.error("Player stats error:", error);
    res
      .status(500)
      .json({ error: "An internal error occurred. Please try again later." });
  }
});

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

// ===== GLOBAL ERROR HANDLER (NEW) =====
app.use((err, req, res, next) => {
  console.error("Global error:", err.stack || err);
  res.status(500).json({
    error: "An unexpected error occurred. Please try again later.",
  });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
