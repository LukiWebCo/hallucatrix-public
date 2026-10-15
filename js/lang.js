// Runs before first paint: picks the hub language (saved choice, else the browser's) so only one language shows.
(function () {
  var saved = null;
  try { saved = localStorage.getItem("hx-lang"); } catch (e) {}
  var lang = saved === "es" || saved === "en" ? saved : (/^es\b/i.test(navigator.language || "") ? "es" : "en");
  document.documentElement.lang = lang;
})();
