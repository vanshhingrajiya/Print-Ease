import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ownerName: {
    type: String,
    required: true
  },
  shopName: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  address: {
    shopNumber: String,
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  // GeoJSON location for map + nearby queries
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number] // [lng, lat]
    }
  },
  contactInfo: {
    phone: String,
    email: String,
    whatsapp: String
  },
  // Direct UPI details for QR/intent payments (optional)
  upi: {
    id: { type: String, default: '' }, // e.g., name@bank
    displayName: { type: String, default: '' }, // shown in UPI apps
    qrImageUrl: { type: String, default: '' } // optional uploaded/static QR image
  },
  workingHours: {
    monday: { open: String, close: String, isOpen: Boolean },
    tuesday: { open: String, close: String, isOpen: Boolean },
    wednesday: { open: String, close: String, isOpen: Boolean },
    thursday: { open: String, close: String, isOpen: Boolean },
    friday: { open: String, close: String, isOpen: Boolean },
    saturday: { open: String, close: String, isOpen: Boolean },
    sunday: { open: String, close: String, isOpen: Boolean }
  },
  images: [String],
  // Dedicated printing services pricing
  printingServices: {
    blackWhite: {
      singleSidedPrice: { type: Number, default: 0 },
      doubleSidedPrice: { type: Number, default: 0 }
    },
    color: {
      singleSidedPrice: { type: Number, default: 0 },
      doubleSidedPrice: { type: Number, default: 0 }
    }
  },
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Geospatial index
shopSchema.index({ location: '2dsphere' });

export default mongoose.model('Shop', shopSchema);