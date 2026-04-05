import mongoose from 'mongoose';
import Order from '../models/Order.js';

const MAX_EVENTS = 50;

/** Normalize ParcelGuru API base URL (no trailing slash). */
export function getParcelGuruBaseUrl() {
  const u = (process.env.PARCELGURU_BASE_URL || '').trim();
  return u.replace(/\/+$/, '');
}

export function getParcelGuruWebhookSecret() {
  return (process.env.PARCELGURU_WEBHOOK_TOKEN || process.env.PARCELGURU_API_KEY || '').trim();
}

/**
 * Map ParcelGuru shipment status → internal order.status (or null = metadata only).
 * Enums: pre_booked, ready_to_ship, pending_pickup, picked_up, in_transit, out_for_delivery,
 * delivered, cancelled, exception, returned, lost
 */
export function mapParcelGuruStatusToOrderStatus(pgStatus) {
  const s = String(pgStatus || '').toLowerCase().trim();
  switch (s) {
    case 'delivered':
      return 'delivered';
    case 'picked_up':
    case 'in_transit':
    case 'out_for_delivery':
    case 'ready_to_ship':
      return 'shipped';
    case 'pending_pickup':
    case 'pre_booked':
      return 'processing';
    case 'cancelled':
    case 'exception':
    case 'returned':
    case 'lost':
      return null;
    default:
      return null;
  }
}

const ORDER_FLOW_RANK = { pending: 1, processing: 2, shipped: 3, delivered: 4 };

export function shouldAdvanceOrderStatus(current, proposed) {
  if (!proposed) return false;
  if (current === 'delivered' || current === 'cancelled') return false;
  const rCur = ORDER_FLOW_RANK[current] || 0;
  const rNew = ORDER_FLOW_RANK[proposed] || 0;
  return rNew > rCur;
}

export async function findOrderByParcelGuruOrderId(orderIdRaw) {
  const order_id = String(orderIdRaw || '').trim();
  if (!order_id) return null;

  if (mongoose.Types.ObjectId.isValid(order_id) && order_id.length === 24) {
    const byId = await Order.findById(order_id);
    if (byId) return byId;
  }

  const byRef = await Order.findOne({ 'parcelGuru.orderReference': order_id });
  if (byRef) return byRef;

  return null;
}

export function appendParcelGuruEvent(order, { status, datetime, message, awb_number }) {
  if (!order.parcelGuru) order.parcelGuru = {};
  const events = order.parcelGuru.events || [];
  const dt = datetime ? new Date(datetime) : new Date();
  events.push({
    status: String(status || ''),
    datetime: Number.isNaN(dt.getTime()) ? new Date() : dt,
    message: String(message || ''),
    awb_number: String(awb_number || ''),
  });
  order.parcelGuru.events = events.length > MAX_EVENTS ? events.slice(-MAX_EVENTS) : events;
}

export async function applyParcelGuruWebhookPayload(body) {
  const { event, order_id, awb_number } = body || {};
  if (!event || typeof event !== 'object') {
    return { ok: false, code: 400, message: 'Invalid payload: missing event' };
  }

  const pgStatus = event.status;
  const order = await findOrderByParcelGuruOrderId(order_id);
  if (!order) {
    return { ok: false, code: 404, message: 'Order not found for order_id' };
  }

  const internalStatus = mapParcelGuruStatusToOrderStatus(pgStatus);
  appendParcelGuruEvent(order, {
    status: pgStatus,
    datetime: event.datetime,
    message: event.message,
    awb_number,
  });

  order.parcelGuru.awbNumber = awb_number ? String(awb_number) : order.parcelGuru.awbNumber || '';
  order.parcelGuru.shipmentStatus = String(pgStatus || '');
  order.parcelGuru.lastMessage = String(event.message || '');
  const led = event.datetime ? new Date(event.datetime) : new Date();
  order.parcelGuru.lastEventAt = Number.isNaN(led.getTime()) ? new Date() : led;

  if (internalStatus && shouldAdvanceOrderStatus(order.status, internalStatus)) {
    order.status = internalStatus;
    if (internalStatus === 'delivered' && !order.deliveredDate) {
      order.deliveredDate = new Date();
    }
  }

  await order.save();
  return { ok: true, code: 200, order };
}

/**
 * Future: authenticated requests to ParcelGuru REST API (booking, rates, etc.)
 */
export async function parcelGuruRequest(path, options = {}) {
  const base = getParcelGuruBaseUrl();
  if (!base) {
    throw new Error('PARCELGURU_BASE_URL is not set');
  }
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = {
    'Content-Type': 'application/json',
    'x-access-token': (process.env.PARCELGURU_API_KEY || '').trim(),
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const err = new Error(typeof data === 'object' && data?.message ? data.message : res.statusText);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}
