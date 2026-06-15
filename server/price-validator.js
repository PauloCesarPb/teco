/**
 * TECO - Validador de precios con Playwright
 * Abre la búsqueda real de cada tienda, lee candidatos y valida que el
 * título coincida con el producto. Nunca inventa precios: si no hay match
 * válido, devuelve estado "Búsqueda en tienda".
 */
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch (e) {
  chromium = null;
}

function normalize(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePrice(text) {
  if (!text) return null;
  // Quita símbolos y separadores de miles, conserva el decimal
  const cleaned = String(text).replace(/[^\d.,]/g, "");
  if (!cleaned) return null;
  // Formato peruano: 5,999.00  -> coma miles, punto decimal
  let n = cleaned.replace(/,/g, "");
  const value = parseFloat(n);
  return isNaN(value) ? null : value;
}

function titleMatches(title, product) {
  const t = normalize(title);
  if (!t) return false;
  const required = (product.requiredTerms || []).map(normalize);
  const reject = (product.rejectTerms || []).map(normalize);
  for (const r of required) if (!t.includes(r)) return false;
  for (const r of reject) if (t.includes(r)) return false;
  return true;
}

function buildSearchUrl(company, term) {
  return company.searchUrl.replace("{q}", encodeURIComponent(term));
}

async function readStore(page, company, product, storeCfg, maxCandidates) {
  if (!storeCfg) return [];
  const candidates = await page.evaluate((cfg) => {
    const out = [];
    const items = document.querySelectorAll(cfg.itemSelector);
    items.forEach((el) => {
      const titleEl = el.querySelector(cfg.titleSelector) || el;
      const priceEl = el.querySelector(cfg.priceSelector);
      const linkEl = el.querySelector(cfg.linkSelector) || (el.tagName === "A" ? el : null);
      let price = priceEl ? priceEl.textContent : null;
      if (cfg.priceAttr && priceEl && priceEl.getAttribute(cfg.priceAttr)) {
        price = priceEl.getAttribute(cfg.priceAttr);
      }
      out.push({
        title: titleEl ? titleEl.textContent.trim() : "",
        price: price ? price.trim() : "",
        link: linkEl ? linkEl.href : "",
      });
    });
    return out;
  }, storeCfg);
  return candidates.slice(0, maxCandidates || 12);
}

async function validateProduct(product, companies, config) {
  const term = product.searchTerm || product.name;
  if (!chromium) {
    return companies.map((c) => ({
      companyId: c.id, company: c.name, price: null,
      link: buildSearchUrl(c, term), status: "Búsqueda en tienda",
      note: "Playwright no instalado. Ejecuta: npm run install-browsers",
    }));
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: config.userAgent,
    locale: "es-PE",
  });
  const results = [];

  for (const c of companies) {
    const url = buildSearchUrl(c, term);
    const storeCfg = (config.stores || {})[c.id];
    const result = {
      companyId: c.id, company: c.name, price: null,
      link: url, status: "Búsqueda en tienda",
    };
    try {
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: config.timeoutMs || 25000 });
      await page.waitForTimeout(2500); // deja cargar contenido dinámico
      const candidates = await readStore(page, c, product, storeCfg, config.maxCandidates);
      await page.close();

      const valid = candidates
        .map((x) => ({ ...x, value: parsePrice(x.price) }))
        .filter((x) => x.value && titleMatches(x.title, product))
        .filter((x) => x.value >= product.priceMin && x.value <= product.priceMax)
        .sort((a, b) => a.value - b.value);

      if (valid.length > 0) {
        const best = valid[0];
        result.price = best.value;
        result.link = best.link || url;
        result.status = "Validado";
        result.title = best.title;
      } else {
        result.note = "Sin coincidencia válida. Se mantiene el enlace de búsqueda.";
      }
    } catch (err) {
      result.note = "No se pudo leer la tienda (" + (err.message || "error") + ").";
    }
    results.push(result);
  }

  await browser.close();
  return results;
}

module.exports = { validateProduct };
