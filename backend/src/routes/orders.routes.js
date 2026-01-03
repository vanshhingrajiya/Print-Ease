import express from 'express';
import { auth, shopOwnerAuth } from '../middlewares/auth.middleware.js';
import withUpload from '../middlewares/upload.middleware.js';
import * as controller from '../controllers/orders.controller.js';

const router = express.Router();

// Inspect uploaded files (customer)
router.post('/inspect', auth, withUpload, controller.inspectFiles);

// Create order (customer)
router.post('/', auth, withUpload, controller.createOrder);

// Customer orders
router.get('/customer/my-orders', auth, controller.getCustomerOrders);

// Shop owner orders
router.get('/shop/my-orders', auth, shopOwnerAuth, controller.getShopOrders);

// Update order status (shop owner)
router.put('/:id/status', auth, shopOwnerAuth, controller.updateOrderStatus);

// Print order (shop owner)
router.post('/:id/print', auth, shopOwnerAuth, controller.printOrder);

// Order details (customer or owner)
router.get('/:id', auth, controller.getOrderById);

export default router;
