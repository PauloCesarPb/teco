/* TECO - Login */
(function () {
  let role = "proveedor";
  const tabs = document.querySelectorAll(".tabs button");
  tabs.forEach((b) => b.addEventListener("click", () => {
    tabs.forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    role = b.dataset.role;
  }));

  const form = document.getElementById("login-form");
  const msg = document.getElementById("login-msg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = document.getElementById("pass").value;
    msg.innerHTML = "";
    try {
      const r = await fetch("/api/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, password }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || "Credenciales incorrectas");
      localStorage.setItem("cn_token", data.token);
      localStorage.setItem("cn_role", data.role);
      location.href = data.role === "admin" ? "admin.html" : "panel-proveedor.html";
    } catch (err) {
      msg.innerHTML = `<div class="notice notice-err">${CN.esc(err.message)}</div>`;
    }
  });
})();
