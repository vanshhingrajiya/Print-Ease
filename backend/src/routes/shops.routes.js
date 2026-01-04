import express from 'express';
import { auth, shopOwnerAuth } from '../middlewares/auth.middleware.js';
import withShopUpload from '../middlewares/upload.shop.middleware.js';
import * as controller from '../controllers/shop.controller.js';

const router = express.Router();

// Public
router.get('/', controller.getAllShops);
router.get('/nearby', controller.getNearbyShops);
router.get('/:id', controller.getShopById);
router.get('/:id/upi-qr', controller.generateUpiQr);

// Shop owner
router.post('/', auth, shopOwnerAuth, controller.createShop);
router.put('/:id', auth, shopOwnerAuth, controller.updateShop);
router.get('/owner/my-shops', auth, shopOwnerAuth, controller.getOwnerShops);

// Services
router.get('/:id/services', controller.getServicesByShop);
router.post('/:id/services', auth, shopOwnerAuth, withShopUpload, controller.addService);
router.put('/:id/services/:serviceId', auth, shopOwnerAuth, withShopUpload, controller.updateService);
router.delete('/:id/services/:serviceId', auth, shopOwnerAuth, controller.deleteService);

// Printing & location
router.put('/:id/printing-services', auth, shopOwnerAuth, controller.updatePrintingServices);
router.put('/:id/location', auth, shopOwnerAuth, controller.updateLocation);

export default router;
