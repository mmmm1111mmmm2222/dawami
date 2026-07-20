const mongoose = require('mongoose');

const WorkDaySchema = new mongoose.Schema({
  /* ── Legacy fields (preserved for backward compatibility) ── */
  date:     { type: String },
  hours:    { type: Number, default: 0 },   // kept for old records
  wage:     { type: Number, default: 0 },   // kept for old records / manual override total
  note:     { type: String, default: '' },
  currency: { type: String, default: 'USD' },
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  /* ── Employer link ── */
  employer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employer', default: null },

  /* ── Wage calculation ── */
  wageType:             { type: String, enum: ['hourly','daily','monthly','piecework'], default: 'daily' },
  regularHours:         { type: Number, default: 0 },
  overtimeHours:        { type: Number, default: 0 },
  overtimeMultiplier:   { type: Number, default: 1.5 },
  wageRate:             { type: Number, default: 0 },       // rate used in calc
  calculatedWage:       { type: Number, default: 0 },       // auto-calculated total
  manualWageOverride:   { type: Boolean, default: false },  // true = user typed wage manually

  /* ── Payment tracking ── */
  totalDue:       { type: Number, default: 0 },
  amountReceived: { type: Number, default: 0 },
  paymentStatus:  { type: String, enum: ['unpaid','partial','paid'], default: 'unpaid' },
  paymentDate:    { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('WorkDay', WorkDaySchema);
