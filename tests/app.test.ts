import { describe, expect, it } from "vitest";
import { api } from "./helpers";

describe("app", () => {
  it("/health reports Mongo and Redis", async () => {
    const res = await api().get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", mongo: true, redis: true });
  });

  it("unknown routes are a JSON 404", async () => {
    const res = await api().get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body.message).toContain("/api/nope");
  });

  it("a malformed JSON body is a 400, not a 500", async () => {
    const res = await api().post("/api/users/login").set("Content-Type", "application/json").send('{"email":');
    expect(res.status).toBe(400);
  });

  it("sends security headers", async () => {
    const res = await api().get("/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });
});
