const mongoose = require('mongoose');

const EmployerSchema = new mongoose.Schema({
  name:             { type: String, required: true, trim: true },
  contactPerson:    { type: String, trim: true, default: '' },
  phone:            { type: String, trim: true, default: '' },
  address:          { type: String, trim: true, default: '' },
  note:             { type: String, trim: true, default: '' },
  defaultCurrency:  { type: String, default: 'USD' },
  wageType:         { type: String, enum: ['hourly','daily','monthly','piecework'], default: 'daily' },
  defaultWageRate:  { type: Number, default: 0 },
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true });

module.exports = mongoose.model('Employer', EmployerSchema);
