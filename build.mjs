// Builds the site into dist/: one page per language (Arabic at /, the others at /<code>/), from
// one template (src/page.html), the languages (src/languages.json, the desktop app's interface
// languages) and each language's text (src/strings/<code>.json, every key of en.json).
//
//   {{key}}    the text, HTML-escaped, with two marks: [[word]] a highlighted word (as the game
//              colours it), [A] a controller button
//   {{{key}}}  raw (only for values the build makes itself)
//
// No dependencies: node build.mjs   (node build.mjs --strict: every language must have its text)
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const SITE = "https://vitranslator.app";
const languages = JSON.parse(readFileSync("src/languages.json", "utf8"));
const template = readFileSync("src/page.html", "utf8");
const english = JSON.parse(readFileSync("src/strings/en.json", "utf8"));
const strict = process.argv.includes("--strict");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const marks = (s) => esc(s)
  .replace(/\[\[(.+?)\]\]/g, "<mark>$1</mark>")
  .replace(/\[A\]/g, '<span class="pad-a" aria-label="A">A</span>');

// each language's text: every key of the English, and the same marks
const texts = {};
const missing = [];
for (const l of languages) {
  const file = `src/strings/${l.code}.json`;
  if (!existsSync(file)) { missing.push(l.code); continue; }
  const s = JSON.parse(readFileSync(file, "utf8"));
  for (const k of Object.keys(english)) {
    if (!(k in s)) throw new Error(`${l.code}: missing "${k}"`);
    for (const m of ["[[", "[A]"]) {
      if (english[k].includes(m) !== String(s[k]).includes(m)) throw new Error(`${l.code}: "${k}" must keep its ${m} mark like the English`);
    }
  }
  for (const k of Object.keys(s)) if (!(k in english)) throw new Error(`${l.code}: unknown key "${k}"`);
  texts[l.code] = s;
}
if (missing.length && strict) throw new Error(`no text yet for: ${missing.join(", ")}`);
const built = languages.filter((l) => texts[l.code]);

// each picture's address carries a hash of the file: a new screenshot is never served from an old
// cache (pictures are cached for a week); the og:image and icons too
const fileVersion = {};
const versioned = (html) =>
  html.replace(/(["(])(\/img\/[\w.-]+\.(?:webp|png|jpg|svg)|\/favicon\.png)(?=[")])/g, (_, q, path) => {
    fileVersion[path] ||= createHash("sha256").update(readFileSync(`public${path}`)).digest("hex").slice(0, 8);
    return `${q}${path}?v=${fileVersion[path]}`;
  }).replace(/(https:\/\/vitranslator\.app)(\/img\/[\w.-]+\.png)(?=")/g, (_, host, path) => {
    fileVersion[path] ||= createHash("sha256").update(readFileSync(`public${path}`)).digest("hex").slice(0, 8);
    return `${host}${path}?v=${fileVersion[path]}`;
  });

// the hero's TV: real frames from the game, each translated into another language (src/hero.json)
const hero = JSON.parse(readFileSync("src/hero.json", "utf8"));
const rtlLangs = new Set(["ar", "fa", "ur", "he"]);
const heroLines = (h) => {
  const dir = rtlLangs.has(h.lang) ? "rtl" : "ltr";
  return `<p class="sub-tr" dir="${dir}" lang="${h.lang}">${marks(h.sub_tr)}</p>
              <p class="inst-tr" dir="${dir}" lang="${h.lang}">${marks(h.inst_tr)}</p>
              <p class="sub-en" dir="ltr" lang="en">${esc(h.sub_en)} ${esc(h.inst_en)}</p>
              <p class="sub-lang">${esc(h.name)}</p>`;
};

// a version for the css and js addresses, so a new build is never served from an old cache
const css = readFileSync("src/style.css", "utf8");
const js = readFileSync("src/main.js", "utf8");
const build = createHash("sha256").update(css + js).digest("hex").slice(0, 10);

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
cpSync("public", "dist", { recursive: true });
writeFileSync("dist/style.css", css);
writeFileSync("dist/main.js", js);

const alternates = [
  ...built.map((l) => `  <link rel="alternate" hreflang="${l.code}" href="${SITE}${l.path}" />`),
  `  <link rel="alternate" hreflang="x-default" href="${SITE}/" />`,
].join("\n");

for (const l of built) {
  const s = texts[l.code];
  const items = built.map((o) => `          <li><a href="${o.path}" hreflang="${o.code}" lang="${o.code}" dir="${o.dir}"${o.code === l.code ? ' aria-current="page"' : ""}>${esc(o.name)}</a></li>`).join("\n");
  const values = {
    ...s,
    lang: l.code,
    dir: l.dir,
    path: l.path,
    build,
    alternates,
    lang_menu: `        <details class="langs-menu">
          <summary aria-label="${esc(s.lang_label)}">🌐 ${esc(l.name)}</summary>
          <ul>
${items}
          </ul>
        </details>`,
    footer_langs: `      <nav class="footer-langs" aria-label="${esc(s.lang_label)}">${built.map((o) => `<a href="${o.path}" hreflang="${o.code}" lang="${o.code}">${esc(o.name)}</a>`).join(" ")}</nav>`,
    // the demo lines for main.js, already marked up (it shows them as they are)
    hero_first: heroLines(hero[0]),
    demo_json: JSON.stringify(hero.map((h) => ({ ...h, sub_en: esc(h.sub_en), inst_en: esc(h.inst_en), sub_tr: marks(h.sub_tr), inst_tr: marks(h.inst_tr), dir: rtlLangs.has(h.lang) ? "rtl" : "ltr" }))).replace(/</g, "\\u003c"),
  };
  const raw = new Set(["lang", "dir", "path", "build", "hero_first"]);
  const html = template
    .replace(/\{\{\{(\w+)\}\}\}/g, (_, k) => {
      if (!(k in values)) throw new Error(`template: unknown {{{${k}}}}`);
      return values[k];
    })
    .replace(/\{\{(\w+)\}\}/g, (_, k) => {
      if (!(k in values)) throw new Error(`template: unknown {{${k}}}`);
      return raw.has(k) ? values[k] : marks(values[k]);
    });
  const dir = `dist${l.path}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}index.html`, versioned(html));
}

// the privacy policy (English only), at /privacy/
const UPDATED = "18 November 2026";
mkdirSync("dist/privacy", { recursive: true });
writeFileSync("dist/privacy/index.html", versioned(readFileSync("src/privacy.html", "utf8")
  .replace(/\{\{build\}\}/g, build).replace(/\{\{updated\}\}/g, UPDATED)));

// for search engines: every language's page
writeFileSync("dist/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${built.map((l) => `  <url><loc>${SITE}${l.path}</loc>\n${built.map((o) => `    <xhtml:link rel="alternate" hreflang="${o.code}" href="${SITE}${o.path}"/>`).join("\n")}\n  </url>`).join("\n")}
  <url><loc>${SITE}/privacy/</loc></url>
</urlset>
`);
writeFileSync("dist/robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`built ${built.length} of ${languages.length} languages (build ${build})${missing.length ? `; no text yet: ${missing.join(", ")}` : ""}`);
