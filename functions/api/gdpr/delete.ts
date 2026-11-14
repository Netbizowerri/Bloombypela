import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminAuth, adminDb } from '../../serverless/firebase';
import { handleCors, sendMethodNotAllowed } from '../../serverless/http';
import { deleteAccountInput, anonymiseAndDeleteCustomerData } from '../../src/gdpr';

/**
 * POST /api/gdpr/delete — Article 17 erasure.
 *
 * Refuses while a subscription is live, anonymises the order history that must
 * be kept for accounting, then removes the Firebase Auth user.
 */
export default async function deleteAccount(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res);
    return;
  }

  const authorization = req.headers.authorization;
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Sign in to delete your account.' });
    return;
  }

  let uid: string;
  let email: string | null;
  try {
    const decoded = await adminAuth.verifyIdToken(authorization.slice(7));
    uid = decoded.uid;
    email = decoded.email ?? null;
  } catch {
    res.status(401).json({ error: 'Your session has expired. Sign in again.' });
    return;
  }

  const parsed = deleteAccountInput.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Type DELETE to confirm account deletion.' });
    return;
  }

  try {
    const result = await anonymiseAndDeleteCustomerData(
      adminDb,
      uid,
      email ? email.toLowerCase() : null,
    );
    await adminAuth.deleteUser(uid);
    res.status(200).json({ ok: true, ...result });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = String((error as { code: unknown }).code);
      if (code === 'failed-precondition') {
        res.status(409).json({ error: (error as { message?: string }).message ?? 'Subscription still active.' });
        return;
      }
    }
    console.error('GDPR delete failed', {
      reason: error instanceof Error ? error.message : 'unknown',
    });
    res.status(500).json({ error: 'We could not delete your account. Please contact us.' });
  }
}
