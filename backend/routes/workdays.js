const express = require('express');
const router  = express.Router();
const WorkDay = require('../models/WorkDay');
const auth    = require('../middleware/auth');

router.use(auth);

/* GET /workdays */
router.get('/', async (req, res) => {
  try {
    const workdays = await WorkDay.find({ userId: req.userId })
      .populate('employer', 'name defaultCurrency wageType defaultWageRate')
      .sort({ date: -1 });
    res.json(workdays);
  } catch (e) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

/* POST /workdays */
router.post('/', async (req, res) => {
  try {
    const data = _sanitize(req.body);
    data.userId = req.userId;
    const workday = await WorkDay.create(data);
    const populated = await WorkDay.findById(workday._id)
      .populate('employer', 'name defaultCurrency wageType defaultWageRate');
    res.status(201).json(populated);
  } catch (e) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

/* PUT /workdays/:id */
router.put('/:id', async (req, res) => {
  try {
    const workday = await WorkDay.findOne({ _id: req.params.id, userId: req.userId });
    if (!workday) return res.status(404).json({ error: 'يوم العمل غير موجود' });

    const data = _sanitize(req.body);
    Object.assign(workday, data);
    await workday.save();

    const populated = await WorkDay.findById(workday._id)
      .populate('employer', 'name defaultCurrency wageType defaultWageRate');
    res.json(populated);
  } catch (e) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

/* DELETE /workdays/:id */
router.delete('/:id', async (req, res) => {
  try {
    const workday = await WorkDay.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!workday) return res.status(404).json({ error: 'يوم العمل غير موجود' });
    res.json({ message: 'تم الحذف' });
  } catch (e) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

/* ── Sanitize + derive computed fields ── */
function _sanitize(body) {
  const {
    date, hours, wage, note, currency, employer,
    wageType, regularHours, overtimeHours, overtimeMultiplier,
    wageRate, manualWageOverride,
    totalDue, amountReceived, paymentStatus, paymentDate,
  } = body;

  const rHours = Number(regularHours) || 0;
  const oHours = Number(overtimeHours) || 0;
  const oMult  = Number(overtimeMultiplier) || 1.5;
  const rate   = Number(wageRate) || 0;
  const type   = wageType || 'daily';
  const isManual = !!manualWageOverride;

  // Auto-calculate wage
  let calculated = 0;
  if (!isManual && rate > 0) {
    if (type === 'hourly') {
      calculated = (rHours * rate) + (oHours * rate * oMult);
    } else {
      // daily / monthly / piecework: rate is the flat amount
      calculated = rate;
    }
  }

  const wageTotal = isManual ? (Number(wage) || 0) : calculated;

  // Derive payment status
  const due      = Number(totalDue) || wageTotal;
  const received = Number(amountReceived) || 0;
  let status = 'unpaid';
  if (received > 0 && received < due) status = 'partial';
  if (received >= due && due > 0)     status = 'paid';
  if (paymentStatus) status = paymentStatus; // allow explicit override

  return {
    date:               date || '',
    hours:              Number(hours) || rHours + oHours,
    wage:               wageTotal,
    note:               note || '',
    currency:           currency || 'USD',
    employer:           employer || null,
    wageType:           type,
    regularHours:       rHours,
    overtimeHours:      oHours,
    overtimeMultiplier: oMult,
    wageRate:           rate,
    calculatedWage:     calculated,
    manualWageOverride: isManual,
    totalDue:           due,
    amountReceived:     received,
    paymentStatus:      status,
    paymentDate:        paymentDate || '',
  };
}

module.exports = router;
