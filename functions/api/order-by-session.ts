import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { adminDb } from '../serverless/firebase';
import { handleCors, requestIp, sendMethodNotAllowed } from '../serverless/http';
import { checkRateLimit } from '../src/lib/rateLimit';
import type { OrderRecord } from '../src/checkout/reservationService';

const inputSchema = z.object({
  sessionId: z.string().trim().min(10).max(200),
});

function toPublicOrder(order: OrderRecord) {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    items: (order.items ?? []).map((item) => ({
      name: item.name,
      variantName: item.variantName,
      quantity: item.quantity,
      unitPricePence: item.unitPricePence,
      lineTotalPence: item.lineTotalPence,
    })),
    subtotalPence: order.subtotalPence,
    deliveryFeePence: order.deliveryFeePence,
    discountPence: order.discountPence,
    totalPence: order.totalPence,
    fulfilment: {
      method: order.fulfilment.method,
      deliveryDate: order.fulfilment.deliveryDate,
      areaName: order.fulfilment.areaName,
    },
    notes: order.notes,
    createdAt: order.createdAt ? order.createdAt.toDate().toISOString() : null,
  };
}

export default async function orderBySession(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res);
    return;
  }

  if (!checkRateLimit(`getOrderBySession:${requestIp(req)}`, 120, 60_000)) {
    res.status(429).json({ error: 'Too many requests. Please slow down.' });
    return;
  }

  const parsed = inputSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid checkout session id.' });
    return;
  }

  try {
    const { sessionId } = parsed.data;
    const orders = await adminDb
      .collection('orders')
      .where('stripeSessionId', '==', sessionId)
      .limit(1)
      .get();
    if (!orders.empty) {
      const order = orders.docs[0];
      res.status(200).json({
        state: 'confirmed',
        order: toPublicOrder(order.data() as OrderRecord),
      });
      return;
    }

    const reservations = await adminDb
      .collection('reservations')
      .where('stripeSessionId', '==', sessionId)
      .limit(1)
      .get();
    if (!reservations.empty) {
      const data = reservations.docs[0].data() as { status?: string };
      res.status(200).json({
        state: data.status === 'payment_unfulfilled' ? 'unfulfilled' : 'pending',
        order: null,
      });
      return;
    }

    res.status(200).json({ state: 'not_found', order: null });
  } catch (error) {
    console.error('Order lookup API failed', {
      reason: error instanceof Error ? error.message : 'unknown',
    });
    res.status(500).json({ error: 'Unable to check payment status.' });
  }
}
