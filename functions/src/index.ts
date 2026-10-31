import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall } from 'firebase-functions/v2/https';
import { DateTime } from 'luxon';
import { z } from 'zod';
import { requireAuth } from './lib/auth';
import { ALLOWED_ORIGINS, REGION } from './lib/config';
import { fromZodError } from './lib/errors';
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
