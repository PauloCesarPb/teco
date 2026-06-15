/**
 * TECO - Actualización automática de precios.
 * Corre el import de feeds (y opcionalmente el rastreador) cada SCHEDULE_HOURS horas.
 * Uso:  npm run schedule
 *       SCHEDULE_HOURS=6 SCHEDULE_CRAWL=1 npm run schedule
 */
const path = require("path");
const { execFile } = require("child_process");
const feedImport = require("./feed-import");
const HOURS = Number(process.env.SCHEDULE_HOURS || 12);

function runCrawler() {
  return new Promise((resolve) => {
    execFile(process.execPath, [path.join(__dirname, "catalog-crawler.js")], { maxBuffer: 1e7 }, (err, so) => {
      if (so) process.stdout.write(so);
      if (err) console.log("rastreador:", err.message);
      resolve();
    });
  });
}

async function job() {
  console.log("\n[" + new Date().toLocaleString("es-PE") + "] Actualizando precios…");
  try { const r = await feedImport.run(__dirname); console.log("  " + JSON.stringify(r)); }
  catch (e) { console.log("  feeds:", e.message); }
  if (process.env.SCHEDULE_CRAWL === "1") { console.log("  rastreando tiendas…"); await runCrawler(); }
  console.log("  Listo. Próxima en " + HOURS + " h.");
}

job();
setInterval(job, HOURS * 3600 * 1000);
console.log("Actualización automática activa cada " + HOURS + " h. (Ctrl+C para detener)");
