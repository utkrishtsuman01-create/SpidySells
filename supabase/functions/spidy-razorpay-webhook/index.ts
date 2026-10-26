import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const RAZORPAY_WEBHOOK_SECRET = (Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "").trim();

function getServiceRoleKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const keys = JSON.parse(raw) as Record<string, string>;
      if (keys.default) return keys.default;
      if (keys.service_role) return keys.service_role;
    } catch {
      // Use the clear error below if the runtime has no usable server key.
    }
  }
  throw new Error("Supabase server key is not configured for this function.");
}
const SERVICE_KEY = getServiceRoleKey();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

async function dbRequest(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(SUPABASE_URL + "/rest/v1/" + path, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: "Bearer " + SERVICE_KEY,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

async function findOrder(razorpayOrderId: string) {
  const url = new URL(SUPABASE_URL + "/rest/v1/orders");
  url.searchParams.set("select", "id,order_reference,total,status,payment_status,razorpay_payment_id,razorpay_order_id");
  url.searchParams.set("razorpay_order_id", "eq." + razorpayOrderId);
  url.searchParams.set("limit", "1");
  const response = await dbRequest(url.pathname.replace("/rest/v1/", "") + url.search);
  const rows = await response.json().catch(() => null);
  if (!response.ok) throw new Error("Could not read the matching Spidy Sells order.");
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

async function patchOrder(orderId: string, values: Record<string, unknown>) {
  const response = await dbRequest("orders?id=eq." + encodeURIComponent(orderId), {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(values),
  });
  const rows = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(rows) || rows.length !== 1) {
    throw new Error("Could not update the matching Spidy Sells order.");
  }
  return rows[0];
}

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeEqualHex(expected: string, received: string) {
  if (!/^[a-f0-9]{64}$/.test(received) || expected.length !== received.length) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i++) {
    difference |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  }
  return difference === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok: false, message: "Use POST for this endpoint." }, 405);
  if (!RAZORPAY_WEBHOOK_SECRET) {
    console.error("Razorpay webhook secret is not configured.");
    return json({ ok: false, message: "Webhook secret is not configured." }, 500);
  }

  const receivedSignature = (req.headers.get("x-razorpay-signature") ?? "").trim().toLowerCase();
  const rawBody = await req.text();
  const expectedSignature = await hmacHex(RAZORPAY_WEBHOOK_SECRET, rawBody);
  if (!safeEqualHex(expectedSignature, receivedSignature)) {
    console.warn("Rejected Razorpay webhook with an invalid signature.");
    return json({ ok: false, message: "Invalid webhook signature." }, 401);
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, message: "Invalid JSON body." }, 400);
  }

  const payment = event?.payload?.payment?.entity;
  if (!payment || !["payment.captured", "payment.failed"].includes(String(event?.event ?? ""))) {
    return json({ ok: true, ignored: true });
  }

  const razorpayOrderId = typeof payment.order_id === "string" ? payment.order_id : "";
  const razorpayPaymentId = typeof payment.id === "string" ? payment.id : "";
  if (!/^order_[A-Za-z0-9]+$/.test(razorpayOrderId) || !/^pay_[A-Za-z0-9]+$/.test(razorpayPaymentId)) {
    return json({ ok: true, ignored: true });
  }

  try {
    const order = await findOrder(razorpayOrderId);
    if (!order) {
      console.error("Verified Razorpay webhook has no matching order yet.", { razorpayOrderId });
      return json({ ok: false, message: "Matching order not found yet." }, 500);
    }

    if (event.event === "payment.failed") {
      if (order.payment_status === "paid") return json({ ok: true, alreadyPaid: true });
      await patchOrder(order.id, {
        status: "cancelled",
        payment_method: "online",
        payment_status: "failed",
        updated_at: new Date().toISOString(),
      });
      return json({ ok: true, updated: "failed" });
    }

    const expectedPaise = Math.round(Number(order.total) * 100);
    if (payment.status !== "captured" || payment.currency !== "INR" || Number(payment.amount) !== expectedPaise) {
      console.error("Captured Razorpay payment did not match the expected order amount.", {
        razorpayOrderId,
        paymentStatus: payment.status,
        currency: payment.currency,
      });
      return json({ ok: false, message: "Payment details do not match the order." }, 400);
    }
    if (order.payment_status === "paid") {
      if (order.razorpay_payment_id === razorpayPaymentId) return json({ ok: true, duplicate: true });
      console.error("A second captured payment was reported for an already-paid order.", {
        orderReference: order.order_reference,
        razorpayOrderId,
      });
      return json({ ok: true, ignored: true, reason: "order_already_paid" });
    }

    const previousStatus = order.status;
    await patchOrder(order.id, {
      status: "confirmed",
      payment_method: "online",
      payment_status: "paid",
      razorpay_payment_id: razorpayPaymentId,
      updated_at: new Date().toISOString(),
    });
    if (previousStatus !== "confirmed") {
      await dbRequest("order_status_history", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ order_id: order.id, old_status: previousStatus, new_status: "confirmed" }),
      });
    }
    return json({ ok: true, updated: "paid", order_reference: order.order_reference });
  } catch (error) {
    console.error("Razorpay webhook processing failed.", error instanceof Error ? error.message : "Unknown error");
    return json({ ok: false, message: "Could not process this payment notification." }, 500);
  }
});
