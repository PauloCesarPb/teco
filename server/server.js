/**
 * TECO - Servidor Express
 * Sirve la web estática y expone la API del comparador.
 */
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..");
const DATA = __dirname;

app.use(express.json({ limit: "1mb" }));

/* ---------- Utilidades de archivos JSON ---------- */
function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA, file), "utf8"));
  } catch (e) {
    return fallback;
  }
}
function writeJson(file, data) {
  fs.writeFileSync(path.join(DATA, file), JSON.stringify(data, null, 2), "utf8");
}

/* ---------- Credenciales (no se muestran en la web) ---------- */
const USERS = {
  admin: process.env.ADMIN_PASS || "teco2025",
  proveedor: process.env.PROVIDER_PASS || "proveedor2025",
};

/* ---------- Sesiones: tokens firmados (HMAC-SHA256) ---------- *
 * El token es `payload.firma` donde payload = base64url("rol:expira").
 * Sin la firma correcta no se puede falsificar ni alterar el rol/expiración.
 * El secreto sale de TECO_SECRET; si no existe, se genera y se guarda en
 * server/.secret (gitignored) para que las sesiones sobrevivan a reinicios. */
function loadSecret() {
  if (process.env.TECO_SECRET) return process.env.TECO_SECRET;
  const file = path.join(DATA, ".secret");
  try {
    return fs.readFileSync(file, "utf8").trim();
  } catch (e) {
    const s = crypto.randomBytes(32).toString("hex");
    try { fs.writeFileSync(file, s, "utf8"); } catch (_) {}
    return s;
  }
}
const SECRET = loadSecret();
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12; // 12 horas

// El token lleva rol + id de proveedor (pid, vacío para admin) + expiración.
function signToken(role, pid) {
  const body = Buffer.from(`${role}:${pid || ""}:${Date.now() + TOKEN_TTL_MS}`).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const parts = Buffer.from(body, "base64url").toString("utf8").split(":");
  const role = parts[0], pid = parts[1], exp = parts[2];
  if (!role || !exp || Number(exp) < Date.now()) return null;
  return { role, pid: pid || null, exp: Number(exp) };
}

// Contraseñas: hash scrypt con salt (sin dependencias externas).
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return salt + ":" + hash;
}
function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string" || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const h = crypto.scryptSync(String(password), salt, 64).toString("hex");
  const a = Buffer.from(h), b = Buffer.from(hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function getToken(req) {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers["authorization"] || "");
  return m ? m[1] : null;
}

// Middleware: exige token válido; opcionalmente restringe por rol.
function auth(roles) {
  return (req, res, next) => {
    const session = verifyToken(getToken(req));
    if (!session) return res.status(401).json({ error: "No autorizado. Inicia sesión." });
    if (roles && roles.length && !roles.includes(session.role)) {
      return res.status(403).json({ error: "No tienes permiso para esta acción." });
    }
    req.session = session;
    next();
  };
}

