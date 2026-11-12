import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Order from "../src/models/Order";
import Payment from "../src/models/Payment";
import { signTransaction, transactionHmacValues, redirectHmacValues } from "../src/Utilis/Paymob";
import { expireUnpaidOrders, PAYMENT_WINDOW_MS } from "../src/services/PaymentService";
import { api, auth, createItem, createRestaurant, createUser, mailer, ownerOf, resetDb } from "./helpers";

// Paymob is never called for real: fetch is replaced, and every call is recorded.
let paymobCalls: { url: string; body: any; headers: any }[] = [];
let nextIntention = 1;
let refundShouldFail = false;
const realFetch = globalThis.fetch;

beforeEach(async () => {
  await resetDb();
  paymobCalls = [];
  refundShouldFail = false;
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: any) => {
    if (!String(url).startsWith("https://accept.paymob.test")) return realFetch(url, init);
    const body = JSON.parse(init.body);
    paymobCalls.push({ url: String(url), body, headers: init.headers });
    if (String(url).endsWith("/v1/intention/")) {
      const n = nextIntention++;
      return new Response(JSON.stringify({ id: `pi_test_${n}`, client_secret: `egy_csk_test_${n}`, intention_order_id: 900000 + n }), { status: 201 });
    }
    if (String(url).endsWith("/void_refund/refund")) {
      return refundShouldFail ? new Response("nope", { status: 400 }) : new Response(JSON.stringify({ id: 777, success: true }), { status: 200 });
    }
    return new Response("not found", { status: 404 });
  }));
});
afterEach(() => vi.unstubAllGlobals());

async function cardOrder() {
  const customer = await createUser("user", { name: "Sara Ali" });
  const restaurant = await createRestaurant({ delivery_fee: 15 });
  const owner = await ownerOf(restaurant);
  const item = await createItem(restaurant, { name: "Koshary", price: 52.5 });
  const res = await api().post("/api/orders/createOrder").set(auth(customer)).send({
    restaurant_id: restaurant._id, address: "12 Nile St", payment_method: "card", phone: "01012345678",
    items: [{ item_id: item._id, quantity: 2 }],
  });
  return { customer, restaurant, owner, item, res };
}

// A Paymob "transaction processed" webhook body, as Paymob sends it.
function transaction(payment: any, overrides: Record<string, any> = {}) {
  return {
    id: 5550000 + Math.floor(Math.random() * 1000),
    amount_cents: payment.amount_cents,
    created_at: "2026-11-12T12:00:00.000000",
    currency: "EGP",
    error_occured: false,
    has_parent_transaction: false,
    integration_id: 123456,
    is_3d_secure: true,
    is_auth: false,
    is_capture: false,
    is_refunded: false,
    is_standalone_payment: true,
    is_voided: false,
    order: { id: payment.paymob_order_id, merchant_order_id: String(payment._id) },
    owner: 42,
    pending: false,
    source_data: { pan: "2346", sub_type: "MasterCard", type: "card" },
    success: true,
    data: { message: "Approved" },
    ...overrides,
  };
}

function webhook(obj: any, hmac = signTransaction(transactionHmacValues(obj), "test-hmac-secret")) {
  return api().post(`/api/payments/paymob/webhook?hmac=${hmac}`).send({ type: "TRANSACTION", obj });
}

describe("card orders", () => {
  it("creates the order as awaiting_payment and returns a Paymob checkout link", async () => {
    const { res } = await cardOrder();
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("awaiting_payment");
    expect(res.body.data.payment_status).toBe(false);
    expect(res.body.payment.checkout_url).toBe("https://accept.paymob.test/unifiedcheckout/?publicKey=egy_pk_test_fake&clientSecret=egy_csk_test_" + (nextIntention - 1));
    expect(res.body.payment.amount_cents).toBe(2 * 5250 + 1500);

    const [call] = paymobCalls;
    expect(call.headers.Authorization).toBe("Token egy_sk_test_fake");
    expect(call.body).toMatchObject({
      amount: 12000, currency: "EGP", payment_methods: [123456],
      notification_url: "https://api.example.test/api/payments/paymob/webhook",
      redirection_url: "https://api.example.test/api/payments/paymob/return",
    });
    // Paymob checks the items add up to the amount.
    expect(call.body.items.reduce((s: number, i: any) => s + i.amount * i.quantity, 0)).toBe(call.body.amount);
    expect(call.body.billing_data).toMatchObject({ first_name: "Sara", last_name: "Ali", phone_number: "+201012345678" });

    // No receipt email yet: nothing is paid.
    expect(mailer.sendOrderConfirmationEmail).not.toHaveBeenCalled();
  });

  it("needs an Egyptian mobile number", async () => {
    const customer = await createUser();
    const restaurant = await createRestaurant();
    const item = await createItem(restaurant);
    const res = await api().post("/api/orders/createOrder").set(auth(customer)).send({
      restaurant_id: restaurant._id, address: "Home", payment_method: "card", phone: "12345", items: [{ item_id: item._id, quantity: 1 }],
    });
    expect(res.status).toBe(422);
    expect(paymobCalls).toHaveLength(0);
  });

  it("doesn't keep the order if Paymob is down", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));
    const { res } = await cardOrder();
    expect(res.status).toBe(502);
    expect(await Order.countDocuments()).toBe(0);
    expect(await Payment.countDocuments()).toBe(0);
  });

  it("the restaurant doesn't see or touch an unpaid order", async () => {
    const { owner, res } = await cardOrder();
    const list = await api().get("/api/my-restaurant/orders").set(auth(owner));
    expect(list.body.data).toHaveLength(0);
    const accept = await api().patch(`/api/orders/${res.body.data._id}/status`).set(auth(owner)).send({ status: "accepted" });
    expect(accept.status).toBe(409);
  });
});

