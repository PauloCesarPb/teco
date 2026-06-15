/**
 * TECO - Importa precios desde feeds de afiliados/catálogos (CSV o JSON).
 * Solo descarga archivos, así que NO lo bloquean (a diferencia del scraping).
 * Uso directo: node server/feed-import.js
 */
const fs = require("fs");
const path = require("path");
const importer = require("./importer");

async function run(dataDir) {
  dataDir = dataDir || __dirname;
  const cfg = JSON.parse(fs.readFileSync(path.join(dataDir, "feeds.json"), "utf8"));
  const feeds = (cfg.feeds || []).filter((f) => f.url && !f.url.includes("EJEMPLO"));
  if (!feeds.length) return { skipped: true, msg: "Sin feeds reales en feeds.json (pon la URL de tu programa de afiliados)." };

  let rows = [];
  for (const f of feeds) {
    try {
      const res = await fetch(f.url);
      const text = await res.text();
      let items = f.format === "json" ? JSON.parse(text) : importer.parseCsv(text);
      if (!Array.isArray(items)) items = items.products || items.items || [];
      const m = f.map || {};
      for (const it of items) {
        const name = it[m.name || "name"];
        const price = it[m.price || "price"];
        if (!name || price == null || price === "") continue;
        const special = it[m.specialPrice || "specialPrice"];
        rows.push({
          name, price: Number(String(price).replace(/[^\d.]/g, "")),
          brand: it[m.brand || "brand"], category: it[m.category || "category"] || f.category || "Tecnología",
          link: it[m.link || "link"], image: it[m.image || "image"],
          specialPrice: special != null && special !== "" ? Number(String(special).replace(/[^\d.]/g, "")) : null,
          store: f.store || "falabella", estimate: false, verified: true,
        });
      }
      console.log(`  feed ${f.name}: ${items.length} ítems`);
    } catch (e) {
      console.log(`  feed ${f.name}: error (${e.message})`);
    }
  }
  if (!rows.length) return { imported: 0 };
  return importer.mergeImport(rows, dataDir);
}

if (require.main === module) {
  run(__dirname).then((r) => console.log("Feeds:", JSON.stringify(r))).catch((e) => console.error(e.message));
}
module.exports = { run };
