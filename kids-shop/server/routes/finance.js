import express from 'express';
import Expense from '../models/Expense.js';
import Settings from '../models/Settings.js';
import Order from '../models/Order.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

// Получить настройки
router.get('/settings', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении настроек' });
  }
});

// Обновить настройки (Admin only)
router.put('/settings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { taxRate, companyName, currency } = req.body;
    
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }
    
    if (taxRate !== undefined) settings.taxRate = taxRate;
    if (companyName !== undefined) settings.companyName = companyName;
    if (currency !== undefined) settings.currency = currency;
    
    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при обновлении настроек' });
  }
});

// Получить все расходы (Admin only)
router.get('/expenses', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    
    let query = {};
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    const expenses = await Expense.find(query).sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении расходов' });
  }
});

// Создать расход (Admin only)
router.post('/expenses', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, amount, category, description, date } = req.body;
    
    const expense = new Expense({
      name,
      amount: Number(amount),
      category,
      description,
      date: date || new Date()
    });
    
    await expense.save();
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при создании расхода' });
  }
});

// Обновить расход (Admin only)
router.put('/expenses/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, amount, category, description, date } = req.body;
    
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { name, amount: Number(amount), category, description, date },
      { new: true }
    );
    
    if (!expense) {
      return res.status(404).json({ message: 'Расход не найден' });
    }
    
    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при обновлении расхода' });
  }
});

// Удалить расход (Admin only)
router.delete('/expenses/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Расход не найден' });
    }
    res.json({ message: 'Расход удален' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при удалении расхода' });
  }
});

// Получить финансовую статистику (Admin only)
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Получаем настройки налога
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
      await settings.save();
    }
    
    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    // Считаем доходы по завершенным заказам
    const incomeStats = await Order.aggregate([
      { $match: { 
        ...query,
        status: { $in: ['delivered', 'shipped', 'processing'] }
      }},
      { $group: {
        _id: null,
        totalIncome: { $sum: '$totalAmount' },
        orderCount: { $sum: 1 }
      }}
    ]);
    
    const totalIncome = incomeStats[0]?.totalIncome || 0;
    const orderCount = incomeStats[0]?.orderCount || 0;
    
    // Считаем расходы
    const expenseQuery = {};
    if (startDate || endDate) {
      expenseQuery.date = {};
      if (startDate) expenseQuery.date.$gte = new Date(startDate);
      if (endDate) expenseQuery.date.$lte = new Date(endDate);
    }
    
    const totalExpensesAgg = await Expense.aggregate([
      { $match: expenseQuery },
      { $group: {
        _id: null,
        total: { $sum: '$amount' }
      }}
    ]);
    
    const totalExpenseAmount = totalExpensesAgg[0]?.total || 0;
    
    // Расчет налога и прибыли
    const taxAmount = (totalIncome * settings.taxRate) / 100;
    const grossProfit = totalIncome - totalExpenseAmount;
    const netProfit = grossProfit - taxAmount;
    
    // Расходы по категориям
    const expensesByCategory = await Expense.aggregate([
      { $match: expenseQuery },
      { $group: {
        _id: '$category',
        total: { $sum: '$amount' }
      }}
    ]);
    
    // Доходы по дням для графика
    const dailyIncome = await Order.aggregate([
      { $match: {
        ...query,
        status: { $in: ['delivered', 'shipped', 'processing'] }
      }},
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: '$totalAmount' }
      }},
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      totalIncome,
      totalExpenses: totalExpenseAmount,
      grossProfit,
      taxAmount,
      netProfit,
      taxRate: settings.taxRate,
      orderCount,
      expensesByCategory,
      dailyIncome
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка при получении финансовой статистики' });
  }
});

export default router;
