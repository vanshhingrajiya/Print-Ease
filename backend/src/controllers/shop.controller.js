import Shop from '../models/Shop.js';
import QRCode from 'qrcode';
import Service from '../models/Service.js';

/* ===== Get all shops ===== */
export const getAllShops = async (req, res) => {
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
};

/* ===== Nearby shops ===== */
export const getNearbyShops = async (req, res) => {
  try {
    const { lng, lat, radius = 5000 } = req.query;
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
};

/* ===== Shop details ===== */
export const getShopById = async (req, res) => {
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
};

/* ===== Generate UPI QR ===== */
export const generateUpiQr = async (req, res) => {
  try {
    const { am, tn, pn } = req.query;
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });

    const upiId = shop?.upi?.id;
    const payeeName = pn || shop?.upi?.displayName || shop.shopName;
    if (!upiId) return res.status(400).json({ message: 'UPI ID not set for this shop' });

    const params = new URLSearchParams({ pa: upiId, pn: payeeName, cu: 'INR' });
    if (am) params.set('am', String(am));
    if (tn) params.set('tn', String(tn));

    const intent = `upi://pay?${params.toString()}`;
    const dataUrl = await QRCode.toDataURL(intent, { margin: 1, width: 300 });

    res.json({ intent, qrDataUrl: dataUrl });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate UPI QR', error: error.message });
  }
};

/* ===== Create shop ===== */
export const createShop = async (req, res) => {
  try {
    if (req.user.role !== 'shop_owner') {
      return res.status(403).json({ message: 'Access denied (shop owner only)' });
    }

    const shopData = {
      ...req.body,
      owner: req.user._id
    };

    const shop = new Shop(shopData);
    await shop.save();

    res.status(201).json({ message: 'Shop created successfully', shop });
  } catch (error) {
    const validation = error?.errors
      ? Object.keys(error.errors).map(k => error.errors[k]?.message)
      : undefined;

    res.status(500).json({
      message: 'Server error creating shop',
      error: error.message,
      validation
    });
  }
};

/* ===== Update shop ===== */
export const updateShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    if (shop.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedShop = await Shop.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({ message: 'Shop updated successfully', shop: updatedShop });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ===== Owner shops ===== */
export const getOwnerShops = async (req, res) => {
  try {
    if (req.user.role !== 'shop_owner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const shops = await Shop.find({ owner: req.user._id });
    res.json(shops);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ===== Add service ===== */
export const addService = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    if (shop.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const newService = new Service({
      ...req.body,
      shop: shop._id,
      image: req.file ? req.file.path : undefined
    });

    await newService.save();

    res.status(201).json({
      message: 'Service added successfully',
      service: newService
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

/* ===== Update service ===== */
export const updateService = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    if (shop.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const service = await Service.findOne({
      _id: req.params.serviceId,
      shop: shop._id
    });

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    Object.assign(service, req.body);

    if (req.file) {
      service.image = req.file.path;
    }

    await service.save();

    res.json({
      message: 'Service updated successfully',
      service
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

/* ===== Delete service ===== */
export const deleteService = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    if (shop.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const service = await Service.findOneAndDelete({
      _id: req.params.serviceId,
      shop: shop._id
    });

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

/* ===== Update printing services ===== */
export const updatePrintingServices = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    if (shop.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    shop.printingServices = req.body;
    await shop.save();

    res.json({ message: 'Printing services updated successfully', shop });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ===== Update location ===== */
export const updateLocation = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    if (shop.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    shop.address = req.body.address;
    shop.location = req.body.location;
    await shop.save();

    res.json({ message: 'Location updated successfully', shop });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ===== Get services by shop ===== */
export const getServicesByShop = async (req, res) => {
  try {
    const services = await Service.find({ shop: req.params.id });
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};