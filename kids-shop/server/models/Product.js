import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  category: { type: String, required: true },
  sizes: [String], // ['62', '68', '74', '80', '86', '92', '98', '104', '110', '116', '122', '128', '134', '140']
  composition: String, // Состав ткани
  images: [String], // Array of image paths
  stock: { type: Number, default: 0 }, // Количество на складе
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Product', productSchema);
