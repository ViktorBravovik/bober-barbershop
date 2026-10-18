/* BOBER BARBERSHOP — small, dependency-free interactions */
document.documentElement.classList.add("js");

/* header turns solid after scrolling past the top */
const header = document.getElementById("header");
const mbar = document.querySelector(".mbar");
const onScroll = () => {
  const y = window.scrollY;
  header.classList.toggle("is-solid", y > 40);
  // mobile booking bar appears once the hero CTAs are scrolled away
  mbar.classList.toggle("is-visible", y > window.innerHeight * 0.6);
};
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* reveal sections as they enter the viewport */
const io = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    }),
  { rootMargin: "0px 0px -10% 0px" }
);
document.querySelectorAll(".reveal").forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 70}ms`;
  io.observe(el);
});

/* open / closed status — daily 10:00–20:00, Kyiv time */
function updateStatus() {
  const parts = new Intl.DateTimeFormat("uk-UA", {
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/Kyiv",
  }).formatToParts(new Date());
  const h = +parts.find((p) => p.type === "hour").value;
  const m = +parts.find((p) => p.type === "minute").value;
  const now = h * 60 + m, open = 10 * 60, close = 20 * 60;
  const isOpen = now >= open && now < close;
  const wait = isOpen ? close - now : now < open ? open - now : 24 * 60 - now + open;
  const left = `${Math.floor(wait / 60)} год ${wait % 60} хв`;
  const text = isOpen ? `Відкрито · ще ${left}` : `Зачинено · відкриємось через ${left}`;
  document.querySelectorAll("[data-status]").forEach((el) => {
    el.classList.toggle("is-open", isOpen);
    el.querySelector("b").textContent = text;
  });
}
updateStatus();
setInterval(updateStatus, 60000);

/* ---------- headline line-mask reveal ---------- */
const maskIO = new IntersectionObserver((entries) =>
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); maskIO.unobserve(e.target); } }),
  { rootMargin: "0px 0px -10% 0px" });
document.querySelectorAll(".section h2").forEach((h) => {
  h.classList.add("mask");
  h.innerHTML = `<span class="mask__in">${h.innerHTML}</span>`;
  maskIO.observe(h);
});

const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

/* ---------- services: related photo follows the cursor ---------- */
const float = document.querySelector(".srv-float");
if (float && finePointer) {
  const img = float.querySelector("img");
  const pos = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  let raf = null, lastX = 0;
  const tick = () => {
    cur.x += (pos.x - cur.x) * 0.15;
    cur.y += (pos.y - cur.y) * 0.15;
    const tilt = Math.max(-12, Math.min(12, (pos.x - lastX) * 0.6));
    lastX += (pos.x - lastX) * 0.1;
    float.style.transform = `translate(${cur.x}px, ${cur.y}px) translate(-50%,-50%) rotate(${tilt}deg) scale(${float.classList.contains("is-on") ? 1 : 0.6})`;
    raf = requestAnimationFrame(tick);
  };
  document.querySelectorAll(".price-list li[data-img]").forEach((li) => {
    // preload so the swap is instant
    new Image().src = li.dataset.img;
    li.addEventListener("mouseenter", (e) => {
      img.src = li.dataset.img;
      if (!float.classList.contains("is-on")) {
        cur.x = pos.x = lastX = e.clientX; cur.y = pos.y = e.clientY;
      }
      float.classList.add("is-on");
      if (!raf) raf = requestAnimationFrame(tick);
    });
    li.addEventListener("mousemove", (e) => { pos.x = e.clientX; pos.y = e.clientY; });
    li.addEventListener("mouseleave", () => float.classList.remove("is-on"));
  });
  document.querySelector(".price-list").addEventListener("mouseleave", () => {
    float.classList.remove("is-on");
    setTimeout(() => { if (!float.classList.contains("is-on")) { cancelAnimationFrame(raf); raf = null; } }, 500);
  });
}

/* ---------- magnetic booking buttons ---------- */
if (finePointer) {
  document.querySelectorAll(".btn--accent, .btn--ghost.btn--lg").forEach((b) => {
    b.addEventListener("mousemove", (e) => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
    });
    b.addEventListener("mouseleave", () => {
      b.style.transition = "transform .6s cubic-bezier(.34,1.56,.64,1), color .4s";
      b.style.transform = "";
      setTimeout(() => (b.style.transition = ""), 600);
    });
  });
}

/* ---------- big footer word: letters flip to italic one by one ---------- */
const big = document.getElementById("bigword");
if (big) {
  big.innerHTML = [...big.textContent].map((c) => `<span class="ch">${c}</span>`).join("");
  const chars = [...big.children];
  let alt = false, busy = false;
  big.addEventListener("mouseenter", () => {
    if (busy) return;
    busy = true; alt = !alt;
    chars.forEach((ch, i) => {
      setTimeout(() => {
        ch.style.transform = "translateY(-100%)"; ch.style.opacity = "0";
        setTimeout(() => {
          ch.classList.toggle("is-alt", alt);
          ch.style.transition = "none"; ch.style.transform = "translateY(100%)";
          ch.offsetHeight; // reflow
          ch.style.transition = ""; ch.style.transform = ""; ch.style.opacity = "";
          if (i === chars.length - 1) setTimeout(() => (busy = false), 450);
        }, 250);
      }, i * 60);
    });
  });
}

/* =========================================================
   1) WORKS — parallax + fullscreen viewer with FLIP
   ========================================================= */
const works = [...document.querySelectorAll(".works figure")];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// parallax: image drifts inside its frame; even columns drift a bit more
if (!reduceMotion) {
  const cols = () => getComputedStyle(document.querySelector(".works")).gridTemplateColumns.split(" ").length;
  let ncols = cols();
  window.addEventListener("resize", () => (ncols = cols()));
  const parallax = () => {
    const vh = window.innerHeight;
    works.forEach((fig, i) => {
      const r = fig.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      const p = (r.top + r.height / 2 - vh / 2) / vh; // -1..1 around centre
      const speed = (i % ncols) % 2 ? 0.11 : 0.07;
      fig.firstElementChild.style.setProperty("--py", `${(-p * speed * r.height).toFixed(1)}px`);
    });
  };
  window.addEventListener("scroll", () => requestAnimationFrame(parallax), { passive: true });
  parallax();
}

const viewer = document.createElement("div");
viewer.className = "viewer";
viewer.setAttribute("role", "dialog");
viewer.setAttribute("aria-modal", "true");
viewer.setAttribute("aria-label", "Перегляд роботи");
viewer.innerHTML = `
  <div class="viewer__bg"></div>
  <div class="viewer__stage"><img class="viewer__img" alt=""></div>
  <aside class="viewer__side">
    <span class="viewer__count"></span>
    <h3 class="viewer__cap"></h3>
    <p class="viewer__note">Сподобалась стрижка? Покажи це фото майстру — зробимо так само.</p>
    <a class="btn btn--accent btn--lg" href="https://n777682.alteg.io" target="_blank" rel="noopener">Хочу таку стрижку <i>↗</i></a>
    <div class="viewer__nav">
      <button type="button" data-dir="-1" aria-label="Попереднє фото">←</button>
      <button type="button" data-dir="1" aria-label="Наступне фото">→</button>
    </div>
  </aside>
  <button type="button" class="viewer__close" aria-label="Закрити">✕</button>`;
document.body.appendChild(viewer);
const vImg = viewer.querySelector(".viewer__img");
let current = -1, busyFlip = false, lastFocus = null;

const fillViewer = (i) => {
  const fig = works[i];
  vImg.src = fig.querySelector("img").src;
  vImg.alt = fig.querySelector("img").alt;
  viewer.querySelector(".viewer__cap").textContent = fig.dataset.cap;
  viewer.querySelector(".viewer__count").textContent = `${String(i + 1).padStart(2, "0")} / ${String(works.length).padStart(2, "0")}`;
};

// fly a copy of the image between two rects (First → Last), then call done
const fly = (src, from, to, done) => {
  const el = document.createElement("img");
  el.className = "viewer__fly";
  el.src = src;
  Object.assign(el.style, { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px` });
  document.body.appendChild(el);
  const sx = from.width / to.width, sy = from.height / to.height;
  const anim = el.animate(
    [
      { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${sx}, ${sy})`, transformOrigin: "0 0" },
      { transform: "none", transformOrigin: "0 0" },
    ],
    { duration: reduceMotion ? 1 : 750, easing: "cubic-bezier(.76,0,.24,1)" }
  );
  // finish exactly once: on the animation end, or by a safety timer if the tab was throttled
  let finished = false;
  const finish = () => { if (finished) return; finished = true; el.remove(); done && done(); };
  anim.onfinish = finish;
  setTimeout(finish, (reduceMotion ? 1 : 750) + 400);
};

const visibleRect = (fig) => fig.getBoundingClientRect();

const openViewer = async (i) => {
  if (busyFlip) return;
  busyFlip = true;
  current = i;
  lastFocus = document.activeElement;
  fillViewer(i);
  // don't wait forever for the decode (e.g. background tabs) — 400ms max
  await Promise.race([vImg.decode().catch(() => {}), new Promise((r) => setTimeout(r, 400))]);
  document.body.classList.add("is-locked");
  viewer.classList.add("is-open");
  const to = vImg.getBoundingClientRect();
  vImg.style.visibility = "hidden";
  const fig = works[i];
  fig.style.visibility = "hidden";
  fly(vImg.src, visibleRect(fig), to, () => {
    vImg.style.visibility = "";
    fig.style.visibility = "";
    busyFlip = false;
    viewer.querySelector(".viewer__close").focus();
  });
};

const closeViewer = () => {
  if (busyFlip || current < 0) return;
  busyFlip = true;
  const fig = works[current];
  const from = vImg.getBoundingClientRect();
  vImg.style.visibility = "hidden";
  fig.style.visibility = "hidden";
  viewer.classList.remove("is-open");
  document.body.classList.remove("is-locked");
  fig.scrollIntoView({ block: "nearest" });
  fly(vImg.src, from, visibleRect(fig), () => {
    fig.style.visibility = "";
    vImg.style.visibility = "";
    current = -1;
    busyFlip = false;
    lastFocus && lastFocus.focus({ preventScroll: true });
  });
};

const step = (dir) => {
  if (busyFlip || current < 0) return;
  current = (current + dir + works.length) % works.length;
  // slide out, swap, slide in (the swap is timer-driven so it never stalls)
  vImg.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateX(${-dir * 40}px)` }], { duration: 220, easing: "ease-in", fill: "forwards" });
  setTimeout(() => {
    fillViewer(current);
    vImg.getAnimations().forEach((an) => an.cancel());
    vImg.animate([{ opacity: 0, transform: `translateX(${dir * 40}px)` }, { opacity: 1, transform: "none" }], { duration: 380, easing: "cubic-bezier(.2,.8,.2,1)" });
  }, 220);
};

