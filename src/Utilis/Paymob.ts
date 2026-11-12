import { createHmac, timingSafeEqual } from "crypto";
import { AppError } from "./AppError";

// Paymob (Egypt) with the Intention API + Unified Checkout:
// 1. the server creates an "intention" (amount, items, customer) and gets a client_secret,
// 2. the customer pays on Paymob's hosted page: /unifiedcheckout/?publicKey=…&clientSecret=…,
// 3. Paymob POSTs the transaction to our webhook, signed with an HMAC we must check.

export function paymobConfig() {
    return {
        baseUrl: (process.env.PAYMOB_BASE_URL || "https://accept.paymob.com").replace(/\/$/, ""),
        secretKey: process.env.PAYMOB_SECRET_KEY || "",
        publicKey: process.env.PAYMOB_PUBLIC_KEY || "",
        hmacSecret: process.env.PAYMOB_HMAC_SECRET || "",
        integrationIds: (process.env.PAYMOB_INTEGRATION_IDS || "")
            .split(",").map((s) => s.trim()).filter(Boolean).map((s) => (/^\d+$/.test(s) ? Number(s) : s)),
        currency: process.env.PAYMOB_CURRENCY || "EGP",
    };
}

export function isPaymobConfigured() {
    const c = paymobConfig();
    return Boolean(c.secretKey && c.publicKey && c.hmacSecret && c.integrationIds.length);
}

export type IntentionInput = {
    amountCents: number;
    items: { name: string; amount: number; quantity: number }[];
    billing: { first_name: string; last_name: string; email: string; phone_number: string; street?: string };
    specialReference: string;
    notificationUrl: string;
    redirectionUrl: string;
};

export type Intention = { id: string; client_secret: string; intention_order_id: number };

async function paymobFetch(path: string, body: unknown) {
    const c = paymobConfig();
    let res: Response;
    try {
        res = await fetch(`${c.baseUrl}${path}`, {
            method: "POST",
            headers: { Authorization: `Token ${c.secretKey}`, "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(15_000),
        });
    } catch (err) {
        console.error(`Paymob ${path} unreachable:`, (err as Error).message);
        throw new AppError(502, "The payment provider is unavailable, please try again");
    }
    const text = await res.text();
    if (!res.ok) {
        console.error(`Paymob ${path} responded ${res.status}: ${text}`);
        throw new AppError(502, "The payment provider refused the request, please try again");
    }
    return text ? JSON.parse(text) : {};
}

export async function createIntention(input: IntentionInput): Promise<Intention> {
    const c = paymobConfig();
    const data = await paymobFetch("/v1/intention/", {
        amount: input.amountCents,
        currency: c.currency,
        payment_methods: c.integrationIds,
        items: input.items,
        billing_data: {
            apartment: "NA", floor: "NA", building: "NA", city: "NA", state: "NA", country: "EG", postal_code: "NA",
            street: input.billing.street || "NA",
            first_name: input.billing.first_name,
            last_name: input.billing.last_name,
            email: input.billing.email,
            phone_number: input.billing.phone_number,
        },
        special_reference: input.specialReference,
        notification_url: input.notificationUrl,
        redirection_url: input.redirectionUrl,
    });
    if (!data.client_secret || !data.intention_order_id) {
        console.error("Paymob intention without client_secret:", data);
        throw new AppError(502, "The payment provider sent an unexpected answer");
    }
    return { id: String(data.id), client_secret: data.client_secret, intention_order_id: Number(data.intention_order_id) };
}

export function checkoutUrl(clientSecret: string) {
    const c = paymobConfig();
    return `${c.baseUrl}/unifiedcheckout/?publicKey=${encodeURIComponent(c.publicKey)}&clientSecret=${encodeURIComponent(clientSecret)}`;
}

export async function refundTransaction(transactionId: number, amountCents: number) {
    return paymobFetch("/api/acceptance/void_refund/refund", { transaction_id: transactionId, amount_cents: amountCents });
}

// ---------- HMAC ----------

// Paymob's documented order. The POST (webhook) body nests them under `obj`
// (order.id, source_data.pan, …); the GET redirect flattens them (`id`, `order`, `source_data.pan`).
const HMAC_FIELDS = [
    "amount_cents", "created_at", "currency", "error_occured", "has_parent_transaction", "id",
    "integration_id", "is_3d_secure", "is_auth", "is_capture", "is_refunded", "is_standalone_payment",
    "is_voided", "order.id", "owner", "pending", "source_data.pan", "source_data.sub_type", "source_data.type", "success",
];

const getPath = (obj: any, path: string) => path.split(".").reduce((v, k) => (v == null ? undefined : v[k]), obj);

function hmacString(values: (unknown)[]) {
    return values.map((v) => (v === undefined || v === null ? "" : String(v))).join("");
}

export function signTransaction(values: unknown[], secret = paymobConfig().hmacSecret) {
    return createHmac("sha512", secret).update(hmacString(values)).digest("hex");
}

// The webhook's `obj` (nested keys).
export function transactionHmacValues(obj: any) {
    return HMAC_FIELDS.map((f) => getPath(obj, f));
}

// The redirect's query string (flat keys; the order id is sent as `order`).
export function redirectHmacValues(query: Record<string, any>) {
    return HMAC_FIELDS.map((f) => (f === "order.id" ? query.order : query[f]));
}

export function isValidHmac(values: unknown[], received: unknown) {
    const secret = paymobConfig().hmacSecret;
    if (!secret || typeof received !== "string" || !/^[0-9a-f]{128}$/i.test(received)) return false;
    const expected = Buffer.from(signTransaction(values, secret), "hex");
    return timingSafeEqual(expected, Buffer.from(received, "hex"));
}
