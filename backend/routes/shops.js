const express = require('express');
const jwt = require('jsonwebtoken');
const Shop = require('../models/Shop');
const User = require('../models/User');
const config = require('../config/config');
const multer = require('multer');
const path = require('path');
const QRCode = require('qrcode');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get all shops (for customers)
router.get('/', async (req, res) => {
  try {
    const { city } = req.query;
    let query = { isActive: true };
    if (city) query['address.city'] = new RegExp(city, 'i');

    const shops = await Shop.find(query)
      .populate('owner', 'name phone')
      .select('-services');

    res.json(shops);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Nearby shops by coordinates (lng, lat, radius meters)
router.get('/nearby', async (req, res) => {
  try {
    const { lng, lat, radius = 5000 } = req.query; // default 5km
    if (!lng || !lat) {
      return res.status(400).json({ message: 'lng and lat are required' });
    }

    const shops = await Shop.find({
      isActive: true,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius, 10)
        }
      }
    }).select('-services');

    res.json(shops);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get shop details
router.get('/:id', async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id)
      .populate('owner', 'name phone email');

    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    res.json(shop);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Generate UPI QR code for a shop (requires upi.id)
router.get('/:id/upi-qr', async (req, res) => {
  try {
    const { am, tn, pn } = req.query; // amount, note, payee name
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });

    const upiId = shop?.upi?.id;
    const payeeName = pn || shop?.upi?.displayName || shop.shopName;
    if (!upiId) return res.status(400).json({ message: 'UPI ID not set for this shop' });

    // Build UPI intent per NPCI spec
    // upi://pay?pa=<vpa>&pn=<name>&am=<amount>&tn=<note>&cu=INR
    const params = new URLSearchParams({ pa: upiId, pn: payeeName, cu: 'INR' });
    if (am) params.set('am', String(am));
    if (tn) params.set('tn', String(tn));
    const intent = `upi://pay?${params.toString()}`;

    const dataUrl = await QRCode.toDataURL(intent, { margin: 1, width: 300 });
    res.json({ intent, qrDataUrl: dataUrl });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate UPI QR', error: error.message });
  }
});

// Create shop (shop owner only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'shop_owner') {
      return res.status(403).json({ message: 'Access denied (shop owner only)' });
    }

    const { shopName, address, contactInfo } = req.body || {};
    if (!shopName) {
      return res.status(400).json({ message: 'shopName is required' });
    }
    if (!address?.street || !address?.city || !address?.state || !address?.pincode) {
      return res.status(400).json({ message: 'Complete address (street, city, state, pincode) is required' });
    }
    if (!contactInfo?.phone) {
      return res.status(400).json({ message: 'Phone is required' });
    }
 
    
    
    const shopData = {
      ...req.body,
      owner: req.user.userId
    };

    const shop = new Shop(shopData);
    await shop.save();

    return res.status(201).json({
      message: 'Shop created successfully',
      shop
    });
  } catch (error) {
    console.error('Create shop error:', error);
    const validation = error?.errors ? Object.keys(error.errors).map(k => error.errors[k]?.message) : undefined;
    return res.status(500).json({ message: 'Server error creating shop', error: error.message, validation });
    console.log('Create shop error:', error);
  }
});

// Update shop (shop owner only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    if (shop.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedShop = await Shop.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Shop updated successfully',
      shop: updatedShop
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Set printing services (BW/Color, single/double prices)
router.put('/:id/printing-services', authenticateToken, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    if (shop.owner.toString() !== req.user.userId) return res.status(403).json({ message: 'Access denied' });

    shop.printingServices = req.body.printingServices;
    await shop.save();
    res.json({ message: 'Printing services updated', printingServices: shop.printingServices });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Set location (lng, lat, address string)
router.put('/:id/location', authenticateToken, async (req, res) => {
  try {
    const { lng, lat, address } = req.body;
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    if (shop.owner.toString() !== req.user.userId) return res.status(403).json({ message: 'Access denied' });

    if (address) shop.address = { ...(shop.address || {}), street: address };
    if (lng && lat) shop.location = { type: 'Point', coordinates: [lng, lat] };
    await shop.save();
    res.json({ message: 'Location updated', location: shop.location, address: shop.address });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add service to shop
router.post('/:id/services', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    if (shop.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const serviceData = {
      ...req.body,
      price: parseFloat(req.body.price)
    };

    if (req.file) {
      serviceData.image = req.file.path;
    }

    shop.services.push(serviceData);
    await shop.save();

    res.json({
      message: 'Service added successfully',
      service: shop.services[shop.services.length - 1]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update service
router.put('/:id/services/:serviceId', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    if (shop.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const service = shop.services.id(req.params.serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    Object.assign(service, req.body);
    if (req.file) {
      service.image = req.file.path;
    }

    await shop.save();

    res.json({
      message: 'Service updated successfully',
      service
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete service
router.delete('/:id/services/:serviceId', authenticateToken, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    if (shop.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    shop.services.id(req.params.serviceId).remove();
    await shop.save();

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get shop owner's shops
router.get('/owner/my-shops', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'shop_owner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const shops = await Shop.find({ owner: req.user.userId });
    res.json(shops);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
