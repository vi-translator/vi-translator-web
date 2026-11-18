// The hero's TV: the subtitle changes every few seconds, like a game speaking (English line, and
// its translation as the app draws it). Still for people who prefer less motion.
(() => {
  const data = document.getElementById("demo");
  const sub = document.querySelector(".sub");
  if (!data || !sub) return;
  const lines = JSON.parse(data.textContent);
  const [en, tr] = [sub.querySelector(".sub-en"), sub.querySelector(".sub-tr")];
  en.innerHTML = lines[0][0];
  tr.innerHTML = lines[0][1];
  if (lines.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let i = 0;
  setInterval(() => {
    sub.classList.add("fade");
    setTimeout(() => {
      i = (i + 1) % lines.length;
      en.innerHTML = lines[i][0];
      tr.innerHTML = lines[i][1];
      sub.classList.remove("fade");
    }, 380);
  }, 3800);
})();

// Setups: tabs (with no script, every setup shows one after another)
(() => {
  const list = document.querySelector(".tabs");
  if (!list) return;
  const tabs = [...list.querySelectorAll(".tab")];
  const show = (tab, focus) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    }
    if (focus) tab.focus();
  };
  list.hidden = false;
  tabs.forEach((t) => t.addEventListener("click", () => show(t)));
  list.addEventListener("keydown", (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const rtl = document.dir === "rtl";
    const next = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[e.key];
    if (next) { e.preventDefault(); show(tabs[(i + next + tabs.length) % tabs.length], true); }
  });
  show(tabs[0]);
})();

// the language list closes on a click elsewhere
document.addEventListener("click", (e) => {
  const m = document.querySelector(".langs-menu[open]");
  if (m && !m.contains(e.target)) m.removeAttribute("open");
});
