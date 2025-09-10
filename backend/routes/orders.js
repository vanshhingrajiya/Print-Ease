const express = require('express');
const jwt = require('jsonwebtoken');
const Order = require('../models/Order');
const Shop = require('../models/Shop');
const User = require('../models/User');
const Notification = require('../models/Notification');
const config = require('../config/config');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { print } = require('pdf-to-printer');
const pdfParse = require('pdf-parse');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure uploads path is relative to backend working directory
    const uploadDir = path.join(process.cwd(), 'uploads', 'orders');
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    } catch (e) {
      cb(e);
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    const isPdf = mime === 'application/pdf';
    const isImage = mime.startsWith('image/');
    const isDoc = mime === 'application/msword' || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (isPdf || isImage || isDoc) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, Word, or image files are allowed'));
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

// Multer-safe wrapper to return JSON on upload errors
const withUpload = (req, res, next) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err) {
      const msg = err.message || 'Upload error';
      return res.status(400).json({ message: msg });
    }
    next();
  });
};

// Inspect uploaded files: return totalPdfPages and per-file pageCount
router.post('/inspect', authenticateToken, withUpload, async (req, res) => {
  try {
    const details = [];
    for (const file of (req.files || [])) {
      let pageCount;
      const mime = (file.mimetype || '').toLowerCase();
      if (mime === 'application/pdf') {
        try {
          const data = await pdfParse(fs.readFileSync(file.path));
          pageCount = data.numpages;
        } catch {}
      }
      details.push({
        originalName: file.originalname,
        mimeType: file.mimetype,
        pageCount: pageCount || null
      });
    }
    const totalPdfPages = details.reduce((sum, f) => sum + (Number(f.pageCount) || 0), 0);
    res.json({ totalPdfPages, files: details });
  } catch (error) {
    res.status(500).json({ message: 'Inspect failed', error: error.message });
  }
});

