import Order from '../models/Order.js';
import Shop from '../models/Shop.js';
import Notification from '../models/Notification.js';
import fs from 'fs';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import pkg from 'pdf-to-printer';
const { print } = pkg;

export const inspectFiles = async (req, res) => {
  try {
    const details = [];

    for (const file of req.files || []) {
      let pageCount;
      if ((file.mimetype || '').toLowerCase() === 'application/pdf') {
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

    const totalPdfPages = details.reduce(
      (sum, f) => sum + (Number(f.pageCount) || 0),
      0
    );

    res.json({ totalPdfPages, files: details });
  } catch (error) {
    res.status(500).json({ message: 'Inspect failed', error: error.message });
  }
};

export const createOrder = async (req, res) => {
  try {
    const { shopId, files: fileMetadata, deliveryDate, instructions } = req.body;

    const shop = await Shop.findById(shopId);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });

    const order = new Order({
      customer: req.user._id,
      shop: shopId,
      files: req.files ? req.files.map(f => ({ path: f.path, name: f.originalname })) : [],
      fileMetadata: fileMetadata,
      deliveryDate,
      instructions,
      status: 'pending'
    });

    await order.save();

    // Create notification for shop owner
    await Notification.create({
      shop: shopId,
      type: 'new_order',
      message: `New order received`,
      orderId: order._id
    });

    res.status(201).json({ message: 'Order created successfully', order });
  } catch (error) {
    res.status(500).json({ message: 'Order creation failed', error: error.message });
  }
};

export const getCustomerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('shop', 'shopName address')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
  }
};

export const getShopOrders = async (req, res) => {
  try {
    const shops = await Shop.find({ owner: req.user._id });
    const shopIds = shops.map(s => s._id);

    const orders = await Order.find({ shop: { $in: shopIds } })
      .populate('customer', 'name phone email')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: 'Order not found' });

    const shop = await Shop.findById(order.shop);
    if (shop.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    order.status = status;
    await order.save();

    // Create notification for customer
    await Notification.create({
      user: order.customer,
      type: 'order_status_update',
      message: `Order status updated to ${status}`,
      orderId: order._id
    });

    res.json({ message: 'Order status updated', order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update order', error: error.message });
  }
};

export const printOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const shop = await Shop.findById(order.shop);
    if (shop.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Print files
    for (const file of order.files) {
      try {
        await print(file.path);
      } catch (err) {
        console.error(`Error printing ${file.name}:`, err);
      }
    }

    order.status = 'printing';
    order.printedAt = new Date();
    await order.save();

    res.json({ message: 'Order sent to print' });
  } catch (error) {
    res.status(500).json({ message: 'Print failed', error: error.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name phone email')
      .populate('shop', 'shopName address owner');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Check if user is customer or shop owner
    const isCustomer = order.customer._id.toString() === req.user._id.toString();
    const isOwner = order.shop.owner.toString() === req.user._id.toString();

    if (!isCustomer && !isOwner) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch order', error: error.message });
  }
};
