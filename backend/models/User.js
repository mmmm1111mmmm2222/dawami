const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  /* ── Password reset ── */
  resetPasswordToken:   { type: String,  default: null },  // SHA-256 hash of plain token
  resetPasswordExpires: { type: Date,    default: null },

  /* ── Session invalidation (logout-all-devices) ── */
  tokenVersion: { type: Number, default: 0 },

  /* ── Appearance ── */
  darkMode: { type: String, enum: ["light","dark","system"], default: "system" },

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
