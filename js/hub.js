"use strict";

const WELLS = [
  {
    name: "Kato & Sooner",
    line: {
      es: "Historias, dibujos y recuerdos de dos buenos perros.",
      en: "Stories, drawings and memories of two good dogs."
    },
    img: "img/wells/kato-and-sooner.webp",
    url: "https://kato-and-sooner.hallucatrix.com/"
  },
  {
    name: "Bubble Dragon",
    line: {
      es: "Surfea el cielo. Esquiva pelotas de golf. Teme al pollo.",
      en: "Surf the sky. Dodge golf balls. Fear the chicken."
    },
    img: "img/wells/bubble-dragon.webp"
  },
  {
    name: "Duys Racers",
    line: {
      es: "Acelera a fondo. Duy insiste.",
      en: "Twist the throttle. Duy insists."
    },
    img: "img/wells/duys-racers.webp"
  },
  {
    name: "Dots & Lines",
    line: {
      es: "Nuestro juego de cartas familiar. Fácil de aprender.",
      en: "Our family card game. Easy to learn."
    },
    img: "img/wells/dots-and-lines.webp"
  },
  {
    name: "Conquián",
    line: {
      es: "El juego de cartas de siempre, con baraja española.",
      en: "The old card game, Spanish deck."
    },
    img: "img/wells/conquian.webp"
  }
];

const byId = (id) => document.getElementById(id);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const overlay = byId("overlay");

const wellsEl = byId("wells");
WELLS.forEach((well) => {
  const anchor = document.createElement("a");
  anchor.className = "hx-well";
  anchor.href = well.url || "#";
  if (well.url) {
    anchor.target = "_blank";
    anchor.rel = "noopener";
  }

  const phase = document.createElement("div");
  phase.className = "hx-phase";

  const orb = document.createElement("div");
  orb.className = "hx-orb";
  if (well.img) {
    const image = document.createElement("img");
    image.className = "hx-orb-img";
    image.src = well.img;
    image.alt = "";
    orb.append(image);

    const ring = document.createElement("div");
    ring.className = "hx-orb-ring";
    orb.append(ring);
  }

  const text = document.createElement("div");
  text.className = "hx-text";

  const name = document.createElement("span");
  name.className = "hx-name";
  name.textContent = well.name;
  text.append(name);

  const spanishLine = document.createElement("span");
  spanishLine.className = "hx-line-es";
  spanishLine.lang = "es";
  spanishLine.textContent = well.line.es;
  text.append(spanishLine);

  const englishLine = document.createElement("span");
  englishLine.className = "hx-line-en";
  englishLine.lang = "en";
  englishLine.textContent = well.line.en;
  text.append(englishLine);

  phase.append(orb, text);
  anchor.append(phase);
  anchor.addEventListener("click", (event) => {
    if (!well.url) event.preventDefault();
    byId("overlayTextEs").textContent = `Cayendo en ${well.name}…`;
    byId("overlayTextEn").textContent = `Falling into ${well.name}…`;
    overlay.hidden = false;
  });
  wellsEl.append(anchor);

});

byId("climbOut").addEventListener("click", () => {
  overlay.hidden = true;
});

// Language toggle: js/lang.js already set <html lang> before paint; CSS hides the other language.
const langToggle = byId("langToggle");
function showLang(lang) {
  document.documentElement.lang = lang;
  langToggle.textContent = lang === "es" ? "EN" : "ES";
  langToggle.setAttribute("aria-label", lang === "es" ? "Switch to English" : "Cambiar a español");
}
showLang(document.documentElement.lang === "en" ? "en" : "es");
langToggle.addEventListener("click", () => {
  const next = document.documentElement.lang === "es" ? "en" : "es";
  try { localStorage.setItem("hx-lang", next); } catch (error) { /* private mode: choice lasts this visit */ }
  showLang(next);
});

const yard = byId("yard");
const rooster = byId("rooster");
const face = byId("roosterFace");
const poop = byId("poop");
let rx = 4;
let dir = 1;
let mx = null;
let my = null;
let t0;
let t1;
let t2;
let roosterMotion = null;

function clearRoosterTimers() {
  clearTimeout(t0);
  clearTimeout(t1);
  clearTimeout(t2);
}

function setRoosterState(chasing, still, dead) {
  rooster.classList.toggle("hx-chasing", chasing);
  rooster.classList.toggle("hx-still", chasing && still);
  rooster.classList.toggle("hx-dead", dead);
}

