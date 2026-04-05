import { buildParcelGuruOrderPayload, pushOrder } from '../services/parcelGuru.js';

/**
 * Push a COD order to ParcelGuru after DB creation. Swallows errors so order flow never fails.
 */
export async function pushCodOrderToParcelGuru(order, customerEmail) {
  try {
    const parcelGuruPayload = buildParcelGuruOrderPayload(order, {
      customerEmail: customerEmail || '',
    });

    // COD-specific fields
    parcelGuruPayload.payment_mode = "COD";
    parcelGuruPayload.collectable_amount = order.totalAmount || order.totalPrice || 0;

    console.log("🚀 COD ParcelGuru Payload:", JSON.stringify(parcelGuruPayload, null, 2));

    const pgResult = await pushOrder(parcelGuruPayload);

    console.log("✅ COD ParcelGuru push result:", JSON.stringify(pgResult, null, 2));
  } catch (error) {
    console.error("❌ COD ParcelGuru push failed:", error?.message || error);
  }
}
