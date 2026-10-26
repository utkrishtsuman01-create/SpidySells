import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const GEOAPIFY_API_KEY_RAW = Deno.env.get("GEOAPIFY_API_KEY") ?? "";
const GEOAPIFY_API_KEY = GEOAPIFY_API_KEY_RAW.trim();

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
      // Use the clear error below if the environment does not contain a usable key.
    }
  }
  throw new Error("Supabase server key is not configured for this function.");
}

const SERVICE_KEY = getServiceRoleKey();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};


const RAZORPAY_KEY_ID = (Deno.env.get("RAZORPAY_KEY_ID") ?? "").trim();
const RAZORPAY_KEY_SECRET = (Deno.env.get("RAZORPAY_KEY_SECRET") ?? "").trim();

function requireRazorpayCredentials() {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    console.error("Live Razorpay credentials are missing from Supabase Edge Function secrets.");
    throw new Error("Online payments are not available just yet. Please choose another payment method or contact the store.");
  }
}

function razorpayAuthorization() {
  requireRazorpayCredentials();
  return `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`;
}

async function razorpayRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    ...init,
    headers: {
      Authorization: razorpayAuthorization(),
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("Razorpay API request failed", {
      path,
      status: response.status,
      code: payload?.error?.code,
    });
    if (response.status === 401) {
      throw new Error("Razorpay rejected the configured API keys. Check that the live Key ID and Key Secret match.");
    }
    throw new Error("Razorpay could not complete the payment request. Please retry or contact the store.");
  }
  return payload;
}

