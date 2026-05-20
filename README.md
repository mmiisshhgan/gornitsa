# ГорницаВДК · готовая сборка

## Что внутри

```
gornitsa-final/
├── index.html              ← главный файл (заменяет существующий)
├── robots.txt              ← в корень сайта
├── sitemap.xml             ← в корень
├── sitemap-core.xml        ← в корень
├── sitemap-places.xml      ← в корень
├── sitemap-routes.xml      ← в корень
├── manifest.webmanifest    ← в корень
├── _headers                ← в корень (Netlify / Cloudflare Pages)
└── _redirects              ← в корень (SPA-роутинг)
```

Всё. Один index.html со встроенным SEO, метаданными, JSON-LD, роутером и mobile-fix'ами. Никакого склеивания кусков.

---

## Что я сделал в твоём `index.html`

Просто заливаешь — работает. Внутри уже стоит:

- **Бренд-сущность** `ГорницаВДК` во всех мета, title, structured data
- **JSON-LD** (Organization, WebSite, WebPage, BreadcrumbList, Place, TouristInformationCenter, FAQPage, + динамические ItemList на 30 локаций и 15 маршрутов)
- **Crawlable контент** — спрятанный SEO-блок с h1/h2/h3 и ссылками на все 30 локаций и 15 маршрутов (видят Яндекс и Google боты)
- **Навигация** `<button onclick>` → `<a href>` — Cmd+click работает, share работает, бот видит ссылки
- **Real URL** для каждой секции: `/routes/`, `/places/`, `/seafood/`, `/meet/`, `/today/`, `/place/<id>/`, `/route/<id>/` через `history.pushState`
- **`<main>`** ландмарк, корректная иерархия h1/h2
- **Футер** с микроразметкой `schema.org/Organization`, `PostalAddress`, `GeoCoordinates`
- **iOS Safari**: `dvh`/`svh` (нет прыжка viewport под адресбар), `env(safe-area-inset)` (notch / Dynamic Island), `min-height: 44px` на тапах, font-size ≥16px (нет zoom при фокусе input)
- **Mobile-perf**: `content-visibility` на lazy-images, `aspect-ratio` на карточках (нулевой CLS), `touch-action: manipulation`, `prefers-reduced-motion`
- **Telegram-WebView**: фон body, text-size-adjust, smooth scroll
- **Open Graph + Twitter Card** под Telegram/VK/Instagram превью

---

## Что нужно сделать ОДИН раз перед заливкой

### 1. Подставить токены верификации (5 минут)

В `index.html`, в `<head>`, найди две строки и замени:

```html
<meta name="yandex-verification" content="REPLACE_WITH_YANDEX_TOKEN">
<meta name="google-site-verification" content="REPLACE_WITH_GOOGLE_TOKEN">
```

Где взять токены:
- **Яндекс.Вебмастер** → https://webmaster.yandex.ru → Добавить сайт `gornitsa.ru` → выбрать способ «Метатег» → скопировать значение `content="..."` → вставить вместо `REPLACE_WITH_YANDEX_TOKEN`
- **Google Search Console** → https://search.google.com/search-console → Добавить ресурс `https://gornitsa.ru` → способ «HTML-тег» → так же

### 2. Создать 3 картинки (15 минут в Figma)

Положить в корень сайта рядом с index.html:

- `og-cover.jpg` — **1200 × 630 JPEG**, ≤ 200 КБ. Это превью в Telegram / VK / Twitter / Facebook. Сейчас старая SVG-картинка в data-URI часто ломается в Telegram. Стиль: фон `#1E140D`, акцент `#C12B26`, текст «ГорницаВДК · городской гид Владивостока»
- `logo-512.png` — **512 × 512 PNG** (квадратное лого для JSON-LD)
- `apple-touch-icon.png` — **180 × 180 PNG** (иконка на главный экран iPhone)

Опционально: `favicon.svg`, `favicon-32.png`, `favicon-16.png`, `icon-192.png`, `icon-512.png`, `icon-192-maskable.png`, `icon-512-maskable.png` для манифеста PWA. Без них сайт работает, просто фавиконы будут дефолтные.

### 3. Залить всё в корень сайта

Через Netlify / Cloudflare Pages / любой статик-хостинг:

```
/var/www/gornitsa.ru/
├── index.html
├── og-cover.jpg            ← добавил сам
├── logo-512.png            ← добавил сам
├── apple-touch-icon.png    ← добавил сам
├── robots.txt
├── sitemap.xml
├── sitemap-core.xml
├── sitemap-places.xml
├── sitemap-routes.xml
├── manifest.webmanifest
├── _headers
└── _redirects
```

### 4. После деплоя — зарегистрировать сайт

- **Яндекс.Вебмастер**: подтвердить права → Регион → выбрать Владивосток → Sitemap → `https://gornitsa.ru/sitemap.xml` → Переобход страниц → подать главную
- **Google Search Console**: подтвердить → Sitemap → `sitemap.xml` → Inspect URL → запросить индексацию

---

## Что проверить после деплоя

| Что | Где |
|---|---|
| Превью в Telegram | https://webhook.site/redirect-checker — кинь ссылку, посмотри карточку |
| Богатые сниппеты | https://search.google.com/test/rich-results |
| Микроразметка Яндекса | https://webmaster.yandex.ru/tools/microtest/ |
| Mobile-friendly | https://search.google.com/test/mobile-friendly |
| Core Web Vitals | https://pagespeed.web.dev/ → цель: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 |

---

## Что НЕ нужно делать вручную

- Не нужно ничего вставлять, копировать, склеивать
- Не нужно править отдельные блоки
- Не нужно понимать, как работает роутер или JSON-LD

Файл `index.html` — это **один цельный production-ready файл**. Просто заливаешь.
