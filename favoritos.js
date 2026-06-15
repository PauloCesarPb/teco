/* TECO - Página de favoritos */
(async function () {
  const grid = document.getElementById("fav-grid");
  const empty = document.getElementById("fav-empty");
  const getFavs = () => JSON.parse(localStorage.getItem("cn_favs") || "[]");

  function showEmpty() {
    grid.innerHTML = "";
    empty.style.display = "";
  }

  const favs = getFavs();
  if (!favs.length) return showEmpty();

  grid.innerHTML = CNCards.skeletons(Math.min(favs.length, 8));
  const [products, companies, refs] = await Promise.all([
    CN.getProducts(), CN.getCompanies(), CN.getReferences(),
  ]);

  // Respeta el orden en que se guardaron.
  const byId = new Map(products.map((p) => [p.id, p]));
  const list = favs.map((id) => byId.get(id)).filter(Boolean);
  if (!list.length) return showEmpty();

  grid.innerHTML = list.map((p) => CNCards.card(p, CN.storesFor(companies, refs, p))).join("");
  CNCards.initFavorites(grid);

  // En esta página, quitar un favorito retira la tarjeta al instante.
  grid.querySelectorAll(".fav").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!btn.classList.contains("saved")) {
        const card = btn.closest(".pcard");
        if (card) card.remove();
        if (!getFavs().length || !grid.querySelector(".pcard")) showEmpty();
      }
    });
  });
})();
