/**
 * TECO - Importador masivo de productos
 * Convierte filas simples (nombre, marca, categoría, precio, tienda, link)
 * en productos del catálogo con términos de validación autogenerados.
 */
const fs = require("fs");
const path = require("path");

const STOP = new Set(["de", "la", "el", "los", "las", "con", "para", "y", "-", "|", "+", "/", "en"]);
const BASE_REJECT = ["reacondicionado", "usado", "seminuevo", "open box", "funda", "case", "mica", "protector"];

function normalize(s) {
  return (s || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
function slugify(s) {
  return normalize(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}
function genTerms(name) {
  const tokens = normalize(name).replace(/[^a-z0-9\s.]/g, " ").split(/\s+/).filter(Boolean);
  const terms = tokens.filter((t) => t.length >= 2 && !STOP.has(t));
  // Limita a los 6 tokens más distintivos
  return [...new Set(terms)].slice(0, 6);
}

/** Construye un producto del catálogo a partir de una fila simple. */
function buildProduct(raw) {
  const name = (raw.name || raw.nombre || "").toString().trim();
  if (!name) return null;
  const brand = (raw.brand || raw.marca || name.split(" ")[0]).toString().trim();
  const category = (raw.category || raw.categoria || "Tecnología").toString().trim();
  const price = raw.price != null && raw.price !== "" ? Number(raw.price) : (raw.precio ? Number(raw.precio) : null);
  const id = (raw.id && slugify(raw.id)) || slugify(name);
  let specs = raw.specs;
  if (typeof specs === "string" && specs.trim()) {
    specs = specs.split("|").map((s) => {
      const [label, value] = s.split(":");
      return { label: (label || "").trim(), value: (value || "").trim() };
    }).filter((x) => x.label);
  }
  if (!Array.isArray(specs) || !specs.length) {
    specs = [{ label: "Categoría", value: category }, { label: "Marca", value: brand }, { label: "Condición", value: "Nuevo" }];
  }
  const product = {
    id, name, model: (raw.model || raw.modelo || name).toString().trim(),
    category, brand, searchTerm: (raw.searchTerm || name).toString().trim(),
    specs,
    requiredTerms: Array.isArray(raw.requiredTerms) ? raw.requiredTerms : genTerms(name),
    rejectTerms: BASE_REJECT.slice(),
    priceMin: price ? Math.round(price * 0.6) : 0,
    priceMax: price ? Math.round(price * 1.7) : 9999999,
  };
  const image = (raw.image || raw.imagen || raw.img || "").toString().trim();
  if (image) product.image = image;
  const ref = price ? {
    productId: id, companyId: (raw.store || raw.tienda || "falabella").toString().trim(),
    price, specialPrice: raw.specialPrice ? Number(raw.specialPrice) : null,
    link: (raw.link || raw.url || null) || null,
    date: new Date().toISOString().slice(0, 10), status: "Validado",
    estimate: raw.estimate === false ? false : true,
    verified: raw.verified === true,
    history: [{ date: new Date().toISOString().slice(0, 10), price }],
  } : null;
  return { product, ref };
}

/** Fusiona una lista de filas en products.json y retail-references.json. */
function mergeImport(rows, dataDir) {
  dataDir = dataDir || __dirname;
  const pPath = path.join(dataDir, "products.json");
  const rPath = path.join(dataDir, "retail-references.json");
  const products = JSON.parse(fs.readFileSync(pPath, "utf8"));
  const refs = JSON.parse(fs.readFileSync(rPath, "utf8"));
  const byId = new Map(products.map((p) => [p.id, p]));
  let nuevos = 0, actualizados = 0, conPrecio = 0;

  for (const raw of rows) {
    const built = buildProduct(raw);
    if (!built) continue;
    const { product, ref } = built;
    if (byId.has(product.id)) {
      Object.assign(byId.get(product.id), { ...product, requiredTerms: byId.get(product.id).requiredTerms });
      actualizados++;
    } else {
      products.push(product); byId.set(product.id, product); nuevos++;
    }
    if (ref) {
      const i = refs.findIndex((r) => r.productId === ref.productId && r.companyId === ref.companyId);
      if (i >= 0) refs.splice(i, 1);
      refs.push(ref); conPrecio++;
    }
  }
  fs.writeFileSync(pPath, JSON.stringify(products, null, 2));
  fs.writeFileSync(rPath, JSON.stringify(refs, null, 2));
  return { nuevos, actualizados, conPrecio, total: products.length };
}

/** Parser CSV sencillo (coma, con comillas). Primera fila = encabezados. */
function parseCsv(text) {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (!lines.length) return [];
  const split = (line) => {
    const out = []; let cur = "", q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === "," && !q) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur); return out.map((s) => s.trim());
  };
  const headers = split(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = split(line); const obj = {};
    headers.forEach((h, i) => (obj[h] = cells[i]));
    return obj;
  });
}

module.exports = { buildProduct, mergeImport, parseCsv, genTerms, slugify };
