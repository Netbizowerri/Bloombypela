import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminAuth, adminDb } from '../serverless/firebase';
import { handleCors, requestIp, sendMethodNotAllowed } from '../serverless/http';
import { checkRateLimit } from '../src/lib/rateLimit';
import { contactInputSchema, storeContactMessage } from '../src/contact';

/**
 * POST /api/contact — public contact form (Vercel equivalent of the
 * `submitContact` callable).
 *
 * Signed-in customers are identified from their bearer token, but the form is
 * open to guests. The honeypot field and rate limit live in `src/contact.ts`,
 * so the callable and this route behave identically.
 */
export default async function contact(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res);
    return;
  }

  const ip = requestIp(req);
  if (!checkRateLimit(`contact:${ip}`, 5, 10 * 60_000)) {
    res.status(429).json({ error: 'Too many messages from this connection. Please try again later.' });
    return;
  }

  const parsed = contactInputSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      error: 'Please check the form and try again.',
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  let userId: string | null = null;
  const authorization = req.headers.authorization;
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
    try {
      const decoded = await adminAuth.verifyIdToken(authorization.slice(7));
      userId = decoded.uid;
    } catch {
      // An invalid or expired token must not block a guest enquiry.
      userId = null;
    }
  }

  try {
    await storeContactMessage(adminDb, parsed.data, { source: 'web', ip, userId });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Contact API failed', {
      reason: error instanceof Error ? error.message : 'unknown',
    });
    res.status(500).json({ error: 'We could not send your message. Please try again shortly.' });
  }
}
