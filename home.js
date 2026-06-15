/* TECO - Home */
(async function () {
  const search = document.getElementById("hero-search");
  search.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = document.getElementById("hero-q").value.trim();
    location.href = "buscador-online.html" + (q ? "?q=" + encodeURIComponent(q) : "");
  });

  // Esqueletos mientras carga
  const grid = document.getElementById("featured");
  if (grid) grid.innerHTML = CNCards.skeletons(8);

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

  // Tiles de categoría
  const counts = {};
  products.forEach((p) => { counts[p.category] = (counts[p.category] || 0) + 1; });
  const tiles = document.getElementById("cat-tiles");
  if (tiles) tiles.innerHTML = Object.keys(counts).map((c) => `
    <a class="cat-tile" href="productos.html?cat=${encodeURIComponent(c)}">
      <span class="cat-tile-ic">${CNCards.icon(c)}</span>
      <span class="cat-tile-name">${CN.esc(c)}</span>
      <span class="cat-tile-count">${counts[c]} ${counts[c] === 1 ? "producto" : "productos"}</span>
    </a>`).join("");

  // Destacados (con precio comparado primero)
  const withBest = products.map((p) => ({ p, b: CN.bestStore(CN.storesFor(companies, refs, p)) }));
  const priced = withBest.filter((x) => x.b && x.b.price != null).map((x) => x.p);
  const featuredList = (priced.length ? priced : products).slice(0, 8);
  grid.innerHTML = featuredList.map((p) => CNCards.card(p, CN.storesFor(companies, refs, p))).join("");
  CNCards.initFavorites(grid);
})();
