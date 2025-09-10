const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');
const crypto = require('crypto');

const router = express.Router();

// Helper to generate 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Request OTP (creates user if not exists)
router.post('/request-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: 'Phone is required' });
    }

    let user = await User.findOne({ phone });
    if (!user) {
      // Create lightweight customer with phone only; can complete profile later
      user = new User({
        name: 'Customer',
        email: `${phone}@placeholder.local`,
        password: crypto.randomBytes(12).toString('hex'),
        phone,
        role: 'customer',
      });
    }

    const code = generateOtp();
    user.otpCode = code;
    user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await user.save();

    // In production, send via SMS provider (Twilio, etc.)
    // For development, return code so tester can proceed
    console.log(`OTP for ${phone}: ${code}`);

    return res.json({ message: 'OTP sent', devOtp: process.env.NODE_ENV !== 'production' ? code : undefined });
  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ message: 'Phone and code are required' });
    }

    const user = await User.findOne({ phone });
    if (!user || !user.otpCode || !user.otpExpiresAt) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    if (new Date() > user.otpExpiresAt || user.otpCode !== code) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    user.phoneVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    console.log('Registration attempt for:', email);

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      phone,
      role: role || 'customer'
    });

    await user.save();
    console.log('User registered successfully:', email);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt for:', email);

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Password mismatch for:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Login successful for:', email);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;