works.forEach((fig, i) => {
  fig.addEventListener("click", () => openViewer(i));
  fig.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openViewer(i); } });
});
viewer.querySelector(".viewer__close").addEventListener("click", closeViewer);
viewer.querySelector(".viewer__bg").addEventListener("click", closeViewer);
viewer.querySelectorAll(".viewer__nav button").forEach((b) => b.addEventListener("click", () => step(+b.dataset.dir)));
document.addEventListener("keydown", (e) => {
  if (current < 0) return;
  if (e.key === "Escape") closeViewer();
  if (e.key === "ArrowRight") step(1);
  if (e.key === "ArrowLeft") step(-1);
});
// swipe on phones
let touchX = null;
viewer.addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
viewer.addEventListener("touchend", (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  touchX = null;
});

/* =========================================================
   2) LENS — square magnifier on haircut photos (mouse only):
   the grid thumbnails and the opened fullscreen photo
   ========================================================= */
if (finePointer && !reduceMotion) {
  const ZOOM = 2.4, SIZE = 190;
  const lens = document.createElement("div");
  lens.className = "lens";
  lens.innerHTML = `<div class="lens__view"></div><div class="lens__frame"></div><span class="lens__tag">×${ZOOM}</span>`;
  document.body.appendChild(lens);
  const view = lens.firstElementChild;
  const offR = document.getElementById("rgb-r"), offB = document.getElementById("rgb-b");
  const pos = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  let activeImg = null, fit = "cover", raf = null, split = 0;

  const render = () => {
    const prevX = cur.x;
    cur.x += (pos.x - cur.x) * 0.22;
    cur.y += (pos.y - cur.y) * 0.22;
    // colour split grows with movement speed, then settles
    split += (Math.min(10, Math.abs(cur.x - prevX) * 0.9 + 1.5) - split) * 0.2;
    offR.setAttribute("dx", (-split).toFixed(2));
    offB.setAttribute("dx", split.toFixed(2));
    lens.style.left = `${cur.x}px`;
    lens.style.top = `${cur.y}px`;
    if (activeImg) {
      // map the cursor onto the rendered image (cover or contain), then zoom around that point
      const img = activeImg, r = img.getBoundingClientRect();
      const pick = fit === "cover" ? Math.max : Math.min;
      const k = pick(r.width / img.naturalWidth, r.height / img.naturalHeight);
      const w = img.naturalWidth * k, h = img.naturalHeight * k;
      const ox = r.left + (r.width - w) / 2, oy = r.top + (r.height - h) / 2;
      view.style.backgroundSize = `${w * ZOOM}px ${h * ZOOM}px`;
      view.style.backgroundPosition = `${-((cur.x - ox) * ZOOM - SIZE / 2)}px ${-((cur.y - oy) * ZOOM - SIZE / 2)}px`;
    }
    raf = requestAnimationFrame(render);
  };

  const show = (img, how, e) => {
    activeImg = img; fit = how;
    view.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
    if (!lens.classList.contains("is-on")) { cur.x = pos.x = e.clientX; cur.y = pos.y = e.clientY; }
    lens.classList.add("is-on");
    if (!raf) raf = requestAnimationFrame(render);
  };
  const hide = () => {
    activeImg = null;
    lens.classList.remove("is-on");
    setTimeout(() => { if (!activeImg) { cancelAnimationFrame(raf); raf = null; } }, 400);
  };
  const follow = (e) => { pos.x = e.clientX; pos.y = e.clientY; };

  // grid thumbnails
  works.forEach((fig) => {
    fig.addEventListener("mouseenter", (e) => { if (current < 0) show(fig.querySelector("img"), "cover", e); });
    fig.addEventListener("mousemove", follow);
    fig.addEventListener("mouseleave", hide);
    fig.addEventListener("click", hide);
  });

  // opened fullscreen photo — magnify the full-resolution image
  vImg.addEventListener("mouseenter", (e) => { if (!busyFlip) show(vImg, "contain", e); });
  vImg.addEventListener("mousemove", (e) => {
    follow(e);
    if (!activeImg && !busyFlip) show(vImg, "contain", e); // e.g. cursor was already there when the photo opened
  });
  vImg.addEventListener("mouseleave", hide);
  // new photo (arrows) → swap what the lens shows
  new MutationObserver(() => { if (activeImg === vImg) view.style.backgroundImage = `url("${vImg.src}")`; })
    .observe(vImg, { attributes: true, attributeFilter: ["src"] });
  // closing the viewer hides the lens
  new MutationObserver(() => { if (!viewer.classList.contains("is-open") && activeImg === vImg) hide(); })
    .observe(viewer, { attributes: true, attributeFilter: ["class"] });
}

