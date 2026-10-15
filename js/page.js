"use strict";
// Game pages: the ES/EN toggle. js/lang.js has already picked the language before first paint.
(function () {
  var toggle = document.getElementById("langToggle");
  if (!toggle) return;
  function show(lang) {
    document.documentElement.lang = lang;
    toggle.textContent = lang === "es" ? "EN" : "ES";
    toggle.setAttribute("aria-label", lang === "es" ? "Switch to English" : "Cambiar a español");
  }
  show(document.documentElement.lang === "en" ? "en" : "es");
  toggle.addEventListener("click", function () {
    var next = document.documentElement.lang === "es" ? "en" : "es";
    try { localStorage.setItem("hx-lang", next); } catch (error) { /* private mode: choice lasts this visit */ }
    show(next);
  });
})();
