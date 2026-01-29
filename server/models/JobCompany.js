const mongoose = require('mongoose');

const jobCompanySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  email: { type: String, default: '', trim: true },
  phone: { type: String, default: '', trim: true },
  website: { type: String, default: '', trim: true },
  address: { type: String, default: '', trim: true },
  logo: { type: String, default: '' },
  description: { type: String, default: '' }
}, { timestamps: true });

jobCompanySchema.index({ name: 1 });
jobCompanySchema.index({ email: 1 });

module.exports = mongoose.model('JobCompany', jobCompanySchema);


