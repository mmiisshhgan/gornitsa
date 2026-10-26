/* Gornitsa's preview application. No build step, trackers, or fabricated fallback data. */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)],
    C = window.GornitsaCore,
    D = window.GORNITSA_DATA;
  $("#reload-data").onclick = () => location.reload();
  if (!C || !D || !Array.isArray(D.places) || !D.places.length) {
    $("#data-error").hidden = false;
    $("#show-more").hidden = true;
    $("#suggestion-open").disabled = true;
    $("#suggestion-next").disabled = true;
    $("#suggestion-name").textContent = "Подбор временно недоступен";
    return;
  }
  const E = C.escapeHTML,
    places = D.places,
    routes = D.routes,
    ids = new Set(places.map((p) => p.id));
  let storage;
  try {
    storage = window.localStorage;
  } catch {
    storage = null;
  }
  let saved = C.readSaved(storage, ids),
    storageWorks = !!storage,
    filter = "all",
    limit = 8,
    routeLimit = 3,
    selected = null,
    photoIndex = 0,
    returnFocus = null,
    returnHash = "#places",
    suggestion = null,
    mood = "quiet",
    toastTimer,
    scrollY = 0;
  const dialog = $("#detail"),
    page = $("#page");
  const href = (type, id) => "#" + type + "=" + encodeURIComponent(id);
  const image = (url, w) => E(C.photo(url, w));
  function toast(message) {
    $("#toast").textContent = message;
    $("#toast").classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(
      () => $("#toast").classList.remove("visible"),
      3500,
    );
  }
  function save(id) {
    if (!ids.has(id)) return;
    saved.has(id) ? saved.delete(id) : saved.add(id);
    try {
      storage.setItem("gornitsa-saved-v3", JSON.stringify([...saved]));
      storageWorks = true;
    } catch {
      storageWorks = false;
    }
    updateSaved();
    renderPlaces();
    if (selected?.type === "place") updateSaveButton();
    toast(
      saved.has(id)
        ? storageWorks
          ? "Место сохранено. Твой город становится больше."
          : "Сохранено до закрытия страницы: браузер запретил хранилище."
        : "Место убрано из сохранённого",
    );
  }
  function updateSaved() {
    $("#saved-count").textContent = saved.size;
    $("#nav-saved").setAttribute(
      "aria-label",
      "Открыть избранное, " + saved.size + " мест",
    );
  }
  function card(p, index) {
    return `<article class="place-card"><a class="place-visual" href="${href("place", p.id)}" aria-label="Открыть ${E(p.name)}"><img loading="lazy" decoding="async" src="${image(p.photos[0], index === 0 ? 1100 : 700)}" alt="${E(p.name)} — фото из коллекции Горницы"><span class="place-number">ВДК / ${String(places.indexOf(p) + 1).padStart(2, "0")}</span><span class="place-arrow" aria-hidden="true">↗</span></a><button class="card-save" data-save="${E(p.id)}" aria-pressed="${saved.has(p.id)}" aria-label="${saved.has(p.id) ? "Убрать из избранного: " : "Сохранить: "}${E(p.name)}">${saved.has(p.id) ? "♥" : "♡"}</button><div class="place-info"><div class="place-meta"><span>${E(p.tag)}</span><span class="source-badge">${p.source.checkedAt ? "Сверено с ТИЦ" : "Из архива проекта"}</span></div><h3><a href="${href("place", p.id)}">${E(p.name)}</a></h3><p>${E(p.description)}</p></div></article>`;
  }
  function renderPlaces() {
    let list = places.filter((p) =>
      C.matches(p, filter, $("#search").value, saved),
    );
    if ($("#sort").value === "name")
      list.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    $("#gallery").innerHTML = list.slice(0, limit).map(card).join("");
    $("#result-count").textContent = list.length + " / " + places.length;
    $("#visible-count").textContent = list.length
      ? "Показано " +
        Math.min(limit, list.length) +
        " из " +
        list.length +
        " мест"
      : "";
    $("#empty").hidden = !!list.length;
    $("#show-more").hidden = list.length <= limit;
    $("#empty-title").textContent =
      filter === "saved" ? "Твои открытия ещё впереди" : "Ничего не нашлось";
    $("#empty-text").textContent =
      filter === "saved"
        ? "Нажми на сердечко у понравившегося места — оно останется здесь."
        : "Попробуй другое название или сбрось фильтры.";
  }
  function setFilter(next) {
    filter = next;
    limit = 8;
    $$("[data-filter]").forEach((b) => {
      const active = b.dataset.filter === filter;
      b.classList.toggle("selected", active);
      b.setAttribute("aria-pressed", String(active));
    });
    renderPlaces();
  }
  function routeCard(r, index) {
    const cover = r.photos.find((u) => C.photo(u));
    return `<article class="route-card"><div class="route-top"><span>МАРШРУТ / ${String(index + 1).padStart(2, "0")}</span><span>↝ ${r.steps.filter((s) => s.name).length} ОСТАНОВКИ</span></div><a href="${href("route", r.id)}"><div class="route-image">${cover ? `<img loading="lazy" decoding="async" src="${image(cover, 800)}" alt="${E(r.title)} — фото из архива">` : '<span aria-hidden="true">↝</span>'}</div><h3>${E(r.title)}</h3></a><p>${E(r.description)}</p><div class="route-bottom"><span>≈ ${E(r.time)} · ${E(r.distance)}</span><a href="${href("route", r.id)}" aria-label="Открыть маршрут ${E(r.title)}">Открыть ↗</a></div></article>`;
  }
  function renderRoutes() {
    $("#route-grid").innerHTML = routes
      .slice(0, routeLimit)
      .map(routeCard)
      .join("");
    $("#more-routes").hidden = routeLimit >= routes.length;
  }
  function pick(exclude) {
    suggestion = C.choose(
      places,
      mood,
      $("#company").value,
      $("#free-only").checked,
      exclude,
    );
    $("#suggestion-open").disabled = !suggestion;
    $("#suggestion-next").disabled = !suggestion;
    if (!suggestion) {
      $("#suggestion-name").textContent = "Добавим немного свободы?";
      $("#suggestion-text").textContent =
        "Для такого сочетания пока нет мест. Попробуй снять ограничение по входу или изменить настроение.";
      $("#suggestion-photo").removeAttribute("src");
      $("#suggestion-tag").textContent = "НЕТ ПОДХОДЯЩИХ МЕСТ";
      return;
    }
    $("#suggestion-name").textContent = suggestion.name;
    $("#suggestion-text").textContent = suggestion.description;
    $("#suggestion-tag").textContent = suggestion.tag;
    $("#suggestion-photo").style.opacity = "0";
    $("#suggestion-photo").src = C.photo(suggestion.photos[0], 800);
    $("#suggestion-photo").alt = suggestion.name;
  }
  function updateSaveButton() {
    const p = selected.item;
    $("#save-place").textContent = saved.has(p.id)
      ? "♥ В моих местах"
      : "♡ Сохранить";
    $("#save-place").setAttribute("aria-pressed", String(saved.has(p.id)));
  }
  function sourceNote(item, type) {
    const s = item.source;
    $("#source-note").innerHTML =
      `<p><strong>${s.checkedAt ? "Сведения сверены: " + E(s.checkedAt) : "Архив: актуальность не подтверждена"}</strong></p><p>Источник: <a href="${E(s.url)}" target="_blank" rel="noopener noreferrer">${E(s.label)} ↗</a></p>${s.scope ? `<p>Проверены: ${E(s.scope)}. Доступность сегодня не подтверждалась.</p>` : `<p>Импорт: ${E(s.importedAt)}. Время, транспорт, стоимость и доступность требуют уточнения перед поездкой.</p>`}<p>${type === "route" ? "Последовательность и тайминг перенесены из архива; это идея прогулки, а не подтверждённая навигация. " : ""}Фотографии из исходного проекта. Авторство и разрешение на публикацию не подтверждены.</p>`;
  }
  function safeText(p) {
    if (p.id === "ВЛ-04")
      return "В подлодке узкие проходы и пороги. До посещения уточни часы работы музея, стоимость и ограничения по доступности.";
    if (p.cats.includes("sea"))
      return "У моря сильный ветер и скользкие камни. Не выходи на затопленные участки и не подходи к краям обрывов. Выбирай маршрут по погоде.";
    if (p.cats.includes("view"))
      return "На сопках бывают крутые и скользкие участки. Выбирай устойчивую обувь, следи за ветром и возвращайся засветло.";
    return "Перед выходом уточни доступность территории и часы работы. Для вечерней прогулки выбирай освещённые общественные места.";
  }
  function placeBody(p) {
    const map =
      "https://yandex.ru/maps/?text=" +
      encodeURIComponent(p.name + " Владивосток");
    return `<div class="source-status">${p.source.checkedAt ? "Часть сведений сверена с ТИЦ · 26.10.2026" : "Карточка из архива · условия посещения нужно уточнить"}</div><dl class="facts">${p.info.length ? p.info.map((f) => `<div class="fact"><dt>${E(f.k)}</dt><dd>${E(f.v)}</dd></div>`).join("") : '<div class="fact"><dt>Перед выходом</dt><dd>Практические сведения пока не добавлены.</dd></div>'}</dl><a class="map-link" href="${E(map)}" target="_blank" rel="noopener noreferrer"><span>Найти место на Яндекс Картах</span><span>↗</span></a><p class="safety">${E(safeText(p))}</p>${p.story ? `<details class="archive-story"><summary>Ещё немного истории · из архива</summary><p>${E(p.story)}</p></details>` : ""}${
      p.routeIds.length
        ? `<h3>Продолжить прогулку</h3><div class="related-links">${p.routeIds
            .map((id) => {
              const r = routes.find((r) => r.id === id);
              return `<a href="${href("route", id)}">↝ ${E(r.title)}</a>`;
            })
            .join("")}</div>`
        : ""
    }${
      p.related.length
        ? `<h3>Ещё из коллекции</h3><div class="related-links">${p.related
            .slice(0, 3)
            .map((id) => {
              const r = places.find((p) => p.id === id);
              return `<a href="${href("place", id)}">${E(r.name)} ↗</a>`;
            })
            .join("")}</div>`
        : ""
    }`;
  }
  function routeBody(r) {
    const corrected = r.correction;
    return `<div class="source-status">${corrected ? "Подход скорректирован по ТИЦ · доступность сегодня не проверена" : "Маршрут из архива · тайминг и доступность не проверены"}</div><dl class="facts"><div class="fact"><dt>Время — ориентир</dt><dd>≈ ${E(r.time)}</dd></div><div class="fact"><dt>Расстояние — ориентир</dt><dd>${E(r.distance)}</dd></div></dl><p class="safety">${E(r.alert || "Перед поездкой проверь доступность всех точек. Время переходов и транспорта зависит от погоды и дорожной обстановки.")}</p>${corrected ? `<p class="detail-description"><a href="${E(corrected.url)}" target="_blank" rel="noopener noreferrer">ТИЦ Приморья ↗</a> · ${E(corrected.date)}. ${E(corrected.scope)}</p>` : ""}<h3>Точки твоей истории</h3><ol class="route-steps">${r.steps.map((s) => (s.transfer ? `<li class="transfer">↝ ${E(s.transfer)}</li>` : `<li class="route-step"><small>${E(s.time)} · ${corrected ? "ОРИЕНТИР" : "ВРЕМЯ ИЗ АРХИВА"}</small><h3>${E(s.name)}</h3><p>${E(s.description)}</p>${s.placeId ? `<a href="${href("place", s.placeId)}">Открыть место ↗</a>` : ""}<a target="_blank" rel="noopener noreferrer" href="https://yandex.ru/maps/?text=${encodeURIComponent(s.name + " Приморский край")}">Найти на карте ↗</a></li>`)).join("")}</ol>${r.tips.length ? `<h3>Заметки из архива</h3><p class="detail-description">${r.tips.map(E).join("<br>")}</p>` : ""}`;
  }
  function updatePhoto() {
    const photos = selected.item.photos,
      im = $("#detail-photo");
    $("#photo-error").hidden = true;
    if (!photos.length) {
      im.removeAttribute("src");
      $("#photo-error").textContent =
        "В архиве пока нет фотографии этого маршрута.";
      $("#photo-error").hidden = false;
    } else {
      im.style.opacity = "0";
      im.src = C.photo(photos[photoIndex], 1500);
      im.alt = selected.item.name || selected.item.title;
    }
    $("#photo-count").textContent = photos.length
      ? photoIndex + 1 + " / " + photos.length
      : "Без фото";
    $("#photo-prev").disabled = photos.length < 2;
    $("#photo-next").disabled = photos.length < 2;
    $("#photo-dots").innerHTML = photos
      .map(
        (_, i) =>
          `<button class="photo-dot" data-photo="${i}" aria-label="Фото ${i + 1}" aria-pressed="${i === photoIndex}"></button>`,
      )
      .join("");
  }
  function advance(direction) {
    if (!selected || !selected.item.photos.length) return;
    photoIndex =
      (photoIndex + direction + selected.item.photos.length) %
      selected.item.photos.length;
    updatePhoto();
  }
  function openDetail(type, item) {
    if (selected?.type === type && selected.item.id === item.id) return;
    const wasOpen = dialog.open;
    if (!wasOpen) {
      returnFocus = document.activeElement;
      scrollY = window.scrollY;
      page.inert = true;
      document.body.classList.add("locked");
      document.body.style.top = "-" + scrollY + "px";
    }
    selected = { type, item };
    photoIndex = 0;
    $("#share-fallback").hidden = true;
    $("#detail-title").textContent = item.name || item.title;
    $("#detail-description").textContent = item.description;
    $("#detail-kicker").textContent =
      type === "place" ? "МЕСТО / " + item.id : "МАРШРУТ / " + item.id;
    $("#save-place").hidden = type !== "place";
    if (type === "place") updateSaveButton();
    $("#detail-body").innerHTML =
      type === "place" ? placeBody(item) : routeBody(item);
    sourceNote(item, type);
    updatePhoto();
    $("#detail-content").scrollTop = 0;
    if (!wasOpen) dialog.showModal();
    dialog.scrollTop = 0;
    $("#detail-close").focus({ preventScroll: true });
  }
  function hideDetail() {
    if (!dialog.open) return;
    dialog.close();
    selected = null;
    page.inert = false;
    document.body.classList.remove("locked");
    document.body.style.top = "";
    window.scrollTo(0, scrollY);
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    else $("#search").focus({ preventScroll: true });
  }
  function navigate(type, id) {
    if (!dialog.open) returnHash = location.hash || "#places";
    history.pushState({ gornitsa: true }, "", href(type, id));
    syncLocation();
  }
  function closeDetail() {
    history.replaceState(
      null,
      "",
      location.pathname +
        location.search +
        (returnHash.startsWith("#place") || returnHash.startsWith("#route=")
          ? "#places"
          : returnHash),
    );
    hideDetail();
  }
  function syncLocation() {
    const target = C.parseLocation(location.hash, location.pathname);
    if (!target) {
      hideDetail();
      return;
    }
    const item = (target.type === "place" ? places : routes).find(
      (x) => x.id === target.id,
    );
    if (item) openDetail(target.type, item);
    else {
      hideDetail();
      toast("Такой точки нет в коллекции. Выбери другую.");
      history.replaceState(
        null,
        "",
        location.pathname + location.search + "#places",
      );
    }
  }
  async function share() {
    const title = selected.item.name || selected.item.title,
      url = location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: "Место для новой истории — Горница",
          url,
        });
        return;
      }
    } catch (err) {
      if (err.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Ссылка на выбранную точку скопирована");
    } catch {
      $("#share-fallback").hidden = false;
      $("#share-url").value = url;
      $("#share-url").focus();
      $("#share-url").select();
    }
  }
  // Delegation keeps controls working after filtering, paging, and modal navigation.
  document.addEventListener("click", (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return;
    const saveBtn = e.target.closest("[data-save]");
    if (saveBtn) {
      save(saveBtn.dataset.save);
      return;
    }
    const hero = e.target.closest("[data-place]");
    if (hero) {
      navigate("place", hero.dataset.place);
      return;
    }
    const link = e.target.closest("a[href]");
    if (link) {
      const target = C.parseLocation(link.getAttribute("href"));
      if (target) {
        e.preventDefault();
        navigate(target.type, target.id);
      }
    }
  });
  $$("[data-filter]").forEach((b) =>
    b.addEventListener("click", () => setFilter(b.dataset.filter)),
  );
  $("#search").addEventListener("input", () => {
    limit = 8;
    renderPlaces();
  });
  $("#sort").onchange = () => renderPlaces();
  $("#show-more").onclick = () => {
    limit += 8;
    renderPlaces();
  };
  $("#reset").onclick = () => {
    $("#search").value = "";
    setFilter("all");
  };
  $("#more-routes").onclick = () => {
    routeLimit = routes.length;
    renderRoutes();
  };
  function showSaved() {
    $("#search").value = "";
    setFilter("saved");
    $("#places").scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  $("#nav-saved").onclick = showSaved;
  $("#mobile-saved").onclick = showSaved;
  $$("[data-mood]").forEach(
    (b) =>
      (b.onclick = () => {
        mood = b.dataset.mood;
        $$("[data-mood]").forEach((x) =>
          x.setAttribute("aria-pressed", String(x === b)),
        );
        pick();
      }),
  );
  $("#company").onchange = () => pick();
  $("#free-only").onchange = () => pick();
  $("#suggestion-next").onclick = () => pick(suggestion?.id);
  $("#suggestion-open").onclick = () => {
    if (suggestion) navigate("place", suggestion.id);
  };
  $("#detail-close").onclick = closeDetail;
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    closeDetail();
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        closeDetail();
    }
  });
  $("#save-place").onclick = () => save(selected.item.id);
  $("#share").onclick = share;
  $("#photo-next").onclick = () => advance(1);
  $("#photo-prev").onclick = () => advance(-1);
  $("#photo-dots").onclick = (e) => {
    const b = e.target.closest("[data-photo]");
    if (b) {
      photoIndex = Number(b.dataset.photo);
      updatePhoto();
    }
  };
  $("#detail-photo").onload = () => {
    $("#detail-photo").style.opacity = "1";
  };
  $("#suggestion-photo").onload = () => {
    $("#suggestion-photo").style.opacity = "1";
  };
  $("#detail-photo").onerror = () => {
    $("#photo-error").textContent =
      "Фотография недоступна. Попробуй следующий кадр.";
    $("#photo-error").hidden = false;
  };
  document.addEventListener("keydown", (e) => {
    if (!dialog.open) return;
    if (e.target.matches("input,textarea,select")) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      advance(1);
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      advance(-1);
    }
  });
  let touchX = null,
    touchY = null;
  $("#detail-visual").addEventListener(
    "touchstart",
    (e) => {
      touchX = e.changedTouches[0].clientX;
      touchY = e.changedTouches[0].clientY;
    },
    { passive: true },
  );
  $("#detail-visual").addEventListener(
    "touchend",
    (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX,
        dy = e.changedTouches[0].clientY - touchY;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5)
        advance(dx < 0 ? 1 : -1);
      touchX = null;
    },
    { passive: true },
  );
  window.addEventListener("hashchange", syncLocation);
  window.addEventListener("popstate", syncLocation);
  window.addEventListener("storage", (e) => {
    if (e.key === "gornitsa-saved-v3") {
      saved = C.readSaved(storage, ids);
      updateSaved();
      renderPlaces();
      if (selected?.type === "place") updateSaveButton();
    }
  });
  // Weather is optional: a network error leaves a useful external forecast link.
  async function weather() {
    const control = new AbortController(),
      timer = setTimeout(() => control.abort(), 6500);
    try {
      const r = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=43.1155&longitude=131.8855&current=temperature_2m,weather_code,wind_speed_10m&timezone=Asia%2FVladivostok",
        { signal: control.signal },
      );
      if (!r.ok) throw Error("weather");
      const data = await r.json(),
        v = data.current;
      if (
        !v ||
        !Number.isFinite(v.temperature_2m) ||
        !Number.isFinite(v.wind_speed_10m) ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v.time) ||
        Math.abs(Date.now() - Date.parse(v.time + "+10:00")) > 90 * 60 * 1000
      )
        throw Error("stale");
      $("#weather").textContent =
        Math.round(v.temperature_2m) +
        "° · ветер " +
        Math.round(v.wind_speed_10m / 3.6) +
        " м/с · Open-Meteo, " +
        v.time.slice(11) +
        " ВДК ↗";
      $("#weather").title =
        "Модельные данные для центра Владивостока. Прогноз по ссылке.";
    } catch {
    } finally {
      clearTimeout(timer);
    }
  }
  updateSaved();
  renderPlaces();
  renderRoutes();
  pick();
  syncLocation();
  weather();
})();
