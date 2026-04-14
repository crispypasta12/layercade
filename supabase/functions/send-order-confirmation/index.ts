import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { order } = await req.json();

    if (!order?.email) {
      return new Response(
        JSON.stringify({ error: 'Missing order email' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const itemsHtml = (order.items ?? [])
      .map(
        (item: { name: string; quantity: number; price: number }) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #222;">${item.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #222;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #222;text-align:right;">৳${(item.price * item.quantity).toLocaleString('en-IN')}</td>
        </tr>`,
      )
      .join('');

    const html = `
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
              Hi ${order.customer_name}, your order has been placed successfully.
            </p>

            <!-- Order ID banner -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td style="background:#111111;border-left:4px solid #ff5500;padding:16px 20px;">
                  <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#666;">Order ID</p>
                  <p style="margin:0;font-size:24px;font-weight:900;color:#ff5500;">#ORD-${order.id}</p>
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
                <td style="padding:6px 0;font-size:13px;color:#888;">Delivery Fee</td>
                <td style="padding:6px 0;font-size:13px;color:#888;text-align:right;">৳${order.delivery_fee}</td>
              </tr>
              <tr>
                <td style="padding:10px 0 0;font-size:20px;font-weight:900;color:#ffffff;text-transform:uppercase;border-top:1px solid #333;">Total (COD)</td>
                <td style="padding:10px 0 0;font-size:20px;font-weight:900;color:#ff5500;text-align:right;border-top:1px solid #333;">৳${order.total_amount?.toLocaleString('en-IN')}</td>
              </tr>
            </table>

            <!-- Delivery address -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;border:1px solid #222;">
              <tr>
                <td style="background:#111111;padding:16px 20px;">
                  <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#666;">Delivery Address</p>
                  <p style="margin:0;font-size:14px;color:#e5e5e5;line-height:1.6;">
                    ${order.address}, ${order.area}, ${order.district}
                  </p>
                </td>
              </tr>
            </table>

            <!-- Notice -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#ff5500;background:rgba(255,85,0,0.08);border:1px solid rgba(255,85,0,0.25);padding:16px 20px;">
                  <p style="margin:0;font-size:13px;color:#ccc;line-height:1.6;">
                    We'll call you before delivery to confirm your order and arrange a convenient time. Payment is cash on delivery.
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

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'Layercade <sales@layercade.com>',
        to:      order.email,
        subject: `Order Confirmed — #ORD-${order.id} · Layercade`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error('Resend error:', errBody);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', detail: errBody }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
