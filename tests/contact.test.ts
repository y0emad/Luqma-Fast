import { beforeEach, describe, expect, it } from "vitest";
import ContactMessage from "../src/models/ContactMessage";
import { api, auth, createUser, mailer, resetDb } from "./helpers";

beforeEach(resetDb);

const message = { name: "Sara", email: "sara@example.test", subject: "order", message: "My order came cold, can you help?", order_ref: "EA07FA" };

describe("contact", () => {
  it("anyone can send a message; it's saved and the admin is emailed", async () => {
    const res = await api().post("/api/contact").send(message);
    expect(res.status).toBe(201);
    const saved = await ContactMessage.findOne({ email: "sara@example.test" });
    expect(saved).toMatchObject({ subject: "order", read: false, order_ref: "EA07FA" });
    expect(mailer.sendContactNotification).toHaveBeenCalledOnce();
  });

  it("links the message to the logged-in user", async () => {
    const user = await createUser();
    await api().post("/api/contact").set(auth(user)).send(message);
    const saved = await ContactMessage.findOne();
    expect(String(saved!.user_id)).toBe(String(user._id));
  });

  it("validates the fields", async () => {
    expect((await api().post("/api/contact").send({ ...message, email: "nope" })).status).toBe(422);
    expect((await api().post("/api/contact").send({ ...message, message: "short" })).status).toBe(422);
    expect((await api().post("/api/contact").send({ ...message, subject: "spam" })).status).toBe(422);
  });

  it("only admins can read the inbox and mark messages read", async () => {
    await api().post("/api/contact").send(message);
    expect((await api().get("/api/contact").set(auth(await createUser()))).status).toBe(403);

    const admin = await createUser("admin");
    const inbox = await api().get("/api/contact").set(auth(admin));
    expect(inbox.status).toBe(200);
    expect(inbox.body.unread).toBe(1);

    const read = await api().patch(`/api/contact/${inbox.body.data[0]._id}`).set(auth(admin)).send({ read: true });
    expect(read.body.data.read).toBe(true);
    expect((await api().get("/api/contact").set(auth(admin))).body.unread).toBe(0);
  });
});