/* ---------- Helpers de comparación ---------- */
function buildSearchUrl(company, term) {
  return company.searchUrl.replace("{q}", encodeURIComponent(term));
}

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findProduct(query) {
  const products = readJson("products.json", []);
  const q = normalize(query);
  if (!q) return null;
  // 1) coincidencia directa por id, nombre o modelo
  let hit = products.find(
    (p) => p.id === query || normalize(p.name) === q || normalize(p.model) === q
  );
  if (hit) return hit;
  // 2) puntuación por términos coincidentes, con UMBRAL de calidad para no
  //    devolver un producto equivocado por compartir una sola palabra suelta.
  const words = q.split(" ").filter(Boolean);
  // En consultas de varias palabras exigimos coincidir al menos el 60% (mín. 2).
  const need = words.length <= 1 ? 1 : Math.max(2, Math.ceil(words.length * 0.6));
  let best = null;
  let bestScore = 0;
  for (const p of products) {
    const haystack = normalize(
      [p.name, p.model, p.brand, p.category, (p.requiredTerms || []).join(" ")].join(" ")
    );
    let wordScore = 0;
    for (const w of words) if (haystack.includes(w)) wordScore++;
    if (wordScore < need) continue; // no alcanza el umbral → no es match
    let score = wordScore;
    // bonus si todos los requiredTerms aparecen en la consulta
    const req = p.requiredTerms || [];
    if (req.length && req.every((t) => q.includes(normalize(t)))) score += 3;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

function pricesForProduct(productId) {
  const companies = readJson("company-sources.json", []);
  const refs = readJson("retail-references.json", []);
  const products = readJson("products.json", []);
  const product = products.find((p) => p.id === productId);
  const term = product ? product.searchTerm || product.name : productId;

  return companies.map((c) => {
    const ref = refs
      .filter((r) => r.productId === productId && r.companyId === c.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const searchUrl = buildSearchUrl(c, term);
    const logo = c.domain ? `https://www.google.com/s2/favicons?domain=${c.domain}&sz=64` : null;
    if (ref) {
      const verified = !!ref.verified;
      const hasExactLink = !!(ref.link && verified);
      return {
        companyId: c.id,
        company: c.name,
        color: c.color,
        logo,
        price: ref.price != null ? ref.price : null,
        specialPrice: ref.specialPrice != null ? ref.specialPrice : null,
        link: hasExactLink ? ref.link : searchUrl,
        searchUrl,
        date: ref.date,
        status: ref.price != null ? "Validado" : "Búsqueda en tienda",
        note: ref.note || null,
        history: ref.history || [],
        estimate: ref.estimate || false,
        verified,
        hasExactLink,
      };
    }
    return {
      companyId: c.id,
      company: c.name,
      color: c.color,
      logo,
      price: null,
      specialPrice: null,
      link: searchUrl,
      searchUrl,
      date: null,
      status: "Búsqueda en tienda",
      note: null,
      history: [],
      hasExactLink: false,
    };
  });
}

/* ---------- API ---------- */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "TECO", time: new Date().toISOString() });
});

app.get("/api/products", (req, res) => {
  // No exponemos los términos internos de scraping al público general,
  // pero sí lo necesario para mostrar y comparar.
  const products = readJson("products.json", []);
  res.json(products.map((p) => ({
    id: p.id, name: p.name, model: p.model, category: p.category,
    brand: p.brand, searchTerm: p.searchTerm, specs: p.specs, image: p.image,
    priceMin: p.priceMin, priceMax: p.priceMax,
  })));
});

app.get("/api/companies", (req, res) => {
  res.json(readJson("company-sources.json", []));
});

app.get("/api/references", (req, res) => {
  res.json(readJson("retail-references.json", []));
});

app.get("/api/search-online", (req, res) => {
  const q = req.query.q || "";
  const product = findProduct(q);
  if (!product) {
    return res.json({ found: false, query: q, product: null, stores: [] });
  }
  res.json({
    found: true,
    query: q,
    product: {
      id: product.id, name: product.name, model: product.model,
      category: product.category, brand: product.brand, specs: product.specs,
      image: product.image,
    },
    stores: pricesForProduct(product.id),
  });
});

// Registro de búsquedas sin resultado → para decidir qué productos agregar.
app.post("/api/track-search", (req, res) => {
  const raw = ((req.body && req.body.q) || "").toString().trim().slice(0, 80);
  const key = normalize(raw);
  if (!key || key.length < 2) return res.json({ ok: false });
  const list = readJson("searches.json", []);
  const hit = list.find((s) => s.key === key);
  const today = new Date().toISOString().slice(0, 10);
  if (hit) { hit.count++; hit.lastDate = today; hit.term = raw; }
  else list.push({ key, term: raw, count: 1, lastDate: today });
  writeJson("searches.json", list);
  res.json({ ok: true });
});

app.get("/api/searches", auth(["admin"]), (req, res) => {
  const list = readJson("searches.json", [])
    .sort((a, b) => b.count - a.count || String(b.lastDate).localeCompare(String(a.lastDate)));
  res.json(list);
});

app.get("/api/product/:id/prices", (req, res) => {
  const products = readJson("products.json", []);
  const product = products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "Producto no encontrado" });
  res.json({
    product: {
      id: product.id, name: product.name, model: product.model,
      category: product.category, brand: product.brand, specs: product.specs,
      image: product.image,
    },
    stores: pricesForProduct(product.id),
  });
});

