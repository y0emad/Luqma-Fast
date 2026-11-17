import { beforeEach, describe, expect, it } from "vitest";
import { api, auth, createUser, resetDb } from "./helpers";

beforeEach(resetDb);

const address = { title: "Home", address: "12 Nile St", landmark: "Near the bank", house: "5", lat: 30.04, lon: 31.23 };

describe("addresses", () => {
  it("a user can create, update and delete their own address", async () => {
    const user = await createUser();
    const created = await api().post("/api/addresses/createAddress").set(auth(user)).send(address);
    expect(created.status).toBe(201);
    const id = created.body.data._id;

    const updated = await api().patch(`/api/addresses/updateAddress/${id}`).set(auth(user)).send({ title: "Work" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.title).toBe("Work");

    const deleted = await api().delete(`/api/addresses/deleteAddress/${id}`).set(auth(user));
    expect(deleted.status).toBe(200);
  });

  it("can't touch another user's address (404, not 403)", async () => {
    const [owner, other] = [await createUser(), await createUser()];
    const created = await api().post("/api/addresses/createAddress").set(auth(owner)).send(address);
    const id = created.body.data._id;

    expect((await api().patch(`/api/addresses/updateAddress/${id}`).set(auth(other)).send({ title: "Mine" })).status).toBe(404);
    expect((await api().delete(`/api/addresses/deleteAddress/${id}`).set(auth(other))).status).toBe(404);
    expect((await api().get(`/api/addresses/getAddress/${id}`).set(auth(other))).status).toBe(404);

    const list = await api().get("/api/addresses/getAddresses").set(auth(other));
    expect(list.status).toBe(200);
    expect(list.body.data).toEqual([]);
  });

  it("rejects a malformed id", async () => {
    const user = await createUser();
    const res = await api().delete("/api/addresses/deleteAddress/not-an-id").set(auth(user));
    expect(res.status).toBe(422);
  });
});