describe("Paymob webhook", () => {
  it("a successful payment sends the order to the restaurant and emails the receipt", async () => {
    const { owner, res } = await cardOrder();
    const payment = await Payment.findById(res.body.payment.payment_id);

    const hook = await webhook(transaction(payment));
    expect(hook.status).toBe(200);
    expect(hook.body.status).toBe("paid");

    const order = await Order.findById(res.body.data._id);
    expect(order!.status).toBe("pending");
    expect(order!.payment_status).toBe(true);
    expect(order!.status_history.at(-1)!.by).toBe("payment");
    expect((await Payment.findById(payment!._id))!.status).toBe("paid");
    expect(mailer.sendOrderConfirmationEmail).toHaveBeenCalledOnce();

    const list = await api().get("/api/my-restaurant/orders").set(auth(owner));
    expect(list.body.data).toHaveLength(1);
  });

  it("rejects a webhook with a wrong signature, and a tampered body", async () => {
    const { res } = await cardOrder();
    const payment = await Payment.findById(res.body.payment.payment_id);
    const obj = transaction(payment);

    expect((await webhook(obj, "a".repeat(128))).status).toBe(401);
    expect((await webhook(obj, "not-hex")).status).toBe(401);

    const signed = signTransaction(transactionHmacValues({ ...obj, success: false }), "test-hmac-secret");
    expect((await webhook(obj, signed)).status).toBe(401); // signed as failed, sent as success

    expect((await Order.findById(res.body.data._id))!.status).toBe("awaiting_payment");
  });

  it("is idempotent: the same webhook twice changes nothing the second time", async () => {
    const { res } = await cardOrder();
    const payment = await Payment.findById(res.body.payment.payment_id);
    const obj = transaction(payment);
    await webhook(obj);
    const again = await webhook(obj);
    expect(again.status).toBe(200);
    expect(again.body.duplicate).toBe(true);
    const order = await Order.findById(res.body.data._id);
    expect(order!.status_history.filter((h) => h.status === "pending")).toHaveLength(1);
    expect(mailer.sendOrderConfirmationEmail).toHaveBeenCalledOnce();
  });

  it("ignores a payment for the wrong amount", async () => {
    const { res } = await cardOrder();
    const payment = await Payment.findById(res.body.payment.payment_id);
    const hook = await webhook(transaction(payment, { amount_cents: 100 }));
    expect(hook.status).toBe(200);
    expect(hook.body.handled).toBe(false);
    expect((await Order.findById(res.body.data._id))!.status).toBe("awaiting_payment");
  });

  it("a declined card keeps the order waiting, and the customer can retry with a new link", async () => {
    const { customer, res } = await cardOrder();
    const first = await Payment.findById(res.body.payment.payment_id);
    await webhook(transaction(first, { success: false, data: { message: "Insufficient funds" } }));
    expect((await Payment.findById(first!._id))!.status).toBe("failed");
    expect((await Order.findById(res.body.data._id))!.status).toBe("awaiting_payment");

    const retry = await api().post(`/api/orders/${res.body.data._id}/pay`).set(auth(customer)).send({});
    expect(retry.status).toBe(201);
    expect(retry.body.payment.payment_id).not.toBe(String(first!._id));

    const second = await Payment.findById(retry.body.payment.payment_id);
    await webhook(transaction(second));
    expect((await Order.findById(res.body.data._id))!.status).toBe("pending");

    const history = await api().get(`/api/orders/${res.body.data._id}/payments`).set(auth(customer));
    expect(history.body.data.map((p: any) => p.status).sort()).toEqual(["failed", "paid"]);
    expect(history.body.data[0].client_secret).toBeUndefined();
  });

  it("a payment that arrives after the order was cancelled is refunded automatically", async () => {
    const { customer, res } = await cardOrder();
    const payment = await Payment.findById(res.body.payment.payment_id);
    await api().patch(`/api/orders/${res.body.data._id}/cancel`).set(auth(customer));

    const hook = await webhook(transaction(payment));
    expect(hook.body.status).toBe("refunded");
    const refund = paymobCalls.find((c) => c.url.endsWith("/void_refund/refund"));
    expect(refund!.body).toMatchObject({ amount_cents: payment!.amount_cents });
    expect((await Order.findById(res.body.data._id))!.refunded).toBe(true);
  });
});