app.post("/api/references", auth(["admin"]), (req, res) => {
  const { productId, companyId, price, specialPrice, link, date, status } = req.body || {};
  if (!productId || !companyId) {
    return res.status(400).json({ error: "productId y companyId son obligatorios" });
  }
  const refs = readJson("retail-references.json", []);
  const prev = refs.find((r) => r.productId === productId && r.companyId === companyId);
  const today = date || new Date().toISOString().slice(0, 10);
  const history = (prev && prev.history) ? prev.history.slice(-29) : [];
  const numPrice = price ? Number(price) : null;
  if (numPrice && (!history.length || history[history.length - 1].price !== numPrice)) {
    history.push({ date: today, price: numPrice });
  }
  const entry = {
    productId,
    companyId,
    price: numPrice,
    specialPrice: specialPrice ? Number(specialPrice) : (prev ? prev.specialPrice : null),
    link: link || null,
    date: today,
    status: status || (link || price ? "Validado" : "Búsqueda en tienda"),
    history,
  };
  const filtered = refs.filter(
    (r) => !(r.productId === productId && r.companyId === companyId)
  );
  filtered.push(entry);
  writeJson("retail-references.json", filtered);
  res.json({ ok: true, reference: entry });
});

app.post("/api/validate-prices/:productId", auth(["admin"]), async (req, res) => {
  const products = readJson("products.json", []);
  const companies = readJson("company-sources.json", []);
  const product = products.find((p) => p.id === req.params.productId);
  if (!product) return res.status(404).json({ error: "Producto no encontrado" });

  let results;
  try {
    const validator = require("./price-validator");
    results = await validator.validateProduct(product, companies, readJson("price-sources.json", {}));
  } catch (err) {
    // Si Playwright no está disponible o la lectura falla, NO inventamos precios.
    results = companies.map((c) => ({
      companyId: c.id,
      company: c.name,
      price: null,
      link: buildSearchUrl(c, product.searchTerm || product.name),
      status: "Búsqueda en tienda",
      note: "Lectura automática no disponible. Usa el enlace de búsqueda o edita el precio manualmente.",
    }));
  }

  // Persistimos solo los precios validados y vamos construyendo el historial
  const refs = readJson("retail-references.json", []);
  const today = new Date().toISOString().slice(0, 10);
  for (const r of results) {
    if (r.price && r.status === "Validado") {
      const prev = refs.find((x) => x.productId === product.id && x.companyId === r.companyId);
      const history = (prev && prev.history) ? prev.history.slice(-29) : [];
      if (!history.length || history[history.length - 1].price !== r.price) {
        history.push({ date: today, price: r.price });
      }
      const filtered = refs.filter(
        (x) => !(x.productId === product.id && x.companyId === r.companyId)
      );
      filtered.push({
        productId: product.id,
        companyId: r.companyId,
        price: r.price,
        specialPrice: r.specialPrice != null ? r.specialPrice : (prev ? prev.specialPrice : null),
        link: r.link,
        date: today,
        status: "Validado",
        verified: true,
        history,
      });
      refs.length = 0;
      refs.push(...filtered);
    }
  }
  writeJson("retail-references.json", refs);

  res.json({ productId: product.id, name: product.name, results });
});

