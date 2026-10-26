// Deterministic migration: only literal arrays are evaluated in an isolated context.
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync("index.html", "utf8");
function extract(name) {
  const token = "const " + name + "=";
  const found = source.indexOf(token);
  if (found < 0) throw Error("Missing dataset: " + name);
  const start = found + token.length;
  let depth = 0,
    quote = "",
    escaped = false;
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === quote) quote = "";
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      continue;
    }
    if (c === "[" || c === "{") depth++;
    if (c === "]" || c === "}") {
      if (--depth === 0)
        return vm.runInNewContext(
          "(" + source.slice(start, i + 1) + ")",
          {},
          { timeout: 1000 },
        );
    }
  }
  throw Error("Incomplete dataset: " + name);
}
const strip = (s) =>
  String(s || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
const rawPlaces = extract("PLACES"),
  rawRoutes = extract("ROUTES");
const archive = {
  label: "Исходная база Горницы",
  url: "https://github.com/mmiisshhgan/gornitsa/blob/47c0b033c92a10ff4ba711f41604c994ddf9e900/index.html",
  importedAt: "2026-10-26",
  checkedAt: null,
};
const normalize = (s) =>
  s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^а-яa-z0-9]/g, "");
const normalizeId = (id) => String(id).replace(/^L-/, "ВЛ-");
const category = {
  date: "Для двоих",
  kids: "С детьми",
  view: "Вид сверху",
  solo: "В своём ритме",
  sea: "У моря",
  history: "История города",
  park: "Зелёный город",
  food: "Море и кофе",
};
const overrides = {
  "ВЛ-01": {
    description:
      "Подняться над городом и увидеть, как бухта Золотой Рог соединяет мост, порт и жилые сопки. Один из вариантов подхода — от верхней станции фуникулёра.",
    source: {
      label: "ТИЦ Приморского края",
      url: "https://visit-primorye.ru/what-to-do/sopka-orlinoe-gnezdo",
      checkedAt: "2026-10-26",
      scope: "Расположение, панорама и подход от фуникулёра",
    },
    info: [
      { k: "Где", v: "Исторический центр Владивостока" },
      { k: "Подход", v: "От верхней станции фуникулёра; далее пешком" },
      { k: "Вход", v: "Бесплатно по данным ТИЦ" },
    ],
  },
  "ВЛ-03": {
    description:
      "Белая башня в конце каменистой косы, проходящие суда и открытый горизонт. Коса затапливается при подъёме воды: если проход залит, оставайся на берегу.",
    source: {
      label: "ТИЦ Приморского края",
      url: "https://visit-primorye.ru/what-to-do/mayak-tokarevskogo",
      checkedAt: "2026-10-26",
      scope: "Расположение и затопление косы",
    },
    info: [
      { k: "Где", v: "Токаревская кошка, Владивосток" },
      {
        k: "Подход",
        v: "По каменистой косе, только при сухом безопасном проходе",
      },
      { k: "Ограничение", v: "Не переходить по воде и в шторм" },
    ],
  },
  "ВЛ-07": {
    description:
      "Пройти лесом к скалистому берегу острова Русский. От бухты Карпинского до мыса — около 2,5 км пешком. Возвращение и дорогу до бухты учитывай отдельно.",
    source: {
      label: "ТИЦ Приморского края",
      url: "https://visit-primorye.ru/what-to-do/mys-tobizina",
      checkedAt: "2026-10-26",
      scope: "Подход от бухты Карпинского и расстояние",
    },
    info: [
      { k: "Где", v: "Остров Русский, мыс Тобизина" },
      { k: "Пешком", v: "Около 2,5 км в одну сторону от бухты Карпинского" },
      {
        k: "Подход",
        v: "От конца асфальта Университетского проспекта — пешком к бухте",
      },
      {
        k: "Подготовка",
        v: "Запас воды, цепкая обувь, световой день для возвращения",
      },
    ],
  },
};
const places = rawPlaces.map((p) => {
  const override = overrides[p.id] || {};
  const cats = [...new Set([p.cat, ...(p.tags || [])])];
  return {
    id: p.id,
    name: p.nm,
    tag: category[p.cat] || "Городская коллекция",
    cats,
    description: strip(p.teaser) || strip(p.atmo) || strip(p.tagline),
    story: strip(p.body),
    photos: p.photos || [],
    info: (p.info || []).map((f) => ({ k: strip(f.k), v: strip(f.v) })),
    when: (p.when || []).map((f) => ({ title: strip(f.t), text: strip(f.d) })),
    related: (p.nearby || [])
      .map(normalizeId)
      .filter((id) => rawPlaces.some((x) => x.id === id)),
    source: { ...archive },
    photoRights:
      "Авторство и разрешение на публикацию фотографий не подтверждены.",
    ...override,
  };
});
// Cross-links match stop names; legacy routeLink values often point to unrelated trips.
const routes = rawRoutes.map((r) => ({
  id: r.id,
  title: r.title,
  description: strip(r.folk),
  distance: r.dist,
  time: r.time,
  difficulty: r.diff,
  source: { ...archive },
  tips: (r.tips || []).map(strip),
  alert: strip(r.alert),
  steps: (r.steps || []).map((s) => {
    if (s.tr) return { transfer: strip(s.tr) };
    const match = places.find(
      (p) =>
        normalize(s.pl).includes(normalize(p.name)) ||
        normalize(p.name).includes(normalize(s.pl)),
    );
    return {
      name: strip(s.pl),
      time: strip(s.tm),
      description: strip(s.dc),
      tip: strip(s.tip),
      photos: s.photos || [],
      placeId: match?.id || null,
    };
  }),
  photos: r.photos?.length
    ? r.photos
    : (r.steps || []).flatMap((s) => s.photos || []).slice(0, 3),
}));
// Replace the misleading oceanarium detour and unverified last-bus promise.
// The TIC describes a foot approach via Karpinsky Bay, not a walk from FEFU.
const tob = routes.find((r) => r.id === "Т-02");
Object.assign(tob, {
  title: "Мыс Тобизина — от бухты к скалам",
  description:
    "Лесная тропа, скалы и открытое море. Пеший маршрут от бухты Карпинского и обратно.",
  distance: "около 5 км от бухты и обратно",
  time: "от 2 ч + подход к бухте",
  alert:
    "Не подходи к обрывам. Вернись до темноты; на дорогу до бухты и обратно заложи дополнительное время. Транспорт проверь отдельно.",
  tips: [
    "Вода и перекус с собой",
    "Обувь с цепкой подошвой",
    "Лис не кормить и не трогать",
  ],
  photos: places.find((p) => p.id === "ВЛ-07").photos,
  steps: [
    {
      name: "Конец асфальта Университетского проспекта",
      time: "Подход",
      description:
        "От конца асфальтированной дороги пешком к бухте Карпинского. По описанию ТИЦ этот подход занимает около 15 минут.",
      photos: [],
      placeId: null,
    },
    {
      name: "Бухта Карпинского",
      time: "Начало тропы",
      description:
        "От бухты до мыса — около 2,5 км по тропе, примерно час неспешным шагом. Время на остановки и возвращение учитывай отдельно.",
      photos: [],
      placeId: null,
    },
    {
      name: "Мыс Тобизина",
      time: "Точка разворота",
      description:
        "Полюбуйся скалами с безопасного расстояния. Возвращайся по знакомой тропе к бухте.",
      photos: [],
      placeId: "ВЛ-07",
    },
  ],
  correction: {
    url: "https://visit-primorye.ru/what-to-do/mys-tobizina",
    date: "2026-10-26",
    scope:
      "Исправлен подход к мысу по описанию ТИЦ. 5 км и 2 часа туда-обратно рассчитаны из 2,5 км и примерно часа в одну сторону; это ориентиры, не измеренный трек.",
  },
});
const manualLinks = {
  "Т-05": ["ВЛ-03"],
  "Т-07": ["ВЛ-01"],
  "Т-09": ["ВЛ-02"],
  "Т-14": ["ВЛ-17", "ВЛ-05"],
};
for (const r of routes) {
  r.placeIds = [
    ...new Set([
      ...r.steps.map((s) => s.placeId).filter(Boolean),
      ...(manualLinks[r.id] || []),
    ]),
  ];
}
for (const p of places)
  p.routeIds = routes.filter((r) => r.placeIds.includes(p.id)).map((r) => r.id);
fs.writeFileSync(
  "explore-data.js",
  "// Generated by scripts/export-explore-data.cjs. Do not edit by hand.\nwindow.GORNITSA_DATA = " +
    JSON.stringify({ version: 3, importedAt: "2026-10-26", places, routes }) +
    ";\n",
);
console.log(`Exported ${places.length} places and ${routes.length} routes`);
