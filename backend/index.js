const express  = require("express");
const cors     = require("cors");
const mongoose = require("mongoose");
const path     = require("path");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Service-worker must never be stale-cached by the browser
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

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB error:", err.message));

// Routes
app.use("/auth",      require("./routes/auth"));
app.use("/workdays",  require("./routes/workdays"));
app.use("/employers", require("./routes/employers"));
app.use("/payments",  require("./routes/payments"));

// Catch-all → SPA
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
