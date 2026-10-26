const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  C = require("../explore-core.js");
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync("explore-data.js", "utf8"), ctx);
const { places, routes } = ctx.window.GORNITSA_DATA;
const ids = new Set(places.map((p) => p.id));
test("complete migration: 30 unique places, 15 unique routes, HTTPS photos", () => {
  assert.equal(places.length, 30);
  assert.equal(ids.size, 30);
  assert.equal(routes.length, 15);
  assert.equal(new Set(routes.map((r) => r.id)).size, 15);
  for (const p of places) {
    assert.ok(p.photos.length);
    for (const u of p.photos) assert.ok(C.photo(u));
    assert.ok(p.source.url.startsWith("https://"));
  }
});
test("all cross-links resolve and unrelated legacy routeLink is discarded", () => {
  for (const p of places) {
    for (const id of p.related) assert.ok(ids.has(id));
    for (const id of p.routeIds)
      assert.ok(routes.some((r) => r.id === id && r.placeIds.includes(p.id)));
  }
  for (const r of routes)
    for (const s of r.steps) if (s.placeId) assert.ok(ids.has(s.placeId));
  assert.ok(!places.find((p) => p.id === "ВЛ-19").routeIds.includes("Т-04"));
});
test("Cyrillic modern, legacy, and path links survive encoding and malformed URLs", () => {
  for (const id of ids) {
    assert.equal(C.parseLocation("#place=" + encodeURIComponent(id)).id, id);
    assert.equal(C.parseLocation("#place-" + encodeURIComponent(id)).id, id);
  }
  assert.equal(C.parseLocation("#place=%E0%A4%A").id, null);
  assert.equal(C.parseLocation("", "/route/%D0%A2-01/").id, "Т-01");
  assert.equal(C.parseLocation("#places", "/place/ВЛ-01"), null);
});
test("storage: forbidden, corrupted, object, unknown IDs, legacy format", () => {
  assert.equal(C.readSaved(null, ids).size, 0);
  for (const raw of ["{", "{}", "null", '"a"'])
    assert.equal(C.readSaved({ getItem: () => raw }, ids).size, 0);
  assert.equal(
    C.readSaved({ getItem: () => JSON.stringify(["ВЛ-01", "bad", 123]) }, ids)
      .size,
    1,
  );
  assert.equal(
    C.readSaved(
      {
        getItem: () => {
          throw Error("denied");
        },
      },
      ids,
    ).size,
    0,
  );
});
test("filters preserve imported categories, search folds ё, favorites are independent", () => {
  const saved = new Set(["ВЛ-03"]);
  assert.ok(places.filter((p) => C.matches(p, "sea", "", saved)).length > 0);
  assert.equal(
    places.filter((p) => C.matches(p, "all", "федорова", saved))[0].id,
    "ВЛ-29",
  );
  assert.equal(
    places.filter((p) => C.matches(p, "saved", "", saved)).length,
    1,
  );
  assert.equal(
    places.filter((p) => C.matches(p, "all", "несуществующее место", saved))
      .length,
    0,
  );
});
test("recommendations are real, honor preferences, and rotate beyond two places", () => {
  for (const mood of ["quiet", "wow", "date", "active"])
    for (const company of ["any", "kids"])
      for (const free of [true, false]) {
        const p = C.choose(places, mood, company, free);
        if (p) {
          assert.ok(ids.has(p.id));
          if (company === "kids") assert.ok(p.cats.includes("kids"));
          if (free)
            assert.ok(
              p.info.some((f) => f.k === "Вход" && /свобод|бесплат/i.test(f.v)),
            );
        }
      }
  const seen = new Set();
  let prev;
  for (let i = 0; i < 8; i++) {
    const p = C.choose(places, "quiet", "any", false, prev);
    seen.add(p.id);
    prev = p.id;
  }
  assert.ok(seen.size > 2);
  assert.equal(C.choose([], "quiet", "any", false), null);
});
test("escape untrusted data and reject unsafe image protocols", () => {
  assert.equal(
    C.escapeHTML('<img onerror="bad">'),
    "&lt;img onerror=&quot;bad&quot;&gt;",
  );
  assert.equal(C.photo("javascript:alert(1)"), "");
  assert.equal(C.photo("http://example.com/a.jpg"), "");
  assert.ok(C.photo(places[0].photos[0], 700).includes("w_700"));
});
test("only independently checked cards have verification dates", () => {
  assert.equal(places.filter((p) => p.source.checkedAt).length, 3);
  for (const r of routes) assert.equal(r.source.checkedAt, null);
});
test("Tobizina correction uses Karpinsky Bay and removes fictional detours", () => {
  const r = routes.find((r) => r.id === "Т-02");
  assert.ok(r.correction.url.includes("visit-primorye.ru"));
  assert.ok(r.steps.some((s) => s.name === "Бухта Карпинского"));
  assert.ok(!JSON.stringify(r).includes("Океанариум ДВФУ"));
  assert.ok(!r.alert.includes("22:30"));
});
