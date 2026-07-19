const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const WorkDay = require("./models/WorkDay");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("Dawami API 🚀");
});

app.post("/workdays", async (req, res) => {
  try {
    const workDay = new WorkDay(req.body);
    await workDay.save();
    res.json(workDay);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/workdays", async (req, res) => {
  try {
    const workDays = await WorkDay.find().sort({ date: -1 });
    res.json(workDays);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
