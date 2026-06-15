/* TECO - Comparador */
(function () {
  const form = document.getElementById("cmp-search");
  const input = document.getElementById("cmp-q");
  const result = document.getElementById("result");

  const params = new URLSearchParams(location.search);
  const initial = params.get("q") || "";
  if (initial) { input.value = initial; run(initial); }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    history.replaceState(null, "", "buscador-online.html" + (q ? "?q=" + encodeURIComponent(q) : ""));
    run(q);
  });

  async function run(q) {
    if (!q) { result.innerHTML = ""; return; }
    result.innerHTML = `<div class="empty">Buscando “${CN.esc(q)}”…</div>`;
    const data = await CN.searchOnline(q);
    if (!data.found || !data.product) {
      // Aunque no esté en el catálogo, damos un camino de compra: la búsqueda
      // del término en cada tienda. Y registramos el término para saber qué
      // productos pedir/agregar (catálogo guiado por demanda real).
      const companies = await CN.getCompanies();
      if (CN.trackSearch) CN.trackSearch(q);
      const links = companies.map((c) => {
        const logo = CN.logoFor(c);
        return `<a class="store-search-link" target="_blank" rel="noopener" href="${CN.buildSearchUrl(c, q)}">
          ${logo ? `<img src="${logo}" alt="">` : `<span class="dot" style="background:${c.color}"></span>`}
          <span>Buscar en ${CN.esc(c.name)}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 7l10 10M17 17H9M17 17V9"/></svg>
        </a>`;
      }).join("");
      result.innerHTML = `
        <div class="empty">
          <h3>“${CN.esc(q)}” no está aún en nuestro catálogo</h3>
          <p>Pero puedes buscarlo directo en cada tienda mientras lo agregamos:</p>
        </div>
        <div class="store-search-grid">${links}</div>
        <p class="muted" style="text-align:center;margin-top:18px"><a href="productos.html">Ver productos disponibles</a></p>`;
      return;
    }
    CNCompare.render(result, data.product, data.stores, { showSpecs: true });
  }
})();
