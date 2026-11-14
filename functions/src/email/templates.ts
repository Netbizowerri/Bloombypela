/**
 * Branded email templates for Bloom by Pela.
 *
 * Palette: burgundy #7e2b44, gold #cb932b, cream #faf1de, stone #f3f4f6.
 * UK English throughout. Each template returns an HTML body and a plain-text
 * body so the client (Resend) can send multipart/alternative.
 *
 * Money values are integer pence and must be formatted by the caller using
 * formatPenceCore before being passed in.
 */

export interface OrderLine {
  name: string;
  variantName: string;
  quantity: number;
  lineTotalPence: number;
  /** UK allergens declared for this recipe; empty means none declared. */
  allergens: string[];
}

export interface OrderContext {
  orderNumber: string;
  customerName: string;
  email: string;
  items: OrderLine[];
  subtotalPence: number;
  deliveryFeePence: number;
  discountPence: number;
  totalPence: number;
  fulfilment: {
    method: 'delivery' | 'collection';
    deliveryDate: string | null;
    areaName: string | null;
    collectionDetails: string | null;
  };
  notes: string;
  status: string;
  promoCode: string | null;
  createdAt: string;
}

const BURGUNDY = '#7e2b44';
const GOLD = '#cb932b';
const CREAM = '#faf1de';

const FROM_NAME = 'Bloom by Pela';