async function patchOrder(orderId: string, values: Record<string, unknown>) {
  const response = await dbRequest(`orders?id=eq.${encodeURIComponent(orderId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(values),
  });
  const rows = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(rows) || rows.length !== 1) {
    console.error("Order payment update failed", { orderId, status: response.status });
    throw new Error("We couldn't update the order after the payment step. Please contact the store.");
  }
  return rows[0];
}

async function findOrderByRazorpayOrderId(razorpayOrderId: string) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/orders`);
  url.searchParams.set("select", "id,order_reference,total,status,payment_method,payment_status,razorpay_order_id,razorpay_payment_id");
  url.searchParams.set("razorpay_order_id", `eq.${razorpayOrderId}`);
  url.searchParams.set("limit", "1");
  const response = await dbRequest(url.pathname.replace("/rest/v1/", "") + url.search);
  const rows = await response.json().catch(() => null);
  if (!response.ok) throw new Error("We couldn't look up this order. Please contact the store.");
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

async function getExpectedRazorpaySignature(razorpayOrderId: string, razorpayPaymentId: string) {
  requireRazorpayCredentials();
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(RAZORPAY_KEY_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(`${razorpayOrderId}|${razorpayPaymentId}`),
  );
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeSignatureEquals(expected: string, received: string) {
  if (expected.length !== received.length) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i++) {
    difference |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  }
  return difference === 0;
}

async function verifyRazorpayPayment(body: Record<string, unknown>) {
  requireRazorpayCredentials();
  const razorpayOrderId = typeof body.razorpay_order_id === "string" ? body.razorpay_order_id.trim() : "";
  const razorpayPaymentId = typeof body.razorpay_payment_id === "string" ? body.razorpay_payment_id.trim() : "";
  const receivedSignature = typeof body.razorpay_signature === "string" ? body.razorpay_signature.trim().toLowerCase() : "";
  if (!/^order_[A-Za-z0-9]+$/.test(razorpayOrderId) || !/^pay_[A-Za-z0-9]+$/.test(razorpayPaymentId) || !/^[a-f0-9]{64}$/.test(receivedSignature)) {
    throw new Error("Razorpay returned an incomplete payment response. Do not retry the payment yet; contact the store if money was debited.");
  }

  const order = await findOrderByRazorpayOrderId(razorpayOrderId);
  if (!order) throw new Error("We couldn't match this Razorpay payment to a Spidy Sells order.");
  const expectedPaise = Math.round(Number(order.total) * 100);
  if (!Number.isSafeInteger(expectedPaise) || expectedPaise <= 0) {
    throw new Error("This order has an invalid amount. Please contact the store.");
  }

  const expectedSignature = await getExpectedRazorpaySignature(razorpayOrderId, razorpayPaymentId);
  if (!safeSignatureEquals(expectedSignature, receivedSignature)) {
    throw new Error("Payment verification failed. The store has not marked this order as paid.");
  }

  let payment = await razorpayRequest(`payments/${encodeURIComponent(razorpayPaymentId)}`);
  if (payment?.order_id !== razorpayOrderId || Number(payment?.amount) !== expectedPaise || payment?.currency !== "INR") {
    throw new Error("The payment details do not match this order. Please contact the store before trying again.");
  }

  if (payment.status === "authorized") {
    try {
      payment = await razorpayRequest(`payments/${encodeURIComponent(razorpayPaymentId)}/capture`, {
        method: "POST",
        body: JSON.stringify({ amount: expectedPaise, currency: "INR" }),
      });
    } catch {
      // An auto-capture setting or retry may race this request. Re-fetch the payment
      // and accept it only if Razorpay confirms that it is captured.
      payment = await razorpayRequest(`payments/${encodeURIComponent(razorpayPaymentId)}`);
    }
  }

  if (payment.status !== "captured") {
    throw new Error("Razorpay has not confirmed a captured payment yet. Your order is not confirmed; contact the store if money was debited.");
  }
  if (order.payment_status === "paid" && order.razorpay_payment_id && order.razorpay_payment_id !== razorpayPaymentId) {
    throw new Error("This order has already been paid using a different payment. Please contact the store.");
  }

  const previousStatus = order.status;
  const updated = await patchOrder(order.id, {
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
    }).catch(() => undefined);
  }

  return {
    ok: true,
    id: updated.id,
    order_reference: updated.order_reference,
    total: updated.total,
    status: updated.status,
    payment_method: updated.payment_method,
    payment_status: updated.payment_status,
    razorpay_payment_id: updated.razorpay_payment_id,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function dbRequest(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

async function getBranch(branchId: string) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/branches`);
  url.searchParams.set("id", `eq.${branchId}`);
  url.searchParams.set("select", "id,name,address,active,delivery_enabled,takeaway_enabled");
  url.searchParams.set("limit", "1");
  const response = await dbRequest(url.pathname.replace("/rest/v1/", "") + url.search);
  if (!response.ok) throw new Error("Could not verify the selected store location.");
  const rows = await response.json();
  const branch = rows?.[0];
  if (!branch || !branch.active) throw new Error("This store location is unavailable.");
  return branch;
}

async function deliveryAllowed(): Promise<boolean> {
  const url = new URL(`${SUPABASE_URL}/rest/v1/business_settings`);
  url.searchParams.set("select", "delivery_enabled");
  url.searchParams.set("delivery_enabled", "eq.true");
  url.searchParams.set("limit", "1");
  const response = await dbRequest(url.pathname.replace("/rest/v1/", "") + url.search);
  if (!response.ok) throw new Error("Could not verify delivery settings.");
  const rows = await response.json();
  return rows.length > 0;
}

function deliveryFeeFromMeters(distanceMeters: number): number {
  if (distanceMeters <= 10_000) return 60;
  if (distanceMeters <= 20_000) return 90;
  return 90 + Math.ceil((distanceMeters - 20_000) / 1_000) * 3;
}

function normalizePostcode(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function haversineMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLon = radians(b.lon - a.lon);
  const lat1 = radians(a.lat);
  const lat2 = radians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

function geocodeScore(result: any): number {
  const rank = result?.rank ?? {};
  const matchPriority: Record<string, number> = {
    full_match: 5,
    match_by_building: 4,
    inner_part: 3,
    match_by_street: 2,
    match_by_postcode: 1,
    match_by_city_or_district: 0,
  };
  return (matchPriority[String(rank.match_type ?? "")] ?? 0) * 10
    + Number(rank.confidence ?? 0) * 2
    + Number(rank.confidence_street_level ?? 0)
    + Number(rank.confidence_building_level ?? 0);
}

async function geocodeAddress(
  address: string,
  bias?: { lat: number; lon: number },
  expectedPostcode?: string,
) {
  const url = new URL("https://api.geoapify.com/v1/geocode/search");
  url.searchParams.set("text", address);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "10");
  url.searchParams.set("filter", "countrycode:in");
  url.searchParams.set("lang", "en");
  if (bias) url.searchParams.set("bias", `proximity:${bias.lon},${bias.lat}`);
  url.searchParams.set("apiKey", GEOAPIFY_API_KEY);

  const response = await fetch(url);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const details = typeof payload?.message === "string" ? payload.message : `HTTP ${response.status}`;
    console.error("Geoapify geocoding failed", response.status, details);
    if (response.status === 401) {
      console.error("Geoapify auth diagnostics (key value omitted)", {
        configured: GEOAPIFY_API_KEY.length > 0,
        length: GEOAPIFY_API_KEY.length,
        surroundingWhitespaceWasTrimmed: GEOAPIFY_API_KEY_RAW !== GEOAPIFY_API_KEY,
      });
      throw new Error("Geoapify rejected the server's configured API credential (401). This is not an address problem. The server has recorded safe diagnostics without exposing the key.");
    }
    if (response.status === 403) {
      throw new Error("Geoapify denied the geocoding request. Check the API key restrictions in the Geoapify dashboard.");
    }
    throw new Error("The address lookup service returned an error. Please try again shortly.");
  }

  let candidates = (Array.isArray(payload?.results) ? payload.results : []).filter((match: any) =>
    Number.isFinite(Number(match?.lat)) && Number.isFinite(Number(match?.lon))
  );
  let postcodeFallback = false;
  if (expectedPostcode) {
    const postcodeMatches = candidates.filter((match: any) =>
      normalizePostcode(match?.postcode) === expectedPostcode
    );
    if (postcodeMatches.length) {
      candidates = postcodeMatches;
    } else {
      // Geoapify sometimes finds the correct address but omits its postcode from
      // the free-form result. In that case, resolve the PIN code as its own
      // structured search rather than failing or accepting a mismatched result.
      const postcodeUrl = new URL("https://api.geoapify.com/v1/geocode/search");
      postcodeUrl.searchParams.set("postcode", expectedPostcode);
      postcodeUrl.searchParams.set("country", "India");
      postcodeUrl.searchParams.set("type", "postcode");
      postcodeUrl.searchParams.set("format", "json");
      postcodeUrl.searchParams.set("limit", "3");
      postcodeUrl.searchParams.set("filter", "countrycode:in");
      if (bias) postcodeUrl.searchParams.set("bias", `proximity:${bias.lon},${bias.lat}`);
      postcodeUrl.searchParams.set("apiKey", GEOAPIFY_API_KEY);

      const postcodeResponse = await fetch(postcodeUrl);
      const postcodePayload = await postcodeResponse.json().catch(() => null);
      if (!postcodeResponse.ok) {
        console.error("Geoapify postcode lookup failed", postcodeResponse.status);
        throw new Error("We couldn't verify that PIN code. Please check it and try again.");
      }

      const postcodeResults = (Array.isArray(postcodePayload?.results) ? postcodePayload.results : [])
        .filter((match: any) =>
          Number.isFinite(Number(match?.lat)) &&
          Number.isFinite(Number(match?.lon)) &&
          normalizePostcode(match?.postcode) === expectedPostcode
        );

      if (!postcodeResults.length) {
        throw new Error(`Geoapify couldn't resolve PIN code ${expectedPostcode}. Please check the six-digit PIN code or add a nearby landmark.`);
      }
      postcodeResults.sort((a: any, b: any) => geocodeScore(b) - geocodeScore(a));
      const postcodeResult = postcodeResults[0];
      return {
        lat: Number(postcodeResult.lat),
        lon: Number(postcodeResult.lon),
        confidence: Number(postcodeResult?.rank?.confidence ?? 0),
        postcode: normalizePostcode(postcodeResult?.postcode),
        matchType: "postcode_fallback",
        postcodeFallback: true,
      };
    }
  }

  if (!candidates.length) {
    throw new Error("We could not locate that address. Add the street, area, city and PIN code.");
  }

  candidates.sort((a: any, b: any) => {
    const scoreDifference = geocodeScore(b) - geocodeScore(a);
    if (Math.abs(scoreDifference) > 0.25) return scoreDifference;
    if (bias) {
      return haversineMeters(bias, { lat: Number(a.lat), lon: Number(a.lon) })
        - haversineMeters(bias, { lat: Number(b.lat), lon: Number(b.lon) });
    }
    return 0;
  });

  const match = candidates[0];
  return {
    lat: Number(match.lat),
    lon: Number(match.lon),
    confidence: Number(match?.rank?.confidence ?? 0),
    postcode: normalizePostcode(match?.postcode),
    matchType: String(match?.rank?.match_type ?? "unknown"),
    postcodeFallback,
  };
}