/* =========================================================
   3) GHOST TRAILS — outlined copies trail big type on scroll
   ========================================================= */
if (!reduceMotion) {
  const GHOSTS = 4;
  const tracked = new Set();
  const groups = [];

  const addGhosts = (el) => {
    if (el.querySelector(":scope > .ghosts")) return;
    const box = document.createElement("div");
    box.className = "ghosts";
    box.setAttribute("aria-hidden", "true");
    const source = el.querySelector(":scope > .mask__in") || el;
    for (let i = 0; i < GHOSTS; i++) {
      const g = document.createElement("div");
      g.className = "ghost";
      g.innerHTML = source.innerHTML;
      g.querySelectorAll(".ghosts").forEach((n) => n.remove());
      box.appendChild(g);
    }
    el.classList.add("has-ghosts");
    el.appendChild(box);
    groups.push({ el, ghosts: [...box.children], y: new Array(GHOSTS).fill(0) });
  };

  const bigEl = document.getElementById("bigword");
  if (bigEl) addGhosts(bigEl);
  // keep the footer ghosts in sync with the letter swap
  bigEl && bigEl.addEventListener("mouseenter", () => setTimeout(() => {
    const g = groups.find((x) => x.el === bigEl);
    if (g) g.ghosts.forEach((n) => (n.innerHTML = [...bigEl.children].filter((c) => c.classList.contains("ch")).map((c) => c.outerHTML).join("")));
  }, 60 * 6 + 700));

  const seen = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? tracked.add(e.target) : tracked.delete(e.target))));
  const watch = setInterval(() => groups.forEach((g) => { if (!g.watched) { seen.observe(g.el); g.watched = true; } }), 500);

  let lastY = window.scrollY, vel = 0;
  const loop = () => {
    const y = window.scrollY;
    vel += ((y - lastY) - vel) * 0.18; // smoothed scroll speed (px/frame)
    lastY = y;
    groups.forEach((g) => {
      if (!tracked.has(g.el)) return;
      g.ghosts.forEach((ghost, i) => {
        // each copy lags further behind; they all fall back together when scrolling stops
        const target = Math.max(-140, Math.min(140, vel * (i + 1) * 2.2));
        g.y[i] += (target - g.y[i]) * (0.16 - i * 0.025);
        const o = Math.min(1, Math.abs(g.y[i]) / 24) * (1 - i / (GHOSTS + 1));
        ghost.style.transform = `translate3d(0, ${g.y[i].toFixed(1)}px, 0) skewY(${(g.y[i] * 0.02).toFixed(2)}deg)`;
        ghost.style.opacity = o.toFixed(3);
      });
    });
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

/* =========================================================
   BEAVER GAME — every click (or tap) on the logo makes it jump;
   after 3 jumps → popup with a 10% promo code and a booking button.
   Nothing is remembered: every visitor (and every visit) can play.
   ========================================================= */
(() => {
  const bober = document.getElementById("bober");
  const hint = document.getElementById("game-hint");
  const prize = document.getElementById("prize");
  if (!bober || !hint || !prize) return;

  const JUMPS = 3;
  const CODE = "BOBER10";
  const dots = [...hint.querySelectorAll(".game-dots i")];
  const msg = hint.querySelector("[data-msg]");
  const hero = document.querySelector(".hero");
  const touch = !matchMedia("(hover: hover) and (pointer: fine)").matches;
  const START = touch ? "Торкнись бобра, щоб він стрибнув" : "Клікни на бобра, щоб він стрибнув";
  const lines = ["Раз! Ще два стрибки", "Два! Ще один", "Три! Лови промокод 🎉"];
  let jumps = 0, offset = { x: 0, y: 0 }, cooldown = false, won = false;

  const setMsg = (t) => (msg.textContent = t);
  const place = (x, y, spin) => {
    offset = { x, y };
    bober.style.translate = `${x}px ${y}px`;
    bober.style.rotate = `${spin}deg`;
  };

  const reset = () => {
    jumps = 0; won = false;
    dots.forEach((d) => d.classList.remove("is-used"));
    bober.classList.remove("is-caught");
    place(0, 0, 0);
    setMsg(START);
  };

  // jump a fixed distance along the line click-point → beaver centre, staying in the top band
  const jump = (px, py) => {
    if (cooldown || won) return;
    cooldown = true;
    setTimeout(() => (cooldown = false), 300);

    const r = bober.getBoundingClientRect();
    const home = { x: r.left - offset.x, y: r.top - offset.y };
    const hr = hero.getBoundingClientRect();
    const headerBottom = document.getElementById("header").getBoundingClientRect().bottom;
    const hintR = hint.getBoundingClientRect();
    const kickerTop = document.querySelector(".hero__kicker").getBoundingClientRect().top;
    const hintBeside = hintR.left > r.width && hintR.top < kickerTop - 10; // desktop: card is top-right
    const minX = hr.left + 8;
    const maxX = (hintBeside ? hintR.left - 16 : hr.right - 8) - r.width;
    const minY = Math.max(headerBottom, hintBeside ? 0 : hintR.bottom) + 8;
    const maxY = Math.max(minY, kickerTop - r.height - 16);

    let dx = r.left + r.width / 2 - px, dy = r.top + r.height / 2 - py;
    const len = Math.hypot(dx, dy);
    if (len < r.width * 0.12) { dx = Math.random() < 0.5 ? -1 : 1; dy = 0; } else { dx /= len; dy /= len; }

    const JUMP = Math.min(240, Math.max(80, (maxX - minX) * 0.5));
    let tx = r.left + dx * JUMP;
    if (tx < minX || tx > maxX) tx = r.left - dx * JUMP;
    tx = Math.max(minX, Math.min(maxX, tx));
    let ty = r.top + dy * JUMP;
    if (ty < minY || ty > maxY) ty = r.top - dy * JUMP;
    ty = Math.max(minY, Math.min(maxY, ty));
    if (Math.hypot(tx - r.left, ty - r.top) < JUMP * 0.9) {
      const sign = tx >= r.left ? 1 : -1;
      const extra = Math.sqrt(Math.max(0, JUMP * JUMP - (ty - r.top) ** 2));
      let tx2 = r.left + sign * extra;
      if (tx2 < minX || tx2 > maxX) tx2 = r.left - sign * extra;
      tx = Math.max(minX, Math.min(maxX, tx2));
    }

    jumps++;
    dots.slice(0, jumps).forEach((d) => d.classList.add("is-used"));
    place(tx - home.x, ty - home.y, Math.max(-10, Math.min(10, Math.round((tx - r.left) / 25))));
    setMsg(lines[jumps - 1]);
    if (jumps >= JUMPS) setTimeout(win, 700); // let the 3rd jump land first
  };

  const win = () => {
    if (won) return;
    won = true;
    bober.classList.add("is-caught");
    openPrize();
    setTimeout(() => place(0, 0, 0), 400); // beaver hops back home behind the popup
  };

  bober.addEventListener("click", (e) => {
    e.preventDefault();
    const r = bober.getBoundingClientRect();
    // keyboard "click" has no coordinates → treat as a click in the middle
    const x = e.clientX || r.left + r.width / 2, y = e.clientY || r.top + r.height / 2;
    jump(x, y);
  });
  window.addEventListener("resize", () => { if (!won) place(0, 0, 0); });

  /* prize popup */
  let lastFocusPrize = null;
  function openPrize() {
    lastFocusPrize = document.activeElement;
    prize.hidden = false;
    document.body.classList.add("is-locked");
    prize.querySelector("#prize-code").focus();
  }
  const closePrize = () => {
    prize.hidden = true;
    document.body.classList.remove("is-locked");
    lastFocusPrize && lastFocusPrize.focus({ preventScroll: true });
    reset(); // ready to play again
  };
  prize.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closePrize));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !prize.hidden) closePrize(); });
  const codeBtn = prize.querySelector("#prize-code");
  codeBtn.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(CODE); codeBtn.querySelector("small").textContent = "Скопійовано ✓"; }
    catch { codeBtn.querySelector("small").textContent = "Виділи й скопіюй"; }
    setTimeout(() => (codeBtn.querySelector("small").textContent = "Копіювати"), 2200);
  });

  // clean up the flag older versions of this page stored, then start fresh
  try { localStorage.removeItem("bober-caught"); } catch {}
  reset();
})();

