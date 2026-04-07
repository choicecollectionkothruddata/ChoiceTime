import Order from '../models/Order.js';
import mongoose from 'mongoose';

/**
 * Production-ready ParcelGuru webhook handler.
 * Secure, idempotent, and robust against real-world payload variations.
 */
export const handleParcelGuruWebhook = async (req, res) => {
  try {
    // 1. SECURITY CHECK - Reject unauthorized requests
    const apiKey = process.env.PARCELGURU_API_KEY;
    if (!apiKey) {
      console.error('🚨 ParcelGuru webhook: PARCELGURU_API_KEY is not set');
      return res.status(503).json({ error: 'Webhook not configured' });
    }

    const webhookKey = req.headers['x-parcelguru-key'] || req.headers['x-access-token'];
    if (webhookKey !== apiKey) {
      console.error('🚨 ParcelGuru webhook: Unauthorized request with key:', webhookKey);
      return res.status(401).json({ error: 'Unauthorized webhook' });
    }

    // 2. EVENT EXTRACTION - Extract event type safely
    const eventType = 
      req.headers['x-parcelguru-topic'] || 
      req.body.event?.type ||
      req.body.event?.status ||
      req.body.status ||
      '';
    
    // Generate unique eventId for idempotency
    const eventId = req.body.event_id || `${eventType}_${req.body.order_id}_${req.body.event?.datetime || Date.now()}`;
    
    console.log('📦 Webhook received:', eventType);
    console.log('📦 Payload:', JSON.stringify(req.body));

    // 3. ORDER LOOKUP - Handle multiple ID formats
    const ref = String(req.body.order_id || req.body.orderId || '').replace('#', '');
    if (!ref) {
      console.error('🚨 Missing order_id in webhook payload');
      return res.status(400).json({ error: 'Missing order_id' });
    }

    let order;
    if (mongoose.Types.ObjectId.isValid(ref)) {
      order = await Order.findById(ref);
    }
    
    if (!order) {
      order = await Order.findOne({ 'parcelGuru.orderReference': ref });
    }

    if (!order) {
      console.error('🚨 Order not found for order_id:', ref);
      return res.status(404).json({ error: 'Order not found' });
    }

    // 4. IDEMPOTENCY - Avoid duplicate updates using eventId
    if (order.lastWebhookEventId === eventId) {
      console.log('⚠️ Duplicate webhook event ignored:', eventId);
      return res.status(200).json({ message: 'Already processed' });
    }

    // 5. STATUS MAPPING - Map ParcelGuru → internal status
    const statusMap = {
      order_processed: 'processing',
      shipped: 'shipped',
      out_for_delivery: 'out_for_delivery',
      delivered: 'delivered',
      cancelled: 'cancelled'
    };

    const newStatus = statusMap[eventType] || statusMap[req.body.event?.status] || order.status;

    // 6. PREVENT STATUS DOWNGRADE - Only advance if progressing, but cancelled always overrides
    const ORDER_FLOW_RANK = {
      pending: 1,
      processing: 2,
      shipped: 3,
      out_for_delivery: 4,
      delivered: 5,
      cancelled: 0
    };

    let statusChanged = false;
    
    // Cancelled always overrides current status
    if (newStatus === 'cancelled') {
      order.status = 'cancelled';
      statusChanged = true;
    } else if (newStatus && ORDER_FLOW_RANK[newStatus] > ORDER_FLOW_RANK[order.status]) {
      order.status = newStatus;
      statusChanged = true;
      
      // Set delivered date when order is delivered
      if (newStatus === 'delivered' && !order.deliveredDate) {
        order.deliveredDate = new Date();
      }
    }

    // 7. FIX TRACKING ID EXTRACTION - Support multiple payload formats
    const trackingId = 
      req.body.tracking_number ||
      req.body.awb_number ||
      req.body.shipment_id ||
      req.body.awbNumber ||
      order.trackingId;

    if (trackingId && trackingId !== order.trackingId) {
      order.trackingId = String(trackingId);
    }

    // 8. UPDATE PARCELGURU FIELDS
    if (!order.parcelGuru) order.parcelGuru = {};
    
    order.parcelGuru.awbNumber = String(req.body.awb_number || req.body.awbNumber || order.parcelGuru.awbNumber || '');
    order.parcelGuru.shipmentStatus = String(req.body.event?.status || req.body.status || order.parcelGuru.shipmentStatus || '');
    order.parcelGuru.lastMessage = String(req.body.event?.message || req.body.message || order.parcelGuru.lastMessage || '');
    order.parcelGuru.lastEventAt = new Date(req.body.event?.datetime || req.body.datetime || new Date());

    // 9. IDEMPOTENCY TRACKING
    order.lastWebhookEventId = eventId;
    order.lastWebhookAt = new Date();

    // 10. SAVE + LOG
    await order.save();
    
    console.log('✅ Order updated:', order._id, 'status:', order.status, 'event:', eventType, 'eventId:', eventId);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Event processed',
      orderId: order._id,
      status: order.status,
      trackingId: order.trackingId
    });

  } catch (err) {
    console.error('🚨 ParcelGuru webhook error:', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
};
