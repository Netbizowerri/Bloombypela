/**
 * Contact form submission.
 *
 * The storefront posts to `/api/contact` (Vercel) because the Firebase project
 * is on the Spark plan; `submitContact` is the equivalent callable for when
 * Cloud Functions can be deployed. Both paths share the schema, the honeypot
 * check, the rate limit and the Firestore write below, so neither can drift.
 *
 * A message is stored first and emailed second: if Resend is down the enquiry
 * is still safe in `contactMessages` and shows in the admin console.
 */
import { createHash } from 'node:crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions/logger';
import { z } from 'zod';
import { adminDb } from './lib/admin';
import { ALLOWED_ORIGINS } from './lib/config';
import { fromZodError } from './lib/errors';
import { checkRateLimit } from './lib/rateLimit';
import { sendContactNotification } from './email/contact';

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

const CONTACT_FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'orders@bloombypela.com';
const CONTACT_TO_EMAIL = process.env.CONTACT_NOTIFY_EMAIL ?? 'orders@bloombypela.com';

/** Words that add nothing to the inbox and are common in spam blasts. */
const SPAM_TERMS = ['viagra', 'casino', 'crypto giveaway', 'loan offer'];

export const contactInputSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(100, 'That name is too long.'),
  email: z.string().trim().email('Enter a valid email address.').max(254),
  phone: z.string().trim().max(30, 'That phone number is too long.').optional().nullable(),
  subject: z.string().trim().min(2, 'Choose a subject.').max(120, 'That subject is too long.'),
  message: z
    .string()
    .trim()
    .min(10, 'Tell us a little more (at least 10 characters).')
    .max(4000, 'Please keep your message under 4000 characters.'),
  /**
   * Honeypot. Hidden from real visitors; a filled value means a bot and the
   * submission is silently discarded.
   */
  website: z.string().max(200).optional().nullable(),
});

export type ContactInput = z.infer<typeof contactInputSchema>;

export interface ContactMeta {
  source: 'web' | 'callable';
  ip: string;
  userId: string | null;
}

export interface ContactResult {
  ok: true;
  id: string;
  notified: boolean;
}

function hashIp(ip: string): string {
  // Stored instead of the raw address: enough to spot abuse, less personal data.
  return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

export async function storeContactMessage(
  db: FirebaseFirestore.Firestore,
  input: ContactInput,
  meta: ContactMeta,
): Promise<ContactResult> {
  if (input.website && input.website.trim().length > 0) {
    logger.warn('contact submission discarded: honeypot filled', { source: meta.source });
    return { ok: true, id: 'discarded', notified: false };
  }

  const lower = input.message.toLowerCase();
  if (SPAM_TERMS.some((term) => lower.includes(term))) {
    logger.warn('contact submission discarded: spam terms', { source: meta.source });
    return { ok: true, id: 'discarded', notified: false };
  }

  const docRef = db.collection('contactMessages').doc();
  const createdAt = new Date().toISOString();

  await docRef.set({
    name: input.name,
    email: input.email,
    emailLower: input.email.toLowerCase(),
    phone: input.phone?.trim() || null,
    subject: input.subject,
    message: input.message,
    source: meta.source,
    userId: meta.userId,
    ipHash: hashIp(meta.ip),
    status: 'new',
    createdAt: FirebaseFirestore.FieldValue.serverTimestamp(),
  });

  let notified = false;
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      await sendContactNotification(apiKey, CONTACT_FROM_EMAIL, CONTACT_TO_EMAIL, {
        name: input.name,
        email: input.email,
        phone: input.phone?.trim() || null,
        subject: input.subject,
        message: input.message,
        messageId: docRef.id,
        receivedAtIso: createdAt,
      });
      notified = true;
    } catch (error) {
      logger.error('contact notification email failed', {
        messageId: docRef.id,
        reason: error instanceof Error ? error.message : 'unknown',
      });
    }
  } else {
    logger.warn('RESEND_API_KEY missing: contact message stored without an email alert', {
      messageId: docRef.id,
    });
  }

  return { ok: true, id: docRef.id, notified };
}

/**
 * `submitContact` callable. Anonymous-friendly, rate limited per IP, and
 * validated before anything is stored.
 */
export const submitContact = onCall(
  { cors: ALLOWED_ORIGINS, secrets: [RESEND_API_KEY] },
  async (request): Promise<ContactResult> => {
    const ip = request.rawRequest.ip ?? 'unknown';
    if (!checkRateLimit(`submitContact:${ip}`, 5, 10 * 60_000)) {
      throw new HttpsError(
        'resource-exhausted',
        'Too many messages from this connection. Please try again later.',
      );
    }

    const parsed = contactInputSchema.safeParse(request.data ?? {});
    if (!parsed.success) throw fromZodError(parsed.error);

    return storeContactMessage(adminDb(), parsed.data, {
      source: 'callable',
      ip,
      userId: request.auth?.uid ?? null,
    });
  },
);
