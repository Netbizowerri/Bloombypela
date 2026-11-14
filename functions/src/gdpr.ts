/**
 * UK GDPR data subject rights (UK GDPR Articles 15 and 17).
 *
 * `exportMyData` returns everything we hold for the signed-in customer as JSON.
 * `deleteMyAccount` erases the account and the personal data attached to it,
 * but keeps each order's accounting record in an anonymised form (name, email,
 * phone and delivery address removed) because HMRC requires order records to be
 * retained.
 *
 * Deletion is refused while a subscription is still live, so nobody loses access
 * to a plan they are still being billed for. The storefront posts these to
 * `/api/gdpr/export` and `/api/gdpr/delete` on the Spark plan; the callables
 * below are the same logic for a Functions deployment.
 */
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/logger';
import { z } from 'zod';
import { adminAuth, adminDb } from './lib/admin';
import { requireAuth } from './lib/auth';
import { ALLOWED_ORIGINS } from './lib/config';

/** Statuses that mean the customer still has a live plan. */
const BLOCKING_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due', 'paused'];

const ANONYMISED_NAME = 'Deleted customer';
const ANONYMISED_EMAIL = 'deleted@bloombypela.invalid';

export const deleteAccountInput = z.object({
  /** The customer types DELETE to confirm in the UI; re-checked here. */
  confirmation: z.literal('DELETE'),
});

export interface DeleteAccountResult {
  ok: true;
  ordersAnonymised: number;
  subscriptionsAnonymised: number;
  contactMessagesDeleted: number;
}

interface SubscriptionRow {
  id: string;
  status?: unknown;
}

async function readSubscriptions(
  db: FirebaseFirestore.Firestore,
  uid: string,
): Promise<SubscriptionRow[]> {
  const snap = await db.collection('subscriptions').where('userId', '==', uid).get();
  return snap.docs.map((docSnap) => {
    const data = docSnap.data() as { status?: unknown };
    return { id: docSnap.id, status: data.status };
  });
}

/**
 * Throws a `failed-precondition` HttpsError when a live subscription exists.
 * Exported so the refusal can be unit-tested without a Functions runtime.
 */
export function assertNoActiveSubscription(
  subscriptions: SubscriptionRow[],
): void {
  const blocking = subscriptions.filter((subscription) =>
    BLOCKING_SUBSCRIPTION_STATUSES.includes(String(subscription.status)),
  );
  if (blocking.length > 0) {
    throw new HttpsError(
      'failed-precondition',
      'You still have a live juice subscription. Cancel it from My Subscriptions first, then delete your account.',
    );
  }
}

/**
 * Deletes the customer record, anonymises their orders and removes their
 * contact messages. The auth user is removed by the caller so that failure
 * point is explicit (and mockable in tests).
 */
export async function anonymiseAndDeleteCustomerData(
  db: FirebaseFirestore.Firestore,
  uid: string,
  emailLower: string | null,
): Promise<Omit<DeleteAccountResult, 'ok'>> {
  const ordersSnap = await db.collection('orders').where('userId', '==', uid).get();
  const subscriptions = await readSubscriptions(db, uid);
  assertNoActiveSubscription(subscriptions);

  const batch = db.batch();

  for (const orderDoc of ordersSnap.docs) {
    batch.set(
      orderDoc.ref,
      {
        userId: 'deleted',
        contact: {
          name: ANONYMISED_NAME,
          email: ANONYMISED_EMAIL,
          emailLower: ANONYMISED_EMAIL,
          phone: '',
        },
        fulfilment: {
          ...((orderDoc.data() as { fulfilment?: Record<string, unknown> }).fulfilment ?? {}),
          address: null,
        },
        notes: '',
        anonymised: true,
        anonymisedAt: FirebaseFirestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  for (const subscription of subscriptions) {
    batch.set(
      db.collection('subscriptions').doc(subscription.id),
      {
        userId: 'deleted',
        customerEmail: null,
        anonymised: true,
        anonymisedAt: FirebaseFirestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  batch.delete(db.collection('customers').doc(uid));

  let contactMessagesDeleted = 0;
  if (emailLower) {
    const messagesSnap = await db
      .collection('contactMessages')
      .where('emailLower', '==', emailLower)
      .get();
    for (const messageDoc of messagesSnap.docs) {
      batch.delete(messageDoc.ref);
      contactMessagesDeleted += 1;
    }
  }

  await batch.commit();

  return {
    ordersAnonymised: ordersSnap.size,
    subscriptionsAnonymised: subscriptions.length,
    contactMessagesDeleted,
  };
}

export interface ExportedCustomerData {
  generatedAt: string;
  account: { uid: string; email: string | null; profile: FirebaseFirestore.DocumentData | null };
  orders: Array<{ id: string } & FirebaseFirestore.DocumentData>;
  subscriptions: Array<{ id: string } & FirebaseFirestore.DocumentData>;
  subscriptionDeliveries: Array<{ id: string } & FirebaseFirestore.DocumentData>;
}

/** Article 15 payload, shared by the callable and the Vercel route. */
export async function collectCustomerData(
  db: FirebaseFirestore.Firestore,
  uid: string,
  email: string | null,
): Promise<ExportedCustomerData> {
  const [customerSnap, ordersSnap, subscriptionsSnap, deliveriesSnap] = await Promise.all([
    db.collection('customers').doc(uid).get(),
    db.collection('orders').where('userId', '==', uid).get(),
    db.collection('subscriptions').where('userId', '==', uid).get(),
    db.collection('subscriptionDeliveries').where('userId', '==', uid).get(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    account: {
      uid,
      email,
      profile: customerSnap.exists ? customerSnap.data() ?? null : null,
    },
    orders: ordersSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
    subscriptions: subscriptionsSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
    subscriptionDeliveries: deliveriesSnap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })),
  };
}

/** Article 15: everything we hold about the caller, as JSON. */
export const exportMyData = onCall({ cors: ALLOWED_ORIGINS }, async (request) => {
  const caller = requireAuth(request);
  return collectCustomerData(adminDb(), caller.uid, caller.email);
});

/** Article 17: erase the account, keeping anonymised order records. */
export const deleteMyAccount = onCall({ cors: ALLOWED_ORIGINS }, async (request) => {
  const caller = requireAuth(request);
  const parsed = deleteAccountInput.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Type DELETE to confirm account deletion.');
  }

  const db = adminDb();
  const emailLower = caller.email ? caller.email.toLowerCase() : null;

  const result = await anonymiseAndDeleteCustomerData(db, caller.uid, emailLower);

  try {
    await adminAuth().deleteUser(caller.uid);
  } catch (error) {
    logger.error('auth user deletion failed after anonymisation', {
      uid: caller.uid,
      reason: error instanceof Error ? error.message : 'unknown',
    });
    throw new HttpsError(
      'internal',
      'Your data was anonymised but the sign-in record could not be removed. Please contact us.',
    );
  }

  logger.info('account deleted', {
    uid: caller.uid,
    ordersAnonymised: result.ordersAnonymised,
  });

  return { ok: true, ...result } satisfies DeleteAccountResult;
});
