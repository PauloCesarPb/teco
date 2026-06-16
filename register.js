/* TECO - Registro de comprador (inicia sesión automáticamente). */
(function () {
  const form = document.getElementById("register-form");
  const msg = document.getElementById("register-msg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.innerHTML = "";
    const body = {
      nombre: document.getElementById("r-nombre").value.trim(),
      email: document.getElementById("r-email").value.trim(),
      password: document.getElementById("r-pass").value,
    };
    try {
      const r = await fetch("/api/register", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || "No se pudo crear la cuenta");
      localStorage.setItem("cn_token", data.token);
      localStorage.setItem("cn_role", data.role);
      if (data.nombre) localStorage.setItem("cn_name", data.nombre);
      location.href = "index.html";
    } catch (err) {
      msg.innerHTML = `<div class="notice notice-err">${CN.esc(err.message)}</div>`;
    }
  });
})();
