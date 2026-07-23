const express = require("express");
const router = express.Router();

const MonthlyPlan = require("../models/MonthlyPlan");
const auth = require("../middleware/auth");

router.use(auth);

/* GET /monthly-plans?year=2027&month=2 */
router.get("/", async (req, res) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    if (!year || !month) {
      return res.status(400).json({
        error: "السنة والشهر مطلوبان"
      });
    }

    const plan = await MonthlyPlan.findOne({
      userId: req.userId,
      year,
      month
    });

    res.json(plan || null);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "خطأ في الخادم"
    });
  }
});

/* POST /monthly-plans */
router.post("/", async (req, res) => {
  try {
    const year = Number(req.body.year);
    const month = Number(req.body.month);
    const note = req.body.note || "";

    const days = Array.isArray(req.body.days)
      ? req.body.days.map(item => ({
          day: Number(item.day),
          status:
            item.status === "holiday"
              ? "holiday"
              : "work",
          amount: Number(item.amount) || 0
        }))
      : [];

    if (!year || !month) {
      return res.status(400).json({
        error: "السنة والشهر مطلوبان"
      });
    }

    const plan = await MonthlyPlan.findOneAndUpdate(
      {
        userId: req.userId,
        year,
        month
      },
      {
        userId: req.userId,
        year,
        month,
        note,
        days
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );

    res.json(plan);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "تعذر حفظ الجدول"
    });
  }
});

/* DELETE /monthly-plans?year=2027&month=2 */
router.delete("/", async (req, res) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    if (!year || !month) {
      return res.status(400).json({
        error: "السنة والشهر مطلوبان"
      });
    }

    await MonthlyPlan.findOneAndDelete({
      userId: req.userId,
      year,
      month
    });

    res.json({
      message: "تم حذف الجدول"
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "تعذر حذف الجدول"
    });
  }
});

module.exports = router;