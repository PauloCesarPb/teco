/* TECO - Importar productos desde un CSV (uso: npm run import [ruta.csv]) */
const fs = require("fs");
const path = require("path");
const importer = require("./importer");
const file = process.argv[2] || path.join(__dirname, "import.csv");
if (!fs.existsSync(file)) {
  console.error("No se encontró el archivo:", file);
  console.error("Crea un CSV (mira server/import-sample.csv) o pasa la ruta: npm run import ruta.csv");
  process.exit(1);
}
const rows = importer.parseCsv(fs.readFileSync(file, "utf8"));
const r = importer.mergeImport(rows, __dirname);
console.log(`Importación lista: ${r.nuevos} nuevos, ${r.actualizados} actualizados, ${r.conPrecio} con precio. Total catálogo: ${r.total}.`);
