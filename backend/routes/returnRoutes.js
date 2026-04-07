import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Order from '../models/Order.js';
import Razorpay from 'razorpay';
import { createReversePickup } from '../services/parcelGuru.js';

const router = express.Router();
const RETURN_DAYS = 30; // return allowed within 30 days of delivery/order

// Initialize Razorpay
function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function getReturnWindowEnd(order) {
  const base = order.deliveredDate ? new Date(order.deliveredDate) : new Date(order.orderDate);
  const end = new Date(base);
  end.setDate(end.getDate() + RETURN_DAYS);
  return end;
}

function canReturnOrder(order) {
  if (!order) return false;
  if (order.status !== 'delivered') return false;
  if (order.returnStatus && order.returnStatus !== 'none') return false;
  const windowEnd = getReturnWindowEnd(order);
  return new Date() <= windowEnd;
}

// POST /api/returns/request - User requests return
router.post('/request', protect, async (req, res) => {
  try {
    const { orderId, reason } = req.body;

    if (!orderId || !reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and reason are required',
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your order' });
    }

    if (!canReturnOrder(order)) {
      return res.status(400).json({
        success: false,
        message: 'Return window has expired or order is not eligible for return',
      });
    }

    // Update order with return request
    order.returnStatus = 'return_requested';
    order.returnReason = reason.trim();
    order.returnRequestedAt = new Date();

    await order.save();

    console.log('Return requested:', order._id, 'by user:', req.user._id, 'reason:', reason);

    res.status(200).json({
      success: true,
      message: 'Return request submitted successfully',
      data: {
        orderId: order._id,
        returnStatus: order.returnStatus,
        returnRequestedAt: order.returnRequestedAt
      }
    });
  } catch (error) {
    console.error('Return request error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/returns/my - Get user's returns
router.get('/my', protect, async (req, res) => {
  try {
    const returns = await Order.find({ 
      user: req.user._id, 
      returnStatus: { $ne: 'none' } 
    })
    .sort({ returnRequestedAt: -1 });

    res.status(200).json({
      success: true,
      data: returns
    });
  } catch (error) {
    console.error('Get user returns error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/returns/check/:orderId - Check if order can be returned
router.get('/check/:orderId', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order || order.user.toString() !== req.user._id.toString()) {
      return res.status(200).json({ 
        success: true, 
        data: { 
          canReturn: false,
          reason: 'Order not found or access denied'
        } 
      });
    }

    const canReturn = canReturnOrder(order);
    const returnWindowEnd = getReturnWindowEnd(order);

    res.status(200).json({
      success: true,
      data: {
        canReturn,
        returnStatus: order.returnStatus,
        returnWindowEnd: returnWindowEnd.toISOString(),
        status: order.status,
      },
    });
  } catch (error) {
    console.error('Check return eligibility error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/returns/admin/all - Get all returns for admin
router.get('/admin/all', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    // Build query
    const query = { returnStatus: { $ne: 'none' } };
    if (status) {
      query.returnStatus = status;
    }

    const skip = (page - 1) * limit;

    const returns = await Order.find(query)
      .populate('user', 'name email')
      .sort({ returnRequestedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      data: returns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all returns error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/returns/:id/approve - Admin approves return
router.post('/:id/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.returnStatus !== 'return_requested') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only requested returns can be approved' 
      });
    }

    order.returnStatus = 'return_approved';
    order.returnApprovedAt = new Date();

    await order.save();

    console.log('Return approved:', order._id, 'by admin:', req.user._id);

    // Create reverse pickup using ParcelGuru
    try {
      const pickupResult = await createReversePickup(order);
      
      if (pickupResult.status === 'success') {
        // Update order with reverse pickup reference
        if (!order.parcelGuru) order.parcelGuru = {};
        order.parcelGuru.reversePickupReference = pickupResult.reverseOrderId;
        await order.save();
        
        console.log('Reverse pickup created:', pickupResult.reverseOrderId, 'for order:', order._id);
      } else if (pickupResult.status === 'exists') {
        console.log('Reverse pickup already exists for order:', order._id);
      } else {
        console.error('Reverse pickup creation failed:', pickupResult.message);
      }
    } catch (pickupError) {
      console.error('Error creating reverse pickup:', pickupError?.message || pickupError);
      // Don't fail the return approval if pickup creation fails
    }

    res.status(200).json({
      success: true,
      message: 'Return approved successfully',
      data: {
        orderId: order._id,
        returnStatus: order.returnStatus,
        returnApprovedAt: order.returnApprovedAt,
        reversePickupReference: order.parcelGuru?.reversePickupReference || ''
      }
    });
  } catch (error) {
    console.error('Approve return error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/returns/:id/reject - Admin rejects return
router.post('/:id/reject', protect, authorize('admin'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.returnStatus !== 'return_requested') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only requested returns can be rejected' 
      });
    }

    order.returnStatus = 'return_rejected';

    await order.save();

    console.log('Return rejected:', order._id, 'by admin:', req.user._id);

    res.status(200).json({
      success: true,
      message: 'Return rejected successfully',
      data: {
        orderId: order._id,
        returnStatus: order.returnStatus
      }
    });
  } catch (error) {
    console.error('Reject return error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/returns/:id/pickup - Admin marks pickup
router.post('/:id/pickup', protect, authorize('admin'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.returnStatus !== 'return_approved') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only approved returns can be marked as picked up' 
      });
    }

    order.returnStatus = 'picked_up';

    await order.save();

    console.log('Return picked up:', order._id, 'by admin:', req.user._id);

    res.status(200).json({
      success: true,
      message: 'Return marked as picked up successfully',
      data: {
        orderId: order._id,
        returnStatus: order.returnStatus
      }
    });
  } catch (error) {
    console.error('Mark pickup error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/returns/:id/complete - Admin marks return as completed
router.post('/:id/complete', protect, authorize('admin'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.returnStatus !== 'picked_up') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only picked up returns can be marked as completed' 
      });
    }

    order.returnStatus = 'returned';
    order.returnCompletedAt = new Date();

    await order.save();

    console.log('Return completed:', order._id, 'by admin:', req.user._id);

    res.status(200).json({
      success: true,
      message: 'Return marked as completed successfully',
      data: {
        orderId: order._id,
        returnStatus: order.returnStatus,
        returnCompletedAt: order.returnCompletedAt
      }
    });
  } catch (error) {
    console.error('Complete return error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/returns/:id/refund - Admin processes refund
router.post('/:id/refund', protect, authorize('admin'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.returnStatus !== 'returned') {
      return res.status(400).json({ 
        success: false, 
        message: 'Refund can only be processed for returned orders' 
      });
    }

    // Prevent double refund
    if (order.returnStatus === 'refunded') {
      return res.status(400).json({
        success: false,
        message: 'Order has already been refunded',
      });
    }

    // Retry logic - allow retry only if failed, block if processed
    if (order.refundStatus === 'processed') {
      return res.status(200).json({
        success: true,
        message: 'Refund already processed',
        data: {
          orderId: order._id,
          returnStatus: order.returnStatus,
          refundAmount: order.returnRefund?.amountRupees || 0,
          refundId: order.returnRefund?.razorpayRefundId || '',
          refundedAt: order.returnRefund?.at,
          refundStatus: order.refundStatus
        }
      });
    }

    // Idempotency check - skip if refund already processed
    if (order.returnRefund?.razorpayRefundId) {
      return res.status(200).json({
        success: true,
        message: 'Refund already processed',
        data: {
          orderId: order._id,
          returnStatus: order.returnStatus,
          refundAmount: order.returnRefund.amountRupees,
          refundId: order.returnRefund.razorpayRefundId,
          refundedAt: order.returnRefund.at
        }
      });
    }

    const pm = String(order.paymentMethod || '').toLowerCase();
    const rz = getRazorpay();

    // Process refund based on payment method
    if (pm === 'razorpay') {
      // Safe guards - validate payment before refund
      if (order.paymentStatus !== 'paid' || !order.paymentId) {
        return res.status(400).json({
          success: false,
          message: 'Order payment is not valid for refund',
        });
      }

      // Additional safe guard - ensure order is in returned status
      if (order.returnStatus !== 'returned') {
        return res.status(400).json({
          success: false,
          message: 'Order must be in returned status to process refund',
        });
      }

      const totalPaise = Math.round(Number(order.totalAmount) * 100);
      if (!Number.isFinite(totalPaise) || totalPaise < 1) {
        return res.status(400).json({
          success: false,
          message: 'Invalid order total for refund',
        });
      }

      if (!rz) {
        return res.status(500).json({
          success: false,
          message: 'Payment gateway is not configured',
        });
      }

      try {
        const refund = await rz.payments.refund(order.paymentId, {
          amount: totalPaise,
          notes: {
            reason: 'return_refund',
            orderId: String(order._id),
          },
        });

        console.log('Refund success:', refund.id);

        // Log successful refund attempt
        order.refundLogs.push({
          refundId: refund.id,
          amount: totalPaise / 100,
          status: 'success',
          createdAt: new Date()
        });

        // Update order with real refund details
        order.returnStatus = 'refunded';
        order.refundStatus = 'processed';
        
        // Store refund information in separate returnRefund field
        order.returnRefund = {
          razorpayRefundId: refund.id,
          amountRupees: totalPaise / 100,
          at: new Date(),
        };

        await order.save();

        console.log('Return refund processed:', order._id, 'amount:', totalPaise / 100, 'refundId:', refund.id, 'by admin:', req.user._id);

        res.status(200).json({
          success: true,
          message: 'Refund processed successfully',
          data: {
            orderId: order._id,
            returnStatus: order.returnStatus,
            refundAmount: totalPaise / 100,
            refundId: refund.id,
            refundedAt: order.returnRefund.at,
            refundStatus: order.refundStatus,
            refundLogs: order.refundLogs
          }
        });
      } catch (refundError) {
        const errorMsg = refundError?.error?.description || refundError?.message || 'Refund failed';
        console.error('Razorpay refund error:', refundError);
        
        // Log failed refund attempt
        order.refundLogs.push({
          refundId: '',
          amount: totalPaise / 100,
          status: 'failed',
          error: errorMsg,
          createdAt: new Date()
        });

        // Update refund status to failed - DO NOT change returnStatus
        order.refundStatus = 'failed';
        await order.save();
        
        return res.status(502).json({
          success: false,
          message: `Refund failed: ${errorMsg}`,
          data: {
            orderId: order._id,
            refundStatus: order.refundStatus,
            refundLogs: order.refundLogs
          }
        });
      }
    } else if (pm === 'cod') {
      // COD return - refund advance if exists
      const adv = order.advancePayment;
      if (adv && adv.razorpayPaymentId && adv.status === 'paid') {
        
        if (!rz) {
          return res.status(500).json({
            success: false,
            message: 'Payment gateway is not configured',
          });
        }

        try {
          let advancePaise = Math.round(Number(adv.amount || 0) * 100);
          if (!Number.isFinite(advancePaise) || advancePaise < 1) {
            advancePaise = 20000; // Default to £200
          }

          const refund = await rz.payments.refund(adv.razorpayPaymentId, {
            amount: advancePaise,
            notes: {
              reason: 'cod_return_refund',
              orderId: String(order._id),
            },
          });

          console.log('Refund success:', refund.id);

          // Log successful refund attempt
          order.refundLogs.push({
            refundId: refund.id,
            amount: advancePaise / 100,
            status: 'success',
            createdAt: new Date()
          });

          // Update order with refund details
          order.returnStatus = 'refunded';
          order.refundStatus = 'processed';
          order.advancePayment.status = 'refunded';
          
          // Store refund information in separate returnRefund field
          order.returnRefund = {
            razorpayRefundId: refund.id,
            amountRupees: advancePaise / 100,
            at: new Date(),
          };

          await order.save();

          console.log('COD return refund processed:', order._id, 'amount:', advancePaise / 100, 'refundId:', refund.id, 'by admin:', req.user._id);

          res.status(200).json({
            success: true,
            message: 'Refund processed successfully',
            data: {
              orderId: order._id,
              returnStatus: order.returnStatus,
              refundAmount: advancePaise / 100,
              refundId: refund.id,
              refundedAt: order.returnRefund.at,
              refundStatus: order.refundStatus,
              refundLogs: order.refundLogs
            }
          });
        } catch (refundError) {
          const errorMsg = refundError?.error?.description || refundError?.message || 'Refund failed';
          console.error('COD Razorpay refund error:', refundError);
          
          // Log failed refund attempt
          order.refundLogs.push({
            refundId: '',
            amount: advancePaise / 100,
            status: 'failed',
            error: errorMsg,
            createdAt: new Date()
          });

          // Update refund status to failed - DO NOT change returnStatus
          order.refundStatus = 'failed';
          await order.save();
          
          return res.status(502).json({
            success: false,
            message: `Refund failed: ${errorMsg}`,
            data: {
              orderId: order._id,
              refundStatus: order.refundStatus,
              refundLogs: order.refundLogs
            }
          });
        }
      } else {
        // COD order with no advance - mark as refunded manually
        order.returnStatus = 'refunded';
        order.refundStatus = 'processed';
        
        // Log manual refund attempt
        order.refundLogs.push({
          refundId: '',
          amount: 0,
          status: 'success',
          createdAt: new Date()
        });
        
        // Store refund information in separate returnRefund field
        order.returnRefund = {
          razorpayRefundId: '',
          amountRupees: 0,
          at: new Date(),
        };

        await order.save();

        console.log('COD return marked as refunded (no advance):', order._id, 'by admin:', req.user._id);

        res.status(200).json({
          success: true,
          message: 'Return marked as refunded (no advance payment to refund)',
          data: {
            orderId: order._id,
            returnStatus: order.returnStatus,
            refundAmount: 0,
            refundedAt: order.returnRefund.at,
            refundStatus: order.refundStatus,
            refundLogs: order.refundLogs
          }
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Unsupported payment method for refund',
      });
    }
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
export { canReturnOrder, getReturnWindowEnd, RETURN_DAYS };
