/**
 * Email sending for Bloom by Pela via Resend.
 *
 * - Resend API key comes from Firebase Secret Manager (RESEND_API_KEY).
 * - Every outbound email is recorded in the `emailLog` collection with the
 *   order id + template key as the document id, making sends idempotent:
 *   retries never double-send.
 * - No secrets are logged or included in templates.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/logger';
import { defineSecret } from 'firebase-functions/params';
import { z } from 'zod';
import { adminDb } from '../lib/admin';
import { fromZodError } from '../lib/errors';
import { requireRole } from '../lib/auth';
import { ALLOWED_ORIGINS } from '../lib/config';
import type { OrderRecord } from '../lib/types';
import {
  adminNewOrderAlert,
  lowStockAlert,
  orderConfirmation,
  statusUpdate,
  type OrderContext,
} from './templates';

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'orders@bloombypela.com';

let resendClient: import('resend').Resend | null = null;

function getResendClient(): import('resend').Resend {
  if (!resendClient) {
    const key = RESEND_API_KEY.value();
    if (!key) {
      throw new HttpsError('internal', 'RESEND_API_KEY is not configured.');
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Resend = require('resend');
    resendClient = new Resend(key);
  }
  return resendClient as import('resend').Resend;
}

/** Shape stored in emailLog so a send is idempotent per order + template. */
export interface EmailLogData {
  orderNumber: string;
  templateKey: string;
  recipient: string;
  subject: string;
  sentAt: unknown;
  resendId: string | null;
}

function orderContext(order: OrderRecord): OrderContext {
  return {
    orderNumber: order.orderNumber,
    customerName: order.contact.name,
    email: order.contact.email,
    items: order.items.map((item) => ({
      name: item.name,
      variantName: item.variantName,
      quantity: item.quantity,
      lineTotalPence: item.lineTotalPence,
      allergens: Array.isArray(item.allergens) ? item.allergens : [],
    })),
    subtotalPence: order.subtotalPence,
    deliveryFeePence: order.deliveryFeePence,
    discountPence: order.discountPence,
    totalPence: order.totalPence,
    fulfilment: {
      method: order.fulfilment.method,
      deliveryDate: order.fulfilment.deliveryDate,
      areaName: order.fulfilment.areaName,
      collectionDetails: order.fulfilment.collectionDetails,
    },
    notes: order.notes,
    status: order.status,
    promoCode: order.promoCode ?? null,
    createdAt: order.createdAt ? String(order.createdAt) : '',
  };
}

/**
 * Send an email idempotently. Returns true if sent, false if already logged.
 */
export async function sendTemplatedEmail(
  db: FirebaseFirestore.Firestore,
  orderNumber: string,
  templateKey: string,
  recipient: string,
  render: () => { html: string; text: string; subject: string },
): Promise<boolean> {
  const logRef = db.collection('emailLog').doc(`${orderNumber}__${templateKey}`);
  const existing = await logRef.get();
  if (existing.exists) {
    logger.info('email already logged, skipping', { orderNumber, templateKey });
    return false;
  }

  const { html, text, subject } = render();

  let resendId: string | null = null;
  try {
    const client = getResendClient();
    const response = await client.emails.send({
      from: `${'Bloom by Pela'} <${RESEND_FROM_EMAIL}>`,
      to: [recipient],
      subject,
      html,
      text,
    });
    resendId = (response as { id?: string }).id ?? null;
    logger.info('email sent via Resend', { orderNumber, templateKey, recipient, resendId });
  } catch (error) {
    logger.error('email send failed', {
      orderNumber,
      templateKey,
      recipient,
      reason: error instanceof Error ? error.message : 'unknown',
    });
    throw error;
  }

  await logRef.set({
    orderNumber,
    templateKey,
    recipient,
    subject,
    sentAt: FirebaseFirestore.FieldValue.serverTimestamp(),
    resendId,
  } as EmailLogData);
  return true;
}

/**
 * Order confirmation email. Triggered from order creation.
 */
export async function sendOrderConfirmation(
  db: FirebaseFirestore.Firestore,
  order: OrderRecord,
): Promise<boolean> {
  return sendTemplatedEmail(
    db,
    order.orderNumber,
    'order_confirmation',
    order.contact.email,
    () => orderConfirmation(orderContext(order)),
  );
}

/**
 * Status update email. Triggered from updateOrderStatus.
 */
