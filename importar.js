/* TECO - Importar (admin) */
(function () {
  const area = document.getElementById("data");
  const fmt = document.getElementById("fmt");
  const msg = document.getElementById("msg");

  document.getElementById("sample").addEventListener("click", () => {
    if (fmt.value === "csv") {
      area.value = "name,brand,category,price,store,link,specs\n" +
        "Realme 12 Pro 256GB,Realme,Smartphones,1099,falabella,,Pantalla:6.7 AMOLED|RAM:8GB\n" +
        "Huawei MatePad 11.5,Huawei,Tablets,1399,falabella,,Pantalla:11.5 120Hz\n" +
        "Logitech MX Master 3S,Logitech,Accesorios,399,falabella,";
    } else {
      area.value = JSON.stringify({ products: [
        { name: "Realme 12 Pro 256GB", brand: "Realme", category: "Smartphones", price: 1099, store: "falabella" },
        { name: "Huawei MatePad 11.5", brand: "Huawei", category: "Tablets", price: 1399, store: "falabella" }
      ] }, null, 2);
    }
  });

  document.getElementById("run").addEventListener("click", async () => {
    const text = area.value.trim();
    if (!text) { msg.innerHTML = `<div class="notice notice-err">Pega datos primero.</div>`; return; }
    let body;
    if (fmt.value === "csv") body = { csv: text };
    else { try { const j = JSON.parse(text); body = Array.isArray(j) ? { products: j } : j; } catch (e) { msg.innerHTML = `<div class="notice notice-err">JSON inválido.</div>`; return; } }
    msg.innerHTML = `<div class="notice notice-info">Importando…</div>`;
    try {
      const r = await CNAuth.fetch("/api/products/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error");
      msg.innerHTML = `<div class="notice notice-ok">Listo: ${d.nuevos} nuevos, ${d.actualizados} actualizados, ${d.conPrecio} con precio. Catálogo total: ${d.total}. <a href="productos.html">Ver productos</a></div>`;
    } catch (e) {
      msg.innerHTML = `<div class="notice notice-err">No se pudo importar: ${e.message}</div>`;
    }
  });
})();
