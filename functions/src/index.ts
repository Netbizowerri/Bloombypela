import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/logger';
import { DateTime } from 'luxon';
import { z } from 'zod';
import { requireAuth } from './lib/auth';
import { ALLOWED_ORIGINS, REGION } from './lib/config';
import { fromZodError } from './lib/errors';
import type { OrderRecord } from './lib/types';
export {
  createProduct,
  duplicateProduct,
  getUploadSignature,
  softDeleteProduct,
  updateProduct,
} from './catalogue';
export {
  checkPostcode,
  getAvailableDatesCallable,
} from './delivery/callables';
export {
  createDeliveryArea,
  updateDeliveryArea,
  deleteDeliveryArea,
  upsertDeliverySchedule,
  upsertClosedDate,
  deleteClosedDate,
  upsertDateCapacity,
  updatePublicSettings,
} from './delivery/admin';
export { quoteCart } from './checkout/quote';
export {
  createPromotion,
  updatePromotion,
  deletePromotion,
  togglePromotion,
} from './checkout/promotions';
export { createCheckoutSession } from './checkout/createCheckoutSession';
export { stripeWebhook } from './stripe/webhook';
export { releaseExpiredReservations } from './reservations/releaseExpired';
export { getOrderBySession, lookupGuestOrder } from './orders/publicOrder';
export {
  updateOrderStatus,
  refundOrder,
  getDashboardStats,
  exportOrdersCSV,
} from './orders/admin';
export { resendOrderEmail, resendLowStockAlert, resendEmailForOrder } from './email/index';

// Applied to every function in this codebase unless a function overrides it.
setGlobalOptions({ region: REGION });

const pingRequest = z.object({
  message: z.string().trim().min(1).max(200).optional(),
});

/**
 * Example callable used to verify deployment, CORS and auth wiring.
 * Requires a signed-in user; returns the caller's uid and role claim.
 */
export const ping = onCall({ cors: ALLOWED_ORIGINS }, (request) => {
  const identity = requireAuth(request);

  const parsed = pingRequest.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw fromZodError(parsed.error);
  }

  return {
    ok: true,
    message: parsed.data.message ?? 'pong',
    uid: identity.uid,
    role: identity.role,
    // Times are returned in UTC; business rules use Europe/London in the caller.
    serverTime: DateTime.utc().toISO() ?? new Date().toISOString(),
  };
});

/**
 * Firestore trigger: when an order is created, send order confirmation to the
 * customer and a new-order alert to the admin. Idempotent via emailLog.
 */
export const onOrderCreated = onDocumentCreated(
  { document: 'orders/{orderNumber}', secrets: [], region: REGION },
  async (event) => {
    const data = event.data;
    if (!data) return;
    const order = data.data() as OrderRecord | undefined;
    if (!order) return;
    const db = data.ref.firestore;

    const { sendOrderConfirmation, sendAdminNewOrderAlert } = await import(
      './email/index.js'
    );
    try {
      await sendOrderConfirmation(db, order);
    } catch (error) {
      logger.error('order confirmation email trigger failed', {
        orderNumber: order.orderNumber,
        reason: error instanceof Error ? error.message : 'unknown',
      });
    }
    try {
      await sendAdminNewOrderAlert(db, order);
    } catch (error) {
      logger.error('admin new-order alert trigger failed', {
        orderNumber: order.orderNumber,
        reason: error instanceof Error ? error.message : 'unknown',
      });
    }
  },
);

/**
 * Firestore trigger: when an order's status changes, send a status update
 * email to the customer. Idempotent via emailLog.
 */
export const onOrderUpdated = onDocumentUpdated(
  { document: 'orders/{orderNumber}', secrets: [], region: REGION },
  async (event) => {
    const data = event.data;
    if (!data) return;
    const before = data.before.data() as OrderRecord | undefined;
    const after = data.after.data() as OrderRecord | undefined;
    if (!before || !after) return;
    const db = data.after.ref.firestore;

    if (before.status === after.status) return;

    const { sendStatusUpdate } = await import('./email/index.js');
    try {
      await sendStatusUpdate(db, after);
    } catch (error) {
      logger.error('status update email trigger failed', {
        orderNumber: after.orderNumber,
        reason: error instanceof Error ? error.message : 'unknown',
      });
    }
  },
);
