import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminAuth, adminDb } from '../../serverless/firebase';
import { handleCors, sendMethodNotAllowed } from '../../serverless/http';
import { collectCustomerData } from '../../src/gdpr';

/**
 * POST /api/gdpr/export — Article 15 subject access request.
 * Requires a Firebase ID token; returns only the caller's own data.
 */
export default async function exportData(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res);
    return;
  }

  const authorization = req.headers.authorization;
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Sign in to export your data.' });
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

  try {
    const payload = await collectCustomerData(adminDb, uid, email);
    res.status(200).json(payload);
  } catch (error) {
    console.error('GDPR export failed', {
      reason: error instanceof Error ? error.message : 'unknown',
    });
    res.status(500).json({ error: 'We could not assemble your data. Please try again.' });
  }
}
