import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWebsiteConversion,
  parseWebsiteConversionStats,
} from "./conversion.ts";

test("counts a person who booked and called once", () => {
  const stats = parseWebsiteConversionStats({
    trackingStartedAt: "2026-11-06T15:00:00.000Z",
    pageviews: 40,
    visitors: 10,
    sessions: 12,
    callers: 3,
    callTaps: 5,
    bookers: 2,
    converters: 4,
    onlineBookings: 2,
    phoneAppointments: 1,
    daily: [{ date: "2026-11-06", visitors: 10, calls: 3, bookings: 2 }],
  });
  assert.ok(stats);

  const result = buildWebsiteConversion(stats, ["2026-11-05", "2026-11-06"]);
  assert.equal(result.available, true);
  assert.equal(result.conversions, 4);
  assert.equal(result.conversionRate, 40);
  assert.equal(result.unattributedBookings, 0);
  assert.deepEqual(result.trend, [
    { date: "2026-11-05", visitors: 0, calls: 0, bookings: 0 },
    { date: "2026-11-06", visitors: 10, calls: 3, bookings: 2 },
  ]);
});

test("keeps bookings from before visit tracking out of the rate", () => {
  const stats = parseWebsiteConversionStats({
    trackingStartedAt: "2026-11-06T15:00:00.000Z",
    pageviews: 20,
    visitors: 10,
    sessions: 10,
    callers: 2,
    callTaps: 2,
    bookers: 1,
    converters: 3,
    onlineBookings: 80,
    phoneAppointments: 0,
    daily: [],
  });
  assert.ok(stats);

  const result = buildWebsiteConversion(stats, ["2026-11-06"]);
  assert.equal(result.conversionRate, 30);
  assert.equal(result.conversions, 3);
  assert.equal(result.onlineBookings, 80);
  assert.equal(result.unattributedBookings, 79);
});

test("a call with no page view still counts in the rate", () => {
  const stats = parseWebsiteConversionStats({
    trackingStartedAt: null,
    pageviews: 0,
    visitors: 0,
    sessions: 0,
    callers: 1,
    callTaps: 1,
    bookers: 0,
    converters: 1,
    onlineBookings: 0,
    phoneAppointments: 0,
    daily: [],
  });
  assert.ok(stats);

  const result = buildWebsiteConversion(stats, []);
  assert.equal(result.conversionRate, 100);
  assert.equal(result.conversions, 1);
});

test("rejects a malformed aggregate", () => {
  assert.equal(parseWebsiteConversionStats(null), null);
  assert.equal(parseWebsiteConversionStats("nope"), null);
});

test("accepts a JSON string from the database", () => {
  const stats = parseWebsiteConversionStats(
    JSON.stringify({
      trackingStartedAt: null,
      pageviews: 1,
      visitors: 1,
      sessions: 1,
      callers: 0,
      callTaps: 0,
      bookers: 0,
      converters: 0,
      onlineBookings: 0,
      phoneAppointments: 0,
      daily: [],
    })
  );
  assert.equal(stats?.visitors, 1);
});