/* ---------- Proveedores (solicitudes) ---------- */
app.get("/api/providers", auth(["admin"]), (req, res) => {
  // Nunca exponemos el hash de la contraseña.
  res.json(readJson("providers.json", []).map(({ passwordHash, ...rest }) => rest));
});
// Registro de proveedor: crea una cuenta con correo + contraseña en estado
// "Pendiente". No puede iniciar sesión hasta que el admin la apruebe.
app.post("/api/providers", (req, res) => {
  const b = req.body || {};
  const correo = (b.correo || "").trim().toLowerCase();
  if (!b.nombre || !b.contacto || !correo || !b.password) {
    return res.status(400).json({ error: "Nombre, contacto, correo y contraseña son obligatorios" });
  }
  if (String(b.password).length < 6) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
  }
  const providers = readJson("providers.json", []);
  if (providers.some((p) => (p.correo || "").toLowerCase() === correo)) {
    return res.status(409).json({ error: "Ya existe una cuenta con ese correo" });
  }
  const entry = {
    id: "prov-" + Date.now(),
    nombre: b.nombre, ruc: b.ruc || "", contacto: b.contacto,
    correo, whatsapp: b.whatsapp || "",
    categoria: b.categoria || "", comentario: b.comentario || "",
    passwordHash: hashPassword(b.password),
    estado: "Pendiente", fecha: new Date().toISOString().slice(0, 10),
  };
  providers.push(entry);
  writeJson("providers.json", providers);
  const { passwordHash, ...safe } = entry;
  res.json({ ok: true, provider: safe });
});
app.post("/api/providers/:id/:action", auth(["admin"]), (req, res) => {
  const providers = readJson("providers.json", []);
  const p = providers.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: "No encontrado" });
  const map = { approve: "Aprobado", reject: "Rechazado" };
  p.estado = map[req.params.action] || p.estado;
  writeJson("providers.json", providers);
  res.json({ ok: true, provider: p });
});

/* ---------- Ofertas de proveedores ---------- */
app.get("/api/offers", (req, res) => {
  res.json(readJson("offers.json", []));
});
app.post("/api/offers", auth(["admin", "proveedor"]), (req, res) => {
  const b = req.body || {};
  if (!b.productId) return res.status(400).json({ error: "productId obligatorio" });
  const offers = readJson("offers.json", []);
  const existing = b.id ? offers.find((o) => o.id === b.id) : null;

  // La identidad del proveedor sale del token, nunca del body.
  let providerId, proveedorNombre;
  if (req.session.role === "proveedor") {
    providerId = req.session.pid;
    const prov = readJson("providers.json", []).find((p) => p.id === providerId);
    proveedorNombre = prov ? prov.nombre : "Proveedor";
    if (existing && existing.providerId && existing.providerId !== providerId) {
      return res.status(403).json({ error: "No puedes editar ofertas de otro proveedor" });
    }
  } else {
    providerId = (existing && existing.providerId) || b.providerId || null;
    proveedorNombre = (existing && existing.proveedor) || b.proveedor || "Proveedor";
  }

  const entry = {
    id: b.id || "off-" + Date.now(),
    productId: b.productId, providerId, proveedor: proveedorNombre,
    price: b.price ? Number(b.price) : null, stock: b.stock || "",
    garantia: b.garantia || "", delivery: b.delivery || "",
    whatsapp: b.whatsapp || "", activo: b.activo !== false,
    fecha: new Date().toISOString().slice(0, 10),
  };
  const filtered = offers.filter((o) => o.id !== entry.id);
  filtered.push(entry);
  writeJson("offers.json", filtered);
  res.json({ ok: true, offer: entry });
});

// Ofertas del proveedor autenticado (para su panel).
app.get("/api/my-offers", auth(["proveedor"]), (req, res) => {
  res.json(readJson("offers.json", []).filter((o) => o.providerId === req.session.pid));
});

/* ---------- Login básico (servidor) ---------- */
app.post("/api/login", (req, res) => {
  const { role, password } = req.body || {};

  // Proveedor: inicia sesión con su propio correo + contraseña, y solo si su
  // cuenta fue aprobada por el admin.
  if (role === "proveedor") {
    const correo = ((req.body.email || req.body.correo || "")).trim().toLowerCase();
    const prov = readJson("providers.json", []).find((p) => (p.correo || "").toLowerCase() === correo);
    if (!prov || !verifyPassword(password, prov.passwordHash)) {
      return res.status(401).json({ ok: false, error: "Correo o contraseña incorrectos" });
    }
    if (prov.estado !== "Aprobado") {
      const msg = prov.estado === "Rechazado"
        ? "Tu cuenta fue rechazada. Escríbenos para más información."
        : "Tu cuenta aún está pendiente de aprobación. Te avisaremos cuando esté lista.";
      return res.status(403).json({ ok: false, error: msg });
    }
    return res.json({ ok: true, role: "proveedor", nombre: prov.nombre, token: signToken("proveedor", prov.id) });
  }

  // Admin: contraseña compartida (comparación en tiempo constante).
  const expected = USERS.admin;
  const ok = role === "admin" && typeof expected === "string" && typeof password === "string" &&
    expected.length === password.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(password));
  if (ok) return res.json({ ok: true, role: "admin", token: signToken("admin") });
  res.status(401).json({ ok: false, error: "Credenciales incorrectas" });
});

