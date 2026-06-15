/* TECO - Validar precios */
(async function () {
  const products = await CN.getProducts();
  const sel = document.getElementById("prod");
  products.forEach((p) => { const o = document.createElement("option"); o.value = p.id; o.textContent = p.name; sel.appendChild(o); });

  const out = document.getElementById("out");
  document.getElementById("run").addEventListener("click", async () => {
    const id = sel.value;
    out.innerHTML = `<div class="empty">Actualizando precios… esto puede tardar unos segundos.</div>`;
    try {
      const r = await CNAuth.fetch("/api/validate-prices/" + id, { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error");
      render(data.results);
    } catch (err) {
      out.innerHTML = `<div class="notice notice-err">No se pudo actualizar. Verifica que el servidor esté activo.</div>`;
    }
  });

  function render(results) {
    out.innerHTML = (results || []).map((s) => {
      const ok = s.status === "Validado" && s.price != null;
      return `
      <div class="store-row">
        <div>
          <div class="s-name">${CN.esc(s.company)}</div>
          <div class="s-meta">${ok ? `<span class="badge badge-green">Validado</span>` : `<span class="badge badge-amber">Consultar</span>`} ${s.note ? "· " + CN.esc(s.note) : ""}</div>
        </div>
        <div class="${ok ? "s-price" : "s-price consult"}">${ok ? CN.money(s.price) : "Consultar"}</div>
        <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="${s.link}">Abrir</a>
      </div>`;
    }).join("") + `<p class="muted" style="font-size:.82rem;margin-top:8px">Solo se guardan los precios validados. Si una tienda bloquea la lectura, edita el precio manualmente.</p>`;
  }
})();
