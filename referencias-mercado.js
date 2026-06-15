/* TECO - Helper de referencias de precios (lectura/escritura vía API) */
window.CNRefs = {
  list: async function () {
    try { const r = await fetch("/api/references"); return await r.json(); }
    catch (e) { return []; }
  },
  save: async function (ref) {
    const r = await CNAuth.fetch("/api/references", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ref),
    });
    return r.json();
  },
};
