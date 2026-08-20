import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    price: Number,
    size: String,
    quantity: Number,
    image: String
  }],
  totalAmount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], 
    default: 'pending' 
  },
  deliveryInfo: {
    name: String,
    phone: String,
    address: String,
    comment: String
  },
  paymentMethod: { type: String, enum: ['card', 'cash', 'online'], default: 'card' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Order', orderSchema);
