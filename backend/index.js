const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const WorkDay = require("./models/WorkDay");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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

app.put("/workdays/:id", async (req, res) => {
  try {
    const workDay = await WorkDay.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!workDay) return res.status(404).json({ error: "غير موجود" });
    res.json(workDay);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/workdays/:id", async (req, res) => {
  try {
    const workDay = await WorkDay.findByIdAndDelete(req.params.id);
    if (!workDay) return res.status(404).json({ error: "غير موجود" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
