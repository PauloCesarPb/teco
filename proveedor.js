/* TECO - Registro de proveedor */
(function () {
  const form = document.getElementById("prov-form");
  const msg = document.getElementById("prov-msg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.innerHTML = "";
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      const r = await fetch("/api/providers", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "No se pudo crear la cuenta");
      msg.innerHTML = `<div class="notice notice-ok">¡Cuenta creada! Revisaremos tu solicitud. Cuando te aprobemos, podrás <a href="login.html">iniciar sesión</a> con tu correo y contraseña.</div>`;
      form.reset();
    } catch (err) {
      msg.innerHTML = `<div class="notice notice-err">${CN.esc(err.message)}</div>`;
    }
  });
})();
