/* TECO - Helper de autenticación del cliente.
 * Adjunta el token (Bearer) a las peticiones protegidas y, si el servidor
 * responde 401/403, limpia la sesión y manda al login. */
window.CNAuth = (function () {
  const TOKEN_KEY = "cn_token";
  const ROLE_KEY = "cn_role";

  const token = () => localStorage.getItem(TOKEN_KEY);
  const role = () => localStorage.getItem(ROLE_KEY);

  function set(t, r) {
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(ROLE_KEY, r);
  }
  function clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
  }

  // Cabeceras con Authorization si hay token.
  function headers(extra) {
    const h = Object.assign({}, extra || {});
    const t = token();
    if (t) h["Authorization"] = "Bearer " + t;
    return h;
  }

  // fetch que adjunta el token y reacciona a sesión inválida/expirada.
  async function authFetch(url, opts) {
    opts = opts || {};
    opts.headers = headers(opts.headers);
    const r = await fetch(url, opts);
    if (r.status === 401 || r.status === 403) {
      clear();
      location.href = "login.html";
      throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
    }
    return r;
  }

  return { token, role, set, clear, headers, fetch: authFetch, TOKEN_KEY, ROLE_KEY };
})();
