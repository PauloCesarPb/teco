/**
 * TECO - Rastreador automático de catálogo (Playwright)
 * Recorre las URLs de catalog-sources.json, extrae productos (título, precio, link)
 * y los agrega al catálogo con importer.mergeImport. Best-effort: las tiendas cambian
 * su HTML y pueden bloquear; ajusta selectores en price-sources.json.
 *
 * Uso:  node server/catalog-crawler.js            (todas las tiendas)
 *       node server/catalog-crawler.js falabella  (una tienda)
 */
const fs = require("fs");
const path = require("path");
const importer = require("./importer");
let chromium;
try { ({ chromium } = require("playwright")); } catch (e) { chromium = null; }

const DATA = __dirname;
const sources = JSON.parse(fs.readFileSync(path.join(DATA, "catalog-sources.json"), "utf8"));
const cfg = JSON.parse(fs.readFileSync(path.join(DATA, "price-sources.json"), "utf8"));
const companies = JSON.parse(fs.readFileSync(path.join(DATA, "company-sources.json"), "utf8"));
const brandOf = (title) => (title || "").trim().split(/\s+/)[0];

function parsePrice(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/[^\d.,]/g, "").replace(/,/g, "");
  const v = parseFloat(cleaned);
  return isNaN(v) ? null : v;
}

async function crawlStore(browser, storeId) {
  const list = sources[storeId];
  if (!Array.isArray(list)) return [];
  const store = cfg.stores[storeId];
  if (!store) { console.log(`(sin selectores para ${storeId} en price-sources.json)`); return []; }
  const ctx = await browser.newContext({ userAgent: cfg.userAgent, locale: "es-PE" });
  const rows = [];
  for (const { category, url } of list) {
    try {
      const page = await ctx.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: cfg.timeoutMs || 25000 });
      await page.waitForTimeout(3000);
      const items = await page.evaluate((s) => {
        const out = [];
        document.querySelectorAll(s.itemSelector).forEach((el) => {
          const t = el.querySelector(s.titleSelector); const p = el.querySelector(s.priceSelector);
          const a = el.querySelector(s.linkSelector) || (el.tagName === "A" ? el : null);
          let price = p ? p.textContent : null;
          if (s.priceAttr && p && p.getAttribute(s.priceAttr)) price = p.getAttribute(s.priceAttr);
          out.push({ title: t ? t.textContent.trim() : "", price: price ? price.trim() : "", link: a ? a.href : "" });
        });
        return out;
      }, store);
      await page.close();
      for (const it of items.slice(0, cfg.maxCandidates ? cfg.maxCandidates * 4 : 40)) {
        const price = parsePrice(it.price);
        if (!it.title || !price) continue;
        rows.push({ name: it.title, brand: brandOf(it.title), category, price, store: storeId, link: it.link, estimate: false, verified: true });
      }
      console.log(`  ${storeId} · ${category}: ${items.length} encontrados`);
    } catch (e) {
      console.log(`  ${storeId} · ${category}: error (${e.message})`);
    }
  }
  await ctx.close();
  return rows;
}

(async () => {
  if (!chromium) { console.error("Falta Playwright. Ejecuta: npm run install-browsers"); process.exit(1); }
  const only = process.argv[2];
  const stores = only ? [only] : Object.keys(sources).filter((k) => k !== "_comment");
  const browser = await chromium.launch({ headless: true });
  let all = [];
  for (const s of stores) { console.log("Rastreando", s, "…"); all = all.concat(await crawlStore(browser, s)); }
  await browser.close();
  if (!all.length) { console.log("No se importaron productos (ajusta selectores/URLs)."); return; }
  const r = importer.mergeImport(all, DATA);
  console.log(`\nListo: ${r.nuevos} nuevos, ${r.actualizados} actualizados, ${r.conPrecio} con precio. Total: ${r.total}.`);
})();
