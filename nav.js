/* TECO - Header + Footer compartidos */
(function () {
  const path = location.pathname.split("/").pop() || "index.html";
  const isLogged = !!localStorage.getItem("cn_token");
  const role = localStorage.getItem("cn_role");

  const links = [
    { href: "productos.html", label: "Productos" },
    { href: "favoritos.html", label: "Favoritos" },
    { href: "como-funciona.html", label: "Cómo funciona" },
  ];

  let sessionLink = `<a class="nav-cta" href="login.html">Iniciar sesión</a>`;
  if (isLogged) {
    const panel = role === "admin" ? "admin.html" : "panel-proveedor.html";
    sessionLink = `<a href="${panel}">Mi panel</a><a class="nav-cta" href="#" id="cn-logout">Salir</a>`;
  }

  const header = `
  <div class="site-header">
    <nav class="nav">
      <a class="brand" href="index.html"><span class="dot"></span>TE<b>CO</b></a>
      <form class="nav-search" id="nav-search" role="search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
        <input type="text" id="nav-q" placeholder="Busca un producto, marca o modelo…" aria-label="Buscar" />
      </form>
      <button class="nav-toggle" aria-label="Menú" id="cn-toggle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      </button>
      <div class="nav-links" id="cn-links">
        ${links.map((l) => `<a href="${l.href}" class="${l.match !== "none" && path === l.href ? "active" : ""}">${l.label}</a>`).join("")}
        ${sessionLink}
      </div>
    </nav>
  </div>`;

  const footer = `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <a class="brand" href="index.html"><span class="dot"></span>TE<b>CO</b></a>
          <p style="margin-top:12px;max-width:34ch;color:#94a3b8">Encuentra el mejor precio en tecnología comparando las tiendas más grandes del Perú. Comparar siempre es <b style="color:#fff">gratis</b>.</p>
        </div>
        <div class="footer-col"><h4>Explorar</h4>
          <a href="productos.html">Productos</a><a href="favoritos.html">Favoritos</a><a href="buscador-online.html">Comparar precios</a><a href="como-funciona.html">Cómo funciona</a>
        </div>
        <div class="footer-col"><h4>Empresa</h4>
          <a href="sobre.html">Sobre TECO</a><a href="proveedor.html">Afiliar tu tienda</a><a href="faq.html">Preguntas frecuentes</a>
        </div>
        <div class="footer-col"><h4>Legal</h4>
          <a href="terminos.html">Términos</a><a href="privacidad.html">Privacidad</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} TECO. Hecho en Perú.</span>
        <span>Los precios son referenciales; confírmalos en cada tienda antes de comprar.</span>
      </div>
    </div>
  </footer>`;

  const h = document.getElementById("site-header");
  const f = document.getElementById("site-footer");
  if (h) h.outerHTML = header;
  if (f) f.outerHTML = footer;

  const ns = document.getElementById("nav-search");
  if (ns) ns.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = document.getElementById("nav-q").value.trim();
    if (q) location.href = "buscador-online.html?q=" + encodeURIComponent(q);
  });

  const toggle = document.getElementById("cn-toggle");
  if (toggle) toggle.addEventListener("click", () => document.getElementById("cn-links").classList.toggle("open"));

  const logout = document.getElementById("cn-logout");
  if (logout) logout.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.removeItem("cn_token"); localStorage.removeItem("cn_role"); localStorage.removeItem("cn_name");
    location.href = "index.html";
  });
})();