async function getQuote(branchId: string, address: string) {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Server configuration is incomplete.");
  if (!GEOAPIFY_API_KEY) throw new Error("Free delivery routing is not configured yet. The store owner needs to add GEOAPIFY_API_KEY in Supabase secrets.");
  if (!isUuid(branchId)) throw new Error("Please select a valid store location.");
  const cleanAddress = address.trim();
  if (cleanAddress.length < 10) throw new Error("Please enter the full address, including area and PIN code.");
  if (cleanAddress.length > 500) throw new Error("The delivery address is too long.");

  const branch = await getBranch(branchId);
  if (!branch.delivery_enabled) throw new Error("Delivery is not available from this store location.");
  if (!(await deliveryAllowed())) throw new Error("Delivery is currently unavailable. Please choose takeaway.");

  // The branch address already contains its locality/city/state; avoid duplicating it,
  // because that can make geocoding match an unintended place.
  const origin = await geocodeAddress(branch.address);
  const destinationQuery = `${cleanAddress}, West Bengal, India`;
  const postcodeMatch = cleanAddress.match(/\b([1-9]\d{5})\b/);
  const destination = await geocodeAddress(destinationQuery, origin, postcodeMatch?.[1]);

  const routeUrl = new URL("https://api.geoapify.com/v1/routing");
  routeUrl.searchParams.set("waypoints", `${origin.lat},${origin.lon}|${destination.lat},${destination.lon}`);
  routeUrl.searchParams.set("mode", "drive");
  routeUrl.searchParams.set("format", "json");
  routeUrl.searchParams.set("units", "metric");
  routeUrl.searchParams.set("apiKey", GEOAPIFY_API_KEY);

  const routeResponse = await fetch(routeUrl);
  const routePayload = await routeResponse.json().catch(() => null);
  if (!routeResponse.ok) {
    const details = typeof routePayload?.message === "string" ? routePayload.message : `HTTP ${routeResponse.status}`;
    console.error("Geoapify routing failed", routeResponse.status, details);
    if (routeResponse.status === 401) {
      console.error("Geoapify auth diagnostics (key value omitted)", {
        configured: GEOAPIFY_API_KEY.length > 0,
        length: GEOAPIFY_API_KEY.length,
        surroundingWhitespaceWasTrimmed: GEOAPIFY_API_KEY_RAW !== GEOAPIFY_API_KEY,
      });
      throw new Error("Geoapify rejected the server's configured API credential (401). This is not an address problem. The server has recorded safe diagnostics without exposing the key.");
    }
    if (routeResponse.status === 403) {
      throw new Error("Geoapify denied the routing request. Check the API key restrictions in the Geoapify dashboard.");
    }
    throw new Error("The driving-route service returned an error. Please try again shortly.");
  }

  const distanceMeters = Number(routePayload?.results?.[0]?.distance);
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    throw new Error("No driving route was found for that address. Please add a nearby landmark or PIN code.");
  }

  // Catch obviously mismatched geocoding results before quoting a wildly inflated route.
  const straightLineMeters = haversineMeters(origin, destination);
  const plausibleRouteLimitMeters = Math.max(straightLineMeters * 3.5, straightLineMeters + 12_000);
  if (distanceMeters > plausibleRouteLimitMeters) {
    console.error("Geoapify route rejected as implausible", {
      routeKm: Math.round(distanceMeters / 100) / 10,
      straightLineKm: Math.round(straightLineMeters / 100) / 10,
      ratio: Number((distanceMeters / Math.max(straightLineMeters, 1)).toFixed(2)),
      originMatchType: origin.matchType,
      destinationMatchType: destination.matchType,
      postcodeMatched: Boolean(postcodeMatch),
    });
    throw new Error("The address lookup produced an unusually long route, so we haven't applied a potentially incorrect delivery charge. Please check the PIN code and locality, then try again.");
  }

  return {
    branchId: branch.id,
    branchName: branch.name,
    distanceMeters,
    distanceKm: distanceMeters / 1000,
    deliveryCharge: deliveryFeeFromMeters(distanceMeters),
    distanceApproximate: Boolean(destination.postcodeFallback),
  };
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, message: "Use POST for this request." }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, message: "Request body must be valid JSON." }, 400);
  }

  const action = body.action;
  if (action === "verify_razorpay_payment") {
    try {
      return json(await verifyRazorpayPayment(body));
    } catch (error) {
      return json({
        ok: false,
        message: error instanceof Error ? error.message : "We couldn't verify the payment. Please contact the store.",
      }, 400);
    }
  }

  if (action === "quote") {
    try {
      const branchId = body.branchId;
      const address = body.address;
      if (typeof address !== "string") throw new Error("Please enter your delivery address.");
      const quote = await getQuote(String(branchId ?? ""), address);
      return json({
        ok: true,
        branchId: quote.branchId,
        branchName: quote.branchName,
        distanceKm: quote.distanceKm,
        deliveryCharge: quote.deliveryCharge,
        distanceApproximate: quote.distanceApproximate,
      });
    } catch (error) {
      return json({
        ok: false,
        message: error instanceof Error ? error.message : "Could not calculate the delivery charge.",
      });
    }
  }

  if (action !== "place_order") {
    return json({ ok: false, message: "Unknown action." }, 400);
  }

  try {
    const kind = body.kind;
    const branchId = body.branchId;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const address = typeof body.address === "string" ? body.address.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";
    const items = body.items;

    if (kind !== "pickup" && kind !== "delivery") throw new Error("Please choose takeaway or delivery.");
    const requestedPaymentMethod = body.paymentMethod;
    if (kind === "delivery" && requestedPaymentMethod !== "online") {
      throw new Error("Online delivery orders must be paid online. Cash on delivery is not available at any branch.");
    }
    if (kind === "pickup" && requestedPaymentMethod !== "online" && requestedPaymentMethod !== "cash_on_pickup") {
      throw new Error("Please choose a valid payment method for takeaway.");
    }
    if (requestedPaymentMethod === "online") requireRazorpayCredentials();
    if (!isUuid(branchId)) throw new Error("Please select a valid store location.");
    if (!name || name.length > 150) throw new Error("Please enter your name.");
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 8 || phoneDigits.length > 15) throw new Error("Please enter a valid phone number.");
    if (!Array.isArray(items) || items.length < 1 || items.length > 40) throw new Error("Your bag is empty or contains too many items.");

    const branch = await getBranch(branchId);
    let quote: Awaited<ReturnType<typeof getQuote>> | null = null;
    if (kind === "pickup") {
      if (!branch.takeaway_enabled) throw new Error("Takeaway is not available at this location.");
    } else {
      if (!address) throw new Error("Please enter your full delivery address.");
      quote = await getQuote(branchId, address);
    }

    const rpcParams = {
      p_order_type: kind === "pickup" ? "TAKEAWAY" : "ONLINE DELIVERY",
      p_customer_name: name,
      p_customer_phone: phone,
      p_delivery_address: kind === "delivery" ? address : null,
      p_branch_id: branchId,
      p_notes: notes || null,
      p_items: items,
      p_delivery_distance_km: quote?.distanceKm ?? null,
      p_delivery_charge: quote?.deliveryCharge ?? 0,
      p_payment_method: requestedPaymentMethod,
    };

    const response = await dbRequest("rpc/create_customer_order", {
      method: "POST",
      body: JSON.stringify(rpcParams),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      const message = typeof result?.message === "string"
        ? result.message
        : typeof result === "string"
          ? result
          : "We could not record this order. Please check your details and retry.";
      throw new Error(message);
    }

    if (requestedPaymentMethod === "online") {
      const internalOrderId = typeof result?.id === "string" ? result.id : "";
      const reference = typeof result?.order_reference === "string" ? result.order_reference : internalOrderId;
      const total = Number(result?.total);
      const amountPaise = Math.round(total * 100);
      if (!internalOrderId || !Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
        throw new Error("We couldn't prepare a valid order total for payment. Please contact the store.");
      }

      await patchOrder(internalOrderId, {
        status: "pending",
        payment_method: "online",
        payment_status: "pending",
        updated_at: new Date().toISOString(),
      });

      try {
        const razorpayOrder = await razorpayRequest("orders", {
          method: "POST",
          body: JSON.stringify({
            amount: amountPaise,
            currency: "INR",
            receipt: reference.slice(0, 40),
            notes: { order_reference: reference, spidy_order_id: internalOrderId },
          }),
        });
        if (typeof razorpayOrder?.id !== "string" || Number(razorpayOrder?.amount) !== amountPaise || razorpayOrder?.currency !== "INR") {
          throw new Error("Razorpay returned an invalid payment order. Please retry or contact the store.");
        }
        await patchOrder(internalOrderId, {
          razorpay_order_id: razorpayOrder.id,
          updated_at: new Date().toISOString(),
        });
        return json({
          ok: true,
          ...result,
          status: "pending",
          payment_method: "online",
          payment_status: "pending",
          razorpay_key_id: RAZORPAY_KEY_ID,
          razorpay_order_id: razorpayOrder.id,
          razorpay_amount: amountPaise,
          razorpay_currency: "INR",
          distance_meters: quote?.distanceMeters ?? null,
          delivery_distance_km: quote?.distanceKm ?? null,
          distance_approximate: quote?.distanceApproximate ?? false,
        });
      } catch (paymentError) {
        await patchOrder(internalOrderId, {
          status: "cancelled",
          payment_status: "failed",
          updated_at: new Date().toISOString(),
        }).catch(() => undefined);
        throw paymentError;
      }
    }

    return json({
      ok: true,
      ...result,
      distance_meters: quote?.distanceMeters ?? null,
      delivery_distance_km: quote?.distanceKm ?? null,
      distance_approximate: quote?.distanceApproximate ?? false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "We could not record this order. Please retry.";
    return json({ ok: false, message }, 400);
  }
});
