import { readdirSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import Category from "../src/models/Category";
import Items from "../src/models/Items";
import Order from "../src/models/Order";
import { api, auth, createItem, createRestaurant, createUser, ownerOf, pendingOrder, resetDb } from "./helpers";

beforeEach(resetDb);

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

describe("restaurant location", () => {
  it("the owner can move the pin, and nearby search follows it", async () => {
    const restaurant = await createRestaurant();
    const owner = await ownerOf(restaurant);
    const giza = { type: "Point", coordinates: [31.1342, 29.9792] };

    const moved = await api().patch("/api/my-restaurant").set(auth(owner)).send({ location: giza });
    expect(moved.status).toBe(200);
    expect(moved.body.data.location.coordinates).toEqual(giza.coordinates);

    const nearCairo = await api().get("/api/restaurants/getNearbyRestaurants?latitude=30.0444&longitude=31.2357&radius=5");
    expect(nearCairo.body.data).toHaveLength(0);
    const nearGiza = await api().get("/api/restaurants/getNearbyRestaurants?latitude=29.98&longitude=31.134&radius=5");
    expect(nearGiza.body.data).toHaveLength(1);
  });

  it("rejects a location that isn't a valid point", async () => {
    const owner = await ownerOf(await createRestaurant());
    const res = await api().patch("/api/my-restaurant").set(auth(owner)).send({ location: { type: "Point", coordinates: [500, 30] } });
    expect(res.status).toBe(422);
  });
});

describe("/my-restaurant access", () => {
  it("is for restaurant accounts only", async () => {
    expect((await api().get("/api/my-restaurant")).status).toBe(401);
    expect((await api().get("/api/my-restaurant").set(auth(await createUser()))).status).toBe(403);
    expect((await api().get("/api/my-restaurant").set(auth(await createUser("admin")))).status).toBe(403);
  });

  it("shows the owner's own restaurant with is_open, and updates it", async () => {
    const restaurant = await createRestaurant();
    const owner = await ownerOf(restaurant);
    const me = await api().get("/api/my-restaurant").set(auth(owner));
    expect(me.status).toBe(200);
    expect(me.body.data.name).toBe(restaurant.name);
    expect(me.body.data.is_open).toBe(true);

    const closed = await api().patch("/api/my-restaurant").set(auth(owner)).send({ isClosed: true, delivery_fee: 20, user_id: "hack" });
    expect(closed.status).toBe(200);
    expect(closed.body.data.is_open).toBe(false);
    expect(closed.body.data.delivery_fee).toBe(20);
    expect(String(closed.body.data.user_id)).toBe(String(owner._id));

    expect((await api().patch("/api/my-restaurant").set(auth(owner)).send({ opening_time: "25:00" })).status).toBe(422);
  });
});

describe("orders", () => {
  it("lists only this restaurant's orders, filtered by status", async () => {
    const { owner, order } = await pendingOrder();
    await pendingOrder();
    await api().patch(`/api/orders/${order._id}/status`).set(auth(owner)).send({ status: "accepted" });

    const all = await api().get("/api/my-restaurant/orders").set(auth(owner));
    expect(all.status).toBe(200);
    expect(all.body.data).toHaveLength(1);
    expect(all.body.data[0].user_id.email).toBeDefined();
    expect(all.body.data[0].user_id.password).toBeUndefined();

    const pending = await api().get("/api/my-restaurant/orders?status=pending").set(auth(owner));
    expect(pending.body.data).toHaveLength(0);
    const accepted = await api().get("/api/my-restaurant/orders?status=accepted").set(auth(owner));
    expect(accepted.body.data).toHaveLength(1);
  });
});

describe("menu management", () => {
  it("creates categories (no duplicates) and items with an image", async () => {
    const restaurant = await createRestaurant();
    const owner = await ownerOf(restaurant);

    const cat = await api().post("/api/my-restaurant/categories").set(auth(owner)).send({ name: "Desserts" });
    expect(cat.status).toBe(201);
    expect((await api().post("/api/my-restaurant/categories").set(auth(owner)).send({ name: "desserts" })).status).toBe(409);

    const item = await api().post("/api/my-restaurant/items").set(auth(owner))
      .field("category_id", cat.body.data._id).field("name", "Om Ali").field("price", "45.5").field("vegetarian", "true")
      .attach("ItemsImg", PNG, { filename: "om-ali.png", contentType: "image/png" });
    expect(item.status).toBe(201);
    expect(item.body.data.price).toBe(45.5);
    expect(item.body.data.cover).toMatch(/^src\/uploads\/ItemsImg\/ItemsImg-.*\.png$/);
    expect(String(item.body.data.restaurant_id)).toBe(String(restaurant._id));

    const del = await api().delete(`/api/my-restaurant/items/${item.body.data._id}`).set(auth(owner));
    expect(del.status).toBe(200);
    expect(readdirSync("src/uploads/ItemsImg").some((f) => item.body.data.cover.endsWith(f))).toBe(false);
  });

  it("can't use another restaurant's category, and deletes the upload when it refuses", async () => {
    const restaurant = await createRestaurant();
    const owner = await ownerOf(restaurant);
    const otherCategory = await Category.create({ restaurant_id: (await createRestaurant({ name: "Other" }))._id, name: "Theirs" });
    const before = readdirSync("src/uploads/ItemsImg").length;

    const res = await api().post("/api/my-restaurant/items").set(auth(owner))
      .field("category_id", String(otherCategory._id)).field("name", "Stolen").field("price", "10").field("vegetarian", "false")
      .attach("ItemsImg", PNG, { filename: "x.png", contentType: "image/png" });
    expect(res.status).toBe(422);
    expect(readdirSync("src/uploads/ItemsImg").length).toBe(before);
  });

  it("updates its own items only, and can hide an item from the menu", async () => {
    const restaurant = await createRestaurant();
    const owner = await ownerOf(restaurant);
    const item = await createItem(restaurant);
    const foreign = await createItem(await createRestaurant({ name: "Other" }));

    const hide = await api().patch(`/api/my-restaurant/items/${item._id}`).set(auth(owner)).send({ status: "inactive", price: 60 });
    expect(hide.status).toBe(200);
    expect(hide.body.data).toMatchObject({ status: "inactive", price: 60 });

    const menu = await api().get(`/api/items/getMenu/${restaurant._id}`).set(auth(await createUser()));
    expect(menu.body.data.items).toHaveLength(0);
    expect(menu.body.data.restaurant.is_open).toBe(true);

    expect((await api().patch(`/api/my-restaurant/items/${foreign._id}`).set(auth(owner)).send({ price: 1 })).status).toBe(404);
    expect((await api().delete(`/api/my-restaurant/items/${foreign._id}`).set(auth(owner))).status).toBe(404);
    expect(await Items.exists({ _id: foreign._id })).not.toBeNull();
  });

  it("won't delete a category that still has items", async () => {
    const restaurant = await createRestaurant();
    const owner = await ownerOf(restaurant);
    const item = await createItem(restaurant);
    const res = await api().delete(`/api/my-restaurant/categories/${item.category_id}`).set(auth(owner));
    expect(res.status).toBe(409);
  });
});

describe("GET /my-restaurant/stats", () => {
  it("counts today's orders per status, revenue from delivered orders, and top items", async () => {
    const restaurant = await createRestaurant({ delivery_fee: 10 });
    const owner = await ownerOf(restaurant);
    const koshary = await createItem(restaurant, { name: "Koshary", price: 50 });
    const juice = await createItem(restaurant, { name: "Juice", price: 20 });
    const customer = await createUser();
    const place = (items: any[]) => api().post("/api/orders/createOrder").set(auth(customer))
      .send({ restaurant_id: restaurant._id, address: "Home", payment_method: "cash", items });
    const move = async (id: string, steps: string[]) => {
      for (const status of steps) await api().patch(`/api/orders/${id}/status`).set(auth(owner)).send({ status });
    };

    const a = await place([{ item_id: koshary._id, quantity: 2 }]);
    const b = await place([{ item_id: koshary._id, quantity: 1 }, { item_id: juice._id, quantity: 3 }]);
    const c = await place([{ item_id: juice._id, quantity: 5 }]);
    await place([{ item_id: koshary._id, quantity: 1 }]);
    await move(a.body.data._id, ["accepted", "preparing", "on_the_way", "delivered"]);
    await move(b.body.data._id, ["accepted", "preparing", "on_the_way", "delivered"]);
    await move(c.body.data._id, ["cancelled"]);

    await Order.collection.updateOne({ _id: (await Order.findOne({ status: "pending" }))!._id }, { $set: { created_at: new Date(Date.now() - 2 * 86400000) } });

    const res = await api().get("/api/my-restaurant/stats").set(auth(owner));
    expect(res.status).toBe(200);
    expect(res.body.data.orders.total).toBe(3);
    expect(res.body.data.orders.by_status).toMatchObject({ delivered: 2, cancelled: 1, pending: 0 });
    expect(res.body.data.revenue).toBe(230);
    expect(res.body.data.average_order_value).toBe(115);
    expect(res.body.data.top_items[0]).toMatchObject({ name: "Koshary", quantity: 3, revenue: 150 });
    expect(res.body.data.top_items[1]).toMatchObject({ name: "Juice", quantity: 3, revenue: 60 });
  });

  it("validates the day", async () => {
    const owner = await ownerOf(await createRestaurant());
    expect((await api().get("/api/my-restaurant/stats?day=yesterday").set(auth(owner))).status).toBe(422);
    expect((await api().get("/api/my-restaurant/stats?day=2026-01-15").set(auth(owner))).status).toBe(200);
  });
});
