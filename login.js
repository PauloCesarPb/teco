/* TECO - Login */
(function () {
  let role = "proveedor";
  const emailField = document.getElementById("email-field");
  const tabs = document.querySelectorAll(".tabs button");

  function applyRole() {
    // El admin entra solo con contraseña; el proveedor con su correo.
    if (emailField) emailField.style.display = role === "admin" ? "none" : "";
  }

  tabs.forEach((b) => b.addEventListener("click", () => {
    tabs.forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    role = b.dataset.role;
    applyRole();
  }));
  applyRole();

  const form = document.getElementById("login-form");
  const msg = document.getElementById("login-msg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = document.getElementById("pass").value;
    const email = (document.getElementById("user").value || "").trim();
    msg.innerHTML = "";
    try {
      const body = role === "proveedor" ? { role, email, password } : { role, password };
      const r = await fetch("/api/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || "Credenciales incorrectas");
      localStorage.setItem("cn_token", data.token);
      localStorage.setItem("cn_role", data.role);
      if (data.nombre) localStorage.setItem("cn_name", data.nombre);
      location.href = data.role === "admin" ? "admin.html" : "panel-proveedor.html";
    } catch (err) {
      msg.innerHTML = `<div class="notice notice-err">${CN.esc(err.message)}</div>`;
    }
  });
})();
