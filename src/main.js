// The hero's TV: real frames from the game, each with its subtitle and objective translated into
// another language, above the game's own English lines. Still for people who prefer less motion.
(() => {
  const data = document.getElementById("demo");
  const sub = document.querySelector(".sub");
  if (!data || !sub) return;
  const lines = JSON.parse(data.textContent);
  const frames = [...document.querySelectorAll(".screen .scene")];
  const [tr, inst, en, name] = [".sub-tr", ".inst-tr", ".sub-en", ".sub-lang"].map((c) => sub.querySelector(c));
  if (lines.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let i = 0;
  setInterval(() => {
    sub.classList.add("fade");
    setTimeout(() => {
      i = (i + 1) % lines.length;
      const l = lines[i];
      frames.forEach((f, k) => f.classList.toggle("on", k === i % frames.length));
      for (const p of [tr, inst]) { p.lang = l.lang; p.dir = l.dir; }
      tr.innerHTML = l.sub_tr;
      inst.innerHTML = l.inst_tr;
      en.innerHTML = `${l.sub_en} ${l.inst_en}`;
      name.textContent = l.name;
      sub.classList.remove("fade");
    }, 380);
  }, 4200);
})();

// Setups: each step's tabs (with no script, every setup shows one after another)
for (const list of document.querySelectorAll(".tabs")) {
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
  show(tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0]);
}

// the language list closes on a click elsewhere
document.addEventListener("click", (e) => {
  const m = document.querySelector(".langs-menu[open]");
  if (m && !m.contains(e.target)) m.removeAttribute("open");
});
