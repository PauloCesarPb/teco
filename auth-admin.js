/* TECO - Guard del panel administrador */
(function () {
  if (localStorage.getItem("cn_token") && localStorage.getItem("cn_role") === "admin") return;
  location.replace("login.html?next=admin");
})();
