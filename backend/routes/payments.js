const express  = require('express');
const router   = express.Router();
const Payment  = require('../models/Payment');
const WorkDay  = require('../models/WorkDay');
const auth     = require('../middleware/auth');

router.use(auth);

/* GET /payments */
router.get('/', async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.userId })
      .populate('employer', 'name')
      .populate('workday', 'date')
      .sort({ date: -1 });
    res.json(payments);
  } catch (e) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

/* POST /payments */
router.post('/', async (req, res) => {
  try {
    const { employer, workday, amount, currency, date, method, note } = req.body;
    if (!employer) return res.status(400).json({ error: 'جهة العمل مطلوبة' });
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'المبلغ مطلوب' });
    if (!currency) return res.status(400).json({ error: 'العملة مطلوبة' });
    if (!date) return res.status(400).json({ error: 'التاريخ مطلوب' });

    const payment = await Payment.create({
      employer,
      workday: workday || null,
      amount: Number(amount),
      currency,
      date,
      method: method || 'cash',
      note: note || '',
      userId: req.userId,
    });

    // If linked to a workday, update its amountReceived + paymentStatus
    if (workday) {
      await _syncWorkdayPayment(workday, req.userId);
    }

    const populated = await Payment.findById(payment._id)
      .populate('employer', 'name')
      .populate('workday', 'date');
    res.status(201).json(populated);
  } catch (e) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

/* PUT /payments/:id */
router.put('/:id', async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, userId: req.userId });
    if (!payment) return res.status(404).json({ error: 'الدفعة غير موجودة' });

    const oldWorkday = payment.workday;
    const { employer, workday, amount, currency, date, method, note } = req.body;

    if (employer !== undefined) payment.employer = employer;
    if (workday !== undefined) payment.workday = workday || null;
    if (amount !== undefined) payment.amount = Number(amount);
    if (currency !== undefined) payment.currency = currency;
    if (date !== undefined) payment.date = date;
    if (method !== undefined) payment.method = method;
    if (note !== undefined) payment.note = note;

    await payment.save();

    // Re-sync old and new linked workdays
    if (oldWorkday) await _syncWorkdayPayment(String(oldWorkday), req.userId);
    if (payment.workday && String(payment.workday) !== String(oldWorkday)) {
      await _syncWorkdayPayment(String(payment.workday), req.userId);
    }

    const populated = await Payment.findById(payment._id)
      .populate('employer', 'name')
      .populate('workday', 'date');
    res.json(populated);
  } catch (e) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

/* DELETE /payments/:id */
router.delete('/:id', async (req, res) => {
  try {
    const payment = await Payment.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!payment) return res.status(404).json({ error: 'الدفعة غير موجودة' });
    if (payment.workday) await _syncWorkdayPayment(String(payment.workday), req.userId);
    res.json({ message: 'تم الحذف' });
  } catch (e) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

/* ── Helper: sum all payments for a workday and update its status ── */
async function _syncWorkdayPayment(workdayId, userId) {
  try {
    const wd = await WorkDay.findOne({ _id: workdayId, userId });
    if (!wd) return;
    const payments = await Payment.find({ workday: workdayId, userId });
    const received = payments.reduce((s, p) => s + (p.amount || 0), 0);
    wd.amountReceived = received;
    const due = wd.totalDue || 0;
    if (received <= 0) wd.paymentStatus = 'unpaid';
    else if (received >= due) wd.paymentStatus = 'paid';
    else wd.paymentStatus = 'partial';
    await wd.save();
  } catch (_) { /* silent */ }
}

module.exports = router;
