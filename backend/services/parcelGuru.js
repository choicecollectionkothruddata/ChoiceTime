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

function splitPersonName(full) {
  const s = String(full || '').trim();
  if (!s) return { first: '', last: '' };
  const i = s.indexOf(' ');
  if (i === -1) return { first: s, last: '' };
  return { first: s.slice(0, i).trim(), last: s.slice(i + 1).trim() };
}

/**
 * Build Channel API body for POST /api/v1/channel/orders/create.
 * order_id must match ParcelGuru webhook order_id (we use parcelGuru.orderReference → Mongo _id).
 */
export function buildParcelGuruOrderPayload(order, { customerEmail = '' } = {}) {
  const addr = order.shippingAddress || {};
  const { first: shipFirst, last: shipLast } = splitPersonName(addr.name);
  const ref = (order.parcelGuru && order.parcelGuru.orderReference) || String(order._id);

  const line_items = (order.items || []).map((item, idx) => {
    const p = item.product && typeof item.product === 'object' ? item.product : {};
    const title = p.name || p.title || 'Product';
    const sku = p.sku || p.model || `SKU${idx + 1}`;
    const pid = p._id != null ? String(p._id) : String(idx + 1);
    return {
      id: pid,
      sku: String(sku).slice(0, 64),
      title: String(title).slice(0, 500),
      quantity: item.quantity,
      price: String(item.price ?? p.price ?? 0),
      weight: '500',
    };
  });

  const { first: custFirst, last: custLast } = splitPersonName(addr.name);

  return {
    order_id: ref,
    order_date: new Date().toISOString(),
    order_status: 'paid',
    package_type: 'prepaid',
    package_declared_value: String(order.totalAmount ?? 0),
    package_collectable_amount: '0',
    package_weight: '0.5',
    package_length: '15',
    package_breadth: '10',
    package_height: '10',
    line_items,
    shipping_address: {
      first_name: shipFirst,
      last_name: shipLast,
      address1: String(addr.address || ''),
      city: String(addr.city || ''),
      state: String(addr.state || ''),
      country: String(addr.country || 'India'),
      pincode: String(addr.zipCode || ''),
    },
    customer: {
      first_name: custFirst,
      last_name: custLast,
      phone: String(addr.phone || ''),
      email: String(customerEmail || ''),
    },
  };
}

/**
 * ParcelGuru Channel plugin: create order (after payment).
 * Reads env at call time so PM2/dotenv always sees loaded variables.
 */
export async function pushOrder(orderData) {
  const base = getParcelGuruBaseUrl();
  const key = (process.env.PARCELGURU_API_KEY || '').trim();
  if (!base || !key) {
    console.warn('ParcelGuru push skipped: PARCELGURU_BASE_URL or PARCELGURU_API_KEY missing');
    return { status: 'skipped', message: 'ParcelGuru env not configured' };
  }

  const url = `${base}/api/v1/channel/orders/create`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-parcelguru-key': key,
      'x-parcelguru-api-version': 'v1',
      'x-parcelguru-topic': 'myparcelguru.v1.order_processed',
    },
    body: JSON.stringify(orderData),
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    console.error('ParcelGuru push HTTP error:', res.status, data);
  }
  return data;
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
