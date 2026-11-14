/**
 * Client-side audit trail writer.
 *
 * Cloud Functions used to write `auditLog` with the Admin SDK. On the Spark
 * plan there is no server, so a signed-in staff/admin member writes the entry
 * themselves. `firestore.rules` guarantees it cannot be forged: `uid` must
 * equal the caller's uid, `email` must fit the allow-list, `createdAt` must be
 * the request server timestamp, and no entry can ever be updated or deleted.
 */
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth } from './firebase';
import { requireAdminDb, stripUndefinedDeep } from './firestoreWrite';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'soft-delete'
  | 'duplicate'
  | 'upsert'
  | 'toggle'
  | 'update_order_status'
  | 'record_refund';

export type AuditEntity =
  | 'product'
  | 'promotion'
  | 'deliveryArea'
  | 'deliverySchedule'
  | 'closedDate'
  | 'dateCapacity'
  | 'publicSettings'
  | 'contentPage'
  | 'order';

/**
 * Builds the audit document shared by the direct-write helpers and the order
 * transaction. Throws when nobody is signed in, because rules would reject it.
 */
export function auditEntryFields(
  action: AuditAction,
  entityType: AuditEntity,
  entityId: string,
  metadata: Record<string, unknown> | null,
): Record<string, unknown> {
  const user = auth?.currentUser;
  if (!user) {
    throw new Error('You must be signed in to record an audit entry.');
  }
  return stripUndefinedDeep({
    action,
    entityType,
    entityId,
    uid: user.uid,
    email: user.email ?? null,
    metadata,
    createdAt: serverTimestamp(),
  });
}

/**
 * Best-effort audit write. The mutation has already happened by the time this
 * runs, so a failed audit entry must not be reported as a failed save; it is
 * logged to the console for the operator instead.
 */
export async function audit(
  action: AuditAction,
  entityType: AuditEntity,
  entityId: string,
  metadata: Record<string, unknown> | null = null,
): Promise<void> {
  try {
    await addDoc(
      collection(requireAdminDb(), 'auditLog'),
      auditEntryFields(action, entityType, entityId, metadata),
    );
  } catch (error) {
    console.error('[bloom] audit log write failed', {
      action,
      entityType,
      entityId,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}