yard.addEventListener("pointermove", (event) => {
  if (mx !== null && Math.abs(event.clientX - mx) < 6 && Math.abs(event.clientY - my) < 6) return;
  mx = event.clientX;
  my = event.clientY;

  const bounds = yard.getBoundingClientRect();
  const x = Math.max(3, Math.min(97, ((event.clientX - bounds.left) / bounds.width) * 100));
  // Where the rooster really is now (mid-roam or mid-chase), read before the roam animation is switched off,
  // so it starts from there and faces the way it actually walks.
  const roosterBox = rooster.getBoundingClientRect();
  const fromPx = roosterBox.left + roosterBox.width / 2 - bounds.left;
  const toPx = (x / 100) * bounds.width;
  if (Math.abs(toPx - fromPx) >= 2) dir = toPx > fromPx ? 1 : -1;
  rx = x;
  clearRoosterTimers();
  poop.classList.remove("hx-visible");
  if (roosterMotion) roosterMotion.cancel();
  setRoosterState(true, false, false);
  roosterMotion = rooster.animate(
    [{ left: `${Math.round(fromPx)}px` }, { left: `${rx}%` }],
    { duration: reduceMotion ? 0 : 900, easing: "linear", fill: "forwards" }
  );
  face.classList.toggle("hx-facing-left", dir < 0);

  t0 = setTimeout(() => setRoosterState(true, true, false), 900);
  t1 = setTimeout(() => {
    // Drop it right under the rooster's tail, where the rooster is now (no slide in from elsewhere).
    const yardBox = yard.getBoundingClientRect();
    const roosterBox = rooster.getBoundingClientRect();
    const under = roosterBox.left + roosterBox.width / 2 - yardBox.left - dir * 14;
    poop.style.left = `${Math.round(under)}px`;
    poop.classList.add("hx-visible");
  }, 3900);
  t2 = setTimeout(() => setRoosterState(true, true, true), 6900);
});

yard.addEventListener("pointerleave", () => {
  clearRoosterTimers();
  mx = my = null;
  poop.classList.remove("hx-visible");
  if (roosterMotion) {
    roosterMotion.cancel();
    roosterMotion = null;
  }
  setRoosterState(false, false, false);
  face.classList.remove("hx-facing-left");
});

const title = byId("title");
const home = byId("titleHome");
const hole = byId("hole");
const tagline = byId("tagline");
let spooks = 0;
let settled = false;
let flying = false;
let flyTimers = [];
let titleMotion = null;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function animateTitle(transform, duration, easing) {
  const from = getComputedStyle(title).transform;
  if (titleMotion) titleMotion.cancel();
  titleMotion = title.animate(
    [{ transform: from }, { transform }],
    { duration: reduceMotion ? 0 : duration, easing, fill: "forwards" }
  );
}

function positionFor(x, y) {
  const bounds = home.getBoundingClientRect();
  return {
    x: x - (bounds.left + bounds.width / 2),
    y: y - (bounds.top + bounds.height / 2)
  };
}

function holeCenter() {
  const bounds = hole.getBoundingClientRect();
  return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
}

function transformFor(position, rotation, scale) {
  return `translate(${Math.round(position.x)}px, ${Math.round(position.y)}px) rotate(${Math.round(rotation)}deg) scale(${scale.toFixed(2)})`;
}

function clearFlyTimers() {
  flyTimers.forEach(clearTimeout);
  flyTimers = [];
  flying = false;
}

function goWild() {
  clearFlyTimers();
  flying = true;
  tagline.classList.add("hx-tagline-hidden");
  const width = window.innerWidth;
  const height = window.innerHeight;
  const margin = Math.min(120, width / 3, height / 3);
  const hops = 5;

  for (let index = 0; index < hops; index += 1) {
    flyTimers.push(setTimeout(() => {
      const position = positionFor(randomBetween(margin, width - margin), randomBetween(margin, height - margin));
      animateTitle(transformFor(position, randomBetween(-160, 160), randomBetween(0.6, 1.5)), 280, "cubic-bezier(.5,0,.5,1)");
    }, index * 280));
  }

  flyTimers.push(setTimeout(() => {
    const position = positionFor(randomBetween(margin, width - margin), randomBetween(margin, height * 0.75));
    const sign = Math.random() < 0.5 ? -1 : 1;
    animateTitle(transformFor(position, sign * randomBetween(18, 38), randomBetween(0.8, 1.2)), 500, "cubic-bezier(.2,1.6,.4,1)");
  }, hops * 280));

  flyTimers.push(setTimeout(() => {
    flying = false;
    const center = holeCenter();
    const bounds = title.getBoundingClientRect();
    const titleCenter = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    const position = positionFor(
      titleCenter.x + (center.x - titleCenter.x) * 0.6,
      titleCenter.y + (center.y - titleCenter.y) * 0.6
    );
    animateTitle(transformFor(position, 0, 1), 7000, "cubic-bezier(.25,.1,.25,1)");
  }, hops * 280 + 900));
}

function settleInHole() {
  clearFlyTimers();
  settled = true;
  title.classList.add("hx-settled");
  const center = holeCenter();
  animateTitle(transformFor(positionFor(center.x, center.y), 0, 1.1), 1100, "cubic-bezier(.3,1.4,.5,1)");
}

byId("page").addEventListener("pointermove", (event) => {
  if (event.pointerType !== "mouse" || settled || flying) return;
  const bounds = title.getBoundingClientRect();
  const distance = Math.hypot(
    bounds.left + bounds.width / 2 - event.clientX,
    bounds.top + bounds.height / 2 - event.clientY
  );
  if (distance > Math.max(140, bounds.width * 0.7)) return;

  spooks += 1;
  if (spooks >= 3) settleInHole();
  else goWild();
});

title.addEventListener("click", () => {
  clearFlyTimers();
  spooks = 0;
  settled = false;
  title.classList.remove("hx-settled");
  tagline.classList.remove("hx-tagline-hidden");
  animateTitle("none", 600, "cubic-bezier(.3,1.4,.5,1)");
});
