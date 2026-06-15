/* TECO - Guard del panel de proveedor */
(function () {
  if (localStorage.getItem("cn_token") && localStorage.getItem("cn_role") === "proveedor") return;
  location.replace("login.html?next=proveedor");
})();
