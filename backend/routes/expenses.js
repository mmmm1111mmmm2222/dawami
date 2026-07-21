const express = require("express");
const Expense = require("../models/Expense");
const authMW = require("../middleware/auth");

const router = express.Router();

// جلب كل المصاريف
router.get("/", authMW, async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.userId }).sort({
      date: -1,
      createdAt: -1,
    });

    res.json(expenses);
  } catch (err) {
    console.error("Get expenses error:", err.message);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// إضافة مصروف
router.post("/", authMW, async (req, res) => {
  try {
    const { title, amount, category, date, note } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: "اسم المصروف مطلوب" });
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: "المبلغ يجب أن يكون أكبر من صفر" });
    }

    const expense = await Expense.create({
      userId: req.userId,
      title: String(title).trim(),
      amount: numericAmount,
      category: String(category || "أخرى").trim(),
      date: date ? new Date(date) : new Date(),
      note: String(note || "").trim(),
    });

    res.status(201).json(expense);
  } catch (err) {
    console.error("Create expense error:", err.message);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// تعديل مصروف
router.put("/:id", authMW, async (req, res) => {
  try {
    const { title, amount, category, date, note } = req.body;
    
const update = {};
    if (amount !== undefined) {
      const numericAmount = Number(amount);

      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
          error: "المبلغ يجب أن يكون أكبر من صفر",
        });
      }

      update.amount = numericAmount;
    }

    if (category !== undefined) {
      update.category = String(category || "أخرى").trim();
    }

    if (date !== undefined) {
      update.date = new Date(date);
    }

    if (note !== undefined) {
      update.note = String(note || "").trim();
    }

    const expense = await Expense.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.userId,
      },
      update,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!expense) {
      return res.status(404).json({
        error: "المصروف غير موجود",
      });
    }

    res.json(expense);
  } catch (err) {
    console.error("Update expense error:", err.message);
    res.status(500).json({
      error: "حدث خطأ في الخادم",
    });
  }
});

// حذف مصروف
router.delete("/:id", authMW, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!expense) {
      return res.status(404).json({
        error: "المصروف غير موجود",
      });
    }

    res.json({
      message: "تم حذف المصروف بنجاح",
    });
  } catch (err) {
    console.error("Delete expense error:", err.message);
    res.status(500).json({
      error: "حدث خطأ في الخادم",
    });
  }
});

module.exports = router;
    