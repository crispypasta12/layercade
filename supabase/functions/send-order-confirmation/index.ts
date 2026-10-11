import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* ─── CORS ───────────────────────────────────────────────────────────────────
   Only our own origins may call this function. Configure extra origins with the
   ALLOWED_ORIGINS secret (comma-separated) rather than editing this list.      */

const DEFAULT_ALLOWED_ORIGINS = [
  'https://layercade.com',
  'https://www.layercade.com',
  'http://localhost:5173',
];

const ALLOWED_ORIGINS = new Set(
  (Deno.env.get('ALLOWED_ORIGINS')?.split(',').map((o) => o.trim()).filter(Boolean) ??
    DEFAULT_ALLOWED_ORIGINS),
);

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

/* ─── HTML escaping ──────────────────────────────────────────────────────────
   Every value that reaches the template is customer-supplied. Escape it all.   */

function esc(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function money(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-IN') : '0';
}

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface OrderItem {
  name?: string;
  quantity?: number;
  price?: number;
  colorName?: string;
}

interface Order {
  id: number | string;
  customer_name: string | null;
  email: string | null;
  items: OrderItem[] | null;
  total_amount: number | null;
  delivery_fee: number | null;
  fulfillment_type: string | null;
  address: string | null;
  area: string | null;
  district: string | null;
}

/* ─── Template ───────────────────────────────────────────────────────────── */

function renderEmail(order: Order): string {
  const items = Array.isArray(order.items) ? order.items : [];

  const itemsHtml = items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #222;">
            ${esc(item.name)}${
              item.colorName
                ? `<span style="display:block;font-size:10px;color:#888;margin-top:2px;">${esc(item.colorName)}</span>`
                : ''
            }
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #222;text-align:center;">${esc(item.quantity)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #222;text-align:right;">৳${money(
            Number(item.price) * Number(item.quantity),
          )}</td>
        </tr>`,
    )
    .join('');

  const isPickup = order.fulfillment_type === 'pickup';

  const fulfillmentBlock = isPickup
    ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;border:1px solid #222;">
              <tr>
                <td style="background:#111111;padding:16px 20px;">
                  <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#666;">Pickup Location</p>
                  <p style="margin:0;font-size:14px;color:#e5e5e5;line-height:1.6;">
                    Mirpur DOHS, Dhaka
                  </p>
                </td>
              </tr>
            </table>`
    : `
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;border:1px solid #222;">
              <tr>
                <td style="background:#111111;padding:16px 20px;">
                  <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#666;">Delivery Address</p>
                  <p style="margin:0;font-size:14px;color:#e5e5e5;line-height:1.6;">
                    ${[order.address, order.area, order.district].filter(Boolean).map(esc).join(', ')}
                  </p>
                </td>
              </tr>
            </table>`;

  const noticeText = isPickup
    ? "We'll call you to confirm the exact address and a convenient pickup time. Payment is cash on pickup."
    : "We'll call you before delivery to confirm your order and arrange a convenient time. Payment is cash on delivery.";

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080808;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#e5e5e5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#111111;border-top:4px solid #ff5500;padding:40px 40px 32px;text-align:center;">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:#ff5500;">
              Precision 3D Printing · Bangladesh
            </p>
            <h1 style="margin:0;font-size:36px;font-weight:900;letter-spacing:-0.02em;color:#ffffff;text-transform:uppercase;">
              LAYERCADE
            </h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#161616;padding:40px;">

            <h2 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#ffffff;text-transform:uppercase;">
              Order Confirmed!
            </h2>
            <p style="margin:0 0 32px;font-size:13px;color:#888;">
              Hi ${esc(order.customer_name)}, your order has been placed successfully.
            </p>

            <!-- Order ID banner -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td style="background:#111111;border-left:4px solid #ff5500;padding:16px 20px;">
                  <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#666;">Order ID</p>
                  <p style="margin:0;font-size:24px;font-weight:900;color:#ff5500;">#ORD-${esc(order.id)}</p>
                </td>
              </tr>
            </table>

            <!-- Items table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #222;">
              <thead>
                <tr style="background:#111111;">
                  <th style="padding:10px 12px;text-align:left;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#666;font-weight:normal;">Item</th>
                  <th style="padding:10px 12px;text-align:center;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#666;font-weight:normal;">Qty</th>
                  <th style="padding:10px 12px;text-align:right;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#666;font-weight:normal;">Price</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>

            <!-- Totals -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#888;">${isPickup ? 'Pickup' : 'Delivery Fee'}</td>
                <td style="padding:6px 0;font-size:13px;color:#888;text-align:right;">${
                  isPickup ? 'Free' : `৳${money(order.delivery_fee)}`
                }</td>
              </tr>
              <tr>
                <td style="padding:10px 0 0;font-size:20px;font-weight:900;color:#ffffff;text-transform:uppercase;border-top:1px solid #333;">Total (COD)</td>
                <td style="padding:10px 0 0;font-size:20px;font-weight:900;color:#ff5500;text-align:right;border-top:1px solid #333;">৳${money(
                  order.total_amount,
                )}</td>
              </tr>
            </table>
${fulfillmentBlock}
            <!-- Notice -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#ff5500;background:rgba(255,85,0,0.08);border:1px solid rgba(255,85,0,0.25);padding:16px 20px;">
                  <p style="margin:0;font-size:13px;color:#ccc;line-height:1.6;">
                    ${noticeText}
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#111111;padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:#444;">
              Layercade · Dhaka, Bangladesh
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ─── Handler ────────────────────────────────────────────────────────────── */

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const cors = corsHeaders(origin);
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  // Blocks browser-based abuse from other sites. A non-browser client can spoof
  // or omit Origin, so this is not the real defence — that is the fact that the
  // recipient and body come from the database row, never from the request.
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json({ error: 'Origin not allowed' }, 403);
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    // Accept { orderId } — the whole point is that nothing else is trusted.
    const orderId = body?.orderId ?? body?.order?.id;

    if (orderId === undefined || orderId === null || orderId === '') {
      return json({ error: 'Missing orderId' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendKey = Deno.env.get('RESEND_API_KEY');

    if (!supabaseUrl || !serviceRoleKey || !resendKey) {
      console.error('Missing required environment configuration');
      return json({ error: 'Server misconfigured' }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: order, error: dbError } = await supabase
      .from('orders')
      .select(
        'id, customer_name, email, items, total_amount, delivery_fee, fulfillment_type, address, area, district',
      )
      .eq('id', orderId)
      .maybeSingle<Order>();

    if (dbError) {
      console.error('Order lookup failed:', dbError.message);
      return json({ error: 'Order lookup failed' }, 500);
    }

    if (!order) {
      return json({ error: 'Order not found' }, 404);
    }

    if (!order.email) {
      return json({ error: 'Order has no email address' }, 422);
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Layercade <sales@layercade.com>',
        to: order.email,
        reply_to: 'sales@layercade.com',
        subject: `Order Confirmed — #ORD-${order.id} · Layercade`,
        html: renderEmail(order),
      }),
    });

    if (!resendRes.ok) {
      // Log the provider detail; don't leak it to the caller.
      console.error('Resend error:', await resendRes.text());
      return json({ error: 'Failed to send email' }, 502);
    }

    return json({ ok: true }, 200);
  } catch (err) {
    console.error('Unexpected error:', err);
    return json({ error: 'Internal error' }, 500);
  }
});
