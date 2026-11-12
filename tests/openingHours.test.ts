import { describe, expect, it } from "vitest";
import { dayRange, isOpenAt } from "../src/Utilis/OpeningHours";

// Cairo is UTC+2 in January, so 10:00Z is 12:00 there.
const cairo = (hhmm: string, day = "2026-01-15") => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(2026, 0, Number(day.slice(8)), h - 2, m));
};

describe("isOpenAt", () => {
  const lunch = { opening_time: "09:00", closing_time: "23:00" };

  it("uses the restaurant's hours in Cairo time, not the server's", () => {
    expect(isOpenAt(lunch, cairo("12:00"))).toBe(true);
    expect(isOpenAt(lunch, cairo("08:59"))).toBe(false);
    expect(isOpenAt(lunch, cairo("09:00"))).toBe(true);
  });

  it("the closing minute is already closed", () => {
    expect(isOpenAt(lunch, cairo("22:59"))).toBe(true);
    expect(isOpenAt(lunch, cairo("23:00"))).toBe(false);
  });

  it("handles hours that cross midnight", () => {
    const late = { opening_time: "18:00", closing_time: "02:00" };
    expect(isOpenAt(late, cairo("23:30"))).toBe(true);
    expect(isOpenAt(late, cairo("01:59"))).toBe(true);
    expect(isOpenAt(late, cairo("02:00"))).toBe(false);
    expect(isOpenAt(late, cairo("12:00"))).toBe(false);
  });

  it("equal times mean open all day, and isClosed always wins", () => {
    expect(isOpenAt({ opening_time: "00:00", closing_time: "00:00" }, cairo("03:00"))).toBe(true);
    expect(isOpenAt({ ...lunch, isClosed: true }, cairo("12:00"))).toBe(false);
  });

  it("follows Cairo's summer time (UTC+3)", () => {
    // 2026-07-15 08:30Z is 11:30 in Cairo (summer), but 10:30 in UTC+2.
    const summer = new Date(Date.UTC(2026, 6, 15, 8, 30));
    expect(isOpenAt({ opening_time: "11:00", closing_time: "12:00" }, summer)).toBe(true);
  });
});

describe("dayRange", () => {
  it("is a Cairo day, not a UTC day", () => {
    const { from, to } = dayRange("2026-01-15");
    expect(from.toISOString()).toBe("2026-01-14T22:00:00.000Z");
    expect(to.toISOString()).toBe("2026-01-15T22:00:00.000Z");
  });
});
