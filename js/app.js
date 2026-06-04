/**
 * Интерактивная лента времени России (1991–2022).
 * Загружает events.json, строит горизонтальную ленту, переключает эпохи и фоны.
 */

const $ = (sel, root = document) => root.querySelector(sel);

let data = null;
let events = [];
let erasMap = {};
let currentIndex = 0;
let detailOpen = false;

const hero = $("#hero");
const app = $("#timeline-app");
const eraBg = $("#era-bg");
const eraLabel = $("#era-label");
const eraTitle = $("#era-title");
const progressText = $("#progress-text");
const timelineScroll = $("#timeline-scroll");
const timelineTrack = $("#timeline-track");
const timelineNodes = $("#timeline-nodes");
const zoomLabel = $("#zoom-label");

const SCALE_MIN = 0.55;
const SCALE_MAX = 1.15;
const SCALE_STEP = 0.08;
let timelineScale = 1;
let pinchStartDistance = 0;
let pinchStartScale = 1;
const detailPanel = $("#detail-panel");
const detailContent = $("#detail-content");
const btnPrev = $("#btn-prev");
const btnNext = $("#btn-next");

async function init() {
  try {
    const res = await fetch("data/events.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
    events = data.events;
    data.eras.forEach((e) => {
      erasMap[e.id] = e;
    });
    bindUI();
    buildTimeline();
    setIndex(0, { scroll: false, openDetail: false });
  } catch (err) {
    console.error(err);
    document.body.innerHTML =
      '<p style="color:#fff;padding:2rem;font-family:sans-serif">Не удалось загрузить данные. Откройте сайт через локальный сервер (см. DEPLOY.md), а не как file://</p>';
  }
}

function bindUI() {
  $("#btn-start").addEventListener("click", openTimeline);
  $("#btn-home").addEventListener("click", goHome);
  btnPrev.addEventListener("click", () => step(-1));
  btnNext.addEventListener("click", () => step(1));
  $("#btn-close-detail").addEventListener("click", closeDetail);
  $("#btn-expand-detail").addEventListener("click", toggleDetailExpand);

  document.addEventListener("keydown", onKeydown);
  timelineScroll.addEventListener("keydown", onKeydown);

  $("#btn-zoom-in").addEventListener("click", () => setTimelineScale(timelineScale + SCALE_STEP));
  $("#btn-zoom-out").addEventListener("click", () => setTimelineScale(timelineScale - SCALE_STEP));
  $("#btn-zoom-reset").addEventListener("click", () => setTimelineScale(1));

  timelineScroll.addEventListener(
    "wheel",
    (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setTimelineScale(timelineScale + (e.deltaY < 0 ? SCALE_STEP : -SCALE_STEP));
    },
    { passive: false }
  );

  timelineScroll.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length === 2) {
        pinchStartDistance = touchDistance(e.touches);
        pinchStartScale = timelineScale;
      }
    },
    { passive: true }
  );

  timelineScroll.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length !== 2 || !pinchStartDistance) return;
      e.preventDefault();
      const dist = touchDistance(e.touches);
      const ratio = dist / pinchStartDistance;
      setTimelineScale(pinchStartScale * ratio);
    },
    { passive: false }
  );

  timelineScroll.addEventListener("touchend", (e) => {
    if (e.touches.length < 2) pinchStartDistance = 0;
  });
}

function touchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

/** Масштаб горизонтальной ленты (кнопки, pinch, Ctrl+колесо) */
function setTimelineScale(scale) {
  timelineScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, Math.round(scale * 100) / 100));
  timelineTrack.style.setProperty("--timeline-scale", String(timelineScale));
  if (zoomLabel) zoomLabel.textContent = `${Math.round(timelineScale * 100)}%`;
}

function openTimeline() {
  hero.classList.add("hidden");
  app.classList.remove("hidden");
  setIndex(0, { scroll: false, openDetail: true });
  requestAnimationFrame(() => scrollToNode(currentIndex, "smooth"));
}

function goHome() {
  closeDetail();
  app.classList.add("hidden");
  hero.classList.remove("hidden");
}