/* =========================================================
   v2 — SELENE-inspired updates
   1) hair on the first screen is swept away as you scroll (and by the cursor)
   2) clipper HUD: guard 12 → 0 mm, fade 0 → 100%
   3) visit path: line draws through 4 stops, minutes count up
   ========================================================= */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const ease = (t) => t * t * (3 - 2 * t);

  /* ---------- 1 + 2: hair sweep and HUD ---------- */
  const heroPin = document.getElementById("hero-pin");
  const hero = heroPin && heroPin.querySelector(".hero");
  const canvas = document.getElementById("hair");
  const hint = document.getElementById("sweep-hint");
  const hud = document.getElementById("hud");
  const info = document.querySelector(".hero__info");

  const setInfoH = () => info && hero && hero.style.setProperty("--info-h", `${info.offsetHeight}px`);
  // pin the first screen only when its content fits in one window height
  const checkFit = () => {
    if (!heroPin || !hero) return;
    heroPin.classList.remove("no-pin");
    if (getComputedStyle(hero).position !== "sticky") return;
    // fits = the beaver starts below the header and the info row ends inside the screen
    // (scrollHeight can't be used: the slightly zoomed background photo inflates it)
    // layout positions (offsetTop) ignore the entrance animations' temporary shifts
    const headerH = document.getElementById("header").offsetHeight;
    const content = hero.querySelector(".hero__content");
    const top = content.offsetTop + hero.querySelector(".hero__game").offsetTop;
    const bottom = info.offsetTop + info.offsetHeight;
    if (top < headerH - 1 || bottom > hero.clientHeight + 1) heroPin.classList.add("no-pin");
  };
  const layout = () => { checkFit(); setInfoH(); };
  layout();
  window.addEventListener("resize", layout);
  document.fonts && document.fonts.ready.then(layout);

  // 0 → 1 while the first screen is held (desktop) or over the first ~60% of a screen (phones)
  const heroProgress = () => {
    if (!heroPin) return 1;
    const extra = heroPin.offsetHeight - window.innerHeight;
    const pinned = !heroPin.classList.contains("no-pin") && getComputedStyle(hero).position === "sticky";
    if (pinned && extra > 50) return clamp01(-heroPin.getBoundingClientRect().top / extra);
    return clamp01(window.scrollY / (window.innerHeight * 0.6));
  };

  const hudGuard = hud && hud.querySelector('[data-hud="guard"]');
  const hudFade = hud && hud.querySelector('[data-hud="fade"]');
  const hudBar = hud && hud.querySelector('[data-hud="bar"]');
  const updateHud = (p) => {
    if (!hud) return;
    hudGuard.textContent = `${(12 * (1 - p)).toFixed(1)} мм`;
    hudFade.textContent = `${Math.round(p * 100)}%`;
    hudBar.style.transform = `scaleX(${p.toFixed(3)})`;
    if (hint) hint.style.opacity = String(Math.max(0, 1 - p * 3));
  };

  if (canvas && hero && !reduce) {
    const ctx = canvas.getContext("2d");
    const small = window.innerWidth < 900;
    const COUNT = small ? 320 : 700;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const colours = [
      [239, 233, 223], [239, 233, 223], [214, 200, 182], // light strands read on the dark photo
      [150, 108, 78], [112, 80, 58],                        // a few warm brown ones
    ];
    const hairs = Array.from({ length: COUNT }, () => {
      const c = colours[(rnd() * colours.length) | 0];
      return {
        x: rnd(), y: 0.08 + rnd() * 0.84,                  // normalised position on the hero
        len: 7 + rnd() * 20, bend: (rnd() - 0.5) * 10,
        ang: rnd() * Math.PI, w: 0.7 + rnd() * 1.1,
        col: `rgba(${c[0]},${c[1]},${c[2]},${(0.35 + rnd() * 0.5).toFixed(2)})`,
        vx: 0.5 + rnd() * 1.1, vy: -0.9 + rnd() * 0.9,      // blown up and to the right, like a dryer
        spin: (rnd() - 0.5) * 6, delay: rnd() * 0.35,
        ox: 0, oy: 0,                                       // cursor push (stays blown)
      };
    });

    let W = 0, H = 0, dpr = 1;
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = hero.clientWidth; H = hero.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      dirty = true;
    };
    let dirty = true, lastP = -1;
    const mouse = { x: -9999, y: -9999, active: false };

    const draw = (p) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (p >= 0.999) return;
      ctx.lineCap = "round";
      for (const h of hairs) {
        const t = ease(clamp01((p - h.delay * 0.5) / (1 - h.delay * 0.5)));
        const a = 1 - clamp01((t - 0.35) / 0.65);
        if (a <= 0.01) continue;
        const x = h.x * W + h.ox + h.vx * t * W * 0.9;
        const y = h.y * H + h.oy + h.vy * t * H * 0.9;
        const ang = h.ang + h.spin * t;
        const dx = Math.cos(ang) * h.len / 2, dy = Math.sin(ang) * h.len / 2;
        ctx.globalAlpha = a;
        ctx.strokeStyle = h.col;
        ctx.lineWidth = h.w;
        ctx.beginPath();
        ctx.moveTo(x - dx, y - dy);
        ctx.quadraticCurveTo(x - dy * h.bend * 0.08, y + dx * h.bend * 0.08, x + dx, y + dy);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    // the logo-cursor works like a blow-dryer: hair near it gets pushed away
    if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
      hero.addEventListener("mousemove", (e) => {
        const r = hero.getBoundingClientRect();
        mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = true;
      });
      hero.addEventListener("mouseleave", () => (mouse.active = false));
    }
    const blow = (p) => {
      if (!mouse.active || p >= 0.999) return;
      const R = 110;
      for (const h of hairs) {
        const x = h.x * W + h.ox, y = h.y * H + h.oy;
        const dx = x - mouse.x, dy = y - mouse.y, d = Math.hypot(dx, dy);
        if (d < R && d > 0.1) {
          const f = (R - d) / R * 6;
          h.ox += (dx / d) * f; h.oy += (dy / d) * f;
          dirty = true;
        }
      }
    };

    let visible = true;
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(hero);
    const frame = () => {
      const p = heroProgress();
      blow(p);
      if (dirty || Math.abs(p - lastP) > 0.0005) {
        draw(p); updateHud(p);
        lastP = p; dirty = false;
      }
    };
    const loop = () => { if (visible) frame(); requestAnimationFrame(loop); };
    size();
    frame(); // first paint right away
    window.addEventListener("resize", () => { size(); frame(); });
    window.addEventListener("scroll", frame, { passive: true }); // also update on scroll itself
    requestAnimationFrame(loop);
  } else {
    // no animation: no hair, HUD shows the finished fade
    if (canvas) canvas.remove();
    updateHud(1);
  }

  /* ---------- 3: visit path ---------- */
  const visitPin = document.getElementById("visit-pin");
  const line = document.getElementById("visit-line");
  const dot = document.getElementById("visit-dot");
  const minEl = document.getElementById("visit-min");
  if (!visitPin || !line || !dot) return;
  const stops = [...visitPin.querySelectorAll(".visit__stops g")];
  const cards = [...visitPin.querySelectorAll(".visit__cards li")];
  const total = line.getTotalLength();

  // where each stop sits along the line (0..1)
  const samples = Array.from({ length: 401 }, (_, i) => {
    const pt = line.getPointAtLength((i / 400) * total);
    return { f: i / 400, x: pt.x, y: pt.y };
  });
  const fracs = stops.map((g) => {
    const c = g.querySelector("circle");
    const cx = +c.getAttribute("cx"), cy = +c.getAttribute("cy");
    return samples.reduce((best, s) => (Math.hypot(s.x - cx, s.y - cy) < Math.hypot(best.x - cx, best.y - cy) ? s : best)).f;
  });
  const minutesAt = [0, 5, 10, 40]; // matches the 00:00 / 00:05 / 00:10 / 00:40 labels
  const FINAL_MIN = 45;
  const minutes = (q) => {
    const fs = [...fracs, 1], ms = [...minutesAt, FINAL_MIN];
    for (let i = 0; i < fs.length - 1; i++) {
      if (q <= fs[i + 1]) return ms[i] + (ms[i + 1] - ms[i]) * clamp01((q - fs[i]) / Math.max(1e-6, fs[i + 1] - fs[i]));
    }
    return FINAL_MIN;
  };

  const visitProgress = () => {
    const extra = visitPin.offsetHeight - window.innerHeight;
    if (extra > 50) return clamp01((-visitPin.getBoundingClientRect().top) / (extra * 0.85));
    const r = line.ownerSVGElement.getBoundingClientRect();
    return clamp01((window.innerHeight * 0.8 - r.top) / (window.innerHeight * 0.7));
  };

  let lastQ = -1;
  const render = (q) => {
    line.style.strokeDashoffset = String(1 - q);
    const pt = line.getPointAtLength(q * total);
    dot.setAttribute("transform", `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
    fracs.forEach((f, i) => {
      const on = q >= f - 0.004;
      stops[i].classList.toggle("is-on", on);
      cards[i] && cards[i].classList.toggle("is-on", on);
    });
    if (minEl) minEl.textContent = String(Math.round(minutes(q)));
  };
  if (reduce) { render(1); return; }
  const update = () => {
    const q = visitProgress();
    if (Math.abs(q - lastQ) > 0.0005) { render(q); lastQ = q; }
  };
  const tick = () => { update(); requestAnimationFrame(tick); };
  render(0);
  update();
  window.addEventListener("scroll", update, { passive: true });
  requestAnimationFrame(tick);
})();
