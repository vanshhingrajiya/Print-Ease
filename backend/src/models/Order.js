import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  orderNumber: {
    type: String,
    unique: true,
    required: false
  },
  items: [{
    code: {
      type: String,
      required: false
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      required: false
    },
    serviceName: String,
    unit: {
      type: String,
      required: false
    },
    quantity: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    totalPrice: {
      type: Number,
      required: true
    }
  }],
  files: [{
    originalName: String,
    fileName: String,
    filePath: String,
    fileUrl: String,
    fileSize: Number,
    mimeType: String,
    pageCount: Number
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentId: String,
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    phone: String
  },
  notes: String,
  estimatedTime: Date,
  completedAt: Date
}, {
  timestamps: true
});

// Generate order number before validation (sync generator to avoid validation errors)
orderSchema.pre('validate', function(next) {
  if (!this.orderNumber) {
    const suffix = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    this.orderNumber = `ORD${Date.now()}${suffix}`;
  }
  next();
});

export default mongoose.model('Order', orderSchema);
