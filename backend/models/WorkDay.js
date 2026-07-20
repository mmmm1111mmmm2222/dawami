const mongoose = require("mongoose");

const workDaySchema = new mongoose.Schema({
  date: {
    type: String,
    required: true
  },
  hours: {
    type: Number,
    default: 0
  },
  wage: {
    type: Number,
    default: 0
  },
  note: {
    type: String,
    default: ""
  },
  currency: {
    type: String,
    default: "USD"
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true,
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("WorkDay", workDaySchema);
