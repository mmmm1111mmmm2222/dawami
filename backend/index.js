const express      = require("express");
const cors         = require("cors");
const mongoose     = require("mongoose");
const path         = require("path");
const helmet       = require("helmet");
const rateLimit    = require("express-rate-limit");
require("dotenv").config();

const app = express();

/* ── Security headers ── */
app.use(helmet({
  contentSecurityPolicy: false,   // SPA + inline scripts; tighten in production if needed
  crossOriginEmbedderPolicy: false,
}));

/* ── Basic middleware ── */
app.use(cors());
app.use(express.json({ limit: "5mb" })); // allow backup import payloads

/* ── Rate limiters ── */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "طلبات كثيرة جداً، يرجى الانتظار قليلاً ثم المحاولة مجدداً" },
});
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "طلبات كثيرة جداً، يرجى المحاولة بعد ساعة" },
});

/* ── Service-worker / manifest — never stale-cached ── */
app.get("/sw.js", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  next();
});

app.use(express.static(path.join(__dirname, "public"), {
  setHeaders(res, filePath) {
    if (filePath.endsWith("manifest.json")) {
      res.setHeader("Cache-Control", "public, max-age=0");
    }
  },
}));

/* ── MongoDB ── */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB error:", err.message));

/* ── Routes ── */
app.use("/auth/forgot-password",  resetLimiter);
app.use("/auth/reset-password",   resetLimiter);
app.use("/auth/login",            authLimiter);
app.use("/auth/register",         authLimiter);
app.use("/auth/request-deletion", resetLimiter);

app.use("/auth",     require("./routes/auth"));
app.use("/workdays", require("./routes/workdays"));
app.use("/employers",require("./routes/employers"));
app.use("/payments", require("./routes/payments"));
app.use("/account",  require("./routes/account"));

/* ── Catch-all → SPA ── */
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