// Comprueba que el token siga siendo válido (lo usan los guards de panel).
app.get("/api/me", auth(), (req, res) => {
  res.json({ ok: true, role: req.session.role, pid: req.session.pid, exp: req.session.exp });
});

/* ---------- Importación masiva de productos ---------- */
const importer = require("./importer");
app.post("/api/products/import", auth(["admin"]), (req, res) => {
  const body = req.body || {};
  let rows = [];
  if (Array.isArray(body.products)) rows = body.products;
  else if (typeof body.csv === "string") rows = importer.parseCsv(body.csv);
  else if (Array.isArray(body)) rows = body;
  if (!rows.length) return res.status(400).json({ error: 'Envía { "products": [...] } o { "csv": "..." }' });
  try {
    const result = importer.mergeImport(rows, DATA);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---------- Actualización de precios desde feeds ----------
 * El servidor se mantiene al día solo: corre el import de feeds al arrancar
 * y luego cada AUTO_REFRESH_HOURS horas (por defecto 6; 0 = desactivado).
 * Cada corrida queda registrada en feed-status.json para verla en el admin. */
const feedImport = require("./feed-import");
const REFRESH_HOURS = process.env.AUTO_REFRESH_HOURS != null ? Number(process.env.AUTO_REFRESH_HOURS) : 6;

async function refreshFeeds(trigger) {
  let result;
  try { result = await feedImport.run(DATA); }
  catch (e) { result = { error: e.message }; }
  const now = Date.now();
  writeJson("feed-status.json", {
    lastRun: new Date(now).toISOString(),
    trigger,
    result,
    intervalHours: REFRESH_HOURS,
    nextRun: REFRESH_HOURS > 0 ? new Date(now + REFRESH_HOURS * 3600000).toISOString() : null,
  });
  console.log(`[feeds:${trigger}]`, JSON.stringify(result));
  return result;
}

app.post("/api/refresh-feeds", auth(["admin"]), async (req, res) => {
  try {
    const result = await refreshFeeds("manual");
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/feed-status", auth(["admin"]), (req, res) => {
  res.json(readJson("feed-status.json", { lastRun: null }));
});

/* ---------- SEO ---------- */
function baseUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  return `${proto}://${req.headers.host}`;
}
function escAttr(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

// Página de detalle: inyectamos título, descripción, Open Graph y JSON-LD
// con los precios reales para que Google y las redes vean el contenido
// (la página sigue renderizándose en el cliente para el usuario).
app.get("/detalle.html", (req, res, next) => {
  const id = req.query.id;
  if (!id) return next();
  const product = readJson("products.json", []).find((p) => p.id === id);
  if (!product) return next();
  let html;
  try { html = fs.readFileSync(path.join(ROOT, "detalle.html"), "utf8"); }
  catch (e) { return next(); }

  const stores = pricesForProduct(product.id);
  const priced = stores.filter((s) => s.price != null);
  const best = priced.length ? priced.reduce((a, b) => (a.price <= b.price ? a : b)) : null;
  const url = baseUrl(req) + "/detalle.html?id=" + encodeURIComponent(product.id);
  const money = (n) => "S/ " + Number(n).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const title = `${product.name} — precio comparado en ${stores.length} tiendas | TECO`;
  const desc = best
    ? `${product.name}: mejor precio ${money(best.price)} en ${best.company}. Compara precios entre Falabella, Ripley, Hiraoka, Oechsle, Plaza Vea y La Curacao en el Perú.`
    : `Compara el precio de ${product.name} entre las tiendas más grandes del Perú en un solo vistazo.`;

  const jsonld = {
    "@context": "https://schema.org", "@type": "Product",
    name: product.name, category: product.category, description: desc,
  };
  if (product.brand) jsonld.brand = { "@type": "Brand", name: product.brand };
  if (product.image) jsonld.image = product.image;
  if (priced.length) {
    jsonld.offers = {
      "@type": "AggregateOffer", priceCurrency: "PEN",
      lowPrice: Math.min(...priced.map((s) => s.price)),
      highPrice: Math.max(...priced.map((s) => s.price)),
      offerCount: priced.length,
      offers: priced.map((s) => ({
        "@type": "Offer", price: s.price, priceCurrency: "PEN",
        availability: "https://schema.org/InStock", url: s.link,
        seller: { "@type": "Organization", name: s.company },
      })),
    };
  }

  const head = `
  <title>${escAttr(title)}</title>
  <meta name="description" content="${escAttr(desc)}" />
  <link rel="canonical" href="${escAttr(url)}" />
  <meta property="og:type" content="product" />
  <meta property="og:title" content="${escAttr(title)}" />
  <meta property="og:description" content="${escAttr(desc)}" />
  <meta property="og:url" content="${escAttr(url)}" />
  <meta property="og:site_name" content="TECO" />
  ${product.image ? `<meta property="og:image" content="${escAttr(product.image)}" />` : ""}
  <meta name="twitter:card" content="${product.image ? "summary_large_image" : "summary"}" />
  <script type="application/ld+json">${JSON.stringify(jsonld)}</script>
`;
  html = html.replace(/<title>[\s\S]*?<\/title>\s*/, "").replace("</head>", head + "</head>");
  res.set("Content-Type", "text/html; charset=utf-8").send(html);
});

app.get("/sitemap.xml", (req, res) => {
  const base = baseUrl(req);
  const pages = ["", "productos.html", "buscador-online.html", "como-funciona.html", "faq.html", "sobre.html", "proveedor.html", "terminos.html", "privacidad.html"];
  const urls = pages.map((p) => `  <url><loc>${base}/${p}</loc></url>`);
  for (const p of readJson("products.json", [])) {
    urls.push(`  <url><loc>${base}/detalle.html?id=${encodeURIComponent(p.id)}</loc></url>`);
  }
  res.set("Content-Type", "application/xml").send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`
  );
});

app.get("/robots.txt", (req, res) => {
  res.type("text/plain").send(
    `User-agent: *\nAllow: /\n` +
    `Disallow: /admin.html\nDisallow: /panel-proveedor.html\nDisallow: /importar.html\n` +
    `Disallow: /validar-precios.html\nDisallow: /actualizar-precios.html\nDisallow: /login.html\n` +
    `Sitemap: ${baseUrl(req)}/sitemap.xml\n`
  );
});

/* ---------- Bloquear acceso directo a /server y /node_modules ---------- */
app.use((req, res, next) => {
  if (/^\/(server|node_modules)\//.test(req.path)) {
    return res.status(404).send("No encontrado");
  }
  next();
});

/* ---------- Estáticos ----------
 * Imágenes y fuentes rara vez cambian → cache largo.
 * HTML, JS y CSS revalidan en cada carga vía ETag (no-cache): siempre
 * sirven la última versión, y si no cambió el servidor responde 304 (sin
 * cuerpo). Así evitamos que el navegador se quede con código viejo cuando
 * publicas un cambio, sin sacrificar mucho ancho de banda. */
app.use(express.static(ROOT, {
  extensions: ["html"],
  setHeaders: (res, filePath) => {
    if (/\.(svg|png|jpe?g|webp|gif|ico|woff2?)$/i.test(filePath)) {
      res.setHeader("Cache-Control", "public, max-age=86400");
    } else {
      res.setHeader("Cache-Control", "no-cache");
    }
  },
}));

app.listen(PORT, () => {
  console.log(`TECO corriendo en http://localhost:${PORT}`);
  if (REFRESH_HOURS > 0) {
    console.log(`Actualización automática de feeds cada ${REFRESH_HOURS} h (AUTO_REFRESH_HOURS=0 para desactivar).`);
    // Primera corrida a los 15 s del arranque (no bloquea el inicio), luego periódica.
    setTimeout(() => refreshFeeds("inicio"), 15000);
    setInterval(() => refreshFeeds("auto"), REFRESH_HOURS * 3600000);
  }
});
