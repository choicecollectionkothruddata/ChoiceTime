import Order from '../models/Order.js';
import asyncHandler from 'express-async-handler';

/**
 * @desc    Request a return for an order
 * @route   POST /api/returns/request
 * @access  Private (User only)
 */
export const requestReturn = asyncHandler(async (req, res) => {
  const { orderId, reason } = req.body;

  if (!orderId || !reason) {
    return res.status(400).json({
      success: false,
      message: 'Order ID and reason are required'
    });
  }

  // Find order and validate ownership
  const order = await Order.findOne({ _id: orderId, user: req.user._id });
  
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  // Validation rules
  if (order.status !== 'delivered') {
    return res.status(400).json({
      success: false,
      message: 'Returns are only allowed for delivered orders'
    });
  }

  if (order.returnStatus !== 'none') {
    return res.status(400).json({
      success: false,
      message: 'Return already requested for this order'
    });
  }

  // Update order with return request
  order.returnStatus = 'return_requested';
  order.returnReason = reason;
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
});

/**
 * @desc    Approve a return request
 * @route   POST /api/returns/:id/approve
 * @access  Private (Admin only)
 */
export const approveReturn = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findById(id);
  
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
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

  res.status(200).json({
    success: true,
    message: 'Return approved successfully',
    data: {
      orderId: order._id,
      returnStatus: order.returnStatus,
      returnApprovedAt: order.returnApprovedAt
    }
  });
});

/**
 * @desc    Reject a return request
 * @route   POST /api/returns/:id/reject
 * @access  Private (Admin only)
 */
export const rejectReturn = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findById(id);
  
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
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
});

/**
 * @desc    Mark return as picked up
 * @route   POST /api/returns/:id/pickup
 * @access  Private (Admin only)
 */
export const markReturnPickup = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findById(id);
  
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
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
});

/**
 * @desc    Mark return as completed
 * @route   POST /api/returns/:id/complete
 * @access  Private (Admin only)
 */
export const completeReturn = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findById(id);
  
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
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
});

/**
 * @desc    Process refund for returned order
 * @route   POST /api/returns/:id/refund
 * @access  Private (Admin only)
 */
export const processRefund = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findById(id);
  
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  if (order.returnStatus !== 'returned') {
    return res.status(400).json({
      success: false,
      message: 'Refund can only be processed for returned orders'
    });
  }

  // Process refund based on payment method
  if (order.paymentMethod === 'ONLINE' || order.paymentMethod === 'RAZORPAY') {
    // TODO: Integrate with Razorpay refund API
    // For now, we'll mark as refunded manually
    console.log('TODO: Process Razorpay refund for order:', order._id);
  }

  // Update order status
  order.returnStatus = 'refunded';
  
  // Store refund information
  if (!order.cancellationRefund) {
    order.cancellationRefund = {};
  }
  order.cancellationRefund.amountRupees = order.totalAmount;
  order.cancellationRefund.at = new Date();
  order.cancellationRefund.type = 'return';

  await order.save();

  console.log('Refund processed:', order._id, 'amount:', order.totalAmount, 'by admin:', req.user._id);

  res.status(200).json({
    success: true,
    message: 'Refund processed successfully',
    data: {
      orderId: order._id,
      returnStatus: order.returnStatus,
      refundAmount: order.totalAmount,
      refundedAt: order.cancellationRefund.at
    }
  });
});

/**
 * @desc    Get all returns (for admin)
 * @route   GET /api/returns
 * @access  Private (Admin only)
 */
export const getAllReturns = asyncHandler(async (req, res) => {
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
});

/**
 * @desc    Get user's returns
 * @route   GET /api/returns/my
 * @access  Private (User only)
 */
export const getUserReturns = asyncHandler(async (req, res) => {
  const returns = await Order.find({ 
    user: req.user._id, 
    returnStatus: { $ne: 'none' } 
  }).sort({ returnRequestedAt: -1 });

  res.status(200).json({
    success: true,
    data: returns
  });
});
