const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  employer:  { type: mongoose.Schema.Types.ObjectId, ref: 'Employer', required: true },
  workday:   { type: mongoose.Schema.Types.ObjectId, ref: 'WorkDay', default: null },
  amount:    { type: Number, required: true },
  currency:  { type: String, required: true },
  date:      { type: String, required: true },
  method:    { type: String, enum: ['cash','bank','card','other'], default: 'cash' },
  note:      { type: String, default: '' },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
