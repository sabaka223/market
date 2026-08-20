import express from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Создать заказ (для пользователя)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { items, deliveryInfo, paymentMethod } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Корзина пуста' });
    }
    
    // Проверка наличия товаров и расчет общей суммы
    let totalAmount = 0;
    const validatedItems = [];
    
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive) {
        return res.status(400).json({ message: `Товар "${item.name}" недоступен` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Недостаточно товара "${product.name}" на складе` });
      }
      
      totalAmount += product.price * item.quantity;
      validatedItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        size: item.size,
        quantity: item.quantity,
        image: product.images[0] || ''
      });
      
      // Уменьшаем количество на складе
      product.stock -= item.quantity;
      await product.save();
    }
    
    const order = new Order({
      user: req.userId,
      items: validatedItems,
      totalAmount,
      deliveryInfo,
      paymentMethod: paymentMethod || 'card'
    });
    
    await order.save();
    
    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка при создании заказа' });
  }
});

// Получить заказы текущего пользователя
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .populate('items.product', 'name images');
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении заказов' });
  }
});

// Получить все заказы (Admin only)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении заказов' });
  }
});

// Получить заказ по ID (Admin only)
router.get('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone address')
      .populate('items.product');
    
    if (!order) {
      return res.status(404).json({ message: 'Заказ не найден' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении заказа' });
  }
});

// Обновить статус заказа (Admin only)
router.patch('/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('user', 'name email');
    
    if (!order) {
      return res.status(404).json({ message: 'Заказ не найден' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при обновлении статуса заказа' });
  }
});

// Удалить заказ (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Заказ не найден' });
    }
    
    // Возвращаем товары на склад
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }
    
    res.json({ message: 'Заказ удален' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при удалении заказа' });
  }
});

export default router;
