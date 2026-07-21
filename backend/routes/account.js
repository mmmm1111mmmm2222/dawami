/**
 * /account — Export, import, and backup routes
 * All routes require authentication.
 */
const express  = require("express");
const router   = express.Router();
const authMW   = require("../middleware/auth");
const User     = require("../models/User");
const WorkDay  = require("../models/WorkDay");
const Employer = require("../models/Employer");
const Payment  = require("../models/Payment");

router.use(authMW);

const BACKUP_VERSION = "2";

/* ─────────────────────────────────────────
   GET /account/export/json
   Full data export as JSON backup
───────────────────────────────────────── */
router.get("/export/json", async (req, res) => {
  try {
    const [user, employers, workdays, payments] = await Promise.all([
      User.findById(req.userId).select("-password -resetPasswordToken -resetPasswordExpires -tokenVersion"),
      Employer.find({ userId: req.userId }).lean(),
      WorkDay.find({ userId: req.userId }).lean(),
      Payment.find({ userId: req.userId }).lean(),
    ]);

    const backup = {
      version:     BACKUP_VERSION,
      exportedAt:  new Date().toISOString(),
      app:         "dawami",
      account: {
        name:  user.name,
        email: user.email,
      },
      employers,
      workdays,
      payments,
    };

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="dawami-backup-${_dateStr()}.json"`);
    res.json(backup);
  } catch (err) {
    console.error("Export JSON error:", err.message);
    res.status(500).json({ error: "خطأ في التصدير" });
  }
});

/* ─────────────────────────────────────────
   GET /account/export/csv/workdays
───────────────────────────────────────── */
router.get("/export/csv/workdays", async (req, res) => {
  try {
    const workdays = await WorkDay.find({ userId: req.userId })
      .populate("employer", "name")
      .lean();

    const headers = ["التاريخ","جهة العمل","نوع الأجر","ساعات عادية","ساعات إضافية","المعدل","الأجر المحتسب","المستحق","المستلم","الحالة","العملة","ملاحظة"];
    const rows = workdays.map(w => [
      w.date,
      w.employer?.name || "",
      w.wageType || "",
      w.regularHours ?? "",
      w.overtimeHours ?? "",
      w.wageRate ?? "",
      w.calculatedWage ?? "",
      w.totalDue ?? "",
      w.amountReceived ?? "",
      w.paymentStatus || "",
      w.currency || "",
      (w.note || "").replace(/,/g, "،"),
    ]);

    res.setHeader("Content-Type", "text/csv; charset=utf-8-sig");
    res.setHeader("Content-Disposition", `attachment; filename="dawami-workdays-${_dateStr()}.csv"`);
    res.send(_toCsv(headers, rows));
  } catch (err) {
    res.status(500).json({ error: "خطأ في التصدير" });
  }
});

/* ─────────────────────────────────────────
   GET /account/export/csv/payments
───────────────────────────────────────── */
router.get("/export/csv/payments", async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.userId })
      .populate("employer", "name")
      .populate("workday", "date")
      .lean();

    const headers = ["التاريخ","جهة العمل","يوم العمل","المبلغ","العملة","طريقة الدفع","ملاحظة"];
    const rows = payments.map(p => [
      p.date,
      p.employer?.name || "",
      p.workday?.date || "",
      p.amount ?? "",
      p.currency || "",
      p.method || "",
      (p.note || "").replace(/,/g, "،"),
    ]);

    res.setHeader("Content-Type", "text/csv; charset=utf-8-sig");
    res.setHeader("Content-Disposition", `attachment; filename="dawami-payments-${_dateStr()}.csv"`);
    res.send(_toCsv(headers, rows));
  } catch (err) {
    res.status(500).json({ error: "خطأ في التصدير" });
  }
});

/* ─────────────────────────────────────────
   GET /account/export/csv/employers
───────────────────────────────────────── */
router.get("/export/csv/employers", async (req, res) => {
  try {
    const employers = await Employer.find({ userId: req.userId }).lean();

    const headers = ["الاسم","جهة الاتصال","الهاتف","العنوان","العملة","نوع الأجر","المعدل الافتراضي","ملاحظة"];
    const rows = employers.map(e => [
      e.name,
      e.contactPerson || "",
      e.phone || "",
      e.address || "",
      e.defaultCurrency || "",
      e.wageType || "",
      e.defaultWageRate ?? "",
      (e.note || "").replace(/,/g, "،"),
    ]);

    res.setHeader("Content-Type", "text/csv; charset=utf-8-sig");
    res.setHeader("Content-Disposition", `attachment; filename="dawami-employers-${_dateStr()}.csv"`);
    res.send(_toCsv(headers, rows));
  } catch (err) {
    res.status(500).json({ error: "خطأ في التصدير" });
  }
});

/* ─────────────────────────────────────────
   POST /account/import
   Validate and import a JSON backup
───────────────────────────────────────── */
router.post("/import", async (req, res) => {
  try {
    const backup = req.body;

    // Validate structure
    if (!backup || backup.app !== "dawami")
      return res.status(400).json({ error: "ملف النسخ الاحتياطي غير صالح" });
    if (!Array.isArray(backup.employers) || !Array.isArray(backup.workdays) || !Array.isArray(backup.payments))
      return res.status(400).json({ error: "بنية الملف غير مكتملة" });

    const results = { employers: 0, workdays: 0, payments: 0, skipped: 0 };

    // ── Import employers ──
    const empIdMap = {}; // old _id → new _id
    for (const e of backup.employers) {
      const existing = await Employer.findOne({ userId: req.userId, name: e.name?.trim() });
      if (existing) {
        empIdMap[String(e._id)] = String(existing._id);
        results.skipped++;
        continue;
      }
      const created = await Employer.create({
        name:            e.name?.trim() || "بدون اسم",
        contactPerson:   e.contactPerson || "",
        phone:           e.phone || "",
        address:         e.address || "",
        note:            e.note || "",
        defaultCurrency: e.defaultCurrency || "USD",
        wageType:        e.wageType || "daily",
        defaultWageRate: Number(e.defaultWageRate) || 0,
        userId:          req.userId,
      });
      empIdMap[String(e._id)] = String(created._id);
      results.employers++;
    }

    // ── Import workdays ──
    const wdIdMap = {};
    for (const w of backup.workdays) {
      // Deduplicate by date + employer
      const empNewId = w.employer ? empIdMap[String(w.employer)] || null : null;
      const existing = await WorkDay.findOne({ userId: req.userId, date: w.date, employer: empNewId });
      if (existing) {
        wdIdMap[String(w._id)] = String(existing._id);
        results.skipped++;
        continue;
      }
      const created = await WorkDay.create({
        date:               w.date || "",
        hours:              Number(w.hours) || 0,
        wage:               Number(w.wage) || 0,
        note:               w.note || "",
        currency:           w.currency || "USD",
        employer:           empNewId,
        wageType:           w.wageType || "daily",
        regularHours:       Number(w.regularHours) || 0,
        overtimeHours:      Number(w.overtimeHours) || 0,
        overtimeMultiplier: Number(w.overtimeMultiplier) || 1.5,
        wageRate:           Number(w.wageRate) || 0,
        calculatedWage:     Number(w.calculatedWage) || 0,
        manualWageOverride: !!w.manualWageOverride,
        totalDue:           Number(w.totalDue) || 0,
        amountReceived:     Number(w.amountReceived) || 0,
        paymentStatus:      w.paymentStatus || "unpaid",
        paymentDate:        w.paymentDate || "",
        userId:             req.userId,
      });
      wdIdMap[String(w._id)] = String(created._id);
      results.workdays++;
    }

    // ── Import payments ──
    for (const p of backup.payments) {
      const empNewId = p.employer ? empIdMap[String(p.employer)] || null : null;
      const wdNewId  = p.workday  ? wdIdMap[String(p.workday)]   || null : null;
      if (!empNewId) { results.skipped++; continue; }

      // Deduplicate by date + amount + employer
      const existing = await Payment.findOne({ userId: req.userId, date: p.date, amount: Number(p.amount), employer: empNewId });
      if (existing) { results.skipped++; continue; }

      await Payment.create({
        employer: empNewId,
        workday:  wdNewId,
        amount:   Number(p.amount) || 0,
        currency: p.currency || "USD",
        date:     p.date || "",
        method:   p.method || "cash",
        note:     p.note || "",
        userId:   req.userId,
      });
      results.payments++;
    }

    res.json({
      message: `تم الاستيراد: ${results.employers} جهة عمل، ${results.workdays} يوم عمل، ${results.payments} دفعة. تم تخطي ${results.skipped} سجل مكرر.`,
      results,
    });
  } catch (err) {
    console.error("Import error:", err.message);
    res.status(500).json({ error: "خطأ في الاستيراد: " + err.message });
  }
});

/* ── helpers ── */
function _dateStr() {
  return new Date().toISOString().slice(0, 10);
}

function _toCsv(headers, rows) {
  const esc = v => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(",")];
  for (const row of rows) lines.push(row.map(esc).join(","));
  return "\uFEFF" + lines.join("\r\n"); // BOM for Arabic Excel
}

module.exports = router;
