import { beforeEach, describe, expect, it, vi } from "vitest";
import User from "../src/models/User";
import { AppError } from "../src/Utilis/AppError";
import { api, auth, createUser, lastOtp, mailer, PASSWORD, resetDb } from "./helpers";

beforeEach(resetDb);

const signup = (email: string, extra: Record<string, unknown> = {}) =>
  api().post("/api/users/signup").send({ name: "Sara", email, password: PASSWORD, ...extra });

describe("signup → verify → login", () => {
  it("works end to end, and /me returns the user without secrets", async () => {
    const email = "sara@example.test";
    const res = await signup(email);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeUndefined();

    const verify = await api().post("/api/users/verifyEmail").send({ email, otp: lastOtp("verify") });
    expect(verify.status).toBe(200);
    expect(verify.body.token).toBeTypeOf("string");

    const login = await api().post("/api/users/login").send({ email, password: PASSWORD });
    expect(login.status).toBe(200);

    const me = await api().get("/api/users/me").set("Authorization", `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);
    expect(me.body.user.password).toBeUndefined();
    expect(me.body.user.verification_token).toBeUndefined();
  });

  it("ignores a type in the body: nobody can sign up as admin", async () => {
    await signup("hacker@example.test", { type: "admin" });
    const user = await User.findOne({ email: "hacker@example.test" });
    expect(user!.type).toBe("user");
  });

  it("stores the OTP hashed, never in plain text", async () => {
    await signup("hash@example.test");
    const user = await User.findOne({ email: "hash@example.test" });
    expect(user!.verification_token).not.toBe(lastOtp("verify"));
    expect(user!.verification_token).toMatch(/^\$2[aby]\$/);
  });

  it("doesn't keep the account if the OTP email can't be sent, so signing up again works", async () => {
    vi.mocked(mailer.sendVerifyEmail).mockRejectedValueOnce(new AppError(503, "Email is down"));
    const first = await signup("retry@example.test");
    expect(first.status).toBe(503);
    expect(await User.exists({ email: "retry@example.test" })).toBeNull();

    const second = await signup("retry@example.test");
    expect(second.status).toBe(201);
  });

  it("rejects a duplicate email with 409", async () => {
    await signup("dup@example.test");
    const res = await signup("dup@example.test");
    expect(res.status).toBe(409);
  });

  it("can't log in before verifying the email", async () => {
    await signup("late@example.test");
    const res = await api().post("/api/users/login").send({ email: "late@example.test", password: PASSWORD });
    expect(res.status).toBe(403);
  });

  it("answers the same for a wrong password and an unknown email", async () => {
    const user = await createUser();
    const wrong = await api().post("/api/users/login").send({ email: user.email, password: "nope-nope" });
    const unknown = await api().post("/api/users/login").send({ email: "ghost@example.test", password: "nope-nope" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  it("locks the OTP after 5 wrong tries, even if the right one comes next", async () => {
    await signup("brute@example.test");
    const otp = lastOtp("verify");
    const wrong = otp === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) {
      const res = await api().post("/api/users/verifyEmail").send({ email: "brute@example.test", otp: wrong });
      expect(res.status).toBe(400);
    }
    const res = await api().post("/api/users/verifyEmail").send({ email: "brute@example.test", otp });
    expect(res.status).toBe(429);
  });

  it("the old GET /login with the password in the URL is gone", async () => {
    const res = await api().get(`/api/users/login?email=a@b.com&password=${PASSWORD}`);
    expect(res.status).toBe(404);
  });
});

describe("forgot / reset password", () => {
  it("answers the same for registered and unknown emails", async () => {
    const user = await createUser();
    const known = await api().post("/api/users/sendOtpResetPass").send({ email: user.email });
    const unknown = await api().post("/api/users/sendOtpResetPass").send({ email: "ghost@example.test" });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body.message).toBe(unknown.body.message);
    expect(mailer.sendResetPasswordEmail).toHaveBeenCalledTimes(1);
  });

  it("resets the password with the OTP, the OTP can't be reused, and old sessions end", async () => {
    const user = await createUser();
    const login = await api().post("/api/users/login").send({ email: user.email, password: PASSWORD });

    await api().post("/api/users/sendOtpResetPass").send({ email: user.email });
    const otp = lastOtp("reset");
    const reset = await api().patch("/api/users/resetpassword").send({ email: user.email, otp, newPassword: "brand-new-pass" });
    expect(reset.status).toBe(200);

    const again = await api().patch("/api/users/resetpassword").send({ email: user.email, otp, newPassword: "another-pass" });
    expect(again.status).toBe(400);

    const refresh = await api().post("/api/users/newToken").send({ refreshToken: login.body.refreshToken });
    expect(refresh.status).toBe(401);

    const newLogin = await api().post("/api/users/login").send({ email: user.email, password: "brand-new-pass" });
    expect(newLogin.status).toBe(200);
  });
});

describe("tokens", () => {
  it("newToken rotates the refresh token: the old one stops working", async () => {
    const user = await createUser();
    const login = await api().post("/api/users/login").send({ email: user.email, password: PASSWORD });

    const first = await api().post("/api/users/newToken").send({ refreshToken: login.body.refreshToken });
    expect(first.status).toBe(200);

    const reused = await api().post("/api/users/newToken").send({ refreshToken: login.body.refreshToken });
    expect(reused.status).toBe(401);
  });

  it("logout revokes the refresh token", async () => {
    const user = await createUser();
    const login = await api().post("/api/users/login").send({ email: user.email, password: PASSWORD });
    const out = await api().post("/api/users/logout").set("Authorization", `Bearer ${login.body.token}`);
    expect(out.status).toBe(200);
    const refresh = await api().post("/api/users/newToken").send({ refreshToken: login.body.refreshToken });
    expect(refresh.status).toBe(401);
  });

  it("protected routes need a valid token", async () => {
    expect((await api().get("/api/users/me")).status).toBe(401);
    expect((await api().get("/api/users/me").set("Authorization", "Bearer nope")).status).toBe(401);
  });

  it("changing the email needs the password and a new verification", async () => {
    const user = await createUser();
    const bad = await api().patch("/api/users/updateProfile").set(auth(user))
      .send({ name: "New", email: "new@example.test", password: "wrong-pass" });
    expect(bad.status).toBe(400);

    const ok = await api().patch("/api/users/updateProfile").set(auth(user))
      .send({ name: "New", email: "new@example.test", password: PASSWORD });
    expect(ok.status).toBe(200);
    expect(ok.body.user.verified).toBe(false);

    const login = await api().post("/api/users/login").send({ email: "new@example.test", password: PASSWORD });
    expect(login.status).toBe(403);
  });
});
