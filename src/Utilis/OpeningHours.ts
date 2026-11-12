import { DateTime } from "luxon";

// Restaurants store their hours as "HH:mm" in the app's timezone (Cairo by default),
// so "is it open now?" is answered in that timezone, whatever the server's own timezone is.
export const APP_TZ = process.env.APP_TZ || "Africa/Cairo";

const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
};

type Hours = { opening_time: string; closing_time: string; isClosed?: boolean };

// Handles hours that cross midnight (e.g. 18:00 → 02:00). Equal opening and
// closing times mean open all day. The closing minute itself is already closed.
export function isOpenAt(r: Hours, at: Date = new Date()): boolean {
    if (r.isClosed) return false;
    const open = toMinutes(r.opening_time);
    const close = toMinutes(r.closing_time);
    if (open === close) return true;

    const local = DateTime.fromJSDate(at).setZone(APP_TZ);
    const now = local.hour * 60 + local.minute;
    return open < close ? now >= open && now < close : now >= open || now < close;
}

// Adds `is_open` to a restaurant (document or plain object) for API responses.
export function withOpenFlag(r: any, at: Date = new Date()) {
    const plain = typeof r?.toJSON === "function" ? r.toJSON() : r;
    return { ...plain, is_open: isOpenAt(plain, at) };
}

// Start and end of a day in the app timezone, as real instants (for DB queries).
export function dayRange(day?: string) {
    const base = day ? DateTime.fromISO(day, { zone: APP_TZ }) : DateTime.now().setZone(APP_TZ);
    const start = base.startOf("day");
    return { from: start.toJSDate(), to: start.plus({ days: 1 }).toJSDate() };
}