function htmlWrapper(title: string, body: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Georgia','Times New Roman',serif;color:#2a2a2a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f4f6;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#ffffff;border:1px solid #e5e7e5;border-radius:16px;overflow:hidden;">
            <!-- Header -->
            <tr>
              <td align="center" style="background-color:${BURGUNDY};padding:24px;">
                <h1 style="margin:0;font-family:'Georgia','Times New Roman',serif;font-size:24px;color:#ffffff;letter-spacing:0.5px;">
                  Bloom by Pela
                </h1>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:28px 24px;">
                ${body}
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td align="center" style="padding:20px 24px;background-color:#f3f4f6;border-top:1px solid #e5e7e5;">
                <p style="margin:0;font-size:11px;color:#6b7280;line-height:1.5;">
                  ${escapeHtml(FROM_NAME)} &bull; Newcastle upon Tyne, UK &bull; premium packaged snacks &amp; cold-pressed juices<br />
                  This email was sent to ${escapeHtml(title ? '' : '')}. You are receiving this because you placed an order with us.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function lineItemHtml(items: OrderLine[]): string {
  return items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7e5;text-align:left;font-size:14px;">
          ${escapeHtml(item.name)}${
            item.variantName && item.variantName.toLowerCase() !== 'default'
              ? ` <span style="color:#6b7280;font-size:12px;">— ${escapeHtml(item.variantName)}</span>`
              : ''
          }
          <div style="margin-top:4px;font-size:11px;color:#6b7280;">
            Allergens: ${
              item.allergens.length > 0
                ? `<strong style="color:#7e2b44;">${escapeHtml(item.allergens.join(', '))}</strong>`
                : '<strong style="color:#7e2b44;">None of the 14 major UK allergens declared</strong>'
            }
          </div>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7e5;text-align:right;font-size:14px;">
          ${item.quantity} × ${money(item.lineTotalPence / item.quantity)}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7e5;text-align:right;font-size:14px;font-weight:bold;">
          ${money(item.lineTotalPence)}
        </td>
      </tr>
    `,
    )
    .join('');
}

function lineItemText(items: OrderLine[]): string {
  return items
    .map(
      (item) =>
        `- ${item.quantity} × ${item.name}${
          item.variantName && item.variantName.toLowerCase() !== 'default'
            ? ` — ${item.variantName}`
            : ''
        } @ ${money(item.lineTotalPence / item.quantity)} each = ${money(
          item.lineTotalPence,
        )}\n  Allergens: ${
          item.allergens.length > 0
            ? item.allergens.join(', ')
            : 'None of the 14 major UK allergens declared'
        }`,
    )
    .join('\n');
}

/**
 * Order confirmation email.
 */
export function orderConfirmation(ctx: OrderContext): { html: string; text: string; subject: string } {
  const isDelivery = ctx.fulfilment.method === 'delivery';
  const deliveryLine = isDelivery
    ? `Delivery to ${ctx.fulfilment.areaName ?? 'your address'} on ${ctx.fulfilment.deliveryDate ?? 'to be confirmed'}`
    : `Collection from our shop${ctx.fulfilment.collectionDetails ? ` — ${ctx.fulfilment.collectionDetails}` : ''}`;

  const discountRow = ctx.discountPence > 0
    ? `<tr>
        <td style="padding:8px 0;text-align:left;font-size:14px;color:#6b7280;">Discount (${ctx.promoCode})</td>
        <td style="padding:8px 0;text-align:right;font-size:14px;color:#6b7280;">-&nbsp;${money(ctx.discountPence)}</td>
      </tr>`
    : '';

  const body = `
    <h2 style="margin:0 0 16px;font-family:'Georgia','Times New Roman',serif;font-size:20px;color:${BURGUNDY};">Order confirmed</h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">
      Thank you, ${escapeHtml(ctx.customerName)}. Your order <strong>${escapeHtml(ctx.orderNumber)}</strong> has been confirmed.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px;">
      <thead>
        <tr>
          <th style="padding:12px 8px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Item</th>
          <th style="padding:12px 8px;text-align:right;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Qty</th>
          <th style="padding:12px 8px;text-align:right;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Total</th>
        </tr>
      </thead>
      <tbody>${lineItemHtml(ctx.items)}</tbody>
      <tfoot>
        <tr>
          <td style="padding:12px 8px;text-align:left;font-size:14px;">Subtotal</td>
          <td style="padding:12px 8px;text-align:right;font-size:14px;">${money(ctx.subtotalPence)}</td>
          <td style="padding:12px 8px;text-align:right;font-size:14px;font-weight:bold;">${money(ctx.subtotalPence)}</td>
        </tr>
        ${discountRow}
        <tr>
          <td style="padding:12px 8px;text-align:left;font-size:14px;">Delivery</td>
          <td style="padding:12px 8px;text-align:right;font-size:14px;">${ctx.deliveryFeePence === 0 ? 'FREE' : money(ctx.deliveryFeePence)}</td>
          <td style="padding:12px 8px;text-align:right;font-size:14px;">${ctx.deliveryFeePence === 0 ? 'FREE' : money(ctx.deliveryFeePence)}</td>
        </tr>
        <tr style="border-top:2px solid ${BURGUNDY};">
          <td style="padding:12px 8px;text-align:left;font-size:16px;font-weight:bold;color:${BURGUNDY};">Total</td>
          <td style="padding:12px 8px;text-align:right;font-size:16px;font-weight:bold;color:${BURGUNDY};"></td>
          <td style="padding:12px 8px;text-align:right;font-size:16px;font-weight:bold;color:${BURGUNDY};">${money(ctx.totalPence)}</td>
        </tr>
      </tfoot>
    </table>

    <div style="background-color:${CREAM};border:1px solid #f4e1ba;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:13px;color:#73451c;font-weight:bold;">Delivery details</p>
      <p style="margin:0;font-size:13px;color:#73451c;line-height:1.6;">${escapeHtml(deliveryLine)}</p>
      ${ctx.notes ? `<p style="margin:8px 0 0;font-size:13px;color:#73451c;"><strong>Your note:</strong> ${escapeHtml(ctx.notes)}</p>` : ''}
    </div>

    <div style="border:1px solid #e5e7e5;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;font-weight:bold;">Allergen &amp; perishable goods notice</p>
      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
        Our juices are raw, cold-pressed and unpasteurised. Please ensure someone is available at the delivery address
        to receive and refrigerate your bottles immediately (store below 4&deg;C). Consume within 5 days of delivery.
        Our kitchen handles the 14 major UK allergens. While we take care to avoid cross-contact, we cannot guarantee
        any product is allergen-free.
      </p>
    </div>

    <p style="margin:0;font-size:14px;line-height:1.6;">
      Any questions? Reply to this email or contact us. We are happy to help.
    </p>
  `;

  const text = `
Order confirmed — ${ctx.orderNumber}

Thank you, ${ctx.customerName}. Your order ${ctx.orderNumber} has been confirmed.

Items:
${lineItemText(ctx.items)}
Subtotal: ${money(ctx.subtotalPence)}
${ctx.discountPence > 0 ? `Discount (${ctx.promoCode}): -${money(ctx.discountPence)}\n` : ''}
Delivery: ${ctx.deliveryFeePence === 0 ? 'FREE' : money(ctx.deliveryFeePence)}
Total: ${money(ctx.totalPence)}

${deliveryLine}
${ctx.notes ? `Your note: ${ctx.notes}\n` : ''}

Allergen & perishable goods notice:
Our juices are raw, cold-pressed and unpasteurised. Please ensure someone is available at the delivery address
to receive and refrigerate your bottles immediately (store below 4°C). Consume within 5 days of delivery.
Our kitchen handles the 14 major UK allergens. While we take care to avoid cross-contact, we cannot guarantee
any product is allergen-free.

Reply to this email or contact us with any questions.
  `;

  return {
    html: htmlWrapper('Order confirmed', body),
    text,
    subject: `Order confirmed — ${ctx.orderNumber}`,
  };
}

/**
 * Status update email.
 */
export function statusUpdate(ctx: OrderContext): { html: string; text: string; subject: string } {
  const statusLabels: Record<string, string> = {
    preparing: 'Being prepared',
    out_for_delivery: 'Out for delivery',
    delivered: 'Delivered',
    collected: 'Ready for collection',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
    partially_refunded: 'Partially refunded',
  };
  const statusLabel = statusLabels[ctx.status] ?? ctx.status;

  const isDelivery = ctx.fulfilment.method === 'delivery';
  const deliveryLine = isDelivery
    ? `Delivery to ${ctx.fulfilment.areaName ?? 'your address'} on ${ctx.fulfilment.deliveryDate ?? 'to be confirmed'}`
    : `Collection from our shop${ctx.fulfilment.collectionDetails ? ` — ${ctx.fulfilment.collectionDetails}` : ''}`;

  const body = `
    <h2 style="margin:0 0 16px;font-family:'Georgia','Times New Roman',serif;font-size:20px;color:${GOLD};">Order update</h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">
      Your order <strong>${escapeHtml(ctx.orderNumber)}</strong> is now <strong style="color:${BURGUNDY};">${escapeHtml(statusLabel)}</strong>.
    </p>

    <div style="background-color:${CREAM};border:1px solid #f4e1ba;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:13px;color:#73451c;font-weight:bold;">Delivery details</p>
      <p style="margin:0;font-size:13px;color:#73451c;line-height:1.6;">${escapeHtml(deliveryLine)}</p>
    </div>

    <p style="margin:0;font-size:14px;line-height:1.6;">
      You can track your order at any time using your order number ${escapeHtml(ctx.orderNumber)} on our website.
    </p>
  `;

  const text = `
Order update — ${ctx.orderNumber}

Your order ${ctx.orderNumber} is now ${statusLabel}.

${deliveryLine}

Track your order at any time using your order number ${ctx.orderNumber} on our website.
  `;

  return {
    html: htmlWrapper('Order update', body),
    text,
    subject: `Order update — ${ctx.orderNumber}`,
  };
}

/**
 * Admin new-order alert.
 */
export function adminNewOrderAlert(ctx: OrderContext): { html: string; text: string; subject: string } {
  const isDelivery = ctx.fulfilment.method === 'delivery';
  const deliveryLine = isDelivery
    ? `Delivery to ${ctx.fulfilment.areaName ?? 'address'} on ${ctx.fulfilment.deliveryDate ?? 'TBC'}`
    : 'Collection from shop';

  const body = `
    <h2 style="margin:0 0 16px;font-family:'Georgia','Times New Roman',serif;font-size:20px;color:${BURGUNDY};">New order received</h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">
      Order <strong>${escapeHtml(ctx.orderNumber)}</strong> from ${escapeHtml(ctx.customerName)} (${escapeHtml(ctx.email)}) has been placed.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px;">
      <tbody>
        <tr>
          <td style="padding:8px 0;text-align:left;font-size:14px;">Total</td>
          <td style="padding:8px 0;text-align:right;font-size:14px;font-weight:bold;">${money(ctx.totalPence)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;text-align:left;font-size:14px;">Fulfilment</td>
          <td style="padding:8px 0;text-align:right;font-size:14px;">${escapeHtml(deliveryLine)}</td>
        </tr>
        ${ctx.notes ? `<tr><td style="padding:8px 0;text-align:left;font-size:14px;">Note</td><td style="padding:8px 0;text-align:right;font-size:14px;">${escapeHtml(ctx.notes)}</td></tr>` : ''}
      </tbody>
    </table>

    <p style="margin:0;font-size:14px;line-height:1.6;">
      View and manage this order in the admin dashboard.
    </p>
  `;

  const text = `
New order received — ${ctx.orderNumber}

Order ${ctx.orderNumber} from ${ctx.customerName} (${ctx.email}) has been placed.
Total: ${money(ctx.totalPence)}
Fulfilment: ${deliveryLine}
${ctx.notes ? `Note: ${ctx.notes}\n` : ''}

View and manage this order in the admin dashboard.
  `;

  return {
    html: htmlWrapper('New order received', body),
    text,
    subject: `New order — ${ctx.orderNumber}`,
  };
}

/**
 * Low stock alert email.
 */
export function lowStockAlert({
  productName,
  variantName,
  stock,
  threshold,
}: {
  productName: string;
  variantName: string;
  stock: number;
  threshold: number;
}): { html: string; text: string; subject: string } {
  const body = `
    <h2 style="margin:0 0 16px;font-family:'Georgia','Times New Roman',serif;font-size:20px;color:#c93c3c;">Low stock alert</h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">
      ${escapeHtml(productName)}${
      variantName && variantName.toLowerCase() !== 'default'
        ? ` — ${escapeHtml(variantName)}`
        : ''
    } is running low.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px;">
      <tbody>
        <tr>
          <td style="padding:8px 0;text-align:left;font-size:14px;">Current stock</td>
          <td style="padding:8px 0;text-align:right;font-size:14px;font-weight:bold;color:#c93c3c;">${stock}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;text-align:left;font-size:14px;">Reorder threshold</td>
          <td style="padding:8px 0;text-align:right;font-size:14px;">${threshold}</td>
        </tr>
      </tbody>
    </table>
    <p style="margin:0;font-size:14px;line-height:1.6;">Please restock this item.</p>
  `;

  const text = `
Low stock alert — ${productName}${variantName && variantName.toLowerCase() !== 'default' ? ` — ${variantName}` : ''}

Current stock: ${stock}
Reorder threshold: ${threshold}

Please restock this item.
  `;

  return {
    html: htmlWrapper('Low stock alert', body),
    text,
    subject: `Low stock alert — ${productName}`,
  };
}
