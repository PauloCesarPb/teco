/* TECO - Productos con filtros */
(async function () {
  const _list = document.getElementById("list"); if (_list) _list.innerHTML = CNCards.skeletons(8);
  const [products, companies, refs] = await Promise.all([
    CN.getProducts(), CN.getCompanies(), CN.getReferences(),
  ]);
  const $ = (id) => document.getElementById(id);
  const list = $("list"), filter = $("filter"), sort = $("sort"), count = $("count");
  const fCats = $("f-cats"), fBrands = $("f-brands"), pmin = $("pmin"), pmax = $("pmax");

  const cats = [...new Set(products.map((p) => p.category))];
  const brands = [...new Set(products.map((p) => p.brand))].sort();

  // Mejor precio por producto (para ordenar/filtrar)
  const bestPrice = {};
  products.forEach((p) => {
    const b = CN.bestStore(CN.storesFor(companies, refs, p));
    bestPrice[p.id] = b && b.price != null ? b.price : (b && b.specialPrice != null ? b.specialPrice : Infinity);
  });

  let state = { cat: "", brands: new Set(), q: "" };
  const params = new URLSearchParams(location.search);
  if (params.get("cat") && cats.includes(params.get("cat"))) state.cat = params.get("cat");
  if (params.get("q")) { state.q = params.get("q"); filter.value = params.get("q"); }

  // Render categorías (single-select)
  function renderCats() {
    fCats.innerHTML = `<button class="filter-chip ${!state.cat ? "active" : ""}" data-cat="">Todas</button>` +
      cats.map((c) => `<button class="filter-chip ${state.cat === c ? "active" : ""}" data-cat="${CN.esc(c)}">${CN.esc(c)}</button>`).join("");
    fCats.querySelectorAll(".filter-chip").forEach((b) => b.addEventListener("click", () => {
      state.cat = b.dataset.cat; renderCats(); render();
    }));
  }
  // Render marcas (multi-select)
  fBrands.innerHTML = brands.map((b) => `
    <label class="check"><input type="checkbox" value="${CN.esc(b)}"> ${CN.esc(b)}</label>`).join("");
  fBrands.querySelectorAll("input").forEach((c) => c.addEventListener("change", () => {
    c.checked ? state.brands.add(c.value) : state.brands.delete(c.value); render();
  }));
  renderCats();

  function passes(p) {
    if (state.cat && p.category !== state.cat) return false;
    if (state.brands.size && !state.brands.has(p.brand)) return false;
    if (state.q && !(p.name + " " + p.brand + " " + p.model).toLowerCase().includes(state.q.toLowerCase())) return false;
    const lo = parseFloat(pmin.value), hi = parseFloat(pmax.value);
    if (!isNaN(lo) || !isNaN(hi)) {
      const bp = bestPrice[p.id];
      if (bp === Infinity) return false;
      if (!isNaN(lo) && bp < lo) return false;
      if (!isNaN(hi) && bp > hi) return false;
    }
    return true;
  }

  function render() {
    let out = products.filter(passes);
    const s = sort.value;
    if (s === "price-asc") out.sort((a, b) => bestPrice[a.id] - bestPrice[b.id]);
    else if (s === "price-desc") out.sort((a, b) => (bestPrice[b.id] === Infinity ? -1 : bestPrice[b.id]) - (bestPrice[a.id] === Infinity ? -1 : bestPrice[a.id]));
    else if (s === "name") out.sort((a, b) => a.name.localeCompare(b.name));
    else out.sort((a, b) => (bestPrice[a.id] === Infinity) - (bestPrice[b.id] === Infinity)); // con precio primero

    count.textContent = out.length + (out.length === 1 ? " producto" : " productos");
    list.innerHTML = out.length
      ? out.map((p) => CNCards.row(p, CN.storesFor(companies, refs, p))).join("")
      : `<div class="empty">No hay productos con esos filtros.</div>`;
    CNCards.initFavorites(list);
  }

  filter.addEventListener("input", () => { state.q = filter.value; render(); });
  sort.addEventListener("change", render);
  [pmin, pmax].forEach((el) => el.addEventListener("input", render));
  $("clear").addEventListener("click", () => {
    state = { cat: "", brands: new Set(), q: "" };
    filter.value = ""; pmin.value = ""; pmax.value = "";
    fBrands.querySelectorAll("input").forEach((c) => (c.checked = false));
    renderCats(); render();
  });
  $("filters-toggle").addEventListener("click", () => $("filters").classList.add("open"));
  $("filters-close").addEventListener("click", () => $("filters").classList.remove("open"));

  render();
})();
