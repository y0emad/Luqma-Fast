import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import request from "supertest";
import { vi } from "vitest";
import { createApp } from "../src/app";
import User from "../src/models/User";
import City from "../src/models/City";
import Restaurant from "../src/models/Restaurant";
import Category from "../src/models/Category";
import Items from "../src/models/Items";
import { GlobalUtilis } from "../src/Utilis/GlobalUtilis";
import { Jwt } from "../src/Utilis/Jwt";
import { Redis } from "../src/Utilis/Redis";
import * as mailer from "../src/Utilis/NodeMailer";

const app = createApp();
export const api = () => request(app);

export const PASSWORD = "secret123";

export async function resetDb() {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
  await Redis.flush();
}

type UserType = "user" | "admin" | "restaurant";

// A verified user created straight in the DB (skips signup + OTP).
export async function createUser(type: UserType = "user", overrides: Record<string, unknown> = {}) {
  return User.create({
    name: type === "admin" ? "Admin" : "Test User",
    email: `${type}-${randomUUID()}@example.test`,
    password: await GlobalUtilis.hashPassword(PASSWORD),
    verified: true,
    type,
    ...overrides,
  });
}

export const tokenFor = (u: any) =>
  Jwt.jwtSign({ aud: String(u._id), email: u.email, name: u.name, type: u.type });

export const auth = (u: any) => ({ Authorization: `Bearer ${tokenFor(u)}` });

// Cairo, so the geo tests have real coordinates: [lng, lat].
export const CAIRO = { lng: 31.2357, lat: 30.0444 };

export async function createCity() {
  return City.create({ name: `City ${randomUUID().slice(0, 6)}`, lat: CAIRO.lat, lon: CAIRO.lng });
}

export async function createRestaurant(overrides: Record<string, unknown> = {}) {
  const owner = await createUser("restaurant");
  const city = await createCity();
  return Restaurant.create({
    user_id: owner._id,
    city_id: city._id,
    name: "Koshary Place",
    address: "Downtown",
    location: { type: "Point", coordinates: [CAIRO.lng, CAIRO.lat] },
    cuisines: ["Egyptian"],
    opening_time: "00:00",
    closing_time: "00:00",
    delivery_time: "30 min",
    delivery_fee: 15,
    ...overrides,
  });
}

export async function ownerOf(restaurant: any) {
  return (await User.findById(restaurant.user_id))!;
}

// A restaurant with its owner account and one item, plus a customer with a pending order.
export async function pendingOrder(itemOverrides: Record<string, unknown> = {}, orderBody: Record<string, unknown> = {}) {
  const customer = await createUser();
  const restaurant = await createRestaurant();
  const owner = await ownerOf(restaurant);
  const item = await createItem(restaurant, itemOverrides);
  const res = await api().post("/api/orders/createOrder").set(auth(customer)).send({
    restaurant_id: restaurant._id, address: "Home", payment_method: "cash",
    items: [{ item_id: item._id, quantity: 2 }], ...orderBody,
  });
  if (res.status !== 201) throw new Error(`order failed: ${res.status} ${res.body.message}`);
  return { customer, restaurant, owner, item, order: res.body.data };
}

export async function createItem(restaurant: any, overrides: Record<string, unknown> = {}) {
  const category = await Category.create({ restaurant_id: restaurant._id, name: "Main" });
  return Items.create({
    restaurant_id: restaurant._id,
    category_id: category._id,
    name: "Koshary",
    cover: "src/uploads/ItemsImg/test.png",
    vegetarian: true,
    price: 50,
    ...overrides,
  });
}

// The last OTP the (mocked) mailer was asked to send.
export function lastOtp(kind: "verify" | "reset") {
  const fn = (kind === "verify" ? mailer.sendVerifyEmail : mailer.sendResetPasswordEmail) as unknown as ReturnType<typeof vi.fn>;
  const calls = fn.mock.calls;
  return calls[calls.length - 1]?.[1] as string;
}

export { mailer };
