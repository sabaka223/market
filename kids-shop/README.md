# KidsStyle - Магазин детской одежды

## Структура проекта

```
kids-shop/
├── server/                 # Бэкенд (Node.js + Express)
│   ├── models/            # MongoDB модели
│   │   ├── User.js        # Пользователи
│   │   ├── Product.js     # Товары
│   │   ├── Order.js       # Заказы
│   │   ├── Expense.js     # Расходы
│   │   └── Settings.js    # Настройки (налог)
│   ├── routes/            # API роуты
│   │   ├── auth.js        # Авторизация
│   │   ├── products.js    # Товары
│   │   ├── orders.js      # Заказы
│   │   ├── admin.js       # Админка
│   │   └── finance.js     # Финансы
│   ├── middleware/        # Middleware
│   │   └── auth.js        # JWT авторизация
│   ├── uploads/           # Загруженные фото
│   └── index.js           # Точка входа
├── client/                # Фронтенд
│   ├── public/
│   │   └── index.html     # HTML шаблон
│   └── src/
│       └── app.js         # Логика приложения
├── .env                   # Переменные окружения
└── package.json           # Зависимости
```

## Установка и запуск

### Требования
- Node.js 16+
- MongoDB

### Установка зависимостей
```bash
cd kids-shop
npm install
```

### Настройка
Отредактируйте `.env` файл:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/kids-shop
JWT_SECRET=kids-shop-secret-key-2024
```

### Запуск сервера
```bash
npm run dev
```

Сервер запустится на http://localhost:5000

## Доступ к админке

После первого запуска автоматически создается администратор:
- **Email:** admin@kids.com
- **Пароль:** admin

## API Endpoints

### Авторизация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `GET /api/auth/me` - Данные пользователя

### Товары
- `GET /api/products` - Список товаров (с фильтрами)
- `GET /api/products/:id` - Товар по ID
- `POST /api/products` - Создать товар (admin)
- `PUT /api/products/:id` - Обновить товар (admin)
- `DELETE /api/products/:id` - Удалить товар (admin)
- `GET /api/products/categories/list` - Список категорий

### Заказы
- `POST /api/orders` - Создать заказ
- `GET /api/orders/my` - Мои заказы
- `GET /api/orders` - Все заказы (admin)
- `PATCH /api/orders/:id/status` - Статус заказа (admin)

### Админка
- `GET /api/admin/dashboard` - Статистика дашборда
- `GET /api/admin/users` - Список клиентов

### Финансы
- `GET /api/finance/settings` - Настройки
- `PUT /api/finance/settings` - Обновить настройки (admin)
- `GET /api/finance/expenses` - Расходы (admin)
- `POST /api/finance/expenses` - Добавить расход (admin)
- `GET /api/finance/stats` - Финансовая статистика (admin)

## Функционал

### Для покупателей
- Просмотр каталога с поиском и фильтрами
- Выбор размера товара
- Корзина и оформление заказа
- История заказов
- Регистрация и личный кабинет

### Для администратора
- **Дэшборд:** статистика, графики продаж
- **Товары:** добавление с фото, ценой, размерами, составом
- **Заказы:** управление статусами
- **Клиенты:** база данных покупателей
- **Финансы:** 
  - Доходы от заказов
  - Ручное добавление расходов
  - Настройка % налога
  - Расчет прибыли и налогов
  - Графики доходов/расходов
