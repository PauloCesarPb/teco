/* TECO - Vista de comparación (estilo tienda) */
window.CNCompare = {
  render(container, product, stores, opts) {
    opts = opts || {};
    const best = CN.bestStore(stores);
    const brand = (product.brand || "").toUpperCase();

    // --- Panel de compra (sidebar) ---
    let buyCard;
    if (best) {
      const headline = best.price != null ? best.price : best.specialPrice;
      const link = best.link;
      const label = best.hasExactLink ? "Comprar por " + CN.money(headline) : "Ver por " + CN.money(headline);
      buyCard = `
        <div class="buy-card">
          ${product.image ? `<div class="buy-img"><img src="${CN.esc(product.image)}" alt="${CN.esc(product.name)}" loading="lazy" decoding="async"></div>` : ""}
          ${brand ? `<div class="brand-up">${CN.esc(brand)}</div>` : ""}
          <div class="buy-name">${CN.esc(product.name)}</div>
          <div class="best-line">↘ Mejor precio en <b>${CN.esc(best.company)}</b> ${best.logo ? `<img class="store-logo sm" src="${best.logo}" alt="">` : ""}</div>
          ${best.date && CN.timeAgo(best.date) ? `<div class="buy-fresh">🕒 Precio actualizado ${CN.timeAgo(best.date)}</div>` : ""}
          <a class="btn-buy" href="${link}" target="_blank" rel="noopener">${label}</a>
          <div class="buy-sub">Precio referencial. Confirma el precio final en la tienda antes de comprar.</div>
          <div class="buy-info">
            <span class="buy-info-icon">📊</span>
            <div><b>Compara antes de comprar.</b> Revisa el precio en todas las tiendas y el historial más abajo.</div>
          </div>
        </div>`;
    } else {
      buyCard = `
        <div class="buy-card">
          ${brand ? `<div class="brand-up">${CN.esc(brand)}</div>` : ""}
          <div class="buy-name">${CN.esc(product.name)}</div>
          <div class="best-line muted">Aún sin precio validado</div>
          <a class="btn-buy ghost" href="${stores[0] ? stores[0].searchUrl : "#"}" target="_blank" rel="noopener">Ver opciones en tiendas</a>
          <div class="buy-sub">Todavía no validamos un precio exacto. Abre cada tienda para consultarlo.</div>
        </div>`;
    }

    // --- Tabla de tiendas ---
    const rows = stores.map((s) => {
      const isBest = best && s.companyId === best.companyId;
      const priceTxt = s.price != null ? CN.money(s.price) + (s.estimate ? ' <span class="ref-tag" title="Precio referencial, por validar">ref.</span>' : '') : "Consultar";
      const specialTxt = s.specialPrice != null ? CN.money(s.specialPrice) : "—";
      const btnLabel = s.hasExactLink ? "Ver producto" : "Ver precio";
      return `
        <tr class="${isBest ? "cmp-row-best" : ""}">
          <td class="store-cell">
            ${s.logo ? `<img class="store-logo" src="${s.logo}" alt="">` : `<span class="store-logo dot" style="background:${s.color}"></span>`}
            <span>${CN.esc(s.company)}${isBest ? ` <span class="tag-best">Mejor</span>` : ""}</span>
          </td>
          <td class="price-cell ${s.price != null ? "" : "muted"}">${priceTxt}</td>
          <td class="special-cell ${s.specialPrice != null ? "is-special" : "muted"}">${specialTxt}</td>
          <td class="action-cell"><a class="btn btn-ghost btn-sm" href="${s.link}" target="_blank" rel="noopener">${btnLabel}</a></td>
        </tr>`;
    }).join("");

    // --- Historial ---
    const withHist = stores.filter((s) => (s.history || []).length >= 2).sort((a, b) => CN.effective(a) - CN.effective(b))[0];
    const chart = withHist ? CN.sparkline(withHist.history, 480, 90) : null;
    const historyBlock = `
      <div class="cmp-history">
        <div class="hist-head"><h3>Historial de precios</h3><span class="pill">${withHist ? "Mostrar en: 90 días" : "Sin datos aún"}</span></div>
        ${chart
          ? `<div class="hist-chart">${chart}<div class="hist-foot"><span>${CN.esc(withHist.company)}</span><span>${CN.money(Math.min(...withHist.history.map(p=>p.price)))} – ${CN.money(Math.max(...withHist.history.map(p=>p.price)))}</span></div></div>`
          : `<div class="hist-empty">Estamos registrando el historial. Aparecerá un gráfico cuando haya al menos dos lecturas de precio.</div>`}
      </div>`;

    // --- Specs (opcional) ---
    const specsBlock = opts.showSpecs && product.specs ? `
      <div class="cmp-specs">
        <h3>Características</h3>
        <ul class="specs">${product.specs.map((x) => `<li><span>${CN.esc(x.label)}</span><span>${CN.esc(x.value)}</span></li>`).join("")}</ul>
      </div>` : "";

    // --- Ofertas de proveedores (opcional) ---
    const offers = opts.offers || [];
    const offersBlock = opts.offers ? `
      <div class="cmp-offers">
        <h3>Ofertas de proveedores afiliados</h3>
        ${offers.length ? offers.map((o) => `
          <div class="store-row">
            <div><div class="s-name">${CN.esc(o.proveedor)}</div><div class="s-meta">${o.garantia ? "Garantía: " + CN.esc(o.garantia) + " · " : ""}${o.delivery ? "Delivery: " + CN.esc(o.delivery) : ""}</div></div>
            <div class="${o.price ? "s-price" : "s-price consult"}">${o.price ? CN.money(o.price) : "Consultar"}</div>
            ${o.whatsapp ? `<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://wa.me/${encodeURIComponent(String(o.whatsapp).replace(/\D/g,''))}">WhatsApp</a>` : `<span class="pill">Sin contacto</span>`}
          </div>`).join("") : `<p class="muted">Aún no hay ofertas de proveedores para este producto.</p>`}
      </div>` : "";

    container.innerHTML = `
      <div class="cmp">
        <div class="cmp-main">
          <h3 class="cmp-title">Otras opciones</h3>
          <div class="table-wrap cmp-table-wrap">
            <table class="cmp-table">
              <thead><tr><th>Tienda</th><th>Precio</th><th>Precio especial</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          ${historyBlock}
          ${specsBlock}
          ${offersBlock}
          <p class="muted cmp-disclaimer">Los precios son referenciales y se actualizan periódicamente; el stock puede cambiar en la tienda. Los marcados “ref.” son precios de referencia del mercado, por confirmar al validar. Si una tienda no lista este producto verás “Consultar”, y el botón abre su buscador. No comparamos accesorios, usados ni reacondicionados frente a un equipo nuevo.</p>
        </div>
        <aside class="cmp-side">${buyCard}</aside>
      </div>`;
  },
};