// Create order
router.post('/', authenticateToken, withUpload, async (req, res) => {
  try {
    const { shopId, items, deliveryAddress, notes } = req.body;
    console.log('[orders] incoming order', {
      user: req.user?.userId,
      shopId,
      bodyKeys: Object.keys(req.body || {}),
      filesCount: (req.files || []).length
    });
    
    // Get shop details
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    // Calculate total amount
    let totalAmount = 0;
    const orderItems = [];

    let parsedItems = [];
    try {
      parsedItems = Array.isArray(items) ? items : JSON.parse(items || '[]');
    } catch (e) {
      return res.status(400).json({ message: 'Invalid items payload' });
    }

    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      return res.status(400).json({ message: 'No items selected' });
    }

    const getPriceFromCode = (code) => {
      const ps = shop.printingServices || {};
      switch (code) {
        case 'bw_single': return Number(ps?.blackWhite?.singleSidedPrice) || 0;
        case 'bw_double': return Number(ps?.blackWhite?.doubleSidedPrice) || 0;
        case 'color_single': return Number(ps?.color?.singleSidedPrice) || 0;
        case 'color_double': return Number(ps?.color?.doubleSidedPrice) || 0;
        case 'a4': return Number(ps?.a4Size) || 0;
        case 'a3': return Number(ps?.a3Size) || 0;
        case 'photo': return Number(ps?.photoPaper) || 0;
        case 'lamination': return Number(ps?.lamination) || 0;
        case 'binding': return Number(ps?.binding) || 0;
        case 'scanning': return Number(ps?.scanning) || 0;
        case 'pen': return Number(ps?.pen) || 0;
        case 'notebook': return Number(ps?.notebook) || 0;
        case 'file': return Number(ps?.file) || 0;
        case 'stapler': return Number(ps?.stapler) || 0;
        default: return 0;
      }
    };

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Please upload at least one PDF file' });
    }

    // Prepare file data, detect page counts for PDFs
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const files = [];
    for (const file of (req.files || [])) {
      let pageCount;
      const mime = (file.mimetype || '').toLowerCase();
      if (mime === 'application/pdf') {
        try {
          const data = await pdfParse(fs.readFileSync(file.path));
          pageCount = data.numpages;
        } catch {}
      }
      files.push({
        originalName: file.originalname,
        fileName: file.filename,
        filePath: file.path,
        fileUrl: `${baseUrl}/uploads/orders/${file.filename}`,
        fileSize: file.size,
        mimeType: file.mimetype,
        pageCount
      });
    }

    // Sum pages across all uploaded PDFs
    const totalPdfPages = files.reduce((sum, f) => {
      const isPdf = (f.mimeType || '').toLowerCase() === 'application/pdf';
      if (!isPdf) return sum;
      const pages = Number(f.pageCount) || 1;
      return sum + pages;
    }, 0) || 1;

    for (const item of parsedItems) {
      // Backward compatible: old payload with serviceId
      if (item.serviceId) {
        const service = shop.services?.id ? shop.services.id(item.serviceId) : null;
        if (!service) {
          return res.status(400).json({ message: 'Service not found' });
        }
        const qty = Number(item.quantity) || 1;
        const price = Number(service.price) || 0;
        const unit = item.unit || 'per page';
        const multiplier = unit === 'per page' ? totalPdfPages : 1;
        const itemTotal = price * qty * multiplier;
        totalAmount += itemTotal;
        orderItems.push({
          service: service._id,
          serviceName: service.name,
          unit,
          quantity: qty,
          price,
          totalPrice: itemTotal
        });
        continue;
      }

      // New payload with code/name/unit/price (no DB service id)
      const qty = Number(item.quantity) || 1;
      // Prefer server-side price lookup for integrity; fallback to client price
      const lookedUp = getPriceFromCode(item.code);
      const price = lookedUp > 0 ? lookedUp : (Number(item.price) || 0);
      const name = item.name || item.code || 'Service';
      const unit = item.unit || 'per page';

      if (!(price > 0)) {
        return res.status(400).json({ message: `Invalid price for item ${name}` });
      }

      const multiplier = unit === 'per page' ? totalPdfPages : 1;
      const itemTotal = price * qty * multiplier;
      totalAmount += itemTotal;
      // For schema compatibility, leave service undefined and store name/prices
      orderItems.push({
        code: item.code,
        serviceName: name,
        unit,
        quantity: qty,
        price,
        totalPrice: itemTotal
      });
    }

    if (!(totalAmount > 0)) {
      return res.status(400).json({ message: 'Invalid total amount' });
    }

    // Create order
    const order = new Order({
      customer: req.user.userId,
      shop: shopId,
      items: orderItems,
      files,
      totalAmount,
      deliveryAddress: JSON.parse(deliveryAddress || '{}'),
      notes
    });

    await order.save();

    // Create notification for shop owner
    const notification = new Notification({
      user: shop.owner,
      order: order._id,
      title: 'New Order Received',
      message: `You have received a new order #${order.orderNumber}`,
      type: 'order_update',
      data: { orderId: order._id, orderNumber: order.orderNumber }
    });

    await notification.save();

    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('[orders] create error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get customer orders
router.get('/customer/my-orders', authenticateToken, async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.userId })
      .populate('shop', 'shopName address contactInfo')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get shop orders (for shop owner)
router.get('/shop/my-orders', authenticateToken, async (req, res) => {
  try {
    // Get shop owner's shops
    const shops = await Shop.find({ owner: req.user.userId });
    const shopIds = shops.map(shop => shop._id);

    const orders = await Order.find({ shop: { $in: shopIds } })
      .populate('customer', 'name phone email')
      .populate('shop', 'shopName')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update order status (shop owner only)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id).populate('shop');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is shop owner
    if (order.shop.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    order.status = status;
    
    if (status === 'completed') {
      order.completedAt = new Date();
    }

    await order.save();

    // Create notification for customer
    const notification = new Notification({
      user: order.customer,
      order: order._id,
      title: 'Order Status Updated',
      message: `Your order #${order.orderNumber} status has been updated to ${status}`,
      type: 'order_update',
      data: { orderId: order._id, status, orderNumber: order.orderNumber }
    });

    await notification.save();

    res.json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Print order (shop owner only)
router.post('/:id/print', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('shop');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Ensure owner
    if (order.shop.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Pick first PDF file
    const pdfFile = (order.files || []).find(f => (f.mimeType || '').toLowerCase() === 'application/pdf');
    if (!pdfFile || !pdfFile.filePath) {
      return res.status(400).json({ message: 'No printable PDF file found in this order' });
    }

    // Derive options from selected items
    const hasColor = order.items?.some(it => (it.code || '').includes('color'));
    const isDuplex = order.items?.some(it => (it.code || '').includes('double'));

    const printOptions = {
      printer: undefined, // default system printer
      copies: 1,
      colorType: hasColor ? 'color' : 'monochrome',
      duplex: isDuplex ? 'longEdge' : 'simplex',
    };

    await print(pdfFile.filePath, printOptions);

    res.json({ message: 'Print job sent', options: printOptions });
  } catch (error) {
    console.error('[orders] print error:', error);
    res.status(500).json({ message: 'Print failed', error: error.message });
  }
});

// Get order details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name phone email')
      .populate('shop', 'shopName address contactInfo');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user has access to this order
    if (order.customer._id.toString() !== req.user.userId && 
        order.shop.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
