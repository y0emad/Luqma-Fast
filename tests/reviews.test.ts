import { beforeEach, describe, expect, it } from "vitest";
import Restaurant from "../src/models/Restaurant";
import { api, auth, createUser, pendingOrder, resetDb } from "./helpers";

beforeEach(resetDb);

async function deliver(owner: any, orderId: string) {
  for (const status of ["accepted", "preparing", "on_the_way", "delivered"]) {
    await api().patch(`/api/orders/${orderId}/status`).set(auth(owner)).send({ status });
  }
}

const rate = (user: any, orderId: string, body: Record<string, unknown>) =>
  api().post(`/api/orders/${orderId}/review`).set(auth(user)).send(body);

describe("POST /orders/:id/review", () => {
  it("rates a delivered order and updates the restaurant average", async () => {
    const { customer, owner, restaurant, order } = await pendingOrder();
    await deliver(owner, order._id);

    const res = await rate(customer, order._id, { rating: 4, comment: "Hot and fast" });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ rating: 4, comment: "Hot and fast" });
    expect(res.body.restaurant).toEqual({ rating: 4, ratings_count: 1 });

    const saved = await Restaurant.findById(restaurant._id);
    expect(saved!.rating).toBe(4);
    expect(saved!.ratings_count).toBe(1);
  });

  it("averages several orders, rounded to one decimal", async () => {
    const first = await pendingOrder();
    await deliver(first.owner, first.order._id);
    await rate(first.customer, first.order._id, { rating: 5 });

    const customer2 = await createUser();
    const second = await api().post("/api/orders/createOrder").set(auth(customer2)).send({
      restaurant_id: first.restaurant._id, address: "Home", payment_method: "cash", items: [{ item_id: first.item._id, quantity: 1 }],
    });
    const customer3 = await createUser();
    const third = await api().post("/api/orders/createOrder").set(auth(customer3)).send({
      restaurant_id: first.restaurant._id, address: "Home", payment_method: "cash", items: [{ item_id: first.item._id, quantity: 1 }],
    });
    await deliver(first.owner, second.body.data._id);
    await deliver(first.owner, third.body.data._id);
    await rate(customer2, second.body.data._id, { rating: 4 });
    const last = await rate(customer3, third.body.data._id, { rating: 4 });

    expect(last.body.restaurant).toEqual({ rating: 4.3, ratings_count: 3 });
  });

  it("can't rate before delivery, twice, or someone else's order", async () => {
    const { customer, owner, order } = await pendingOrder();
    expect((await rate(customer, order._id, { rating: 5 })).status).toBe(409);

    await deliver(owner, order._id);
    expect((await rate(await createUser(), order._id, { rating: 1 })).status).toBe(404);
    expect((await rate(customer, order._id, { rating: 5 })).status).toBe(201);
    const again = await rate(customer, order._id, { rating: 1 });
    expect(again.status).toBe(409);
    expect(again.body.message).toBe("You already rated this order");
  });

  it("validates the rating and the comment", async () => {
    const { customer, owner, order } = await pendingOrder();
    await deliver(owner, order._id);
    expect((await rate(customer, order._id, { rating: 0 })).status).toBe(422);
    expect((await rate(customer, order._id, { rating: 6 })).status).toBe(422);
    expect((await rate(customer, order._id, { rating: 3, comment: "x".repeat(501) })).status).toBe(422);
  });
});

describe("GET /restaurants/:id/reviews", () => {
  it("is public, newest first, with first names only and a star breakdown", async () => {
    const { customer, owner, restaurant, order } = await pendingOrder();
    await deliver(owner, order._id);
    await rate(customer, order._id, { rating: 5, comment: "Best koshary" });

    const res = await api().get(`/api/restaurants/${restaurant._id}/reviews`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ rating: 5, ratings_count: 1, breakdown: { 5: 1, 4: 0, 1: 0 } });
    expect(res.body.data[0]).toMatchObject({ rating: 5, comment: "Best koshary", author: "Test" });
    expect(JSON.stringify(res.body)).not.toContain(customer.email);
  });

  it("the restaurant sees its own reviews in the dashboard", async () => {
    const { customer, owner, order } = await pendingOrder();
    await deliver(owner, order._id);
    await rate(customer, order._id, { rating: 3 });
    const res = await api().get("/api/my-restaurant/reviews").set(auth(owner));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});
