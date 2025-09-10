const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Test route
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
      '/api/notifications'
    ]
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/shops', require('./routes/shops'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/notifications', require('./routes/notifications'));

// Serve static files
app.use('/uploads', express.static('uploads'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/xerox-shop', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
