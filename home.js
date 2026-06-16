/* TECO - Home (inicio por categorías, productos en línea) */
(async function () {
  const search = document.getElementById("hero-search");
  search.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = document.getElementById("hero-q").value.trim();
    location.href = "buscador-online.html" + (q ? "?q=" + encodeURIComponent(q) : "");
  });

  const [products, companies, refs] = await Promise.all([
    CN.getProducts(), CN.getCompanies(), CN.getReferences(),
  ]);

  // Métricas
  const tp = document.getElementById("t-products"); if (tp) tp.textContent = products.length + "+";
  const ts = document.getElementById("t-stores"); if (ts) ts.textContent = companies.length;

  // Logos de tiendas en el hero (prueba social)
  const hs = document.getElementById("hero-stores");
  if (hs) hs.innerHTML = `<span class="lbl">Comparando precios en</span>` +
    companies.map((c) => CN.logoFor(c) ? `<img class="hero-store" src="${CN.logoFor(c)}" alt="${CN.esc(c.name)}" title="${CN.esc(c.name)}">` : "").join("");

  // Chips de búsqueda rápida
  const chips = document.getElementById("quick-chips");
  ["iPhone 16 128GB", "Galaxy S24 Ultra", "MacBook Air M3", "PlayStation 5", "AirPods Pro 2"].forEach((q) => {
    const c = document.createElement("button");
    c.className = "chip"; c.type = "button"; c.textContent = q;
    c.addEventListener("click", () => location.href = "buscador-online.html?q=" + encodeURIComponent(q));
    chips.appendChild(c);
  });

  // Categorías = protagonista. Al tocar una, sus productos se despliegan abajo.
  const counts = {};
  products.forEach((p) => { counts[p.category] = (counts[p.category] || 0) + 1; });
  const tiles = document.getElementById("cat-tiles");
  const panel = document.getElementById("cat-products");
  const MAX = 12;

  let current = null;
  function showCategory(cat) {
    // Tocar la misma categoría la cierra.
    if (current === cat) {
      current = null;
      panel.innerHTML = "";
      tiles.querySelectorAll(".cat-tile").forEach((t) => t.classList.remove("active"));
      return;
    }
    current = cat;
    tiles.querySelectorAll(".cat-tile").forEach((t) => t.classList.toggle("active", t.dataset.cat === cat));
    const list = products.filter((p) => p.category === cat);
    const shown = list.slice(0, MAX);
    const verTodos = `<a class="btn btn-ghost btn-sm" href="productos.html?cat=${encodeURIComponent(cat)}">Ver todos y filtrar</a>`;
    panel.innerHTML = `
      <div class="section-head" style="margin-top:30px;margin-bottom:14px">
        <div><h3 style="margin:0">${CN.esc(cat)} <span class="muted" style="font-weight:400">· ${list.length} productos</span></h3></div>
        ${verTodos}
      </div>
      <div class="prow-list">${shown.map((p) => CNCards.row(p, CN.storesFor(companies, refs, p))).join("")}</div>
      ${list.length > MAX ? `<div class="center" style="margin-top:16px"><a class="btn btn-ghost" href="productos.html?cat=${encodeURIComponent(cat)}">Ver los ${list.length} de ${CN.esc(cat)} →</a></div>` : ""}`;
    CNCards.initFavorites(panel);
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (tiles) {
    tiles.innerHTML = Object.keys(counts).map((c) => `
      <a class="cat-tile" href="productos.html?cat=${encodeURIComponent(c)}" data-cat="${CN.esc(c)}">
        <span class="cat-tile-ic">${CNCards.icon(c)}</span>
        <span class="cat-tile-name">${CN.esc(c)}</span>
        <span class="cat-tile-count">${counts[c]} ${counts[c] === 1 ? "producto" : "productos"}</span>
      </a>`).join("");
    tiles.querySelectorAll(".cat-tile").forEach((t) => t.addEventListener("click", (e) => {
      e.preventDefault();
      showCategory(t.dataset.cat);
    }));
  }
})();
