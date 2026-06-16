/* TECO - Login unificado: el rol de la cuenta decide a dónde entra. */
(function () {
  const form = document.getElementById("login-form");
  const msg = document.getElementById("login-msg");

  const destino = { admin: "admin.html", proveedor: "panel-proveedor.html", comprador: "index.html" };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = (document.getElementById("user").value || "").trim();
    const password = document.getElementById("pass").value;
    msg.innerHTML = "";
    try {
      const r = await fetch("/api/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || "Credenciales incorrectas");
      localStorage.setItem("cn_token", data.token);
      localStorage.setItem("cn_role", data.role);
      if (data.nombre) localStorage.setItem("cn_name", data.nombre);
      location.href = destino[data.role] || "index.html";
    } catch (err) {
      msg.innerHTML = `<div class="notice notice-err">${CN.esc(err.message)}</div>`;
    }
  });
})();
