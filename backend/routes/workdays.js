const express  = require("express");
const WorkDay  = require("../models/WorkDay");
const auth     = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(auth);

// GET /workdays — current user's workdays only
router.get("/", async (req, res) => {
  try {
    const workDays = await WorkDay.find({ userId: req.userId }).sort({ date: -1 });
    res.json(workDays);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /workdays
router.post("/", async (req, res) => {
  try {
    const { date, hours, wage, currency, note } = req.body;
    const workDay = new WorkDay({ date, hours, wage, currency, note, userId: req.userId });
    await workDay.save();
    res.status(201).json(workDay);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /workdays/:id — only owner can edit
router.put("/:id", async (req, res) => {
  try {
    const { date, hours, wage, currency, note } = req.body;
    const workDay = await WorkDay.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { date, hours, wage, currency, note },
      { new: true, runValidators: true }
    );
    if (!workDay) return res.status(404).json({ error: "غير موجود أو غير مصرح" });
    res.json(workDay);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /workdays/:id — only owner can delete
router.delete("/:id", async (req, res) => {
  try {
    const workDay = await WorkDay.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!workDay) return res.status(404).json({ error: "غير موجود أو غير مصرح" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
