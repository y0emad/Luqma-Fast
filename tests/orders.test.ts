import { beforeEach, describe, expect, it } from "vitest";
import { api, auth, createItem, createRestaurant, createUser, mailer, resetDb } from "./helpers";

beforeEach(resetDb);

const order = (user: any, body: Record<string, unknown>) =>
  api().post("/api/orders/createOrder").set(auth(user)).send({ address: "Home", payment_method: "cash", ...body });

describe("POST /orders/createOrder", () => {
  it("computes the totals on the server from the DB prices, whatever the client sends", async () => {
    const user = await createUser();
    const restaurant = await createRestaurant({ delivery_fee: 15 });
    const koshary = await createItem(restaurant, { price: 50 });
    const juice = await createItem(restaurant, { name: "Juice", price: 12.5 });

    const res = await order(user, {
      restaurant_id: restaurant._id,
      items: [{ item_id: koshary._id, quantity: 2 }, { item_id: juice._id, quantity: 1 }],
      total: 1, grand_total: 1, delivery_charge: 0, payment_status: true,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.total).toBe(112.5);
    expect(res.body.data.delivery_charge).toBe(15);
    expect(res.body.data.grand_total).toBe(127.5);
    expect(res.body.data.payment_status).toBe(false);
    expect(res.body.data.items).toHaveLength(2);
    expect(mailer.sendOrderConfirmationEmail).toHaveBeenCalledOnce();
  });

  it("adds up the same item sent twice", async () => {
    const user = await createUser();
    const restaurant = await createRestaurant();
    const item = await createItem(restaurant, { price: 10 });
    const res = await order(user, {
      restaurant_id: restaurant._id,
      items: [{ item_id: item._id, quantity: 1 }, { item_id: item._id, quantity: 2 }],
    });
    expect(res.status).toBe(201);
    expect(res.body.data.items[0].quantity).toBe(3);
    expect(res.body.data.total).toBe(30);
  });

  it("rejects an item from another restaurant", async () => {
    const user = await createUser();
    const restaurant = await createRestaurant();
    const other = await createRestaurant({ name: "Other" });
    const foreign = await createItem(other);
    const res = await order(user, { restaurant_id: restaurant._id, items: [{ item_id: foreign._id, quantity: 1 }] });
    expect(res.status).toBe(422);
  });

  it("rejects an inactive item, a closed restaurant and bad quantities", async () => {
    const user = await createUser();
    const restaurant = await createRestaurant();
    const inactive = await createItem(restaurant, { status: "inactive" });
    expect((await order(user, { restaurant_id: restaurant._id, items: [{ item_id: inactive._id, quantity: 1 }] })).status).toBe(422);

    const active = await createItem(restaurant);
    expect((await order(user, { restaurant_id: restaurant._id, items: [{ item_id: active._id, quantity: 0 }] })).status).toBe(422);
    expect((await order(user, { restaurant_id: restaurant._id, items: [] })).status).toBe(422);

    const closed = await createRestaurant({ isClosed: true });
    const closedItem = await createItem(closed);
    expect((await order(user, { restaurant_id: closed._id, items: [{ item_id: closedItem._id, quantity: 1 }] })).status).toBe(422);
  });

  it("needs a verified email", async () => {
    const user = await createUser("user", { verified: false });
    const restaurant = await createRestaurant();
    const item = await createItem(restaurant);
    const res = await order(user, { restaurant_id: restaurant._id, items: [{ item_id: item._id, quantity: 1 }] });
    expect(res.status).toBe(403);
  });
});

describe("GET /orders/getOrders", () => {
  it("users only see their own orders, newest first, with pagination", async () => {
    const [sara, omar] = [await createUser(), await createUser()];
    const restaurant = await createRestaurant();
    const item = await createItem(restaurant);
    for (let i = 0; i < 6; i++) {
      await order(sara, { restaurant_id: restaurant._id, items: [{ item_id: item._id, quantity: i + 1 }] });
    }
    await order(omar, { restaurant_id: restaurant._id, items: [{ item_id: item._id, quantity: 1 }] });

    const page1 = await api().get("/api/orders/getOrders").set(auth(sara));
    expect(page1.status).toBe(200);
    expect(page1.body.data).toHaveLength(5);
    expect(page1.body.data[0].items[0].quantity).toBe(6);
    expect(page1.body.pagination).toMatchObject({ page: 1, total: 6, totalPages: 2, nextPage: 2, prevPage: null });

    const page2 = await api().get("/api/orders/getOrders?page=2").set(auth(sara));
    expect(page2.body.data).toHaveLength(1);
  });

  it("an empty list is 200 with [], not 404", async () => {
    const res = await api().get("/api/orders/getOrders").set(auth(await createUser()));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
