import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.Mixed, // Store full product object
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  size: {
    type: String,
    default: '',
  },
  color: {
    type: String,
    default: '',
  },
  boxType: {
    type: String,
    default: '',
  },
  boxPrice: {
    type: Number,
    default: 0,
  },
  price: {
    type: Number,
    required: true,
  },
});

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
  },
  shippingAddress: {
    name: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  paymentMethod: {
    type: String,
    default: 'COD', // Cash on Delivery
  },
  advancePayment: {
    amount: {
      type: Number,
      default: 0,
    },
    razorpayOrderId: {
      type: String,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending',
    },
  },
  razorpayOrderId: {
    type: String,
  },
  paymentId: {
    type: String,
  },
  paymentSignature: {
    type: String,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'processing',
  },
  trackingId: {
    type: String,
    default: '',
    trim: true,
  },
  lastWebhookEventId: {
    type: String,
    default: '',
    trim: true,
  },
  lastWebhookAt: {
    type: Date,
  },
  returnStatus: {
    type: String,
    enum: ['none', 'return_requested', 'return_approved', 'return_rejected', 'pickup_scheduled', 'picked_up', 'returned', 'refunded'],
    default: 'none',
  },
  returnReason: {
    type: String,
    default: '',
    trim: true,
  },
  returnRequestedAt: {
    type: Date,
  },
  returnApprovedAt: {
    type: Date,
  },
  returnCompletedAt: {
    type: Date,
  },
  coupon: {
    code: { type: String, default: '' },
    discount: { type: Number, default: 0 },
  },
  orderDate: {
    type: Date,
    default: Date.now,
  },
  deliveredDate: {
    type: Date,
  },
  cancelReason: {
    type: String,
    default: '',
    trim: true,
  },
  cancelledAt: {
    type: Date,
  },
  cancellationRefund: {
    razorpayRefundId: {
      type: String,
      default: '',
    },
    amountRupees: {
      type: Number,
    },
    at: {
      type: Date,
    },
  },
  returnRefund: {
    razorpayRefundId: {
      type: String,
      default: '',
    },
    amountRupees: {
      type: Number,
    },
    at: {
      type: Date,
    },
  },
  refundStatus: {
    type: String,
    enum: ['none', 'processed', 'failed'],
    default: 'none',
  },
  refundLogs: [{
    refundId: {
      type: String,
      default: '',
    },
    amount: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['success', 'failed'],
    },
    error: {
      type: String,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  parcelGuru: {
    orderReference: {
      type: String,
      default: '',
      trim: true,
    },
    reversePickupReference: {
      type: String,
      default: '',
      trim: true,
    },
    awbNumber: {
      type: String,
      default: '',
      trim: true,
    },
    shipmentStatus: {
      type: String,
      default: '',
      trim: true,
    },
    lastMessage: {
      type: String,
      default: '',
      trim: true,
    },
    lastEventAt: {
      type: Date,
    },
    events: [
      {
        status: { type: String, default: '' },
        datetime: { type: Date },
        message: { type: String, default: '' },
        awb_number: { type: String, default: '' },
      },
    ],
  },
});

orderSchema.pre('save', function parcelGuruRef(next) {
  if (!this.parcelGuru) this.parcelGuru = {};
  const ref = this.parcelGuru.orderReference;
  if (ref === undefined || ref === null || String(ref).trim() === '') {
    this.parcelGuru.orderReference = this._id ? String(this._id) : '';
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);

export default Order;

