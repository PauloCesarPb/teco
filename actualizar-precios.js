/* TECO - Editar precios manualmente */
(async function () {
  const products = await CN.getProducts();
  const companies = await CN.getCompanies();
  const pSel = document.getElementById("r-prod");
  const cSel = document.getElementById("r-comp");
  products.forEach((p) => { const o = document.createElement("option"); o.value = p.id; o.textContent = p.name; pSel.appendChild(o); });
  companies.forEach((c) => { const o = document.createElement("option"); o.value = c.id; o.textContent = c.name; cSel.appendChild(o); });
  document.getElementById("r-date").value = new Date().toISOString().slice(0, 10);

  const form = document.getElementById("ref-form");
  const msg = document.getElementById("ref-msg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const ref = {
      productId: pSel.value,
      companyId: cSel.value,
      price: document.getElementById("r-price").value || null,
      link: document.getElementById("r-link").value || null,
      date: document.getElementById("r-date").value,
      status: document.getElementById("r-status").value,
    };
    try {
      const data = await CNRefs.save(ref);
      if (data && data.ok) {
        msg.innerHTML = `<div class="notice notice-ok">Precio guardado correctamente.</div>`;
      } else throw new Error((data && data.error) || "Error");
    } catch (err) {
      msg.innerHTML = `<div class="notice notice-err">No se pudo guardar (¿servidor activo?).</div>`;
    }
  });
})();
