import Razorpay from 'razorpay';
import {
  COD_ADVANCE_PAISE,
  ONLINE_CANCEL_SHIPPED_DEDUCTION_PAISE,
} from '../config/paymentConstants.js';

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

/**
 * Razorpay refunds on cancellation. Call before setting order.status to 'cancelled'.
 * @param {import('mongoose').Document} order — mongoose order doc (mutated on success)
 * @param {string} previousStatus — status before cancel (e.g. 'processing', 'shipped')
 * @returns {Promise<{ ok: boolean, error?: string, refundPaise?: number, skipped?: string }>}
 */
export async function applyCancellationRefunds(order, previousStatus) {
  const prev = String(previousStatus || '').toLowerCase();
  const postDispatch = prev === 'shipped' || prev === 'delivered';

  if (order.cancellationRefund?.razorpayRefundId) {
    return { ok: true, skipped: 'already_refunded' };
  }

  const pm = String(order.paymentMethod || '').toLowerCase();
  const rz = getRazorpay();

  // Full online (Razorpay prepay)
  if (pm === 'razorpay') {
    if (order.paymentStatus !== 'paid' || !order.paymentId) {
      return { ok: true, skipped: 'online_not_paid' };
    }

    const totalPaise = Math.round(Number(order.totalAmount) * 100);
    if (!Number.isFinite(totalPaise) || totalPaise < 1) {
      return { ok: false, error: 'Invalid order total for refund' };
    }

    const refundPaise = postDispatch
      ? Math.max(0, totalPaise - ONLINE_CANCEL_SHIPPED_DEDUCTION_PAISE)
      : totalPaise;

    if (refundPaise < 1) {
      return { ok: true, skipped: 'zero_refund_amount' };
    }

    if (!rz) {
      return { ok: false, error: 'Payment gateway is not configured' };
    }

    try {
      const refund = await rz.payments.refund(order.paymentId, {
        amount: refundPaise,
        notes: {
          reason: 'order_cancelled',
          orderId: String(order._id),
          postDispatch: String(postDispatch),
        },
      });
      order.cancellationRefund = {
        razorpayRefundId: refund.id,
        amountRupees: refundPaise / 100,
        at: new Date(),
      };
      order.paymentStatus = 'refunded';
      return { ok: true, refundPaise };
    } catch (e) {
      const msg = e?.error?.description || e?.message || 'Online refund failed';
      return { ok: false, error: msg };
    }
  }

  // COD — refund advance only if not yet shipped/delivered
  if (pm === 'cod') {
    if (postDispatch) {
      return { ok: true, skipped: 'cod_post_dispatch_no_advance_refund' };
    }

    const adv = order.advancePayment;
    if (!adv || !adv.razorpayPaymentId) {
      return { ok: true, skipped: 'no_cod_advance' };
    }
    if (adv.status === 'refunded') {
      return { ok: true, skipped: 'cod_advance_already_refunded' };
    }
    if (adv.status !== 'paid') {
      return { ok: true, skipped: 'no_cod_advance' };
    }

    let advancePaise = Math.round(Number(adv.amount || 0) * 100);
    if (!Number.isFinite(advancePaise) || advancePaise < 1) {
      advancePaise = COD_ADVANCE_PAISE;
    }

    if (!rz) {
      return { ok: false, error: 'Payment gateway is not configured' };
    }

    try {
      const refund = await rz.payments.refund(adv.razorpayPaymentId, {
        amount: advancePaise,
        notes: {
          reason: 'cod_cancelled_pre_dispatch',
          orderId: String(order._id),
        },
      });
      order.advancePayment.status = 'refunded';
      order.cancellationRefund = {
        razorpayRefundId: refund.id,
        amountRupees: advancePaise / 100,
        at: new Date(),
      };
      return { ok: true, refundPaise: advancePaise };
    } catch (e) {
      const msg = e?.error?.description || e?.message || 'COD advance refund failed';
      return { ok: false, error: msg };
    }
  }

  return { ok: true, skipped: 'no_matching_payment_flow' };
}
