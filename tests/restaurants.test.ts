import { existsSync, readdirSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import Category from "../src/models/Category";
import User from "../src/models/User";
import { api, auth, CAIRO, createCity, createRestaurant, createUser, PASSWORD, resetDb } from "./helpers";

beforeEach(resetDb);

const restaurantBody = (cityId: unknown) => ({
  email: "owner@example.test",
  password: PASSWORD,
  city_id: cityId,
  name: "Abou Tarek",
  address: "Champollion St",
  location: JSON.stringify({ type: "Point", coordinates: [CAIRO.lng, CAIRO.lat] }),
  cuisines: JSON.stringify(["Egyptian", "Street food"]),
  opening_time: "10:00",
  closing_time: "23:30",
  delivery_time: "25 min",
  delivery_fee: 10,
});

describe("POST /restaurants/createRestaurant", () => {
  it("is for admins only", async () => {
    const city = await createCity();
    const res = await api().post("/api/restaurants/createRestaurant").set(auth(await createUser())).send(restaurantBody(city._id));
    expect(res.status).toBe(403);
  });

  it("creates the owner account, the restaurant and one category per cuisine", async () => {
    const city = await createCity();
    const res = await api().post("/api/restaurants/createRestaurant").set(auth(await createUser("admin"))).send(restaurantBody(city._id));
    expect(res.status).toBe(201);
    expect(res.body.data.cuisines).toEqual(["Egyptian", "Street food"]);

    const owner = await User.findOne({ email: "owner@example.test" });
    expect(owner!.type).toBe("restaurant");
    expect(await Category.countDocuments({ restaurant_id: res.body.data._id })).toBe(2);
  });

  it("rejects a bad location and leaves no owner account behind", async () => {
    const city = await createCity();
    const body = { ...restaurantBody(city._id), location: JSON.stringify({ type: "Point", coordinates: [500, 30] }) };
    const res = await api().post("/api/restaurants/createRestaurant").set(auth(await createUser("admin"))).send(body);
    expect(res.status).toBe(422);
    expect(await User.exists({ email: "owner@example.test" })).toBeNull();
  });

  it("rejects a non-image upload and deletes nothing that isn't there", async () => {
    const city = await createCity();
    const before = readdirSync("src/uploads/restaurantImg").length;
    const req = api().post("/api/restaurants/createRestaurant").set(auth(await createUser("admin")));
    for (const [k, v] of Object.entries(restaurantBody(city._id))) req.field(k, String(v));
    const res = await req.attach("restaurantImg", Buffer.from("not an image"), { filename: "x.txt", contentType: "text/plain" });
    expect(res.status).toBe(400);
    expect(readdirSync("src/uploads/restaurantImg").length).toBe(before);
    expect(existsSync("src/uploads/restaurantImg/.gitkeep")).toBe(true);
  });
});

describe("GET /restaurants/getNearbyRestaurants", () => {
  it("finds restaurants inside the radius only", async () => {
    const user = await createUser();
    await createRestaurant({ name: "Near" });
    // About 13 km away (Giza pyramids).
    await createRestaurant({ name: "Far", location: { type: "Point", coordinates: [31.1342, 29.9792] } });

    const q = `latitude=${CAIRO.lat}&longitude=${CAIRO.lng}`;
    const near = await api().get(`/api/restaurants/getNearbyRestaurants?${q}&radius=5`).set(auth(user));
    expect(near.status).toBe(200);
    expect(near.body.data.map((r: any) => r.name)).toEqual(["Near"]);

    const wide = await api().get(`/api/restaurants/getNearbyRestaurants?${q}&radius=20`).set(auth(user));
    expect(wide.body.data.map((r: any) => r.name)).toEqual(["Near", "Far"]);
    expect(wide.body.pagination.total).toBe(2);
  });

  it("validates the query", async () => {
    const res = await api().get("/api/restaurants/getNearbyRestaurants").set(auth(await createUser()));
    expect(res.status).toBe(422);
  });

  it("search treats the name as text, not a regex", async () => {
    const user = await createUser();
    await createRestaurant({ name: "Pizza (Downtown)" });
    const q = `latitude=${CAIRO.lat}&longitude=${CAIRO.lng}&radius=5`;

    const literal = await api().get(`/api/restaurants/searchNearbyRestaurants?${q}&name=${encodeURIComponent("(Downtown)")}`).set(auth(user));
    expect(literal.status).toBe(200);
    expect(literal.body.data).toHaveLength(1);

    const evil = await api().get(`/api/restaurants/searchNearbyRestaurants?${q}&name=${encodeURIComponent("(a+)+$")}`).set(auth(user));
    expect(evil.status).toBe(200);
    expect(evil.body.data).toHaveLength(0);
  });
});
