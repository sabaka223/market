import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import Product from '../models/Product.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Настройка хранилища для загружаемых файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'server/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Разрешены только изображения (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Получить все товары (с фильтрацией и поиском)
router.get('/', async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, sort } = req.query;
    
    let query = { isActive: true };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    
    let sortOption = {};
    if (sort === 'price-asc') sortOption = { price: 1 };
    else if (sort === 'price-desc') sortOption = { price: -1 };
    else if (sort === 'newest') sortOption = { createdAt: -1 };
    else sortOption = { createdAt: -1 };
    
    const products = await Product.find(query).sort(sortOption);
    
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка при получении товаров' });
  }
});

// Получить товар по ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Товар не найден' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении товара' });
  }
});

// Создать товар (Admin only)
router.post('/', authMiddleware, adminMiddleware, upload.array('images', 5), async (req, res) => {
  try {
    const { name, description, price, category, sizes, composition, stock } = req.body;
    
    const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
    
    const sizesArray = typeof sizes === 'string' ? sizes.split(',').map(s => s.trim()) : sizes;
    
    const product = new Product({
      name,
      description,
      price: Number(price),
      category,
      sizes: sizesArray,
      composition,
      images,
      stock: Number(stock) || 0
    });
    
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка при создании товара' });
  }
});

// Обновить товар (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, upload.array('images', 5), async (req, res) => {
  try {
    const { name, description, price, category, sizes, composition, stock, isActive, existingImages } = req.body;
    
    const newImages = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
    const allImages = existingImages ? JSON.parse(existingImages) : [];
    const images = [...allImages, ...newImages];
    
    const sizesArray = typeof sizes === 'string' ? sizes.split(',').map(s => s.trim()) : sizes;
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        price: Number(price),
        category,
        sizes: sizesArray,
        composition,
        images,
        stock: Number(stock) || 0,
        isActive: isActive === 'true' || isActive === true
      },
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({ message: 'Товар не найден' });
    }
    
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка при обновлении товара' });
  }
});

// Удалить товар (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Товар не найден' });
    }
    res.json({ message: 'Товар удален' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при удалении товара' });
  }
});

// Получить категории
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Product.distinct('category', { isActive: true });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении категорий' });
  }
});

export default router;
