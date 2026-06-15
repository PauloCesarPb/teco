/* TECO - Tarjetas de producto */
window.CNCards = (function () {
  const ICONS = {
    Smartphones: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="7" y="2" width="10" height="20" rx="2.5"/><line x1="11" y1="18" x2="13" y2="18"/></svg>',
    Tablets: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="3" width="16" height="18" rx="2.5"/><line x1="11" y1="18" x2="13" y2="18"/></svg>',
    Laptops: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20l-1.5-2h-17z"/></svg>',
    "Audífonos": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 13v-1a8 8 0 0 1 16 0v1"/><rect x="3" y="13" width="4" height="7" rx="1.5"/><rect x="17" y="13" width="4" height="7" rx="1.5"/></svg>',
    Wearables: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 6V3h6v3M9 18v3h6v-3"/></svg>',
    Consolas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="10" rx="5"/><line x1="7" y1="11" x2="7" y2="13"/><line x1="6" y1="12" x2="8" y2="12"/><circle cx="16.5" cy="11.5" r="1"/><circle cx="18.5" cy="13.5" r="1"/></svg>',
    Televisores: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    Accesorios: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="7" width="16" height="10" rx="2"/><line x1="21" y1="10" x2="21" y2="14"/><line x1="7" y1="12" x2="11" y2="12"/></svg>',
    Cargadores: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 2v5M15 2v5"/><rect x="7" y="7" width="10" height="6" rx="2"/><path d="M12 13v5"/></svg>',
  };
  const HEART = '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7" fill="none"><path d="M12 20s-7-4.35-9.5-8.5C1 8.5 2.5 5.5 5.5 5.5c1.9 0 3.1 1.1 3.9 2.2.8-1.1 2-2.2 3.9-2.2 3 0 4.5 3 3 6C19 15.65 12 20 12 20z"/></svg>';

  function icon(cat) { return ICONS[cat] || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>'; }

  function card(product, stores) {
    const best = CN.bestStore(stores);
    const count = stores.length;
    const brand = (product.brand || "").toUpperCase();
    const img = product.image
      ? `<img src="${CN.esc(product.image)}" alt="${CN.esc(product.name)}" loading="lazy" decoding="async">`
      : icon(product.category);

    let priceHtml, badge = "", bestLine, buyLink, buyAttrs;
    if (best && (best.price != null || best.specialPrice != null)) {
      const headline = best.price != null ? best.price : best.specialPrice;
      priceHtml = `<div class="pcard-price">${CN.money(headline)}${best.estimate ? ' <span class="ref-tag">ref.</span>' : ''}</div>`;
      if (best.specialPrice != null && best.price != null && best.specialPrice < best.price) {
        const off = Math.round((1 - best.specialPrice / best.price) * 100);
        badge = `<span class="pcard-badge">−${off}% con tarjeta</span>`;
      }
      const logo = best.logo
        ? `<img class="pcard-logo" src="${best.logo}" alt="${CN.esc(best.company)}">`
        : `<span class="pcard-logo dot" style="background:${best.color}"></span>`;
      bestLine = `<div class="pcard-best"><svg class="arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 7l10 10M17 17H9M17 17V9"/></svg> Mejor precio en ${logo}</div>`;
      buyLink = best.link; buyAttrs = ' target="_blank" rel="noopener"';
    } else {
      priceHtml = `<div class="pcard-price muted">Consultar</div>`;
      bestLine = `<div class="pcard-best muted">Compara en ${count} tiendas</div>`;
      buyLink = "detalle.html?id=" + encodeURIComponent(product.id); buyAttrs = "";
    }

    return `
    <article class="pcard">
      ${badge}
      <button class="fav" aria-label="Guardar" data-fav="${CN.esc(product.id)}">${HEART}</button>
      <a class="pcard-imglink" href="detalle.html?id=${encodeURIComponent(product.id)}"><div class="pcard-img">${img}</div></a>
      <div class="pcard-brand">${CN.esc(brand)}</div>
      <a class="pcard-name" href="detalle.html?id=${encodeURIComponent(product.id)}">${CN.esc(product.name)}</a>
      ${priceHtml}
      ${bestLine}
      <a class="pcard-btn" href="detalle.html?id=${encodeURIComponent(product.id)}">Ver precios en ${count} tiendas</a>
      <a class="pcard-buy" href="${buyLink}"${buyAttrs}>Comprar en tienda</a>
    </article>`;
  }

  function initFavorites(root) {
    const get = () => JSON.parse(localStorage.getItem("cn_favs") || "[]");
    const favs = get();
    root.querySelectorAll(".fav").forEach((btn) => {
      const id = btn.dataset.fav;
      if (favs.includes(id)) btn.classList.add("saved");
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        let f = get();
        if (f.includes(id)) { f = f.filter((x) => x !== id); btn.classList.remove("saved"); }
        else { f.push(id); btn.classList.add("saved"); }
        localStorage.setItem("cn_favs", JSON.stringify(f));
      });
    });
  }

  function skeletons(n){let h='';for(let i=0;i<(n||8);i++)h+='<div class=\"skcard\"><div class=\"sk l1\"></div><div class=\"sk l2\"></div><div class=\"sk l3\"></div><div class=\"sk l4\"></div><div class=\"sk l5\"></div></div>';return h;}
  return { card, initFavorites, icon, skeletons };
})();
