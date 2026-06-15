/* TECO - Detalle */
(async function () {
  const el = document.getElementById("detail");
  const id = new URLSearchParams(location.search).get("id");
  if (!id) { el.innerHTML = `<div class="empty">Producto no especificado. <a href="productos.html">Ver productos</a></div>`; return; }

  const [allProducts, companies, refs] = await Promise.all([
    CN.getProducts(), CN.getCompanies(), CN.getReferences(),
  ]);

  const data = await CN.productPrices(id);
  let product, stores;
  if (data && data.product) { product = data.product; stores = data.stores; }
  else {
    product = allProducts.find((p) => p.id === id);
    if (!product) { el.innerHTML = `<div class="empty">Producto no encontrado.</div>`; return; }
    stores = CN.storesFor(companies, refs, product);
  }

  let offers = [];
  try { offers = (await (await fetch("/api/offers")).json()).filter((o) => o.productId === id && o.activo); } catch (e) {}

  el.innerHTML = `
    <nav class="crumbs">
      <a href="index.html">Inicio</a> ›
      <a href="productos.html?cat=${encodeURIComponent(product.category)}">${CN.esc(product.category)}</a> ›
      <span>${CN.esc(product.name)}</span>
    </nav>`;
  const wrap = document.createElement("div");
  el.appendChild(wrap);
  CNCompare.render(wrap, product, stores, { showSpecs: true, offers });

  // Relacionados (misma categoría)
  const related = allProducts.filter((p) => p.category === product.category && p.id !== id).slice(0, 4);
  if (related.length) {
    const sec = document.createElement("section");
    sec.className = "related";
    sec.innerHTML = `<h3>Productos relacionados</h3><div class="grid grid-products" id="rel-grid"></div>`;
    el.appendChild(sec);
    const rg = sec.querySelector("#rel-grid");
    rg.innerHTML = related.map((p) => CNCards.card(p, CN.storesFor(companies, refs, p))).join("");
    CNCards.initFavorites(rg);
  }
})();
