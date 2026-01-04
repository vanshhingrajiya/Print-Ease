import express from 'express';
import cors from 'cors';
import path from 'path';
import apiLogger from './middlewares/logger.middleware.js';
import authRoutes from './routes/auth.routes.js';
import shopsRoutes from './routes/shops.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import paymentsRoutes from './routes/payments.js';
import notificationsRoutes from './routes/notifications.js';

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN.split(',');
// Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());
app.use(express.static('public'));
app.use(apiLogger);

// Test routes
app.get('/', (req, res) => {
  res.json({ message: 'Xerox Shop API is running!' });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'Xerox Shop API',
    version: '1.0.0',
    endpoints: [
      '/api/auth',
      '/api/shops',
      '/api/orders',
      '/api/payments',
      '/api/notifications',
    ],
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/shops', shopsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Serve static files
app.use('/uploads', express.static('uploads'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
  });
});

export default app;