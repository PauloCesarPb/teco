/* TECO - Admin */
(async function () {
  const products = await CN.getProducts();
  const companies = await CN.getCompanies();
  const nameP = (id) => (products.find((p) => p.id === id) || {}).name || id;
  const nameC = (id) => (companies.find((c) => c.id === id) || {}).name || id;

  async function jget(url, fb) { try { return await (await fetch(url)).json(); } catch (e) { return fb; } }

  // Proveedores
  async function loadProviders() {
    let provs = [];
    try { provs = await (await CNAuth.fetch("/api/providers")).json(); } catch (e) { return; }
    const tb = document.querySelector("#prov-table tbody");
    tb.innerHTML = provs.length ? provs.map((p) => `
      <tr>
        <td>${CN.esc(p.nombre)}<br><span class="muted" style="font-size:.8rem">${CN.esc(p.ruc || "")}</span></td>
        <td>${CN.esc(p.contacto || "")}<br><span class="muted" style="font-size:.8rem">${CN.esc(p.correo || "")}${p.whatsapp ? " · " + CN.esc(p.whatsapp) : ""}</span></td>
        <td>${CN.esc(p.categoria || "-")}</td>
        <td>${badge(p.estado)}</td>
        <td>
          <button class="btn btn-primary btn-sm" data-act="approve" data-id="${p.id}">Aprobar</button>
          <button class="btn btn-ghost btn-sm" data-act="reject" data-id="${p.id}">Rechazar</button>
        </td>
      </tr>`).join("") : `<tr><td colspan="5" class="muted" style="text-align:center;padding:20px">Sin solicitudes.</td></tr>`;
    tb.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", async () => {
      await CNAuth.fetch(`/api/providers/${b.dataset.id}/${b.dataset.act}`, { method: "POST" });
      loadProviders();
    }));
  }

  // Ofertas
  async function loadOffers() {
    const offers = await jget("/api/offers", []);
    const tb = document.querySelector("#off-table tbody");
    tb.innerHTML = offers.length ? offers.map((o) => `
      <tr>
        <td>${CN.esc(nameP(o.productId))}</td>
        <td>${CN.esc(o.proveedor || "")}</td>
        <td>${o.price ? CN.money(o.price) : "Consultar"}</td>
        <td>${o.activo ? `<span class="badge badge-green">Activa</span>` : `<span class="badge badge-amber">Inactiva</span>`}</td>
        <td><button class="btn btn-ghost btn-sm" data-off="${o.id}">${o.activo ? "Desactivar" : "Activar"}</button></td>
      </tr>`).join("") : `<tr><td colspan="5" class="muted" style="text-align:center;padding:20px">Sin ofertas.</td></tr>`;
    tb.querySelectorAll("[data-off]").forEach((b) => b.addEventListener("click", async () => {
      const all = await jget("/api/offers", []);
      const o = all.find((x) => x.id === b.dataset.off); if (!o) return;
      o.activo = !o.activo;
      await CNAuth.fetch("/api/offers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(o) });
      loadOffers();
    }));
  }

  // Referencias
  async function loadRefs() {
    const refs = await jget("/api/references", []);
    const tb = document.querySelector("#ref-table tbody");
    tb.innerHTML = refs.length ? refs.map((r) => `
      <tr><td>${CN.esc(nameP(r.productId))}</td><td>${CN.esc(nameC(r.companyId))}</td>
      <td>${r.price ? CN.money(r.price) : "Consultar"}</td><td>${badge(r.status)}</td><td>${CN.esc(r.date || "-")}</td></tr>`).join("")
      : `<tr><td colspan="5" class="muted" style="text-align:center;padding:20px">Aún no hay referencias guardadas.</td></tr>`;
  }

  // Búsquedas sin resultado (demanda real para crecer el catálogo)
  async function loadSearches() {
    let list = [];
    try { list = await (await CNAuth.fetch("/api/searches")).json(); } catch (e) { return; }
    const tb = document.querySelector("#search-table tbody");
    if (!tb) return;
    tb.innerHTML = list.length ? list.map((s) => `
      <tr>
        <td><b>${CN.esc(s.term)}</b></td>
        <td>${s.count}</td>
        <td><span class="muted">${CN.esc(s.lastDate || "-")}</span></td>
        <td>
          <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://www.google.com/search?q=${encodeURIComponent(s.term)}">Buscar</a>
          <a class="btn btn-primary btn-sm" href="importar.html">Agregar</a>
        </td>
      </tr>`).join("") : `<tr><td colspan="4" class="muted" style="text-align:center;padding:20px">Aún no hay búsquedas registradas.</td></tr>`;
  }

  function badge(s) {
    if (s === "Aprobado" || s === "Validado") return `<span class="badge badge-green">${s}</span>`;
    if (s === "Rechazado") return `<span class="badge" style="background:#fdecec;color:#c0392b">${s}</span>`;
    return `<span class="badge badge-amber">${s || "Pendiente"}</span>`;
  }

  // Dashboard de estadísticas (clientes, proveedores, ventas, ganancias, contactos)
  async function loadStats() {
    let s; try { s = await (await CNAuth.fetch("/api/admin/stats")).json(); } catch (e) { return; }
    const kpis = document.getElementById("kpis");
    if (kpis) kpis.innerHTML = [
      ["Ganancias del mes", CN.money(s.ganancia), "money"],
      ["Ventas referidas", s.ventas, ""],
      ["Clientes registrados", s.clientes, ""],
      ["Proveedores afiliados", s.proveedores, ""],
      ["Ofertas activas", s.ofertasActivas, ""],
      ["Contactos generados", (s.contactosTotal || 0).toLocaleString("es-PE"), ""],
    ].map(([l, v, c]) => `<div class="kpi ${c}"><div class="kpi-v">${v}</div><div class="kpi-l">${CN.esc(l)}</div></div>`).join("");

    const ot = document.querySelector("#dash-offers tbody");
    if (ot) ot.innerHTML = (s.ofertas || []).slice(0, 12).map((o) => `
      <tr><td>${CN.esc(o.producto)}</td><td>${CN.esc(o.proveedor)}</td><td>${o.price != null ? CN.money(o.price) : "—"}</td><td>${CN.esc(o.stock || "-")}</td><td><b>${o.contactos}</b></td></tr>`).join("")
      || `<tr><td colspan="5" class="muted" style="text-align:center;padding:18px">Sin ofertas.</td></tr>`;

    const hist = document.getElementById("histograma");
    if (hist) {
      const max = Math.max(1, ...(s.porProveedor || []).map((p) => p.contactos));
      hist.innerHTML = (s.porProveedor || []).map((p) => `
        <div class="bar-row">
          <div class="bar-head"><span>${CN.esc(p.proveedor)}</span><span>${p.contactos} contactos</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.round(p.contactos / max * 100)}%"></div></div>
        </div>`).join("") || `<p class="muted">Sin datos.</p>`;
    }

    const st = document.querySelector("#sales-table tbody");
    if (st) st.innerHTML = (s.ultimasVentas || []).map((v) => `
      <tr><td>${CN.esc(v.fecha)}</td><td>${CN.esc(v.producto)}</td><td>${CN.esc(v.comprador)}</td><td>${CN.esc(v.vendedor)}</td><td>${CN.money(v.monto)}</td><td style="color:#16a34a;font-weight:700">${CN.money(v.comision)}</td></tr>`).join("")
      || `<tr><td colspan="6" class="muted" style="text-align:center;padding:18px">Sin ventas.</td></tr>`;
  }

  // Estado de la actualización automática de feeds
  async function loadFeedStatus() {
    const box = document.getElementById("feed-status");
    if (!box) return;
    let st = null;
    try { st = await (await CNAuth.fetch("/api/feed-status")).json(); } catch (e) { return; }
    if (!st || !st.lastRun) {
      box.innerHTML = `<span class="pill">Feeds: aún sin corridas. Se ejecutan solas cada ${st && st.intervalHours ? st.intervalHours : 6} h con el servidor encendido.</span>`;
      return;
    }
    const r = st.result || {};
    const resumen = r.skipped ? "sin feeds configurados" :
      r.error ? "error: " + r.error :
      `${r.actualizados || 0} actualizados, ${r.nuevos || 0} nuevos`;
    box.innerHTML = `<span class="pill">Última actualización: ${CN.timeAgo(st.lastRun) || st.lastRun.slice(0, 10)} (${CN.esc(resumen)})${st.nextRun ? " · próxima: " + new Date(st.nextRun).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }) : ""}</span>`;
  }

  // Botón: actualizar precios desde los feeds configurados
  const refreshBtn = document.getElementById("refresh-feeds");
  const refreshMsg = document.getElementById("refresh-msg");
  if (refreshBtn) refreshBtn.addEventListener("click", async () => {
    refreshBtn.disabled = true;
    refreshMsg.innerHTML = `<div class="notice notice-info">Actualizando desde feeds…</div>`;
    try {
      const d = await (await CNAuth.fetch("/api/refresh-feeds", { method: "POST" })).json();
      if (d.skipped) {
        refreshMsg.innerHTML = `<div class="notice notice-info">${CN.esc(d.msg || "Sin feeds configurados todavía.")}</div>`;
      } else {
        refreshMsg.innerHTML = `<div class="notice notice-ok">Listo: ${d.nuevos || 0} nuevos, ${d.actualizados || 0} actualizados, ${d.conPrecio || 0} con precio. Total: ${d.total || "—"}.</div>`;
        loadRefs(); loadFeedStatus();
      }
    } catch (e) {
      refreshMsg.innerHTML = `<div class="notice notice-err">No se pudo actualizar: ${CN.esc(e.message)}</div>`;
    } finally {
      refreshBtn.disabled = false;
    }
  });

  loadStats(); loadFeedStatus(); loadSearches(); loadProviders(); loadOffers(); loadRefs();
})();
