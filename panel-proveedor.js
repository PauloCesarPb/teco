/* TECO - Panel de proveedor */
(async function () {
  const products = await CN.getProducts();
  const sel = document.getElementById("o-prod");
  products.forEach((p) => { const o = document.createElement("option"); o.value = p.id; o.textContent = p.name; sel.appendChild(o); });

  const tbody = document.querySelector("#offers-table tbody");
  const form = document.getElementById("offer-form");
  const msg = document.getElementById("offer-msg");
  const nameOf = (id) => (products.find((p) => p.id === id) || {}).name || id;

  async function load() {
    let offers = [];
    try { offers = await (await fetch("/api/offers")).json(); } catch (e) {}
    tbody.innerHTML = offers.length ? offers.map((o) => `
      <tr>
        <td>${CN.esc(nameOf(o.productId))}<br><span class="muted" style="font-size:.8rem">${CN.esc(o.proveedor || "")}</span></td>
        <td>${o.price ? CN.money(o.price) : "Consultar"}</td>
        <td>${CN.esc(o.stock || "-")}</td>
        <td>${o.activo ? `<span class="badge badge-green">Activa</span>` : `<span class="badge badge-amber">Inactiva</span>`}</td>
        <td><button class="btn btn-ghost btn-sm" data-toggle="${o.id}" data-active="${o.activo}">${o.activo ? "Desactivar" : "Activar"}</button></td>
      </tr>`).join("") : `<tr><td colspan="5" class="muted" style="text-align:center;padding:24px">Aún no has publicado ofertas.</td></tr>`;

    tbody.querySelectorAll("[data-toggle]").forEach((b) => b.addEventListener("click", async () => {
      const offers2 = await (await fetch("/api/offers")).json();
      const o = offers2.find((x) => x.id === b.dataset.toggle);
      if (!o) return;
      o.activo = !o.activo;
      await CNAuth.fetch("/api/offers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(o) });
      load();
    }));
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = {
      productId: sel.value,
      proveedor: document.getElementById("o-prov").value || "Proveedor",
      price: document.getElementById("o-price").value || null,
      stock: document.getElementById("o-stock").value,
      garantia: document.getElementById("o-gar").value,
      delivery: document.getElementById("o-del").value,
      whatsapp: document.getElementById("o-wsp").value,
      activo: true,
    };
    try {
      const r = await CNAuth.fetch("/api/offers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error();
      msg.innerHTML = `<div class="notice notice-ok">Oferta publicada.</div>`;
      form.reset();
      load();
    } catch (err) {
      msg.innerHTML = `<div class="notice notice-err">No se pudo publicar (¿servidor activo?).</div>`;
    }
  });

  load();
})();
