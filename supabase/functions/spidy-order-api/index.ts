import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY") ?? "";

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

async function getQuote(branchId: string, address: string, distanceKm: number) {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Server configuration is incomplete.");
  if (!isUuid(branchId)) throw new Error("Please select a valid store location.");
  const cleanAddress = address.trim();
  if (cleanAddress.length < 10) throw new Error("Please enter the full address, including area and PIN code.");
  if (cleanAddress.length > 500) throw new Error("The delivery address is too long.");
  if (!Number.isFinite(distanceKm) || distanceKm <= 0 || distanceKm > 300) {
    throw new Error("Enter the driving distance shown in Google Maps, between 0.1 and 300 km.");
  }

  const branch = await getBranch(branchId);
  if (!branch.delivery_enabled) throw new Error("Delivery is not available from this store location.");
  if (!(await deliveryAllowed())) throw new Error("Delivery is currently unavailable. Please choose takeaway.");

  // No Google Routes API call is made. The customer enters the driving distance
  // they can see in the regular Google Maps app, so no billing-enabled API key is needed.
  const distanceMeters = Math.round(distanceKm * 1000);
  return {
    branchId: branch.id,
    branchName: branch.name,
    distanceMeters,
    distanceKm: distanceMeters / 1000,
    deliveryCharge: deliveryFeeFromMeters(distanceMeters),
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
  if (action === "quote") {
    try {
      const branchId = body.branchId;
      const address = body.address;
      const distanceKm = Number(body.distanceKm);
      if (typeof address !== "string") throw new Error("Please enter your delivery address.");
      const quote = await getQuote(String(branchId ?? ""), address, distanceKm);
      return json({
        ok: true,
        branchId: quote.branchId,
        branchName: quote.branchName,
        distanceKm: quote.distanceKm,
        deliveryCharge: quote.deliveryCharge,
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
    const distanceKm = Number(body.distanceKm);
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";
    const items = body.items;

    if (kind !== "pickup" && kind !== "delivery") throw new Error("Please choose takeaway or delivery.");
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
      quote = await getQuote(branchId, address, distanceKm);
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
      p_payment_method: kind === "pickup" ? "cash_on_pickup" : "cash_on_delivery",
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

    return json({
      ok: true,
      ...result,
      distance_meters: quote?.distanceMeters ?? null,
      delivery_distance_km: quote?.distanceKm ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "We could not record this order. Please retry.";
    return json({ ok: false, message }, 400);
  }
});
