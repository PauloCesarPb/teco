/* TECO - Capa de datos compartida (CN) */
window.CN = (function () {
  // Fallback por si la API no responde (p.ej. abrir el HTML sin servidor)
  const FALLBACK_PRODUCTS = [{"id":"iphone-16-128","name":"iPhone 16 128GB","model":"iPhone 16 / 128GB","category":"Smartphones","brand":"Apple","searchTerm":"iPhone 16 128GB","specs":[{"label":"Pantalla","value":"6.1\" Super Retina XDR"},{"label":"Chip","value":"Apple A18"},{"label":"Almacenamiento","value":"128GB"},{"label":"Conectividad","value":"5G / USB-C"},{"label":"Condición","value":"Nuevo"}]},{"id":"galaxy-s24-ultra-256","name":"Samsung Galaxy S24 Ultra 256GB","model":"S24 Ultra / 256GB","category":"Smartphones","brand":"Samsung","searchTerm":"Samsung Galaxy S24 Ultra 256GB","specs":[{"label":"Pantalla","value":"6.8\" QHD+ 120Hz"},{"label":"Almacenamiento","value":"256GB"},{"label":"RAM","value":"12GB"},{"label":"Cámara","value":"200 MP"},{"label":"Condición","value":"Nuevo"}]},{"id":"jbl-wave-buds","name":"JBL Wave Buds","model":"Wave Buds","category":"Audífonos","brand":"JBL","searchTerm":"JBL Wave Buds","specs":[{"label":"Tipo","value":"True Wireless"},{"label":"Conectividad","value":"Bluetooth 5.2"},{"label":"Autonomía","value":"Hasta 32 h"},{"label":"Condición","value":"Nuevo"}]},{"id":"redmi-buds-4-active","name":"Redmi Buds 4 Active","model":"Buds 4 Active","category":"Audífonos","brand":"Xiaomi","searchTerm":"Redmi Buds 4 Active","specs":[{"label":"Tipo","value":"True Wireless"},{"label":"Conectividad","value":"Bluetooth 5.3"},{"label":"Autonomía","value":"Hasta 28 h"},{"label":"Condición","value":"Nuevo"}]},{"id":"powerbank-xiaomi-20000","name":"Power Bank Xiaomi 20000mAh","model":"20000mAh","category":"Accesorios","brand":"Xiaomi","searchTerm":"Power Bank Xiaomi 20000mAh","specs":[{"label":"Capacidad","value":"20000 mAh"},{"label":"Potencia","value":"18W"},{"label":"Puertos","value":"USB-C / USB-A"},{"label":"Condición","value":"Nuevo"}]},{"id":"cargador-apple-20w","name":"Cargador Apple 20W USB-C","model":"20W USB-C","category":"Cargadores","brand":"Apple","searchTerm":"Cargador Apple 20W USB-C","specs":[{"label":"Potencia","value":"20W"},{"label":"Puerto","value":"USB-C"},{"label":"Compatibilidad","value":"Smartphone / Tablet"},{"label":"Condición","value":"Nuevo"}]},{"id":"ipad-a16-128-wifi","name":"iPad A16 128GB Wi-Fi","model":"A16 / 128GB / Wi-Fi","category":"Tablets","brand":"Apple","searchTerm":"iPad A16 128GB Wi-Fi","specs":[{"label":"Pantalla","value":"11 pulgadas"},{"label":"Almacenamiento","value":"128GB"},{"label":"Conectividad","value":"Wi-Fi"},{"label":"Condición","value":"Nuevo"}]},{"id":"lenovo-ideapad-slim3-16-512","name":"Lenovo IdeaPad Slim 3 16GB 512GB","model":"IdeaPad Slim 3 / 16GB / 512GB","category":"Laptops","brand":"Lenovo","searchTerm":"Lenovo IdeaPad Slim 3 16GB 512GB","specs":[{"label":"Pantalla","value":"15.6 pulgadas"},{"label":"RAM","value":"16GB"},{"label":"Almacenamiento","value":"512GB SSD"},{"label":"Condición","value":"Nuevo"}]},{"id":"iphone-15-128","name":"iPhone 15 128GB","model":"iPhone 15 / 128GB","category":"Smartphones","brand":"Apple","searchTerm":"iPhone 15 128GB","specs":[{"label":"Pantalla","value":"6.1\" Super Retina XDR"},{"label":"Chip","value":"Apple A16"},{"label":"Almacenamiento","value":"128GB"},{"label":"Conectividad","value":"5G / USB-C"},{"label":"Condición","value":"Nuevo"}]},{"id":"galaxy-a55-256","name":"Samsung Galaxy A55 256GB","model":"Galaxy A55 / 8GB / 256GB","category":"Smartphones","brand":"Samsung","searchTerm":"Samsung Galaxy A55 256GB","specs":[{"label":"Pantalla","value":"6.6\" Super AMOLED 120Hz"},{"label":"Almacenamiento","value":"256GB"},{"label":"RAM","value":"8GB"},{"label":"Cámara","value":"50 MP"},{"label":"Condición","value":"Nuevo"}]},{"id":"airpods-pro-2","name":"AirPods Pro 2 USB-C","model":"AirPods Pro (2da gen) USB-C","category":"Audífonos","brand":"Apple","searchTerm":"AirPods Pro 2 USB-C","specs":[{"label":"Tipo","value":"In-ear ANC"},{"label":"Chip","value":"Apple H2"},{"label":"Carga","value":"USB-C / MagSafe"},{"label":"Autonomía","value":"Hasta 30 h (estuche)"},{"label":"Condición","value":"Nuevo"}]},{"id":"ps5-slim-disc","name":"PlayStation 5 Slim","model":"PS5 Slim con lectora","category":"Consolas","brand":"Sony","searchTerm":"PlayStation 5 Slim con lectora de discos","specs":[{"label":"Modelo","value":"Slim con lectora"},{"label":"Almacenamiento","value":"1TB SSD"},{"label":"Resolución","value":"Hasta 4K 120Hz"},{"label":"Mando","value":"DualSense"},{"label":"Condición","value":"Nuevo"}]}];
  const FALLBACK_COMPANIES = [
    { id: "falabella", name: "Falabella", color: "#7cb342", domain: "falabella.com.pe", searchUrl: "https://www.falabella.com.pe/falabella-pe/search?Ntt={q}" },
    { id: "oechsle", name: "Oechsle", color: "#e4002b", domain: "oechsle.pe", searchUrl: "https://www.oechsle.pe/search/?text={q}" },
    { id: "plazavea", name: "Plaza Vea", color: "#e30613", domain: "plazavea.com.pe", searchUrl: "https://www.plazavea.com.pe/search/?text={q}" },
    { id: "hiraoka", name: "Hiraoka", color: "#003a70", domain: "hiraoka.com.pe", searchUrl: "https://hiraoka.com.pe/catalogsearch/result/?q={q}" },
    { id: "ripley", name: "Ripley", color: "#a4127f", domain: "ripley.com.pe", searchUrl: "https://simple.ripley.com.pe/search/{q}" },
    { id: "lacuracao", name: "La Curacao", color: "#e2001a", domain: "lacuracao.pe", searchUrl: "https://www.lacuracao.pe/lacuracao-pe/search?Ntt={q}" }
  ];

  async function getJson(url, fallback) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error("http " + r.status);
      return await r.json();
    } catch (e) {
      return fallback;
    }
  }

  function buildSearchUrl(company, term) {
    return company.searchUrl.replace("{q}", encodeURIComponent(term));
  }

  function money(n) {
    if (n == null) return "Consultar";
    return "S/ " + Number(n).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function logoFor(company) {
    return company.domain ? "https://www.google.com/s2/favicons?domain=" + company.domain + "&sz=64" : null;
  }

  function storesFor(companies, references, product) {
    const term = product.searchTerm || product.name;
    return companies.map((c) => {
      const ref = (references || [])
        .filter((r) => r.productId === product.id && r.companyId === c.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      const searchUrl = buildSearchUrl(c, term);
      const logo = logoFor(c);
      if (ref) {
        const verified = !!ref.verified;
        // Si la referencia trae un enlace, lo usamos como ficha exacta del
        // producto (mejor que mandar al buscador de la tienda).
        const hasExactLink = !!ref.link;
        return { companyId: c.id, company: c.name, color: c.color, logo,
          price: ref.price != null ? ref.price : null,
          specialPrice: ref.specialPrice != null ? ref.specialPrice : null,
          link: hasExactLink ? ref.link : searchUrl, searchUrl, date: ref.date,
          status: ref.price != null ? "Validado" : "Búsqueda en tienda",
          note: ref.note || null, history: ref.history || [], estimate: ref.estimate || false, verified, hasExactLink };
      }
      return { companyId: c.id, company: c.name, color: c.color, logo, price: null, specialPrice: null,
        link: searchUrl, searchUrl, date: null, status: "Búsqueda en tienda", note: null, history: [], hasExactLink: false };
    });
  }

  function effective(s) {
    if (s.specialPrice != null) return s.specialPrice;
    if (s.price != null) return s.price;
    return null;
  }

  // El titular ("Comprar por S/X") usa el precio regular, igual que un comparador real.
  function bestStore(stores) {
    const priced = stores.filter((s) => s.price != null);
    if (!priced.length) {
      const sp = stores.filter((s) => s.specialPrice != null);
      if (!sp.length) return null;
      return sp.reduce((a, b) => (a.specialPrice <= b.specialPrice ? a : b));
    }
    return priced.reduce((a, b) => (a.price <= b.price ? a : b));
  }

  function sparkline(history, w, h) {
    if (!history || history.length < 2) return null;
    w = w || 220; h = h || 56;
    const vals = history.map((p) => p.price);
    const min = Math.min(...vals), max = Math.max(...vals);
    const span = max - min || 1;
    const stepX = w / (history.length - 1);
    const pts = history.map((p, i) => {
      const x = i * stepX;
      const y = h - 6 - ((p.price - min) / span) * (h - 12);
      return [x, y];
    });
    const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const area = line + ` L ${w} ${h} L 0 ${h} Z`;
    const last = pts[pts.length - 1];
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" style="display:block">
      <path d="${area}" fill="rgba(37,99,235,.10)"/>
      <path d="${line}" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3.5" fill="#2563eb"/>
    </svg>`;
  }

  function timeAgo(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days <= 0) return "hoy";
    if (days === 1) return "ayer";
    if (days < 7) return "hace " + days + " días";
    if (days < 30) return "hace " + Math.floor(days / 7) + " sem.";
    return "hace " + Math.floor(days / 30) + " mes(es)";
  }

  return {
    getProducts: () => getJson("/api/products", FALLBACK_PRODUCTS),
    getCompanies: () => getJson("/api/companies", FALLBACK_COMPANIES),
    getReferences: () => getJson("/api/references", []),
    searchOnline: (q) => getJson("/api/search-online?q=" + encodeURIComponent(q), { found: false, stores: [] }),
    productPrices: (id) => getJson("/api/product/" + id + "/prices", null),
    trackSearch: (q) => { try { fetch("/api/track-search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q }) }); } catch (e) {} },
    buildSearchUrl, money, storesFor, logoFor, effective, bestStore, sparkline, timeAgo,
    FALLBACK_PRODUCTS, FALLBACK_COMPANIES,
    esc: (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m])),
  };
})();