export async function sendStatusUpdate(
  db: FirebaseFirestore.Firestore,
  order: OrderRecord,
): Promise<boolean> {
  return sendTemplatedEmail(
    db,
    order.orderNumber,
    'status_update',
    order.contact.email,
    () => statusUpdate(orderContext(order)),
  );
}

/**
 * Admin new-order alert. Triggered from order creation.
 */
export async function sendAdminNewOrderAlert(
  db: FirebaseFirestore.Firestore,
  order: OrderRecord,
): Promise<boolean> {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL ?? RESEND_FROM_EMAIL;
  return sendTemplatedEmail(
    db,
    order.orderNumber,
    'admin_new_order',
    adminEmail,
    () => adminNewOrderAlert(orderContext(order)),
  );
}

/**
 * Low stock alert email.
 */
export async function sendLowStockAlert(
  db: FirebaseFirestore.Firestore,
  productName: string,
  variantName: string,
  stock: number,
  threshold: number,
): Promise<boolean> {
  const logRef = db.collection('emailLog').doc(`low_stock__${productName}__${variantName}`);
  const existing = await logRef.get();
  if (existing.exists) return false;

  const { html, text, subject } = lowStockAlert({
    productName,
    variantName,
    stock,
    threshold,
  });

  const client = getResendClient();
  const response = await client.emails.send({
    from: `Bloom by Pela <${RESEND_FROM_EMAIL}>`,
    to: [process.env.ADMIN_ALERT_EMAIL ?? RESEND_FROM_EMAIL],
    subject,
    html,
    text,
  });

  await logRef.set({
    orderNumber: 'low_stock',
    templateKey: 'low_stock_alert',
    recipient: process.env.ADMIN_ALERT_EMAIL ?? RESEND_FROM_EMAIL,
    subject,
    sentAt: FirebaseFirestore.FieldValue.serverTimestamp(),
    resendId: (response as { id?: string }).id ?? null,
  });
  return true;
}

const SendOrderEmailInput = z.object({
  orderNumber: z.string().trim().min(3).max(40),
  templateKey: z.enum(['order_confirmation', 'status_update']),
});

export const resendOrderEmail = onCall(
  { secrets: [RESEND_API_KEY], cors: ALLOWED_ORIGINS },
  async (request) => {
    requireRole(request, ['admin', 'staff']);
    const parsed = SendOrderEmailInput.safeParse(request.data ?? {});
    if (!parsed.success) throw fromZodError(parsed.error);

    const db = adminDb();
    const snap = await db.collection('orders').doc(parsed.data.orderNumber).get();
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Order not found.');
    }
    const order = snap.data() as OrderRecord;

    if (parsed.data.templateKey === 'order_confirmation') {
      await sendOrderConfirmation(db, order);
    } else {
      await sendStatusUpdate(db, order);
    }
    return { ok: true };
  },
);

const ResendLowStockInput = z.object({
  productName: z.string().trim().min(1).max(120),
  variantName: z.string().trim().max(120).optional().nullable(),
  stock: z.number().int().nonnegative(),
  threshold: z.number().int().nonnegative(),
});

export const resendLowStockAlert = onCall(
  { secrets: [RESEND_API_KEY], cors: ALLOWED_ORIGINS },
  async (request) => {
    requireRole(request, ['admin', 'staff']);
    const parsed = ResendLowStockInput.safeParse(request.data ?? {});
    if (!parsed.success) throw fromZodError(parsed.error);

    const db = adminDb();
    await sendLowStockAlert(
      db,
      parsed.data.productName,
      parsed.data.variantName ?? '',
      parsed.data.stock,
      parsed.data.threshold,
    );
    return { ok: true };
  },
);

/**
 * Re-send a specific email for an order (admin override, idempotent).
 */
export const resendEmailForOrder = onCall(
  { secrets: [RESEND_API_KEY], cors: ALLOWED_ORIGINS },
  async (request) => {
    requireRole(request, ['admin']);
    const parsed = SendOrderEmailInput.safeParse(request.data ?? {});
    if (!parsed.success) throw fromZodError(parsed.error);

    const db = adminDb();
    const snap = await db.collection('orders').doc(parsed.data.orderNumber).get();
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Order not found.');
    }
    const order = snap.data() as OrderRecord;

    if (parsed.data.templateKey === 'order_confirmation') {
      await sendOrderConfirmation(db, order);
    } else {
      await sendStatusUpdate(db, order);
    }
    return { ok: true };
  },
);
