import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSiteInsights,
  emptyEngagement,
  labelReferrer,
  parseEngagement,
} from "./engagement.ts";

test("names the sites people come from", () => {
  assert.equal(labelReferrer(null), "Direct");
  assert.equal(labelReferrer("(direct)"), "Direct");
  assert.equal(labelReferrer("google.com"), "Google");
  assert.equal(labelReferrer("www.google.co.uk"), "Google");
  assert.equal(labelReferrer("l.instagram.com"), "Instagram");
  assert.equal(labelReferrer("m.facebook.com"), "Facebook");
  assert.equal(labelReferrer("yelp.com"), "Yelp");
});

test("points at the biggest booking drop and the bounce rate", () => {
  const insights = buildSiteInsights(
    {
      ...emptyEngagement(),
      bounceSessions: 1,
      measuredSessions: 4,
      newVisitors: 3,
      returningVisitors: 1,
      sources: [
        { host: "google.com", visits: 2 },
        { host: "www.google.co.uk", visits: 1 },
        { host: "(direct)", visits: 4 },
      ],
      calls: [{ placement: "header", people: 2 }],
      ctas: [{ placement: "service:pedi-classic", people: 4 }],
      funnel: [
        { step: "services", people: 10 },
        { step: "technician", people: 8 },
        { step: "time", people: 3 },
        { step: "details", people: 2 },
        { step: "confirm", people: 2 },
        { step: "booked", people: 1 },
      ],
    },
    12,
    4
  );

  assert.equal(insights.bounceRate, 25);
  assert.equal(insights.pagesPerVisit, 3);
  assert.equal(insights.biggestDrop?.from, "Choose a technician");
  assert.equal(insights.biggestDrop?.to, "Pick a time");
  assert.equal(insights.biggestDrop?.people, 5);
  assert.equal(insights.sources[0]?.label, "Direct");
  assert.equal(insights.sources[0]?.value, 4);
  assert.equal(insights.sources.find((source) => source.label === "Google")?.value, 3);
  assert.equal(insights.funnel[2]?.percentOfStart, 30);
  assert.equal(insights.taps[0]?.placement, "service:pedi-classic");
  assert.equal(insights.taps[0]?.people, 4);
});

test("drops malformed engagement rows", () => {
  const raw = parseEngagement({
    devices: "nope",
    sources: [{ host: "yelp.com", visits: 2 }, { host: 4, visits: "lots" }],
  });
  assert.deepEqual(raw.devices, []);
  assert.equal(raw.sources[0]?.host, "yelp.com");
  assert.equal(raw.sources[0]?.visits, 2);
  assert.equal(raw.sources[1]?.visits, 0);
});
