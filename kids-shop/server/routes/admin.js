import express from 'express';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Получить всех пользователей (Admin only)
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении пользователей' });
  }
});

// Получить дашборд статистику (Admin only)
router.get('/dashboard', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Общее количество пользователей
    const totalUsers = await User.countDocuments({ role: 'user' });
    
    // Общее количество товаров
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });
    
    // Заказы по статусам
    const ordersByStatus = await Order.aggregate([
      { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }}
    ]);
    
    // Последние заказы
    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);
    
    // Доход за месяц
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const monthlyRevenue = await Order.aggregate([
      { $match: {
        createdAt: { $gte: oneMonthAgo },
        status: { $in: ['delivered', 'shipped', 'processing'] }
      }},
      { $group: {
        _id: null,
        total: { $sum: '$totalAmount' }
      }}
    ]);
    
    // Продажи по категориям
    const salesByCategory = await Order.aggregate([
      { $match: { status: { $in: ['delivered', 'shipped', 'processing'] } }},
      { $unwind: '$items' },
      { $group: {
        _id: '$items.name',
        category: { $first: '$items.category' },
        totalSales: { $sum: '$items.price' },
        quantity: { $sum: '$items.quantity' }
      }},
      { $sort: { totalSales: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      totalUsers,
      totalProducts,
      activeProducts,
      ordersByStatus,
      recentOrders,
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
      salesByCategory
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка при получении статистики дашборда' });
  }
});

export default router;