function buildTimeline() {
  timelineNodes.innerHTML = "";
  events.forEach((ev, i) => {
    const node = document.createElement("article");
    node.className = "timeline-node";
    node.dataset.index = String(i);
    node.setAttribute("role", "listitem");

    const card = document.createElement("button");
    card.type = "button";
    card.className = "event-card";
    card.setAttribute("aria-label", `Подробнее: ${ev.title}`);
    card.innerHTML = `
      <span class="event-card__date">${escapeHtml(ev.date)}</span>
      <h3 class="event-card__title">${escapeHtml(ev.title)}</h3>
      <p class="event-card__summary">${escapeHtml(ev.summary)}</p>
      <span class="event-card__cta">Подробнее →</span>
    `;
    card.addEventListener("click", () => {
      setIndex(i, { scroll: true, openDetail: true });
    });

    const dot = document.createElement("div");
    dot.className = "timeline-node__dot";
    dot.setAttribute("aria-hidden", "true");

    const year = document.createElement("span");
    year.className = "timeline-node__year";
    year.textContent = ev.year;

    node.append(card, dot, year);
    timelineNodes.appendChild(node);
  });
}

function setIndex(index, opts = {}) {
  const { scroll = true, openDetail = true } = opts;
  currentIndex = Math.max(0, Math.min(index, events.length - 1));
  const ev = events[currentIndex];
  const era = erasMap[ev.era];

  document.querySelectorAll(".timeline-node").forEach((n, i) => {
    n.classList.toggle("is-active", i === currentIndex);
  });

  if (era) {
    eraLabel.textContent = era.label;
    eraTitle.textContent = era.range;
    eraBg.style.backgroundImage = `url("${era.bg}")`;
  }

  progressText.textContent = `${currentIndex + 1} / ${events.length}`;
  btnPrev.disabled = currentIndex === 0;
  btnNext.disabled = currentIndex === events.length - 1;

  if (scroll) scrollToNode(currentIndex, "smooth");

  if (openDetail) {
    renderDetail(ev);
    openDetailPanel();
  } else {
    renderDetail(ev);
  }
}

function step(delta) {
  setIndex(currentIndex + delta, { scroll: true, openDetail: detailOpen });
}

function scrollToNode(index, behavior = "smooth") {
  const node = timelineNodes.children[index];
  if (!node) return;
  const scrollLeft =
    node.offsetLeft - timelineScroll.clientWidth / 2 + node.offsetWidth / 2;
  timelineScroll.scrollTo({ left: scrollLeft, behavior });
}

function renderDetail(ev) {
  const sourcesHtml = ev.sources
    .map((s) => `<li>${escapeHtml(s)}</li>`)
    .join("");

  detailContent.innerHTML = `
    <div class="detail-grid">
      <div class="detail-grid__media">
        <img src="${escapeAttr(ev.image)}" alt="${escapeAttr(ev.title)}" loading="lazy" />
      </div>
      <div class="detail-grid__body">
        <p class="detail-grid__date">${escapeHtml(ev.date)}</p>
        <h3 class="detail-grid__title">${escapeHtml(ev.title)}${ev.subtitle ? ` <span style="font-size:0.65em;color:var(--text-muted)">${escapeHtml(ev.subtitle)}</span>` : ""}</h3>
        <p class="detail-grid__text">${escapeHtml(ev.description)}</p>
        <div class="detail-sources">
          <h4>Источники</h4>
          <ul>${sourcesHtml}</ul>
        </div>
      </div>
    </div>
  `;
}

function openDetailPanel() {
  detailOpen = true;
  detailPanel.classList.add("is-open");
}

function closeDetail() {
  detailOpen = false;
  detailPanel.classList.remove("is-open");
}

/** Поднять/опустить панель с подробностями */
function toggleDetailExpand() {
  const expanded = detailPanel.classList.toggle("is-expanded");
  app.classList.toggle("is-detail-expanded", expanded);
  const label = document.querySelector(".detail-panel__expand-label");
  if (label) label.textContent = expanded ? "Ниже" : "Выше";
}

function onKeydown(e) {
  if (app.classList.contains("hidden")) return;

  if (e.key === "ArrowLeft") {
    e.preventDefault();
    if (currentIndex > 0) step(-1);
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    if (currentIndex < events.length - 1) step(1);
  } else if (e.key === "Escape") {
    closeDetail();
  }
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

init();
