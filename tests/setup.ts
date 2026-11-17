import dotenv from "dotenv";
import mongoose from "mongoose";
import { afterAll, beforeAll, vi } from "vitest";
import { Redis } from "../src/Utilis/Redis";

dotenv.config({ path: ".env.test", override: true, quiet: true });

vi.mock("../src/Utilis/NodeMailer", () => ({
  sendVerifyEmail: vi.fn(async () => undefined),
  sendResetPasswordEmail: vi.fn(async () => undefined),
  sendOrderConfirmationEmail: vi.fn(async () => undefined),
  sendOrderStatusEmail: vi.fn(async () => undefined),
  sendContactNotification: vi.fn(async () => undefined),
  sendMail: vi.fn(async () => undefined),
  escapeHtml: (s: string) => s,
}));

beforeAll(async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGO_URI!);
  }
  await Redis.connect();
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
});

afterAll(async () => {
  await mongoose.disconnect();
  await Redis.disconnect();
});
