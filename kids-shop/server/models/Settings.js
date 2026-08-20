import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  taxRate: { type: Number, default: 6 }, // Процент налога по умолчанию (например, УСН 6%)
  companyName: { type: String, default: 'KidsStyle' },
  currency: { type: String, default: 'RUB' }
});

export default mongoose.model('Settings', settingsSchema);
