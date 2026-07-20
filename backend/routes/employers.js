const express  = require('express');
const router   = express.Router();
const Employer = require('../models/Employer');
const auth     = require('../middleware/auth');

router.use(auth);

/* GET /employers – list for current user */
router.get('/', async (req, res) => {
  try {
    const employers = await Employer.find({ userId: req.userId }).sort({ name: 1 });
    res.json(employers);
  } catch (e) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

/* POST /employers – create */
router.post('/', async (req, res) => {
  try {
    const { name, contactPerson, phone, address, note, defaultCurrency, wageType, defaultWageRate } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'اسم جهة العمل مطلوب' });
    const employer = await Employer.create({
      name: name.trim(), contactPerson, phone, address, note,
      defaultCurrency: defaultCurrency || 'USD',
      wageType: wageType || 'daily',
      defaultWageRate: Number(defaultWageRate) || 0,
      userId: req.userId,
    });
    res.status(201).json(employer);
  } catch (e) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

/* PUT /employers/:id – update */
router.put('/:id', async (req, res) => {
  try {
    const employer = await Employer.findOne({ _id: req.params.id, userId: req.userId });
    if (!employer) return res.status(404).json({ error: 'جهة العمل غير موجودة' });

    const { name, contactPerson, phone, address, note, defaultCurrency, wageType, defaultWageRate } = req.body;
    if (name !== undefined) employer.name = name.trim();
    if (contactPerson !== undefined) employer.contactPerson = contactPerson;
    if (phone !== undefined) employer.phone = phone;
    if (address !== undefined) employer.address = address;
    if (note !== undefined) employer.note = note;
    if (defaultCurrency !== undefined) employer.defaultCurrency = defaultCurrency;
    if (wageType !== undefined) employer.wageType = wageType;
    if (defaultWageRate !== undefined) employer.defaultWageRate = Number(defaultWageRate) || 0;

    await employer.save();
    res.json(employer);
  } catch (e) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

/* DELETE /employers/:id */
router.delete('/:id', async (req, res) => {
  try {
    const employer = await Employer.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!employer) return res.status(404).json({ error: 'جهة العمل غير موجودة' });
    res.json({ message: 'تم الحذف' });
  } catch (e) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

module.exports = router;
