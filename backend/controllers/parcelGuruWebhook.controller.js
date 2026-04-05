import { applyParcelGuruWebhookPayload, getParcelGuruWebhookSecret } from '../services/parcelGuru.js';

/**
 * ParcelGuru real-time shipment webhook.
 * POST — header x-access-token must match PARCELGURU_WEBHOOK_TOKEN or PARCELGURU_API_KEY.
 * Body: { event: { status, datetime, message }, order_id, awb_number }
 */
export const handleParcelGuruWebhook = async (req, res) => {
  try {
    const secret = getParcelGuruWebhookSecret();
    if (!secret) {
      console.error('ParcelGuru webhook: PARCELGURU_API_KEY (or PARCELGURU_WEBHOOK_TOKEN) is not set');
      return res.status(503).json({ success: false, message: 'Webhook not configured' });
    }

    const token = (req.get('x-access-token') || req.get('X-Access-Token') || '').trim();
    if (token !== secret) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await applyParcelGuruWebhookPayload(req.body);
    if (!result.ok) {
      return res.status(result.code).json({ success: false, message: result.message });
    }

    return res.status(200).json({ success: true, message: 'Event recorded' });
  } catch (err) {
    console.error('ParcelGuru webhook error:', err);
    return res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};