describe("refunds on cancel", () => {
  it("cancelling a paid order refunds it", async () => {
    const { owner, res } = await cardOrder();
    const payment = await Payment.findById(res.body.payment.payment_id);
    await webhook(transaction(payment, { id: 4242 }));

    const cancel = await api().patch(`/api/orders/${res.body.data._id}/status`).set(auth(owner)).send({ status: "cancelled", reason: "Kitchen closed" });
    expect(cancel.status).toBe(200);
    const refund = paymobCalls.find((c) => c.url.endsWith("/void_refund/refund"));
    expect(refund!.body).toEqual({ transaction_id: 4242, amount_cents: payment!.amount_cents });
    expect((await Payment.findById(payment!._id))!.status).toBe("refunded");
  });

  it("a failed refund doesn't undo the cancellation, it's marked for a manual refund", async () => {
    const { customer, res } = await cardOrder();
    const payment = await Payment.findById(res.body.payment.payment_id);
    await webhook(transaction(payment));
    refundShouldFail = true;

    const cancel = await api().patch(`/api/orders/${res.body.data._id}/cancel`).set(auth(customer));
    expect(cancel.status).toBe(200);
    expect((await Order.findById(res.body.data._id))!.status).toBe("cancelled");
    expect((await Payment.findById(payment!._id))!.status).toBe("refund_failed");
  });
});

describe("return URL and expiry", () => {
  it("the signed return URL sends the customer back to the frontend order page", async () => {
    const { res } = await cardOrder();
    const payment = await Payment.findById(res.body.payment.payment_id);
    const obj = transaction(payment);
    const query: Record<string, string> = {
      amount_cents: String(obj.amount_cents), created_at: obj.created_at, currency: obj.currency,
      error_occured: "false", has_parent_transaction: "false", id: String(obj.id), integration_id: "123456",
      is_3d_secure: "true", is_auth: "false", is_capture: "false", is_refunded: "false", is_standalone_payment: "true",
      is_voided: "false", order: String(payment!.paymob_order_id), owner: "42", pending: "false",
      "source_data.pan": "2346", "source_data.sub_type": "MasterCard", "source_data.type": "card", success: "true",
      merchant_order_id: String(payment!._id),
    };
    query.hmac = signTransaction(redirectHmacValues(query), "test-hmac-secret");

    const back = await api().get("/api/payments/paymob/return").query(query);
    expect(back.status).toBe(302);
    expect(back.headers.location).toBe(`http://localhost:5173/orders/${res.body.data._id}?payment=success`);
    expect((await Order.findById(res.body.data._id))!.status).toBe("pending");

    const forged = await api().get("/api/payments/paymob/return").query({ ...query, hmac: "b".repeat(128) });
    expect(forged.headers.location).toBe("http://localhost:5173/orders?payment=invalid");
  });

  it("unpaid card orders are cancelled after the payment window", async () => {
    const { customer, res } = await cardOrder();
    expect(await expireUnpaidOrders()).toBe(0);

    const later = new Date(Date.now() + PAYMENT_WINDOW_MS + 60_000);
    expect(await expireUnpaidOrders(later)).toBe(1);
    const order = await Order.findById(res.body.data._id);
    expect(order!.status).toBe("cancelled");
    expect(order!.status_history.at(-1)!.by).toBe("system");
    expect((await Payment.findById(res.body.payment.payment_id))!.status).toBe("expired");

    const retry = await api().post(`/api/orders/${res.body.data._id}/pay`).set(auth(customer)).send({});
    expect(retry.status).toBe(409);
  });

  it("card orders are refused when Paymob isn't configured", async () => {
    const saved = process.env.PAYMOB_SECRET_KEY;
    delete process.env.PAYMOB_SECRET_KEY;
    try {
      const { res } = await cardOrder();
      expect(res.status).toBe(503);
      expect(await Order.countDocuments()).toBe(0);
    } finally {
      process.env.PAYMOB_SECRET_KEY = saved;
    }
  });
});
