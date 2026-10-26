(function (root, factory) {
  const core = factory();
  if (typeof module === "object" && module.exports) module.exports = core;
  else root.GornitsaCore = core;
})(typeof window !== "undefined" ? window : this, function () {
  "use strict";
  function safeDecode(v) {
    try {
      return decodeURIComponent(v);
    } catch {
      return null;
    }
  }
  function parseLocation(hash, path = "") {
    const modern = hash.match(/^#(place|route)=(.+)$/),
      legacy = hash.match(/^#(place|route)-(.+)$/),
      old = path.match(/^\/(place|route)\/([^/]+)\/?$/);
    const m = modern || legacy || (!hash && old);
    return m ? { type: m[1], id: safeDecode(m[2]) } : null;
  }
  function readSaved(storage, ids) {
    try {
      const raw = JSON.parse(
        storage.getItem("gornitsa-saved-v3") ||
          storage.getItem("gornitsa-demo-saved") ||
          "[]",
      );
      return new Set(
        Array.isArray(raw)
          ? raw.filter((v) => typeof v === "string" && ids.has(v))
          : [],
      );
    } catch {
      return new Set();
    }
  }
  function photo(url, width = 900) {
    try {
      const u = new URL(url);
      if (u.protocol !== "https:") return "";
      if (u.hostname === "res.cloudinary.com")
        return url.replace(
          "/upload/",
          "/upload/f_auto,q_auto,c_limit,w_" + width + "/",
        );
      return url;
    } catch {
      return "";
    }
  }
  function matches(p, filter, query, saved) {
    const q = query.trim().toLocaleLowerCase("ru").replace(/ё/g, "е");
    const text = (p.name + " " + p.description)
      .toLocaleLowerCase("ru")
      .replace(/ё/g, "е");
    return (
      (!q || text.includes(q)) &&
      (filter === "all" ||
        (filter === "saved" ? saved.has(p.id) : p.cats.includes(filter)))
    );
  }
  function choose(places, mood, company, free, exclude) {
    const tag =
      { quiet: "sea", wow: "view", date: "date", active: "park" }[mood] ||
      "sea";
    const candidates = places.filter(
      (p) =>
        p.cats.includes(tag) &&
        (mood !== "quiet" || !p.cats.includes("history")) &&
        (company !== "kids" || p.cats.includes("kids")) &&
        (!free ||
          p.info.some((f) => f.k === "Вход" && /свобод|бесплат/i.test(f.v))),
    );
    const index = candidates.findIndex((p) => p.id === exclude);
    return candidates.length
      ? candidates[(index + 1) % candidates.length]
      : null;
  }
  function escapeHTML(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }
  return {
    safeDecode,
    parseLocation,
    readSaved,
    photo,
    matches,
    choose,
    escapeHTML,
  };
});
