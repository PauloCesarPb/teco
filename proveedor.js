/* TECO - Solicitud de proveedor */
(function () {
  const form = document.getElementById("prov-form");
  const msg = document.getElementById("prov-msg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const body = Object.fromEntries(fd.entries());
    try {
      const r = await fetch("/api/providers", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error");
      done();
    } catch (err) {
      // Fallback local si no hay servidor
      const list = JSON.parse(localStorage.getItem("cn_providers") || "[]");
      list.push({ ...body, id: "prov-" + Date.now(), estado: "Pendiente", fecha: new Date().toISOString().slice(0, 10) });
      localStorage.setItem("cn_providers", JSON.stringify(list));
      done();
    }
  });

  function done() {
    msg.innerHTML = `<div class="notice notice-ok">¡Solicitud enviada! Te contactaremos para validar tu tienda.</div>`;
    form.reset();
  }
})();
