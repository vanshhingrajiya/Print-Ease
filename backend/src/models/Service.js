import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
    index: true
  },

  name: {
    type: String,
    required: true
  },

  description: {
    type: String
  },

  price: {
    type: Number,
    required: true,
    min: 0
  },

  unit: {
    type: String,
    enum: ['per_page', 'per_copy', 'per_document'],
    default: 'per_page'
  },

  category: {
    type: String,
    enum: ['printing', 'other'],
    default: 'other'
  },

  isAvailable: {
    type: Boolean,
    default: true
  },

  image: {
    type: String
  }
}, {
  timestamps: true
});

serviceSchema.index({ shop: 1 });

export default mongoose.model('Service', serviceSchema);