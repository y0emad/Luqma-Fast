import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Order from "../src/models/Order";
import { api, auth, createItem, createRestaurant, createUser, mailer, ownerOf, pendingOrder, resetDb } from "./helpers";

beforeEach(resetDb);
afterEach(() => vi.useRealTimers());

const setStatus = (who: any, orderId: string, status: string, reason?: string) =>
  api().patch(`/api/orders/${orderId}/status`).set(auth(who)).send({ status, reason });

describe("order lifecycle", () => {
  it("goes pending → accepted → preparing → on_the_way → delivered, with a history and emails", async () => {
    const { owner, order } = await pendingOrder();
    for (const status of ["accepted", "preparing", "on_the_way", "delivered"]) {
      const res = await setStatus(owner, order._id, status);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(status);
    }
    const saved = await Order.findById(order._id);
    expect(saved!.status_history.map((h) => h.status)).toEqual(["pending", "accepted", "preparing", "on_the_way", "delivered"]);
    expect(saved!.status_history.slice(1).every((h) => h.by === "restaurant")).toBe(true);
    expect(saved!.payment_status).toBe(true);
    expect(mailer.sendOrderStatusEmail).toHaveBeenCalledTimes(4);
  });

  it("can't skip a step, go back, or change a finished order", async () => {
    const { owner, order } = await pendingOrder();
    expect((await setStatus(owner, order._id, "delivered")).status).toBe(409);
    expect((await setStatus(owner, order._id, "preparing")).status).toBe(409);

    await setStatus(owner, order._id, "accepted");
    await setStatus(owner, order._id, "preparing");
    expect((await setStatus(owner, order._id, "cancelled")).status).toBe(409);
    expect((await setStatus(owner, order._id, "accepted")).status).toBe(409);
  });

  it("rejects unknown statuses", async () => {
    const { owner, order } = await pendingOrder();
    expect((await setStatus(owner, order._id, "pending")).status).toBe(422);
    expect((await setStatus(owner, order._id, "teleported")).status).toBe(422);
  });

  it("a restaurant can only update its own orders (404 for others), customers can't at all", async () => {
    const { customer, order } = await pendingOrder();
    const other = await ownerOf(await createRestaurant({ name: "Other" }));
    expect((await setStatus(other, order._id, "accepted")).status).toBe(404);
    expect((await setStatus(customer, order._id, "accepted")).status).toBe(403);
  });

  it("an admin can move any order", async () => {
    const { order } = await pendingOrder();
    const res = await setStatus(await createUser("admin"), order._id, "accepted");
    expect(res.status).toBe(200);
    expect(res.body.data.status_history.at(-1).by).toBe("admin");
  });

  it("the restaurant can reject a pending order with a reason", async () => {
    const { owner, order } = await pendingOrder();
    const res = await setStatus(owner, order._id, "cancelled", "Out of koshary");
    expect(res.status).toBe(200);
    expect(res.body.data.cancel_reason).toBe("Out of koshary");
    expect(vi.mocked(mailer.sendOrderStatusEmail).mock.calls[0][1]).toMatchObject({ reason: "Out of koshary" });
  });
});

describe("PATCH /orders/:id/cancel", () => {
  it("the customer can cancel while it's pending", async () => {
    const { customer, order } = await pendingOrder();
    const res = await api().patch(`/api/orders/${order._id}/cancel`).set(auth(customer)).send({ reason: "Changed my mind" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("cancelled");
    expect(res.body.data.status_history.at(-1).by).toBe("user");
  });

  it("but not after the restaurant accepted it", async () => {
    const { customer, owner, order } = await pendingOrder();
    await setStatus(owner, order._id, "accepted");
    const res = await api().patch(`/api/orders/${order._id}/cancel`).set(auth(customer));
    expect(res.status).toBe(409);
  });

  it("another user can't cancel it (404)", async () => {
    const { order } = await pendingOrder();
    const res = await api().patch(`/api/orders/${order._id}/cancel`).set(auth(await createUser()));
    expect(res.status).toBe(404);
  });

  it("cancel and accept at the same moment: exactly one wins", async () => {
    const { customer, owner, order } = await pendingOrder();
    const [cancel, accept] = await Promise.all([
      api().patch(`/api/orders/${order._id}/cancel`).set(auth(customer)),
      setStatus(owner, order._id, "accepted"),
    ]);
    expect([cancel.status, accept.status].sort()).toEqual([200, 409]);
    const saved = await Order.findById(order._id);
    expect(saved!.status_history).toHaveLength(2);
  });
});

describe("GET /orders/:id", () => {
  it("the customer, the restaurant and admins can see it; anyone else gets 404", async () => {
    const { customer, owner, order } = await pendingOrder();
    expect((await api().get(`/api/orders/${order._id}`).set(auth(customer))).status).toBe(200);
    expect((await api().get(`/api/orders/${order._id}`).set(auth(owner))).status).toBe(200);
    expect((await api().get(`/api/orders/${order._id}`).set(auth(await createUser("admin")))).status).toBe(200);
    expect((await api().get(`/api/orders/${order._id}`).set(auth(await createUser()))).status).toBe(404);
    const otherOwner = await ownerOf(await createRestaurant({ name: "Other" }));
    expect((await api().get(`/api/orders/${order._id}`).set(auth(otherOwner))).status).toBe(404);
  });
});

describe("opening hours", () => {
  it("refuses orders while the restaurant is closed, accepts them when it's open", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const customer = await createUser();
    const restaurant = await createRestaurant({ opening_time: "09:00", closing_time: "23:00" });
    const item = await createItem(restaurant);
    const place = () => api().post("/api/orders/createOrder").set(auth(customer)).send({
      restaurant_id: restaurant._id, address: "Home", payment_method: "cash", items: [{ item_id: item._id, quantity: 1 }],
    });

    vi.setSystemTime(new Date("2026-01-15T05:00:00Z"));
    const early = await place();
    expect(early.status).toBe(422);
    expect(early.body.message).toContain("closed");

    vi.setSystemTime(new Date("2026-01-15T10:00:00Z"));
    expect((await place()).status).toBe(201);
  });
});
